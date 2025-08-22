'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { Cart } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'

interface CartSummaryProps {
  cart: Cart
  showCheckoutButton?: boolean
  className?: string
}

export function CartSummary({ 
  cart, 
  showCheckoutButton = true,
  className = ""
}: CartSummaryProps) {
  const shipping = 0 // Free shipping for now
  const tax = cart.total * 0.08 // 8% tax
  const total = cart.total + shipping + tax

  if (cart.items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Your cart is empty</h3>
          <p className="text-muted-foreground text-center mb-4">
            Add some beautiful prints to get started
          </p>
          <Button asChild>
            <Link href="/products">
              Shop Now
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Items Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Items ({cart.item_count})</span>
            <span>{formatPrice(cart.total)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>{formatPrice(tax)}</span>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-muted/50 p-3 rounded-md text-sm">
          <div className="font-medium mb-1">Estimated Delivery</div>
          <div className="text-muted-foreground">
            5-7 business days for standard prints
          </div>
        </div>
      </CardContent>

      {showCheckoutButton && (
        <CardFooter className="pt-0">
          <Button className="w-full" size="lg" asChild>
            <Link href="/checkout">
              Proceed to Checkout
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}