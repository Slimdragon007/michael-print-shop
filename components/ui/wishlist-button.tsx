'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WishlistButtonProps {
  productId: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function WishlistButton({ 
  productId, 
  className, 
  size = 'default' 
}: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(false)
  
  const handleToggleWishlist = () => {
    setIsWishlisted(!isWishlisted)
    // TODO: Integrate with wishlist store/API
  }
  
  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleToggleWishlist}
      className={cn('transition-all', className)}
    >
      <Heart 
        className={cn(
          'h-4 w-4', 
          isWishlisted && 'fill-red-500 text-red-500'
        )} 
      />
    </Button>
  )
}