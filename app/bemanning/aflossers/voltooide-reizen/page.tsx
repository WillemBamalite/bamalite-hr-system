"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MobileHeaderNav } from '@/components/ui/mobile-header-nav'
import { DashboardButton } from '@/components/ui/dashboard-button'
import { useSupabaseData, calculateWorkDaysVasteDienst, calculateWorkDays } from '@/hooks/use-supabase-data'
import { 
  ArrowLeft, 
  Search, 
  Filter,
  CalendarDays,
  MapPin,
  UserPlus,
  Ship,
  Trash2
} from 'lucide-react'

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

  const startParsed = parseDate(startDate)
  const endParsed = parseDate(endDate)

  if (isNaN(startParsed.getTime()) || isNaN(endParsed.getTime())) {
    return 0
  }

  // Gebruik altijd de vroegste datum als start en de laatste als eind,
  // ook als er per ongeluk iets omgedraaid is ingevoerd.
  const start = startParsed <= endParsed ? startParsed : endParsed
  const end = endParsed >= startParsed ? endParsed : startParsed

  // Simpele telling: tel kalenderdagen van start tot eind (inclusief beide)
  const timeDiff = end.getTime() - start.getTime()
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1 // +1 omdat we beide datums inclusief tellen


  return daysDiff
}

export default function VoltooideReizenPage() {
  const { ships, crew, trips, loading, deleteTrip } = useSupabaseData()
  const [completedTrips, setCompletedTrips] = useState<any[]>([])
  const [filteredTrips, setFilteredTrips] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedShip, setSelectedShip] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Load completed trips from Supabase
  useEffect(() => {
    const completed = trips.filter((trip: any) => trip.status === 'voltooid')
    setCompletedTrips(completed)
  }, [trips])

  // Filter trips based on search and filters
  useEffect(() => {
    let filtered = completedTrips

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((trip: any) => {
        const shipName = getShipNameLocal(trip.ship_id)
        const aflosserName = getAflosserName(trip.aflosser_id)
        const searchLower = searchTerm.toLowerCase()
        
        return (
          shipName.toLowerCase().includes(searchLower) ||
          trip.trip_name.toLowerCase().includes(searchLower) ||
          trip.trip_from.toLowerCase().includes(searchLower) ||
          trip.trip_to.toLowerCase().includes(searchLower) ||
          aflosserName.toLowerCase().includes(searchLower)
        )
      })
    }

         // Ship filter
     if (selectedShip && selectedShip !== 'all') {
       filtered = filtered.filter((trip: any) => trip.ship_id === selectedShip)
     }

     // Year filter
     if (selectedYear && selectedYear !== 'all') {
       filtered = filtered.filter((trip: any) => {
         const tripYear = new Date(trip.start_date).getFullYear().toString()
         return tripYear === selectedYear
       })
     }

    setFilteredTrips(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [completedTrips, searchTerm, selectedShip, selectedYear])

  // Helper functions
  const getShipNameLocal = (shipId: string) => {
    const ship = ships.find((s: any) => s.id === shipId)
    return ship ? ship.name : 'Onbekend schip'
  }

  const getAflosserName = (aflosserId: string) => {
    const aflosser = crew.find((c: any) => c.id === aflosserId)
    return aflosser ? `${aflosser.first_name} ${aflosser.last_name}` : 'Onbekend'
  }

  // Get unique years from trips
  const getUniqueYears = () => {
    const years = completedTrips.map((trip: any) => 
      new Date(trip.start_date).getFullYear()
    )
    return [...new Set(years)].sort((a, b) => b - a) // Sort descending
  }

  // Pagination
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTrips = filteredTrips.slice(startIndex, endIndex)

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voltooide Reizen</h1>
          <p className="text-gray-600">Overzicht van alle afgesloten reizen</p>
        </div>
        <Link href="/bemanning/aflossers">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar Aflossers
          </Button>
        </Link>
      </div>


      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Zoeken</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Zoek op schip, reis, aflosser..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Schip</label>
              <Select value={selectedShip} onValueChange={setSelectedShip}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle schepen" />
                </SelectTrigger>
                                 <SelectContent>
                   <SelectItem value="all">Alle schepen</SelectItem>
                   {ships.map((ship: any) => (
                     <SelectItem key={ship.id} value={ship.id}>
                       {ship.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Jaar</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle jaren" />
                </SelectTrigger>
                                 <SelectContent>
                   <SelectItem value="all">Alle jaren</SelectItem>
                   {getUniqueYears().map((year) => (
                     <SelectItem key={year} value={year.toString()}>
                       {year}
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
                             <Button 
                 variant="outline" 
                 onClick={() => {
                   setSearchTerm("")
                   setSelectedShip("all")
                   setSelectedYear("all")
                 }}
                 className="w-full"
               >
                 Filters Wissen
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            {filteredTrips.length} van {completedTrips.length} voltooide reizen
          </p>
          {filteredTrips.length > itemsPerPage && (
            <p className="text-sm text-gray-600">
              Pagina {currentPage} van {totalPages}
            </p>
          )}
        </div>
      </div>

      {/* Trips List */}
      {currentTrips.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Ship className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen voltooide reizen gevonden</h3>
            <p className="text-gray-500">
              {filteredTrips.length === 0 && completedTrips.length > 0 
                ? "Probeer andere filters te gebruiken."
                : "Er zijn nog geen voltooide reizen geregistreerd."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {currentTrips.map((trip: any) => {
            const assignedAflosser = crew.find((c: any) => c.id === trip.aflosser_id)
            return (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header row */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">{getShipNameLocal(trip.ship_id)}</h4>
                        <p className="text-sm text-gray-600">{trip.trip_from} → {trip.trip_to}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-gray-100 text-gray-800">Voltooid</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (confirm('Weet je zeker dat je deze reis definitief wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
                              try {
                                await deleteTrip(trip.id)
                                alert('Reis succesvol verwijderd!')
                              } catch (error) {
                                console.error('Error deleting trip:', error)
                                alert('Fout bij verwijderen van reis')
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Trip details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                          <CalendarDays className="w-4 h-4" />
                          <span>
                            {format(new Date(trip.start_date), 'dd-MM-yyyy')} 
                            {trip.end_date ? ` - ${format(new Date(trip.end_date), 'dd-MM-yyyy')}` : ' - Onbekend'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">Reis: {trip.trip_name}</p>
                      </div>
                      <div>
                        {assignedAflosser ? (
                          <div className="flex items-center space-x-2">
                            <UserPlus className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              {assignedAflosser.first_name} {assignedAflosser.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Geen aflosser toegewezen</span>
                        )}
                      </div>
                    </div>

                    {/* Actual boarding/leaving times */}
                    {(trip.start_datum || trip.eind_datum) && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Werkelijke tijden</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {trip.start_datum && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">Aan boord:</span>
                              <span className="font-medium">
                                {format(new Date(trip.start_datum), 'dd-MM-yyyy')} {trip.start_tijd || ''}
                              </span>
                            </div>
                          )}
                          {trip.eind_datum && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">Afgestapt:</span>
                              <span className="font-medium">
                                {format(new Date(trip.eind_datum), 'dd-MM-yyyy')} {trip.eind_tijd || ''}
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
                                  if (assignedAflosser?.vaste_dienst) {
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

                    {/* Aflosser opmerkingen */}
                    {trip.aflosser_opmerkingen && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h5 className="text-sm font-medium text-blue-700 mb-1">Opmerkingen over aflosser</h5>
                        <p className="text-sm text-blue-600 italic">{trip.aflosser_opmerkingen}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Vorige
          </Button>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-10 h-10"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Volgende
          </Button>
        </div>
      )}
    </div>
  )
} 