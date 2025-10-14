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
  Plus
} from 'lucide-react'
import { useSupabaseData } from '@/hooks/use-supabase-data'

export default function ReizenAflossersPage() {
  const { crew, ships, loading, updateCrew } = useSupabaseData()
  const [activeTab, setActiveTab] = useState('reizen')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  
  // Dialogs
  const [newTripDialog, setNewTripDialog] = useState(false)
  const [assignAflosserDialog, setAssignAflosserDialog] = useState<string | null>(null)
  const [selectedAflosserId, setSelectedAflosserId] = useState("")
  
  // Trip data
  const [plannedTrips, setPlannedTrips] = useState<any[]>([])
  const [newTripData, setNewTripData] = useState({
    tripName: "",
    shipId: "",
    startDate: "",
    endDate: "",
    tripFrom: "",
    tripTo: "",
    notes: ""
  })

  // Load planned trips from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTrips = JSON.parse(localStorage.getItem('plannedTrips') || '[]')
      setPlannedTrips(storedTrips)
    }
  }, [])

  // Helper functions
  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      'NL': '🇳🇱', 'DE': '🇩🇪', 'BE': '🇧🇪', 'PL': '🇵🇱',
      'CZ': '🇨🇿', 'SLK': '🇸🇰', 'EG': '🇪🇬', 'SERV': '🇷🇸',
      'HUN': '🇭🇺', 'FR': '🇫🇷', 'LUX': '🇱🇺', 'PO': '🇵🇱'
    }
    return flags[nationality] || '🏳️'
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
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aan-boord': return 'Aan boord'
      case 'thuis': return 'Beschikbaar'
      case 'afwezig': return 'Afwezig'
      default: return status
    }
  }

  // Filter aflossers
  const aflossers = crew.filter((member: any) => member.position === "Aflosser")

  // Create new trip
  const handleCreateTrip = async () => {
    try {
      const newTrip = {
        id: Date.now().toString(),
        ship_id: newTripData.shipId,
        trip_name: newTripData.tripName,
        start_date: newTripData.startDate,
        end_date: newTripData.endDate || null,
        trip_from: newTripData.tripFrom,
        trip_to: newTripData.tripTo,
        status: 'gepland' as const,
        notes: newTripData.notes,
        aflosser_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (typeof window !== 'undefined') {
        const existingTrips = JSON.parse(localStorage.getItem('plannedTrips') || '[]')
        const updatedTrips = [...existingTrips, newTrip]
        localStorage.setItem('plannedTrips', JSON.stringify(updatedTrips))
        setPlannedTrips(updatedTrips)
      }

      setNewTripData({
        tripName: "",
        shipId: "",
        startDate: "",
        endDate: "",
        tripFrom: "",
        tripTo: "",
        notes: ""
      })
      
      setNewTripDialog(false)
      alert("Reis succesvol aangemaakt!")
      
    } catch (error) {
      console.error("Error creating trip:", error)
      alert("Fout bij aanmaken reis")
    }
  }

  // Assign aflosser to trip
  const handleAssignAflosser = async () => {
    if (!assignAflosserDialog || !selectedAflosserId) return

    const selectedAflosser = aflossers.find((a: any) => a.id === selectedAflosserId)
    if (!selectedAflosser) return

    // Update trip
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

    if (typeof window !== 'undefined') {
      localStorage.setItem('plannedTrips', JSON.stringify(updatedTrips))
      setPlannedTrips(updatedTrips)
    }

    // Update aflosser status
    const trip = plannedTrips.find((t: any) => t.id === assignAflosserDialog)
    if (trip) {
      await updateCrew(selectedAflosser.id, {
        ship_id: trip.ship_id,
        status: "aan-boord"
      })
    }

    setAssignAflosserDialog(null)
    setSelectedAflosserId("")
    alert(`${selectedAflosser.first_name} ${selectedAflosser.last_name} toegewezen aan reis!`)
  }

  // Complete trip
  const handleCompleteTrip = async (tripId: string) => {
    const trip = plannedTrips.find((t: any) => t.id === tripId)
    if (!trip || !trip.aflosser_id) return

    if (!confirm(`Weet je zeker dat je deze reis wilt afsluiten?`)) return

    const updatedTrips = plannedTrips.map((t: any) => {
      if (t.id === tripId) {
        return { ...t, status: 'voltooid', updated_at: new Date().toISOString() }
      }
      return t
    })

    if (typeof window !== 'undefined') {
      localStorage.setItem('plannedTrips', JSON.stringify(updatedTrips))
      setPlannedTrips(updatedTrips)
    }

    await updateCrew(trip.aflosser_id, {
      status: "thuis",
      ship_id: undefined
    })

    alert("Reis afgesloten!")
  }

  // Cancel trip
  const handleCancelTrip = (tripId: string) => {
    if (!confirm("Weet je zeker dat je deze reis wilt annuleren?")) return

    const updatedTrips = plannedTrips.filter((t: any) => t.id !== tripId)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('plannedTrips', JSON.stringify(updatedTrips))
      setPlannedTrips(updatedTrips)
    }

    alert("Reis geannuleerd!")
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <MobileHeaderNav />
        <div className="text-center">Laden...</div>
      </div>
    )
  }

  const geplande = plannedTrips.filter((t: any) => t.status === 'gepland')
  const actieve = plannedTrips.filter((t: any) => t.status === 'actief')
  const voltooide = plannedTrips.filter((t: any) => t.status === 'voltooid')

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <MobileHeaderNav />
      <DashboardButton />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reizen & Aflossers Overzicht</h1>
        <p className="text-gray-600">Beheer reizen en wijs aflossers toe</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Ship className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Totaal Reizen</p>
                    <p className="text-3xl font-bold text-blue-600">{plannedTrips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <CalendarDays className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Gepland</p>
                    <p className="text-3xl font-bold text-orange-600">{geplande.length}</p>
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
                    <p className="text-3xl font-bold text-green-600">{actieve.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-8 h-8 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Voltooid</p>
                    <p className="text-3xl font-bold text-gray-600">{voltooide.length}</p>
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
                  Voltooide Reizen ({voltooide.length})
                </Button>
              </Link>
              <Button onClick={() => setNewTripDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Reis Aanmaken
              </Button>
            </div>
          </div>

          {/* Trips Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Geplande Reizen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="w-5 h-5 text-orange-600" />
                    <span>Geplande Reizen</span>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">{geplande.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {geplande.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Ship className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Geen geplande reizen</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {geplande.map((trip: any) => (
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
                              Aflosser Toevoegen
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

            {/* Actieve Reizen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Ship className="w-5 h-5 text-green-600" />
                    <span>Actieve Reizen</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{actieve.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {actieve.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Ship className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Geen actieve reizen</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {actieve.map((trip: any) => {
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
                              onClick={() => handleCompleteTrip(trip.id)}
                              className="w-full bg-green-600 hover:bg-green-700"
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
                      {aflossers.filter((a: any) => a.status === "afwezig").length}
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

                    {aflosser.ship_id && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                        <Ship className="w-4 h-4" />
                        <span>{getShipName(aflosser.ship_id)}</span>
                      </div>
                    )}

                    {assignAflosserDialog && aflosser.status === "thuis" && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedAflosserId(aflosser.id)
                          handleAssignAflosser()
                        }}
                      >
                        Selecteren voor Reis
                      </Button>
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
                value={newTripData.tripName}
                onChange={(e) => setNewTripData({...newTripData, tripName: e.target.value})}
                placeholder="Bijv. Rotterdam - Koblenz"
                required
              />
            </div>
            <div>
              <Label htmlFor="ship">Schip *</Label>
              <Select value={newTripData.shipId} onValueChange={(value) => setNewTripData({...newTripData, shipId: value})}>
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
                  value={newTripData.startDate}
                  onChange={(e) => setNewTripData({...newTripData, startDate: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">Einddatum (optioneel)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newTripData.endDate}
                  onChange={(e) => setNewTripData({...newTripData, endDate: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tripFrom">Reis van *</Label>
                <Input
                  id="tripFrom"
                  value={newTripData.tripFrom}
                  onChange={(e) => setNewTripData({...newTripData, tripFrom: e.target.value})}
                  placeholder="Rotterdam"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tripTo">Reis naar *</Label>
                <Input
                  id="tripTo"
                  value={newTripData.tripTo}
                  onChange={(e) => setNewTripData({...newTripData, tripTo: e.target.value})}
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
                disabled={!newTripData.tripName || !newTripData.shipId || !newTripData.startDate || !newTripData.tripFrom || !newTripData.tripTo}
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
              const trip = plannedTrips.find((t: any) => t.id === assignAflosserDialog)
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
    </div>
  )
}

