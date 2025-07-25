import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type CrewMember = Database['public']['Tables']['crew']['Row']
type CrewInsert = Database['public']['Tables']['crew']['Insert']
type CrewUpdate = Database['public']['Tables']['crew']['Update']

export function useSupabaseCrew() {
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all crew members
  const fetchCrew = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('crew')
        .select('*')
        .order('first_name')

      if (error) throw error
      setCrew(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Add new crew member
  const addCrewMember = async (crewMember: CrewInsert) => {
    try {
      const { data, error } = await supabase
        .from('crew')
        .insert([crewMember])
        .select()

      if (error) throw error
      await fetchCrew() // Refresh the list
      return data?.[0]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Update crew member
  const updateCrewMember = async (id: string, updates: CrewUpdate) => {
    try {
      const { data, error } = await supabase
        .from('crew')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()

      if (error) throw error
      await fetchCrew() // Refresh the list
      return data?.[0]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Delete crew member
  const deleteCrewMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from('crew')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchCrew() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Real-time subscription
  useEffect(() => {
    fetchCrew()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('crew_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crew'
        },
        () => {
          // Refresh data when changes occur
          fetchCrew()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    crew,
    loading,
    error,
    addCrewMember,
    updateCrewMember,
    deleteCrewMember,
    refreshCrew: fetchCrew
  }
} 