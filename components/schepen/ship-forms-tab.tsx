"use client"

import { useCallback, useEffect, useState, type DragEvent } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { SHIP_FORM_DEFINITIONS } from "@/utils/ship-forms-registry"
import {
  SHIP_FORMS_STORAGE_BUCKET,
  buildShipFormStoragePath,
} from "@/utils/ship-forms-storage"

export type ShipFormRecord = {
  id?: string
  ship_id: string
  form_key: string
  form_date: string | null
  file_name: string | null
  file_path: string | null
  uploaded_at: string | null
}

type Props = {
  shipId: string
  shipName: string
}

const getErrMsg = (e: unknown) => {
  if (!e) return "Onbekende fout"
  const any = e as { message?: string; error?: { message?: string } }
  return any.message || any.error?.message || String(e)
}

export function ShipFormsTab({ shipId, shipName }: Props) {
  const [recordsByKey, setRecordsByKey] = useState<Record<string, ShipFormRecord>>({})
  const [dateDraftByKey, setDateDraftByKey] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const loadForms = useCallback(async () => {
    if (!shipId) return
    setLoading(true)
    setLoadError("")
    try {
      const { data, error } = await supabase
        .from("ship_forms")
        .select("id, ship_id, form_key, form_date, file_name, file_path, uploaded_at")
        .eq("ship_id", shipId)

      if (error) throw error

      const nextRecords: Record<string, ShipFormRecord> = {}
      const nextDates: Record<string, string> = {}
      for (const row of data || []) {
        const key = String(row.form_key || "")
        if (!key) continue
        const formDate = row.form_date ? String(row.form_date).slice(0, 10) : null
        nextRecords[key] = {
          id: row.id ? String(row.id) : undefined,
          ship_id: String(row.ship_id),
          form_key: key,
          form_date: formDate,
          file_name: row.file_name ? String(row.file_name) : null,
          file_path: row.file_path ? String(row.file_path) : null,
          uploaded_at: row.uploaded_at ? String(row.uploaded_at) : null,
        }
        nextDates[key] = formDate || ""
      }
      setRecordsByKey(nextRecords)
      setDateDraftByKey((prev) => {
        const merged = { ...prev }
        for (const def of SHIP_FORM_DEFINITIONS) {
          merged[def.key] = nextDates[def.key] || ""
        }
        return merged
      })
    } catch (e) {
      setLoadError(getErrMsg(e))
      setRecordsByKey({})
    } finally {
      setLoading(false)
    }
  }, [shipId])

  useEffect(() => {
    void loadForms()
  }, [loadForms])

  const getPublicFileUrl = (storagePath: string) => {
    const { data } = supabase.storage.from(SHIP_FORMS_STORAGE_BUCKET).getPublicUrl(storagePath)
    return data?.publicUrl || ""
  }

  const upsertFormRecord = async (
    formKey: string,
    patch: Partial<Pick<ShipFormRecord, "form_date" | "file_name" | "file_path" | "uploaded_at">>
  ) => {
    const existing = recordsByKey[formKey]
    const payload = {
      ship_id: shipId,
      form_key: formKey,
      form_date: patch.form_date !== undefined ? patch.form_date : existing?.form_date ?? null,
      file_name: patch.file_name !== undefined ? patch.file_name : existing?.file_name ?? null,
      file_path: patch.file_path !== undefined ? patch.file_path : existing?.file_path ?? null,
      uploaded_at:
        patch.uploaded_at !== undefined ? patch.uploaded_at : existing?.uploaded_at ?? null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("ship_forms")
      .upsert([payload], { onConflict: "ship_id,form_key" })
      .select("id, ship_id, form_key, form_date, file_name, file_path, uploaded_at")
      .single()

    if (error) throw error

    const formDate = data.form_date ? String(data.form_date).slice(0, 10) : null
    const record: ShipFormRecord = {
      id: data.id ? String(data.id) : undefined,
      ship_id: String(data.ship_id),
      form_key: formKey,
      form_date: formDate,
      file_name: data.file_name ? String(data.file_name) : null,
      file_path: data.file_path ? String(data.file_path) : null,
      uploaded_at: data.uploaded_at ? String(data.uploaded_at) : null,
    }
    setRecordsByKey((prev) => ({ ...prev, [formKey]: record }))
    setDateDraftByKey((prev) => ({ ...prev, [formKey]: formDate || "" }))
    return record
  }

  const saveDate = async (formKey: string, dateValue: string) => {
    const normalized = String(dateValue || "").trim()
    const saved = String(recordsByKey[formKey]?.form_date || "")
    if (normalized === saved) return

    setBusyKey(formKey)
    try {
      await upsertFormRecord(formKey, { form_date: normalized || null })
    } catch (e) {
      alert(`Fout bij opslaan datum: ${getErrMsg(e)}`)
      setDateDraftByKey((prev) => ({ ...prev, [formKey]: saved }))
    } finally {
      setBusyKey(null)
    }
  }

  const uploadFile = async (formKey: string, file: File | null) => {
    if (!file) return
    setBusyKey(formKey)
    try {
      const existing = recordsByKey[formKey]
      if (existing?.file_path) {
        await supabase.storage.from(SHIP_FORMS_STORAGE_BUCKET).remove([existing.file_path])
      }

      const storagePath = buildShipFormStoragePath(shipName, formKey, file.name)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(SHIP_FORMS_STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) throw uploadError
      if (!uploadData?.path) throw new Error("Geen opslagpad ontvangen na upload.")

      const dateValue = String(dateDraftByKey[formKey] || recordsByKey[formKey]?.form_date || "").trim()
      await upsertFormRecord(formKey, {
        form_date: dateValue || null,
        file_name: file.name,
        file_path: uploadData.path,
        uploaded_at: new Date().toISOString(),
      })
    } catch (e) {
      alert(`Fout bij uploaden: ${getErrMsg(e)}`)
    } finally {
      setBusyKey(null)
      setDragOverKey(null)
    }
  }

  const openFormDocument = (formKey: string) => {
    const record = recordsByKey[formKey]
    if (!record?.file_path || typeof window === "undefined") return
    const url = getPublicFileUrl(record.file_path)
    if (!url) return
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleFormDrop = async (formKey: string, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const file = event.dataTransfer?.files?.[0] || null
    await uploadFile(formKey, file)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-gray-600 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Formulieren laden...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="print:hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Formulieren</CardTitle>
        <p className="text-sm text-gray-600 font-normal">
          Per formulier een datum en een document. Sleep een bestand op de kaart — wijzigingen worden automatisch
          opgeslagen.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadError ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Kon formulieren niet laden</p>
            <p className="mt-1">{loadError}</p>
            <p className="mt-2 text-xs">
              Draai in Supabase SQL editor: <code className="bg-amber-100 px-1">scripts/create-ship-forms.sql</code>
            </p>
          </div>
        ) : null}

        {SHIP_FORM_DEFINITIONS.map((formDef) => {
          const record = recordsByKey[formDef.key]
          const dateValue = dateDraftByKey[formDef.key] ?? ""
          const hasDocument = !!record?.file_path
          const isDragging = dragOverKey === formDef.key
          const isUploading = busyKey === formDef.key

          return (
            <div
              key={formDef.key}
              className={`rounded-lg border border-gray-200 bg-white px-3 py-3 ${
                hasDocument ? "cursor-pointer" : ""
              } ${isDragging ? "ring-2 ring-blue-400" : ""} ${isUploading ? "opacity-80" : ""}`}
              onClick={() => {
                if (!hasDocument || isUploading) return
                openFormDocument(formDef.key)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragOverKey(formDef.key)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragOverKey((prev) => (prev === formDef.key ? null : prev))
              }}
              onDrop={(e) => void handleFormDrop(formDef.key, e)}
            >
              <div className="mb-2">
                <div className="text-sm font-semibold text-gray-900">{formDef.label}</div>
                {hasDocument ? (
                  <div className="text-xs text-gray-500">(klik op kaart om te openen)</div>
                ) : null}
              </div>

              {!hasDocument && !isUploading ? (
                <div className="mb-2 text-xs text-gray-600">Sleep hier een document naartoe.</div>
              ) : null}

              {isUploading ? (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-blue-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploaden...
                </div>
              ) : null}

              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <div className="text-gray-600">Datum</div>
                  <Input
                    type="date"
                    value={dateValue}
                    disabled={isUploading}
                    onChange={(e) => {
                      const next = e.target.value
                      setDateDraftByKey((prev) => ({ ...prev, [formDef.key]: next }))
                      void saveDate(formDef.key, next)
                    }}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-gray-600">Document</div>
                  <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-gray-900 text-xs truncate">
                    {hasDocument ? record?.file_name || "Bestand" : "—"}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
