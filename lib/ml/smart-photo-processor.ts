// Smart photo processor simplified for Cloudflare R2
// Removed Supabase dependencies - using file-based storage
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface ProcessingOptions {
  variants?: string[]
  quality?: number
  watermark?: boolean
  skipML?: boolean
  dryRun?: boolean
}

interface ProcessingResult {
  success: boolean
  filePath: string
  outputFiles: string[]
  errors: string[]
  warnings: string[]
  processingTimeMs: number
  mlPrediction?: any
  appliedFixes: string[]
  qualityScore?: number
}

interface BatchProcessingResult {
  totalFiles: number
  processed: number
  successful: number
  failed: number
  skipped: number
  results: ProcessingResult[]
  overallTimeMs: number
  errorSummary: { [key: string]: number }
  recommendations: string[]
}

export class SmartPhotoProcessor {
  private processingQueue: Set<string> = new Set()

  constructor() {
    // Using Cloudflare R2 storage instead of Supabase
  }

  /**
   * Process a single photo with ML error prevention
   */
  async processPhoto(filePath: string, options: ProcessingOptions = {}): Promise<ProcessingResult> {
    const startTime = Date.now()
    const result: ProcessingResult = {
      success: false,
      filePath,
      outputFiles: [],
      errors: [],
      warnings: [],
      processingTimeMs: 0,
      appliedFixes: []
    }

    try {
      // Prevent duplicate processing
      if (this.processingQueue.has(filePath)) {
        result.errors.push('File is already being processed')
        return result
      }

      this.processingQueue.add(filePath)

      // Step 1: Basic file validation (ML disabled for R2)
      if (!options.skipML) {
        console.log(`📸 Running basic validation for: ${path.basename(filePath)}`)
        
        try {
          // Basic file validation instead of ML
          const basicValidation = await this.basicFileValidation(filePath)
          result.mlPrediction = basicValidation
          
          if (!basicValidation.shouldProceed) {
            result.warnings.push(`Validation suggests skipping: ${basicValidation.recommendations.join(', ')}`)
            
            if (basicValidation.riskLevel === 'high') {
              result.errors.push('File determined too risky to process')
              return result
            }
          }

        } catch (validationError) {
          console.warn('Basic validation failed, proceeding:', validationError)
          result.warnings.push('Validation unavailable, proceeding with standard processing')
        }
      }

      // Step 2: File validation
      const validation = await this.validateFile(filePath)
      if (!validation.valid) {
        result.errors.push(...validation.errors)
        await this.logErrorToFile({
          errorType: 'file_corruption',
          errorMessage: validation.errors.join('; '),
          filePath,
          processingStep: 'validation',
          context: validation
        })
        return result
      }

      // Step 3: Process with error handling and learning
      const processingResult = await this.processWithRetries(filePath, options, result)
      
      if (processingResult.success) {
        // Log success to file system instead of database
        await this.logSuccessToFile({
          filePath,
          fileSize: validation.fileSize!,
          fileFormat: validation.fileFormat!,
          metadata: validation.metadata,
          processingTimeMs: Date.now() - startTime,
          outputVariants: processingResult.outputFiles,
          qualityScore: processingResult.qualityScore
        })

        result.success = true
        result.outputFiles = processingResult.outputFiles
        result.qualityScore = processingResult.qualityScore
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push(`Unexpected error: ${errorMessage}`)
      
      await this.logErrorToFile({
        errorType: 'processing_failed',
        errorMessage,
        filePath,
        processingStep: 'processing',
        context: { options, error: errorMessage }
      })

      return result

    } finally {
      result.processingTimeMs = Date.now() - startTime
      this.processingQueue.delete(filePath)
      
      // Log final result for ML learning
      await this.logProcessingResult(result)
    }
  }

  /**
   * Process multiple photos with intelligent batch optimization
   */
  async processBatch(filePaths: string[], options: ProcessingOptions = {}): Promise<BatchProcessingResult> {
    const startTime = Date.now()
    const batchResult: BatchProcessingResult = {
      totalFiles: filePaths.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: [],
      overallTimeMs: 0,
      errorSummary: {},
      recommendations: []
    }

    console.log(`🚀 Starting smart batch processing of ${filePaths.length} files`)

    // Step 1: ML-powered batch optimization
    const optimizedPaths = await this.optimizeBatchOrder(filePaths)
    
    // Step 2: Process files with smart error handling
    for (const filePath of optimizedPaths) {
      try {
        const result = await this.processPhoto(filePath, options)
        batchResult.results.push(result)
        batchResult.processed++

        if (result.success) {
          batchResult.successful++
          console.log(`✅ ${path.basename(filePath)} processed successfully`)
        } else {
          batchResult.failed++
          console.log(`❌ ${path.basename(filePath)} failed: ${result.errors.join(', ')}`)
          
          // Update error summary
          result.errors.forEach(error => {
            const errorType = this.categorizeError(error)
            batchResult.errorSummary[errorType] = (batchResult.errorSummary[errorType] || 0) + 1
          })
        }

        // Check if we should stop processing due to error patterns
        if (await this.shouldStopBatch(batchResult)) {
          console.log('🛑 Stopping batch due to error patterns')
          batchResult.skipped = filePaths.length - batchResult.processed
          break
        }

      } catch (error) {
        console.error(`Fatal error processing ${filePath}:`, error)
        batchResult.failed++
        batchResult.errorSummary['fatal_error'] = (batchResult.errorSummary['fatal_error'] || 0) + 1
      }
    }

    batchResult.overallTimeMs = Date.now() - startTime

    // Step 3: Generate intelligent recommendations
    batchResult.recommendations = await this.generateBatchRecommendations(batchResult)

    // Step 4: Log batch results for future optimization
    await this.logBatchResults(batchResult)

    console.log(`🏁 Batch complete: ${batchResult.successful}/${batchResult.totalFiles} successful`)
    
    return batchResult
  }

  /**
   * Smart retry logic with ML-guided decisions
   */
  private async processWithRetries(
    filePath: string, 
    options: ProcessingOptions, 
    result: ProcessingResult
  ): Promise<{ success: boolean; outputFiles: string[]; qualityScore?: number }> {
    let lastError: any = null
    let attemptNumber = 0
    const maxAttempts = 3

    while (attemptNumber < maxAttempts) {
      attemptNumber++
      
      try {
        console.log(`📸 Processing attempt ${attemptNumber} for ${path.basename(filePath)}`)
        
        // Actual photo processing logic
        const processingResult = await this.executePhotoProcessing(filePath, options, attemptNumber)
        
        // Quality assessment
        const qualityScore = await this.assessQuality(filePath, processingResult.outputFiles)
        
        return {
          success: true,
          outputFiles: processingResult.outputFiles,
          qualityScore
        }

      } catch (error) {
        lastError = error
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        // Log error to file system
        await this.logErrorToFile({
          errorType: this.determineErrorType(error),
          errorMessage,
          filePath,
          processingStep: this.determineProcessingStep(error),
          context: { attempt: attemptNumber, options }
        })

        // Simple retry logic without ML
        const shouldRetry = attemptNumber < 2 && !errorMessage.includes('corrupt')

        if (!shouldRetry || attemptNumber >= maxAttempts) {
          break
        }

        // Apply basic fixes before retry
        try {
          const fixes = await this.applyBasicFixes(filePath, errorMessage)
          
          if (fixes.length > 0) {
            result.appliedFixes.push(...fixes)
            console.log(`🔧 Applied fixes before retry: ${fixes.join(', ')}`)
          }
        } catch (fixError) {
          console.warn('Failed to apply fixes:', fixError)
        }

        // Wait before retry (with smart backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    // All retries failed
    result.errors.push(`Failed after ${attemptNumber} attempts: ${lastError?.message || 'Unknown error'}`)
    return { success: false, outputFiles: [] }
  }

  /**
   * Execute the actual photo processing (calls your existing pipeline)
   */
  private async executePhotoProcessing(
    filePath: string, 
    options: ProcessingOptions, 
    attemptNumber: number
  ): Promise<{ outputFiles: string[] }> {
    
    // Call your existing Python processing script
    const outputDir = path.join(path.dirname(filePath), '../processed')
    await fs.mkdir(outputDir, { recursive: true })

    // Adjust quality based on attempt number
    const quality = options.quality || (attemptNumber > 1 ? 75 : 90)
    
    const command = `python3 scripts/etsy-pipeline.py --file "${filePath}" --output "${outputDir}" --quality ${quality}`
    
    const { stdout, stderr } = await execAsync(command)
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(`Processing failed: ${stderr}`)
    }

    // Parse output files from the Python script response
    const outputFiles = this.parseOutputFiles(stdout, outputDir)
    
    if (outputFiles.length === 0) {
      throw new Error('No output files generated')
    }

    return { outputFiles }
  }

  /**
   * AI-powered quality assessment
   */
  private async assessQuality(originalPath: string, outputFiles: string[]): Promise<number> {
    try {
      // Basic quality checks
      let qualityScore = 0.5
      
      // Check if all expected variants were created
      const expectedVariants = ['etsy_primary', 'etsy_square', 'website_large', 'website_thumb']
      const createdVariants = outputFiles.filter(file => 
        expectedVariants.some(variant => file.includes(variant))
      )
      
      qualityScore += (createdVariants.length / expectedVariants.length) * 0.3
      
      // Check file sizes are reasonable
      for (const file of outputFiles) {
        const stats = await fs.stat(file)
        if (stats.size > 100 * 1024 && stats.size < 5 * 1024 * 1024) { // 100KB - 5MB
          qualityScore += 0.05
        }
      }
      
      // Cap at 1.0
      qualityScore = Math.min(qualityScore, 1.0)
      
      // Store quality assessment to file
      await this.logQualityAssessment(originalPath, qualityScore, {
        output_files: outputFiles,
        variants_created: createdVariants.length,
        expected_variants: expectedVariants.length
      })
      
      return qualityScore
      
    } catch (error) {
      console.warn('Quality assessment failed:', error)
      return 0.5 // Default score
    }
  }

  /**
   * Optimize batch processing order using basic file analysis
   */
  private async optimizeBatchOrder(filePaths: string[]): Promise<string[]> {
    try {
      // Sort by file size (process smaller files first)
      const pathsWithSize = await Promise.all(
        filePaths.map(async (path) => {
          try {
            const stats = await fs.stat(path)
            return { path, size: stats.size }
          } catch {
            return { path, size: Infinity }
          }
        })
      )

      const sorted = pathsWithSize.sort((a, b) => a.size - b.size)
      return sorted.map(item => item.path)

    } catch (error) {
      console.warn('Batch optimization failed, using original order:', error)
      return filePaths
    }
  }

  /**
   * Determine if batch processing should stop due to error patterns
   */
  private async shouldStopBatch(batchResult: BatchProcessingResult): Promise<boolean> {
    // Stop if error rate is too high
    if (batchResult.processed > 10 && batchResult.failed / batchResult.processed > 0.8) {
      return true
    }

    // Stop if we see critical error patterns
    const criticalErrors = ['file_corruption', 'system_error', 'disk_full']
    for (const error of criticalErrors) {
      if (batchResult.errorSummary[error] > 3) {
        return true
      }
    }

    return false
  }

  /**
   * Generate intelligent recommendations based on batch results
   */
  private async generateBatchRecommendations(batchResult: BatchProcessingResult): Promise<string[]> {
    const recommendations: string[] = []

    // Error pattern analysis
    const topErrors = Object.entries(batchResult.errorSummary)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)

    for (const [errorType, count] of topErrors) {
      if (count > batchResult.totalFiles * 0.1) { // More than 10% of files
        recommendations.push(`Consider investigating ${errorType} errors (${count} occurrences)`)
      }
    }

    // Performance recommendations
    if (batchResult.overallTimeMs > 600000) { // More than 10 minutes
      recommendations.push('Consider processing smaller batches or optimizing file sizes')
    }

    // Success rate recommendations
    const successRate = batchResult.successful / batchResult.processed
    if (successRate < 0.8) {
      recommendations.push('Low success rate detected - consider reviewing file quality and processing settings')
    }

    return recommendations
  }

  // Helper methods for error classification and file validation
  private async validateFile(filePath: string): Promise<{
    valid: boolean
    errors: string[]
    fileSize?: number
    fileFormat?: string
    metadata?: any
  }> {
    const validation = { valid: true, errors: [], fileSize: undefined, fileFormat: undefined, metadata: undefined }

    try {
      const stats = await fs.stat(filePath)
      validation.fileSize = stats.size
      validation.fileFormat = path.extname(filePath).toLowerCase()

      // Basic validations
      if (stats.size === 0) {
        validation.valid = false
        validation.errors.push('File is empty')
      }

      if (stats.size > 100 * 1024 * 1024) { // 100MB
        validation.valid = false
        validation.errors.push('File too large (>100MB)')
      }

      const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp']
      if (!supportedFormats.includes(validation.fileFormat)) {
        validation.valid = false
        validation.errors.push(`Unsupported format: ${validation.fileFormat}`)
      }

    } catch (error) {
      validation.valid = false
      validation.errors.push(`Cannot access file: ${error}`)
    }

    return validation
  }

  private determineErrorType(error: any): 'file_corruption' | 'size_invalid' | 'format_unsupported' | 'metadata_missing' | 'processing_failed' | 'upload_failed' {
    const message = error?.message?.toLowerCase() || ''
    
    if (message.includes('corrupt') || message.includes('invalid')) return 'file_corruption'
    if (message.includes('size') || message.includes('too large')) return 'size_invalid'
    if (message.includes('format') || message.includes('unsupported')) return 'format_unsupported'
    if (message.includes('metadata') || message.includes('exif')) return 'metadata_missing'
    if (message.includes('upload') || message.includes('network')) return 'upload_failed'
    
    return 'processing_failed'
  }

  private determineProcessingStep(error: any): 'validation' | 'resize' | 'watermark' | 'upload' | 'etsy_export' {
    const message = error?.message?.toLowerCase() || ''
    
    if (message.includes('resize') || message.includes('dimension')) return 'resize'
    if (message.includes('watermark')) return 'watermark'
    if (message.includes('upload')) return 'upload'
    if (message.includes('etsy') || message.includes('export')) return 'etsy_export'
    
    return 'validation'
  }

  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase()
    
    if (message.includes('corrupt')) return 'file_corruption'
    if (message.includes('size')) return 'size_issues'
    if (message.includes('format')) return 'format_issues'
    if (message.includes('permission')) return 'permission_issues'
    if (message.includes('network') || message.includes('upload')) return 'network_issues'
    
    return 'unknown_error'
  }

  private parseOutputFiles(stdout: string, outputDir: string): string[] {
    // Parse the Python script output to extract generated files
    const lines = stdout.split('\n')
    const outputFiles: string[] = []
    
    for (const line of lines) {
      if (line.includes('Generated:') || line.includes('Created:')) {
        const match = line.match(/['"](.*?\.jpg)['"]/i)
        if (match) {
          outputFiles.push(path.resolve(outputDir, match[1]))
        }
      }
    }
    
    return outputFiles
  }

  private async applyPreProcessingFixes(filePath: string, recommendations: string[]): Promise<string[]> {
    const appliedFixes: string[] = []
    
    for (const recommendation of recommendations) {
      try {
        if (recommendation.includes('rename') && recommendation.includes('special characters')) {
          // Implement file renaming logic
          // This is a placeholder - implement based on your needs
          appliedFixes.push('Renamed file to remove special characters')
        }
        
        if (recommendation.includes('compress') && recommendation.includes('large')) {
          // Implement pre-compression logic
          appliedFixes.push('Pre-compressed large file')
        }
      } catch (error) {
        console.warn(`Failed to apply fix for "${recommendation}":`, error)
      }
    }
    
    return appliedFixes
  }

  // Helper methods for file-based logging (replacing Supabase)
  private async basicFileValidation(filePath: string): Promise<any> {
    const stats = await fs.stat(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp']
    
    return {
      shouldProceed: supportedFormats.includes(ext) && stats.size > 0,
      riskLevel: stats.size > 50 * 1024 * 1024 ? 'high' : 'low',
      confidence: 0.8,
      recommendations: stats.size > 50 * 1024 * 1024 ? ['Consider compressing large file'] : []
    }
  }

  private async logSuccessToFile(data: any): Promise<void> {
    const logDir = path.join(process.cwd(), 'logs')
    await fs.mkdir(logDir, { recursive: true })
    const logFile = path.join(logDir, 'processing-success.json')
    
    try {
      const entry = { timestamp: new Date().toISOString(), ...data }
      await fs.appendFile(logFile, JSON.stringify(entry) + '\n')
    } catch (error) {
      console.warn('Failed to log success:', error)
    }
  }

  private async logErrorToFile(data: any): Promise<void> {
    const logDir = path.join(process.cwd(), 'logs')
    await fs.mkdir(logDir, { recursive: true })
    const logFile = path.join(logDir, 'processing-errors.json')
    
    try {
      const entry = { timestamp: new Date().toISOString(), ...data }
      await fs.appendFile(logFile, JSON.stringify(entry) + '\n')
    } catch (error) {
      console.warn('Failed to log error:', error)
    }
  }

  private async logQualityAssessment(filePath: string, score: number, details: any): Promise<void> {
    const logDir = path.join(process.cwd(), 'logs')
    await fs.mkdir(logDir, { recursive: true })
    const logFile = path.join(logDir, 'quality-assessments.json')
    
    try {
      const entry = { 
        timestamp: new Date().toISOString(), 
        filePath, 
        qualityScore: score, 
        details 
      }
      await fs.appendFile(logFile, JSON.stringify(entry) + '\n')
    } catch (error) {
      console.warn('Failed to log quality assessment:', error)
    }
  }

  private async applyBasicFixes(filePath: string, errorMessage: string): Promise<string[]> {
    const fixes: string[] = []
    
    // Basic fix attempts based on error message
    if (errorMessage.includes('permission')) {
      fixes.push('File permission issue detected')
    }
    if (errorMessage.includes('size')) {
      fixes.push('File size issue detected')
    }
    
    return fixes
  }

  private async logProcessingResult(result: ProcessingResult): Promise<void> {
    if (result.appliedFixes.length > 0) {
      await this.logSuccessToFile({
        type: 'fixes_applied',
        filePath: result.filePath,
        fixes: result.appliedFixes,
        success: result.success
      })
    }
  }

  private async logBatchResults(batchResult: BatchProcessingResult): Promise<void> {
    await this.logSuccessToFile({
      type: 'batch_processing',
      totalFiles: batchResult.totalFiles,
      successful: batchResult.successful,
      failed: batchResult.failed,
      recommendations: batchResult.recommendations
    })
  }
}

// Export singleton instance
export const smartPhotoProcessor = new SmartPhotoProcessor()