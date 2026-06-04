"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Oude URL: terug-te-staan beheer staat nu onder Overwerkers. */
export default function SickLeaveHistoryPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/bemanning/aflossers?tab=overwerkers&subtab=terug-te-staan")
  }, [router])

  return null
}
