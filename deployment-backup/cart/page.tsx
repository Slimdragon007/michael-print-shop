'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { Button } from '@/components/ui/button'
import { CartItem } from '@/components/cart/cart-item'
import { CartSummary } from '@/components/cart/cart-summary'

export default function CartPage() {
  const { cart, updateQuantity, removeItem } = useCartStore()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Shopping
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
      </div>

      {cart.items.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">
            Add some beautiful prints to get started
          </p>
          <Button asChild>
            <Link href="/products">Shop Now</Link>
          </Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-6">
                Cart Items ({cart.item_count})
              </h2>
              <div className="space-y-0">
                {cart.items.map((item, index) => (
                  <CartItem
                    key={`${item.product.id}-${item.print_option.id}`}
                    item={item}
                    onUpdateQuantity={(quantity) => updateQuantity(index, quantity)}
                    onRemove={() => removeItem(index)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <CartSummary cart={cart} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}