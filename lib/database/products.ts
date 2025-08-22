import { supabase } from '@/lib/supabase/client'
import { Product, ProductFilters, Category, PrintOption, ApiResponse, PaginatedResponse } from '@/types'

export class ProductService {
  private supabase = supabase

  constructor() {
    this.supabase = supabase
  }

  async getProducts(
    filters?: ProductFilters,
    page = 1,
    perPage = 12
  ): Promise<PaginatedResponse<Product>> {
    try {
      let query = this.supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          print_options(*)
        `)
        .eq('active', true)

      // Apply filters
      if (filters?.category) {
        query = query.eq('category_id', filters.category)
      }

      if (filters?.search) {
        query = query.textSearch('title,description,tags', filters.search)
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }

      if (filters?.price_range) {
        query = query
          .gte('base_price', filters.price_range.min)
          .lte('base_price', filters.price_range.max)
      }

      // Apply pagination
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false })

      if (error) throw error

      const products = data?.map(this.transformProductData) || []

      return {
        data: products,
        pagination: {
          page,
          per_page: perPage,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / perPage),
        },
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      throw new Error('Failed to fetch products')
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          print_options(*)
        `)
        .eq('id', id)
        .eq('active', true)
        .single()

      if (error || !data) return null

      return this.transformProductData(data)
    } catch (error) {
      console.error('Error fetching product:', error)
      return null
    }
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          print_options(*)
        `)
        .eq('slug', slug)
        .eq('active', true)
        .single()

      if (error || !data) return null

      return this.transformProductData(data)
    } catch (error) {
      console.error('Error fetching product by slug:', error)
      return null
    }
  }

  async createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Product>> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .insert({
          title: productData.title,
          description: productData.description,
          image_url: productData.image_url,
          base_price: productData.base_price,
          category_id: productData.category.id,
          tags: productData.tags,
          dimensions: productData.dimensions,
        })
        .select(`
          *,
          category:categories(*),
          print_options(*)
        `)
        .single()

      if (error) throw error

      const product = this.transformProductData(data)

      return {
        success: true,
        data: product,
        message: 'Product created successfully',
      }
    } catch (error) {
      console.error('Error creating product:', error)
      return {
        success: false,
        error: 'Failed to create product',
      }
    }
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<ApiResponse<Product>> {
    try {
      const updateData: any = {}

      if (updates.title) updateData.title = updates.title
      if (updates.description) updateData.description = updates.description
      if (updates.image_url) updateData.image_url = updates.image_url
      if (updates.base_price) updateData.base_price = updates.base_price
      if (updates.category) updateData.category_id = updates.category.id
      if (updates.tags) updateData.tags = updates.tags
      if (updates.dimensions) updateData.dimensions = updates.dimensions
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active

      const { data, error } = await this.supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          category:categories(*),
          print_options(*)
        `)
        .single()

      if (error) throw error

      const product = this.transformProductData(data)

      return {
        success: true,
        data: product,
        message: 'Product updated successfully',
      }
    } catch (error) {
      console.error('Error updating product:', error)
      return {
        success: false,
        error: 'Failed to update product',
      }
    }
  }

  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      return {
        success: true,
        message: 'Product deleted successfully',
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      return {
        success: false,
        error: 'Failed to delete product',
      }
    }
  }

  async searchProducts(query: string, limit = 10): Promise<Product[]> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          print_options(*)
        `)
        .textSearch('title,description,tags', query)
        .eq('active', true)
        .limit(limit)

      if (error) throw error

      return data?.map(this.transformProductData) || []
    } catch (error) {
      console.error('Error searching products:', error)
      return []
    }
  }

  async getRelatedProducts(productId: string, categoryId: string, limit = 4): Promise<Product[]> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          print_options(*)
        `)
        .eq('category_id', categoryId)
        .neq('id', productId)
        .eq('active', true)
        .limit(limit)

      if (error) throw error

      return data?.map(this.transformProductData) || []
    } catch (error) {
      console.error('Error fetching related products:', error)
      return []
    }
  }

  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          print_options(*)
        `)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data?.map(this.transformProductData) || []
    } catch (error) {
      console.error('Error fetching featured products:', error)
      return []
    }
  }

  private transformProductData(data: any): Product {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      image_url: data.image_url,
      base_price: data.base_price,
      category: data.category,
      tags: data.tags || [],
      dimensions: data.dimensions,
      print_options: data.print_options || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
      is_active: data.is_active,
    }
  }
}

export class CategoryService {
  private supabase = supabase

  constructor() {
    this.supabase = supabase
  }

  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    }
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !data) return null

      return data
    } catch (error) {
      console.error('Error fetching category:', error)
      return null
    }
  }

  async createCategory(categoryData: Omit<Category, 'id' | 'created_at'>): Promise<ApiResponse<Category>> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        data: data,
        message: 'Category created successfully',
      }
    } catch (error) {
      console.error('Error creating category:', error)
      return {
        success: false,
        error: 'Failed to create category',
      }
    }
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<ApiResponse<Category>> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        data: data,
        message: 'Category updated successfully',
      }
    } catch (error) {
      console.error('Error updating category:', error)
      return {
        success: false,
        error: 'Failed to update category',
      }
    }
  }
}

export class PrintOptionService {
  private supabase = supabase

  constructor() {
    this.supabase = supabase
  }

  async createPrintOption(printOptionData: Omit<PrintOption, 'id' | 'created_at'>): Promise<ApiResponse<PrintOption>> {
    try {
      const { data, error } = await this.supabase
        .from('print_options')
        .insert(printOptionData)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        data: data,
        message: 'Print option created successfully',
      }
    } catch (error) {
      console.error('Error creating print option:', error)
      return {
        success: false,
        error: 'Failed to create print option',
      }
    }
  }

  async updatePrintOption(id: string, updates: Partial<PrintOption>): Promise<ApiResponse<PrintOption>> {
    try {
      const { data, error } = await this.supabase
        .from('print_options')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        data: data,
        message: 'Print option updated successfully',
      }
    } catch (error) {
      console.error('Error updating print option:', error)
      return {
        success: false,
        error: 'Failed to update print option',
      }
    }
  }

  async deletePrintOption(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .from('print_options')
        .delete()
        .eq('id', id)

      if (error) throw error

      return {
        success: true,
        message: 'Print option deleted successfully',
      }
    } catch (error) {
      console.error('Error deleting print option:', error)
      return {
        success: false,
        error: 'Failed to delete print option',
      }
    }
  }
}