import { getMonthKeyFromDate, parseCrewDate } from "@/utils/crew-filters"

export type SalaryDeductionCategory =
  | "lening"
  | "voorschot"
  | "kleding"
  | "opleidingskosten"
  | "boetes"
  | "overig"

export type SalaryDeduction = {
  id: string
  amount: number
  category: SalaryDeductionCategory
}

export const shiftMonthKey = (monthKey: string, deltaMonths: number) => {
  const [yearStr, monthStr] = (monthKey || "").split("-")
  const year = parseInt(yearStr || "0", 10)
  const month = parseInt(monthStr || "0", 10)
  if (!year || !month) {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }
  const d = new Date(year, month - 1, 1)
  d.setMonth(d.getMonth() + deltaMonths)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export type OvertimeInputMode = "days" | "amount"

export function resolveOvertimeInputMode(mode?: string | null): OvertimeInputMode {
  return mode === "amount" ? "amount" : "days"
}

export function isOvertimePayableRow(row: {
  overtime_enabled?: boolean
  overtime_mode?: string | null
  overtime_days?: number | null
  overtime_manual_amount?: number | null
}): boolean {
  if (!row.overtime_enabled) return false
  if (resolveOvertimeInputMode(row.overtime_mode) === "amount") {
    return Number(row.overtime_manual_amount || 0) > 0
  }
  return Number(row.overtime_days || 0) > 0
}

export function parseOvertimeDateRange(note: string): { from: Date | null; to: Date | null } {
  const regex = /van\s+(\d{2})-(\d{2})-(\d{4})\s+tot\s+(\d{2})-(\d{2})-(\d{4})/i
  const match = String(note || "").match(regex)
  if (!match) return { from: null, to: null }
  const from = parseCrewDate(`${match[3]}-${match[2]}-${match[1]}`)
  const to = parseCrewDate(`${match[6]}-${match[5]}-${match[4]}`)
  return { from, to }
}

/** Extra werk na de 25e hoort in de volgende salarismaand. */
export function getOvertimePayoutMonthKey(overtimeNote: string, rowMonthKey: string): string {
  const { from, to } = parseOvertimeDateRange(overtimeNote)
  const ref = to || from
  if (!ref) return rowMonthKey
  const refMonthKey = getMonthKeyFromDate(ref) || rowMonthKey
  if (ref.getDate() > 25) return shiftMonthKey(refMonthKey, 1)
  return refMonthKey
}

const formatDutchDateForSepa = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`

/** Omschrijving voor SEPA-betaling extra werk (max. leesbaar voor ontvanger). */
export function buildSepaExtraWorkMessage(overtimeNote: string, fallbackMonthKey: string): string {
  const note = String(overtimeNote || "").trim().toLowerCase()
  if (note.includes("handmatig")) {
    return `Extra werk ${fallbackMonthKey}`
  }
  const { from, to } = parseOvertimeDateRange(overtimeNote)
  if (from && to) {
    const fromStr = formatDutchDateForSepa(from)
    const toStr = formatDutchDateForSepa(to)
    if (fromStr === toStr) return `Extra werk ${fromStr}`
    return `Extra werk ${fromStr} t/m ${toStr}`
  }
  if (to) return `Extra werk ${formatDutchDateForSepa(to)}`
  if (from) return `Extra werk ${formatDutchDateForSepa(from)}`
  return `Extra werk ${fallbackMonthKey}`
}

export type SickDayBreakdown = {
  days80: number
  days100: number
  totalSickDays: number
}

const toDateKey = (d: Date) => {
  const copy = new Date(d)
  copy.setHours(12, 0, 0, 0)
  return `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, "0")}-${String(copy.getDate()).padStart(2, "0")}`
}

const getEmploymentDayRangeInMonth = (
  inServiceFrom: string | null | undefined,
  outOfServiceDate: string | null | undefined,
  monthKey: string
): { startDay: number; endDay: number; calendarDays: number } | null => {
  const [yearStr, monthStr] = monthKey.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!year || !month) return null

  const calendarDays = new Date(year, month, 0).getDate()
  const start = inServiceFrom ? parseCrewDate(inServiceFrom) : null
  const end = outOfServiceDate ? parseCrewDate(outOfServiceDate) : null

  const isStartMonth = !!(start && start.getFullYear() === year && start.getMonth() + 1 === month)
  const isEndMonth = !!(end && end.getFullYear() === year && end.getMonth() + 1 === month)

  if (!isStartMonth && !isEndMonth) {
    return { startDay: 1, endDay: calendarDays, calendarDays }
  }

  let rangeStart = 1
  let rangeEnd = calendarDays

  if (isStartMonth && start) {
    const startDay = start.getDate()
    if (startDay >= 25) return { startDay: 0, endDay: 0, calendarDays }
    rangeStart = Math.max(rangeStart, startDay)
  }

  if (isEndMonth && end) {
    rangeEnd = Math.min(rangeEnd, Math.max(1, end.getDate() - 1))
  }

  if (rangeEnd < rangeStart) return { startDay: 0, endDay: 0, calendarDays }
  return { startDay: rangeStart, endDay: rangeEnd, calendarDays }
}

export function getSickDaysInMonth(
  crewId: string,
  monthKey: string,
  sickRecords: any[],
  inServiceFrom?: string | null,
  outOfServiceDate?: string | null
): SickDayBreakdown {
  const [yearStr, monthStr] = monthKey.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!year || !month) return { days80: 0, days100: 0, totalSickDays: 0 }

  const employment = getEmploymentDayRangeInMonth(inServiceFrom, outOfServiceDate, monthKey)
  if (!employment || employment.endDay < employment.startDay || employment.startDay === 0) {
    return { days80: 0, days100: 0, totalSickDays: 0 }
  }

  const monthStart = new Date(year, month - 1, employment.startDay, 12, 0, 0, 0)
  const monthEnd = new Date(year, month - 1, employment.endDay, 12, 0, 0, 0)

  const dayMap = new Map<string, number>()

  for (const record of sickRecords || []) {
    if (String(record.crew_member_id) !== String(crewId)) continue
    const start = parseCrewDate(record.start_date)
    if (!start) continue
    const end = parseCrewDate(record.end_date) || monthEnd
    const pct = Number(record.salary_percentage ?? 80)
    const effectiveStart = start > monthStart ? start : monthStart
    const effectiveEnd = end < monthEnd ? end : monthEnd
    if (effectiveEnd < effectiveStart) continue

    const cursor = new Date(effectiveStart)
    cursor.setHours(12, 0, 0, 0)
    const endCursor = new Date(effectiveEnd)
    endCursor.setHours(12, 0, 0, 0)

    while (cursor <= endCursor) {
      const key = toDateKey(cursor)
      const existing = dayMap.get(key)
      if (existing === undefined || pct < existing) {
        dayMap.set(key, pct)
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  let days80 = 0
  let days100 = 0
  for (const pct of dayMap.values()) {
    if (pct >= 100) days100++
    else days80++
  }
  return { days80, days100, totalSickDays: days80 + days100 }
}

export function getSickSalaryNote(breakdown: SickDayBreakdown): string {
  if (breakdown.totalSickDays <= 0) return ""
  if (breakdown.days80 > 0 && breakdown.days100 > 0) return "ZIEK (100%/80%)"
  if (breakdown.days100 > 0) return "ZIEK (100%)"
  return "ZIEK (80%)"
}

export function applySickAdjustmentToSalary(
  fullMonthSalary: number,
  divisorDays: number,
  workedDaysInMonth: number | null,
  breakdown: SickDayBreakdown
): number {
  if (breakdown.totalSickDays <= 0 || divisorDays <= 0 || fullMonthSalary <= 0) {
    if (workedDaysInMonth === null) return fullMonthSalary
    if (workedDaysInMonth <= 0) return 0
    return (fullMonthSalary / divisorDays) * workedDaysInMonth
  }

  const totalDaysInScope = workedDaysInMonth ?? divisorDays
  if (totalDaysInScope <= 0) return 0

  const daily = fullMonthSalary / divisorDays
  const healthyDays = Math.max(0, totalDaysInScope - breakdown.totalSickDays)
  return healthyDays * daily + breakdown.days80 * daily * 0.8 + breakdown.days100 * daily
}

export function getTotalDeductionAmount(deductions: SalaryDeduction[]): number {
  return deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
}

export function normalizeDeductionsFromMeta(
  meta: { deductions?: SalaryDeduction[]; advance_enabled?: boolean; advance_amount?: number; deduction_category?: string } | null,
  dbRow?: { advance_enabled?: boolean; advance_amount?: number }
): SalaryDeduction[] {
  if (Array.isArray(meta?.deductions) && meta.deductions.length > 0) {
    return meta.deductions
      .filter((d) => Number(d.amount) > 0)
      .map((d, i) => ({
        id: String(d.id || `ded-${i}`),
        amount: Number(d.amount) || 0,
        category: (d.category as SalaryDeductionCategory) || "voorschot",
      }))
  }
  const enabled = dbRow?.advance_enabled === true || meta?.advance_enabled === true
  const amount =
    typeof dbRow?.advance_amount === "number"
      ? dbRow.advance_amount
      : Number(meta?.advance_amount || 0)
  if (enabled && amount > 0) {
    return [
      {
        id: "legacy",
        amount,
        category: (meta?.deduction_category as SalaryDeductionCategory) || "voorschot",
      },
    ]
  }
  return []
}

export function syncLegacyAdvanceFields(deductions: SalaryDeduction[]) {
  const total = getTotalDeductionAmount(deductions)
  return {
    advance_enabled: deductions.length > 0 && total > 0,
    advance_amount: total,
    deduction_category: deductions[0]?.category || "voorschot",
  }
}

export type OvertimeDisplayRow = {
  crew_id: string
  month_key: string
  overtime_days: number
  overtime_note: string
  iban: string
  approval_leo: boolean
  approval_karina: boolean
  approval_leo_paid_at: string
  approval_karina_paid_at: string
  sourceMonthKey: string
}

export function collectOverigeBetalingenForMonth(
  monthKey: string,
  currentRows: Array<{
    crew_id: string
    month_key: string
    overtime_enabled?: boolean
    overtime_mode?: string | null
    overtime_days?: number | null
    overtime_manual_amount?: number | null
    overtime_note?: string
    iban?: string
    approval_leo?: boolean
    approval_karina?: boolean
    approval_leo_paid_at?: string
    approval_karina_paid_at?: string
  }>,
  previousMonthRows: typeof currentRows
): OvertimeDisplayRow[] {
  const items: OvertimeDisplayRow[] = []

  const maybeAdd = (row: (typeof currentRows)[number], sourceMonthKey: string) => {
    if (!isOvertimePayableRow(row)) return
    const mode = resolveOvertimeInputMode(row.overtime_mode)
    const payoutMonth =
      mode === "amount"
        ? sourceMonthKey
        : getOvertimePayoutMonthKey(String(row.overtime_note || ""), sourceMonthKey)
    if (payoutMonth !== monthKey) return
    items.push({
      crew_id: String(row.crew_id),
      month_key: monthKey,
      overtime_days: Number(row.overtime_days || 0),
      overtime_note: String(row.overtime_note || ""),
      iban: String(row.iban || ""),
      approval_leo: !!row.approval_leo,
      approval_karina: !!row.approval_karina,
      approval_leo_paid_at: String(row.approval_leo_paid_at || ""),
      approval_karina_paid_at: String(row.approval_karina_paid_at || ""),
      sourceMonthKey,
    })
  }

  for (const row of currentRows) maybeAdd(row, row.month_key || monthKey)
  for (const row of previousMonthRows) maybeAdd(row, row.month_key || shiftMonthKey(monthKey, -1))

  return items
}
