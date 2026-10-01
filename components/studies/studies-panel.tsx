"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { isRealCrewMember } from "@/utils/crew-filters"
import {
  formatEuro,
  isOpenStudyDebt,
  parseIsoDate,
  studyAsOfDate,
  studyDebtSnapshot,
  STUDY_VEST_PER_YEAR,
} from "@/utils/study-debt"
import { GraduationCap, Plus, Search, User, Euro, Clock, CheckCircle, Trash2 } from "lucide-react"

type StudyForm = {
  crew_id: string
  name: string
  amount: string
  paid_on: string
  notes: string
}

const emptyForm = (): StudyForm => ({
  crew_id: "",
  name: "",
  amount: "",
  paid_on: new Date().toISOString().slice(0, 10),
  notes: "",
})

function yearsLabel(years: number): string {
  return years === 1 ? "1 jaar" : `${years} jaar`
}

function formatDateLabel(value: string | Date | null | undefined): string {
  if (!value) return "—"
  if (value instanceof Date) return format(value, "dd-MM-yyyy")
  const parsed = parseIsoDate(value)
  return parsed ? format(parsed, "dd-MM-yyyy") : "—"
}

type StudiesPanelProps = {
  crew: any[]
  studyDebts: any[]
  studyDebtsUnavailable?: boolean
  addStudyDebt: (studyData: any) => Promise<any>
  updateStudyDebt: (studyId: string, updates: any) => Promise<any>
  deleteStudyDebt: (studyId: string) => Promise<void>
}

export function StudiesPanel({
  crew,
  studyDebts,
  studyDebtsUnavailable = false,
  addStudyDebt,
  updateStudyDebt,
  deleteStudyDebt,
}: StudiesPanelProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<StudyForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const crewById = useMemo(() => {
    const map = new Map<string, any>()
    for (const member of crew || []) map.set(member.id, member)
    return map
  }, [crew])

  const selectableCrew = useMemo(() => {
    return (crew || []).filter((member: any) => isRealCrewMember(member) || member.id === form.crew_id)
  }, [crew, form.crew_id])

  const rows = useMemo(() => {
    return (studyDebts || []).map((study: any) => {
      const member = crewById.get(study.crew_id)
      const asOf = studyAsOfDate(member)
      const snapshot = studyDebtSnapshot(Number(study.amount || 0), String(study.paid_on || ""), asOf)
      const outOfService = String(member?.status || "") === "uit-dienst"
      const open = isOpenStudyDebt(study, member)
      return { study, member, snapshot, outOfService, open }
    })
  }, [studyDebts, crewById])

  const filtered = rows.filter(({ study, member }) => {
    if (!searchTerm.trim()) return true
    const name = member ? `${member.first_name} ${member.last_name}` : ""
    const haystack = `${name} ${study.name || ""} ${study.notes || ""}`.toLowerCase()
    return haystack.includes(searchTerm.trim().toLowerCase())
  })

  const openRows = filtered.filter((row) => row.open)
  const closedRows = filtered.filter((row) => !row.open)
  const openRemaining = openRows.reduce((sum, row) => sum + row.snapshot.remaining, 0)

  const openDialog = (study?: any) => {
    if (study) {
      setEditingId(study.id)
      setForm({
        crew_id: study.crew_id || "",
        name: study.name || "",
        amount: study.amount != null ? String(study.amount) : "",
        paid_on: String(study.paid_on || "").slice(0, 10),
        notes: study.notes || "",
      })
    } else {
      setEditingId(null)
      setForm(emptyForm())
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.crew_id || !form.name.trim() || !form.paid_on) {
      alert("Vul bemanningslid, studie en betaaldatum in.")
      return
    }
    const amount = parseFloat(form.amount.replace(",", "."))
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Vul een geldig bedrag in.")
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.paid_on)) {
      alert("Kies een geldige betaaldatum.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        crew_id: form.crew_id,
        name: form.name.trim(),
        amount,
        paid_on: form.paid_on,
        notes: form.notes.trim() || null,
      }
      if (editingId) {
        await updateStudyDebt(editingId, payload)
      } else {
        await addStudyDebt({
          id: `study-${Date.now()}`,
          ...payload,
          settled_at: null,
          settled_amount: null,
        })
      }
      setDialogOpen(false)
      setEditingId(null)
      setForm(emptyForm())
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Opslaan van de studie is mislukt."
      alert(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (study: any) => {
    const ok = window.confirm(`Studie "${study.name}" verwijderen? Dit haalt de registratie weg.`)
    if (!ok) return
    try {
      await deleteStudyDebt(study.id)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Verwijderen is mislukt.")
    }
  }

  const handleSettle = async (study: any, remaining: number) => {
    const ok = window.confirm(
      `${formatEuro(remaining)} als verrekend met het laatste salaris markeren? De studie verdwijnt daarna uit de open lijst.`
    )
    if (!ok) return
    try {
      await updateStudyDebt(study.id, {
        settled_at: new Date().toISOString(),
        settled_amount: remaining,
      })
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Verrekenen is mislukt.")
    }
  }

  const handleUnsettle = async (study: any) => {
    try {
      await updateStudyDebt(study.id, {
        settled_at: null,
        settled_amount: null,
      })
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Ongedaan maken is mislukt.")
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Studies</h2>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Registreer een studie als iemand geslaagd is en wij de rekening hebben betaald. Elk vol jaar in
            dienst na die betaaldatum vervalt {formatEuro(STUDY_VEST_PER_YEAR)}. Een niet afgemaakt jaar telt
            niet mee.
          </p>
        </div>
        <Button onClick={() => openDialog()} disabled={studyDebtsUnavailable}>
          <Plus className="w-4 h-4 mr-2" />
          Studie registreren
        </Button>
      </div>

      {studyDebtsUnavailable && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            De studietabel bestaat nog niet in de database. Voer eenmalig{" "}
            <span className="font-mono">scripts/create-study-debts-table.sql</span> uit in de Supabase SQL
            Editor. Daarna kun je studies registreren.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Open studies</p>
                <p className="text-2xl font-bold text-orange-600">{openRows.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Euro className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Nog open bedrag</p>
                <p className="text-2xl font-bold text-purple-600">{formatEuro(openRemaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Vervallen of verrekend</p>
                <p className="text-2xl font-bold text-green-600">{closedRows.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Zoek op naam of studie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <h3 className="text-lg font-semibold text-gray-900 mb-3">Openstaand</h3>
      {openRows.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Geen openstaande studies.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 mb-8">
          {openRows.map(({ study, member, snapshot, outOfService }) => (
            <StudyCard
              key={study.id}
              study={study}
              member={member}
              snapshot={snapshot}
              outOfService={outOfService}
              onEdit={() => openDialog(study)}
              onDelete={() => handleDelete(study)}
              onSettle={() => handleSettle(study, snapshot.remaining)}
            />
          ))}
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-3">Vervallen</h3>
      {closedRows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">Nog geen vervallen studies.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {closedRows.map(({ study, member, snapshot }) => {
            const memberName = member ? `${member.first_name} ${member.last_name}` : "Onbekend"
            const settled = Boolean(study.settled_at)
            const settledAmount = study.settled_amount != null ? Number(study.settled_amount) : snapshot.remaining
            return (
              <Card key={study.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{memberName}</span>
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          {settled ? "Verrekend" : "Vervallen"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{study.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Betaald {formatEuro(Number(study.amount || 0))} op {formatDateLabel(study.paid_on)}
                        {settled
                          ? ` · ${formatEuro(settledAmount)} verrekend met salaris${
                              study.settled_at ? ` op ${format(new Date(study.settled_at), "dd-MM-yyyy")}` : ""
                            }`
                          : ` · volledig vervallen na ${yearsLabel(snapshot.yearsInServiceAfterPayment)} in dienst na betaling`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {settled && (
                        <Button size="sm" variant="outline" onClick={() => handleUnsettle(study)}>
                          Ongedaan maken
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(study)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Studie wijzigen" : "Studie registreren"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Alleen invullen nadat iemand geslaagd is en wij de rekening volledig hebben betaald.
            </p>
            <div>
              <Label>Bemanningslid *</Label>
              <Select value={form.crew_id} onValueChange={(value) => setForm((prev) => ({ ...prev, crew_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer bemanningslid" />
                </SelectTrigger>
                <SelectContent>
                  {selectableCrew.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                      {member.position ? ` - ${member.position}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="study-name">Studie *</Label>
              <Input
                id="study-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Bijv. Schipper"
              />
            </div>
            <div>
              <Label htmlFor="study-amount">Bedrag dat wij betaald hebben (€) *</Label>
              <Input
                id="study-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="2000.00"
              />
            </div>
            <div>
              <Label htmlFor="study-paid-on">Betaaldatum *</Label>
              <Input
                id="study-paid-on"
                type="date"
                value={form.paid_on}
                onChange={(e) => setForm((prev) => ({ ...prev, paid_on: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Vanaf deze datum telt “in dienst na betaling”. Elk jaar op deze dag vervalt{" "}
                {formatEuro(STUDY_VEST_PER_YEAR)}.
              </p>
            </div>
            <div>
              <Label htmlFor="study-notes">Notitie</Label>
              <Textarea
                id="study-notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Opslaan…" : "Opslaan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StudyCard({
  study,
  member,
  snapshot,
  outOfService,
  onEdit,
  onDelete,
  onSettle,
}: {
  study: any
  member: any
  snapshot: ReturnType<typeof studyDebtSnapshot>
  outOfService: boolean
  onEdit: () => void
  onDelete: () => void
  onSettle: () => void
}) {
  const total = Number(study.amount || 0)
  const progress = total > 0 ? Math.min(100, (snapshot.vested / total) * 100) : 0
  const memberName = member ? `${member.first_name} ${member.last_name}` : "Onbekend"

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-gray-400" />
              <h4 className="font-medium text-gray-900">{memberName}</h4>
              {outOfService && (
                <Badge variant="outline" className="text-red-700 border-red-300">
                  Uit dienst
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-700">{study.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              Betaald {formatEuro(total)} op {formatDateLabel(study.paid_on)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Nog open</p>
            <p className="text-2xl font-bold text-orange-600">{formatEuro(snapshot.remaining)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">In dienst na betaling</p>
            <p className="font-medium text-gray-900">{yearsLabel(snapshot.yearsInServiceAfterPayment)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Vervallen</p>
            <p className="font-medium text-gray-900">{formatEuro(snapshot.vested)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Nog te gaan</p>
            <p className="font-medium text-gray-900">
              {snapshot.yearsLeft === 0
                ? "—"
                : `${yearsLabel(snapshot.yearsLeft)}${
                    snapshot.nextVestDate
                      ? `, volgende ${formatEuro(snapshot.nextVestAmount)} op ${format(snapshot.nextVestDate, "dd-MM-yyyy", { locale: nl })}`
                      : ""
                  }`}
            </p>
          </div>
        </div>

        <Progress value={progress} className="h-2 mb-3" />

        {outOfService && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            {formatEuro(snapshot.remaining)} kan op het laatste salaris worden ingehouden. Het bedrag is bevroren
            op de uit-dienstdatum.
          </div>
        )}

        {study.notes && <p className="text-xs text-gray-500 mb-3">{study.notes}</p>}

        <div className="flex flex-wrap gap-2">
          {outOfService && (
            <Button size="sm" variant="destructive" onClick={onSettle}>
              Verrekend met salaris
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEdit}>
            Wijzigen
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-1" />
            Verwijderen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
