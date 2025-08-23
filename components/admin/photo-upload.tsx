'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'

interface UploadedFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  errorMessage?: string
  photoId?: string
}

interface PhotoUploadProps {
  onUploadComplete?: (photoIds: string[]) => void
}

export function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    
    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    const uploadedPhotoIds: string[] = []

    for (const fileItem of files) {
      if (fileItem.status !== 'pending') continue

      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        ))

        // Create form data
        const formData = new FormData()
        formData.append('file', fileItem.file)
        
        // Basic metadata from file
        const metadata = {
          title: fileItem.file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          description: `Uploaded photo: ${fileItem.file.name}`,
          category: 'Uncategorized',
          location: 'Unknown',
          tags: ['uploaded'],
          featured: false,
          published: false
        }
        formData.append('metadata', JSON.stringify(metadata))

        // Upload with progress simulation
        const response = await fetch('/api/photos', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.success) {
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { 
                  ...f, 
                  status: 'success', 
                  progress: 100,
                  photoId: result.data.id 
                }
              : f
          ))
          uploadedPhotoIds.push(result.data.id)
        } else {
          throw new Error(result.message || 'Upload failed')
        }

      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { 
                ...f, 
                status: 'error', 
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
              }
            : f
        ))
      }
    }

    setUploading(false)
    
    if (uploadedPhotoIds.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedPhotoIds)
    }
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return null
      case 'uploading': return <Upload className="h-4 w-4 animate-pulse" />
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'uploading': return 'bg-blue-100 text-blue-800'
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Photos</CardTitle>
        <CardDescription>
          Upload new photos to your R2 storage. Supported formats: JPEG, PNG, WebP (max 10MB each)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50">
          <Upload className="h-12 w-12 mx-auto text-blue-500 mb-4" />
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
              <h3 className="text-lg font-bold text-blue-700 mb-2">📁 Upload Entire Folder</h3>
              <Button
                onClick={() => document.getElementById('folder-input')?.click()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 text-base"
              >
                Choose Folder (Uploads ALL Images)
              </Button>
              <input
                id="folder-input"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                webkitdirectory=""
                directory=""
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-sm text-gray-600 mt-2">Perfect for uploading photo shoots or entire galleries</p>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-blue-50 px-3 text-gray-500 font-medium">OR</span>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-700 mb-2">📷 Upload Individual Files</h3>
              <Button
                onClick={() => document.getElementById('files-input')?.click()}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 text-base"
              >
                Choose Individual Photos
              </Button>
              <input
                id="files-input"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-sm text-gray-600 mt-2">Select specific photos one by one</p>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Files ({files.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((fileItem) => (
                <div key={fileItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3 flex-1">
                    {getStatusIcon(fileItem.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(fileItem.file.size)}
                      </p>
                      {fileItem.errorMessage && (
                        <p className="text-xs text-red-600">{fileItem.errorMessage}</p>
                      )}
                    </div>
                    <Badge className={getStatusColor(fileItem.status)}>
                      {fileItem.status}
                    </Badge>
                  </div>
                  
                  {fileItem.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(fileItem.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              Clear All
            </Button>
            <Button
              onClick={uploadFiles}
              disabled={uploading || files.every(f => f.status !== 'pending')}
            >
              {uploading ? 'Uploading...' : `Upload ${files.filter(f => f.status === 'pending').length} Files`}
            </Button>
          </div>
        )}

        {/* Summary */}
        {files.length > 0 && (
          <div className="text-sm text-gray-600 space-y-1">
            <p>Pending: {files.filter(f => f.status === 'pending').length}</p>
            <p>Uploading: {files.filter(f => f.status === 'uploading').length}</p>
            <p>Success: {files.filter(f => f.status === 'success').length}</p>
            <p>Failed: {files.filter(f => f.status === 'error').length}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}