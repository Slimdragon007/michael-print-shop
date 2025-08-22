#!/usr/bin/env tsx

import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { glob } from 'glob'

const execAsync = promisify(exec)

interface UploadConfig {
  bucketName: string
  sourceDir: string
  dryRun: boolean
  parallel: number
  keyPrefix: string
}

interface UploadResult {
  success: boolean
  uploaded: number
  failed: number
  skipped: number
  errors: string[]
  totalSize: number
}

export class R2Uploader {
  private config: UploadConfig

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = {
      bucketName: config.bucketName || 'print-shop-images',
      sourceDir: config.sourceDir || './data/etsy-processed/etsy_images',
      dryRun: config.dryRun || false,
      parallel: config.parallel || 5,
      keyPrefix: config.keyPrefix || 'products'
    }
  }

  async uploadAll(): Promise<UploadResult> {
    console.log('🚀 Starting R2 Upload Process')
    console.log('=' .repeat(50))
    console.log(`Source: ${this.config.sourceDir}`)
    console.log(`Bucket: ${this.config.bucketName}`)
    console.log(`Dry Run: ${this.config.dryRun}`)
    console.log(`Parallel: ${this.config.parallel}`)
    console.log('')

    const result: UploadResult = {
      success: false,
      uploaded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      totalSize: 0
    }

    try {
      // Check if wrangler is available
      await this.checkWrangler()

      // Find all image files
      const imageFiles = await this.findImageFiles()
      console.log(`📸 Found ${imageFiles.length} images to upload`)

      if (imageFiles.length === 0) {
        console.log('No images found to upload')
        return { ...result, success: true }
      }

      // Check which files already exist in R2 (optional optimization)
      const existingFiles = await this.getExistingFiles()
      
      // Filter out existing files
      const filesToUpload = imageFiles.filter(file => {
        const key = this.generateKey(file.relativePath)
        return !existingFiles.includes(key)
      })

      result.skipped = imageFiles.length - filesToUpload.length
      console.log(`⏭️  Skipping ${result.skipped} existing files`)
      console.log(`📤 Uploading ${filesToUpload.length} new files`)

      if (filesToUpload.length === 0) {
        console.log('✅ All files already uploaded')
        return { ...result, success: true }
      }

      // Upload files in parallel batches
      await this.uploadInBatches(filesToUpload, result)

      result.success = result.failed === 0
      
      // Print summary
      this.printSummary(result)

      return result

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      console.error('❌ Upload failed:', error)
      return result
    }
  }

  private async checkWrangler(): Promise<void> {
    try {
      await execAsync('wrangler --version')
    } catch (error) {
      throw new Error('Wrangler CLI not found. Install with: npm install -g wrangler')
    }
  }

  private async findImageFiles(): Promise<Array<{
    fullPath: string
    relativePath: string
    size: number
  }>> {
    const pattern = path.join(this.config.sourceDir, '**/*.{jpg,jpeg,png,webp}')
    const files = await glob(pattern, { ignore: ['**/node_modules/**'] })
    
    const imageFiles = []
    
    for (const file of files) {
      try {
        const stats = await fs.stat(file)
        const relativePath = path.relative(this.config.sourceDir, file)
        
        imageFiles.push({
          fullPath: file,
          relativePath: relativePath,
          size: stats.size
        })
      } catch (error) {
        console.warn(`Warning: Could not stat file ${file}`)
      }
    }

    return imageFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  }

  private async getExistingFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`wrangler r2 object list ${this.config.bucketName} --json`)
      const objects = JSON.parse(stdout)
      return objects.map((obj: any) => obj.key)
    } catch (error) {
      console.warn('Could not list existing files, will upload all')
      return []
    }
  }

  private generateKey(relativePath: string): string {
    // Convert Windows paths to Unix paths for consistent keys
    const normalizedPath = relativePath.replace(/\\/g, '/')
    
    // Extract product info from path structure
    const parts = normalizedPath.split('/')
    
    if (parts.length >= 2) {
      // Expected structure: product-name/image-variant.jpg
      const productName = parts[0]
      const filename = parts[parts.length - 1]
      
      return `${this.config.keyPrefix}/${productName}/${filename}`
    }
    
    // Fallback for unexpected structure
    return `${this.config.keyPrefix}/${normalizedPath}`
  }

  private async uploadInBatches(
    files: Array<{ fullPath: string; relativePath: string; size: number }>,
    result: UploadResult
  ): Promise<void> {
    const batches = this.chunkArray(files, this.config.parallel)
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} files)`)
      
      const promises = batch.map(file => this.uploadSingleFile(file, result))
      await Promise.allSettled(promises)
      
      // Progress update
      const progress = Math.round(((i + 1) / batches.length) * 100)
      console.log(`Progress: ${progress}% complete`)
    }
  }

  private async uploadSingleFile(
    file: { fullPath: string; relativePath: string; size: number },
    result: UploadResult
  ): Promise<void> {
    const key = this.generateKey(file.relativePath)
    
    try {
      if (this.config.dryRun) {
        console.log(`[DRY RUN] Would upload: ${file.relativePath} → ${key}`)
        result.uploaded++
        return
      }

      const command = `wrangler r2 object put ${this.config.bucketName}/${key} --file "${file.fullPath}"`
      await execAsync(command)
      
      console.log(`✅ Uploaded: ${file.relativePath} (${this.formatFileSize(file.size)})`)
      result.uploaded++
      result.totalSize += file.size
      
    } catch (error) {
      const errorMsg = `Failed to upload ${file.relativePath}: ${error}`
      console.error(`❌ ${errorMsg}`)
      result.errors.push(errorMsg)
      result.failed++
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  private printSummary(result: UploadResult): void {
    console.log('\n🎉 Upload Summary')
    console.log('=' .repeat(30))
    console.log(`✅ Uploaded: ${result.uploaded} files`)
    console.log(`❌ Failed: ${result.failed} files`)
    console.log(`⏭️  Skipped: ${result.skipped} files`)
    console.log(`📊 Total Size: ${this.formatFileSize(result.totalSize)}`)
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:')
      result.errors.forEach(error => console.log(`  - ${error}`))
    }
    
    if (result.success) {
      console.log('\n🎉 All uploads completed successfully!')
    } else {
      console.log('\n⚠️  Some uploads failed. Check errors above.')
    }
  }

  // Utility methods for specific upload scenarios
  async uploadEtsyImages(): Promise<UploadResult> {
    this.config.sourceDir = './data/etsy-processed/etsy_images'
    this.config.keyPrefix = 'products'
    return this.uploadAll()
  }

  async uploadWebsiteImages(): Promise<UploadResult> {
    this.config.sourceDir = './public/images'
    this.config.keyPrefix = 'website'
    return this.uploadAll()
  }

  async uploadSingleImage(localPath: string, r2Key: string): Promise<boolean> {
    try {
      const command = `wrangler r2 object put ${this.config.bucketName}/${r2Key} --file "${localPath}"`
      await execAsync(command)
      console.log(`✅ Uploaded: ${localPath} → ${r2Key}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to upload ${localPath}:`, error)
      return false
    }
  }

  async deleteFromR2(key: string): Promise<boolean> {
    try {
      const command = `wrangler r2 object delete ${this.config.bucketName}/${key}`
      await execAsync(command)
      console.log(`🗑️  Deleted: ${key}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to delete ${key}:`, error)
      return false
    }
  }

  async listR2Objects(prefix?: string): Promise<string[]> {
    try {
      const prefixFlag = prefix ? `--prefix ${prefix}` : ''
      const { stdout } = await execAsync(`wrangler r2 object list ${this.config.bucketName} ${prefixFlag} --json`)
      const objects = JSON.parse(stdout)
      return objects.map((obj: any) => obj.key)
    } catch (error) {
      console.error('Failed to list R2 objects:', error)
      return []
    }
  }
}

// CLI usage
if (require.main === module) {
  async function main() {
    const args = process.argv.slice(2)
    const dryRun = args.includes('--dry-run')
    const bucketName = args.find(arg => arg.startsWith('--bucket='))?.split('=')[1] || 'print-shop-images'
    const sourceDir = args.find(arg => arg.startsWith('--source='))?.split('=')[1]
    
    const uploader = new R2Uploader({
      bucketName,
      sourceDir,
      dryRun,
      parallel: 5
    })

    // Check if specific command
    if (args.includes('--etsy-only')) {
      await uploader.uploadEtsyImages()
    } else if (args.includes('--website-only')) {
      await uploader.uploadWebsiteImages()
    } else {
      await uploader.uploadAll()
    }
  }
  
  main().catch(console.error)
}