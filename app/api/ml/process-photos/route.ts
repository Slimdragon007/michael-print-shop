import { NextRequest, NextResponse } from 'next/server'
import { smartPhotoProcessor } from '../../../../lib/ml/smart-photo-processor'
import { photoProcessingML } from '../../../../lib/ml/error-prevention'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      filePaths, 
      single = false, 
      options = {},
      dryRun = false 
    } = body

    // Validate input
    if (!filePaths || (!Array.isArray(filePaths) && typeof filePaths !== 'string')) {
      return NextResponse.json({
        success: false,
        error: 'filePaths must be a string or array of strings'
      }, { status: 400 })
    }

    // Convert single file to array
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths]

    // Validate files exist
    const validPaths = []
    for (const filePath of paths) {
      try {
        await fs.access(filePath)
        validPaths.push(filePath)
      } catch {
        console.warn(`File not found: ${filePath}`)
      }
    }

    if (validPaths.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid files found'
      }, { status: 400 })
    }

    // Process files
    if (single || validPaths.length === 1) {
      // Single file processing
      const result = await smartPhotoProcessor.processPhoto(validPaths[0], { ...options, dryRun })
      
      return NextResponse.json({
        success: result.success,
        result,
        message: result.success ? 'File processed successfully' : 'File processing failed'
      })

    } else {
      // Batch processing
      const batchResult = await smartPhotoProcessor.processBatch(validPaths, { ...options, dryRun })
      
      return NextResponse.json({
        success: batchResult.successful > 0,
        batchResult,
        message: `Batch processing complete: ${batchResult.successful}/${batchResult.totalFiles} successful`
      })
    }

  } catch (error) {
    console.error('ML processing API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: 'Check server logs for more information'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'predict':
        const filePath = searchParams.get('filePath')
        if (!filePath) {
          return NextResponse.json({ error: 'filePath required' }, { status: 400 })
        }

        const prediction = await photoProcessingML.validateBeforeProcessing(filePath)
        return NextResponse.json({ prediction })

      case 'recommendations':
        const targetPath = searchParams.get('filePath')
        if (!targetPath) {
          return NextResponse.json({ error: 'filePath required' }, { status: 400 })
        }

        const recommendations = await photoProcessingML.generateProcessingRecommendations(targetPath)
        return NextResponse.json({ recommendations })

      case 'stats':
        // Get processing statistics
        const stats = await getProcessingStats()
        return NextResponse.json({ stats })

      default:
        return NextResponse.json({ 
          availableActions: ['predict', 'recommendations', 'stats'],
          usage: {
            predict: 'GET /api/ml/process-photos?action=predict&filePath=/path/to/file',
            recommendations: 'GET /api/ml/process-photos?action=recommendations&filePath=/path/to/file',
            stats: 'GET /api/ml/process-photos?action=stats'
          }
        })
    }

  } catch (error) {
    console.error('ML API GET error:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

async function getProcessingStats() {
  // This would query your Supabase database for processing statistics
  // Using the views we created in the schema
  
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { data: errorRates },
    { data: trends },
    { data: fixes },
    { data: predictions }
  ] = await Promise.all([
    supabase.from('error_rate_by_file_type').select('*').limit(10),
    supabase.from('processing_trends').select('*').limit(4),
    supabase.from('most_effective_fixes').select('*').limit(5),
    supabase.from('prediction_accuracy_summary').select('*').limit(7)
  ])

  return {
    errorRatesByFileType: errorRates || [],
    processingTrends: trends || [],
    mostEffectiveFixes: fixes || [],
    predictionAccuracy: predictions || [],
    lastUpdated: new Date().toISOString()
  }
}