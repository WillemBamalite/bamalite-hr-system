"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  CalendarDays,
  Edit,
  ExternalLink,
  Home,
  Phone,
  Plus,
  Ship,
  UserCheck,
  Trash2,
  UserX,
  X,
} from "lucide-react"
import {
  evaluateOverwerkerOnDate,
  isOverwerkTrip,
  levelBadgeClass,
  levelLabel,
  type OverwerkerPeriod,
  type OverwerkerPlanningColumn,
} from "@/utils/overwerker-availability"
import {
  computeOverwerkWorkDays,
  getStandBackBalanceSummary,
  normalizeTripDate,
  parseOverwerkSettlement,
  settlementTypeLabel,
  type OverwerkSettlementType,
} from "@/utils/overwerk-settlement"
import { StandBackManagement } from "@/components/sick-leave/stand-back-management"
import { supabase } from "@/lib/supabase"

export type OverwerkersPageTab = "planning" | "alle" | "terug-te-staan" | "reizen"

type PageTab = OverwerkersPageTab

const COLUMN_META: Record<
  Exclude<OverwerkerPlanningColumn, null>,
  { title: string; subtitle: string; headerClass: string; borderClass: string }
> = {
  aan_boord: {
    title: "Overwerkers nu aan boord",
    subtitle: "Actieve overwerk-toewijzing op deze datum",
    headerClass: "bg-blue-50 text-blue-900 border-blue-200",
    borderClass: "border-blue-200",
  },
  ingepland: {
    title: "Ingepland",
    subtitle: "Toegewezen, start later — staat al op het schip",
    headerClass: "bg-violet-50 text-violet-950 border-violet-200",
    borderClass: "border-violet-200",
  },
  echt_beschikbaar: {
    title: "Nu beschikbaar",
    subtitle: "Expliciete beschikbaarheidsperiode op deze datum",
    headerClass: "bg-green-50 text-green-900 border-green-200",
    borderClass: "border-green-200",
  },
  mogelijk_beschikbaar: {
    title: "Mogelijk beschikbaar",
    subtitle: "3 dagen vóór vaste periode, of thuis in vrije week — eerst bellen",
    headerClass: "bg-amber-50 text-amber-950 border-amber-200",
    borderClass: "border-amber-200",
  },
}

export interface OverwerkersPlanningProps {
  crew: Array<{
    id: string
    first_name?: string
    last_name?: string
    position?: string
    ship_id?: string | null
    regime?: string | null
    status?: string
    notes?: unknown
    aflosser_opmerkingen?: string | null
  }>
  ships: Array<{ id: string; name: string }>
  trips: Array<{
    id: string
    aflosser_id?: string | null
    ship_id?: string | null
    status?: string
    start_date?: string | null
    end_date?: string | null
    start_datum?: string | null
    start_tijd?: string | null
    eind_datum?: string | null
    eind_tijd?: string | null
    notes?: string | null
    trip_name?: string | null
  }>
  overwerkerIds: string[]
  getOverwerkerPeriods: (member: (typeof crew)[0]) => OverwerkerPeriod[]
  formatDateDDMMYYYY: (dateString: string | null) => string | null
  getShipName: (shipId: string) => string
  onAddOverwerker: () => void
  onAddPeriod: (memberId: string) => void
  onEditPeriod: (memberId: string, period: OverwerkerPeriod) => void
  onDeletePeriod: (memberId: string, periodId: string) => void
  onRemoveOverwerker: (memberId: string) => void
  standBackRecords?: Array<{
    crew_member_id?: string
    stand_back_status?: string
    stand_back_days_remaining?: number
  }>
  onAssignToShip: (
    memberId: string,
    shipId: string,
    startDate: string,
    endDate?: string,
    settlement?: OverwerkSettlementType,
    startTijd?: string
  ) => Promise<void>
  onEndAssignment: (
    tripId: string,
    eindDatum: string,
    eindTijd: string,
    opmerking?: string
  ) => Promise<void>
  onSaveMemberOpmerking: (memberId: string, opmerking: string | null) => Promise<void>
  onUpdateActiveTrip: (
    tripId: string,
    data: { shipId: string; startDate: string; endDate?: string; startTijd?: string }
  ) => Promise<void>
  onDeleteTrip: (tripId: string) => Promise<void>
  /** Subtab uit URL (?subtab=terug-te-staan) */
  initialPageTab?: OverwerkersPageTab
}

const OVERWERK_FUNCTIES = [
  "Kapitein",
  "2e kapitein",
  "Stuurman",
  "Vol Matroos",
  "Matroos",
  "Lichtmatroos",
  "Deksman",
  "Kok",
] as const

type OpenPlek = {
  id: string
  ship_id: string
  start_date: string
  end_date: string
  position: string
}

const OPEN_PLEKKEN_KEY = "overwerk-open-plekken"

function readLocalOpenPlekken(): OpenPlek[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(OPEN_PLEKKEN_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalOpenPlekken(items: OpenPlek[]) {
  window.localStorage.setItem(OPEN_PLEKKEN_KEY, JSON.stringify(items))
}

function memberName(member: { first_name?: string; last_name?: string }) {
  return `${member.first_name || ""} ${member.last_name || ""}`.trim()
}

export function OverwerkersPlanning({
  crew,
  ships,
  trips,
  overwerkerIds,
  getOverwerkerPeriods,
  formatDateDDMMYYYY,
  getShipName,
  onAddOverwerker,
  onAddPeriod,
  onEditPeriod,
  onDeletePeriod,
  onRemoveOverwerker,
  standBackRecords = [],
  onAssignToShip,
  onEndAssignment,
  onSaveMemberOpmerking,
  onUpdateActiveTrip,
  onDeleteTrip,
  initialPageTab = "planning",
}: OverwerkersPlanningProps) {
  const today = format(new Date(), "yyyy-MM-dd")
  const nowTime = format(new Date(), "HH:mm")
  const [pageTab, setPageTab] = useState<PageTab>(initialPageTab)
  const [planningDate, setPlanningDate] = useState(today)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  const [openPlekken, setOpenPlekken] = useState<OpenPlek[]>([])
  const [plekShipId, setPlekShipId] = useState("")
  const [plekStart, setPlekStart] = useState("")
  const [plekEnd, setPlekEnd] = useState("")
  const [plekPosition, setPlekPosition] = useState("")
  const [savingPlek, setSavingPlek] = useState(false)
  const openPlekkenRemote = useRef(false)

  useEffect(() => {
    setPageTab(initialPageTab)
  }, [initialPageTab])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from("overwerk_open_plekken")
        .select("id, ship_id, start_date, end_date, position")
        .order("start_date", { ascending: true })
      if (cancelled) return
      if (error) {
        openPlekkenRemote.current = false
        setOpenPlekken(readLocalOpenPlekken())
        return
      }
      openPlekkenRemote.current = true
      const remote = (data || []) as OpenPlek[]
      if (remote.length === 0) {
        const local = readLocalOpenPlekken()
        if (local.length > 0) {
          const { data: inserted, error: insertError } = await supabase
            .from("overwerk_open_plekken")
            .insert(
              local.map((plek) => ({
                id: plek.id,
                ship_id: plek.ship_id,
                start_date: plek.start_date,
                end_date: plek.end_date,
                position: plek.position,
              }))
            )
            .select("id, ship_id, start_date, end_date, position")
          if (!cancelled && !insertError && inserted) {
            writeLocalOpenPlekken([])
            setOpenPlekken(
              (inserted as OpenPlek[]).sort((a, b) => a.start_date.localeCompare(b.start_date))
            )
            return
          }
        }
      }
      if (!cancelled) setOpenPlekken(remote)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addOpenPlek = async () => {
    if (!plekShipId || !plekStart || !plekEnd || !plekPosition) {
      alert("Vul schip, van, tot en functie in")
      return
    }
    if (plekEnd < plekStart) {
      alert("De einddatum ligt voor de startdatum")
      return
    }
    setSavingPlek(true)
    const plek: OpenPlek = {
      id: crypto.randomUUID(),
      ship_id: plekShipId,
      start_date: plekStart,
      end_date: plekEnd,
      position: plekPosition,
    }
    try {
      if (openPlekkenRemote.current) {
        const { error } = await supabase.from("overwerk_open_plekken").insert([
          {
            id: plek.id,
            ship_id: plek.ship_id,
            start_date: plek.start_date,
            end_date: plek.end_date,
            position: plek.position,
          },
        ])
        if (error) throw error
      } else {
        writeLocalOpenPlekken(
          [...openPlekken, plek].sort((a, b) => a.start_date.localeCompare(b.start_date))
        )
      }
      setOpenPlekken((prev) =>
        [...prev, plek].sort((a, b) => a.start_date.localeCompare(b.start_date))
      )
      setPlekStart("")
      setPlekEnd("")
      setPlekPosition("")
    } catch (error) {
      console.error("Open plek opslaan mislukt:", error)
      alert("De open plek kon niet worden opgeslagen")
    } finally {
      setSavingPlek(false)
    }
  }

  const removeOpenPlek = async (id: string) => {
    const previous = openPlekken
    const next = previous.filter((plek) => plek.id !== id)
    setOpenPlekken(next)
    if (!openPlekkenRemote.current) {
      writeLocalOpenPlekken(next)
      return
    }
    const { error } = await supabase.from("overwerk_open_plekken").delete().eq("id", id)
    if (error) {
      console.error("Open plek verwijderen mislukt:", error)
      setOpenPlekken(previous)
      alert("De open plek kon niet worden verwijderd")
    }
  }

  const [assignDialog, setAssignDialog] = useState<{ memberId: string; name: string } | null>(null)
  const [assignShipId, setAssignShipId] = useState("")
  const [assignStartDate, setAssignStartDate] = useState(today)
  const [assignStartTijd, setAssignStartTijd] = useState(nowTime)
  const [assignSettlement, setAssignSettlement] = useState<OverwerkSettlementType>("none")
  const [assigning, setAssigning] = useState(false)
  const [endDialog, setEndDialog] = useState<{
    tripId: string
    name: string
    shipName?: string
  } | null>(null)
  const [endDatum, setEndDatum] = useState(today)
  const [endTijd, setEndTijd] = useState(nowTime)
  const [endOpmerking, setEndOpmerking] = useState("")
  const [ending, setEnding] = useState(false)
  const [opmerkingDialog, setOpmerkingDialog] = useState<{
    memberId: string
    name: string
  } | null>(null)
  const [opmerkingText, setOpmerkingText] = useState("")
  const [savingOpmerking, setSavingOpmerking] = useState(false)
  const [editTripDialog, setEditTripDialog] = useState<{
    tripId: string
    name: string
  } | null>(null)
  const [editShipId, setEditShipId] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editStartTijd, setEditStartTijd] = useState("08:00")
  const [savingTrip, setSavingTrip] = useState(false)

  useEffect(() => {
    const syncToday = () => setPlanningDate(format(new Date(), "yyyy-MM-dd"))
    syncToday()
    const onFocus = () => syncToday()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  const rows = useMemo(() => {
    return overwerkerIds
      .map((id) => {
        const member = crew.find((c) => c.id === id)
        if (!member) return null
        const periods = getOverwerkerPeriods(member)
        const status = evaluateOverwerkerOnDate(
          member,
          planningDate,
          periods,
          trips,
          getShipName
        )
        return { member, periods, status }
      })
      .filter(Boolean) as Array<{
      member: (typeof crew)[0]
      periods: OverwerkerPeriod[]
      status: ReturnType<typeof evaluateOverwerkerOnDate>
    }>
  }, [overwerkerIds, crew, planningDate, trips, getOverwerkerPeriods, getShipName])

  const planningByColumn = useMemo(() => {
    const cols: Record<
      Exclude<OverwerkerPlanningColumn, null>,
      typeof rows
    > = {
      aan_boord: [],
      ingepland: [],
      echt_beschikbaar: [],
      mogelijk_beschikbaar: [],
    }
    rows.forEach((row) => {
      const col = row.status.planningColumn
      if (col) cols[col].push(row)
    })
    const sortByName = (a: (typeof rows)[0], b: (typeof rows)[0]) =>
      memberName(a.member).localeCompare(memberName(b.member), "nl")
    ;(Object.keys(cols) as Array<keyof typeof cols>).forEach((k) => cols[k].sort(sortByName))
    return cols
  }, [rows])

  const alleRows = useMemo(() => {
    return [...rows].sort((a, b) => memberName(a.member).localeCompare(memberName(b.member), "nl"))
  }, [rows])

  const planningCounts = useMemo(
    () => ({
      aan_boord: planningByColumn.aan_boord.length,
      ingepland: planningByColumn.ingepland.length,
      echt_beschikbaar: planningByColumn.echt_beschikbaar.length,
      mogelijk_beschikbaar: planningByColumn.mogelijk_beschikbaar.length,
    }),
    [planningByColumn]
  )

  const overwerkTripsList = useMemo(() => {
    const idSet = new Set(overwerkerIds.map(String))
    return trips
      .filter(
        (t) =>
          isOverwerkTrip(t) &&
          t.aflosser_id &&
          idSet.has(String(t.aflosser_id))
      )
      .sort((a, b) => {
        const da = a.start_datum || a.start_date || ""
        const db = b.start_datum || b.start_date || ""
        return db.localeCompare(da)
      })
  }, [trips, overwerkerIds])

  const handleDeleteTripClick = async (tripId: string) => {
    setDeletingTripId(tripId)
    try {
      await onDeleteTrip(tripId)
    } finally {
      setDeletingTripId(null)
    }
  }

  const tripStatusLabel = (status?: string) => {
    switch (status) {
      case "actief":
        return "Actief"
      case "gepland":
        return "Gepland"
      case "ingedeeld":
        return "Ingedeeld"
      case "voltooid":
        return "Voltooid"
      case "geannuleerd":
        return "Geannuleerd"
      default:
        return status || "Onbekend"
    }
  }

  const endDialogTrip = useMemo(() => {
    if (!endDialog) return null
    return trips.find((t) => t.id === endDialog.tripId) ?? null
  }, [endDialog, trips])

  const previewEndWorkDays = useMemo(() => {
    if (!endDialogTrip || !endDatum) return null
    const startOnly = normalizeTripDate(endDialogTrip.start_datum || endDialogTrip.start_date)
    const endOnly = normalizeTripDate(endDatum)
    if (!startOnly || !endOnly) return null
    if (endOnly < startOnly) {
      return { invalid: true as const }
    }
    const days = computeOverwerkWorkDays(endDialogTrip, endDatum, endTijd || "17:00")
    return days > 0 ? { invalid: false as const, days } : null
  }, [endDialogTrip, endDatum, endTijd])

  const openEndDialog = (tripId: string, name: string, shipName?: string) => {
    const trip = trips.find((t) => t.id === tripId)
    const todayIso = format(new Date(), "yyyy-MM-dd")
    const startOnly = trip ? normalizeTripDate(trip.start_datum || trip.start_date) : null
    const defaultEnd = startOnly && startOnly > todayIso ? startOnly : todayIso

    setEndDialog({ tripId, name, shipName })
    setEndDatum(defaultEnd)
    setEndTijd(format(new Date(), "HH:mm"))
    setEndOpmerking("")
  }

  const handleEndAssignment = async () => {
    if (!endDialog || !endDatum || !endTijd) return
    setEnding(true)
    try {
      await onEndAssignment(endDialog.tripId, endDatum, endTijd, endOpmerking || undefined)
      setEndDialog(null)
    } catch {
      alert("Fout bij naar huis sturen")
    } finally {
      setEnding(false)
    }
  }

  const openOpmerkingDialog = (member: (typeof crew)[0]) => {
    setOpmerkingDialog({
      memberId: member.id,
      name: memberName(member),
    })
    setOpmerkingText(member.aflosser_opmerkingen || "")
  }

  const handleSaveOpmerking = async () => {
    if (!opmerkingDialog) return
    setSavingOpmerking(true)
    try {
      await onSaveMemberOpmerking(
        opmerkingDialog.memberId,
        opmerkingText.trim() || null
      )
      setOpmerkingDialog(null)
      setOpmerkingText("")
    } catch {
      alert("Fout bij opslaan opmerking")
    } finally {
      setSavingOpmerking(false)
    }
  }

  const handleRemoveOpmerking = async (memberId: string) => {
    if (!confirm("Opmerking verwijderen?")) return
    try {
      await onSaveMemberOpmerking(memberId, null)
    } catch {
      alert("Fout bij verwijderen opmerking")
    }
  }

  const openEditTripDialog = (trip: (typeof trips)[0], name: string) => {
    const start =
      trip.start_date?.slice(0, 10) ||
      trip.start_datum?.slice(0, 10) ||
      planningDate
    const end = trip.end_date?.slice(0, 10) || trip.eind_datum?.slice(0, 10) || ""
    setEditTripDialog({ tripId: trip.id, name })
    setEditShipId(trip.ship_id || ships[0]?.id || "")
    setEditStartDate(start)
    setEditEndDate(end)
    setEditStartTijd(trip.start_tijd?.slice(0, 5) || "08:00")
  }

  const handleSaveTripEdit = async () => {
    if (!editTripDialog || !editShipId || !editStartDate) return
    if (editEndDate && editEndDate < editStartDate) {
      alert("Einddatum moet op of na de startdatum liggen.")
      return
    }
    setSavingTrip(true)
    try {
      await onUpdateActiveTrip(editTripDialog.tripId, {
        shipId: editShipId,
        startDate: editStartDate,
        endDate: editEndDate || undefined,
        startTijd: editStartTijd,
      })
      setEditTripDialog(null)
    } catch {
      alert("Fout bij bewerken reis")
    } finally {
      setSavingTrip(false)
    }
  }

  const handleAssign = async () => {
    if (!assignDialog || !assignShipId || !assignStartDate) return
    setAssigning(true)
    try {
      await onAssignToShip(
        assignDialog.memberId,
        assignShipId,
        assignStartDate,
        undefined,
        assignSettlement,
        assignStartTijd || undefined
      )
      setAssignDialog(null)
      setAssignShipId("")
      setAssignStartDate(planningDate)
      setAssignStartTijd(format(new Date(), "HH:mm"))
      setAssignSettlement("none")
    } catch {
      alert("Fout bij toewijzen aan schip")
    } finally {
      setAssigning(false)
    }
  }

  const renderPeriodChips = (
    memberId: string,
    periods: OverwerkerPeriod[],
    compact?: boolean
  ) => {
    if (periods.length === 0) return null
    return (
      <div className={`flex flex-wrap gap-1 ${compact ? "mt-1" : "mt-2"}`}>
        {periods.map((period) => (
          <span
            key={period.id}
            className="inline-flex items-center gap-0.5 text-[11px] bg-gray-100 rounded px-1.5 py-0.5"
          >
            {period.type === "vrije_weken" ? (
              "Vrije weken"
            ) : (
              <>
                {formatDateDDMMYYYY(period.from)} – {formatDateDDMMYYYY(period.to)}
              </>
            )}
            {period.type !== "vrije_weken" && pageTab === "alle" && (
              <>
                <button
                  type="button"
                  className="p-0.5 hover:text-blue-600"
                  onClick={() => onEditPeriod(memberId, period)}
                  aria-label="Periode bewerken"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="p-0.5 hover:text-red-600"
                  onClick={() => onDeletePeriod(memberId, period.id)}
                  aria-label="Periode verwijderen"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </span>
        ))}
      </div>
    )
  }

  const renderOverwerkerCard = (
    row: (typeof rows)[0],
    column: OverwerkerPlanningColumn
  ) => {
    const { member, periods, status } = row
    const name = memberName(member)
    const homeShip = member.ship_id ? getShipName(member.ship_id) : null
    const canAssign =
      column === "echt_beschikbaar" || column === "mogelijk_beschikbaar"
    const hasActiveTrip = (column === "aan_boord" || column === "ingepland") && status.activeTrip
    const canSendHome = column === "aan_boord" && status.activeTrip
    const activeTripRow = status.activeTrip
      ? trips.find((t) => t.id === status.activeTrip!.id)
      : null
    const settlementInfo = activeTripRow ? parseOverwerkSettlement(activeTripRow) : null

    return (
      <Card
        key={member.id}
        className="shadow-sm cursor-pointer hover:shadow-md transition-shadow relative"
        onDoubleClick={() => openOpmerkingDialog(member)}
        title="Dubbelklik voor opmerking"
      >
        {hasActiveTrip && activeTripRow && (
          <div
            className="absolute top-2 right-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-7 w-7 bg-white shadow-sm"
              title="Reis bewerken"
              aria-label="Reis bewerken"
              onClick={() => openEditTripDialog(activeTripRow, name)}
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        <CardContent className="p-3 space-y-2">
          <div className={`flex items-start gap-2 ${hasActiveTrip ? "pr-8" : ""}`}>
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs">
                {member.first_name?.[0]}
                {member.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-gray-900 leading-tight">{name}</p>
              {member.position && (
                <p className="text-xs text-gray-600">{member.position}</p>
              )}
              {homeShip && (
                <p className="text-[11px] text-gray-500">Vast: {homeShip}</p>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-700 leading-snug">{status.reason}</p>

          {status.activeTrip?.shipName && (
            <p className="text-xs text-blue-800 flex items-center gap-1">
              <Ship className="w-3 h-3 shrink-0" />
              {status.activeTrip.shipName}
              {activeTripRow?.start_tijd
                ? ` · aan boord ${activeTripRow.start_tijd.slice(0, 5)}`
                : ""}
              {status.activeTrip.to
                ? ` · t/m ${formatDateDDMMYYYY(status.activeTrip.to)}`
                : ""}
            </p>
          )}

          {settlementInfo && settlementInfo.type !== "none" && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {settlementTypeLabel(settlementInfo.type)}
            </Badge>
          )}

          {column === "mogelijk_beschikbaar" && status.regimeStatus === "thuis" && (
            <p className="text-[11px] text-amber-800 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              Thuis — bellen voor bevestiging
            </p>
          )}

          {renderPeriodChips(member.id, periods, true)}

          {member.aflosser_opmerkingen && (
            <div
              className="bg-amber-50 border border-amber-200 rounded p-2 relative text-xs text-amber-950"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute top-1.5 right-1.5 text-amber-600 hover:text-amber-900"
                title="Opmerking verwijderen"
                onClick={() => handleRemoveOpmerking(member.id)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className="pr-5 leading-snug">{member.aflosser_opmerkingen}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
            {canAssign && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setAssignDialog({ memberId: member.id, name })
                  setAssignShipId(ships[0]?.id || "")
                  setAssignStartDate(planningDate)
                  setAssignStartTijd(format(new Date(), "HH:mm"))
                  setAssignSettlement("none")
                }}
              >
                <UserCheck className="w-3 h-3 mr-1" />
                Toewijzen
              </Button>
            )}
            {hasActiveTrip && activeTripRow && (
              <>
                {canSendHome && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() =>
                      openEndDialog(
                        status.activeTrip!.id,
                        name,
                        status.activeTrip!.shipName
                      )
                    }
                  >
                    <Home className="w-3 h-3 mr-1" />
                    Naar huis
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deletingTripId === activeTripRow.id}
                  onClick={() => handleDeleteTripClick(activeTripRow.id)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {deletingTripId === activeTripRow.id ? "..." : "Verwijderen"}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              asChild
            >
              <Link href={`/bemanning/${member.id}`}>
                <ExternalLink className="w-3 h-3 mr-1" />
                Profiel
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderPlanningColumn = (col: Exclude<OverwerkerPlanningColumn, null>) => {
    const meta = COLUMN_META[col]
    const items = planningByColumn[col]
    return (
      <div
        key={col}
        className={`flex flex-col min-h-[200px] rounded-lg border ${meta.borderClass} bg-white overflow-hidden`}
      >
        <div className={`px-3 py-2 border-b ${meta.headerClass}`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm">{meta.title}</h3>
            <Badge variant="outline" className="bg-white/80 text-xs">
              {items.length}
            </Badge>
          </div>
          <p className="text-[11px] opacity-80 mt-0.5">{meta.subtitle}</p>
        </div>
        <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[70vh]">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6 px-2">Niemand in deze kolom</p>
          ) : (
            items.map((row) => renderOverwerkerCard(row, col))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div>
              <Label htmlFor="planning-date" className="flex items-center gap-2 font-semibold">
                <CalendarDays className="w-5 h-5 text-emerald-700" />
                Planningdatum
              </Label>
              <Input
                id="planning-date"
                type="date"
                value={planningDate}
                onChange={(e) => setPlanningDate(e.target.value)}
                className="mt-2 max-w-xs bg-white"
              />
              <p className="text-xs text-gray-600 mt-1">
                Standaard vandaag ({formatDateDDMMYYYY(today)}). Wijzig voor een andere dag.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              <Badge className="bg-blue-100 text-blue-800">
                {planningCounts.aan_boord} aan boord
              </Badge>
              <Badge className="bg-violet-100 text-violet-900">
                {planningCounts.ingepland} ingepland
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                {planningCounts.echt_beschikbaar} beschikbaar
              </Badge>
              <Badge className="bg-amber-100 text-amber-900">
                {planningCounts.mogelijk_beschikbaar} mogelijk
              </Badge>
            </div>
            <Button onClick={onAddOverwerker} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Overwerker
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div>
            <p className="font-semibold text-sm">Nog in te delen</p>
            <p className="text-xs text-gray-600">
              Schip, periode en functie die nog openstaan. Haal de regel zelf weg met het kruisje als de plek is ingevuld.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_auto_auto_minmax(0,1fr)_auto] gap-2 items-end">
            <div>
              <Label htmlFor="open-plek-schip">Schip</Label>
              <Select value={plekShipId} onValueChange={setPlekShipId}>
                <SelectTrigger id="open-plek-schip" className="bg-white">
                  <SelectValue placeholder="Kies schip" />
                </SelectTrigger>
                <SelectContent>
                  {[...ships]
                    .sort((a, b) => a.name.localeCompare(b.name, "nl"))
                    .map((ship) => (
                      <SelectItem key={ship.id} value={ship.id}>
                        {ship.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="open-plek-van">Van</Label>
              <Input
                id="open-plek-van"
                type="date"
                value={plekStart}
                onChange={(e) => setPlekStart(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label htmlFor="open-plek-tot">Tot</Label>
              <Input
                id="open-plek-tot"
                type="date"
                value={plekEnd}
                onChange={(e) => setPlekEnd(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label htmlFor="open-plek-functie">Functie</Label>
              <Select value={plekPosition} onValueChange={setPlekPosition}>
                <SelectTrigger id="open-plek-functie" className="bg-white">
                  <SelectValue placeholder="Kies functie" />
                </SelectTrigger>
                <SelectContent>
                  {OVERWERK_FUNCTIES.map((functie) => (
                    <SelectItem key={functie} value={functie}>
                      {functie}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addOpenPlek} disabled={savingPlek} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Toevoegen
            </Button>
          </div>
          {openPlekken.length === 0 ? (
            <p className="text-xs text-gray-500">Nog geen open plekken.</p>
          ) : (
            <div className="space-y-1.5">
              {openPlekken.map((plek) => (
                <div
                  key={plek.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-white px-3 py-2"
                >
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{getShipName(plek.ship_id) || "Onbekend schip"}</span>
                    <span className="text-gray-500">
                      {" "}
                      · {formatDateDDMMYYYY(plek.start_date) || plek.start_date} t/m{" "}
                      {formatDateDDMMYYYY(plek.end_date) || plek.end_date} · {plek.position}
                    </span>
                  </p>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-gray-500 hover:text-red-700"
                    title="Open plek verwijderen"
                    aria-label="Open plek verwijderen"
                    onClick={() => removeOpenPlek(plek.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={pageTab} onValueChange={(v) => setPageTab(v as PageTab)}>
        <TabsList>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="alle">Alle overwerkers ({rows.length})</TabsTrigger>
          <TabsTrigger value="terug-te-staan">Terug te staan</TabsTrigger>
          <TabsTrigger value="reizen">Reizen ({overwerkTripsList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {renderPlanningColumn("aan_boord")}
            {renderPlanningColumn("ingepland")}
            {renderPlanningColumn("echt_beschikbaar")}
            {renderPlanningColumn("mogelijk_beschikbaar")}
          </div>
        </TabsContent>

        <TabsContent value="alle" className="mt-4 space-y-3">
          {alleRows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {rows.length === 0
                  ? "Nog geen overwerkers. Voeg iemand toe."
                  : "Geen overwerkers om te tonen."}
              </CardContent>
            </Card>
          ) : (
            alleRows.map(({ member, periods, status }) => {
              const name = memberName(member)
              const homeShip = member.ship_id ? getShipName(member.ship_id) : null
              const activeTripRow = status.activeTrip
                ? trips.find((t) => t.id === status.activeTrip!.id)
                : null
              return (
                <Card
                  key={member.id}
                  className="cursor-pointer hover:shadow-md transition-shadow relative"
                  onDoubleClick={() => openOpmerkingDialog(member)}
                  title="Dubbelklik voor opmerking"
                >
                  {activeTripRow && (
                    <div
                      className="absolute top-3 right-3 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 bg-white shadow-sm"
                        title="Reis bewerken"
                        aria-label="Reis bewerken"
                        onClick={() => openEditTripDialog(activeTripRow, name)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div
                        className={`flex items-start gap-3 flex-1 min-w-0 ${activeTripRow ? "pr-10" : ""}`}
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback>
                            {member.first_name?.[0]}
                            {member.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{name}</p>
                            <Badge variant="outline" className={levelBadgeClass(status.level)}>
                              {levelLabel(status.level)}
                            </Badge>
                            {member.regime && (
                              <Badge variant="outline" className="text-xs">
                                {member.regime}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{member.position}</p>
                          {homeShip && (
                            <p className="text-xs text-gray-500">Vast schip: {homeShip}</p>
                          )}
                          <p className="text-sm mt-1 text-gray-700">
                            Op {formatDateDDMMYYYY(planningDate)}: {status.reason}
                          </p>
                          {renderPeriodChips(member.id, periods)}
                          {member.aflosser_opmerkingen && (
                            <div
                              className="mt-2 bg-amber-50 border border-amber-200 rounded p-2 relative text-xs text-amber-950"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="absolute top-1.5 right-1.5 text-amber-600 hover:text-amber-900"
                                title="Opmerking verwijderen"
                                onClick={() => handleRemoveOpmerking(member.id)}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <p className="pr-5">{member.aflosser_opmerkingen}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className="flex flex-wrap gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {activeTripRow && (
                          <>
                            {status.planningColumn === "aan_boord" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  openEndDialog(
                                    status.activeTrip!.id,
                                    name,
                                    status.activeTrip!.shipName
                                  )
                                }
                              >
                                <Home className="w-4 h-4 mr-1" />
                                Naar huis
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deletingTripId === activeTripRow.id}
                              onClick={() => handleDeleteTripClick(activeTripRow.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Verwijderen
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => onAddPeriod(member.id)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Periode
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/bemanning/${member.id}`}>
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Profiel
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => onRemoveOverwerker(member.id)}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Verwijderen
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="terug-te-staan" className="mt-4">
          <StandBackManagement />
        </TabsContent>

        <TabsContent value="reizen" className="mt-4 space-y-3">
          <p className="text-sm text-gray-600">
            Alle overwerk-reizen van overwerkers in het systeem. Verwijderen haalt de reis overal weg
            (planning, schepen-overzicht, tellingen). Bij afgeronde verrekening wordt alleen het deel van
            deze reis uit terug-te-staan of salaris gehaald — andere registraties van dezelfde persoon blijven.
          </p>
          {overwerkTripsList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Geen overwerk-reizen gevonden.
              </CardContent>
            </Card>
          ) : (
            overwerkTripsList.map((trip) => {
              const member = crew.find((c) => c.id === trip.aflosser_id)
              const name = member ? memberName(member) : "Onbekend"
              const shipName = trip.ship_id ? getShipName(trip.ship_id) : "—"
              const settlement = parseOverwerkSettlement(trip)
              const from = formatDateDDMMYYYY(trip.start_datum || trip.start_date || null)
              const to = formatDateDDMMYYYY(trip.end_date || trip.eind_datum || null)
              const tripStart = normalizeTripDate(trip.start_datum || trip.start_date)
              const canEnd = trip.status === "actief" && (!tripStart || tripStart <= today)
              const canEdit = trip.status === "actief" || trip.status === "ingedeeld" || trip.status === "gepland"

              return (
                <Card key={trip.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">{name}</p>
                          <Badge variant="outline">{tripStatusLabel(trip.status)}</Badge>
                          {settlement.type !== "none" && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {settlementTypeLabel(settlement.type)}
                              {settlement.processed ? " · verwerkt" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 flex items-center gap-1">
                          <Ship className="w-3.5 h-3.5 shrink-0" />
                          {shipName}
                          {from ? ` · ${from}` : ""}
                          {trip.start_tijd ? ` ${trip.start_tijd.slice(0, 5)}` : ""}
                          {to ? ` t/m ${to}` : ""}
                          {trip.eind_tijd ? ` ${trip.eind_tijd.slice(0, 5)}` : ""}
                        </p>
                        {trip.trip_name && (
                          <p className="text-xs text-gray-500">{trip.trip_name}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {canEdit && member && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 shrink-0"
                            title="Reis bewerken"
                            aria-label="Reis bewerken"
                            onClick={() => openEditTripDialog(trip, name)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canEnd && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEndDialog(trip.id, name, shipName)}
                          >
                            <Home className="w-4 h-4 mr-1" />
                            Naar huis
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingTripId === trip.id}
                          onClick={() => handleDeleteTripClick(trip.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {deletingTripId === trip.id ? "Bezig..." : "Verwijderen"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!endDialog} onOpenChange={(open) => !open && setEndDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Naar huis: {endDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sluit de actieve overwerk-reis af
              {endDialog?.shipName ? ` (was op ${endDialog.shipName})` : ""}.
            </p>
            <div>
              <Label htmlFor="end-datum">Afgestapt op datum *</Label>
              <Input
                id="end-datum"
                type="date"
                value={endDatum}
                onChange={(e) => setEndDatum(e.target.value)}
              />
              {previewEndWorkDays?.invalid && (
                <p className="text-sm font-medium text-amber-700 mt-1.5">
                  Afstapdatum ligt vóór de startdatum van deze reis.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="end-tijd">Afgestapt om *</Label>
              <Input
                id="end-tijd"
                type="time"
                value={endTijd}
                onChange={(e) => setEndTijd(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Vóór 12:00 telt de afstapdag niet mee. Om 12:00 of later telt die dag wel. De instapdag telt altijd.
              </p>
              {previewEndWorkDays && !previewEndWorkDays.invalid && (
                <p className="text-sm font-medium text-blue-700 mt-1.5">
                  Gewerkte overwerkdagen: {previewEndWorkDays.days}{" "}
                  {previewEndWorkDays.days === 1 ? "dag" : "dagen"}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="end-opmerking">Opmerking (optioneel)</Label>
              <Textarea
                id="end-opmerking"
                value={endOpmerking}
                onChange={(e) => setEndOpmerking(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEndDialog(null)}>
                Annuleren
              </Button>
              <Button
                className="flex-1"
                disabled={!endDatum || !endTijd || ending}
                onClick={handleEndAssignment}
              >
                {ending ? "Bezig..." : "Naar huis"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!opmerkingDialog}
        onOpenChange={(open) => {
          if (!open) {
            setOpmerkingDialog(null)
            setOpmerkingText("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Opmerking: {opmerkingDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Dubbelklik op een kaart opent dit venster. Leeg laten en opslaan verwijdert de opmerking.
            </p>
            <div>
              <Label htmlFor="ow-opmerking">Opmerking</Label>
              <Textarea
                id="ow-opmerking"
                value={opmerkingText}
                onChange={(e) => setOpmerkingText(e.target.value)}
                placeholder="Bijv. bellen voor bevestiging, voorkeur schip..."
                rows={4}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setOpmerkingDialog(null)
                  setOpmerkingText("")
                }}
              >
                Annuleren
              </Button>
              <Button onClick={handleSaveOpmerking} disabled={savingOpmerking}>
                {savingOpmerking ? "Bezig..." : "Opslaan"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTripDialog} onOpenChange={(open) => !open && setEditTripDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reis bewerken: {editTripDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Schip *</Label>
              <Select value={editShipId} onValueChange={setEditShipId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies schip" />
                </SelectTrigger>
                <SelectContent>
                  {ships.map((ship) => (
                    <SelectItem key={ship.id} value={ship.id}>
                      {ship.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-start">Startdatum *</Label>
              <Input
                id="edit-start"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-start-tijd">Tijd aan boord</Label>
              <Input
                id="edit-start-tijd"
                type="time"
                value={editStartTijd}
                onChange={(e) => setEditStartTijd(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Alleen voor de administratie. Het aantal overwerkdagen verandert hier niet door.
              </p>
            </div>
            <div>
              <Label htmlFor="edit-end">Einddatum (optioneel)</Label>
              <Input
                id="edit-end"
                type="date"
                value={editEndDate}
                min={editStartDate}
                onChange={(e) => setEditEndDate(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEditTripDialog(null)}>
                Annuleren
              </Button>
              <Button
                onClick={handleSaveTripEdit}
                disabled={!editShipId || !editStartDate || savingTrip}
              >
                {savingTrip ? "Bezig..." : "Opslaan"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignDialog} onOpenChange={(open) => !open && setAssignDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Toewijzen: {assignDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Vast schip blijft ongewijzigd — dit is alleen de overwerk-reis op het gekozen schip.
            </p>
            <div>
              <Label>Schip *</Label>
              <Select value={assignShipId} onValueChange={setAssignShipId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies schip" />
                </SelectTrigger>
                <SelectContent>
                  {ships.map((ship) => (
                    <SelectItem key={ship.id} value={ship.id}>
                      {ship.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assign-start">Startdatum *</Label>
              <Input
                id="assign-start"
                type="date"
                value={assignStartDate}
                onChange={(e) => setAssignStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="assign-start-tijd">Tijd aan boord</Label>
              <Input
                id="assign-start-tijd"
                type="time"
                value={assignStartTijd}
                onChange={(e) => setAssignStartTijd(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Alleen voor de administratie. De eerste overwerkdag telt altijd, ongeacht dit tijdstip.
              </p>
            </div>
            <div>
              <Label className="mb-2 block">Verrekening na afloop</Label>
              <RadioGroup
                value={assignSettlement}
                onValueChange={(v) => setAssignSettlement(v as OverwerkSettlementType)}
                className="space-y-2"
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="none" id="settlement-none" className="mt-1" />
                  <Label htmlFor="settlement-none" className="font-normal cursor-pointer text-sm">
                    Geen verrekening
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="pay" id="settlement-pay" className="mt-1" />
                  <Label htmlFor="settlement-pay" className="font-normal cursor-pointer text-sm">
                    Overwerk extra uitbetalen (komt in salarislijst)
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="inhale" id="settlement-inhale" className="mt-1" />
                  <Label htmlFor="settlement-inhale" className="font-normal cursor-pointer text-sm">
                    Dagen inhalen (af van terug-te-staan, rest wordt tegoed)
                  </Label>
                </div>
              </RadioGroup>
              {assignDialog && assignSettlement === "inhale" && (() => {
                const bal = getStandBackBalanceSummary(standBackRecords, assignDialog.memberId)
                return (
                  <p className="text-xs text-gray-600 mt-2 rounded border bg-slate-50 p-2">
                    {bal.net > 0 && (
                      <span className="text-emerald-700">
                        Huidig saldo: +{bal.net} dag(en) tegoed. Overwerk telt hierbij op of verrekent mindagen.
                      </span>
                    )}
                    {bal.net < 0 && (
                      <span>{Math.abs(bal.net)} dag(en) nog in te halen. Overwerk verrekent eerst met dit saldo.</span>
                    )}
                    {bal.net === 0 && (
                      <span>Saldo 0 — overwerk wordt na afloop als +tegoed geregistreerd.</span>
                    )}
                  </p>
                )
              })()}
              {assignSettlement === "pay" && (
                <p className="text-xs text-gray-500 mt-2">
                  Bij &quot;Naar huis&quot; worden gewerkte dagen toegevoegd aan overwerk in de salarismaand
                  van de einddatum.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAssignDialog(null)}>
                Annuleren
              </Button>
              <Button
                className="flex-1"
                disabled={!assignShipId || !assignStartDate || assigning}
                onClick={handleAssign}
              >
                {assigning ? "Bezig..." : "Toewijzen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
