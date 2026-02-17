import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AgendaInvitePayload = {
  title: string
  description?: string | null
  date: string // yyyy-MM-dd
  end_date?: string | null
  time?: string | null // HH:mm
  voor_wie?: string | null
  extra_emails?: string | null // comma/space separated
}

function getRecipients(voorWie?: string | null): string[] {
  if (!voorWie) return []
  const key = voorWie.toLowerCase().trim()

  // Zelfde mapping als taken / e-mails
  const emailMap: Record<string, string> = {
    nautic: 'nautic@bamalite.com',
    leo: 'leo@bamalite.com',
    willem: 'willem@bamalite.com',
    jos: 'jos@bamalite.com',
    bart: 'bart@bamalite.com',
  }

  if (key === 'algemeen') {
    // Voor nu: geen automatische uitnodiging voor "Algemeen"
    return []
  }

  const email = emailMap[key]
  return email ? [email] : []
}

function parseExtraEmails(input?: string | null): string[] {
  if (!input) return []
  const raw = input
    .split(/[,;\n\r\t ]+/g)
    .map((s) => s.trim())
    .filter(Boolean)

  // Very lightweight validation; Outlook will reject obviously invalid addresses anyway
  const valid = raw.filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  return valid
}

function uniqueEmails(emails: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const e of emails) {
    const key = e.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

function buildDateTimeStrings(date: string, time?: string | null): {
  dtStart: string
  dtEnd: string
} {
  // Verwacht datum als yyyy-MM-dd
  const [yearStr, monthStr, dayStr] = date.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)

  // Helper voor ICS-formaat
  const pad = (n: number) => String(n).padStart(2, '0')

  if (!time) {
    // Hele dag
    const dateStr = `${yearStr}${monthStr}${dayStr}`
    return {
      dtStart: `DTSTART;VALUE=DATE:${dateStr}`,
      dtEnd: `DTEND;VALUE=DATE:${dateStr}`,
    }
  }

  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr || '0', 10)
  const minute = parseInt(minuteStr || '0', 10)

  // Maak een Date in lokale tijd en voeg 1 uur toe voor eindtijd
  const start = new Date(year, month - 1, day, hour, minute, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)

  const formatLocal = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
      d.getHours()
    )}${pad(d.getMinutes())}00`

  return {
    dtStart: `DTSTART:${formatLocal(start)}`,
    dtEnd: `DTEND:${formatLocal(end)}`,
  }
}

function buildIcsContent(payload: AgendaInvitePayload, recipients: string[]): string {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@bamalite-hr-system`
  const dtStamp = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dtStampStr = `${dtStamp.getUTCFullYear()}${pad(
    dtStamp.getUTCMonth() + 1
  )}${pad(dtStamp.getUTCDate())}T${pad(dtStamp.getUTCHours())}${pad(
    dtStamp.getUTCMinutes()
  )}${pad(dtStamp.getUTCSeconds())}Z`

  const { dtStart, dtEnd } = buildDateTimeStrings(payload.date, payload.time)

  const description = (payload.description || '').replace(/\r?\n/g, '\\n')

  const attendeeLines = recipients
    .map((email) => `ATTENDEE;CN=${email};RSVP=TRUE:mailto:${email}`)
    .join('\r\n')

  return [
    'BEGIN:VCALENDAR',
    'PRODID:-//Bamalite//Bemanningslijst Agenda//NL',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStampStr}`,
    dtStart,
    dtEnd,
    `SUMMARY:${payload.title}`,
    description ? `DESCRIPTION:${description}` : '',
    attendeeLines,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ]
    .filter(Boolean)
    .join('\r\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgendaInvitePayload
    const { title, description, date, time, voor_wie, extra_emails } = body

    if (!title || !date) {
      return NextResponse.json(
        { success: false, message: 'Titel en datum zijn verplicht voor een uitnodiging.' },
        { status: 400 }
      )
    }

    const recipients = uniqueEmails([
      ...getRecipients(voor_wie),
      ...parseExtraEmails(extra_emails),
    ])
    if (!recipients.length) {
      // Geen ontvangers (bijv. Algemeen of leeg) -> geen fout, gewoon niets doen
      return NextResponse.json(
        { success: true, message: 'Geen ontvangers voor uitnodiging, e-mail wordt overgeslagen.' },
        { status: 200 }
      )
    }

    const gmailUser = process.env.GMAIL_USER
    const rawPass = process.env.GMAIL_APP_PASSWORD

    if (!gmailUser || !rawPass) {
      console.error('📅 Gmail credentials ontbreken voor agenda-invite.')
      return NextResponse.json(
        {
          success: false,
          message: 'Gmail is niet geconfigureerd voor agenda-uitnodigingen.',
        },
        { status: 503 }
      )
    }

    const gmailPass = rawPass.replace(/\s+/g, '')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    })

    const ics = buildIcsContent(body, recipients)

    await transporter.sendMail({
      from: `"Bemanningslijst Agenda" <${gmailUser}>`,
      to: recipients.join(','),
      subject: body.title,
      text: description || 'Agenda-uitnodiging',
      alternatives: [
        {
          contentType: 'text/calendar; method=REQUEST; charset="UTF-8"',
          content: ics,
        },
      ],
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Agenda-uitnodiging verstuurd.',
        recipients,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Agenda-invite error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Onbekende fout bij versturen agenda-uitnodiging.',
      },
      { status: 500 }
    )
  }
}

