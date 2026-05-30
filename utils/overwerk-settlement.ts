import { format, parseISO } from "date-fns"
import { supabase } from "@/lib/supabase"
import { calculateWorkDays } from "@/hooks/use-supabase-data"

export type OverwerkSettlementType = "none" | "pay" | "inhale"

const SETTLEMENT_LINE = /OVERWERK_SETTLEMENT:(none|pay|inhale)(?:\|processed)?/
const TRIP_NAME_SETTLEMENT = /\[(pay|inhale)\]/i

export const OVERWERK_TEGOED_REASON = "overwerk_tegoed"
const SALARY_META_PREFIX = "__SALARY_META__:"

export function buildOverwerkTripNotes(settlement: OverwerkSettlementType): string {
  const base = "Overwerker-toewijzing"
  if (settlement === "none") return base
  return `${base}\nOVERWERK_SETTLEMENT:${settlement}`
}

export function buildOverwerkTripName(shipLabel: string, settlement: OverwerkSettlementType): string {
  const base = `Overwerk ${shipLabel}`
  if (settlement === "none") return base
  return `${base} [${settlement}]`
}

export function parseOverwerkSettlement(trip: {
  notes?: string | null
  trip_name?: string | null
}): {
  type: OverwerkSettlementType
  processed: boolean
} {
  const text = String(trip.notes || "").replace(/\r\n/g, "\n")
  const match = text.match(SETTLEMENT_LINE)
  if (match) {
    const line = match[0]
    return {
      type: (match[1] as OverwerkSettlementType) || "none",
      processed: line.includes("|processed"),
    }
  }
  const nameMatch = String(trip.trip_name || "").match(TRIP_NAME_SETTLEMENT)
  if (nameMatch) {
    return { type: nameMatch[1].toLowerCase() as OverwerkSettlementType, processed: false }
  }
  return { type: "none", processed: false }
}

export function markSettlementProcessed(
  notes: string | null | undefined,
  trip?: { trip_name?: string | null }
): string {
  const parsed = parseOverwerkSettlement({ notes, trip_name: trip?.trip_name })
  let text = String(notes || "Overwerker-toewijzing").replace(/\r\n/g, "\n")
  if (SETTLEMENT_LINE.test(text)) {
    return text.replace(SETTLEMENT_LINE, (line) =>
      line.includes("|processed") ? line : `${line}|processed`
    )
  }
  if (parsed.type !== "none") {
    return `${text}\nOVERWERK_SETTLEMENT:${parsed.type}|processed`
  }
  return text
}

export function settlementTypeLabel(type: OverwerkSettlementType): string {
  switch (type) {
    case "pay":
      return "Extra uitbetalen"
    case "inhale":
      return "Dagen inhalen"
    default:
      return "Geen verrekening"
  }
}

/** Normaliseer DB-timestamp of ISO/NL-datum naar yyyy-MM-dd. */
export function normalizeTripDate(value: string | null | undefined): string | null {
  if (value == null || value === "") return null
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split("-")
    return `${y}-${m}-${d}`
  }
  try {
    const d = parseISO(s)
    if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd")
  } catch {
    /* ignore */
  }
  return null
}

function isoToMonthKey(isoDate: string): string {
  const d = parseISO(isoDate.length >= 10 ? isoDate.slice(0, 10) : isoDate)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function formatNlDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate.slice(0, 10)), "dd-MM-yyyy")
  } catch {
    return isoDate
  }
}

function buildOvertimeNote(from: string, to: string, shipName?: string): string {
  const shipPart = shipName ? ` (${shipName})` : ""
  return `Overwerk${shipPart} van ${formatNlDate(from)} tot ${formatNlDate(to)}`
}

function parseSalaryMeta(reason: string | null | undefined) {
  const text = String(reason || "")
  const idx = text.lastIndexOf(SALARY_META_PREFIX)
  if (idx < 0) return null
  try {
    return JSON.parse(text.slice(idx + SALARY_META_PREFIX.length).trim()) as Record<string, unknown>
  } catch {
    return null
  }
}

function stripSalaryMeta(reason: string | null | undefined): string {
  const text = String(reason || "")
  const idx = text.lastIndexOf(SALARY_META_PREFIX)
  if (idx < 0) return text.trim() || "Salarisadministratie"
  return text.slice(0, idx).trim() || "Salarisadministratie"
}

export function getStandBackBalanceSummary(
  records: Array<{
    crew_member_id?: string
    stand_back_status?: string
    stand_back_days_remaining?: number
    reason?: string
  }>,
  crewMemberId: string
) {
  const open = records.filter(
    (r) =>
      String(r.crew_member_id) === String(crewMemberId) &&
      r.stand_back_status === "openstaand"
  )
  const outstanding = open.reduce(
    (s, r) => s + Math.max(0, Number(r.stand_back_days_remaining || 0)),
    0
  )
  const credit = open.reduce(
    (s, r) => s + Math.max(0, -Number(r.stand_back_days_remaining || 0)),
    0
  )
  return { outstanding, credit, net: outstanding - credit }
}

export function computeOverwerkWorkDays(
  trip: {
    start_datum?: string | null
    start_date?: string | null
    start_tijd?: string | null
    eind_datum?: string | null
    end_date?: string | null
  },
  eindDatum: string,
  eindTijd: string
): number {
  const startRaw = trip.start_datum || trip.start_date
  const startOnly = normalizeTripDate(startRaw)
  const endOnly = normalizeTripDate(eindDatum || trip.eind_datum || trip.end_date)
  if (!startOnly || !endOnly) return 0

  const startTijd = trip.start_tijd || "08:00"
  const endTime = eindTijd || "17:00"
  let days = calculateWorkDays(startOnly, startTijd, endOnly, endTime)
  if (days <= 0 && startOnly <= endOnly) {
    days = 1
  }
  return days
}

export interface ProcessOverwerkSettlementResult {
  workDays: number
  messages: string[]
  applied: boolean
  settlementType: OverwerkSettlementType
}

async function upsertSalaryOvertime(params: {
  crewId: string
  company: string | null
  monthKey: string
  workDays: number
  overtimeNote: string
  tripId: string
}): Promise<{ newDays: number; prevDays: number; usedMetaFallback: boolean }> {
  const { crewId, company, monthKey, workDays, overtimeNote, tripId } = params

  const { data: existing, error: loadError } = await supabase
    .from("loon_bemerkingen")
    .select("*")
    .eq("crew_id", crewId)
    .eq("month_key", monthKey)
    .maybeSingle()

  if (loadError) throw loadError

  const meta = parseSalaryMeta(existing?.reason)
  const prevDays = Number(existing?.overtime_days ?? meta?.overtime_days ?? 0)
  const newDays = Math.round((prevDays + workDays) * 10) / 10
  const prevNote = String(existing?.overtime_note ?? meta?.overtime_note ?? "").trim()
  const newNote = prevNote ? `${prevNote}; ${overtimeNote}` : overtimeNote

  const reasonBase = stripSalaryMeta(existing?.reason)
  const mergedMeta = {
    ...(meta || {}),
    overtime_enabled: true,
    overtime_days: newDays,
    overtime_note: newNote,
  }
  const reasonWithMeta = `${reasonBase}\n${SALARY_META_PREFIX}${JSON.stringify(mergedMeta)}`

  const fullPayload: Record<string, unknown> = {
    crew_id: crewId,
    company: existing?.company ?? company ?? null,
    month_key: monthKey,
    overtime_enabled: true,
    overtime_days: newDays,
    overtime_note: newNote,
    reason: reasonWithMeta,
    notes:
      String(existing?.notes || "").trim() ||
      `Automatisch overwerk via overwerker-toewijzing (${tripId})`,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await supabase.from("loon_bemerkingen").update(fullPayload).eq("id", existing.id)
    if (!error) return { newDays, prevDays, usedMetaFallback: false }
    const msg = String(error.message || "").toLowerCase()
    if (!msg.includes("overtime") && !msg.includes("column")) throw error
    const { error: retry } = await supabase
      .from("loon_bemerkingen")
      .update({
        crew_id: crewId,
        company: fullPayload.company,
        month_key: monthKey,
        reason: reasonWithMeta,
        notes: fullPayload.notes,
        updated_at: fullPayload.updated_at,
      })
      .eq("id", existing.id)
    if (retry) throw retry
    return { newDays, prevDays, usedMetaFallback: true }
  }

  const insertPayload = {
    ...fullPayload,
    base_salary: null,
    travel_allowance: false,
    advance_enabled: false,
    advance_amount: 0,
    raise_enabled: false,
    raise_amount: 0,
  }
  const { error: insertError } = await supabase.from("loon_bemerkingen").insert([insertPayload])
  if (!insertError) return { newDays, prevDays, usedMetaFallback: false }

  const msg = String(insertError.message || "").toLowerCase()
  if (msg.includes("overtime") || msg.includes("column")) {
    const { error: retry } = await supabase.from("loon_bemerkingen").insert([
      {
        crew_id: crewId,
        company: company ?? null,
        month_key: monthKey,
        reason: reasonWithMeta,
        notes: insertPayload.notes,
      },
    ])
    if (retry) throw retry
    return { newDays, prevDays, usedMetaFallback: true }
  }
  throw insertError
}

export async function processOverwerkSettlement(params: {
  trip: {
    id: string
    notes?: string | null
    trip_name?: string | null
    aflosser_id?: string | null
    ship_id?: string | null
    start_datum?: string | null
    start_date?: string | null
    start_tijd?: string | null
    eind_datum?: string | null
    end_date?: string | null
    eind_tijd?: string | null
  }
  crewMember: {
    id: string
    company?: string | null
    first_name?: string
    last_name?: string
  }
  eindDatum: string
  eindTijd: string
  shipName?: string
  standBackRecords: Array<{
    id: string
    crew_member_id?: string
    stand_back_status?: string
    stand_back_days_remaining?: number
    stand_back_days_completed?: number
    stand_back_days_required?: number
    stand_back_history?: unknown[]
    reason?: string
    description?: string
    created_at?: string
  }>
  addStandBackRecord: (data: Record<string, unknown>) => Promise<unknown>
  updateStandBackRecord: (id: string, updates: Record<string, unknown>) => Promise<unknown>
}): Promise<ProcessOverwerkSettlementResult> {
  const { trip, crewMember, eindDatum, eindTijd, shipName, standBackRecords, addStandBackRecord, updateStandBackRecord } =
    params

  const { type, processed } = parseOverwerkSettlement(trip)
  const messages: string[] = []

  if (type === "none") {
    return {
      workDays: 0,
      messages: [
        "Geen verrekening gekozen op deze reis (of keuze niet opgeslagen). Kies bij toewijzen: uitbetalen of dagen inhalen.",
      ],
      applied: false,
      settlementType: type,
    }
  }

  if (processed) {
    return {
      workDays: 0,
      messages: ["Verrekening voor deze reis was al verwerkt."],
      applied: false,
      settlementType: type,
    }
  }

  const workDays = computeOverwerkWorkDays(trip, eindDatum, eindTijd)
  if (workDays <= 0) {
    return {
      workDays: 0,
      messages: [
        "Geen geldige periode op de reis (start/einddatum ontbreekt of einddatum ligt vóór start). Controleer de reis en probeer opnieuw.",
      ],
      applied: false,
      settlementType: type,
    }
  }

  const startOnly = normalizeTripDate(trip.start_datum || trip.start_date)!
  const endOnly = normalizeTripDate(eindDatum)!

  if (type === "pay") {
    const monthKey = isoToMonthKey(endOnly)
    const overtimeNote = buildOvertimeNote(startOnly, endOnly, shipName)

    const { data: existing } = await supabase
      .from("loon_bemerkingen")
      .select("id, month_closed, reason")
      .eq("crew_id", crewMember.id)
      .eq("month_key", monthKey)
      .maybeSingle()

    const meta = parseSalaryMeta(existing?.reason)
    const monthClosed =
      (existing as { month_closed?: boolean } | null)?.month_closed === true ||
      (meta?.month_closed as boolean) === true
    if (monthClosed) {
      return {
        workDays,
        messages: [
          `Salarismaand ${monthKey} is afgesloten — voeg handmatig ${workDays} overwerkdag(en) toe in de salarislijst.`,
        ],
        applied: false,
        settlementType: type,
      }
    }

    const { newDays, prevDays } = await upsertSalaryOvertime({
      crewId: crewMember.id,
      company: crewMember.company ?? null,
      monthKey,
      workDays,
      overtimeNote,
      tripId: trip.id,
    })

    if (prevDays > 0) {
      messages.push(
        `Salaris ${monthKey}: ${workDays} overwerkdag(en) bijgeteld (totaal ${newDays}). Er stond al ${prevDays} dag(en) overwerk — controleer de salarislijst (tab ${monthKey}).`
      )
    } else {
      messages.push(
        `Salaris ${monthKey}: ${workDays} overwerkdag(en) toegevoegd (totaal ${newDays}). Open de salarislijst voor maand ${monthKey}.`
      )
    }
  }

  if (type === "inhale") {
    const crewId = crewMember.id
    const open = standBackRecords.filter(
      (r) => String(r.crew_member_id) === String(crewId) && r.stand_back_status === "openstaand"
    )
    const debtRecords = open
      .filter(
        (r) =>
          r.reason !== OVERWERK_TEGOED_REASON &&
          !String(r.description || "").includes("Tegoed overwerk") &&
          Number(r.stand_back_days_remaining || 0) > 0
      )
      .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")))

    let tegoedRecord = open.find(
      (r) => r.reason === OVERWERK_TEGOED_REASON || String(r.description || "").includes("Tegoed overwerk")
    )
    let remainingWork = workDays
    let paidDebt = 0

    for (const rec of debtRecords) {
      if (remainingWork <= 0) break
      const debt = Number(rec.stand_back_days_remaining || 0)
      if (debt <= 0) continue
      const deduct = Math.min(remainingWork, debt)
      const newCompleted = Number(rec.stand_back_days_completed || 0) + deduct
      const newRemaining = debt - deduct
      const newStatus = newRemaining <= 0 ? "voltooid" : "openstaand"
      const historyEntry = {
        date: new Date().toISOString(),
        daysCompleted: deduct,
        note: `Overwerk ingehaald (${formatNlDate(endOnly)}, reis ${trip.id})`,
        completedBy: "Overwerker-systeem",
      }
      await updateStandBackRecord(rec.id, {
        stand_back_days_completed: newCompleted,
        stand_back_days_remaining: newRemaining,
        stand_back_status: newStatus,
        stand_back_history: [...(Array.isArray(rec.stand_back_history) ? rec.stand_back_history : []), historyEntry],
      })
      paidDebt += deduct
      remainingWork -= deduct
    }

    if (remainingWork > 0) {
      const creditDays = remainingWork
      if (tegoedRecord) {
        const currentRem = Number(tegoedRecord.stand_back_days_remaining || 0)
        const newRem = currentRem - creditDays
        const historyEntry = {
          date: new Date().toISOString(),
          daysCompleted: creditDays,
          note: `Tegoed +${creditDays} dagen via overwerk (${formatNlDate(endOnly)})`,
          completedBy: "Overwerker-systeem",
        }
        await updateStandBackRecord(tegoedRecord.id, {
          stand_back_days_remaining: newRem,
          stand_back_history: [
            ...(Array.isArray(tegoedRecord.stand_back_history) ? tegoedRecord.stand_back_history : []),
            historyEntry,
          ],
        })
        messages.push(
          `${paidDebt > 0 ? `${paidDebt} dag(en) afgeboekt van openstaand. ` : ""}${creditDays} dag(en) tegoed bijgewerkt (totaal ${Math.abs(newRem)} dagen vooruit). Zie Terug-te-staan.`
        )
      } else {
        await addStandBackRecord({
          crew_member_id: crewId,
          start_date: endOnly,
          end_date: endOnly,
          days_count: 0,
          description: "Tegoed overwerk (vooruit ingehaald)",
          reason: OVERWERK_TEGOED_REASON,
          stand_back_days_required: 0,
          stand_back_days_completed: 0,
          stand_back_days_remaining: -creditDays,
          stand_back_status: "openstaand",
          stand_back_history: [
            {
              date: new Date().toISOString(),
              daysCompleted: creditDays,
              note: `Tegoed aangemaakt via overwerk (${formatNlDate(endOnly)})`,
              completedBy: "Overwerker-systeem",
            },
          ],
        })
        messages.push(
          `${paidDebt > 0 ? `${paidDebt} dag(en) afgeboekt. ` : ""}${creditDays} dag(en) tegoed aangemaakt. Zie Terug-te-staan (groen label).`
        )
      }
    } else if (paidDebt > 0) {
      messages.push(`${paidDebt} terug-te-staan dag(en) afgeboekt via overwerk.`)
    }
  }

  return {
    workDays,
    messages,
    applied: true,
    settlementType: type,
  }
}

export async function fetchTripForSettlement(tripId: string) {
  const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle()
  if (error) throw error
  return data
}
