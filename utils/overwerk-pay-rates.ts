/** Vast dagtarief overwerk per functie. `null` = basissalaris / 15 (excl. kleding). */

export const OVERWERK_CAPTAIN_RATE_EUR = 400
export const OVERWERK_STUURMAN_RATE_EUR = 250
export const OVERWERK_MATROOS_RATE_EUR = 200

function normalizePosition(position: string | null | undefined): string {
  return String(position || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ")
}

function usesSalaryPerFifteenDays(normalized: string): boolean {
  return (
    normalized.includes("lichtmatroos") ||
    normalized.includes("licht matroos") ||
    normalized.includes("deksman")
  )
}

function isCaptainTier(normalized: string): boolean {
  return (
    normalized.includes("kapitein") ||
    normalized.includes("captain") ||
    normalized.includes("schipper") ||
    normalized.includes("skipper") ||
    /\b2e\s*kapit/.test(normalized) ||
    normalized.includes("tweede kapitein")
  )
}

/** Vast €-tarief per overwerkdag, of `null` voor salaris / 15. */
export function getOverwerkDayRateEur(position: string | null | undefined): number | null {
  const normalized = normalizePosition(position)
  if (!normalized) return null

  if (usesSalaryPerFifteenDays(normalized)) return null
  if (isCaptainTier(normalized)) return OVERWERK_CAPTAIN_RATE_EUR
  if (normalized.includes("stuurman")) return OVERWERK_STUURMAN_RATE_EUR
  if (normalized.includes("matroos")) return OVERWERK_MATROOS_RATE_EUR

  return null
}

export function calculateOverwerkAmount(
  position: string | null | undefined,
  overtimeDays: number,
  baseSalaryExcl: number,
): number {
  if (overtimeDays <= 0) return 0

  const fixedRate = getOverwerkDayRateEur(position)
  if (fixedRate != null) return fixedRate * overtimeDays

  if (baseSalaryExcl <= 0) return 0
  return (baseSalaryExcl / 15) * overtimeDays
}
