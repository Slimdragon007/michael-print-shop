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
    const { paymentIntentId, shippingInfo, total } = body

    // Validate required fields
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      )
    }

    if (!shippingInfo) {
      return NextResponse.json(
        { error: 'Shipping information is required' },
        { status: 400 }
      )
    }

    // Retrieve the payment intent to verify it was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not successful' },
        { status: 400 }
      )
    }

    // Parse items from metadata
    const items = JSON.parse(paymentIntent.metadata.items || '[]')

    // Create order object (in a real app, this would be saved to a database)
    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentIntentId,
      status: 'confirmed',
      items,
      total,
      shipping: {
        firstName: shippingInfo.firstName,
        lastName: shippingInfo.lastName,
        email: shippingInfo.email,
        address: shippingInfo.address,
        city: shippingInfo.city,
        state: shippingInfo.state,
        postalCode: shippingInfo.postalCode,
        country: shippingInfo.country,
      },
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    }

    // In a production app, you would:
    // 1. Save order to database
    // 2. Send confirmation email
    // 3. Trigger fulfillment process
    // 4. Update inventory
    
    console.log('Order created:', order)

    // For now, we'll just return the order
    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error) {
    console.error('Error creating order:', error)
    
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