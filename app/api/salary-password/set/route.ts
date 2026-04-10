import { NextRequest, NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/api-security"
import {
  getBearerToken,
  getServiceRoleSupabaseClient,
  getUserFromBearerToken,
  hashSalaryPassword,
  newSalt,
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
    if (!monthKey) {
      return NextResponse.json({ success: false, error: "Ongeldige maand" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "Wachtwoord moet minimaal 6 tekens zijn" }, { status: 400 })
    }

    const adminClient = getServiceRoleSupabaseClient()
    if (!adminClient) {
      return NextResponse.json({ success: false, error: "Server configuratie ontbreekt" }, { status: 500 })
    }

    const salt = newSalt()
    const hash = hashSalaryPassword(password, salt)
    const email = String(user.email || "").toLowerCase()

    const { error } = await adminClient.from("salary_page_passwords").upsert(
      [
        {
          user_id: user.id,
          user_email: email,
          month_key: monthKey,
          password_hash: hash,
          password_salt: salt,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id,month_key" }
    )
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
