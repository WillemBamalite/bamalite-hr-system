const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addUitzendbureauFields() {
  try {
    console.log('🔄 Adding uitzendbureau fields to crew table...')
    
    // Add the columns
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE crew 
        ADD COLUMN IF NOT EXISTS is_uitzendbureau BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS uitzendbureau_naam TEXT;
      `
    })
    
    if (alterError) {
      console.error('❌ Error adding columns:', alterError)
      return
    }
    
    console.log('✅ Successfully added uitzendbureau fields to crew table')
    
    // Update existing records
    const { error: updateError } = await supabase
      .from('crew')
      .update({ 
        is_uitzendbureau: false, 
        uitzendbureau_naam: null 
      })
      .is('is_uitzendbureau', null)
    
    if (updateError) {
      console.error('❌ Error updating existing records:', updateError)
      return
    }
    
    console.log('✅ Successfully updated existing crew records')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

addUitzendbureauFields()
