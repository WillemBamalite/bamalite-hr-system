export const OVERWERK_TEGOED_REASON = "overwerk_tegoed"

/** Alleen expliciete overwerk-tegoed registraties — geen gok op negatief saldo. */
export function isTegoedStandBackRecord(record: {
  reason?: string | null
  description?: string | null
}): boolean {
  if (record.reason === OVERWERK_TEGOED_REASON) return true
  const desc = String(record.description || "")
  return (
    desc.includes("Tegoed overwerk (vooruit ingehaald)") ||
    desc.includes("Tegoed overwerk")
  )
}

/** Weergave notitie: overwerk → "Overgewerkt op de {schip}". */
export function formatHistoryNoteLabel(entry: {
  note?: string | null
  completedBy?: string | null
}): string {
  const note = String(entry?.note || "").trim()
  if (note.startsWith("Overgewerkt op de ")) return note

  const isSystemOverwerk =
    entry?.completedBy === "Overwerker-systeem" ||
    /overwerk|tegoed/i.test(note)

  if (isSystemOverwerk) {
    const matches = note.match(/\(([^)]+)\)/g) || []
    for (const m of matches) {
      const inner = m.slice(1, -1).trim()
      if (/^\d{2}-\d{2}-\d{4}/.test(inner) || inner.includes("t/m")) continue
      if (/^\d+\s*dag/i.test(inner)) continue
      return `Overgewerkt op de ${inner}`
    }
  }

  return note || "-"
}

/** Periode-label voor een history-regel (overwerk / teruggestaan). */
export function formatHistoryPeriodLabel(
  entry: {
    periodStart?: string | null
    periodEnd?: string | null
    note?: string | null
    date?: string | null
  },
  record?: {
    start_date?: string | null
    end_date?: string | null
    startDate?: string | null
    endDate?: string | null
  }
): string {
  const fmt = (value: string) => {
    const iso = value.length >= 10 ? value.slice(0, 10) : value
    const d = new Date(iso)
    if (isNaN(d.getTime())) return value
    return d.toLocaleDateString("nl-NL")
  }

  const periodStart = entry?.periodStart
  const periodEnd = entry?.periodEnd
  if (periodStart && periodEnd) {
    return `${fmt(periodStart)} - ${fmt(periodEnd)}`
  }
  if (periodStart) return fmt(periodStart)

  const recStart = record?.start_date || record?.startDate
  const recEnd = record?.end_date || record?.endDate
  if (recStart && recEnd && recStart !== recEnd) {
    return `${fmt(recStart)} - ${fmt(recEnd)}`
  }
  if (recStart) return fmt(recStart)

  const note = String(entry?.note || "")
  const dateInNote = note.match(/(\d{2}-\d{2}-\d{4})/)
  if (dateInNote) return dateInNote[1]

  if (entry?.date) return fmt(String(entry.date))

  return "-"
}

export function isTegoedHistoryEntry(entry: any): boolean {
  const note = String(entry?.note || "").toLowerCase()
  return note.includes("tegoed")
}

/** Alleen echte terug-staan (geen tegoed-regels in history). */
export function isReturnedHistoryEntry(entry: any): boolean {
  const raw = entry?.daysCompleted
  const days = typeof raw === "number" ? raw : Number(raw || 0)
  if (!Number.isFinite(days) || days <= 0) return false
  return !isTegoedHistoryEntry(entry)
}

function getStandBackHistoryArray(record: {
  stand_back_history?: unknown
  standBackHistory?: unknown
}): unknown[] | null {
  if (Array.isArray(record.stand_back_history)) return record.stand_back_history
  if (Array.isArray(record.standBackHistory)) return record.standBackHistory
  return null
}

/** Som uit history — zelfde regels als tabel "Overwerk of teruggestaan". */
export function sumReturnedDaysFromHistory(record: {
  stand_back_history?: unknown
  standBackHistory?: unknown
  stand_back_days_completed?: number
  standBackDaysCompleted?: number
}): number {
  const history = getStandBackHistoryArray(record)
  if (history === null) {
    const completed = Number(
      record.stand_back_days_completed ?? record.standBackDaysCompleted ?? 0
    )
    return Number.isFinite(completed) ? completed : 0
  }
  return history.reduce((sum: number, entry: any) => {
    if (!isReturnedHistoryEntry(entry)) return sum
    const raw = entry?.daysCompleted
    const value = typeof raw === "number" ? raw : Number(raw || 0)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)
}

/** Tegoed-dagen uit history (positieve regels). */
export function sumCreditDaysFromHistory(record: {
  stand_back_history?: unknown
  standBackHistory?: unknown
  stand_back_days_remaining?: number
  standBackDaysRemaining?: number
}): number {
  const history = getStandBackHistoryArray(record)
  if (history === null) {
    const rem = Number(
      record.stand_back_days_remaining ?? record.standBackDaysRemaining ?? 0
    )
    return Math.max(0, -rem)
  }
  return history.reduce((sum: number, entry: any) => {
    const raw = entry?.daysCompleted
    const value = typeof raw === "number" ? raw : Number(raw || 0)
    return value > 0 ? sum + value : sum
  }, 0)
}

/** Teruggestane dagen op schuld-registraties (sync met history-tabel). */
export function getRecordReturnedDays(record: {
  stand_back_history?: unknown
  standBackHistory?: unknown
  stand_back_days_completed?: number
  standBackDaysCompleted?: number
  reason?: string | null
  description?: string | null
  stand_back_days_required?: number
  standBackDaysRequired?: number
  stand_back_days_remaining?: number
  standBackDaysRemaining?: number
}): number {
  if (isTegoedStandBackRecord(record)) return 0
  return sumReturnedDaysFromHistory(record)
}

/** Openstaande mindagen (positief saldo) voor één registratie. */
export function getRecordOutstandingDays(record: {
  stand_back_days_required?: number
  standBackDaysRequired?: number
  stand_back_days_remaining?: number
  standBackDaysRemaining?: number
  stand_back_history?: unknown
  standBackHistory?: unknown
  stand_back_days_completed?: number
  standBackDaysCompleted?: number
  reason?: string | null
  description?: string | null
}): number {
  if (isTegoedStandBackRecord(record)) return 0

  const required = Number(
    record.stand_back_days_required ?? record.standBackDaysRequired ?? 0
  )
  const returned = getRecordReturnedDays(record)
  return Math.max(0, required - returned)
}

/** Oudste open schuld-regel (nooit de overwerk-tegoed-regel). */
export function pickDebtRecordForReturn(
  records: Array<{
    createdAt?: string
    created_at?: string
    startDate?: string
    start_date?: string
    reason?: string | null
    description?: string | null
    stand_back_days_required?: number
    standBackDaysRequired?: number
    stand_back_history?: unknown
    standBackHistory?: unknown
    stand_back_days_completed?: number
    standBackDaysCompleted?: number
    stand_back_days_remaining?: number
    standBackDaysRemaining?: number
  }>
) {
  const debts = records
    .filter((r) => !isTegoedStandBackRecord(r))
    .sort(
      (a, b) =>
        new Date(a.created_at || a.createdAt || a.start_date || a.startDate || 0).getTime() -
        new Date(b.created_at || b.createdAt || b.start_date || b.startDate || 0).getTime()
    )
  const withOutstanding = debts.filter((r) => getRecordOutstandingDays(r) > 0)
  return withOutstanding[0] ?? debts[0] ?? null
}

/** Tegoed (vooruit ingehaald) voor één registratie. */
export function getRecordCreditDays(record: {
  stand_back_days_required?: number
  standBackDaysRequired?: number
  stand_back_days_remaining?: number
  standBackDaysRemaining?: number
  stand_back_history?: unknown
  standBackHistory?: unknown
  stand_back_days_completed?: number
  standBackDaysCompleted?: number
  reason?: string | null
  description?: string | null
}): number {
  if (!isTegoedStandBackRecord(record)) return 0
  return sumCreditDaysFromHistory(record)
}

/**
 * Huidige stand: +X = vooruit, X = nog X dagen inhalen, 0 = quitte.
 */
export function formatStandBackSaldo(netSaldo: number): string {
  if (netSaldo > 0) return `+${netSaldo}`
  if (netSaldo < 0) return String(Math.abs(netSaldo))
  return "0"
}

/** Korte toelichting bij het saldo-getal in de UI. */
export function formatStandBackSaldoHint(netSaldo: number): string {
  if (netSaldo > 0) return "dagen vooruit"
  if (netSaldo < 0) return "dagen nog te staan"
  return "alles ingehaald"
}

export function computeMemberStandBackTotals(
  records: Array<{
    standBackDaysRequired?: number
    stand_back_days_required?: number
    reason?: string | null
    description?: string | null
    stand_back_days_remaining?: number
    standBackDaysRemaining?: number
    stand_back_history?: unknown
    standBackHistory?: unknown
    stand_back_days_completed?: number
    standBackDaysCompleted?: number
  }>
) {
  const debtRecords = records.filter((r) => !isTegoedStandBackRecord(r))

  const totalRequired = debtRecords.reduce(
    (sum, r) =>
      sum + Number(r.standBackDaysRequired ?? r.stand_back_days_required ?? 0),
    0
  )
  const totalReturned = debtRecords.reduce(
    (sum, r) => sum + getRecordReturnedDays(r),
    0
  )
  const grossCredit = records
    .filter((r) => isTegoedStandBackRecord(r))
    .reduce((sum, r) => sum + getRecordCreditDays(r), 0)
  const grossOutstanding = Math.max(0, totalRequired - totalReturned)
  const totalIngehaald = totalReturned + grossCredit
  const netSaldo = totalIngehaald - totalRequired

  return {
    totalRequired,
    totalReturned,
    totalIngehaald,
    netSaldo,
    grossOutstanding,
    grossCredit,
    totalOutstanding: Math.max(0, -netSaldo),
    totalCredit: Math.max(0, netSaldo),
  }
}

/** Groepeer overwerk-afboekingen van dezelfde reis (meerdere schuldregels → één UI-regel). */
export function getOverwerkTripHistoryKey(entry: {
  completedBy?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  tripId?: string | null
}): string | null {
  if (entry.completedBy !== "Overwerker-systeem") return null
  if (entry.tripId) return `trip:${entry.tripId}`
  const ps = String(entry.periodStart || "").slice(0, 10)
  const pe = String(entry.periodEnd || "").slice(0, 10)
  if (ps && pe) return `period:${ps}|${pe}`
  return null
}

export type IngehaaldHistorySourceRef = { recordId: string; historyIndex: number }

export function consolidateIngehaaldHistoryForDisplay<
  T extends {
    completedBy?: string | null
    periodStart?: string | null
    periodEnd?: string | null
    tripId?: string | null
    daysCompleted: number
    date?: string | null
    recordId: string
    historyIndex: number
  },
>(entries: T[]): Array<T & { sourceEntries?: IngehaaldHistorySourceRef[] }> {
  const standalone: Array<T & { sourceEntries?: IngehaaldHistorySourceRef[] }> = []
  const overwerkGroups = new Map<string, T[]>()

  for (const entry of entries) {
    const key = getOverwerkTripHistoryKey(entry)
    if (key) {
      const list = overwerkGroups.get(key) || []
      list.push(entry)
      overwerkGroups.set(key, list)
    } else {
      standalone.push(entry)
    }
  }

  const consolidated: Array<T & { sourceEntries?: IngehaaldHistorySourceRef[] }> = []

  for (const group of overwerkGroups.values()) {
    if (group.length === 1) {
      consolidated.push(group[0])
      continue
    }
    const sorted = [...group].sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    )
    const primary = sorted[0]
    const totalDays = group.reduce((sum, e) => sum + (e.daysCompleted || 0), 0)
    consolidated.push({
      ...primary,
      daysCompleted: totalDays,
      sourceEntries: group.map((e) => ({
        recordId: e.recordId,
        historyIndex: e.historyIndex,
      })),
    })
  }

  return [...standalone, ...consolidated].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  )
}

export function getStandBackBalanceSummary(
  records: Array<{
    crew_member_id?: string
    stand_back_status?: string
    stand_back_days_required?: number
    stand_back_days_remaining?: number
    stand_back_days_completed?: number
    stand_back_history?: unknown
    reason?: string | null
    description?: string | null
  }>,
  crewMemberId: string
) {
  const active = records.filter(
    (r) =>
      String(r.crew_member_id) === String(crewMemberId) &&
      (r.stand_back_status === "openstaand" ||
        r.stand_back_status === "voltooid") &&
      !String(r.description || "").includes("[UIT DIENST")
  )
  const totals = computeMemberStandBackTotals(active)
  return {
    outstanding: totals.totalOutstanding,
    credit: totals.totalCredit,
    net: totals.netSaldo,
  }
}
