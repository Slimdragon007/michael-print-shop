// Simple test to verify ML system can connect
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

async function testConnection() {
  console.log('🧪 Testing ML System Setup')
  console.log('==========================')

  // Check environment variables
  console.log('📋 Checking environment variables...')
  const requiredEnvs = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  for (const env of requiredEnvs) {
    if (process.env[env]) {
      console.log(`✅ ${env}: ${process.env[env].substring(0, 20)}...`)
    } else {
      console.log(`❌ ${env}: Missing`)
      return
    }
  }

  // Test Supabase connection
  try {
    console.log('\n🔌 Testing Supabase connection...')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Test basic connection
    const { data, error } = await supabase
      .from('products') // Your existing table
      .select('count', { count: 'exact', head: true })

    if (error) {
      console.log('❌ Supabase connection failed:', error.message)
    } else {
      console.log('✅ Supabase connection successful')
      console.log(`📊 Found ${data} products in database`)
    }

  } catch (error) {
    console.log('❌ Connection test failed:', error.message)
  }

  console.log('\n📋 Next Steps:')
  console.log('1. Copy the SQL from lib/ml/ml-schema.sql')
  console.log('2. Go to your Supabase dashboard SQL Editor')
  console.log('3. Paste and run the SQL to create ML tables')
  console.log('4. Then run: npm run smart:batch:dry')
}

testConnection().catch(console.error)