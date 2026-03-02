"use client"

import { useState, useEffect } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { BackButton } from "@/components/ui/back-button"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInDays } from "date-fns"
import { nl } from "date-fns/locale"
import { CalendarDays, AlertTriangle, CheckCircle, Plus, Ship, ChevronDown, ChevronUp } from "lucide-react"

// Parse datum (ISO of DD-MM-YYYY)
function parseTripDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date(NaN)
  if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? new Date(NaN) : d
  }
  const parts = dateStr.split('-')
  if (parts.length !== 3) return new Date(NaN)
  const [d, m, y] = parts
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  const date = new Date(iso)
  return isNaN(date.getTime()) ? new Date(NaN) : date
}

export default function VasteDienstPage() {
  const { crew, trips, ships, vasteDienstRecords, loading, error } = useSupabaseData()
  const [mounted, setMounted] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [expandedAflosser, setExpandedAflosser] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Laden...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Fout: {error}</div>
      </div>
    )
  }

  // Filter aflossers in vaste dienst (gebruik crew.vaste_dienst uit Supabase, niet localStorage)
  const vasteDienstAflossers = crew.filter((member: any) => 
    member.position === "Aflosser" && member.vaste_dienst === true
  )

  const getNationalityFlag = (nationality: string) => {
    const flags: Record<string, string> = {
      NL: "🇳🇱", CZ: "🇨🇿", SLK: "🇸🇰", EG: "🇪🇬", PO: "🇵🇱",
      SERV: "🇷🇸", HUN: "🇭🇺", BE: "🇧🇪", FR: "🇫🇷", DE: "🇩🇪", LUX: "🇱🇺",
    }
    return flags[nationality] || "🌍"
  }

  const getShipName = (shipId: string) => {
    const ship = ships.find((s: any) => s.id === shipId)
    return ship?.name || "Onbekend schip"
  }

  const viewYear = currentMonth.getFullYear()
  const viewMonth = currentMonth.getMonth() + 1
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  // Berekening uit voltooide reizen (trips) - zelfde logica als autoManageVasteDienstRecords
  const getTripsForMonth = (aflosserId: string) => {
    return (trips || []).filter((trip: any) => {
      if (trip.aflosser_id !== aflosserId) return false
      if (trip.status !== 'voltooid') return false
      if (!trip.start_datum || !trip.eind_datum) return false
      const start = parseTripDate(trip.start_datum)
      const end = parseTripDate(trip.eind_datum)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      return end >= monthStart && start <= monthEnd
    })
  }

  const calculateDaysFromTrip = (trip: any) => {
    const tripStart = parseTripDate(trip.start_datum)
    const tripEnd = parseTripDate(trip.eind_datum)
    if (isNaN(tripStart.getTime()) || isNaN(tripEnd.getTime())) return 0
    tripStart.setHours(0, 0, 0, 0)
    tripEnd.setHours(0, 0, 0, 0)
    const rangeStart = tripStart < monthStart ? monthStart : tripStart
    const rangeEnd = tripEnd > monthEnd ? monthEnd : tripEnd
    if (rangeEnd < rangeStart) return 0
    return differenceInDays(rangeEnd, rangeStart) + 1
  }

  const getPreviousMonthRecord = (aflosserId: string) => {
    const prev = subMonths(currentMonth, 1)
    return (vasteDienstRecords || []).find(
      (r: any) => r.aflosser_id === aflosserId && r.year === prev.getFullYear() && r.month === prev.getMonth() + 1
    )
  }

  const getCurrentMonthData = (aflosser: any) => {
    const monthTrips = getTripsForMonth(aflosser.id)
    const actualDaysThisMonth = monthTrips.reduce((sum: number, t: any) => sum + calculateDaysFromTrip(t), 0)
    
    const record = (vasteDienstRecords || []).find(
      (r: any) => r.aflosser_id === aflosser.id && r.year === viewYear && r.month === viewMonth
    )
    
    const prevRecord = getPreviousMonthRecord(aflosser.id)
    const prevActual = prevRecord?.actual_days ?? 0
    const carryover = prevActual - 15
    
    const totalDays = Math.max(0, actualDaysThisMonth + carryover)
    const daysRequired = 15

    return {
      actualDaysThisMonth,
      carryover,
      totalDays,
      daysRequired,
      record,
      monthTrips,
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <BackButton />
      <DashboardButton />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vaste Dienst Overzicht</h1>
          <p className="text-gray-600">
            Berekening op basis van voltooide reizen (trips) in Supabase
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            ← Vorige maand
          </Button>
          <div className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy', { locale: nl })}
          </div>
          <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            Volgende maand →
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-blue-500 rounded-full" />
              <div>
                <p className="text-sm text-gray-600">Aflossers vaste dienst</p>
                <p className="text-2xl font-bold text-blue-600">{vasteDienstAflossers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-green-500 rounded-full" />
              <div>
                <p className="text-sm text-gray-600">Op schema</p>
                <p className="text-2xl font-bold text-green-600">
                  {vasteDienstAflossers.filter((a: any) => {
                    const d = getCurrentMonthData(a)
                    return d.totalDays >= d.daysRequired
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-orange-500 rounded-full" />
              <div>
                <p className="text-sm text-gray-600">Achterstand</p>
                <p className="text-2xl font-bold text-orange-600">
                  {vasteDienstAflossers.filter((a: any) => {
                    const d = getCurrentMonthData(a)
                    return d.totalDays < d.daysRequired
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-purple-500 rounded-full" />
              <div>
                <p className="text-sm text-gray-600">Vooruit</p>
                <p className="text-2xl font-bold text-purple-600">
                  {vasteDienstAflossers.filter((a: any) => {
                    const d = getCurrentMonthData(a)
                    return d.totalDays > d.daysRequired
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {vasteDienstAflossers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen aflossers in vaste dienst</h3>
            <p className="text-gray-500">
              Er zijn momenteel geen aflossers met vaste_dienst = true in het systeem.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vasteDienstAflossers.map((aflosser: any) => {
            const data = getCurrentMonthData(aflosser)
            const progress = Math.min((data.totalDays / data.daysRequired) * 100, 100)
            const isOnTrack = data.totalDays >= data.daysRequired
            const isBehind = data.totalDays < data.daysRequired
            const isAhead = data.totalDays > data.daysRequired
            const isExpanded = expandedAflosser === aflosser.id

            return (
              <Card key={aflosser.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {aflosser.first_name?.[0]}{aflosser.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {aflosser.first_name} {aflosser.last_name}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{getNationalityFlag(aflosser.nationality)}</span>
                          <span>•</span>
                          <span>{aflosser.nationality}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isOnTrack && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {isBehind && <AlertTriangle className="w-5 h-5 text-orange-500" />}
                      {isAhead && <Plus className="w-5 h-5 text-purple-500" />}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Voortgang</span>
                      <span className="font-medium">{data.totalDays} / {data.daysRequired} dagen</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isOnTrack ? 'bg-green-500' : isBehind ? 'bg-orange-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Badge className={
                      isOnTrack ? 'bg-green-100 text-green-800' :
                      isBehind ? 'bg-orange-100 text-orange-800' :
                      'bg-purple-100 text-purple-800'
                    }>
                      {isOnTrack ? 'Op schema' : isBehind ? 'Achterstand' : 'Vooruit'}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Deze maand (uit reizen):</span>
                      <span>{data.actualDaysThisMonth} dagen</span>
                    </div>
                    {data.carryover !== 0 && (
                      <div className="flex justify-between">
                        <span>{data.carryover > 0 ? 'Meegenomen' : 'Achterstand'} vorige maand:</span>
                        <span className={data.carryover > 0 ? 'text-green-600' : 'text-orange-600'}>
                          {data.carryover > 0 ? '+' : ''}{data.carryover} dagen
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Uitklapbare opsomming per reis */}
                  <div className="border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-xs"
                      onClick={() => setExpandedAflosser(isExpanded ? null : aflosser.id)}
                    >
                      <span>Dagen per reis in deze maand</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    {isExpanded && (
                      <div className="mt-2 space-y-2 text-xs">
                        {data.monthTrips.length === 0 ? (
                          <p className="text-gray-500 italic">Geen voltooide reizen in deze maand</p>
                        ) : (
                          data.monthTrips.map((trip: any) => {
                            const days = calculateDaysFromTrip(trip)
                            const shipName = getShipName(trip.ship_id)
                            const startStr = trip.start_datum ? format(parseTripDate(trip.start_datum), 'dd-MM-yyyy', { locale: nl }) : '?'
                            const endStr = trip.eind_datum ? format(parseTripDate(trip.eind_datum), 'dd-MM-yyyy', { locale: nl }) : '?'
                            return (
                              <div
                                key={trip.id}
                                className="flex justify-between items-center py-1.5 px-2 bg-gray-50 rounded"
                              >
                                <div>
                                  <span className="font-medium">{shipName}</span>
                                  <span className="text-gray-500 ml-1">
                                    {startStr} – {endStr}
                                  </span>
                                </div>
                                <span className="font-medium text-blue-600">{days} dag{days !== 1 ? 'en' : ''}</span>
                              </div>
                            )
                          })
                        )}
                        <div className="pt-1 border-t font-medium flex justify-between">
                          <span>Totaal deze maand:</span>
                          <span>{data.actualDaysThisMonth} dagen</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {aflosser.ship_id && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center space-x-2 text-sm text-blue-700">
                        <Ship className="w-4 h-4" />
                        <span>Momenteel toegewezen aan schip</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
