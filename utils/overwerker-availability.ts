import { format, parseISO, differenceInCalendarDays } from "date-fns"
import { calculateCurrentStatus } from "@/utils/regime-calculator"

export interface OverwerkerPeriod {
  id: string
  from: string
  to: string
  note?: string
  type?: "periode" | "vrije_weken"
}

export type OverwerkerAvailabilityLevel =
  | "beschikbaar"
  | "mogelijk_beschikbaar"
  | "binnenkort"
  | "ingedeeld"
  | "niet_beschikbaar"
  | "onbekend"

/** Kolom op de Overwerkers-planningpagina voor de gekozen datum. */
export type OverwerkerPlanningColumn =
  | "aan_boord"
  | "echt_beschikbaar"
  | "mogelijk_beschikbaar"
  | null

export interface OverwerkerDayStatus {
  level: OverwerkerAvailabilityLevel
  planningColumn: OverwerkerPlanningColumn
  reason: string
  regimeStatus: "thuis" | "aan-boord" | null
  nextHomeDate: string | null
  nextOnBoardDate: string | null
  activeTrip: {
    id: string
    shipId: string
    shipName?: string
    status: string
    from: string
    to: string | null
  } | null
  matchingPeriod: OverwerkerPeriod | null
}

function parseDay(dateStr: string): Date {
  const d = parseISO(dateStr.length === 10 ? dateStr : dateStr.slice(0, 10))
  d.setHours(0, 0, 0, 0)
  return d
}

function dayBetween(date: Date, from: string, to: string): boolean {
  const start = parseDay(from)
  const end = parseDay(to)
  return date >= start && date <= end
}

export function parseNotesArray(notes: unknown): unknown[] {
  if (!notes) return []
  if (Array.isArray(notes)) return notes
  if (typeof notes === "string") {
    try {
      const parsed = JSON.parse(notes)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function getOverwerkerPeriodsFromNotes(notes: unknown): OverwerkerPeriod[] {
  const arr = parseNotesArray(notes)
  const periodsNote = arr.find((note: unknown) => {
    if (typeof note !== "object" || !note) return false
    const content = (note as { content?: string; text?: string }).content ||
      (note as { content?: string; text?: string }).text ||
      ""
    return content.startsWith("OVERWERKER_PERIODS:")
  }) as { content?: string; text?: string } | undefined

  if (!periodsNote) return []

  try {
    const periodsStr =
      periodsNote.content?.replace("OVERWERKER_PERIODS:", "") ||
      periodsNote.text?.replace("OVERWERKER_PERIODS:", "")
    if (periodsStr) return JSON.parse(periodsStr) as OverwerkerPeriod[]
  } catch {
    return []
  }
  return []
}

function getTripDateRange(trip: {
  start_date?: string | null
  end_date?: string | null
  start_datum?: string | null
  eind_datum?: string | null
}): { from: string | null; to: string | null } {
  const from = trip.start_datum || trip.start_date || null
  const to = trip.eind_datum || trip.end_date || from
  return { from, to }
}

export function getActiveTripOnDate(
  memberId: string,
  dateStr: string,
  trips: Array<{
    id: string
    aflosser_id?: string | null
    ship_id?: string | null
    status?: string
    start_date?: string | null
    end_date?: string | null
    start_datum?: string | null
    eind_datum?: string | null
  }>
) {
  const day = parseDay(dateStr)
  const activeStatuses = new Set(["gepland", "ingedeeld", "actief"])

  return (
    trips.find((trip) => {
      if (String(trip.aflosser_id) !== String(memberId)) return false
      if (!trip.status || !activeStatuses.has(trip.status)) return false
      const { from, to } = getTripDateRange(trip)
      if (!from) return false
      const start = parseDay(from)
      const end = to ? parseDay(to) : new Date("2099-12-31")
      if (day < start || day > end) return false
      if (isOverwerkTrip(trip)) return true
      return true
    }) || null
  )
}

function getRegimeOnDate(member: {
  regime?: string | null
  thuis_sinds?: string | null
  on_board_since?: string | null
  expected_start_date?: string | null
}, dateStr: string) {
  const regime = (member.regime || "") as "1/1" | "2/2" | "3/3" | "Altijd" | "" | "Onbekend"
  return calculateCurrentStatus(
    regime,
    member.thuis_sinds || null,
    member.on_board_since || null,
    false,
    member.expected_start_date || null,
    dateStr
  )
}

function formatNl(dateStr: string): string {
  return format(parseDay(dateStr), "dd-MM-yyyy")
}

export function evaluateOverwerkerOnDate(
  member: {
    id: string
    regime?: string | null
    thuis_sinds?: string | null
    on_board_since?: string | null
    expected_start_date?: string | null
    notes?: unknown
  },
  dateStr: string,
  periods: OverwerkerPeriod[],
  trips: Parameters<typeof getActiveTripOnDate>[2],
  getShipName?: (shipId: string) => string
): OverwerkerDayStatus {
  const day = parseDay(dateStr)
  const activeTrip = getActiveTripOnDate(member.id, dateStr, trips)

  if (activeTrip) {
    const { from, to } = getTripDateRange(activeTrip)
    const endLabel = to ? formatNl(to) : "onbekend"
    const tripShipName = activeTrip.ship_id && getShipName ? getShipName(activeTrip.ship_id) : undefined
    return {
      level: "ingedeeld",
      planningColumn: "aan_boord",
      reason: `Overwerk${tripShipName ? ` op ${tripShipName}` : ""} t/m ${endLabel}`,
      regimeStatus: null,
      nextHomeDate: null,
      nextOnBoardDate: null,
      activeTrip: {
        id: activeTrip.id,
        shipId: activeTrip.ship_id || "",
        shipName: tripShipName,
        status: activeTrip.status || "",
        from: from!,
        to: to || null,
      },
      matchingPeriod: null,
    }
  }

  const explicitPeriods = periods.filter((p) => p.type !== "vrije_weken" && p.from && p.to)
  const hasVrijeWeken = periods.some((p) => p.type === "vrije_weken")
  const matchingPeriod = explicitPeriods.find((p) => dayBetween(day, p.from, p.to)) || null
  const regime = getRegimeOnDate(member, dateStr)
  const regimeStatus = regime.currentStatus
  const nextHomeDate =
    regimeStatus === "aan-boord" && regime.nextRotationDate ? regime.nextRotationDate : null
  const nextOnBoardDate =
    regimeStatus === "thuis" && regime.nextRotationDate ? regime.nextRotationDate : null

  if (matchingPeriod) {
    return {
      level: "beschikbaar",
      planningColumn: "echt_beschikbaar",
      reason: `Periode ${formatNl(matchingPeriod.from)} – ${formatNl(matchingPeriod.to)}`,
      regimeStatus,
      nextHomeDate,
      nextOnBoardDate,
      activeTrip: null,
      matchingPeriod,
    }
  }

  if (hasVrijeWeken) {
    if (regimeStatus === "thuis") {
      return {
        level: "mogelijk_beschikbaar",
        planningColumn: "mogelijk_beschikbaar",
        reason: "Thuis in vrije week — eerst bellen",
        regimeStatus,
        nextHomeDate,
        nextOnBoardDate,
        activeTrip: null,
        matchingPeriod: null,
      }
    }
    if (regimeStatus === "aan-boord" && nextHomeDate) {
      const daysUntil = differenceInCalendarDays(parseDay(nextHomeDate), day)
      if (daysUntil > 0 && daysUntil <= 14) {
        return {
          level: "binnenkort",
          planningColumn: null,
          reason: `Aan boord — thuis vanaf ${formatNl(nextHomeDate)} (${daysUntil} dagen)`,
          regimeStatus,
          nextHomeDate,
          nextOnBoardDate,
          activeTrip: null,
          matchingPeriod: null,
        }
      }
      return {
        level: "niet_beschikbaar",
        planningColumn: null,
        reason: `Aan boord op vast schip — thuis vanaf ${formatNl(nextHomeDate)}`,
        regimeStatus,
        nextHomeDate,
        nextOnBoardDate,
        activeTrip: null,
        matchingPeriod: null,
      }
    }
    return {
      level: "niet_beschikbaar",
      planningColumn: null,
      reason: "Aan boord op vast schip (geen vrije week op deze datum)",
      regimeStatus,
      nextHomeDate,
      nextOnBoardDate,
      activeTrip: null,
      matchingPeriod: null,
    }
  }

  const upcoming = explicitPeriods
    .filter((p) => parseDay(p.from) > day)
    .sort((a, b) => parseDay(a.from).getTime() - parseDay(b.from).getTime())[0]

  if (upcoming) {
    const daysUntil = differenceInCalendarDays(parseDay(upcoming.from), day)
    if (daysUntil <= 14) {
      return {
        level: "binnenkort",
        planningColumn: null,
        reason: `Periode start op ${formatNl(upcoming.from)} (over ${daysUntil} dagen)`,
        regimeStatus,
        nextHomeDate,
        nextOnBoardDate,
        activeTrip: null,
        matchingPeriod: null,
      }
    }
  }

  if (periods.length === 0) {
    return {
      level: "onbekend",
      planningColumn: null,
      reason: "Geen beschikbaarheid geregistreerd",
      regimeStatus,
      nextHomeDate,
      nextOnBoardDate,
      activeTrip: null,
      matchingPeriod: null,
    }
  }

  return {
    level: "niet_beschikbaar",
    planningColumn: null,
    reason: "Niet beschikbaar op deze datum",
    regimeStatus,
    nextHomeDate,
    nextOnBoardDate,
    activeTrip: null,
    matchingPeriod: null,
  }
}

export const AVAILABILITY_SORT_ORDER: Record<OverwerkerAvailabilityLevel, number> = {
  beschikbaar: 0,
  mogelijk_beschikbaar: 1,
  binnenkort: 2,
  ingedeeld: 3,
  niet_beschikbaar: 4,
  onbekend: 5,
}

export function levelLabel(level: OverwerkerAvailabilityLevel): string {
  switch (level) {
    case "beschikbaar":
      return "Beschikbaar"
    case "mogelijk_beschikbaar":
      return "Mogelijk beschikbaar"
    case "binnenkort":
      return "Binnenkort"
    case "ingedeeld":
      return "Toegewezen"
    case "niet_beschikbaar":
      return "Niet beschikbaar"
    default:
      return "Onbekend"
  }
}

const ACTIVE_TRIP_STATUSES = new Set(["gepland", "ingedeeld", "actief"])

export function isOverwerkTrip(trip: {
  notes?: string | null
  trip_name?: string | null
}): boolean {
  const notes = String(trip.notes || "")
  const name = String(trip.trip_name || "")
  if (notes.includes("Overwerker")) return true
  if (name.startsWith("Overwerk")) return true
  return false
}

export function getTripEndDateString(trip: {
  end_date?: string | null
  eind_datum?: string | null
}): string | null {
  const end = trip.end_date || trip.eind_datum
  if (!end) return null
  return end.length >= 10 ? end.slice(0, 10) : end
}

/** Einddatum overwerk verstreken (dag ná einddatum = niet meer actief op gast-schip). */
export function isOverwerkTripEndDatePassed(
  trip: { end_date?: string | null; eind_datum?: string | null },
  referenceDate?: string
): boolean {
  const endStr = getTripEndDateString(trip)
  if (!endStr) return false
  const ref = referenceDate ? parseDay(referenceDate) : new Date()
  ref.setHours(0, 0, 0, 0)
  const endDay = parseDay(endStr)
  return ref > endDay
}

/** Zichtbaar op gast-schip: actieve overwerk-reis, startdatum bereikt, einddatum niet verstreken. */
export function isOverwerkTripVisibleOnShip(
  trip: {
    aflosser_id?: string | null
    ship_id?: string | null
    status?: string
    start_datum?: string | null
    start_date?: string | null
    end_date?: string | null
    eind_datum?: string | null
    notes?: string | null
    trip_name?: string | null
  },
  referenceDate?: string
): boolean {
  if (!trip.aflosser_id || !trip.ship_id) return false
  if (!isOverwerkTrip(trip)) return false
  if (!trip.status || trip.status === "voltooid" || trip.status === "geannuleerd") return false
  if (!ACTIVE_TRIP_STATUSES.has(trip.status)) return false
  if (isOverwerkTripEndDatePassed(trip, referenceDate)) return false

  const ref = referenceDate ? parseDay(referenceDate) : new Date()
  ref.setHours(0, 0, 0, 0)
  const startStr = trip.start_datum || trip.start_date
  if (startStr) {
    const startDay = parseDay(startStr.length >= 10 ? startStr.slice(0, 10) : startStr)
    if (startDay > ref) return false
  }
  return true
}

export function isOverwerkTripCurrentlyActive(
  trip: Parameters<typeof isOverwerkTripVisibleOnShip>[0],
  referenceDate?: string
): boolean {
  return isOverwerkTripVisibleOnShip(trip, referenceDate)
}

function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const parts = dateStr.split(/[-/]/)
  let year: number, month: number, day: number
  if (parts[0].length === 4) {
    year = parseInt(parts[0])
    month = parseInt(parts[1]) - 1
    day = parseInt(parts[2])
  } else {
    day = parseInt(parts[0])
    month = parseInt(parts[1]) - 1
    year = parseInt(parts[2])
  }
  const [hours, minutes, seconds] = (timeStr || "00:00:00").split(":").map(Number)
  return new Date(year, month, day, hours || 0, minutes || 0, seconds || 0, 0)
}

/** Actieve overwerk-reis op dit schip (gast-overwerker). */
export function getActiveOverwerkTripOnShip(
  memberId: string,
  shipId: string,
  trips: Array<{
    id: string
    aflosser_id?: string | null
    ship_id?: string | null
    status?: string
    start_datum?: string | null
    start_tijd?: string | null
    start_date?: string | null
    end_date?: string | null
    eind_datum?: string | null
    notes?: string | null
    trip_name?: string | null
  }>,
  referenceDate?: string
) {
  const matches = trips.filter(
    (trip) =>
      String(trip.aflosser_id) === String(memberId) &&
      String(trip.ship_id) === String(shipId) &&
      isOverwerkTripVisibleOnShip(trip, referenceDate)
  )
  if (matches.length === 0) return null
  matches.sort((a, b) => {
    const aStart = a.start_datum || a.start_date || ""
    const bStart = b.start_datum || b.start_date || ""
    return bStart.localeCompare(aStart)
  })
  return matches[0]
}

/** Overwerkt tijdelijk op een ander schip (vast schip blijft ship_id). */
export function getActiveOverwerkTripAwayFromHomeShip(
  memberId: string,
  homeShipId: string,
  trips: Parameters<typeof getActiveOverwerkTripOnShip>[2],
  referenceDate?: string
) {
  const matches = trips.filter(
    (trip) =>
      String(trip.aflosser_id) === String(memberId) &&
      String(trip.ship_id) !== String(homeShipId) &&
      isOverwerkTripVisibleOnShip(trip, referenceDate)
  )
  if (matches.length === 0) return null
  matches.sort((a, b) => {
    const aStart = a.start_datum || a.start_date || ""
    const bStart = b.start_datum || b.start_date || ""
    return bStart.localeCompare(aStart)
  })
  return matches[0]
}

export function formatOverwerkUntilDate(trip: {
  end_date?: string | null
  eind_datum?: string | null
}): string | null {
  const end = trip.end_date || trip.eind_datum
  if (!end) return null
  try {
    return format(parseDay(end.length === 10 ? end : end.slice(0, 10)), "dd-MM-yyyy")
  } catch {
    return null
  }
}

export function getOverwerkCardLabel(
  member: { id: string; ship_id?: string | null },
  viewShipId: string,
  trips: Parameters<typeof getActiveOverwerkTripOnShip>[2],
  getShipName: (shipId: string) => string
): string | null {
  const homeShipId = member.ship_id
  if (!homeShipId) return null

  if (homeShipId === viewShipId) {
    const away = getActiveOverwerkTripAwayFromHomeShip(member.id, homeShipId, trips)
    if (!away || !away.ship_id) return null
    const until = formatOverwerkUntilDate(away)
    return `Overwerkt op ${getShipName(away.ship_id)}${until ? ` t/m ${until}` : ""}`
  }

  const guest = getActiveOverwerkTripOnShip(member.id, viewShipId, trips)
  if (!guest) return null
  const until = formatOverwerkUntilDate(guest)
  return `Aflosser / overwerker${until ? ` t/m ${until}` : ""}`
}

/** Actieve overwerk-reizen waarvan de einddatum verstreken is — af te sluiten als voltooid. */
export function findExpiredActiveOverwerkTrips(
  trips: Array<{
    id: string
    status?: string
    end_date?: string | null
    eind_datum?: string | null
    notes?: string | null
    trip_name?: string | null
  }>,
  referenceDate?: string
) {
  const ref = referenceDate || format(new Date(), "yyyy-MM-dd")
  return trips.filter(
    (trip) =>
      trip.status === "actief" &&
      isOverwerkTrip(trip) &&
      isOverwerkTripEndDatePassed(trip, ref)
  )
}

export function isActiveTripStillOpen(
  trip: {
    status?: string
    end_date?: string | null
    eind_datum?: string | null
    notes?: string | null
    trip_name?: string | null
  },
  referenceDate?: string
): boolean {
  if (trip.status !== "actief") return false
  if (isOverwerkTrip(trip) && isOverwerkTripEndDatePassed(trip, referenceDate)) return false
  return true
}

function isActiveAflosserPlacementOnShip(
  trip: {
    aflosser_id?: string | null
    ship_id?: string | null
    status?: string
    start_datum?: string | null
    start_tijd?: string | null
    end_date?: string | null
    eind_datum?: string | null
    notes?: string | null
    trip_name?: string | null
  },
  memberId: string,
  shipId: string
): boolean {
  if (String(trip.aflosser_id) !== String(memberId)) return false
  if (String(trip.ship_id) !== String(shipId)) return false
  if (!isActiveTripStillOpen(trip)) return false
  if (isOverwerkTrip(trip)) return false
  if (!trip.start_datum || !trip.start_tijd) return false
  return parseLocalDateTime(trip.start_datum, trip.start_tijd) <= new Date()
}

export function shouldShowMemberOnShipOverview(
  member: {
    id: string
    ship_id?: string | null
    status?: string
    position?: string
    is_dummy?: boolean
  },
  shipId: string,
  trips: Parameters<typeof getActiveOverwerkTripOnShip>[2]
): boolean {
  if (member.is_dummy === true) return member.ship_id === shipId
  if (member.status === "uit-dienst") return false
  if (member.status === "nog-in-te-delen" && !member.is_dummy) return false

  if (getActiveOverwerkTripOnShip(member.id, shipId, trips)) return true

  if (member.ship_id !== shipId) {
    if (member.position === "Aflosser") {
      return (
        trips?.some((trip) => isActiveAflosserPlacementOnShip(trip, member.id, shipId)) ?? false
      )
    }
    return false
  }

  if (member.position === "Aflosser") {
    if (trips?.some((trip) => isActiveAflosserPlacementOnShip(trip, member.id, shipId))) {
      return true
    }
    // Alleen op vast schip: aan-boord zonder reis op dit schip; gast-schip alleen via actieve reis
    if (member.ship_id === shipId) {
      return member.status === "aan-boord"
    }
    return false
  }

  return true
}

export function levelBadgeClass(level: OverwerkerAvailabilityLevel): string {
  switch (level) {
    case "beschikbaar":
      return "bg-green-100 text-green-800 border-green-200"
    case "mogelijk_beschikbaar":
      return "bg-amber-100 text-amber-900 border-amber-300"
    case "binnenkort":
      return "bg-amber-100 text-amber-900 border-amber-200"
    case "ingedeeld":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "niet_beschikbaar":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-700 border-gray-200"
  }
}
