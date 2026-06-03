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

function isTegoedHistoryEntry(entry: any): boolean {
  const note = String(entry?.note || "").toLowerCase()
  return note.includes("tegoed")
}

/** Teruggestane dagen (geen tegoed/overwerk-vooruit). */
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

  const history = Array.isArray(record.stand_back_history)
    ? record.stand_back_history
    : Array.isArray(record.standBackHistory)
      ? record.standBackHistory
      : []
  const historyTotal = history.reduce((sum: number, entry: any) => {
    if (isTegoedHistoryEntry(entry)) return sum
    const raw = entry?.daysCompleted
    const value = typeof raw === "number" ? raw : Number(raw || 0)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)
  if (history.length > 0) return historyTotal
  const completed = Number(
    record.stand_back_days_completed ?? record.standBackDaysCompleted ?? 0
  )
  return Number.isFinite(completed) ? completed : 0
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
  if (isTegoedStandBackRecord(record)) {
    const rem = Number(
      record.stand_back_days_remaining ?? record.standBackDaysRemaining ?? 0
    )
    return Math.max(0, -rem)
  }

  return 0
}

/**
 * Eén saldo: tegoed − openstaande mindagen.
 * Positief (+6) = vooruit, negatief intern → toon als openstaand (6).
 */
export function formatStandBackSaldo(netSaldo: number): string {
  if (netSaldo > 0) return `+${netSaldo}`
  if (netSaldo < 0) return String(Math.abs(netSaldo))
  return "0"
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
  const netSaldo = grossCredit - grossOutstanding

  return {
    totalRequired,
    totalReturned,
    netSaldo,
    grossOutstanding,
    grossCredit,
    totalOutstanding: Math.max(0, -netSaldo),
    totalCredit: Math.max(0, netSaldo),
  }
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
  const open = records.filter(
    (r) =>
      String(r.crew_member_id) === String(crewMemberId) &&
      r.stand_back_status === "openstaand"
  )
  const totals = computeMemberStandBackTotals(open)
  return {
    outstanding: totals.totalOutstanding,
    credit: totals.totalCredit,
    net: totals.netSaldo,
  }
}
