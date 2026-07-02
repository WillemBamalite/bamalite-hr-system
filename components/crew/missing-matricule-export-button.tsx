"use client"

import { useMemo, useState } from "react"
import { FileWarning, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { countsAsTotalCrewMember } from "@/utils/crew-filters"
import { generateMissingMatriculePdf } from "@/utils/missing-matricule-pdf"

type ShipRow = { id: string; name: string }

export function MissingMatriculeExportButton({
  crew,
  ships,
}: {
  crew: any[]
  ships: ShipRow[]
}) {
  const [busy, setBusy] = useState(false)

  const overviewCrew = useMemo(
    () => (crew || []).filter(Boolean).filter(countsAsTotalCrewMember),
    [crew]
  )

  const missingCount = useMemo(
    () => overviewCrew.filter((m) => !String(m.matricule || "").trim()).length,
    [overviewCrew]
  )

  const handleDownload = async () => {
    setBusy(true)
    try {
      const missing = overviewCrew.filter((m) => !String(m.matricule || "").trim())
      const blob = await generateMissingMatriculePdf({
        members: missing,
        ships,
        totalCrewCount: overviewCrew.length,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `matricule-ontbreekt-${date}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert("PDF kon niet worden gegenereerd.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleDownload}
      disabled={busy || missingCount === 0}
      title={
        missingCount === 0
          ? "Alle bemanningsleden hebben een matricule"
          : `${missingCount} bemanningsleden zonder matricule`
      }
    >
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileWarning className="mr-2 h-4 w-4" />
      )}
      Matricule ontbreekt ({missingCount})
    </Button>
  )
}
