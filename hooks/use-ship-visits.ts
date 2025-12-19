import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type ShipVisit = Database['public']['Tables']['ship_visits']['Row']
type ShipVisitInsert = Database['public']['Tables']['ship_visits']['Insert']
type ShipVisitUpdate = Database['public']['Tables']['ship_visits']['Update']

export function useShipVisits() {
  const [visits, setVisits] = useState<ShipVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all visits
  const fetchVisits = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('ship_visits')
        .select('*')
        .order('visit_date', { ascending: false })
      
      if (fetchError) throw fetchError
      
      setVisits(data || [])
    } catch (err: any) {
      console.error('Error fetching ship visits:', err)
      setError(err.message || 'Failed to fetch ship visits')
    } finally {
      setLoading(false)
    }
  }

  // Add new visit
  const addVisit = async (visit: ShipVisitInsert) => {
    try {
      console.log('Adding ship visit with data:', JSON.stringify(visit, null, 2))
      
      const { data, error: insertError } = await supabase
        .from('ship_visits')
        .insert(visit)
        .select()
        .single()
      
      if (insertError) {
        console.error('Supabase insert error:', insertError)
        console.error('Error code:', insertError.code)
        console.error('Error message:', insertError.message)
        console.error('Error details:', insertError.details)
        console.error('Error hint:', insertError.hint)
        throw insertError
      }
      
      // Refresh visits
      await fetchVisits()
      
      return { data, error: null }
    } catch (err: any) {
      console.error('Error adding ship visit:', err)
      console.error('Error type:', typeof err)
      console.error('Error keys:', Object.keys(err || {}))
      
      const errorMessage = err?.message || err?.details || err?.hint || JSON.stringify(err) || 'Failed to add ship visit'
      return { data: null, error: errorMessage }
    }
  }

  // Update visit
  const updateVisit = async (id: string, updates: ShipVisitUpdate) => {
    try {
      const { data, error: updateError } = await supabase
        .from('ship_visits')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      // Refresh visits
      await fetchVisits()
      
      return { data, error: null }
    } catch (err: any) {
      console.error('Error updating ship visit:', err)
      return { data: null, error: err.message || 'Failed to update ship visit' }
    }
  }

  // Delete visit
  const deleteVisit = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('ship_visits')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      
      // Refresh visits
      await fetchVisits()
      
      return { error: null }
    } catch (err: any) {
      console.error('Error deleting ship visit:', err)
      return { error: err.message || 'Failed to delete ship visit' }
    }
  }

  // Get visits for a specific ship
  const getVisitsByShip = (shipId: string) => {
    return visits.filter(v => v.ship_id === shipId)
  }

  // Get last visit for a specific ship (meest recente bezoek)
  const getLastVisitByShip = (shipId: string) => {
    const shipVisits = getVisitsByShip(shipId)
    if (shipVisits.length === 0) return null
    
    // Sorteer op datum (nieuwste eerst), en dan op tijd als die er is
    const sorted = [...shipVisits].sort((a, b) => {
      const dateA = new Date(a.visit_date)
      const dateB = new Date(b.visit_date)
      
      // Vergelijk eerst op datum
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB.getTime() - dateA.getTime()
      }
      
      // Als datum gelijk is, vergelijk op tijd
      if (a.visit_time && b.visit_time) {
        return b.visit_time.localeCompare(a.visit_time)
      }
      
      // Als alleen a tijd heeft, komt die later
      if (a.visit_time) return -1
      // Als alleen b tijd heeft, komt die later
      if (b.visit_time) return 1
      
      return 0
    })
    
    return sorted[0]
  }

  // Get ships that haven't been visited in X days
  // Een schip telt alleen als "bezocht" als BEIDE ploegen (A en B) bezocht zijn
  const getShipsNotVisitedInDays = (days: number, allShips: any[]) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return allShips.filter(ship => {
      const shipVisits = getVisitsByShip(ship.id)
      
      // Check of beide ploegen bezocht zijn
      const visitedPloegen = new Set(shipVisits.map(v => v.ploeg).filter(Boolean))
      const hasPloegA = visitedPloegen.has('A')
      const hasPloegB = visitedPloegen.has('B')
      
      // Als niet beide ploegen bezocht zijn, telt het schip als "niet bezocht"
      if (!hasPloegA || !hasPloegB) {
        return true
      }
      
      // Als beide ploegen bezocht zijn, check de laatste bezoekdatum van beide
      const lastVisitA = shipVisits.filter(v => v.ploeg === 'A').sort((a, b) => 
        new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
      )[0]
      const lastVisitB = shipVisits.filter(v => v.ploeg === 'B').sort((a, b) => 
        new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
      )[0]
      
      // Neem de meest recente bezoekdatum van beide ploegen
      const lastVisit = lastVisitA && lastVisitB
        ? (new Date(lastVisitA.visit_date) > new Date(lastVisitB.visit_date) ? lastVisitA : lastVisitB)
        : (lastVisitA || lastVisitB)
      
      if (!lastVisit) return true
      
      const visitDate = new Date(lastVisit.visit_date)
      visitDate.setHours(0, 0, 0, 0)
      
      const diffTime = today.getTime() - visitDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays >= days
    })
  }

  useEffect(() => {
    fetchVisits()
  }, [])

  return {
    visits,
    loading,
    error,
    addVisit,
    updateVisit,
    deleteVisit,
    getVisitsByShip,
    getLastVisitByShip,
    getShipsNotVisitedInDays,
    refreshVisits: fetchVisits
  }
}

