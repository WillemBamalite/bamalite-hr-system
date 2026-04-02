import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import {
  appendRecruitmentAckMarker,
  hasRecruitmentAckMarker,
  sendRecruitmentAckEmail,
} from "@/lib/recruitment-ack-email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const firstName = String(body?.firstName || "").trim()
    const email = String(body?.email || "").trim()
    const nationality = body?.nationality ? String(body.nationality) : null
    const candidateId = body?.candidateId ? String(body.candidateId) : null

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Geen e-mailadres meegegeven" },
        { status: 400 }
      )
    }

    let existingNotes: any[] = []
    if (candidateId) {
      const { data: existing, error: fetchError } = await supabase
        .from("crew")
        .select("notes")
        .eq("id", candidateId)
        .maybeSingle()

      if (!fetchError && existing) {
        existingNotes = Array.isArray((existing as any).notes) ? (existing as any).notes : []
      }

      if (hasRecruitmentAckMarker(existingNotes)) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: "Ontvangstmail was al verstuurd voor deze kandidaat",
        })
      }
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

    if (candidateId) {
      const nextNotes = appendRecruitmentAckMarker(existingNotes, result.language)
      await supabase.from("crew").update({ notes: nextNotes }).eq("id", candidateId)
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

