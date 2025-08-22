// Database Types
export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          title: string
          description: string
          image_url: string
          base_price: number
          category_id: string
          tags: string[]
          dimensions: {
            width: number
            height: number
          }
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          title: string
          description: string
          image_url: string
          base_price: number
          category_id: string
          tags?: string[]
          dimensions: {
            width: number
            height: number
          }
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          title?: string
          description?: string
          image_url?: string
          base_price?: number
          category_id?: string
          tags?: string[]
          dimensions?: {
            width: number
            height: number
          }
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          created_at?: string
        }
      }
      print_options: {
        Row: {
          id: string
          product_id: string
          material: PrintMaterial
          size: string
          price_modifier: number
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          material: PrintMaterial
          size: string
          price_modifier: number
          is_available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          material?: PrintMaterial
          size?: string
          price_modifier?: number
          is_available?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          total: number
          status: OrderStatus
          shipping_address: ShippingAddress
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total: number
          status?: OrderStatus
          shipping_address: ShippingAddress
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total?: number
          status?: OrderStatus
          shipping_address?: ShippingAddress
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          print_option_id: string
          quantity: number
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          print_option_id: string
          quantity: number
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          print_option_id?: string
          quantity?: number
          price?: number
          created_at?: string
        }
      }
    }
  }
}

// Enums
export type PrintMaterial = 'metal' | 'canvas' | 'fine-art-paper'
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

// Core Types
export interface Product {
  id: string
  title: string
  description: string
  image_url: string
  base_price: number
  category: Category
  tags: string[]
  dimensions: {
    width: number
    height: number
  }
  print_options: PrintOption[]
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  created_at: string
}

export interface PrintOption {
  id: string
  product_id: string
  material: PrintMaterial
  size: string
  price_modifier: number
  is_available: boolean
  created_at: string
}

export interface Order {
  id: string
  user_id: string
  total: number
  status: OrderStatus
  shipping_address: ShippingAddress
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product: Product
  print_option: PrintOption
  quantity: number
  price: number
  created_at: string
}

export interface ShippingAddress {
  first_name: string
  last_name: string
  company?: string
  address_line_1: string
  address_line_2?: string
  city: string
  state: string
  postal_code: string
  country: string
  phone?: string
}

// Cart Types
export interface CartItem {
  product: Product
  print_option: PrintOption
  quantity: number
  total_price: number
}

export interface Cart {
  items: CartItem[]
  total: number
  item_count: number
}

// Filter Types
export interface ProductFilters {
  category?: string
  material?: PrintMaterial
  price_range?: {
    min: number
    max: number
  }
  tags?: string[]
  search?: string
}

// API Response Types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

// Form Types
export interface ProductFormData {
  title: string
  description: string
  image_url: string
  base_price: number
  category_id: string
  tags: string[]
  dimensions: {
    width: number
    height: number
  }
  print_options: {
    material: PrintMaterial
    size: string
    price_modifier: number
  }[]
}

export interface CheckoutFormData {
  shipping_address: ShippingAddress
  payment_method_id: string
}

export interface CSVImportData {
  title: string
  description?: string
  image_url: string
  base_price: string | number
  category: string
  tags?: string
  width: string | number
  height: string | number
}

// Auth Types
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: 'admin' | 'customer'
  created_at: string
}

// Print Provider Types
export interface PrintProviderOptions {
  provider: string
  materials: PrintMaterial[]
  sizes: string[]
  shipping_methods: string[]
}

// AI Types
export interface AIProductSuggestion {
  title: string
  description: string
  tags: string[]
  category: string
}

// Component Props Types
export interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product, printOption: PrintOption) => void
}

export interface FilterSidebarProps {
  filters: ProductFilters
  onFiltersChange: (filters: ProductFilters) => void
  categories: Category[]
}

export interface CartSummaryProps {
  cart: Cart
  onUpdateQuantity: (itemIndex: number, quantity: number) => void
  onRemoveItem: (itemIndex: number) => void
}

// Hook Return Types
export interface UseProductsReturn {
  products: Product[]
  loading: boolean
  error: string | null
  total: number
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
}

export interface UseCartReturn {
  cart: Cart
  addItem: (product: Product, printOption: PrintOption, quantity?: number) => void
  removeItem: (itemIndex: number) => void
  updateQuantity: (itemIndex: number, quantity: number) => void
  clearCart: () => void
  isLoading: boolean
}

export interface UseOrdersReturn {
  orders: Order[]
  loading: boolean
  error: string | null
  createOrder: (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>) => Promise<Order>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
}

// Store Types
export interface CartStore {
  cart: Cart
  addItem: (product: Product, printOption: PrintOption, quantity?: number) => void
  removeItem: (itemIndex: number) => void
  updateQuantity: (itemIndex: number, quantity: number) => void
  clearCart: () => void
  loadCart: () => void
  saveCart: () => void
}

export interface AuthStore {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export interface ProductStore {
  products: Product[]
  categories: Category[]
  filters: ProductFilters
  loading: boolean
  error: string | null
  setFilters: (filters: ProductFilters) => void
  loadProducts: () => Promise<void>
  loadCategories: () => Promise<void>
  searchProducts: (query: string) => void
}