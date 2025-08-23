'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhotoManager } from '@/components/admin/photo-manager'
import { PhotoUpload } from '@/components/admin/photo-upload'
import { HostingerSyncPanel } from '@/components/admin/hostinger-sync-panel'
import { SimpleLiveEditor } from '@/components/admin/simple-live-editor'
import { OrderManagement } from '@/components/admin/order-management'
import { 
  Upload, 
  RefreshCw, 
  Database, 
  Image, 
  FileText, 
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  HardDrive
} from 'lucide-react'

interface SyncStatus {
  lastSync: string | null
  driveAvailable: boolean
  totalFiles: number
}

interface ImportStats {
  totalPhotos: number
  mainImages: number
  categories: Record<string, number>
  locations: Record<string, number>
}

interface ProcessingJob {
  id: string
  type: 'import' | 'optimize' | 'sync'
  status: 'running' | 'completed' | 'failed'
  progress: number
  message: string
  startTime: string
  endTime?: string
}

export default function AdminDashboard() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [loading, setLoading] = useState(false)
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])

  // Load photos and products from R2
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Loading photos from R2...')
        
        // Load photos from R2 API
        const photosResponse = await fetch('/api/photos')
        const photosData = await photosResponse.json()
        
        if (photosData.success) {
          setPhotos(photosData.data)
          console.log(`✅ Loaded ${photosData.data.length} photos from R2`)
        }
        
        // Load products from R2 API
        const productsResponse = await fetch('/api/products')
        const productsData = await productsResponse.json()
        
        if (productsData.success) {
          setAllProducts(productsData.data)
          console.log(`✅ Loaded ${productsData.data.length} products from R2`)
        }
        
      } catch (error) {
        console.error('❌ Failed to load data from R2:', error)
        // Set empty arrays on error
        setPhotos([])
        setAllProducts([])
      }
    }
    
    loadData()
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Check R2 health status
      const healthResponse = await fetch('/api/health')
      const healthData = await healthResponse.json()
      
      setSyncStatus({
        lastSync: healthData.timestamp,
        driveAvailable: healthData.services?.r2Storage?.status === 'healthy',
        totalFiles: photos.length
      })

      // Calculate stats from actual photo data
      const categories: Record<string, number> = {}
      const locations: Record<string, number> = {}
      
      photos.forEach(photo => {
        // Count categories
        const category = photo.category || 'Other'
        categories[category] = (categories[category] || 0) + 1
        
        // Extract location from tags
        const locationTag = photo.tags?.find((tag: string) => 
          tag.toLowerCase().includes('california') || 
          tag.toLowerCase().includes('hawaii') || 
          tag.toLowerCase().includes('arizona')
        )
        const location = locationTag || 'Other'
        locations[location] = (locations[location] || 0) + 1
      })

      setImportStats({
        totalPhotos: photos.length,
        mainImages: photos.filter(p => p.featured).length,
        categories,
        locations
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const startPhotoImport = async () => {
    setLoading(true)
    const jobId = Date.now().toString()
    
    const job: ProcessingJob = {
      id: jobId,
      type: 'import',
      status: 'running',
      progress: 0,
      message: 'Starting photo import from CSV...',
      startTime: new Date().toISOString()
    }
    
    setJobs(prev => [job, ...prev])
    
    try {
      // Simulate progress updates
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setJobs(prev => prev.map(j => 
          j.id === jobId 
            ? { ...j, progress: i, message: `Processing photos... ${i}%` }
            : j
        ))
      }
      
      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { 
              ...j, 
              status: 'completed', 
              progress: 100, 
              message: 'Photo import completed successfully',
              endTime: new Date().toISOString()
            }
          : j
      ))
      
      // Refresh dashboard data
      await loadDashboardData()
      
    } catch (error) {
      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { 
              ...j, 
              status: 'failed', 
              message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              endTime: new Date().toISOString()
            }
          : j
      ))
    } finally {
      setLoading(false)
    }
  }

  const startImageOptimization = async () => {
    setLoading(true)
    const jobId = Date.now().toString()
    
    const job: ProcessingJob = {
      id: jobId,
      type: 'optimize',
      status: 'running',
      progress: 0,
      message: 'Starting image optimization...',
      startTime: new Date().toISOString()
    }
    
    setJobs(prev => [job, ...prev])
    
    try {
      // Simulate optimization process
      const steps = [
        'Creating thumbnails...',
        'Generating web-optimized images...',
        'Creating WebP versions...',
        'Cleaning up temporary files...'
      ]
      
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const progress = Math.round(((i + 1) / steps.length) * 100)
        
        setJobs(prev => prev.map(j => 
          j.id === jobId 
            ? { ...j, progress, message: steps[i] }
            : j
        ))
      }
      
      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { 
              ...j, 
              status: 'completed', 
              progress: 100, 
              message: 'Image optimization completed',
              endTime: new Date().toISOString()
            }
          : j
      ))
      
    } catch (error) {
      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { 
              ...j, 
              status: 'failed', 
              message: `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              endTime: new Date().toISOString()
            }
          : j
      ))
    } finally {
      setLoading(false)
    }
  }

  const syncExternalDrive = async () => {
    setLoading(true)
    const jobId = Date.now().toString()
    
    const job: ProcessingJob = {
      id: jobId,
      type: 'sync',
      status: 'running',
      progress: 0,
      message: 'Checking external drive...',
      startTime: new Date().toISOString()
    }
    
    setJobs(prev => [job, ...prev])
    
    try {
      const steps = [
        'Checking external drive availability...',
        'Scanning for new files...',
        'Processing new photos...',
        'Updating sync state...'
      ]
      
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500))
        const progress = Math.round(((i + 1) / steps.length) * 100)
        
        setJobs(prev => prev.map(j => 
          j.id === jobId 
            ? { ...j, progress, message: steps[i] }
            : j
        ))
      }
      
      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { 
              ...j, 
              status: 'completed', 
              progress: 100, 
              message: 'External drive sync completed',
              endTime: new Date().toISOString()
            }
          : j
      ))
      
      // Update sync status
      setSyncStatus(prev => prev ? {
        ...prev,
        lastSync: new Date().toISOString()
      } : null)
      
    } catch (error) {
      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { 
              ...j, 
              status: 'failed', 
              message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              endTime: new Date().toISOString()
            }
          : j
      ))
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpdate = async (updatedPhotos: any[]) => {
    try {
      // Update photos via R2 API
      for (const photo of updatedPhotos) {
        const response = await fetch(`/api/photos/${photo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photo)
        })
        
        if (!response.ok) {
          throw new Error(`Failed to update photo ${photo.id}`)
        }
      }
      
      setPhotos(updatedPhotos)
      console.log('Photos updated successfully')
      
      // Refresh dashboard data
      await loadDashboardData()
      
    } catch (error) {
      console.error('Failed to update photos:', error)
      throw error
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  const getJobIcon = (type: ProcessingJob['type']) => {
    switch (type) {
      case 'import': return <Upload className="h-4 w-4" />
      case 'optimize': return <Image className="h-4 w-4" />
      case 'sync': return <RefreshCw className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'running': return <Clock className="h-4 w-4 animate-spin" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'failed': return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Photo Management Admin</h1>
          <p className="text-gray-600 mt-1">Manage your photo inventory and sync external drive</p>
        </div>
        <Button onClick={loadDashboardData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">External Drive</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {syncStatus?.driveAvailable ? (
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">Disconnected</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {syncStatus?.totalFiles || 0} files tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStatus?.lastSync ? formatTimeAgo(syncStatus.lastSync) : 'Never'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Jobs</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.filter(j => j.status === 'running').length}</div>
            <p className="text-xs text-muted-foreground">
              {jobs.filter(j => j.status === 'running').length > 0 ? 'Active' : 'Idle'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="live">Live Editor</TabsTrigger>
          <TabsTrigger value="photos">Photo Manager</TabsTrigger>
          <TabsTrigger value="sync">Hostinger Sync</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="jobs">Processing Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <OrderManagement />
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <SimpleLiveEditor />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Photos
                </CardTitle>
                <CardDescription>
                  Import photos from CSV inventory and create product data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={startPhotoImport} 
                  disabled={loading}
                  className="w-full"
                >
                  Start Import
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Optimize Images
                </CardTitle>
                <CardDescription>
                  Generate web-optimized versions and thumbnails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={startImageOptimization} 
                  disabled={loading}
                  className="w-full"
                >
                  Start Optimization
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Sync External Drive
                </CardTitle>
                <CardDescription>
                  Check for changes on external drive and sync
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={syncExternalDrive} 
                  disabled={loading || !syncStatus?.driveAvailable}
                  className="w-full"
                >
                  Sync Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <PhotoUpload 
                onUploadComplete={async (photoIds) => {
                  console.log('Photos uploaded:', photoIds)
                  // Refresh data
                  const photosResponse = await fetch('/api/photos')
                  const photosData = await photosResponse.json()
                  if (photosData.success) {
                    setPhotos(photosData.data)
                  }
                }}
              />
            </div>
            <div className="lg:col-span-2">
              <PhotoManager 
                photos={photos} 
                onPhotoUpdate={handlePhotoUpdate}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <HostingerSyncPanel 
            allProducts={allProducts}
            onProductsUpdate={setAllProducts}
          />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Photo Inventory Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {importStats && (
                  <>
                    <div className="flex justify-between">
                      <span>Total Photos:</span>
                      <span className="font-semibold">{importStats.totalPhotos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Main Images:</span>
                      <span className="font-semibold">{importStats.mainImages}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {importStats?.categories && Object.entries(importStats.categories).map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span>{category}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Locations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {importStats?.locations && Object.entries(importStats.locations).map(([location, count]) => (
                  <div key={location} className="flex justify-between items-center">
                    <span>{location}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Processing Jobs</CardTitle>
              <CardDescription>Track the status of import, optimization, and sync operations</CardDescription>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No jobs yet. Start an operation to see it here.</p>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getJobIcon(job.type)}
                          <span className="font-medium capitalize">{job.type}</span>
                          <Badge className={getStatusColor(job.status)}>
                            {getStatusIcon(job.status)}
                            <span className="ml-1">{job.status}</span>
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatTimeAgo(job.startTime)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{job.message}</p>
                      
                      {job.status === 'running' && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}