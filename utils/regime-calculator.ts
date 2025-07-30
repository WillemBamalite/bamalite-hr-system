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

// Nieuwe functie om automatisch status te berekenen op basis van thuisSinds en regime
export function calculateCurrentStatus(
  regime: "1/1" | "2/2" | "3/3",
  thuisSinds: string | null,
  onBoardSince: string | null,
): {
  currentStatus: "aan-boord" | "thuis"
  nextRotationDate: string
  daysUntilRotation: number
  isOnBoard: boolean
} {
  const today = new Date()
  const todayString = today.toISOString().split('T')[0]
  
  if (!regime) {
    return {
      currentStatus: "thuis",
      nextRotationDate: "",
      daysUntilRotation: 0,
      isOnBoard: false
    }
  }

  const regimeWeeks = Number.parseInt(regime.split("/")[0])
  const regimeDays = regimeWeeks * 7

  // Als er een thuisSinds datum is, bereken vanaf daar
  if (thuisSinds) {
    const thuisDate = new Date(thuisSinds)
    const nextOnBoardDate = new Date(thuisDate)
    nextOnBoardDate.setDate(nextOnBoardDate.getDate() + regimeDays)
    
    const nextOffBoardDate = new Date(nextOnBoardDate)
    nextOffBoardDate.setDate(nextOffBoardDate.getDate() + regimeDays)

    // Check of vandaag tussen thuisSinds en nextOnBoardDate ligt
    if (today >= thuisDate && today < nextOnBoardDate) {
      // Ze zijn thuis
      const daysUntil = Math.floor((nextOnBoardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        currentStatus: "thuis",
        nextRotationDate: nextOnBoardDate.toISOString().split('T')[0],
        daysUntilRotation: daysUntil,
        isOnBoard: false
      }
    } else if (today >= nextOnBoardDate && today < nextOffBoardDate) {
      // Ze zijn aan boord
      const daysUntil = Math.floor((nextOffBoardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        currentStatus: "aan-boord",
        nextRotationDate: nextOffBoardDate.toISOString().split('T')[0],
        daysUntilRotation: daysUntil,
        isOnBoard: true
      }
    } else {
      // Bereken de volgende cyclus
      const cyclesPassed = Math.floor((today.getTime() - thuisDate.getTime()) / (1000 * 60 * 60 * 24 * regimeDays * 2))
      const cycleStart = new Date(thuisDate)
      cycleStart.setDate(cycleStart.getDate() + (cyclesPassed * regimeDays * 2))
      
      const nextThuisDate = new Date(cycleStart)
      nextThuisDate.setDate(nextThuisDate.getDate() + regimeDays)
      
      if (today >= cycleStart && today < nextThuisDate) {
        // Ze zijn thuis
        const daysUntil = Math.floor((nextThuisDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
          currentStatus: "thuis",
          nextRotationDate: nextThuisDate.toISOString().split('T')[0],
          daysUntilRotation: daysUntil,
          isOnBoard: false
        }
      } else {
        // Ze zijn aan boord
        const nextOffDate = new Date(nextThuisDate)
        nextOffDate.setDate(nextOffDate.getDate() + regimeDays)
        const daysUntil = Math.floor((nextOffDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
          currentStatus: "aan-boord",
          nextRotationDate: nextOffDate.toISOString().split('T')[0],
          daysUntilRotation: daysUntil,
          isOnBoard: true
        }
      }
    }
  }

  // Als er geen thuisSinds is maar wel onBoardSince
  if (onBoardSince) {
    const onBoardDate = new Date(onBoardSince)
    const offBoardDate = new Date(onBoardDate)
    offBoardDate.setDate(offBoardDate.getDate() + regimeDays)
    
    const nextOnBoardDate = new Date(offBoardDate)
    nextOnBoardDate.setDate(nextOnBoardDate.getDate() + regimeDays)

    if (today >= onBoardDate && today < offBoardDate) {
      // Ze zijn aan boord
      const daysUntil = Math.floor((offBoardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        currentStatus: "aan-boord",
        nextRotationDate: offBoardDate.toISOString().split('T')[0],
        daysUntilRotation: daysUntil,
        isOnBoard: true
      }
    } else {
      // Ze zijn thuis
      const daysUntil = Math.floor((nextOnBoardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        currentStatus: "thuis",
        nextRotationDate: nextOnBoardDate.toISOString().split('T')[0],
        daysUntilRotation: daysUntil,
        isOnBoard: false
      }
    }
  }

  // Fallback: thuis
  return {
    currentStatus: "thuis",
    nextRotationDate: "",
    daysUntilRotation: 0,
    isOnBoard: false
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
