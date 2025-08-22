import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface PhotoData {
  id: string
  title: string
  description: string
  category: string
  location: string
  image_url: string
  thumbnail_url: string
  base_price: number
  display_order: number
  is_featured: boolean
  is_published: boolean
  tags: string[]
  sku: string
}

// Photo mapping based on your file names
const photoMappings: Record<string, Partial<PhotoData>> = {
  'MGGDN2_Golden Gate Night Print 2x3.jpg': {
    title: 'Golden Gate Bridge at Night',
    description: 'Stunning nighttime view of the iconic Golden Gate Bridge in San Francisco, California',
    category: 'Architecture',
    location: 'San Francisco, CA',
    base_price: 45.00,
    tags: ['golden gate', 'san francisco', 'bridge', 'night', 'architecture', 'california'],
    is_featured: true
  },
  'BSOCFA1_Big Sur Ocean Cliff From Above 1_3x2.jpg': {
    title: 'Big Sur Ocean Cliff Aerial View',
    description: 'Breathtaking aerial perspective of Big Sur\'s dramatic coastline and ocean cliffs',
    category: 'Landscape',
    location: 'Big Sur, CA',
    base_price: 40.00,
    tags: ['big sur', 'ocean', 'cliff', 'aerial', 'coastline', 'california'],
    is_featured: true
  },
  'GGRFST1_Gray gravel road flagstaff summertime_4x3.jpg': {
    title: 'Flagstaff Mountain Road',
    description: 'Scenic gravel road winding through the beautiful Flagstaff mountains in summer',
    category: 'Landscape',
    location: 'Flagstaff, AZ',
    base_price: 35.00,
    tags: ['flagstaff', 'road', 'mountains', 'summer', 'arizona', 'landscape']
  },
  'MAPGY1_Airplane Graveyard 1 Print_3x2.jpg': {
    title: 'Airplane Graveyard',
    description: 'Fascinating view of retired aircraft in the famous airplane graveyard',
    category: 'Industrial',
    location: 'Arizona',
    base_price: 38.00,
    tags: ['airplane', 'graveyard', 'aviation', 'industrial', 'retired', 'aircraft']
  },
  'MBBBSCA1_Bixby Bridge, Big Sur, CA Print File 1.jpg': {
    title: 'Bixby Creek Bridge',
    description: 'Iconic Bixby Creek Bridge spanning the rugged Big Sur coastline',
    category: 'Architecture',
    location: 'Big Sur, CA',
    base_price: 42.00,
    tags: ['bixby bridge', 'big sur', 'bridge', 'coastline', 'architecture', 'california'],
    is_featured: true
  },
  'MBBBSCA2_Bixby Bridge, Big Sur, CA 2 Print File.jpg': {
    title: 'Bixby Creek Bridge Sunset',
    description: 'Beautiful sunset view of the famous Bixby Creek Bridge in Big Sur',
    category: 'Architecture',
    location: 'Big Sur, CA',
    base_price: 42.00,
    tags: ['bixby bridge', 'big sur', 'sunset', 'bridge', 'architecture', 'california']
  },
  'MFBESF1_Flagstaff Black Eye Susan Field 1 4x3.jpg': {
    title: 'Black-Eyed Susan Field',
    description: 'Vibrant field of Black-Eyed Susan flowers blooming in Flagstaff',
    category: 'Nature',
    location: 'Flagstaff, AZ',
    base_price: 32.00,
    tags: ['flowers', 'field', 'flagstaff', 'wildflowers', 'nature', 'arizona']
  },
  'MJTBS1_JoshuaTree Print File.jpg': {
    title: 'Joshua Tree Landscape',
    description: 'Classic Joshua Tree silhouette against the desert landscape',
    category: 'Landscape',
    location: 'Joshua Tree, CA',
    base_price: 36.00,
    tags: ['joshua tree', 'desert', 'landscape', 'california', 'southwest']
  },
  'MLACMA1_LA Lights Print File.jpg': {
    title: 'Los Angeles City Lights',
    description: 'Dazzling cityscape of Los Angeles illuminated at night',
    category: 'Urban',
    location: 'Los Angeles, CA',
    base_price: 40.00,
    tags: ['los angeles', 'city lights', 'cityscape', 'night', 'urban', 'california']
  },
  'MMFBSCA1_McWay Falls Big Sur 1 Print File 3x2.jpg': {
    title: 'McWay Falls',
    description: 'Spectacular McWay Falls cascading onto the pristine Big Sur beach',
    category: 'Landscape',
    location: 'Big Sur, CA',
    base_price: 44.00,
    tags: ['mcway falls', 'waterfall', 'big sur', 'beach', 'landscape', 'california'],
    is_featured: true
  }
}

async function importPhotos() {
  console.log('Starting photo import...')
  
  const photosDir = '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/public/images/products'
  const files = fs.readdirSync(photosDir).filter(file => file.endsWith('.jpg'))
  
  let importCount = 0
  
  for (const file of files) {
    const mapping = photoMappings[file]
    if (!mapping) {
      console.log(`⚠️ No mapping found for ${file}, skipping...`)
      continue
    }
    
    const sku = file.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()
    const imageUrl = `/images/products/${file}`
    const thumbnailUrl = imageUrl // For now, using same image
    
    const photoData: PhotoData = {
      id: crypto.randomUUID(),
      title: mapping.title!,
      description: mapping.description!,
      category: mapping.category!,
      location: mapping.location!,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      base_price: mapping.base_price!,
      display_order: importCount + 1,
      is_featured: mapping.is_featured || false,
      is_published: true,
      tags: mapping.tags!,
      sku: sku
    }
    
    try {
      const { error } = await supabase
        .from('products')
        .insert([photoData])
      
      if (error) {
        console.error(`❌ Error inserting ${file}:`, error)
      } else {
        console.log(`✅ Imported: ${photoData.title}`)
        importCount++
      }
    } catch (err) {
      console.error(`❌ Failed to import ${file}:`, err)
    }
  }
  
  console.log(`\n🎉 Import complete! Successfully imported ${importCount} photos.`)
}

// Run the import
importPhotos().catch(console.error)