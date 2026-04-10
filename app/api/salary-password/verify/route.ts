import { NextRequest, NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/api-security"
import {
  getBearerToken,
  getServiceRoleSupabaseClient,
  getUserFromBearerToken,
  hashSalaryPassword,
  normalizeMonthKey,
} from "@/lib/salary-page-password"

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
    const monthKey = normalizeMonthKey(body?.monthKey)
    const password = String(body?.password || "")
    if (!monthKey || !password) {
      return NextResponse.json({ success: false, error: "Ongeldige invoer" }, { status: 400 })
    }

    const adminClient = getServiceRoleSupabaseClient()
    if (!adminClient) {
      return NextResponse.json({ success: false, error: "Server configuratie ontbreekt" }, { status: 500 })
    }

    const { data, error } = await adminClient
      .from("salary_page_passwords")
      .select("password_hash,password_salt")
      .eq("user_id", user.id)
      .eq("month_key", monthKey)
      .maybeSingle()
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ success: false, error: "Geen maandwachtwoord ingesteld" }, { status: 404 })
    }

    const expected = String(data.password_hash || "")
    const salt = String(data.password_salt || "")
    const provided = hashSalaryPassword(password, salt)
    if (!expected || provided !== expected) {
      return NextResponse.json({ success: false, error: "Onjuist wachtwoord" }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
