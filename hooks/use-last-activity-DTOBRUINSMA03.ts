import { useMemo } from "react"

import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useShipVisits } from "@/hooks/use-ship-visits"

export function useLastActivity() {
  const { tasks = [], sickLeave = [], crew = [] } = useSupabaseData() as any
  const { visits = [] } = useShipVisits()

  return useMemo(() => {
    const candidates: Array<{ type: string; date: string | null | undefined; payload?: any }> = [
      ...tasks.map((t: any) => ({ type: "task", date: t.updated_at || t.created_at, payload: t })),
      ...sickLeave.map((s: any) => ({ type: "sick_leave", date: s.updated_at || s.created_at || s.start_date, payload: s })),
      ...crew.map((c: any) => ({ type: "crew", date: c.updated_at || c.created_at, payload: c })),
      ...visits.map((v: any) => ({ type: "visit", date: v.updated_at || v.created_at || v.visit_date, payload: v })),
    ].filter((c) => !!c.date)

    if (!candidates.length) {
      return { lastActivityAt: null, lastActivityType: null, lastActivity: null }
    }

    const latest = candidates.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())[0]
    return {
      lastActivityAt: latest.date,
      lastActivityType: latest.type,
      lastActivity: latest.payload,
    }
  }, [tasks, sickLeave, crew, visits])
}
