'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  FileCode,
  Globe
} from 'lucide-react'
import { hostingerSync } from '@/lib/hostinger-sync'
import { hostingerAPI } from '@/lib/hostinger-api'

interface HostingerSyncPanelProps {
  allProducts: any[]
  onProductsUpdate: (products: any[]) => void
}

export function HostingerSyncPanel({ allProducts, onProductsUpdate }: HostingerSyncPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'ready' | 'error'>('idle')
  const [lastSync, setLastSync] = useState<string | null>(null)

  const handleGenerateUpdate = async () => {
    setIsGenerating(true)
    try {
      const updateFile = hostingerSync.generateUpdateFile(allProducts)
      
      // Create and download the file
      const blob = new Blob([updateFile.content], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = updateFile.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setSyncStatus('ready')
      setLastSync(new Date().toISOString())
    } catch (error) {
      console.error('Failed to generate update:', error)
      setSyncStatus('error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFetchFromHostinger = async () => {
    setIsFetching(true)
    try {
      const hostingerProducts = await hostingerAPI.scrapeProducts()
      const convertedProducts = hostingerAPI.convertToLocalFormat(hostingerProducts)
      
      // Update the products list with fresh Hostinger data
      const updatedProducts = [
        ...allProducts.filter(p => !p.id.startsWith('h_')), // Remove old Hostinger products
        ...convertedProducts.map(p => ({ ...p, id: `h_${p.id}` })) // Add fresh ones
      ]
      
      onProductsUpdate(updatedProducts)
      setSyncStatus('ready')
    } catch (error) {
      console.error('Failed to fetch from Hostinger:', error)
      setSyncStatus('error')
    } finally {
      setIsFetching(false)
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

  const etsyCount = allProducts.filter(p => !p.id.startsWith('h_')).length
  const hostingerCount = allProducts.filter(p => p.id.startsWith('h_')).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Hostinger Website Sync
          </CardTitle>
          <CardDescription>
            Manage synchronization between your admin dashboard and live Hostinger website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{etsyCount}</div>
              <div className="text-sm text-gray-600">Etsy Photos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{hostingerCount}</div>
              <div className="text-sm text-gray-600">Hostinger Photos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{allProducts.length}</div>
              <div className="text-sm text-gray-600">Total Combined</div>
            </div>
          </div>
          
          {lastSync && (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Last sync: {formatTimeAgo(lastSync)}</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Ready</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Fetch from Hostinger
            </CardTitle>
            <CardDescription>
              Pull the latest photos from your live Hostinger website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleFetchFromHostinger} 
              disabled={isFetching}
              className="w-full"
              variant="outline"
            >
              {isFetching ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync from Hostinger
                </>
              )}
            </Button>
            <p className="text-xs text-gray-600">
              This will fetch all products from prints.michaelhaslimphoto.com and merge them with your Etsy collection.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Update Hostinger Site
            </CardTitle>
            <CardDescription>
              Generate JavaScript file to update your live website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleGenerateUpdate} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <FileCode className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Update File
                </>
              )}
            </Button>
            <p className="text-xs text-gray-600">
              Downloads a JavaScript file with all your photos. Upload this to your Hostinger site to sync changes.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">🔄 Sync Process</h4>
              <ol className="text-sm space-y-2 text-gray-600">
                <li>1. Arrange photos in the Photo Manager tab</li>
                <li>2. Click "Download Update File" above</li>
                <li>3. Upload the file to your Hostinger website</li>
                <li>4. Your live site updates automatically!</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎯 Benefits</h4>
              <ul className="text-sm space-y-2 text-gray-600">
                <li>• Keep your existing Hawaii photos</li>
                <li>• Add all your Etsy collection</li>
                <li>• Manage everything from one dashboard</li>
                <li>• No database changes needed</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-800">Live Website</span>
            </div>
            <p className="text-sm text-blue-700">
              Your current website at{' '}
              <a 
                href="https://prints.michaelhaslimphoto.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                prints.michaelhaslimphoto.com
              </a>
              {' '}will show the combined collection once you upload the update file.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}