'use client'

import { useState } from 'react'
import { ShoppingCart, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { useCartStore } from '@/store/cart-store'
import { Button } from '@/components/ui/button'
import { CartItem } from './cart-item'
import { CartSummary } from './cart-summary'
import { Badge } from '@/components/ui/badge'

interface CartDrawerProps {
  children?: React.ReactNode
}

export function CartDrawer({ children }: CartDrawerProps) {
  const [open, setOpen] = useState(false)
  const { cart, updateQuantity, removeItem } = useCartStore()

  const trigger = children || (
    <Button variant="outline" size="icon" className="relative">
      <ShoppingCart className="h-4 w-4" />
      {cart.item_count > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
        >
          {cart.item_count}
        </Badge>
      )}
    </Button>
  )

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger}
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        
        <Dialog.Content className="fixed right-0 top-0 h-full w-full max-w-md border-l bg-background shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <h2 className="font-semibold">Shopping Cart</h2>
                {cart.item_count > 0 && (
                  <Badge variant="secondary">
                    {cart.item_count} {cart.item_count === 1 ? 'item' : 'items'}
                  </Badge>
                )}
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {cart.items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Your cart is empty</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Add some beautiful prints to get started
                    </p>
                    <Dialog.Close asChild>
                      <Button>
                        Continue Shopping
                      </Button>
                    </Dialog.Close>
                  </div>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="flex-1 overflow-y-auto p-4">
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

                  {/* Footer with Summary */}
                  <div className="border-t p-4">
                    <CartSummary cart={cart} className="border-0 shadow-none" />
                  </div>
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}