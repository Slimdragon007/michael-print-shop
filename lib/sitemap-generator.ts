// Sitemap generator for print shop e-commerce site
import { getAllMockProducts } from './mock-products'
import { hostingerAPI } from './hostinger-api'
import { dropsManager } from './drops-system'

export interface SitemapUrl {
  url: string
  lastModified: string
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export class SitemapGenerator {
  private baseUrl = 'https://prints.michaelhaslimphoto.com'
  
  async generateSitemap(): Promise<string> {
    const urls = await this.getAllUrls()
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => this.formatUrl(url)).join('\n')}
</urlset>`
    
    return xml
  }
  
  private async getAllUrls(): Promise<SitemapUrl[]> {
    const urls: SitemapUrl[] = []
    const now = new Date().toISOString()
    
    // Static pages
    urls.push({
      url: `${this.baseUrl}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0
    })
    
    urls.push({
      url: `${this.baseUrl}/products`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9
    })
    
    urls.push({
      url: `${this.baseUrl}/cart`,
      lastModified: now,
      changeFrequency: 'always',
      priority: 0.3
    })
    
    urls.push({
      url: `${this.baseUrl}/checkout`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3
    })
    
    // Product pages
    const products = await this.getHybridProducts()
    products.forEach(product => {
      urls.push({
        url: `${this.baseUrl}/products/${product.id}`,
        lastModified: product.updated_at || now,
        changeFrequency: 'weekly',
        priority: 0.8
      })
    })
    
    // Collection/Drop pages
    const drops = dropsManager.getDrops()
    drops.forEach(drop => {
      if (drop.status === 'live' || drop.status === 'scheduled') {
        urls.push({
          url: `${this.baseUrl}/collections/${drop.slug || this.slugify(drop.name)}`,
          lastModified: drop.updated_at || now,
          changeFrequency: 'weekly',
          priority: 0.7
        })
      }
    })
    
    // Category pages
    const categories = this.getUniqueCategories(products)
    categories.forEach(category => {
      urls.push({
        url: `${this.baseUrl}/products?category=${category.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6
      })
    })
    
    // Location-based pages
    const locations = this.getUniqueLocations(products)
    locations.forEach(location => {
      urls.push({
        url: `${this.baseUrl}/products?location=${this.slugify(location)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5
      })
    })
    
    // Material filter pages
    const materials = ['metal', 'canvas', 'fine-art-paper']
    materials.forEach(material => {
      urls.push({
        url: `${this.baseUrl}/products?material=${material}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5
      })
    })
    
    return urls
  }
  
  private async getHybridProducts() {
    try {
      const etsyProducts = getAllMockProducts()
      const hybridProducts = await hostingerAPI.createHybridProductList(etsyProducts)
      return hybridProducts
    } catch (error) {
      console.warn('Using fallback products for sitemap:', error)
      return getAllMockProducts()
    }
  }
  
  private getUniqueCategories(products: any[]) {
    const categories = new Map()
    
    products.forEach(product => {
      const category = typeof product.category === 'string' 
        ? { name: product.category, slug: this.slugify(product.category) }
        : product.category
      
      if (!categories.has(category.slug)) {
        categories.set(category.slug, category)
      }
    })
    
    return Array.from(categories.values())
  }
  
  private getUniqueLocations(products: any[]) {
    const locations = new Set<string>()
    
    products.forEach(product => {
      product.tags?.forEach((tag: string) => {
        if (tag.includes('california') || tag.includes('hawaii') || tag.includes('arizona') || 
            tag.includes('maui') || tag.includes('bigisland') || tag.includes('big sur')) {
          locations.add(tag)
        }
      })
    })
    
    return Array.from(locations)
  }
  
  private formatUrl(urlData: SitemapUrl): string {
    return `  <url>
    <loc>${urlData.url}</loc>
    <lastmod>${urlData.lastModified}</lastmod>
    <changefreq>${urlData.changeFrequency}</changefreq>
    <priority>${urlData.priority}</priority>
  </url>`
  }
  
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
}

export const sitemapGenerator = new SitemapGenerator()