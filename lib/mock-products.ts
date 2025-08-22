// Temporary mock data using the imported photos for testing

const defaultPrintOptions = [
  {
    id: '1',
    material: 'metal' as const,
    size: '8x10',
    price_modifier: 0,
    description: 'Metal print on aluminum substrate'
  }
]

export const mockProducts = [
  {
    id: '1',
    title: 'Golden Gate Bridge at Night',
    description: 'Stunning nighttime view of the iconic Golden Gate Bridge in San Francisco, California',
    category: { id: '1', name: 'Architecture', slug: 'architecture', description: 'Buildings and structures', created_at: '2024-01-01T00:00:00Z' },
    image_url: '/images/products/ MGGDN2_Golden Gate Night Print 2x3.jpg',
    base_price: 45.00,
    tags: ['golden gate', 'san francisco', 'bridge', 'night', 'architecture', 'california'],
    dimensions: { width: 2000, height: 3000 },
    print_options: defaultPrintOptions,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true
  },
  {
    id: '2',
    title: 'Big Sur Ocean Cliff Aerial View',
    description: 'Breathtaking aerial perspective of Big Sur\'s dramatic coastline and ocean cliffs',
    category: { id: '2', name: 'Landscape', slug: 'landscape', description: 'Natural landscapes and scenery', created_at: '2024-01-01T00:00:00Z' },
    image_url: '/images/products/BSOCFA1_Big Sur Ocean Cliff From Above 1_3x2.jpg',
    base_price: 40.00,
    tags: ['big sur', 'ocean', 'cliff', 'aerial', 'coastline', 'california'],
    dimensions: { width: 3000, height: 2000 },
    print_options: defaultPrintOptions,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true
  },
  {
    id: '3',
    title: 'Bixby Creek Bridge',
    description: 'Iconic Bixby Creek Bridge spanning the rugged Big Sur coastline',
    category: { id: '1', name: 'Architecture', slug: 'architecture', description: 'Buildings and structures', created_at: '2024-01-01T00:00:00Z' },
    image_url: '/images/products/MBBBSCA1_Bixby Bridge, Big Sur, CA Print File 1.jpg',
    base_price: 42.00,
    tags: ['bixby bridge', 'big sur', 'bridge', 'coastline', 'architecture', 'california'],
    dimensions: { width: 4326, height: 3222 },
    print_options: defaultPrintOptions,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true
  },
  {
    id: '4',
    title: 'McWay Falls',
    description: 'Spectacular McWay Falls cascading onto the pristine Big Sur beach',
    category: { id: '2', name: 'Landscape', slug: 'landscape', description: 'Natural landscapes and scenery', created_at: '2024-01-01T00:00:00Z' },
    image_url: '/images/products/MMFBSCA1_McWay Falls Big Sur 1 Print File 3x2.jpg',
    base_price: 44.00,
    tags: ['mcway falls', 'waterfall', 'big sur', 'beach', 'landscape', 'california'],
    dimensions: { width: 3000, height: 2000 },
    print_options: defaultPrintOptions,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true
  }
]

export function getMockFeaturedProducts(limit: number = 8) {
  return mockProducts.slice(0, limit)
}

export function getAllMockProducts() {
  return mockProducts
}