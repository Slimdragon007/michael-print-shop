'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CartItem } from '@/lib/stores/cart-store'
import { Package, Truck, Receipt } from 'lucide-react'
import Image from 'next/image'

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
}

export function OrderSummary({ items, subtotal, shipping, tax, total }: OrderSummaryProps) {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="relative w-16 h-16 bg-muted rounded-md overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {item.quantity}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm leading-tight line-clamp-2">
                  {item.title}
                </h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.selectedSize && (
                    <Badge variant="secondary" className="text-xs">
                      {item.selectedSize}
                    </Badge>
                  )}
                  {item.selectedMaterial && (
                    <Badge variant="secondary" className="text-xs">
                      {item.selectedMaterial}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-muted-foreground">
                    ${item.price.toFixed(2)} each
                  </span>
                  <span className="font-medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Pricing Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({items.reduce((count, item) => count + item.quantity, 0)} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1">
              <Truck className="h-3 w-3" />
              <span>Shipping</span>
            </div>
            <div className="text-right">
              {shipping === 0 ? (
                <div>
                  <span className="text-green-600 font-medium">FREE</span>
                  <div className="text-xs text-muted-foreground">
                    Orders over $50
                  </div>
                </div>
              ) : (
                <span>${shipping.toFixed(2)}</span>
              )}
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        {/* Shipping Info */}
        <div className="p-3 bg-muted rounded-md">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Package className="h-4 w-4" />
            Shipping Information
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Processing time: 1-2 business days</p>
            <p>• Standard shipping: 5-7 business days</p>
            <p>• Free shipping on orders over $50</p>
            <p>• Tracking number provided via email</p>
          </div>
        </div>

        {/* Return Policy */}
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Return Policy</p>
          <p>
            30-day returns on unopened items. Custom prints may have different return policies.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}