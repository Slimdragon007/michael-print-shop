'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/lib/stores/cart-store'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { OrderSummary } from '@/components/checkout/order-summary'
import { ShippingForm } from '@/components/checkout/shipping-form'
import { ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface ShippingInfo {
  firstName: string
  lastName: string
  email: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
}

export default function CheckoutPage() {
  const { items, getTotal, getItemCount } = useCart()
  const [clientSecret, setClientSecret] = useState<string>('')
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment'>('shipping')

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      window.location.href = '/products'
    }
  }, [items])

  // Calculate totals
  const subtotal = getTotal()
  const shipping = subtotal >= 50 ? 0 : 8.99 // Free shipping over $50
  const tax = subtotal * 0.08 // 8% tax
  const total = subtotal + shipping + tax

  // Create payment intent when moving to payment step
  const createPaymentIntent = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items,
          shippingInfo: shippingInfo,
          amount: Math.round(total * 100), // Convert to cents
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const data = await response.json()
      setClientSecret(data.clientSecret)
      setCurrentStep('payment')
    } catch (error) {
      console.error('Error creating payment intent:', error)
      alert('Failed to initialize payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShippingSubmit = (info: ShippingInfo) => {
    setShippingInfo(info)
    createPaymentIntent()
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">
              Add some products to your cart before checking out.
            </p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/cart">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-muted-foreground">
            {getItemCount()} {getItemCount() === 1 ? 'item' : 'items'} in your order
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'shipping' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-green-500 text-white'
          }`}>
            {currentStep === 'payment' ? '✓' : '1'}
          </div>
          <span className={currentStep === 'shipping' ? 'font-medium' : 'text-muted-foreground'}>
            Shipping Information
          </span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'payment' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}>
            2
          </div>
          <span className={currentStep === 'payment' ? 'font-medium' : 'text-muted-foreground'}>
            Payment
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Forms */}
        <div className="space-y-6">
          {currentStep === 'shipping' && (
            <ShippingForm 
              onSubmit={handleShippingSubmit}
              isLoading={isLoading}
            />
          )}

          {currentStep === 'payment' && clientSecret && (
            <Elements 
              stripe={stripePromise} 
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                }
              }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Secure Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CheckoutForm 
                    shippingInfo={shippingInfo}
                    total={total}
                  />
                </CardContent>
              </Card>
            </Elements>
          )}
        </div>

        {/* Right Column - Order Summary */}
        <div>
          <OrderSummary 
            items={items}
            subtotal={subtotal}
            shipping={shipping}
            tax={tax}
            total={total}
          />
        </div>
      </div>

      {/* Security Badge */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>Secured by Stripe • SSL Encrypted</span>
        </div>
      </div>
    </div>
  )
}