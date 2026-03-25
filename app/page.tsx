"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Ship, Users, CheckCircle, Clock, UserX, Cake, AlertTriangle, AlertCircle, Award, Mail, CheckCircle2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ShipOverview } from "@/components/ship-overview"
import { CrewQuickActions } from "@/components/crew/crew-quick-actions"
import { DashboardStats } from "@/components/dashboard-stats"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useShipVisits } from "@/hooks/use-ship-visits"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useMemo } from "react"
import { format, isToday, isPast, startOfDay } from "date-fns"
import Link from "next/link"

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
  const { toast } = useToast();
  
  // Gebruik Supabase data
  const { ships, crew, sickLeave, incidents, tasks, loading, error, loadData } = useSupabaseData()
  const { getShipsNotVisitedInDays, visits } = useShipVisits()

  // Check voor proeftijd aflopend (dag 70 = nog 20 dagen)
  const probationEnding = useMemo(() => {
    if (!crew || crew.length === 0) return []
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return crew.filter((member: any) => {
      if (member.status === 'uit-dienst') return false
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
      if (member.status === 'uit-dienst') return false
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

  // Dienstjubilea in de komende 7 dagen (5,10,15,20,25,30 jaar en vanaf 30 elk jaar)
  const upcomingWorkAnniversaries = useMemo(() => {
    if (!crew || crew.length === 0) return []

    const today = startOfDay(new Date())
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 6) // vandaag + 6 = totaal 7 dagen (0..6)
    const MS_PER_DAY = 24 * 60 * 60 * 1000

    const results: {
      member: any
      years: number
      daysUntil: number
    }[] = []

    crew.forEach((member: any) => {
      if (member.status === 'uit-dienst') return
      if (member.is_dummy === true) return
      if (!member.in_dienst_vanaf) return

      let start: Date
      try {
        start = new Date(member.in_dienst_vanaf)
        if (isNaN(start.getTime())) return
        start.setHours(0, 0, 0, 0)
      } catch {
        return
      }

      // Zoek eerstvolgend relevant jubileum binnen de komende 7 dagen
      for (let years = 5; years <= 60; years++) {
        const isMilestone = years < 30 ? years % 5 === 0 : true
        if (!isMilestone) continue

        const anniversaryDate = new Date(start)
        anniversaryDate.setFullYear(start.getFullYear() + years)
        anniversaryDate.setHours(0, 0, 0, 0)

        if (anniversaryDate < today) {
          continue
        }
        if (anniversaryDate > maxDate) {
          break
        }

        const daysUntil = Math.round((anniversaryDate.getTime() - today.getTime()) / MS_PER_DAY)
        if (daysUntil >= 0 && daysUntil <= 6) {
          results.push({ member, years, daysUntil })
          break
        }
      }
    })

    // Sorteer op dagen tot jubileum, daarna op naam
    results.sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
      const nameA = `${a.member.last_name || ""} ${a.member.first_name || ""}`.toLowerCase()
      const nameB = `${b.member.last_name || ""} ${b.member.first_name || ""}`.toLowerCase()
      return nameA.localeCompare(nameB)
    })

    return results
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

  // Meldingen staan nu op de pagina /meldingen (en in de header-bel).

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
