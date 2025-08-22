'use client'

import Image from 'next/image'
import { Minus, Plus, X } from 'lucide-react'
import { CartItem as CartItemType } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'

interface CartItemProps {
  item: CartItemType
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      onRemove()
    } else {
      onUpdateQuantity(newQuantity)
    }
  }

  return (
    <div className="flex gap-4 py-4 border-b border-border last:border-b-0">
      {/* Product Image */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
        <Image
          src={item.product.image_url}
          alt={item.product.title}
          fill
          className="object-cover"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">
          {item.product.title}
        </h3>
        
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {item.print_option.material}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {item.print_option.size}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          {/* Quantity Controls */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(item.quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Price */}
          <div className="text-right">
            <div className="font-semibold">
              {formatPrice(item.total_price)}
            </div>
            {item.quantity > 1 && (
              <div className="text-xs text-muted-foreground">
                {formatPrice(item.total_price / item.quantity)} each
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 flex-shrink-0"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}