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

// Nieuwe functie om automatisch status te berekenen op basis van regime en huidige datum
export function calculateCurrentStatus(
  regime: "1/1" | "2/2" | "3/3" | "Altijd" | "" | "Onbekend",
  thuisSinds: string | null,
  onBoardSince: string | null,
  isSick: boolean = false,
): {
  currentStatus: "aan-boord" | "thuis"
  nextRotationDate: string | null
  daysUntilRotation: number
  isOnBoard: boolean
} {
  const today = new Date()
  
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

  const regimeWeeks = Number.parseInt(regime.split("/")[0])
  const regimeDays = regimeWeeks * 7

  // Gebruik de meest recente datum als startpunt
  let startDate: Date | null = null
  
  if (onBoardSince) {
    startDate = new Date(onBoardSince)
  } else if (thuisSinds) {
    startDate = new Date(thuisSinds)
  }

  if (!startDate) {
    // Als er geen startdatum is, gebruik vandaag als startpunt
    startDate = today
  }

  // Bereken hoeveel dagen er zijn verstreken sinds de startdatum
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Bereken in welke fase van het regime we zijn
  const totalCycleDays = regimeDays * 2 // aan boord + thuis
  const currentCycleDay = daysSinceStart % totalCycleDays
  
  // Bepaal of we in de aan boord fase zijn (eerste helft van de cyclus)
  const isOnBoardPhase = currentCycleDay < regimeDays
  
  // Bereken de volgende wisseldatum
  const nextRotationDate = new Date(startDate)
  if (isOnBoardPhase) {
    // We zijn aan boord, volgende wissel is naar thuis
    nextRotationDate.setDate(nextRotationDate.getDate() + regimeDays)
  } else {
    // We zijn thuis, volgende wissel is naar aan boord
    nextRotationDate.setDate(nextRotationDate.getDate() + totalCycleDays)
  }
  
  // Bereken dagen tot wissel
  const daysUntilRotation = Math.floor((nextRotationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    currentStatus: isOnBoardPhase ? "aan-boord" : "thuis",
    nextRotationDate: nextRotationDate.toISOString().split('T')[0],
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

