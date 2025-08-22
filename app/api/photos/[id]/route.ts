import { NextRequest, NextResponse } from 'next/server'
import { r2Storage } from '@/lib/r2-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photos = await r2Storage.getPhotos()
    const photo = photos.find(p => p.id === params.id)

    if (!photo) {
      return NextResponse.json({
        success: false,
        error: 'Photo not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: photo
    })

  } catch (error) {
    console.error('Photo fetch error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    const photo = await r2Storage.updatePhoto(params.id, updates)

    return NextResponse.json({
      success: true,
      data: photo,
      message: 'Photo updated successfully'
    })

  } catch (error) {
    console.error('Photo update error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await r2Storage.deletePhoto(params.id)

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete photo'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully'
    })

  } catch (error) {
    console.error('Photo delete error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}