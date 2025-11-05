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
  MessageSquare
} from 'lucide-react'
import { useSupabaseData } from '@/hooks/use-supabase-data'

export default function ReizenAflossersPage() {
  const { crew, ships, trips, vasteDienstRecords, loading, updateCrew, addTrip, updateTrip, deleteTrip, addVasteDienstRecord } = useSupabaseData()
  const [activeTab, setActiveTab] = useState('reizen')
  
  // Dialogs
  const [newTripDialog, setNewTripDialog] = useState(false)
  const [assignAflosserDialog, setAssignAflosserDialog] = useState<string | null>(null)
  const [boardShipDialog, setBoardShipDialog] = useState<string | null>(null)
  const [completeTripDialog, setCompleteTripDialog] = useState<string | null>(null)
  
  // Form states
  const [selectedAflosserId, setSelectedAflosserId] = useState("")
  const [newTripData, setNewTripData] = useState({
    trip_name: "",
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
  const [completeData, setCompleteData] = useState({
    eind_datum: "",
    eind_tijd: "",
    aflosser_opmerkingen: ""
  })

  // Helper functions
  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      'NL': '🇳🇱', 'DE': '🇩🇪', 'BE': '🇧🇪', 'PL': '🇵🇱',
      'CZ': '🇨🇿', 'SLK': '🇸🇰', 'EG': '🇪🇬', 'SERV': '🇷🇸',
      'HUN': '🇭🇺', 'FR': '🇫🇷', 'LUX': '🇱🇺', 'PO': '🇵🇱'
    }
    return flags[nationality] || '🏳️'
  }

  const getVasteDienstBalance = (aflosserId: string) => {
    const records = vasteDienstRecords.filter((record: any) => record.aflosser_id === aflosserId)
    if (records.length === 0) return 0
    return records.sort((a: any, b: any) => b.year - a.year || b.month - a.month)[0]?.balance_days || 0
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
    try {
      const newTrip = {
        trip_name: newTripData.trip_name,
        ship_id: newTripData.ship_id,
        start_date: newTripData.start_date,
        end_date: newTripData.end_date || null,
        trip_from: newTripData.trip_from,
        trip_to: newTripData.trip_to,
        notes: newTripData.notes || null,
        status: 'gepland' as const
      }

      await addTrip(newTrip)

      setNewTripData({
        trip_name: "",
        ship_id: "",
        start_date: "",
        end_date: "",
        trip_from: "",
        trip_to: "",
        notes: ""
      })
      
      setNewTripDialog(false)
      alert("Reis succesvol aangemaakt!")
      
    } catch (error) {
      console.error("Error creating trip:", error)
      alert("Fout bij aanmaken reis")
    }
  }

  // Assign aflosser to trip (gepland → ingedeeld)
  const handleAssignAflosser = async () => {
    if (!assignAflosserDialog || !selectedAflosserId) return

    try {
      // Update trip status to 'ingedeeld'
      await updateTrip(assignAflosserDialog, {
        status: 'ingedeeld',
        aflosser_id: selectedAflosserId
      })

    setAssignAflosserDialog(null)
    setSelectedAflosserId("")
      alert("Aflosser succesvol toegewezen aan reis!")
      
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
      alert("Aflosser succesvol aan boord gemeld!")
      
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
      alert("Reis succesvol afgesloten!")
      
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <MobileHeaderNav />
        <div className="text-center">Laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <MobileHeaderNav />
      <DashboardButton />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reizen & Aflossers Beheer</h1>
        <p className="text-gray-600">4-stappen workflow: Gepland → Ingedeeld → Actief → Voltooid</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="reizen" className="text-base">
            <Ship className="w-4 h-4 mr-2" />
            Reizen
          </TabsTrigger>
          <TabsTrigger value="aflossers" className="text-base">
            <Users className="w-4 h-4 mr-2" />
            Aflossers
          </TabsTrigger>
        </TabsList>

        {/* REIZEN TAB */}
        <TabsContent value="reizen" className="space-y-8">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <CalendarDays className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Gepland</p>
                    <p className="text-3xl font-bold text-orange-600">{geplandeTrips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <UserPlus className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Ingedeeld</p>
                    <p className="text-3xl font-bold text-blue-600">{ingedeeldeTrips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Ship className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Actief</p>
                    <p className="text-3xl font-bold text-green-600">{actieveTrips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Alle Reizen</h2>
            <div className="flex gap-3">
              <Link href="/bemanning/aflossers/voltooide-reizen">
                <Button variant="outline">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Voltooide Reizen ({voltooideTrips.length})
                </Button>
              </Link>
              <Button onClick={() => setNewTripDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Reis Aanmaken
              </Button>
            </div>
          </div>

          {/* Trips Grid - 3 columns for each status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Geplande Reizen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="w-5 h-5 text-orange-600" />
                    <span>Gepland</span>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">{geplandeTrips.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {geplandeTrips.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Geen geplande reizen</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {geplandeTrips.map((trip: any) => (
                      <Card key={trip.id} className="border-orange-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-lg">{trip.trip_name}</h4>
                              <p className="text-sm text-gray-600">{getShipName(trip.ship_id)}</p>
                            </div>
                            <Badge className="bg-orange-100 text-orange-800">Gepland</Badge>
                          </div>
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <CalendarDays className="w-4 h-4 mr-2" />
                              <span>
                                {format(new Date(trip.start_date), 'dd-MM-yyyy')}
                                {trip.end_date && ` - ${format(new Date(trip.end_date), 'dd-MM-yyyy')}`}
                              </span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="w-4 h-4 mr-2" />
                              <span>{trip.trip_from} → {trip.trip_to}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={() => setAssignAflosserDialog(trip.id)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Aflosser Toewijzen
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelTrip(trip.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Annuleren
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ingedeelde Reizen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    <span>Ingedeeld</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">{ingedeeldeTrips.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ingedeeldeTrips.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Geen ingedeelde reizen</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ingedeeldeTrips.map((trip: any) => {
                      const aflosser = crew.find((c: any) => c.id === trip.aflosser_id)
                      return (
                        <Card key={trip.id} className="border-blue-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{trip.trip_name}</h4>
                                <p className="text-sm text-gray-600">{getShipName(trip.ship_id)}</p>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800">Ingedeeld</Badge>
                            </div>
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <CalendarDays className="w-4 h-4 mr-2" />
                                <span>
                                  {format(new Date(trip.start_date), 'dd-MM-yyyy')}
                                  {trip.end_date && ` - ${format(new Date(trip.end_date), 'dd-MM-yyyy')}`}
                                </span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                <span>{trip.trip_from} → {trip.trip_to}</span>
                              </div>
                              {aflosser && (
                                <div className="flex items-center text-sm bg-blue-50 p-2 rounded">
                                  <UserPlus className="w-4 h-4 mr-2 text-blue-600" />
                                  <span className="font-medium text-blue-700">
                                    {aflosser.first_name} {aflosser.last_name}
                                  </span>
                                </div>
                              )}
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => setBoardShipDialog(trip.id)}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              <Ship className="w-4 h-4 mr-2" />
                              Aan Boord Melden
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actieve Reizen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Ship className="w-5 h-5 text-green-600" />
                    <span>Actief</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{actieveTrips.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {actieveTrips.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Ship className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Geen actieve reizen</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {actieveTrips.map((trip: any) => {
                      const aflosser = crew.find((c: any) => c.id === trip.aflosser_id)
                      return (
                        <Card key={trip.id} className="border-green-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{trip.trip_name}</h4>
                                <p className="text-sm text-gray-600">{getShipName(trip.ship_id)}</p>
                              </div>
                              <Badge className="bg-green-100 text-green-800">Actief</Badge>
                            </div>
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <CalendarDays className="w-4 h-4 mr-2" />
                                <span>
                                  {format(new Date(trip.start_date), 'dd-MM-yyyy')}
                                  {trip.end_date && ` - ${format(new Date(trip.end_date), 'dd-MM-yyyy')}`}
                                </span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                <span>{trip.trip_from} → {trip.trip_to}</span>
                              </div>
                              {aflosser && (
                                <div className="flex items-center text-sm bg-green-50 p-2 rounded">
                                  <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                                  <span className="font-medium text-green-700">
                                    {aflosser.first_name} {aflosser.last_name}
                                  </span>
                                </div>
                              )}
                              {trip.start_datum && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Clock className="w-4 h-4 mr-2" />
                                  <span>Aan boord: {format(new Date(trip.start_datum), 'dd-MM-yyyy')} {trip.start_tijd}</span>
                                </div>
                              )}
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => setCompleteTripDialog(trip.id)}
                              className="w-full bg-gray-600 hover:bg-gray-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Reis Afsluiten
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* AFLOSSERS TAB */}
        <TabsContent value="aflossers" className="space-y-8">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Totaal Aflossers</p>
                    <p className="text-3xl font-bold text-blue-600">{aflossers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Beschikbaar</p>
                    <p className="text-3xl font-bold text-green-600">
                      {aflossers.filter((a: any) => a.status === "thuis").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Ship className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Aan Boord</p>
                    <p className="text-3xl font-bold text-red-600">
                      {aflossers.filter((a: any) => a.status === "aan-boord").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <CalendarDays className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Afwezig</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {aflossers.filter((a: any) => a.sub_status === 'afwezig').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Alle Aflossers</h2>
            <div className="flex gap-3">
              <Button onClick={() => setActiveTab('reizen')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug naar Reizen
              </Button>
              <Link href="/bemanning/aflossers/nieuw">
                <Button className="bg-green-600 hover:bg-green-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nieuwe Aflosser
                </Button>
              </Link>
            </div>
          </div>

          {/* Aflossers List */}
          {aflossers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Geen aflossers gevonden</h3>
                <p className="text-gray-500 mb-4">Er zijn nog geen aflossers toegevoegd.</p>
                <Link href="/bemanning/aflossers/nieuw">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Eerste Aflosser Toevoegen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aflossers.map((aflosser: any) => (
                <Card key={aflosser.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
                            {aflosser.first_name[0]}{aflosser.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link 
                            href={`/bemanning/aflossers/${aflosser.id}`}
                            className="font-semibold text-gray-900 hover:text-blue-700 text-lg"
                          >
                            {aflosser.first_name} {aflosser.last_name}
                          </Link>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{getNationalityFlag(aflosser.nationality)}</span>
                            <span>{aflosser.nationality}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(aflosser.status)}>
                        {getStatusText(aflosser.status)}
                      </Badge>
                    </div>

                    {aflosser.phone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                        <Phone className="w-4 h-4" />
                        <span>{aflosser.phone}</span>
                      </div>
                    )}

                    {/* Diploma's */}
                    {aflosser.diplomas && aflosser.diplomas.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">Diploma's:</p>
                        <div className="flex flex-wrap gap-1">
                          {aflosser.diplomas.slice(0, 4).map((diploma: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {diploma}
                            </Badge>
                          ))}
                          {aflosser.diplomas.length > 4 && (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                              +{aflosser.diplomas.length - 4} meer
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Algemene Opmerkingen */}
                    {aflosser.aflosser_opmerkingen && (
                      <div className="mb-3">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-600 mb-1">Opmerkingen:</p>
                            <p className="text-xs text-gray-700 italic bg-blue-50 p-2 rounded border border-blue-200">
                              {aflosser.aflosser_opmerkingen}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Vaste Dienst Saldo */}
                    {aflosser.vaste_dienst && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <span className="text-xs font-medium text-gray-600">Vaste Dienst Saldo:</span>
                          <span className={`text-sm font-bold ${(() => {
                            const balance = getVasteDienstBalance(aflosser.id)
                            return balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-600'
                          })()}`}>
                            {(() => {
                              const balance = getVasteDienstBalance(aflosser.id)
                              return balance > 0 ? '+' : ''}{getVasteDienstBalance(aflosser.id)} dagen
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* NEW TRIP DIALOG */}
      <Dialog open={newTripDialog} onOpenChange={setNewTripDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nieuwe Reis Aanmaken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tripName">Reisnaam *</Label>
              <Input
                id="tripName"
                value={newTripData.trip_name}
                onChange={(e) => setNewTripData({...newTripData, trip_name: e.target.value})}
                placeholder="Bijv. Rotterdam - Koblenz"
                required
              />
            </div>
            <div>
              <Label htmlFor="ship">Schip *</Label>
              <Select value={newTripData.ship_id} onValueChange={(value) => setNewTripData({...newTripData, ship_id: value})}>
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
                  value={newTripData.start_date}
                  onChange={(e) => setNewTripData({...newTripData, start_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">Einddatum (optioneel)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newTripData.end_date}
                  onChange={(e) => setNewTripData({...newTripData, end_date: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tripFrom">Reis van *</Label>
                <Input
                  id="tripFrom"
                  value={newTripData.trip_from}
                  onChange={(e) => setNewTripData({...newTripData, trip_from: e.target.value})}
                  placeholder="Rotterdam"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tripTo">Reis naar *</Label>
                <Input
                  id="tripTo"
                  value={newTripData.trip_to}
                  onChange={(e) => setNewTripData({...newTripData, trip_to: e.target.value})}
                  placeholder="Koblenz"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={newTripData.notes}
                onChange={(e) => setNewTripData({...newTripData, notes: e.target.value})}
                placeholder="Extra informatie..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setNewTripDialog(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleCreateTrip}
                disabled={!newTripData.trip_name || !newTripData.ship_id || !newTripData.start_date || !newTripData.trip_from || !newTripData.trip_to}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Reis Aanmaken
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ASSIGN AFLOSSER DIALOG */}
      <Dialog open={!!assignAflosserDialog} onOpenChange={() => setAssignAflosserDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aflosser Toewijzen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {assignAflosserDialog && (() => {
              const trip = trips.find((t: any) => t.id === assignAflosserDialog)
              const availableAflossers = aflossers.filter((a: any) => a.status === "thuis")
              
              return (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-1">{trip?.trip_name}</h4>
                    <p className="text-sm text-blue-700">{trip ? getShipName(trip.ship_id) : ''}</p>
                    <p className="text-sm text-blue-600">
                      {trip?.start_date ? format(new Date(trip.start_date), 'dd-MM-yyyy') : ''}
                      {trip?.end_date && ` - ${format(new Date(trip.end_date), 'dd-MM-yyyy')}`}
                    </p>
                  </div>
                  
                  <div>
                    <Label>Selecteer Beschikbare Aflosser</Label>
                    <Select value={selectedAflosserId} onValueChange={setSelectedAflosserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kies een aflosser" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAflossers.map((aflosser: any) => (
                          <SelectItem key={aflosser.id} value={aflosser.id}>
                            {aflosser.first_name} {aflosser.last_name} ({aflosser.nationality})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {availableAflossers.length === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Geen beschikbare aflossers. Ga naar de Aflossers tab om meer informatie te zien.
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
                onClick={handleAssignAflosser}
                disabled={!selectedAflosserId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Toewijzen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* BOARD SHIP DIALOG */}
      <Dialog open={!!boardShipDialog} onOpenChange={() => setBoardShipDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aan Boord Melden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {boardShipDialog && (() => {
              const trip = trips.find((t: any) => t.id === boardShipDialog)
              const aflosser = trip ? crew.find((c: any) => c.id === trip.aflosser_id) : null
              
              return (
                <>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-1">{trip?.trip_name}</h4>
                    <p className="text-sm text-green-700">{trip ? getShipName(trip.ship_id) : ''}</p>
                    {aflosser && (
                      <p className="text-sm text-green-600">
                        Aflosser: {aflosser.first_name} {aflosser.last_name}
                      </p>
                    )}
    </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDatum">Datum aan boord *</Label>
                      <Input
                        id="startDatum"
                        type="date"
                        value={boardData.start_datum}
                        onChange={(e) => setBoardData({...boardData, start_datum: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="startTijd">Tijd aan boord *</Label>
                      <Input
                        id="startTijd"
                        type="time"
                        value={boardData.start_tijd}
                        onChange={(e) => setBoardData({...boardData, start_tijd: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </>
              )
            })()}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setBoardShipDialog(null)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleBoardShip}
                disabled={!boardData.start_datum || !boardData.start_tijd}
                className="bg-green-600 hover:bg-green-700"
              >
                Aan Boord Melden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* COMPLETE TRIP DIALOG */}
      <Dialog open={!!completeTripDialog} onOpenChange={() => setCompleteTripDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reis Afsluiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {completeTripDialog && (() => {
              const trip = trips.find((t: any) => t.id === completeTripDialog)
              const aflosser = trip ? crew.find((c: any) => c.id === trip.aflosser_id) : null
              
              return (
                <>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-1">{trip?.trip_name}</h4>
                    <p className="text-sm text-gray-700">{trip ? getShipName(trip.ship_id) : ''}</p>
                    {aflosser && (
                      <p className="text-sm text-gray-600">
                        Aflosser: {aflosser.first_name} {aflosser.last_name}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eindDatum">Datum afstappen *</Label>
                      <Input
                        id="eindDatum"
                        type="date"
                        value={completeData.eind_datum}
                        onChange={(e) => setCompleteData({...completeData, eind_datum: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="eindTijd">Tijd afstappen *</Label>
                      <Input
                        id="eindTijd"
                        type="time"
                        value={completeData.eind_tijd}
                        onChange={(e) => setCompleteData({...completeData, eind_tijd: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="aflosserOpmerkingen">Opmerkingen over aflosser (optioneel)</Label>
                    <Textarea
                      id="aflosserOpmerkingen"
                      value={completeData.aflosser_opmerkingen}
                      onChange={(e) => setCompleteData({...completeData, aflosser_opmerkingen: e.target.value})}
                      placeholder="Bijv. Goede werkhouding, ervaring met dit type schip, bijzondere wensen..."
                      rows={3}
                    />
                  </div>
                </>
              )
            })()}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCompleteTripDialog(null)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleCompleteTrip}
                disabled={!completeData.eind_datum || !completeData.eind_tijd}
                className="bg-gray-600 hover:bg-gray-700"
              >
                Reis Afsluiten
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}