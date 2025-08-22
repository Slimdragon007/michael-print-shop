'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

interface ProductImage {
  src: string
  alt: string
  width: number
  height: number
}

interface ProductImageGalleryProps {
  images: ProductImage[]
}

export function ProductImageGallery({ images }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  
  const currentImage = images[currentIndex] || images[0]
  
  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }
  
  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }
  
  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden group">
        <Image
          src={currentImage.src}
          alt={currentImage.alt}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          priority
        />
        
        {/* Image Navigation */}
        {images.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={prevImage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={nextImage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {/* Zoom Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Expand className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-full">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={currentImage.src}
                alt={currentImage.alt}
                fill
                className="object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              className={`relative aspect-square w-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border-2 transition-colors ${
                index === currentIndex ? 'border-primary' : 'border-transparent'
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
      
      {/* Image Counter */}
      {images.length > 1 && (
        <div className="text-center text-sm text-muted-foreground">
          {currentIndex + 1} of {images.length}
        </div>
      )}
    </div>
  )
}