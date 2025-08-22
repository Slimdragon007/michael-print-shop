// Quick test to verify Supabase connection
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://bfdkpjdkeeyxawiicqim.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZGtwamRrZWV5eGF3aWljcWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNDg2MTEsImV4cCI6MjA3MDcyNDYxMX0.WWcNHnMFkr1xmN3ZYZayL4TFFbRofDrg5XV7jRKz8CA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test connection by listing tables
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      if (error.message.includes('relation "categories" does not exist')) {
        console.log('\n📋 You need to run the database setup first!')
        console.log('1. Go to your Supabase dashboard')
        console.log('2. Click SQL Editor → New Query')
        console.log('3. Copy and paste the content from setup-database.sql')
        console.log('4. Click Run')
      }
    } else {
      console.log('✅ Supabase connection successful!')
      console.log('Data:', data)
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

testConnection()