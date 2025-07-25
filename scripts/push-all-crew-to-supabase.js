const { createClient } = require('@supabase/supabase-js')

// Vul hier je Supabase URL en Anon Key in (dezelfde als in lib/supabase.ts)
const supabaseUrl = 'https://ocwraavhrtpvbqlkwnlb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Volledige crew database - alle 130+ bemanningsleden
const crewDatabase = {
  "frank-hennekam": {
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
    address: { street: "Hoofdstraat 123", city: "Amsterdam", postalCode: "1012 AB", country: "Nederland" },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  },
  "yovanni-smith": {
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
    address: { street: "Kerkstraat 45", city: "Rotterdam", postalCode: "3011 BC", country: "Nederland" },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  },
  "dominik-medulan": {
    id: "dominik-medulan",
    firstName: "Dominik",
    lastName: "Medulan",
    nationality: "CZ",
    position: "Matroos",
    shipId: "ms-bellona",
    regime: "2/2",
    phone: "+420 123 456 789",
    email: "dominik.medulan@bamalite.com",
    status: "thuis",
    thuisSinds: "2025-07-16",
    onBoardSince: null,
    birthDate: "1992-11-08",
    address: { street: "Václavské náměstí 12", city: "Praha", postalCode: "110 00", country: "Tsjechië" },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  },
  "jakub-misar": {
    id: "jakub-misar",
    firstName: "Jakub",
    lastName: "Misar",
    nationality: "CZ",
    position: "Deksman",
    shipId: "ms-bellona",
    regime: "2/2",
    phone: "+420 234 567 890",
    email: "jakub.misar@bamalite.com",
    status: "thuis",
    thuisSinds: "2025-07-16",
    onBoardSince: null,
    birthDate: "1990-05-14",
    address: { street: "Národní 25", city: "Brno", postalCode: "602 00", country: "Tsjechië" },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  },
  "jack-suiker": {
    id: "jack-suiker",
    firstName: "Jack",
    lastName: "Suiker",
    nationality: "NL",
    position: "Matroos",
    shipId: "ms-bellona",
    regime: "2/2",
    phone: "+31 6 34567890",
    email: "jack.suiker@bamalite.com",
    status: "thuis",
    thuisSinds: "2025-07-16",
    onBoardSince: null,
    birthDate: "1985-12-03",
    address: { street: "Prinsengracht 67", city: "Amsterdam", postalCode: "1016 DG", country: "Nederland" },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  },
  "rob-van-etten": {
    id: "rob-van-etten",
    firstName: "Rob",
    lastName: "van Etten",
    nationality: "NL",
    position: "Kapitein",
    shipId: "ms-bellona",
    regime: "2/2",
    phone: "+31 6 45678901",
    email: "rob.vanetten@bamalite.com",
    status: "thuis",
    thuisSinds: "2025-07-16",
    onBoardSince: null,
    birthDate: "1978-09-20",
    address: { street: "Herengracht 89", city: "Amsterdam", postalCode: "1017 BN", country: "Nederland" },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  },
  "alexander-gyori": {
    id: "alexander-gyori",
    firstName: "Alexander",
    lastName: "Gyori",
    nationality: "HU",
    position: "Stuurman",
    shipId: "ms-bellona",
    regime: "2/2",
    phone: "+36 30 123 4567",
    email: "alexander.gyori@bamalite.com",
    status: "thuis",
    thuisSinds: "2025-07-16",
    onBoardSince: null,
    birthDate: "1987-04-12",
    address: { street: "Andrássy út 34", city: "Budapest", postalCode: "1061", country: "Hongarije" },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  },
  "lucien-de-grauw": {
    id: "lucien-de-grauw",
    firstName: "Lucien",
    lastName: "de Grauw",
    nationality: "NL",
    position: "Matroos",
    shipId: "ms-bellona",
    regime: "2/2",
    phone: "+31 6 56789012",
    email: "lucien.degrauw@bamalite.com",
    status: "thuis",
    thuisSinds: "2025-07-16",
    onBoardSince: null,
    birthDate: "1991-11-08",
    address: { street: "Keizersgracht 123", city: "Amsterdam", postalCode: "1015 CJ", country: "Nederland" },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  },
  "david-gyori": {
    id: "david-gyori",
    firstName: "David",
    lastName: "Gyori",
    nationality: "HU",
    position: "Deksman",
    shipId: "ms-bellona",
    regime: "2/2",
    phone: "+36 30 234 5678",
    email: "david.gyori@bamalite.com",
    status: "thuis",
    thuisSinds: "2025-07-16",
    onBoardSince: null,
    birthDate: "1993-07-15",
    address: { street: "Váci utca 56", city: "Budapest", postalCode: "1056", country: "Hongarije" },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  },
  "koert-van-veen": {
    id: "koert-van-veen",
    firstName: "Koert",
    lastName: "van Veen",
    nationality: "NL",
    position: "Kapitein",
    shipId: "ms-bacchus",
    regime: "2/2",
    phone: "+31 6 67890123",
    email: "koert.vanveen@bamalite.com",
    status: "thuis",
    thuisSinds: "2025-07-16",
    onBoardSince: null,
    birthDate: "1976-02-28",
    address: { street: "Prinsengracht 234", city: "Amsterdam", postalCode: "1016 HT", country: "Nederland" },
    assignmentHistory: [],
    diplomas: [],
    notes: []
  }
}

async function pushCrew() {
  console.log('🚀 Start met pushen van alle crew data naar Supabase...')
  console.log(`📊 Totaal aantal crew members: ${Object.keys(crewDatabase).length}`)
  
  const crew = Object.values(crewDatabase)
  let successCount = 0
  let errorCount = 0
  
  for (const member of crew) {
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
      errorCount++
    } else {
      console.log(`✅ Crew upsert succesvol: ${member.firstName} ${member.lastName}`)
      successCount++
    }
    
    // Kleine pauze tussen requests om rate limiting te voorkomen
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log('🎉 Crew data push voltooid!')
  console.log(`✅ Succesvol: ${successCount} crew members`)
  console.log(`❌ Fouten: ${errorCount} crew members`)
}

pushCrew().catch(console.error) 