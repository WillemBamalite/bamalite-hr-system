"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  UserX,
  X,
} from "lucide-react"
import {
  evaluateOverwerkerOnDate,
  levelBadgeClass,
  levelLabel,
  type OverwerkerPeriod,
  type OverwerkerPlanningColumn,
} from "@/utils/overwerker-availability"
import {
  getStandBackBalanceSummary,
  parseOverwerkSettlement,
  settlementTypeLabel,
  type OverwerkSettlementType,
} from "@/utils/overwerk-settlement"

type PageTab = "planning" | "alle"

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
  echt_beschikbaar: {
    title: "Nu beschikbaar",
    subtitle: "Expliciete beschikbaarheidsperiode op deze datum",
    headerClass: "bg-green-50 text-green-900 border-green-200",
    borderClass: "border-green-200",
  },
  mogelijk_beschikbaar: {
    title: "Mogelijk beschikbaar",
    subtitle: "Vrije week + thuis volgens regime — eerst bellen",
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
    eind_datum?: string | null
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
    settlement?: OverwerkSettlementType
  ) => Promise<void>
  onEndAssignment: (
    tripId: string,
    eindDatum: string,
    eindTijd: string,
    opmerking?: string
  ) => Promise<void>
}

function memberName(member: { first_name?: string; last_name?: string }) {
  return `${member.first_name || ""} ${member.last_name || ""}`.trim()
}

function matchesSearch(
  member: { first_name?: string; last_name?: string; position?: string },
  q: string
) {
  if (!q) return true
  const name = memberName(member).toLowerCase()
  return name.includes(q) || (member.position || "").toLowerCase().includes(q)
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
}: OverwerkersPlanningProps) {
  const today = format(new Date(), "yyyy-MM-dd")
  const nowTime = format(new Date(), "HH:mm")
  const [pageTab, setPageTab] = useState<PageTab>("planning")
  const [planningDate, setPlanningDate] = useState(today)
  const [search, setSearch] = useState("")
  const [assignDialog, setAssignDialog] = useState<{ memberId: string; name: string } | null>(null)
  const [assignShipId, setAssignShipId] = useState("")
  const [assignEndDate, setAssignEndDate] = useState("")
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

  const q = search.trim().toLowerCase()

  const planningByColumn = useMemo(() => {
    const cols: Record<
      Exclude<OverwerkerPlanningColumn, null>,
      typeof rows
    > = {
      aan_boord: [],
      echt_beschikbaar: [],
      mogelijk_beschikbaar: [],
    }
    rows
      .filter(({ member }) => matchesSearch(member, q))
      .forEach((row) => {
        const col = row.status.planningColumn
        if (col) cols[col].push(row)
      })
    const sortByName = (a: (typeof rows)[0], b: (typeof rows)[0]) =>
      memberName(a.member).localeCompare(memberName(b.member), "nl")
    ;(Object.keys(cols) as Array<keyof typeof cols>).forEach((k) => cols[k].sort(sortByName))
    return cols
  }, [rows, q])

  const alleRows = useMemo(() => {
    return rows
      .filter(({ member }) => matchesSearch(member, q))
      .sort((a, b) => memberName(a.member).localeCompare(memberName(b.member), "nl"))
  }, [rows, q])

  const planningCounts = useMemo(
    () => ({
      aan_boord: planningByColumn.aan_boord.length,
      echt_beschikbaar: planningByColumn.echt_beschikbaar.length,
      mogelijk_beschikbaar: planningByColumn.mogelijk_beschikbaar.length,
    }),
    [planningByColumn]
  )

  const openEndDialog = (tripId: string, name: string, shipName?: string) => {
    setEndDialog({ tripId, name, shipName })
    setEndDatum(format(new Date(), "yyyy-MM-dd"))
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

  const handleAssign = async () => {
    if (!assignDialog || !assignShipId) return
    setAssigning(true)
    try {
      await onAssignToShip(
        assignDialog.memberId,
        assignShipId,
        planningDate,
        assignEndDate || undefined,
        assignSettlement
      )
      setAssignDialog(null)
      setAssignShipId("")
      setAssignEndDate("")
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
    const hasActiveTrip = column === "aan_boord" && status.activeTrip
    const activeTripRow = status.activeTrip
      ? trips.find((t) => t.id === status.activeTrip!.id)
      : null
    const settlementInfo = activeTripRow ? parseOverwerkSettlement(activeTripRow) : null

    return (
      <Card key={member.id} className="shadow-sm">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-2">
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
              {status.activeTrip.to
                ? ` t/m ${formatDateDDMMYYYY(status.activeTrip.to)}`
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

          <div className="flex flex-wrap gap-1 pt-1">
            {canAssign && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setAssignDialog({ memberId: member.id, name })
                  setAssignShipId(ships[0]?.id || "")
                  setAssignSettlement("none")
                }}
              >
                <UserCheck className="w-3 h-3 mr-1" />
                Toewijzen
              </Button>
            )}
            {hasActiveTrip && status.activeTrip && (
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

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Zoek op naam of functie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Tabs value={pageTab} onValueChange={(v) => setPageTab(v as PageTab)}>
        <TabsList>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="alle">Alle overwerkers ({rows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {renderPlanningColumn("aan_boord")}
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
                  : "Geen resultaten voor deze zoekopdracht."}
              </CardContent>
            </Card>
          ) : (
            alleRows.map(({ member, periods, status }) => {
              const name = memberName(member)
              const homeShip = member.ship_id ? getShipName(member.ship_id) : null
              return (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
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
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
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
            </div>
            <div>
              <Label htmlFor="end-tijd">Afgestapt om *</Label>
              <Input
                id="end-tijd"
                type="time"
                value={endTijd}
                onChange={(e) => setEndTijd(e.target.value)}
              />
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

      <Dialog open={!!assignDialog} onOpenChange={(open) => !open && setAssignDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Toewijzen: {assignDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Actieve overwerk-reis vanaf {formatDateDDMMYYYY(planningDate)}. Vast schip blijft
              ongewijzigd.
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
              <Label htmlFor="assign-end">Einddatum (optioneel)</Label>
              <Input
                id="assign-end"
                type="date"
                value={assignEndDate}
                min={planningDate}
                onChange={(e) => setAssignEndDate(e.target.value)}
              />
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
                    {bal.outstanding > 0 && (
                      <span>{bal.outstanding} dag(en) nog in te halen. </span>
                    )}
                    {bal.credit > 0 && (
                      <span className="text-emerald-700">{bal.credit} dag(en) tegoed. </span>
                    )}
                    {bal.outstanding === 0 && bal.credit === 0 && (
                      <span>Geen openstaand saldo — overwerk wordt na afloop als tegoed geregistreerd.</span>
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
                disabled={!assignShipId || assigning}
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
