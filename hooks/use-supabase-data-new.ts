import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

      // Load ships
      const { data: shipsData, error: shipsError } = await supabase
        .from('ships')
        .select('*')
        .order('name')

      if (shipsError) throw shipsError

      // Load crew
      const { data: crewData, error: crewError } = await supabase
        .from('crew')
        .select('*')
        .order('first_name')

      if (crewError) throw crewError

      // Load sick leave
      const { data: sickLeaveData, error: sickLeaveError } = await supabase
        .from('sick_leave')
        .select('*')
        .order('start_date', { ascending: false })

      if (sickLeaveError) throw sickLeaveError

      // Load stand back days
      const { data: standBackData, error: standBackError } = await supabase
        .from('stand_back_days')
        .select('*')
        .order('created_at', { ascending: false })

      if (standBackError) throw standBackError

      // Load loans
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false })

      if (loansError) throw loansError

      // Set all data
      setShips(shipsData || [])
      setCrew(crewData || [])
      setSickLeave(sickLeaveData || [])
      setStandBackRecords(standBackData || [])
      setLoans(loansData || [])

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading data:', message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData()
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

    return () => {
      shipsSubscription.unsubscribe()
      crewSubscription.unsubscribe()
      sickLeaveSubscription.unsubscribe()
    }
  }, [])

  // Add crew member
  const addCrew = async (crewData: any) => {
    try {
      const { data, error } = await supabase
        .from('crew')
        .insert([crewData])
        .select()
        .single()

      if (error) throw error

      await loadData() // Reload all data
      return data
    } catch (err) {
      console.error('Error adding crew:', err)
      throw err
    }
  }

  // Update crew member
  const updateCrew = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('crew')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await loadData() // Reload all data
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
      const { data, error } = await supabase
        .from('ships')
        .insert([shipData])
        .select()
        .single()

      if (error) throw error

      await loadData() // Reload all data
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
  }
}

