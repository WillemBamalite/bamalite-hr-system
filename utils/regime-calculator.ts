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
    if (crew.status === "aan-boord" && crew.onBoardSince) {
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
    if (crew.status === "aan-boord" && crew.onBoardSince) {
      const calculation = calculateRegimeStatus(crew.regime, crew.onBoardSince, crew.status)

      if (calculation.isOverdue) {
        alerts.push({
          type: "urgent",
          message: `${crew.firstName} ${crew.lastName} is ${Math.abs(calculation.daysLeft)} dagen over tijd!`,
          crewMember: crew,
          daysUntil: calculation.daysLeft,
        })
      } else if (calculation.rotationAlert) {
        alerts.push({
          type: "warning",
          message: `${crew.firstName} ${crew.lastName} moet over ${calculation.daysLeft} dagen van boord`,
          crewMember: crew,
          daysUntil: calculation.daysLeft,
        })
      }
    }
  })

  return alerts.sort((a, b) => a.daysUntil - b.daysUntil)
}
