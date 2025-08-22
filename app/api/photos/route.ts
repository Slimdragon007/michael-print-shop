import { NextRequest, NextResponse } from 'next/server'
import { r2Storage } from '@/lib/r2-storage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')
    const limit = searchParams.get('limit')

    let photos = await r2Storage.getPhotos()

    // Apply filters
    if (category && category !== 'all') {
      photos = photos.filter(photo => 
        photo.category.toLowerCase() === category.toLowerCase()
      )
    }

    if (featured === 'true') {
      photos = photos.filter(photo => photo.featured)
    }

    // Only show published photos unless admin request
    photos = photos.filter(photo => photo.published)

    // Apply limit
    if (limit) {
      const limitNum = parseInt(limit, 10)
      photos = photos.slice(0, limitNum)
    }

    return NextResponse.json({
      success: true,
      data: photos,
      total: photos.length,
      message: 'Photos retrieved successfully'
    })

  } catch (error) {
    console.error('Photos API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch photos',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadata = JSON.parse(formData.get('metadata') as string || '{}')

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
      }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      }, { status: 400 })
    }

    const photo = await r2Storage.uploadPhoto(file, metadata)

    return NextResponse.json({
      success: true,
      data: photo,
      message: 'Photo uploaded successfully'
    })

  } catch (error) {
    console.error('Photo upload error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to upload photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}