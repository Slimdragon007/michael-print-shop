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

// GET - Get specific order details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const user = await verifyAdminAccess(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const orderId = params.id
    const order = await OrdersDatabase.getOrderById(orderId)

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          total: order.total,
          stripe_payment_intent_id: order.stripe_payment_intent_id,
          tracking_number: order.tracking_number,
          notes: order.notes,
          shipping_address: order.shipping_address,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items: order.items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            print_option_id: item.print_option_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            product_snapshot: item.product_snapshot
          }))
        }
      }
    })

  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PATCH - Update order status or tracking
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const user = await verifyAdminAccess(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const orderId = params.id
    const body = await request.json()
    const { status, tracking_number, notes } = body

    // Validate status if provided
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      )
    }

    // Get current order
    const currentOrder = await OrdersDatabase.getOrderById(orderId)
    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    let updatedOrder

    // Update tracking number if provided
    if (tracking_number) {
      updatedOrder = await OrdersDatabase.addTrackingNumber(orderId, tracking_number)
    } 
    // Update status if provided
    else if (status) {
      const updateNotes = notes || `Status updated by admin: ${user.email}`
      updatedOrder = await OrdersDatabase.updateOrderStatus(orderId, status, updateNotes)
    }
    else {
      return NextResponse.json(
        { error: 'No updates provided. Specify status, tracking_number, or notes' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: updatedOrder.id,
          order_number: updatedOrder.order_number,
          status: updatedOrder.status,
          tracking_number: updatedOrder.tracking_number,
          updated_at: updatedOrder.updated_at
        }
      },
      message: 'Order updated successfully'
    })

  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}