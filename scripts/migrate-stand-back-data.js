// Migratie script om localStorage stand back data naar Supabase te verplaatsen
// Voer dit uit in de browser console nadat de tabel is aangemaakt

async function migrateStandBackData() {
  try {
    console.log('Starting migration of stand back data...')
    
    // Haal localStorage data op
    const localStorageData = JSON.parse(localStorage.getItem('sickLeaveHistoryDatabase') || '{}')
    const records = Object.values(localStorageData)
    
    console.log(`Found ${records.length} records to migrate`)
    
    if (records.length === 0) {
      console.log('No records to migrate')
      return
    }
    
    // Converteer naar Supabase formaat
    const supabaseRecords = records.map(record => ({
      id: record.id,
      crew_member_id: record.crewMemberId,
      start_date: record.startDate,
      end_date: record.endDate,
      days_count: record.daysCount || 0,
      description: record.description,
      stand_back_days_required: record.standBackDaysRequired,
      stand_back_days_completed: record.standBackDaysCompleted || 0,
      stand_back_days_remaining: record.standBackDaysRemaining,
      stand_back_status: record.standBackStatus || 'openstaand',
      stand_back_history: record.standBackHistory || []
    }))
    
    console.log('Converted records:', supabaseRecords)
    
    // Voeg records toe aan Supabase
    const { data, error } = await supabase
      .from('stand_back_records')
      .insert(supabaseRecords)
    
    if (error) {
      console.error('Error migrating data:', error)
      throw error
    }
    
    console.log('Migration successful!', data)
    
    // Backup localStorage data
    localStorage.setItem('sickLeaveHistoryDatabase_backup', JSON.stringify(localStorageData))
    console.log('localStorage data backed up')
    
    // Optioneel: verwijder localStorage data na succesvolle migratie
    // localStorage.removeItem('sickLeaveHistoryDatabase')
    // console.log('localStorage data removed')
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

// Voer de migratie uit
migrateStandBackData() 