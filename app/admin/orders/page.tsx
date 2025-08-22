'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Eye, Package, Mail, DollarSign, Users, TrendingUp } from 'lucide-react'

interface Order {
  id: string
  customerName: string
  email: string
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered'
  items: Array<{
    title: string
    quantity: number
    price: number
  }>
  createdAt: string
}

// Mock orders for demo (in production, these would come from your database)
const mockOrders: Order[] = [
  {
    id: 'order_001',
    customerName: 'Sarah Johnson',
    email: 'sarah@email.com',
    total: 127.99,
    status: 'pending',
    items: [
      { title: 'Golden Gate Bridge at Night', quantity: 1, price: 65.00 },
      { title: 'Hawaiian Sunset', quantity: 2, price: 31.50 }
    ],
    createdAt: '2024-12-15T10:30:00Z'
  },
  {
    id: 'order_002', 
    customerName: 'Mike Chen',
    email: 'mike@email.com',
    total: 89.99,
    status: 'processing',
    items: [
      { title: 'Volcanic Landscapes', quantity: 1, price: 89.99 }
    ],
    createdAt: '2024-12-14T15:45:00Z'
  }
]

export default function OrdersAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Simple password authentication
  const handleLogin = () => {
    // In production, you'd verify against process.env.ADMIN_PASSWORD
    if (password === 'admin123' || password === 'your-secure-admin-password') {
      setIsAuthenticated(true)
      localStorage.setItem('admin-auth', 'true')
    } else {
      alert('Incorrect password')
    }
  }

  // Check if already logged in
  useEffect(() => {
    if (localStorage.getItem('admin-auth') === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ))
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'shipped': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Orders Admin</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter password to manage orders
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Demo password: <code>admin123</code>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Orders Management</h1>
              <p className="text-muted-foreground">Manage your print shop orders</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAuthenticated(false)
                localStorage.removeItem('admin-auth')
              }}
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-3xl font-bold">{orders.length}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                  <p className="text-3xl font-bold">
                    ${orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customers</p>
                  <p className="text-3xl font-bold">{orders.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold">
                    {orders.filter(o => o.status === 'pending').length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{order.customerName}</h3>
                      <p className="text-sm text-muted-foreground">{order.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${order.total}</p>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">Items:</p>
                    {order.items.map((item, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground">
                        {item.quantity}x {item.title} - ${item.price}
                      </p>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'processing')}
                      >
                        Start Processing
                      </Button>
                    )}
                    
                    {order.status === 'processing' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'shipped')}
                      >
                        Mark Shipped
                      </Button>
                    )}

                    <Button size="sm" variant="outline">
                      <Mail className="h-4 w-4 mr-1" />
                      Email Customer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}