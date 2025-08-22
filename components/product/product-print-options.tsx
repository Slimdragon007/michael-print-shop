'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PrintOption {
  id: string
  material: 'fine-art-paper' | 'metal' | 'canvas'
  size: string
  price_modifier: number
  description: string
}

interface ProductPrintOptionsProps {
  options: PrintOption[]
  basePrice: number
}

const materialLabels = {
  'fine-art-paper': 'Fine Art Paper',
  'metal': 'Metal Print',
  'canvas': 'Canvas'
}

const materialDescriptions = {
  'fine-art-paper': 'Museum-quality archival paper with smooth matte finish',
  'metal': 'Vibrant aluminum print with incredible detail and scratch resistance',
  'canvas': 'Gallery-wrapped canvas with textured finish, ready to hang'
}

export function ProductPrintOptions({ options, basePrice }: ProductPrintOptionsProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<string>('fine-art-paper')
  const [selectedSize, setSelectedSize] = useState<string>('')
  
  // Group options by material
  const groupedOptions = options.reduce((acc, option) => {
    if (!acc[option.material]) {
      acc[option.material] = []
    }
    acc[option.material].push(option)
    return acc
  }, {} as Record<string, PrintOption[]>)
  
  // Get available sizes for selected material
  const availableSizes = groupedOptions[selectedMaterial as keyof typeof groupedOptions] || []
  
  // Calculate current price
  const selectedOption = availableSizes.find(opt => opt.size === selectedSize)
  const currentPrice = basePrice + (selectedOption?.price_modifier || 0)
  
  // Default sizes if no options provided
  const defaultSizes = [
    { size: '8x10', modifier: 0 },
    { size: '11x14', modifier: 20 },
    { size: '16x20', modifier: 40 },
    { size: '20x24', modifier: 60 }
  ]
  
  const sizesToShow = availableSizes.length > 0 ? availableSizes : defaultSizes.map(s => ({
    id: `${selectedMaterial}-${s.size}`,
    material: selectedMaterial as any,
    size: s.size,
    price_modifier: s.modifier,
    description: `${s.size} ${materialLabels[selectedMaterial as keyof typeof materialLabels]}`
  }))
  
  return (
    <div className="space-y-6">
      {/* Material Selection */}
      <div>
        <h3 className="font-medium mb-3">Material</h3>
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(materialLabels).map(([material, label]) => (
            <Card 
              key={material}
              className={`cursor-pointer transition-colors ${
                selectedMaterial === material 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => {
                setSelectedMaterial(material)
                setSelectedSize('') // Reset size when material changes
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedMaterial === material 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground'
                    }`}>
                      {selectedMaterial === material && (
                        <Check className="w-2 h-2 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-sm text-muted-foreground">
                        {materialDescriptions[material as keyof typeof materialDescriptions]}
                      </div>
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-sm">
                          {materialDescriptions[material as keyof typeof materialDescriptions]}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Size Selection */}
      <div>
        <h3 className="font-medium mb-3">Size</h3>
        <div className="grid grid-cols-2 gap-3">
          {sizesToShow.map((option) => {
            const price = basePrice + option.price_modifier
            return (
              <Button
                key={option.size}
                variant={selectedSize === option.size ? 'default' : 'outline'}
                className="h-auto p-4 flex-col items-start"
                onClick={() => setSelectedSize(option.size)}
              >
                <div className="font-medium">{option.size}"</div>
                <div className="text-sm opacity-70">${price}</div>
              </Button>
            )
          })}
        </div>
      </div>
      
      {/* Price Summary */}
      {selectedSize && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">
                {selectedSize}" {materialLabels[selectedMaterial as keyof typeof materialLabels]}
              </div>
              <div className="text-sm text-muted-foreground">
                Ready to order
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${currentPrice}</div>
              {selectedOption?.price_modifier ? (
                <div className="text-sm text-muted-foreground">
                  Base: ${basePrice} + ${selectedOption.price_modifier}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      
      {!selectedSize && (
        <div className="text-center text-muted-foreground py-4">
          Select a size to see pricing
        </div>
      )}
    </div>
  )
}