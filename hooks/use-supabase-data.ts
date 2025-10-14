import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

export function useSupabaseData() {
  const [ships, setShips] = useState<any[]>([])
  const [crew, setCrew] = useState<any[]>([])
  const [sickLeave, setSickLeave] = useState<any[]>([])
  const [standBackRecords, setStandBackRecords] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all data from Supabase
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
        setLoading(false)
        return
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
        
        // Check en activeer crew members die vandaag moeten starten
        await autoActivateCrewMembers(crewData || [])
        
        // Check en roteer crew members automatisch
        await autoRotateCrewMembers(crewData || [])
        
        // Herlaad crew data NA de automatische rotaties
        console.log('Reloading crew after auto-rotation...')
        const { data: updatedCrewData, error: reloadError } = await supabase
          .from('crew')
          .select('*')
          .order('first_name')
        
        if (reloadError) {
          console.error('Error reloading crew:', reloadError)
          setCrew(crewData || [])
        } else {
          console.log('Crew reloaded after rotation:', updatedCrewData?.length || 0)
          setCrew(updatedCrewData || [])
        }
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
      
      console.log('Data loading completed!')

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
    
    // Check elke 24 uur voor automatische activaties
    const dailyCheck = setInterval(() => {
      console.log('Running daily auto-activation check...')
      loadData() // Dit zal autoActivateCrewMembers aanroepen
    }, 24 * 60 * 60 * 1000) // 24 uur
    
    return () => clearInterval(dailyCheck)
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

    return () => {
      shipsSubscription.unsubscribe()
      crewSubscription.unsubscribe()
      sickLeaveSubscription.unsubscribe()
      standBackSubscription.unsubscribe()
      loansSubscription.unsubscribe()
    }
  }, [])

  // Add crew member
  const addCrew = async (crewData: any) => {
    try {
      console.log('Adding crew member to Supabase:', crewData)
      
      const { data, error } = await supabase
        .from('crew')
        .insert([crewData])
        .select()
        .single()

      if (error) {
        console.error('Supabase error adding crew:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log('Crew member added successfully:', data)
      await loadData()
      return data
    } catch (err) {
      console.error('Error adding crew:', err)
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
      const { data, error } = await supabase
        .from('sick_leave')
        .insert([sickLeaveData])
        .select()
        .single()

      if (error) throw error

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
      const { data, error } = await supabase
        .from('sick_leave')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error updating sick leave:', err)
      throw err
    }
  }

  const addStandBackRecord = async (recordData: any) => {
    try {
      console.log('Adding stand back record to Supabase:', recordData)
      const { data, error } = await supabase
        .from('stand_back_records')
        .insert([recordData])
        .select()
      
      if (error) {
        console.error('Supabase error adding stand back record:', error)
        throw error
      }
      
      console.log('Stand back record added successfully:', data)
      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error adding stand back record:', err)
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
          notes: notes || null
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

  return {
    ships,
    crew,
    sickLeave,
    standBackRecords,
    loans,
    loading,
    error,
    loadData,
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
  }
} 
