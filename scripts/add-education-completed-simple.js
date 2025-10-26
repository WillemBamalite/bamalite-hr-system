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
    // Probeer een test update om te zien of de kolom bestaat
    const { data: testData, error: testError } = await supabase
      .from('crew')
      .select('education_completed_date')
      .limit(1)

    if (testError && testError.message.includes('column "education_completed_date" does not exist')) {
      console.log('❌ Column education_completed_date does not exist. Please add it manually in Supabase dashboard.')
      console.log('📝 SQL to run in Supabase SQL Editor:')
      console.log('ALTER TABLE crew ADD COLUMN education_completed_date DATE;')
      return
    }

    if (testError) {
      console.error('❌ Error testing column:', testError)
      return
    }

    console.log('✅ education_completed_date column already exists!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

addEducationCompletedDate()
