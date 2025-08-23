import { supabaseAdmin } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']
type PrintOption = Database['public']['Tables']['print_options']['Row']

export interface CartItem {
  product_id: string
  print_option_id?: string
  quantity: number
}

export interface PricingBreakdown {
  subtotal: number
  shipping: number
  tax: number
  total: number
  items: {
    product_id: string
    print_option_id?: string
    quantity: number
    unit_price: number
    line_total: number
    product_title: string
    print_details: string
  }[]
}

export interface ShippingAddress {
  country: string
  state: string
  postalCode: string
}

export class PricingCalculator {
  // Shipping configuration
  private static readonly FREE_SHIPPING_THRESHOLD = 75.00 // Free shipping over $75
  private static readonly DOMESTIC_SHIPPING_RATE = 8.99  // US shipping
  private static readonly INTERNATIONAL_SHIPPING_RATE = 24.99 // International shipping
  
  // Tax rates by state (US only for now)
  private static readonly TAX_RATES: Record<string, number> = {
    'CA': 0.0725, // California
    'NY': 0.08,   // New York
    'TX': 0.0625, // Texas
    'FL': 0.06,   // Florida
    'WA': 0.065,  // Washington
    'OR': 0.0,    // Oregon (no sales tax)
    'NH': 0.0,    // New Hampshire (no sales tax)
    'DE': 0.0,    // Delaware (no sales tax)
    'MT': 0.0,    // Montana (no sales tax)
    'AK': 0.0,    // Alaska (no sales tax)
  }
  
  /**
   * Calculate complete pricing for cart items
   */
  static async calculatePricing(
    items: CartItem[],
    shippingAddress?: ShippingAddress
  ): Promise<PricingBreakdown> {
    if (!items || items.length === 0) {
      return {
        subtotal: 0,
        shipping: 0,
        tax: 0,
        total: 0,
        items: []
      }
    }

    try {
      // Validate and get pricing for all items
      const pricedItems = await this.validateAndPriceItems(items)
      
      // Calculate subtotal
      const subtotal = pricedItems.reduce((sum, item) => sum + item.line_total, 0)
      
      // Calculate shipping
      const shipping = this.calculateShipping(subtotal, shippingAddress)
      
      // Calculate tax
      const tax = this.calculateTax(subtotal, shippingAddress)
      
      // Calculate total
      const total = subtotal + shipping + tax
      
      return {
        subtotal: Math.round(subtotal * 100) / 100,
        shipping: Math.round(shipping * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100,
        items: pricedItems
      }
    } catch (error) {
      console.error('Error calculating pricing:', error)
      throw new Error('Unable to calculate pricing. Please try again.')
    }
  }

  /**
   * Validate cart items and calculate individual item pricing
   */
  private static async validateAndPriceItems(items: CartItem[]) {
    const productIds = [...new Set(items.map(item => item.product_id))]
    const printOptionIds = [...new Set(items.map(item => item.print_option_id).filter(Boolean))]

    // Fetch all products
    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('active', true)

    if (productError) {
      throw new Error('Failed to validate products')
    }

    // Fetch all print options
    let printOptions: PrintOption[] = []
    if (printOptionIds.length > 0) {
      const { data: printOptionsData, error: printOptionsError } = await supabaseAdmin
        .from('print_options')
        .select('*')
        .in('id', printOptionIds)

      if (printOptionsError) {
        throw new Error('Failed to validate print options')
      }
      printOptions = printOptionsData || []
    }

    // Create lookup maps
    const productMap = new Map(products?.map(p => [p.id, p]) || [])
    const printOptionMap = new Map(printOptions.map(po => [po.id, po]))

    // Validate and price each item
    const pricedItems = items.map(item => {
      const product = productMap.get(item.product_id)
      if (!product) {
        throw new Error(`Product not found: ${item.product_id}`)
      }

      let printOption: PrintOption | undefined
      let printDetails = 'Standard Print'
      
      if (item.print_option_id) {
        printOption = printOptionMap.get(item.print_option_id)
        if (!printOption) {
          throw new Error(`Print option not found: ${item.print_option_id}`)
        }
        
        // Verify print option belongs to the product
        if (printOption.product_id !== item.product_id) {
          throw new Error('Invalid print option for product')
        }
        
        printDetails = `${printOption.size} - ${printOption.material}`
      }

      // Calculate unit price
      const basePrice = product.base_price
      const priceModifier = printOption?.price_modifier || 0
      const unitPrice = basePrice + priceModifier

      // Validate quantity
      if (item.quantity < 1 || item.quantity > 100) {
        throw new Error('Invalid quantity')
      }

      // Check stock (if print option has stock tracking)
      if (printOption && printOption.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.title} - ${printDetails}`)
      }

      const lineTotal = unitPrice * item.quantity

      return {
        product_id: item.product_id,
        print_option_id: item.print_option_id,
        quantity: item.quantity,
        unit_price: Math.round(unitPrice * 100) / 100,
        line_total: Math.round(lineTotal * 100) / 100,
        product_title: product.title,
        print_details: printDetails
      }
    })

    return pricedItems
  }

  /**
   * Calculate shipping cost
   */
  private static calculateShipping(subtotal: number, shippingAddress?: ShippingAddress): number {
    // Free shipping over threshold
    if (subtotal >= this.FREE_SHIPPING_THRESHOLD) {
      return 0
    }

    // No address provided - assume domestic
    if (!shippingAddress) {
      return this.DOMESTIC_SHIPPING_RATE
    }

    // International shipping
    if (shippingAddress.country !== 'US') {
      return this.INTERNATIONAL_SHIPPING_RATE
    }

    // Domestic US shipping
    return this.DOMESTIC_SHIPPING_RATE
  }

  /**
   * Calculate tax
   */
  private static calculateTax(subtotal: number, shippingAddress?: ShippingAddress): number {
    // No tax if no address or non-US
    if (!shippingAddress || shippingAddress.country !== 'US') {
      return 0
    }

    // Get tax rate for state
    const taxRate = this.TAX_RATES[shippingAddress.state] || 0

    return subtotal * taxRate
  }

  /**
   * Validate a single item pricing
   */
  static async validateItemPrice(
    productId: string, 
    printOptionId: string | undefined, 
    expectedPrice: number
  ): Promise<boolean> {
    try {
      const item: CartItem = {
        product_id: productId,
        print_option_id: printOptionId,
        quantity: 1
      }

      const pricedItems = await this.validateAndPriceItems([item])
      const actualPrice = pricedItems[0].unit_price

      // Allow for small floating point differences
      const priceDifference = Math.abs(actualPrice - expectedPrice)
      return priceDifference < 0.01
    } catch (error) {
      console.error('Error validating item price:', error)
      return false
    }
  }

  /**
   * Get current product pricing
   */
  static async getProductPricing(productId: string): Promise<{
    base_price: number
    print_options: { id: string; size: string; material: string; price: number }[]
  } | null> {
    try {
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('active', true)
        .single()

      if (productError || !product) {
        return null
      }

      const { data: printOptions, error: printOptionsError } = await supabaseAdmin
        .from('print_options')
        .select('*')
        .eq('product_id', productId)

      if (printOptionsError) {
        throw new Error('Failed to fetch print options')
      }

      return {
        base_price: product.base_price,
        print_options: (printOptions || []).map(po => ({
          id: po.id,
          size: po.size,
          material: po.material,
          price: product.base_price + po.price_modifier
        }))
      }
    } catch (error) {
      console.error('Error getting product pricing:', error)
      return null
    }
  }

  /**
   * Apply discount code (placeholder for future implementation)
   */
  static async applyDiscountCode(
    subtotal: number, 
    code: string
  ): Promise<{ valid: boolean; discount: number; new_subtotal: number }> {
    // TODO: Implement discount code validation and application
    // This would involve checking discount codes in the database
    
    return {
      valid: false,
      discount: 0,
      new_subtotal: subtotal
    }
  }
}