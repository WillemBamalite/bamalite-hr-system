"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  // Urgente taken en taken met verlopen deadline (blijven in meldingen tot opgelost)
  const urgentTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return []
    const today = startOfDay(new Date())
    
    return tasks.filter((task: any) => {
      // Taak moet niet voltooid zijn
      if (task.status === 'completed' || task.completed === true) return false
      
      // Check of taak urgent is
      if (task.priority === 'urgent') return true
      
      // Check of taak een verlopen deadline heeft
      if (task.deadline) {
        const deadlineDate = startOfDay(new Date(task.deadline))
        if (isPast(deadlineDate) || isToday(deadlineDate)) {
          return true
        }
      }
      
      return false
    })
  }, [tasks])

  // Ziektebriefjes die over 3 dagen verlopen (en waar nog geen e-mail is verstuurd)
  const expiringCertificates = useMemo(() => {
    if (!sickLeave || sickLeave.length === 0) return []
    const today = startOfDay(new Date())
    
    return sickLeave
      .filter((record: any) => {
        // Moet actief zijn en een certificate_valid_until hebben
        if (!record.certificate_valid_until) return false
        if (record.status !== 'actief' && record.status !== 'wacht-op-briefje') return false
        
        // Als er al een e-mail is verstuurd, toon niet in notificaties
        if (record.expiry_email_sent_at) return false
        
        const validUntil = new Date(record.certificate_valid_until)
        validUntil.setHours(0, 0, 0, 0)
        
        // Bereken dagen tot expiratie
        const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        // Precies 3 dagen van tevoren
        return daysUntilExpiry === 3
      })
      .map((record: any) => {
        const crewMember = crew.find((c: any) => c.id === record.crew_member_id)
        const validUntil = new Date(record.certificate_valid_until)
        validUntil.setHours(0, 0, 0, 0)
        
        return {
          ...record,
          crewMember,
          expiryDate: validUntil,
          daysUntilExpiry: 3
        }
      })
      .filter((record: any) => record.crewMember) // Alleen records met crew member
  }, [sickLeave, crew])

  // State voor e-mail bevestigingsdialoog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [selectedSickLeave, setSelectedSickLeave] = useState<any>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Functie om e-mail te versturen
  const handleSendCertificateEmail = async () => {
    if (!selectedSickLeave || !selectedSickLeave.crewMember) return
    
    setSendingEmail(true)
    try {
      const crewName = `${selectedSickLeave.crewMember.first_name} ${selectedSickLeave.crewMember.last_name}`
      const expiryDate = selectedSickLeave.expiryDate.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      const expiryDateForPDF = selectedSickLeave.expiryDate.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })

      const response = await fetch('/api/send-certificate-expiry-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crewName,
          expiryDate,
          expiryDateForPDF,
          daysUntilExpiry: 3,
          recipientEmail: selectedSickLeave.crewMember.email,
          sickLeaveId: selectedSickLeave.id
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Toon success melding
        toast({
          title: "E-mail verstuurd",
          description: `Herinneringse-mail succesvol verstuurd naar ${crewName}`,
        })
        
        // Refresh de data zodat de notificatie verdwijnt
        await loadData()
        setEmailDialogOpen(false)
        setSelectedSickLeave(null)
        setSendingEmail(false)
      } else {
        toast({
          title: "Fout bij versturen e-mail",
          description: result.error || 'Onbekende fout',
          variant: "destructive"
        })
        setSendingEmail(false)
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: "Fout bij versturen e-mail",
        description: error instanceof Error ? error.message : 'Onbekende fout',
        variant: "destructive"
      })
      setSendingEmail(false)
    }
  }

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

        {/* Dienstjubilea melding voor komende 7 dagen */}
        {upcomingWorkAnniversaries.length > 0 && (
          <Alert className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <Award className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-base font-medium">
              🎖️ De komende 7 dagen zijn er dienstjubilea:
              <ul className="mt-2 space-y-1 text-sm">
                {upcomingWorkAnniversaries.map((item, index) => (
                  <li key={`${item.member.id}-${item.years}-${index}`}>
                    {item.daysUntil === 0
                      ? "Vandaag is "
                      : `Over ${item.daysUntil} dagen is `}
                    <strong>
                      {item.member.first_name} {item.member.last_name}
                    </strong>{" "}
                    {item.years} jaar in dienst.
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Ziektebriefjes die over 3 dagen verlopen */}
        {expiringCertificates.length > 0 && (
          <Alert className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription>
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-medium">
                  ⚠️ Ziektebriefjes die over 3 dagen verlopen:
                </span>
              </div>
              <ul className="space-y-2 mt-2">
                {expiringCertificates.map((record: any) => {
                  const crewName = `${record.crewMember.first_name} ${record.crewMember.last_name}`
                  const expiryDate = record.expiryDate.toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                  
                  return (
                    <li key={record.id} className="flex items-center justify-between bg-white p-3 rounded border border-orange-200">
                      <div>
                        <strong>{crewName}</strong>
                        <span className="text-sm text-gray-600 ml-2">
                          - Verloopt op: {expiryDate}
                        </span>
                        {record.crewMember.email && (
                          <span className="text-xs text-gray-500 block mt-1">
                            E-mail: {record.crewMember.email}
                          </span>
                        )}
                      </div>
                      {record.crewMember.email ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSickLeave(record)
                            setEmailDialogOpen(true)
                          }}
                          className="ml-4"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          E-mail versturen
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-500 ml-4">Geen e-mailadres</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Urgente taken en taken met verlopen deadline */}
        {urgentTasks.length > 0 && (() => {
          const today = startOfDay(new Date())
          const urgentOnly = urgentTasks.filter((t: any) => t.priority === 'urgent')
          const expiredDeadline = urgentTasks.filter((t: any) => {
            if (t.priority === 'urgent') return false
            if (!t.deadline) return false
            const deadlineDate = startOfDay(new Date(t.deadline))
            return isPast(deadlineDate) || isToday(deadlineDate)
          })
          
          return (
            <Alert className="mb-6 bg-gradient-to-r from-red-50 to-red-100 border-red-300">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-base font-medium">
                🚨 Er {urgentTasks.length === 1 ? 'is' : 'zijn'}{" "}
                <strong>{urgentTasks.length}</strong>{" "}
                {urgentTasks.length === 1
                  ? "taak die aandacht vereist:"
                  : "taken die aandacht vereisen:"}
                {urgentOnly.length > 0 && (
                  <span className="ml-1">
                    <strong>{urgentOnly.length}</strong> met prioriteit URGENT
                  </span>
                )}
                {urgentOnly.length > 0 && expiredDeadline.length > 0 && (
                  <span> en </span>
                )}
                {expiredDeadline.length > 0 && (
                  <span className="ml-1">
                    <strong>{expiredDeadline.length}</strong> met verlopen deadline
                  </span>
                )}
                <ul className="mt-3 space-y-1 text-sm">
                  {urgentTasks.map((task: any) => {
                    const isUrgent = task.priority === 'urgent'
                    const hasExpiredDeadline = task.deadline && (isPast(startOfDay(new Date(task.deadline))) || isToday(startOfDay(new Date(task.deadline))))
                    
                    return (
                      <li key={task.id} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                        <Link 
                          href={`/taken?taskId=${task.id}`}
                          className="flex-1 hover:bg-red-50 rounded p-1 -m-1 transition-colors cursor-pointer"
                        >
                          <div>
                            <div className="font-semibold">
                              {task.title}
                              {isUrgent && (
                                <span className="ml-1 text-xs font-bold text-red-600">[URGENT]</span>
                              )}
                              {!isUrgent && hasExpiredDeadline && (
                                <span className="ml-1 text-xs font-bold text-orange-600">[DEADLINE VERLOPEN]</span>
                              )}
                              {task.assigned_to && (
                                <span className="ml-1 text-xs text-gray-600">
                                  – toegewezen aan {task.assigned_to}
                                </span>
                              )}
                            </div>
                            {task.deadline && (
                              <div className={`text-xs ${hasExpiredDeadline ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                Deadline:{" "}
                                {format(new Date(task.deadline), 'dd-MM-yyyy')}
                                {hasExpiredDeadline && !isUrgent && (
                                  <span className="ml-1">(verlopen)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </AlertDescription>
            </Alert>
          )
        })()}

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

        {/* E-mail bevestigingsdialoog */}
        <AlertDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>E-mail versturen</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedSickLeave && selectedSickLeave.crewMember && (
                  <>
                    Weet je zeker dat je een e-mail wilt versturen naar{' '}
                    <strong>
                      {selectedSickLeave.crewMember.first_name}{' '}
                      {selectedSickLeave.crewMember.last_name}
                    </strong>
                    ?
                    <br />
                    <br />
                    De e-mail bevat een herinnering dat het ziektebriefje over 3 dagen verloopt
                    en een ingevulde PDF met informatie over het verlengen van het ziektebriefje.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={sendingEmail}>Nee</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSendCertificateEmail}
                disabled={sendingEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sendingEmail ? 'Verzenden...' : 'Ja, versturen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
