'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'
import { ProductFilters, Product, Category } from '@/types'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductFilters as ProductFiltersComponent } from '@/components/product/product-filters'
import { Button } from '@/components/ui/button'
import { getAllMockProducts } from '@/lib/mock-products'
import { hostingerAPI } from '@/lib/hostinger-api'

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filters, setFilters] = useState<ProductFilters>({})
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  const searchParams = useSearchParams()

  useEffect(() => {
    // Mock categories for testing
    setCategories([
      { id: '1', name: 'Architecture', description: 'Buildings and structures' },
      { id: '2', name: 'Landscape', description: 'Natural landscapes and scenery' },
      { id: '3', name: 'Urban', description: 'City and urban environments' },
      { id: '4', name: 'Industrial', description: 'Industrial and historical sites' }
    ])
  }, [])

  useEffect(() => {
    // Parse URL parameters
    const initialFilters: ProductFilters = {}
    
    const search = searchParams.get('search')
    if (search) initialFilters.search = search
    
    const category = searchParams.get('category')
    if (category) initialFilters.category = category
    
    const material = searchParams.get('material')
    if (material) initialFilters.material = material as any
    
    const minPrice = searchParams.get('min_price')
    const maxPrice = searchParams.get('max_price')
    if (minPrice || maxPrice) {
      initialFilters.price_range = {
        min: minPrice ? parseFloat(minPrice) : 0,
        max: maxPrice ? parseFloat(maxPrice) : 999999,
      }
    }
    
    setFilters(initialFilters)
  }, [searchParams])

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      try {
        // Create hybrid product list combining Etsy + Hostinger photos
        const etsyProducts = getAllMockProducts()
        let allProducts = await hostingerAPI.createHybridProductList(etsyProducts)
        
        // Apply filters
        if (filters.search) {
          allProducts = allProducts.filter(p => 
            p.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
            p.description.toLowerCase().includes(filters.search!.toLowerCase()) ||
            p.tags.some((tag: string) => tag.toLowerCase().includes(filters.search!.toLowerCase()))
          )
        }
        
        if (filters.category) {
          allProducts = allProducts.filter(p => 
            (typeof p.category === 'string' ? p.category : p.category.name) === filters.category
          )
        }
        
        if (filters.price_range) {
          allProducts = allProducts.filter(p => 
            p.base_price >= (filters.price_range?.min || 0) &&
            p.base_price <= (filters.price_range?.max || 999999)
          )
        }
        
        setProducts(allProducts)
      } catch (error) {
        console.error('Error loading products:', error)
        // Fallback to just Etsy products if Hostinger fetch fails
        setProducts(getAllMockProducts())
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [filters])

  const handleFiltersChange = (newFilters: ProductFilters) => {
    setFilters(newFilters)
    
    // Update URL
    const params = new URLSearchParams()
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.category) params.set('category', newFilters.category)
    if (newFilters.material) params.set('material', newFilters.material)
    if (newFilters.price_range) {
      if (newFilters.price_range.min > 0) params.set('min_price', newFilters.price_range.min.toString())
      if (newFilters.price_range.max < 999999) params.set('max_price', newFilters.price_range.max.toString())
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
    window.history.replaceState({}, '', newUrl)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">All Products</h1>
          <p className="text-muted-foreground">
            Discover our complete collection of professional photo prints
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className={`lg:block ${showFilters ? 'block' : 'hidden'}`}>
          <div className="sticky top-24">
            <ProductFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              categories={categories}
              onClose={() => setShowFilters(false)}
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : `${products.length} products found`}
            </p>
          </div>

          <ProductGrid
            products={products}
            loading={loading}
            emptyMessage="No products match your filters"
            showWishlist={true}
          />
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading products...</div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}