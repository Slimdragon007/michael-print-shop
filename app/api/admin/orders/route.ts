import { NextRequest, NextResponse } from 'next/server'
import { OrdersDatabase } from '@/lib/database/orders'
import { supabaseAdmin } from '@/lib/supabase/client'

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

// GET - List all orders with pagination and filtering
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search')

    // Get orders with pagination
    const { orders, total } = await OrdersDatabase.getAllOrders(page, limit, status)

    // Filter by search term if provided (order number or customer name)
    let filteredOrders = orders
    if (search) {
      filteredOrders = orders.filter(order => 
        order.order_number.toLowerCase().includes(search.toLowerCase()) ||
        `${order.shipping_address.firstName} ${order.shipping_address.lastName}`
          .toLowerCase().includes(search.toLowerCase()) ||
        order.shipping_address.email.toLowerCase().includes(search.toLowerCase())
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        orders: filteredOrders.map(order => ({
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          total: order.total,
          customer_name: `${order.shipping_address.firstName} ${order.shipping_address.lastName}`,
          customer_email: order.shipping_address.email,
          shipping_address: order.shipping_address,
          tracking_number: order.tracking_number,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items_count: order.items.length,
          items: order.items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            product_snapshot: item.product_snapshot
          }))
        })),
        pagination: {
          page,
          limit,
          total: search ? filteredOrders.length : total,
          total_pages: Math.ceil((search ? filteredOrders.length : total) / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST - Create manual order (for phone orders, etc.)
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const user = await verifyAdminAccess(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      items, 
      shipping_address, 
      subtotal, 
      tax = 0, 
      shipping = 0, 
      notes 
    } = body

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      )
    }

    if (!shipping_address || !shipping_address.email) {
      return NextResponse.json(
        { error: 'Shipping address with email is required' },
        { status: 400 }
      )
    }

    // Generate order number
    const orderNumber = await OrdersDatabase.generateOrderNumber()

    const total = subtotal + tax + shipping

    // Create order
    const { order, items: orderItems } = await OrdersDatabase.createOrder({
      order_number: orderNumber,
      status: 'confirmed',
      subtotal,
      tax,
      shipping,
      total,
      shipping_address,
      items: items.map((item: any) => ({
        product_id: item.product_id,
        print_option_id: item.print_option_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        product_snapshot: item.product_snapshot
      })),
      notes: notes || `Manual order created by admin: ${user.email}`
    })

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total: order.total,
          created_at: order.created_at
        }
      },
      message: 'Order created successfully'
    })

  } catch (error) {
    console.error('Error creating manual order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}