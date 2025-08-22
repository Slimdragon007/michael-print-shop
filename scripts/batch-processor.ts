#!/usr/bin/env tsx

import { PhotoImporter } from './photo-importer'
import { ImageOptimizer } from './image-optimizer'
import { ExternalDriveSync } from './sync-external-drive'
import * as fs from 'fs/promises'
import * as path from 'path'

interface BatchConfig {
  importPhotos: boolean
  optimizeImages: boolean
  syncExternal: boolean
  uploadToHosting: boolean
  cleanupOriginals: boolean
  generateSitemap: boolean
}

interface BatchResult {
  success: boolean
  steps: {
    import?: { processed: number; errors: number }
    optimize?: { processed: number; errors: number }
    sync?: { scanned: number; new: number; modified: number; errors: number }
    upload?: { uploaded: number; errors: number }
    cleanup?: { removed: number; errors: number }
    sitemap?: { generated: boolean; urls: number }
  }
  totalTime: number
  errors: string[]
}

export class BatchProcessor {
  private photoImporter: PhotoImporter
  private imageOptimizer: ImageOptimizer
  private externalSync: ExternalDriveSync
  private outputDir: string

  constructor() {
    this.photoImporter = new PhotoImporter()
    this.imageOptimizer = new ImageOptimizer()
    this.externalSync = new ExternalDriveSync()
    this.outputDir = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/data'
  }

  async runFullPipeline(config: Partial<BatchConfig> = {}): Promise<BatchResult> {
    const startTime = Date.now()
    const defaultConfig: BatchConfig = {
      importPhotos: true,
      optimizeImages: true,
      syncExternal: true,
      uploadToHosting: false,
      cleanupOriginals: false,
      generateSitemap: true,
      ...config
    }

    const result: BatchResult = {
      success: true,
      steps: {},
      totalTime: 0,
      errors: []
    }

    console.log('🚀 Starting Full Photo Management Pipeline')
    console.log('==========================================')
    console.log(`Configuration:`)
    Object.entries(defaultConfig).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '⏸️'}`)
    })
    console.log('')

    try {
      // Step 1: Check external drive availability
      console.log('📡 Checking external drive...')
      const driveAvailable = await this.photoImporter.checkExternalDrive()
      if (!driveAvailable) {
        throw new Error('External drive not available. Please connect the LaCie drive.')
      }
      console.log('✅ External drive connected')

      // Step 2: Import Photos
      if (defaultConfig.importPhotos) {
        console.log('\n📸 Step 1: Importing photos from CSV...')
        try {
          const importResult = await this.photoImporter.importFromCSV()
          result.steps.import = {
            processed: importResult.processed.length,
            errors: importResult.errors.length
          }
          
          if (importResult.errors.length > 0) {
            result.errors.push(...importResult.errors.map(e => `Import: ${e}`))
            console.log(`⚠️  Import completed with ${importResult.errors.length} errors`)
          } else {
            console.log(`✅ Successfully imported ${importResult.processed.length} photos`)
          }
        } catch (error) {
          const errorMsg = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      // Step 3: Optimize Images
      if (defaultConfig.optimizeImages) {
        console.log('\n🖼️  Step 2: Optimizing images...')
        try {
          const optimizeResult = await this.imageOptimizer.optimizeAllImages()
          result.steps.optimize = {
            processed: optimizeResult.processed,
            errors: optimizeResult.errors.length
          }
          
          if (optimizeResult.errors.length > 0) {
            result.errors.push(...optimizeResult.errors.map(e => `Optimize: ${e}`))
            console.log(`⚠️  Optimization completed with ${optimizeResult.errors.length} errors`)
          } else {
            console.log(`✅ Successfully optimized ${optimizeResult.processed} images`)
          }
          
          // Log size statistics
          console.log('📊 Image size statistics:')
          Object.entries(optimizeResult.stats).forEach(([config, size]) => {
            const sizeInMB = Math.round(size / 1024 / 1024 * 100) / 100
            console.log(`   ${config}: ${sizeInMB}MB`)
          })
        } catch (error) {
          const errorMsg = `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      // Step 4: Sync External Drive
      if (defaultConfig.syncExternal) {
        console.log('\n🔄 Step 3: Syncing with external drive...')
        try {
          const syncResult = await this.externalSync.triggerFullSync()
          result.steps.sync = {
            scanned: syncResult.scanned,
            new: syncResult.new,
            modified: syncResult.modified,
            errors: syncResult.errors
          }
          
          console.log(`✅ Sync completed - Scanned: ${syncResult.scanned}, New: ${syncResult.new}, Modified: ${syncResult.modified}`)
        } catch (error) {
          const errorMsg = `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      // Step 5: Generate deployment package
      if (defaultConfig.uploadToHosting) {
        console.log('\n📦 Step 4: Preparing deployment package...')
        try {
          const uploadResult = await this.prepareDeploymentPackage()
          result.steps.upload = uploadResult
          console.log(`✅ Deployment package ready - ${uploadResult.uploaded} files prepared`)
        } catch (error) {
          const errorMsg = `Deployment prep failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      // Step 6: Generate sitemap
      if (defaultConfig.generateSitemap) {
        console.log('\n🗺️  Step 5: Generating sitemap...')
        try {
          const sitemapResult = await this.generateSitemap()
          result.steps.sitemap = sitemapResult
          console.log(`✅ Sitemap generated with ${sitemapResult.urls} URLs`)
        } catch (error) {
          const errorMsg = `Sitemap generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      // Step 7: Cleanup
      if (defaultConfig.cleanupOriginals) {
        console.log('\n🧹 Step 6: Cleaning up...')
        try {
          await this.imageOptimizer.cleanup(false)
          result.steps.cleanup = { removed: 1, errors: 0 }
          console.log('✅ Cleanup completed')
        } catch (error) {
          const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      result.success = result.errors.length === 0
      result.totalTime = Date.now() - startTime

      // Generate final report
      await this.generateProcessingReport(result)

    } catch (error) {
      result.success = false
      result.totalTime = Date.now() - startTime
      const errorMsg = `Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(errorMsg)
      console.error(`❌ ${errorMsg}`)
    }

    return result
  }

  private async prepareDeploymentPackage(): Promise<{ uploaded: number; errors: number }> {
    const hostingerPath = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/🚀-UPLOAD-TO-HOSTINGER-FILE-MANAGER'
    const imagesPath = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/public/images'
    
    let uploaded = 0
    let errors = 0

    try {
      // Ensure hostinger upload directory exists
      await fs.mkdir(path.join(hostingerPath, 'images'), { recursive: true })

      // Copy optimized images to hostinger directory
      const imageDirs = ['thumbnail', 'small', 'medium', 'large']
      
      for (const dir of imageDirs) {
        const sourceDir = path.join(imagesPath, dir)
        const destDir = path.join(hostingerPath, 'images', dir)
        
        try {
          await fs.mkdir(destDir, { recursive: true })
          const files = await fs.readdir(sourceDir)
          
          for (const file of files) {
            try {
              await fs.copyFile(
                path.join(sourceDir, file),
                path.join(destDir, file)
              )
              uploaded++
            } catch (error) {
              console.error(`Failed to copy ${file}:`, error)
              errors++
            }
          }
        } catch (error) {
          console.error(`Failed to process ${dir}:`, error)
          errors++
        }
      }

      // Copy product data
      const dataFiles = ['processed-photos.json', 'products-for-import.csv']
      for (const file of dataFiles) {
        try {
          await fs.copyFile(
            path.join(this.outputDir, file),
            path.join(hostingerPath, file)
          )
          uploaded++
        } catch (error) {
          console.error(`Failed to copy ${file}:`, error)
          errors++
        }
      }

    } catch (error) {
      console.error('Deployment preparation failed:', error)
      errors++
    }

    return { uploaded, errors }
  }

  private async generateSitemap(): Promise<{ generated: boolean; urls: number }> {
    try {
      // Read processed photos data
      const photosPath = path.join(this.outputDir, 'processed-photos.json')
      const photosData = await fs.readFile(photosPath, 'utf-8')
      const photos = JSON.parse(photosData)

      // Generate sitemap XML
      const baseUrl = 'https://your-domain.com' // Replace with actual domain
      const urls = [
        '/', // Home page
        '/products', // Products page
        ...photos.map((photo: any) => `/products/${photo.id}`) // Individual product pages
      ]

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${url === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${url === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`

      // Save sitemap
      const sitemapPath = path.join('/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/public', 'sitemap.xml')
      await fs.writeFile(sitemapPath, sitemap)

      // Also save to hostinger directory
      const hostingerSitemapPath = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/🚀-UPLOAD-TO-HOSTINGER-FILE-MANAGER/sitemap.xml'
      await fs.writeFile(hostingerSitemapPath, sitemap)

      return { generated: true, urls: urls.length }
    } catch (error) {
      console.error('Sitemap generation failed:', error)
      return { generated: false, urls: 0 }
    }
  }

  private async generateProcessingReport(result: BatchResult): Promise<void> {
    const reportPath = path.join(this.outputDir, 'processing-report.json')
    const report = {
      timestamp: new Date().toISOString(),
      success: result.success,
      totalTime: result.totalTime,
      steps: result.steps,
      errors: result.errors,
      summary: {
        photosImported: result.steps.import?.processed || 0,
        imagesOptimized: result.steps.optimize?.processed || 0,
        filesScanned: result.steps.sync?.scanned || 0,
        totalErrors: result.errors.length
      }
    }

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    // Print final summary
    console.log('\n📋 Processing Report')
    console.log('===================')
    console.log(`Total time: ${Math.round(result.totalTime / 1000)}s`)
    console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`)
    console.log(`Photos imported: ${report.summary.photosImported}`)
    console.log(`Images optimized: ${report.summary.imagesOptimized}`)
    console.log(`Files scanned: ${report.summary.filesScanned}`)
    console.log(`Total errors: ${report.summary.totalErrors}`)
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:')
      result.errors.forEach(error => console.log(`  - ${error}`))
    }

    console.log(`\n📄 Full report saved to: ${reportPath}`)
  }

  // Quick processing modes
  async quickImport(): Promise<void> {
    console.log('🚀 Quick Import Mode')
    await this.runFullPipeline({
      importPhotos: true,
      optimizeImages: true,
      syncExternal: false,
      uploadToHosting: false,
      cleanupOriginals: false,
      generateSitemap: false
    })
  }

  async quickSync(): Promise<void> {
    console.log('🚀 Quick Sync Mode')
    await this.runFullPipeline({
      importPhotos: false,
      optimizeImages: false,
      syncExternal: true,
      uploadToHosting: false,
      cleanupOriginals: false,
      generateSitemap: false
    })
  }

  async productionDeploy(): Promise<void> {
    console.log('🚀 Production Deploy Mode')
    await this.runFullPipeline({
      importPhotos: true,
      optimizeImages: true,
      syncExternal: true,
      uploadToHosting: true,
      cleanupOriginals: true,
      generateSitemap: true
    })
  }
}

// CLI usage
if (require.main === module) {
  async function main() {
    const args = process.argv.slice(2)
    const mode = args[0] || 'full'
    
    const processor = new BatchProcessor()
    
    switch (mode) {
      case 'import':
        await processor.quickImport()
        break
        
      case 'sync':
        await processor.quickSync()
        break
        
      case 'deploy':
        await processor.productionDeploy()
        break
        
      case 'full':
      default:
        await processor.runFullPipeline()
        break
    }
  }
  
  main().catch(error => {
    console.error('Batch processing failed:', error)
    process.exit(1)
  })
}