import { useMemo } from "react"

import { useSupabaseData as useSupabaseDataNew } from "./use-supabase-data-new"

export function calculateWorkDaysVasteDienst(startDate?: string | null, endDate?: string | null): number {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  if (end < start) return 0
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1
}

export function useSupabaseData() {
  const data = useSupabaseDataNew() as any

  return useMemo(
    () => ({
      ...data,
      incidents: data?.incidents || [],
      tasks: data?.tasks || [],
      trips: data?.trips || [],
      vasteDienstRecords: data?.vasteDienstRecords || [],
      vasteDienstMindagen: data?.vasteDienstMindagen || [],
      deleteAflosser: data?.deleteAflosser || (async () => {}),
      updateTrip: data?.updateTrip || (async () => {}),
      addVasteDienstMindag: data?.addVasteDienstMindag || (async () => {}),
      deleteVasteDienstMindag: data?.deleteVasteDienstMindag || (async () => {}),
    }),
    [data]
  )
}
