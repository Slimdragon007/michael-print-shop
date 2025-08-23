import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { OrdersDatabase } from '@/lib/database/orders'
import { env } from '@/lib/env'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentIntentId } = body

    // Validate required fields
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      )
    }

    // Retrieve the payment intent to verify it was successful
    let paymentIntent: Stripe.PaymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (stripeError) {
      console.error('Failed to retrieve payment intent:', stripeError)
      return NextResponse.json(
        { error: 'Invalid payment intent' },
        { status: 400 }
      )
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not successful' },
        { status: 400 }
      )
    }

    // Check if order already exists
    const existingOrder = await OrdersDatabase.getOrderByPaymentIntent(paymentIntentId)
    if (existingOrder) {
      return NextResponse.json({
        success: true,
        order: {
          id: existingOrder.id,
          order_number: existingOrder.order_number,
          status: existingOrder.status,
          total: existingOrder.total,
          created_at: existingOrder.created_at
        },
      })
    }

    // If the webhook hasn't processed this payment yet, return a message
    // The webhook will handle order creation for security
    return NextResponse.json({
      success: true,
      message: 'Order is being processed. You will receive a confirmation email shortly.',
      payment_intent_id: paymentIntentId
    })

  } catch (error) {
    console.error('Error handling order request:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Payment error: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process order request' },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get('order_number')
    const orderId = searchParams.get('id')
    const paymentIntentId = searchParams.get('payment_intent_id')

    let order = null

    if (orderNumber) {
      order = await OrdersDatabase.getOrderByNumber(orderNumber)
    } else if (orderId) {
      order = await OrdersDatabase.getOrderById(orderId)
    } else if (paymentIntentId) {
      order = await OrdersDatabase.getOrderByPaymentIntent(paymentIntentId)
    } else {
      return NextResponse.json(
        { error: 'Order identifier required (order_number, id, or payment_intent_id)' },
        { status: 400 }
      )
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Return sanitized order data (remove sensitive information)
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        tracking_number: order.tracking_number,
        shipping_address: order.shipping_address,
        created_at: order.created_at,
        estimated_delivery: new Date(new Date(order.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_snapshot: item.product_snapshot
        }))
      }
    })

  } catch (error) {
    console.error('Error retrieving order:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve order' },
      { status: 500 }
    )
  }
}