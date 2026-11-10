import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { addMonths, addYears, differenceInDays } from "date-fns"
import { requireApiAccess } from "@/lib/api-security"
import { createServerSupabase } from "@/lib/supabase-server"
import { logNotificationDispatch } from "@/lib/notifications/dispatch-log"
import { countsAsTotalCrewMember } from "@/utils/crew-filters"

export const runtime = "nodejs"

const WILLEM_EMAIL = "willem@bamalite.com"

const CLINIC_LINES = [
  "Keuringsdienst",
  "Corporate Travel Clinic BV",
  "Maasboulevard 148",
  "3011 TX Rotterdam",
  "Tel: +31 10 820 1120",
]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function amsterdamToday(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  return new Date(`${ymd}T12:00:00`)
}

function parseCrewDate(value: unknown): Date | null {
  const raw = String(value || "").trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const date = new Date(`${raw.slice(0, 10)}T12:00:00`)
    return isNaN(date.getTime()) ? null : date
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split("-")
    const date = new Date(`${year}-${month}-${day}T12:00:00`)
    return isNaN(date.getTime()) ? null : date
  }
  const date = new Date(raw)
  return isNaN(date.getTime()) ? null : date
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** Zelfde berekening als de pagina Medische keuringen. */
function nextExaminationDate(member: any): Date | null {
  if (!member?.laatste_keuring_datum) return null
  const keuringDatum = parseCrewDate(member.laatste_keuring_datum)
  if (!keuringDatum) return null
  if (member.fit_verklaard_jaren !== null && member.fit_verklaard_jaren !== undefined && member.fit_verklaard_jaren !== "") {
    const geldigheid =
      typeof member.fit_verklaard_jaren === "number"
        ? member.fit_verklaard_jaren
        : parseFloat(member.fit_verklaard_jaren)
    if (!Number.isFinite(geldigheid)) return addYears(keuringDatum, 3)
    if (geldigheid === 0.5) return addMonths(keuringDatum, 6)
    return addYears(keuringDatum, geldigheid)
  }
  if (member.fit_verklaard === false) return addYears(keuringDatum, 1)
  return addYears(keuringDatum, 3)
}

function isDutchOrBelgian(nationality: unknown) {
  const value = String(nationality || "")
    .trim()
    .toLowerCase()
  return ["nl", "nederlands", "nederland", "be", "belgisch", "belgie", "belgië"].includes(value)
}

function onMedicalList(member: any) {
  return countsAsTotalCrewMember(member) && !(member?.is_student && member?.education_type === "BOL")
}

/** Zelfde drie lijsten als de pagina Medische keuringen: verlopen, binnenkort, net in dienst. */
function currentListKind(member: any, today: Date): "renewal" | "new" | null {
  const next = nextExaminationDate(member)
  const overdue = !!next && toYmd(next) < toYmd(today)
  const daysUntil = next ? differenceInDays(next, today) : null
  const dueSoon = daysUntil !== null && daysUntil <= 90 && daysUntil >= 0 && !overdue

  const start = parseCrewDate(member.proeftijd_datum || member.in_dienst_vanaf)
  const deadline = start ? addYears(addMonths(start, 3), 1) : null
  const isNew = !member.laatste_keuring_datum && !!start
  const newPast = !!deadline && toYmd(deadline) < toYmd(today)
  const missing = !member.laatste_keuring_datum && !start
  const verlopen = overdue || (isNew && newPast) || missing
  const netInDienst = isNew && !!deadline && !newPast

  if (dueSoon || (verlopen && !!member.laatste_keuring_datum)) return "renewal"
  if (netInDienst || (verlopen && !member.laatste_keuring_datum)) return "new"
  return null
}

function companyLine(company: string, language: "nl" | "de" | "en") {
  if (language === "nl") {
    return company
      ? `Vermeld bij het maken van de afspraak dat je werkzaam bent voor ${company}.`
      : "Vermeld bij het maken van de afspraak voor welke firma je werkzaam bent."
  }
  if (language === "de") {
    return company
      ? `Bitte geben Sie bei der Terminvereinbarung an, dass Sie für ${company} tätig sind.`
      : "Bitte geben Sie bei der Terminvereinbarung an, für welche Firma Sie tätig sind."
  }
  return company
    ? `When you make the appointment, please mention that you work for ${company}.`
    : "When you make the appointment, please mention which company you work for."
}

function buildLetter(firstName: string, company: string, again: boolean, dutch: boolean) {
  const name = firstName.trim()
  if (dutch) {
    const opening = again
      ? "Het is weer tijd om je medische keuring in te plannen."
      : "Het is tijd om je medische keuring in te plannen."
    const paragraphs = [
      name ? `Beste ${name},` : "Beste,",
      "",
      opening,
      "",
      "Je hebt hiervoor de komende drie maanden de tijd. We verzoeken je om zelf contact op te nemen met onderstaande keuringsdienst om een afspraak te maken.",
      "",
      ...CLINIC_LINES,
      "",
      companyLine(company, "nl"),
      "",
      "Met vriendelijke groet,",
      "",
      "Willem van der Bent",
    ]
    return {
      subject: "Medische keuring",
      text: paragraphs.join("\n"),
    }
  }

  const greetingDe = name ? `Guten Tag ${name},` : "Guten Tag,"
  const greetingEn = name ? `Dear ${name},` : "Dear,"
  const openingDe = again
    ? "Es ist wieder Zeit, Ihre ärztliche Untersuchung zu planen."
    : "Es ist Zeit, Ihre ärztliche Untersuchung zu planen."
  const openingEn = again
    ? "It is time again to plan your medical examination."
    : "It is time to plan your medical examination."
  const paragraphs = [
    greetingDe,
    "",
    openingDe,
    "",
    "Sie haben dafür die kommenden drei Monate Zeit. Wir bitten Sie, selbst Kontakt mit dem unten genannten Untersuchungsdienst aufzunehmen, um einen Termin zu vereinbaren.",
    "",
    greetingEn,
    "",
    openingEn,
    "",
    "You have the next three months to do this. We ask you to contact the medical service below yourself to make an appointment.",
    "",
    ...CLINIC_LINES,
    "",
    companyLine(company, "de"),
    companyLine(company, "en"),
    "",
    "Mit freundlichen Grüßen / Kind regards,",
    "",
    "Willem van der Bent",
  ]
  return {
    subject: "Ärztliche Untersuchung / Medical examination",
    text: paragraphs.join("\n"),
  }
}

function textToHtml(text: string) {
  const blocks = text.split(/\n{2,}/)
  return `<div style="font-family:Arial,sans-serif; max-width:640px; margin:0 auto; padding:20px; color:#111827; font-size:15px; line-height:1.5;">${blocks
    .map((block) => `<p style="margin:0 0 14px 0;">${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("")}</div>`
}

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "cron_or_admin")
    if (accessError) return accessError

    const gmailUser = process.env.GMAIL_USER?.trim()
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, "")
    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json({ success: false, error: "Gmail is niet ingesteld." }, { status: 500 })
    }

    const supabase = createServerSupabase()
    const { data: crew, error } = await supabase.from("crew").select("*")
    if (error) throw new Error(error.message)

    const today = amsterdamToday()
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    })

    const sent: string[] = []
    const skipped: string[] = []
    let sendErrors = 0

    const wasAlreadySent = async (eventKey: string) => {
      const { data: alreadySent, error: logError } = await supabase
        .from("notification_dispatch_log")
        .select("id")
        .eq("event_key", eventKey)
        .eq("status", "ok")
        .limit(1)
      if (logError) return false
      return (alreadySent || []).length > 0
    }

    const sendToMember = async (member: any, kind: "renewal" | "new", anchor: string) => {
      const eventKey = `medical-exam-${kind}:${member.id}:${anchor}`
      if (await wasAlreadySent(eventKey)) return

      const email = String(member.email || "").trim()
      const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim() || String(member.id)
      if (!email) {
        skipped.push(fullName)
        return
      }

      const company = String(member.company || "").trim()
      const dutch = isDutchOrBelgian(member.nationality)
      const letter = buildLetter(String(member.first_name || ""), company, kind === "renewal", dutch)
      const cc = email.toLowerCase() === WILLEM_EMAIL ? undefined : WILLEM_EMAIL

      try {
        await transporter.sendMail({
          from: `"Willem van der Bent" <${gmailUser}>`,
          to: email,
          cc,
          replyTo: WILLEM_EMAIL,
          subject: letter.subject,
          text: letter.text,
          html: textToHtml(letter.text),
        })
        sent.push(fullName)
        await logNotificationDispatch({
          event_key: eventKey,
          channel: "email",
          recipient: email,
          payload: { kind, cc: cc || null, company },
          status: "ok",
        })
      } catch (sendError: any) {
        sendErrors += 1
        await logNotificationDispatch({
          event_key: eventKey,
          channel: "email",
          recipient: email,
          payload: { kind },
          status: "error",
          error: sendError?.message || String(sendError),
        })
      }
    }

    const backlogKey = "medical-exam-backlog-complete"
    const backlogDone = await wasAlreadySent(backlogKey)
    if (!backlogDone) {
      for (const member of crew || []) {
        if (!onMedicalList(member)) continue
        const kind = currentListKind(member, today)
        if (!kind) continue
        const expiry = nextExaminationDate(member)
        const startDate = parseCrewDate(member.in_dienst_vanaf) || parseCrewDate(member.proeftijd_datum)
        const anchor =
          kind === "renewal" && expiry ? toYmd(expiry) : startDate ? toYmd(startDate) : `missing:${toYmd(today)}`
        await sendToMember(member, kind, anchor)
      }
      if (sendErrors === 0) {
        await logNotificationDispatch({
          event_key: backlogKey,
          channel: "email",
          recipient: "system",
          payload: { sent: sent.length, skippedNoEmail: skipped.length },
          status: "ok",
        })
      }
    }

    for (const member of crew || []) {
      if (!onMedicalList(member)) continue

      const startDate = parseCrewDate(member.in_dienst_vanaf)
      const expiry = nextExaminationDate(member)
      const isNewToday = !!startDate && sameDay(startDate, today)
      const expiresInThreeMonths = !!expiry && sameDay(addMonths(today, 3), expiry)
      if (!expiresInThreeMonths && !isNewToday) continue

      const kind = expiresInThreeMonths ? "renewal" : "new"
      const anchor = kind === "renewal" && expiry ? toYmd(expiry) : startDate ? toYmd(startDate) : toYmd(today)
      await sendToMember(member, kind, anchor)
    }

    return NextResponse.json({
      success: true,
      date: toYmd(today),
      backlog: !backlogDone,
      sent,
      skippedNoEmail: skipped,
      sendErrors,
    })
  } catch (error: any) {
    console.error("check-medical-examinations:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Onbekende fout" },
      { status: 500 }
    )
  }
}
