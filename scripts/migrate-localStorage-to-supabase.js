/**
 * Migratie script om localStorage data naar Supabase te verplaatsen
 * 
 * Dit script haalt alle data uit localStorage en voegt het toe aan Supabase
 */

// Supabase configuratie
const SUPABASE_URL = 'https://ocwraavhrtpvbqlkwnlb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04'

async function migrateData() {
  console.log('🚀 Starting localStorage to Supabase migration...')
  
  // 1. Migreer crew members
  const crewDatabase = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
  const crewMembers = Object.values(crewDatabase)
  
  console.log(`📋 Found ${crewMembers.length} crew members in localStorage`)
  
  for (const crew of crewMembers) {
    try {
      const crewData = {
        id: crew.id,
        first_name: crew.firstName || crew.first_name || '',
        last_name: crew.lastName || crew.last_name || '',
        nationality: crew.nationality || 'NL',
        position: crew.position || 'Matroos',
        ship_id: crew.shipId || crew.ship_id || null,
        regime: crew.regime || '2/2',
        status: crew.status || 'nog-in-te-delen',
        on_board_since: crew.onBoardSince || crew.on_board_since || null,
        thuis_sinds: crew.thuisSinds || crew.thuis_sinds || null,
        phone: crew.phone || null,
        email: crew.email || null,
        birth_date: crew.birthDate || crew.birth_date || null,
        address: crew.address || null,
        assignment_history: crew.assignmentHistory || crew.assignment_history || [],
        diplomas: crew.diplomas || [],
        notes: Array.isArray(crew.notes) ? crew.notes : (crew.notes ? [String(crew.notes)] : []),
        company: crew.company || null
      }
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/crew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify(crewData)
      })
      
      if (response.ok) {
        console.log(`✅ Migrated crew member: ${crewData.first_name} ${crewData.last_name}`)
      } else {
        console.error(`❌ Failed to migrate crew member: ${crewData.first_name} ${crewData.last_name}`, await response.text())
      }
    } catch (error) {
      console.error(`❌ Error migrating crew member ${crew.firstName}:`, error)
    }
  }
  
  // 2. Migreer schepen
  const ships = JSON.parse(localStorage.getItem('ships') || '[]')
  
  console.log(`🚢 Found ${ships.length} ships in localStorage`)
  
  for (const ship of ships) {
    try {
      const shipData = {
        id: ship.id,
        name: ship.name,
        max_crew: ship.max_crew || 8,
        status: ship.status || 'Operationeel',
        location: ship.location || '',
        route: ship.route || '',
        company: ship.company || null
      }
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/ships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify(shipData)
      })
      
      if (response.ok) {
        console.log(`✅ Migrated ship: ${shipData.name}`)
      } else {
        console.error(`❌ Failed to migrate ship: ${shipData.name}`, await response.text())
      }
    } catch (error) {
      console.error(`❌ Error migrating ship ${ship.name}:`, error)
    }
  }
  
  console.log('🎉 Migration completed!')
  console.log('🔄 Refresh your browser to see the migrated data')
}

// Voer migratie uit
migrateData().catch(console.error)

