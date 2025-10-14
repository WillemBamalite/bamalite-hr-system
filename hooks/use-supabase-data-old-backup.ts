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
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSync, setPendingSync] = useState(false)

  // Clear localStorage data on first load (clean slate)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear all existing data for clean start
      localStorage.removeItem('crewDatabase');
      localStorage.removeItem('ships');
      
      console.log('✅ localStorage cleared! Ready for fresh start');
    }
  }, []);

  // Load all data from localStorage only
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Use localStorage data directly (no Supabase)
      const shipsData = JSON.parse(localStorage.getItem('ships') || '[]')
      const crewData = Object.values(JSON.parse(localStorage.getItem('crewDatabase') || '{}'))
      
      setShips(shipsData)
      setCrew(crewData)
      setSickLeave([])
      setLoans([])
      setStandBackRecords([])
      
      setLoading(false)
      
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      setLoading(false)
    }
  }

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncToSupabase() // Sync when coming back online
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check initial status
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync localStorage data to Supabase
  const syncToSupabase = async () => {
    if (!isOnline) return
    
    try {
      setPendingSync(true)
      
      // Sync ships
      const shipsData = JSON.parse(localStorage.getItem('ships') || '[]')
      for (const ship of shipsData) {
        await supabase.from('ships').upsert(ship)
      }
      
      // Sync crew
      const crewData = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
      for (const crewMember of Object.values(crewData)) {
        await supabase.from('crew').upsert(crewMember)
      }
      
      console.log('✅ Data synced to Supabase')
    } catch (error) {
      console.error('❌ Sync failed:', error)
    } finally {
      setPendingSync(false)
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
    standBackRecords,
    loans,
    loading,
    error,
    isOnline,
    pendingSync,
    loadData,
    syncToSupabase,
    addCrew: async (crewData: any) => {
      const id = crewData.id || `crew-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newCrew = { ...crewData, id }
      
      const existing = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
      existing[id] = newCrew
      localStorage.setItem('crewDatabase', JSON.stringify(existing))
      
      setCrew(Object.values(existing))
      
      // Try to sync to Supabase if online
      if (isOnline) {
        try {
          await supabase.from('crew').upsert(newCrew)
        } catch (error) {
          console.error('Failed to sync crew to Supabase:', error)
        }
      }
      
      return newCrew
    },
    addShip: async (shipData: any) => {
      const id = shipData.id || `ship-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newShip = { ...shipData, id }
      
      const existing = JSON.parse(localStorage.getItem('ships') || '[]')
      existing.push(newShip)
      localStorage.setItem('ships', JSON.stringify(existing))
      
      setShips(existing)
      
      // Try to sync to Supabase if online
      if (isOnline) {
        try {
          await supabase.from('ships').upsert(newShip)
        } catch (error) {
          console.error('Failed to sync ship to Supabase:', error)
        }
      }
      
      return newShip
    },
    updateCrew: async (id: string, updates: any) => {
      const existing = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
      if (existing[id]) {
        existing[id] = { ...existing[id], ...updates }
        localStorage.setItem('crewDatabase', JSON.stringify(existing))
        setCrew(Object.values(existing))
        
        // Try to sync to Supabase if online
        if (isOnline) {
          try {
            await supabase.from('crew').update(updates).eq('id', id)
          } catch (error) {
            console.error('Failed to sync crew update to Supabase:', error)
          }
        }
      }
    }
  }
} 