import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireApiAccess } from "@/lib/api-security"

function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || ""
  if (!auth.toLowerCase().startsWith("bearer ")) return null
  return auth.slice(7).trim() || null
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ocwraavhrtpvbqlkwnlb.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04"

async function getCallerEmail(token: string | null): Promise<string> {
  if (!token) return ""
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data } = await supabase.auth.getUser(token)
  return String(data?.user?.email || "").toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const token = getBearerToken(request)
    const email = await getCallerEmail(token)
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Geen gebruiker gevonden" },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const subscription = body?.subscription || body
    const endpoint = String(subscription?.endpoint || "")
    const p256dh = String(subscription?.keys?.p256dh || "")
    const auth = String(subscription?.keys?.auth || "")
    const userAgent = String(body?.userAgent || request.headers.get("user-agent") || "")

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { success: false, error: "Onvolledige subscription" },
        { status: 400 }
      )
    }

    const adminKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
    const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error } = await supabaseAdmin
      .from("web_push_subscriptions")
      .upsert(
        {
          user_email: email,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent || null,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      )

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Onbekende fout" },
      { status: 500 }
    )
  }
}
