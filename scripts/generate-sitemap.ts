// Script to generate static sitemap.xml for static export build
import { writeFileSync } from 'fs'
import { join } from 'path'

interface SitemapUrl {
  url: string
  lastModified: string
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

function generateSitemap(): string {
  const baseUrl = 'https://prints.michaelhaslimphoto.com'
  const urls: SitemapUrl[] = []
  const now = new Date().toISOString()
  
  // Static pages
  urls.push(
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    }
  )
  
  // Mock product pages (Etsy products)
  const productIds = ['1', '2', '3', '4']
  productIds.forEach((id) => {
    urls.push({
      url: `${baseUrl}/products/${id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  })
  
  // Hawaii products (from Hostinger)
  const hawaiiIds = ['h_101', 'h_102', 'h_103']
  hawaiiIds.forEach((id) => {
    urls.push({
      url: `${baseUrl}/products/${id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  })
  
  // Collection pages
  const collections = [
    'v1-california-classics',
    'v2-hawaii-paradise', 
    'v3-southwest-desert'
  ]
  collections.forEach((collection) => {
    urls.push({
      url: `${baseUrl}/collections/${collection}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  })
  
  // Category filter pages
  const categories = ['architecture', 'landscape', 'seascape', 'urban']
  categories.forEach((category) => {
    urls.push({
      url: `${baseUrl}/products?category=${category}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  })
  
  // Location filter pages
  const locations = ['california', 'hawaii', 'arizona', 'big-sur', 'maui']
  locations.forEach((location) => {
    urls.push({
      url: `${baseUrl}/products?location=${location}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    })
  })
  
  // Material filter pages
  const materials = ['metal', 'canvas', 'fine-art-paper']
  materials.forEach((material) => {
    urls.push({
      url: `${baseUrl}/products?material=${material}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  })
  
  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(formatUrl).join('\n')}
</urlset>`
  
  return xml
}

function formatUrl(urlData: SitemapUrl): string {
  return `  <url>
    <loc>${urlData.url}</loc>
    <lastmod>${urlData.lastModified}</lastmod>
    <changefreq>${urlData.changeFrequency}</changefreq>
    <priority>${urlData.priority}</priority>
  </url>`
}

// Generate and write sitemap
const sitemapContent = generateSitemap()
const outputPath = join(process.cwd(), 'public', 'sitemap.xml')

writeFileSync(outputPath, sitemapContent, 'utf8')
console.log(`✅ Sitemap generated at: ${outputPath}`)
console.log(`📊 Contains ${sitemapContent.split('<url>').length - 1} URLs`)

export { generateSitemap }