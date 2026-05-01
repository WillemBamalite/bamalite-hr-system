import { NextRequest, NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/api-security"
import { sendPushToRecipients, shouldDispatch } from "@/lib/notifications/push-server"

type DispatchInput = {
  type: "task_created" | "task_updated" | "task_completed" | "custom"
  title?: string
  body?: string
  url?: string
  eventKey?: string
}

function buildDefaults(input: DispatchInput): DispatchInput {
  switch (input.type) {
    case "task_created":
      return {
        type: "task_created",
        title: input.title || "Nieuwe taak",
        body: input.body || "Er is een nieuwe taak toegevoegd.",
        url: input.url || "/taken",
        eventKey: input.eventKey,
      }
    case "task_updated":
      return {
        type: "task_updated",
        title: input.title || "Taak bijgewerkt",
        body: input.body || "Er is een taak bijgewerkt.",
        url: input.url || "/taken",
        eventKey: input.eventKey,
      }
    case "task_completed":
      return {
        type: "task_completed",
        title: input.title || "Taak afgerond",
        body: input.body || "Er is een taak afgerond.",
        url: input.url || "/taken",
        eventKey: input.eventKey,
      }
    default:
      return {
        type: "custom",
        title: input.title || "Bamalite HR",
        body: input.body || "",
        url: input.url || "/meldingen",
        eventKey: input.eventKey,
      }
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const raw = (await request.json().catch(() => ({}))) as DispatchInput
    if (!raw || !raw.type) {
      return NextResponse.json(
        { success: false, error: "type ontbreekt" },
        { status: 400 }
      )
    }

    const input = buildDefaults(raw)
    const eventKey = input.eventKey || `${input.type}:${Date.now()}`

    if (!shouldDispatch(eventKey)) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const result = await sendPushToRecipients({
      title: input.title || "Bamalite HR",
      body: input.body || "",
      url: input.url || "/meldingen",
      eventKey,
    })

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Onbekende fout" },
      { status: 500 }
    )
  }
}
