// Collection Drops Management System - Like fashion releases

export interface Drop {
  id: string
  name: string
  description: string
  version: string // v1, v2, v3, etc.
  status: 'draft' | 'scheduled' | 'live' | 'archived'
  release_date: string
  end_date?: string
  featured_image: string
  products: string[] // Product IDs in this drop
  theme?: {
    primary_color: string
    secondary_color: string
    banner_image?: string
  }
  created_at: string
  updated_at: string
}

export interface DropSettings {
  auto_archive_after_days?: number
  featured_drop_id?: string
  show_upcoming_drops: boolean
  max_products_per_drop: number
}

export class DropsManager {
  private drops: Drop[] = []
  private settings: DropSettings = {
    show_upcoming_drops: true,
    max_products_per_drop: 20
  }

  constructor() {
    this.loadFromStorage()
  }

  // Create a new collection drop
  createDrop(dropData: Omit<Drop, 'id' | 'created_at' | 'updated_at'>): Drop {
    const drop: Drop = {
      ...dropData,
      id: this.generateDropId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    this.drops.push(drop)
    this.saveToStorage()
    return drop
  }

  // Get all drops with optional filtering
  getDrops(status?: Drop['status']): Drop[] {
    let filteredDrops = [...this.drops]
    
    if (status) {
      filteredDrops = filteredDrops.filter(drop => drop.status === status)
    }
    
    return filteredDrops.sort((a, b) => 
      new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
    )
  }

  // Get current live drop
  getCurrentDrop(): Drop | null {
    const now = new Date().toISOString()
    return this.drops.find(drop => 
      drop.status === 'live' && 
      drop.release_date <= now &&
      (!drop.end_date || drop.end_date > now)
    ) || null
  }

  // Get featured/hero drop for homepage
  getFeaturedDrop(): Drop | null {
    if (this.settings.featured_drop_id) {
      return this.drops.find(d => d.id === this.settings.featured_drop_id) || null
    }
    return this.getCurrentDrop()
  }

  // Schedule a drop for future release
  scheduleDrop(dropId: string, releaseDate: string): void {
    const drop = this.drops.find(d => d.id === dropId)
    if (drop) {
      drop.release_date = releaseDate
      drop.status = 'scheduled'
      drop.updated_at = new Date().toISOString()
      this.saveToStorage()
    }
  }

  // Launch a drop (make it live)
  launchDrop(dropId: string): void {
    // Archive any currently live drops
    this.drops.forEach(drop => {
      if (drop.status === 'live') {
        drop.status = 'archived'
      }
    })

    // Launch the new drop
    const drop = this.drops.find(d => d.id === dropId)
    if (drop) {
      drop.status = 'live'
      drop.release_date = new Date().toISOString()
      drop.updated_at = new Date().toISOString()
      this.saveToStorage()
    }
  }

  // Add products to a drop
  addProductsToDrop(dropId: string, productIds: string[]): void {
    const drop = this.drops.find(d => d.id === dropId)
    if (drop) {
      const maxProducts = this.settings.max_products_per_drop
      const availableSlots = maxProducts - drop.products.length
      const productsToAdd = productIds.slice(0, availableSlots)
      
      drop.products = [...new Set([...drop.products, ...productsToAdd])]
      drop.updated_at = new Date().toISOString()
      this.saveToStorage()
    }
  }

  // Remove products from a drop
  removeProductsFromDrop(dropId: string, productIds: string[]): void {
    const drop = this.drops.find(d => d.id === dropId)
    if (drop) {
      drop.products = drop.products.filter(id => !productIds.includes(id))
      drop.updated_at = new Date().toISOString()
      this.saveToStorage()
    }
  }

  // Get products for a specific drop
  getDropProducts(dropId: string, allProducts: any[]): any[] {
    const drop = this.drops.find(d => d.id === dropId)
    if (!drop) return []
    
    return allProducts.filter(product => drop.products.includes(product.id))
  }

  // Auto-generate next version number
  getNextVersion(): string {
    const versions = this.drops.map(d => d.version).sort()
    const lastVersion = versions[versions.length - 1] || 'v0'
    const versionNumber = parseInt(lastVersion.replace('v', '')) + 1
    return `v${versionNumber}`
  }

  // Create themed collections
  createThemedDrop(theme: 'california' | 'hawaii' | 'southwest' | 'architecture', allProducts: any[]): Drop {
    const themeConfig = {
      california: {
        name: 'California Classics',
        description: 'Iconic landmarks and landscapes from the Golden State',
        primary_color: '#FF6B35',
        secondary_color: '#F7931E',
        tags: ['california', 'golden gate', 'big sur', 'los angeles']
      },
      hawaii: {
        name: 'Hawaiian Paradise',
        description: 'Tropical beauty and volcanic landscapes from the islands',
        primary_color: '#00B4A6',
        secondary_color: '#007991',
        tags: ['hawaii', 'maui', 'sunset', 'pacific']
      },
      southwest: {
        name: 'Desert Southwest',
        description: 'Dramatic landscapes from Arizona and the American Southwest',
        primary_color: '#E55812',
        secondary_color: '#DC2626',
        tags: ['arizona', 'sedona', 'desert', 'flagstaff']
      },
      architecture: {
        name: 'Architectural Wonders',
        description: 'Bridges, buildings, and structural marvels',
        primary_color: '#6366F1',
        secondary_color: '#4F46E5',
        tags: ['bridge', 'architecture', 'urban']
      }
    }

    const config = themeConfig[theme]
    const matchingProducts = allProducts.filter(product => 
      config.tags.some(tag => product.tags.includes(tag))
    )

    return this.createDrop({
      name: config.name,
      description: config.description,
      version: this.getNextVersion(),
      status: 'draft',
      release_date: new Date().toISOString(),
      featured_image: matchingProducts[0]?.image_url || '',
      products: matchingProducts.slice(0, 8).map(p => p.id),
      theme: {
        primary_color: config.primary_color,
        secondary_color: config.secondary_color
      }
    })
  }

  private generateDropId(): string {
    return `drop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('drops_data', JSON.stringify({
        drops: this.drops,
        settings: this.settings
      }))
    }
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('drops_data')
      if (stored) {
        const data = JSON.parse(stored)
        this.drops = data.drops || []
        this.settings = { ...this.settings, ...data.settings }
      }
    }
  }

  updateDrop(dropId: string, updates: Partial<Drop>): void {
    const drop = this.drops.find(d => d.id === dropId)
    if (drop) {
      Object.assign(drop, updates, { updated_at: new Date().toISOString() })
      this.saveToStorage()
    }
  }

  deleteDrop(dropId: string): void {
    this.drops = this.drops.filter(d => d.id !== dropId)
    this.saveToStorage()
  }
}

// Singleton instance
export const dropsManager = new DropsManager()