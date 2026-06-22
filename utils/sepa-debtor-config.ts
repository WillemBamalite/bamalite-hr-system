import defaultSepaDebtors from "@/config/sepa-debtors.json"

export type SepaDebtorConfig = {
  name: string
  iban: string
  bic: string
}

/** Officiële firmanamen zoals in crew.company / firma-wisseling. */
export const SEPA_COMPANY_CANONICAL_NAMES = [
  "Bamalite S.A.",
  "Alcina S.A.",
  "Europe Shipping AG.",
  "Brugo Shipping SARL.",
  "Devel Shipping S.A.",
] as const

const normalizeCompanyKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")

const normalizeIban = (iban: string) => String(iban || "").replace(/\s+/g, "").toUpperCase()

function normalizeDebtorMap(parsed: Record<string, Partial<SepaDebtorConfig>>): Record<string, SepaDebtorConfig> {
  const result: Record<string, SepaDebtorConfig> = {}
  for (const [key, value] of Object.entries(parsed || {})) {
    const name = String(value?.name || key).trim()
    const iban = normalizeIban(String(value?.iban || ""))
    const bic = String(value?.bic || "").trim().toUpperCase()
    if (!name || !iban || !bic) continue
    result[key.trim()] = { name, iban, bic }
  }
  return result
}

const COMPANY_ALIASES: Record<string, string> = {
  bamalite: "Bamalite S.A.",
  "bamalite sa": "Bamalite S.A.",
  alcina: "Alcina S.A.",
  "alcina sa": "Alcina S.A.",
  "europe shipping": "Europe Shipping AG.",
  "europe shipping ag": "Europe Shipping AG.",
  brugo: "Brugo Shipping SARL.",
  "brugo shipping": "Brugo Shipping SARL.",
  "brugo shipping sarl": "Brugo Shipping SARL.",
  devel: "Devel Shipping S.A.",
  "devel shipping": "Devel Shipping S.A.",
  "devel shipping sa": "Devel Shipping S.A.",
}

export function parseSepaDebtorsFromEnv(): Record<string, SepaDebtorConfig> {
  const raw = String(process.env.NEXT_PUBLIC_SEPA_DEBTORS_JSON || "").trim()
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, Partial<SepaDebtorConfig>>
      const result = normalizeDebtorMap(parsed)
      if (Object.keys(result).length > 0) return result
    } catch {
      /* fallback naar legacy env / repo-default */
    }
  }

  const legacyName = String(process.env.NEXT_PUBLIC_SEPA_DEBTOR_NAME || "").trim()
  const legacyIban = normalizeIban(String(process.env.NEXT_PUBLIC_SEPA_DEBTOR_IBAN || ""))
  const legacyBic = String(process.env.NEXT_PUBLIC_SEPA_DEBTOR_BIC || "")
    .trim()
    .toUpperCase()
  if (legacyName && legacyIban && legacyBic) {
    const legacy: SepaDebtorConfig = { name: legacyName, iban: legacyIban, bic: legacyBic }
    return { [legacyName]: legacy }
  }

  return normalizeDebtorMap(defaultSepaDebtors as Record<string, Partial<SepaDebtorConfig>>)
}

export function resolveSepaDebtorForCompany(
  company: string,
  debtors: Record<string, SepaDebtorConfig> = parseSepaDebtorsFromEnv()
): SepaDebtorConfig | null {
  const normalized = normalizeCompanyKey(company)
  if (!normalized) return null

  for (const [key, config] of Object.entries(debtors)) {
    if (normalizeCompanyKey(key) === normalized) return config
    if (normalizeCompanyKey(config.name) === normalized) return config
  }

  const canonical = COMPANY_ALIASES[normalized]
  if (canonical && debtors[canonical]) return debtors[canonical]

  for (const [key, config] of Object.entries(debtors)) {
    const keyNorm = normalizeCompanyKey(key)
    if (normalized.includes(keyNorm) || keyNorm.includes(normalized)) return config
    const nameNorm = normalizeCompanyKey(config.name)
    if (normalized.includes(nameNorm) || nameNorm.includes(normalized)) return config
  }

  const onlyDebtor = Object.values(debtors)
  if (onlyDebtor.length === 1) return onlyDebtor[0]

  return null
}

export function listConfiguredSepaCompanies(debtors: Record<string, SepaDebtorConfig> = parseSepaDebtorsFromEnv()) {
  return Object.values(debtors).map((d) => d.name)
}
