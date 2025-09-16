"use client"

import { useState, useEffect } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { BackButton } from "@/components/ui/back-button"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInDays, parseISO, isWithinInterval } from "date-fns"
import { nl } from "date-fns/locale"
import { CalendarDays, AlertTriangle, CheckCircle, Plus, Ship } from "lucide-react"

export default function VasteDienstPage() {
  const { crew, loading, error } = useSupabaseData()
  const [mounted, setMounted] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Laden...</div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Fout: {error}</div>
      </div>
    )
  }

  // Filter aflossers in vaste dienst
  const vasteDienstAflossers = crew.filter((member: any) => {
    if (member.position !== "Aflosser") return false
    
    // Check localStorage for vaste dienst info
    if (typeof window !== 'undefined') {
      const vasteDienstInfo = localStorage.getItem(`vaste_dienst_info_${member.id}`)
      try {
        const data = vasteDienstInfo ? JSON.parse(vasteDienstInfo) : null
        return !!(data && data.in_vaste_dienst)
      } catch { return false }
    }
    
    return false
  })

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

  // Calculate days worked in current month based on ship assignments
  const calculateDaysWorked = (aflosser: any) => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    
    // Get assignment history from localStorage
    let assignmentHistory: any[] = []
    if (typeof window !== 'undefined') {
      const assignmentHistoryKey = `assignment_history_${aflosser.id}`
      assignmentHistory = JSON.parse(localStorage.getItem(assignmentHistoryKey) || '[]')
    }

    // Filter assignments that overlap with current month
    const relevantAssignments = assignmentHistory.filter((assignment: any) => {
      if (assignment.type !== "assignment") return false
      
      const assignmentStart = parseISO(assignment.start_date)
      const assignmentEnd = assignment.end_date ? parseISO(assignment.end_date) : monthEnd
      
      // Check if assignment overlaps with current month
      return (
        (assignmentStart <= monthEnd && assignmentEnd >= monthStart) ||
        (assignmentStart >= monthStart && assignmentStart <= monthEnd)
      )
    })

    let totalDays = 0

    relevantAssignments.forEach((assignment: any) => {
      const assignmentStart = parseISO(assignment.start_date)
      const assignmentEnd = assignment.end_date ? parseISO(assignment.end_date) : monthEnd
      
      // Calculate overlap with current month
      const effectiveStart = assignmentStart > monthStart ? assignmentStart : monthStart
      const effectiveEnd = assignmentEnd < monthEnd ? assignmentEnd : monthEnd
      
      if (effectiveStart <= effectiveEnd) {
        const daysInAssignment = differenceInDays(effectiveEnd, effectiveStart) + 1
        totalDays += daysInAssignment
      }
    })

    return totalDays
  }

  // Calculate carryover from previous month
  const calculateCarryover = (aflosser: any) => {
    const previousMonth = subMonths(currentMonth, 1)
    const previousMonthStart = startOfMonth(previousMonth)
    const previousMonthEnd = endOfMonth(previousMonth)
    
    // Get assignment history from localStorage
    let assignmentHistory: any[] = []
    if (typeof window !== 'undefined') {
      const assignmentHistoryKey = `assignment_history_${aflosser.id}`
      assignmentHistory = JSON.parse(localStorage.getItem(assignmentHistoryKey) || '[]')
    }

    // Filter assignments that overlap with previous month
    const relevantAssignments = assignmentHistory.filter((assignment: any) => {
      if (assignment.type !== "assignment") return false
      
      const assignmentStart = parseISO(assignment.start_date)
      const assignmentEnd = assignment.end_date ? parseISO(assignment.end_date) : previousMonthEnd
      
      return (
        (assignmentStart <= previousMonthEnd && assignmentEnd >= previousMonthStart) ||
        (assignmentStart >= previousMonthStart && assignmentStart <= previousMonthEnd)
      )
    })

    let previousMonthDays = 0

    relevantAssignments.forEach((assignment: any) => {
      const assignmentStart = parseISO(assignment.start_date)
      const assignmentEnd = assignment.end_date ? parseISO(assignment.end_date) : previousMonthEnd
      
      const effectiveStart = assignmentStart > previousMonthStart ? assignmentStart : previousMonthStart
      const effectiveEnd = assignmentEnd < previousMonthEnd ? assignmentEnd : previousMonthEnd
      
      if (effectiveStart <= effectiveEnd) {
        const daysInAssignment = differenceInDays(effectiveEnd, effectiveStart) + 1
        previousMonthDays += daysInAssignment
      }
    })

    return previousMonthDays - 15 // Difference from required 15 days
  }

  // Get current month data with carryover
  const getCurrentMonthData = (aflosser: any) => {
    const daysWorked = calculateDaysWorked(aflosser)
    const carryover = calculateCarryover(aflosser)
    const totalDays = Math.max(0, daysWorked + carryover)
    
    return {
      daysWorked: totalDays,
      daysRequired: 15,
      carryover: carryover,
      actualDaysThisMonth: daysWorked
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <BackButton />
      <DashboardButton />

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vaste Dienst Overzicht</h1>
          <p className="text-gray-600">Automatische berekening van vaste dienst dagen op basis van schip toewijzingen</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            ← Vorige maand
          </Button>
          <div className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy', { locale: nl })}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            Volgende maand →
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
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
              <div className="w-5 h-5 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Op schema</p>
                <p className="text-2xl font-bold text-green-600">
                  {vasteDienstAflossers.filter((aflosser: any) => {
                    const data = getCurrentMonthData(aflosser)
                    return data.daysWorked >= data.daysRequired
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-orange-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Achterstand</p>
                <p className="text-2xl font-bold text-orange-600">
                  {vasteDienstAflossers.filter((aflosser: any) => {
                    const data = getCurrentMonthData(aflosser)
                    return data.daysWorked < data.daysRequired
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-purple-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Vooruit</p>
                <p className="text-2xl font-bold text-purple-600">
                  {vasteDienstAflossers.filter((aflosser: any) => {
                    const data = getCurrentMonthData(aflosser)
                    return data.daysWorked > data.daysRequired
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vaste Dienst Aflossers */}
      {vasteDienstAflossers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen aflossers in vaste dienst</h3>
            <p className="text-gray-500">Er zijn momenteel geen aflossers die in vaste dienst werken.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vasteDienstAflossers.map((aflosser: any) => {
            const data = getCurrentMonthData(aflosser)
            const progress = Math.min((data.daysWorked / data.daysRequired) * 100, 100)
            const isOnTrack = data.daysWorked >= data.daysRequired
            const isBehind = data.daysWorked < data.daysRequired
            const isAhead = data.daysWorked > data.daysRequired

            return (
              <Card key={aflosser.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {aflosser.first_name[0]}{aflosser.last_name[0]}
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
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Voortgang</span>
                      <span className="font-medium">{data.daysWorked} / {data.daysRequired} dagen</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isOnTrack ? 'bg-green-500' : isBehind ? 'bg-orange-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    <Badge className={
                      isOnTrack ? 'bg-green-100 text-green-800' :
                      isBehind ? 'bg-orange-100 text-orange-800' :
                      'bg-purple-100 text-purple-800'
                    }>
                      {isOnTrack ? 'Op schema' : isBehind ? 'Achterstand' : 'Vooruit'}
                    </Badge>
                  </div>

                  {/* Breakdown */}
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Deze maand:</span>
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

                  {/* Current Assignment Info */}
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