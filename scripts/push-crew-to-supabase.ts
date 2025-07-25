import { createClient } from '@supabase/supabase-js'
import { crewDatabase } from '../data/crew-database'

// Vul hier je Supabase URL en Anon Key in (dezelfde als in lib/supabase.ts)
const supabaseUrl = 'https://ocwraavhrtpvbqlkwnlb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function pushCrew() {
  const crew = Object.values(crewDatabase)
  for (const member of crew) {
    // Zet lege datums om naar null
    const birth_date = (member as any).birthDate || null
    const on_board_since = (member as any).onBoardSince || null
    const thuis_sinds = (member as any).thuisSinds || null
    const ship_id = (member as any).shipId || null
    const address = (member as any).address || null
    const assignment_history = (member as any).assignmentHistory || []
    const diplomas = (member as any).diplomas || []
    const notes = (member as any).notes || []
    
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
      console.error(`Fout bij upsert van crew ${member.id}:`, error)
    } else {
      console.log(`✅ Crew upsert: ${member.firstName} ${member.lastName}`)
    }
  }
  console.log('🎉 Alle crew-data is naar Supabase gepusht!')
}

pushCrew() 