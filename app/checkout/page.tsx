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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 md:mb-8">
          <Button variant="ghost" size="sm" asChild className="self-start">
            <Link href="/cart">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Secure Checkout</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              {getItemCount()} {getItemCount() === 1 ? 'item' : 'items'} in your order
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                currentStep === 'shipping' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-green-500 text-white'
              }`}>
                {currentStep === 'payment' ? '✓' : '1'}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm md:text-base ${currentStep === 'shipping' ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                  Shipping Information
                </span>
                {currentStep === 'payment' && (
                  <span className="text-xs text-green-600 font-medium">Completed</span>
                )}
              </div>
            </div>
            
            <div className="flex-1 mx-4">
              <div className="h-0.5 bg-gray-200 relative">
                <div className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                  currentStep === 'payment' ? 'w-full bg-green-500' : 'w-0 bg-blue-600'
                }`} />
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                currentStep === 'payment' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-400'
              }`}>
                2
              </div>
              <div className="flex flex-col">
                <span className={`text-sm md:text-base ${currentStep === 'payment' ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                  Payment
                </span>
                {currentStep === 'payment' && (
                  <span className="text-xs text-blue-600 font-medium">In Progress</span>
                )}
              </div>
            </div>
          </div>
        </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
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
                  variables: {
                    colorPrimary: '#0070f3',
                    colorBackground: '#ffffff',
                    colorText: '#30313d',
                    colorDanger: '#df1b41',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '8px',
                  },
                  rules: {
                    '.Input': {
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                      border: '1px solid #d1d5db',
                      padding: '12px',
                    },
                    '.Input:focus': {
                      border: '1px solid #0070f3',
                      outline: 'none',
                      boxShadow: '0 0 0 2px rgba(0, 112, 243, 0.1)',
                    },
                    '.Label': {
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '6px',
                    }
                  }
                }
              }}
            >
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <Lock className="h-5 w-5 text-blue-600" />
                    Secure Payment
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Your payment information is encrypted and secure
                  </p>
                </CardHeader>
                <CardContent className="pt-6">
                  <CheckoutForm 
                    shippingInfo={shippingInfo}
                    total={total}
                  />
                </CardContent>
              </Card>
            </Elements>
          )}
        </div>

        {/* Right Column - Order Summary (Mobile: Top, Desktop: Right) */}
        <div className="lg:col-span-1 order-first lg:order-last">
          <div className="sticky top-4">
            <OrderSummary 
              items={items}
              subtotal={subtotal}
              shipping={shipping}
              tax={tax}
              total={total}
            />
          </div>
        </div>
      </div>

        {/* Security Badge */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-green-600" />
                <span className="font-medium">SSL Secured</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span className="font-medium">Powered by Stripe</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Your payment information is encrypted and never stored on our servers
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}