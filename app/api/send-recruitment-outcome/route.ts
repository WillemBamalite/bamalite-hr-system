import { NextRequest, NextResponse } from "next/server"
import {
  sendRecruitmentOutcomeEmail,
  type RecruitmentOutcomeKind,
} from "@/lib/recruitment-outcome-email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const KINDS = new Set<RecruitmentOutcomeKind>(["later-terugkomen", "geen-interesse"])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const kind = String(body?.kind || "") as RecruitmentOutcomeKind
    const firstName = String(body?.firstName || "").trim()
    const email = String(body?.email || "").trim()
    const nationality = body?.nationality ? String(body.nationality) : null

    if (!KINDS.has(kind)) {
      return NextResponse.json(
        { success: false, error: "Onbekend mailtype" },
        { status: 400 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Geen e-mailadres meegegeven" },
        { status: 400 }
      )
    }

    const result = await sendRecruitmentOutcomeEmail({
      kind,
      firstName: firstName || "kandidaat",
      email,
      nationality,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Verzenden mislukt", language: result.language },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      language: result.language,
      message: "Mail verzonden",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    )
  }
}
