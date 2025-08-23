import { NextRequest, NextResponse } from 'next/server'
import { OrdersDatabase } from '@/lib/database/orders'
import { supabaseAdmin } from '@/lib/supabase/client'
import { handleApiError } from '@/lib/utils/error-handler'

// Middleware to verify admin access
async function verifyAdminAccess(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return null

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) return null

    return user
  } catch (error) {
    console.error('Admin verification error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const user = await verifyAdminAccess(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Get order statistics
    const { orders } = await OrdersDatabase.getAllOrders(1, 10000) // Get all orders for stats

    const stats = {
      total_orders: orders.length,
      total_revenue: orders.reduce((sum, order) => sum + order.total, 0),
      pending_orders: orders.filter(order => order.status === 'pending').length,
      confirmed_orders: orders.filter(order => order.status === 'confirmed').length,
      processing_orders: orders.filter(order => order.status === 'processing').length,
      shipped_orders: orders.filter(order => order.status === 'shipped').length,
      delivered_orders: orders.filter(order => order.status === 'delivered').length,
      cancelled_orders: orders.filter(order => order.status === 'cancelled').length,
      completed_orders: orders.filter(order => ['delivered', 'shipped'].includes(order.status)).length,
      
      // Monthly stats (last 12 months)
      monthly_revenue: getMonthlyRevenue(orders),
      monthly_orders: getMonthlyOrders(orders),
      
      // Top products
      top_products: getTopProducts(orders),
      
      // Average order value
      average_order_value: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
      
      // Recent activity (last 30 days)
      recent_orders_count: orders.filter(order => 
        new Date(order.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length,
      
      recent_revenue: orders
        .filter(order => new Date(order.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, order) => sum + order.total, 0)
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    return handleApiError(error)
  }
}

function getMonthlyRevenue(orders: any[]) {
  const monthlyData: Record<string, number> = {}
  
  // Initialize last 12 months with 0
  for (let i = 11; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    monthlyData[key] = 0
  }
  
  // Add actual revenue
  orders.forEach(order => {
    const date = new Date(order.created_at)
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    if (monthlyData.hasOwnProperty(key)) {
      monthlyData[key] += order.total
    }
  })
  
  return Object.entries(monthlyData).map(([month, revenue]) => ({
    month,
    revenue: Math.round(revenue * 100) / 100
  }))
}

function getMonthlyOrders(orders: any[]) {
  const monthlyData: Record<string, number> = {}
  
  // Initialize last 12 months with 0
  for (let i = 11; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    monthlyData[key] = 0
  }
  
  // Add actual order counts
  orders.forEach(order => {
    const date = new Date(order.created_at)
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    if (monthlyData.hasOwnProperty(key)) {
      monthlyData[key] += 1
    }
  })
  
  return Object.entries(monthlyData).map(([month, count]) => ({
    month,
    count
  }))
}

function getTopProducts(orders: any[]) {
  const productCounts: Record<string, { title: string; count: number; revenue: number }> = {}
  
  orders.forEach(order => {
    order.items.forEach((item: any) => {
      const productId = item.product_id || 'unknown'
      const title = item.product_snapshot?.title || 'Unknown Product'
      
      if (!productCounts[productId]) {
        productCounts[productId] = { title, count: 0, revenue: 0 }
      }
      
      productCounts[productId].count += item.quantity
      productCounts[productId].revenue += item.total_price
    })
  })
  
  return Object.entries(productCounts)
    .map(([productId, data]) => ({
      product_id: productId,
      title: data.title,
      orders_count: data.count,
      total_revenue: Math.round(data.revenue * 100) / 100
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10)
}