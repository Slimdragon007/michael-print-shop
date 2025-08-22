#!/usr/bin/env tsx

import * as fs from 'fs/promises'
import * as path from 'path'
import sharp from 'sharp'

interface ImageConfig {
  name: string
  maxWidth: number
  maxHeight: number
  quality: number
  suffix: string
  format?: 'jpeg' | 'webp' | 'png'
}

export class ImageOptimizer {
  private inputDir: string
  private outputDir: string
  
  // Different image sizes for different use cases
  private imageConfigs: ImageConfig[] = [
    { name: 'thumbnail', maxWidth: 400, maxHeight: 400, quality: 80, suffix: '_thumb', format: 'jpeg' },
    { name: 'small', maxWidth: 600, maxHeight: 600, quality: 85, suffix: '_sm', format: 'jpeg' },
    { name: 'medium', maxWidth: 1000, maxHeight: 1000, quality: 85, suffix: '_md', format: 'jpeg' },
    { name: 'large', maxWidth: 1600, maxHeight: 1600, quality: 90, suffix: '_lg', format: 'jpeg' },
    { name: 'webp_medium', maxWidth: 1000, maxHeight: 1000, quality: 85, suffix: '_md', format: 'webp' },
    { name: 'webp_large', maxWidth: 1600, maxHeight: 1600, quality: 90, suffix: '_lg', format: 'webp' }
  ]

  constructor(inputDir?: string, outputDir?: string) {
    this.inputDir = inputDir || '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/public/images/original'
    this.outputDir = outputDir || '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/public/images'
  }

  async optimizeAllImages(): Promise<{
    processed: number
    errors: string[]
    stats: Record<string, number>
  }> {
    const errors: string[] = []
    let processed = 0
    const stats: Record<string, number> = {}

    try {
      // Ensure directories exist
      await this.ensureDirectories()

      // Get all images from input directory
      const files = await fs.readdir(this.inputDir)
      const imageFiles = files.filter(file => this.isImageFile(file))

      console.log(`Found ${imageFiles.length} images to process`)

      for (const file of imageFiles) {
        try {
          console.log(`Processing: ${file}`)
          const result = await this.optimizeImage(file)
          
          Object.entries(result).forEach(([config, size]) => {
            stats[config] = (stats[config] || 0) + size
          })
          
          processed++
        } catch (error) {
          const errorMsg = `Failed to process ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      return { processed, errors, stats }

    } catch (error) {
      const errorMsg = `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      return { processed, errors, stats }
    }
  }

  async optimizeImage(filename: string): Promise<Record<string, number>> {
    const inputPath = path.join(this.inputDir, filename)
    const baseName = path.parse(filename).name
    const results: Record<string, number> = {}

    // Get original image info
    const image = sharp(inputPath)
    const metadata = await image.metadata()
    
    console.log(`  Original: ${metadata.width}x${metadata.height}, ${metadata.format}, ${Math.round((metadata.size || 0) / 1024)}KB`)

    // Process each configuration
    for (const config of this.imageConfigs) {
      try {
        const outputFilename = `${baseName}${config.suffix}.${config.format || 'jpg'}`
        const outputPath = path.join(this.outputDir, config.name, outputFilename)

        // Calculate dimensions maintaining aspect ratio
        const dimensions = this.calculateDimensions(
          metadata.width || 0,
          metadata.height || 0,
          config.maxWidth,
          config.maxHeight
        )

        // Process image
        let pipeline = sharp(inputPath)
          .resize(dimensions.width, dimensions.height, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })

        // Apply format-specific options
        if (config.format === 'webp') {
          pipeline = pipeline.webp({ 
            quality: config.quality,
            effort: 4 // Balance between compression and speed
          })
        } else if (config.format === 'jpeg' || !config.format) {
          pipeline = pipeline.jpeg({ 
            quality: config.quality,
            progressive: true,
            mozjpeg: true
          })
        } else if (config.format === 'png') {
          pipeline = pipeline.png({ 
            quality: config.quality,
            progressive: true
          })
        }

        const outputInfo = await pipeline.toFile(outputPath)
        results[config.name] = outputInfo.size

        console.log(`    ${config.name}: ${dimensions.width}x${dimensions.height}, ${Math.round(outputInfo.size / 1024)}KB`)

      } catch (error) {
        console.error(`    Failed to create ${config.name}: ${error}`)
      }
    }

    return results
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight
    
    let newWidth = Math.min(originalWidth, maxWidth)
    let newHeight = Math.min(originalHeight, maxHeight)
    
    // Maintain aspect ratio
    if (newWidth / newHeight > aspectRatio) {
      newWidth = Math.round(newHeight * aspectRatio)
    } else {
      newHeight = Math.round(newWidth / aspectRatio)
    }
    
    return { width: newWidth, height: newHeight }
  }

  private isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp'].includes(ext)
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.outputDir,
      ...this.imageConfigs.map(config => path.join(this.outputDir, config.name))
    ]

    for (const dir of dirs) {
      try {
        await fs.access(dir)
      } catch {
        await fs.mkdir(dir, { recursive: true })
        console.log(`Created directory: ${dir}`)
      }
    }
  }

  // Utility to batch process images from external drive
  async processFromExternalDrive(
    externalPath: string,
    filter?: (filename: string) => boolean
  ): Promise<{ copied: number; optimized: number; errors: string[] }> {
    const errors: string[] = []
    let copied = 0
    let optimized = 0

    try {
      // Ensure input directory exists
      await fs.mkdir(this.inputDir, { recursive: true })

      // Get files from external drive
      const files = await fs.readdir(externalPath)
      const imageFiles = files.filter(file => {
        const isImage = this.isImageFile(file)
        const passesFilter = filter ? filter(file) : true
        return isImage && passesFilter
      })

      console.log(`Found ${imageFiles.length} images on external drive`)

      // Copy files to input directory first
      for (const file of imageFiles) {
        try {
          const sourcePath = path.join(externalPath, file)
          const destPath = path.join(this.inputDir, file)
          
          await fs.copyFile(sourcePath, destPath)
          copied++
          console.log(`Copied: ${file}`)
        } catch (error) {
          errors.push(`Failed to copy ${file}: ${error}`)
        }
      }

      // Now optimize all copied images
      const result = await this.optimizeAllImages()
      optimized = result.processed
      errors.push(...result.errors)

      return { copied, optimized, errors }

    } catch (error) {
      const errorMsg = `External drive processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      return { copied, optimized, errors }
    }
  }

  // Generate responsive image HTML for a given image
  generateResponsiveHTML(baseName: string, alt: string): string {
    const webpSrcset = [
      `images/medium/${baseName}_md.webp 1000w`,
      `images/large/${baseName}_lg.webp 1600w`
    ].join(', ')

    const jpegSrcset = [
      `images/small/${baseName}_sm.jpg 600w`,
      `images/medium/${baseName}_md.jpg 1000w`,
      `images/large/${baseName}_lg.jpg 1600w`
    ].join(', ')

    return `
<picture>
  <source 
    srcset="${webpSrcset}" 
    type="image/webp"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  />
  <img 
    srcset="${jpegSrcset}"
    src="images/medium/${baseName}_md.jpg"
    alt="${alt}"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    loading="lazy"
  />
</picture>`.trim()
  }

  // Clean up unused images
  async cleanup(keepOriginals: boolean = false): Promise<void> {
    if (!keepOriginals) {
      // Remove original files after optimization
      const files = await fs.readdir(this.inputDir)
      for (const file of files) {
        if (this.isImageFile(file)) {
          await fs.unlink(path.join(this.inputDir, file))
        }
      }
      console.log('Cleaned up original files')
    }

    // Remove empty directories
    for (const config of this.imageConfigs) {
      const dir = path.join(this.outputDir, config.name)
      try {
        const files = await fs.readdir(dir)
        if (files.length === 0) {
          await fs.rmdir(dir)
        }
      } catch (error) {
        // Directory doesn't exist or not empty
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  async function main() {
    const args = process.argv.slice(2)
    const command = args[0] || 'optimize'
    
    const optimizer = new ImageOptimizer()
    
    console.log('Image Optimization System')
    console.log('=========================')
    
    switch (command) {
      case 'optimize':
        console.log('Optimizing all images in input directory...')
        const result = await optimizer.optimizeAllImages()
        
        console.log(`\nOptimization complete:`)
        console.log(`- Processed: ${result.processed} images`)
        console.log(`- Errors: ${result.errors.length}`)
        
        if (result.errors.length > 0) {
          console.log('\nErrors:')
          result.errors.forEach(error => console.log(`  - ${error}`))
        }
        
        console.log('\nOutput sizes by configuration:')
        Object.entries(result.stats).forEach(([config, size]) => {
          console.log(`  - ${config}: ${Math.round(size / 1024 / 1024 * 100) / 100}MB`)
        })
        break
        
      case 'external':
        const externalPath = args[1] || '/Volumes/LaCie/Etsy/Organized_Products'
        console.log(`Processing images from external drive: ${externalPath}`)
        
        const extResult = await optimizer.processFromExternalDrive(externalPath, (filename) => {
          // Only process main images
          return filename.includes('main') || filename.includes('Main')
        })
        
        console.log(`\nExternal drive processing complete:`)
        console.log(`- Copied: ${extResult.copied} images`)
        console.log(`- Optimized: ${extResult.optimized} images`)
        console.log(`- Errors: ${extResult.errors.length}`)
        break
        
      case 'cleanup':
        console.log('Cleaning up...')
        await optimizer.cleanup(false)
        console.log('Cleanup complete')
        break
        
      default:
        console.log('Usage:')
        console.log('  npm run optimize:images optimize    - Optimize all images in input folder')
        console.log('  npm run optimize:images external    - Process from external drive')
        console.log('  npm run optimize:images cleanup     - Clean up original files')
    }
  }
  
  main().catch(console.error)
}