type Regime = "1/1" | "2/2" | "3/3" | "Altijd" | string
type CrewStatus = "aan-boord" | "thuis"

const MS_PER_DAY = 1000 * 60 * 60 * 24

function startOfDay(d: Date) {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function parseDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return startOfDay(d)
}

function getRegimeDays(regime: Regime) {
  if (regime === "1/1") return 7
  if (regime === "2/2") return 14
  if (regime === "3/3") return 21
  return 0
}

export function calculateRegimeStatus(regime: Regime, onBoardSince?: string | null, fallbackStatus?: string) {
  return calculateCurrentStatus(regime, null, onBoardSince, fallbackStatus === "ziek")
}

export function calculateCurrentStatus(
  regime: Regime,
  thuisSinds?: string | null,
  onBoardSince?: string | null,
  isSick = false,
  expectedStartDate?: string | null
) {
  if (isSick) {
    return { currentStatus: "thuis" as CrewStatus, nextRotationDate: null, daysUntilRotation: 0 }
  }

  if (String(regime || "").toLowerCase() === "altijd") {
    return { currentStatus: "aan-boord" as CrewStatus, nextRotationDate: null, daysUntilRotation: 0 }
  }

  const cycleDays = getRegimeDays(regime)
  if (!cycleDays) {
    return { currentStatus: "aan-boord" as CrewStatus, nextRotationDate: null, daysUntilRotation: 0 }
  }

  const today = startOfDay(new Date())
  const homeStart = parseDate(thuisSinds)
  const boardStart = parseDate(onBoardSince)
  const expectedStart = parseDate(expectedStartDate)

  // Pick the most recent known status anchor.
  let anchorDate = boardStart
  let anchorStatus: CrewStatus = "aan-boord"
  if (homeStart && (!anchorDate || homeStart > anchorDate)) {
    anchorDate = homeStart
    anchorStatus = "thuis"
  }
  if (!anchorDate && expectedStart) {
    anchorDate = expectedStart
    anchorStatus = "aan-boord"
  }
  if (!anchorDate) {
    return { currentStatus: "aan-boord" as CrewStatus, nextRotationDate: null, daysUntilRotation: 0 }
  }

  const diffDays = Math.max(0, Math.floor((today.getTime() - anchorDate.getTime()) / MS_PER_DAY))
  const elapsedPhases = Math.floor(diffDays / cycleDays)
  const currentStatus: CrewStatus =
    elapsedPhases % 2 === 0 ? anchorStatus : anchorStatus === "aan-boord" ? "thuis" : "aan-boord"

  const daysIntoPhase = diffDays % cycleDays
  const daysUntilRotation = cycleDays - daysIntoPhase
  const nextRotationDate = new Date(today)
  nextRotationDate.setDate(today.getDate() + daysUntilRotation)

  return {
    currentStatus,
    nextRotationDate: nextRotationDate.toISOString(),
    daysUntilRotation,
  }
}

export function autoAdvanceCrewDatabase() {
  return false
}

export function manuallyAdjustDates(crewId: string, newDate: string, dateType: "thuisSinds" | "onBoardSince", crew: any) {
  if (!crew || !crewId || !newDate) return { hasChanges: false, updatedCrew: crew }
  const existing = crew[crewId]
  if (!existing) return { hasChanges: false, updatedCrew: crew }

  const updatedCrew = {
    ...crew,
    [crewId]: {
      ...existing,
      [dateType]: newDate,
    },
  }

  return { hasChanges: true, updatedCrew }
}
