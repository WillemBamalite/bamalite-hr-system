// Direct database update script
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateDatabase() {
  try {
    console.log('🔄 Adding uitzendbureau fields to crew table...')
    
    // First, let's check if the columns exist
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'crew')
      .in('column_name', ['is_uitzendbureau', 'uitzendbureau_naam'])
    
    if (columnError) {
      console.error('❌ Error checking columns:', columnError)
      return
    }
    
    console.log('📋 Existing columns:', columns?.map(c => c.column_name))
    
    // Add columns if they don't exist
    if (!columns?.find(c => c.column_name === 'is_uitzendbureau')) {
      console.log('➕ Adding is_uitzendbureau column...')
      const { error: alterError1 } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE crew ADD COLUMN is_uitzendbureau BOOLEAN DEFAULT FALSE;'
      })
      
      if (alterError1) {
        console.error('❌ Error adding is_uitzendbureau column:', alterError1)
      } else {
        console.log('✅ Added is_uitzendbureau column')
      }
    }
    
    if (!columns?.find(c => c.column_name === 'uitzendbureau_naam')) {
      console.log('➕ Adding uitzendbureau_naam column...')
      const { error: alterError2 } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE crew ADD COLUMN uitzendbureau_naam TEXT;'
      })
      
      if (alterError2) {
        console.error('❌ Error adding uitzendbureau_naam column:', alterError2)
      } else {
        console.log('✅ Added uitzendbureau_naam column')
      }
    }
    
    // Update existing records
    console.log('🔄 Updating existing records...')
    const { error: updateError } = await supabase
      .from('crew')
      .update({ 
        is_uitzendbureau: false, 
        uitzendbureau_naam: null 
      })
      .is('is_uitzendbureau', null)
    
    if (updateError) {
      console.error('❌ Error updating existing records:', updateError)
    } else {
      console.log('✅ Updated existing crew records')
    }
    
    console.log('🎉 Database update completed!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

updateDatabase()
