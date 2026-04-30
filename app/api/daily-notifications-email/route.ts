import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { supabase } from "@/lib/supabase"
import { requireApiAccess } from "@/lib/api-security"
import { buildDashboardNotifications } from "@/utils/dashboard-notifications"

const RECIPIENT_EMAIL = "willem@bamalite.com"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const kindLabel = (kind: string) => {
  switch (kind) {
    case "birthday":
      return "Verjaardagen"
    case "probation":
      return "Proeftijd"
    case "task":
      return "Taken"
    case "ship_visit":
      return "Scheepsbezoeken"
    case "certificate_expiring":
      return "Ziektebriefjes"
    case "anniversary":
      return "Dienstjubilea"
    case "luxembourg_pending_boarding":
      return "Nieuw personeel"
    default:
      return "Overig"
  }
}

const severityLabel = (severity: string) => {
  switch (severity) {
    case "danger":
      return "Urgent"
    case "warning":
      return "Let op"
    default:
      return "Info"
  }
}

const getShipsNotVisitedInDays = (days: number, allShips: any[], visits: any[]) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (allShips || []).filter((ship: any) => {
    const shipVisits = (visits || []).filter((v: any) => String(v.ship_id) === String(ship.id))

    const visitedPloegen = new Set(shipVisits.map((v: any) => v.ploeg).filter(Boolean))
    const hasPloegA = visitedPloegen.has("A")
    const hasPloegB = visitedPloegen.has("B")
    if (!hasPloegA || !hasPloegB) return true

    const lastVisitA = shipVisits
      .filter((v: any) => v.ploeg === "A")
      .sort((a: any, b: any) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0]
    const lastVisitB = shipVisits
      .filter((v: any) => v.ploeg === "B")
      .sort((a: any, b: any) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0]

    const lastVisit =
      lastVisitA && lastVisitB
        ? new Date(lastVisitA.visit_date) > new Date(lastVisitB.visit_date)
          ? lastVisitA
          : lastVisitB
        : lastVisitA || lastVisitB

    if (!lastVisit) return true

    const visitDate = new Date(lastVisit.visit_date)
    visitDate.setHours(0, 0, 0, 0)

    const diffTime = today.getTime() - visitDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= days
  })
}

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "cron_or_admin")
    if (accessError) return accessError

    const [crewRes, tasksRes, shipsRes, sickLeaveRes, visitsRes] = await Promise.all([
      supabase.from("crew").select("*"),
      supabase.from("tasks").select("*"),
      supabase.from("ships").select("*"),
      supabase.from("sick_leave").select("*"),
      supabase.from("ship_visits").select("*"),
    ])

    if (crewRes.error || tasksRes.error || shipsRes.error || sickLeaveRes.error || visitsRes.error) {
      const firstError =
        crewRes.error || tasksRes.error || shipsRes.error || sickLeaveRes.error || visitsRes.error
      throw new Error(firstError?.message || "Kon meldingsdata niet ophalen")
    }

    const notifications = buildDashboardNotifications({
      crew: crewRes.data || [],
      tasks: tasksRes.data || [],
      ships: shipsRes.data || [],
      sickLeave: sickLeaveRes.data || [],
      visits: visitsRes.data || [],
      getShipsNotVisitedInDays: (days: number, allShips: any[]) =>
        getShipsNotVisitedInDays(days, allShips, visitsRes.data || []),
    })

    const grouped = notifications.reduce((acc: Record<string, any[]>, item) => {
      const label = kindLabel(item.kind)
      if (!acc[label]) acc[label] = []
      acc[label].push(item)
      return acc
    }, {})

    const orderedGroups = [
      "Taken",
      "Scheepsbezoeken",
      "Nieuw personeel",
      "Ziektebriefjes",
      "Verjaardagen",
      "Dienstjubilea",
      "Proeftijd",
      "Overig",
    ]

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bamalite-hr-system.vercel.app"
    const groupsHtml = orderedGroups
      .filter((group) => (grouped[group] || []).length > 0)
      .map((group) => {
        const rows = (grouped[group] || [])
          .map((n) => {
            const title = String(n.title || "")
            const description = String(n.description || "")
            const href = n.href ? `${appUrl}${n.href}` : `${appUrl}/meldingen`
            return `
              <tr>
                <td style="padding:8px 0; vertical-align:top;">
                  <div style="font-weight:600; color:#111827;">${title}</div>
                  ${description ? `<div style="color:#4b5563; font-size:13px;">${description}</div>` : ""}
                  <div style="color:#6b7280; font-size:12px; margin-top:3px;">${severityLabel(
                    String(n.severity || "info")
                  )} • <a href="${href}" style="color:#2563eb;">Openen</a></div>
                </td>
              </tr>
            `
          })
          .join("")

        return `
          <div style="margin-top:18px;">
            <h3 style="margin:0 0 6px 0; font-size:16px; color:#111827;">${group} (${(grouped[group] || []).length})</h3>
            <table style="width:100%; border-collapse:collapse;">${rows}</table>
          </div>
        `
      })
      .join("")

    const total = notifications.length
    const todayText = new Date().toLocaleDateString("nl-NL")
    const noNotificationsHtml = `<p style="color:#374151;">Er zijn vandaag geen meldingen.</p>`

    const html = `
      <div style="font-family:Arial,sans-serif; max-width:760px; margin:0 auto; padding:20px;">
        <h1 style="margin:0 0 8px 0; color:#111827;">Dagelijks meldingenoverzicht</h1>
        <p style="margin:0 0 14px 0; color:#4b5563;">Datum: ${todayText}</p>
        <div style="padding:10px 12px; background:#f3f4f6; border-radius:8px; color:#111827; font-weight:600;">
          Totaal meldingen: ${total}
        </div>
        ${total === 0 ? noNotificationsHtml : groupsHtml}
        <p style="margin-top:20px; color:#6b7280; font-size:12px;">
          Dit bericht is automatisch verzonden door Bamalite HR.
        </p>
      </div>
    `

    await transporter.sendMail({
      from: `"Bemanningslijst" <${process.env.GMAIL_USER}>`,
      to: RECIPIENT_EMAIL,
      subject: `Dagelijkse meldingen (${todayText}) - ${total} totaal`,
      html,
      text: `Dagelijkse meldingen (${todayText}) - totaal: ${total}. Bekijk alles op ${appUrl}/meldingen`,
    })

    return NextResponse.json({
      success: true,
      recipient: RECIPIENT_EMAIL,
      totalNotifications: total,
      message: "Dagelijkse meldingenmail verzonden",
    })
  } catch (error: any) {
    console.error("Error sending daily notifications email:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Onbekende fout" },
      { status: 500 }
    )
  }
}

