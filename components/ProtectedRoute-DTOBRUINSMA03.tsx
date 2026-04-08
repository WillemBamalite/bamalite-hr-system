"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/contexts/AuthContext"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, canAccessPath } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (!canAccessPath(pathname || "/")) {
      router.replace("/")
    }
  }, [loading, user, canAccessPath, pathname, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Laden...</div>
  }

  if (!user) return null
  if (!canAccessPath(pathname || "/")) return null

  return <>{children}</>
}
