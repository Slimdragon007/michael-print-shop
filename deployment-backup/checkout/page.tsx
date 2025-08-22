'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import Link from 'next/link'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { CartSummary } from '@/components/cart/cart-summary'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { cart, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const router = useRouter()

  const handleCheckout = async () => {
    if (!user) {
      router.push('/auth?redirect=/checkout')
      return
    }

    if (cart.items.length === 0) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      // Create line items for Stripe
      const lineItems = cart.items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.product.title,
            description: `${item.print_option.material} - ${item.print_option.size}`,
            images: [item.product.image_url],
            metadata: {
              product_id: item.product.id,
              print_option_id: item.print_option.id,
            },
          },
          unit_amount: Math.round(item.total_price / item.quantity * 100), // Convert to cents
        },
        quantity: item.quantity,
      }))

      // Add shipping if needed
      const shipping = cart.total < 50 ? 10 : 0
      if (shipping > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Shipping',
              description: 'Standard shipping',
            },
            unit_amount: shipping * 100,
          },
          quantity: 1,
        })
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

      // For static hosting, we'll use Stripe's direct checkout
      // This requires setting up products in Stripe Dashboard
      // For now, let's redirect to a external payment link or use embedded checkout
      setError('Payment processing is currently being set up. Please contact support for assistance.')
      
    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to continue with your purchase.
          </p>
          <Button asChild>
            <Link href="/auth?redirect=/checkout">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Add some products to your cart before checking out.
          </p>
          <Button asChild>
            <Link href="/products">Shop Now</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/cart">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Checkout</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
          <CartSummary cart={cart} showCheckoutButton={false} />
        </div>

        {/* Payment */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Payment</h2>
          
          <div className="bg-card rounded-lg border p-6">
            <div className="mb-6">
              <h3 className="font-medium mb-2">Secure Checkout</h3>
              <p className="text-sm text-muted-foreground">
                Your payment information is secure and encrypted. We use Stripe for payment processing.
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-6">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">Credit/Debit Card</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pay securely with your credit or debit card
                </p>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Continue to Payment
                  </>
                )}
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                By proceeding, you agree to our{' '}
                <Link href="/terms" className="underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}