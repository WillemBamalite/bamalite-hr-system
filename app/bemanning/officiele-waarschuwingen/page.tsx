"use client"

import { useEffect, useMemo, useState } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { BackButton } from "@/components/ui/back-button"
import { generateOfficialWarningLetter } from "@/utils/contract-generator"
import { supabase } from "@/lib/supabase"

const BUCKET = "official-warnings"

const toIsoDate = (value: string) => value // HTML date input gives yyyy-MM-dd

const getErrMsg = (e: any) => {
  if (!e) return "Onbekende fout"
  if (typeof e === "string") return e
  const msg =
    e?.message ||
    e?.error?.message ||
    e?.details ||
    e?.hint ||
    (typeof e === "object" ? JSON.stringify(e) : String(e))
  if (msg && msg !== "{}") return msg
  try {
    return JSON.stringify(e, Object.getOwnPropertyNames(e))
  } catch {
    return "Onbekende fout"
  }
}

const formatDateShort = (value: string | null | undefined) => {
  if (!value) return "-"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}

const addYearsIso = (isoDate: string, years: number) => {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  d.setFullYear(d.getFullYear() + years)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default function OfficieleWaarschuwingenPage() {
  const { crew, loading, error, officialWarnings, addOfficialWarning, deleteOfficialWarning } = useSupabaseData()
  const [mounted, setMounted] = useState(false)

  const [crewId, setCrewId] = useState<string>("")
  const [testDate, setTestDate] = useState<string>("")
  const [testType, setTestType] = useState<"alcohol" | "drugs">("alcohol")
  const [performedBy, setPerformedBy] = useState<"W.van der Bent" | "L.Godde" | "BFT">("W.van der Bent")
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  const crewSorted = useMemo(() => {
    const list = Array.isArray(crew) ? [...crew] : []
    list.sort((a: any, b: any) => {
      const an = `${a?.first_name || ""} ${a?.last_name || ""}`.trim().toLowerCase()
      const bn = `${b?.first_name || ""} ${b?.last_name || ""}`.trim().toLowerCase()
      return an.localeCompare(bn)
    })
    return list
  }, [crew])

  const crewById = useMemo(() => {
    const map = new Map<string, any>()
    ;(crew || []).forEach((m: any) => map.set(String(m.id), m))
    return map
  }, [crew])

  const warningsSorted = useMemo(() => {
    const list = Array.isArray(officialWarnings) ? [...officialWarnings] : []
    list.sort((a: any, b: any) => {
      const at = new Date(a?.test_date || 0).getTime()
      const bt = new Date(b?.test_date || 0).getTime()
      return bt - at
    })
    return list
  }, [officialWarnings])

  const uploadPdfToStorage = async (path: string, blob: Blob) => {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/pdf",
      } as any)

    if (uploadError) throw uploadError
    if (!uploadData?.path) throw new Error("Geen storage pad teruggekregen")

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
    const publicUrl = publicUrlData?.publicUrl
    if (!publicUrl) throw new Error("Geen publieke URL kunnen maken")

    return { storagePath: uploadData.path, publicUrl }
  }

  const handleDelete = async (warning: any) => {
    if (!warning?.id) return
    const name = (() => {
      const m = crewById.get(String(warning.crew_id))
      return m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : ""
    })()

    if (
      !confirm(
        `Weet je zeker dat je deze officiële waarschuwing wilt verwijderen?\n\n${name || ""}\nTestdatum: ${formatDateShort(
          warning.test_date,
        )}\n\nDit verwijdert ook de PDFs uit Storage.`,
      )
    ) {
      return
    }

    try {
      setDeletingId(String(warning.id))

      const paths: string[] = []
      if (warning.pdf_nl_storage_path) paths.push(String(warning.pdf_nl_storage_path))
      if (warning.pdf_de_storage_path) paths.push(String(warning.pdf_de_storage_path))

      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths)
        if (storageError) {
          alert(`Let op: PDF verwijderen uit Storage mislukt: ${getErrMsg(storageError)}`)
        }
      }

      await deleteOfficialWarning(String(warning.id))
    } catch (e: any) {
      alert(`Fout bij verwijderen officiële waarschuwing: ${getErrMsg(e)}`)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreate = async () => {
    if (!crewId) {
      alert("Kies eerst een bemanningslid.")
      return
    }
    if (!testDate) {
      alert("Vul de datum van de test in.")
      return
    }

    const member = crewById.get(String(crewId))
    if (!member) {
      alert("Bemanningslid niet gevonden.")
      return
    }

    try {
      setSubmitting(true)

      const expiresAt = addYearsIso(toIsoDate(testDate), 2)
      const company = (member.company || "").trim() || "Bamalite S.A."
      const address = member.address || { street: "", city: "", postalCode: "", country: "" }

      const nlBlob = await generateOfficialWarningLetter({
        company,
        firstName: member.first_name || "",
        lastName: member.last_name || "",
        address,
        testDate: toIsoDate(testDate),
        testType,
        performedBy,
        language: "nl",
      })

      const deBlob = await generateOfficialWarningLetter({
        company,
        firstName: member.first_name || "",
        lastName: member.last_name || "",
        address,
        testDate: toIsoDate(testDate),
        testType,
        performedBy,
        language: "de",
      })

      const ts = Date.now()
      const safeName = `${(member.first_name || "").trim()} ${(member.last_name || "").trim()}`.trim().replace(/[^a-zA-Z0-9._ -]/g, "_")
      const basePath = `${crewId}/${ts}-${safeName || "crew"}`

      const nlUpload = await uploadPdfToStorage(`${basePath}-officiele_waarschuwing.nl.pdf`, nlBlob)
      const deUpload = await uploadPdfToStorage(`${basePath}-officiele_waarschuwing.de.pdf`, deBlob)

      await addOfficialWarning({
        crew_id: String(crewId),
        company,
        test_date: toIsoDate(testDate),
        test_type: testType,
        performed_by: performedBy,
        expires_at: expiresAt,
        pdf_nl_url: nlUpload.publicUrl,
        pdf_de_url: deUpload.publicUrl,
        pdf_nl_storage_path: nlUpload.storagePath,
        pdf_de_storage_path: deUpload.storagePath,
      })

      // reset minimal
      setCrewId("")
      setTestDate("")
      setTestType("alcohol")
      setPerformedBy("W.van der Bent")
    } catch (e: any) {
      // Niet console.error gebruiken: Next toont dan een error overlay. We tonen de echte melding via alert.
      console.warn("Fout bij aanmaken officiële waarschuwing:", e)
      alert(`Fout bij aanmaken officiële waarschuwing: ${getErrMsg(e)}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <main className="w-full px-4 py-6">
      <MobileHeaderNav />
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <DashboardButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Officiële waarschuwingen</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Laden...</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : warningsSorted.length === 0 ? (
              <div className="text-sm text-gray-500">Nog geen officiële waarschuwingen.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warningsSorted.map((w: any) => {
                  const m = crewById.get(String(w.crew_id))
                  const name =
                    m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : `Onbekend (${w.crew_id})`
                  const typeLabel = w.test_type === "drugs" ? "Drogentest" : "Alcoholtest"
                  return (
                    <Card key={w.id} className="border">
                      <CardHeader>
                        <CardTitle className="text-base">{name}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-gray-700 space-y-2">
                        <div>
                          <div>
                            <span className="font-medium">Testdatum:</span> {formatDateShort(w.test_date)}
                          </div>
                          <div>
                            <span className="font-medium">Soort:</span> {typeLabel}
                          </div>
                          <div>
                            <span className="font-medium">Uitgevoerd door:</span> {w.performed_by || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Verloopt op:</span> {formatDateShort(w.expires_at)}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {w.pdf_nl_url ? (
                            <a href={w.pdf_nl_url} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline">PDF NL</Button>
                            </a>
                          ) : null}
                          {w.pdf_de_url ? (
                            <a href={w.pdf_de_url} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline">PDF DE</Button>
                            </a>
                          ) : null}
                        </div>

                        <div className="pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            disabled={!!deletingId}
                            onClick={() => handleDelete(w)}
                          >
                            {deletingId === String(w.id) ? "Verwijderen..." : "Verwijder"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Officiële waarschuwing maken</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Wie</Label>
              <Select value={crewId} onValueChange={setCrewId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer bemanningslid" />
                </SelectTrigger>
                <SelectContent>
                  {crewSorted.map((m: any) => {
                    const id = String(m.id)
                    const name = `${m.first_name || ""} ${m.last_name || ""}`.trim()
                    return (
                      <SelectItem key={id} value={id}>
                        {name || id}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Datum van test</Label>
              <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Positief op</Label>
              <Select value={testType} onValueChange={(v: any) => setTestType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alcohol">Alcohol</SelectItem>
                  <SelectItem value="drugs">Drugs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Test uitgevoerd door</Label>
              <Select value={performedBy} onValueChange={(v: any) => setPerformedBy(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer controleur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="W.van der Bent">W.van der Bent</SelectItem>
                  <SelectItem value="L.Godde">L.Godde</SelectItem>
                  <SelectItem value="BFT">BFT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Bezig..." : "Aanmaken + PDFs uploaden"}
            </Button>

            <div className="text-xs text-gray-500">
              Let op: dit maakt automatisch 2 PDFs (NL + DE) en zet de vervaldatum op testdatum + 2 jaar.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

