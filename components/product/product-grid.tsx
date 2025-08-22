'use client'

import { Product } from '@/types'
import { ProductCard } from './product-card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ProductGridProps {
  products: Product[]
  loading?: boolean
  emptyMessage?: string
  showQuickAdd?: boolean
  showWishlist?: boolean
}

export function ProductGrid({ 
  products, 
  loading = false,
  emptyMessage = "No products found",
  showQuickAdd = true,
  showWishlist = false
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-2">{emptyMessage}</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          showQuickAdd={showQuickAdd}
          showWishlist={showWishlist}
        />
      ))}
    </div>
  )
}