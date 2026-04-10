import { NextRequest, NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/api-security"
import { getServiceRoleSupabaseClient, normalizeMonthKey } from "@/lib/salary-page-password"

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "admin")
    if (accessError) return accessError

    const body = await request.json().catch(() => ({}))
    const monthKey = normalizeMonthKey(body?.monthKey)
    const targetEmail = String(body?.targetEmail || "").trim().toLowerCase()
    if (!monthKey) {
      return NextResponse.json({ success: false, error: "Ongeldige maand" }, { status: 400 })
    }
    if (!targetEmail || !targetEmail.includes("@")) {
      return NextResponse.json({ success: false, error: "Ongeldig e-mailadres" }, { status: 400 })
    }

    const adminClient = getServiceRoleSupabaseClient()
    if (!adminClient) {
      return NextResponse.json({ success: false, error: "Server configuratie ontbreekt" }, { status: 500 })
    }

    const { error } = await adminClient
      .from("salary_page_passwords")
      .delete()
      .eq("user_email", targetEmail)
      .eq("month_key", monthKey)
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
