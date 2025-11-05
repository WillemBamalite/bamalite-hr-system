"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, ArrowRight, ArrowLeft, Calendar } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { format, addDays, isAfter, isBefore } from "date-fns"

interface Props {
  crewMemberId: string
}

export function CrewMemberStatusChanges({ crewMemberId }: Props) {
  const { crew, ships } = useSupabaseData()

  // Find the crew member
  const crewMember = crew.find((member: any) => member.id === crewMemberId)

  if (!crewMember) {
    return null
  }

  const getShipName = (shipId: string) => {
    if (!shipId || shipId === "none") return "Geen schip"
    const ship = ships.find(s => s.id === shipId)
    return ship ? ship.name : "Geen schip"
  }

  // Bereken regime weken
  const getRegimeWeeks = (regime: string) => {
    switch (regime) {
      case "1/1": return { onBoard: 1, home: 1 }
      case "2/2": return { onBoard: 2, home: 2 }
      case "3/3": return { onBoard: 3, home: 3 }
      default: return { onBoard: 2, home: 2 }
    }
  }

  // Bereken toekomstige data
  const calculateFutureDates = () => {
    console.log('Calculating future dates for:', crewMember.first_name, crewMember.last_name)
    console.log('Status:', crewMember.status)
    console.log('On board since:', crewMember.on_board_since)
    console.log('Regime:', crewMember.regime)
    
    if (!crewMember.on_board_since) {
      console.log('No on_board_since date found')
      return []
    }

    const startDate = new Date(crewMember.on_board_since)
    const regime = getRegimeWeeks(crewMember.regime)
    const today = new Date()
    
    console.log('Start date:', startDate)
    console.log('Today:', today)
    console.log('Regime weeks:', regime)
    
    const futureDates = []
    let currentDate = new Date(startDate)
    
    // Bereken eerst de huidige cyclus (in weken)
    const cycleLengthWeeks = regime.onBoard + regime.home
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const weeksSinceStart = Math.floor(daysSinceStart / 7)
    const completedCycles = Math.floor(weeksSinceStart / cycleLengthWeeks)
    
    // Start vanaf de volgende cyclus (in weken)
    currentDate = addDays(startDate, completedCycles * cycleLengthWeeks * 7)
    
    console.log('Days since start:', daysSinceStart)
    console.log('Weeks since start:', weeksSinceStart)
    console.log('Completed cycles:', completedCycles)
    console.log('Current cycle start:', currentDate)
    
    // Ga door tot we toekomstige data hebben
    for (let i = 0; i < 3; i++) { // Toon 3 cycli vooruit
      const onBoardStart = new Date(currentDate)
      const onBoardEnd = addDays(currentDate, (regime.onBoard * 7) - 1)
      const homeStart = addDays(currentDate, regime.onBoard * 7)
      const homeEnd = addDays(currentDate, (regime.onBoard + regime.home) * 7 - 1)
      
      console.log(`Cycle ${i + 1}:`)
      console.log('  On board:', onBoardStart, 'to', onBoardEnd)
      console.log('  Home:', homeStart, 'to', homeEnd)
      
      // Voeg toekomstige data toe
      if (isAfter(onBoardStart, today)) {
        futureDates.push({
          date: onBoardStart,
          action: "Aan boord gaan",
          ship: getShipName(crewMember.ship_id),
          type: "aan-boord-future",
          endDate: onBoardEnd
        })
        console.log('Added future on board:', onBoardStart)
      }
      
      if (isAfter(homeStart, today)) {
        futureDates.push({
          date: homeStart,
          action: "Naar huis gaan",
          ship: getShipName(crewMember.ship_id),
          type: "thuis-future",
          endDate: homeEnd
        })
        console.log('Added future home:', homeStart)
      }
      
      // Ga naar volgende cyclus
      currentDate = addDays(currentDate, cycleLengthWeeks * 7)
    }
    
    console.log('Total future dates found:', futureDates.length)
    return futureDates
  }

  // Genereer status wijzigingen
  const statusChanges: Array<{
    date: Date | string
    action: string
    ship: string
    type: string
    endDate?: Date
  }> = []
  
  // Huidige/verleden data
  if (crewMember.on_board_since) {
    statusChanges.push({
      date: crewMember.on_board_since,
      action: "Aan boord gegaan",
      ship: getShipName(crewMember.ship_id),
      type: "aan-boord-past"
    })
  }
  
  if (crewMember.thuis_sinds) {
    statusChanges.push({
      date: crewMember.thuis_sinds,
      action: "Naar huis gegaan",
      ship: getShipName(crewMember.ship_id),
      type: "thuis-past"
    })
  }

  // Toekomstige data
  const futureDates = calculateFutureDates()
  statusChanges.push(...futureDates)

  // Sorteer op datum (eerst komende eerst)
  statusChanges.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  console.log('Total status changes:', statusChanges.length)
  console.log('Status changes:', statusChanges)

  const getStatusIcon = (type: string) => {
    switch (type) {
      case "aan-boord-past":
      case "aan-boord-future":
        return <ArrowRight className="w-3 h-3 text-green-600" />
      case "thuis-past":
      case "thuis-future":
        return <ArrowLeft className="w-3 h-3 text-blue-600" />
      default:
        return <Clock className="w-3 h-3 text-gray-600" />
    }
  }

  const getStatusBadge = (type: string) => {
    const isFuture = type.includes("future")
    const isOnBoard = type.includes("aan-boord")
    
    if (isFuture) {
      return (
        <Badge className={isOnBoard ? "bg-green-50 text-green-700 text-xs border-green-200" : "bg-blue-50 text-blue-700 text-xs border-blue-200"}>
          {isOnBoard ? "Aan boord" : "Thuis"} (Gepland)
        </Badge>
      )
    } else {
      return (
        <Badge className={isOnBoard ? "bg-green-100 text-green-800 text-xs" : "bg-blue-100 text-blue-800 text-xs"}>
          {isOnBoard ? "Aan boord" : "Thuis"}
        </Badge>
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <Clock className="w-5 h-5" />
          <span>Status Wijzigingen</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {statusChanges.length > 0 ? (
          <div className="space-y-3">
            {statusChanges.map((change, index) => (
              <div key={index} className={`flex items-center space-x-3 p-2 rounded-lg ${
                change.type.includes("future") ? "bg-blue-50 border border-blue-100" : "bg-gray-50"
              }`}>
                <div className="flex-shrink-0">
                  {getStatusIcon(change.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{change.action}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {change.ship}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(change.date), 'dd-MM-yyyy')}
                    {change.endDate && (
                      <span className="ml-1">
                        - {format(new Date(change.endDate), 'dd-MM-yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                {getStatusBadge(change.type)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4 text-sm">
            Nog geen status wijzigingen geregistreerd
          </div>
        )}
      </CardContent>
    </Card>
  )
} 