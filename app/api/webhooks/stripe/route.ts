import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { env } from '@/lib/env'
import { OrdersDatabase, type CreateOrderData } from '@/lib/database/orders'
import { headers } from 'next/headers'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`Received Stripe webhook: ${event.type} - ${event.id}`)

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object as Stripe.Dispute)
        break

      case 'invoice.payment_succeeded':
        // Handle subscription payments if you add subscriptions later
        console.log('Invoice payment succeeded:', event.data.object.id)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment succeeded: ${paymentIntent.id}`)

    // Check if order already exists
    const existingOrder = await OrdersDatabase.getOrderByPaymentIntent(paymentIntent.id)
    if (existingOrder) {
      console.log(`Order already exists for payment intent: ${paymentIntent.id}`)
      
      // Update status to confirmed if it's still pending
      if (existingOrder.status === 'pending') {
        await OrdersDatabase.updateOrderStatus(existingOrder.id, 'confirmed')
        console.log(`Updated order status to confirmed: ${existingOrder.id}`)
      }
      return
    }

    // Extract order data from metadata
    const metadata = paymentIntent.metadata
    if (!metadata.order_type || metadata.order_type !== 'print_shop_order') {
      console.log('Payment intent is not for a print shop order')
      return
    }

    // Parse order data from metadata
    const itemsJson = metadata.items_json
    const shippingAddressJson = metadata.shipping_address
    
    if (!itemsJson || !shippingAddressJson) {
      console.error('Missing required order data in payment intent metadata')
      return
    }

    let items: any[]
    let shippingAddress: any

    try {
      items = JSON.parse(itemsJson)
      shippingAddress = JSON.parse(shippingAddressJson)
    } catch (parseError) {
      console.error('Failed to parse order data from metadata:', parseError)
      return
    }

    // Generate order number
    const orderNumber = await OrdersDatabase.generateOrderNumber()

    // Create order data
    const orderData: CreateOrderData = {
      order_number: orderNumber,
      status: 'confirmed',
      subtotal: parseFloat(metadata.subtotal || '0'),
      tax: parseFloat(metadata.tax || '0'),
      shipping: parseFloat(metadata.shipping || '0'),
      total: parseFloat(metadata.total || '0'),
      stripe_payment_intent_id: paymentIntent.id,
      shipping_address: {
        firstName: metadata.customer_name?.split(' ')[0] || '',
        lastName: metadata.customer_name?.split(' ').slice(1).join(' ') || '',
        email: metadata.customer_email || paymentIntent.receipt_email || '',
        address: paymentIntent.shipping?.address?.line1 || '',
        city: paymentIntent.shipping?.address?.city || '',
        state: paymentIntent.shipping?.address?.state || '',
        postalCode: paymentIntent.shipping?.address?.postal_code || '',
        country: paymentIntent.shipping?.address?.country || 'US'
      },
      items: items.map(item => ({
        product_id: item.product_id,
        print_option_id: item.print_option_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.line_total,
        product_snapshot: {
          title: item.product_title,
          print_details: item.print_details,
          unit_price: item.unit_price
        }
      }))
    }

    // Create the order in database
    const { order, items: orderItems } = await OrdersDatabase.createOrder(orderData)
    
    console.log(`Created order: ${order.id} (${order.order_number})`)

    // Send email notifications
    try {
      const { EmailService } = await import('@/lib/email/mailer')
      
      const emailOrderData = {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        tracking_number: order.tracking_number,
        shipping_address: order.shipping_address,
        items: orderItems.map(item => ({
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_snapshot: item.product_snapshot
        })),
        created_at: order.created_at
      }

      // Send customer confirmation
      await EmailService.sendOrderConfirmation(emailOrderData)
      
      // Send admin notification
      await EmailService.sendAdminOrderNotification(emailOrderData)
      
    } catch (emailError) {
      console.error('Failed to send order emails:', emailError)
      // Don't fail the webhook for email errors
    }

    // TODO: Trigger fulfillment process
    // TODO: Update inventory/stock

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error)
    throw error
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment failed: ${paymentIntent.id}`)

    // Check if order exists and update status
    const existingOrder = await OrdersDatabase.getOrderByPaymentIntent(paymentIntent.id)
    if (existingOrder) {
      await OrdersDatabase.updateOrderStatus(
        existingOrder.id, 
        'cancelled', 
        'Payment failed'
      )
      console.log(`Updated order status to cancelled: ${existingOrder.id}`)
    }

    // TODO: Send payment failed notification email
    // TODO: Log payment failure for analysis

  } catch (error) {
    console.error('Error handling payment intent failed:', error)
  }
}

/**
 * Handle canceled payment
 */
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment canceled: ${paymentIntent.id}`)

    // Check if order exists and update status
    const existingOrder = await OrdersDatabase.getOrderByPaymentIntent(paymentIntent.id)
    if (existingOrder) {
      await OrdersDatabase.updateOrderStatus(
        existingOrder.id, 
        'cancelled', 
        'Payment canceled by customer'
      )
      console.log(`Updated order status to cancelled: ${existingOrder.id}`)
    }

  } catch (error) {
    console.error('Error handling payment intent canceled:', error)
  }
}

/**
 * Handle charge disputes
 */
async function handleChargeDispute(dispute: Stripe.Dispute) {
  try {
    console.log(`Charge dispute created: ${dispute.id} for charge: ${dispute.charge}`)

    // Find the order associated with this dispute
    // We'd need to get the payment intent from the charge first
    const charge = await stripe.charges.retrieve(dispute.charge as string)
    if (charge.payment_intent) {
      const existingOrder = await OrdersDatabase.getOrderByPaymentIntent(charge.payment_intent as string)
      if (existingOrder) {
        await OrdersDatabase.updateOrderStatus(
          existingOrder.id,
          'cancelled',
          `Charge dispute: ${dispute.reason}`
        )
        console.log(`Updated order due to dispute: ${existingOrder.id}`)
      }
    }

    // TODO: Send dispute notification to admin
    // TODO: Log dispute for manual review

  } catch (error) {
    console.error('Error handling charge dispute:', error)
  }
}

// Disable Next.js body parsing for webhooks
export const runtime = 'nodejs'