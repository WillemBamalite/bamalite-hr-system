import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { supabase } from "@/lib/supabase"
import { requireApiAccess } from "@/lib/api-security"
import { buildDashboardNotifications, type DashboardNotification } from "@/utils/dashboard-notifications"
import {
  sendPushToRecipients,
  shouldDispatch,
  logDispatch,
} from "@/lib/notifications/push-server"
import {
  getDailyEmailManagementRecipients,
  getDailyEmailOfficeRecipients,
  getPushRecipients,
  isTestMode,
} from "@/lib/notifications/recipients"

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

function buildEmailHtml(
  title: string,
  groups: { label: string; items: DashboardNotification[] }[],
  todayText: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bamalite-hr-system.vercel.app"
  const sectionsHtml = groups
    .filter((g) => g.items.length > 0)
    .map((g) => {
      const rows = g.items
        .map((n) => {
          const hrefRaw = n.href || "/meldingen"
          const href = `${appUrl}${hrefRaw}`
          return `
            <tr>
              <td style="padding:8px 0; vertical-align:top;">
                <div style="font-weight:600; color:#111827;">${n.title || ""}</div>
                ${n.description ? `<div style="color:#4b5563; font-size:13px;">${n.description}</div>` : ""}
                <div style="color:#6b7280; font-size:12px; margin-top:3px;">
                  ${severityLabel(String(n.severity || "info"))} • <a href="${href}" style="color:#2563eb;">Openen</a>
                </div>
              </td>
            </tr>
          `
        })
        .join("")
      return `
        <div style="margin-top:18px;">
          <h3 style="margin:0 0 6px 0; font-size:16px; color:#111827;">${g.label} (${g.items.length})</h3>
          <table style="width:100%; border-collapse:collapse;">${rows}</table>
        </div>
      `
    })
    .join("")

  const total = groups.reduce((acc, g) => acc + g.items.length, 0)
  const noNotificationsHtml = `<p style="color:#374151;">Er zijn vandaag geen meldingen.</p>`

  return `
    <div style="font-family:Arial,sans-serif; max-width:760px; margin:0 auto; padding:20px;">
      <h1 style="margin:0 0 8px 0; color:#111827;">${title}</h1>
      <p style="margin:0 0 14px 0; color:#4b5563;">Datum: ${todayText}</p>
      <div style="padding:10px 12px; background:#f3f4f6; border-radius:8px; color:#111827; font-weight:600;">
        Totaal meldingen: ${total}
      </div>
      ${total === 0 ? noNotificationsHtml : sectionsHtml}
      <p style="margin-top:20px; color:#6b7280; font-size:12px;">
        Dit bericht is automatisch verzonden door Bamalite HR.
      </p>
    </div>
  `
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

    const todayText = new Date().toLocaleDateString("nl-NL")

    // Groepering per kind voor flexibele samenstelling per ontvangergroep
    const byKind: Record<string, DashboardNotification[]> = {}
    notifications.forEach((n) => {
      const k = n.kind
      byKind[k] ||= []
      byKind[k].push(n)
    })

    const counts = {
      ziekbriefje: (byKind["certificate_expiring"] || []).length,
      taken: (byKind["task"] || []).filter((t) => t.severity === "danger").length,
      jarigen: (byKind["birthday"] || []).length,
      jubilea: (byKind["anniversary"] || []).length,
      bezoeken: (byKind["ship_visit"] || []).length,
      luxembourg: (byKind["luxembourg_pending_boarding"] || []).length,
      proeftijd: (byKind["probation"] || []).length,
    }

    // 1) Ochtend gebundelde push naar willem + leo
    const pushRecipients = getPushRecipients()
    const pushBits: string[] = []
    if (counts.ziekbriefje) pushBits.push(`${counts.ziekbriefje} ziekbriefje${counts.ziekbriefje === 1 ? "" : "s"} verloopt vandaag/binnenkort`)
    if (counts.jarigen) pushBits.push(`${counts.jarigen} jarige${counts.jarigen === 1 ? "" : "n"}`)
    if (counts.jubilea) pushBits.push(`${counts.jubilea} jubileum${counts.jubilea === 1 ? "" : "s"}`)
    if (counts.bezoeken) pushBits.push(`${counts.bezoeken} scheepsbezoek${counts.bezoeken === 1 ? "" : "en"}`)
    if (counts.luxembourg) pushBits.push(`${counts.luxembourg} nog in te schrijven`)

    let pushResult: any = { skipped: true }
    const ymd = new Date().toISOString().slice(0, 10)
    const pushKey = `morning-bundle:${ymd}`
    if (pushBits.length > 0 && pushRecipients.length > 0 && shouldDispatch(pushKey, 6 * 60 * 60 * 1000)) {
      const pushBody = isTestMode()
        ? `DEMO ochtendmelding: ${pushBits.join(" • ")}.`
        : pushBits.join(" • ")
      pushResult = await sendPushToRecipients(
        {
          title: "Dagoverzicht Bamalite HR",
          body: pushBody,
          url: "/meldingen",
          eventKey: pushKey,
        },
        pushRecipients
      )
    }

    // 2) Mail naar management
    const mgmtGroups = [
      { label: "Ziektebriefjes", items: byKind["certificate_expiring"] || [] },
      { label: "Urgente taken", items: (byKind["task"] || []).filter((t) => t.severity === "danger") },
      { label: "Verjaardagen vandaag", items: byKind["birthday"] || [] },
      { label: "Dienstjubilea", items: byKind["anniversary"] || [] },
      { label: "Nog in te schrijven", items: byKind["luxembourg_pending_boarding"] || [] },
      { label: "Proeftijd", items: byKind["probation"] || [] },
    ]
    const mgmtHtml = buildEmailHtml("Dagoverzicht", mgmtGroups, todayText)
    const mgmtTotal = mgmtGroups.reduce((acc, g) => acc + g.items.length, 0)
    const mgmtRecipients = getDailyEmailManagementRecipients()

    let mgmtSent = false
    if (mgmtRecipients.length > 0) {
      try {
        await transporter.sendMail({
          from: `"Bemanningslijst" <${process.env.GMAIL_USER}>`,
          to: mgmtRecipients,
          subject: `Dagoverzicht (${todayText}) – ${mgmtTotal} meldingen`,
          html: mgmtHtml,
          text: `Dagoverzicht voor ${todayText}. Totaal meldingen: ${mgmtTotal}.`,
        })
        mgmtSent = true
        await Promise.all(
          mgmtRecipients.map((r) =>
            logDispatch({
              event_key: `daily-email-management:${ymd}`,
              channel: "email",
              recipient: r,
              payload: { total: mgmtTotal },
              status: "ok",
            })
          )
        )
      } catch (err: any) {
        await logDispatch({
          event_key: `daily-email-management:${ymd}`,
          channel: "email",
          recipient: mgmtRecipients.join(","),
          payload: { total: mgmtTotal },
          status: "error",
          error: err?.message || String(err),
        })
      }
    }

    // 3) Mail naar office
    const officeGroups = [
      { label: "Ziektebriefjes", items: byKind["certificate_expiring"] || [] },
      { label: "Verjaardagen vandaag", items: byKind["birthday"] || [] },
      { label: "Dienstjubilea", items: byKind["anniversary"] || [] },
    ]
    const officeHtml = buildEmailHtml("Dagoverzicht", officeGroups, todayText)
    const officeTotal = officeGroups.reduce((acc, g) => acc + g.items.length, 0)
    const officeRecipients = getDailyEmailOfficeRecipients()

    let officeSent = false
    if (officeRecipients.length > 0) {
      try {
        await transporter.sendMail({
          from: `"Bemanningslijst" <${process.env.GMAIL_USER}>`,
          to: officeRecipients,
          subject: `Dagoverzicht (${todayText}) – ${officeTotal} meldingen`,
          html: officeHtml,
          text: `Dagoverzicht voor ${todayText}. Totaal meldingen: ${officeTotal}.`,
        })
        officeSent = true
        await Promise.all(
          officeRecipients.map((r) =>
            logDispatch({
              event_key: `daily-email-office:${ymd}`,
              channel: "email",
              recipient: r,
              payload: { total: officeTotal },
              status: "ok",
            })
          )
        )
      } catch (err: any) {
        await logDispatch({
          event_key: `daily-email-office:${ymd}`,
          channel: "email",
          recipient: officeRecipients.join(","),
          payload: { total: officeTotal },
          status: "error",
          error: err?.message || String(err),
        })
      }
    }

    return NextResponse.json({
      success: true,
      pushResult,
      mgmt: { sent: mgmtSent, total: mgmtTotal, recipients: mgmtRecipients },
      office: { sent: officeSent, total: officeTotal, recipients: officeRecipients },
    })
  } catch (error: any) {
    console.error("morning-bundle error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Onbekende fout" },
      { status: 500 }
    )
  }
}
