export interface CrewMember {
  id: string
  firstName: string
  lastName: string
  nationality: string
  position: string
  shipId: string
  regime: "1/1" | "2/2" | "3/3" // Individueel regime per persoon
  status: "aan-boord" | "verlof" | "ziek" | "beschikbaar"
  startDate: string
  endDate?: string
  onBoardSince?: string
  offBoardDate?: string
  phone: string
  documents: Document[]
  sickLeave?: SickLeave
}

export interface Ship {
  id: string
  name: string
  status: "Operationeel" | "Onderhoud" | "Inactief"
  maxCrew: number
  currentCrew: CrewMember[]
  

}

export interface Document {
  id: string
  type: "vaarbewijs" | "medisch" | "certificaat" | "contract"
  name: string
  expiryDate: string
  fileUrl: string
  isValid: boolean
}

export interface SickLeave {
  id: string
  startDate: string
  endDate?: string
  description?: string
  hasCertificate: boolean
  certificateValidUntil?: string
  salaryPercentage: number
}

export interface OnboardingTask {
  id: string
  title: string
  description: string
  completed: boolean
  dueDate?: string
  assignedTo: string
}

export interface CrewRotation {
  id: string
  shipId: string
  date: string
  type: "wissel" | "terugkeer" | "vertrek" | "nood"
  crewChanges: CrewChange[]
  notes?: string
}

export interface CrewChange {
  crewMemberId: string
  action: "aan" | "af"
  position: string
  regime: string
}
