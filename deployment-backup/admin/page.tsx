'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, ShoppingCart, Users, TrendingUp, Plus, Upload } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ProductService } from '@/lib/database/products'
import { OrderService } from '@/lib/database/orders'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  })
  const [loading, setLoading] = useState(true)
  
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
      return
    }

    if (user?.role === 'admin') {
      loadStats()
    }
  }, [user, router])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      const productService = new ProductService()
      const orderService = new OrderService()

      // Load products count
      const productsResult = await productService.getProducts({}, 1, 1)
      
      // Load order stats
      const orderStats = await orderService.getOrderStats()

      setStats({
        totalProducts: productsResult.pagination.total,
        totalOrders: orderStats.total_orders,
        totalRevenue: orderStats.total_revenue,
        pendingOrders: orderStats.pending_orders,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your print shop from here
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats.totalRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingOrders}</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button className="h-24 flex-col" asChild>
                  <Link href="/admin/products/new">
                    <Plus className="h-6 w-6 mb-2" />
                    Add Product
                  </Link>
                </Button>

                <Button variant="outline" className="h-24 flex-col" asChild>
                  <Link href="/admin/products">
                    <Package className="h-6 w-6 mb-2" />
                    Manage Products
                  </Link>
                </Button>

                <Button variant="outline" className="h-24 flex-col" asChild>
                  <Link href="/admin/orders">
                    <ShoppingCart className="h-6 w-6 mb-2" />
                    View Orders
                  </Link>
                </Button>

                <Button variant="outline" className="h-24 flex-col" asChild>
                  <Link href="/admin/import">
                    <Upload className="h-6 w-6 mb-2" />
                    Import CSV
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Recent orders and activities will appear here
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}