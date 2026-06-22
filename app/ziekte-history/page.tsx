"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

/** Oude URL: doorverwijzen naar terug-te-staan (Karina) of overwerkers-tab (overige). */
export default function SickLeaveHistoryPage() {
  const router = useRouter()
  const { canAccessPath, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (canAccessPath("/bemanning/terug-te-staan")) {
      router.replace("/bemanning/terug-te-staan")
      return
    }
    if (canAccessPath("/bemanning/aflossers")) {
      router.replace("/bemanning/aflossers?tab=overwerkers&subtab=terug-te-staan")
      return
    }
    router.replace("/ziekte")
  }, [router, canAccessPath, loading])

  return null
}
