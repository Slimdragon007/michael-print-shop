// Data bridge to connect with your existing Hostinger website

export interface HostingerProduct {
  id: number
  title: string
  location: string
  category: string
  price: number
  description: string
  imageUrl: string
  sizes: Record<string, number>
  bestseller?: boolean
  limited?: boolean
  tags: string[]
}

export class HostingerAPI {
  private baseUrl = 'https://prints.michaelhaslimphoto.com'
  
  async scrapeProducts(): Promise<HostingerProduct[]> {
    try {
      // For now, always use mock data during build and development
      console.log('🔧 Using mock Hawaii data for stable build')
      return this.getMockHawaiiProducts()

      // Check if we're in development - CORS will block this
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('🔧 Development mode: Skipping Hostinger fetch due to CORS. Using mock Hawaii data instead.')
        return this.getMockHawaiiProducts()
      }

      const response = await fetch(this.baseUrl, {
        mode: 'cors',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const html = await response.text()
      
      // Extract the products array from the JavaScript
      const productMatch = html.match(/const products = (\[[\s\S]*?\]);/)
      if (!productMatch) {
        console.warn('Could not find products array in Hostinger site, using mock data')
        return this.getMockHawaiiProducts()
      }
      
      // Safely evaluate the products array
      const productsString = productMatch[1]
      const products = this.parseProductsArray(productsString)
      
      return products
    } catch (error) {
      console.warn('Failed to fetch Hostinger products (this is normal in development):', error.message)
      return this.getMockHawaiiProducts()
    }
  }

  // Mock Hawaii products for development
  private getMockHawaiiProducts(): HostingerProduct[] {
    return [
      {
        id: 101,
        title: "Maui Rainbow Spectacular",
        location: "maui",
        category: "landscape",
        price: 65,
        description: "A breathtaking rainbow arcs over Maui's volcanic landscape",
        imageUrl: "https://prints.michaelhaslimphoto.com/images/maui-rainbow.jpg",
        sizes: { "8x10": 65, "11x14": 85, "16x20": 125 },
        bestseller: true,
        limited: false,
        tags: ["rainbow", "landscape", "maui", "hawaii"]
      },
      {
        id: 102,
        title: "Hawaiian Sunset Paradise",
        location: "hawaii",
        category: "seascape",
        price: 70,
        description: "Golden hour over the Pacific Ocean from Hawaiian shores",
        imageUrl: "https://prints.michaelhaslimphoto.com/images/hawaii-sunset.jpg",
        sizes: { "8x10": 70, "11x14": 90, "16x20": 130 },
        bestseller: true,
        limited: false,
        tags: ["sunset", "hawaii", "pacific", "golden hour"]
      },
      {
        id: 103,
        title: "Volcanic Landscapes",
        location: "bigisland",
        category: "landscape",
        price: 75,
        description: "Dramatic volcanic formations on the Big Island",
        imageUrl: "https://prints.michaelhaslimphoto.com/images/volcano.jpg",
        sizes: { "8x10": 75, "11x14": 95, "16x20": 135 },
        bestseller: false,
        limited: false,
        tags: ["volcano", "bigisland", "hawaii", "landscape"]
      }
    ]
  }
  
  private parseProductsArray(productsString: string): HostingerProduct[] {
    try {
      // If parsing fails, just return mock data for now
      if (!productsString || productsString.trim().length === 0) {
        console.log('Empty products string, using mock data')
        return this.getMockHawaiiProducts()
      }
      
      // Clean up the string and parse as JSON
      const cleanedString = productsString
        .replace(/(\w+):/g, '"$1":') // Add quotes to keys
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/,\s*}/g, '}') // Remove trailing commas
        .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
      
      return JSON.parse(cleanedString)
    } catch (error) {
      console.error('Failed to parse products array:', error)
      console.log('Using mock Hawaii products instead')
      return this.getMockHawaiiProducts()
    }
  }
  
  // Convert Hostinger products to our Product format
  convertToLocalFormat(hostingerProducts: HostingerProduct[]) {
    return hostingerProducts.map(product => ({
      id: product.id.toString(),
      title: product.title,
      description: product.description,
      category: {
        id: product.category,
        name: this.capitalize(product.category),
        slug: product.category,
        description: `${this.capitalize(product.category)} photography`,
        created_at: new Date().toISOString()
      },
      image_url: product.imageUrl.startsWith('http') 
        ? product.imageUrl 
        : `${this.baseUrl}/${product.imageUrl}`,
      base_price: product.price,
      tags: product.tags,
      dimensions: { width: 3000, height: 2000 }, // Default dimensions
      print_options: this.createPrintOptions(product.sizes),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true
    }))
  }
  
  private createPrintOptions(sizes: Record<string, number>) {
    return Object.entries(sizes).map(([size, price], index) => ({
      id: (index + 1).toString(),
      material: 'fine-art-paper' as const,
      size: size,
      price_modifier: price - Object.values(sizes)[0], // Price difference from base
      description: `${size} fine art print`
    }))
  }
  
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  
  // Create a hybrid product list combining Hostinger + Etsy photos
  async createHybridProductList(etsyProducts: any[]): Promise<any[]> {
    const hostingerProducts = await this.scrapeProducts()
    const convertedHostingerProducts = this.convertToLocalFormat(hostingerProducts)
    
    // Combine both sets, giving each unique IDs
    const hybridProducts = [
      ...etsyProducts,
      ...convertedHostingerProducts.map(product => ({
        ...product,
        id: `h_${product.id}`, // Prefix Hostinger products with 'h_'
        tags: [...product.tags, 'hostinger', 'hawaii'] // Add identifying tags
      }))
    ]
    
    return hybridProducts
  }
}

// Singleton instance
export const hostingerAPI = new HostingerAPI()