"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  MapPin,
  Users,
  ArrowLeft,
  Plus,
  Clock,
  UserCheck,
  UserX,
  MessageSquare,
  Award,
  Edit,
  X
} from 'lucide-react'
import { useSupabaseData, calculateWorkDaysVasteDienst } from '@/hooks/use-supabase-data'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ReizenAflossersPage() {
  const { crew, ships, trips, vasteDienstRecords, loading, updateCrew, addTrip, updateTrip, deleteTrip, addVasteDienstRecord } = useSupabaseData()
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('reizen')
  const DIPLOMA_OPTIONS = [
    "Vaarbewijs",
    "Rijnpatent tot Wesel",
    "Rijnpatent Ruhrort",
    "Rijnpatent Duisburg",
    "Rijnpatent Düsseldorf",
    "Rijnpatent Keulen",
    "Rijnpatent Koblenz",
    "Rijnpatent Bovenrijn",
    "Radarpatent",
    "Marifoon",
    "ADN Basis",
    "ADN Tankvaart",
    "Basisveiligheid",
    "EHBO/BHV",
    "VCA",
  ]
  
  // Dialogs
  const [newTripDialog, setNewTripDialog] = useState(false)
  const [assignAflosserDialog, setAssignAflosserDialog] = useState<string | null>(null)
  const [boardShipDialog, setBoardShipDialog] = useState<string | null>(null)
  const [completeTripDialog, setCompleteTripDialog] = useState<string | null>(null)
  const [editTripDialog, setEditTripDialog] = useState<string | null>(null)
  const [editDiplomasDialog, setEditDiplomasDialog] = useState<{ id: string; name: string } | null>(null)
  
  // Form states
  const [selectedAflosserId, setSelectedAflosserId] = useState("")
  const [newTripData, setNewTripData] = useState({
    ship_id: "",
    start_date: "",
    end_date: "",
    trip_from: "",
    trip_to: "",
    notes: ""
  })

  const [boardData, setBoardData] = useState({
    start_datum: "",
    start_tijd: ""
  })

  const [editTripData, setEditTripData] = useState({
    trip_from: "",
    trip_to: "",
    aflosser_id: "none"
  })
  const [editDiplomas, setEditDiplomas] = useState<string[]>([])
  
  const [completeData, setCompleteData] = useState({
    eind_datum: "",
    eind_tijd: "",
    aflosser_opmerkingen: ""
  })

  // Helper functions
  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      'NL': '🇳🇱', 'DE': '🇩🇪', 'PL': '🇵🇱', 'RO': '🇷🇴', 'BG': '🇧🇬',
      'CZ': '🇨🇿', 'SLK': '🇸🇰', 'EG': '🇪🇬', 'SERV': '🇷🇸',
      'HUN': '🇭🇺', 'FR': '🇫🇷', 'LUX': '🇱🇺', 'PO': '🇵🇱'
    }
    return flags[nationality] || '🏳️'
  }

  const getVasteDienstBalance = (aflosserId: string) => {
    const aflosser = crew.find((c: any) => c.id === aflosserId)
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
  }

  const getShipName = (shipId: string) => {
    const ship = ships.find((s: any) => s.id === shipId)
    return ship ? ship.name : 'Onbekend schip'
  }

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

  // Filter aflossers (exclude "uit-dienst")
  const aflossers = crew.filter((member: any) => 
    member.position === "Aflosser" && member.status !== "uit-dienst"
  )

  // Filter trips by status
  const geplandeTrips = trips.filter((trip: any) => trip.status === 'gepland')
  const ingedeeldeTrips = trips.filter((trip: any) => trip.status === 'ingedeeld')
  const actieveTrips = trips.filter((trip: any) => trip.status === 'actief')
  const voltooideTrips = trips.filter((trip: any) => trip.status === 'voltooid')

  // Create new trip
  const handleCreateTrip = async () => {
    if (!newTripData.ship_id || !newTripData.start_date || !newTripData.trip_from || !newTripData.trip_to) {
      alert("Vul alle verplichte velden in")
      return
    }

    try {
      const newTrip = {
        trip_name: `${newTripData.trip_from} → ${newTripData.trip_to}`, // Auto-generate trip name
        ship_id: newTripData.ship_id,
        start_date: newTripData.start_date,
        end_date: newTripData.end_date || null,
        trip_from: newTripData.trip_from,
        trip_to: newTripData.trip_to,
        notes: newTripData.notes || null,
        status: 'gepland' as const
      }

      await addTrip(newTrip)
      // Trip created - no alert needed
      
      // Reset form
      setNewTripData({
        ship_id: "",
        start_date: "",
        end_date: "",
        trip_from: "",
        trip_to: "",
        notes: ""
      })
      setNewTripDialog(false)
    } catch (error) {
      console.error("Error creating trip:", error)
      alert("Fout bij aanmaken reis")
    }
  }

  // Assign aflosser to trip (gepland → ingedeeld)
  const handleAssignAflosser = async () => {
    if (!assignAflosserDialog || !selectedAflosserId) return

    try {
      await updateTrip(assignAflosserDialog, {
        status: 'ingedeeld',
        aflosser_id: selectedAflosserId
      })

    setAssignAflosserDialog(null)
    setSelectedAflosserId("")
      // Aflosser assigned - no alert needed
    } catch (error) {
      console.error("Error assigning aflosser:", error)
      alert("Fout bij toewijzen aflosser")
    }
  }

  // Board ship (ingedeeld → actief)
  const handleBoardShip = async () => {
    if (!boardShipDialog) return

    try {
      const trip = trips.find((t: any) => t.id === boardShipDialog)
      if (!trip) return

      // Update trip status to 'actief' with boarding time
      await updateTrip(boardShipDialog, {
        status: 'actief',
        start_datum: boardData.start_datum,
        start_tijd: boardData.start_tijd
      })

      // Update aflosser status to 'aan-boord'
      if (trip.aflosser_id) {
    await updateCrew(trip.aflosser_id, {
          status: "aan-boord",
          ship_id: trip.ship_id
        })
      }

      setBoardShipDialog(null)
      setBoardData({ start_datum: "", start_tijd: "" })
      // Aflosser on board - no alert needed
      
    } catch (error) {
      console.error("Error boarding ship:", error)
      alert("Fout bij aan boord melden")
    }
  }

  // Complete trip (actief → voltooid)
  const handleCompleteTrip = async () => {
    if (!completeTripDialog) return

    try {
      const trip = trips.find((t: any) => t.id === completeTripDialog)
      if (!trip) return

      // Update trip status to 'voltooid' with completion time and notes
      await updateTrip(completeTripDialog, {
        status: 'voltooid',
        eind_datum: completeData.eind_datum,
        eind_tijd: completeData.eind_tijd,
        aflosser_opmerkingen: completeData.aflosser_opmerkingen || null
      })

      // Update aflosser status back to 'thuis'
      if (trip.aflosser_id) {
    await updateCrew(trip.aflosser_id, {
      status: "thuis",
          ship_id: null
        })
      }

      setCompleteTripDialog(null)
      setCompleteData({ eind_datum: "", eind_tijd: "", aflosser_opmerkingen: "" })
      // Trip completed - no alert needed
      
    } catch (error) {
      console.error("Error completing trip:", error)
      alert("Fout bij afsluiten reis")
    }
  }

  // Cancel trip
  const handleCancelTrip = async (tripId: string) => {
    if (!confirm("Weet je zeker dat je deze reis wilt annuleren?")) return

    try {
      await deleteTrip(tripId)
    alert("Reis geannuleerd!")
    } catch (error) {
      console.error("Error canceling trip:", error)
      alert("Fout bij annuleren reis")
    }
  }

  // Edit trip (voor ingedeelde trips)
  const handleEditTrip = async () => {
    if (!editTripDialog) return

    try {
      await updateTrip(editTripDialog, {
        trip_from: editTripData.trip_from,
        trip_to: editTripData.trip_to,
        aflosser_id: editTripData.aflosser_id === "none" ? null : editTripData.aflosser_id,
        trip_name: `${editTripData.trip_from} → ${editTripData.trip_to}` // Update trip name
      })

      setEditTripDialog(null)
      setEditTripData({ trip_from: "", trip_to: "", aflosser_id: "none" })
      alert("Reis bijgewerkt!")
    } catch (error) {
      console.error("Error editing trip:", error)
      alert("Fout bij bewerken reis")
    }
  }

  // Cancel assigned trip (voor ingedeelde trips)
  const handleCancelAssignedTrip = async (tripId: string) => {
    if (!confirm("Weet je zeker dat je deze reis wilt annuleren? De aflosser wordt verwijderd en de reis gaat terug naar 'gepland'.")) return

    try {
      await updateTrip(tripId, {
        status: 'gepland',
        aflosser_id: null
      })
      alert("Reis geannuleerd en terug naar gepland!")
    } catch (error) {
      console.error("Error canceling assigned trip:", error)
      alert("Fout bij annuleren reis")
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <MobileHeaderNav />
        <div className="text-center">{t('loading')}...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <MobileHeaderNav />
      <DashboardButton />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{t('tripsAndReliefCrewManagement')}</h1>
          <div className="flex flex-col items-center gap-1">
            <a 
              href="https://fleet.tresco.eu/map" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cursor-pointer hover:opacity-80 transition-opacity border-2 border-gray-300 rounded-lg p-2 hover:border-blue-500 hover:bg-blue-50"
              title="Bekijk live scheeps locaties op Tresco Fleet"
            >
              <svg 
                width="48" 
                height="64" 
                viewBox="0 0 48 64" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Schaduw onder de pin - elliptisch */}
                <ellipse cx="24" cy="60" rx="10" ry="3" fill="#D1D5DB" opacity="0.5"/>
                
                {/* Locatiepin - hoofdvorm */}
                <path 
                  d="M24 4C16.268 4 10 10.268 10 18C10 24 24 46 24 46C24 46 38 24 38 18C38 10.268 31.732 4 24 4Z" 
                  fill="#DC2626"
                />
                
                {/* Schaduw op pin (donkerder rechts en onder) */}
                <path 
                  d="M24 4C16.268 4 10 10.268 10 18C10 22.5 17 38 24 46C31 38 38 22.5 38 18C38 10.268 31.732 4 24 4Z" 
                  fill="#991B1B"
                  opacity="0.4"
                />
                
                {/* Witte cirkel voor kompas */}
                <circle cx="24" cy="20" r="12" fill="white"/>
                
                {/* Kompasroos - 8 punten */}
                <g stroke="#6B7280" strokeWidth="1.2" fill="none" opacity="0.8">
                  {/* Hoofdrichtingen (N, S, E, W) */}
                  <line x1="24" y1="8" x2="24" y2="12"/>
                  <line x1="24" y1="28" x2="24" y2="32"/>
                  <line x1="12" y1="20" x2="16" y2="20"/>
                  <line x1="32" y1="20" x2="36" y2="20"/>
                  {/* Tussenrichtingen */}
                  <line x1="16.83" y1="15.17" x2="18.71" y2="17.05"/>
                  <line x1="31.17" y1="15.17" x2="29.29" y2="17.05"/>
                  <line x1="16.83" y1="24.83" x2="18.71" y2="22.95"/>
                  <line x1="31.17" y1="24.83" x2="29.29" y2="22.95"/>
                </g>
                
                {/* Kompasnaald - rood deel (wijst rechtsonder) */}
                <path 
                  d="M24 12L18 20L24 28L30 20Z" 
                  fill="#DC2626"
                />
                {/* Kompasnaald - blauw deel (wijst linksboven) */}
                <path 
                  d="M24 12L30 20L24 28L18 20Z" 
                  fill="#2563EB"
                />
                
                {/* Draaipunt van kompasnaald */}
                <circle cx="24" cy="20" r="2.5" fill="#374151"/>
                
                {/* Subtiele highlight op pin */}
                <ellipse cx="20" cy="14" rx="4" ry="6" fill="white" opacity="0.2"/>
              </svg>
            </a>
            <span className="text-xs text-gray-600 font-medium">Live locatie</span>
          </div>
        </div>
        <p className="text-gray-600">{t('fourStepWorkflow')}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="reizen" className="text-base">
            <Ship className="w-4 h-4 mr-2" />
            {t('trips')}
          </TabsTrigger>
          <TabsTrigger value="aflossers" className="text-base">
            <Users className="w-4 h-4 mr-2" />
            {t('reliefCrew')}
          </TabsTrigger>
        </TabsList>

        {/* Reizen Tab */}
        <TabsContent value="reizen" className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CalendarDays className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Geplande Reizen</p>
                    <p className="text-2xl font-bold text-orange-600">{geplandeTrips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ingedeelde Reizen</p>
                    <p className="text-2xl font-bold text-blue-600">{ingedeeldeTrips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Actieve Reizen</p>
                    <p className="text-2xl font-bold text-green-600">{actieveTrips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Voltooide Reizen</p>
                    <p className="text-2xl font-bold text-gray-600">{voltooideTrips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Button onClick={() => setNewTripDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Reis
            </Button>
              <Link href="/bemanning/aflossers/voltooide-reizen">
                <Button variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                Voltooide Reizen ({voltooideTrips.length})
                </Button>
              </Link>
          </div>

          {/* Trips Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Geplande Reizen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CalendarDays className="w-5 h-5 text-orange-600" />
                  </div>
                  <span>Geplande Reizen ({geplandeTrips.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {geplandeTrips.map((trip: any) => (
                  <div key={trip.id} className="border rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{getShipName(trip.ship_id)}</h4>
                        <Badge className={getStatusColor(trip.status)}>
                          {getStatusText(trip.status)}
                        </Badge>
                  </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                              <span>{trip.trip_from} → {trip.trip_to}</span>
                            </div>
                        <div className="flex items-center space-x-2">
                          <CalendarDays className="w-4 h-4" />
                          <span>{format(new Date(trip.start_date), 'dd-MM-yyyy')}</span>
                          </div>
                      </div>
                      
                      <div className="flex space-x-2">
                            <Button 
                              size="sm"
                              onClick={() => setAssignAflosserDialog(trip.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                            >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Toewijzen
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelTrip(trip.id)}
                            >
                          <UserX className="w-4 h-4 mr-1" />
                              Annuleren
                            </Button>
                          </div>
                  </div>
                  </div>
                ))}
                        </CardContent>
                      </Card>

            {/* Ingedeelde Reizen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <span>Ingedeelde Reizen ({ingedeeldeTrips.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ingedeeldeTrips.map((trip: any) => {
                  const assignedAflosser = crew.find((c: any) => c.id === trip.aflosser_id)
                      return (
                    <div key={trip.id} className="border rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{getShipName(trip.ship_id)}</h4>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEditTripDialog(trip.id)
                                setEditTripData({
                                  trip_from: trip.trip_from,
                                  trip_to: trip.trip_to,
                                  aflosser_id: trip.aflosser_id || "none"
                                })
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Reis bewerken"
                            >
                              <Edit className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                            </button>
                          
                            <Badge className={getStatusColor(trip.status)}>
                              {getStatusText(trip.status)}
                            </Badge>
                          </div>
                              </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                                <span>{trip.trip_from} → {trip.trip_to}</span>
                              </div>
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="w-4 h-4" />
                            <span>{format(new Date(trip.start_date), 'dd-MM-yyyy')}</span>
                          </div>
                          {assignedAflosser && (
                            <div className="flex items-center space-x-2">
                              <UserPlus className="w-4 h-4" />
                              <span>{assignedAflosser.first_name} {assignedAflosser.last_name}</span>
                  </div>
                )}
                            </div>
                        
                            <div className="flex space-x-2">
                              <Button 
                                size="sm"
                                onClick={() => setBoardShipDialog(trip.id)}
                                className="bg-blue-600 hover:bg-blue-700 flex-1"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Aan Boord
                              </Button>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelAssignedTrip(trip.id)}
                                className="flex-1"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Annuleren
                              </Button>
                            </div>
                      </div>
                    </div>
                      )
                    })}
              </CardContent>
            </Card>

            {/* Actieve Reizen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span>Actieve Reizen ({actieveTrips.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {actieveTrips.map((trip: any) => {
                  const assignedAflosser = crew.find((c: any) => c.id === trip.aflosser_id)
                      return (
                    <div key={trip.id} className="border rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{getShipName(trip.ship_id)}</h4>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEditTripDialog(trip.id)
                                setEditTripData({
                                  trip_from: trip.trip_from,
                                  trip_to: trip.trip_to,
                                  aflosser_id: trip.aflosser_id || "none"
                                })
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Reis bewerken"
                            >
                              <Edit className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                            </button>
                          
                            <Badge className={getStatusColor(trip.status)}>
                              {getStatusText(trip.status)}
                            </Badge>
                          </div>
                              </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{trip.trip_from} → {trip.trip_to}</span>
                            </div>
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="w-4 h-4" />
                            <span>{format(new Date(trip.start_date), 'dd-MM-yyyy')}</span>
                              </div>
                          {assignedAflosser && (
                            <div className="flex items-center space-x-2">
                              <UserPlus className="w-4 h-4" />
                              <span>{assignedAflosser.first_name} {assignedAflosser.last_name}</span>
                              </div>
                          )}
                          {trip.start_datum && (
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>Aan boord: {format(new Date(trip.start_datum), 'dd-MM-yyyy')} {trip.start_tijd}</span>
                                </div>
                              )}
                            </div>

                            <Button 
                              size="sm"
                          onClick={() => setCompleteTripDialog(trip.id)}
                          className="bg-gray-600 hover:bg-gray-700"
                            >
                          <Clock className="w-4 h-4 mr-1" />
                              Reis Afsluiten
                            </Button>
            </div>
          </div>
                      )
                    })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aflossers Tab */}
        <TabsContent value="aflossers" className="space-y-6">
          {/* Aflossers Header */}
          <div className="flex items-center justify-between">
                  <div>
              <h2 className="text-2xl font-bold text-gray-900">Aflossers</h2>
              <p className="text-gray-600">Beheer alle aflossers en hun status</p>
                  </div>
            <Link href="/bemanning/aflossers/nieuw">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Nieuwe Aflosser
              </Button>
            </Link>
                </div>

          {/* Categorized Aflossers */}
          <div className="space-y-8">
            {/* Vaste Dienst Aflossers */}
            {aflossers.filter((a: any) => a.vaste_dienst).length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                  <UserCheck className="w-5 h-5 mr-2" />
                  Aflossers in Vaste Dienst ({aflossers.filter((a: any) => a.vaste_dienst).length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {aflossers.filter((a: any) => a.vaste_dienst).map((aflosser: any) => {
                    const vasteDienstBalance = getVasteDienstBalance(aflosser.id)
                    return (
                      <Card key={aflosser.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                                <Avatar className="h-12 w-12">
                                  <AvatarFallback className="bg-blue-100 text-blue-600">
                                    {aflosser.first_name?.[0] || '?'}{aflosser.last_name?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                  <div>
                                  <Link href={`/bemanning/aflossers/${aflosser.id}`}>
                                    <h3 className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                                      {aflosser.first_name} {aflosser.last_name}
                                    </h3>
                                  </Link>
                                  <p className="text-sm text-gray-600">{aflosser.nationality} {getNationalityFlag(aflosser.nationality)}</p>
                  </div>
                </div>
                              <Badge className={
                                aflosser.status === 'thuis' ? 'bg-green-100 text-green-800' :
                                aflosser.status === 'aan-boord' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {aflosser.status === 'thuis' ? 'Thuis' :
                                 aflosser.status === 'aan-boord' ? 'Aan Boord' :
                                 aflosser.status}
                              </Badge>
                            </div>

                            {/* Diploma's */}
                            {aflosser.diplomas && aflosser.diplomas.length > 0 && (
                              <div className="bg-green-50 p-3 rounded-lg">
                                <div className="flex items-start space-x-2">
                                  <Award className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                                    <p className="text-sm font-medium text-green-800 mb-1">Diploma's</p>
                                    <div className="flex flex-wrap gap-1">
                                      {aflosser.diplomas.map((diploma: string, index: number) => (
                                        <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                          {diploma}
                                        </Badge>
                                      ))}
                  </div>
                </div>
                  </div>
                </div>
                            )}

                            {/* Contact Info */}
                            <div className="space-y-2">
                              {aflosser.phone && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <Phone className="w-4 h-4" />
                                  <span>{aflosser.phone}</span>
                                </div>
                              )}
                              {aflosser.email && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <MessageSquare className="w-4 h-4" />
                                  <span>{aflosser.email}</span>
                                </div>
                              )}
          </div>

                            {/* Dagtarief (voor uitzendbureau, zelfstandige en bestaande aflossers met tarief, maar niet voor vaste-dienst) */}
                            {!aflosser.vaste_dienst && aflosser.dag_tarief && (
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-orange-800">
                                    Tarief
                                  </span>
                                  <span className="text-sm font-bold text-orange-600">
                                    €{parseFloat(aflosser.dag_tarief).toFixed(2)}/dag
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Vaste Dienst Saldo */}
                            {aflosser.vaste_dienst && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-blue-800">Vaste Dienst Saldo</span>
                                  <span className={`text-sm font-bold ${
                                    vasteDienstBalance > 0 ? 'text-green-600' :
                                    vasteDienstBalance < 0 ? 'text-red-600' :
                                    'text-gray-600'
                                  }`}>
                                    {vasteDienstBalance > 0 ? '+' : ''}{vasteDienstBalance} dagen
                                  </span>
            </div>
          </div>
                            )}

                            {/* Algemene Opmerkingen */}
                            {aflosser.aflosser_opmerkingen && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start space-x-2">
                                  <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Opmerkingen</p>
                                    <p className="text-sm text-gray-600">{aflosser.aflosser_opmerkingen}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
              </CardContent>
            </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Zelfstandige Aflossers */}
            {aflossers.filter((a: any) => !a.vaste_dienst && !a.is_uitzendbureau).length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                  <UserX className="w-5 h-5 mr-2" />
                  Zelfstandige Aflossers ({aflossers.filter((a: any) => !a.vaste_dienst && !a.is_uitzendbureau).length})
                </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {aflossers.filter((a: any) => !a.vaste_dienst && !a.is_uitzendbureau).map((aflosser: any) => (
                    <Card key={aflosser.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-green-100 text-green-600">
                                  {aflosser.first_name?.[0] || '?'}{aflosser.last_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                                <Link href={`/bemanning/aflossers/${aflosser.id}`}>
                                  <h3 className="font-semibold text-green-600 hover:text-green-800 cursor-pointer transition-colors">
                            {aflosser.first_name} {aflosser.last_name}
                                  </h3>
                          </Link>
                                <p className="text-sm text-gray-600">{aflosser.nationality} {getNationalityFlag(aflosser.nationality)}</p>
                          </div>
                        </div>
                            <Badge className={
                              aflosser.status === 'thuis' ? 'bg-green-100 text-green-800' :
                              aflosser.status === 'aan-boord' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {aflosser.status === 'thuis' ? 'Thuis' :
                               aflosser.status === 'aan-boord' ? 'Aan Boord' :
                               aflosser.status}
                            </Badge>
                      </div>

                          {/* Diploma's */}
                          {aflosser.diplomas && aflosser.diplomas.length > 0 && (
                            <div className="bg-green-50 p-3 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <Award className="w-4 h-4 text-green-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-green-800 mb-1">Diploma's</p>
                                  <div className="flex flex-wrap gap-1">
                                    {aflosser.diplomas.map((diploma: string, index: number) => (
                                      <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                        {diploma}
                      </Badge>
                                    ))}
                    </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Contact Info */}
                          <div className="space-y-2">
                    {aflosser.phone && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{aflosser.phone}</span>
                      </div>
                    )}
                            {aflosser.email && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <MessageSquare className="w-4 h-4" />
                                <span>{aflosser.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Dagtarief (voor zelfstandige, uitzendbureau en bestaande aflossers met tarief) */}
                          {aflosser.dag_tarief && (
                            <div className="bg-orange-50 p-3 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-orange-800">
                                  Tarief
                                </span>
                                <span className="text-sm font-bold text-orange-600">
                                  €{parseFloat(aflosser.dag_tarief).toFixed(2)}/dag
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Algemene Opmerkingen */}
                          {aflosser.aflosser_opmerkingen && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Opmerkingen</p>
                                  <p className="text-sm text-gray-600">{aflosser.aflosser_opmerkingen}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Uitzendbureau Aflossers */}
            {aflossers.filter((a: any) => a.is_uitzendbureau).length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-orange-800 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Aflossers van Uitzendbureaus ({aflossers.filter((a: any) => a.is_uitzendbureau).length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {aflossers.filter((a: any) => a.is_uitzendbureau).map((aflosser: any) => (
                    <Card key={aflosser.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-orange-100 text-orange-600">
                                  {aflosser.first_name?.[0] || '?'}{aflosser.last_name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <Link href={`/bemanning/aflossers/${aflosser.id}`}>
                                  <h3 className="font-semibold text-orange-600 hover:text-orange-800 cursor-pointer transition-colors">
                                    {aflosser.first_name} {aflosser.last_name}
                                  </h3>
                                </Link>
                                <p className="text-sm text-gray-600">{aflosser.nationality} {getNationalityFlag(aflosser.nationality)}</p>
                                <p className="text-xs text-orange-600 font-medium">{aflosser.uitzendbureau_naam}</p>
                              </div>
                            </div>
                            <Badge className={
                              aflosser.status === 'thuis' ? 'bg-green-100 text-green-800' :
                              aflosser.status === 'aan-boord' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {aflosser.status === 'thuis' ? 'Thuis' :
                               aflosser.status === 'aan-boord' ? 'Aan Boord' :
                               aflosser.status}
                            </Badge>
                          </div>

                    {/* Diploma's */}
                    {aflosser.diplomas && aflosser.diplomas.length > 0 && (
                            <div className="bg-green-50 p-3 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <Award className="w-4 h-4 text-green-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-green-800 mb-1">Diploma's</p>
                        <div className="flex flex-wrap gap-1">
                                    {aflosser.diplomas.map((diploma: string, index: number) => (
                                      <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800">
                              {diploma}
                            </Badge>
                          ))}
                                  </div>
                                </div>
                        </div>
                      </div>
                    )}

                          {/* Contact Info */}
                          <div className="space-y-2">
                            {aflosser.phone && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{aflosser.phone}</span>
                      </div>
                    )}
                            {aflosser.email && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <MessageSquare className="w-4 h-4" />
                                <span>{aflosser.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Dagtarief (voor uitzendbureau en bestaande aflossers met tarief) */}
                          {aflosser.dag_tarief && (
                            <div className="bg-orange-50 p-3 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-orange-800">
                                  Tarief
                                </span>
                                <span className="text-sm font-bold text-orange-600">
                                  €{parseFloat(aflosser.dag_tarief).toFixed(2)}/dag
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Algemene Opmerkingen */}
                          {aflosser.aflosser_opmerkingen && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Opmerkingen</p>
                                  <p className="text-sm text-gray-600">{aflosser.aflosser_opmerkingen}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                  </CardContent>
                </Card>
              ))}
                </div>
            </div>
          )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Trip Dialog */}
      <Dialog open={newTripDialog} onOpenChange={setNewTripDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe Reis Aanmaken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ship_id">Schip *</Label>
              <Select value={newTripData.ship_id} onValueChange={(value) => setNewTripData({...newTripData, ship_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer schip" />
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
              <Label htmlFor="start_date">Start Datum *</Label>
                <Input
                id="start_date"
                  type="date"
                value={newTripData.start_date}
                onChange={(e) => setNewTripData({...newTripData, start_date: e.target.value})}
                />
              </div>
            
              <div>
              <Label htmlFor="end_date">Eind Datum</Label>
                <Input
                id="end_date"
                  type="date"
                value={newTripData.end_date}
                onChange={(e) => setNewTripData({...newTripData, end_date: e.target.value})}
                />
              </div>
            
              <div>
              <Label htmlFor="trip_from">Van *</Label>
                <Input
                id="trip_from"
                value={newTripData.trip_from}
                onChange={(e) => setNewTripData({...newTripData, trip_from: e.target.value})}
                placeholder="Bijv. Rotterdam"
                />
              </div>
            
              <div>
              <Label htmlFor="trip_to">Naar *</Label>
                <Input
                id="trip_to"
                value={newTripData.trip_to}
                onChange={(e) => setNewTripData({...newTripData, trip_to: e.target.value})}
                placeholder="Bijv. Hamburg"
                />
              </div>
            
            <div>
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={newTripData.notes}
                onChange={(e) => setNewTripData({...newTripData, notes: e.target.value})}
                placeholder="Optionele notities..."
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleCreateTrip} className="flex-1">
                Aanmaken
              </Button>
              <Button variant="outline" onClick={() => setNewTripDialog(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Aflosser Dialog */}
      <Dialog open={!!assignAflosserDialog} onOpenChange={() => setAssignAflosserDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aflosser Toewijzen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="aflosser">Selecteer Aflosser *</Label>
              <Select value={selectedAflosserId} onValueChange={setSelectedAflosserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer aflosser" />
                </SelectTrigger>
                <SelectContent>
                  {aflossers.map((aflosser: any) => {
                    // Check if aflosser has an active trip
                    const hasActiveTrip = trips.some((trip: any) => 
                      trip.aflosser_id === aflosser.id && trip.status === 'actief'
                    )
                    
                    // Check if aflosser has a future assigned trip
                    const hasFutureTrip = trips.some((trip: any) => 
                      trip.aflosser_id === aflosser.id && 
                      (trip.status === 'ingedeeld' || trip.status === 'gepland') &&
                      new Date(trip.start_date) > new Date()
                    )
                    
                    const statusText = hasActiveTrip ? ' (Actieve reis)' : 
                                     hasFutureTrip ? ' (Toekomstige reis)' : 
                                     aflosser.status === 'thuis' ? ' (Beschikbaar)' : ''
                    
                    return (
                      <SelectItem key={aflosser.id} value={aflosser.id}>
                        {aflosser.first_name} {aflosser.last_name} ({aflosser.nationality}){statusText}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleAssignAflosser} className="flex-1" disabled={!selectedAflosserId}>
                Toewijzen
              </Button>
              <Button variant="outline" onClick={() => setAssignAflosserDialog(null)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Board Ship Dialog */}
      <Dialog open={!!boardShipDialog} onOpenChange={() => setBoardShipDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aan Boord Melden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="start_datum">Aan Boord Datum *</Label>
              <Input
                id="start_datum"
                type="date"
                value={boardData.start_datum}
                onChange={(e) => setBoardData({...boardData, start_datum: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="start_tijd">Aan Boord Tijd *</Label>
              <Input
                id="start_tijd"
                type="time"
                value={boardData.start_tijd}
                onChange={(e) => setBoardData({...boardData, start_tijd: e.target.value})}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleBoardShip} className="flex-1" disabled={!boardData.start_datum || !boardData.start_tijd}>
                Aan Boord Melden
              </Button>
              <Button variant="outline" onClick={() => setBoardShipDialog(null)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Trip Dialog */}
      <Dialog open={!!completeTripDialog} onOpenChange={() => setCompleteTripDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reis Afsluiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="eind_datum">Afgestapt Datum *</Label>
              <Input
                id="eind_datum"
                type="date"
                value={completeData.eind_datum}
                onChange={(e) => setCompleteData({...completeData, eind_datum: e.target.value})}
              />
            </div>
                  
            <div>
              <Label htmlFor="eind_tijd">Afgestapt Tijd *</Label>
              <Input
                id="eind_tijd"
                type="time"
                value={completeData.eind_tijd}
                onChange={(e) => setCompleteData({...completeData, eind_tijd: e.target.value})}
              />
                  </div>
                  
            <div>
              <Label htmlFor="aflosser_opmerkingen">Opmerkingen over Aflosser</Label>
              <Textarea
                id="aflosser_opmerkingen"
                value={completeData.aflosser_opmerkingen}
                onChange={(e) => setCompleteData({...completeData, aflosser_opmerkingen: e.target.value})}
                placeholder="Optionele opmerkingen over gedrag, voorkeuren, etc..."
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleCompleteTrip} className="flex-1" disabled={!completeData.eind_datum || !completeData.eind_tijd}>
                Reis Afsluiten
              </Button>
              <Button variant="outline" onClick={() => setCompleteTripDialog(null)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Trip Dialog */}
      <Dialog open={!!editTripDialog} onOpenChange={() => setEditTripDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reis Bewerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_trip_from">Van</Label>
              <Input
                id="edit_trip_from"
                value={editTripData.trip_from}
                onChange={(e) => setEditTripData({...editTripData, trip_from: e.target.value})}
                placeholder="Bijv. Rotterdam"
              />
                  </div>
                  <div>
              <Label htmlFor="edit_trip_to">Naar</Label>
              <Input
                id="edit_trip_to"
                value={editTripData.trip_to}
                onChange={(e) => setEditTripData({...editTripData, trip_to: e.target.value})}
                placeholder="Bijv. Antwerpen"
              />
            </div>
            <div>
              <Label htmlFor="edit_aflosser">Aflosser</Label>
              <Select value={editTripData.aflosser_id} onValueChange={(value) => setEditTripData({...editTripData, aflosser_id: value})}>
                      <SelectTrigger>
                  <SelectValue placeholder="Selecteer aflosser" />
                      </SelectTrigger>
                      <SelectContent>
                  <SelectItem value="none">Geen aflosser</SelectItem>
                  {aflossers.map((aflosser: any) => (
                          <SelectItem key={aflosser.id} value={aflosser.id}>
                      {aflosser.first_name} {aflosser.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
            <div className="flex space-x-2">
              <Button onClick={handleEditTrip} className="flex-1">
                <Edit className="w-4 h-4 mr-2" />
                Bijwerken
              </Button>
              <Button variant="outline" onClick={() => setEditTripDialog(null)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Diplomas Dialog */}
      <Dialog open={!!editDiplomasDialog} onOpenChange={() => setEditDiplomasDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Diploma's bewerken {editDiplomasDialog ? `– ${editDiplomasDialog.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {DIPLOMA_OPTIONS.map((d) => (
                <Button
                  key={d}
                  variant={editDiplomas.includes(d) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setEditDiplomas((prev) => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
                  }}
                >
                  {d}
                </Button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDiplomasDialog(null)}>Annuleren</Button>
              <Button
                onClick={async () => {
                  if (!editDiplomasDialog) return
                  try {
                    await updateCrew(editDiplomasDialog.id, { diplomas: editDiplomas })
                    setEditDiplomasDialog(null)
                  } catch (e) {
                    alert('Fout bij opslaan diploma\'s')
                  }
                }}
              >
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
