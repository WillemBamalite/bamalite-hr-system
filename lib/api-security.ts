import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

type AccessMode = "authenticated" | "admin" | "cron_or_admin"

const ADMIN_EMAILS = new Set([
  "leo@bamalite.com",
  "bart@bamalite.com",
  "jos@bamalite.com",
  "willem@bamalite.com",
])

function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || ""
  if (!auth.toLowerCase().startsWith("bearer ")) return null
  return auth.slice(7).trim() || null
}

function isValidCronToken(token: string | null): boolean {
  if (!token) return false
  const cronSecret = process.env.CRON_SECRET
  const internalSecret = process.env.INTERNAL_API_SECRET
  return token === cronSecret || token === internalSecret
}

async function getUserFromToken(token: string) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://ocwraavhrtpvbqlkwnlb.supabase.co"
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04"
  if (!supabaseUrl || !supabaseAnonKey) return null

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

function deny(message = "Unauthorized", status = 401) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function requireApiAccess(
  request: NextRequest,
  mode: AccessMode
): Promise<NextResponse | null> {
  const token = getBearerToken(request)

  if (mode === "cron_or_admin" && isValidCronToken(token)) {
    return null
  }

  if (!token) return deny("Missing authorization token")
  const user = await getUserFromToken(token)
  if (!user) return deny("Invalid or expired token")

  if (mode === "admin" || mode === "cron_or_admin") {
    const email = (user.email || "").toLowerCase()
    if (!ADMIN_EMAILS.has(email)) return deny("Forbidden", 403)
  }

  return null
}
