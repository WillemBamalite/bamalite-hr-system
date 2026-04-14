"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  role: "admin_full" | "limited_edit"
  mfaRequired: boolean
  loading: boolean
  canAccessPath: (path: string) => boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ADMIN_EMAILS = new Set([
  "leo@bamalite.com",
  "bart@bamalite.com",
  "jos@bamalite.com",
  "willem@bamalite.com",
])

const LIMITED_EMAILS = new Set([
  "tanja@bamalite.com",
  "karina@bamalite.com",
  "lucie@bamalite.com",
])

const LIMITED_ALLOWED_EXACT = new Set([
  "/",
  "/schepen/overzicht",
  "/bemanning/overzicht",
  "/ziekte",
  "/ziekte-history",
  "/bemanning/leningen",
  "/bemanning/loon-bemerkingen",
  "/firma-wisseling",
  "/bemanning/oude-bemanningsleden",
])

const LIMITED_ALLOWED_PREFIXES = [
  "/schepen/overzicht",
  "/ziekte",
  "/bemanning/leningen",
  "/firma-wisseling",
]

const LIMITED_BLOCKED_BEMANNING_SEGMENTS = new Set([
  "aflossers",
  "studenten",
  "medische-keuringen",
  "officiele-waarschuwingen",
  "nog-in-te-delen",
  "nieuw",
  "print",
  "rotatie-instellingen",
  "rotatie-kalender",
  "update",
  "tekorten",
])

const FIRMA_READONLY_EMAILS = new Set([
  "tanja@bamalite.com",
  "karina@bamalite.com",
  "lucie@bamalite.com",
])

function resolveRole(email?: string | null): "admin_full" | "limited_edit" {
  const e = (email || "").trim().toLowerCase()
  if (ADMIN_EMAILS.has(e)) return "admin_full"
  if (LIMITED_EMAILS.has(e)) return "limited_edit"
  return "limited_edit"
}

function canAccessPathForRole(role: "admin_full" | "limited_edit", path: string, email?: string | null): boolean {
  const normalized = path.split("?")[0]
  const emailLower = (email || "").trim().toLowerCase()
  if (normalized === "/login" || normalized === "/login/email-verify") return true
  if (
    emailLower === "jos@bamalite.com" &&
    (normalized === "/bemanning/loon-bemerkingen" || normalized.startsWith("/bemanning/loon-bemerkingen/"))
  ) {
    return false
  }
  if (role === "admin_full") return true
  if (emailLower === "lucie@bamalite.com") {
    if (
      normalized === "/ziekte" ||
      normalized.startsWith("/ziekte/") ||
      normalized === "/bemanning/leningen" ||
      normalized.startsWith("/bemanning/leningen/") ||
      normalized === "/bemanning/loon-bemerkingen" ||
      normalized.startsWith("/bemanning/loon-bemerkingen/")
    ) {
      return false
    }
  }
  if (FIRMA_READONLY_EMAILS.has(emailLower)) {
    if (
      normalized === "/firma-wisseling/wisseling" ||
      normalized.startsWith("/firma-wisseling/wisseling/") ||
      normalized === "/firma-wisseling/addendum" ||
      normalized.startsWith("/firma-wisseling/addendum/")
    ) {
      return false
    }
  }
  if (LIMITED_ALLOWED_EXACT.has(normalized)) return true
  // Allow crew profile pages like /bemanning/<id>, but keep blocked section pages closed.
  const bemanningMatch = normalized.match(/^\/bemanning\/([^/]+)$/)
  if (bemanningMatch) {
    const segment = (bemanningMatch[1] || "").toLowerCase()
    if (!LIMITED_BLOCKED_BEMANNING_SEGMENTS.has(segment)) return true
  }
  return LIMITED_ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<"admin_full" | "limited_edit">("limited_edit")
  const [mfaRequired, setMfaRequired] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshMfaState = async (nextUser: User | null) => {
    // TOTP-flow tijdelijk uitgeschakeld; we gebruiken e-mail verificatiestap.
    setMfaRequired(false)
  }

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setRole(resolveRole(nextUser?.email))
      await refreshMfaState(nextUser)
      setLoading(false)
    })

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setRole(resolveRole(nextUser?.email))
      await refreshMfaState(nextUser)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    return { error }
  }

  const signOut = async () => {
    // Clear local auth state immediately to avoid login-route redirect races.
    setUser(null)
    setLoading(false)
    await supabase.auth.signOut({ scope: "local" })
    setRole("limited_edit")
    setMfaRequired(false)
    router.replace('/login')
  }

  const canAccessPath = (path: string) => canAccessPathForRole(role, path, user?.email)

  return (
    <AuthContext.Provider value={{ user, role, mfaRequired, loading, canAccessPath, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

