import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, shippingInfo, amount } = body

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      )
    }

    if (!shippingInfo || !shippingInfo.email) {
      return NextResponse.json(
        { error: 'Shipping information is required' },
        { status: 400 }
      )
    }

    if (!amount || amount < 50) { // Minimum 50 cents
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: shippingInfo.email,
      shipping: {
        name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        address: {
          line1: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          postal_code: shippingInfo.postalCode,
          country: shippingInfo.country,
        },
      },
      metadata: {
        items: JSON.stringify(items.map(item => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize,
          selectedMaterial: item.selectedMaterial,
        }))),
        customerEmail: shippingInfo.email,
        customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}