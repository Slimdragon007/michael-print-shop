'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Package, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle,
  DollarSign,
  Calendar,
  User,
  Mail,
  MapPin,
  Hash
} from 'lucide-react'

interface Order {
  id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: number
  tax: number
  shipping: number
  total: number
  customer_name: string
  customer_email: string
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
  tracking_number?: string
  created_at: string
  updated_at: string
  items_count: number
  items: {
    id: string
    quantity: number
    unit_price: number
    total_price: number
    product_snapshot: {
      title: string
      print_details: string
    }
  }[]
}

interface OrderStats {
  total_orders: number
  total_revenue: number
  pending_orders: number
  completed_orders: number
}

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [orderNotes, setOrderNotes] = useState('')

  useEffect(() => {
    loadOrders()
    loadStats()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token') // Assuming admin auth
      
      const response = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setOrders(data.data.orders)
      } else {
        console.error('Failed to load orders:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      
      const response = await fetch('/api/admin/orders/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      })

      if (response.ok) {
        await loadOrders()
        await loadStats()
        setEditingOrder(null)
      } else {
        console.error('Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const addTrackingNumber = async (orderId: string, tracking: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tracking_number: tracking })
      })

      if (response.ok) {
        await loadOrders()
        setTrackingNumber('')
        setEditingOrder(null)
      } else {
        console.error('Failed to add tracking number')
      }
    } catch (error) {
      console.error('Error adding tracking:', error)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'processing': return 'bg-purple-100 text-purple-800'
      case 'shipped': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-emerald-100 text-emerald-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'confirmed': return <CheckCircle className="h-4 w-4" />
      case 'processing': return <Package className="h-4 w-4" />
      case 'shipped': return <Truck className="h-4 w-4" />
      case 'delivered': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed_orders}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>View and manage customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, customer name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadOrders} variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Orders Table */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders found</p>
            ) : (
              filteredOrders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono font-medium">{order.order_number}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{order.customer_name}</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1 capitalize">{order.status}</span>
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${order.total.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.items_count} item{order.items_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{order.customer_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{order.shipping_address.city}, {order.shipping_address.state}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>

                    {order.tracking_number && (
                      <div className="mt-3 p-2 bg-green-50 rounded-md">
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="h-4 w-4 text-green-600" />
                          <span className="text-green-800">Tracking: {order.tracking_number}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
                          </DialogHeader>
                          {selectedOrder && (
                            <div className="space-y-6">
                              {/* Customer Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Customer Information</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div><strong>Name:</strong> {selectedOrder.customer_name}</div>
                                    <div><strong>Email:</strong> {selectedOrder.customer_email}</div>
                                    <div><strong>Phone:</strong> N/A</div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Shipping Address</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-1">
                                    <div>{selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}</div>
                                    <div>{selectedOrder.shipping_address.address}</div>
                                    <div>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.postalCode}</div>
                                    <div>{selectedOrder.shipping_address.country}</div>
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Order Items */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Order Items</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    {selectedOrder.items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-start p-4 border rounded-lg">
                                        <div>
                                          <h4 className="font-medium">{item.product_snapshot.title}</h4>
                                          <p className="text-sm text-muted-foreground">{item.product_snapshot.print_details}</p>
                                          <p className="text-sm">Quantity: {item.quantity}</p>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-medium">${item.total_price.toFixed(2)}</div>
                                          <div className="text-sm text-muted-foreground">${item.unit_price.toFixed(2)} each</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="border-t pt-4 mt-4 space-y-2">
                                    <div className="flex justify-between">
                                      <span>Subtotal:</span>
                                      <span>${selectedOrder.subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Shipping:</span>
                                      <span>${selectedOrder.shipping.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Tax:</span>
                                      <span>${selectedOrder.tax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                      <span>Total:</span>
                                      <span>${selectedOrder.total.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingOrder(order)
                              setTrackingNumber(order.tracking_number || '')
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Manage Order - {editingOrder?.order_number}</DialogTitle>
                          </DialogHeader>
                          {editingOrder && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="status">Order Status</Label>
                                <Select 
                                  value={editingOrder.status}
                                  onValueChange={(value) => updateOrderStatus(editingOrder.id, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="tracking">Tracking Number</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="tracking"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Enter tracking number"
                                  />
                                  <Button 
                                    onClick={() => addTrackingNumber(editingOrder.id, trackingNumber)}
                                    disabled={!trackingNumber}
                                  >
                                    <Truck className="mr-2 h-4 w-4" />
                                    Add
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="notes">Order Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={orderNotes}
                                  onChange={(e) => setOrderNotes(e.target.value)}
                                  placeholder="Add notes about this order..."
                                />
                                <Button 
                                  className="mt-2" 
                                  onClick={() => updateOrderStatus(editingOrder.id, editingOrder.status, orderNotes)}
                                  disabled={!orderNotes}
                                >
                                  Save Notes
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}