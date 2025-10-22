const { createClient } = require('@supabase/supabase-js')

// Supabase configuratie
const supabaseUrl = 'https://your-project.supabase.co' // Vervang met je echte URL
const supabaseKey = 'your-anon-key' // Vervang met je echte key

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCrewData() {
  try {
    console.log('🔍 Checking Supabase crew data...')
    
    // Haal alle crew members op
    const { data: crew, error } = await supabase
      .from('crew')
      .select('*')
      .order('first_name')

    if (error) {
      console.error('❌ Error fetching crew data:', error)
      return
    }

    console.log(`📊 Total crew members in database: ${crew.length}`)
    
    // Zoek naar Willem van der Bent
    const willem = crew.find(member => 
      member.first_name?.toLowerCase().includes('willem') && 
      member.last_name?.toLowerCase().includes('van der bent')
    )
    
    if (willem) {
      console.log('🚨 Found Willem van der Bent in database:')
      console.log('   ID:', willem.id)
      console.log('   Name:', willem.first_name, willem.last_name)
      console.log('   Status:', willem.status)
      console.log('   Created:', willem.created_at)
      
      // Vraag of we hem willen verwijderen
      console.log('\n❓ Do you want to delete this crew member? (y/n)')
      // In een echte implementatie zou je hier een prompt hebben
    } else {
      console.log('✅ Willem van der Bent not found in database')
    }
    
    // Toon alle crew members
    console.log('\n📋 All crew members:')
    crew.forEach((member, index) => {
      console.log(`${index + 1}. ${member.first_name} ${member.last_name} (${member.id})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Functie om Willem te verwijderen
async function deleteWillem() {
  try {
    console.log('🗑️ Deleting Willem van der Bent...')
    
    const { error } = await supabase
      .from('crew')
      .delete()
      .or('first_name.ilike.%willem%,last_name.ilike.%van der bent%')
    
    if (error) {
      console.error('❌ Error deleting:', error)
    } else {
      console.log('✅ Willem van der Bent deleted successfully')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run de check
checkCrewData()
