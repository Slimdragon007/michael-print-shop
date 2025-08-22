import Stripe from 'stripe'
import { env } from '@/lib/env'

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
})

export async function createPaymentIntent(amount: number, currency = 'usd') {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return paymentIntent
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw error
  }
}

export async function confirmPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return paymentIntent
  } catch (error) {
    console.error('Error confirming payment intent:', error)
    throw error
  }
}

export async function createCustomer(email: string, name?: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
    })

    return customer
  } catch (error) {
    console.error('Error creating customer:', error)
    throw error
  }
}

export async function createCheckoutSession({
  lineItems,
  customerEmail,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
  customerEmail: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      automatic_tax: {
        enabled: true,
      },
    })

    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

export async function retrieveCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    })

    return session
  } catch (error) {
    console.error('Error retrieving checkout session:', error)
    throw error
  }
}

export async function handleWebhook(
  body: string,
  signature: string,
  webhookSecret: string
) {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    return event
  } catch (error) {
    console.error('Error constructing webhook event:', error)
    throw error
  }
}