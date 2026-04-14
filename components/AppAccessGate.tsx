"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

const ENABLE_EMAIL_VERIFY_LOGIN_FLOW = false

export function AppAccessGate({ children }: { children: React.ReactNode }) {
  const { user, role, mfaRequired, loading, canAccessPath } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginRoute = pathname.startsWith("/login")

  useEffect(() => {
    if (loading) return
    const pendingEmailVerifyRaw =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("pending_email_verify") === "1"
    const pendingEmailVerify = ENABLE_EMAIL_VERIFY_LOGIN_FLOW && pendingEmailVerifyRaw
    const pendingEmail =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("pending_email_verify_email") || ""
        : ""

    if (isLoginRoute) {
      // Login-flow regels eerst toepassen om redirect-races te voorkomen.
      if (pathname === "/login" && pendingEmailVerify) {
        const query = pendingEmail ? `?email=${encodeURIComponent(pendingEmail)}` : ""
        router.replace(`/login/email-verify${query}`)
        return
      }
      if (pathname === "/login" && user && !pendingEmailVerify) {
        router.replace("/")
      }
      return
    }

    if (!user && !isLoginRoute) {
      router.push("/login")
      return
    }

    if (user && pendingEmailVerify && pathname !== "/login/email-verify") {
      const query = pendingEmail ? `?email=${encodeURIComponent(pendingEmail)}` : ""
      router.push(`/login/email-verify${query}`)
      return
    }

    if (user && !canAccessPath(pathname)) {
      router.push("/schepen/overzicht")
    }
  }, [user, loading, pathname, canAccessPath, router, role, mfaRequired, isLoginRoute])

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

  if (!user && !isLoginRoute) return null
  if (user && !canAccessPath(pathname)) return null

  return <>{children}</>
}

