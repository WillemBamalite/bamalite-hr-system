"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function OverwerkersPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/bemanning/aflossers?tab=overwerkers")
  }, [router])

  return null
}
