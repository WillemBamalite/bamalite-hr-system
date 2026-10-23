export type LoanScheduleRow = { period: string; amount: number }
export type LoanScheduleDraft = { period: string; amount: string }

export function isVariableLoanSchedule(loan: { installment_amount_mode?: string | null } | null | undefined) {
  return String(loan?.installment_amount_mode || "").toLowerCase() === "schedule"
}

export function parseLoanInstallmentSchedule(raw: unknown): LoanScheduleRow[] {
  const list = Array.isArray(raw) ? raw : []
  const byPeriod = new Map<string, number>()
  for (const item of list) {
    if (!item || typeof item !== "object") continue
    const period = String((item as { period?: unknown }).period || "").trim()
    const amount = Number((item as { amount?: unknown }).amount)
    if (!/^\d{4}-\d{2}$/.test(period)) continue
    if (!Number.isFinite(amount) || amount <= 0) continue
    byPeriod.set(period, Number(amount.toFixed(2)))
  }
  return [...byPeriod.entries()]
    .map(([period, amount]) => ({ period, amount }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

export function scheduleAmountForMonth(loan: { installment_schedule?: unknown } | null | undefined, ym: string) {
  const hit = parseLoanInstallmentSchedule(loan?.installment_schedule).find((row) => row.period === ym)
  return hit ? hit.amount : 0
}

export function draftScheduleToRows(
  rows: LoanScheduleDraft[]
): { ok: true; rows: LoanScheduleRow[] } | { ok: false; message: string } {
  const filled = rows.filter((row) => row.period.trim() || row.amount.trim())
  if (filled.length === 0) {
    return { ok: false, message: "Vul minstens één maand met een bedrag in." }
  }

  const parsed: LoanScheduleRow[] = []
  const seen = new Set<string>()
  for (const row of filled) {
    if (!/^\d{4}-\d{2}$/.test(row.period)) {
      return { ok: false, message: "Kies bij elke regel een maand." }
    }
    const amount = Number.parseFloat(String(row.amount).replace(",", "."))
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, message: "Vul bij elke maand een bedrag groter dan 0 in." }
    }
    if (seen.has(row.period)) {
      return { ok: false, message: "Elke maand mag maar één keer voorkomen." }
    }
    seen.add(row.period)
    parsed.push({ period: row.period, amount: Number(amount.toFixed(2)) })
  }

  parsed.sort((a, b) => a.period.localeCompare(b.period))
  return { ok: true, rows: parsed }
}

export function formatLoanSchedulePreview(raw: unknown) {
  const rows = parseLoanInstallmentSchedule(raw)
  const shown = rows.slice(0, 6).map((row) => {
    const [year, month] = row.period.split("-")
    return `${month}-${year} €${row.amount.toFixed(2)}`
  })
  const extra = rows.length > 6 ? ` +${rows.length - 6}` : ""
  return `${shown.join(", ")}${extra}`
}
