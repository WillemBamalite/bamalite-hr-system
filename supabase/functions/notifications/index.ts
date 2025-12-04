// Supabase Edge Function: Daily notifications for sick leave certificates (7 days) and medical examinations (90 days)
// Uses Resend API to send a summary email to nautic@bamalite.com

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type CrewRow = {
  id: string
  first_name: string | null
  last_name: string | null
  status: string | null
  position: string | null
  is_aflosser: boolean | null
  is_student: boolean | null
  education_type: string | null
  laatste_keuring_datum: string | null
  fit_verklaard: boolean | null
  fit_verklaard_jaren: number | null
  proeftijd_datum: string | null
}

type SickLeaveRow = {
  id: string
  crew_member_id: string
  status: 'actief' | 'wacht-op-briefje' | 'afgerond'
  certificate_valid_until: string | null
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function differenceInDays(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function addYears(date: Date, years: number) {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d
}

function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function formatDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

serve(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Missing Supabase env', { status: 500 })
  }
  if (!RESEND_API_KEY) {
    return new Response('Missing RESEND_API_KEY', { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const today = new Date()

  // 1) Sick leave certificates expiring in <= 7 days (and not past)
  const { data: sick, error: sickErr } = await supabase
    .from('sick_leave')
    .select('id, crew_member_id, status, certificate_valid_until')
    .in('status', ['actief', 'wacht-op-briefje']) as unknown as { data: SickLeaveRow[] | null, error: any }

  if (sickErr) {
    return new Response(`Sick query error: ${JSON.stringify(sickErr)}`, { status: 500 })
  }

  const sickExpiring = (sick || []).filter((row) => {
    if (!row.certificate_valid_until) return false
    const exp = new Date(row.certificate_valid_until)
    const diff = differenceInDays(exp, today)
    return diff >= 0 && diff <= 7
  })

  // 2) Medical examinations due within <= 90 days (not overdue), same rules as UI
  const { data: crewRows, error: crewErr } = await supabase
    .from('crew')
    .select('id, first_name, last_name, status, position, is_aflosser, is_student, education_type, laatste_keuring_datum, fit_verklaard, fit_verklaard_jaren, proeftijd_datum') as unknown as { data: CrewRow[] | null, error: any }

  if (crewErr) {
    return new Response(`Crew query error: ${JSON.stringify(crewErr)}`, { status: 500 })
  }

  const relevantCrew = (crewRows || []).filter((c) =>
    c.status !== 'uit-dienst' &&
    c.position !== 'Aflosser' &&
    (c.is_aflosser !== true) &&
    !(c.is_student && c.education_type === 'BOL')
  )

  const medicalDueSoon: { id: string; name: string; nextDate: Date }[] = []
  for (const m of relevantCrew) {
    const isNewMember = !m.laatste_keuring_datum && !!m.proeftijd_datum
    if (isNewMember) {
      const proeftijdStart = new Date(m.proeftijd_datum as string)
      const deadline = addYears(addMonths(proeftijdStart, 3), 1)
      const diff = differenceInDays(deadline, today)
      if (diff >= 0 && diff <= 90) {
        medicalDueSoon.push({ id: m.id, name: `${m.first_name || ''} ${m.last_name || ''}`.trim(), nextDate: deadline })
      }
      continue
    }
    if (m.laatste_keuring_datum) {
      const last = new Date(m.laatste_keuring_datum)
      const geldigheid = typeof m.fit_verklaard_jaren === 'number' && m.fit_verklaard_jaren !== null && m.fit_verklaard_jaren !== undefined
        ? m.fit_verklaard_jaren
        : (m.fit_verklaard === false ? 1 : 3)
      
      // Bereken volgende keuringsdatum (ondersteun zowel jaren als 0.5 voor 6 maanden)
      let next: Date
      if (geldigheid === 0.5) {
        next = addMonths(last, 6)
      } else {
        next = addYears(last, geldigheid)
      }
      
      const diff = differenceInDays(next, today)
      if (diff >= 0 && diff <= 90) {
        medicalDueSoon.push({ id: m.id, name: `${m.first_name || ''} ${m.last_name || ''}`.trim(), nextDate: next })
      }
    }
  }

  // Join sick leave rows with crew for names
  const crewMap = new Map<string, CrewRow>((crewRows || []).map(c => [c.id, c]))
  const sickItems = sickExpiring.map((s) => {
    const cm = crewMap.get(s.crew_member_id)
    const name = cm ? `${cm.first_name || ''} ${cm.last_name || ''}`.trim() : s.crew_member_id
    const exp = s.certificate_valid_until ? formatDate(new Date(s.certificate_valid_until)) : '-'
    return { name, exp }
  })

  // Compose email
  const to = 'nautic@bamalite.com'
  const subject = 'Bamalite HR: Meldingen ziekbriefjes (7d) en keuringen (90d)'
  const sickHtml = sickItems.length
    ? `<ul>${sickItems.map(i => `<li>${i.name}: briefje verloopt op ${i.exp}</li>`).join('')}</ul>`
    : '<p>Geen ziekbriefjes die binnen 7 dagen verlopen.</p>'
  const medHtml = medicalDueSoon.length
    ? `<ul>${medicalDueSoon
        .sort((a,b) => a.nextDate.getTime() - b.nextDate.getTime())
        .map(i => `<li>${i.name}: volgende keuring op ${formatDate(i.nextDate)}</li>`)
        .join('')}</ul>`
    : '<p>Geen medische keuringen die binnen 3 maanden verlopen.</p>'

  const html = `
    <div style="font-family:Arial, sans-serif; font-size:14px; color:#111">
      <h2>Bamalite HR – Dagelijkse meldingen</h2>
      <h3>Ziektebriefjes (verloopt binnen 7 dagen)</h3>
      ${sickHtml}
      <h3>Medische keuringen (verloopt binnen 3 maanden)</h3>
      ${medHtml}
      <hr/>
      <p style="color:#666">Automatisch gegenereerd op ${formatDate(today)}.</p>
    </div>
  `

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Bamalite HR <notifications@bamalite-hr.local>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    return new Response(`Email send error: ${text}`, { status: 500 })
  }

  return new Response('OK')
})


