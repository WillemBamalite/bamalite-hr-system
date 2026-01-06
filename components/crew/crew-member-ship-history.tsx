"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ship, Calendar, Clock, ArrowRight, ArrowLeft } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { format, differenceInDays, isPast, isToday, addDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from "date-fns"
import { nl } from "date-fns/locale"
import { calculateCurrentStatus } from "@/utils/regime-calculator"

interface Props {
  crewMemberId: string
}

export function CrewMemberShipHistory({ crewMemberId }: Props) {
  const { crew, ships } = useSupabaseData()

  // Find the crew member
  const crewMember = crew.find((member: any) => member.id === crewMemberId)

  if (!crewMember) {
    return null
  }

  const getShipName = (shipId: string) => {
    if (!shipId || shipId === "none") return "Geen schip"
    const ship = ships.find(s => s.id === shipId)
    return ship ? ship.name : "Onbekend schip"
  }

  // Reconstruct history from available data
  const historyEntries: Array<{
    ship_id: string
    ship_name: string
    start_date: string
    end_date?: string
    status: 'aan-boord' | 'thuis' | 'ziek'
    isCurrent: boolean
    source: 'assignment_history' | 'current' | 'reconstructed'
  }> = []

  // 1. Add entries from assignment_history if available
  if (crewMember.assignment_history && Array.isArray(crewMember.assignment_history)) {
    crewMember.assignment_history.forEach((entry: any) => {
      if (entry.ship_id && entry.date) {
        historyEntries.push({
          ship_id: entry.ship_id,
          ship_name: getShipName(entry.ship_id),
          start_date: entry.date,
          end_date: entry.end_date,
          status: entry.action === 'aan-boord' ? 'aan-boord' : 'thuis',
          isCurrent: false,
          source: 'assignment_history'
        })
      }
    })
  }

  // 2. Add current assignment if person has a ship
  if (crewMember.ship_id && crewMember.ship_id !== 'none') {
    const currentStartDate = crewMember.on_board_since || crewMember.thuis_sinds || crewMember.created_at
    
    // Check if we already have this in assignment_history
    const alreadyInHistory = historyEntries.some(entry => 
      entry.ship_id === crewMember.ship_id && 
      entry.start_date === currentStartDate
    )

    if (!alreadyInHistory && currentStartDate) {
      historyEntries.push({
        ship_id: crewMember.ship_id,
        ship_name: getShipName(crewMember.ship_id),
        start_date: currentStartDate,
        end_date: undefined, // Current, so no end date
        status: crewMember.status === 'ziek' ? 'ziek' : 
                crewMember.status === 'aan-boord' ? 'aan-boord' : 'thuis',
        isCurrent: true,
        source: 'current'
      })
    }
  }

  // Helper function to calculate rotations for a period
  const calculateRotations = (startDate: string, regime: string, isCurrent: boolean, initialStatus?: 'aan-boord' | 'thuis') => {
    if (!regime || regime === 'Altijd' || regime === '' || regime === 'Onbekend') {
      return []
    }

    const rotations: Array<{
      date: string
      status: 'aan-boord' | 'thuis'
      isPast: boolean
    }> = []

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const regimeWeeks = parseInt(regime.split('/')[0])
    const phaseLen = regimeWeeks * 7 // days per phase

    // Determine initial status based on on_board_since or thuis_sinds
    let isOnBoard = initialStatus === 'aan-boord' || initialStatus === undefined
    
    // If we have on_board_since, start with aan boord
    if (crewMember.on_board_since && format(new Date(crewMember.on_board_since), 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd')) {
      isOnBoard = true
    } else if (crewMember.thuis_sinds && format(new Date(crewMember.thuis_sinds), 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd')) {
      isOnBoard = false
    }

    let currentDate = new Date(start)
    const endDate = isCurrent ? today : (today > start ? today : start)
    
    // Add initial rotation
    if (currentDate <= endDate) {
      rotations.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        status: isOnBoard ? 'aan-boord' : 'thuis',
        isPast: currentDate < today
      })
    }
    
    // Calculate subsequent rotations
    while (currentDate < endDate) {
      currentDate = addDays(currentDate, phaseLen)
      isOnBoard = !isOnBoard
      
      if (currentDate <= endDate) {
        rotations.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          status: isOnBoard ? 'aan-boord' : 'thuis',
          isPast: currentDate < today
        })
      }
    }

    return rotations
  }

  // 3. Sort by date (newest first)
  historyEntries.sort((a, b) => {
    const dateA = new Date(a.start_date).getTime()
    const dateB = new Date(b.start_date).getTime()
    return dateB - dateA // Newest first
  })

  // Group by ship
  const historyByShip = historyEntries.reduce((acc: any, entry) => {
    if (!acc[entry.ship_id]) {
      acc[entry.ship_id] = {
        ship_id: entry.ship_id,
        ship_name: entry.ship_name,
        periods: []
      }
    }
    acc[entry.ship_id].periods.push(entry)
    return acc
  }, {})

  const getStatusBadge = (status: string, isCurrent: boolean) => {
    const baseClasses = "text-xs font-medium"
    
    if (isCurrent) {
      switch (status) {
        case 'aan-boord':
          return (
            <Badge className={`${baseClasses} bg-green-100 text-green-800 border-green-300 border`}>
              🟢 Huidig - Aan boord
            </Badge>
          )
        case 'thuis':
          return (
            <Badge className={`${baseClasses} bg-blue-100 text-blue-800 border-blue-300 border`}>
              🔵 Huidig - Thuis
            </Badge>
          )
        case 'ziek':
          return (
            <Badge className={`${baseClasses} bg-red-100 text-red-800 border-red-300 border`}>
              🔴 Huidig - Ziek
            </Badge>
          )
        default:
          return (
            <Badge className={`${baseClasses} bg-green-100 text-green-800 border-green-300 border`}>
              Huidig
            </Badge>
          )
      }
    }
    
    switch (status) {
      case 'aan-boord':
        return (
          <Badge className={`${baseClasses} bg-blue-100 text-blue-800 border-blue-300 border`}>
            Aan boord
          </Badge>
        )
      case 'thuis':
        return (
          <Badge className={`${baseClasses} bg-gray-100 text-gray-800 border-gray-300 border`}>
            Thuis
          </Badge>
        )
      case 'ziek':
        return (
          <Badge className={`${baseClasses} bg-red-100 text-red-800 border-red-300 border`}>
            Ziek
          </Badge>
        )
      default:
        return null
    }
  }

  const formatPeriod = (startDate: string, endDate?: string) => {
    const start = format(new Date(startDate), 'dd MMM yyyy', { locale: nl })
    
    if (!endDate) {
      return start
    }
    
    const end = format(new Date(endDate), 'dd MMM yyyy', { locale: nl })
    return `${start} - ${end}`
  }

  const getDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date()
    const days = differenceInDays(end, start)
    
    if (days < 30) {
      return `${days} ${days === 1 ? 'dag' : 'dagen'}`
    } else if (days < 365) {
      const months = Math.floor(days / 30)
      return `${months} ${months === 1 ? 'maand' : 'maanden'}`
    } else {
      const years = Math.floor(days / 365)
      const remainingMonths = Math.floor((days % 365) / 30)
      if (remainingMonths > 0) {
        return `${years} ${years === 1 ? 'jaar' : 'jaren'} en ${remainingMonths} ${remainingMonths === 1 ? 'maand' : 'maanden'}`
      }
      return `${years} ${years === 1 ? 'jaar' : 'jaren'}`
    }
  }

  // Generate 12-month timeline
  const generate12MonthTimeline = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const twelveMonthsAgo = subMonths(today, 12)
    twelveMonthsAgo.setDate(1) // Start of month

    // Get all rotations for the last 12 months
    const timelineEntries: Array<{
      date: Date
      status: 'aan-boord' | 'thuis' | 'ziek'
      ship_id: string
      ship_name: string
    }> = []

    // For each ship period, calculate all rotations
    Object.values(historyByShip).forEach((shipHistory: any) => {
          shipHistory.periods.forEach((period: any) => {
        const startDate = new Date(period.start_date)
        startDate.setHours(0, 0, 0, 0)
        
        // Only include if period overlaps with last 12 months
        if (startDate <= today) {
          const rotations = calculateRotations(
            period.start_date,
            crewMember.regime || '2/2',
            period.isCurrent,
            period.status
          )

          rotations.forEach(rotation => {
            const rotationDate = new Date(rotation.date)
            if (rotationDate >= twelveMonthsAgo && rotationDate <= today) {
              timelineEntries.push({
                date: rotationDate,
                status: rotation.status,
                ship_id: shipHistory.ship_id,
                ship_name: shipHistory.ship_name
              })
            }
          })
        }
      })
    })

    // Sort by date
    timelineEntries.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Group by month
    const months: { [key: string]: typeof timelineEntries } = {}
    let currentMonth = new Date(twelveMonthsAgo)
    
    while (currentMonth <= today) {
      const monthKey = format(currentMonth, 'yyyy-MM')
      months[monthKey] = []
      currentMonth = addDays(endOfMonth(currentMonth), 1)
    }

    timelineEntries.forEach(entry => {
      const monthKey = format(entry.date, 'yyyy-MM')
      if (months[monthKey]) {
        months[monthKey].push(entry)
      }
    })

    return months
  }

  const monthlyTimeline = generate12MonthTimeline()
  const hasTimelineData = Object.values(monthlyTimeline).some(entries => entries.length > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <Ship className="w-5 h-5" />
          <span>Scheepsgeschiedenis - Laatste 12 maanden</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasTimelineData ? (
          <div className="space-y-4">
            {Object.entries(monthlyTimeline)
              .sort((a, b) => b[0].localeCompare(a[0])) // Newest first
              .map(([monthKey, entries]) => {
                if (entries.length === 0) return null
                
                const monthDate = new Date(monthKey + '-01')
                const monthName = format(monthDate, 'MMMM yyyy', { locale: nl })
                
                return (
                  <div key={monthKey} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-base capitalize">
                        {monthName}
                      </h3>
                    </div>
                    
                    <div className="space-y-2">
                      {entries.map((entry, index) => {
                        const isTodayEntry = format(entry.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        const nextEntry = entries[index + 1]
                        const endDate = nextEntry ? nextEntry.date : (entry.status === 'aan-boord' ? addDays(entry.date, 14) : addDays(entry.date, 14))
                        
                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-3 p-2 rounded ${
                              entry.status === 'aan-boord'
                                ? isTodayEntry
                                  ? 'bg-green-100 border border-green-300'
                                  : 'bg-green-50 border border-green-200'
                                : isTodayEntry
                                  ? 'bg-blue-100 border border-blue-300'
                                  : 'bg-blue-50 border border-blue-200'
                            }`}
                          >
                            {entry.status === 'aan-boord' ? (
                              <ArrowRight className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <ArrowLeft className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {format(entry.date, 'dd MMM', { locale: nl })}
                                </span>
                                {isTodayEntry && (
                                  <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                    Vandaag
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {entry.ship_name} • {entry.status === 'aan-boord' ? 'Aan boord' : 'Thuis'}
                                {nextEntry && (
                                  <span className="ml-1">
                                    tot {format(nextEntry.date, 'dd MMM', { locale: nl })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge
                              className={`text-xs ${
                                entry.status === 'aan-boord'
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : 'bg-blue-100 text-blue-800 border-blue-300'
                              }`}
                            >
                              {entry.status === 'aan-boord' ? '🟢 Aan boord' : '🔵 Thuis'}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8 text-sm">
            <Ship className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Geen geschiedenis beschikbaar voor de laatste 12 maanden</p>
            <p className="text-xs mt-2 text-gray-400">
              De geschiedenis wordt automatisch bijgehouden wanneer iemand van schip wisselt
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

