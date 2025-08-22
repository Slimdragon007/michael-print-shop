import { NextRequest, NextResponse } from 'next/server'
import { smartPhotoProcessor } from '../../../../lib/ml/smart-photo-processor'
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

        // Basic file prediction without ML
        const prediction = await getBasicFilePrediction(filePath)
        return NextResponse.json({ prediction })

      case 'recommendations':
        const targetPath = searchParams.get('filePath')
        if (!targetPath) {
          return NextResponse.json({ error: 'filePath required' }, { status: 400 })
        }

        const recommendations = await getBasicRecommendations(targetPath)
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

async function getBasicFilePrediction(filePath: string) {
  try {
    const stats = await fs.stat(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp']
    
    return {
      shouldProceed: supportedFormats.includes(ext) && stats.size > 0,
      riskLevel: stats.size > 50 * 1024 * 1024 ? 'high' : 'low',
      confidence: 0.8,
      recommendations: stats.size > 50 * 1024 * 1024 ? ['Consider compressing large file'] : []
    }
  } catch (error) {
    return {
      shouldProceed: false,
      riskLevel: 'high',
      confidence: 0.1,
      recommendations: ['File not accessible']
    }
  }
}

async function getBasicRecommendations(filePath: string) {
  try {
    const stats = await fs.stat(filePath)
    const recommendations = []
    
    if (stats.size > 50 * 1024 * 1024) {
      recommendations.push('File is very large - consider compression')
    }
    if (stats.size < 100 * 1024) {
      recommendations.push('File may be too small for quality prints')
    }
    
    return recommendations
  } catch (error) {
    return ['File not accessible']
  }
}

async function getProcessingStats() {
  // Return basic stats from file system instead of database
  const logDir = path.join(process.cwd(), 'logs')
  
  try {
    await fs.access(logDir)
    
    return {
      errorRatesByFileType: [],
      processingTrends: [],
      mostEffectiveFixes: [],
      predictionAccuracy: [],
      lastUpdated: new Date().toISOString(),
      message: 'Stats logged to file system'
    }
  } catch {
    return {
      errorRatesByFileType: [],
      processingTrends: [],
      mostEffectiveFixes: [],
      predictionAccuracy: [],
      lastUpdated: new Date().toISOString(),
      message: 'No log directory found'
    }
  }
}