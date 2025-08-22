#!/usr/bin/env tsx

import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface EtsyPipelineResult {
  success: boolean
  productsCreated: number
  imagesProcessed: number
  outputPaths: {
    etsyCSV: string
    websiteJSON: string
    websiteCSV: string
    imagesDirectory: string
  }
  errors: string[]
}

export class EtsyIntegration {
  private scriptPath = path.join(__dirname, 'etsy-pipeline.py')
  private pythonCommand = 'python3'

  async checkPythonDependencies(): Promise<{ available: boolean, missing: string[] }> {
    const requiredPackages = ['pillow', 'pandas', 'python-slugify', 'tqdm']
    const missing: string[] = []

    try {
      // Check if python3 is available
      await execAsync('python3 --version')
    } catch {
      return { available: false, missing: ['python3'] }
    }

    // Check each required package
    for (const pkg of requiredPackages) {
      try {
        await execAsync(`python3 -c "import ${pkg.replace('-', '_')}"`)
      } catch {
        missing.push(pkg)
      }
    }

    return { available: missing.length === 0, missing }
  }

  async installPythonDependencies(): Promise<void> {
    console.log('📦 Installing Python dependencies...')
    const packages = ['pillow', 'pandas', 'python-slugify', 'tqdm', 'piexif']
    
    try {
      const { stdout, stderr } = await execAsync(`pip3 install ${packages.join(' ')}`)
      console.log('✅ Python dependencies installed successfully')
      if (stderr) console.warn('Installation warnings:', stderr)
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error}`)
    }
  }

  async runEtsyPipeline(): Promise<EtsyPipelineResult> {
    console.log('🎨 Starting Etsy Pipeline...')
    
    // Check dependencies first
    const deps = await this.checkPythonDependencies()
    if (!deps.available) {
      if (deps.missing.includes('python3')) {
        throw new Error('Python 3 is not installed. Please install Python 3 first.')
      }
      
      console.log(`Missing packages: ${deps.missing.join(', ')}`)
      await this.installPythonDependencies()
    }

    try {
      // Run the Python script
      const { stdout, stderr } = await execAsync(`${this.pythonCommand} "${this.scriptPath}"`)
      
      console.log('Python script output:', stdout)
      if (stderr) console.warn('Python script warnings:', stderr)

      // Parse the results
      return await this.parseResults()
      
    } catch (error) {
      console.error('Error running Etsy pipeline:', error)
      throw new Error(`Etsy pipeline failed: ${error}`)
    }
  }

  private async parseResults(): Promise<EtsyPipelineResult> {
    const outputDir = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/data/etsy-processed'
    const reportPath = path.join(outputDir, 'processing_report.json')
    
    try {
      const reportContent = await fs.readFile(reportPath, 'utf-8')
      const report = JSON.parse(reportContent)
      
      return {
        success: true,
        productsCreated: report.total_products,
        imagesProcessed: report.total_images_processed,
        outputPaths: {
          etsyCSV: report.output_paths.etsy_csv,
          websiteJSON: report.output_paths.website_json,
          websiteCSV: report.output_paths.website_csv,
          imagesDirectory: report.output_paths.images_directory
        },
        errors: []
      }
    } catch (error) {
      return {
        success: false,
        productsCreated: 0,
        imagesProcessed: 0,
        outputPaths: {
          etsyCSV: '',
          websiteJSON: '',
          websiteCSV: '',
          imagesDirectory: ''
        },
        errors: [error instanceof Error ? error.message : 'Unknown error parsing results']
      }
    }
  }

  async copyImagesToWebsite(): Promise<void> {
    console.log('📸 Copying optimized images to website...')
    
    const sourceDir = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/data/etsy-processed/etsy_images'
    const targetDir = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/public/images'
    
    try {
      // Ensure target directory exists
      await fs.mkdir(targetDir, { recursive: true })
      
      // Copy all image files
      await execAsync(`cp -r "${sourceDir}"/* "${targetDir}"/`)
      
      console.log('✅ Images copied to website successfully')
    } catch (error) {
      throw new Error(`Failed to copy images: ${error}`)
    }
  }

  async integrateWithDatabase(): Promise<void> {
    console.log('💾 Integrating with existing database system...')
    
    const websiteProductsPath = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/data/etsy-processed/products_for_import.csv'
    const targetPath = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/data/products-for-import.csv'
    
    try {
      // Copy the CSV to your existing data directory
      await execAsync(`cp "${websiteProductsPath}" "${targetPath}"`)
      
      console.log('✅ Product data ready for database import')
      console.log(`Import file location: ${targetPath}`)
    } catch (error) {
      throw new Error(`Failed to prepare database import: ${error}`)
    }
  }

  async runFullPipeline(): Promise<EtsyPipelineResult> {
    console.log('🚀 Running Full Etsy Integration Pipeline')
    console.log('=' .repeat(50))
    
    try {
      // Step 1: Run the Etsy pipeline
      const result = await this.runEtsyPipeline()
      
      if (!result.success) {
        throw new Error(`Pipeline failed: ${result.errors.join(', ')}`)
      }
      
      // Step 2: Copy images to website
      await this.copyImagesToWebsite()
      
      // Step 3: Integrate with database
      await this.integrateWithDatabase()
      
      console.log('\n🎉 Full pipeline completed successfully!')
      console.log(`✅ Created ${result.productsCreated} products`)
      console.log(`✅ Processed ${result.imagesProcessed} images`)
      console.log('\n📋 Next steps:')
      console.log('1. Review the generated CSV files')
      console.log('2. Import products via admin dashboard')
      console.log('3. Upload Etsy listings using etsy_listings.csv')
      
      return result
      
    } catch (error) {
      console.error('❌ Pipeline failed:', error)
      throw error
    }
  }

  async getStats(): Promise<{
    externalDriveConnected: boolean
    estimatedPhotos: number
    estimatedProducts: number
  }> {
    try {
      const { stdout } = await execAsync('find "/Volumes/LaCie/Etsy" -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" | wc -l')
      const photoCount = parseInt(stdout.trim())
      
      return {
        externalDriveConnected: true,
        estimatedPhotos: photoCount,
        estimatedProducts: Math.floor(photoCount / 3) // Estimate based on ~3 images per product
      }
    } catch {
      return {
        externalDriveConnected: false,
        estimatedPhotos: 0,
        estimatedProducts: 0
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  async function main() {
    const integration = new EtsyIntegration()
    
    try {
      // Get stats first
      const stats = await integration.getStats()
      
      if (!stats.externalDriveConnected) {
        console.error('❌ External drive not connected')
        console.error('Please connect your LaCie drive and try again')
        process.exit(1)
      }
      
      console.log(`📊 Found ${stats.estimatedPhotos} photos`)
      console.log(`📦 Estimated ${stats.estimatedProducts} products`)
      console.log('')
      
      // Run full pipeline
      await integration.runFullPipeline()
      
    } catch (error) {
      console.error('Pipeline failed:', error)
      process.exit(1)
    }
  }
  
  main()
}