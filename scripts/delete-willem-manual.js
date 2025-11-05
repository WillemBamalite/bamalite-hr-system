const { createClient } = require('@supabase/supabase-js')

// VERVANG DEZE WAARDEN MET JE ECHTE SUPABASE CREDENTIALS
const supabaseUrl = 'https://your-project-id.supabase.co'  // Vervang met je echte URL
const supabaseKey = 'your-anon-key-here'  // Vervang met je echte anon key

const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteWillem() {
  try {
    console.log('🔍 Looking for Willem van der Bent...')
    
    // Zoek naar Willem
    const { data: willem, error: searchError } = await supabase
      .from('crew')
      .select('*')
      .or('first_name.ilike.%willem%,last_name.ilike.%van der bent%')

    if (searchError) {
      console.error('❌ Error searching:', searchError)
      return
    }

    if (willem && willem.length > 0) {
      console.log(`🚨 Found ${willem.length} crew member(s):`)
      willem.forEach((member, index) => {
        console.log(`${index + 1}. ${member.first_name} ${member.last_name} (ID: ${member.id})`)
      })

      // Verwijder alle matches
      console.log('\n🗑️ Deleting...')
      const { error: deleteError } = await supabase
        .from('crew')
        .delete()
        .or('first_name.ilike.%willem%,last_name.ilike.%van der bent%')

      if (deleteError) {
        console.error('❌ Error deleting:', deleteError)
      } else {
        console.log('✅ Willem van der Bent deleted successfully!')
      }
    } else {
      console.log('✅ Willem van der Bent not found')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

deleteWillem()
