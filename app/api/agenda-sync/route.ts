import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Zorg dat deze route altijd op de server runt
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Force Node.js runtime (not edge)

type AgendaItemInsert = {
  title: string
  description: string | null
  date: string
  end_date?: string | null
  time: string | null
  voor_wie: string | null
  color?: string | null
}

function getGmailCredentials() {
  const user = process.env.GMAIL_USER
  const rawPass = process.env.GMAIL_APP_PASSWORD

  if (!user || !rawPass) {
    throw new Error(
      'GMAIL_USER of GMAIL_APP_PASSWORD is niet ingesteld. Agenda-sync kan niet worden uitgevoerd.'
    )
  }

  // App-wachtwoorden kunnen spaties bevatten, die strippen we
  const pass = rawPass.replace(/\s+/g, '')

  return { user, pass }
}

async function parseIcsToAgendaItems(
  icsContent: Buffer,
  voorWie: string | null
): Promise<AgendaItemInsert[]> {
  // Eenvoudige, robuuste parser die direct de tekstregels van de ICS leest.
  // We vertrouwen niet op externe libs omdat Outlook/Google soms net andere
  // varianten sturen.
  const text = icsContent.toString('utf8')

  // Regels normaliseren en continuation lines samenvoegen
  const rawLines = text.split(/\r?\n/)
  const lines: string[] = []
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      // Vervolgregel van vorige property
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }

  // VEVENT-blokken vinden
  const blocks: string[][] = []
  let current: string[] | null = null

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      if (current) blocks.push(current)
      current = [line]
    } else if (line.startsWith('END:VEVENT')) {
      if (current) {
        current.push(line)
        blocks.push(current)
        current = null
      }
    } else if (current) {
      current.push(line)
    }
  }

  if (!blocks.length) {
    // Geen expliciete VEVENT-blokken; gebruik het hele bestand als één blok
    blocks.push(lines)
  }

  const getProp = (block: string[], name: string): string | null => {
    const prefix = name.toUpperCase()
    for (const line of block) {
      const upper = line.toUpperCase()
      if (upper.startsWith(prefix)) {
        const idx = line.indexOf(':')
        if (idx !== -1) {
          return line.slice(idx + 1).trim()
        }
      }
    }
    return null
  }

  const parseDateTime = (
    value: string
  ): { dateStr: string; timeStr: string | null } | null => {
    if (!value) return null
    let v = value.trim()
    // Tijdzone-suffix Z negeren voor datum/tijd weergave
    if (v.endsWith('Z')) v = v.slice(0, -1)

    // Verwachte formaten: YYYYMMDD of YYYYMMDDTHHMMSS
    if (v.length < 8) return null
    const year = parseInt(v.slice(0, 4), 10)
    const month = parseInt(v.slice(4, 6), 10)
    const day = parseInt(v.slice(6, 8), 10)
    if (!year || !month || !day) return null

    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${year}-${pad(month)}-${pad(day)}`

    let timeStr: string | null = null
    const tIndex = v.indexOf('T')
    if (tIndex >= 0 && v.length >= tIndex + 5) {
      const hour = parseInt(v.slice(tIndex + 1, tIndex + 3), 10) || 0
      const minute = parseInt(v.slice(tIndex + 3, tIndex + 5), 10) || 0
      timeStr = `${pad(hour)}:${pad(minute)}`
    }

    return { dateStr, timeStr }
  }

  const items: AgendaItemInsert[] = []

  for (const block of blocks) {
    const dtStartRaw = getProp(block, 'DTSTART')
    if (!dtStartRaw) continue

    const parsed = parseDateTime(dtStartRaw)
    if (!parsed) continue

    const dtEndRaw = getProp(block, 'DTEND')
    const parsedEnd = dtEndRaw ? parseDateTime(dtEndRaw) : null

    const summary =
      getProp(block, 'SUMMARY') ||
      'Agenda item (uit e-mail uitnodiging)'
    const description = getProp(block, 'DESCRIPTION')
    const location = getProp(block, 'LOCATION')

    let fullDescription = description || ''
    if (location) {
      fullDescription = fullDescription
        ? `${fullDescription}\nLocatie: ${location}`
        : `Locatie: ${location}`
    }

    items.push({
      title: summary,
      description: fullDescription || null,
      date: parsed.dateStr,
      end_date: parsedEnd ? parsedEnd.dateStr : null,
      time: parsed.timeStr,
      voor_wie: voorWie,
      color: '#3b82f6',
    })
  }

  return items
}

function detectVoorWieFromHeaders(headers: Map<string, any>): string | null {
  const to = String(headers.get('to') || '').toLowerCase()
  const cc = String(headers.get('cc') || '').toLowerCase()
  const all = `${to} ${cc}`

  if (all.includes('willem@bamalite.com')) return 'Willem'
  if (all.includes('leo@bamalite.com')) return 'Leo'
  if (all.includes('nautic@bamalite.com')) return 'Nautic'

  return null
}

async function processUnseenCalendarEmails(): Promise<{
  processed: number
  created: number
  skippedDuplicates: number
  messagesWithIcs: number
  totalIcsEvents: number
}> {
  // Lazy load dependencies only when route is called (not during build)
  const { ImapFlow } = await import('imapflow')
  const { simpleParser } = await import('mailparser')

  const { user, pass } = getGmailCredentials()
  const host = process.env.CALENDAR_SYNC_IMAP_HOST || 'imap.gmail.com'
  const port = Number(process.env.CALENDAR_SYNC_IMAP_PORT || '993')

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: {
      user,
      pass,
    },
    logger: false, // Disable verbose logging
  })

  let processed = 0
  let created = 0
  let skippedDuplicates = 0
  let messagesWithIcs = 0
  let totalIcsEvents = 0

  try {
    await client.connect()

    // Open INBOX
    const lock = await client.getMailboxLock('INBOX')
    try {
      // Zoek naar ongelezen berichten van de laatste 30 dagen
      const sinceDate = new Date()
      sinceDate.setDate(sinceDate.getDate() - 30)

      // Search for messages since the date (ook gelezen berichten)
      // We filter later op ICS-bijlagen en voorkomen duplicaten in de database
      const messages = await client.search({ since: sinceDate })

      if (!messages || messages.length === 0) {
        return { processed: 0, created: 0, skippedDuplicates: 0, messagesWithIcs: 0, totalIcsEvents: 0 }
      }

      // Fetch messages
      for (const seq of messages) {
        try {
          const message = await client.fetchOne(seq, {
            source: true,
            envelope: true,
          })

          if (!message || !message.source) {
            continue
          }

          processed += 1

          // Parse email
          const parsed = await simpleParser(message.source)

          const voorWie = detectVoorWieFromHeaders(parsed.headers)

          // Find ICS attachments (ruime check op calendar/ics)
          const icsAttachments =
            (parsed.attachments || []).filter((att) => {
              const ct = (att.contentType || '').toLowerCase()
              const fn = (att.filename || '').toLowerCase()
              return ct.includes('calendar') || fn.endsWith('.ics')
            }) || []

          if (!icsAttachments.length) {
            continue
          }

          messagesWithIcs += 1

          // Process each ICS attachment
          for (const att of icsAttachments) {
            const items = await parseIcsToAgendaItems(att.content, voorWie)
            totalIcsEvents += items.length

            for (const item of items) {
              // Duplicaten voorkomen: zelfde titel + datum + voor_wie
              const { data: existing, error: existingError } = await supabase
                .from('agenda_items')
                .select('id')
                .eq('title', item.title)
                .eq('date', item.date)
                .eq('voor_wie', item.voor_wie)
                .limit(1)
                .maybeSingle()

              if (existingError) {
                console.error('Error checking existing agenda item:', existingError)
                continue
              }

              if (existing) {
                skippedDuplicates += 1
                continue
              }

              const { error: insertError } = await supabase
                .from('agenda_items')
                .insert([
                  {
                    title: item.title,
                    description: item.description,
                    date: item.date,
                    end_date: item.end_date || null,
                    time: item.time,
                    voor_wie: item.voor_wie,
                    color: item.color || '#3b82f6',
                  },
                ])

              if (insertError) {
                console.error('Error inserting agenda item from ICS:', insertError)
                continue
              }

              created += 1
            }
          }

          // Mark message as seen
          await client.messageFlagsAdd(seq, ['\\Seen'])
        } catch (msgError) {
          console.error('Error processing message:', msgError)
        }
      }
    } finally {
      lock.release()
    }

    await client.logout()
  } catch (error) {
    console.error('IMAP connection error:', error)
    throw error
  } finally {
    // Ensure connection is closed
    try {
      if (client && !client.socket.destroyed) {
        await client.logout()
      }
    } catch (e) {
      // Ignore logout errors
    }
  }

  return { processed, created, skippedDuplicates, messagesWithIcs, totalIcsEvents }
}

export async function GET(_req: NextRequest) {
  try {
    const result = await processUnseenCalendarEmails()

    return NextResponse.json(
      {
        success: true,
        message: 'Agenda-sync uitgevoerd',
        ...result,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Agenda-sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Onbekende fout bij agenda-sync',
      },
      { status: 500 }
    )
  }
}
