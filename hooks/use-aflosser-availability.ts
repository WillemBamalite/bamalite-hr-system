import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { parseISO, format, isWithinInterval, isAfter, isBefore } from 'date-fns'

type AvailabilityPeriod = Database['public']['Tables']['aflosser_availability_periods']['Row']
type AvailabilityPeriodInsert = Database['public']['Tables']['aflosser_availability_periods']['Insert']
type AvailabilityPeriodUpdate = Database['public']['Tables']['aflosser_availability_periods']['Update']

// Hook to fetch all availability periods for all aflossers
export function useAllAflosserAvailability() {
  const [allPeriods, setAllPeriods] = useState<AvailabilityPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllPeriods = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('aflosser_availability_periods')
        .select('*')
        .order('start_date', { ascending: true })
      
      if (fetchError) {
        // If table doesn't exist yet, just return empty array
        if (fetchError.code === '42P01' || fetchError.message?.includes('does not exist')) {
          console.warn('Availability periods table does not exist yet. Please run the SQL script.')
          setAllPeriods([])
          return
        }
        throw fetchError
      }
      
      setAllPeriods(data || [])
    } catch (err: any) {
      console.error('Error fetching all availability periods:', err)
      // If table doesn't exist, just set empty array instead of error
      if (err.code === '42P01' || err.message?.includes('does not exist')) {
        setAllPeriods([])
        setError(null)
      } else {
        setError(err.message || 'Failed to fetch availability periods')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllPeriods()
  }, [])

  // Get availability status for a specific aflosser
  const getAvailabilityStatus = (crewId: string): { status: 'beschikbaar' | 'afwezig' | 'onbekend'; nextPeriod: AvailabilityPeriod | null } => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const aflosserPeriods = allPeriods.filter(p => p.crew_id === crewId)
    
    if (aflosserPeriods.length === 0) {
      return { status: 'onbekend', nextPeriod: null }
    }

    // Find periods that are currently active or upcoming
    const activeOrUpcoming = aflosserPeriods
      .filter(p => {
        const periodStart = parseISO(p.start_date)
        const periodEnd = p.end_date ? parseISO(p.end_date) : new Date('2099-12-31')
        return isAfter(periodEnd, today) || isWithinInterval(today, { start: periodStart, end: periodEnd })
      })
      .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())

    if (activeOrUpcoming.length === 0) {
      return { status: 'onbekend', nextPeriod: null }
    }

    // Check if currently in a period
    const currentPeriod = activeOrUpcoming.find(p => {
      const periodStart = parseISO(p.start_date)
      const periodEnd = p.end_date ? parseISO(p.end_date) : new Date('2099-12-31')
      return isWithinInterval(today, { start: periodStart, end: periodEnd })
    })

    if (currentPeriod) {
      return { status: currentPeriod.type, nextPeriod: currentPeriod }
    }

    // Not in any period, return the next upcoming period
    const nextPeriod = activeOrUpcoming[0]
    return { status: 'onbekend', nextPeriod }
  }

  return {
    allPeriods,
    loading,
    error,
    getAvailabilityStatus,
    refresh: fetchAllPeriods
  }
}

export function useAflosserAvailability(crewId?: string) {
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all periods for a specific aflosser
  const fetchPeriods = async () => {
    if (!crewId) {
      setPeriods([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('aflosser_availability_periods')
        .select('*')
        .eq('crew_id', crewId)
        .order('start_date', { ascending: true })
      
      if (fetchError) {
        // If table doesn't exist yet, just return empty array
        if (fetchError.code === '42P01' || fetchError.message?.includes('does not exist')) {
          console.warn('Availability periods table does not exist yet. Please run the SQL script.')
          setPeriods([])
          return
        }
        throw fetchError
      }
      
      setPeriods(data || [])
    } catch (err: any) {
      console.error('Error fetching availability periods:', err)
      // If table doesn't exist, just set empty array instead of error
      if (err.code === '42P01' || err.message?.includes('does not exist')) {
        setPeriods([])
        setError(null)
      } else {
        setError(err.message || 'Failed to fetch availability periods')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPeriods()
  }, [crewId])

  // Add new period
  const addPeriod = async (period: AvailabilityPeriodInsert) => {
    try {
      const { data, error: insertError } = await supabase
        .from('aflosser_availability_periods')
        .insert(period)
        .select()
        .single()
      
      if (insertError) throw insertError
      
      await fetchPeriods()
      return { data, error: null }
    } catch (err: any) {
      console.error('Error adding availability period:', err)
      return { data: null, error: err.message || 'Failed to add availability period' }
    }
  }

  // Update period
  const updatePeriod = async (id: string, updates: AvailabilityPeriodUpdate) => {
    try {
      const { data, error: updateError } = await supabase
        .from('aflosser_availability_periods')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      await fetchPeriods()
      return { data, error: null }
    } catch (err: any) {
      console.error('Error updating availability period:', err)
      return { data: null, error: err.message || 'Failed to update availability period' }
    }
  }

  // Delete period
  const deletePeriod = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('aflosser_availability_periods')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      
      await fetchPeriods()
      return { error: null }
    } catch (err: any) {
      console.error('Error deleting availability period:', err)
      return { error: err.message || 'Failed to delete availability period' }
    }
  }

  // Check if aflosser is absent during a date range
  const isAbsentDuringPeriod = (startDate: string, endDate?: string | null): { isAbsent: boolean; period: AvailabilityPeriod | null } => {
    if (!startDate) return { isAbsent: false, period: null }

    const tripStart = parseISO(startDate)
    const tripEnd = endDate ? parseISO(endDate) : tripStart

    // Check all absence periods
    const absencePeriods = periods.filter(p => p.type === 'afwezig')
    
    for (const period of absencePeriods) {
      const periodStart = parseISO(period.start_date)
      const periodEnd = period.end_date ? parseISO(period.end_date) : new Date('2099-12-31') // Open end = far future
      
      // Check if trip overlaps with absence period
      if (
        (isWithinInterval(tripStart, { start: periodStart, end: periodEnd }) ||
         isWithinInterval(tripEnd, { start: periodStart, end: periodEnd }) ||
         (isBefore(tripStart, periodStart) && isAfter(tripEnd, periodEnd)))
      ) {
        return { isAbsent: true, period }
      }
    }

    return { isAbsent: false, period: null }
  }

  // Get current availability status (for display in cards)
  const getCurrentAvailabilityStatus = (): { status: 'beschikbaar' | 'afwezig' | 'onbekend'; nextPeriod: AvailabilityPeriod | null } => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find periods that are currently active or upcoming
    const activeOrUpcoming = periods
      .filter(p => {
        const periodStart = parseISO(p.start_date)
        const periodEnd = p.end_date ? parseISO(p.end_date) : new Date('2099-12-31')
        return isAfter(periodEnd, today) || isWithinInterval(today, { start: periodStart, end: periodEnd })
      })
      .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())

    if (activeOrUpcoming.length === 0) {
      return { status: 'onbekend', nextPeriod: null }
    }

    // Check if currently in a period
    const currentPeriod = activeOrUpcoming.find(p => {
      const periodStart = parseISO(p.start_date)
      const periodEnd = p.end_date ? parseISO(p.end_date) : new Date('2099-12-31')
      return isWithinInterval(today, { start: periodStart, end: periodEnd })
    })

    if (currentPeriod) {
      return { status: currentPeriod.type, nextPeriod: currentPeriod }
    }

    // Not in any period, return the next upcoming period
    const nextPeriod = activeOrUpcoming[0]
    return { status: 'onbekend', nextPeriod }
  }

  return {
    periods,
    loading,
    error,
    addPeriod,
    updatePeriod,
    deletePeriod,
    isAbsentDuringPeriod,
    getCurrentAvailabilityStatus,
    refresh: fetchPeriods
  }
}

