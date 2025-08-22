'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { ProductFilters, Category, PrintMaterial } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProductFiltersProps {
  filters: ProductFilters
  onFiltersChange: (filters: ProductFilters) => void
  categories: Category[]
  onClose?: () => void
}

const PRINT_MATERIALS: { value: PrintMaterial; label: string }[] = [
  { value: 'metal', label: 'Metal Print' },
  { value: 'canvas', label: 'Canvas Print' },
  { value: 'fine-art-paper', label: 'Fine Art Paper' },
]

const PRICE_RANGES = [
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $200', min: 100, max: 200 },
  { label: '$200 - $500', min: 200, max: 500 },
  { label: '$500+', min: 500, max: 999999 },
]

export function ProductFilters({ 
  filters, 
  onFiltersChange, 
  categories,
  onClose 
}: ProductFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || '')
  const [customPriceRange, setCustomPriceRange] = useState({
    min: filters.price_range?.min?.toString() || '',
    max: filters.price_range?.max?.toString() || '',
  })

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleFilterChange('search', searchQuery)
  }

  const handlePriceRangeSelect = (min: number, max: number) => {
    handleFilterChange('price_range', { min, max })
    setCustomPriceRange({ min: min.toString(), max: max.toString() })
  }

  const handleCustomPriceRange = () => {
    const min = parseFloat(customPriceRange.min) || 0
    const max = parseFloat(customPriceRange.max) || 999999
    handleFilterChange('price_range', { min, max })
  }

  const clearFilters = () => {
    onFiltersChange({})
    setSearchQuery('')
    setCustomPriceRange({ min: '', max: '' })
  }

  const hasActiveFilters = Boolean(
    filters.search || 
    filters.category || 
    filters.material || 
    filters.price_range || 
    (filters.tags && filters.tags.length > 0)
  )

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search */}
        <div>
          <label className="text-sm font-medium mb-2 block">Search</label>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </div>

        {/* Categories */}
        <div>
          <label className="text-sm font-medium mb-2 block">Category</label>
          <div className="space-y-2">
            <Button
              variant={!filters.category ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              onClick={() => handleFilterChange('category', undefined)}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={filters.category === category.id ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
                onClick={() => 
                  handleFilterChange('category', 
                    filters.category === category.id ? undefined : category.id
                  )
                }
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Print Materials */}
        <div>
          <label className="text-sm font-medium mb-2 block">Material</label>
          <div className="space-y-2">
            <Button
              variant={!filters.material ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              onClick={() => handleFilterChange('material', undefined)}
            >
              All Materials
            </Button>
            {PRINT_MATERIALS.map((material) => (
              <Button
                key={material.value}
                variant={filters.material === material.value ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
                onClick={() => 
                  handleFilterChange('material', 
                    filters.material === material.value ? undefined : material.value
                  )
                }
              >
                {material.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="text-sm font-medium mb-2 block">Price Range</label>
          <div className="space-y-2">
            <Button
              variant={!filters.price_range ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              onClick={() => handleFilterChange('price_range', undefined)}
            >
              Any Price
            </Button>
            {PRICE_RANGES.map((range) => {
              const isSelected = filters.price_range?.min === range.min && 
                                filters.price_range?.max === range.max
              return (
                <Button
                  key={range.label}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handlePriceRangeSelect(range.min, range.max)}
                >
                  {range.label}
                </Button>
              )
            })}
          </div>

          {/* Custom Price Range */}
          <div className="mt-3 space-y-2">
            <label className="text-xs text-muted-foreground">Custom Range</label>
            <div className="flex gap-2">
              <Input
                placeholder="Min"
                type="number"
                value={customPriceRange.min}
                onChange={(e) => setCustomPriceRange(prev => ({ ...prev, min: e.target.value }))}
              />
              <Input
                placeholder="Max"
                type="number"
                value={customPriceRange.max}
                onChange={(e) => setCustomPriceRange(prev => ({ ...prev, max: e.target.value }))}
              />
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={handleCustomPriceRange}
            >
              Apply
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div>
            <label className="text-sm font-medium mb-2 block">Active Filters</label>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {filters.search}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('search', undefined)}
                  />
                </Badge>
              )}
              {filters.category && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {categories.find(c => c.id === filters.category)?.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('category', undefined)}
                  />
                </Badge>
              )}
              {filters.material && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {PRINT_MATERIALS.find(m => m.value === filters.material)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('material', undefined)}
                  />
                </Badge>
              )}
              {filters.price_range && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  ${filters.price_range.min} - ${filters.price_range.max}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('price_range', undefined)}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}