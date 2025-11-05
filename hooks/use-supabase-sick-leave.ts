import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type SickLeave = Database['public']['Tables']['sick_leave']['Row']
type SickLeaveInsert = Database['public']['Tables']['sick_leave']['Insert']
type SickLeaveUpdate = Database['public']['Tables']['sick_leave']['Update']

export function useSupabaseSickLeave() {
  const [sickLeave, setSickLeave] = useState<SickLeave[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all sick leave records
  const fetchSickLeave = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sick_leave')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error
      setSickLeave(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Add new sick leave record
  const addSickLeave = async (sickLeaveRecord: SickLeaveInsert) => {
    try {
      const { data, error } = await supabase
        .from('sick_leave')
        .insert([sickLeaveRecord])
        .select()

      if (error) throw error
      await fetchSickLeave() // Refresh the list
      return data?.[0]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Update sick leave record
  const updateSickLeave = async (id: string, updates: SickLeaveUpdate) => {
    try {
      const { data, error } = await supabase
        .from('sick_leave')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()

      if (error) throw error
      await fetchSickLeave() // Refresh the list
      return data?.[0]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Delete sick leave record
  const deleteSickLeave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sick_leave')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchSickLeave() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Get active sick leave records
  const getActiveSickLeave = () => {
    return sickLeave.filter(record => 
      record.status === 'actief' || record.status === 'wacht-op-briefje'
    )
  }

  // Real-time subscription
  useEffect(() => {
    fetchSickLeave()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('sick_leave_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sick_leave'
        },
        () => {
          // Refresh data when changes occur
          fetchSickLeave()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    sickLeave,
    loading,
    error,
    addSickLeave,
    updateSickLeave,
    deleteSickLeave,
    getActiveSickLeave,
    refreshSickLeave: fetchSickLeave
  }
} 