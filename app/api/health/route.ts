import { NextResponse } from 'next/server'
import { r2Storage } from '@/lib/r2-storage'

export async function GET() {
  try {
    const r2Health = await r2Storage.healthCheck()
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        r2Storage: r2Health,
        api: {
          status: 'healthy',
          message: 'API endpoints operational'
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}