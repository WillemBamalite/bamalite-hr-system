export type CrewExportFieldId =
  | "name"
  | "position"
  | "ship"
  | "status"
  | "phone"
  | "email"
  | "nationality"
  | "birth_date"
  | "address"
  | "regime"
  | "in_dienst_vanaf"
  | "dienstjaren"

export type CrewExportField = {
  id: CrewExportFieldId
  label: string
  defaultSelected: boolean
}

export const CREW_EXPORT_FIELDS: CrewExportField[] = [
  { id: "name", label: "Naam", defaultSelected: true },
  { id: "position", label: "Functie", defaultSelected: true },
  { id: "ship", label: "Schip", defaultSelected: true },
  { id: "status", label: "Status", defaultSelected: false },
  { id: "phone", label: "Telefoon", defaultSelected: true },
  { id: "email", label: "E-mail", defaultSelected: true },
  { id: "nationality", label: "Nationaliteit", defaultSelected: false },
  { id: "birth_date", label: "Geboortedatum", defaultSelected: false },
  { id: "address", label: "Adres", defaultSelected: false },
  { id: "regime", label: "Regime", defaultSelected: false },
  { id: "in_dienst_vanaf", label: "In dienst vanaf", defaultSelected: false },
  { id: "dienstjaren", label: "Jaren", defaultSelected: false },
]

export const RANK_ORDER = [
  "Kapitein",
  "Stuurman",
  "Lichtmatroos",
  "Matroos",
  "Deksman",
  "Aflosser",
] as const

export type CrewExportRankId = (typeof RANK_ORDER)[number] | "Overig"

export type CrewExportRankOption = {
  id: CrewExportRankId
  label: string
}

export const CREW_EXPORT_RANKS: CrewExportRankOption[] = [
  { id: "Kapitein", label: "Kapitein / Schipper" },
  { id: "Stuurman", label: "Stuurman" },
  { id: "Lichtmatroos", label: "Lichtmatroos" },
  { id: "Matroos", label: "Matroos" },
  { id: "Deksman", label: "Deksman" },
  { id: "Aflosser", label: "Aflosser" },
  { id: "Overig", label: "Overig" },
]

export function getCrewRankKey(member: any): CrewExportRankId {
  const position = String(member?.position || "").trim()
  if ((RANK_ORDER as readonly string[]).includes(position)) {
    return position as CrewExportRankId
  }
  return "Overig"
}

export function filterCrewByRanks(members: any[], selectedRanks: CrewExportRankId[]): any[] {
  if (selectedRanks.length === 0) return []
  const rankSet = new Set(selectedRanks)
  return members.filter((member) => rankSet.has(getCrewRankKey(member)))
}

function formatStatus(status: string): string {
  switch (status) {
    case "aan-boord":
      return "Aan boord"
    case "thuis":
      return "Thuis"
    case "ziek":
      return "Ziek"
    case "uit-dienst":
      return "Uit dienst"
    case "nog-in-te-delen":
      return "Nog in te delen"
    default:
      return status || "-"
  }
}

function parseServiceStart(value: unknown): Date | null {
  const raw = String(value || "").trim()
  if (!raw) return null

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const year = Number(iso[1])
    const month = Number(iso[2]) - 1
    const day = Number(iso[3])
    const date = new Date(year, month, day)
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) return date
  }

  const dmy = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2]) - 1
    const year = Number(dmy[3])
    const date = new Date(year, month, day)
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) return date
  }

  return null
}

export function getServiceYears(value: unknown, today = new Date()): number | null {
  const start = parseServiceStart(value)
  if (!start) return null
  let years = today.getFullYear() - start.getFullYear()
  const monthDiff = today.getMonth() - start.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < start.getDate())) years -= 1
  return Math.max(0, years)
}

function formatServiceYears(value: unknown): string {
  const years = getServiceYears(value)
  if (years == null) return "-"
  return `${years} jaar`
}

function formatDate(value: unknown): string {
  const raw = String(value || "").trim()
  if (!raw) return "-"
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(`${raw.slice(0, 10)}T12:00:00`)
    if (!isNaN(d.getTime())) return d.toLocaleDateString("nl-NL")
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("nl-NL")
}

function formatAddress(address: unknown): string {
  if (!address || typeof address !== "object") return "-"
  const a = address as { street?: string; postalCode?: string; city?: string; country?: string }
  const parts = [a.street, [a.postalCode, a.city].filter(Boolean).join(" "), a.country]
    .map((p) => String(p || "").trim())
    .filter(Boolean)
  return parts.length ? parts.join(", ") : "-"
}

export function getCrewExportFieldValue(
  member: any,
  fieldId: CrewExportFieldId,
  shipNameById: Map<string, string>
): string {
  switch (fieldId) {
    case "name":
      return `${member.first_name || member.firstName || ""} ${member.last_name || member.lastName || ""}`.trim() || "-"
    case "position":
      return String(member.position || "-")
    case "ship": {
      const shipId = member.ship_id || member.shipId
      if (!shipId) return "Geen schip"
      return shipNameById.get(shipId) || "Geen schip"
    }
    case "status":
      return formatStatus(String(member.status || ""))
    case "phone":
      return String(member.phone || "-")
    case "email":
      return String(member.email || "-")
    case "nationality":
      return String(member.nationality || "-")
    case "birth_date":
      return formatDate(member.birth_date)
    case "address":
      return formatAddress(member.address)
    case "regime":
      return String(member.regime || "-")
    case "in_dienst_vanaf":
      return formatDate(member.in_dienst_vanaf)
    case "dienstjaren":
      return formatServiceYears(member.in_dienst_vanaf)
    default:
      return "-"
  }
}

function compareCrewNames(a: any, b: any): number {
  const last = String(a.last_name || a.lastName || "").localeCompare(
    String(b.last_name || b.lastName || ""),
    "nl",
    { sensitivity: "base" }
  )
  if (last !== 0) return last
  return String(a.first_name || a.firstName || "").localeCompare(
    String(b.first_name || b.firstName || ""),
    "nl",
    { sensitivity: "base" }
  )
}

export function sortOverviewCrew(members: any[], options?: { byServiceYears?: boolean }): any[] {
  if (options?.byServiceYears) {
    return [...members].sort((a, b) => {
      const yearsA = getServiceYears(a.in_dienst_vanaf)
      const yearsB = getServiceYears(b.in_dienst_vanaf)
      if (yearsA == null && yearsB == null) return compareCrewNames(a, b)
      if (yearsA == null) return 1
      if (yearsB == null) return -1
      if (yearsA !== yearsB) return yearsB - yearsA
      const startA = parseServiceStart(a.in_dienst_vanaf)?.getTime() || 0
      const startB = parseServiceStart(b.in_dienst_vanaf)?.getTime() || 0
      if (startA !== startB) return startA - startB
      return compareCrewNames(a, b)
    })
  }

  const rankIndex = (position: string) => {
    const i = RANK_ORDER.indexOf(position as (typeof RANK_ORDER)[number])
    return i >= 0 ? i : RANK_ORDER.length
  }
  return [...members].sort((a, b) => {
    const ra = rankIndex(String(a.position || ""))
    const rb = rankIndex(String(b.position || ""))
    if (ra !== rb) return ra - rb
    return compareCrewNames(a, b)
  })
}
