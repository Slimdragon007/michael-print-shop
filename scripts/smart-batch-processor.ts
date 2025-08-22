#!/usr/bin/env tsx

import { smartPhotoProcessor } from '../lib/ml/smart-photo-processor'
import { photoProcessingML } from '../lib/ml/error-prevention'
import { glob } from 'glob'
import path from 'path'
import fs from 'fs/promises'

interface CLIOptions {
  input?: string
  output?: string
  dryRun?: boolean
  quality?: number
  maxFiles?: number
  skipML?: boolean
  verbose?: boolean
  statsOnly?: boolean
}

async function main() {
  const args = process.argv.slice(2)
  const options: CLIOptions = parseArgs(args)

  console.log('🧠 Smart Photo Processor with ML Error Prevention')
  console.log('================================================')

  try {
    if (options.statsOnly) {
      await showStats()
      return
    }

    // Default input path (your external drive)
    const inputPath = options.input || '/Volumes/LaCie/Etsy'
    const outputPath = options.output || './data/etsy-processed'

    console.log(`📁 Input: ${inputPath}`)
    console.log(`📁 Output: ${outputPath}`)
    console.log(`🎯 Options:`, {
      dryRun: options.dryRun,
      quality: options.quality,
      maxFiles: options.maxFiles,
      skipML: options.skipML
    })

    // Find photo files
    console.log('\n🔍 Scanning for photos...')
    const photoPattern = path.join(inputPath, '**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}')
    let allPhotos = await glob(photoPattern)

    if (allPhotos.length === 0) {
      console.log('❌ No photos found!')
      return
    }

    // Limit files if specified
    if (options.maxFiles && allPhotos.length > options.maxFiles) {
      allPhotos = allPhotos.slice(0, options.maxFiles)
      console.log(`📝 Limited to ${options.maxFiles} files`)
    }

    console.log(`✅ Found ${allPhotos.length} photos`)

    // Pre-processing analysis
    if (!options.skipML) {
      console.log('\n🧠 Running ML pre-analysis...')
      let highRiskCount = 0
      let mediumRiskCount = 0
      let lowRiskCount = 0

      for (let i = 0; i < Math.min(allPhotos.length, 10); i++) {
        const prediction = await photoProcessingML.validateBeforeProcessing(allPhotos[i])
        
        switch (prediction.riskLevel) {
          case 'high': highRiskCount++; break
          case 'medium': mediumRiskCount++; break
          case 'low': lowRiskCount++; break
        }

        if (options.verbose) {
          console.log(`  ${path.basename(allPhotos[i])}: ${prediction.riskLevel} risk`)
        }
      }

      console.log(`📊 Risk Assessment (sample):`)
      console.log(`  🔴 High Risk: ${highRiskCount}`)
      console.log(`  🟡 Medium Risk: ${mediumRiskCount}`)
      console.log(`  🟢 Low Risk: ${lowRiskCount}`)

      if (highRiskCount > 5) {
        console.log('⚠️  Warning: High number of risky files detected')
        console.log('   Consider reviewing files before processing')
      }
    }

    if (options.dryRun) {
      console.log('\n🏃‍♂️ Dry run complete - no files were processed')
      return
    }

    // Create output directory
    await fs.mkdir(outputPath, { recursive: true })

    // Process photos with smart batch processing
    console.log('\n🚀 Starting smart batch processing...')
    const startTime = Date.now()

    const batchResult = await smartPhotoProcessor.processBatch(allPhotos, {
      quality: options.quality,
      skipML: options.skipML,
      dryRun: options.dryRun
    })

    const totalTime = Date.now() - startTime

    // Display results
    console.log('\n📊 Processing Results')
    console.log('====================')
    console.log(`✅ Successful: ${batchResult.successful}`)
    console.log(`❌ Failed: ${batchResult.failed}`)
    console.log(`⏭️  Skipped: ${batchResult.skipped}`)
    console.log(`⏱️  Total Time: ${Math.round(totalTime / 1000)}s`)
    console.log(`📈 Success Rate: ${Math.round((batchResult.successful / batchResult.totalFiles) * 100)}%`)

    if (Object.keys(batchResult.errorSummary).length > 0) {
      console.log('\n🔍 Error Summary:')
      Object.entries(batchResult.errorSummary).forEach(([error, count]) => {
        console.log(`  ${error}: ${count}`)
      })
    }

    if (batchResult.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      batchResult.recommendations.forEach(rec => {
        console.log(`  • ${rec}`)
      })
    }

    // Generate final report
    await generateProcessingReport(batchResult, totalTime, options)

    console.log('\n🎉 Smart processing complete!')
    console.log(`📋 Detailed report saved to: ${outputPath}/processing-report.json`)

  } catch (error) {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  }
}

async function showStats() {
  console.log('\n📊 ML Processing Statistics')
  console.log('===========================')

  try {
    // This would call your Supabase views to get stats
    const response = await fetch('http://localhost:3000/api/ml/process-photos?action=stats')
    const { stats } = await response.json()

    console.log('\n🏷️  Error Rates by File Type:')
    stats.errorRatesByFileType.forEach((item: any) => {
      console.log(`  ${item.file_format}: ${item.error_rate_percent}% (${item.error_count}/${item.total_attempts})`)
    })

    console.log('\n📈 Processing Trends (Weekly):')
    stats.processingTrends.forEach((item: any) => {
      console.log(`  Week ${item.week}: ${item.success_rate_percent}% success (${item.successes}/${item.total_files})`)
    })

    console.log('\n🔧 Most Effective Fixes:')
    stats.mostEffectiveFixes.forEach((item: any) => {
      console.log(`  ${item.fix_type}: ${item.success_rate_percent}% success (${item.successful_applications}/${item.times_applied})`)
    })

    console.log('\n🎯 Prediction Accuracy:')
    stats.predictionAccuracy.forEach((item: any) => {
      console.log(`  ${item.day}: ${item.avg_accuracy} avg accuracy (${item.validated_predictions} predictions)`)
    })

  } catch (error) {
    console.error('Failed to fetch stats:', error)
    console.log('Make sure your Next.js server is running on localhost:3000')
  }
}

async function generateProcessingReport(batchResult: any, totalTime: number, options: CLIOptions) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: batchResult.totalFiles,
      successful: batchResult.successful,
      failed: batchResult.failed,
      skipped: batchResult.skipped,
      successRate: Math.round((batchResult.successful / batchResult.totalFiles) * 100),
      totalTimeMs: totalTime,
      averageTimePerFile: Math.round(totalTime / batchResult.totalFiles)
    },
    options,
    errorSummary: batchResult.errorSummary,
    recommendations: batchResult.recommendations,
    detailedResults: batchResult.results.map((result: any) => ({
      file: path.basename(result.filePath),
      success: result.success,
      processingTimeMs: result.processingTimeMs,
      errors: result.errors,
      warnings: result.warnings,
      appliedFixes: result.appliedFixes,
      qualityScore: result.qualityScore,
      mlPrediction: result.mlPrediction ? {
        riskLevel: result.mlPrediction.riskLevel,
        confidence: result.mlPrediction.confidence,
        shouldProceed: result.mlPrediction.shouldProceed
      } : null
    })),
    performance: {
      filesPerSecond: batchResult.totalFiles / (totalTime / 1000),
      errorRate: batchResult.failed / batchResult.totalFiles,
      averageQualityScore: batchResult.results
        .filter((r: any) => r.qualityScore)
        .reduce((sum: number, r: any) => sum + r.qualityScore, 0) / 
        batchResult.results.filter((r: any) => r.qualityScore).length || 0
    }
  }

  const reportPath = './data/etsy-processed/processing-report.json'
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--input':
      case '-i':
        options.input = args[++i]
        break
      case '--output':
      case '-o':
        options.output = args[++i]
        break
      case '--dry-run':
      case '--dry':
        options.dryRun = true
        break
      case '--quality':
      case '-q':
        options.quality = parseInt(args[++i])
        break
      case '--max-files':
      case '-m':
        options.maxFiles = parseInt(args[++i])
        break
      case '--skip-ml':
        options.skipML = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--stats':
      case '-s':
        options.statsOnly = true
        break
      case '--help':
      case '-h':
        showHelp()
        process.exit(0)
        break
    }
  }

  return options
}

function showHelp() {
  console.log(`
🧠 Smart Photo Processor with ML Error Prevention

Usage: tsx scripts/smart-batch-processor.ts [options]

Options:
  -i, --input <path>      Input directory (default: /Volumes/LaCie/Etsy)
  -o, --output <path>     Output directory (default: ./data/etsy-processed)
  --dry-run               Preview what would be processed without doing it
  -q, --quality <1-100>   JPEG quality (default: 90)
  -m, --max-files <num>   Limit number of files to process
  --skip-ml               Skip ML validation and error prevention
  -v, --verbose           Show detailed processing information
  -s, --stats             Show processing statistics and exit
  -h, --help              Show this help message

Examples:
  tsx scripts/smart-batch-processor.ts --dry-run
  tsx scripts/smart-batch-processor.ts -i /path/to/photos -q 85
  tsx scripts/smart-batch-processor.ts --max-files 50 --verbose
  tsx scripts/smart-batch-processor.ts --stats
`)
}

// Run the script
if (require.main === module) {
  main().catch(console.error)
}

export { main as smartBatchProcessor }