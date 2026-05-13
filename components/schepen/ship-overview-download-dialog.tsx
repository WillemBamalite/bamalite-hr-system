"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getShipCertificateStorageKeyByName, getAllTemplateCertificateNames } from "@/utils/ship-certificates"
import { getShipParticularsConfigByName } from "@/app/schepen/overzicht/ship-particulars-registry"
import { collectParticularFieldCatalog } from "@/utils/ship-particulars-field-catalog"
import { generateShipOverviewPdf } from "@/utils/ship-overview-export-pdf"

type ShipRow = { id: string; name: string }

export function ShipOverviewDownloadDialog({
  open,
  onOpenChange,
  ships,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ships: ShipRow[]
}) {
  const exportableShips = useMemo(() => {
    return [...ships]
      .filter((s) => {
        const n = String(s.name || "").trim()
        return Boolean(getShipCertificateStorageKeyByName(n) || getShipParticularsConfigByName(n))
      })
      .sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" }))
  }, [ships])

  const certificateOptions = useMemo(() => getAllTemplateCertificateNames(), [])
  const particularOptions = useMemo(() => collectParticularFieldCatalog(), [])

  const [selectedShipIds, setSelectedShipIds] = useState<string[]>([])
  const [selectedCerts, setSelectedCerts] = useState<string[]>([])
  const [selectedParticulars, setSelectedParticulars] = useState<string[]>([])
  const [certFilter, setCertFilter] = useState("")
  const [partFilter, setPartFilter] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedShipIds(exportableShips.map((s) => s.id))
    }
  }, [open, exportableShips])

  const filteredCerts = useMemo(() => {
    const q = certFilter.trim().toLowerCase()
    if (!q) return certificateOptions
    return certificateOptions.filter((n) => n.toLowerCase().includes(q))
  }, [certificateOptions, certFilter])

  const filteredParts = useMemo(() => {
    const q = partFilter.trim().toLowerCase()
    if (!q) return particularOptions
    return particularOptions.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.section.toLowerCase().includes(q) ||
        `${p.section} ${p.label}`.toLowerCase().includes(q)
    )
  }, [particularOptions, partFilter])

  const allShipsSelected =
    exportableShips.length > 0 && exportableShips.every((s) => selectedShipIds.includes(s.id))

  const toggleShip = (id: string, on: boolean) => {
    setSelectedShipIds((prev) => {
      if (on) return Array.from(new Set([...prev, id]))
      return prev.filter((x) => x !== id)
    })
  }

  const toggleAllShips = (on: boolean) => {
    setSelectedShipIds(on ? exportableShips.map((s) => s.id) : [])
  }

  const toggleCert = (name: string, on: boolean) => {
    setSelectedCerts((prev) => {
      if (on) return Array.from(new Set([...prev, name]))
      return prev.filter((x) => x !== name)
    })
  }

  const toggleAllCerts = (on: boolean) => {
    setSelectedCerts(on ? [...filteredCerts] : [])
  }

  const togglePart = (id: string, on: boolean) => {
    setSelectedParticulars((prev) => {
      if (on) return Array.from(new Set([...prev, id]))
      return prev.filter((x) => x !== id)
    })
  }

  const toggleAllParts = (on: boolean) => {
    setSelectedParticulars(on ? filteredParts.map((p) => p.id) : [])
  }

  const runDownload = async () => {
    const shipRows = exportableShips.filter((s) => selectedShipIds.includes(s.id))
    if (shipRows.length === 0) {
      alert("Selecteer minimaal één schip.")
      return
    }
    if (selectedCerts.length === 0 && selectedParticulars.length === 0) {
      alert("Selecteer minimaal één certificaat of één scheepsgegeven.")
      return
    }
    setBusy(true)
    try {
      const blob = await generateShipOverviewPdf({
        ships: shipRows,
        certificateNames: selectedCerts,
        particularFieldIds: selectedParticulars,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Schepen_overzicht_${new Date().toISOString().slice(0, 10)}_${Date.now()}.pdf`
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

  const certsInViewSelected =
    filteredCerts.length > 0 && filteredCerts.every((c) => selectedCerts.includes(c))
  const partsInViewSelected =
    filteredParts.length > 0 && filteredParts.every((p) => selectedParticulars.includes(p.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Overzicht downloaden (PDF)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-hidden flex-1 min-h-0 flex flex-col">
          <p className="text-sm text-gray-600">
            Kies schepen en welke certificaten en/of scheepsgegevens in de PDF horen. Alleen schepen met
            certificaat- of particulars-configuratie staan in de lijst.
          </p>

          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <span className="text-sm font-semibold text-gray-900">Schepen</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ov-all-ships"
                  checked={allShipsSelected}
                  onCheckedChange={(v) => toggleAllShips(Boolean(v))}
                />
                <label htmlFor="ov-all-ships" className="text-xs text-gray-700 cursor-pointer">
                  Selecteer alles
                </label>
              </div>
            </div>
            <ScrollArea className="h-[120px] rounded-md border p-2">
              <div className="space-y-2 pr-2">
                {exportableShips.length === 0 ? (
                  <p className="text-sm text-gray-500">Geen exporteerbare schepen.</p>
                ) : (
                  exportableShips.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`ov-ship-${s.id}`}
                        checked={selectedShipIds.includes(s.id)}
                        onCheckedChange={(v) => toggleShip(s.id, Boolean(v))}
                      />
                      <label htmlFor={`ov-ship-${s.id}`} className="text-sm cursor-pointer">
                        {s.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 flex-1">
            <div className="flex flex-col min-h-0 border rounded-md p-2">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-semibold">Certificaten</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Checkbox
                    id="ov-all-certs"
                    checked={certsInViewSelected}
                    onCheckedChange={(v) => toggleAllCerts(Boolean(v))}
                  />
                  <label htmlFor="ov-all-certs" className="text-xs cursor-pointer whitespace-nowrap">
                    Alles in lijst
                  </label>
                </div>
              </div>
              <Input
                placeholder="Zoek certificaat…"
                value={certFilter}
                onChange={(e) => setCertFilter(e.target.value)}
                className="mb-2 h-8 text-sm"
              />
              <ScrollArea className="h-[180px]">
                <div className="space-y-1.5 pr-2">
                  {filteredCerts.map((name) => (
                    <div key={name} className="flex items-start gap-2">
                      <Checkbox
                        id={`ov-cert-${name}`}
                        checked={selectedCerts.includes(name)}
                        onCheckedChange={(v) => toggleCert(name, Boolean(v))}
                        className="mt-0.5"
                      />
                      <label htmlFor={`ov-cert-${name}`} className="text-xs leading-snug cursor-pointer">
                        {name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex flex-col min-h-0 border rounded-md p-2">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-semibold">Scheepsgegevens</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Checkbox
                    id="ov-all-parts"
                    checked={partsInViewSelected}
                    onCheckedChange={(v) => toggleAllParts(Boolean(v))}
                  />
                  <label htmlFor="ov-all-parts" className="text-xs cursor-pointer whitespace-nowrap">
                    Alles in lijst
                  </label>
                </div>
              </div>
              <Input
                placeholder="Zoek veld (bv. hoofdmotor)…"
                value={partFilter}
                onChange={(e) => setPartFilter(e.target.value)}
                className="mb-2 h-8 text-sm"
              />
              <ScrollArea className="h-[180px]">
                <div className="space-y-1.5 pr-2">
                  {filteredParts.map((p) => (
                    <div key={p.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`ov-part-${p.id}`}
                        checked={selectedParticulars.includes(p.id)}
                        onCheckedChange={(v) => togglePart(p.id, Boolean(v))}
                        className="mt-0.5"
                      />
                      <label htmlFor={`ov-part-${p.id}`} className="text-xs leading-snug cursor-pointer">
                        <span className="text-gray-500">{p.section}</span>
                        <span className="mx-1">·</span>
                        <span className="font-medium text-gray-800">{p.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Annuleren
            </Button>
            <Button type="button" onClick={() => void runDownload()} disabled={busy}>
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

export function ShipOverviewDownloadButton({ ships }: { ships: ShipRow[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant="default" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
        <Download className="w-4 h-4 mr-2" />
        Overzicht downloaden
      </Button>
      <ShipOverviewDownloadDialog open={open} onOpenChange={setOpen} ships={ships} />
    </>
  )
}
