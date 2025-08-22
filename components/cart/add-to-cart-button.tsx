'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/stores/cart-store'
import { ShoppingCart, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddToCartButtonProps {
  product: any
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
}

export function AddToCartButton({ 
  product, 
  className, 
  size = 'default',
  variant = 'default'
}: AddToCartButtonProps) {
  const [isAdded, setIsAdded] = useState(false)
  const addItem = useCart((state) => state.addItem)
  
  const handleAddToCart = () => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.base_price,
      image: product.image_url,
      quantity: 1,
    })
    
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }
  
  return (
    <Button
      onClick={handleAddToCart}
      size={size}
      variant={variant}
      className={cn('transition-all', className)}
      disabled={isAdded}
    >
      {isAdded ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Added to Cart
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </>
      )}
    </Button>
  )
}