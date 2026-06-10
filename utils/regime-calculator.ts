// Automatische regime berekeningen
export interface RegimeCalculation {
  currentStatus: "aan-boord" | "thuis" | "ziek" | "beschikbaar"
  daysOnBoard: number
  daysLeft: number
  offBoardDate: string
  nextOnBoardDate: string
  isOverdue: boolean
  rotationAlert: boolean
}

// Helper functie om lokale datum string te krijgen (geen UTC conversie)
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayLocal(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export function addLocalDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  copy.setHours(0, 0, 0, 0)
  return copy
}

// Helper functie om datum string te parsen als lokale datum (geen UTC conversie)
export function parseLocalDate(dateString: string): Date {
  // Parse YYYY-MM-DD of DD-MM-YYYY format als lokale datum
  const parts = dateString.split(/[-/]/)
  let year: number, month: number, day: number
  
  if (parts[0].length === 4) {
    // YYYY-MM-DD format
    year = parseInt(parts[0])
    month = parseInt(parts[1]) - 1 // JavaScript months are 0-indexed
    day = parseInt(parts[2])
  } else {
    // DD-MM-YYYY format
    day = parseInt(parts[0])
    month = parseInt(parts[1]) - 1
    year = parseInt(parts[2])
  }
  
  const date = new Date(year, month, day)
  date.setHours(0, 0, 0, 0)
  return date
}

export function isLocalDateAfterToday(dateString: string): boolean {
  const date = parseLocalDate(dateString)
  return date.getTime() > getTodayLocal().getTime()
}

export function isLocalDateOnOrBeforeToday(dateString: string): boolean {
  const date = parseLocalDate(dateString)
  return date.getTime() <= getTodayLocal().getTime()
}

type RotationComputeResult = {
  currentStatus: "aan-boord" | "thuis"
  nextRotationDate: string | null
  daysUntilRotation: number
  isOnBoard: boolean
  phaseStartDate: string | null
  hasFutureStartDate: boolean
}

function computeRotationPhase(
  regime: "1/1" | "2/2" | "3/3" | "Altijd" | "" | "Onbekend",
  thuisSinds: string | null,
  onBoardSince: string | null,
  isSick: boolean = false,
  expectedStartDate?: string | null,
  referenceDate?: string | null,
): RotationComputeResult | null {
  const today = referenceDate ? parseLocalDate(referenceDate) : getTodayLocal()

  if (expectedStartDate && !onBoardSince) {
    const expectedDate = parseLocalDate(expectedStartDate)
    if (today.getTime() >= expectedDate.getTime()) {
      onBoardSince = getLocalDateString(expectedDate)
    }
  }

  if (!regime || regime === "" || regime === "Onbekend" || isSick) {
    return null
  }

  if (regime === "Altijd") {
    return {
      currentStatus: "aan-boord",
      nextRotationDate: null,
      daysUntilRotation: 0,
      isOnBoard: true,
      phaseStartDate: onBoardSince,
      hasFutureStartDate: false,
    }
  }

  const regimeWeeks = Number.parseInt(regime.split("/")[0])
  const phaseLen = regimeWeeks * 7

  let anchor: Date | null = null
  let hasFutureStartDate = false

  if (onBoardSince) {
    anchor = parseLocalDate(onBoardSince)
  } else if (expectedStartDate) {
    const expectedDate = parseLocalDate(expectedStartDate)
    if (today.getTime() >= expectedDate.getTime()) {
      anchor = expectedDate
    } else {
      hasFutureStartDate = true
      anchor = expectedDate
    }
  } else if (thuisSinds) {
    const thuisDate = parseLocalDate(thuisSinds)
    anchor = addLocalDays(thuisDate, -phaseLen)
  }

  let isOnBoardPhase = false
  let nextRotationDate: Date
  let phaseStart: Date | null = null

  if (!anchor) {
    isOnBoardPhase = false
    nextRotationDate = addLocalDays(today, phaseLen)
  } else if (hasFutureStartDate) {
    isOnBoardPhase = false
    nextRotationDate = new Date(anchor)
    nextRotationDate.setHours(0, 0, 0, 0)
  } else {
    const diff = Math.floor((today.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24))

    if (diff < 0) {
      isOnBoardPhase = false
      nextRotationDate = new Date(anchor)
      nextRotationDate.setHours(0, 0, 0, 0)
    } else {
      const k = Math.floor(diff / phaseLen)
      const fase = k % 2
      isOnBoardPhase = fase === 0

      phaseStart = addLocalDays(anchor, k * phaseLen)
      nextRotationDate = addLocalDays(phaseStart, phaseLen)
    }
  }

  const daysUntilRotation = Math.max(
    0,
    Math.floor((nextRotationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  )

  return {
    currentStatus: isOnBoardPhase ? "aan-boord" : "thuis",
    nextRotationDate: getLocalDateString(nextRotationDate),
    daysUntilRotation,
    isOnBoard: isOnBoardPhase,
    phaseStartDate: phaseStart ? getLocalDateString(phaseStart) : null,
    hasFutureStartDate,
  }
}

export type RotationSyncUpdate = {
  status: "aan-boord" | "thuis"
  on_board_since: string | null
  thuis_sinds: string | null
}

/** Bepaal DB-velden voor rotatie — zelfde bron als schermweergave, wissel op wisseldag 00:00. */
export function getRotationSyncUpdate(member: {
  regime?: string | null
  status?: string | null
  on_board_since?: string | null
  thuis_sinds?: string | null
  expected_start_date?: string | null
}): RotationSyncUpdate | null {
  if (!member.regime || member.regime === "Altijd" || member.status === "ziek") {
    return null
  }

  const phase = computeRotationPhase(
    member.regime as "1/1" | "2/2" | "3/3" | "Altijd" | "" | "Onbekend",
    member.thuis_sinds || null,
    member.on_board_since || null,
    false,
    member.expected_start_date || null,
  )

  if (!phase || phase.hasFutureStartDate || !phase.phaseStartDate) {
    return null
  }

  const update: RotationSyncUpdate = {
    status: phase.currentStatus,
    on_board_since: phase.currentStatus === "aan-boord" ? phase.phaseStartDate : null,
    thuis_sinds: phase.currentStatus === "thuis" ? phase.phaseStartDate : null,
  }

  const sameStatus = member.status === update.status
  const sameOnBoard = (member.on_board_since || null) === update.on_board_since
  const sameThuis = (member.thuis_sinds || null) === update.thuis_sinds

  if (sameStatus && sameOnBoard && sameThuis) {
    return null
  }

  return update
}

// Nieuwe functie om automatisch status te berekenen op basis van regime en huidige datum
export function calculateCurrentStatus(
  regime: "1/1" | "2/2" | "3/3" | "Altijd" | "" | "Onbekend",
  thuisSinds: string | null,
  onBoardSince: string | null,
  isSick: boolean = false,
  expectedStartDate?: string | null,
  referenceDate?: string | null,
): {
  currentStatus: "aan-boord" | "thuis"
  nextRotationDate: string | null
  daysUntilRotation: number
  isOnBoard: boolean
} {
  if (!regime || regime === "" || regime === "Onbekend") {
    return {
      currentStatus: "thuis",
      nextRotationDate: null,
      daysUntilRotation: 0,
      isOnBoard: false,
    }
  }

  if (isSick) {
    return {
      currentStatus: "thuis",
      nextRotationDate: null,
      daysUntilRotation: 0,
      isOnBoard: false,
    }
  }

  const phase = computeRotationPhase(
    regime,
    thuisSinds,
    onBoardSince,
    isSick,
    expectedStartDate,
    referenceDate,
  )

  if (!phase) {
    return {
      currentStatus: "thuis",
      nextRotationDate: null,
      daysUntilRotation: 0,
      isOnBoard: false,
    }
  }

  return {
    currentStatus: phase.currentStatus,
    nextRotationDate: phase.nextRotationDate,
    daysUntilRotation: phase.daysUntilRotation,
    isOnBoard: phase.isOnBoard,
  }
}

// Functie om automatisch status bij te werken op basis van regime
export function autoUpdateStatus(crewDatabase: any): { hasChanges: boolean; updatedCrew: any } {
  let hasChanges = false
  const updatedCrew = { ...crewDatabase }
  
  Object.keys(updatedCrew).forEach(crewId => {
    const crewMember = updatedCrew[crewId]
    
    if (crewMember.regime && crewMember.regime !== "Altijd") {
      // Check of de status recent handmatig is gewijzigd (binnen laatste 24 uur)
      const lastManualUpdate = crewMember.lastManualStatusUpdate
      const now = new Date().getTime()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Als er geen recente handmatige update is, of als het langer dan 24 uur geleden is
      if (!lastManualUpdate || (now - new Date(lastManualUpdate).getTime()) > oneDayInMs) {
        const statusCalculation = calculateCurrentStatus(
          crewMember.regime,
          crewMember.thuisSinds,
          crewMember.onBoardSince
        )
        
        // Update status alleen als deze anders is dan de huidige
        if (crewMember.status !== statusCalculation.currentStatus) {
          updatedCrew[crewId] = {
            ...crewMember,
            status: statusCalculation.currentStatus
          }
          hasChanges = true
          console.log(`Status updated for ${crewMember.firstName} ${crewMember.lastName}: ${crewMember.status} → ${statusCalculation.currentStatus}`)
        }
      } else {
        console.log(`Skipping auto-update for ${crewMember.firstName} ${crewMember.lastName} - recently manually updated`)
      }
    }
  })
  
  return { hasChanges, updatedCrew }
}

// Nieuwe functie om datums automatisch door te laten lopen
export function autoAdvanceDates(crewDatabase: any): { hasChanges: boolean; updatedCrew: any } {
  let hasChanges = false
  const updatedCrew = { ...crewDatabase }

  Object.keys(updatedCrew).forEach((crewId) => {
    const crew = updatedCrew[crewId]
    const sync = getRotationSyncUpdate({
      regime: crew.regime,
      status: crew.status,
      on_board_since: crew.onBoardSince,
      thuis_sinds: crew.thuisSinds,
      expected_start_date: crew.expectedStartDate,
    })

    if (!sync) return

    crew.status = sync.status
    crew.onBoardSince = sync.on_board_since
    crew.thuisSinds = sync.thuis_sinds
    hasChanges = true
  })

  return { hasChanges, updatedCrew }
}

// Nieuwe functie om handmatig datums aan te passen
export function manuallyAdjustDates(
  crewId: string, 
  newDate: string, 
  dateType: "thuisSinds" | "onBoardSince",
  crewDatabase: any
): { hasChanges: boolean; updatedCrew: any } {
  const updatedCrew = { ...crewDatabase }
  const crew = updatedCrew[crewId]

  if (!crew || !crew.regime || crew.regime === "Altijd") {
    return { hasChanges: false, updatedCrew }
  }

  const regimeWeeks = Number.parseInt(crew.regime.split("/")[0])
  const regimeDays = regimeWeeks * 7

  crew[dateType] = newDate

  if (dateType === "thuisSinds") {
    const onBoardDate = addLocalDays(parseLocalDate(newDate), regimeDays)
    crew.onBoardSince = getLocalDateString(onBoardDate)
  } else {
    const thuisDate = addLocalDays(parseLocalDate(newDate), regimeDays)
    crew.thuisSinds = getLocalDateString(thuisDate)
  }

  const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
  crew.status = statusCalculation.currentStatus

  return { hasChanges: true, updatedCrew }
}

// Nieuwe functie om automatisch localStorage bij te werken met datum doorloop
export function autoAdvanceCrewDatabase(): boolean {
  try {
    const crewData = localStorage.getItem('crewDatabase')
    if (!crewData) return false

    const crew = JSON.parse(crewData)
    const { hasChanges, updatedCrew } = autoAdvanceDates(crew)

    if (hasChanges) {
      localStorage.setItem('crewDatabase', JSON.stringify(updatedCrew))
      
      // Trigger events voor UI update
      window.dispatchEvent(new Event('localStorageUpdate'))
      window.dispatchEvent(new Event('forceRefresh'))
      
      return true
    }

    return false
  } catch (error) {
    console.error('Error advancing crew database:', error)
    return false
  }
}

// Nieuwe functie om automatisch alle crew members bij te werken
export function updateAllCrewStatuses(crewDatabase: any): { hasChanges: boolean; updatedCrew: any } {
  let hasChanges = false
  const updatedCrew = { ...crewDatabase }

  Object.keys(updatedCrew).forEach((crewId) => {
    const crew = updatedCrew[crewId]
    const sync = getRotationSyncUpdate({
      regime: crew.regime,
      status: crew.status,
      on_board_since: crew.onBoardSince,
      thuis_sinds: crew.thuisSinds,
      expected_start_date: crew.expectedStartDate,
    })

    if (!sync) return

    crew.status = sync.status
    crew.onBoardSince = sync.on_board_since
    crew.thuisSinds = sync.thuis_sinds

    const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
    crew.nextRotationDate = statusCalculation.nextRotationDate
    crew.daysUntilRotation = statusCalculation.daysUntilRotation
    hasChanges = true
  })

  return { hasChanges, updatedCrew }
}

// Nieuwe functie om automatisch localStorage bij te werken
export function autoUpdateCrewDatabase(): boolean {
  try {
    const crewData = localStorage.getItem('crewDatabase')
    if (!crewData) return false

    const crew = JSON.parse(crewData)
    const { hasChanges, updatedCrew } = updateAllCrewStatuses(crew)

    if (hasChanges) {
      localStorage.setItem('crewDatabase', JSON.stringify(updatedCrew))
      
      // Trigger events voor UI update
      window.dispatchEvent(new Event('localStorageUpdate'))
      window.dispatchEvent(new Event('forceRefresh'))
      
      return true
    }

    return false
  } catch (error) {
    console.error('Error updating crew database:', error)
    return false
  }
}

export function calculateRegimeStatus(
  regime: "1/1" | "2/2" | "3/3",
  onBoardSince: string | null,
  currentStatus: string,
): RegimeCalculation {
  const today = getTodayLocal()

  if (!onBoardSince || currentStatus !== "aan-boord") {
    return {
      currentStatus: currentStatus as any,
      daysOnBoard: 0,
      daysLeft: 0,
      offBoardDate: "",
      nextOnBoardDate: "",
      isOverdue: false,
      rotationAlert: false,
    }
  }

  const startDate = parseLocalDate(onBoardSince)
  const daysOnBoard = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // Bepaal regime duur in weken
  if (!regime) {
    return {
      currentStatus: "aan-boord",
      daysOnBoard: 0,
      daysLeft: 0,
      offBoardDate: "",
      nextOnBoardDate: "",
      isOverdue: false,
      rotationAlert: false,
    }
  }
  
  const regimeWeeks = Number.parseInt(regime.split("/")[0])
  const regimeDays = regimeWeeks * 7

  const offBoardDate = addLocalDays(startDate, regimeDays)
  const nextOnBoardDate = addLocalDays(offBoardDate, regimeDays)

  const daysLeft = Math.floor((offBoardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysLeft < 0
  const rotationAlert = daysLeft <= 3 && daysLeft >= 0

  return {
    currentStatus: "aan-boord",
    daysOnBoard,
    daysLeft: Math.max(0, daysLeft),
    offBoardDate: getLocalDateString(offBoardDate),
    nextOnBoardDate: getLocalDateString(nextOnBoardDate),
    isOverdue,
    rotationAlert,
  }
}

export function getUpcomingRotations(crewDatabase: any): Array<{
  date: string
  crewMember: any
  ship: string
  type: "off-board" | "on-board"
  daysUntil: number
}> {
  const rotations: any[] = []
  const today = new Date()

  Object.values(crewDatabase).forEach((crew: any) => {
    if (crew.status === "aan-boord" && crew.onBoardSince && crew.regime) {
      const calculation = calculateRegimeStatus(crew.regime, crew.onBoardSince, crew.status)

      if (calculation.offBoardDate) {
        const offDate = new Date(calculation.offBoardDate)
        const daysUntil = Math.floor((offDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil >= 0 && daysUntil <= 14) {
          rotations.push({
            date: calculation.offBoardDate,
            crewMember: crew,
            ship: crew.shipId,
            type: "off-board",
            daysUntil,
          })
        }
      }
    }
  })

  return rotations.sort((a, b) => a.daysUntil - b.daysUntil)
}

export function getRotationAlerts(crewDatabase: any): Array<{
  type: "urgent" | "warning" | "info"
  message: string
  crewMember: any
  daysUntil: number
}> {
  const alerts: any[] = []

  Object.values(crewDatabase).forEach((crew: any) => {
    if (crew.status === "aan-boord" && crew.onBoardSince && crew.regime) {
      const calculation = calculateRegimeStatus(crew.regime, crew.onBoardSince, crew.status)

      if (calculation.isOverdue) {
        alerts.push({
          type: "urgent",
          message: `${crew.firstName || 'Onbekend'} ${crew.lastName || 'Onbekend'} is ${Math.abs(calculation.daysLeft)} dagen over tijd!`,
          crewMember: crew,
          daysUntil: calculation.daysLeft,
        })
      } else if (calculation.rotationAlert) {
        alerts.push({
          type: "warning",
          message: `${crew.firstName || 'Onbekend'} ${crew.lastName || 'Onbekend'} moet over ${calculation.daysLeft} dagen van boord`,
          crewMember: crew,
          daysUntil: calculation.daysLeft,
        })
      }
    }
  })

  return alerts.sort((a, b) => a.daysUntil - b.daysUntil)
}

