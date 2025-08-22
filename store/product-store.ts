import { create } from 'zustand'
import { Product, Category, ProductFilters, ProductStore } from '@/types'
import { ProductService, CategoryService } from '@/lib/database/products'

const productService = new ProductService()
const categoryService = new CategoryService()

export const useProductStore = create<ProductStore>()((set, get) => ({
  products: [],
  categories: [],
  filters: {},
  loading: false,
  error: null,

  setFilters: (filters: ProductFilters) => {
    set({ filters })
    // Automatically load products when filters change
    get().loadProducts()
  },

  loadProducts: async () => {
    try {
      set({ loading: true, error: null })
      
      const result = await productService.getProducts(get().filters)
      
      set({ 
        products: result.data,
        loading: false 
      })
    } catch (error) {
      console.error('Error loading products:', error)
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load products' 
      })
    }
  },

  loadCategories: async () => {
    try {
      const categories = await categoryService.getCategories()
      set({ categories })
    } catch (error) {
      console.error('Error loading categories:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load categories' 
      })
    }
  },

  searchProducts: async (query: string) => {
    try {
      set({ loading: true, error: null })
      
      const products = await productService.searchProducts(query)
      
      set({ 
        products,
        loading: false,
        filters: { ...get().filters, search: query }
      })
    } catch (error) {
      console.error('Error searching products:', error)
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Search failed' 
      })
    }
  },
}))