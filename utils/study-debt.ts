/** Elk vol jaar in dienst na de betaaldatum vervalt dit bedrag. */
export const STUDY_VEST_PER_YEAR = 500

export type StudyDebtSnapshot = {
  yearsInServiceAfterPayment: number
  vested: number
  remaining: number
  yearsLeft: number
  nextVestDate: Date | null
  nextVestAmount: number
}

export function roundEuro(amount: number): number {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""))
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return null
  return date
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Zelfde kalenderdag, N jaar later. 29 februari valt in een niet-schrikkeljaar op 28 februari. */
export function addYearsClamped(date: Date, years: number): Date {
  const month = date.getMonth()
  const day = date.getDate()
  const next = new Date(date.getFullYear() + years, month, day)
  if (next.getMonth() !== month) {
    return new Date(date.getFullYear() + years, month + 1, 0)
  }
  return next
}

/** Volle jaren tussen betaaldatum en peildatum. De betaaldag zelf telt als 0 jaar. */
export function fullYearsInServiceAfterPayment(paidOn: Date, asOf: Date): number {
  const paid = startOfDay(paidOn)
  const end = startOfDay(asOf)
  if (end < paid) return 0
  let years = end.getFullYear() - paid.getFullYear()
  const anniversary = addYearsClamped(paid, years)
  if (end < anniversary) years -= 1
  return Math.max(0, years)
}

export function studyDebtSnapshot(amount: number, paidOn: string, asOf: Date): StudyDebtSnapshot {
  const total = roundEuro(Math.max(0, Number(amount) || 0))
  const paid = parseIsoDate(paidOn)
  if (!paid || total <= 0) {
    return {
      yearsInServiceAfterPayment: 0,
      vested: 0,
      remaining: total,
      yearsLeft: 0,
      nextVestDate: null,
      nextVestAmount: 0,
    }
  }

  const years = fullYearsInServiceAfterPayment(paid, asOf)
  const vested = roundEuro(Math.min(total, years * STUDY_VEST_PER_YEAR))
  const remaining = roundEuro(Math.max(0, total - vested))
  const yearsLeft = remaining <= 0 ? 0 : Math.ceil(remaining / STUDY_VEST_PER_YEAR - 1e-9)
  const nextVestAmount = remaining <= 0 ? 0 : roundEuro(Math.min(STUDY_VEST_PER_YEAR, remaining))
  const nextVestDate = remaining <= 0 ? null : addYearsClamped(paid, years + 1)

  return {
    yearsInServiceAfterPayment: years,
    vested,
    remaining,
    yearsLeft,
    nextVestDate,
    nextVestAmount,
  }
}

/** Peildatum: bij uit dienst stopt het vervallen op de uit-dienstdatum. */
export function studyAsOfDate(crewMember: any, today = new Date(), overrideIso?: string): Date {
  const raw =
    overrideIso ||
    (String(crewMember?.status || "") === "uit-dienst" ? crewMember?.out_of_service_date : null)
  const parsed = raw ? parseIsoDate(String(raw)) : null
  return parsed || startOfDay(today)
}

export function isOpenStudyDebt(study: any, crewMember?: any, today = new Date()): boolean {
  if (study?.settled_at) return false
  const snapshot = studyDebtSnapshot(Number(study?.amount || 0), String(study?.paid_on || ""), studyAsOfDate(crewMember, today))
  return snapshot.remaining > 0.009
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(roundEuro(amount))
}

export function openLoanRemaining(loan: any): number {
  if (loan?.amount_remaining != null && loan.amount_remaining !== "") {
    return roundEuro(Number(loan.amount_remaining))
  }
  return roundEuro(Math.max(0, Number(loan?.amount || 0) - Number(loan?.amount_paid || 0)))
}
