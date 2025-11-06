"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSupabaseData, calculateWorkDaysVasteDienst } from "@/hooks/use-supabase-data"
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { BackButton } from "@/components/ui/back-button"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { format } from "date-fns"
import { 
  Ship, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Clock,
  Edit3,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trash2,
  UserX,
  Plus
} from "lucide-react"
import Link from "next/link"

const DIPLOMA_OPTIONS = [
  "Vaarbewijs",
  "Rijnpatent tot Wesel",
  "Rijnpatent tot Koblenz",
  "Rijnpatent tot Mannheim",
  "Rijnpatent tot Iffezheim",
  "Elbepatent",
  "Donaupatent",
  "ADN",
  "ADN C",
  "Radar",
  "Marifoon"
]
// Helper function to calculate work days from trip data
// SIMPLE LOGIC: tel kalenderdagen van start tot eind (inclusief beide)
function calculateWorkDays(startDate: string, startTime: string, endDate: string, endTime: string): number {
  if (!startDate || !endDate) return 0

  // Parse both DD-MM-YYYY and ISO format dates
  const parseDate = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') {
      console.error('Invalid date string:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    // Check if it's already an ISO date (contains T or has 4-digit year at start)
    if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      // It's already an ISO date, use it directly
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        console.error('Invalid ISO date:', dateStr)
        return new Date() // Return current date as fallback
      }
      return date
    }
    
    // Otherwise, parse as DD-MM-YYYY format
    const parts = dateStr.split('-')
    if (parts.length !== 3) {
      console.error('Invalid date format:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    const [day, month, year] = parts
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const date = new Date(isoDate)
    
    if (isNaN(date.getTime())) {
      console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    return date
  }

  const start = parseDate(startDate)
  const end = parseDate(endDate)

  // Validatie: afstapdatum mag niet voor instapdatum liggen
  if (end < start) {
    console.error('Error: end date is before start date')
    return 0
  }

  // Simpele telling: tel kalenderdagen van start tot eind (inclusief beide)
  const timeDiff = end.getTime() - start.getTime()
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1 // +1 omdat we beide datums inclusief tellen


  return daysDiff
}

export default function AflosserDetailPage() {
  const params = useParams()
  const { crew, ships, trips, vasteDienstRecords, loading, error, updateCrew, deleteAflosser } = useSupabaseData()
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState("")
  const [isEditingTarief, setIsEditingTarief] = useState(false)
  const [editedTarief, setEditedTarief] = useState("")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingDiplomas, setIsEditingDiplomas] = useState(false)
  const [editedDiplomas, setEditedDiplomas] = useState<string[]>([])
  const [editedProfile, setEditedProfile] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    nationality: "",
    status: ""
  })
  const [mounted, setMounted] = useState(false)
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([])
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false)
  const [newUnavailable, setNewUnavailable] = useState({
    fromDate: "",
    toDate: "",
    reason: ""
  })
  const [aflosserAbsences, setAflosserAbsences] = useState<any[]>([])

  // Find the aflosser
  const aflosser = crew.find((member: any) => member.id === params.id)

  // Get vaste dienst records for this aflosser
  const aflosserVasteDienstRecords = vasteDienstRecords.filter((record: any) => record.aflosser_id === aflosser?.id)
  
  // Calculate current balance - EXACTE KOPIE VAN KAART BEREKENING
  const currentBalance = (() => {
    if (!aflosser) return 0
    
    // Bereken gewerkte dagen deze maand voor ALLE aflossers
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    
    const currentMonthTrips = trips.filter((trip: any) => {
      if (!trip.aflosser_id || trip.aflosser_id !== aflosser.id) return false
      if (trip.status !== 'voltooid') return false
      
      const tripStart = new Date(trip.start_datum)
      return tripStart.getFullYear() === currentYear && 
             tripStart.getMonth() + 1 === currentMonth
    })
    
    const gewerktDezeMaand = currentMonthTrips.reduce((total: number, trip: any) => {
      // Use vaste dienst calculation for vaste dienst aflossers
      const workDays = calculateWorkDaysVasteDienst(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
      return total + workDays
    }, 0)
    
    // Voor aflossers met startsaldo
    const startsaldoNote = aflosser.notes?.find((note: any) => 
      note.text && (note.text.includes('startsaldo') || note.text.includes('Startsaldo'))
    )
    
    if (startsaldoNote) {
      const match = startsaldoNote.text.match(/(-?\d+(?:\.\d+)?)/)
      if (match) {
        const startsaldo = parseFloat(match[1])
        const beginsaldo = -15 + startsaldo
        
        // Actuele dagen = Beginsaldo + Gewerkt deze maand
        const actueleDagen = beginsaldo + gewerktDezeMaand
        console.log(`📊 Aflosser ${aflosser.first_name}: startsaldo ${startsaldo}, beginsaldo ${beginsaldo}, gewerkt ${gewerktDezeMaand}, actueel ${actueleDagen}`)
        return actueleDagen
      }
    }
    
    // Voor bestaande aflossers zonder startsaldo: -15 + gewerkte dagen
    const actueleDagen = -15 + gewerktDezeMaand
    console.log(`📊 Bestaande aflosser ${aflosser.first_name}: gewerkt ${gewerktDezeMaand}, actueel ${actueleDagen}`)
    return actueleDagen
  })()


  // Prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load trip history from Supabase
  useEffect(() => {
    if (aflosser && aflosser.id && trips) {
      const aflosserTrips = trips.filter((trip: any) => trip.aflosser_id === aflosser.id)
      setAssignmentHistory(aflosserTrips)
    }
  }, [aflosser?.id, trips])

  // Load aflosser absences
  useEffect(() => {
    if (aflosser) {
      // Try to get from aflosser_absences field first
      if (aflosser.aflosser_absences) {
        setAflosserAbsences(Array.isArray(aflosser.aflosser_absences) ? aflosser.aflosser_absences : [])
      } else {
        // Fallback: try to get from notes field
        const absenceNotes = aflosser.notes?.filter((note: any) => {
          const noteText = typeof note === 'string' ? note : note?.content || note?.text || ''
          return noteText.includes('AFWEZIGHEID:')
        }) || []
        
        if (absenceNotes.length > 0) {
          try {
            const lastNote = absenceNotes[absenceNotes.length - 1]
            const noteText = typeof lastNote === 'string' ? lastNote : lastNote?.content || lastNote?.text || ''
            const jsonMatch = noteText.match(/AFWEZIGHEID:\s*(.+)/)
            if (jsonMatch) {
              const absences = JSON.parse(jsonMatch[1])
              setAflosserAbsences(Array.isArray(absences) ? absences : [])
              return
            }
          } catch (e) {
            console.error('Error parsing absence notes:', e)
          }
        }
        setAflosserAbsences([])
      }
    } else {
      setAflosserAbsences([])
    }
  }, [aflosser])

  // Initialize edited profile when aflosser data is available
  useEffect(() => {
    if (aflosser) {
      setEditedProfile({
        first_name: aflosser.first_name || "",
        last_name: aflosser.last_name || "",
        phone: aflosser.phone || "",
        email: aflosser.email || "",
        nationality: aflosser.nationality || "",
        status: aflosser.status || ""
      })
    }
  }, [aflosser])

  const handleSaveProfile = async () => {
    if (!aflosser) return

    try {
      await updateCrew(aflosser.id, editedProfile)
      setIsEditingProfile(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Fout bij het bijwerken van het profiel")
    }
  }

  // Helper functions for absences
  const isCurrentlyAbsent = () => {
    if (!aflosserAbsences || aflosserAbsences.length === 0) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return aflosserAbsences.some((absence: any) => {
      const fromDate = new Date(absence.fromDate)
      fromDate.setHours(0, 0, 0, 0)
      const toDate = new Date(absence.toDate)
      toDate.setHours(0, 0, 0, 0)
      return fromDate <= today && toDate >= today
    })
  }

  const handleCreateUnavailable = async () => {
    if (!aflosser || !newUnavailable.fromDate || !newUnavailable.toDate || !newUnavailable.reason) {
      alert("Vul alle velden in: startdatum, einddatum en reden")
      return
    }

    const fromDate = new Date(newUnavailable.fromDate)
    const toDate = new Date(newUnavailable.toDate)
    
    if (toDate < fromDate) {
      alert("Einddatum moet na startdatum zijn")
      return
    }

    try {
      const newAbsence = {
        id: Date.now().toString(),
        fromDate: newUnavailable.fromDate,
        toDate: newUnavailable.toDate,
        reason: newUnavailable.reason,
        createdAt: new Date().toISOString()
      }

      const updatedAbsences = [...aflosserAbsences, newAbsence]
      
      // Update using notes field if aflosser_absences doesn't exist, otherwise use aflosser_absences
      const currentNotes = aflosser.notes || []
      const absenceNotes = currentNotes.filter((note: any) => {
        const noteText = typeof note === 'string' ? note : note?.content || note?.text || ''
        return !noteText.includes('AFWEZIGHEID:')
      })
      
      // Store as JSON in notes field (temporary solution until database column is added)
      const absenceNote = {
        id: `absence-${newAbsence.id}`,
        content: `AFWEZIGHEID: ${JSON.stringify(updatedAbsences)}`,
        date: new Date().toISOString(),
        author: 'system'
      }
      
      await updateCrew(aflosser.id, {
        notes: [...absenceNotes, absenceNote]
      })

      setAflosserAbsences(updatedAbsences)
      setNewUnavailable({ fromDate: "", toDate: "", reason: "" })
      setShowUnavailableDialog(false)
      alert(`Afwezigheid succesvol toegevoegd voor ${aflosser.first_name} ${aflosser.last_name}`)
    } catch (error) {
      console.error("Error creating unavailable period:", error)
      alert("Fout bij toevoegen afwezigheid")
    }
  }

  const handleDeleteAbsence = async (absenceId: string) => {
    if (!aflosser) return
    if (!confirm("Weet je zeker dat je deze afwezigheid wilt verwijderen?")) return

    try {
      const updatedAbsences = aflosserAbsences.filter((a: any) => a.id !== absenceId)
      
      // Update using notes field if aflosser_absences doesn't exist
      const currentNotes = aflosser.notes || []
      const absenceNotes = currentNotes.filter((note: any) => {
        const noteText = typeof note === 'string' ? note : note?.content || note?.text || ''
        return !noteText.includes('AFWEZIGHEID:')
      })
      
      const absenceNote = {
        id: `absence-${Date.now()}`,
        content: `AFWEZIGHEID: ${JSON.stringify(updatedAbsences)}`,
        date: new Date().toISOString(),
        author: 'system'
      }
      
      await updateCrew(aflosser.id, {
        notes: [...absenceNotes, absenceNote]
      })
      
      setAflosserAbsences(updatedAbsences)
      alert("Afwezigheid verwijderd")
    } catch (error) {
      console.error("Error deleting absence:", error)
      alert("Fout bij verwijderen afwezigheid")
    }
  }

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Laden...</div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Fout: {error}</div>
      </div>
    )
  }

  // Early return after all hooks
  if (!aflosser) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Aflosser niet gevonden</div>
      </div>
    )
  }

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱",
      CZ: "🇨🇿",
      SLK: "🇸🇰",
      EG: "🇪🇬",
      PO: "🇵🇱",
      SERV: "🇷🇸",
      HUN: "🇭🇺",
      BE: "🇧🇪",
      FR: "🇫🇷",
      DE: "🇩🇪",
      LUX: "🇱🇺",
    }
    return flags[nationality] || "🌍"
  }

  const getShipName = (shipId: string) => {
    const ship = ships.find((s: any) => s.id === shipId)
    return ship ? ship.name : 'Onbekend schip'
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


  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <BackButton />
      <DashboardButton />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
              {aflosser.first_name[0]}{aflosser.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {aflosser.first_name} {aflosser.last_name}
            </h1>
            <p className="text-gray-600">Aflosser</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {isEditingProfile ? 'Annuleren' : 'Bewerken'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (confirm(`Weet je zeker dat je ${aflosser.first_name} ${aflosser.last_name} definitief wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt en verwijdert ook alle gerelateerde reizen en vaste dienst records.`)) {
                  try {
                    await deleteAflosser(aflosser.id)
                    alert('Aflosser succesvol verwijderd!')
                    // Redirect to aflossers overview
                    window.location.href = '/bemanning/aflossers'
                  } catch (error) {
                    console.error('Error deleting aflosser:', error)
                    alert('Fout bij verwijderen van aflosser')
                  }
                }
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Verwijderen
            </Button>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(aflosser.status)}>
            {getStatusText(aflosser.status)}
          </Badge>
          {isCurrentlyAbsent() && (
            <Badge className="bg-orange-100 text-orange-800">
              <UserX className="w-3 h-3 mr-1" />
              Momenteel afwezig
            </Badge>
          )}
        </div>
        <div className="mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowUnavailableDialog(true)}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Afwezigheid toevoegen
          </Button>
        </div>
      </div>

      {/* Vaste Dienst Tracking - Prominent Position */}
      {aflosser?.vaste_dienst && (
        <div className="mb-8">
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Calendar className="w-6 h-6" />
                <span>Vaste Dienst Tracking</span>
                <div className="ml-auto flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-normal text-green-700">Automatisch</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Balance - Prominent Display */}
                <div className="p-6 rounded-lg border-2 bg-white shadow-sm">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-3 mb-2">
                      {currentBalance > 0 ? (
                        <TrendingUp className="w-8 h-8 text-green-600" />
                      ) : currentBalance < 0 ? (
                        <TrendingDown className="w-8 h-8 text-red-600" />
                      ) : (
                        <Calendar className="w-8 h-8 text-gray-600" />
                      )}
                      <span className="text-4xl font-bold">
                        <span className={currentBalance > 0 ? 'text-green-600' : currentBalance < 0 ? 'text-red-600' : 'text-gray-600'}>
                          {currentBalance > 0 ? '+' : ''}{currentBalance}
                        </span>
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Huidig Saldo</h3>
                    <p className={`text-sm font-medium ${currentBalance > 0 ? 'text-green-600' : currentBalance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {currentBalance > 0 ? 'Voorsprong' : currentBalance < 0 ? 'Achterstand' : 'Op schema'}
                    </p>
                  </div>
                </div>

                {/* Monthly Summary */}
                <div className="p-6 rounded-lg border-2 bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Maandelijkse Overzicht</h3>
                  {aflosserVasteDienstRecords.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Nog geen records</p>
                      <p className="text-xs mt-1">Automatisch aangemaakt bij voltooide reizen</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {aflosserVasteDienstRecords
                        .sort((a: any, b: any) => b.year - a.year || b.month - a.month)
                        .slice(0, 3) // Show only last 3 months
                        .map((record: any) => {
                          // BEREKEN ALLEEN GEWERKTE DAGEN voor deze maand
                          const monthTrips = trips.filter((trip: any) => {
                            if (!trip.aflosser_id || trip.aflosser_id !== aflosser.id) return false
                            if (trip.status !== 'voltooid') return false
                            
                            const tripStart = new Date(trip.start_datum)
                            return tripStart.getFullYear() === record.year && 
                                   tripStart.getMonth() + 1 === record.month
                          })
                          
                          const gewerktDezeMaand = monthTrips.reduce((total: number, trip: any) => {
                            // Use vaste dienst calculation for vaste dienst aflossers
                            const workDays = calculateWorkDaysVasteDienst(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                            return total + workDays
                          }, 0)
                          
                          return (
                            <div key={record.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="text-sm">
                                <span className="font-medium">
                                  {new Date(record.year, record.month - 1).toLocaleString('nl-NL', { month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-gray-600 ml-2">
                                  {gewerktDezeMaand}/15 dagen
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-medium text-blue-600">
                                  {gewerktDezeMaand} dagen
                                </span>
                                <Calendar className="w-3 h-3 text-blue-600" />
                              </div>
                            </div>
                          )
                        })}
                      {aflosserVasteDienstRecords.length > 3 && (
                        <p className="text-xs text-gray-500 text-center mt-2">
                          +{aflosserVasteDienstRecords.length - 3} meer maanden
                        </p>
                      )}
                      
                      {/* Startsaldo Info onderaan */}
                      {(() => {
                        const startsaldoNote = aflosser.notes?.find((note: any) => 
                          note.text && (note.text.includes('startsaldo') || note.text.includes('Startsaldo'))
                        )
                        
                        if (startsaldoNote) {
                          const match = startsaldoNote.text.match(/(-?\d+(?:\.\d+)?)/)
                          if (match) {
                            const startsaldo = parseFloat(match[1])
                            const beginsaldo = -15 + startsaldo
                            return (
                              <div className="mt-4 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                                <div>Startsaldo: <span className="font-medium">{startsaldo > 0 ? '+' : ''}{startsaldo}</span> dagen</div>
                                <div>Beginsaldo eerste maand: <span className="font-medium">{beginsaldo}</span> dagen</div>
                              </div>
                            )
                          }
                        }
                        return null
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tarief - Prominent Position voor uitzendbureau/zelfstandige aflossers */}
      {aflosser?.position === "Aflosser" && (aflosser?.is_uitzendbureau || aflosser?.is_zelfstandig || (!aflosser?.vaste_dienst && !aflosser?.is_uitzendbureau)) && (
        <div className="mb-8">
          <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-orange-800">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-6 h-6" />
                  <span>Tarief</span>
                </div>
                {!isEditingTarief && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditedTarief(aflosser?.dag_tarief?.toString() || "")
                      setIsEditingTarief(true)
                    }}
                    className="text-orange-600 hover:bg-orange-50 border-orange-300"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    {aflosser?.dag_tarief ? 'Bewerken' : 'Toevoegen'}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingTarief ? (
                <div className="p-6 rounded-lg border-2 bg-white shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dagTarief" className="text-sm font-medium text-gray-700 mb-2 block">
                        Dagtarief (€)
                      </Label>
                      <Input
                        id="dagTarief"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedTarief}
                        onChange={(e) => setEditedTarief(e.target.value)}
                        placeholder="Bijv. 150.00"
                        className="text-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Tarief per dag in euro's
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await updateCrew(aflosser.id, {
                              dag_tarief: editedTarief ? parseFloat(editedTarief) : null
                            })
                            setIsEditingTarief(false)
                            // Reload data
                            window.location.reload()
                          } catch (error) {
                            console.error("Error updating tarief:", error)
                            alert("Fout bij bijwerken tarief")
                          }
                        }}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Opslaan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditedTarief(aflosser?.dag_tarief?.toString() || "")
                          setIsEditingTarief(false)
                        }}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Annuleren
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-lg border-2 bg-white shadow-sm text-center">
                  {aflosser?.dag_tarief ? (
                    <>
                      <div className="flex items-center justify-center space-x-3 mb-2">
                        <TrendingUp className="w-8 h-8 text-orange-600" />
                        <span className="text-4xl font-bold text-orange-600">
                          €{parseFloat(aflosser.dag_tarief).toFixed(2)}/dag
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Dagtarief voor reizen
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center space-x-3 mb-2">
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                        <span className="text-lg text-gray-500">
                          Nog geen tarief ingesteld
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Klik op "Toevoegen" om een tarief in te stellen
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Persoonlijke Informatie</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">Voornaam</Label>
                      <Input
                        id="first_name"
                        value={editedProfile.first_name}
                        onChange={(e) => setEditedProfile({...editedProfile, first_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Achternaam</Label>
                      <Input
                        id="last_name"
                        value={editedProfile.last_name}
                        onChange={(e) => setEditedProfile({...editedProfile, last_name: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefoon</Label>
                    <Input
                      id="phone"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nationality">Nationaliteit</Label>
                    <Select value={editedProfile.nationality} onValueChange={(value) => setEditedProfile({...editedProfile, nationality: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer nationaliteit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NL">🇳🇱 Nederland</SelectItem>
                        <SelectItem value="CZ">🇨🇿 Tsjechië</SelectItem>
                        <SelectItem value="SLK">🇸🇰 Slowakije</SelectItem>
                        <SelectItem value="EG">🇪🇬 Egypte</SelectItem>
                        <SelectItem value="PO">🇵🇱 Polen</SelectItem>
                        <SelectItem value="SERV">🇷🇸 Servië</SelectItem>
                        <SelectItem value="HUN">🇭🇺 Hongarije</SelectItem>
                        <SelectItem value="BE">🇧🇪 België</SelectItem>
                        <SelectItem value="FR">🇫🇷 Frankrijk</SelectItem>
                        <SelectItem value="DE">🇩🇪 Duitsland</SelectItem>
                        <SelectItem value="LUX">🇱🇺 Luxemburg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={editedProfile.status} onValueChange={(value) => setEditedProfile({...editedProfile, status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aan-boord">Aan boord</SelectItem>
                        <SelectItem value="thuis">Beschikbaar</SelectItem>
                        <SelectItem value="afwezig">Afwezig</SelectItem>
                        <SelectItem value="ziek">Ziek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveProfile} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      Opslaan
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditedProfile({
                          first_name: aflosser.first_name || "",
                          last_name: aflosser.last_name || "",
                          phone: aflosser.phone || "",
                          email: aflosser.email || "",
                          nationality: aflosser.nationality || "",
                          status: aflosser.status || ""
                        })
                        setIsEditingProfile(false)
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getNationalityFlag(aflosser.nationality)}</span>
                <span className="font-medium">{aflosser.nationality}</span>
              </div>
              
              {aflosser.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{aflosser.phone}</span>
                </div>
              )}
              
              {aflosser.email && (
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{aflosser.email}</span>
                </div>
                  )}
                </>
              )}

              {/* Diplomas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm text-gray-700">Diploma's</h4>
                  {!isEditingDiplomas && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const current = (aflosser.diplomas || []).filter((d: string) => DIPLOMA_OPTIONS.includes(d))
                        setEditedDiplomas(current)
                        setIsEditingDiplomas(true)
                      }}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Bewerken
                    </Button>
                  )}
                </div>

                {isEditingDiplomas ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {DIPLOMA_OPTIONS.map((d) => (
                        <Button
                          key={d}
                          size="sm"
                          variant={editedDiplomas.includes(d) ? 'default' : 'outline'}
                          onClick={() => {
                            setEditedDiplomas((prev) => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
                          }}
                        >
                          {d}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const toSave = editedDiplomas.filter((d) => DIPLOMA_OPTIONS.includes(d))
                            await updateCrew(aflosser.id, { diplomas: toSave })
                            setIsEditingDiplomas(false)
                          } catch (e) {
                            alert("Fout bij opslaan diploma's")
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Opslaan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingDiplomas(false)
                          setEditedDiplomas(aflosser.diplomas || [])
                        }}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {aflosser.diplomas && aflosser.diplomas.length > 0 ? (
                      aflosser.diplomas.map((diploma: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {diploma}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">Geen diploma's toegevoegd</span>
                    )}
                  </div>
                )}
              </div>


              {/* Notes */}
              {(() => {
                // Filter out startsaldo notes
                const filteredNotes = aflosser.notes?.filter((note: any) => {
                  const noteText = typeof note === 'string' ? note : note?.text || ''
                  return !noteText.toLowerCase().includes('startsaldo')
                }) || []
                
                return filteredNotes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Notities:</h4>
                    <div className="text-sm text-gray-600">
                      {filteredNotes.map((note: any, index: number) => (
                        <div key={index} className="mb-1">
                          {typeof note === 'string' ? note : note?.text || 'Geen notitie'}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Algemene Opmerkingen */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm text-gray-700">Algemene Opmerkingen:</h4>
                  {!isEditingNotes && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedNotes(aflosser.aflosser_opmerkingen || "")
                        setIsEditingNotes(true)
                      }}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Bewerken
                    </Button>
                  )}
                </div>
                
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder="Voeg algemene opmerkingen toe over deze aflosser..."
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await updateCrew(aflosser.id, {
                              aflosser_opmerkingen: editedNotes
                            })
                            setIsEditingNotes(false)
                            alert("Opmerkingen succesvol bijgewerkt!")
                          } catch (error) {
                            console.error("Error updating notes:", error)
                            alert("Fout bij het bijwerken van opmerkingen")
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Opslaan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditedNotes(aflosser.aflosser_opmerkingen || "")
                          setIsEditingNotes(false)
                        }}
                        className="text-gray-600 hover:bg-gray-50"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    {aflosser.aflosser_opmerkingen ? (
                      <p className="italic">{aflosser.aflosser_opmerkingen}</p>
                    ) : (
                      <p className="text-gray-500 italic">Geen algemene opmerkingen beschikbaar</p>
                    )}
                  </div>
                )}
              </div>

              {/* Gearchiveerde Notities */}
              {aflosser.archived_notes && aflosser.archived_notes.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Gearchiveerde Notities:</h4>
                  <div className="space-y-2">
                    {aflosser.archived_notes.map((note: any) => (
                      <div key={note.id} className="bg-gray-50 p-3 rounded border-l-4 border-gray-300">
                        <div className="text-sm text-gray-600 mb-1">{note.content}</div>
                        <div className="text-xs text-gray-500">
                          Toegevoegd: {format(new Date(note.createdAt), 'dd-MM-yyyy HH:mm')}
                          {note.archivedAt && (
                            <span className="ml-2">
                              • Gearchiveerd: {format(new Date(note.archivedAt), 'dd-MM-yyyy HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Statistieken</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Totaal reizen:</span>
                <span className="font-medium">{assignmentHistory.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Voltooide reizen:</span>
                <span className="font-medium">
                  {assignmentHistory.filter((trip: any) => trip.status === 'voltooid').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Actieve reizen:</span>
                <span className="font-medium">
                  {assignmentHistory.filter((trip: any) => trip.status === 'actief').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Geplande reizen:</span>
                <span className="font-medium">
                  {assignmentHistory.filter((trip: any) => trip.status === 'gepland' || trip.status === 'ingedeeld').length}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm text-gray-600">Totaal werkdagen:</span>
                <span className="font-medium text-blue-600">
                  {(() => {
                    // Calculate total work days from all completed trips
                    // Use different calculation based on aflosser type
                    const completedTrips = assignmentHistory.filter((trip: any) => 
                      trip.status === 'voltooid' && 
                      trip.start_datum && 
                      trip.eind_datum && 
                      trip.start_tijd && 
                      trip.eind_tijd
                    )
                    
                    let totalWorkDays = 0
                    
                    completedTrips.forEach((trip: any) => {
                      // For vaste dienst aflossers, use hour-based calculation
                      // For zelfstandige and uitzendbureau aflossers, use calendar days
                      let workDays
                      if (aflosser.vaste_dienst) {
                        workDays = calculateWorkDaysVasteDienst(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                      } else {
                        // Zelfstandige and uitzendbureau aflossers use calendar days
                        workDays = calculateWorkDays(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                      }
                      totalWorkDays += workDays
                    })
                    
                    return totalWorkDays === Math.floor(totalWorkDays) 
                      ? `${totalWorkDays} dag${totalWorkDays !== 1 ? 'en' : ''}`
                      : `${totalWorkDays} dag${totalWorkDays !== 1 ? 'en' : ''}`
                  })()}
                </span>
              </div>
              
            </CardContent>
          </Card>
        </div>

        {/* Ship History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Ship className="w-5 h-5" />
                <span>Reis Geschiedenis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignmentHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Ship className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nog geen reizen toegewezen</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignmentHistory
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((trip: any, index: number) => {
                      const ship = ships.find((s: any) => s.id === trip.ship_id)
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'gepland': return 'bg-orange-100 text-orange-800'
                          case 'ingedeeld': return 'bg-blue-100 text-blue-800'
                          case 'actief': return 'bg-green-100 text-green-800'
                          case 'voltooid': return 'bg-gray-100 text-gray-800'
                          default: return 'bg-gray-100 text-gray-800'
                        }
                      }
                      const getStatusText = (status: string) => {
                        switch (status) {
                          case 'gepland': return 'Gepland'
                          case 'ingedeeld': return 'Ingedeeld'
                          case 'actief': return 'Actief'
                          case 'voltooid': return 'Voltooid'
                          default: return status
                        }
                      }
                      
                      return (
                        <div key={trip.id || index} className="border rounded-lg p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Ship className="w-5 h-5 text-blue-600" />
                                <span className="font-medium">
                                  {ship ? ship.name : 'Onbekend schip'}
                                </span>
                              </div>
                              <Badge className={getStatusColor(trip.status)}>
                                {getStatusText(trip.status)}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center space-x-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span>
                                  {trip.start_datum ? (() => {
                                    const parseDate = (dateStr: string): Date => {
                                      if (!dateStr || typeof dateStr !== 'string') {
                                        console.error('Invalid date string:', dateStr)
                                        return new Date()
                                      }
                                      
                                      // Check if it's already an ISO date (contains T or has 4-digit year at start)
                                      if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                                        // It's already an ISO date, use it directly
                                        const date = new Date(dateStr)
                                        if (isNaN(date.getTime())) {
                                          console.error('Invalid ISO date:', dateStr)
                                          return new Date()
                                        }
                                        return date
                                      }
                                      
                                      // Otherwise, parse as DD-MM-YYYY format
                                      const parts = dateStr.split('-')
                                      if (parts.length !== 3) {
                                        console.error('Invalid date format:', dateStr)
                                        return new Date()
                                      }
                                      
                                      const [day, month, year] = parts
                                      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                                      const date = new Date(isoDate)
                                      
                                      if (isNaN(date.getTime())) {
                                        console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
                                        return new Date()
                                      }
                                      
                                      return date
                                    }
                                    return format(parseDate(trip.start_datum), 'dd-MM-yyyy')
                                  })() : 'Geen datum'}
                                  {trip.eind_datum && (
                                    <> - {(() => {
                                      const parseDate = (dateStr: string): Date => {
                                        if (!dateStr || typeof dateStr !== 'string') {
                                          console.error('Invalid date string:', dateStr)
                                          return new Date()
                                        }
                                        
                                        // Check if it's already an ISO date (contains T or has 4-digit year at start)
                                        if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                                          // It's already an ISO date, use it directly
                                          const date = new Date(dateStr)
                                          if (isNaN(date.getTime())) {
                                            console.error('Invalid ISO date:', dateStr)
                                            return new Date()
                                          }
                                          return date
                                        }
                                        
                                        // Otherwise, parse as DD-MM-YYYY format
                                        const parts = dateStr.split('-')
                                        if (parts.length !== 3) {
                                          console.error('Invalid date format:', dateStr)
                                          return new Date()
                                        }
                                        
                                        const [day, month, year] = parts
                                        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                                        const date = new Date(isoDate)
                                        
                                        if (isNaN(date.getTime())) {
                                          console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
                                          return new Date()
                                        }
                                        
                                        return date
                                      }
                                      return format(parseDate(trip.eind_datum), 'dd-MM-yyyy')
                                    })()}</>
                                  )}
                                </span>
                              </div>
                              
                                <div className="flex items-center space-x-2 text-sm">
                                  <MapPin className="w-4 h-4 text-gray-500" />
                                <span>{trip.trip_from} → {trip.trip_to}</span>
                              </div>
                            </div>

                            <div className="text-sm text-gray-600">
                              <strong>Reis:</strong> {trip.trip_name}
                            </div>

                            {/* Actual boarding/leaving times for completed trips */}
                            {trip.status === 'voltooid' && (trip.start_datum || trip.eind_datum) && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Werkelijke tijden</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  {trip.start_datum && (
                                    <div className="flex items-center space-x-2">
                                      <span className="text-gray-600">Aan boord:</span>
                                      <span className="font-medium">
                                        {(() => {
                                          const parseDate = (dateStr: string): Date => {
                                            if (!dateStr || typeof dateStr !== 'string') {
                                              console.error('Invalid date string:', dateStr)
                                              return new Date()
                                            }
                                            
                                            // Check if it's already an ISO date (contains T or has 4-digit year at start)
                                            if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                                              // It's already an ISO date, use it directly
                                              const date = new Date(dateStr)
                                              if (isNaN(date.getTime())) {
                                                console.error('Invalid ISO date:', dateStr)
                                                return new Date()
                                              }
                                              return date
                                            }
                                            
                                            // Otherwise, parse as DD-MM-YYYY format
                                            const parts = dateStr.split('-')
                                            if (parts.length !== 3) {
                                              console.error('Invalid date format:', dateStr)
                                              return new Date()
                                            }
                                            
                                            const [day, month, year] = parts
                                            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                                            const date = new Date(isoDate)
                                            
                                            if (isNaN(date.getTime())) {
                                              console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
                                              return new Date()
                                            }
                                            
                                            return date
                                          }
                                          return format(parseDate(trip.start_datum), 'dd-MM-yyyy')
                                        })()} {trip.start_tijd || ''}
                                      </span>
                                    </div>
                                  )}
                                  {trip.eind_datum && (
                                    <div className="flex items-center space-x-2">
                                      <span className="text-gray-600">Afgestapt:</span>
                                      <span className="font-medium">
                                        {(() => {
                                          const parseDate = (dateStr: string): Date => {
                                            if (!dateStr || typeof dateStr !== 'string') {
                                              console.error('Invalid date string:', dateStr)
                                              return new Date()
                                            }
                                            
                                            // Check if it's already an ISO date (contains T or has 4-digit year at start)
                                            if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                                              // It's already an ISO date, use it directly
                                              const date = new Date(dateStr)
                                              if (isNaN(date.getTime())) {
                                                console.error('Invalid ISO date:', dateStr)
                                                return new Date()
                                              }
                                              return date
                                            }
                                            
                                            // Otherwise, parse as DD-MM-YYYY format
                                            const parts = dateStr.split('-')
                                            if (parts.length !== 3) {
                                              console.error('Invalid date format:', dateStr)
                                              return new Date()
                                            }
                                            
                                            const [day, month, year] = parts
                                            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                                            const date = new Date(isoDate)
                                            
                                            if (isNaN(date.getTime())) {
                                              console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
                                              return new Date()
                                            }
                                            
                                            return date
                                          }
                                          return format(parseDate(trip.eind_datum), 'dd-MM-yyyy')
                                        })()} {trip.eind_tijd || ''}
                                      </span>
                                </div>
                              )}
                            </div>

                                {/* Werkdagen berekening */}
                                {trip.start_datum && trip.eind_datum && trip.start_tijd && trip.eind_tijd && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Werkdagen:</span>
                                      <span className="font-medium text-blue-600">
                                        {(() => {
                                          // Use different calculation based on whether aflosser is in vaste dienst
                                          let workDays
                                          if (aflosser.vaste_dienst) {
                                            // For vaste dienst aflossers, use hour-based calculation
                                            workDays = calculateWorkDaysVasteDienst(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                                          } else {
                                            // For other aflossers, use simple day calculation
                                            workDays = calculateWorkDays(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                                          }
                                          return workDays === Math.floor(workDays) 
                                            ? `${workDays} dag${workDays !== 1 ? 'en' : ''}`
                                            : `${workDays} dag${workDays !== 1 ? 'en' : ''}`
                                        })()}
                                      </span>
                              </div>
                                    
                              </div>
                            )}
                          </div>
                            )}

                            {/* Aflosser opmerkingen for completed trips */}
                            {trip.status === 'voltooid' && trip.aflosser_opmerkingen && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <h5 className="text-sm font-medium text-blue-700 mb-1">Opmerkingen over aflosser</h5>
                                <p className="text-sm text-blue-600 italic">{trip.aflosser_opmerkingen}</p>
                            </div>
                            )}
                            
                            {trip.notes && (
                              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                <strong>Notitie:</strong> {trip.notes}
                              </div>
                            )}
                          </div>
                      </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Afwezigheid Sectie */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserX className="w-5 h-5" />
              <span>Afwezigheden ({aflosserAbsences.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aflosserAbsences.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserX className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Geen afwezigheden geregistreerd</p>
              </div>
            ) : (
              <div className="space-y-4">
                {aflosserAbsences
                  .sort((a: any, b: any) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
                  .map((absence: any) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const fromDate = new Date(absence.fromDate)
                    fromDate.setHours(0, 0, 0, 0)
                    const toDate = new Date(absence.toDate)
                    toDate.setHours(0, 0, 0, 0)
                    
                    const isPast = toDate < today
                    const isCurrent = fromDate <= today && toDate >= today
                    const isFuture = fromDate > today
                    
                    return (
                      <div 
                        key={absence.id} 
                        className={`border rounded-lg p-4 ${
                          isCurrent ? "border-orange-200 bg-orange-50" : 
                          isFuture ? "border-blue-200 bg-blue-50" : 
                          "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">
                                {format(new Date(absence.fromDate), 'dd-MM-yyyy')} - {format(new Date(absence.toDate), 'dd-MM-yyyy')}
                              </span>
                              <Badge variant={
                                isPast ? "secondary" : 
                                isCurrent ? "default" : 
                                "outline"
                              }>
                                {isPast ? "Verlopen" : 
                                 isCurrent ? "Huidig" : 
                                 "Toekomstig"}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>Reden:</strong> {absence.reason}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAbsence(absence.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Afwezigheid Dialog */}
      <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Afwezigheid instellen: {aflosser?.first_name} {aflosser?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Afwezig van</Label>
              <Input
                type="date"
                value={newUnavailable.fromDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, fromDate: e.target.value})}
              />
            </div>
            <div>
              <Label>Afwezig tot</Label>
              <Input
                type="date"
                value={newUnavailable.toDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, toDate: e.target.value})}
              />
            </div>
            <div>
              <Label>Reden</Label>
              <Input
                placeholder="bijv. vakantie, ziekte, privé"
                value={newUnavailable.reason}
                onChange={(e) => setNewUnavailable({...newUnavailable, reason: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateUnavailable} className="flex-1">
                Instellen
              </Button>
              <Button variant="outline" onClick={() => setShowUnavailableDialog(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 