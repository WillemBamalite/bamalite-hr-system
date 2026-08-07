"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
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
import { isExcludedFromAssignmentPool } from "@/utils/crew-filters"
import { getNationalityFlag } from "@/utils/nationality-display"
import { isOverigPersoneelShipId } from "@/utils/ship-constants"
import {
  calculateCurrentStatus,
  isLocalDateAfterToday,
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

function getInitialColumn(member: any, sickLeave: any[]): ColumnKey {
  if (isUnavailable(member, sickLeave)) return "afwezig"
  if (member.expected_start_date && isLocalDateAfterToday(member.expected_start_date)) return "thuis"
  if (!member.regime) {
    if (member.status === "aan-boord") return "aan-boord"
    return "thuis"
  }
  const rotation = calculateCurrentStatus(
    member.regime as "1/1" | "2/2" | "3/3" | "Altijd",
    member.thuis_sinds || null,
    member.on_board_since || null,
    member.status === "ziek",
    member.expected_start_date || null
  )
  return rotation.currentStatus === "aan-boord" ? "aan-boord" : "thuis"
}

function buildInitialPlacements(crew: any[], sickLeave: any[]): Record<string, Placement> {
  const next: Record<string, Placement> = {}
  for (const member of crew) {
    if (!isEligibleKladCrew(member)) continue
    const id = String(member.id)
    if (hasRealShip(member)) {
      next[id] = {
        shipId: String(member.ship_id),
        column: getInitialColumn(member, sickLeave),
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
  onBoardFromDates: Record<string, string>
  healthOverrides: Record<string, KladHealthOverride>
  savedAt: string
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
    const datesRaw = parsed.onBoardFromDates || {}
    const healthRaw = parsed.healthOverrides || {}
    const placements: Record<string, Placement> = {}
    for (const [id, value] of Object.entries(placementsRaw)) {
      if (isValidPlacement(value)) placements[id] = value
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
      onBoardFromDates,
      healthOverrides,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
    }
  } catch {
    return null
  }
}

function saveKladToStorage(
  placements: Record<string, Placement>,
  onBoardFromDates: Record<string, string>,
  healthOverrides: Record<string, KladHealthOverride>
) {
  if (typeof window === "undefined") return
  try {
    const payload: KladStoragePayload = {
      placements,
      onBoardFromDates,
      healthOverrides,
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
  const [dateDialog, setDateDialog] = useState<{ crewId: string; date: string } | null>(null)
  const [dragCrewId, setDragCrewId] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [kladSavedAt, setKladSavedAt] = useState<string | null>(null)
  const [sickFolderOpen, setSickFolderOpen] = useState(false)

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
    const initial = buildInitialPlacements(eligibleCrew, sickLeave || [])
    clearKladStorage()
    setPlacements(initial)
    setOriginals(initial)
    setOnBoardFromDates({})
    setHealthOverrides({})
    setKladSavedAt(null)
    setDateDialog(null)
    setDragCrewId(null)
    setOverKey(null)
    setInitialized(true)
  }, [eligibleCrew, sickLeave])

  useEffect(() => {
    if (loading) return
    const live = buildInitialPlacements(eligibleCrew, sickLeave || [])

    if (!initialized) {
      const stored = loadKladFromStorage()
      if (stored && Object.keys(stored.placements).length > 0) {
        const merged = mergePlacementsWithLive(stored.placements, live)
        const dates = pruneDates(stored.onBoardFromDates, merged)
        const health = pruneHealthOverrides(stored.healthOverrides || {}, merged)
        setPlacements(merged)
        setOriginals(live)
        setOnBoardFromDates(dates)
        setHealthOverrides(health)
        setKladSavedAt(stored.savedAt || null)
        setInitialized(true)
        return
      }
      setPlacements(live)
      setOriginals(live)
      setOnBoardFromDates({})
      setHealthOverrides({})
      setKladSavedAt(null)
      setInitialized(true)
      return
    }

    setOriginals(live)

    setPlacements((prev) => {
      const next = mergePlacementsWithLive(prev, live)
      const same =
        Object.keys(next).length === Object.keys(prev).length &&
        Object.keys(next).every((id) => placementsEqual(next[id], prev[id]))
      return same ? prev : next
    })
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
    saveKladToStorage(placements, onBoardFromDates, healthOverrides)
    setKladSavedAt(new Date().toISOString())
  }, [placements, onBoardFromDates, healthOverrides, initialized, loading])

  const movedCount = useMemo(() => {
    return Object.keys(placements).filter(
      (id) => !placementsEqual(placements[id], originals[id])
    ).length
  }, [placements, originals])

  const savedLabel = useMemo(() => {
    if (!kladSavedAt) return null
    try {
      return format(new Date(kladSavedAt), "dd-MM-yyyy HH:mm")
    } catch {
      return null
    }
  }, [kladSavedAt])

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
            <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">
              {movedCount} verplaatst
            </Badge>
            {savedLabel && (
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                bewaard {savedLabel}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Sleep of rechtermuisklik → verplaatsen. Dubbelklik → datum (in te delen voor / aan boord
            vanaf). Klad blijft bewaard in deze browser.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
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
