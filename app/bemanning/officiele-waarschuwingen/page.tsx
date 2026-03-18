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
  const { crew, loading, error, officialWarnings, addOfficialWarning, deleteOfficialWarning, loadData } = useSupabaseData()
  const [mounted, setMounted] = useState(false)

  const [crewId, setCrewId] = useState<string>("")
  const [warningDate, setWarningDate] = useState<string>("")
  const [testType, setTestType] = useState<"alcohol" | "drugs" | "other">("alcohol")
  const [otherReason, setOtherReason] = useState<string>("")
  const [performedBy, setPerformedBy] = useState<"W.van der Bent" | "L.Godde" | "BFT">("W.van der Bent")
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

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

  const uploadFileToStorage = async (path: string, file: File) => {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/pdf",
      } as any)

    if (uploadError) throw uploadError
    if (!uploadData?.path) throw new Error("Geen storage pad teruggekregen")

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
    const publicUrl = publicUrlData?.publicUrl
    if (!publicUrl) throw new Error("Geen publieke URL kunnen maken")

    return { storagePath: uploadData.path, publicUrl }
  }

  const updateWarningPdfNl = async (warningId: string, pdf: { storagePath: string; publicUrl: string }) => {
    const { error: updateError } = await supabase
      .from("official_warnings")
      .update({
        pdf_nl_url: pdf.publicUrl,
        pdf_nl_storage_path: pdf.storagePath,
      })
      .eq("id", warningId)
    if (updateError) throw updateError
  }

  const handleUploadPdfForWarning = async (warning: any, file: File | null) => {
    if (!warning?.id || !file) return
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Upload a.u.b. een PDF bestand.")
      return
    }
    try {
      setUploadingId(String(warning.id))

      const crewIdForPath = String(warning.crew_id || "unknown")
      const ts = Date.now()
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `${crewIdForPath}/${warning.id}/${ts}-${safeFileName}`

      const upload = await uploadFileToStorage(path, file)

      // We gebruiken pdf_nl_* als "handmatige PDF" veld (één bestand).
      await updateWarningPdfNl(String(warning.id), upload)

      // Herlaad data zodat de kaart direct de nieuwe PDF-link toont
      await loadData()
    } catch (e: any) {
      alert(`Fout bij uploaden PDF: ${getErrMsg(e)}`)
    } finally {
      setUploadingId(null)
    }
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
    if (!warningDate) {
      alert("Vul de datum van de waarschuwing in.")
      return
    }

    const member = crewById.get(String(crewId))
    if (!member) {
      alert("Bemanningslid niet gevonden.")
      return
    }

    try {
      setSubmitting(true)

      const expiresAt = addYearsIso(toIsoDate(warningDate), 2)
      const company = (member.company || "").trim() || "Bamalite S.A."
      const address = member.address || { street: "", city: "", postalCode: "", country: "" }

      const reasonText =
        testType === "other" ? (otherReason || "").trim() : testType === "alcohol" ? "alcohol" : "drugs"

      if (testType === "other" && !reasonText) {
        alert("Vul een reden in bij 'Overig'.")
        return
      }

      let nlUpload: { storagePath: string; publicUrl: string } | null = null
      let deUpload: { storagePath: string; publicUrl: string } | null = null

      if (testType !== "other") {
        const nlBlob = await generateOfficialWarningLetter({
          company,
          firstName: member.first_name || "",
          lastName: member.last_name || "",
          address,
          testDate: toIsoDate(warningDate),
          testType: testType as any,
          performedBy,
          language: "nl",
        })

        const deBlob = await generateOfficialWarningLetter({
          company,
          firstName: member.first_name || "",
          lastName: member.last_name || "",
          address,
          testDate: toIsoDate(warningDate),
          testType: testType as any,
          performedBy,
          language: "de",
        })

        const ts = Date.now()
        const safeName = `${(member.first_name || "").trim()} ${(member.last_name || "").trim()}`
          .trim()
          .replace(/[^a-zA-Z0-9._ -]/g, "_")
        const basePath = `${crewId}/${ts}-${safeName || "crew"}`

        nlUpload = await uploadPdfToStorage(`${basePath}-officiele_waarschuwing.nl.pdf`, nlBlob)
        deUpload = await uploadPdfToStorage(`${basePath}-officiele_waarschuwing.de.pdf`, deBlob)
      }

      await addOfficialWarning({
        crew_id: String(crewId),
        company,
        test_date: toIsoDate(warningDate),
        test_type: testType,
        reason_text: reasonText || null,
        performed_by: testType === "other" ? null : performedBy,
        expires_at: expiresAt,
        pdf_nl_url: nlUpload?.publicUrl || null,
        pdf_de_url: deUpload?.publicUrl || null,
        pdf_nl_storage_path: nlUpload?.storagePath || null,
        pdf_de_storage_path: deUpload?.storagePath || null,
      })

      // reset minimal
      setCrewId("")
      setWarningDate("")
      setTestType("alcohol")
      setOtherReason("")
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
                  const typeLabel =
                    w.test_type === "other"
                      ? (w.reason_text || "Overig")
                      : w.test_type === "drugs"
                        ? "Drugs"
                        : "Alcohol"
                  return (
                    <Card key={w.id} className="border">
                      <CardHeader>
                        <CardTitle className="text-base">{name}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-gray-700 space-y-2">
                        <div>
                          <div>
                            <span className="font-medium">Datum waarschuwing:</span> {formatDateShort(w.test_date)}
                          </div>
                          <div>
                            <span className="font-medium">Reden:</span> {typeLabel}
                          </div>
                          {w.test_type !== "other" && (
                            <div>
                              <span className="font-medium">Uitgevoerd door:</span> {w.performed_by || "-"}
                            </div>
                          )}
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

                        {(w.test_type === "other") ? (
                          <div className="pt-1">
                            <Label className="text-xs">PDF uploaden</Label>
                            <Input
                              type="file"
                              accept="application/pdf"
                              disabled={uploadingId === String(w.id)}
                              onChange={(e) => handleUploadPdfForWarning(w, e.target.files?.[0] || null)}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              Tip: upload hier het document dat je zelf hebt gemaakt.
                            </div>
                          </div>
                        ) : null}

                        <div className="pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            disabled={!!deletingId || !!uploadingId}
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
              <Label>Datum van waarschuwing</Label>
              <Input type="date" value={warningDate} onChange={(e) => setWarningDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Reden</Label>
              <Select value={testType} onValueChange={(v: any) => setTestType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alcohol">Alcohol</SelectItem>
                  <SelectItem value="drugs">Drugs</SelectItem>
                  <SelectItem value="other">Overig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {testType === "other" ? (
              <div className="space-y-2">
                <Label>Reden (overig)</Label>
                <Input
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Bijv. onbehoorlijk gedrag / niet goed uitvoeren werkzaamheden"
                />
              </div>
            ) : null}

            {testType !== "other" ? (
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
            ) : null}

            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Bezig..." : "Aanmaken + PDFs uploaden"}
            </Button>

            <div className="text-xs text-gray-500">
              Let op: waarschuwingen verlopen automatisch 2 jaar na de datum van waarschuwing.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

