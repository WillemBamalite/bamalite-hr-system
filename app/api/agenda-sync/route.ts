import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import * as ical from 'node-ical'

// Zorg dat deze route altijd op de server runt
export const dynamic = 'force-dynamic'

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

function createImapConnection() {
  const { user, pass } = getGmailCredentials()

  const host = process.env.CALENDAR_SYNC_IMAP_HOST || 'imap.gmail.com'
  const port = Number(process.env.CALENDAR_SYNC_IMAP_PORT || '993')

  return new ImapFlow({
    host,
    port,
    secure: true,
    auth: {
      user,
      pass,
    },
    logger: false, // Disable verbose logging
  })
}

async function parseIcsToAgendaItems(
  icsContent: Buffer,
  voorWie: string | null
): Promise<AgendaItemInsert[]> {
  const text = icsContent.toString('utf8')
  const events = ical.sync.parseICS(text)

  const items: AgendaItemInsert[] = []

  for (const key of Object.keys(events)) {
    const ev: any = (events as any)[key]
    if (!ev || ev.type !== 'VEVENT') continue

    const start: Date | undefined = ev.start
    const end: Date | undefined = ev.end
    const summary: string = ev.summary || 'Agenda item'
    const description: string | undefined = ev.description
    const location: string | undefined = ev.location

    if (!start || !(start instanceof Date) || isNaN(start.getTime())) {
      continue
    }

    const startDateStr = start.toISOString().split('T')[0] // yyyy-MM-dd
    const endDateStr =
      end && end instanceof Date && !isNaN(end.getTime())
        ? end.toISOString().split('T')[0]
        : null

    // Tijd als HH:mm (locale onafhankelijk)
    const timeStr =
      start instanceof Date && !isNaN(start.getTime())
        ? start.toTimeString().slice(0, 5)
        : null

    let fullDescription = description || ''
    if (location) {
      fullDescription = fullDescription
        ? `${fullDescription}\nLocatie: ${location}`
        : `Locatie: ${location}`
    }

    items.push({
      title: summary,
      description: fullDescription || null,
      date: startDateStr,
      end_date: endDateStr,
      time: timeStr,
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
}> {
  const client = createImapConnection()
  let processed = 0
  let created = 0
  let skippedDuplicates = 0

  try {
    await client.connect()

    // Open INBOX
    const lock = await client.getMailboxLock('INBOX')
    try {
      // Zoek naar ongelezen berichten van de laatste 30 dagen
      const sinceDate = new Date()
      sinceDate.setDate(sinceDate.getDate() - 30)

      // Search for unseen messages since the date
      const messages = await client.search({
        seen: false,
        since: sinceDate,
      })

      if (!messages || messages.length === 0) {
        return { processed: 0, created: 0, skippedDuplicates: 0 }
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

          // Find ICS attachments
          const icsAttachments =
            (parsed.attachments || []).filter(
              (att) =>
                att.contentType === 'text/calendar' ||
                (att.filename && att.filename.toLowerCase().endsWith('.ics'))
            ) || []

          if (!icsAttachments.length) {
            continue
          }

          // Process each ICS attachment
          for (const att of icsAttachments) {
            const items = await parseIcsToAgendaItems(att.content, voorWie)

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

  return { processed, created, skippedDuplicates }
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
