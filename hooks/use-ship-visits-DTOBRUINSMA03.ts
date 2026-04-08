import { useCallback, useEffect, useMemo, useState } from "react"

import { supabase } from "@/lib/supabase"

export function useShipVisits() {
  const [visits, setVisits] = useState<any[]>([])

  const loadVisits = useCallback(async () => {
    const { data, error } = await supabase
      .from("ship_visits")
      .select("*")
      .order("visit_date", { ascending: false })
    if (error) {
      console.error("Failed to load ship visits:", error.message)
      return
    }
    setVisits(data || [])
  }, [])

  useEffect(() => {
    loadVisits()
  }, [loadVisits])

  const getShipsNotVisitedInDays = useCallback((days: number, ships: any[]) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return (ships || []).filter((ship: any) => {
      const shipVisits = visits
        .filter((v: any) => v.ship_id === ship.id)
        .sort((a: any, b: any) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
      const latest = shipVisits[0]
      if (!latest?.visit_date) return true
      const d = new Date(latest.visit_date)
      d.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= days
    })
  }, [visits])

  return useMemo(
    () => ({
      visits,
      getShipsNotVisitedInDays,
      reloadVisits: loadVisits,
    }),
    [visits, getShipsNotVisitedInDays, loadVisits]
  )
}
