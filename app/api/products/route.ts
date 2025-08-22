import { NextRequest, NextResponse } from 'next/server'
import { r2Storage } from '@/lib/r2-storage'

export async function GET(request: NextRequest) {
  try {
    console.log('Products API: Fetching from R2 Storage...')
    
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')
    
    // Get photos from R2 and transform to product format
    const photos = await r2Storage.getPhotos()
    
    // Transform photos to product format
    const products = photos.map(photo => ({
      id: photo.id,
      title: photo.title,
      description: photo.description,
      category: {
        id: photo.category.toLowerCase(),
        name: photo.category,
        slug: photo.category.toLowerCase().replace(/\s+/g, '-'),
        description: `${photo.category} photography`,
        created_at: new Date().toISOString()
      },
      image_url: photo.imageUrl,
      base_price: photo.basePrice,
      tags: photo.tags,
      dimensions: {
        width: photo.metadata.width,
        height: photo.metadata.height
      },
      print_options: [
        {
          id: '1',
          material: 'metal',
          size: '8x10',
          price_modifier: 0,
          description: 'Metal print on aluminum substrate'
        },
        {
          id: '2',
          material: 'canvas',
          size: '11x14',
          price_modifier: 15,
          description: 'Gallery-wrapped canvas print'
        },
        {
          id: '3',
          material: 'paper',
          size: '16x20',
          price_modifier: 25,
          description: 'Fine art paper print'
        }
      ],
      created_at: photo.metadata.uploadDate,
      updated_at: photo.metadata.uploadDate,
      is_active: photo.published
    }))
    
    let filteredProducts = products
    
    // Apply category filter
    if (category && category !== 'all') {
      filteredProducts = products.filter(product => 
        product.category.slug === category || 
        product.category.name.toLowerCase() === category.toLowerCase()
      )
    }
    
    // Apply featured filter
    if (featured === 'true') {
      filteredProducts = filteredProducts.filter(product => 
        product.tags.includes('featured') || 
        product.tags.includes('bestseller')
      )
    }
    
    return NextResponse.json({
      success: true,
      data: filteredProducts,
      total: filteredProducts.length,
      source: 'r2-storage',
      message: 'Products fetched from R2 Storage'
    })
    
  } catch (error) {
    console.error('Products API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}