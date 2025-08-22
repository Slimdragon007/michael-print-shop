'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ShoppingCart, Eye, Heart } from 'lucide-react'
import { Product, PrintOption } from '@/types'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice, getAspectRatio } from '@/lib/utils'
import { useCartStore } from '@/store/cart-store'

interface ProductCardProps {
  product: Product
  showQuickAdd?: boolean
  showWishlist?: boolean
}

export function ProductCard({ 
  product, 
  showQuickAdd = true, 
  showWishlist = false 
}: ProductCardProps) {
  const [selectedPrintOption, setSelectedPrintOption] = useState<PrintOption | null>(
    product.print_options?.[0] || null
  )
  const [isHovered, setIsHovered] = useState(false)
  const addItem = useCartStore(state => state.addItem)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (selectedPrintOption) {
      addItem(product, selectedPrintOption, 1)
    }
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // TODO: Implement wishlist functionality
  }

  const basePrice = product.base_price
  const currentPrice = selectedPrintOption 
    ? basePrice + selectedPrintOption.price_modifier 
    : basePrice

  const aspectRatio = product.dimensions 
    ? getAspectRatio(product.dimensions.width, product.dimensions.height)
    : 1 // Default square aspect ratio

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/products/${product.id}`}>
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.image_url}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          {/* Overlay with quick actions */}
          <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="absolute top-4 right-4 space-y-2">
              {showWishlist && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
                  onClick={handleWishlist}
                >
                  <Heart className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
                asChild
              >
                <Link href={`/products/${product.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Category badge */}
          <div className="absolute top-4 left-4">
            <Badge variant="secondary" className="bg-white/90">
              {product.category.name}
            </Badge>
          </div>

          {/* Dimensions badge */}
          <div className="absolute bottom-4 left-4">
            <Badge variant="outline" className="bg-white/90">
              {aspectRatio}
            </Badge>
          </div>
        </div>
      </Link>

      <CardContent className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {product.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{product.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Print options */}
        {product.print_options && product.print_options.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Material & Size
            </label>
            <select
              value={selectedPrintOption?.id || ''}
              onChange={(e) => {
                const option = product.print_options.find(opt => opt.id === e.target.value)
                setSelectedPrintOption(option || null)
              }}
              className="w-full text-xs border rounded px-2 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {product.print_options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.material} - {option.size}
                  {option.price_modifier !== 0 && 
                    ` (${option.price_modifier > 0 ? '+' : ''}${formatPrice(option.price_modifier)})`
                  }
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-lg font-bold">
              {formatPrice(currentPrice)}
            </span>
            {selectedPrintOption && selectedPrintOption.price_modifier !== 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                (base: {formatPrice(basePrice)})
              </span>
            )}
          </div>
        </div>
      </CardContent>

      {showQuickAdd && (
        <CardFooter className="p-4 pt-0">
          <Button 
            className="w-full" 
            onClick={handleAddToCart}
            disabled={!selectedPrintOption}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}