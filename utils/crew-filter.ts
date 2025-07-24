import { crewDatabase } from "@/data/crew-database"
import { isCrewMemberOutOfService } from "@/utils/out-of-service-storage"

// Helper functie om actieve bemanningsleden te filteren
export function getActiveCrew() {
  return Object.values(crewDatabase).filter((crew: any) => !isCrewMemberOutOfService(crew.id))
}

// Helper functie om bemanningsleden per schip te filteren
export function getActiveCrewForShip(shipId: string) {
  return Object.values(crewDatabase).filter((crew: any) => 
    crew.shipId === shipId && !isCrewMemberOutOfService(crew.id)
  )
}

// Helper functie om beschikbare bemanningsleden te filteren
export function getAvailableCrew() {
  return Object.values(crewDatabase).filter((crew: any) => 
    !crew.shipId && !isCrewMemberOutOfService(crew.id)
  )
} 