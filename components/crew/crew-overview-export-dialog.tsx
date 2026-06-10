"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { countsAsTotalCrewMember } from "@/utils/crew-filters"
import {
  CREW_EXPORT_FIELDS,
  CREW_EXPORT_RANKS,
  filterCrewByRanks,
  getCrewRankKey,
  type CrewExportFieldId,
  type CrewExportRankId,
} from "@/utils/crew-overview-export-fields"
import { generateCrewOverviewPdf } from "@/utils/crew-overview-export-pdf"

type ShipRow = { id: string; name: string }

const DEFAULT_RANKS = CREW_EXPORT_RANKS.map((r) => r.id)

function getOverviewCrew(crew: any[]): any[] {
  return (crew || []).filter(Boolean).filter(countsAsTotalCrewMember)
}

export function CrewOverviewExportDialog({
  open,
  onOpenChange,
  crew,
  ships,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  crew: any[]
  ships: ShipRow[]
}) {
  const overviewCrew = useMemo(() => getOverviewCrew(crew), [crew])
  const defaultFields = useMemo(
    () => CREW_EXPORT_FIELDS.filter((f) => f.defaultSelected).map((f) => f.id),
    []
  )
  const [selectedFields, setSelectedFields] = useState<CrewExportFieldId[]>(defaultFields)
  const [selectedRanks, setSelectedRanks] = useState<CrewExportRankId[]>(DEFAULT_RANKS)
  const [busy, setBusy] = useState(false)

  const rankCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const member of overviewCrew) {
      const key = getCrewRankKey(member)
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [overviewCrew])

  const exportCrew = useMemo(
    () => filterCrewByRanks(overviewCrew, selectedRanks),
    [overviewCrew, selectedRanks]
  )

  useEffect(() => {
    if (open) {
      setSelectedFields(defaultFields)
      setSelectedRanks(DEFAULT_RANKS)
    }
  }, [open, defaultFields])

  const allFieldsSelected = CREW_EXPORT_FIELDS.every((f) => selectedFields.includes(f.id))
  const allRanksSelected = CREW_EXPORT_RANKS.every((r) => selectedRanks.includes(r.id))

  const toggleField = (id: CrewExportFieldId, on: boolean) => {
    setSelectedFields((prev) => {
      if (on) return Array.from(new Set([...prev, id]))
      if (id === "name") return prev
      return prev.filter((x) => x !== id)
    })
  }

  const toggleAllFields = (on: boolean) => {
    setSelectedFields(on ? CREW_EXPORT_FIELDS.map((f) => f.id) : ["name"])
  }

  const toggleRank = (id: CrewExportRankId, on: boolean) => {
    setSelectedRanks((prev) => {
      if (on) return Array.from(new Set([...prev, id]))
      return prev.filter((x) => x !== id)
    })
  }

  const toggleAllRanks = (on: boolean) => {
    setSelectedRanks(on ? [...DEFAULT_RANKS] : [])
  }

  const runDownload = async () => {
    const fields = selectedFields.length > 0 ? selectedFields : defaultFields
    if (fields.length === 0) {
      alert("Selecteer minimaal één kolom.")
      return
    }
    if (selectedRanks.length === 0) {
      alert("Selecteer minimaal één functie/rang.")
      return
    }
    if (exportCrew.length === 0) {
      alert("Geen bemanningsleden geselecteerd om te exporteren.")
      return
    }
    setBusy(true)
    try {
      const blob = await generateCrewOverviewPdf({
        members: exportCrew,
        ships,
        fieldIds: fields,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Bemanning_overzicht_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      alert("PDF kon niet worden gemaakt. Probeer het opnieuw.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Contactoverzicht downloaden (PDF)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-hidden flex-1 min-h-0 flex flex-col">
          <p className="text-sm text-gray-600">
            Kies welke functies en kolommen in de PDF staan. Geselecteerd: {exportCrew.length} van{" "}
            {overviewCrew.length} bemanningsleden.
          </p>

          <div className="flex flex-col min-h-0 border rounded-md p-3">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-sm font-semibold text-gray-900">Functie / rang</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="crew-export-all-ranks"
                  checked={allRanksSelected}
                  onCheckedChange={(v) => toggleAllRanks(Boolean(v))}
                />
                <label htmlFor="crew-export-all-ranks" className="text-xs text-gray-700 cursor-pointer">
                  Alles selecteren
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CREW_EXPORT_RANKS.map((rank) => {
                const count = rankCounts[rank.id] || 0
                return (
                  <div key={rank.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`crew-rank-${rank.id}`}
                      checked={selectedRanks.includes(rank.id)}
                      onCheckedChange={(v) => toggleRank(rank.id, Boolean(v))}
                    />
                    <label htmlFor={`crew-rank-${rank.id}`} className="text-sm cursor-pointer">
                      {rank.label}
                      <span className="text-gray-500 ml-1">({count})</span>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col min-h-0 border rounded-md p-3">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-sm font-semibold text-gray-900">Kolommen</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="crew-export-all-fields"
                  checked={allFieldsSelected}
                  onCheckedChange={(v) => toggleAllFields(Boolean(v))}
                />
                <label htmlFor="crew-export-all-fields" className="text-xs text-gray-700 cursor-pointer">
                  Alles selecteren
                </label>
              </div>
            </div>
            <ScrollArea className="h-[180px]">
              <div className="space-y-2 pr-2">
                {CREW_EXPORT_FIELDS.map((field) => {
                  const locked = field.id === "name"
                  return (
                    <div key={field.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`crew-field-${field.id}`}
                        checked={selectedFields.includes(field.id)}
                        disabled={locked}
                        onCheckedChange={(v) => toggleField(field.id, Boolean(v))}
                      />
                      <label
                        htmlFor={`crew-field-${field.id}`}
                        className={`text-sm cursor-pointer ${locked ? "text-gray-500" : ""}`}
                      >
                        {field.label}
                        {locked ? " (altijd)" : ""}
                      </label>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Annuleren
            </Button>
            <Button
              type="button"
              onClick={() => void runDownload()}
              disabled={busy || exportCrew.length === 0 || selectedRanks.length === 0}
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CrewOverviewExportButton({ crew, ships }: { crew: any[]; ships: ShipRow[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Download className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
      <CrewOverviewExportDialog open={open} onOpenChange={setOpen} crew={crew} ships={ships} />
    </>
  )
}
