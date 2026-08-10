"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import {
  fetchSchepenKlad,
  saveSchepenKlad,
  subscribeSchepenKlad,
} from "@/lib/schepen-klad"
import { isExcludedFromAssignmentPool } from "@/utils/crew-filters"
import { getNationalityFlag } from "@/utils/nationality-display"
import { isOverigPersoneelShipId } from "@/utils/ship-constants"
import {
  calculateCurrentStatus,
  parseLocalDate,
} from "@/utils/regime-calculator"
import { CheckCircle, ChevronDown, ChevronRight, Clock, Maximize2, RotateCcw, Ship, UserX, X } from "lucide-react"

const UNASSIGNED_KEY = "__unassigned__"

type ColumnKey = "aan-boord" | "thuis" | "afwezig"

type Placement = {
  shipId: string
  column: ColumnKey
}

const RANK_ORDER: Record<string, number> = {
  Kapitein: 1,
  Schipper: 1,
  "2e kapitein": 2,
  Stuurman: 3,
  "Vol Matroos": 4,
  Matroos: 5,
  Lichtmatroos: 6,
  "Licht Matroos": 6,
  Deksman: 7,
}

function hasRealShip(member: any): boolean {
  const shipId = member?.ship_id
  if (!shipId || shipId === "none" || shipId === "") return false
  if (isOverigPersoneelShipId(shipId)) return false
  return true
}

function isEligibleKladCrew(member: any): boolean {
  if (!member) return false
  if (isExcludedFromAssignmentPool(member)) return false
  if (String(member.recruitment_status || "").toLowerCase() !== "aangenomen") return false
  if (isOverigPersoneelShipId(member.ship_id)) return false
  return true
}

function memberName(member: any): string {
  return `${member?.first_name || ""} ${member?.last_name || ""}`.trim() || "Onbekend"
}

function sortByRank(members: any[]): any[] {
  return [...members].sort((a, b) => {
    const rankA = RANK_ORDER[String(a.position || "")] || 999
    const rankB = RANK_ORDER[String(b.position || "")] || 999
    if (rankA !== rankB) return rankA - rankB
    return memberName(a).localeCompare(memberName(b), "nl")
  })
}

function isSickOrAbsentMember(member: any): boolean {
  const status = String(member?.status || "").toLowerCase()
  const pool = String(member?.pool_availability_status || "").toLowerCase()
  return status === "ziek" || status === "afwezig" || pool === "ziek" || pool === "afwezig"
}

type KladHealthOverride = "ziek" | "beter"

function isSickInKlad(
  member: any,
  healthOverrides: Record<string, KladHealthOverride>
): boolean {
  const override = healthOverrides[String(member?.id || "")]
  if (override === "ziek") return true
  if (override === "beter") return false
  return isSickOrAbsentMember(member)
}

/** Nog in te delen: gezonde eerst, zieken/afwezig onderaan; daarbinnen op rang. */
function sortUnassignedPool(
  members: any[],
  healthOverrides: Record<string, KladHealthOverride> = {}
): any[] {
  return [...members].sort((a, b) => {
    const sickA = isSickInKlad(a, healthOverrides) ? 1 : 0
    const sickB = isSickInKlad(b, healthOverrides) ? 1 : 0
    if (sickA !== sickB) return sickA - sickB
    const rankA = RANK_ORDER[String(a.position || "")] || 999
    const rankB = RANK_ORDER[String(b.position || "")] || 999
    if (rankA !== rankB) return rankA - rankB
    return memberName(a).localeCompare(memberName(b), "nl")
  })
}

function isDateAfterReference(dateString: string | null | undefined, referenceYmd: string): boolean {
  if (!dateString) return false
  try {
    return parseLocalDate(dateString).getTime() > parseLocalDate(referenceYmd).getTime()
  } catch {
    return false
  }
}

function isUnavailable(member: any, sickLeave: any[]): boolean {
  if (!member) return false
  if (member.status === "afwezig" || member.status === "ziek") return true
  const pool = String(member?.pool_availability_status || "").toLowerCase()
  if (pool === "ziek" || pool === "afwezig") return true
  return (sickLeave || []).some(
    (record: any) =>
      String(record.crew_member_id) === String(member.id) &&
      (record.status === "actief" || record.status === "wacht-op-briefje")
  )
}

function getInitialColumn(member: any, sickLeave: any[], asOfDate: string): ColumnKey {
  if (isUnavailable(member, sickLeave)) return "afwezig"
  if (member.expected_start_date && isDateAfterReference(member.expected_start_date, asOfDate)) {
    return "thuis"
  }
  if (!member.regime) {
    if (member.status === "aan-boord") return "aan-boord"
    return "thuis"
  }
  const rotation = calculateCurrentStatus(
    member.regime as "1/1" | "2/2" | "3/3" | "Altijd",
    member.thuis_sinds || null,
    member.on_board_since || null,
    member.status === "ziek",
    member.expected_start_date || null,
    asOfDate
  )
  return rotation.currentStatus === "aan-boord" ? "aan-boord" : "thuis"
}

function buildInitialPlacements(
  crew: any[],
  sickLeave: any[],
  asOfDate: string
): Record<string, Placement> {
  const next: Record<string, Placement> = {}
  for (const member of crew) {
    if (!isEligibleKladCrew(member)) continue
    const id = String(member.id)
    if (hasRealShip(member)) {
      next[id] = {
        shipId: String(member.ship_id),
        column: getInitialColumn(member, sickLeave, asOfDate),
      }
    } else {
      next[id] = {
        shipId: UNASSIGNED_KEY,
        column: "thuis",
      }
    }
  }
  return next
}

function placementsEqual(a?: Placement, b?: Placement): boolean {
  if (!a || !b) return false
  return a.shipId === b.shipId && a.column === b.column
}

function parseDropKey(dropKey: string): Placement | null {
  if (dropKey === UNASSIGNED_KEY) {
    return { shipId: UNASSIGNED_KEY, column: "thuis" }
  }
  const [shipId, column] = dropKey.split("::")
  if (!shipId || !column) return null
  if (column !== "aan-boord" && column !== "thuis" && column !== "afwezig") return null
  return { shipId, column }
}

const KLAD_STORAGE_KEY = "bamalite.schepen-klad.v1"

type KladStoragePayload = {
  placements: Record<string, Placement>
  originals?: Record<string, Placement>
  onBoardFromDates: Record<string, string>
  healthOverrides: Record<string, KladHealthOverride>
  kladDate?: string
  savedAt: string
}

function isValidKladDate(value: any): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Bij peildatum-wijziging: handmatige klad-moves behouden, rest volgt regime. */
function rematerializeForDate(
  prevPlacements: Record<string, Placement>,
  prevOriginals: Record<string, Placement>,
  newLive: Record<string, Placement>
): Record<string, Placement> {
  const next: Record<string, Placement> = {}
  for (const id of Object.keys(newLive)) {
    const wasMoved =
      prevPlacements[id] &&
      prevOriginals[id] &&
      !placementsEqual(prevPlacements[id], prevOriginals[id])
    next[id] = wasMoved ? prevPlacements[id] : newLive[id]
  }
  return next
}

function isValidPlacement(value: any): value is Placement {
  if (!value || typeof value !== "object") return false
  if (typeof value.shipId !== "string" || !value.shipId) return false
  return value.column === "aan-boord" || value.column === "thuis" || value.column === "afwezig"
}

function isValidHealthOverride(value: any): value is KladHealthOverride {
  return value === "ziek" || value === "beter"
}

function loadKladFromStorage(): KladStoragePayload | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(KLAD_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    const placementsRaw = parsed.placements || {}
    const originalsRaw = parsed.originals || {}
    const datesRaw = parsed.onBoardFromDates || {}
    const healthRaw = parsed.healthOverrides || {}
    const placements: Record<string, Placement> = {}
    for (const [id, value] of Object.entries(placementsRaw)) {
      if (isValidPlacement(value)) placements[id] = value
    }
    const originals: Record<string, Placement> = {}
    for (const [id, value] of Object.entries(originalsRaw)) {
      if (isValidPlacement(value)) originals[id] = value
    }
    const onBoardFromDates: Record<string, string> = {}
    for (const [id, value] of Object.entries(datesRaw)) {
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        onBoardFromDates[id] = value
      }
    }
    const healthOverrides: Record<string, KladHealthOverride> = {}
    for (const [id, value] of Object.entries(healthRaw)) {
      if (isValidHealthOverride(value)) healthOverrides[id] = value
    }
    return {
      placements,
      originals,
      onBoardFromDates,
      healthOverrides,
      kladDate: isValidKladDate(parsed.kladDate) ? parsed.kladDate : undefined,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
    }
  } catch {
    return null
  }
}

function saveKladToStorage(
  placements: Record<string, Placement>,
  originals: Record<string, Placement>,
  onBoardFromDates: Record<string, string>,
  healthOverrides: Record<string, KladHealthOverride>,
  kladDate: string
) {
  if (typeof window === "undefined") return
  try {
    const payload: KladStoragePayload = {
      placements,
      originals,
      onBoardFromDates,
      healthOverrides,
      kladDate,
      savedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(KLAD_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode errors
  }
}

function clearKladStorage() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(KLAD_STORAGE_KEY)
  } catch {
    // ignore
  }
}

function mergePlacementsWithLive(
  stored: Record<string, Placement>,
  live: Record<string, Placement>
): Record<string, Placement> {
  const next: Record<string, Placement> = {}
  for (const id of Object.keys(live)) {
    next[id] = stored[id] || live[id]
  }
  return next
}

function pruneDates(
  dates: Record<string, string>,
  placements: Record<string, Placement>
): Record<string, string> {
  const next: Record<string, string> = {}
  for (const [id, date] of Object.entries(dates)) {
    if (!placements[id]) continue
    next[id] = date
  }
  return next
}

function pruneHealthOverrides(
  overrides: Record<string, KladHealthOverride>,
  placements: Record<string, Placement>
): Record<string, KladHealthOverride> {
  const next: Record<string, KladHealthOverride> = {}
  for (const [id, value] of Object.entries(overrides)) {
    if (!placements[id]) continue
    next[id] = value
  }
  return next
}

function formatOnBoardFrom(raw?: string | null): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ""
  const [y, m, d] = raw.split("-")
  return `${d}-${m}-${y}`
}

function todayInputValue(): string {
  return format(new Date(), "yyyy-MM-dd")
}

function CrewScratchCard({
  member,
  moved,
  isUnassigned,
  onBoardFrom,
  healthOverride,
  ships,
  onDragStart,
  onMove,
  onEditOnBoardFrom,
  onSetHealth,
}: {
  member: any
  moved: boolean
  isUnassigned: boolean
  onBoardFrom?: string | null
  healthOverride?: KladHealthOverride | null
  ships: any[]
  onDragStart: (crewId: string) => void
  onMove: (crewId: string, placement: Placement) => void
  onEditOnBoardFrom: (crewId: string) => void
  onSetHealth: (crewId: string, health: KladHealthOverride) => void
}) {
  const healthOverridesForCheck: Record<string, KladHealthOverride> = healthOverride
    ? { [String(member.id)]: healthOverride }
    : {}
  const isSick = isSickInKlad(member, healthOverridesForCheck)
  const crewId = String(member.id)
  const dateLabel = formatOnBoardFrom(onBoardFrom)
  const dateCaption = isUnassigned ? "In te delen voor" : "Aan boord vanaf"

  const shipsByCompany = useMemo(() => {
    const groups: Record<string, any[]> = {}
    for (const ship of ships) {
      const company = String(ship.company || "Overig")
      if (!groups[company]) groups[company] = []
      groups[company].push(ship)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "nl"))
  }, [ships])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", crewId)
            e.dataTransfer.effectAllowed = "move"
            onDragStart(crewId)
          }}
          onDragEnd={() => onDragStart("")}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onEditOnBoardFrom(crewId)
          }}
          className={`cursor-grab active:cursor-grabbing rounded border bg-white px-2 py-1.5 shadow-sm select-none ${
            moved ? "border-amber-400 ring-1 ring-amber-200" : "border-slate-200"
          } ${isSick ? "bg-red-50/70" : ""}`}
          title={`Dubbelklik voor ${dateCaption.toLowerCase()}-datum · rechtermuisklik om te verplaatsen`}
        >
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold leading-tight text-slate-900">
              {memberName(member)}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-600">
              {member.position || "Onbekend"} · {getNationalityFlag(member.nationality)}
            </div>
            {healthOverride === "ziek" && (
              <div className="mt-1 text-[10px] font-medium text-red-700">Ziek (klad)</div>
            )}
            {dateLabel && (
              <div className="mt-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                {dateCaption} {dateLabel}
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64 max-h-[70vh] overflow-y-auto">
        <ContextMenuLabel>Verplaatsen: {memberName(member)}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onSetHealth(crewId, "ziek")}>
          Ziek melden
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onSetHealth(crewId, "beter")}>
          Beter melden
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => onMove(crewId, { shipId: UNASSIGNED_KEY, column: "thuis" })}
        >
          Nog in te delen
        </ContextMenuItem>
        <ContextMenuSeparator />
        {shipsByCompany.map(([company, companyShips]) => (
          <div key={company}>
            <ContextMenuLabel className="text-[11px] text-slate-500">{company}</ContextMenuLabel>
            {companyShips.map((ship: any) => (
              <ContextMenuSub key={ship.id}>
                <ContextMenuSubTrigger>{ship.name || "Schip"}</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-44">
                  <ContextMenuItem
                    onSelect={() =>
                      onMove(crewId, { shipId: String(ship.id), column: "aan-boord" })
                    }
                  >
                    Aan boord
                  </ContextMenuItem>
                  <ContextMenuItem
                    onSelect={() => onMove(crewId, { shipId: String(ship.id), column: "thuis" })}
                  >
                    Thuis
                  </ContextMenuItem>
                  <ContextMenuItem
                    onSelect={() =>
                      onMove(crewId, { shipId: String(ship.id), column: "afwezig" })
                    }
                  >
                    Ziek / afwezig
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            ))}
          </div>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}

function DropZone({
  dropKey,
  title,
  icon,
  tone,
  members,
  originals,
  placements,
  onBoardFromDates,
  healthOverrides,
  ships,
  isOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStartCard,
  onMove,
  onEditOnBoardFrom,
  onSetHealth,
}: {
  dropKey: string
  title: string
  icon: ReactNode
  tone: "green" | "blue" | "red" | "slate"
  members: any[]
  originals: Record<string, Placement>
  placements: Record<string, Placement>
  onBoardFromDates: Record<string, string>
  healthOverrides: Record<string, KladHealthOverride>
  ships: any[]
  isOver: boolean
  onDragOver: (key: string) => void
  onDragLeave: () => void
  onDrop: (key: string, crewIdFromTransfer?: string) => void
  onDragStartCard: (crewId: string) => void
  onMove: (crewId: string, placement: Placement) => void
  onEditOnBoardFrom: (crewId: string) => void
  onSetHealth: (crewId: string, health: KladHealthOverride) => void
}) {
  const toneClasses = {
    green: {
      title: "text-green-700",
      badge: "bg-green-100 text-green-800",
      over: "border-green-400 bg-green-50/80",
      idle: "border-green-100 bg-green-50/30",
    },
    blue: {
      title: "text-blue-700",
      badge: "bg-blue-100 text-blue-800",
      over: "border-blue-400 bg-blue-50/80",
      idle: "border-blue-100 bg-blue-50/30",
    },
    red: {
      title: "text-red-700",
      badge: "bg-red-100 text-red-800",
      over: "border-red-400 bg-red-50/80",
      idle: "border-red-100 bg-red-50/30",
    },
    slate: {
      title: "text-slate-700",
      badge: "bg-slate-100 text-slate-800",
      over: "border-slate-400 bg-slate-100",
      idle: "border-slate-200 bg-white",
    },
  }[tone]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <h5 className={`text-xs font-semibold ${toneClasses.title}`}>{title}</h5>
        <Badge className={`${toneClasses.badge} text-[10px] px-1.5 py-0`}>{members.length}</Badge>
      </div>
      <div
        className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-md border border-dashed p-1.5 transition-colors ${
          isOver ? toneClasses.over : toneClasses.idle
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "move"
          onDragOver(dropKey)
        }}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault()
          onDrop(dropKey, e.dataTransfer.getData("text/plain") || undefined)
        }}
      >
        {members.length === 0 ? (
          <div className="px-1 py-3 text-center text-[11px] text-slate-400">Sleep hierheen</div>
        ) : (
          sortByRank(members).map((member) => (
            <CrewScratchCard
              key={member.id}
              member={member}
              moved={!placementsEqual(placements[String(member.id)], originals[String(member.id)])}
              isUnassigned={false}
              onBoardFrom={onBoardFromDates[String(member.id)]}
              healthOverride={healthOverrides[String(member.id)]}
              ships={ships}
              onDragStart={onDragStartCard}
              onMove={onMove}
              onEditOnBoardFrom={onEditOnBoardFrom}
              onSetHealth={onSetHealth}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default function SchepenKladPage() {
  const { ships, crew, sickLeave, loading, error } = useSupabaseData()
  const [placements, setPlacements] = useState<Record<string, Placement>>({})
  const [originals, setOriginals] = useState<Record<string, Placement>>({})
  const [onBoardFromDates, setOnBoardFromDates] = useState<Record<string, string>>({})
  const [healthOverrides, setHealthOverrides] = useState<Record<string, KladHealthOverride>>({})
  const [kladDate, setKladDate] = useState<string>(() => todayInputValue())
  const [dateDialog, setDateDialog] = useState<{ crewId: string; date: string } | null>(null)
  const [dragCrewId, setDragCrewId] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [kladSavedAt, setKladSavedAt] = useState<string | null>(null)
  const [kladUpdatedBy, setKladUpdatedBy] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [sickFolderOpen, setSickFolderOpen] = useState(false)
  const originalsRef = useRef<Record<string, Placement>>({})
  const skipNextSaveRef = useRef(false)
  const lastSavedAtRef = useRef<string | null>(null)
  const notifyRemoteRef = useRef<
    ((meta: { updatedAt?: string | null; updatedBy?: string | null }) => Promise<void>) | null
  >(null)
  const applySharedRef = useRef<((shared: any, opts?: { fromRemote?: boolean }) => void) | null>(
    null
  )

  useEffect(() => {
    originalsRef.current = originals
  }, [originals])

  const eligibleCrew = useMemo(
    () => (crew || []).filter((m: any) => isEligibleKladCrew(m)),
    [crew]
  )

  const crewById = useMemo(() => {
    const map = new Map<string, any>()
    for (const member of eligibleCrew) map.set(String(member.id), member)
    return map
  }, [eligibleCrew])

  const realShips = useMemo(() => {
    return (ships || [])
      .filter((s: any) => s?.id && !isOverigPersoneelShipId(s.id))
      .sort((a: any, b: any) => {
        const companyCmp = String(a.company || "Overig").localeCompare(String(b.company || "Overig"), "nl")
        if (companyCmp !== 0) return companyCmp
        return String(a.name || "").localeCompare(String(b.name || ""), "nl")
      })
  }, [ships])

  const resetKlad = useCallback(() => {
    const initial = buildInitialPlacements(eligibleCrew, sickLeave || [], kladDate)
    clearKladStorage()
    skipNextSaveRef.current = false
    setPlacements(initial)
    setOriginals(initial)
    setOnBoardFromDates({})
    setHealthOverrides({})
    setKladSavedAt(null)
    setKladUpdatedBy(null)
    setDateDialog(null)
    setDragCrewId(null)
    setOverKey(null)
    setInitialized(true)
  }, [eligibleCrew, sickLeave, kladDate])

  const applySharedState = useCallback(
    (
      shared: {
        placements: Record<string, Placement>
        originals?: Record<string, Placement>
        onBoardFromDates: Record<string, string>
        healthOverrides: Record<string, KladHealthOverride>
        kladDate?: string | null
        updatedAt?: string | null
        updatedBy?: string | null
      },
      opts?: { fromRemote?: boolean }
    ) => {
      const date =
        shared.kladDate && isValidKladDate(shared.kladDate) ? shared.kladDate : todayInputValue()
      const liveForDate = buildInitialPlacements(eligibleCrew, sickLeave || [], date)
      const hasPlacements = Object.keys(shared.placements || {}).length > 0
      const merged = !hasPlacements
        ? liveForDate
        : shared.originals && Object.keys(shared.originals).length > 0
          ? rematerializeForDate(shared.placements, shared.originals, liveForDate)
          : mergePlacementsWithLive(shared.placements, liveForDate)

      if (opts?.fromRemote) skipNextSaveRef.current = true
      setKladDate(date)
      setPlacements(merged)
      setOriginals(liveForDate)
      setOnBoardFromDates(pruneDates(shared.onBoardFromDates || {}, merged))
      setHealthOverrides(pruneHealthOverrides(shared.healthOverrides || {}, merged))
      setKladSavedAt(shared.updatedAt || null)
      setKladUpdatedBy(shared.updatedBy || null)
      if (shared.updatedAt) lastSavedAtRef.current = shared.updatedAt
    },
    [eligibleCrew, sickLeave]
  )

  applySharedRef.current = applySharedState

  const changeKladDate = useCallback(
    (nextDate: string) => {
      if (!isValidKladDate(nextDate) || nextDate === kladDate) return
      const live = buildInitialPlacements(eligibleCrew, sickLeave || [], nextDate)
      setPlacements((prev) => rematerializeForDate(prev, originals, live))
      setOriginals(live)
      setKladDate(nextDate)
    },
    [kladDate, eligibleCrew, sickLeave, originals]
  )

  useEffect(() => {
    if (loading || initialized) return
    let cancelled = false

    ;(async () => {
      const { payload, error: loadError } = await fetchSchepenKlad()
      if (cancelled) return

      if (loadError) setSyncError(loadError)
      else setSyncError(null)

      const local = loadKladFromStorage()
      const sharedHasAny = payload && Object.keys(payload.placements || {}).length > 0
      const localHasAny = local && Object.keys(local.placements || {}).length > 0

      if (sharedHasAny) {
        applySharedState(
          {
            placements: payload!.placements,
            originals: payload!.originals,
            onBoardFromDates: payload!.onBoardFromDates,
            healthOverrides: payload!.healthOverrides,
            kladDate: payload!.kladDate,
            updatedAt: payload!.updatedAt,
            updatedBy: payload!.updatedBy,
          },
          { fromRemote: true }
        )
      } else if (localHasAny) {
        applySharedState(
          {
            placements: local!.placements,
            originals: local!.originals,
            onBoardFromDates: local!.onBoardFromDates,
            healthOverrides: local!.healthOverrides,
            kladDate: local!.kladDate,
            updatedAt: local!.savedAt || new Date().toISOString(),
            updatedBy: null,
          },
          { fromRemote: false }
        )
        clearKladStorage()
      } else {
        const date = todayInputValue()
        const live = buildInitialPlacements(eligibleCrew, sickLeave || [], date)
        skipNextSaveRef.current = true
        setKladDate(date)
        setPlacements(live)
        setOriginals(live)
        setOnBoardFromDates({})
        setHealthOverrides({})
        setKladSavedAt(null)
        setKladUpdatedBy(null)
      }

      setInitialized(true)
    })()

    return () => {
      cancelled = true
    }
  }, [loading, initialized, eligibleCrew, sickLeave, applySharedState])

  useEffect(() => {
    if (loading || !initialized) return
    const live = buildInitialPlacements(eligibleCrew, sickLeave || [], kladDate)
    setPlacements((prev) => {
      const next = rematerializeForDate(prev, originalsRef.current, live)
      const same =
        Object.keys(next).length === Object.keys(prev).length &&
        Object.keys(next).every((id) => placementsEqual(next[id], prev[id]))
      return same ? prev : next
    })
    setOriginals(live)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, initialized, eligibleCrew, sickLeave])

  useEffect(() => {
    if (!initialized || loading) return
    setOnBoardFromDates((prev) => {
      const pruned = pruneDates(prev, placements)
      const same =
        Object.keys(pruned).length === Object.keys(prev).length &&
        Object.keys(pruned).every((id) => pruned[id] === prev[id])
      return same ? prev : pruned
    })
    setHealthOverrides((prev) => {
      const pruned = pruneHealthOverrides(prev, placements)
      const same =
        Object.keys(pruned).length === Object.keys(prev).length &&
        Object.keys(pruned).every((id) => pruned[id] === prev[id])
      return same ? prev : pruned
    })
  }, [placements, initialized, loading])

  useEffect(() => {
    if (!initialized || loading) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    const timer = window.setTimeout(async () => {
      const { payload, error: saveError } = await saveSchepenKlad({
        placements,
        originals,
        onBoardFromDates,
        healthOverrides,
        kladDate,
      })
      if (saveError) {
        setSyncError(saveError)
        return
      }
      setSyncError(null)
      if (payload?.updatedAt) {
        lastSavedAtRef.current = payload.updatedAt
        setKladSavedAt(payload.updatedAt)
        setKladUpdatedBy(payload.updatedBy || null)
        await notifyRemoteRef.current?.({
          updatedAt: payload.updatedAt,
          updatedBy: payload.updatedBy,
        })
      }
    }, 450)

    return () => window.clearTimeout(timer)
  }, [placements, originals, onBoardFromDates, healthOverrides, kladDate, initialized, loading])

  useEffect(() => {
    if (!initialized) return

    const sub = subscribeSchepenKlad(async (meta) => {
      if (meta.updatedAt && meta.updatedAt === lastSavedAtRef.current) return
      const { payload, error: loadError } = await fetchSchepenKlad()
      if (loadError || !payload) return
      if (payload.updatedAt && payload.updatedAt === lastSavedAtRef.current) return
      applySharedRef.current?.(
        {
          placements: payload.placements,
          originals: payload.originals,
          onBoardFromDates: payload.onBoardFromDates,
          healthOverrides: payload.healthOverrides,
          kladDate: payload.kladDate,
          updatedAt: payload.updatedAt,
          updatedBy: payload.updatedBy,
        },
        { fromRemote: true }
      )
    })

    notifyRemoteRef.current = sub.notify

    const pullIfChanged = async () => {
      const { payload } = await fetchSchepenKlad()
      if (!payload?.updatedAt) return
      if (payload.updatedAt === lastSavedAtRef.current) return
      applySharedRef.current?.(
        {
          placements: payload.placements,
          originals: payload.originals,
          onBoardFromDates: payload.onBoardFromDates,
          healthOverrides: payload.healthOverrides,
          kladDate: payload.kladDate,
          updatedAt: payload.updatedAt,
          updatedBy: payload.updatedBy,
        },
        { fromRemote: true }
      )
    }

    const onFocus = () => {
      void pullIfChanged()
    }
    window.addEventListener("focus", onFocus)
    const poll = window.setInterval(() => {
      void pullIfChanged()
    }, 8000)

    return () => {
      notifyRemoteRef.current = null
      sub.unsubscribe()
      window.removeEventListener("focus", onFocus)
      window.clearInterval(poll)
    }
  }, [initialized])

  const savedLabel = useMemo(() => {
    if (!kladSavedAt) return null
    try {
      return format(new Date(kladSavedAt), "dd-MM-yyyy HH:mm")
    } catch {
      return null
    }
  }, [kladSavedAt])

  const updatedByLabel = useMemo(() => {
    if (!kladUpdatedBy) return null
    const local = kladUpdatedBy.split("@")[0] || kladUpdatedBy
    return local.charAt(0).toUpperCase() + local.slice(1)
  }, [kladUpdatedBy])

  const membersFor = useCallback(
    (shipId: string, column?: ColumnKey) => {
      return eligibleCrew.filter((m: any) => {
        const placement = placements[String(m.id)]
        if (!placement) return false
        if (placement.shipId !== shipId) return false
        if (column && placement.column !== column) return false
        return true
      })
    },
    [eligibleCrew, placements]
  )

  const openOnBoardFromDialog = useCallback((crewId: string) => {
    setDateDialog({
      crewId,
      date: onBoardFromDates[crewId] || todayInputValue(),
    })
  }, [onBoardFromDates])

  const applyPlacement = useCallback((crewId: string, nextPlacement: Placement) => {
    if (!crewById.has(crewId)) return
    setPlacements((prev) => ({
      ...prev,
      [crewId]: nextPlacement,
    }))
  }, [crewById])

  const setHealthOverride = useCallback((crewId: string, health: KladHealthOverride) => {
    if (!crewById.has(crewId)) return
    setHealthOverrides((prev) => ({
      ...prev,
      [crewId]: health,
    }))
    if (health === "ziek") {
      // Zieken parkeren in het zieken-mapje (nog-in-te-delen pool, apart).
      setPlacements((prev) => ({
        ...prev,
        [crewId]: { shipId: UNASSIGNED_KEY, column: "thuis" },
      }))
      setDateDialog(null)
    }
    // beter: blijft in nog-in-te-delen (buiten het zieken-mapje); datum mag blijven
  }, [crewById])

  const unassignedMembers = useMemo(() => membersFor(UNASSIGNED_KEY), [membersFor])
  const unassignedAvailable = useMemo(
    () => unassignedMembers.filter((m: any) => !isSickInKlad(m, healthOverrides)),
    [unassignedMembers, healthOverrides]
  )
  const unassignedSick = useMemo(
    () =>
      sortUnassignedPool(
        unassignedMembers.filter((m: any) => isSickInKlad(m, healthOverrides)),
        healthOverrides
      ),
    [unassignedMembers, healthOverrides]
  )

  const saveOnBoardFromDate = () => {
    if (!dateDialog?.crewId) return
    const value = dateDialog.date.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
    setOnBoardFromDates((prev) => ({
      ...prev,
      [dateDialog.crewId]: value,
    }))
    setDateDialog(null)
  }

  const handleDrop = (dropKey: string, crewIdFromTransfer?: string) => {
    const crewId = (crewIdFromTransfer || dragCrewId || "").trim()
    setOverKey(null)
    setDragCrewId(null)
    const nextPlacement = parseDropKey(dropKey)
    if (!crewId || !nextPlacement) return
    applyPlacement(crewId, nextPlacement)
  }

  const handleDragStartCard = (crewId: string) => {
    if (!crewId) {
      setDragCrewId(null)
      setOverKey(null)
      return
    }
    setDragCrewId(crewId)
  }

  const dateDialogMember = dateDialog ? crewById.get(dateDialog.crewId) : null
  const dateDialogPlacement = dateDialog ? placements[dateDialog.crewId] : null
  const dateDialogIsUnassigned =
    !dateDialogPlacement || dateDialogPlacement.shipId === UNASSIGNED_KEY
  const dateDialogShipName = (() => {
    if (!dateDialog || dateDialogIsUnassigned) return ""
    const ship = realShips.find((s: any) => String(s.id) === dateDialogPlacement.shipId)
    return ship?.name || "schip"
  })()
  const dateDialogTitle = dateDialogIsUnassigned ? "In te delen voor" : "Aan boord vanaf"
  const dateDialogDescription = dateDialogMember
    ? dateDialogIsUnassigned
      ? `Wanneer moet ${memberName(dateDialogMember)} ingedeeld worden?`
      : `Vanaf wanneer komt ${memberName(dateDialogMember)}${
          dateDialogShipName ? ` op ${dateDialogShipName}` : ""
        }?`
    : "Kies de datum."

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-50 text-gray-500">
        Laden...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-50 text-red-600">
        Fout: {error}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-slate-100">
      <header className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-slate-500" />
            <h1 className="truncate text-base font-bold text-slate-900">Schepen klad</h1>
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px]">
              {eligibleCrew.length} personen
            </Badge>
            {savedLabel && (
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                gedeeld {savedLabel}
                {updatedByLabel ? ` · ${updatedByLabel}` : ""}
              </Badge>
            )}
            {syncError && (
              <Badge className="bg-red-100 text-red-800 border border-red-200 text-[10px]">
                sync: {syncError}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Gedeelde klad: wijzigingen verschijnen ook bij Leo (en andersom). Peildatum bepaalt aan
            boord / thuis via regimes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
            <Label htmlFor="klad-date" className="whitespace-nowrap text-[11px] text-slate-600">
              Peildatum
            </Label>
            <Input
              id="klad-date"
              type="date"
              value={kladDate}
              onChange={(e) => changeKladDate(e.target.value)}
              className="h-7 w-[140px] border-slate-200 bg-white px-1.5 text-xs"
            />
          </div>
          <Button type="button" size="sm" variant="outline" onClick={resetKlad}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Klad wissen
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/schepen/overzicht">
              <Ship className="mr-1.5 h-3.5 w-3.5" />
              Echt overzicht
            </Link>
          </Button>
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href="/" title="Sluiten">
              <X className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sticky pool links */}
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white p-2 md:w-[280px]">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Nog in te delen</h2>
            <Badge variant="outline" className="text-[10px]">
              {unassignedAvailable.length}
            </Badge>
          </div>
          <div
            className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-md border border-dashed p-1.5 ${
              overKey === UNASSIGNED_KEY
                ? "border-slate-400 bg-slate-100"
                : "border-slate-200 bg-slate-50"
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = "move"
              setOverKey(UNASSIGNED_KEY)
            }}
            onDragLeave={() => setOverKey(null)}
            onDrop={(e) => {
              e.preventDefault()
              handleDrop(UNASSIGNED_KEY, e.dataTransfer.getData("text/plain") || undefined)
            }}
          >
            {unassignedAvailable.length === 0 ? (
              <div className="px-1 py-6 text-center text-[11px] text-slate-400">Sleep hierheen</div>
            ) : (
              sortByRank(unassignedAvailable).map((member) => (
                <CrewScratchCard
                  key={member.id}
                  member={member}
                  moved={!placementsEqual(placements[String(member.id)], originals[String(member.id)])}
                  isUnassigned
                  onBoardFrom={onBoardFromDates[String(member.id)]}
                  healthOverride={healthOverrides[String(member.id)]}
                  ships={realShips}
                  onDragStart={handleDragStartCard}
                  onMove={applyPlacement}
                  onEditOnBoardFrom={openOnBoardFromDialog}
                  onSetHealth={setHealthOverride}
                />
              ))
            )}
          </div>

          <div className="mt-2 shrink-0 rounded-md border border-red-200 bg-red-50/40">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left"
              onClick={() => setSickFolderOpen((open) => !open)}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-800">
                {sickFolderOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Zieken
              </span>
              <Badge className="bg-red-100 text-red-800 border border-red-200 text-[10px]">
                {unassignedSick.length}
              </Badge>
            </button>
            {sickFolderOpen && (
              <div className="max-h-[40vh] space-y-1.5 overflow-y-auto border-t border-red-200 p-1.5">
                {unassignedSick.length === 0 ? (
                  <div className="px-1 py-3 text-center text-[11px] text-red-400">
                    Geen zieken in het klad
                  </div>
                ) : (
                  unassignedSick.map((member) => (
                    <CrewScratchCard
                      key={member.id}
                      member={member}
                      moved={!placementsEqual(placements[String(member.id)], originals[String(member.id)])}
                      isUnassigned
                      onBoardFrom={onBoardFromDates[String(member.id)]}
                      healthOverride={healthOverrides[String(member.id)]}
                      ships={realShips}
                      onDragStart={handleDragStartCard}
                      onMove={applyPlacement}
                      onEditOnBoardFrom={openOnBoardFromDialog}
                      onSetHealth={setHealthOverride}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Horizontaal whiteboard met schepen */}
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-2">
          <div className="flex h-full min-w-max gap-2">
            {realShips.map((ship: any) => {
              const onBoardKey = `${ship.id}::aan-boord`
              const homeKey = `${ship.id}::thuis`
              const absentKey = `${ship.id}::afwezig`
              const totalOnShip = membersFor(String(ship.id)).length
              return (
                <section
                  key={ship.id}
                  className="flex h-full w-[420px] shrink-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <div className="shrink-0 border-b border-slate-100 px-2.5 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900">
                          {ship.name || "Schip"}
                        </h3>
                        <p className="truncate text-[11px] text-slate-500">
                          {ship.company || "Overig"}
                          {ship.regime ? ` · ${ship.regime}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {totalOnShip}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
                    <DropZone
                      dropKey={onBoardKey}
                      title="Aan boord"
                      icon={<CheckCircle className="h-3.5 w-3.5 text-green-600" />}
                      tone="green"
                      members={membersFor(String(ship.id), "aan-boord")}
                      originals={originals}
                      placements={placements}
                      onBoardFromDates={onBoardFromDates}
                      healthOverrides={healthOverrides}
                      ships={realShips}
                      isOver={overKey === onBoardKey}
                      onDragOver={setOverKey}
                      onDragLeave={() => setOverKey(null)}
                      onDrop={handleDrop}
                      onDragStartCard={handleDragStartCard}
                      onMove={applyPlacement}
                      onEditOnBoardFrom={openOnBoardFromDialog}
                      onSetHealth={setHealthOverride}
                    />
                    <DropZone
                      dropKey={homeKey}
                      title="Thuis"
                      icon={<Clock className="h-3.5 w-3.5 text-blue-600" />}
                      tone="blue"
                      members={membersFor(String(ship.id), "thuis")}
                      originals={originals}
                      placements={placements}
                      onBoardFromDates={onBoardFromDates}
                      healthOverrides={healthOverrides}
                      ships={realShips}
                      isOver={overKey === homeKey}
                      onDragOver={setOverKey}
                      onDragLeave={() => setOverKey(null)}
                      onDrop={handleDrop}
                      onDragStartCard={handleDragStartCard}
                      onMove={applyPlacement}
                      onEditOnBoardFrom={openOnBoardFromDialog}
                      onSetHealth={setHealthOverride}
                    />
                    <DropZone
                      dropKey={absentKey}
                      title="Ziek / afwezig"
                      icon={<UserX className="h-3.5 w-3.5 text-red-600" />}
                      tone="red"
                      members={membersFor(String(ship.id), "afwezig")}
                      originals={originals}
                      placements={placements}
                      onBoardFromDates={onBoardFromDates}
                      healthOverrides={healthOverrides}
                      ships={realShips}
                      isOver={overKey === absentKey}
                      onDragOver={setOverKey}
                      onDragLeave={() => setOverKey(null)}
                      onDrop={handleDrop}
                      onDragStartCard={handleDragStartCard}
                      onMove={applyPlacement}
                      onEditOnBoardFrom={openOnBoardFromDialog}
                      onSetHealth={setHealthOverride}
                    />
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>

      <Dialog
        open={!!dateDialog}
        onOpenChange={(open) => {
          if (!open) setDateDialog(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dateDialogTitle}</DialogTitle>
            <DialogDescription>{dateDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="on-board-from">Datum</Label>
            <Input
              id="on-board-from"
              type="date"
              value={dateDialog?.date || ""}
              onChange={(e) =>
                setDateDialog((prev) => (prev ? { ...prev, date: e.target.value } : prev))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDateDialog(null)}>
              Later
            </Button>
            <Button
              type="button"
              onClick={saveOnBoardFromDate}
              disabled={!dateDialog?.date || !/^\d{4}-\d{2}-\d{2}$/.test(dateDialog.date)}
            >
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
