"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { countsAsTotalCrewMember } from "@/utils/crew-filters"
import {
  A1_MISSING_FIELD_LABELS,
  assessLuxembourgA1Readiness,
  sortCrewByName,
} from "@/utils/luxembourg-a1-readiness"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { BackButton } from "@/components/ui/back-button"
import { CheckCircle2, AlertCircle, FileText, Search, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  buildA1DownloadFilename,
  generateLuxembourgA1Package,
  type LuxembourgA1MemberInput,
} from "@/utils/luxembourg-a1-generator"
import {
  buildA1BulkZipFilename,
  generateLuxembourgA1BulkZip,
} from "@/utils/luxembourg-a1-bulk-download"

type MemberRow = {
  member: Record<string, unknown> & { id: string }
  shipName: string | null
  readiness: ReturnType<typeof assessLuxembourgA1Readiness>
}

function toA1MemberInput(member: MemberRow["member"]): LuxembourgA1MemberInput {
  return {
    first_name: String(member.first_name || ""),
    last_name: String(member.last_name || ""),
    matricule: String(member.matricule || ""),
    nationality: String(member.nationality || ""),
    company: String(member.company || ""),
    address: member.address,
  }
}

function MemberA1Card({
  row,
  year,
  onDownload,
  downloading,
}: {
  row: MemberRow
  year: number
  onDownload?: () => void
  downloading?: boolean
}) {
  const { member, shipName, readiness } = row
  const name = `${member.first_name || ""} ${member.last_name || ""}`.trim()

  return (
    <div
      className={`rounded-lg border p-3 ${
        readiness.ready ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/bemanning/${member.id}`}
            className="font-semibold text-gray-900 hover:text-blue-700 hover:underline"
          >
            {name}
          </Link>
          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            {shipName && <div>Schip: {shipName}</div>}
            {readiness.company && <div>Firma: {readiness.company}</div>}
            {member.matricule ? (
              <div>Matricule: {String(member.matricule)}</div>
            ) : null}
          </div>
        </div>
        {readiness.ready ? (
          <Badge className="bg-green-600 shrink-0">Klaar</Badge>
        ) : (
          <Badge variant="outline" className="border-amber-500 text-amber-800 shrink-0">
            {readiness.missing.length} ontbreekt
          </Badge>
        )}
      </div>
      {!readiness.ready && (
        <ul className="mt-2 text-xs text-amber-900 list-disc pl-4 space-y-0.5">
          {readiness.missing.map((id) => (
            <li key={id}>{A1_MISSING_FIELD_LABELS[id]}</li>
          ))}
        </ul>
      )}
      {readiness.ready && onDownload && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 w-full border-green-600 text-green-800 hover:bg-green-100"
          disabled={downloading}
          onClick={onDownload}
        >
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download A1-pakket {year}
        </Button>
      )}
    </div>
  )
}

export default function LuxembourgA1Page() {
  const { crew, ships, loading, error } = useSupabaseData()
  const [search, setSearch] = useState("")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const year = new Date().getFullYear()

  const handleDownload = async (row: MemberRow) => {
    if (!row.readiness.ready || !row.shipName) return
    setDownloadingId(row.member.id)
    try {
      const member = toA1MemberInput(row.member)
      const blob = await generateLuxembourgA1Package({
        member,
        shipName: row.shipName,
        generatedAt: new Date(),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = buildA1DownloadFilename(member, row.shipName, year)
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "A1-pakket kon niet worden gegenereerd.")
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDownloadAll = async () => {
    const items = readyRows.filter((row) => row.shipName)
    if (items.length === 0) return

    setDownloadingAll(true)
    setBulkProgress({ done: 0, total: items.length })
    try {
      const blob = await generateLuxembourgA1BulkZip({
        items: items.map((row) => ({
          member: toA1MemberInput(row.member),
          shipName: row.shipName!,
        })),
        generatedAt: new Date(),
        onProgress: (done, total) => setBulkProgress({ done, total }),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = buildA1BulkZipFilename(year)
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "ZIP-bestand kon niet worden gegenereerd.")
    } finally {
      setDownloadingAll(false)
      setBulkProgress(null)
    }
  }

  const shipNameById = useMemo(
    () => new Map(ships.map((s: { id: string; name: string }) => [s.id, s.name])),
    [ships]
  )

  const { readyRows, incompleteRows } = useMemo(() => {
    const base = (crew || [])
      .filter(Boolean)
      .filter(countsAsTotalCrewMember)
      .map((member: Record<string, unknown> & { id: string; ship_id?: string }) => {
        const shipName = member.ship_id ? shipNameById.get(member.ship_id) || null : null
        const readiness = assessLuxembourgA1Readiness(member, shipName)
        return { member, shipName, readiness }
      })

    const q = search.trim().toLowerCase()
    const filtered = q
      ? base.filter((row) => {
          const name = `${row.member.first_name || ""} ${row.member.last_name || ""}`.toLowerCase()
          const ship = String(row.shipName || "").toLowerCase()
          const company = String(row.readiness.company || "").toLowerCase()
          return name.includes(q) || ship.includes(q) || company.includes(q)
        })
      : base

    const ready = sortCrewByName(filtered.filter((r) => r.readiness.ready).map((r) => r.member))
    const incomplete = sortCrewByName(
      filtered.filter((r) => !r.readiness.ready).map((r) => r.member)
    )

    const readyRows = ready.map((member) => {
      const row = filtered.find((r) => r.member.id === member.id)!
      return row
    })
    const incompleteRows = incomplete.map((member) => {
      const row = filtered.find((r) => r.member.id === member.id)!
      return row
    })

    return { readyRows, incompleteRows }
  }, [crew, shipNameById, search])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2 text-center text-gray-500">Data laden...</div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2 text-center text-red-500">Fout: {error}</div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <BackButton href="/bemanning/overzicht" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Luxembourg A1 — {year}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Download een A1-pakket (ingevuld formulier + rijnvaartverklaring + exploitatievergunning)
            alleen als alle gegevens compleet zijn.
          </p>
        </div>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Zoek op naam, schip of firma..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-lg">
              <span className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-5 h-5" />
                Gegevens compleet
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {readyRows.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-green-700 hover:bg-green-800"
                    disabled={downloadingAll || downloadingId !== null}
                    onClick={handleDownloadAll}
                  >
                    {downloadingAll ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {downloadingAll && bulkProgress
                      ? `${bulkProgress.done}/${bulkProgress.total}`
                      : "Download alle"}
                  </Button>
                )}
                <Badge className="bg-green-600">{readyRows.length}</Badge>
              </div>
            </CardTitle>
            {readyRows.length > 0 && (
              <p className="text-xs text-green-800 mt-2">
                Download alle: één ZIP-bestand met per persoon een apart PDF-pakket.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {readyRows.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Niemand volledig klaar.</p>
            ) : (
              readyRows.map((row) => (
                <MemberA1Card
                  key={row.member.id}
                  row={row}
                  year={year}
                  downloading={downloadingId === row.member.id || downloadingAll}
                  onDownload={() => handleDownload(row)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5" />
                Ontbrekende gegevens
              </span>
              <Badge variant="outline" className="border-amber-500 text-amber-800">
                {incompleteRows.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {incompleteRows.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                Iedereen heeft alle vereiste gegevens.
              </p>
            ) : (
              incompleteRows.map((row) => (
                <MemberA1Card key={row.member.id} row={row} year={year} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-gray-500 mt-6 text-center">
        Pakket: CCSS-formulier (geldig vanaf vandaag t/m +1 jaar) + schipscertificaten. Signataire:
        BAMALITE S.A., Luxembourg aangevinkt. Werkgeveradres: Duarrefstrooss 15A, L-9990 Weiswampach.
      </p>
    </div>
  )
}
