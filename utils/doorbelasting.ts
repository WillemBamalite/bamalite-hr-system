import { isAflosserMember, parseCrewDate } from "@/utils/crew-filters"

export type DoorbelastingMonthRow = {
  crewId: string
  firstName: string
  lastName: string
  position: string
  fromCompany: string
  toCompany: string
  shipId: string
  shipName: string
  monthKey: string // yyyy-MM
  sinceDate: string | null
}

const normalizeCompany = (value: unknown) => String(value || "").trim()

export function getMonthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number)
  const d = new Date(y, (m || 1) - 1 + delta, 1)
  return getMonthKeyFromDate(d)
}

export function formatMonthKeyNl(monthKey: string, german = false): string {
  const [y, m] = monthKey.split("-").map(Number)
  if (!y || !m) return monthKey
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString(german ? "de-DE" : "nl-NL", { month: "long", year: "numeric" })
}

/** Alle month keys van start t/m eind (inclusief), chronologisch. */
export function listMonthKeysInclusive(start: Date, end: Date): string[] {
  const startKey = getMonthKeyFromDate(start)
  const endKey = getMonthKeyFromDate(end)
  if (startKey > endKey) return []
  const keys: string[] = []
  let cursor = startKey
  while (cursor <= endKey) {
    keys.push(cursor)
    cursor = shiftMonthKey(cursor, 1)
    if (keys.length > 240) break // safety
  }
  return keys
}

/**
 * Actieve uithuur: persoon-firma ≠ schip-firma.
 * Maanden: vanaf on_board_since (of vandaag) t/m peildatum.
 * Bruto blijft leeg — Tania vult dat in.
 */
export function buildDoorbelastingRows(params: {
  crew: any[]
  ships: any[]
  asOf?: Date
}): DoorbelastingMonthRow[] {
  const asOf = params.asOf || new Date()
  asOf.setHours(12, 0, 0, 0)
  const rows: DoorbelastingMonthRow[] = []

  for (const member of params.crew || []) {
    if (!member || member.is_dummy) continue
    if (member.status === "uit-dienst") continue
    // Doorbelasting geldt niet voor aflossers (incl. vaste aflossers / uitzend / zelfstandig)
    if (
      isAflosserMember(member) ||
      member.is_uitzendbureau === true ||
      member.is_zelfstandig === true
    ) {
      continue
    }

    const fromCompany = normalizeCompany(member.company)
    if (!fromCompany) continue
    if (!member.ship_id || member.ship_id === "none") continue

    const ship = (params.ships || []).find((s: any) => String(s.id) === String(member.ship_id))
    if (!ship) continue
    const toCompany = normalizeCompany(ship.company)
    if (!toCompany) continue
    if (toCompany === fromCompany) continue

    const since =
      parseCrewDate(member.on_board_since) ||
      parseCrewDate(member.thuis_sinds) ||
      parseCrewDate(member.in_dienst_vanaf) ||
      asOf

    const start = since > asOf ? asOf : since
    const monthKeys = listMonthKeysInclusive(start, asOf)

    for (const monthKey of monthKeys) {
      rows.push({
        crewId: String(member.id),
        firstName: String(member.first_name || ""),
        lastName: String(member.last_name || ""),
        position: String(member.position || ""),
        fromCompany,
        toCompany,
        shipId: String(ship.id),
        shipName: String(ship.name || ""),
        monthKey,
        sinceDate: member.on_board_since || member.thuis_sinds || null,
      })
    }
  }

  return rows.sort((a, b) => {
    if (a.monthKey !== b.monthKey) return a.monthKey < b.monthKey ? 1 : -1
    const last = a.lastName.localeCompare(b.lastName, "nl")
    if (last !== 0) return last
    return a.firstName.localeCompare(b.firstName, "nl")
  })
}

export function filterDoorbelastingByMonth(
  rows: DoorbelastingMonthRow[],
  monthKey: string
): DoorbelastingMonthRow[] {
  return rows.filter((r) => r.monthKey === monthKey)
}

export function getAvailableDoorbelastingMonths(rows: DoorbelastingMonthRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.monthKey))).sort((a, b) => (a < b ? 1 : -1))
}
