const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function addEducationCompletedDate() {
  // Lees .env.local file
  const envPath = path.join(__dirname, '..', '.env.local')
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found')
    return
  }

  const envContent = fs.readFileSync(envPath, 'utf8')
  const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)
  const supabaseKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)

  if (!supabaseUrlMatch || !supabaseKeyMatch) {
    console.error('❌ Supabase credentials not found in .env.local')
    return
  }

  const supabaseUrl = supabaseUrlMatch[1].trim()
  const supabaseKey = supabaseKeyMatch[1].trim()

  console.log('🔧 Adding education_completed_date column to crew table...')

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Voer de SQL uit
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE crew
        ADD COLUMN IF NOT EXISTS education_completed_date DATE;
      `
    })

    if (error) {
      console.error('❌ Error adding column:', error)
      return
    }

    console.log('✅ education_completed_date column added successfully!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

addEducationCompletedDate()
