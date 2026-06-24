import { NextRequest, NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/api-security"
import {
  SALARY_PASSWORD_SCOPE_KEY,
  getBearerToken,
  getServiceRoleSupabaseClient,
  getUserFromBearerToken,
  hashSalaryPassword,
} from "@/lib/salary-page-password"

async function findPasswordRow(adminClient: ReturnType<typeof getServiceRoleSupabaseClient>, userId: string) {
  if (!adminClient) return null

  const { data: globalRow } = await adminClient
    .from("salary_page_passwords")
    .select("password_hash, password_salt, must_change_password")
    .eq("user_id", userId)
    .eq("month_key", SALARY_PASSWORD_SCOPE_KEY)
    .maybeSingle()
  if (globalRow) return globalRow

  const { data: legacyRows } = await adminClient
    .from("salary_page_passwords")
    .select("password_hash, password_salt, must_change_password")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
  return legacyRows?.[0] ?? null
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const token = getBearerToken(request)
    const user = await getUserFromBearerToken(token)
    if (!user) {
      return NextResponse.json({ success: false, error: "Geen gebruiker gevonden" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const password = String(body?.password || "")
    if (!password) {
      return NextResponse.json({ success: false, error: "Ongeldige invoer" }, { status: 400 })
    }

    const adminClient = getServiceRoleSupabaseClient()
    if (!adminClient) {
      return NextResponse.json({ success: false, error: "Server configuratie ontbreekt" }, { status: 500 })
    }

    const data = await findPasswordRow(adminClient, user.id)
    if (!data) {
      return NextResponse.json({ success: false, error: "Geen salarislijst-wachtwoord ingesteld" }, { status: 404 })
    }

    const expected = String(data.password_hash || "")
    const salt = String(data.password_salt || "")
    const provided = hashSalaryPassword(password, salt)
    if (!expected || provided !== expected) {
      return NextResponse.json({ success: false, error: "Onjuist wachtwoord" }, { status: 401 })
    }

    const mustChangePassword = data.must_change_password === true
    return NextResponse.json({ success: true, mustChangePassword })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
