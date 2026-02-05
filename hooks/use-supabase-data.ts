import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Function to calculate work days for vaste dienst aflossers based on hours
// Uses 12-hour increments: 0-12h = 0.5 day, 12-24h = 1.0 day, etc.
export function calculateWorkDaysVasteDienst(startDate: string, startTime: string, endDate: string, endTime: string): number {
  if (!startDate || !endDate || !startTime || !endTime) return 0

  // Parse both DD-MM-YYYY and ISO format dates
  const parseDate = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') {
      console.error('Invalid date string:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    // Check if it's already an ISO date (contains T or has 4-digit year at start)
    if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      // It's already an ISO date, use it directly
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        console.error('Invalid ISO date:', dateStr)
        return new Date() // Return current date as fallback
      }
      return date
    }
    
    // Otherwise, parse as DD-MM-YYYY format
    const parts = dateStr.split('-')
    if (parts.length !== 3) {
      console.error('Invalid date format:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // JavaScript months are 0-based
    const year = parseInt(parts[2], 10)
    
    const date = new Date(year, month, day)
    if (isNaN(date.getTime())) {
      console.error('Invalid parsed date:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    return date
  }

  // Parse time string (HH:MM:SS or HH:MM format)
  const parseTime = (timeStr: string): number => {
    if (!timeStr || typeof timeStr !== 'string') {
      console.error('Invalid time string:', timeStr)
      return 0
    }
    
    const timeParts = timeStr.split(':')
    if (timeParts.length < 2) {
      console.error('Invalid time format:', timeStr)
      return 0
    }
    
    const hours = parseInt(timeParts[0], 10)
    const minutes = parseInt(timeParts[1], 10)
    
    if (isNaN(hours) || isNaN(minutes)) {
      console.error('Invalid time values:', timeStr)
      return 0
    }
    
    return hours + (minutes / 60)
  }

  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const startTimeHours = parseTime(startTime)
  const endTimeHours = parseTime(endTime)

  if (end < start) {
    console.error('Error: end date is before start date')
    return 0
  }

  // Create full datetime objects
  const startDateTime = new Date(start)
  startDateTime.setHours(Math.floor(startTimeHours), (startTimeHours % 1) * 60, 0, 0)

  const endDateTime = new Date(end)
  endDateTime.setHours(Math.floor(endTimeHours), (endTimeHours % 1) * 60, 0, 0)

  // Calculate duration in hours
  const timeDiffMs = endDateTime.getTime() - startDateTime.getTime()
  const totalHours = timeDiffMs / (1000 * 60 * 60)

  // Convert to day credits using 12-hour increments
  // Formula: credits = ceil(hours / 12) * 0.5
  const dayCredits = Math.ceil(totalHours / 12) * 0.5

  return dayCredits
}

// Functie om automatisch crew members te activeren op hun startdatum
async function autoActivateCrewMembers(crewData: any[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset naar start van de dag
  
  for (const member of crewData) {
    // Check of deze persoon moet worden geactiveerd
    // Status kan "thuis" zijn (wachtend op startdatum) of "nog-in-te-delen"
    if (
      (member.status === 'thuis' || member.status === 'nog-in-te-delen') &&
      member.expected_start_date &&
      member.ship_id &&
      member.regime
    ) {
      const startDate = new Date(member.expected_start_date)
      startDate.setHours(0, 0, 0, 0)
      
      // Is vandaag >= startdatum?
      if (today >= startDate) {
        console.log(`🚀 Auto-activating ${member.first_name} ${member.last_name} - Start date reached!`)
        
        try {
          // Update naar "aan-boord" status
          const { error } = await supabase
            .from('crew')
            .update({
              status: 'aan-boord',
              on_board_since: member.expected_start_date,
              thuis_sinds: null, // Clear thuis_sinds (was thuis, nu aan boord)
              expected_start_date: null, // Clear expected_start_date
              sub_status: null // Clear sub_status
            })
            .eq('id', member.id)
          
          if (error) {
            console.error('Error auto-activating crew member:', error)
          } else {
            console.log(`✅ ${member.first_name} ${member.last_name} is now active!`)
          }
        } catch (err) {
          console.error('Error in auto-activation:', err)
        }
      }
    }
  }
}

// Functie om automatisch rotaties uit te voeren
async function autoRotateCrewMembers(crewData: any[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (const member of crewData) {
    // Skip als geen regime, ziek, of "Altijd"
    if (!member.regime || member.status === 'ziek' || member.regime === 'Altijd') {
      continue
    }
    
    const regimeWeeks = parseInt(member.regime.split('/')[0])
    const regimeDays = regimeWeeks * 7
    
    // Check of iemand van aan-boord naar thuis moet
    if (member.status === 'aan-boord' && member.on_board_since) {
      const onBoardDate = new Date(member.on_board_since)
      onBoardDate.setHours(0, 0, 0, 0)
      
      const daysSinceOnBoard = Math.floor((today.getTime() - onBoardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceOnBoard >= regimeDays) {
        const thuisSinds = new Date(onBoardDate)
        thuisSinds.setDate(thuisSinds.getDate() + regimeDays)
        
        console.log(`🔄 Auto-rotating ${member.first_name} ${member.last_name} to THUIS`)
        
        try {
          const { error } = await supabase
            .from('crew')
            .update({
              status: 'thuis',
              thuis_sinds: thuisSinds.toISOString().split('T')[0],
              on_board_since: null
            })
            .eq('id', member.id)
          
          if (error) {
            console.error('Error rotating to thuis:', error)
          } else {
            console.log(`✅ ${member.first_name} is now thuis`)
          }
        } catch (err) {
          console.error('Error in rotation:', err)
        }
      }
    }
    
    // Check of iemand van thuis naar aan-boord moet
    if (member.status === 'thuis' && member.thuis_sinds) {
      const thuisDate = new Date(member.thuis_sinds)
      thuisDate.setHours(0, 0, 0, 0)
      
      const daysSinceThuis = Math.floor((today.getTime() - thuisDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceThuis >= regimeDays) {
        const onBoardSince = new Date(thuisDate)
        onBoardSince.setDate(onBoardSince.getDate() + regimeDays)
        
        console.log(`🔄 Auto-rotating ${member.first_name} ${member.last_name} to AAN-BOORD`)
        
        try {
          const { error } = await supabase
            .from('crew')
            .update({
              status: 'aan-boord',
              on_board_since: onBoardSince.toISOString().split('T')[0],
              thuis_sinds: null
            })
            .eq('id', member.id)
          
          if (error) {
            console.error('Error rotating to aan-boord:', error)
          } else {
            console.log(`✅ ${member.first_name} is now aan-boord`)
          }
        } catch (err) {
          console.error('Error in rotation:', err)
        }
      }
    }
  }
}

// Functie om automatisch vaste dienst records te beheren
async function autoManageVasteDienstRecords(crewData: any[], vasteDienstRecords: any[], tripsData: any[]) {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1 // JavaScript months are 0-based
  
  console.log(`🔧 Auto-managing vaste dienst records for ${currentYear}-${currentMonth}`)

   // Helper om zowel ISO (YYYY-MM-DD) als DD-MM-YYYY goed te parsen
   const parseTripDate = (dateStr: string): Date => {
     if (!dateStr || typeof dateStr !== 'string') {
       console.error('Invalid date string in vaste dienst trips:', dateStr)
       return new Date(NaN)
     }
     
     // ISO formaat (of al een geldige JS date string)
     if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
       const date = new Date(dateStr)
       if (isNaN(date.getTime())) {
         console.error('Invalid ISO date in vaste dienst trips:', dateStr)
       }
       return date
     }
     
     // Anders DD-MM-YYYY
     const parts = dateStr.split('-')
     if (parts.length !== 3) {
       console.error('Invalid DD-MM-YYYY date format in vaste dienst trips:', dateStr)
       return new Date(NaN)
     }
     
     const [day, month, year] = parts
     const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
     const date = new Date(isoDate)
     
     if (isNaN(date.getTime())) {
       console.error('Invalid date after parsing in vaste dienst trips:', isoDate, 'from:', dateStr)
     }
     
     return date
   }
  
  // Get all aflossers in vaste dienst
  const vasteDienstAflossers = crewData.filter(member => member.vaste_dienst === true)
  
  for (const aflosser of vasteDienstAflossers) {
    console.log(`📋 Processing vaste dienst aflosser: ${aflosser.first_name} ${aflosser.last_name}`)
    
    // Check if current month record exists
    let monthRecord = vasteDienstRecords.find(record => 
      record.aflosser_id === aflosser.id && 
      record.year === currentYear && 
      record.month === currentMonth
    )
    
    if (!monthRecord) {
      // Create new monthly record
      console.log(`📅 Creating new monthly record for ${aflosser.first_name} ${aflosser.last_name}`)
      
      try {
        const newRecord = {
          aflosser_id: aflosser.id,
          year: currentYear,
          month: currentMonth,
          required_days: 15, // Standard 15 days per month
          actual_days: 0, // Will be calculated from trips
          balance_days: 0, // Will be calculated
          notes: `Automatisch aangemaakt voor ${currentYear}-${currentMonth}`
        }
        
        const { data, error } = await supabase
          .from('vaste_dienst_records')
          .insert([newRecord])
          .select()
          .single()
        
        if (error) {
          console.error('Error creating vaste dienst record:', error)
        } else {
          console.log(`✅ Created monthly record for ${aflosser.first_name}`)
          monthRecord = data
        }
      } catch (err) {
        console.error('Error in vaste dienst record creation:', err)
      }
    }
    
    // Calculate actual days from completed trips for current month
    // Belangrijk: tel alleen de dagen die in deze maand vallen, ook als de reis over maanden heen loopt
    const monthStart = new Date(currentYear, currentMonth - 1, 1)
    monthStart.setHours(0, 0, 0, 0)
    const monthEnd = new Date(currentYear, currentMonth, 0) // laatste dag van maand
    monthEnd.setHours(0, 0, 0, 0)

    const currentMonthTrips = tripsData.filter((trip: any) => {
      if (trip.aflosser_id !== aflosser.id) return false
      if (trip.status !== 'voltooid') return false
      if (!trip.start_datum || !trip.eind_datum) return false

      const start = parseTripDate(trip.start_datum)
      const end = parseTripDate(trip.eind_datum)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false

      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)

      // Reis moet deze maand overlappen (start vóór einde van maand EN eind na begin van maand)
      return end >= monthStart && start <= monthEnd
    })
    
    let totalWorkDays = 0
    for (const trip of currentMonthTrips) {
      try {
        const tripStart = parseTripDate(trip.start_datum)
        const tripEnd = parseTripDate(trip.eind_datum)
        if (isNaN(tripStart.getTime()) || isNaN(tripEnd.getTime())) continue

        tripStart.setHours(0, 0, 0, 0)
        tripEnd.setHours(0, 0, 0, 0)

        // Clamp de reis binnen de grenzen van deze maand
        const rangeStart = tripStart < monthStart ? monthStart : tripStart
        const rangeEnd = tripEnd > monthEnd ? monthEnd : tripEnd

        if (rangeEnd < rangeStart) continue

        const msPerDay = 24 * 60 * 60 * 1000
        const daysInThisMonth = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / msPerDay) + 1

        totalWorkDays += daysInThisMonth
      } catch (err) {
        console.error('Error calculating work days for trip in vaste dienst auto-manage:', err, trip)
      }
    }
    
    // Update the record with actual days and balance
    if (monthRecord) {
      const requiredDays = 15
      
      // CORRECTE BEREKENING: Eindsaldo = Beginsaldo + (Gewerkt - 15)
      // Voor eerste maand: Beginsaldo = -15 + startsaldo
      let beginsaldo = monthRecord.balance_days || 0
      
      // Als dit de eerste maand is en er is geen beginsaldo, gebruik -15 + startsaldo
      if (beginsaldo === 0 && currentMonth === 1) {
        // Probeer startsaldo uit notes te halen (alleen als notes een array is)
        const notesArray = Array.isArray(aflosser.notes) ? aflosser.notes : []
        const startsaldoNote = notesArray.find((note: any) => 
          note.text && (note.text.includes('startsaldo') || note.text.includes('Startsaldo'))
        )
        if (startsaldoNote) {
          const match = startsaldoNote.text.match(/(-?\d+(?:\.\d+)?)/)
          if (match) {
            const startsaldo = parseFloat(match[1])
            beginsaldo = -15 + startsaldo
            console.log(`📊 Eerste maand: startsaldo ${startsaldo}, beginsaldo ${beginsaldo}`)
          }
        }
        if (beginsaldo === 0) beginsaldo = -15 // Fallback
      }
      
      // Voor de eerste maand: toon het beginsaldo als huidig saldo
      // Voor volgende maanden: bereken het eindsaldo
      let balanceDays
      if (currentMonth === 1 && beginsaldo !== -15) {
        // Eerste maand met startsaldo: toon beginsaldo
        balanceDays = beginsaldo
      } else {
        // Normale berekening: beginsaldo + (gewerkt - 15)
        balanceDays = beginsaldo + (totalWorkDays - requiredDays)
      }
      
      // Cap values to fit in DECIMAL(4,1) - max 999.9
      const cappedActualDays = Math.min(totalWorkDays, 999.9)
      const cappedBalanceDays = Math.min(Math.max(balanceDays, -999.9), 999.9)
      
      if (monthRecord.actual_days !== cappedActualDays || monthRecord.balance_days !== cappedBalanceDays) {
        console.log(`📊 Updating record for ${aflosser.first_name}: ${cappedActualDays} days (balance: ${cappedBalanceDays})`)
        
        try {
        const { error } = await supabase
          .from('vaste_dienst_records')
          .update({
            actual_days: cappedActualDays,
            balance_days: cappedBalanceDays
          })
          .eq('id', monthRecord.id)
          
          if (error) {
            console.error('❌ Error updating vaste dienst record:', error)
            console.error('❌ Error details:', JSON.stringify(error, null, 2))
            console.error('❌ Record data:', { id: monthRecord.id, actual_days: totalWorkDays, balance_days: balanceDays })
          } else {
            console.log(`✅ Updated record for ${aflosser.first_name}`)
          }
        } catch (err) {
          console.error('Error updating vaste dienst record:', err)
        }
      }
    }
  }
}

// Helper function to calculate work days from trip data
export function calculateWorkDays(startDate: string, startTime: string, endDate: string, endTime: string): number {
  if (!startDate || !endDate) return 0

  // Parse both DD-MM-YYYY and ISO format dates
  const parseDate = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') {
      console.error('Invalid date string:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    // Check if it's already an ISO date (contains T or has 4-digit year at start)
    if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      // It's already an ISO date, use it directly
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        console.error('Invalid ISO date:', dateStr)
        return new Date() // Return current date as fallback
      }
      return date
    }
    
    // Otherwise, parse as DD-MM-YYYY format
    const parts = dateStr.split('-')
    if (parts.length !== 3) {
      console.error('Invalid date format:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    const [day, month, year] = parts
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const date = new Date(isoDate)
    
    if (isNaN(date.getTime())) {
      console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    return date
  }

  const start = parseDate(startDate)
  const end = parseDate(endDate)

  // Validatie: afstapdatum mag niet voor instapdatum liggen
  if (end < start) {
    console.error('Error: end date is before start date')
    return 0
  }

  // Simpele telling: tel kalenderdagen van start tot eind (inclusief beide)
  const timeDiff = end.getTime() - start.getTime()
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1 // +1 omdat we beide datums inclusief tellen


  return daysDiff
}

// Function to auto-update vaste dienst records when a trip is completed
async function autoUpdateVasteDienstFromTrip(completedTrip: any) {
  try {
    console.log(`🔄 Auto-updating vaste dienst for completed trip: ${completedTrip.id}`)
    console.log(`🔄 Trip data:`, completedTrip)
    
    // Get the aflosser
    const { data: aflosser, error: aflosserError } = await supabase
      .from('crew')
      .select('*')
      .eq('id', completedTrip.aflosser_id)
      .single()
    
    if (aflosserError || !aflosser) {
      console.error('Error fetching aflosser:', aflosserError)
      return
    }
    
    // Check if aflosser is in vaste dienst
    if (!aflosser.vaste_dienst) {
      console.log('Aflosser is not in vaste dienst, skipping auto-update')
      return
    }
    
    // Get the month/year of the trip completion
    // Parse the date using our safe parseDate function
    const parseDate = (dateStr: string): Date => {
      if (!dateStr || typeof dateStr !== 'string') {
        console.error('Invalid date string:', dateStr)
        return new Date()
      }
      
      // Check if it's already an ISO date (contains T or has 4-digit year at start)
      if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        // It's already an ISO date, use it directly
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
          console.error('Invalid ISO date:', dateStr)
          return new Date()
        }
        return date
      }
      
      // Otherwise, parse as DD-MM-YYYY format
      const parts = dateStr.split('-')
      if (parts.length !== 3) {
        console.error('Invalid date format:', dateStr)
        return new Date()
      }
      
      const [day, month, year] = parts
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      const date = new Date(isoDate)
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
        return new Date()
      }
      
      return date
    }
    
    const endDate = parseDate(completedTrip.eind_datum)
    const year = endDate.getFullYear()
    const month = endDate.getMonth() + 1
    
    // Check if monthly record exists
    const { data: existingRecord, error: recordError } = await supabase
      .from('vaste_dienst_records')
      .select('*')
      .eq('aflosser_id', completedTrip.aflosser_id)
      .eq('year', year)
      .eq('month', month)
      .single()
    
    if (recordError && recordError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching vaste dienst record:', recordError)
      return
    }
    
    let recordId = existingRecord?.id
    
    // Create record if it doesn't exist
    if (!existingRecord) {
      console.log(`📅 Creating new monthly record for ${aflosser.first_name} ${aflosser.last_name}`)
      
      const newRecord = {
        aflosser_id: completedTrip.aflosser_id,
        year: year,
        month: month,
        required_days: 15,
        actual_days: 0,
        balance_days: 0,
        notes: `Automatisch aangemaakt voor ${year}-${month}`
      }
      
      const { data: createdRecord, error: createError } = await supabase
        .from('vaste_dienst_records')
        .insert([newRecord])
        .select()
        .single()
      
      if (createError) {
        console.error('Error creating vaste dienst record:', createError)
        return
      }
      
      recordId = createdRecord.id
    }
    
    // Calculate work days for this trip
    const workDays = calculateWorkDays(
      completedTrip.start_datum, 
      completedTrip.start_tijd, 
      completedTrip.eind_datum, 
      completedTrip.eind_tijd
    )
    
    // Get all completed trips for this month to calculate total
    const { data: allTrips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('aflosser_id', completedTrip.aflosser_id)
      .eq('status', 'voltooid')
      .not('eind_datum', 'is', null)
    
    if (tripsError) {
      console.error('Error fetching trips:', tripsError)
      return
    }
    
    // Calculate total work days for the month
    let totalWorkDays = 0
    for (const trip of allTrips || []) {
      const tripEndDate = parseDate(trip.eind_datum)
      if (tripEndDate.getFullYear() === year && tripEndDate.getMonth() + 1 === month) {
        const tripWorkDays = calculateWorkDays(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
        totalWorkDays += tripWorkDays
      }
    }
    
    // Update the record
    const requiredDays = 15
    
    // CORRECTE BEREKENING: Eindsaldo = Beginsaldo + (Gewerkt - 15)
    // Voor eerste maand: Beginsaldo = -15 + startsaldo
    let beginsaldo = 0
    
    // Probeer startsaldo uit notes te halen voor nieuwe aflossers (alleen als notes een array is)
    const notesArray = Array.isArray(aflosser.notes) ? aflosser.notes : []
    const startsaldoNote = notesArray.find((note: any) => 
      note.text && (note.text.includes('startsaldo') || note.text.includes('Startsaldo'))
    )
    if (startsaldoNote) {
      const match = startsaldoNote.text.match(/(-?\d+(?:\.\d+)?)/)
      if (match) {
        const startsaldo = parseFloat(match[1])
        beginsaldo = -15 + startsaldo
        console.log(`📊 Nieuwe aflosser: startsaldo ${startsaldo}, beginsaldo ${beginsaldo}`)
      }
    }
    if (beginsaldo === 0) beginsaldo = -15 // Fallback
    
    // Voor de eerste maand: toon het beginsaldo als huidig saldo
    // Voor volgende maanden: bereken het eindsaldo
    let balanceDays
    if (month === 1 && beginsaldo !== -15) {
      // Eerste maand met startsaldo: toon beginsaldo
      balanceDays = beginsaldo
    } else {
      // Normale berekening: beginsaldo + (gewerkt - 15)
      balanceDays = beginsaldo + (totalWorkDays - requiredDays)
    }
    
    // Cap values to fit in DECIMAL(4,1) - max 999.9
    const cappedActualDays = Math.min(totalWorkDays, 999.9)
    const cappedBalanceDays = Math.min(Math.max(balanceDays, -999.9), 999.9)
    
    const { error: updateError } = await supabase
      .from('vaste_dienst_records')
      .update({
        actual_days: cappedActualDays,
        balance_days: cappedBalanceDays
      })
      .eq('id', recordId)
    
    if (updateError) {
      console.error('❌ Error updating vaste dienst record:', updateError)
      console.error('❌ Error details:', JSON.stringify(updateError, null, 2))
      console.error('❌ Record data:', { id: recordId, actual_days: totalWorkDays, balance_days: balanceDays })
    } else {
      console.log(`✅ Updated vaste dienst record for ${aflosser.first_name}: ${totalWorkDays} days (balance: ${balanceDays})`)
    }
    
  } catch (err) {
    console.error('Error in auto-update vaste dienst:', err)
  }
}

// Function to force recalculate all vaste dienst records with new logic
async function forceRecalculateAllVasteDienstRecords(crewData: any[], tripsData: any[]) {
  try {
    console.log('🔄 Force recalculating all vaste dienst records...')
    console.log(`📊 Crew data: ${crewData.length} members`)
    console.log(`📊 Trips data: ${tripsData.length} trips`)
    
    // Get all vaste dienst records
    const { data: allRecords, error: fetchError } = await supabase
      .from('vaste_dienst_records')
      .select('*')
    
    if (fetchError) {
      console.error('❌ Error fetching vaste dienst records:', fetchError)
      return
    }
    
    if (!allRecords || allRecords.length === 0) {
      console.log('⚠️ No vaste dienst records found to recalculate')
      return
    }
    
    console.log(`📋 Found ${allRecords.length} records to recalculate`)
    
    // Process each record
    for (const record of allRecords) {
      try {
        console.log(`\n🔍 Processing record ${record.id} for aflosser ${record.aflosser_id}`)
        
        // Find the aflosser
        const aflosser = crewData.find(crew => crew.id === record.aflosser_id)
        if (!aflosser) {
          console.log(`⚠️ Aflosser not found for record ${record.id}`)
          continue
        }
        
        console.log(`👤 Found aflosser: ${aflosser.first_name} ${aflosser.last_name}`)
        
        // Get all completed trips for this aflosser
        const allTrips = tripsData.filter((trip: any) => 
          trip.aflosser_id === record.aflosser_id &&
          trip.status === 'voltooid' &&
          trip.start_datum && trip.eind_datum && trip.start_tijd && trip.eind_tijd
        )
        
        console.log(`🚢 Found ${allTrips.length} completed trips for this aflosser`)
        
        // Calculate total work days with new logic
        let totalWorkDays = 0
        for (const trip of allTrips) {
          const workDays = calculateWorkDays(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
          console.log(`  📅 Trip ${trip.id}: ${trip.start_datum} to ${trip.eind_datum} = ${workDays} days`)
          totalWorkDays += workDays
        }
        
        console.log(`📊 Total work days calculated: ${totalWorkDays}`)
        
        // Cap values to fit in DECIMAL(4,1)
        const requiredDays = 15
        
        // CORRECTE BEREKENING: Eindsaldo = Beginsaldo + (Gewerkt - 15)
        // Voor eerste maand: Beginsaldo = -15 + startsaldo
        let beginsaldo = record.balance_days || 0
        
        // Als dit de eerste maand is en er is geen beginsaldo, gebruik -15 + startsaldo
        if (beginsaldo === 0 && record.month === 1) {
          // Probeer startsaldo uit notes te halen (alleen als notes een array is)
          const notesArray = Array.isArray(aflosser.notes) ? aflosser.notes : []
          const startsaldoNote = notesArray.find((note: any) => 
            note.text && (note.text.includes('startsaldo') || note.text.includes('Startsaldo'))
          )
          if (startsaldoNote) {
            const match = startsaldoNote.text.match(/(-?\d+(?:\.\d+)?)/)
            if (match) {
              const startsaldo = parseFloat(match[1])
              beginsaldo = -15 + startsaldo
              console.log(`📊 Eerste maand herberekening: startsaldo ${startsaldo}, beginsaldo ${beginsaldo}`)
            }
          }
          if (beginsaldo === 0) beginsaldo = -15 // Fallback
        }
        
        // Voor de eerste maand: toon het beginsaldo als huidig saldo
        // Voor volgende maanden: bereken het eindsaldo
        let balanceDays
        if (record.month === 1 && beginsaldo !== -15) {
          // Eerste maand met startsaldo: toon beginsaldo
          balanceDays = beginsaldo
        } else {
          // Normale berekening: beginsaldo + (gewerkt - 15)
          balanceDays = beginsaldo + (totalWorkDays - requiredDays)
        }
        const cappedActualDays = Math.min(totalWorkDays, 999.9)
        const cappedBalanceDays = Math.min(Math.max(balanceDays, -999.9), 999.9)
        
        console.log(`💾 Updating record: actual=${cappedActualDays}, balance=${cappedBalanceDays}`)
        
        // Update the record
        const { error: updateError } = await supabase
          .from('vaste_dienst_records')
          .update({
            actual_days: cappedActualDays,
            balance_days: cappedBalanceDays
          })
          .eq('id', record.id)
        
        if (updateError) {
          console.error(`❌ Error updating record ${record.id}:`, updateError)
        } else {
          console.log(`✅ Successfully updated record for ${aflosser.first_name}: ${cappedActualDays} days (balance: ${cappedBalanceDays})`)
        }
        
      } catch (err) {
        console.error(`❌ Error processing record ${record.id}:`, err)
      }
    }
    
    console.log('🎉 Force recalculation completed!')
    
  } catch (err) {
    console.error('❌ Error in force recalculate:', err)
  }
}

// Function to reset all vaste dienst records to 0
async function resetAllVasteDienstRecords() {
  try {
    console.log('🧹 Resetting all vaste dienst records to 0...')
    
    // Get all vaste dienst records
    const { data: allRecords, error: fetchError } = await supabase
      .from('vaste_dienst_records')
      .select('*')
    
    if (fetchError) {
      console.error('Error fetching vaste dienst records for reset:', fetchError)
      return
    }
    
    if (!allRecords || allRecords.length === 0) {
      console.log('No vaste dienst records found to reset')
      return
    }
    
    console.log(`Found ${allRecords.length} records to reset`)
    
    // Reset each record to 0
    for (const record of allRecords) {
      try {
        const { error: updateError } = await supabase
          .from('vaste_dienst_records')
          .update({
            actual_days: 0,
            balance_days: -15 // -15 because required_days is 15
          })
          .eq('id', record.id)
        
        if (updateError) {
          console.error(`❌ Error resetting record ${record.id}:`, updateError)
        } else {
          console.log(`✅ Reset record ${record.id} to 0`)
        }
        
      } catch (err) {
        console.error(`Error resetting record ${record.id}:`, err)
      }
    }
    
    console.log('🎉 Reset completed!')
    
  } catch (err) {
    console.error('Error in reset all records:', err)
  }
}

// Eenmalige schoonmaak van oude jubileum-agendapunten uit eerdere logica
// Verwijdert items met titels zoals:
// - "Over 10 dagen: ... X jaar in dienst"
// - "Jubileum X jaar in dienst - ..."
async function cleanupOldJubileeAgendaItems() {
  try {
    console.log('🧹 Cleaning up old jubilee agenda items...')

    // Verwijder "Over 10 dagen: ... jaar in dienst" items
    const { error: errorReminders } = await supabase
      .from('agenda_items')
      .delete()
      .ilike('title', 'Over 10 dagen:%jaar in dienst%')

    if (errorReminders) {
      console.error('❌ Error deleting old jubilee reminder agenda items:', errorReminders)
    }

    // Verwijder "Jubileum X jaar in dienst - ..." items
    const { error: errorJubilees } = await supabase
      .from('agenda_items')
      .delete()
      .ilike('title', 'Jubileum%jaar in dienst%')

    if (errorJubilees) {
      console.error('❌ Error deleting old jubilee day agenda items:', errorJubilees)
    }

    console.log('✅ Old jubilee agenda items cleanup completed')
  } catch (err) {
    console.error('❌ Unexpected error during jubilee agenda cleanup:', err)
  }
}

export function useSupabaseData() {
  const [ships, setShips] = useState<any[]>([])
  const [crew, setCrew] = useState<any[]>([])
  const [sickLeave, setSickLeave] = useState<any[]>([])
  const [standBackRecords, setStandBackRecords] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [vasteDienstRecords, setVasteDienstRecords] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [crewColorTags, setCrewColorTags] = useState<Record<string, string>>({})  // Load all data from Supabase
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading data from Supabase...')

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Current session:', session ? 'User logged in' : 'No user session')
      
      if (!session) {
        console.warn('No active session - user needs to login')
        setShips([])
        setCrew([])
        setSickLeave([])
        setStandBackRecords([])
        setLoans([])
        setTrips([])
        setVasteDienstRecords([])
        setTasks([])
        setIncidents([])
        setLoading(false)
        return
      }

      // Eenmalig oude jubileum-agendapunten opruimen (veilig om vaker te draaien)
      await cleanupOldJubileeAgendaItems()

      // Test Supabase connection
      console.log('Testing Supabase connection...')
      const { data: testData, error: testError } = await supabase
        .from('sick_leave')
        .select('id')
        .limit(1)
      
      if (testError) {
        console.error('Supabase connection test failed:', testError)
        console.error('Test error details:', JSON.stringify(testError, null, 2))
      } else {
        console.log('✅ Supabase connection test successful')
      }

      // Load ships
      console.log('Loading ships...')
      const { data: shipsData, error: shipsError } = await supabase
        .from('ships')
        .select('*')
        .order('name')

      if (shipsError) {
        console.error('Error loading ships:', shipsError)
        console.error('Ships error details:', JSON.stringify(shipsError, null, 2))
      } else {
        console.log('Ships loaded:', shipsData?.length || 0)
        setShips(shipsData || [])
      }

      // Load crew
      console.log('Loading crew...')
      const { data: crewData, error: crewError } = await supabase
        .from('crew')
        .select('*')
        .order('first_name')

      if (crewError) {
        console.error('Error loading crew:', crewError)
        console.error('Crew error details:', JSON.stringify(crewError, null, 2))
      } else {
        console.log('Crew loaded:', crewData?.length || 0)
        
        // Temporarily disable auto-activation and rotation to prevent infinite loops
        // await autoActivateCrewMembers(crewData || [])
        // await autoRotateCrewMembers(crewData || [])
        
        // Set crew data directly without reloading
        setCrew(crewData || [])
      }

      // Load sick leave
      console.log('Loading sick leave...')
      const { data: sickLeaveData, error: sickLeaveError } = await supabase
        .from('sick_leave')
        .select('*')
        .order('start_date', { ascending: false })

      if (sickLeaveError) {
        console.error('Error loading sick leave:', sickLeaveError)
      } else {
        console.log('Sick leave loaded:', sickLeaveData?.length || 0)
        setSickLeave(sickLeaveData || [])
      }

      // Load stand back records
      console.log('Loading stand back records...')
      const { data: standBackData, error: standBackError } = await supabase
        .from('stand_back_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (standBackError) {
        console.error('Error loading stand back records:', standBackError)
        setStandBackRecords([])
      } else {
        console.log('Stand back records loaded:', standBackData?.length || 0)
        setStandBackRecords(standBackData || [])
      }

      // Load loans
      console.log('Loading loans...')
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false })

      if (loansError) {
        console.error('Error loading loans:', loansError)
        setLoans([])
      } else {
        console.log('Loans loaded:', loansData?.length || 0)
        setLoans(loansData || [])
      }

            // Load trips
            console.log('Loading trips...')
            const { data: tripsData, error: tripsError } = await supabase
              .from('trips')
              .select('*')
              .order('created_at', { ascending: false })

            if (tripsError) {
              console.error('Error loading trips:', tripsError)
              setTrips([])
            } else {
              console.log('Trips loaded:', tripsData?.length || 0)
              setTrips(tripsData || [])
            }

            // Load vaste dienst records
            console.log('Loading vaste dienst records...')
            const { data: vasteDienstData, error: vasteDienstError } = await supabase
              .from('vaste_dienst_records')
              .select('*')
              .order('year', { ascending: false })
              .order('month', { ascending: false })

            if (vasteDienstError) {
              console.error('Error loading vaste dienst records:', vasteDienstError)
              setVasteDienstRecords([])
            } else {
              console.log('Vaste dienst records loaded:', vasteDienstData?.length || 0)
              setVasteDienstRecords(vasteDienstData || [])
              
              // Auto-manage vaste dienst records after loading all data
              console.log('🔧 Auto-managing vaste dienst records...')
              await autoManageVasteDienstRecords(crewData || [], vasteDienstData || [], tripsData || [])
            }

      // Load tasks
      console.log('Loading tasks...')
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (tasksError) {
        console.error('Error loading tasks:', tasksError)
        setTasks([])
      } else {
        console.log('Tasks loaded:', tasksData?.length || 0)
        setTasks(tasksData || [])
      }

      // Load incidents
      console.log('Loading incidents...')
      const { data: incidentsData, error: incidentsError } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })

      if (incidentsError) {
        console.error('Error loading incidents:', incidentsError)
        setIncidents([])
      } else {
        console.log('Incidents loaded:', incidentsData?.length || 0)
        setIncidents(incidentsData || [])
      }
      
      console.log('Data loading completed!')

      // Load crew color tags last, non-blocking for main data
      try {
        const { data: colorRows, error: colorErr } = await supabase
          .from('crew_color_tags')
          .select('crew_id, color')
        if (colorErr) {
          const msg = (colorErr as any)?.message || String(colorErr)
          console.warn('Skipping crew_color_tags (table missing or no access):', msg)
          setCrewColorTags({})
        } else {
          const map: Record<string, string> = {}
          for (const row of colorRows || []) {
            if (row.crew_id && row.color) map[row.crew_id] = row.color
          }
          setCrewColorTags(map)
        }
      } catch (e) {
        console.warn('Error loading crew_color_tags:', (e as any)?.message || e)
        setCrewColorTags({})
      }

    } catch (err) {
      console.error('Error in loadData:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData()
    
    // Temporarily disable daily check to prevent infinite loops
    // const dailyCheck = setInterval(() => {
    //   console.log('Running daily auto-activation check...')
    //   loadData() // Dit zal autoActivateCrewMembers aanroepen
    // }, 24 * 60 * 60 * 1000) // 24 uur
    
    // return () => clearInterval(dailyCheck)
  }, [])

  // Subscribe to real-time changes
  useEffect(() => {
    // Subscribe to ships changes
    const shipsSubscription = supabase
      .channel('ships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ships' }, () => {
        loadData()
      })
      .subscribe()

    // Subscribe to crew changes
    const crewSubscription = supabase
      .channel('crew-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew' }, () => {
        loadData()
      })
      .subscribe()

    // Subscribe to sick leave changes
    const sickLeaveSubscription = supabase
      .channel('sick-leave-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sick_leave' }, () => {
        loadData()
      })
      .subscribe()

    // Subscribe to stand back records changes
    const standBackSubscription = supabase
      .channel('stand-back-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stand_back_records' }, () => {
        loadData()
      })
      .subscribe()

    // Subscribe to loans changes
    const loansSubscription = supabase
      .channel('loans-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => {
        loadData()
      })
      .subscribe()

    // Subscribe to trips changes
    const tripsSubscription = supabase
      .channel('trips-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        loadData()
      })
      .subscribe()

    // Subscribe to tasks changes
    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadData()
      })
      .subscribe()

    // Subscribe to incidents changes
    const incidentsSubscription = supabase
      .channel('incidents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      shipsSubscription.unsubscribe()
      crewSubscription.unsubscribe()
      sickLeaveSubscription.unsubscribe()
      standBackSubscription.unsubscribe()
      loansSubscription.unsubscribe()
      tripsSubscription.unsubscribe()
      tasksSubscription.unsubscribe()
      incidentsSubscription.unsubscribe()
    }
  }, [])

  // Add crew member
  const addCrew = async (crewData: any) => {
    try {
      console.log('Adding crew member to Supabase:', crewData)
      console.log('Crew data details:', JSON.stringify(crewData, null, 2))
      
      // Validate required fields
      const requiredFields = ['id', 'first_name', 'last_name', 'nationality', 'position']
      const missingFields = requiredFields.filter(field => !crewData[field])
      
      if (missingFields.length > 0) {
        const error = new Error(`Missing required fields: ${missingFields.join(', ')}`)
        console.error('Validation error:', error)
        throw error
      }
      
      // Check for duplicate crew member
      const { data: existingCrew, error: checkError } = await supabase
        .from('crew')
        .select('id')
        .eq('first_name', crewData.first_name)
        .eq('last_name', crewData.last_name)
        .eq('nationality', crewData.nationality)
        .single()
      
      if (existingCrew && !checkError) {
        const error = new Error(`Crew member with name ${crewData.first_name} ${crewData.last_name} already exists`)
        console.error('Duplicate crew member:', error)
        throw error
      }
      
      const { data, error } = await supabase
        .from('crew')
        .insert([crewData])
        .select()
        .single()

      if (error) {
        console.error('Supabase error adding crew:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error hint:', error.hint)
        throw error
      }

      console.log('Crew member added successfully:', data)
      await loadData()
      return data
    } catch (err) {
      console.error('Error adding crew:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      throw err
    }
  }

  // Update crew member
  const updateCrew = async (id: string, updates: any) => {
    try {
      console.log('Updating crew member in Supabase:', id, updates)
      
      const { data, error } = await supabase
        .from('crew')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating crew:', error)
        throw error
      }

      console.log('Crew member updated successfully')
      await loadData()
      return data
    } catch (err) {
      console.error('Error updating crew:', err)
      throw err
    }
  }

  // Delete crew member
  const deleteCrew = async (id: string) => {
    try {
      const { error } = await supabase
        .from('crew')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await loadData() // Reload all data
    } catch (err) {
      console.error('Error deleting crew:', err)
      throw err
    }
  }

  // Add ship
  const addShip = async (shipData: any) => {
    try {
      console.log('Adding ship to Supabase:', shipData)
      
      const { data, error } = await supabase
        .from('ships')
        .insert([shipData])
        .select()
        .single()

      if (error) {
        console.error('Supabase error adding ship:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log('Ship added successfully:', data)
      await loadData()
      return data
    } catch (err) {
      console.error('Error adding ship:', err)
      throw err
    }
  }

  // Update ship
  const updateShip = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('ships')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error updating ship:', err)
      throw err
    }
  }

  // Delete ship
  const deleteShip = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ships')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadData() // Reload all data
    } catch (err) {
      console.error('Error deleting ship:', err)
      throw err
    }
  }

  // Add sick leave
  const addSickLeave = async (sickLeaveData: any) => {
    try {
      console.log('Adding sick leave to Supabase:', sickLeaveData)
      
      // Ensure notes is not null
      if (sickLeaveData.notes === null || sickLeaveData.notes === undefined) {
        sickLeaveData.notes = ""
      }
      
      const { data, error } = await supabase
        .from('sick_leave')
        .insert([sickLeaveData])
        .select()
        .single()

      if (error) {
        console.error('Supabase error adding sick leave:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log('Sick leave added successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error adding sick leave:', err)
      throw err
    }
  }

  // Update sick leave
  const updateSickLeave = async (id: string, updates: any) => {
    try {
      console.log('Updating sick leave in Supabase:', id, updates)
      
      // Ensure notes is not null
      if (updates.notes === null || updates.notes === undefined) {
        updates.notes = ""
      }
      
      const { data, error } = await supabase
        .from('sick_leave')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating sick leave:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log('Sick leave updated successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error updating sick leave:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      throw err
    }
  }

  const addStandBackRecord = async (recordData: any) => {
    try {
      console.log('=== ADDING STAND BACK RECORD ===')
      console.log('Original record data:', recordData)
      
      // Generate a UUID for the id field
      const uuid = crypto.randomUUID()
      console.log('Generated UUID:', uuid)
      
      // Remove id if it exists and add our generated UUID
      const { id, ...dataWithoutId } = recordData
      
      // Create a safe data object with only known database columns
      const dataToInsert = {
        id: uuid,
        crew_member_id: dataWithoutId.crew_member_id,
        start_date: dataWithoutId.start_date,
        end_date: dataWithoutId.end_date,
        days_count: dataWithoutId.days_count,
        description: dataWithoutId.description,
        stand_back_days_required: dataWithoutId.stand_back_days_required,
        stand_back_days_completed: dataWithoutId.stand_back_days_completed,
        stand_back_days_remaining: dataWithoutId.stand_back_days_remaining,
        stand_back_status: dataWithoutId.stand_back_status,
        stand_back_history: dataWithoutId.stand_back_history || []
      }
      
      // Add optional fields if they exist (for backward compatibility)
      if (dataWithoutId.reason) {
        (dataToInsert as any).reason = dataWithoutId.reason
      }
      if (dataWithoutId.notes) {
        (dataToInsert as any).notes = dataWithoutId.notes
      }
      
      console.log('Data to insert (with generated UUID):', dataToInsert)
      console.log('Data to insert JSON:', JSON.stringify(dataToInsert, null, 2))
      
      // Validate required fields
      const requiredFields = ['id', 'crew_member_id', 'start_date', 'end_date', 'days_count', 'stand_back_days_required', 'stand_back_days_completed', 'stand_back_days_remaining', 'stand_back_status']
      const missingFields = requiredFields.filter(field => !(dataToInsert as any)[field] && (dataToInsert as any)[field] !== 0)
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields)
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
      }
      
      console.log('All required fields present, inserting to database...')
      
      const { data, error } = await supabase
        .from('stand_back_records')
        .insert([dataToInsert])
        .select()
      
      if (error) {
        console.error('❌ Supabase error adding stand back record:', error)
        console.error('❌ Error details:', JSON.stringify(error, null, 2))
        console.error('❌ Error code:', error.code)
        console.error('❌ Error message:', error.message)
        console.error('❌ Error hint:', error.hint)
        throw error
      }
      
      console.log('✅ Stand back record added successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('❌ Error adding stand back record:', err)
      console.error('❌ Error details:', JSON.stringify(err, null, 2))
      throw err
    }
  }

  const updateStandBackRecord = async (recordId: string, updates: any) => {
    try {
      console.log('Updating stand back record in Supabase:', recordId, updates)
      const { data, error } = await supabase
        .from('stand_back_records')
        .update(updates)
        .eq('id', recordId)
        .select()
      
      if (error) {
        console.error('Supabase error updating stand back record:', error)
        throw error
      }
      
      console.log('Stand back record updated successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error updating stand back record:', err)
      throw err
    }
  }

  const addLoan = async (loanData: any) => {
    try {
      console.log('Adding loan to Supabase:', loanData)
      const { data, error } = await supabase
        .from('loans')
        .insert([loanData])
        .select()
      
      if (error) {
        console.error('Supabase error adding loan:', error)
        throw error
      }
      
      console.log('Loan added successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error adding loan:', err)
      throw err
    }
  }

  const completeLoan = async (loanId: string, notes?: string) => {
    try {
      console.log('Completing loan in Supabase:', loanId)
      const { data, error } = await supabase
        .from('loans')
        .update({
          status: 'voltooid',
          completed_at: new Date().toISOString(),
          notes: notes || ""
        })
        .eq('id', loanId)
        .select()
      
      if (error) {
        console.error('Supabase error completing loan:', error)
        throw error
      }
      
      console.log('Loan completed successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error completing loan:', err)
      throw err
    }
  }

  const makePayment = async (loanId: string, paymentAmount: number, note?: string) => {
    try {
      console.log('Making payment for loan:', loanId, paymentAmount)
      
      // First, get the current loan
      const { data: loan, error: fetchError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single()
      
      if (fetchError || !loan) {
        throw new Error('Loan not found')
      }
      
      // Calculate new values
      const newPaid = (loan.amount_paid || 0) + paymentAmount
      const newRemaining = loan.amount - newPaid
      const newStatus = newRemaining <= 0 ? 'voltooid' : 'open'
      
      // Create payment history entry
      const paymentEntry = {
        date: new Date().toISOString(),
        amount: paymentAmount,
        note: note || 'Betaling afgetekend',
        paidBy: 'User'
      }
      
      // Update loan
      const { data, error } = await supabase
        .from('loans')
        .update({
          amount_paid: newPaid,
          amount_remaining: newRemaining,
          status: newStatus,
          completed_at: newStatus === 'voltooid' ? new Date().toISOString() : null,
          payment_history: [...(loan.payment_history || []), paymentEntry]
        })
        .eq('id', loanId)
        .select()
      
      if (error) {
        console.error('Supabase error making payment:', error)
        throw error
      }
      
      console.log('Payment made successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error making payment:', err)
      throw err
    }
  }

  // Trip functions
  const addTrip = async (tripData: any) => {
    try {
      console.log('Adding trip:', tripData)
      
      const { data, error } = await supabase
        .from('trips')
        .insert([tripData])
        .select()
      
      if (error) {
        console.error('Error adding trip:', error)
        throw error
      }
      
      console.log('Trip added successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error adding trip:', err)
      throw err
    }
  }

  const updateTrip = async (tripId: string, updates: any) => {
    try {
      console.log('Updating trip:', tripId, updates)
      
      const { data, error } = await supabase
        .from('trips')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', tripId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating trip:', error)
        throw error
      }
      
      console.log('Trip updated successfully:', data)
      
      // If trip is completed, auto-update vaste dienst records
      if (updates.status === 'voltooid' && data.aflosser_id) {
        console.log('🚀 Trip completed - auto-updating vaste dienst records')
        await autoUpdateVasteDienstFromTrip(data)
      }
      
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error updating trip:', err)
      throw err
    }
  }


  // Vaste dienst functions
  const addVasteDienstRecord = async (recordData: any) => {
    try {
      console.log('Adding vaste dienst record:', recordData)
      console.log('Record data details:', JSON.stringify(recordData, null, 2))
      
      // Validate required fields
      const requiredFields = ['aflosser_id', 'year', 'month', 'required_days', 'actual_days', 'balance_days']
      const missingFields = requiredFields.filter(field => recordData[field] === undefined || recordData[field] === null)
      
      if (missingFields.length > 0) {
        const error = new Error(`Missing required fields: ${missingFields.join(', ')}`)
        console.error('Validation error:', error)
        throw error
      }
      
      // Check if record already exists for this aflosser/year/month combination
      const { data: existingRecord, error: checkError } = await supabase
        .from('vaste_dienst_records')
        .select('id')
        .eq('aflosser_id', recordData.aflosser_id)
        .eq('year', recordData.year)
        .eq('month', recordData.month)
        .single()
      
      if (existingRecord) {
        console.log('Record already exists for this aflosser/year/month combination, updating instead')
        // Update existing record instead of creating new one
        const { data, error } = await supabase
          .from('vaste_dienst_records')
          .update({
            required_days: recordData.required_days,
            actual_days: recordData.actual_days,
            balance_days: recordData.balance_days,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select()
        
        if (error) {
          console.error('Error updating existing vaste dienst record:', error)
          throw error
        }
        
        console.log('Vaste dienst record updated successfully:', data)
        await loadData() // Reload all data
        return data
      }
      
      // If no existing record, create new one
      const { data, error } = await supabase
        .from('vaste_dienst_records')
        .insert([recordData])
        .select()
      
      if (error) {
        console.error('Supabase error adding vaste dienst record:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error hint:', error.hint)
        throw error
      }
      
      console.log('Vaste dienst record added successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error adding vaste dienst record:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      throw err
    }
  }

  const updateVasteDienstRecord = async (recordId: string, updates: any) => {
    try {
      console.log('Updating vaste dienst record:', recordId, updates)
      
      const { data, error } = await supabase
        .from('vaste_dienst_records')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', recordId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating vaste dienst record:', error)
        throw error
      }
      
      console.log('Vaste dienst record updated successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error updating vaste dienst record:', err)
      throw err
    }
  }

  const deleteVasteDienstRecord = async (recordId: string) => {
    try {
      console.log('Deleting vaste dienst record:', recordId)
      
      const { error } = await supabase
        .from('vaste_dienst_records')
        .delete()
        .eq('id', recordId)
      
      if (error) {
        console.error('Error deleting vaste dienst record:', error)
        throw error
      }
      
      console.log('Vaste dienst record deleted successfully')
      await loadData() // Reload all data
    } catch (err) {
      console.error('Error deleting vaste dienst record:', err)
      throw err
    }
  }

  // Delete trip permanently
  const deleteTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)
      
      if (error) {
        console.error('Supabase error deleting trip:', error)
        throw error
      }
      
      console.log('Trip deleted successfully')
      await loadData() // Reload all data
    } catch (err) {
      console.error('Error deleting trip:', err)
      throw err
    }
  }

  // Delete aflosser permanently
  const deleteAflosser = async (aflosserId: string) => {
    try {
      // First delete all related records
      await supabase.from('vaste_dienst_records').delete().eq('aflosser_id', aflosserId)
      await supabase.from('trips').delete().eq('aflosser_id', aflosserId)
      
      // Then delete the aflosser
      const { error } = await supabase
        .from('crew')
        .delete()
        .eq('id', aflosserId)
      
      if (error) {
        console.error('Supabase error deleting aflosser:', error)
        throw error
      }
      
      console.log('Aflosser deleted successfully')
      await loadData() // Reload all data
    } catch (err) {
      console.error('Error deleting aflosser:', err)
      throw err
    }
  }

  // Notes functions
  const addNoteToCrew = async (crewId: string, note: string) => {
    try {
      // Get current crew member data
      const { data: crewData, error: fetchError } = await supabase
        .from('crew')
        .select('active_notes')
        .eq('id', crewId)
        .single();

      if (fetchError) throw fetchError;

      // Parse existing notes or initialize empty array
      const currentNotes = crewData?.active_notes || [];
      
      // Add new note with timestamp
      const newNote = {
        id: Date.now().toString(), // Simple ID generation
        content: note,
        createdAt: new Date().toISOString(),
        createdBy: 'user' // You could get this from auth context
      };

      const updatedNotes = [...currentNotes, newNote];

      // Update crew member with new notes
      const { error: updateError } = await supabase
        .from('crew')
        .update({ active_notes: updatedNotes })
        .eq('id', crewId);

      if (updateError) throw updateError;

      console.log('Note added successfully')
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  const removeNoteFromCrew = async (crewId: string, noteId: string) => {
    try {
      // Get current crew member data
      const { data: crewData, error: fetchError } = await supabase
        .from('crew')
        .select('active_notes, archived_notes')
        .eq('id', crewId)
        .single();

      if (fetchError) throw fetchError;

      const currentActiveNotes = crewData?.active_notes || [];
      const currentArchivedNotes = crewData?.archived_notes || [];

      // Find the note to remove
      const noteToArchive = currentActiveNotes.find((note: any) => note.id === noteId);
      if (!noteToArchive) {
        throw new Error('Note not found');
      }

      // Remove from active notes
      const updatedActiveNotes = currentActiveNotes.filter((note: any) => note.id !== noteId);

      // Add to archived notes with archive timestamp
      const archivedNote = {
        ...noteToArchive,
        archivedAt: new Date().toISOString()
      };
      const updatedArchivedNotes = [...currentArchivedNotes, archivedNote];

      // Update crew member
      const { error: updateError } = await supabase
        .from('crew')
        .update({ 
          active_notes: updatedActiveNotes,
          archived_notes: updatedArchivedNotes
        })
        .eq('id', crewId);

      if (updateError) throw updateError;

      console.log('Note archived successfully')
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error removing note:', error);
      throw error;
    }
  };

  const deleteArchivedNote = async (crewId: string, noteId: string) => {
    try {
      // Get current crew member data
      const { data: crewData, error: fetchError } = await supabase
        .from('crew')
        .select('archived_notes')
        .eq('id', crewId)
        .single();

      if (fetchError) throw fetchError;

      const currentArchivedNotes = crewData?.archived_notes || [];

      // Remove from archived notes permanently
      const updatedArchivedNotes = currentArchivedNotes.filter((note: any) => note.id !== noteId);

      // Update crew member
      const { error: updateError } = await supabase
        .from('crew')
        .update({ 
          archived_notes: updatedArchivedNotes
        })
        .eq('id', crewId);

      if (updateError) throw updateError;

      console.log('Archived note deleted successfully')
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error deleting archived note:', error);
      throw error;
    }
  };

  // Add task
  const addTask = async (taskData: any) => {
    try {
      console.log('📝 Adding task with data:', JSON.stringify(taskData, null, 2))
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single()
      
      if (error) {
        console.error('❌ Supabase error adding task:', error)
        console.error('❌ Error code:', error.code)
        console.error('❌ Error message:', error.message)
        console.error('❌ Error details:', error.details)
        console.error('❌ Error hint:', error.hint)
        throw error
      }
      await loadData()
      return data
    } catch (err: any) {
      console.error('Error adding task:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      throw err
    }
  }

  // Update task
  const updateTask = async (taskId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
      
      if (error) throw error
      await loadData()
    } catch (err) {
      console.error('Error updating task:', err)
      throw err
    }
  }

  // Delete task
  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
      
      if (error) throw error
      await loadData()
    } catch (err) {
      console.error('Error deleting task:', err)
      throw err
    }
  }

  // Complete task
  const completeTask = async (taskId: string) => {
    try {
      // Haal eerst de gerelateerde ship_visit op (als die bestaat)
      const { data: taskData, error: fetchError } = await supabase
        .from('tasks')
        .select('id, related_ship_visit_id')
        .eq('id', taskId)
        .single()

      if (fetchError) throw fetchError

      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)
      
      if (error) throw error

      // Als deze taak gekoppeld is aan een scheepsbezoek, zet daar de follow-up uit
      if (taskData?.related_ship_visit_id) {
        try {
          const { error: visitError } = await supabase
            .from('ship_visits')
            .update({
              follow_up_needed: false,
              follow_up_notes: null
            })
            .eq('id', taskData.related_ship_visit_id)

          if (visitError) {
            console.error('Error updating related ship_visit after completing task:', visitError)
          }
        } catch (innerErr) {
          console.error('Unexpected error updating ship_visit for completed task:', innerErr)
        }
      }

      await loadData()
    } catch (err) {
      console.error('Error completing task:', err)
      throw err
    }
  }

  // Add incident
  const addIncident = async (incidentData: any) => {
    try {
      console.log('📝 Adding incident with data:', JSON.stringify(incidentData, null, 2))
      const { data, error } = await supabase
        .from('incidents')
        .insert([incidentData])
        .select()
        .single()
      
      if (error) {
        console.error('❌ Supabase error adding incident:', error)
        console.error('❌ Error code:', error.code)
        console.error('❌ Error message:', error.message)
        console.error('❌ Error details:', error.details)
        console.error('❌ Error hint:', error.hint)
        throw error
      }
      await loadData()
      return data
    } catch (err: any) {
      console.error('Error adding incident:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      throw err
    }
  }

  // Update incident
  const updateIncident = async (incidentId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', incidentId)
      
      if (error) throw error
      await loadData()
    } catch (err) {
      console.error('Error updating incident:', err)
      throw err
    }
  }

  // Delete incident
  const deleteIncident = async (incidentId: string) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .delete()
        .eq('id', incidentId)
      
      if (error) throw error
      await loadData()
    } catch (err) {
      console.error('Error deleting incident:', err)
      throw err
    }
  }

  return {
    ships,
    crew,
    sickLeave,
    standBackRecords,
    loans,
    trips,
    tasks,
    incidents,
    loading,
    error,
    loadData,
    crewColorTags,
    async setCrewColorTag(crewId: string, color: string | null) {
      try {
        if (!crewId) return
        if (color) {
          // upsert color
          const { error: upsertError } = await supabase
            .from('crew_color_tags')
            .upsert({ crew_id: crewId, color }, { onConflict: 'crew_id' })
          if (upsertError) throw upsertError
        } else {
          // delete color
          const { error: delError } = await supabase
            .from('crew_color_tags')
            .delete()
            .eq('crew_id', crewId)
          if (delError) throw delError
        }
        // update local state
        setCrewColorTags((prev) => {
          const next = { ...prev }
          if (color) next[crewId] = color
          else delete next[crewId]
          return next
        })
      } catch (e) {
        const err: any = e
        const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err))
        console.error('Error setting crew color tag:', msg)
        // If table missing, surface a clear hint once
        if (msg?.includes('relation') && msg?.includes('crew_color_tags')) {
          console.warn('Hint: create table crew_color_tags (crew_id uuid primary key references crew(id), color text not null)')
        }
        throw e
      }
    },
    addCrew,
    updateCrew,
    deleteCrew,
    addShip,
    updateShip,
    deleteShip,
    addSickLeave,
    updateSickLeave,
    addStandBackRecord,
    updateStandBackRecord,
    addLoan,
    completeLoan,
    makePayment,
    addTrip,
    updateTrip,
    deleteTrip,
    deleteAflosser,
    vasteDienstRecords,
    addVasteDienstRecord,
    updateVasteDienstRecord,
    deleteVasteDienstRecord,
    addNoteToCrew,
    removeNoteFromCrew,
    deleteArchivedNote,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    addIncident,
    updateIncident,
    deleteIncident
  }
} 
