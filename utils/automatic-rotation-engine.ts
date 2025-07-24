import { crewDatabase, shipDatabase } from "@/data/crew-database"

export interface AutomaticRotation {
  date: string
  shipId: string
  shipName: string
  rotations: Array<{
    crewMemberId: string
    crewMemberName: string
    position: string
    action: "off-board" | "on-board"
    regime: string
  }>
}

export interface DailyRotationSummary {
  date: string
  rotations: AutomaticRotation[]
  totalChanges: number
}

// Automatische rotatie uitvoering
export function executeAutomaticRotations(
  targetDate: string = new Date().toISOString().split("T")[0],
): DailyRotationSummary {
  const rotations: AutomaticRotation[] = []
  const today = new Date(targetDate)

  // Groepeer per schip
  const shipRotations: { [shipId: string]: AutomaticRotation } = {}

  // 1. Vind iedereen die vandaag van boord moet
  Object.values(crewDatabase).forEach((crew: any) => {
    if (crew.status === "aan-boord" && crew.onBoardSince && crew.status !== "ziek" && crew.status !== "uit-dienst") {
      const onBoardDate = new Date(crew.onBoardSince)
      const regimeWeeks = Number.parseInt(crew.regime.split("/")[0])
      const regimeDays = regimeWeeks * 7

      const offBoardDate = new Date(onBoardDate)
      offBoardDate.setDate(offBoardDate.getDate() + regimeDays)

      // Check of ze vandaag van boord moeten
      if (offBoardDate.toISOString().split("T")[0] === targetDate) {
        if (!shipRotations[crew.shipId]) {
          shipRotations[crew.shipId] = {
            date: targetDate,
            shipId: crew.shipId,
            shipName: shipDatabase[crew.shipId]?.name || crew.shipId,
            rotations: [],
          }
        }

        shipRotations[crew.shipId].rotations.push({
          crewMemberId: crew.id,
          crewMemberName: `${crew.firstName} ${crew.lastName}`,
          position: crew.position,
          action: "off-board",
          regime: crew.regime,
        })

        // Update status naar thuis
        crew.status = "thuis"
        crew.shipId = null
        crew.onBoardSince = null
      }
    }
  })

  // 2. Vind vervangingen voor elke positie die vrij komt
  Object.values(shipRotations).forEach((shipRotation) => {
    shipRotation.rotations.forEach((rotation) => {
      if (rotation.action === "off-board") {
        // Zoek vervanging voor deze positie
        const replacement = findReplacement(rotation.position, shipRotation.shipId, rotation.regime)

        if (replacement) {
          shipRotation.rotations.push({
            crewMemberId: replacement.id,
            crewMemberName: `${replacement.firstName} ${replacement.lastName}`,
            position: replacement.position,
            action: "on-board",
            regime: replacement.regime,
          })

          // Update status naar aan boord
          replacement.status = "aan-boord"
          replacement.shipId = shipRotation.shipId
          replacement.onBoardSince = targetDate
        }
      }
    })
  })

  const finalRotations = Object.values(shipRotations)
  const totalChanges = finalRotations.reduce((sum, ship) => sum + ship.rotations.length, 0)

  return {
    date: targetDate,
    rotations: finalRotations,
    totalChanges,
  }
}

// Zoek geschikte vervanging
function findReplacement(position: string, shipId: string, preferredRegime: string): any {
  // Zoek eerst iemand met dezelfde positie en regime die beschikbaar is
  const exactMatch = Object.values(crewDatabase).find(
    (crew: any) => crew.position === position && crew.regime === preferredRegime && crew.status === "beschikbaar",
  )

  if (exactMatch) return exactMatch

  // Zoek iemand met dezelfde positie maar ander regime
  const positionMatch = Object.values(crewDatabase).find(
    (crew: any) => crew.position === position && crew.status === "beschikbaar",
  )

  if (positionMatch) return positionMatch

  // Zoek compatible positie (Kapitein kan Stuurman zijn, etc.)
  const compatibleMatch = Object.values(crewDatabase).find(
    (crew: any) => isCompatiblePosition(crew.position, position) && crew.status === "beschikbaar",
  )

  return compatibleMatch || null
}

function isCompatiblePosition(crewPosition: string, neededPosition: string): boolean {
  const compatibility: { [key: string]: string[] } = {
    Kapitein: ["Stuurman", "2e Kapitein"],
    Stuurman: ["Matroos", "Volmatroos"],
    "2e Kapitein": ["Stuurman", "Matroos"],
    Volmatroos: ["Matroos", "Deksman"],
    Matroos: ["Deksman", "Lichtmatroos"],
  }

  return compatibility[crewPosition]?.includes(neededPosition) || false
}

// Krijg vandaag's rotaties (alleen voor weergave)
export function getTodaysRotations(): DailyRotationSummary {
  const today = new Date().toISOString().split("T")[0]
  return executeAutomaticRotations(today)
}

// Krijg rotatie meldingen (informatief, niet urgent)
export function getRotationNotifications(): Array<{
  type: "info" | "success"
  message: string
  shipName: string
  details: string[]
}> {
  const todaysRotations = getTodaysRotations()
  const notifications: any[] = []

  todaysRotations.rotations.forEach((shipRotation) => {
    if (shipRotation.rotations.length > 0) {
      const offBoardCount = shipRotation.rotations.filter((r) => r.action === "off-board").length
      const onBoardCount = shipRotation.rotations.filter((r) => r.action === "on-board").length

      notifications.push({
        type: "info",
        message: `Vandaag wisselen de ploegen op ${shipRotation.shipName}`,
        shipName: shipRotation.shipName,
        details: [
          `${offBoardCount} bemanningsleden gaan naar huis`,
          `${onBoardCount} bemanningsleden komen aan boord`,
          `Automatisch uitgevoerd om 00:00`,
        ],
      })
    }
  })

  return notifications
}

// Check voor zieke bemanning (geen regime berekening)
export function getSickCrewStatus(): Array<{
  crewMember: any
  shipName: string
  daysSick: number
  hasNoRegime: boolean
}> {
  const sickCrew: any[] = []

  Object.values(crewDatabase).forEach((crew: any) => {
    if (crew.status === "ziek" && crew.status !== "uit-dienst") {
      const daysSick = crew.onBoardSince
        ? Math.floor((new Date().getTime() - new Date(crew.onBoardSince).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      sickCrew.push({
        crewMember: crew,
        shipName: crew.shipId ? shipDatabase[crew.shipId]?.name || crew.shipId : "Geen schip",
        daysSick,
        hasNoRegime: true, // Zieke bemanning heeft geen regime
      })
    }
  })

  return sickCrew
}
