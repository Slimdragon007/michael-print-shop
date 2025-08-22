// import { createClient } from '@supabase/supabase-js' // Removed for Cloudflare R2
import OpenAI from 'openai'
import fs from 'fs/promises'
import path from 'path'

interface PhotoProcessingError {
  id: string
  timestamp: Date
  errorType: 'file_corruption' | 'size_invalid' | 'format_unsupported' | 'metadata_missing' | 'processing_failed' | 'upload_failed'
  errorMessage: string
  filePath: string
  fileSize?: number
  fileFormat?: string
  metadata?: any
  processingStep: 'validation' | 'resize' | 'watermark' | 'upload' | 'etsy_export'
  context: any
  resolved: boolean
  resolution?: string
}

interface ProcessingSuccess {
  id: string
  timestamp: Date
  filePath: string
  fileSize: number
  fileFormat: string
  metadata: any
  processingTimeMs: number
  outputVariants: string[]
  qualityScore?: number
}

interface MLPrediction {
  riskLevel: 'low' | 'medium' | 'high'
  confidence: number
  predictedErrors: string[]
  recommendations: string[]
  shouldProceed: boolean
}

export class PhotoProcessingML {
  private supabase: ReturnType<typeof createClient>
  private openai: OpenAI
  private errorPatterns: Map<string, number> = new Map()
  private successPatterns: Map<string, number> = new Map()

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    this.loadHistoricalData()
  }

  /**
   * Pre-process validation using ML to predict potential failures
   */
  async validateBeforeProcessing(filePath: string): Promise<MLPrediction> {
    const fileStats = await this.analyzeFile(filePath)
    const riskFactors = await this.assessRiskFactors(fileStats)
    const prediction = await this.generatePrediction(riskFactors)
    
    // Log the prediction for learning
    await this.logPrediction(filePath, prediction)
    
    return prediction
  }

  /**
   * Analyze file characteristics that could lead to errors
   */
  private async analyzeFile(filePath: string) {
    try {
      const stats = await fs.stat(filePath)
      const extension = path.extname(filePath).toLowerCase()
      
      // Basic file analysis
      const analysis = {
        size: stats.size,
        extension,
        path: filePath,
        filename: path.basename(filePath),
        directory: path.dirname(filePath),
        lastModified: stats.mtime,
        // Add more analysis as needed
        suspiciousChars: /[^\w\s\-.]/.test(filePath),
        veryLargeFile: stats.size > 50 * 1024 * 1024, // 50MB
        verySmallFile: stats.size < 10 * 1024, // 10KB
        commonFormats: ['.jpg', '.jpeg', '.png', '.webp'].includes(extension)
      }

      // Use OpenAI to analyze filename patterns that historically failed
      const filenameRisk = await this.analyzeFilenamePatterns(filePath)
      
      return { ...analysis, filenameRisk }
    } catch (error) {
      throw new Error(`File analysis failed: ${error}`)
    }
  }

  /**
   * Use AI to analyze filename patterns that might indicate problems
   */
  private async analyzeFilenamePatterns(filePath: string): Promise<any> {
    const historicalErrors = await this.getHistoricalErrorsByFilename()
    
    const prompt = `
    Analyze this file path for potential processing risks: "${filePath}"
    
    Historical error patterns:
    ${historicalErrors.map(err => `- ${err.pattern}: ${err.count} failures`).join('\n')}
    
    Look for:
    1. Special characters that might cause issues
    2. Very long filenames
    3. Patterns similar to files that failed before
    4. Non-standard naming conventions
    
    Return a risk assessment with specific concerns.
    `

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    })

    return {
      aiAnalysis: response.choices[0].message.content,
      riskIndicators: this.extractRiskIndicators(response.choices[0].message.content || '')
    }
  }

  /**
   * Assess overall risk factors for processing failure
   */
  private async assessRiskFactors(fileStats: any): Promise<any> {
    const risks = {
      fileSize: this.assessFileSizeRisk(fileStats.size),
      format: this.assessFormatRisk(fileStats.extension),
      filename: this.assessFilenameRisk(fileStats.filename),
      path: this.assessPathRisk(fileStats.path),
      historical: await this.getHistoricalRiskForSimilarFiles(fileStats)
    }

    return risks
  }

  /**
   * Generate ML prediction based on risk assessment
   */
  private async generatePrediction(riskFactors: any): Promise<MLPrediction> {
    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(riskFactors)
    
    // Use AI to generate specific recommendations
    const aiRecommendations = await this.generateAIRecommendations(riskFactors)
    
    return {
      riskLevel: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
      confidence: riskScore,
      predictedErrors: this.predictLikelyErrors(riskFactors),
      recommendations: aiRecommendations,
      shouldProceed: riskScore < 0.8
    }
  }

  /**
   * Log processing error for learning
   */
  async logError(error: Omit<PhotoProcessingError, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const errorRecord: PhotoProcessingError = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      resolved: false,
      ...error
    }

    // Store in Supabase for persistence
    await this.supabase
      .from('photo_processing_errors')
      .insert(errorRecord)

    // Update in-memory patterns for immediate learning
    this.updateErrorPatterns(errorRecord)
    
    // Trigger analysis for similar files
    await this.analyzeErrorPattern(errorRecord)
  }

  /**
   * Log successful processing for learning
   */
  async logSuccess(success: Omit<ProcessingSuccess, 'id' | 'timestamp'>): Promise<void> {
    const successRecord: ProcessingSuccess = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...success
    }

    await this.supabase
      .from('photo_processing_successes')
      .insert(successRecord)

    this.updateSuccessPatterns(successRecord)
  }

  /**
   * Smart retry logic based on error type and historical data
   */
  async shouldRetry(error: PhotoProcessingError, attemptNumber: number): Promise<boolean> {
    const retryConfig = await this.getRetryConfig(error.errorType)
    const historicalSuccess = await this.getRetrySuccessRate(error.errorType)
    
    if (attemptNumber >= retryConfig.maxAttempts) {
      return false
    }

    // Use AI to decide if retry is worthwhile
    const retryDecision = await this.aiRetryDecision(error, attemptNumber, historicalSuccess)
    return retryDecision.shouldRetry
  }

  /**
   * Generate processing recommendations based on ML analysis
   */
  async generateProcessingRecommendations(filePath: string): Promise<string[]> {
    const validation = await this.validateBeforeProcessing(filePath)
    const recommendations = [
      ...validation.recommendations,
      ...(await this.getContextualRecommendations(filePath))
    ]

    return recommendations
  }

  /**
   * Auto-fix common issues based on learned patterns
   */
  async autoFixIssues(filePath: string, errors: PhotoProcessingError[]): Promise<string[]> {
    const fixes: string[] = []
    
    for (const error of errors) {
      const learnedFix = await this.getLearnedFix(error.errorType, error.context)
      if (learnedFix) {
        try {
          await this.applyFix(filePath, learnedFix)
          fixes.push(`Applied fix for ${error.errorType}: ${learnedFix.description}`)
        } catch (fixError) {
          console.error(`Failed to apply fix: ${fixError}`)
        }
      }
    }

    return fixes
  }

  // Private helper methods
  private calculateRiskScore(riskFactors: any): number {
    // Implement risk scoring algorithm
    let score = 0
    
    if (riskFactors.fileSize.risk > 0.5) score += 0.3
    if (riskFactors.format.risk > 0.5) score += 0.2
    if (riskFactors.filename.risk > 0.5) score += 0.2
    if (riskFactors.historical.risk > 0.5) score += 0.3
    
    return Math.min(score, 1.0)
  }

  private extractRiskIndicators(aiAnalysis: string): string[] {
    // Extract specific risk indicators from AI analysis
    const indicators: string[] = []
    
    if (aiAnalysis.includes('special characters')) indicators.push('special_characters')
    if (aiAnalysis.includes('long filename')) indicators.push('long_filename')
    if (aiAnalysis.includes('similar to failed')) indicators.push('similar_to_failed')
    
    return indicators
  }

  private predictLikelyErrors(riskFactors: any): string[] {
    const predictions: string[] = []
    
    if (riskFactors.fileSize.veryLarge) predictions.push('processing_timeout')
    if (riskFactors.format.uncommon) predictions.push('format_unsupported')
    if (riskFactors.filename.specialChars) predictions.push('file_access_error')
    
    return predictions
  }

  private async generateAIRecommendations(riskFactors: any): Promise<string[]> {
    const prompt = `
    Based on these risk factors for photo processing:
    ${JSON.stringify(riskFactors, null, 2)}
    
    Generate specific, actionable recommendations to prevent processing failures.
    Focus on practical steps that can be automated or easily implemented.
    `

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    })

    return response.choices[0].message.content?.split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map(line => line.replace(/^[-•]\s*/, '').trim()) || []
  }

  private async loadHistoricalData(): Promise<void> {
    // Load error and success patterns from Supabase
    const { data: errors } = await this.supabase
      .from('photo_processing_errors')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000)

    const { data: successes } = await this.supabase
      .from('photo_processing_successes')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000)

    // Build pattern maps
    errors?.forEach(error => this.updateErrorPatterns(error))
    successes?.forEach(success => this.updateSuccessPatterns(success))
  }

  private updateErrorPatterns(error: PhotoProcessingError): void {
    const pattern = `${error.errorType}_${error.processingStep}`
    this.errorPatterns.set(pattern, (this.errorPatterns.get(pattern) || 0) + 1)
  }

  private updateSuccessPatterns(success: ProcessingSuccess): void {
    const pattern = `${success.fileFormat}_${success.fileSize}_success`
    this.successPatterns.set(pattern, (this.successPatterns.get(pattern) || 0) + 1)
  }

  // Additional helper methods for specific assessments
  private assessFileSizeRisk(size: number): any {
    return {
      risk: size > 50 * 1024 * 1024 ? 0.8 : size < 10 * 1024 ? 0.6 : 0.1,
      veryLarge: size > 50 * 1024 * 1024,
      verySmall: size < 10 * 1024,
      optimal: size >= 1024 * 1024 && size <= 10 * 1024 * 1024
    }
  }

  private assessFormatRisk(extension: string): any {
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp']
    return {
      risk: supportedFormats.includes(extension) ? 0.1 : 0.9,
      supported: supportedFormats.includes(extension),
      uncommon: !['.jpg', '.jpeg', '.png'].includes(extension)
    }
  }

  private assessFilenameRisk(filename: string): any {
    return {
      risk: /[^\w\s\-.]/.test(filename) ? 0.7 : filename.length > 100 ? 0.5 : 0.1,
      specialChars: /[^\w\s\-.]/.test(filename),
      tooLong: filename.length > 100,
      hasSpaces: filename.includes(' ')
    }
  }

  private assessPathRisk(filePath: string): any {
    return {
      risk: filePath.length > 260 ? 0.8 : 0.1,
      tooLong: filePath.length > 260,
      deepNesting: filePath.split('/').length > 10
    }
  }

  private async getHistoricalRiskForSimilarFiles(fileStats: any): Promise<any> {
    // Query similar files from history
    const { data: similarErrors } = await this.supabase
      .from('photo_processing_errors')
      .select('*')
      .ilike('filePath', `%${fileStats.extension}`)
      .limit(50)

    const { data: similarSuccesses } = await this.supabase
      .from('photo_processing_successes')
      .select('*')
      .eq('fileFormat', fileStats.extension)
      .limit(50)

    const totalSimilar = (similarErrors?.length || 0) + (similarSuccesses?.length || 0)
    const errorRate = totalSimilar > 0 ? (similarErrors?.length || 0) / totalSimilar : 0

    return {
      risk: errorRate,
      errorRate,
      totalSimilar,
      errorCount: similarErrors?.length || 0,
      successCount: similarSuccesses?.length || 0
    }
  }

  private async getHistoricalErrorsByFilename(): Promise<any[]> {
    const { data: errors } = await this.supabase
      .from('photo_processing_errors')
      .select('filePath, errorType')
      .order('timestamp', { ascending: false })
      .limit(200)

    const patterns = new Map<string, number>()
    errors?.forEach(error => {
      const filename = path.basename(error.filePath)
      const pattern = this.extractFilenamePattern(filename)
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1)
    })

    return Array.from(patterns.entries()).map(([pattern, count]) => ({ pattern, count }))
  }

  private extractFilenamePattern(filename: string): string {
    // Extract meaningful patterns from filename
    if (/IMG_\d+/.test(filename)) return 'IMG_numbers'
    if (/DSC\d+/.test(filename)) return 'DSC_numbers' 
    if (/\d{8}_\d{6}/.test(filename)) return 'timestamp_format'
    if (/[^\w\s\-.]/.test(filename)) return 'special_characters'
    return 'standard_format'
  }

  private async logPrediction(filePath: string, prediction: MLPrediction): Promise<void> {
    await this.supabase
      .from('photo_processing_predictions')
      .insert({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        filePath,
        prediction: JSON.stringify(prediction)
      })
  }

  private async getRetryConfig(errorType: string): Promise<any> {
    const configs = {
      'file_corruption': { maxAttempts: 1 },
      'size_invalid': { maxAttempts: 2 },
      'format_unsupported': { maxAttempts: 1 },
      'metadata_missing': { maxAttempts: 3 },
      'processing_failed': { maxAttempts: 3 },
      'upload_failed': { maxAttempts: 5 }
    }
    return configs[errorType as keyof typeof configs] || { maxAttempts: 2 }
  }

  private async getRetrySuccessRate(errorType: string): Promise<number> {
    // Calculate historical retry success rate for this error type
    const { data: retries } = await this.supabase
      .from('photo_processing_retries')
      .select('*')
      .eq('errorType', errorType)
      .limit(100)

    if (!retries || retries.length === 0) return 0.5 // Default assumption

    const successful = retries.filter(retry => retry.successful).length
    return successful / retries.length
  }

  private async aiRetryDecision(error: PhotoProcessingError, attemptNumber: number, historicalSuccess: number): Promise<any> {
    const prompt = `
    Should we retry processing this file?
    
    Error: ${error.errorType}
    Message: ${error.errorMessage}
    Attempt: ${attemptNumber}
    Historical success rate for retries: ${historicalSuccess * 100}%
    Processing step: ${error.processingStep}
    
    Consider:
    1. Error type and likelihood of success on retry
    2. Resource cost vs potential benefit
    3. Historical patterns
    
    Respond with JSON: {"shouldRetry": boolean, "reasoning": string, "waitTimeMs": number}
    `

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    })

    try {
      return JSON.parse(response.choices[0].message.content || '{"shouldRetry": false}')
    } catch {
      return { shouldRetry: false, reasoning: "Failed to parse AI response" }
    }
  }

  private async getContextualRecommendations(filePath: string): Promise<string[]> {
    // Generate recommendations based on file context and historical data
    const fileStats = await this.analyzeFile(filePath)
    const recommendations: string[] = []

    if (fileStats.size > 20 * 1024 * 1024) {
      recommendations.push("Consider pre-compressing large files before processing")
    }

    if (fileStats.suspiciousChars) {
      recommendations.push("Rename file to remove special characters")
    }

    return recommendations
  }

  private async getLearnedFix(errorType: string, context: any): Promise<any | null> {
    // Query successful fixes for this error type from history
    const { data: fixes } = await this.supabase
      .from('photo_processing_fixes')
      .select('*')
      .eq('errorType', errorType)
      .eq('successful', true)
      .limit(5)

    return fixes && fixes.length > 0 ? fixes[0] : null
  }

  private async applyFix(filePath: string, fix: any): Promise<void> {
    // Apply the learned fix based on fix type
    switch (fix.fixType) {
      case 'rename_file':
        // Implement file renaming logic
        break
      case 'resize_image':
        // Implement image resizing logic
        break
      case 'convert_format':
        // Implement format conversion logic
        break
      default:
        throw new Error(`Unknown fix type: ${fix.fixType}`)
    }
  }

  private async analyzeErrorPattern(error: PhotoProcessingError): Promise<void> {
    // Use AI to analyze if this error represents a new pattern
    const similarErrors = await this.supabase
      .from('photo_processing_errors')
      .select('*')
      .eq('errorType', error.errorType)
      .limit(10)

    if (similarErrors.data && similarErrors.data.length >= 3) {
      // Pattern emerging - generate insights
      await this.generatePatternInsights(error.errorType, similarErrors.data)
    }
  }

  private async generatePatternInsights(errorType: string, errors: PhotoProcessingError[]): Promise<void> {
    const prompt = `
    Analyze these ${errorType} errors to identify patterns and generate prevention strategies:
    
    ${errors.map(err => `- File: ${err.filePath}, Step: ${err.processingStep}, Message: ${err.errorMessage}`).join('\n')}
    
    What patterns do you see? What prevention strategies would help?
    `

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    })

    // Store insights for future use
    await this.supabase
      .from('photo_processing_insights')
      .insert({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        errorType,
        insights: response.choices[0].message.content,
        errorCount: errors.length
      })
  }
}

// Export singleton instance
export const photoProcessingML = new PhotoProcessingML()