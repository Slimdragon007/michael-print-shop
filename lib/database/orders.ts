import { supabase } from '@/lib/supabase/client'
import { Order, OrderItem, OrderStatus, ApiResponse, PaginatedResponse } from '@/types'

export class OrderService {
  private supabase = supabase

  constructor() {
    this.supabase = supabase
  }

  async createOrder(orderData: {
    user_id: string
    items: Array<{
      product_id: string
      print_option_id: string
      quantity: number
      price: number
    }>
    total: number
    shipping_address: any
    stripe_payment_intent_id?: string
  }): Promise<ApiResponse<Order>> {
    try {
      // Start a transaction
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .insert({
          user_id: orderData.user_id,
          total: orderData.total,
          status: 'pending' as OrderStatus,
          shipping_address: orderData.shipping_address,
          stripe_payment_intent_id: orderData.stripe_payment_intent_id,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Insert order items
      const orderItemsData = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        print_option_id: item.print_option_id,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItemsData)

      if (itemsError) throw itemsError

      // Fetch the complete order with items
      const completeOrder = await this.getOrderById(order.id)

      if (!completeOrder) {
        throw new Error('Failed to fetch created order')
      }

      return {
        success: true,
        data: completeOrder,
        message: 'Order created successfully',
      }
    } catch (error) {
      console.error('Error creating order:', error)
      return {
        success: false,
        error: 'Failed to create order',
      }
    }
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const { data: orderData, error: orderError } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (orderError || !orderData) return null

      const { data: itemsData, error: itemsError } = await this.supabase
        .from('order_items')
        .select(`
          *,
          product:products(*),
          print_option:print_options(*)
        `)
        .eq('order_id', id)

      if (itemsError) throw itemsError

      const items: OrderItem[] = itemsData?.map(item => ({
        id: item.id,
        order_id: item.order_id,
        product: item.product,
        print_option: item.print_option,
        quantity: item.quantity,
        price: item.price,
        created_at: item.created_at,
      })) || []

      return {
        id: orderData.id,
        user_id: orderData.user_id,
        total: orderData.total,
        status: orderData.status,
        shipping_address: orderData.shipping_address,
        items,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at,
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      return null
    }
  }

  async getUserOrders(
    userId: string,
    page = 1,
    perPage = 10
  ): Promise<PaginatedResponse<Order>> {
    try {
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      const { data: ordersData, error: ordersError, count } = await this.supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (ordersError) throw ordersError

      const orders: Order[] = []

      for (const orderData of ordersData || []) {
        const { data: itemsData, error: itemsError } = await this.supabase
          .from('order_items')
          .select(`
            *,
            product:products(*),
            print_option:print_options(*)
          `)
          .eq('order_id', orderData.id)

        if (itemsError) continue

        const items: OrderItem[] = itemsData?.map(item => ({
          id: item.id,
          order_id: item.order_id,
          product: item.product,
          print_option: item.print_option,
          quantity: item.quantity,
          price: item.price,
          created_at: item.created_at,
        })) || []

        orders.push({
          id: orderData.id,
          user_id: orderData.user_id,
          total: orderData.total,
          status: orderData.status,
          shipping_address: orderData.shipping_address,
          items,
          created_at: orderData.created_at,
          updated_at: orderData.updated_at,
        })
      }

      return {
        data: orders,
        pagination: {
          page,
          per_page: perPage,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / perPage),
        },
      }
    } catch (error) {
      console.error('Error fetching user orders:', error)
      return {
        data: [],
        pagination: {
          page: 1,
          per_page: perPage,
          total: 0,
          total_pages: 0,
        },
      }
    }
  }

  async getAllOrders(
    page = 1,
    perPage = 20,
    status?: OrderStatus
  ): Promise<PaginatedResponse<Order>> {
    try {
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      let query = this.supabase
        .from('orders')
        .select('*', { count: 'exact' })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: ordersData, error: ordersError, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (ordersError) throw ordersError

      const orders: Order[] = []

      for (const orderData of ordersData || []) {
        const { data: itemsData, error: itemsError } = await this.supabase
          .from('order_items')
          .select(`
            *,
            product:products(*),
            print_option:print_options(*)
          `)
          .eq('order_id', orderData.id)

        if (itemsError) continue

        const items: OrderItem[] = itemsData?.map(item => ({
          id: item.id,
          order_id: item.order_id,
          product: item.product,
          print_option: item.print_option,
          quantity: item.quantity,
          price: item.price,
          created_at: item.created_at,
        })) || []

        orders.push({
          id: orderData.id,
          user_id: orderData.user_id,
          total: orderData.total,
          status: orderData.status,
          shipping_address: orderData.shipping_address,
          items,
          created_at: orderData.created_at,
          updated_at: orderData.updated_at,
        })
      }

      return {
        data: orders,
        pagination: {
          page,
          per_page: perPage,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / perPage),
        },
      }
    } catch (error) {
      console.error('Error fetching all orders:', error)
      return {
        data: [],
        pagination: {
          page: 1,
          per_page: perPage,
          total: 0,
          total_pages: 0,
        },
      }
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    trackingNumber?: string
  ): Promise<ApiResponse<Order>> {
    try {
      const updateData: any = { status }
      if (trackingNumber) {
        updateData.tracking_number = trackingNumber
      }

      const { data, error } = await this.supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      const updatedOrder = await this.getOrderById(orderId)

      if (!updatedOrder) {
        throw new Error('Failed to fetch updated order')
      }

      return {
        success: true,
        data: updatedOrder,
        message: 'Order status updated successfully',
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      return {
        success: false,
        error: 'Failed to update order status',
      }
    }
  }

  async getOrderStats(userId?: string): Promise<{
    total_orders: number
    total_revenue: number
    pending_orders: number
    completed_orders: number
  }> {
    try {
      let query = this.supabase.from('orders').select('total, status')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      const stats = {
        total_orders: data?.length || 0,
        total_revenue: data?.reduce((sum, order) => sum + order.total, 0) || 0,
        pending_orders: data?.filter(order => order.status === 'pending').length || 0,
        completed_orders: data?.filter(order => order.status === 'delivered').length || 0,
      }

      return stats
    } catch (error) {
      console.error('Error fetching order stats:', error)
      return {
        total_orders: 0,
        total_revenue: 0,
        pending_orders: 0,
        completed_orders: 0,
      }
    }
  }

  async searchOrders(query: string, status?: OrderStatus): Promise<Order[]> {
    try {
      let supabaseQuery = this.supabase
        .from('orders')
        .select('*')

      if (status) {
        supabaseQuery = supabaseQuery.eq('status', status)
      }

      // Search by order ID or user information
      const { data: ordersData, error } = await supabaseQuery
        .ilike('id', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const orders: Order[] = []

      for (const orderData of ordersData || []) {
        const { data: itemsData, error: itemsError } = await this.supabase
          .from('order_items')
          .select(`
            *,
            product:products(*),
            print_option:print_options(*)
          `)
          .eq('order_id', orderData.id)

        if (itemsError) continue

        const items: OrderItem[] = itemsData?.map(item => ({
          id: item.id,
          order_id: item.order_id,
          product: item.product,
          print_option: item.print_option,
          quantity: item.quantity,
          price: item.price,
          created_at: item.created_at,
        })) || []

        orders.push({
          id: orderData.id,
          user_id: orderData.user_id,
          total: orderData.total,
          status: orderData.status,
          shipping_address: orderData.shipping_address,
          items,
          created_at: orderData.created_at,
          updated_at: orderData.updated_at,
        })
      }

      return orders
    } catch (error) {
      console.error('Error searching orders:', error)
      return []
    }
  }

  async deleteOrder(orderId: string): Promise<ApiResponse<void>> {
    try {
      // First delete order items
      const { error: itemsError } = await this.supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      if (itemsError) throw itemsError

      // Then delete the order
      const { error: orderError } = await this.supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (orderError) throw orderError

      return {
        success: true,
        message: 'Order deleted successfully',
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      return {
        success: false,
        error: 'Failed to delete order',
      }
    }
  }
}