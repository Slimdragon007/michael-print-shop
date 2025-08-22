import Papa from 'papaparse'
import { CSVImportData, Product, Category, PrintOption } from '@/types'
import { ProductService, CategoryService, PrintOptionService } from '@/lib/database/products'
import OpenAI from 'openai'
import { slugify, extractTagsFromText } from '@/lib/utils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ImportResult {
  success: boolean
  imported: number
  errors: Array<{
    row: number
    error: string
    data: any
  }>
  message: string
}

export interface ImportOptions {
  generateDescriptions?: boolean
  generateTags?: boolean
  createCategories?: boolean
  defaultCategory?: string
}

export class CSVImporter {
  private productService: ProductService
  private categoryService: CategoryService
  private printOptionService: PrintOptionService

  constructor() {
    this.productService = new ProductService(true)
    this.categoryService = new CategoryService(true)
    this.printOptionService = new PrintOptionService(true)
  }

  async parseCSV(file: File): Promise<CSVImportData[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          // Normalize headers
          return header.toLowerCase().replace(/[\s-]/g, '_')
        },
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`))
          } else {
            resolve(results.data as CSVImportData[])
          }
        },
        error: (error) => {
          reject(error)
        },
      })
    })
  }

  async importProducts(
    data: CSVImportData[],
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const errors: Array<{ row: number; error: string; data: any }> = []
    let imported = 0

    // Get existing categories
    const existingCategories = await this.categoryService.getCategories()
    const categoryMap = new Map(existingCategories.map(cat => [cat.name.toLowerCase(), cat]))

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNumber = i + 2 // Account for header row

      try {
        await this.importSingleProduct(row, options, categoryMap)
        imported++
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        })
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
      message: `Imported ${imported} products successfully${
        errors.length > 0 ? ` with ${errors.length} errors` : ''
      }`,
    }
  }

  private async importSingleProduct(
    row: CSVImportData,
    options: ImportOptions,
    categoryMap: Map<string, Category>
  ): Promise<void> {
    // Validate required fields
    if (!row.title?.trim()) {
      throw new Error('Title is required')
    }
    if (!row.image_url?.trim()) {
      throw new Error('Image URL is required')
    }
    if (!row.base_price) {
      throw new Error('Base price is required')
    }

    // Parse and validate price
    const basePrice = typeof row.base_price === 'string' 
      ? parseFloat(row.base_price.replace(/[$,]/g, ''))
      : row.base_price

    if (isNaN(basePrice) || basePrice <= 0) {
      throw new Error('Invalid base price')
    }

    // Parse dimensions
    const width = typeof row.width === 'string' ? parseFloat(row.width) : row.width
    const height = typeof row.height === 'string' ? parseFloat(row.height) : row.height

    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error('Valid width and height are required')
    }

    // Handle category
    let category: Category
    const categoryName = row.category?.trim() || options.defaultCategory || 'Uncategorized'
    
    const existingCategory = categoryMap.get(categoryName.toLowerCase())
    if (existingCategory) {
      category = existingCategory
    } else if (options.createCategories) {
      const categoryResult = await this.categoryService.createCategory({
        name: categoryName,
        slug: slugify(categoryName),
        description: `Auto-created category for ${categoryName}`,
      })

      if (!categoryResult.success || !categoryResult.data) {
        throw new Error(`Failed to create category: ${categoryName}`)
      }

      category = categoryResult.data
      categoryMap.set(categoryName.toLowerCase(), category)
    } else {
      throw new Error(`Category '${categoryName}' does not exist`)
    }

    // Generate description with AI if needed
    let description = row.description?.trim() || ''
    if (options.generateDescriptions && !description) {
      try {
        description = await this.generateDescription(row.title, categoryName)
      } catch (error) {
        console.warn('Failed to generate description:', error)
        description = `Beautiful ${categoryName.toLowerCase()} print of ${row.title}`
      }
    }

    // Extract or generate tags
    let tags: string[] = []
    if (row.tags) {
      tags = typeof row.tags === 'string' 
        ? row.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : []
    } else if (options.generateTags) {
      tags = extractTagsFromText(`${row.title} ${description} ${categoryName}`)
    }

    // Create product
    const productResult = await this.productService.createProduct({
      title: row.title.trim(),
      description,
      image_url: row.image_url.trim(),
      base_price: basePrice,
      category,
      tags,
      dimensions: { width, height },
      print_options: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    })

    if (!productResult.success || !productResult.data) {
      throw new Error('Failed to create product')
    }

    // Create default print options
    await this.createDefaultPrintOptions(productResult.data.id)
  }

  private async generateDescription(title: string, category: string): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a product description writer for a professional photo printing service. Write compelling, concise product descriptions (2-3 sentences) that highlight the quality and appeal of photo prints.',
        },
        {
          role: 'user',
          content: `Write a product description for a ${category} photo print titled "${title}". Focus on the visual appeal and printing quality.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    })

    return completion.choices[0]?.message?.content?.trim() || ''
  }

  private async createDefaultPrintOptions(productId: string): Promise<void> {
    const defaultOptions = [
      { material: 'metal' as const, size: '8x10', priceModifier: 0 },
      { material: 'metal' as const, size: '11x14', priceModifier: 15 },
      { material: 'metal' as const, size: '16x20', priceModifier: 35 },
      { material: 'canvas' as const, size: '8x10', priceModifier: -5 },
      { material: 'canvas' as const, size: '11x14', priceModifier: 10 },
      { material: 'canvas' as const, size: '16x20', priceModifier: 25 },
      { material: 'fine-art-paper' as const, size: '8x10', priceModifier: -10 },
      { material: 'fine-art-paper' as const, size: '11x14', priceModifier: 5 },
      { material: 'fine-art-paper' as const, size: '16x20', priceModifier: 15 },
    ]

    for (const option of defaultOptions) {
      await this.printOptionService.createPrintOption({
        product_id: productId,
        material: option.material,
        size: option.size,
        price_modifier: option.priceModifier,
        is_available: true,
      })
    }
  }

  validateCSVStructure(data: CSVImportData[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!data || data.length === 0) {
      errors.push('CSV file is empty')
      return { valid: false, errors }
    }

    const requiredFields = ['title', 'image_url', 'base_price', 'width', 'height']
    const firstRow = data[0]

    for (const field of requiredFields) {
      if (!(field in firstRow)) {
        errors.push(`Missing required column: ${field}`)
      }
    }

    // Check for common formatting issues
    const sampleRows = data.slice(0, 5)
    for (let i = 0; i < sampleRows.length; i++) {
      const row = sampleRows[i]
      
      if (!row.title?.trim()) {
        errors.push(`Row ${i + 2}: Title is empty`)
      }
      
      if (!row.image_url?.trim()) {
        errors.push(`Row ${i + 2}: Image URL is empty`)
      }
      
      const price = typeof row.base_price === 'string' 
        ? parseFloat(row.base_price.replace(/[$,]/g, ''))
        : row.base_price
      
      if (isNaN(price) || price <= 0) {
        errors.push(`Row ${i + 2}: Invalid base price`)
      }
    }

    return { valid: errors.length === 0, errors }
  }
}