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
  console.log('🚀 STARTING AUTOMATIC ROTATION FOR:', targetDate)
  
  const rotations: AutomaticRotation[] = []
  const today = new Date(targetDate)

  // Haal crew data op uit localStorage
  const crewData = localStorage.getItem('crewDatabase')
  const currentCrew = crewData ? JSON.parse(crewData) : crewDatabase

  console.log('📊 Total crew members:', Object.keys(currentCrew).length)

  // Groepeer per schip
  const shipRotations: { [shipId: string]: AutomaticRotation } = {}

  // 1. Vind iedereen die vandaag van boord moet
  Object.values(currentCrew).forEach((crew: any) => {
    if (crew.status === "aan-boord" && crew.onBoardSince && crew.status !== "ziek" && crew.status !== "uit-dienst") {
      const onBoardDate = new Date(crew.onBoardSince)
      const regimeWeeks = Number.parseInt(crew.regime.split("/")[0])
      const regimeDays = regimeWeeks * 7

      const offBoardDate = new Date(onBoardDate)
      offBoardDate.setDate(offBoardDate.getDate() + regimeDays)

      console.log(`🔍 Checking ${crew.firstName} ${crew.lastName}:`)
      console.log(`   - On board since: ${crew.onBoardSince}`)
      console.log(`   - Regime: ${crew.regime} (${regimeDays} days)`)
      console.log(`   - Should be off board: ${offBoardDate.toISOString().split('T')[0]}`)
      console.log(`   - Target date: ${targetDate}`)
      console.log(`   - Should rotate today: ${offBoardDate.toISOString().split("T")[0] === targetDate}`)

      // Check of ze vandaag van boord moeten
      if (offBoardDate.toISOString().split("T")[0] === targetDate) {
        console.log(`🔄 ROTATION NEEDED: ${crew.firstName} ${crew.lastName} moet vandaag van boord!`)
        
        if (!shipRotations[crew.shipId]) {
          shipRotations[crew.shipId] = {
            date: targetDate,
            shipId: crew.shipId,
            shipName: shipDatabase[crew.shipId as keyof typeof shipDatabase]?.name || crew.shipId,
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
        crew.thuisSinds = targetDate
        
        console.log(`✅ Updated ${crew.firstName} ${crew.lastName} to "thuis"`)
      }
    }
  })

  console.log('📋 Found rotations for ships:', Object.keys(shipRotations))

  // 2. Vind vervangingen voor elke positie die vrij komt
  Object.values(shipRotations).forEach((shipRotation) => {
    console.log(`🛳️ Processing ship: ${shipRotation.shipName}`)
    
    shipRotation.rotations.forEach((rotation) => {
      if (rotation.action === "off-board") {
        console.log(`🔍 Looking for replacement for ${rotation.crewMemberName} (${rotation.position})`)
        
        // Zoek vervanging voor deze positie
        const replacement = findReplacement(rotation.position, shipRotation.shipId, rotation.regime, currentCrew)

        if (replacement) {
          console.log(`✅ Vervanging gevonden: ${replacement.firstName} ${replacement.lastName} voor ${rotation.crewMemberName}`)
          
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
          replacement.thuisSinds = null
          
          console.log(`✅ Updated ${replacement.firstName} ${replacement.lastName} to "aan-boord"`)
        } else {
          console.log(`⚠️ Geen vervanging gevonden voor ${rotation.crewMemberName} (${rotation.position})`)
        }
      }
    })
  })

  // 3. Update localStorage met de nieuwe data
  if (Object.values(shipRotations).some(ship => ship.rotations.length > 0)) {
    localStorage.setItem('crewDatabase', JSON.stringify(currentCrew))
    console.log('💾 Crew database bijgewerkt na automatische rotatie')
  } else {
    console.log('ℹ️ No rotations needed today')
  }

  const finalRotations = Object.values(shipRotations)
  const totalChanges = finalRotations.reduce((sum, ship) => sum + ship.rotations.length, 0)

  console.log(`🎯 ROTATION COMPLETE: ${totalChanges} total changes`)

  return {
    date: targetDate,
    rotations: finalRotations,
    totalChanges,
  }
}

// Zoek geschikte vervanging
function findReplacement(position: string, shipId: string, preferredRegime: string, crewData: any): any {
  console.log(`🔍 Finding replacement for position: ${position}, regime: ${preferredRegime}`)
  
  // Zoek eerst iemand met dezelfde positie en regime die beschikbaar is
  const exactMatch = Object.values(crewData).find(
    (crew: any) => crew.position === position && crew.regime === preferredRegime && crew.status === "beschikbaar",
  )

  if (exactMatch) {
    console.log(`✅ Exact match found: ${exactMatch.firstName} ${exactMatch.lastName}`)
    return exactMatch
  }

  // Zoek iemand met dezelfde positie maar ander regime
  const positionMatch = Object.values(crewData).find(
    (crew: any) => crew.position === position && crew.status === "beschikbaar",
  )

  if (positionMatch) {
    console.log(`✅ Position match found: ${positionMatch.firstName} ${positionMatch.lastName}`)
    return positionMatch
  }

  // Zoek compatible positie (Kapitein kan Stuurman zijn, etc.)
  const compatibleMatch = Object.values(crewData).find(
    (crew: any) => isCompatiblePosition(crew.position, position) && crew.status === "beschikbaar",
  )

  if (compatibleMatch) {
    console.log(`✅ Compatible match found: ${compatibleMatch.firstName} ${compatibleMatch.lastName}`)
    return compatibleMatch
  }

  console.log(`❌ No replacement found for position: ${position}`)
  return null
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

// Debug functie om crew status te controleren
export function debugCrewStatus(): void {
  const crewData = localStorage.getItem('crewDatabase')
  const currentCrew = crewData ? JSON.parse(crewData) : crewDatabase
  const today = new Date().toISOString().split("T")[0]

  console.log('🔍 DEBUG CREW STATUS FOR:', today)
  console.log('📊 Total crew members:', Object.keys(currentCrew).length)
  
  let rotationCandidates = 0
  
  Object.values(currentCrew).forEach((crew: any) => {
    if (crew.status === "aan-boord" && crew.onBoardSince) {
      const onBoardDate = new Date(crew.onBoardSince)
      const regimeWeeks = Number.parseInt(crew.regime.split("/")[0])
      const regimeDays = regimeWeeks * 7

      const offBoardDate = new Date(onBoardDate)
      offBoardDate.setDate(offBoardDate.getDate() + regimeDays)

      const daysUntilRotation = Math.floor((offBoardDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      const shouldRotateToday = offBoardDate.toISOString().split("T")[0] === today

      if (shouldRotateToday) {
        rotationCandidates++
      }

      console.log(`${crew.firstName} ${crew.lastName}:`)
      console.log(`  - Aan boord sinds: ${crew.onBoardSince}`)
      console.log(`  - Regime: ${crew.regime} (${regimeDays} dagen)`)
      console.log(`  - Van boord op: ${offBoardDate.toISOString().split('T')[0]}`)
      console.log(`  - Dagen tot rotatie: ${daysUntilRotation}`)
      console.log(`  - Moet vandaag wisselen: ${shouldRotateToday}`)
      console.log('')
    }
  })
  
  console.log(`🎯 TOTAL ROTATION CANDIDATES TODAY: ${rotationCandidates}`)
}
