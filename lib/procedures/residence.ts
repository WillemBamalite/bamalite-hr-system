import type { ResidenceRouteId } from "@/lib/procedures/types"

const EU_EEA_SWISS = new Set([
  "NL",
  "BE",
  "DE",
  "FR",
  "LUX",
  "LU",
  "CZ",
  "SLK",
  "SK",
  "PO",
  "PL",
  "HUN",
  "HU",
  "RO",
])

/** true = EU/EER/Zwitserland, false = buiten dat gebied, null = onbekende code. */
export function isEuEeaSwissNationality(nationality: string | null | undefined): boolean | null {
  const code = String(nationality || "").trim().toUpperCase()
  if (!code) return null
  if (EU_EEA_SWISS.has(code)) return true
  if (code === "EG" || code === "SERV" || code === "RS") return false
  return null
}

function norm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

const COUNTRY_KEYS: { keys: string[]; id: ResidenceRouteId }[] = [
  { keys: ["nl", "nederland", "netherlands", "the netherlands", "holland", "pays-bas", "pays bas"], id: "nl" },
  { keys: ["be", "belgie", "belgium", "belgique", "belgien"], id: "be" },
  { keys: ["de", "duitsland", "germany", "allemagne", "deutschland"], id: "de" },
  { keys: ["fr", "frankrijk", "france", "frankreich"], id: "fr" },
  { keys: ["lu", "lux", "luxemburg", "luxembourg"], id: "lu" },
]

const NATIONALITY_FALLBACK: Record<string, ResidenceRouteId> = {
  NL: "nl",
  BE: "be",
  DE: "de",
  FR: "fr",
  LUX: "lu",
  LU: "lu",
}

export function resolveResidence(
  countryRaw: string | null | undefined,
  nationality: string | null | undefined
): { route: ResidenceRouteId; assumedFromNationality: boolean } {
  const country = norm(String(countryRaw || ""))
  if (country) {
    for (const entry of COUNTRY_KEYS) {
      if (entry.keys.includes(country)) {
        return { route: entry.id, assumedFromNationality: false }
      }
    }
    return { route: "other", assumedFromNationality: false }
  }

  const nationalityCode = String(nationality || "").trim().toUpperCase()
  const fallback = NATIONALITY_FALLBACK[nationalityCode]
  if (fallback) return { route: fallback, assumedFromNationality: true }
  return { route: "unknown", assumedFromNationality: false }
}
