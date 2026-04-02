import nodemailer from "nodemailer"

type AckLanguage = "nl" | "de"
export const RECRUITMENT_ACK_MARKER_PREFIX = "[ACK_MAIL_SENT]"

export function getRecruitmentAckLanguage(nationality: string | null | undefined): AckLanguage {
  const normalized = (nationality || "").trim().toUpperCase()
  if (normalized === "NL" || normalized === "BE") return "nl"
  return "de"
}

export function hasRecruitmentAckMarker(notes: any): boolean {
  if (!Array.isArray(notes)) return false
  return notes.some((entry) => {
    if (typeof entry === "string") {
      return entry.includes(RECRUITMENT_ACK_MARKER_PREFIX)
    }
    if (entry && typeof entry === "object") {
      const content = String((entry as any).content || (entry as any).text || "")
      return content.includes(RECRUITMENT_ACK_MARKER_PREFIX)
    }
    return false
  })
}

export function appendRecruitmentAckMarker(notes: any, language: AckLanguage): any[] {
  const list = Array.isArray(notes) ? [...notes] : []
  if (hasRecruitmentAckMarker(list)) return list
  const timestamp = new Date().toISOString()
  list.push(`${RECRUITMENT_ACK_MARKER_PREFIX} ${timestamp} lang=${language}`)
  return list
}

function buildAckTemplate(firstName: string, lang: AckLanguage) {
  if (lang === "nl") {
    return {
      subject: "Bevestiging ontvangst sollicitatie",
      html: `
        <p>Beste ${firstName},</p>
        <p>Bedankt voor je sollicitatie bij Bamalite S.A.</p>
        <p>We hebben je gegevens goed ontvangen en nemen je sollicitatie in behandeling.</p>
        <p>Met vriendelijke groet,<br/>Team Nautic - Bamalite S.A.</p>
        <p style="font-size:12px;color:#666;">Dit is een automatisch verzonden bericht.</p>
      `,
      text: `Beste ${firstName},

Bedankt voor je sollicitatie bij Bamalite S.A.
We hebben je gegevens goed ontvangen en nemen je sollicitatie in behandeling.

Met vriendelijke groet,
Team Nautic - Bamalite S.A.

Dit is een automatisch verzonden bericht.`,
    }
  }

  return {
    subject: "Eingangsbestätigung Ihrer Bewerbung",
    html: `
      <p>Guten Tag ${firstName},</p>
      <p>vielen Dank für Ihre Bewerbung bei Bamalite S.A.</p>
      <p>Wir haben Ihre Daten erhalten und bearbeiten Ihre Bewerbung.</p>
      <p>Mit freundlichen Grüßen,<br/>Team Nautic - Bamalite S.A.</p>
      <p style="font-size:12px;color:#666;">Dies ist eine automatisch versendete Nachricht.</p>
    `,
    text: `Guten Tag ${firstName},

vielen Dank für Ihre Bewerbung bei Bamalite S.A.
Wir haben Ihre Daten erhalten und bearbeiten Ihre Bewerbung.

Mit freundlichen Grüßen,
Team Nautic - Bamalite S.A.

Dies ist eine automatisch versendete Nachricht.`,
  }
}

export async function sendRecruitmentAckEmail(params: {
  firstName: string
  email: string
  nationality?: string | null
}): Promise<{ success: boolean; language: AckLanguage; error?: string }> {
  const gmailUser = process.env.GMAIL_USER?.trim()
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, "")

  if (!gmailUser || !gmailAppPassword) {
    return { success: false, language: getRecruitmentAckLanguage(params.nationality), error: "Gmail credentials ontbreken" }
  }

  const language = getRecruitmentAckLanguage(params.nationality)
  const template = buildAckTemplate(params.firstName || "kandidaat", language)

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })

    await transporter.sendMail({
      from: `Bamalite S.A. <${gmailUser}>`,
      replyTo: gmailUser,
      to: params.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      date: new Date(),
      encoding: "utf8",
    })

    return { success: true, language }
  } catch (error) {
    return {
      success: false,
      language,
      error: error instanceof Error ? error.message : "Onbekende fout bij verzenden ontvangstmail",
    }
  }
}

