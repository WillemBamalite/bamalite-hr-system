import { NextRequest, NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/api-security"
import {
  SALARY_PASSWORD_SCOPE_KEY,
  getBearerToken,
  getServiceRoleSupabaseClient,
  getUserFromBearerToken,
} from "@/lib/salary-page-password"

async function findPasswordRow(adminClient: ReturnType<typeof getServiceRoleSupabaseClient>, userId: string) {
  if (!adminClient) return null

  const { data: globalRow } = await adminClient
    .from("salary_page_passwords")
    .select("id")
    .eq("user_id", userId)
    .eq("month_key", SALARY_PASSWORD_SCOPE_KEY)
    .maybeSingle()
  if (globalRow) return globalRow

  const { data: legacyRows } = await adminClient
    .from("salary_page_passwords")
    .select("id")
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

    const adminClient = getServiceRoleSupabaseClient()
    if (!adminClient) {
      return NextResponse.json({ success: false, error: "Server configuratie ontbreekt" }, { status: 500 })
    }

    const row = await findPasswordRow(adminClient, user.id)
    return NextResponse.json({ success: true, hasPassword: !!row })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
