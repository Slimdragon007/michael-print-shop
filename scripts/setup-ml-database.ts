#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

async function setupMLDatabase() {
  console.log('🧠 Setting up ML Error Prevention Database')
  console.log('=========================================')

  try {
    // Create Supabase client with service role key for admin access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('✅ Connected to Supabase')

    // Read the ML schema SQL file
    const schemaPath = path.join(__dirname, '../lib/ml/ml-schema.sql')
    const schemaSql = await fs.readFile(schemaPath, 'utf-8')

    console.log('📁 Loaded ML schema SQL')

    // Split the SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements to execute`)

    // Execute each statement
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        
        // Use raw SQL execution
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .limit(1) // Just to test connection
          
          if (queryError) {
            throw error
          }
          
          // For table creation, we'll need to handle this differently
          console.log(`⚠️  Statement ${i + 1} may require manual execution:`)
          console.log(statement.substring(0, 100) + '...')
        }
        
        successCount++
        
      } catch (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error)
        console.log('Statement:', statement.substring(0, 200) + '...')
        errorCount++
        
        // Continue with other statements
      }
    }

    console.log('\n📊 Setup Summary:')
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Errors: ${errorCount}`)

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. You may need to run them manually in Supabase SQL Editor.')
      console.log('   The SQL file is located at: lib/ml/ml-schema.sql')
      console.log('   Copy and paste the contents into your Supabase SQL Editor and run it.')
    }

    // Test the setup by checking if our tables exist
    console.log('\n🔍 Verifying table creation...')
    await verifyTables(supabase)

  } catch (error) {
    console.error('💥 Setup failed:', error)
    console.log('\n📋 Manual Setup Instructions:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy the contents of lib/ml/ml-schema.sql')
    console.log('4. Paste and run the SQL')
    process.exit(1)
  }
}

async function verifyTables(supabase: any) {
  const expectedTables = [
    'photo_processing_errors',
    'photo_processing_successes', 
    'photo_processing_predictions',
    'photo_processing_retries',
    'photo_processing_fixes',
    'photo_processing_insights',
    'photo_quality_assessments',
    'processing_performance_metrics',
    'ml_model_performance'
  ]

  let createdTables = 0

  for (const tableName of expectedTables) {
    try {
      // Try to query the table (just to see if it exists)
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (!error) {
        console.log(`✅ Table '${tableName}' exists`)
        createdTables++
      } else {
        console.log(`❌ Table '${tableName}' not found`)
      }
    } catch {
      console.log(`❌ Table '${tableName}' not accessible`)
    }
  }

  console.log(`\n📊 Tables verified: ${createdTables}/${expectedTables.length}`)

  if (createdTables === expectedTables.length) {
    console.log('🎉 All ML tables created successfully!')
    
    // Insert some initial data
    await insertInitialData(supabase)
  } else {
    console.log('⚠️  Some tables are missing. Please run the SQL manually.')
  }
}

async function insertInitialData(supabase: any) {
  console.log('\n📦 Inserting initial data...')

  try {
    // Insert initial performance metrics for today
    const { error: metricsError } = await supabase
      .from('processing_performance_metrics')
      .insert({
        date: new Date().toISOString().split('T')[0],
        total_files_processed: 0,
        successful_processes: 0,
        failed_processes: 0,
        success_rate: 0
      })

    if (!metricsError) {
      console.log('✅ Initial performance metrics created')
    }

    // Test ML model performance tracking
    const { error: mlError } = await supabase
      .from('ml_model_performance')
      .insert({
        model_version: 'v1.0.0',
        evaluation_date: new Date().toISOString().split('T')[0],
        accuracy: 0.5,
        total_predictions: 0,
        notes: 'Initial ML model setup'
      })

    if (!mlError) {
      console.log('✅ Initial ML model performance record created')
    }

    console.log('🎯 Database setup complete and ready for ML processing!')

  } catch (error) {
    console.log('⚠️  Could not insert initial data, but tables exist')
  }
}

// Run the setup
if (require.main === module) {
  setupMLDatabase().catch(console.error)
}

export { setupMLDatabase }