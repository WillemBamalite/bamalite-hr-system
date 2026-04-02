import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendRecruitmentAckEmail } from "@/lib/recruitment-ack-email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type ParsedCandidate = {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationality: string
  position: string
  birthDate: string | null
  residence: string | null
  drivingLicense: boolean
  diplomas: string[]
  languages: string[]
  contactVia: string | null
  notes: string[]
}

type SyncStats = {
  processed: number
  created: number
  duplicates: number
  skipped: number
  errors: number
}

type DuplicateCheckResult = {
  exists: boolean
  matches: any[]
}

function getCredentials() {
  const user = process.env.GMAIL_USER
  const rawPass = process.env.GMAIL_APP_PASSWORD

  if (!user || !rawPass) {
    throw new Error("GMAIL_USER of GMAIL_APP_PASSWORD ontbreekt.")
  }

  return {
    user,
    pass: rawPass.replace(/\s+/g, ""),
  }
}

function normalizeText(input: string): string {
  return input
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeEmail(value: string | null): string | null {
  if (!value) return null
  const cleaned = value
    .replace(/<mailto:([^>]+)>/gi, "$1")
    .replace(/[<>]/g, "")
    .trim()

  // Pak exact het eerste geldige e-mailadres uit de tekstregel.
  // Sommige forwards bevatten meerdere adressen achter elkaar op dezelfde regel.
  const firstEmail = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null
  return firstEmail ? firstEmail.toLowerCase() : null
}

function extractSingleField(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\n)\\s*${label}\\s*:?\\s*\\n?\\s*([^\\n]+)`,
      "i"
    )
    const match = text.match(pattern)
    if (match?.[1]) {
      return collapseWhitespace(match[1])
    }
  }
  return null
}

function extractBlockUntilNextLabel(
  text: string,
  startLabels: string[],
  nextLabels: string[]
): string {
  for (const startLabel of startLabels) {
    const startRegex = new RegExp(`(?:^|\\n)\\s*${startLabel}\\s*:?`, "i")
    const startMatch = startRegex.exec(text)
    if (!startMatch) continue

    const contentStart = startMatch.index + startMatch[0].length
    const rest = text.slice(contentStart)

    let endIndex = rest.length
    for (const nextLabel of nextLabels) {
      const nextRegex = new RegExp(`\\n\\s*${nextLabel}(?:\\s*:)?`, "i")
      const nextMatch = nextRegex.exec(rest)
      if (nextMatch && nextMatch.index < endIndex) {
        endIndex = nextMatch.index
      }
    }

    return rest.slice(0, endIndex).trim()
  }

  return ""
}

function parseBirthDate(value: string | null): string | null {
  if (!value) return null

  // dd-mm-yyyy
  const dmy = value.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) {
    const [, dd, mm, yyyy] = dmy
    return `${yyyy}-${mm}-${dd}`
  }

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  return null
}

function mapNationality(raw: string | null): string {
  const value = (raw || "").toLowerCase()
  if (value.includes("neder")) return "NL"
  if (value.includes("pool")) return "PO"
  if (value.includes("tsje")) return "CZ"
  if (value.includes("slowa")) return "SLK"
  if (value.includes("serv")) return "SERV"
  if (value.includes("hong")) return "HUN"
  if (value.includes("belg")) return "BE"
  if (value.includes("fran")) return "FR"
  if (value.includes("duits")) return "DE"
  if (value.includes("lux")) return "LUX"
  if (value.includes("roeme")) return "RO"
  if (value.includes("egy")) return "EG"
  return "NL"
}

function mapPosition(raw: string | null): string {
  const value = (raw || "").trim()
  if (!value) return "Onbekend"
  return value
}

function parseYesNo(value: string | null): boolean {
  if (!value) return false
  const normalized = value.toLowerCase().trim()
  return ["ja", "yes", "y", "true"].includes(normalized)
}

function buildNotes(parsed: ParsedCandidate, source: { from: string; subject: string }) {
  const lines: string[] = []

  if (parsed.diplomas.length) {
    lines.push(`Papieren: ${parsed.diplomas.join(", ")}`)
  }
  if (parsed.languages.length) {
    lines.push(`Talen: ${parsed.languages.join(", ")}`)
  }
  if (parsed.contactVia) {
    lines.push(`Contact voorkeur: ${parsed.contactVia}`)
  }
  lines.push(`Bron e-mail: ${source.subject}`)
  lines.push(`Afzender: ${source.from}`)

  return lines
}

function parseCandidateFromMail(text: string, subject: string, from: string): ParsedCandidate | null {
  const normalized = normalizeText(text)

  const firstName = extractSingleField(normalized, ["Voornaam"])
  const lastName = extractSingleField(normalized, ["Achternaam"])
  if (!firstName || !lastName) {
    return null
  }

  const email = extractSingleField(normalized, ["Email", "E-mail"])
  const phone = extractSingleField(normalized, ["Telefoon nummer", "Telefoonnummer"])
  const residence = extractSingleField(normalized, ["Woonplaats"])
  const birthDateRaw = extractSingleField(normalized, ["Geboorte datum", "Geboortedatum"])
  const nationalityRaw = extractSingleField(normalized, ["Nationaliteit"])
  const positionRaw = extractSingleField(normalized, ["Ik wil graag solliciteren voor de functie"])
  const drivingLicenseRaw = extractSingleField(normalized, ["Rijbewijs"])
  const contactVia = extractSingleField(normalized, ["Jullie kunnen op de volgende manier contact met mij opnemen"])

  const papersBlock = extractBlockUntilNextLabel(
    normalized,
    ["Ik ben in het bezit van de volgende papieren"],
    [
      "In onze organisatie werken we samen",
      "Jullie kunnen op de volgende manier contact met mij opnemen",
      "Aanvullende opmerkingen",
    ]
  )
  const diplomas = papersBlock
    .split("\n")
    .map((line) => collapseWhitespace(line))
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().includes("ik ben in het bezit"))

  const languageBlock = extractBlockUntilNextLabel(
    normalized,
    ["In onze organisatie werken we samen"],
    ["Jullie kunnen op de volgende manier contact met mij opnemen", "Aanvullende opmerkingen"]
  )
  const languages = languageBlock
    .split("\n")
    .map((line) => collapseWhitespace(line))
    .filter((line) => /^engels\s*-/i.test(line))

  const parsed: ParsedCandidate = {
    firstName,
    lastName,
    email: normalizeEmail(email),
    phone: phone || null,
    nationality: mapNationality(nationalityRaw),
    position: mapPosition(positionRaw),
    birthDate: parseBirthDate(birthDateRaw),
    residence: residence || null,
    drivingLicense: parseYesNo(drivingLicenseRaw),
    diplomas,
    languages,
    contactVia: contactVia || null,
    notes: [],
  }

  parsed.notes = buildNotes(parsed, { from, subject })
  return parsed
}

async function candidateExists(candidate: ParsedCandidate): Promise<DuplicateCheckResult> {
  let query = supabase
    .from("crew")
    .select("id, first_name, last_name, email, phone, recruitment_status")
    .eq("first_name", candidate.firstName)
    .eq("last_name", candidate.lastName)
    .limit(20)

  const { data, error } = await query
  if (error) {
    throw error
  }

  const rows = data || []
  const matches = rows.filter((row: any) => {
    const sameEmail =
      candidate.email &&
      row.email &&
      String(candidate.email).toLowerCase() === String(row.email).toLowerCase()
    const samePhone =
      candidate.phone &&
      row.phone &&
      collapseWhitespace(candidate.phone) === collapseWhitespace(row.phone)
    // Alleen op naam dedupliceren als beide kanten geen e-mail en telefoon hebben.
    const bothMissingContact =
      !candidate.email && !candidate.phone && !row.email && !row.phone
    return Boolean(sameEmail || samePhone || bothMissingContact)
  })

  return {
    exists: matches.length > 0,
    matches,
  }
}

async function insertCandidate(candidate: ParsedCandidate) {
  const id = `crew-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()
  const today = now.split("T")[0]

  const payload: any = {
    id,
    first_name: candidate.firstName,
    last_name: candidate.lastName,
    phone: candidate.phone || "",
    email: candidate.email || "",
    position: candidate.position || "Onbekend",
    nationality: candidate.nationality || "NL",
    status: "nog-in-te-delen",
    sub_status: "nog-te-benaderen",
    regime: "",
    notes: candidate.notes,
    diplomas: candidate.diplomas,
    created_at: now,
    contact_via: candidate.contactVia,
    geplaatst_door: "Automatische e-mail import",
    is_student: false,
    education_type: null,
    smoking: false,
    driving_license: candidate.drivingLicense,
    residence: candidate.residence,
    birth_date: candidate.birthDate,
    start_mogelijkheid: null,
    datum_geplaatst: today,
  }

  const { error } = await supabase.from("crew").insert([payload])
  if (error) throw error
}

async function refreshExistingCandidate(existingId: string, candidate: ParsedCandidate) {
  const updatedNotes = candidate.notes
  const updates: any = {
    phone: candidate.phone || "",
    email: candidate.email || "",
    position: candidate.position || "Onbekend",
    nationality: candidate.nationality || "NL",
    status: "nog-in-te-delen",
    sub_status: "nog-te-benaderen",
    regime: "",
    notes: updatedNotes,
    diplomas: candidate.diplomas,
    contact_via: candidate.contactVia,
    geplaatst_door: "Automatische e-mail import",
    driving_license: candidate.drivingLicense,
    residence: candidate.residence,
    birth_date: candidate.birthDate,
    datum_geplaatst: new Date().toISOString().split("T")[0],
  }

  const { error } = await supabase
    .from("crew")
    .update(updates)
    .eq("id", existingId)
    .neq("recruitment_status", "aangenomen")

  if (error) throw error
}

async function processRecruitmentMails(
  dryRun: boolean,
  includeSeen: boolean,
  debug: boolean
): Promise<SyncStats & { debugItems?: any[] }> {
  const { ImapFlow } = await import("imapflow")
  const { simpleParser } = await import("mailparser")
  const { user, pass } = getCredentials()

  const subjectKeyword = (process.env.RECRUITMENT_SUBJECT_KEYWORD || "Sollicitatie bij Bamalite S.A.").toLowerCase()
  const host = process.env.RECRUITMENT_IMAP_HOST || "imap.gmail.com"
  const port = Number(process.env.RECRUITMENT_IMAP_PORT || "993")

  const stats: SyncStats = {
    processed: 0,
    created: 0,
    duplicates: 0,
    skipped: 0,
    errors: 0,
  }
  const debugItems: any[] = []

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock("INBOX")
    try {
      const sinceDate = new Date()
      sinceDate.setDate(sinceDate.getDate() - 14)

      const messageIds = includeSeen
        ? await client.search({ since: sinceDate })
        : await client.search({ seen: false, since: sinceDate })

      for (const seq of messageIds || []) {
        try {
          const msg = await client.fetchOne(seq, {
            source: true,
            envelope: true,
          })
          if (!msg?.source) continue

          const parsed = await simpleParser(msg.source)
          const subject = String(parsed.subject || "")
          const from = parsed.from?.text || parsed.from?.value?.[0]?.address || "onbekend"

          stats.processed += 1

          if (!subject.toLowerCase().includes(subjectKeyword)) {
            stats.skipped += 1
            continue
          }

          const body = parsed.text || parsed.html || ""
          const candidate = parseCandidateFromMail(String(body), subject, String(from))
          if (!candidate) {
            stats.skipped += 1
            continue
          }

          const duplicate = await candidateExists(candidate)
          if (duplicate.exists) {
            stats.duplicates += 1
            if (!dryRun) {
              const existing = duplicate.matches[0]
              if (existing?.id && existing?.recruitment_status !== "aangenomen") {
                await refreshExistingCandidate(existing.id, candidate)
              }
            }
            if (debug) {
              debugItems.push({
                subject,
                candidate,
                reason: "duplicate",
                matches: duplicate.matches,
              })
            }
            await client.messageFlagsAdd(seq, ["\\Seen"])
            continue
          }

          if (!dryRun) {
            await insertCandidate(candidate)
            if (candidate.email) {
              const ackResult = await sendRecruitmentAckEmail({
                firstName: candidate.firstName,
                email: candidate.email,
                nationality: candidate.nationality,
              })
              if (!ackResult.success) {
                console.warn("Ontvangstmail kon niet worden verzonden:", ackResult.error)
              }
            }
          }
          stats.created += 1
          if (debug) {
            debugItems.push({
              subject,
              candidate,
              reason: dryRun ? "would-create" : "created",
            })
          }

          await client.messageFlagsAdd(seq, ["\\Seen"])
        } catch (err) {
          stats.errors += 1
          console.error("Recruitment mail processing error:", err)
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    try {
      await client.logout()
    } catch {
      // ignore
    }
  }

  return debug ? { ...stats, debugItems } : stats
}

export async function GET(req: NextRequest) {
  try {
    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1"
    const includeSeen = req.nextUrl.searchParams.get("includeSeen") === "1"
    const debug = req.nextUrl.searchParams.get("debug") === "1"
    const result = await processRecruitmentMails(dryRun, includeSeen, debug)
    return NextResponse.json({
      success: true,
      dryRun,
      includeSeen,
      debug,
      message: dryRun
        ? "Recruitment-sync test uitgevoerd (zonder inserts)."
        : "Recruitment-sync uitgevoerd.",
      ...result,
    })
  } catch (error: any) {
    console.error("Recruitment-sync failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Onbekende fout bij recruitment-sync",
      },
      { status: 500 }
    )
  }
}

