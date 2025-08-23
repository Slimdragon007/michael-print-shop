import { supabaseAdmin } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'

type Order = Database['public']['Tables']['orders']['Row']
type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderUpdate = Database['public']['Tables']['orders']['Update']
type OrderItem = Database['public']['Tables']['order_items']['Row']
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']

export interface CreateOrderData {
  user_id?: string
  order_number: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: number
  tax: number
  shipping: number
  total: number
  stripe_payment_intent_id?: string
  stripe_session_id?: string
  shipping_address: {
    firstName: string
    lastName: string
    email: string
    address: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  items: {
    product_id: string
    print_option_id?: string
    quantity: number
    unit_price: number
    total_price: number
    product_snapshot: any
  }[]
  tracking_number?: string
  notes?: string
}

export class OrdersDatabase {
  /**
   * Generate a unique order number
   */
  static async generateOrderNumber(): Promise<string> {
    try {
      const { data, error } = await supabaseAdmin.rpc('generate_order_number')
      
      if (error) {
        console.error('Error generating order number:', error)
        // Fallback order number generation
        const timestamp = Date.now().toString()
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        return `ORD-${timestamp}-${random}`
      }
      
      return data
    } catch (error) {
      console.error('Database error generating order number:', error)
      const timestamp = Date.now().toString()
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      return `ORD-${timestamp}-${random}`
    }
  }

  /**
   * Create a new order with items
   */
  static async createOrder(orderData: CreateOrderData): Promise<{ order: Order; items: OrderItem[] }> {
    try {
      // Insert order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: orderData.user_id,
          order_number: orderData.order_number,
          status: orderData.status,
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          shipping: orderData.shipping,
          total: orderData.total,
          stripe_payment_intent_id: orderData.stripe_payment_intent_id,
          stripe_session_id: orderData.stripe_session_id,
          shipping_address: orderData.shipping_address,
          tracking_number: orderData.tracking_number,
          notes: orderData.notes
        })
        .select()
        .single()

      if (orderError) {
        console.error('Error inserting order:', orderError)
        throw new Error(`Failed to create order: ${orderError.message}`)
      }

      // Insert order items
      const orderItems: OrderItemInsert[] = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        print_option_id: item.print_option_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        product_snapshot: item.product_snapshot
      }))

      const { data: items, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems)
        .select()

      if (itemsError) {
        console.error('Error inserting order items:', itemsError)
        // Rollback order creation
        await supabaseAdmin.from('orders').delete().eq('id', order.id)
        throw new Error(`Failed to create order items: ${itemsError.message}`)
      }

      return { order, items }
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId: string): Promise<Order & { items: OrderItem[] } | null> {
    try {
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        return null
      }

      const { data: items, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        throw new Error(`Failed to get order items: ${itemsError.message}`)
      }

      return { ...order, items: items || [] }
    } catch (error) {
      console.error('Error getting order by ID:', error)
      return null
    }
  }

  /**
   * Get order by order number
   */
  static async getOrderByNumber(orderNumber: string): Promise<Order & { items: OrderItem[] } | null> {
    try {
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single()

      if (orderError || !order) {
        return null
      }

      const { data: items, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        throw new Error(`Failed to get order items: ${itemsError.message}`)
      }

      return { ...order, items: items || [] }
    } catch (error) {
      console.error('Error getting order by number:', error)
      return null
    }
  }

  /**
   * Get order by Stripe payment intent ID
   */
  static async getOrderByPaymentIntent(paymentIntentId: string): Promise<Order & { items: OrderItem[] } | null> {
    try {
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single()

      if (orderError || !order) {
        return null
      }

      const { data: items, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        throw new Error(`Failed to get order items: ${itemsError.message}`)
      }

      return { ...order, items: items || [] }
    } catch (error) {
      console.error('Error getting order by payment intent:', error)
      return null
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId: string, status: Order['status'], notes?: string): Promise<Order> {
    try {
      const updateData: OrderUpdate = { status }
      if (notes) updateData.notes = notes

      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single()

      if (error) {
        console.error('Error updating order status:', error)
        throw new Error(`Failed to update order status: ${error.message}`)
      }

      return order
    } catch (error) {
      console.error('Error updating order status:', error)
      throw error
    }
  }

  /**
   * Add tracking number to order
   */
  static async addTrackingNumber(orderId: string, trackingNumber: string): Promise<Order> {
    try {
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .update({ 
          tracking_number: trackingNumber,
          status: 'shipped'
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) {
        console.error('Error adding tracking number:', error)
        throw new Error(`Failed to add tracking number: ${error.message}`)
      }

      return order
    } catch (error) {
      console.error('Error adding tracking number:', error)
      throw error
    }
  }

  /**
   * Get orders by user ID
   */
  static async getOrdersByUser(userId: string, limit = 50): Promise<(Order & { items: OrderItem[] })[]> {
    try {
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (ordersError) {
        console.error('Error fetching user orders:', ordersError)
        throw new Error(`Failed to get user orders: ${ordersError.message}`)
      }

      if (!orders || orders.length === 0) {
        return []
      }

      // Get all order items for these orders
      const orderIds = orders.map(order => order.id)
      const { data: allItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        throw new Error(`Failed to get order items: ${itemsError.message}`)
      }

      // Group items by order ID
      const itemsByOrderId = allItems?.reduce((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = []
        acc[item.order_id].push(item)
        return acc
      }, {} as Record<string, OrderItem[]>) || {}

      return orders.map(order => ({
        ...order,
        items: itemsByOrderId[order.id] || []
      }))
    } catch (error) {
      console.error('Error getting orders by user:', error)
      return []
    }
  }

  /**
   * Get all orders (admin)
   */
  static async getAllOrders(
    page = 1, 
    limit = 50, 
    status?: string
  ): Promise<{ orders: (Order & { items: OrderItem[] })[]; total: number }> {
    try {
      let query = supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact' })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: orders, error: ordersError, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (ordersError) {
        console.error('Error fetching all orders:', ordersError)
        throw new Error(`Failed to get orders: ${ordersError.message}`)
      }

      if (!orders || orders.length === 0) {
        return { orders: [], total: count || 0 }
      }

      // Get all order items for these orders
      const orderIds = orders.map(order => order.id)
      const { data: allItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        throw new Error(`Failed to get order items: ${itemsError.message}`)
      }

      // Group items by order ID
      const itemsByOrderId = allItems?.reduce((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = []
        acc[item.order_id].push(item)
        return acc
      }, {} as Record<string, OrderItem[]>) || {}

      const ordersWithItems = orders.map(order => ({
        ...order,
        items: itemsByOrderId[order.id] || []
      }))

      return { orders: ordersWithItems, total: count || 0 }
    } catch (error) {
      console.error('Error getting all orders:', error)
      return { orders: [], total: 0 }
    }
  }
}