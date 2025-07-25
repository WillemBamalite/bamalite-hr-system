const { createClient } = require('@supabase/supabase-js')

// Vul hier je Supabase URL en Anon Key in (dezelfde als in lib/supabase.ts)
const supabaseUrl = 'https://ocwraavhrtpvbqlkwnlb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test crew data - eerste paar leden
const testCrew = [
  {
    id: "frank-hennekam",
    firstName: "Frank",
    lastName: "Hennekam",
    nationality: "NL",
    position: "Kapitein",
    shipId: "ms-bellona",
    regime: "2/2",
    phone: "",
    email: "frank.hennekam@bamalite.com",
    status: "thuis",
    thuisSinds: "2025-07-16",
    onBoardSince: null,
    birthDate: "1975-03-15",
    address: {
      street: "Hoofdstraat 123",
      city: "Amsterdam",
      postalCode: "1012 AB",
      country: "Nederland",
    },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  },
  {
    id: "yovanni-smith",
    firstName: "Yovanni",
    lastName: "Smith",
    nationality: "NL",
    position: "Stuurman",
    shipId: "ms-bellona",
    regime: "2/2",
    phone: "+31 6 23456789",
    email: "yovanni.smith@bamalite.com",
    status: "thuis",
    thuisSinds: "2025-07-16",
    onBoardSince: null,
    birthDate: "1988-07-22",
    address: {
      street: "Kerkstraat 45",
      city: "Rotterdam",
      postalCode: "3011 BC",
      country: "Nederland",
    },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  }
]

async function pushCrew() {
  console.log('🚀 Start met pushen van crew data naar Supabase...')
  
  for (const member of testCrew) {
    // Zet lege datums om naar null
    const birth_date = member.birthDate || null
    const on_board_since = member.onBoardSince || null
    const thuis_sinds = member.thuisSinds || null
    const ship_id = member.shipId || null
    const address = member.address || null
    const assignment_history = member.assignmentHistory || []
    const diplomas = member.diplomas || []
    const notes = member.notes || []
    
    console.log(`📤 Pushen van ${member.firstName} ${member.lastName}...`)
    
    // Upsert (insert or update) crew member
    const { error } = await supabase
      .from('crew')
      .upsert({
        id: member.id,
        first_name: member.firstName,
        last_name: member.lastName,
        nationality: member.nationality,
        position: member.position,
        ship_id,
        regime: member.regime,
        phone: member.phone || '',
        email: member.email || '',
        status: member.status,
        on_board_since,
        thuis_sinds,
        birth_date,
        address,
        assignment_history,
        diplomas,
        notes
      }, { onConflict: 'id' })
    
    if (error) {
      console.error(`❌ Fout bij upsert van crew ${member.id}:`, error)
    } else {
      console.log(`✅ Crew upsert succesvol: ${member.firstName} ${member.lastName}`)
    }
  }
  console.log('🎉 Test crew data is naar Supabase gepusht!')
}

pushCrew().catch(console.error) 