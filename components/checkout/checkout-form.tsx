'use client'

import { useState } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/stores/cart-store'
import { useRouter } from 'next/navigation'
import { CreditCard, Loader2 } from 'lucide-react'

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

interface CheckoutFormProps {
  shippingInfo: ShippingInfo
  total: number
}

export function CheckoutForm({ shippingInfo, total }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { clearCart } = useCart()
  
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation`,
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
        },
        redirect: 'if_required',
      })

      if (error) {
        // Show error to customer
        setMessage(error.message || 'An unexpected error occurred.')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded - create order and redirect
        try {
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              shippingInfo,
              total,
            }),
          })

          if (response.ok) {
            const order = await response.json()
            clearCart()
            router.push(`/order-confirmation?order=${order.id}`)
          } else {
            throw new Error('Failed to create order')
          }
        } catch (orderError) {
          console.error('Error creating order:', orderError)
          setMessage('Payment succeeded but order creation failed. Please contact support.')
        }
      }
    } catch (error) {
      console.error('Payment error:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CreditCard className="h-4 w-4" />
          Payment Method
        </div>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Error Message */}
      {message && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{message}</p>
        </div>
      )}

      {/* Order Summary */}
      <div className="p-4 bg-muted rounded-md">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Shipping to:</span>
            <span className="font-medium">
              {shippingInfo.firstName} {shippingInfo.lastName}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Address:</span>
            <span className="text-right">
              {shippingInfo.address}<br />
              {shippingInfo.city}, {shippingInfo.state} {shippingInfo.postalCode}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Email:</span>
            <span>{shippingInfo.email}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isLoading || !stripe || !elements}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Pay ${total.toFixed(2)}
          </>
        )}
      </Button>

      {/* Security Notice */}
      <p className="text-xs text-muted-foreground text-center">
        Your payment information is secure and encrypted. We don't store your card details.
      </p>
    </form>
  )
}