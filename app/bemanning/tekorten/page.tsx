"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, ShipWheel, Users } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"

type SailingRegime = "A1" | "A2" | "B"
type CanonicalRole =
  | "schipper"
  | "tweede_kapitein"
  | "stuurman"
  | "volmatroos"
  | "matroos"
  | "lichtmatroos"
  | "deksman"

const FUTURE_LOOKAHEAD_DAYS = 15

const HORIZONS = [
  { key: "now", label: "Nu", days: 0, window: "point" as const },
  { key: "future", label: "Toekomst", days: FUTURE_LOOKAHEAD_DAYS, window: "range" as const },
] as const

const ROLE_ORDER: CanonicalRole[] = [
  "schipper",
  "tweede_kapitein",
  "stuurman",
  "volmatroos",
  "matroos",
  "lichtmatroos",
  "deksman",
]

const roleLabel: Record<CanonicalRole, string> = {
  schipper: "Schipper",
  tweede_kapitein: "2e Kapitein",
  stuurman: "Stuurman",
  volmatroos: "Volmatroos",
  matroos: "Matroos",
  lichtmatroos: "Lichtmatroos",
  deksman: "Deksman",
}

type RequirementSet = {
  label: string
  needs: CanonicalRole[]
}

function isCopiedCrewMember(member: any): boolean {
  const notePool = [
    ...(Array.isArray(member?.active_notes) ? member.active_notes : []),
    ...(Array.isArray(member?.notes) ? member.notes : []),
  ]
  return notePool.some((n: any) => {
    const content = String(n?.content || n?.text || n || "")
    return content.startsWith("COPIED_FROM:") || content.startsWith("Gekopieerd van:")
  })
}

function isPlanningEligibleCrew(member: any): boolean {
  if (!member) return false
  if (String(member.status || "").toLowerCase() === "uit-dienst") return false
  // Pure dummy niet meetellen
  if (member.is_dummy === true && !isCopiedCrewMember(member)) return false
  // Kopieen wel meetellen
  return true
}

const RULES_GT_86: Record<SailingRegime, RequirementSet[]> = {
  A1: [{ label: "A1 standaard", needs: ["schipper", "stuurman", "matroos"] }],
  A2: [{ label: "A2 standaard", needs: ["schipper", "schipper", "matroos", "deksman"] }],
  B: [
    { label: "B optie 1", needs: ["schipper", "schipper", "stuurman", "matroos", "matroos"] },
    { label: "B optie 2", needs: ["schipper", "schipper", "stuurman", "matroos", "deksman"] },
  ],
}

const RULES_PLUTO: Record<SailingRegime, RequirementSet[]> = {
  A1: [
    { label: "Pluto A1 optie 1", needs: ["schipper", "volmatroos"] },
    { label: "Pluto A1 optie 2", needs: ["schipper", "matroos", "deksman"] },
  ],
  A2: [{ label: "Pluto A2", needs: ["schipper", "schipper", "matroos"] }],
  B: [
    { label: "Pluto B optie 1", needs: ["schipper", "schipper", "matroos", "matroos"] },
    { label: "Pluto B optie 2", needs: ["schipper", "schipper", "matroos", "deksman"] },
  ],
}

function parseYmdFlexible(value?: string | null): Date | null {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }
  const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    if (isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }
  const fallback = new Date(raw)
  if (isNaN(fallback.getTime())) return null
  fallback.setHours(0, 0, 0, 0)
  return fallback
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateNl(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0")
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const yyyy = String(date.getFullYear())
  return `${dd}-${mm}-${yyyy}`
}

function normalizeRole(position: string): CanonicalRole | null {
  const p = String(position || "").trim().toLowerCase()
  if (!p) return null
  if (p === "schipper" || p === "kapitein") return "schipper"
  if (p === "2e kapitein" || p === "2e-kapitein" || p === "2e_kapitein") return "tweede_kapitein"
  if (p === "stuurman") return "stuurman"
  if (p === "vol matroos" || p === "volmatroos") return "volmatroos"
  if (p === "matroos") return "matroos"
  if (p === "lichtmatroos" || p === "licht matroos") return "lichtmatroos"
  if (p === "deksman") return "deksman"
  return null
}

function hasCaptainEquivalentDiploma(member: any): boolean {
  const pool: string[] = []
  if (Array.isArray(member?.diplomas)) {
    pool.push(...member.diplomas.map((d: any) => String(d || "")))
  }
  if (typeof member?.vaarbewijs === "string") {
    pool.push(member.vaarbewijs)
  }
  if (Array.isArray(member?.vaarbewijzen)) {
    pool.push(...member.vaarbewijzen.map((d: any) => String(d || "")))
  }

  const normalized = pool.join(" ").toLowerCase()
  return (
    normalized.includes("vaarbewijs") ||
    normalized.includes("groot vaarbewijs") ||
    normalized.includes("elbe patent") ||
    normalized.includes("elbepatent")
  )
}

function getEffectiveRole(member: any): CanonicalRole | null {
  const baseRole = normalizeRole(member?.position || "")
  if (!baseRole) return null
  // Stuurman met relevant diploma telt als schipper voor norm-check.
  if (baseRole === "stuurman" && hasCaptainEquivalentDiploma(member)) {
    return "schipper"
  }
  return baseRole
}

function roleRank(role: CanonicalRole): number {
  return ROLE_ORDER.indexOf(role)
}

function canFill(candidate: CanonicalRole, requirement: CanonicalRole): boolean {
  return roleRank(candidate) <= roleRank(requirement)
}

function evaluateSet(available: CanonicalRole[], needs: CanonicalRole[]) {
  const unused = [...available]
  const shortages: CanonicalRole[] = []
  const orderedNeeds = [...needs].sort((a, b) => roleRank(a) - roleRank(b))
  for (const req of orderedNeeds) {
    const candidateIndexes = unused
      .map((r, idx) => ({ r, idx }))
      .filter((x) => canFill(x.r, req))
      .sort((a, b) => roleRank(b.r) - roleRank(a.r))
    if (candidateIndexes.length === 0) {
      shortages.push(req)
      continue
    }
    const pick = candidateIndexes[0]
    unused.splice(pick.idx, 1)
  }
  return {
    ok: shortages.length === 0,
    shortageCount: shortages.length,
    shortages,
  }
}

function summariseShortages(shortages: CanonicalRole[]): string {
  if (shortages.length === 0) return "Geen tekorten"
  const grouped = shortages.reduce((acc, role) => {
    acc[role] = (acc[role] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  return Object.entries(grouped)
    .map(([role, count]) => `${count}x ${roleLabel[role as CanonicalRole]}`)
    .join(", ")
}

function isSickAtDate(member: any, sickLeave: any[], date: Date): boolean {
  const startOfTarget = new Date(date)
  startOfTarget.setHours(0, 0, 0, 0)
  return (sickLeave || []).some((r: any) => {
    if (r.crew_member_id !== member.id) return false
    const status = String(r.status || "").toLowerCase()
    if (status !== "actief" && status !== "wacht-op-briefje") return false
    const start = parseYmdFlexible(r.start_date)
    const end = parseYmdFlexible(r.end_date)
    if (!start) return false
    if (start > startOfTarget) return false
    if (end && end < startOfTarget) return false
    return true
  })
}

function isOnBoardAtDate(member: any, targetDate: Date): boolean {
  const status = String(member?.status || "").toLowerCase()
  const regime = String(member?.regime || "")
  if (!regime) return status === "aan-boord"
  if (regime.toLowerCase() === "altijd") return true
  if (!["1/1", "2/2", "3/3"].includes(regime)) return status === "aan-boord"

  const regimeWeeks = Number.parseInt(regime.split("/")[0], 10)
  const phaseLen = regimeWeeks * 7

  // Gebruik exact dezelfde bron als de scheepskaart: currentStatus + nextRotationDate.
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

  // Voor wisseldag tellen we beide kanten mee om overdracht zonder vals tekort te modelleren.
  if (targetDate.getTime() === nextRotationDate.getTime()) return true

  if (targetDate < nextRotationDate) {
    return currentIsOnBoard
  }

  // Na de eerstvolgende wisseldag draait de status elke phaseLen dagen om.
  const diffAfterFirstSwitch = Math.floor(
    (targetDate.getTime() - nextRotationDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const periodsAfterSwitch = Math.floor(diffAfterFirstSwitch / phaseLen)
  const switchedStatusIsOnBoard = !currentIsOnBoard
  return periodsAfterSwitch % 2 === 0 ? switchedStatusIsOnBoard : !switchedStatusIsOnBoard
}

export default function BemanningstekortenPage() {
  const { ships, crew, sickLeave, loading, error } = useSupabaseData()
  const [regimesByShipId, setRegimesByShipId] = useState<Record<string, SailingRegime>>({})
  const [expandedShipId, setExpandedShipId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shipSailingRegimes")
      if (raw) {
        const parsed = JSON.parse(raw || "{}")
        if (parsed && typeof parsed === "object") {
          setRegimesByShipId(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const results = useMemo(() => {
    const realCrew = (crew || []).filter((m: any) => isPlanningEligibleCrew(m))
    return (ships || [])
      .map((ship: any) => {
        const regime: SailingRegime = regimesByShipId[ship.id] || "A1"
        const isPluto = String(ship.name || "").toLowerCase().includes("pluto")
        const ruleSets = (isPluto ? RULES_PLUTO : RULES_GT_86)[regime]

        const perHorizon = HORIZONS.map((h) => {
          const targetDates =
            h.window === "point"
              ? [today]
              : Array.from({ length: h.days }, (_, i) => addDays(today, i + 1))

          const dailyEvaluations = targetDates.map((targetDate) => {
            const onboardMembersRaw = realCrew
              .filter((m: any) => m.ship_id === ship.id)
              .filter((m: any) => !isSickAtDate(m, sickLeave || [], targetDate))
              .filter((m: any) => isOnBoardAtDate(m, targetDate))
            const onboardRoles = onboardMembersRaw
              .map((m: any) => getEffectiveRole(m))
              .filter(Boolean) as CanonicalRole[]
            const onboardMembers = onboardMembersRaw.map((m: any) => ({
              id: m.id,
              name: `${m.first_name || ""} ${m.last_name || ""}`.trim(),
              position: m.position || "Onbekend",
            }))

            const bestRuleForDay = ruleSets
              .map((set) => ({ set, result: evaluateSet(onboardRoles, set.needs) }))
              .sort((a, b) => a.result.shortageCount - b.result.shortageCount)[0]

            return {
              targetDate,
              onboardCount: onboardRoles.length,
              onboardMembers,
              ok: bestRuleForDay.result.ok,
              shortageCount: bestRuleForDay.result.shortageCount,
              shortageText: summariseShortages(bestRuleForDay.result.shortages),
              usedRule: bestRuleForDay.set.label,
            }
          })

          const worst = dailyEvaluations.sort((a, b) => b.shortageCount - a.shortageCount)[0]
          const hasAnyRisk = dailyEvaluations.some((d) => !d.ok)
          const firstRisk = dailyEvaluations
            .filter((d) => !d.ok)
            .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())[0]

          return {
            ...h,
            onboardCount: worst.onboardCount,
            ok: !hasAnyRisk,
            shortageText: worst.shortageText,
            usedRule: worst.usedRule,
            riskDate: null,
            shortageFromDate: firstRisk ? formatDateNl(firstRisk.targetDate) : null,
            shortageFromMembers: firstRisk?.onboardMembers || [],
            shortageFromOnboardCount: firstRisk?.onboardCount || 0,
          }
        })

        return {
          ship,
          regime,
          perHorizon,
        }
      })
      .sort((a, b) => a.ship.name.localeCompare(b.ship.name, "nl"))
  }, [crew, ships, sickLeave, today, regimesByShipId])

  const overview = useMemo(() => {
    const nowRisk = results.filter((r) => !r.perHorizon.find((h: any) => h.key === "now")?.ok).length
    const futureRisk = results.filter((r) => !r.perHorizon.find((h: any) => h.key === "future")?.ok).length
    return { nowRisk, futureRisk }
  }, [results])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="text-gray-600">Bemanningstekorten laden...</div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="text-red-600">Fout: {error}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bemanningstekorten</h1>
            <p className="text-gray-600">
              Overzicht per schip voor nu en vooruitkijken (+14 / +30 dagen)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/schepen/overzicht" className="text-sm text-blue-700 hover:underline">
              Naar schepenoverzicht
            </Link>
          </div>
        </div>

        <DashboardButton />

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Risico nu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overview.nowRisk}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Risico toekomst</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{overview.futureRisk}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {results.map((entry) => (
            <Card
              key={entry.ship.id}
              className="cursor-pointer"
              onClick={() =>
                setExpandedShipId((prev) => (prev === entry.ship.id ? null : entry.ship.id))
              }
            >
              <CardHeader className="border-b bg-white/80">
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <ShipWheel className="h-5 w-5 text-gray-600" />
                    {entry.ship.name}
                  </span>
                  <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
                    Regime: {entry.regime}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {entry.perHorizon.map((h) => {
                    // Bij "Toekomst" tonen we alleen als er een tekort ontstaat
                    if (h.key === "future" && h.ok) return null
                    return (
                    <div
                      key={h.key}
                      className={`rounded-lg border p-3 ${
                        h.ok ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-medium text-gray-900">{h.label}</div>
                        <Badge
                          className={
                            h.ok
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }
                        >
                          {h.ok ? "Voldoet" : "Tekort"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Users className="h-4 w-4" />
                        {h.onboardCount} inzetbaar
                      </div>
                      <div className="mt-2 text-sm text-gray-700">
                        {h.ok ? (
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <CheckCircle2 className="h-4 w-4" /> Geen tekorten
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <AlertTriangle className="h-4 w-4" /> {h.shortageText}
                            </span>
                            {h.shortageFromDate && (
                              <div className="text-xs text-red-700">Tekort vanaf: {h.shortageFromDate}</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">Regelset: {h.usedRule}</div>
                    </div>
                    )
                  })}
                </div>

                {expandedShipId === entry.ship.id && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-2 text-sm font-semibold text-gray-900">Detail per periode</div>
                    <div className="space-y-3">
                      {entry.perHorizon
                        .filter((h: any) => !(h.key === "future" && h.ok))
                        .map((h: any) => (
                        <div key={`${entry.ship.id}-${h.key}`} className="rounded border border-gray-200 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="font-medium text-gray-900">{h.label}</div>
                            <Badge
                              className={
                                h.ok
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }
                            >
                              {h.ok ? "Voldoet" : "Tekort"}
                            </Badge>
                          </div>
                          {!h.ok ? (
                            <div className="space-y-2 text-sm text-gray-700">
                              {h.shortageFromDate && (
                                <div>
                                  <span className="font-medium">Tekort vanaf:</span> {h.shortageFromDate}
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Minimaal ontbreekt:</span> {h.shortageText}
                              </div>
                              <div>
                                <span className="font-medium">
                                  Aanwezig op {h.shortageFromDate || "tekortdatum"} ({h.shortageFromOnboardCount}):
                                </span>
                                {h.shortageFromMembers.length === 0 ? (
                                  <span> niemand</span>
                                ) : (
                                  <div className="mt-1 space-y-1">
                                    {h.shortageFromMembers.map((m: any) => (
                                      <div key={m.id} className="text-sm text-gray-700">
                                        - {m.name} ({m.position})
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-green-700">Geen tekort in deze periode.</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <MobileHeaderNav />
    </div>
  )
}

