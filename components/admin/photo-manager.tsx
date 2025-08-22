'use client'

import { useState, useEffect } from 'react'
// import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd' // Removed for compatibility
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Image as ImageIcon, 
  GripVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Save, 
  Search,
  Grid,
  List,
  Filter,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface PhotoItem {
  id: string
  title: string
  description: string
  category: string
  location: string
  image_url: string
  thumbnail_url: string
  base_price: number
  display_order: number
  is_featured: boolean
  is_published: boolean
  tags: string[]
}

interface PhotoManagerProps {
  photos: PhotoItem[]
  onPhotoUpdate: (photos: PhotoItem[]) => void
}

export function PhotoManager({ photos: initialPhotos, onPhotoUpdate }: PhotoManagerProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Filter photos based on search and category
  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = categoryFilter === 'all' || photo.category === categoryFilter
    
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(photos.map(p => p.category)))]

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const reorderedPhotos = Array.from(filteredPhotos)
    const [reorderedItem] = reorderedPhotos.splice(result.source.index, 1)
    reorderedPhotos.splice(result.destination.index, 0, reorderedItem)

    // Update display_order based on new positions
    const updatedPhotos = reorderedPhotos.map((photo, index) => ({
      ...photo,
      display_order: index + 1
    }))

    // Merge back with non-filtered photos
    const allPhotosUpdated = photos.map(photo => {
      const updated = updatedPhotos.find(up => up.id === photo.id)
      return updated || photo
    })

    setPhotos(allPhotosUpdated)
    setHasChanges(true)
  }

  const togglePhotoFeature = (photoId: string) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId 
        ? { ...photo, is_featured: !photo.is_featured }
        : photo
    ))
    setHasChanges(true)
  }

  const togglePhotoPublish = (photoId: string) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId 
        ? { ...photo, is_published: !photo.is_published }
        : photo
    ))
    setHasChanges(true)
  }

  const updatePhotoDetails = (photoId: string, updates: Partial<PhotoItem>) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId 
        ? { ...photo, ...updates }
        : photo
    ))
    setHasChanges(true)
    setEditingPhoto(null)
  }

  const movePhoto = (photoId: string, direction: 'up' | 'down') => {
    const currentIndex = filteredPhotos.findIndex(p => p.id === photoId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= filteredPhotos.length) return

    const reorderedPhotos = [...filteredPhotos]
    const [movedPhoto] = reorderedPhotos.splice(currentIndex, 1)
    reorderedPhotos.splice(newIndex, 0, movedPhoto)

    // Update display_order
    const updatedPhotos = reorderedPhotos.map((photo, index) => ({
      ...photo,
      display_order: index + 1
    }))

    // Merge back with all photos
    const allPhotosUpdated = photos.map(photo => {
      const updated = updatedPhotos.find(up => up.id === photo.id)
      return updated || photo
    })

    setPhotos(allPhotosUpdated)
    setHasChanges(true)
  }

  const saveChanges = async () => {
    try {
      await onPhotoUpdate(photos)
      setHasChanges(false)
      // Show success message
    } catch (error) {
      console.error('Failed to save changes:', error)
      // Show error message
    }
  }

  const PhotoCard = ({ photo, index }: { photo: PhotoItem; index: number }) => (
    <Draggable draggableId={photo.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`${
            snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
          } transition-transform duration-200`}
        >
          <Card className="hover:shadow-md transition-shadow">
            <div className="relative">
              <img 
                src={photo.thumbnail_url} 
                alt={photo.title}
                className="w-full h-48 object-cover rounded-t-lg"
              />
              
              {/* Drag handle */}
              <div 
                {...provided.dragHandleProps}
                className="absolute top-2 left-2 p-1 bg-white/80 rounded cursor-grab hover:bg-white"
              >
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Status badges */}
              <div className="absolute top-2 right-2 space-y-1">
                {photo.is_featured && (
                  <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
                )}
                {!photo.is_published && (
                  <Badge className="bg-gray-100 text-gray-800">Draft</Badge>
                )}
              </div>

              {/* Order number */}
              <div className="absolute bottom-2 left-2">
                <Badge className="bg-blue-100 text-blue-800">
                  #{photo.display_order}
                </Badge>
              </div>
            </div>

            <CardContent className="p-4">
              {editingPhoto === photo.id ? (
                <EditPhotoForm 
                  photo={photo} 
                  onSave={(updates) => updatePhotoDetails(photo.id, updates)}
                  onCancel={() => setEditingPhoto(null)}
                />
              ) : (
                <>
                  <h3 className="font-semibold text-sm mb-1 truncate">{photo.title}</h3>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{photo.description}</p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="space-x-1">
                      <Badge variant="outline">{photo.category}</Badge>
                      <Badge variant="outline">${photo.base_price}</Badge>
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => movePhoto(photo.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => movePhoto(photo.id, 'down')}
                        disabled={index === filteredPhotos.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPhoto(photo.id)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-2">
                    <Button
                      size="sm"
                      variant={photo.is_featured ? "default" : "outline"}
                      onClick={() => togglePhotoFeature(photo.id)}
                      className="flex-1"
                    >
                      {photo.is_featured ? 'Featured' : 'Feature'}
                    </Button>
                    <Button
                      size="sm"
                      variant={photo.is_published ? "default" : "outline"}
                      onClick={() => togglePhotoPublish(photo.id)}
                      className="flex-1"
                    >
                      {photo.is_published ? 'Published' : 'Publish'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Photo Manager</h2>
          <p className="text-gray-600">Drag photos to reorder, click to edit</p>
        </div>
        
        {hasChanges && (
          <Button onClick={saveChanges} className="bg-green-600 hover:bg-green-700">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search photos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
        
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{photos.length}</div>
            <div className="text-xs text-gray-600">Total Photos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{photos.filter(p => p.is_published).length}</div>
            <div className="text-xs text-gray-600">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{photos.filter(p => p.is_featured).length}</div>
            <div className="text-xs text-gray-600">Featured</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filteredPhotos.length}</div>
            <div className="text-xs text-gray-600">Filtered</div>
          </CardContent>
        </Card>
      </div>

      {/* Photo Grid/List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="photos" direction={viewMode === 'grid' ? 'vertical' : 'vertical'}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                : "space-y-4"
              }
            >
              {filteredPhotos.map((photo, index) => (
                <PhotoCard key={photo.id} photo={photo} index={index} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {filteredPhotos.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No photos found</h3>
            <p className="text-gray-600">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Upload some photos to get started.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EditPhotoForm({ 
  photo, 
  onSave, 
  onCancel 
}: { 
  photo: PhotoItem
  onSave: (updates: Partial<PhotoItem>) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(photo.title)
  const [description, setDescription] = useState(photo.description)
  const [price, setPrice] = useState(photo.base_price.toString())
  const [tags, setTags] = useState(photo.tags.join(', '))

  const handleSave = () => {
    onSave({
      title,
      description,
      base_price: parseFloat(price) || 0,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
    })
  }

  return (
    <div className="space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Photo title"
        className="text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="w-full p-2 border rounded text-xs resize-none"
        rows={2}
      />
      <Input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price"
        type="number"
        step="0.01"
        className="text-sm"
      />
      <Input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma separated)"
        className="text-sm"
      />
      <div className="flex space-x-2">
        <Button size="sm" onClick={handleSave} className="flex-1">
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}