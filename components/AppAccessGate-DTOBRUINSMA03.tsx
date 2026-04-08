"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export function AppAccessGate({ children }: { children: React.ReactNode }) {
  const { user, role, loading, canAccessPath } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    if (!user && pathname !== "/login") {
      router.push("/login")
      return
    }

    if (user && pathname === "/login") {
      router.push("/")
      return
    }

    if (user && !canAccessPath(pathname)) {
      router.push("/schepen/overzicht")
    }
  }, [user, loading, pathname, canAccessPath, router, role])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  if (!user && pathname !== "/login") return null
  if (user && !canAccessPath(pathname)) return null

  return <>{children}</>
}

