"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MobileHeaderNav } from '@/components/ui/mobile-header-nav'
import { DashboardButton } from '@/components/ui/dashboard-button'
import { 
  UserPlus, 
  CheckCircle, 
  CalendarDays, 
  Ship, 
  Phone, 
  Mail, 
  Clock, 
  MapPin,
  Anchor
} from 'lucide-react'
import { useSupabaseData } from '@/hooks/use-supabase-data'

export default function AflossersPage() {
  const { crew, ships, loading, updateCrew } = useSupabaseData()
  const [assignDialog, setAssignDialog] = useState<string | null>(null)
  const [absenceDialog, setAbsenceDialog] = useState<string | null>(null)
  const [plannedTripsDialog, setPlannedTripsDialog] = useState(false)
  const [assignAflosserDialog, setAssignAflosserDialog] = useState<string | null>(null)
  const [assignData, setAssignData] = useState({
    shipId: "",
    startDate: "",
    endDate: "",
    notes: "",
    assignmentType: "period", // "period" or "trip"
    tripFrom: "",
    tripTo: ""
  })
  const [absenceData, setAbsenceData] = useState({
    startDate: "",
    endDate: "",
    reason: ""
  })
  const [endAssignmentDialog, setEndAssignmentDialog] = useState<string | null>(null)
  const [endAssignmentData, setEndAssignmentData] = useState({
    endDate: new Date().toISOString().split('T')[0]
  })
  
  // Planned trips state
  const [plannedTrips, setPlannedTrips] = useState<any[]>([])
  const [newPlannedTrip, setNewPlannedTrip] = useState({
    shipId: "",
    tripName: "",
    startDate: "",
    endDate: "",
    tripFrom: "",
    tripTo: "",
    notes: ""
  })
  const [selectedAflosserId, setSelectedAflosserId] = useState("")

  const currentDate = new Date().toISOString().split('T')[0]

  // Load planned trips from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTrips = JSON.parse(localStorage.getItem('plannedTrips') || '[]')
      setPlannedTrips(storedTrips)
    }
  }, [])

  // Sync ships data to localStorage for fallback
  useEffect(() => {
    if (ships.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('ships', JSON.stringify(ships))
      console.log('Ships synced to localStorage:', ships.length, 'ships')
    }
  }, [ships])

  // Helper functions
  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      'NL': '🇳🇱',
      'DE': '🇩🇪',
      'BE': '🇧🇪',
      'PL': '🇵🇱'
    }
    return flags[nationality] || '🏳️'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aan-boord': return 'bg-red-100 text-red-800'
      case 'thuis': return 'bg-green-100 text-green-800'
      case 'afwezig': return 'bg-orange-100 text-orange-800'
      case 'ziek': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aan-boord': return 'Aan boord'
      case 'thuis': return 'Beschikbaar'
      case 'afwezig': return 'Afwezig'
      case 'ziek': return 'Ziek'
      default: return status
    }
  }

  const getShipName = (shipId: string) => {
    if (!shipId) return 'Geen schip toegewezen'
    
    // First try to find in ships array
    const ship = ships.find((s: any) => s.id === shipId)
    if (ship) return ship.name
    
    // If not found, try to get from localStorage as fallback
    if (typeof window !== 'undefined') {
      try {
        const storedShips = JSON.parse(localStorage.getItem('ships') || '[]')
        const storedShip = storedShips.find((s: any) => s.id === shipId)
        if (storedShip) return storedShip.name
      } catch (error) {
        console.error('Error reading ships from localStorage:', error)
      }
    }
    
    // Debug logging
    console.warn(`Ship not found for ID: ${shipId}`)
    console.log('Available ships from state:', ships.map(s => ({ id: s.id, name: s.name })))
    
    return 'Onbekend schip'
  }

  const handleAssignToShip = async (aflosserId: string) => {
    try {
      const aflosser = crew.find((c: any) => c.id === aflosserId)
      if (!aflosser) return

      const updates = {
        ship_id: assignData.shipId,
        status: "aan-boord" as const
      }

      await updateCrew(aflosserId, updates)
      
      // Add assignment to history in localStorage
      if (typeof window !== 'undefined') {
        const assignmentHistoryKey = `assignment_history_${aflosserId}`
        const existingHistory = JSON.parse(localStorage.getItem(assignmentHistoryKey) || '[]')
        
        const newAssignment = {
          id: `assignment_${Date.now()}`,
          ship_id: assignData.shipId,
          start_date: assignData.startDate,
          end_date: assignData.endDate || null,
          notes: assignData.notes,
          assignment_type: assignData.assignmentType,
          trip_from: assignData.tripFrom || null,
          trip_to: assignData.tripTo || null,
          type: "assignment",
          created_at: new Date().toISOString()
        }
        
        existingHistory.push(newAssignment)
        localStorage.setItem(assignmentHistoryKey, JSON.stringify(existingHistory))
      }
      
      setAssignDialog(null)
      setAssignData({ shipId: "", startDate: "", endDate: "", notes: "", assignmentType: "period", tripFrom: "", tripTo: "" })
      alert("Aflosser succesvol toegewezen aan schip!")
      
    } catch (error) {
      console.error("Error assigning aflosser:", error)
      alert("Fout bij toewijzen aan schip")
    }
  }

  const handleMarkAbsent = async (aflosserId: string) => {
    try {
      console.log("Starting handleMarkAbsent for:", aflosserId)
      
      const aflosser = crew.find((c: any) => c.id === aflosserId)
      if (!aflosser) {
        console.error("Aflosser not found:", aflosserId)
        alert("Aflosser niet gevonden")
        return
      }

      console.log("Found aflosser:", aflosser.first_name, aflosser.last_name)

      // Check if this is a current absence (starts today or earlier)
      const isCurrentAbsence = absenceData.startDate <= currentDate
      console.log("Is current absence:", isCurrentAbsence)
      
      // Store assignment history in localStorage
      if (typeof window !== 'undefined') {
        const assignmentHistoryKey = `assignment_history_${aflosserId}`
        const existingHistory = JSON.parse(localStorage.getItem(assignmentHistoryKey) || '[]')
        
        const newAbsence = {
          id: `absence_${Date.now()}`,
          start_date: absenceData.startDate,
          end_date: absenceData.endDate || absenceData.startDate,
          reason: absenceData.reason,
          type: "absence",
          created_at: new Date().toISOString()
        }
        
        existingHistory.push(newAbsence)
        localStorage.setItem(assignmentHistoryKey, JSON.stringify(existingHistory))
        console.log("Stored absence in localStorage:", newAbsence)
      }

      // Update crew member status only (minimal update to avoid schema issues)
      const updates = {
        status: isCurrentAbsence ? "afwezig" as const : "thuis" as const
      }

      console.log("Updating crew with:", updates)
      await updateCrew(aflosserId, updates)
      console.log("Crew update successful")
      
      setAbsenceDialog(null)
      setAbsenceData({ startDate: "", endDate: "", reason: "" })
      alert("Afwezigheid succesvol geregistreerd!")
      
    } catch (error) {
      console.error("Error marking absence:", error)
      console.error("Error type:", typeof error)
      console.error("Error constructor:", error?.constructor?.name)
      
      let errorMessage = "Onbekende fout"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error, null, 2)
      } else {
        errorMessage = String(error)
      }
      
      console.error("Error details:", errorMessage)
      alert(`Fout bij registreren afwezigheid: ${errorMessage}`)
    }
  }

  const handleEndAssignment = async (aflosserId: string) => {
    try {
      const aflosser = crew.find((c: any) => c.id === aflosserId)
      if (!aflosser) return

      const updates = {
        status: "thuis" as const,
        ship_id: undefined
      }

      await updateCrew(aflosserId, updates)
      
      // Update assignment history in localStorage to mark current assignment as ended
      if (typeof window !== 'undefined') {
        const assignmentHistoryKey = `assignment_history_${aflosserId}`
        const existingHistory = JSON.parse(localStorage.getItem(assignmentHistoryKey) || '[]')
        
        // Find the most recent assignment and mark it as ended
        const currentAssignment = existingHistory
          .filter((entry: any) => entry.type === "assignment")
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        
        if (currentAssignment) {
          currentAssignment.end_date = endAssignmentData.endDate
          currentAssignment.ended_at = new Date().toISOString()
          localStorage.setItem(assignmentHistoryKey, JSON.stringify(existingHistory))
        }
      }
      
      setEndAssignmentDialog(null)
      setEndAssignmentData({ endDate: new Date().toISOString().split('T')[0] })
      alert("Reis succesvol beëindigd. Aflosser is nu weer beschikbaar.")
      
    } catch (error) {
      console.error("Error ending assignment:", error)
      alert("Er is een fout opgetreden bij het beëindigen van de reis.")
    }
  }

  const handleCreatePlannedTrip = async () => {
    try {
      const newTrip = {
        id: Date.now().toString(), // Simple ID for localStorage
        ship_id: newPlannedTrip.shipId,
        trip_name: newPlannedTrip.tripName,
        start_date: newPlannedTrip.startDate,
        end_date: newPlannedTrip.endDate || null, // Optional end date
        trip_from: newPlannedTrip.tripFrom,
        trip_to: newPlannedTrip.tripTo,
        status: 'gepland' as const,
        notes: newPlannedTrip.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Store in localStorage for now
      if (typeof window !== 'undefined') {
        const existingTrips = JSON.parse(localStorage.getItem('plannedTrips') || '[]')
        const updatedTrips = [...existingTrips, newTrip]
        localStorage.setItem('plannedTrips', JSON.stringify(updatedTrips))
        setPlannedTrips(updatedTrips)
      }

      // Reset form
      setNewPlannedTrip({
        shipId: "",
        tripName: "",
        startDate: "",
        endDate: "",
        tripFrom: "",
        tripTo: "",
        notes: ""
      })
      
      setPlannedTripsDialog(false)
      alert("Geplande reis succesvol aangemaakt!")
      
    } catch (error) {
      console.error("Error creating planned trip:", error)
      alert("Er is een fout opgetreden bij het aanmaken van de geplande reis.")
    }
  }

  const handleAssignAflosserToTrip = (tripId: string) => {
    // Find available aflossers
    const availableAflossers = aflossers.filter((a: any) => 
      a.status === "thuis" && !a.currentAbsence
    )

    if (availableAflossers.length === 0) {
      alert("Er zijn geen beschikbare aflossers om toe te wijzen aan deze reis.")
      return
    }

    // Open dialog for aflosser selection
    setAssignAflosserDialog(tripId)
    setSelectedAflosserId("")
  }

  const handleConfirmAssignAflosser = async () => {
    if (!assignAflosserDialog || !selectedAflosserId) return

    const selectedAflosser = aflossers.find((a: any) => a.id === selectedAflosserId)
    if (!selectedAflosser) return

    // Update trip status and assign aflosser
    const updatedTrips = plannedTrips.map((trip: any) => {
      if (trip.id === assignAflosserDialog) {
        return {
          ...trip,
          status: 'actief',
          aflosser_id: selectedAflosser.id,
          updated_at: new Date().toISOString()
        }
      }
      return trip
    })

    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('plannedTrips', JSON.stringify(updatedTrips))
      setPlannedTrips(updatedTrips)
    }

    // Assign aflosser to ship
    const trip = plannedTrips.find((t: any) => t.id === assignAflosserDialog)
    if (trip) {
      await updateCrew(selectedAflosser.id, {
        ship_id: trip.ship_id,
        status: "aan-boord"
      })
    }

    setAssignAflosserDialog(null)
    setSelectedAflosserId("")
    alert(`Aflosser ${selectedAflosser.first_name} ${selectedAflosser.last_name} succesvol toegewezen aan reis!`)
  }

  const handleCancelTrip = (tripId: string) => {
    const trip = plannedTrips.find((t: any) => t.id === tripId)
    if (!trip) return

    const confirmCancel = confirm(
      `Weet je zeker dat je de reis "${trip.trip_name}" wilt annuleren?\n\n` +
      `Schip: ${getShipName(trip.ship_id)}\n` +
      `Startdatum: ${format(new Date(trip.start_date), 'dd-MM-yyyy')}\n` +
      `Reis: ${trip.trip_from} → ${trip.trip_to}\n\n` +
      `Deze actie kan niet ongedaan worden gemaakt.`
    )

    if (!confirmCancel) return

    // Remove trip from plannedTrips
    const updatedTrips = plannedTrips.filter((t: any) => t.id !== tripId)

    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('plannedTrips', JSON.stringify(updatedTrips))
      setPlannedTrips(updatedTrips)
    }

    alert(`Reis "${trip.trip_name}" is succesvol geannuleerd.`)
  }

  const handleCompleteTrip = async (tripId: string) => {
    const trip = plannedTrips.find((t: any) => t.id === tripId)
    if (!trip || !trip.aflosser_id) return

    const assignedAflosser = crew.find((c: any) => c.id === trip.aflosser_id)
    if (!assignedAflosser) return

    const confirmComplete = confirm(
      `Weet je zeker dat je de reis "${trip.trip_name}" wilt afsluiten?\n\n` +
      `Schip: ${getShipName(trip.ship_id)}\n` +
      `Aflosser: ${assignedAflosser.first_name} ${assignedAflosser.last_name}\n` +
      `Startdatum: ${format(new Date(trip.start_date), 'dd-MM-yyyy')}\n` +
      `Reis: ${trip.trip_from} → ${trip.trip_to}\n\n` +
      `De aflosser wordt weer beschikbaar gesteld.`
    )

    if (!confirmComplete) return

    // Update trip status to completed
    const updatedTrips = plannedTrips.map((t: any) => {
      if (t.id === tripId) {
        return {
          ...t,
          status: 'voltooid',
          updated_at: new Date().toISOString()
        }
      }
      return t
    })

    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('plannedTrips', JSON.stringify(updatedTrips))
      setPlannedTrips(updatedTrips)
    }

    // Make aflosser available again
    try {
      await updateCrew(trip.aflosser_id, {
        status: "thuis",
        ship_id: undefined
      })
      
      console.log(`Aflosser ${assignedAflosser.first_name} ${assignedAflosser.last_name} is vrijgemaakt van schip`)
      
    } catch (error) {
      console.error("Error updating aflosser status:", error)
      alert("Fout bij het vrijmaken van de aflosser. Probeer het opnieuw.")
      return
    }

    alert(`Reis "${trip.trip_name}" is succesvol afgesloten. ${assignedAflosser.first_name} ${assignedAflosser.last_name} is weer beschikbaar.`)
  }

  // Filter aflossers from crew and apply automatic status updates
  const aflossers = crew
    .filter((member: any) => member.position === "Aflosser")
    .map((member: any) => {
      // Get assignment history from localStorage
      let assignmentHistory: any[] = []
      if (typeof window !== 'undefined') {
        const assignmentHistoryKey = `assignment_history_${member.id}`
        assignmentHistory = JSON.parse(localStorage.getItem(assignmentHistoryKey) || '[]')
      }

      // Check for planned absences
      const plannedAbsences = assignmentHistory
        .filter((entry: any) => entry.type === "absence")
        .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

      const currentAbsence = plannedAbsences.find((entry: any) => {
        const startDate = entry.start_date
        const endDate = entry.end_date || entry.start_date
        return currentDate >= startDate && currentDate <= endDate
      })

      const hasPlannedAbsence = plannedAbsences.length > 0
      const nextAbsence = plannedAbsences.find((entry: any) => {
        const startDate = entry.start_date
        return currentDate < startDate
      })

      // Auto-update status based on current absence
      if (currentAbsence && member.status !== "afwezig") {
        // Update status to absent if currently in absence period
        updateCrew(member.id, { status: "afwezig" })
        return { 
          ...member, 
          status: "afwezig", 
          assignment_history: assignmentHistory,
          hasPlannedAbsence,
          currentAbsence,
          nextAbsence
        }
      } else if (!currentAbsence && member.status === "afwezig") {
        // Reset to available if absence period has passed
        updateCrew(member.id, { status: "thuis" })
        return { 
          ...member, 
          status: "thuis", 
          assignment_history: assignmentHistory,
          hasPlannedAbsence,
          currentAbsence,
          nextAbsence
        }
      }

      return { 
        ...member, 
        assignment_history: assignmentHistory,
        hasPlannedAbsence,
        currentAbsence,
        nextAbsence
      }
    })

  // AflosserCard Component
  const AflosserCard = ({ aflosser, onAssignToShip, onMarkAbsent, showPlannedAbsence }: any) => {
    const isCurrentlyAbsent = aflosser.status === "afwezig"
    const isAssignedToShip = aflosser.status === "aan-boord"
    
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {aflosser.first_name[0]}{aflosser.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <Link 
                  href={`/bemanning/aflossers/${aflosser.id}`}
                  className="font-medium text-gray-900 hover:text-blue-700"
                >
                  {aflosser.first_name} {aflosser.last_name}
                </Link>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{getNationalityFlag(aflosser.nationality)}</span>
                  <span>•</span>
                  <span>{aflosser.nationality}</span>
                </div>
              </div>
            </div>
            <Badge className={getStatusColor(aflosser.status)}>
              {getStatusText(aflosser.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Contact Info */}
          <div className="space-y-2 text-sm">
            {aflosser.phone && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{aflosser.phone}</span>
              </div>
            )}
          </div>

          {/* Current Absence Info */}
          {aflosser.currentAbsence && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
              <div className="flex items-center space-x-2 text-sm text-orange-700">
                <CalendarDays className="w-4 h-4" />
                <span className="font-medium">Afwezig vanaf:</span>
                <span>{aflosser.currentAbsence.start_date} - {aflosser.currentAbsence.end_date || aflosser.currentAbsence.start_date}</span>
              </div>
              {aflosser.currentAbsence.reason && (
                <div className="text-xs text-orange-600 mt-1">
                  Reden: {aflosser.currentAbsence.reason}
                </div>
              )}
            </div>
          )}

          {/* Planned Absence Info */}
          {showPlannedAbsence && aflosser.nextAbsence && !aflosser.currentAbsence && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center space-x-2 text-sm text-yellow-700">
                <CalendarDays className="w-4 h-4" />
                <span className="font-medium">Geplande afwezigheid:</span>
                <span>{aflosser.nextAbsence.start_date} - {aflosser.nextAbsence.end_date || aflosser.nextAbsence.start_date}</span>
              </div>
              {aflosser.nextAbsence.reason && (
                <div className="text-xs text-yellow-600 mt-1">
                  Reden: {aflosser.nextAbsence.reason}
                </div>
              )}
            </div>
          )}

          {/* Ship Assignment */}
          {aflosser.ship_id && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Ship className="w-4 h-4" />
                <span>Toegewezen aan: {getShipName(aflosser.ship_id)}</span>
              </div>
              {/* Show current assignment details */}
              {(() => {
                const currentAssignment = aflosser.assignment_history
                  ?.filter((entry: any) => entry.type === "assignment")
                  ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                
                if (currentAssignment) {
                  if (currentAssignment.assignment_type === "trip" && currentAssignment.trip_from && currentAssignment.trip_to) {
                    return (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center space-x-2 text-sm text-blue-700">
                          <Ship className="w-4 h-4" />
                          <span className="font-medium">Reis:</span>
                          <span>{currentAssignment.trip_from} → {currentAssignment.trip_to}</span>
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Vanaf: {format(new Date(currentAssignment.start_date), 'dd-MM-yyyy')}
                          {currentAssignment.notes && ` • ${currentAssignment.notes}`}
                        </div>
                      </div>
                    )
                  } else {
                    return (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center space-x-2 text-sm text-blue-700">
                          <Ship className="w-4 h-4" />
                          <span className="font-medium">Periode:</span>
                          <span>{format(new Date(currentAssignment.start_date), 'dd-MM-yyyy')}</span>
                          {currentAssignment.end_date && (
                            <>
                              <span>-</span>
                              <span>{format(new Date(currentAssignment.end_date), 'dd-MM-yyyy')}</span>
                            </>
                          )}
                        </div>
                        {currentAssignment.notes && (
                          <div className="text-xs text-blue-600 mt-1">
                            {currentAssignment.notes}
                          </div>
                        )}
                      </div>
                    )
                  }
                }
                return null
              })()}
            </div>
          )}

          {/* Vaste Dienst Info */}
          {(() => {
            if (typeof window !== 'undefined') {
              const vasteDienstInfo = localStorage.getItem(`vaste_dienst_info_${aflosser.id}`)
              const data = (() => {
                try { return vasteDienstInfo ? JSON.parse(vasteDienstInfo) : null } catch { return null }
              })()
              if (data && data.in_vaste_dienst) {
                return (
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-md">
                    <div className="flex items-center space-x-2 text-sm text-purple-700">
                      <CalendarDays className="w-4 h-4" />
                      <span className="font-medium">Vaste Dienst</span>
                      <span>•</span>
                      <span>15 dagen/maand</span>
                    </div>
                    {data.vaste_dienst_start_date && (
                      <div className="text-xs text-purple-600 mt-1">
                        Start: {format(new Date(data.vaste_dienst_start_date), 'dd-MM-yyyy')}
                      </div>
                    )}
                  </div>
                )
              }
            }
            return null
          })()}

          {/* Diplomas */}
          {aflosser.diplomas && aflosser.diplomas.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Diploma's:</span>
              <div className="flex flex-wrap gap-1">
                {aflosser.diplomas.map((diploma: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {diploma}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {aflosser.notes && aflosser.notes.length > 0 && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Notities:</span>
              <div className="mt-1">
                {typeof aflosser.notes[0] === 'string' ? aflosser.notes[0] : aflosser.notes[0]?.text || 'Geen notitie'}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {!isCurrentlyAbsent && !isAssignedToShip && (
              <Button
                onClick={onAssignToShip}
                size="sm"
                variant="outline"
                className="flex-1"
                title="Toewijzen aan schip"
              >
                <Ship className="w-4 h-4 mr-1" />
                Toewijzen
              </Button>
            )}
            {isAssignedToShip && (
              <Button
                onClick={() => setEndAssignmentDialog(aflosser.id)}
                size="sm"
                variant="outline"
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                title="Reis beëindigen"
              >
                <Anchor className="w-4 h-4 mr-1" />
                Reis beëindigen
              </Button>
            )}
            <Button
              onClick={onMarkAbsent}
              size="sm"
              variant="outline"
              className="flex-1"
              title="Afwezigheid registreren"
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              Afwezigheid
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <MobileHeaderNav />
        <div className="text-center">Laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aflossers Overzicht</h1>
          <p className="text-gray-600">Beheer alle aflossers in het systeem</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bemanning/aflossers/vaste-dienst">
            <Button variant="outline" className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
              <CalendarDays className="w-4 h-4 mr-2" />
              Vaste Dienst
            </Button>
          </Link>
          <Link href="/bemanning/aflossers/nieuw">
            <Button className="bg-green-600 hover:bg-green-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Nieuwe Aflosser
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Totaal Aflossers</p>
                <p className="text-2xl font-bold text-blue-600">{aflossers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Beschikbaar</p>
                <p className="text-2xl font-bold text-green-600">
                  {aflossers.filter((a: any) => a.status === "thuis" && !a.currentAbsence).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Ship className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Aan boord</p>
                <p className="text-2xl font-bold text-red-600">
                  {aflossers.filter((a: any) => a.status === "aan-boord").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Afwezig</p>
                <p className="text-2xl font-bold text-orange-600">
                  {aflossers.filter((a: any) => a.status === "afwezig").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geplande Reizen Sectie */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Geplande Reizen</h2>
          <Button 
            onClick={() => setPlannedTripsDialog(true)}
            variant="outline"
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          >
            <Ship className="w-4 h-4 mr-2" />
            Nieuwe Geplande Reis
          </Button>
        </div>
        
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Geplande Reizen */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Geplande Reizen</h3>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {plannedTrips.filter((trip: any) => trip.status === 'gepland').length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {plannedTrips.filter((trip: any) => trip.status === 'gepland').length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Ship className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Geen geplande reizen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {plannedTrips
                    .filter((trip: any) => trip.status === 'gepland')
                    .map((trip: any) => (
                      <div key={trip.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{getShipName(trip.ship_id)}</h4>
                            <p className="text-sm text-gray-600">{trip.trip_from} → {trip.trip_to}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAssignAflosserToTrip(trip.id)}
                            >
                              Aflosser Toewijzen
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                              onClick={() => handleCancelTrip(trip.id)}
                            >
                              Annuleren
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center space-x-2 mb-1">
                            <CalendarDays className="w-3 h-3" />
                            <span>
                              {format(new Date(trip.start_date), 'dd-MM-yyyy')} 
                              {trip.end_date ? ` - ${format(new Date(trip.end_date), 'dd-MM-yyyy')}` : ' - Onbekend'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3 h-3" />
                            <span>Reis: {trip.trip_name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actieve Reizen */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Ship className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">Actieve Reizen</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {plannedTrips.filter((trip: any) => trip.status === 'actief').length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {plannedTrips.filter((trip: any) => trip.status === 'actief').length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Ship className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Geen actieve reizen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {plannedTrips
                    .filter((trip: any) => trip.status === 'actief')
                    .map((trip: any) => {
                      const assignedAflosser = crew.find((c: any) => c.id === trip.aflosser_id)
                      return (
                        <div key={trip.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{trip.trip_name}</h4>
                              <p className="text-sm text-gray-600">{getShipName(trip.ship_id)}</p>
                            </div>
                            <div className="flex gap-2">
                              <Badge className="bg-green-100 text-green-800">Actief</Badge>
                              {trip.aflosser_id ? (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                  onClick={() => handleCompleteTrip(trip.id)}
                                >
                                  Afsluiten
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                  onClick={() => handleCancelTrip(trip.id)}
                                >
                                  Annuleren
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <div className="flex items-center space-x-2 mb-1">
                              <CalendarDays className="w-3 h-3" />
                              <span>
                                {format(new Date(trip.start_date), 'dd-MM-yyyy')} 
                                {trip.end_date ? ` - ${format(new Date(trip.end_date), 'dd-MM-yyyy')}` : ' - Onbekend'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-3 h-3" />
                              <span>{trip.trip_from} → {trip.trip_to}</span>
                            </div>
                          </div>
                          {assignedAflosser && (
                            <div className="flex items-center space-x-2 text-sm bg-blue-50 p-2 rounded">
                              <UserPlus className="w-3 h-3 text-blue-600" />
                              <span className="text-blue-700">
                                {assignedAflosser.first_name} {assignedAflosser.last_name}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voltooide Reizen */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/bemanning/aflossers/voltooide-reizen'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Voltooide Reizen</h3>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                    {plannedTrips.filter((trip: any) => trip.status === 'voltooid').length}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                  Bekijk alle →
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {plannedTrips.filter((trip: any) => trip.status === 'voltooid').length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Geen voltooide reizen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {plannedTrips
                    .filter((trip: any) => trip.status === 'voltooid')
                    .slice(0, 3) // Show only first 3
                    .map((trip: any) => {
                      const assignedAflosser = crew.find((c: any) => c.id === trip.aflosser_id)
                      return (
                        <div key={trip.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{getShipName(trip.ship_id)}</h4>
                              <p className="text-sm text-gray-600">{trip.trip_from} → {trip.trip_to}</p>
                            </div>
                            <Badge className="bg-gray-100 text-gray-800">Voltooid</Badge>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <div className="flex items-center space-x-2 mb-1">
                              <CalendarDays className="w-3 h-3" />
                              <span>
                                {format(new Date(trip.start_date), 'dd-MM-yyyy')} 
                                {trip.end_date ? ` - ${format(new Date(trip.end_date), 'dd-MM-yyyy')}` : ' - Onbekend'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-3 h-3" />
                              <span>Reis: {trip.trip_name}</span>
                            </div>
                          </div>
                          {assignedAflosser && (
                            <div className="flex items-center space-x-2 text-sm bg-green-50 p-2 rounded">
                              <UserPlus className="w-3 h-3 text-green-600" />
                              <span className="text-green-700">
                                {assignedAflosser.first_name} {assignedAflosser.last_name}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  {plannedTrips.filter((trip: any) => trip.status === 'voltooid').length > 3 && (
                    <div className="text-center py-2 text-gray-500 text-sm">
                      +{plannedTrips.filter((trip: any) => trip.status === 'voltooid').length - 3} meer reizen
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Aflossers Columns */}
      {aflossers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen aflossers gevonden</h3>
            <p className="text-gray-500 mb-4">Er zijn nog geen aflossers toegevoegd aan het systeem.</p>
            <Link href="/bemanning/aflossers/nieuw">
              <Button className="bg-green-600 hover:bg-green-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Eerste Aflosser Toevoegen
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Beschikbaar Kolom */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Beschikbaar</h2>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {aflossers.filter((a: any) => a.status === "thuis" && !a.currentAbsence).length}
              </Badge>
            </div>
            <div className="space-y-3">
              {aflossers
                .filter((a: any) => a.status === "thuis" && !a.currentAbsence)
                .map((aflosser: any) => (
                  <AflosserCard 
                    key={aflosser.id} 
                    aflosser={aflosser} 
                    onAssignToShip={() => setAssignDialog(aflosser.id)}
                    onMarkAbsent={() => setAbsenceDialog(aflosser.id)}
                    showPlannedAbsence={true}
                  />
                ))}
            </div>
          </div>

          {/* Aan Boord Kolom */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Ship className="w-5 h-5 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">Aan Boord</h2>
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                {aflossers.filter((a: any) => a.status === "aan-boord").length}
              </Badge>
            </div>
            <div className="space-y-3">
              {aflossers
                .filter((a: any) => a.status === "aan-boord")
                .map((aflosser: any) => (
                  <AflosserCard 
                    key={aflosser.id} 
                    aflosser={aflosser} 
                    onAssignToShip={() => setAssignDialog(aflosser.id)}
                    onMarkAbsent={() => setAbsenceDialog(aflosser.id)}
                    showPlannedAbsence={true}
                  />
                ))}
            </div>
          </div>

          {/* Afwezig Kolom */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <CalendarDays className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Afwezig</h2>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {aflossers.filter((a: any) => a.status === "afwezig").length}
              </Badge>
            </div>
            <div className="space-y-3">
              {aflossers
                .filter((a: any) => a.status === "afwezig")
                .map((aflosser: any) => (
                  <AflosserCard 
                    key={aflosser.id} 
                    aflosser={aflosser} 
                    onAssignToShip={() => setAssignDialog(aflosser.id)}
                    onMarkAbsent={() => setAbsenceDialog(aflosser.id)}
                    showPlannedAbsence={true}
                  />
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toewijzen aan Schip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ship">Schip *</Label>
              <Select value={assignData.shipId} onValueChange={(value) => setAssignData({...assignData, shipId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een schip" />
                </SelectTrigger>
                                  <SelectContent>
                    {ships.map((ship: any) => (
                      <SelectItem key={ship.id} value={ship.id}>
                        {ship.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assignmentType">Type Toewijzing *</Label>
              <Select value={assignData.assignmentType} onValueChange={(value) => setAssignData({...assignData, assignmentType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="period">Vaste Periode</SelectItem>
                  <SelectItem value="trip">Specifieke Reis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Startdatum *</Label>
              <Input
                id="startDate"
                type="date"
                value={assignData.startDate}
                onChange={(e) => setAssignData({...assignData, startDate: e.target.value})}
                required
              />
            </div>
            {assignData.assignmentType === "period" && (
              <div>
                <Label htmlFor="endDate">Einddatum (optioneel)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={assignData.endDate}
                  onChange={(e) => setAssignData({...assignData, endDate: e.target.value})}
                />
              </div>
            )}
            {assignData.assignmentType === "trip" && (
              <>
                <div>
                  <Label htmlFor="tripFrom">Reis van *</Label>
                  <Input
                    id="tripFrom"
                    value={assignData.tripFrom}
                    onChange={(e) => setAssignData({...assignData, tripFrom: e.target.value})}
                    placeholder="bijv. Amsterdam"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tripTo">Reis naar *</Label>
                  <Input
                    id="tripTo"
                    value={assignData.tripTo}
                    onChange={(e) => setAssignData({...assignData, tripTo: e.target.value})}
                    placeholder="bijv. Straatsburg"
                    required
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={assignData.notes}
                onChange={(e) => setAssignData({...assignData, notes: e.target.value})}
                placeholder="Optionele notities..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setAssignDialog(null)}>
                Annuleren
              </Button>
              <Button 
                onClick={() => assignDialog && handleAssignToShip(assignDialog)}
                disabled={!assignData.shipId || !assignData.startDate}
              >
                Toewijzen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!absenceDialog} onOpenChange={() => setAbsenceDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Afwezigheid Registreren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="absenceStartDate">Startdatum *</Label>
              <Input
                id="absenceStartDate"
                type="date"
                value={absenceData.startDate}
                onChange={(e) => setAbsenceData({...absenceData, startDate: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="absenceEndDate">Einddatum (optioneel)</Label>
              <Input
                id="absenceEndDate"
                type="date"
                value={absenceData.endDate}
                onChange={(e) => setAbsenceData({...absenceData, endDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reden</Label>
              <Textarea
                id="reason"
                value={absenceData.reason}
                onChange={(e) => setAbsenceData({...absenceData, reason: e.target.value})}
                placeholder="Reden van afwezigheid..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setAbsenceDialog(null)}>
                Annuleren
              </Button>
              <Button 
                onClick={() => absenceDialog && handleMarkAbsent(absenceDialog)}
                disabled={!absenceData.startDate}
              >
                Registreren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Assignment Dialog */}
      <Dialog open={!!endAssignmentDialog} onOpenChange={() => setEndAssignmentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reis Beëindigen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="endDate">Einddatum reis *</Label>
              <Input
                id="endDate"
                type="date"
                value={endAssignmentData.endDate}
                onChange={(e) => setEndAssignmentData({...endAssignmentData, endDate: e.target.value})}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEndAssignmentDialog(null)}>
                Annuleren
              </Button>
              <Button 
                onClick={() => endAssignmentDialog && handleEndAssignment(endAssignmentDialog)}
                disabled={!endAssignmentData.endDate}
              >
                Reis beëindigen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Planned Trips Dialog */}
      <Dialog open={plannedTripsDialog} onOpenChange={setPlannedTripsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Geplande Reis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tripName">Reisnaam *</Label>
              <Input
                id="tripName"
                value={newPlannedTrip.tripName}
                onChange={(e) => setNewPlannedTrip({...newPlannedTrip, tripName: e.target.value})}
                placeholder="Bijv. Rotterdam - Koblenz"
                required
              />
            </div>
            <div>
              <Label htmlFor="ship">Schip *</Label>
              <Select value={newPlannedTrip.shipId} onValueChange={(value) => setNewPlannedTrip({...newPlannedTrip, shipId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een schip" />
                </SelectTrigger>
                <SelectContent>
                  {ships.map((ship: any) => (
                    <SelectItem key={ship.id} value={ship.id}>
                      {ship.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Startdatum *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newPlannedTrip.startDate}
                  onChange={(e) => setNewPlannedTrip({...newPlannedTrip, startDate: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">Verwachte einddatum (optioneel)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newPlannedTrip.endDate}
                  onChange={(e) => setNewPlannedTrip({...newPlannedTrip, endDate: e.target.value})}
                  placeholder="Onbekend"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tripFrom">Reis van *</Label>
                <Input
                  id="tripFrom"
                  value={newPlannedTrip.tripFrom}
                  onChange={(e) => setNewPlannedTrip({...newPlannedTrip, tripFrom: e.target.value})}
                  placeholder="Rotterdam"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tripTo">Reis naar *</Label>
                <Input
                  id="tripTo"
                  value={newPlannedTrip.tripTo}
                  onChange={(e) => setNewPlannedTrip({...newPlannedTrip, tripTo: e.target.value})}
                  placeholder="Koblenz"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={newPlannedTrip.notes}
                onChange={(e) => setNewPlannedTrip({...newPlannedTrip, notes: e.target.value})}
                placeholder="Extra informatie over de reis..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setPlannedTripsDialog(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleCreatePlannedTrip}
                disabled={!newPlannedTrip.tripName || !newPlannedTrip.shipId || !newPlannedTrip.startDate || !newPlannedTrip.tripFrom || !newPlannedTrip.tripTo}
              >
                Reis Aanmaken
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Aflosser to Trip Dialog */}
      <Dialog open={!!assignAflosserDialog} onOpenChange={() => setAssignAflosserDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aflosser Toewijzen aan Reis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {assignAflosserDialog && (() => {
              const trip = plannedTrips.find((t: any) => t.id === assignAflosserDialog)
              const availableAflossers = aflossers.filter((a: any) => {
                // Include aflossers who are currently available
                if (a.status === "thuis" && !a.currentAbsence) {
                  return true
                }
                
                // Include aflossers who are absent but will be available during the trip
                if (a.status === "afwezig" && a.nextAbsence) {
                  const trip = plannedTrips.find((t: any) => t.id === assignAflosserDialog)
                  if (trip) {
                    const tripStartDate = new Date(trip.start_date)
                    const absenceEndDate = new Date(a.nextAbsence.end_date || a.nextAbsence.start_date)
                    
                    // If trip starts after absence ends, include this aflosser
                    if (tripStartDate > absenceEndDate) {
                      return true
                    }
                  }
                }
                
                return false
              })
              
              return (
                <>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-1">{trip?.trip_name}</h4>
                    <p className="text-sm text-blue-700">{trip ? getShipName(trip.ship_id) : ''}</p>
                    <p className="text-sm text-blue-600">
                      {trip?.start_date ? format(new Date(trip.start_date), 'dd-MM-yyyy') : ''} 
                      {trip?.end_date ? ` - ${format(new Date(trip.end_date), 'dd-MM-yyyy')}` : ' - Onbekend'}
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="aflosser">Selecteer Aflosser *</Label>
                    <Select value={selectedAflosserId} onValueChange={setSelectedAflosserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kies een beschikbare aflosser" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAflossers.map((aflosser: any) => {
                          const isCurrentlyAbsent = aflosser.status === "afwezig"
                          const willBeAvailable = isCurrentlyAbsent && aflosser.nextAbsence
                          
                          return (
                            <SelectItem key={aflosser.id} value={aflosser.id}>
                              <div className="flex items-center space-x-2">
                                <span>{aflosser.first_name} {aflosser.last_name}</span>
                                <span className="text-gray-500">({aflosser.nationality})</span>
                                {willBeAvailable && (
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                    Beschikbaar vanaf {format(new Date(aflosser.nextAbsence.end_date || aflosser.nextAbsence.start_date), 'dd-MM-yyyy')}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {availableAflossers.length === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Er zijn momenteel geen beschikbare aflossers voor deze reis. 
                        Alle aflossers zijn al toegewezen, afwezig, of nog niet beschikbaar tijdens de reisperiode.
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setAssignAflosserDialog(null)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleConfirmAssignAflosser}
                disabled={!selectedAflosserId}
              >
                Toewijzen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 