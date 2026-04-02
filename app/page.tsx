"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect, useMemo } from "react"
import { format, isToday, isPast, startOfDay } from "date-fns"
import Link from "next/link"
import { calculateCurrentStatus } from "@/utils/regime-calculator"

type SailingRegime = "A1" | "A2" | "B"
type CanonicalRole =
  | "schipper"
  | "tweede_kapitein"
  | "stuurman"
  | "volmatroos"
  | "matroos"
  | "lichtmatroos"
  | "deksman"

const DASHBOARD_FUTURE_DAYS = 15
const ROLE_ORDER: CanonicalRole[] = [
  "schipper",
  "tweede_kapitein",
  "stuurman",
  "volmatroos",
  "matroos",
  "lichtmatroos",
  "deksman",
]

const ROLE_LABEL: Record<CanonicalRole, string> = {
  schipper: "Schipper",
  tweede_kapitein: "2e Kapitein",
  stuurman: "Stuurman",
  volmatroos: "Volmatroos",
  matroos: "Matroos",
  lichtmatroos: "Lichtmatroos",
  deksman: "Deksman",
}

const RULES_GT_86: Record<SailingRegime, CanonicalRole[][]> = {
  A1: [["schipper", "stuurman", "matroos"]],
  A2: [["schipper", "schipper", "matroos", "deksman"]],
  B: [
    ["schipper", "schipper", "stuurman", "matroos", "matroos"],
    ["schipper", "schipper", "stuurman", "matroos", "deksman"],
  ],
}
const RULES_PLUTO: Record<SailingRegime, CanonicalRole[][]> = {
  A1: [
    ["schipper", "volmatroos"],
    ["schipper", "matroos", "deksman"],
  ],
  A2: [["schipper", "schipper", "matroos"]],
  B: [
    ["schipper", "schipper", "matroos", "matroos"],
    ["schipper", "schipper", "matroos", "deksman"],
  ],
}

const parseYmdFlexible = (value?: string | null): Date | null => {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null
  const iso = raw.match(/^\d{4}-\d{2}-\d{2}$/)
  if (iso) {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }
  const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    if (isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }
  const fallback = new Date(raw)
  if (isNaN(fallback.getTime())) return null
  fallback.setHours(0, 0, 0, 0)
  return fallback
}

const addDays = (base: Date, days: number): Date => {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d
}

const formatDateNl = (date: Date): string =>
  `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`

const normalizeRole = (position: string): CanonicalRole | null => {
  const p = String(position || "").trim().toLowerCase()
  if (p === "schipper" || p === "kapitein") return "schipper"
  if (p === "2e kapitein" || p === "2e-kapitein" || p === "2e_kapitein") return "tweede_kapitein"
  if (p === "stuurman") return "stuurman"
  if (p === "vol matroos" || p === "volmatroos") return "volmatroos"
  if (p === "matroos") return "matroos"
  if (p === "lichtmatroos" || p === "licht matroos") return "lichtmatroos"
  if (p === "deksman") return "deksman"
  return null
}

const isCopiedCrewMember = (member: any): boolean => {
  const notePool = [
    ...(Array.isArray(member?.active_notes) ? member.active_notes : []),
    ...(Array.isArray(member?.notes) ? member.notes : []),
  ]
  return notePool.some((n: any) => {
    const content = String(n?.content || n?.text || n || "")
    return content.startsWith("COPIED_FROM:") || content.startsWith("Gekopieerd van:")
  })
}

const hasCaptainEquivalentDiploma = (member: any): boolean => {
  const pool: string[] = []
  if (Array.isArray(member?.diplomas)) pool.push(...member.diplomas.map((d: any) => String(d || "")))
  if (typeof member?.vaarbewijs === "string") pool.push(member.vaarbewijs)
  if (Array.isArray(member?.vaarbewijzen)) pool.push(...member.vaarbewijzen.map((d: any) => String(d || "")))
  const normalized = pool.join(" ").toLowerCase()
  return (
    normalized.includes("vaarbewijs") ||
    normalized.includes("groot vaarbewijs") ||
    normalized.includes("elbe patent") ||
    normalized.includes("elbepatent")
  )
}

const getEffectiveRole = (member: any): CanonicalRole | null => {
  const baseRole = normalizeRole(member?.position || "")
  if (!baseRole) return null
  if (baseRole === "stuurman" && hasCaptainEquivalentDiploma(member)) return "schipper"
  return baseRole
}

const roleRank = (r: CanonicalRole) => ROLE_ORDER.indexOf(r)
const canFill = (candidate: CanonicalRole, requirement: CanonicalRole) => roleRank(candidate) <= roleRank(requirement)

const evaluateNeedSet = (available: CanonicalRole[], needs: CanonicalRole[]) => {
  const unused = [...available]
  const shortages: CanonicalRole[] = []
  const orderedNeeds = [...needs].sort((a, b) => roleRank(a) - roleRank(b))
  for (const req of orderedNeeds) {
    const candidateIndexes = unused
      .map((r, idx) => ({ r, idx }))
      .filter((x) => canFill(x.r, req))
      .sort((a, b) => roleRank(b.r) - roleRank(a.r))
    if (candidateIndexes.length === 0) shortages.push(req)
    else unused.splice(candidateIndexes[0].idx, 1)
  }
  return shortages
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  const [expandedShortageShipId, setExpandedShortageShipId] = useState<string | null>(null)
  const { role } = useAuth()
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

  const shortageHighlights = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureDates = Array.from({ length: DASHBOARD_FUTURE_DAYS }, (_, i) => addDays(today, i + 1))

    let shipRegimes: Record<string, SailingRegime> = {}
    if (typeof window !== "undefined") {
      try {
        shipRegimes = JSON.parse(localStorage.getItem("shipSailingRegimes") || "{}")
      } catch {
        shipRegimes = {}
      }
    }

    const planningCrew = (crew || []).filter((m: any) => {
      if (!m) return false
      if (String(m.status || "").toLowerCase() === "uit-dienst") return false
      if (m.is_dummy === true && !isCopiedCrewMember(m)) return false
      return true
    })

    const isSickAtDate = (member: any, date: Date) => {
      const t0 = new Date(date)
      t0.setHours(0, 0, 0, 0)
      return (sickLeave || []).some((r: any) => {
        if (r.crew_member_id !== member.id) return false
        const status = String(r.status || "").toLowerCase()
        if (status !== "actief" && status !== "wacht-op-briefje") return false
        const start = parseYmdFlexible(r.start_date)
        const end = parseYmdFlexible(r.end_date)
        if (!start) return false
        if (start > t0) return false
        if (end && end < t0) return false
        return true
      })
    }

    const isOnBoardAtDate = (member: any, targetDate: Date) => {
      const status = String(member?.status || "").toLowerCase()
      const regime = String(member?.regime || "")
      if (!regime) return status === "aan-boord"
      if (regime.toLowerCase() === "altijd") return true
      if (!["1/1", "2/2", "3/3"].includes(regime)) return status === "aan-boord"

      const regimeWeeks = Number.parseInt(regime.split("/")[0], 10)
      const phaseLen = regimeWeeks * 7
      const currentCalc = calculateCurrentStatus(
        regime as "1/1" | "2/2" | "3/3" | "Altijd",
        member?.thuis_sinds || null,
        member?.on_board_since || null,
        status === "ziek",
        member?.expected_start_date || null
      )
      const nextRotationDate = parseYmdFlexible(currentCalc.nextRotationDate || null)
      const currentIsOnBoard = currentCalc.currentStatus === "aan-boord"
      if (!nextRotationDate) return currentIsOnBoard
      if (targetDate.getTime() === nextRotationDate.getTime()) return true
      if (targetDate < nextRotationDate) return currentIsOnBoard
      const diffAfterFirstSwitch = Math.floor(
        (targetDate.getTime() - nextRotationDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const periodsAfterSwitch = Math.floor(diffAfterFirstSwitch / phaseLen)
      const switchedStatusIsOnBoard = !currentIsOnBoard
      return periodsAfterSwitch % 2 === 0 ? switchedStatusIsOnBoard : !switchedStatusIsOnBoard
    }

    return (ships || [])
      .map((ship: any) => {
        const regime: SailingRegime = shipRegimes[ship.id] || "A1"
        const isPluto = String(ship.name || "").toLowerCase().includes("pluto")
        const ruleSets = (isPluto ? RULES_PLUTO : RULES_GT_86)[regime]

        const dayChecks = futureDates.map((date) => {
          const roles = planningCrew
            .filter((m: any) => m.ship_id === ship.id)
            .filter((m: any) => !isSickAtDate(m, date))
            .filter((m: any) => isOnBoardAtDate(m, date))
            .map((m: any) => getEffectiveRole(m))
            .filter(Boolean) as CanonicalRole[]

          const bestShortages = ruleSets
            .map((needs) => evaluateNeedSet(roles, needs))
            .sort((a, b) => a.length - b.length)[0]
          return { date, shortages: bestShortages }
        })

        const firstShortage = dayChecks.find((d) => d.shortages.length > 0)
        if (!firstShortage) return null

        const onboardAtShortage = planningCrew
          .filter((m: any) => m.ship_id === ship.id)
          .filter((m: any) => !isSickAtDate(m, firstShortage.date))
          .filter((m: any) => isOnBoardAtDate(m, firstShortage.date))
          .map((m: any) => ({
            id: m.id,
            name: `${m.first_name || ""} ${m.last_name || ""}`.trim(),
            position: m.position || "Onbekend",
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name, "nl"))

        const grouped = firstShortage.shortages.reduce((acc, role) => {
          acc[role] = (acc[role] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        const shortageText = Object.entries(grouped)
          .map(([role, count]) => `${count}x ${ROLE_LABEL[role as CanonicalRole]}`)
          .join(", ")

        return {
          shipId: ship.id,
          shipName: ship.name,
          regime,
          fromDate: formatDateNl(firstShortage.date),
          fromDateTs: firstShortage.date.getTime(),
          shortageText,
          onboardAtShortage,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        return (a.fromDateTs || 0) - (b.fromDateTs || 0)
      })
  }, [ships, crew, sickLeave])

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

          {/* Snelle acties alleen voor full admins */}
          {role === "admin_full" && <CrewQuickActions />}

          {/* Uitgelicht: schepen met toekomstig tekort (alleen full admins) */}
          {role === "admin_full" && <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Tekorten in de toekomst</h3>
              <Badge className="bg-red-100 text-red-800 border border-red-200">
                {shortageHighlights.length} schip{shortageHighlights.length === 1 ? "" : "pen"}
              </Badge>
            </div>
            {shortageHighlights.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-sm text-gray-600">
                  Geen tekorten in de komende {DASHBOARD_FUTURE_DAYS} dagen.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {shortageHighlights.map((s: any) => (
                  <div key={s.shipId} className="block">
                    <Card
                      className="h-full border-red-200 bg-red-50/40 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() =>
                        setExpandedShortageShipId((prev) => (prev === s.shipId ? null : s.shipId))
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-gray-900">{s.shipName}</div>
                            <div className="text-xs text-gray-600">Regime: {s.regime}</div>
                          </div>
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        </div>
                        <div className="mt-2 text-sm text-red-700">Tekort vanaf: {s.fromDate}</div>
                        <div className="mt-1 text-sm text-gray-700">{s.shortageText}</div>
                        {expandedShortageShipId === s.shipId && (
                          <div className="mt-3 border-t border-red-200 pt-3 space-y-2">
                            <div className="text-xs text-gray-700">
                              Minimaal ontbreekt: <span className="font-medium">{s.shortageText}</span>
                            </div>
                            <div className="text-xs text-gray-700">
                              Aan boord op {s.fromDate} ({(s.onboardAtShortage || []).length}):
                            </div>
                            {Array.isArray(s.onboardAtShortage) && s.onboardAtShortage.length > 0 ? (
                              <div className="space-y-1">
                                {s.onboardAtShortage.map((m: any) => (
                                  <div key={m.id} className="text-xs text-gray-700">
                                    - {m.name} ({m.position})
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600">Niemand</div>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                const el = document.getElementById(`ship-${s.shipId}`)
                                if (el) {
                                  el.scrollIntoView({ behavior: "smooth", block: "start" })
                                }
                              }}
                            >
                              Ga naar schip in overzicht
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>}

          {/* Schepen overzicht */}
          <ShipOverview />
        </div>
      </main>
    </div>
  )
}
