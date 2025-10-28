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
function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper functie om datum string te parsen als lokale datum (geen UTC conversie)
function parseLocalDate(dateString: string): Date {
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

// Nieuwe functie om automatisch status te berekenen op basis van regime en huidige datum
export function calculateCurrentStatus(
  regime: "1/1" | "2/2" | "3/3" | "Altijd" | "" | "Onbekend",
  thuisSinds: string | null,
  onBoardSince: string | null,
  isSick: boolean = false,
  expectedStartDate?: string | null,
): {
  currentStatus: "aan-boord" | "thuis"
  nextRotationDate: string | null
  daysUntilRotation: number
  isOnBoard: boolean
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Als expected_start_date vandaag is of geweest is, behandel alsof ze vandaag aan boord zijn gekomen
  if (expectedStartDate && !onBoardSince) {
    const expectedDate = parseLocalDate(expectedStartDate)
    if (today >= expectedDate) {
      // Ze zouden vandaag of eerder aan boord moeten zijn
      onBoardSince = getLocalDateString(expectedDate)
    }
  }
  
  if (!regime || regime === "" || regime === "Onbekend") {
    return {
      currentStatus: "thuis",
      nextRotationDate: null,
      daysUntilRotation: 0,
      isOnBoard: false
    }
  }

  // Als iemand ziek is, stop de rotatie
  if (isSick) {
    return {
      currentStatus: "thuis", // Default status voor zieke bemanningsleden
      nextRotationDate: null,
      daysUntilRotation: 0,
      isOnBoard: false
    }
  }

  // Altijd regime - altijd aan boord
  if (regime === "Altijd") {
    return {
      currentStatus: "aan-boord",
      nextRotationDate: null,
      daysUntilRotation: 0,
      isOnBoard: true
    }
  }

  // Bepaal N (wisseldag) en phaseLen (effectieve dagen per fase)
  // 1/1 → N=8, phaseLen=7
  // 2/2 → N=15, phaseLen=14
  // 3/3 → N=22, phaseLen=21
  const regimeWeeks = Number.parseInt(regime.split("/")[0])
  const phaseLen = regimeWeeks * 7 // N - 1 (effectieve dagen per fase)
  const N = phaseLen + 1 // Wisseldag (dag waarop om 00:00 wordt gewisseld)
  const cycleLen = phaseLen * 2 // Totale cyclus lengte

  // Bepaal anker (anchor) - dit is dag 1 van de cyclus
  let anchor: Date | null = null
  let hasFutureStartDate = false
  
  // Prioriteit 1: onBoardSince is altijd het anker (dag 1)
  if (onBoardSince) {
    anchor = parseLocalDate(onBoardSince)
  } else if (expectedStartDate) {
    // Prioriteit 2: expectedStartDate (als die bestaat, heeft die voorrang over thuisSinds)
    const expectedDate = parseLocalDate(expectedStartDate)
    if (today >= expectedDate) {
      // Vandaag of verleden: gebruik als anker
      anchor = expectedDate
    } else {
      // Toekomst: markeer dat er een toekomstige startdatum is
      hasFutureStartDate = true
      anchor = expectedDate // Gebruik als anker voor berekening, maar status blijft thuis
    }
  } else if (thuisSinds) {
    // Prioriteit 3: Als alleen thuisSinds bestaat, dan is dat een wisseldag
    // Anker = thuisSinds - phaseLen (terug naar dag 1)
    const thuisDate = parseLocalDate(thuisSinds)
    anchor = new Date(thuisDate)
    anchor.setDate(anchor.getDate() - phaseLen)
  }

  let isOnBoardPhase: boolean = false
  let nextRotationDate: Date

  if (!anchor) {
    // Geen anker - default naar thuis, nextRotation = vandaag + phaseLen
    isOnBoardPhase = false
    nextRotationDate = new Date(today)
    nextRotationDate.setDate(nextRotationDate.getDate() + phaseLen)
  } else if (hasFutureStartDate) {
    // Toekomstige startdatum: status is thuis, nextRotation = expectedStartDate
    isOnBoardPhase = false
    nextRotationDate = new Date(anchor)
  } else {
    // Bereken diff = aantal kalenderdagen (today@00:00 - anchor@00:00)
    const diff = Math.floor((today.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diff < 0) {
      // Vóór de start: status = Thuis, nextRotation = anchor
      isOnBoardPhase = false
      nextRotationDate = new Date(anchor)
    } else {
      // diff >= 0: bereken fase
      // k = floor(diff / phaseLen) (aantal halve cycli)
      const k = Math.floor(diff / phaseLen)
      // fase = k % 2 (0 = Aan boord, 1 = Thuis)
      const fase = k % 2
      isOnBoardPhase = fase === 0
      
      // phaseStart = anchor + k × phaseLen
      const phaseStart = new Date(anchor)
      phaseStart.setDate(phaseStart.getDate() + (k * phaseLen))
      // nextRotation = phaseStart + phaseLen (middernacht van wisseldag)
      nextRotationDate = new Date(phaseStart)
      nextRotationDate.setDate(nextRotationDate.getDate() + phaseLen)
    }
    nextRotationDate.setHours(0, 0, 0, 0)
  }
  
  // Bereken dagen tot wissel (0 op wisseldag, nooit negatief)
  const daysUntilRotation = Math.max(0, Math.floor((nextRotationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

  return {
    currentStatus: isOnBoardPhase ? "aan-boord" : "thuis",
    nextRotationDate: getLocalDateString(nextRotationDate),
    daysUntilRotation: daysUntilRotation,
    isOnBoard: isOnBoardPhase
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
  const today = new Date()

  Object.keys(updatedCrew).forEach((crewId) => {
    const crew = updatedCrew[crewId]
    
    // Skip als crew member geen regime heeft, ziek is, of "Altijd" regime heeft
    if (!crew.regime || crew.status === "ziek" || crew.regime === "Altijd") {
      return
    }

    const regimeWeeks = Number.parseInt(crew.regime.split("/")[0])
    const regimeDays = regimeWeeks * 7

    // Bereken huidige status
    const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)

    // Als ze aan boord zijn en de offBoardDate is gepasseerd, update naar thuis
    if (statusCalculation.currentStatus === "aan-boord" && crew.onBoardSince) {
      const onBoardDate = new Date(crew.onBoardSince)
      const offBoardDate = new Date(onBoardDate)
      offBoardDate.setDate(offBoardDate.getDate() + regimeDays)

      if (today > offBoardDate) {
        // Ze zijn over tijd, update naar thuis
        crew.status = "thuis"
        crew.thuisSinds = offBoardDate.toISOString().split('T')[0]
        crew.onBoardSince = null
        hasChanges = true
      }
    }

    // Als ze thuis zijn en de nextOnBoardDate is gepasseerd, update naar aan boord
    if (statusCalculation.currentStatus === "thuis" && crew.thuisSinds) {
      const thuisDate = new Date(crew.thuisSinds)
      const nextOnBoardDate = new Date(thuisDate)
      nextOnBoardDate.setDate(nextOnBoardDate.getDate() + regimeDays)

      if (today >= nextOnBoardDate) {
        // Ze moeten aan boord zijn, update
        crew.status = "aan-boord"
        crew.onBoardSince = nextOnBoardDate.toISOString().split('T')[0]
        crew.thuisSinds = null
        hasChanges = true
      }
    }
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

  // Update de opgegeven datum
  crew[dateType] = newDate

  // Bereken de andere datum op basis van het regime
  if (dateType === "thuisSinds") {
    // Als thuisSinds wordt aangepast, bereken onBoardSince
    const thuisDate = new Date(newDate)
    const onBoardDate = new Date(thuisDate)
    onBoardDate.setDate(onBoardDate.getDate() + regimeDays)
    crew.onBoardSince = onBoardDate.toISOString().split('T')[0]
  } else {
    // Als onBoardSince wordt aangepast, bereken thuisSinds
    const onBoardDate = new Date(newDate)
    const thuisDate = new Date(onBoardDate)
    thuisDate.setDate(thuisDate.getDate() + regimeDays)
    crew.thuisSinds = thuisDate.toISOString().split('T')[0]
  }

  // Bereken nieuwe status
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
  const today = new Date()

  Object.keys(updatedCrew).forEach((crewId) => {
    const crew = updatedCrew[crewId]
    
    // Skip als crew member geen regime heeft of ziek is
    if (!crew.regime || crew.status === "ziek") {
      return
    }

    // Skip als regime "Altijd" is - deze hoeven niet bijgewerkt te worden
    if (crew.regime === "Altijd") {
      return
    }

    // Bereken huidige status op basis van regime en datums
    const statusCalculation = calculateCurrentStatus(
      crew.regime,
      crew.thuisSinds,
      crew.onBoardSince
    )

    // Update status als deze anders is
    if (crew.status !== statusCalculation.currentStatus) {
      crew.status = statusCalculation.currentStatus
      crew.nextRotationDate = statusCalculation.nextRotationDate
      crew.daysUntilRotation = statusCalculation.daysUntilRotation
      hasChanges = true
    }

    // Update datums als ze nog niet bestaan
    if (statusCalculation.currentStatus === "aan-boord" && !crew.onBoardSince) {
      // Bereken wanneer ze aan boord kwamen
      if (crew.thuisSinds) {
        const thuisDate = new Date(crew.thuisSinds)
        const regimeWeeks = Number.parseInt(crew.regime.split("/")[0])
        const regimeDays = regimeWeeks * 7
        const onBoardDate = new Date(thuisDate)
        onBoardDate.setDate(onBoardDate.getDate() + regimeDays)
        crew.onBoardSince = onBoardDate.toISOString().split('T')[0]
      }
    } else if (statusCalculation.currentStatus === "thuis" && !crew.thuisSinds) {
      // Bereken wanneer ze naar huis gingen
      if (crew.onBoardSince) {
        const onBoardDate = new Date(crew.onBoardSince)
        const regimeWeeks = Number.parseInt(crew.regime.split("/")[0])
        const regimeDays = regimeWeeks * 7
        const thuisDate = new Date(onBoardDate)
        thuisDate.setDate(thuisDate.getDate() + regimeDays)
        crew.thuisSinds = thuisDate.toISOString().split('T')[0]
      }
    }
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
  const today = new Date()

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

  const startDate = new Date(onBoardSince)
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

  // Bereken wanneer ze van boord moeten
  const offBoardDate = new Date(startDate)
  offBoardDate.setDate(offBoardDate.getDate() + regimeDays)

  // Bereken wanneer ze weer aan boord komen (na evenveel weken thuis)
  const nextOnBoardDate = new Date(offBoardDate)
  nextOnBoardDate.setDate(nextOnBoardDate.getDate() + regimeDays)

  const daysLeft = Math.floor((offBoardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysLeft < 0
  const rotationAlert = daysLeft <= 3 && daysLeft >= 0

  return {
    currentStatus: "aan-boord",
    daysOnBoard,
    daysLeft: Math.max(0, daysLeft),
    offBoardDate: offBoardDate.toISOString().split("T")[0],
    nextOnBoardDate: nextOnBoardDate.toISOString().split("T")[0],
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

