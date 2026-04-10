import { NextRequest, NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/api-security"
import {
  getBearerToken,
  getServiceRoleSupabaseClient,
  getUserFromBearerToken,
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
    if (!monthKey) {
      return NextResponse.json({ success: false, error: "Ongeldige maand" }, { status: 400 })
    }

    const adminClient = getServiceRoleSupabaseClient()
    if (!adminClient) {
      return NextResponse.json({ success: false, error: "Server configuratie ontbreekt" }, { status: 500 })
    }

    const { data, error } = await adminClient
      .from("salary_page_passwords")
      .select("id")
      .eq("user_id", user.id)
      .eq("month_key", monthKey)
      .maybeSingle()
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, hasPassword: !!data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
