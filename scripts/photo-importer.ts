#!/usr/bin/env tsx

import * as fs from 'fs/promises'
import * as path from 'path'
import Papa from 'papaparse'
import sharp from 'sharp'
import { createHash } from 'crypto'

interface PhotoInventoryRow {
  original_filename: string
  new_filename: string
  new_location: string
  category: string
  location: string
  product: string
  image_type: string
  file_size_bytes: string
  file_size_mb: string
  dimensions: string
  date_modified: string
  relative_path: string
}

interface ProcessedPhoto {
  id: string
  title: string
  description: string
  category: string
  location: string
  image_type: string
  original_path: string
  web_path: string
  thumbnail_path: string
  dimensions: { width: number; height: number }
  file_size: number
  tags: string[]
  base_price: number
}

export class PhotoImporter {
  private externalDrivePath = '/Volumes/LaCie/Etsy'
  private csvPath = '/Volumes/LaCie/Etsy/photo_inventory copy.csv'
  private websiteImagesPath = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/public/images'
  private outputDir = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/data'

  // Price mapping based on category and location
  private priceMatrix = {
    'Architecture': { 'California': 45, 'Hawaii': 55, 'Arizona': 40, 'Other': 35 },
    'Landscapes': { 'California': 50, 'Hawaii': 65, 'Arizona': 45, 'Other': 40 },
    'Cityscapes': { 'California': 45, 'Hawaii': 55, 'Arizona': 40, 'Other': 35 },
    'Nature': { 'California': 40, 'Hawaii': 60, 'Arizona': 35, 'Other': 30 },
    'Other': { 'California': 35, 'Hawaii': 45, 'Arizona': 30, 'Other': 25 }
  }

  async importFromCSV(): Promise<{ processed: ProcessedPhoto[], errors: string[] }> {
    const errors: string[] = []
    const processed: ProcessedPhoto[] = []

    try {
      // Read and parse CSV
      console.log('Reading CSV file...')
      const csvContent = await fs.readFile(this.csvPath, 'utf-8')
      const parseResult = Papa.parse<PhotoInventoryRow>(csvContent, { 
        header: true, 
        skipEmptyLines: true 
      })

      if (parseResult.errors.length > 0) {
        errors.push(...parseResult.errors.map(err => `CSV Parse Error: ${err.message}`))
      }

      console.log(`Found ${parseResult.data.length} photos in CSV`)

      // Ensure output directories exist
      await this.ensureDirectories()

      // Process each photo
      for (const [index, row] of parseResult.data.entries()) {
        try {
          // Only process main images for now (we can add others later)
          if (row.image_type !== 'Main_Images') {
            continue
          }

          console.log(`Processing ${index + 1}/${parseResult.data.length}: ${row.new_filename}`)
          
          const processedPhoto = await this.processPhoto(row)
          if (processedPhoto) {
            processed.push(processedPhoto)
          }
        } catch (error) {
          const errorMsg = `Row ${index + 1} (${row.new_filename}): ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      // Save processed data
      await this.saveProcessedData(processed)
      
      console.log(`\nImport complete:`)
      console.log(`- Processed: ${processed.length} photos`)
      console.log(`- Errors: ${errors.length}`)

      return { processed, errors }

    } catch (error) {
      const errorMsg = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      return { processed, errors }
    }
  }

  private async processPhoto(row: PhotoInventoryRow): Promise<ProcessedPhoto | null> {
    // Validate file exists
    const originalPath = row.new_location
    try {
      await fs.access(originalPath)
    } catch {
      throw new Error(`File not found: ${originalPath}`)
    }

    // Generate unique ID
    const photoId = this.generatePhotoId(row)

    // Parse dimensions
    const dimensions = this.parseDimensions(row.dimensions)
    if (!dimensions) {
      throw new Error(`Invalid dimensions: ${row.dimensions}`)
    }

    // Generate web-optimized filename
    const webFilename = this.generateWebFilename(row, photoId)
    const thumbnailFilename = this.generateThumbnailFilename(row, photoId)

    // Create web-optimized images
    const webPath = path.join(this.websiteImagesPath, webFilename)
    const thumbnailPath = path.join(this.websiteImagesPath, 'thumbnails', thumbnailFilename)

    await this.createOptimizedImages(originalPath, webPath, thumbnailPath, dimensions)

    // Generate product data
    const title = this.generateTitle(row)
    const description = this.generateDescription(row)
    const tags = this.generateTags(row)
    const basePrice = this.calculatePrice(row)

    const processedPhoto: ProcessedPhoto = {
      id: photoId,
      title,
      description,
      category: row.category,
      location: row.location,
      image_type: row.image_type,
      original_path: originalPath,
      web_path: `/images/${webFilename}`,
      thumbnail_path: `/images/thumbnails/${thumbnailFilename}`,
      dimensions,
      file_size: parseInt(row.file_size_bytes),
      tags,
      base_price: basePrice
    }

    return processedPhoto
  }

  private async createOptimizedImages(
    originalPath: string, 
    webPath: string, 
    thumbnailPath: string,
    dimensions: { width: number; height: number }
  ): Promise<void> {
    // Create web-optimized version (max 1200px on longest side, 85% quality)
    const maxSize = 1200
    const ratio = Math.min(maxSize / dimensions.width, maxSize / dimensions.height)
    const webWidth = Math.round(dimensions.width * ratio)
    const webHeight = Math.round(dimensions.height * ratio)

    await sharp(originalPath)
      .resize(webWidth, webHeight, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85, progressive: true })
      .toFile(webPath)

    // Create thumbnail (400px max, 80% quality)
    const thumbSize = 400
    const thumbRatio = Math.min(thumbSize / dimensions.width, thumbSize / dimensions.height)
    const thumbWidth = Math.round(dimensions.width * thumbRatio)
    const thumbHeight = Math.round(dimensions.height * thumbRatio)

    await sharp(originalPath)
      .resize(thumbWidth, thumbHeight, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80, progressive: true })
      .toFile(thumbnailPath)
  }

  private generatePhotoId(row: PhotoInventoryRow): string {
    // Create hash from product name and filename for consistent IDs
    const content = `${row.product}_${row.new_filename}`
    return createHash('md5').update(content).digest('hex').substring(0, 12)
  }

  private parseDimensions(dimensionsStr: string): { width: number; height: number } | null {
    if (!dimensionsStr || dimensionsStr === 'Unknown') return null
    
    const match = dimensionsStr.match(/(\d+)x(\d+)/)
    if (!match) return null
    
    return {
      width: parseInt(match[1]),
      height: parseInt(match[2])
    }
  }

  private generateWebFilename(row: PhotoInventoryRow, photoId: string): string {
    const ext = path.extname(row.new_filename)
    const baseName = row.new_filename.replace(ext, '').toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50)
    
    return `${baseName}_${photoId}${ext}`
  }

  private generateThumbnailFilename(row: PhotoInventoryRow, photoId: string): string {
    const webFilename = this.generateWebFilename(row, photoId)
    return webFilename.replace(/\.[^.]+$/, '_thumb.jpg')
  }

  private generateTitle(row: PhotoInventoryRow): string {
    // Clean up the product name to create a nice title
    let title = row.product
      .replace(/^[A-Z0-9]+_/, '') // Remove prefix codes
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Capitalize properly
    title = title.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    return title
  }

  private generateDescription(row: PhotoInventoryRow): string {
    const title = this.generateTitle(row)
    const location = row.location
    const category = row.category.toLowerCase()

    let description = `Stunning ${category} photography capturing the beauty of ${title}`
    
    if (location && location !== 'Other') {
      description += ` in ${location}`
    }

    description += '. This high-quality print brings professional photography into your space with rich colors and sharp detail.'

    return description
  }

  private generateTags(row: PhotoInventoryRow): string[] {
    const tags: string[] = []
    
    // Add category and location
    tags.push(row.category.toLowerCase())
    if (row.location && row.location !== 'Other') {
      tags.push(row.location.toLowerCase())
    }

    // Extract from product name
    const productWords = row.product.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 5) // Limit to avoid too many tags

    tags.push(...productWords)

    // Add common photography terms
    if (row.category === 'Landscapes') {
      tags.push('nature', 'scenic', 'landscape')
    } else if (row.category === 'Architecture') {
      tags.push('building', 'structure', 'architectural')
    } else if (row.category === 'Cityscapes') {
      tags.push('urban', 'city', 'skyline')
    } else if (row.category === 'Nature') {
      tags.push('natural', 'outdoor', 'wilderness')
    }

    // Remove duplicates and return
    return [...new Set(tags)].slice(0, 10) // Limit to 10 tags max
  }

  private calculatePrice(row: PhotoInventoryRow): number {
    const category = row.category as keyof typeof this.priceMatrix
    const location = row.location as keyof typeof this.priceMatrix[typeof category]
    
    const categoryPrices = this.priceMatrix[category] || this.priceMatrix['Other']
    return categoryPrices[location] || categoryPrices['Other']
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.websiteImagesPath,
      path.join(this.websiteImagesPath, 'thumbnails'),
      this.outputDir
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

  private async saveProcessedData(processed: ProcessedPhoto[]): Promise<void> {
    // Save as JSON for the application
    const jsonPath = path.join(this.outputDir, 'processed-photos.json')
    await fs.writeFile(jsonPath, JSON.stringify(processed, null, 2))

    // Save as CSV for easy reviewing
    const csvPath = path.join(this.outputDir, 'processed-photos.csv')
    const csvContent = Papa.unparse(processed)
    await fs.writeFile(csvPath, csvContent)

    // Save products CSV in format expected by existing CSV importer
    const productsCsvPath = path.join(this.outputDir, 'products-for-import.csv')
    const productsData = processed.map(photo => ({
      title: photo.title,
      description: photo.description,
      image_url: photo.web_path,
      base_price: photo.base_price,
      category: photo.category,
      tags: photo.tags.join(', '),
      width: photo.dimensions.width,
      height: photo.dimensions.height
    }))
    
    const productsCsvContent = Papa.unparse(productsData)
    await fs.writeFile(productsCsvPath, productsCsvContent)

    console.log(`\nSaved processed data:`)
    console.log(`- JSON: ${jsonPath}`)
    console.log(`- CSV: ${csvPath}`)
    console.log(`- Products CSV: ${productsCsvPath}`)
  }

  // Utility method to check external drive availability
  async checkExternalDrive(): Promise<boolean> {
    try {
      await fs.access(this.externalDrivePath)
      await fs.access(this.csvPath)
      return true
    } catch {
      return false
    }
  }

  // Method to get import stats without processing
  async getImportStats(): Promise<{
    totalPhotos: number
    mainImages: number
    categories: Record<string, number>
    locations: Record<string, number>
  }> {
    const csvContent = await fs.readFile(this.csvPath, 'utf-8')
    const parseResult = Papa.parse<PhotoInventoryRow>(csvContent, { 
      header: true, 
      skipEmptyLines: true 
    })

    const mainImages = parseResult.data.filter(row => row.image_type === 'Main_Images')
    
    const categories: Record<string, number> = {}
    const locations: Record<string, number> = {}

    mainImages.forEach(row => {
      categories[row.category] = (categories[row.category] || 0) + 1
      locations[row.location] = (locations[row.location] || 0) + 1
    })

    return {
      totalPhotos: parseResult.data.length,
      mainImages: mainImages.length,
      categories,
      locations
    }
  }
}

// CLI usage
if (require.main === module) {
  async function main() {
    const importer = new PhotoImporter()
    
    console.log('Photo Import System')
    console.log('==================')
    
    // Check external drive
    console.log('Checking external drive...')
    const driveAvailable = await importer.checkExternalDrive()
    
    if (!driveAvailable) {
      console.error('❌ External drive not available at /Volumes/LaCie/Etsy')
      console.error('Please ensure the LaCie drive is connected and mounted.')
      process.exit(1)
    }
    
    console.log('✅ External drive detected')
    
    // Get stats
    console.log('\nAnalyzing photo inventory...')
    const stats = await importer.getImportStats()
    
    console.log(`\nPhoto Inventory Stats:`)
    console.log(`- Total photos: ${stats.totalPhotos}`)
    console.log(`- Main images: ${stats.mainImages}`)
    console.log(`\nCategories:`)
    Object.entries(stats.categories).forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count}`)
    })
    console.log(`\nLocations:`)
    Object.entries(stats.locations).forEach(([loc, count]) => {
      console.log(`  - ${loc}: ${count}`)
    })
    
    // Confirm import
    console.log(`\nReady to import ${stats.mainImages} main images.`)
    console.log('This will create web-optimized versions and product data.')
    
    // In a real CLI, you'd prompt for confirmation here
    // For now, we'll proceed automatically
    
    console.log('\nStarting import...')
    const result = await importer.importFromCSV()
    
    if (result.errors.length > 0) {
      console.log('\n❌ Import completed with errors:')
      result.errors.forEach(error => console.log(`  - ${error}`))
    } else {
      console.log('\n✅ Import completed successfully!')
    }
    
    console.log(`\nProcessed ${result.processed.length} photos`)
    console.log('Next steps:')
    console.log('1. Review processed-photos.csv in the data folder')
    console.log('2. Import products-for-import.csv via the admin dashboard')
    console.log('3. Upload optimized images to your hosting provider')
  }
  
  main().catch(console.error)
}