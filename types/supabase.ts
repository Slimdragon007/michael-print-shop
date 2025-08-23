export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string
          base_price: number
          category_id: string | null
          tags: string[] | null
          dimensions: string | null
          featured: boolean
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url: string
          base_price: number
          category_id?: string | null
          tags?: string[] | null
          dimensions?: string | null
          featured?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string
          base_price?: number
          category_id?: string | null
          tags?: string[] | null
          dimensions?: string | null
          featured?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      print_options: {
        Row: {
          id: string
          product_id: string
          material: string
          size: string
          price_modifier: number
          stock_quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          material: string
          size: string
          price_modifier?: number
          stock_quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          material?: string
          size?: string
          price_modifier?: number
          stock_quantity?: number
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          order_number: string
          status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          subtotal: number
          tax: number
          shipping: number
          total: number
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          shipping_address: any
          tracking_number: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          order_number: string
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          subtotal: number
          tax?: number
          shipping?: number
          total: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          shipping_address: any
          tracking_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          order_number?: string
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          subtotal?: number
          tax?: number
          shipping?: number
          total?: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          shipping_address?: any
          tracking_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          print_option_id: string | null
          quantity: number
          unit_price: number
          total_price: number
          product_snapshot: any | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          print_option_id?: string | null
          quantity?: number
          unit_price: number
          total_price: number
          product_snapshot?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          print_option_id?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          product_snapshot?: any | null
          created_at?: string
        }
      }
      wishlists: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          created_at?: string
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          print_option_id: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          print_option_id: string
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          print_option_id?: string
          quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}