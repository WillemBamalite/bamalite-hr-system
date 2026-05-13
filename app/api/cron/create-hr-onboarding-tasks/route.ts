import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase-server"
import { requireApiAccess } from "@/lib/api-security"
import { createDueHrOnboardingTasks } from "@/lib/hr-onboarding-scheduled-tasks"

/**
 * Dagelijkse (of handmatige) run: maakt onboarding-taken aan zodra
 * 10 dagen / 2 maanden na in_dienst_vanaf zijn bereikt.
 * Zelfde logica als in /api/notifications/morning-bundle.
 */
export async function GET(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "cron_or_admin")
    if (accessError) return accessError

    const supabase = createServerSupabase()
    const result = await createDueHrOnboardingTasks(supabase)

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("create-hr-onboarding-tasks:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Onbekende fout" },
      { status: 500 }
    )
  }
}
