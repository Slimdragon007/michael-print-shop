import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { PricingCalculator, type CartItem, type ShippingAddress } from '@/lib/pricing/calculator'
import { env } from '@/lib/env'
import { 
  handleApiError, 
  PaymentError, 
  ValidationError,
  validateRequiredFields,
  validateEmail,
  validateQuantity,
  RateLimit,
  getClientIP
} from '@/lib/utils/error-handler'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    RateLimit.check(`checkout:${clientIP}`, 10, 15 * 60 * 1000) // 10 requests per 15 minutes

    const body = await request.json()
    const { items, shippingInfo } = body

    // Validate required fields
    validateRequiredFields(body, ['items', 'shippingInfo'])
    validateRequiredFields(shippingInfo, ['email', 'firstName', 'lastName', 'address', 'city', 'state', 'postalCode'])
    
    // Validate email format
    validateEmail(shippingInfo.email)

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Items must be a non-empty array', 'items')
    }

    // Validate each item
    items.forEach((item: any, index: number) => {
      validateRequiredFields(item, ['product_id', 'quantity'])
      validateQuantity(item.quantity, `items[${index}].quantity`)
    })

    // Convert cart items to pricing calculator format
    const cartItems: CartItem[] = items.map((item: any) => ({
      product_id: item.product_id || item.id,
      print_option_id: item.print_option_id,
      quantity: item.quantity || 1
    }))

    // Prepare shipping address for tax/shipping calculation
    const shippingAddress: ShippingAddress = {
      country: shippingInfo.country || 'US',
      state: shippingInfo.state || '',
      postalCode: shippingInfo.postalCode || ''
    }

    // Calculate server-side pricing (prevents client-side manipulation)
    let pricingBreakdown
    try {
      pricingBreakdown = await PricingCalculator.calculatePricing(cartItems, shippingAddress)
    } catch (pricingError) {
      console.error('Pricing calculation failed:', pricingError)
      throw new PaymentError(
        'PRICING_CALCULATION_FAILED',
        'Unable to calculate pricing. Please check your cart items and try again.',
        400,
        { original_error: pricingError instanceof Error ? pricingError.message : String(pricingError) }
      )
    }

    // Validate minimum amount (50 cents in Stripe)
    const amountInCents = Math.round(pricingBreakdown.total * 100)
    if (amountInCents < 50) {
      throw new PaymentError(
        'AMOUNT_TOO_LOW',
        'Order total must be at least $0.50',
        400,
        { calculated_total: pricingBreakdown.total }
      )
    }

    // Validate maximum amount for security
    if (amountInCents > 999999900) { // $9,999,999.00
      throw new PaymentError(
        'AMOUNT_TOO_HIGH',
        'Order total exceeds maximum allowed amount',
        400,
        { calculated_total: pricingBreakdown.total }
      )
    }

    // Create Stripe line items for metadata
    const stripeLineItems = pricingBreakdown.items.map(item => ({
      product_id: item.product_id,
      print_option_id: item.print_option_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      product_title: item.product_title,
      print_details: item.print_details
    }))

    // Create payment intent with calculated pricing
    let paymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        receipt_email: shippingInfo.email,
        shipping: {
          name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
          address: {
            line1: shippingInfo.address,
            line2: shippingInfo.address2 || undefined,
            city: shippingInfo.city,
            state: shippingInfo.state,
            postal_code: shippingInfo.postalCode,
            country: shippingInfo.country || 'US',
          },
        },
        metadata: {
          order_type: 'print_shop_order',
          items_json: JSON.stringify(stripeLineItems),
          subtotal: pricingBreakdown.subtotal.toString(),
          shipping: pricingBreakdown.shipping.toString(),
          tax: pricingBreakdown.tax.toString(),
          total: pricingBreakdown.total.toString(),
          customer_email: shippingInfo.email,
          customer_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
          shipping_address: JSON.stringify(shippingAddress),
        },
      })
    } catch (stripeError) {
      console.error('Stripe PaymentIntent creation failed:', stripeError)
      throw new PaymentError(
        'PAYMENT_INTENT_FAILED',
        'Unable to initialize payment. Please try again.',
        500,
        { stripe_error: stripeError instanceof Error ? stripeError.message : String(stripeError) }
      )
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      calculatedPricing: pricingBreakdown
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// Add GET endpoint for pricing calculation (preview)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemsParam = searchParams.get('items')
    const shippingParam = searchParams.get('shipping')

    if (!itemsParam) {
      return NextResponse.json(
        { error: 'Items parameter required' },
        { status: 400 }
      )
    }

    let cartItems: CartItem[]
    let shippingAddress: ShippingAddress | undefined

    try {
      cartItems = JSON.parse(itemsParam)
      if (shippingParam) {
        shippingAddress = JSON.parse(shippingParam)
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in parameters' },
        { status: 400 }
      )
    }

    const pricingBreakdown = await PricingCalculator.calculatePricing(cartItems, shippingAddress)

    return NextResponse.json({
      success: true,
      pricing: pricingBreakdown
    })
  } catch (error) {
    console.error('Error calculating pricing preview:', error)
    return NextResponse.json(
      { error: 'Failed to calculate pricing' },
      { status: 500 }
    )
  }
}