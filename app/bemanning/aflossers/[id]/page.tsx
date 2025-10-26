"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
  Trash2
} from "lucide-react"
import Link from "next/link"

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
  const [mounted, setMounted] = useState(false)
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([])

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
      const start = new Date(trip.start_datum)
      const end = new Date(trip.eind_datum)
      const timeDiff = end.getTime() - start.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1
      return total + daysDiff
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
        
        {/* Status Badge */}
        <Badge className={getStatusColor(aflosser.status)}>
          {getStatusText(aflosser.status)}
        </Badge>
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
                            const start = new Date(trip.start_datum)
                            const end = new Date(trip.eind_datum)
                            const timeDiff = end.getTime() - start.getTime()
                            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1
                            return total + daysDiff
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

              {/* Diplomas */}
              {aflosser.diplomas && aflosser.diplomas.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Diploma's:</h4>
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
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Notities:</h4>
                  <div className="text-sm text-gray-600">
                    {typeof aflosser.notes[0] === 'string' ? aflosser.notes[0] : aflosser.notes[0]?.text || 'Geen notitie'}
                  </div>
                </div>
              )}

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
                    // Calculate total work days from all completed trips using the new function
                    const completedTrips = assignmentHistory.filter((trip: any) => 
                      trip.status === 'voltooid' && 
                      trip.start_datum && 
                      trip.eind_datum && 
                      trip.start_tijd && 
                      trip.eind_tijd
                    )
                    
                    let totalWorkDays = 0
                    
                    completedTrips.forEach((trip: any) => {
                      const workDays = calculateWorkDays(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
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
                                          // Use the new calculateWorkDays function
                                          const workDays = calculateWorkDays(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
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
    </div>
  )
} 