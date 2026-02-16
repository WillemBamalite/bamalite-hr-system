import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Imap from 'imap'
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

  return new Imap({
    user,
    password: pass,
    host,
    port,
    tls: true,
  })
}

function openInbox(imap: Imap): Promise<Imap.Box> {
  return new Promise((resolve, reject) => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err || !box) return reject(err || new Error('Kon INBOX niet openen'))
      resolve(box)
    })
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
  const imap = createImapConnection()

  return new Promise((resolve, reject) => {
    let processed = 0
    let created = 0
    let skippedDuplicates = 0

    imap.once('ready', () => {
      openInbox(imap)
        .then(() => {
          // Zoek naar ongelezen berichten van de laatste 30 dagen
          const sinceDate = new Date()
          sinceDate.setDate(sinceDate.getDate() - 30)
          const sinceStr = sinceDate.toDateString() // IMAP gebruikt bijv. "1-Feb-2025"

          imap.search(['UNSEEN', ['SINCE', sinceStr]], (err, results) => {
            if (err) {
              return reject(err)
            }

            if (!results || results.length === 0) {
              imap.end()
              return resolve({ processed: 0, created: 0, skippedDuplicates: 0 })
            }

            const f = imap.fetch(results, { bodies: '', struct: true, markSeen: true })

            f.on('message', (msg, seqno) => {
              let buffer = ''

              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8')
                })
              })

              msg.once('end', async () => {
                processed += 1
                try {
                  const parsed = await simpleParser(buffer)

                  const voorWie = detectVoorWieFromHeaders(parsed.headers)

                  const icsAttachments =
                    (parsed.attachments || []).filter(
                      (att) =>
                        att.contentType === 'text/calendar' ||
                        (att.filename && att.filename.toLowerCase().endsWith('.ics'))
                    ) || []

                  if (!icsAttachments.length) {
                    return
                  }

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
                } catch (e) {
                  console.error('Error processing calendar email:', e)
                }
              })
            })

            f.once('error', (fetchErr) => {
              reject(fetchErr)
            })

            f.once('end', () => {
              imap.end()
            })
          })
        })
        .catch((openErr) => {
          reject(openErr)
        })
    })

    imap.once('error', (err) => {
      reject(err)
    })

    imap.once('end', () => {
      resolve({ processed, created, skippedDuplicates })
    })

    imap.connect()
  })
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

