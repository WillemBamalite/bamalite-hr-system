"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Ship, Users, CheckCircle, Clock, UserX, Cake, AlertTriangle, AlertCircle } from "lucide-react"
import { ShipOverview } from "@/components/ship-overview"
import { CrewQuickActions } from "@/components/crew/crew-quick-actions"
import { DashboardStats } from "@/components/dashboard-stats"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useShipVisits } from "@/hooks/use-ship-visits"
import { useLanguage } from "@/contexts/LanguageContext"
import { useState, useEffect, useMemo } from "react"
import { format, isToday } from "date-fns"

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  
  // Gebruik Supabase data
  const { ships, crew, sickLeave, incidents, tasks, loading, error } = useSupabaseData()
  const { getShipsNotVisitedInDays, visits } = useShipVisits()

  // Check voor proeftijd aflopend (dag 70 = nog 20 dagen)
  const probationEnding = useMemo(() => {
    if (!crew || crew.length === 0) return []
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return crew.filter((member: any) => {
      if (member.is_dummy || member.is_aflosser || !member.in_dienst_vanaf) return false
      
      const startDate = new Date(member.in_dienst_vanaf)
      startDate.setHours(0, 0, 0, 0)
      
      const diffTime = today.getTime() - startDate.getTime()
      const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      // Dag 70 = nog 20 dagen tot einde proeftijd
      return daysSinceStart === 70
    }).map((member: any) => ({
      ...member,
      daysRemaining: 20
    }))
  }, [crew])

  // Check voor verjaardagen
  const birthdaysToday = useMemo(() => {
    if (!crew || crew.length === 0) return []
    
    const today = new Date()
    const todayMonth = today.getMonth() + 1 // JavaScript months are 0-based
    const todayDay = today.getDate()
    
    return crew.filter((member: any) => {
      // Dummy's hebben geen verjaardag
      if (member.is_dummy === true) return false
      if (!member.birth_date) return false
      
      try {
        // Parse birth date (kan verschillende formaten hebben)
        const birthDate = new Date(member.birth_date)
        const birthMonth = birthDate.getMonth() + 1
        const birthDay = birthDate.getDate()
        
        // Check of maand en dag overeenkomen
        return birthMonth === todayMonth && birthDay === todayDay
      } catch {
        return false
      }
    })
  }, [crew])

  // Helper: Get A/B designation from crew member notes
  const getCrewABDesignation = (member: any): 'A' | 'B' | null => {
    if (!member.active_notes) return null
    const abNote = member.active_notes.find((n: any) => 
      n.content?.startsWith('CREW_AB_DESIGNATION:')
    )
    if (abNote) {
      const designation = abNote.content.replace('CREW_AB_DESIGNATION:', '').trim() as 'A' | 'B'
      return (designation === 'A' || designation === 'B') ? designation : null
    }
    return null
  }

  // Bepaal welke ploeg op een schip zit
  const getPloegForShip = (shipId: string): 'A' | 'B' | null => {
    if (!crew || !shipId) return null
    
    const shipCrew = crew.filter((c: any) => 
      c.ship_id === shipId && 
      c.status === 'aan-boord' && 
      !c.is_dummy && 
      !c.is_aflosser
    )
    
    if (shipCrew.length === 0) return null
    
    const ploegACount = shipCrew.filter((c: any) => getCrewABDesignation(c) === 'A').length
    const ploegBCount = shipCrew.filter((c: any) => getCrewABDesignation(c) === 'B').length
    
    if (ploegACount > ploegBCount) return 'A'
    if (ploegBCount > ploegACount) return 'B'
    
    const firstDesignation = getCrewABDesignation(shipCrew[0])
    return firstDesignation
  }

  // Bepaal welke ploegen nog niet bezocht zijn of >50 dagen geleden bezocht zijn
  const getUnvisitedPloegen = (shipId: string): ('A' | 'B')[] => {
    if (!visits) return ['A', 'B']
    
    const shipVisits = visits.filter((v: any) => v.ship_id === shipId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const unvisited: ('A' | 'B')[] = []
    
    // Check Ploeg A
    const visitsA = shipVisits.filter((v: any) => v.ploeg === 'A').sort((a: any, b: any) => 
      new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
    )
    const lastVisitA = visitsA[0]
    if (!lastVisitA) {
      unvisited.push('A')
    } else {
      const visitDateA = new Date(lastVisitA.visit_date)
      visitDateA.setHours(0, 0, 0, 0)
      const diffDaysA = Math.floor((today.getTime() - visitDateA.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDaysA >= 50) {
        unvisited.push('A')
      }
    }
    
    // Check Ploeg B
    const visitsB = shipVisits.filter((v: any) => v.ploeg === 'B').sort((a: any, b: any) => 
      new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
    )
    const lastVisitB = visitsB[0]
    if (!lastVisitB) {
      unvisited.push('B')
    } else {
      const visitDateB = new Date(lastVisitB.visit_date)
      visitDateB.setHours(0, 0, 0, 0)
      const diffDaysB = Math.floor((today.getTime() - visitDateB.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDaysB >= 50) {
        unvisited.push('B')
      }
    }
    
    return unvisited
  }

  // Check voor schepen die langer dan 50 dagen niet bezocht zijn
  const shipsNotVisited50Days = useMemo(() => {
    if (!ships || ships.length === 0) return []
    return getShipsNotVisitedInDays(50, ships)
  }, [ships, getShipsNotVisitedInDays])

  // Check voor lopende incidenten
  const openIncidents = useMemo(() => {
    if (!incidents || incidents.length === 0) return []
    return incidents.filter((i: any) => i.status === 'open' || i.status === 'in_behandeling')
  }, [incidents])

  // Urgente taken (blijven in meldingen tot opgelost of prioriteit lager is)
  const urgentTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return []
    return tasks.filter((task: any) =>
      task.priority === 'urgent' &&
      task.status !== 'completed' &&
      task.completed !== true
    )
  }, [tasks])

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto py-8">
          <div className="text-center py-8 text-gray-500">{t('loading')}...</div>
        </main>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto py-8">
          <div className="text-center py-8 text-gray-500">{t('loading')} data...</div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto py-8">
          <div className="text-center py-8 text-red-500">{t('error')}: {error}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full py-8 px-4">
        {/* Proeftijd melding */}
        {probationEnding.length > 0 && (
          <Alert className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-base font-medium">
              ⚠️ Let op! De proefperiode van{" "}
              {probationEnding.map((member: any, index: number) => (
                <span key={member.id}>
                  <strong>
                    {member.first_name} {member.last_name}
                  </strong>
                  {index < probationEnding.length - 1 && ", "}
                  {index === probationEnding.length - 2 && " en "}
                </span>
              ))}{" "}
              verloopt over 20 dagen.
            </AlertDescription>
          </Alert>
        )}

        {/* Verjaardagsmelding */}
        {birthdaysToday.length > 0 && (
          <Alert className="mb-6 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
            <Cake className="h-5 w-5 text-pink-600" />
            <AlertDescription className="text-base font-medium">
              🎉{" "}
              {birthdaysToday.map((member: any, index: number) => (
                <span key={member.id}>
                  <strong>
                    {member.first_name} {member.last_name}
                  </strong>
                  {index < birthdaysToday.length - 1 && ", "}
                  {index === birthdaysToday.length - 2 && " en "}
                </span>
              ))}{" "}
              {birthdaysToday.length === 1 ? "is" : "zijn"} vandaag jarig! 🎂
            </AlertDescription>
          </Alert>
        )}

        {/* Urgente taken */}
        {urgentTasks.length > 0 && (
          <Alert className="mb-6 bg-gradient-to-r from-red-50 to-red-100 border-red-300">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-base font-medium">
              🚨 Er {urgentTasks.length === 1 ? 'staat' : 'staan'}{" "}
              <strong>{urgentTasks.length}</strong> taak{urgentTasks.length === 1 ? '' : 'en'} met{" "}
              <strong>prioriteit URGENT</strong> open.
              <ul className="mt-3 space-y-1 text-sm">
                {urgentTasks.slice(0, 5).map((task: any) => (
                  <li key={task.id} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                    <div>
                      <div className="font-semibold">
                        {task.title}
                        {task.assigned_to && (
                          <span className="ml-1 text-xs text-gray-600">
                            – toegewezen aan {task.assigned_to}
                          </span>
                        )}
                      </div>
                      {task.deadline && (
                        <div className="text-xs text-gray-600">
                          Deadline:{" "}
                          {format(new Date(task.deadline), 'dd-MM-yyyy')}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {urgentTasks.length > 5 && (
                  <li className="text-xs text-gray-600">
                    +{urgentTasks.length - 5} extra urgente taak{urgentTasks.length - 5 === 1 ? '' : 'en'} – bekijk alle taken in het takenoverzicht.
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Scheepsbezoek melding */}
        {shipsNotVisited50Days.length > 0 && (
          <Alert className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-base font-medium">
              ⚠️ Let op! De volgende schepen zijn langer dan 50 dagen niet bezocht:
              <ul className="list-disc list-inside mt-2">
                {shipsNotVisited50Days.map((ship: any) => {
                  const unvisitedPloegen = getUnvisitedPloegen(ship.id)

                  if (unvisitedPloegen.length === 2) {
                    // Check of beide nog nooit bezocht zijn of beide >50 dagen
                    const shipVisits = visits?.filter((v: any) => v.ship_id === ship.id) || []
                    const hasAnyVisit = shipVisits.length > 0

                    if (!hasAnyVisit) {
                      return (
                        <li key={ship.id}>
                          <strong>{ship.name}</strong> (Ploeg A en Ploeg B nog nooit bezocht)
                        </li>
                      )
                    } else {
                      return (
                        <li key={ship.id}>
                          <strong>{ship.name}</strong> (Ploeg A en Ploeg B langer dan 50 dagen niet bezocht)
                        </li>
                      )
                    }
                  } else if (unvisitedPloegen.length === 1) {
                    // Check of deze ploeg nog nooit bezocht is
                    const shipVisits =
                      visits?.filter((v: any) => v.ship_id === ship.id && v.ploeg === unvisitedPloegen[0]) || []
                    const hasVisit = shipVisits.length > 0

                    if (!hasVisit) {
                      return (
                        <li key={ship.id}>
                          <strong>{ship.name}</strong> (Ploeg {unvisitedPloegen[0]} nog nooit bezocht)
                        </li>
                      )
                    } else {
                      return (
                        <li key={ship.id}>
                          <strong>{ship.name}</strong> (Ploeg {unvisitedPloegen[0]} langer dan 50 dagen niet bezocht)
                        </li>
                      )
                    }
                  }

                  // Fallback (zou niet moeten voorkomen)
                  return (
                    <li key={ship.id}>
                      <strong>{ship.name}</strong>
                    </li>
                  )
                })}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        
        {/* Single column flow: stats → quick actions → ships */}
        <div className="grid grid-cols-1 gap-6">
          {/* Stats */}
          <DashboardStats />

          {/* Snelle acties als knoppen direct onder de kaarten */}
          <CrewQuickActions />

          {/* Schepen overzicht */}
          <ShipOverview />
        </div>
      </main>
    </div>
  )
}
