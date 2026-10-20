import nodemailer from "nodemailer"
import { getRecruitmentAckLanguage } from "@/lib/recruitment-ack-email"

type OutcomeLanguage = "nl" | "de"
export type RecruitmentOutcomeKind = "later-terugkomen" | "geen-interesse"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildOutcomeTemplate(firstName: string, kind: RecruitmentOutcomeKind, lang: OutcomeLanguage) {
  const safeName = escapeHtml(firstName || (lang === "nl" ? "kandidaat" : "Bewerber"))

  if (kind === "later-terugkomen") {
    if (lang === "nl") {
      return {
        subject: "Momenteel geen plaats",
        html: `
          <p>Beste ${safeName},</p>
          <p>Bedankt voor je interesse in Bamalite S.A.</p>
          <p>Op dit moment hebben we geen passende plaats voor je. We houden je gegevens bij en nemen contact met je op zodra er wel een plek is.</p>
          <p>Met vriendelijke groet,<br/>Team Nautic - Bamalite S.A.</p>
          <p style="font-size:12px;color:#666;">Dit is een automatisch verzonden bericht.</p>
        `,
        text: `Beste ${firstName},

Bedankt voor je interesse in Bamalite S.A.
Op dit moment hebben we geen passende plaats voor je. We houden je gegevens bij en nemen contact met je op zodra er wel een plek is.

Met vriendelijke groet,
Team Nautic - Bamalite S.A.

Dit is een automatisch verzonden bericht.`,
      }
    }

    return {
      subject: "Derzeit keine Stelle verfügbar",
      html: `
        <p>Guten Tag ${safeName},</p>
        <p>vielen Dank für Ihr Interesse an Bamalite S.A.</p>
        <p>Derzeit haben wir keine passende Stelle für Sie. Wir behalten Ihre Daten und melden uns, sobald eine Stelle frei wird.</p>
        <p>Mit freundlichen Grüßen,<br/>Team Nautic - Bamalite S.A.</p>
        <p style="font-size:12px;color:#666;">Dies ist eine automatisch versendete Nachricht.</p>
      `,
      text: `Guten Tag ${firstName},

vielen Dank für Ihr Interesse an Bamalite S.A.
Derzeit haben wir keine passende Stelle für Sie. Wir behalten Ihre Daten und melden uns, sobald eine Stelle frei wird.

Mit freundlichen Grüßen,
Team Nautic - Bamalite S.A.

Dies ist eine automatisch versendete Nachricht.`,
    }
  }

  if (lang === "nl") {
    return {
      subject: "Je sollicitatie bij Bamalite S.A.",
      html: `
        <p>Beste ${safeName},</p>
        <p>Bedankt voor je interesse in Bamalite S.A.</p>
        <p>We gaan op dit moment niet verder met je sollicitatie. We wensen je veel succes verder.</p>
        <p>Met vriendelijke groet,<br/>Team Nautic - Bamalite S.A.</p>
        <p style="font-size:12px;color:#666;">Dit is een automatisch verzonden bericht.</p>
      `,
      text: `Beste ${firstName},

Bedankt voor je interesse in Bamalite S.A.
We gaan op dit moment niet verder met je sollicitatie. We wensen je veel succes verder.

Met vriendelijke groet,
Team Nautic - Bamalite S.A.

Dit is een automatisch verzonden bericht.`,
    }
  }

  return {
    subject: "Ihre Bewerbung bei Bamalite S.A.",
    html: `
      <p>Guten Tag ${safeName},</p>
      <p>vielen Dank für Ihr Interesse an Bamalite S.A.</p>
      <p>Wir können Ihre Bewerbung derzeit leider nicht weiter berücksichtigen. Wir wünschen Ihnen für die Zukunft alles Gute.</p>
      <p>Mit freundlichen Grüßen,<br/>Team Nautic - Bamalite S.A.</p>
      <p style="font-size:12px;color:#666;">Dies ist eine automatisch versendete Nachricht.</p>
    `,
    text: `Guten Tag ${firstName},

vielen Dank für Ihr Interesse an Bamalite S.A.
Wir können Ihre Bewerbung derzeit leider nicht weiter berücksichtigen. Wir wünschen Ihnen für die Zukunft alles Gute.

Mit freundlichen Grüßen,
Team Nautic - Bamalite S.A.

Dies ist eine automatisch versendete Nachricht.`,
  }
}

export async function sendRecruitmentOutcomeEmail(params: {
  kind: RecruitmentOutcomeKind
  firstName: string
  email: string
  nationality?: string | null
}): Promise<{ success: boolean; language: OutcomeLanguage; error?: string }> {
  const language = getRecruitmentAckLanguage(params.nationality)
  const gmailUser = process.env.GMAIL_USER?.trim()
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, "")

  if (!gmailUser || !gmailAppPassword || gmailAppPassword.toLowerCase().includes("paste_your")) {
    return {
      success: false,
      language,
      error:
        "Gmail is nog niet ingesteld. Vul een echt Google app-wachtwoord in bij GMAIL_APP_PASSWORD en herstart de app.",
    }
  }

  const template = buildOutcomeTemplate(params.firstName || "kandidaat", params.kind, language)

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
      error: error instanceof Error ? error.message : "Onbekende fout bij verzenden",
    }
  }
}
