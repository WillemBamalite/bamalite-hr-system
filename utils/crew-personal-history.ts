export const HISTORY_KIND = "periode"

export type CrewHistoryPeriod = {
  kind: typeof HISTORY_KIND
  id: string
  from: string
  to: string | null
  status: string
  ship_id: string | null
}

type SickSlice = {
  id: string
  from: string
  to: string | null
  status: "ziek" | "afwezig"
}

const OPEN_END = "9999-12-31"

export function toDateOnly(value?: string | null): string | null {
  if (!value) return null
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function normalizeShipId(shipId?: string | null): string | null {
  if (!shipId || shipId === "none") return null
  return String(shipId)
}

export function historyStatus(status?: string | null, shipId?: string | null): string {
  if (status === "uit-dienst") return "uit-dienst"
  if (status === "afwezig") return "afwezig"
  if (status === "ziek") return "ziek"
  if (status === "nog-in-te-delen" || !normalizeShipId(shipId)) return "geen-schip"
  if (status === "aan-boord") return "aan-boord"
  return "thuis"
}

export function readHistoryPeriods(history: unknown): CrewHistoryPeriod[] {
  if (!Array.isArray(history)) return []
  return history.filter(
    (entry): entry is CrewHistoryPeriod =>
      !!entry && entry.kind === HISTORY_KIND && typeof entry.from === "string"
  )
}

function shiftDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0")
  const nextDay = String(date.getDate()).padStart(2, "0")
  return `${nextYear}-${nextMonth}-${nextDay}`
}

function dayBefore(iso: string) {
  return shiftDays(iso, -1)
}

function dayAfter(iso: string) {
  return shiftDays(iso, 1)
}

export function knownStartDate(member: {
  on_board_since?: string | null
  thuis_sinds?: string | null
  in_dienst_vanaf?: string | null
  created_at?: string | null
}): string | null {
  return (
    toDateOnly(member?.on_board_since) ||
    toDateOnly(member?.thuis_sinds) ||
    toDateOnly(member?.in_dienst_vanaf) ||
    toDateOnly(member?.created_at)
  )
}

function todayDate() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

export function appendCrewHistory(
  member: any,
  next: { status?: string | null; ship_id?: string | null; from?: string | null }
): any[] | null {
  if (!member) return null

  const statusProvided = next.status !== undefined
  const shipProvided = next.ship_id !== undefined
  if (!statusProvided && !shipProvided) return null

  const nextStatusRaw = statusProvided ? next.status : member.status
  const nextShipRaw = shipProvided ? next.ship_id : member.ship_id
  const nextKey = historyStatus(nextStatusRaw, nextShipRaw)
  const prevKey = historyStatus(member.status, member.ship_id)
  const nextShip = nextKey === "geen-schip" || nextKey === "uit-dienst" ? null : normalizeShipId(nextShipRaw)
  const prevShip = prevKey === "geen-schip" || prevKey === "uit-dienst" ? null : normalizeShipId(member.ship_id)

  if (nextKey === prevKey && nextShip === prevShip) return null

  const from = toDateOnly(next.from) || todayDate()
  const existing = Array.isArray(member.assignment_history) ? [...member.assignment_history] : []
  const periods = readHistoryPeriods(existing).map((period) => ({ ...period }))
  const others = existing.filter((entry) => !entry || entry.kind !== HISTORY_KIND)

  if (periods.length === 0) {
    const start = knownStartDate(member)
    if (start && start < from) {
      periods.push({
        kind: HISTORY_KIND,
        id: crypto.randomUUID(),
        from: start,
        to: dayBefore(from),
        status: prevKey,
        ship_id: prevShip,
      })
    }
  } else {
    const open = [...periods].reverse().find((period) => !period.to)
    if (open) {
      if (open.from === from && open.status === nextKey && normalizeShipId(open.ship_id) === nextShip) {
        return null
      }
      if (open.from < from) open.to = dayBefore(from)
      else {
        open.from = from
        open.to = null
        open.status = nextKey
        open.ship_id = nextShip
        return [...others, ...periods]
      }
    }
  }

  periods.push({
    kind: HISTORY_KIND,
    id: crypto.randomUUID(),
    from,
    to: null,
    status: nextKey,
    ship_id: nextShip,
  })

  return [...others, ...periods]
}

function syntheticCurrent(member: any): CrewHistoryPeriod[] {
  const start = knownStartDate(member) || todayDate()
  const status = historyStatus(member?.status, member?.ship_id)
  return [
    {
      kind: HISTORY_KIND,
      id: "huidig",
      from: start,
      to: null,
      status,
      ship_id: status === "geen-schip" || status === "uit-dienst" ? null : normalizeShipId(member?.ship_id),
    },
  ]
}

function sickSlices(memberId: string, sickLeaves: any[]): SickSlice[] {
  return (sickLeaves || [])
    .filter((record) => record?.crew_member_id === memberId)
    .map((record) => {
      const from = toDateOnly(record.start_date)
      if (!from) return null
      const absent = String(record.notes || "").includes("[AFWEZIG]")
      return {
        id: String(record.id || `ziek-${from}`),
        from,
        to: toDateOnly(record.end_date),
        status: absent ? "afwezig" : "ziek",
      } as SickSlice
    })
    .filter((record): record is SickSlice => !!record)
    .sort((a, b) => a.from.localeCompare(b.from))
}

function periodCovers(periods: CrewHistoryPeriod[], date: string) {
  return periods.some((period) => period.from <= date && (period.to || OPEN_END) >= date)
}

function insertSickLeave(periods: CrewHistoryPeriod[], sick: SickSlice): CrewHistoryPeriod[] {
  let touched = false
  const next: CrewHistoryPeriod[] = []

  for (const period of periods) {
    const periodEnd = period.to || OPEN_END
    const sickEnd = sick.to || OPEN_END
    if (sick.from > periodEnd || sickEnd < period.from) {
      next.push(period)
      continue
    }

    touched = true
    if ((period.status === "ziek" || period.status === "afwezig") && period.from === sick.from) {
      next.push(period)
      continue
    }

    if (period.from < sick.from) {
      next.push({ ...period, id: `${period.id}-voor`, to: dayBefore(sick.from) })
    }

    const sliceFrom = sick.from > period.from ? sick.from : period.from
    const sliceTo = sickEnd < periodEnd ? sick.to : period.to
    next.push({
      kind: HISTORY_KIND,
      id: `${sick.id}-${sliceFrom}`,
      from: sliceFrom,
      to: sliceTo,
      status: sick.status,
      ship_id: period.ship_id,
    })

    if (sick.to && sickEnd < periodEnd) {
      next.push({
        ...period,
        id: `${period.id}-na`,
        from: dayAfter(sick.to),
        to: period.to,
      })
    }
  }

  if (!touched) {
    next.push({
      kind: HISTORY_KIND,
      id: sick.id,
      from: sick.from,
      to: sick.to,
      status: sick.status,
      ship_id: null,
    })
    return next
  }

  if (!periodCovers(next, sick.from)) {
    const following = next.map((period) => period.from).filter((from) => from > sick.from).sort()[0]
    let to = sick.to
    if (following) {
      const cap = dayBefore(following)
      if (!to || cap < to) to = cap
    }
    if (!to || to >= sick.from) {
      next.push({
        kind: HISTORY_KIND,
        id: sick.id,
        from: sick.from,
        to,
        status: sick.status,
        ship_id: null,
      })
    }
  }

  return next
}

export function buildPersonalTimeline(member: any, sickLeaves: any[]): CrewHistoryPeriod[] {
  if (!member) return []
  const stored = readHistoryPeriods(member.assignment_history)
  let periods = stored.length > 0 ? stored.map((period) => ({ ...period })) : syntheticCurrent(member)

  for (const sick of sickSlices(member.id, sickLeaves)) {
    periods = insertSickLeave(periods, sick)
  }

  return periods.sort((a, b) => {
    if (a.from !== b.from) return b.from.localeCompare(a.from)
    if (!a.to) return -1
    if (!b.to) return 1
    return b.to.localeCompare(a.to)
  })
}

export function historyStatusLabel(status: string) {
  switch (status) {
    case "aan-boord":
      return "Aan boord"
    case "thuis":
      return "Thuis"
    case "ziek":
      return "Ziek"
    case "afwezig":
      return "Afwezig"
    case "uit-dienst":
      return "Uit dienst"
    default:
      return "Geen schip"
  }
}
