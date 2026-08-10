import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireApiAccess } from "@/lib/api-security"
import { createServerSupabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

const BUCKET = "schepen-klad"
const OBJECT_PATH = "shared.json"

type KladHealthOverride = "ziek" | "beter"
type KladPlacement = {
  shipId: string
  column: "aan-boord" | "thuis" | "afwezig"
}

export type SchepenKladStored = {
  placements: Record<string, KladPlacement>
  originals: Record<string, KladPlacement>
  onBoardFromDates: Record<string, string>
  healthOverrides: Record<string, KladHealthOverride>
  kladDate: string | null
  updatedAt: string
  updatedBy: string | null
}

function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || ""
  if (!auth.toLowerCase().startsWith("bearer ")) return null
  return auth.slice(7).trim() || null
}

async function getCallerEmail(token: string | null): Promise<string | null> {
  if (!token) return null
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://ocwraavhrtpvbqlkwnlb.supabase.co"
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04"
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data } = await supabase.auth.getUser(token)
  return data?.user?.email ? String(data.user.email).toLowerCase() : null
}

function isValidPlacement(value: any): value is KladPlacement {
  if (!value || typeof value !== "object") return false
  if (typeof value.shipId !== "string" || !value.shipId) return false
  return value.column === "aan-boord" || value.column === "thuis" || value.column === "afwezig"
}

function sanitizePlacements(raw: any): Record<string, KladPlacement> {
  const next: Record<string, KladPlacement> = {}
  if (!raw || typeof raw !== "object") return next
  for (const [id, value] of Object.entries(raw)) {
    if (isValidPlacement(value)) next[id] = value
  }
  return next
}

function sanitizeDates(raw: any): Record<string, string> {
  const next: Record<string, string> = {}
  if (!raw || typeof raw !== "object") return next
  for (const [id, value] of Object.entries(raw)) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) next[id] = value
  }
  return next
}

function sanitizeHealth(raw: any): Record<string, KladHealthOverride> {
  const next: Record<string, KladHealthOverride> = {}
  if (!raw || typeof raw !== "object") return next
  for (const [id, value] of Object.entries(raw)) {
    if (value === "ziek" || value === "beter") next[id] = value
  }
  return next
}

function emptyPayload(updatedBy: string | null = null): SchepenKladStored {
  return {
    placements: {},
    originals: {},
    onBoardFromDates: {},
    healthOverrides: {},
    kladDate: null,
    updatedAt: new Date().toISOString(),
    updatedBy,
  }
}

function normalizePayload(raw: any, updatedBy: string | null): SchepenKladStored {
  return {
    placements: sanitizePlacements(raw?.placements),
    originals: sanitizePlacements(raw?.originals),
    onBoardFromDates: sanitizeDates(raw?.onBoardFromDates),
    healthOverrides: sanitizeHealth(raw?.healthOverrides),
    kladDate:
      typeof raw?.kladDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.kladDate)
        ? raw.kladDate
        : null,
    updatedAt:
      typeof raw?.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : new Date().toISOString(),
    updatedBy,
  }
}

async function ensureBucket(admin: ReturnType<typeof createServerSupabase>) {
  const { data: buckets } = await admin.storage.listBuckets()
  if ((buckets || []).some((b) => b.name === BUCKET)) return
  await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 2 * 1024 * 1024,
  })
}

async function readStored(
  admin: ReturnType<typeof createServerSupabase>
): Promise<SchepenKladStored | null> {
  const { data, error } = await admin.storage.from(BUCKET).download(OBJECT_PATH)
  if (error || !data) return null
  const text = await data.text()
  try {
    return normalizePayload(JSON.parse(text), null)
  } catch {
    return null
  }
}

async function writeStored(
  admin: ReturnType<typeof createServerSupabase>,
  payload: SchepenKladStored
) {
  const body = JSON.stringify(payload)
  const { error } = await admin.storage.from(BUCKET).upload(OBJECT_PATH, body, {
    contentType: "application/json",
    upsert: true,
  })
  if (error) throw new Error(error.message)
}

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const admin = createServerSupabase()
    await ensureBucket(admin)
    const stored = (await readStored(admin)) || emptyPayload()
    return NextResponse.json({ success: true, data: stored })
  } catch (error: any) {
    console.error("schepen-klad GET:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Laden mislukt" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const token = getBearerToken(request)
    const email = await getCallerEmail(token)
    const body = await request.json()
    const payload = normalizePayload(body, email)
    payload.updatedAt = new Date().toISOString()
    payload.updatedBy = email

    const admin = createServerSupabase()
    await ensureBucket(admin)
    await writeStored(admin, payload)

    return NextResponse.json({ success: true, data: payload })
  } catch (error: any) {
    console.error("schepen-klad PUT:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Opslaan mislukt" },
      { status: 500 }
    )
  }
}
