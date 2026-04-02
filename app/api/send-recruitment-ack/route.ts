import { NextRequest, NextResponse } from "next/server"
import { sendRecruitmentAckEmail } from "@/lib/recruitment-ack-email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const firstName = String(body?.firstName || "").trim()
    const email = String(body?.email || "").trim()
    const nationality = body?.nationality ? String(body.nationality) : null

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Geen e-mailadres meegegeven" },
        { status: 400 }
      )
    }

    const result = await sendRecruitmentAckEmail({
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
      message: "Ontvangstmail verzonden",
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

