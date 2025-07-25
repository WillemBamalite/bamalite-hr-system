import { supabase } from '@/lib/supabase'
import { crewDatabase, shipDatabase, sickLeaveDatabase, sickLeaveHistoryDatabase } from '@/data/crew-database'

// Helper function to convert crew data format
function convertCrewData(crewData: any) {
  return {
    id: crewData.id,
    first_name: crewData.firstName,
    last_name: crewData.lastName,
    nationality: crewData.nationality,
    position: crewData.position,
    ship_id: crewData.shipId || null,
    regime: crewData.regime,
    phone: crewData.phone || '',
    email: crewData.email || '',
    status: crewData.status,
    on_board_since: crewData.onBoardSince || null,
    thuis_sinds: crewData.thuisSinds || null,
    birth_date: crewData.birthDate || null,
    address: crewData.address,
    assignment_history: crewData.assignmentHistory || [],
    diplomas: crewData.diplomas || [],
    notes: crewData.notes || []
  }
}

// Helper function to convert ship data format
function convertShipData(shipData: any) {
  return {
    id: shipData.id,
    name: shipData.name,
    status: shipData.status,
    max_crew: shipData.maxCrew,
    location: shipData.location,
    route: shipData.route
  }
}

// Helper function to convert sick leave data format
function convertSickLeaveData(sickLeaveData: any) {
  return {
    id: sickLeaveData.id,
    crew_member_id: sickLeaveData.crewMemberId,
    start_date: sickLeaveData.startDate || null,
    end_date: sickLeaveData.endDate || null,
    certificate_valid_until: sickLeaveData.certificateValidUntil || null,
    notes: sickLeaveData.notes,
    status: sickLeaveData.status,
    paid_by: sickLeaveData.paidBy,
    salary_percentage: sickLeaveData.salaryPercentage
  }
}

// Helper function to convert sick leave history data format
function convertSickLeaveHistoryData(historyData: any) {
  return {
    id: historyData.id,
    crew_member_id: historyData.crewMemberId,
    type: historyData.type,
    start_date: historyData.startDate || null,
    end_date: historyData.endDate || null,
    note: historyData.note,
    completed: historyData.completed
  }
}

export async function migrateDataToSupabase() {
  console.log('🚀 Starting data migration to Supabase...')

  try {
    // Migrate ships first (crew references ships)
    console.log('📦 Migrating ships...')
    const shipData = Object.values(shipDatabase).map(convertShipData)
    
    for (const ship of shipData) {
      const { error } = await supabase
        .from('ships')
        .upsert([ship], { onConflict: 'id' })
      
      if (error) {
        console.error(`Error migrating ship ${ship.id}:`, error)
      } else {
        console.log(`✅ Migrated ship: ${ship.name}`)
      }
    }

    // Migrate crew
    console.log('👥 Migrating crew...')
    const crewData = Object.values(crewDatabase).map(convertCrewData)
    
    for (const crew of crewData) {
      const { error } = await supabase
        .from('crew')
        .upsert([crew], { onConflict: 'id' })
      
      if (error) {
        console.error(`Error migrating crew ${crew.id}:`, error)
      } else {
        console.log(`✅ Migrated crew: ${crew.first_name} ${crew.last_name}`)
      }
    }

    // Migrate sick leave
    console.log('🏥 Migrating sick leave...')
    const sickLeaveData = Object.values(sickLeaveDatabase).map(convertSickLeaveData)
    
    for (const sickLeave of sickLeaveData) {
      const { error } = await supabase
        .from('sick_leave')
        .upsert([sickLeave], { onConflict: 'id' })
      
      if (error) {
        console.error(`Error migrating sick leave ${sickLeave.id}:`, error)
      } else {
        console.log(`✅ Migrated sick leave: ${sickLeave.id}`)
      }
    }

    // Migrate sick leave history
    console.log('📋 Migrating sick leave history...')
    const historyData = Object.values(sickLeaveHistoryDatabase).map(convertSickLeaveHistoryData)
    
    for (const history of historyData) {
      const { error } = await supabase
        .from('sick_leave_history')
        .upsert([history], { onConflict: 'id' })
      
      if (error) {
        console.error(`Error migrating history ${history.id}:`, error)
      } else {
        console.log(`✅ Migrated history: ${history.id}`)
      }
    }

    console.log('🎉 Data migration completed successfully!')
    
    // Verify migration
    const { data: crewCount } = await supabase.from('crew').select('id', { count: 'exact' })
    const { data: shipsCount } = await supabase.from('ships').select('id', { count: 'exact' })
    const { data: sickLeaveCount } = await supabase.from('sick_leave').select('id', { count: 'exact' })
    const { data: historyCount } = await supabase.from('sick_leave_history').select('id', { count: 'exact' })

    console.log('📊 Migration Summary:')
    console.log(`- Crew members: ${crewCount?.length || 0}`)
    console.log(`- Ships: ${shipsCount?.length || 0}`)
    console.log(`- Sick leave records: ${sickLeaveCount?.length || 0}`)
    console.log(`- History records: ${historyCount?.length || 0}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration if this file is executed directly
if (typeof window === 'undefined') {
  migrateDataToSupabase()
    .then(() => {
      console.log('Migration script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration script failed:', error)
      process.exit(1)
    })
} 