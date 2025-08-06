import { useState, useEffect } from 'react'
import { supabase, Ship, Crew, SickLeave } from '@/lib/supabase'

export function useSupabaseData() {
  const [ships, setShips] = useState<Ship[]>([])
  const [crew, setCrew] = useState<Crew[]>([])
  const [sickLeave, setSickLeave] = useState<SickLeave[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true)
      
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
        .eq('status', 'actief')
        .order('start_date')
      
      if (sickLeaveError) throw sickLeaveError
      
      setShips(shipsData || [])
      setCrew(crewData || [])
      setSickLeave(sickLeaveData || [])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Add ship
  const addShip = async (ship: Omit<Ship, 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('ships')
        .insert([ship])
        .select()
      
      if (error) throw error
      
      await loadData()
      return data?.[0]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Add crew member
  const addCrew = async (crewMember: Omit<Crew, 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('crew')
        .insert([crewMember])
        .select()
      
      if (error) throw error
      
      await loadData()
      return data?.[0]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Update crew member
  const updateCrew = async (id: string, updates: Partial<Crew>) => {
    try {
      const { data, error } = await supabase
        .from('crew')
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) throw error
      
      await loadData()
      return data?.[0]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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
      
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  return {
    ships,
    crew,
    sickLeave,
    loading,
    error,
    loadData,
    addShip,
    addCrew,
    updateCrew,
    deleteCrew
  }
} 