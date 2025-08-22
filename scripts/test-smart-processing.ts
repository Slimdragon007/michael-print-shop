#!/usr/bin/env tsx

import { glob } from 'glob'
import path from 'path'
import fs from 'fs/promises'

interface PhotoFile {
  path: string
  size: number
  format: string
  riskLevel: 'low' | 'medium' | 'high'
  issues: string[]
  recommendations: string[]
}

async function testSmartProcessing() {
  console.log('🧠 Smart Photo Processing Test (ML-lite version)')
  console.log('================================================')

  try {
    // Default input path (your external drive)
    const inputPath = '/Volumes/LaCie/Etsy'
    
    console.log(`📁 Scanning: ${inputPath}`)

    // Find photo files
    const photoPattern = path.join(inputPath, '**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}')
    const allPhotos = await glob(photoPattern)

    if (allPhotos.length === 0) {
      console.log('❌ No photos found! Make sure your external drive is connected.')
      console.log('💡 If drive path is different, update the inputPath in this script')
      return
    }

    console.log(`✅ Found ${allPhotos.length} photos`)

    // Analyze first 10 photos
    const testPhotos = allPhotos.slice(0, 10)
    console.log(`\n🔍 Analyzing first ${testPhotos.length} photos...`)

    const results: PhotoFile[] = []

    for (const filePath of testPhotos) {
      try {
        const analysis = await analyzePhoto(filePath)
        results.push(analysis)
        
        const riskIcon = analysis.riskLevel === 'high' ? '🔴' : 
                        analysis.riskLevel === 'medium' ? '🟡' : '🟢'
        
        console.log(`${riskIcon} ${path.basename(filePath)}: ${analysis.riskLevel} risk`)
        
        if (analysis.issues.length > 0) {
          console.log(`   Issues: ${analysis.issues.join(', ')}`)
        }
        
        if (analysis.recommendations.length > 0) {
          console.log(`   Recommendations: ${analysis.recommendations.join(', ')}`)
        }

      } catch (error) {
        console.log(`❌ Error analyzing ${path.basename(filePath)}: ${error}`)
      }
    }

    // Summary
    console.log('\n📊 Analysis Summary:')
    const lowRisk = results.filter(r => r.riskLevel === 'low').length
    const mediumRisk = results.filter(r => r.riskLevel === 'medium').length
    const highRisk = results.filter(r => r.riskLevel === 'high').length

    console.log(`🟢 Low Risk: ${lowRisk}`)
    console.log(`🟡 Medium Risk: ${mediumRisk}`)
    console.log(`🔴 High Risk: ${highRisk}`)

    // Recommendations
    const allRecommendations = new Set(results.flatMap(r => r.recommendations))
    if (allRecommendations.size > 0) {
      console.log('\n💡 General Recommendations:')
      allRecommendations.forEach(rec => console.log(`  • ${rec}`))
    }

    // Mock processing simulation
    console.log('\n🎯 Processing Simulation:')
    console.log('If this were real processing:')
    console.log(`  • Would process ${lowRisk} files immediately`)
    console.log(`  • Would apply fixes to ${mediumRisk} files before processing`)
    console.log(`  • Would skip or warn about ${highRisk} high-risk files`)

    console.log('\n✅ Test complete! The ML system would prevent errors and optimize processing.')
    console.log('📋 Next step: Set up the database tables in Supabase to enable full ML features.')

  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

async function analyzePhoto(filePath: string): Promise<PhotoFile> {
  const stats = await fs.stat(filePath)
  const format = path.extname(filePath).toLowerCase()
  const filename = path.basename(filePath)

  const issues: string[] = []
  const recommendations: string[] = []
  let riskLevel: 'low' | 'medium' | 'high' = 'low'

  // File size analysis
  if (stats.size > 50 * 1024 * 1024) { // 50MB
    issues.push('Very large file')
    recommendations.push('Consider pre-compression')
    riskLevel = 'medium'
  }

  if (stats.size < 100 * 1024) { // 100KB
    issues.push('Very small file')
    recommendations.push('Check if file is complete')
    riskLevel = 'medium'
  }

  // Format analysis
  const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp']
  if (!supportedFormats.includes(format)) {
    issues.push('Unsupported format')
    recommendations.push('Convert to JPEG or PNG')
    riskLevel = 'high'
  }

  // Filename analysis
  if (/[^\w\s\-.]/.test(filename)) {
    issues.push('Special characters in filename')
    recommendations.push('Rename file to remove special characters')
    if (riskLevel === 'low') riskLevel = 'medium'
  }

  if (filename.length > 100) {
    issues.push('Very long filename')
    recommendations.push('Shorten filename')
    if (riskLevel === 'low') riskLevel = 'medium'
  }

  // Path analysis
  if (filePath.length > 260) {
    issues.push('Very long file path')
    recommendations.push('Move to shorter path')
    riskLevel = 'high'
  }

  // Common problematic patterns
  if (filename.toLowerCase().includes('tmp') || filename.toLowerCase().includes('temp')) {
    issues.push('Temporary file detected')
    recommendations.push('Verify file is complete')
    riskLevel = 'medium'
  }

  if (filename.startsWith('.')) {
    issues.push('Hidden file')
    recommendations.push('Check if this should be processed')
    riskLevel = 'medium'
  }

  return {
    path: filePath,
    size: stats.size,
    format,
    riskLevel,
    issues,
    recommendations
  }
}

// Show help
function showHelp() {
  console.log(`
🧠 Smart Photo Processing Test

This script analyzes your photos and shows what the ML system would do:
- 🟢 Low risk files: Process immediately
- 🟡 Medium risk files: Apply fixes then process  
- 🔴 High risk files: Skip or require manual review

The actual ML system will:
- Learn from each batch you process
- Get smarter about your specific photo patterns
- Prevent processing errors before they happen
- Auto-fix common issues
- Track success rates and optimize over time

Usage: tsx scripts/test-smart-processing.ts
`)
}

// Handle command line args
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  showHelp()
  process.exit(0)
}

// Run the test
if (require.main === module) {
  testSmartProcessing().catch(console.error)
}

export { testSmartProcessing }