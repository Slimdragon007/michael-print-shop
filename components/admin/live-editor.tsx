'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Pause, 
  Eye, 
  Plus,
  Calendar,
  Palette,
  Grid,
  Save,
  Clock,
  Star,
  Archive,
  Edit2
} from 'lucide-react'
import { dropsManager, Drop } from '@/lib/drops-system'

interface LiveEditorProps {
  allProducts: any[]
  onProductsUpdate: (products: any[]) => void
}

export function LiveEditor({ allProducts, onProductsUpdate }: LiveEditorProps) {
  const [drops, setDrops] = useState<Drop[]>([])
  const [currentDrop, setCurrentDrop] = useState<Drop | null>(null)
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [newDropName, setNewDropName] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  useEffect(() => {
    loadDrops()
  }, [])

  const loadDrops = () => {
    const allDrops = dropsManager.getDrops()
    setDrops(allDrops)
    
    const live = dropsManager.getCurrentDrop()
    setCurrentDrop(live)
    setIsLiveMode(!!live)
  }

  const createNewDrop = () => {
    if (!newDropName.trim()) return

    const newDrop = dropsManager.createDrop({
      name: newDropName,
      description: `Collection: ${newDropName}`,
      version: dropsManager.getNextVersion(),
      status: 'draft',
      release_date: new Date().toISOString(),
      featured_image: allProducts[0]?.image_url || '',
      products: selectedProducts
    })

    setDrops(dropsManager.getDrops())
    setCurrentDrop(newDrop)
    setNewDropName('')
    setSelectedProducts([])
  }

  const launchDrop = (dropId: string) => {
    dropsManager.launchDrop(dropId)
    loadDrops()
    
    // Update the frontend products to show this drop
    const drop = dropsManager.drops.find(d => d.id === dropId)
    if (drop) {
      const dropProducts = dropsManager.getDropProducts(dropId, allProducts)
      onProductsUpdate(dropProducts)
    }
  }

  const createThemedDrop = (theme: 'california' | 'hawaii' | 'southwest' | 'architecture') => {
    const themedDrop = dropsManager.createThemedDrop(theme, allProducts)
    setDrops(dropsManager.getDrops())
    setCurrentDrop(themedDrop)
  }

  const handleProductDragEnd = (result: any) => {
    if (!result.destination || !currentDrop) return

    const sourceProducts = result.source.droppableId === 'available' 
      ? allProducts.filter(p => !currentDrop.products.includes(p.id))
      : dropsManager.getDropProducts(currentDrop.id, allProducts)

    const destProducts = result.destination.droppableId === 'drop'
      ? [...currentDrop.products]
      : []

    if (result.source.droppableId === 'available' && result.destination.droppableId === 'drop') {
      // Adding product to drop
      const productId = sourceProducts[result.source.index].id
      dropsManager.addProductsToDrop(currentDrop.id, [productId])
    } else if (result.source.droppableId === 'drop' && result.destination.droppableId === 'available') {
      // Removing product from drop
      const productId = sourceProducts[result.source.index].id
      dropsManager.removeProductsFromDrop(currentDrop.id, [productId])
    } else if (result.source.droppableId === 'drop' && result.destination.droppableId === 'drop') {
      // Reordering within drop
      const reorderedProducts = Array.from(currentDrop.products)
      const [reorderedItem] = reorderedProducts.splice(result.source.index, 1)
      reorderedProducts.splice(result.destination.index, 0, reorderedItem)
      
      dropsManager.updateDrop(currentDrop.id, { products: reorderedProducts })
    }

    loadDrops()
    
    // Update live frontend if this drop is live
    if (currentDrop.status === 'live') {
      const updatedDropProducts = dropsManager.getDropProducts(currentDrop.id, allProducts)
      onProductsUpdate(updatedDropProducts)
    }
  }

  const ProductDragItem = ({ product, index, isDragging }: any) => (
    <Draggable draggableId={product.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 border rounded-lg bg-white transition-all ${
            snapshot.isDragging ? 'shadow-lg rotate-2 z-50' : 'hover:shadow-md'
          }`}
        >
          <img 
            src={product.image_url} 
            alt={product.title}
            className="w-full h-32 object-cover rounded mb-2"
          />
          <h4 className="font-semibold text-sm truncate">{product.title}</h4>
          <p className="text-xs text-gray-600">${product.base_price}</p>
        </div>
      )}
    </Draggable>
  )

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Grid className="h-5 w-5" />
                Live Collection Editor
                {isLiveMode && (
                  <Badge className="bg-green-100 text-green-800 animate-pulse">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    LIVE
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Create and manage collection drops like Squarespace
              </CardDescription>
            </div>
            
            {currentDrop && (
              <div className="text-right">
                <div className="font-semibold">{currentDrop.name}</div>
                <div className="text-sm text-gray-600">{currentDrop.version}</div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor">Live Editor</TabsTrigger>
          <TabsTrigger value="drops">Manage Drops</TabsTrigger>
          <TabsTrigger value="create">Create Drop</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          {currentDrop ? (
            <DragDropContext onDragEnd={handleProductDragEnd}>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Available Products */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Available Photos</CardTitle>
                    <CardDescription>Drag photos to add them to the current drop</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Droppable droppableId="available">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="grid grid-cols-2 gap-4 min-h-[400px]"
                        >
                          {allProducts
                            .filter(p => !currentDrop.products.includes(p.id))
                            .map((product, index) => (
                              <ProductDragItem 
                                key={product.id} 
                                product={product} 
                                index={index} 
                              />
                            ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>

                {/* Current Drop */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{currentDrop.name}</CardTitle>
                        <CardDescription>{currentDrop.products.length} photos in this drop</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {currentDrop.status === 'draft' && (
                          <Button onClick={() => launchDrop(currentDrop.id)} size="sm">
                            <Play className="h-4 w-4 mr-2" />
                            Launch Live
                          </Button>
                        )}
                        {currentDrop.status === 'live' && (
                          <Badge className="bg-green-100 text-green-800">Live</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Droppable droppableId="drop">
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`grid grid-cols-2 gap-4 min-h-[400px] p-4 border-2 border-dashed rounded-lg transition-colors ${
                            snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                          }`}
                        >
                          {dropsManager.getDropProducts(currentDrop.id, allProducts)
                            .map((product, index) => (
                              <ProductDragItem 
                                key={product.id} 
                                product={product} 
                                index={index} 
                              />
                            ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>
            </DragDropContext>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Grid className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Drop</h3>
                <p className="text-gray-600 mb-4">Create a new collection drop to start editing</p>
                <Button onClick={() => setCurrentDrop(drops[0] || null)}>
                  Select Drop
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="drops" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drops.map(drop => (
              <Card key={drop.id} className={drop.status === 'live' ? 'border-green-500' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge 
                      className={
                        drop.status === 'live' ? 'bg-green-100 text-green-800' :
                        drop.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        drop.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }
                    >
                      {drop.status}
                    </Badge>
                    <span className="text-sm font-mono">{drop.version}</span>
                  </div>
                  <CardTitle className="text-lg">{drop.name}</CardTitle>
                  <CardDescription>{drop.products.length} photos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setCurrentDrop(drop)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    {drop.status === 'draft' && (
                      <Button 
                        size="sm"
                        onClick={() => launchDrop(drop.id)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Launch
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Custom Drop</CardTitle>
                <CardDescription>Build a collection from scratch</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Drop name (e.g., 'Winter Collection 2024')"
                  value={newDropName}
                  onChange={(e) => setNewDropName(e.target.value)}
                />
                <Button onClick={createNewDrop} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Drop
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Themed Drops</CardTitle>
                <CardDescription>Auto-generate collections by theme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => createThemedDrop('california')}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  California Collection
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => createThemedDrop('hawaii')}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Hawaii Collection
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => createThemedDrop('southwest')}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Southwest Collection
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => createThemedDrop('architecture')}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Architecture Collection
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}