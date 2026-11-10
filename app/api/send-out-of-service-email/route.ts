import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { requireApiAccess } from "@/lib/api-security"
import { getOutOfServiceEmailRecipients } from "@/lib/notifications/recipients"

export const runtime = "nodejs"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatGermanDate(value: string) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return String(value || "").trim()
  return `${match[3]}.${match[2]}.${match[1]}`
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const body = await request.json().catch(() => ({}))
    const name = String(body?.name || "").trim()
    const company = String(body?.company || "").trim()
    const position = String(body?.position || "").trim()
    const ship = String(body?.ship || "").trim()
    const outOfServiceDate = formatGermanDate(String(body?.outOfServiceDate || ""))
    const reason = String(body?.reason || "").trim()

    if (!name || !outOfServiceDate || !reason) {
      return NextResponse.json(
        { success: false, error: "Naam, datum en reden zijn verplicht." },
        { status: 400 }
      )
    }

    const gmailUser = process.env.GMAIL_USER?.trim()
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, "")
    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json(
        { success: false, error: "Gmail is niet ingesteld." },
        { status: 500 }
      )
    }

    const rows = [
      ["Name", name],
      company ? ["Firma", company] : null,
      position ? ["Funktion", position] : null,
      ship && ship !== "Geen schip" ? ["Schiff", ship] : null,
      ["Außer Dienst ab", outOfServiceDate],
      ["Grund", reason],
    ].filter((row): row is [string, string] => Array.isArray(row))

    const subject = `Außer Dienst: ${name}`
    const intro = `${name} wurde außer Dienst gestellt.`
    const text = [
      "Guten Tag,",
      "",
      intro,
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      "Diese Nachricht wurde automatisch von Bamalite HR gesendet.",
    ].join("\n")

    const htmlRows = rows
      .map(
        ([label, value]) => `
          <tr>
            <td style="padding:4px 16px 4px 0; color:#4b5563; vertical-align:top;">${escapeHtml(label)}</td>
            <td style="padding:4px 0; color:#111827; font-weight:600;">${escapeHtml(value)}</td>
          </tr>
        `
      )
      .join("")

    const html = `
      <div style="font-family:Arial,sans-serif; max-width:640px; margin:0 auto; padding:20px; color:#111827;">
        <p style="margin:0 0 12px 0;">Guten Tag,</p>
        <p style="margin:0 0 16px 0;">${escapeHtml(intro)}</p>
        <table style="border-collapse:collapse;">${htmlRows}</table>
        <p style="margin-top:20px; color:#6b7280; font-size:12px;">
          Diese Nachricht wurde automatisch von Bamalite HR gesendet.
        </p>
      </div>
    `

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    })

    const recipients = getOutOfServiceEmailRecipients()
    await transporter.sendMail({
      from: `"Bemanningslijst" <${gmailUser}>`,
      to: recipients,
      subject,
      html,
      text,
    })

    return NextResponse.json({ success: true, recipients })
  } catch (error) {
    console.error("send-out-of-service-email:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "E-mail versturen mislukt" },
      { status: 500 }
    )
  }
}
