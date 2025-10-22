const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function cleanupWillem() {
  // Lees .env.local file
  const envPath = path.join(__dirname, '..', '.env.local')
  let envContent = ''
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8')
  } catch (error) {
    console.error('❌ Could not read .env.local file:', error.message)
    return
  }

  // Parse environment variables
  const envVars = {}
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  })

  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in .env.local')
    console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('🔍 Looking for Willem van der Bent in Supabase...')
    
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
      console.log(`🚨 Found ${willem.length} crew member(s) matching Willem van der Bent:`)
      willem.forEach((member, index) => {
        console.log(`${index + 1}. ${member.first_name} ${member.last_name} (ID: ${member.id})`)
      })

      // Verwijder alle matches
      console.log('\n🗑️ Deleting all matches...')
      const { error: deleteError } = await supabase
        .from('crew')
        .delete()
        .or('first_name.ilike.%willem%,last_name.ilike.%van der bent%')

      if (deleteError) {
        console.error('❌ Error deleting:', deleteError)
      } else {
        console.log('✅ Willem van der Bent successfully deleted from Supabase!')
      }
    } else {
      console.log('✅ Willem van der Bent not found in Supabase database')
    }

    // Toon alle crew members
    console.log('\n📋 Current crew members in database:')
    const { data: allCrew, error: allError } = await supabase
      .from('crew')
      .select('id, first_name, last_name, status')
      .order('first_name')

    if (allError) {
      console.error('❌ Error fetching all crew:', allError)
    } else {
      console.log(`Total: ${allCrew.length} crew members`)
      allCrew.forEach((member, index) => {
        console.log(`${index + 1}. ${member.first_name} ${member.last_name} (${member.status})`)
      })
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

cleanupWillem()
