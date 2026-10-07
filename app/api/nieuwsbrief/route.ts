import { NextRequest, NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/api-security"
import { createServerSupabase } from "@/lib/supabase-server"
import { normalizeContent } from "@/utils/newsletter-content"

export const runtime = "nodejs"

const BUCKET = "newsletter-editions"

function editionIdFrom(value: unknown) {
  const id = String(value || "")
  return /^\d{4}-\d{2}$/.test(id) ? id : ""
}

function bearer(request: NextRequest) {
  const auth = request.headers.get("authorization") || ""
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : ""
}

async function callerEmail(request: NextRequest) {
  const token = bearer(request)
  if (!token) return null
  const { createClient } = await import("@supabase/supabase-js")
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ocwraavhrtpvbqlkwnlb.supabase.co"
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04"
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data } = await client.auth.getUser(token)
  return data.user?.email || null
}

async function ensureBucket(admin: ReturnType<typeof createServerSupabase>) {
  const { data: buckets, error } = await admin.storage.listBuckets()
  if (error) throw new Error(error.message)
  if ((buckets || []).some((bucket) => bucket.name === BUCKET)) return
  const { error: createError } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
  })
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message)
  }
}

async function readStored(admin: ReturnType<typeof createServerSupabase>, editionId: string) {
  const { data, error } = await admin.storage.from(BUCKET).download(`${editionId}.json`)
  if (error || !data) return null
  try {
    const parsed = JSON.parse(await data.text())
    return {
      content: normalizeContent(parsed?.content, editionId),
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError
    const editionId = editionIdFrom(request.nextUrl.searchParams.get("edition"))
    if (!editionId) {
      return NextResponse.json({ success: false, error: "Ongeldige editie." }, { status: 400 })
    }
    const admin = createServerSupabase()
    await ensureBucket(admin)
    const stored = await readStored(admin, editionId)
    return NextResponse.json(
      { success: true, content: stored?.content || null, updatedAt: stored?.updatedAt || null },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Laden mislukt."
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError
    const body = await request.json().catch(() => null)
    const editionId = editionIdFrom(body?.editionId)
    if (!editionId) {
      return NextResponse.json({ success: false, error: "Ongeldige editie." }, { status: 400 })
    }
    const content = normalizeContent(body?.content, editionId)
    const payloadText = JSON.stringify(content)
    if (payloadText.length > 7_000_000) {
      return NextResponse.json(
        { success: false, error: "De nieuwsbrief is te groot om op te slaan. Gebruik kleinere foto's." },
        { status: 413 }
      )
    }
    const admin = createServerSupabase()
    await ensureBucket(admin)
    const updatedAt = new Date().toISOString()
    const updatedBy = await callerEmail(request)
    const { error } = await admin.storage.from(BUCKET).upload(
      `${editionId}.json`,
      JSON.stringify({ content, updatedAt, updatedBy }),
      { contentType: "application/json", upsert: true }
    )
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, updatedAt })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Opslaan mislukt."
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
