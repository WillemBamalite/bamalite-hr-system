"use client"

import { useCallback, useEffect, useMemo, useState, type DragEvent, type MouseEvent } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import {
  buildVisibleShipForms,
  createEmptyShipFormLayout,
  isDefaultShipFormKey,
  slugifyShipFormLabel,
  type ShipFormDefinition,
  type ShipFormLayoutState,
} from "@/utils/ship-forms-registry"
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

type FormContextMenuState = {
  visible: boolean
  x: number
  y: number
  formKey: string | null
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

const isValidIsoDateValue = (value: string) => {
  const normalized = String(value || "").trim()
  if (!normalized) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false
  const [yearStr, monthStr, dayStr] = normalized.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return false
  if (!Number.isFinite(month) || month < 1 || month > 12) return false
  if (!Number.isFinite(day) || day < 1 || day > 31) return false
  const parsed = new Date(year, month - 1, day)
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  )
}

const parseLayoutRow = (row: unknown): ShipFormLayoutState => {
  if (!row || typeof row !== "object") return createEmptyShipFormLayout()
  const data = row as { custom_forms?: unknown; removed_form_keys?: unknown }
  const customRaw = Array.isArray(data.custom_forms) ? data.custom_forms : []
  const removedRaw = Array.isArray(data.removed_form_keys) ? data.removed_form_keys : []
  return {
    custom_forms: customRaw
      .map((item) => {
        const entry = item as { key?: string; label?: string; naam?: string }
        return {
          key: String(entry.key || "").trim(),
          label: String(entry.label || entry.naam || "").trim(),
        }
      })
      .filter((item) => item.key && item.label),
    removed_form_keys: removedRaw.map((key) => String(key || "").trim()).filter(Boolean),
  }
}

const makeUniqueFormKey = (label: string, layout: ShipFormLayoutState) => {
  const base = slugifyShipFormLabel(label)
  const used = new Set([
    ...layout.removed_form_keys,
    ...layout.custom_forms.map((f) => f.key),
    ...buildVisibleShipForms(layout).map((f) => f.key),
  ])
  let key = base
  let suffix = 2
  while (used.has(key)) {
    key = `${base}-${suffix}`
    suffix += 1
  }
  return key
}

export function ShipFormsTab({ shipId, shipName }: Props) {
  const [recordsByKey, setRecordsByKey] = useState<Record<string, ShipFormRecord>>({})
  const [dateDraftByKey, setDateDraftByKey] = useState<Record<string, string>>({})
  const [layout, setLayout] = useState<ShipFormLayoutState>(createEmptyShipFormLayout())
  const [layoutError, setLayoutError] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [toonNieuwFormulierFormulier, setToonNieuwFormulierFormulier] = useState(false)
  const [nieuwFormulierNaam, setNieuwFormulierNaam] = useState("")
  const [nieuwFormulierFout, setNieuwFormulierFout] = useState("")
  const [formContextMenu, setFormContextMenu] = useState<FormContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    formKey: null,
  })

  const visibleForms = useMemo(() => buildVisibleShipForms(layout), [layout])

  const persistLayout = async (nextLayout: ShipFormLayoutState) => {
    const { error } = await supabase.from("ship_form_layout").upsert(
      {
        ship_id: shipId,
        custom_forms: nextLayout.custom_forms,
        removed_form_keys: nextLayout.removed_form_keys,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ship_id" }
    )
    if (error) throw error
    setLayout(nextLayout)
  }

  const loadForms = useCallback(async () => {
    if (!shipId) return
    setLoading(true)
    setLoadError("")
    setLayoutError("")
    try {
      const formsPromise = supabase
        .from("ship_forms")
        .select("id, ship_id, form_key, form_date, file_name, file_path, uploaded_at")
        .eq("ship_id", shipId)

      const layoutPromise = supabase
        .from("ship_form_layout")
        .select("custom_forms, removed_form_keys")
        .eq("ship_id", shipId)
        .maybeSingle()

      const [formsRes, layoutRes] = await Promise.all([formsPromise, layoutPromise])

      if (formsRes.error) throw formsRes.error

      let nextLayout = createEmptyShipFormLayout()
      if (layoutRes.error) {
        const msg = getErrMsg(layoutRes.error)
        if (/ship_form_layout|relation|schema cache/i.test(msg)) {
          setLayoutError(msg)
        } else {
          throw layoutRes.error
        }
      } else if (layoutRes.data) {
        nextLayout = parseLayoutRow(layoutRes.data)
      }

      const nextRecords: Record<string, ShipFormRecord> = {}
      const nextDates: Record<string, string> = {}
      for (const row of formsRes.data || []) {
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

      setLayout(nextLayout)
      setRecordsByKey(nextRecords)
      setDateDraftByKey((prev) => {
        const merged = { ...prev }
        for (const def of buildVisibleShipForms(nextLayout)) {
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

  useEffect(() => {
    if (!formContextMenu.visible) return
    const close = () => setFormContextMenu({ visible: false, x: 0, y: 0, formKey: null })
    window.addEventListener("click", close)
    window.addEventListener("scroll", close, true)
    return () => {
      window.removeEventListener("click", close)
      window.removeEventListener("scroll", close, true)
    }
  }, [formContextMenu.visible])

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

  const deleteFormData = async (formKey: string) => {
    const existing = recordsByKey[formKey]
    if (existing?.file_path) {
      const { error: removeError } = await supabase.storage
        .from(SHIP_FORMS_STORAGE_BUCKET)
        .remove([existing.file_path])
      if (removeError) {
        alert(
          `Waarschuwing: gekoppeld document kon niet verwijderd worden (${removeError.message || "onbekende fout"}).`
        )
      }
    }

    const { error } = await supabase
      .from("ship_forms")
      .delete()
      .eq("ship_id", shipId)
      .eq("form_key", formKey)

    if (error) throw error

    setRecordsByKey((prev) => {
      const next = { ...prev }
      delete next[formKey]
      return next
    })
    setDateDraftByKey((prev) => {
      const next = { ...prev }
      delete next[formKey]
      return next
    })
  }

  const saveDate = async (formKey: string, dateValue: string) => {
    const normalized = String(dateValue || "").trim()
    const saved = String(recordsByKey[formKey]?.form_date || "")
    if (normalized === saved) return
    if (normalized && !isValidIsoDateValue(normalized)) {
      setDateDraftByKey((prev) => ({ ...prev, [formKey]: saved }))
      return
    }

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

  const openFormContextMenu = (event: MouseEvent, formKey: string) => {
    event.preventDefault()
    event.stopPropagation()
    setFormContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      formKey,
    })
  }

  const voegNieuwFormulierToe = async () => {
    const naam = nieuwFormulierNaam.trim()
    if (!naam) {
      setNieuwFormulierFout("Vul een formuliernaam in.")
      return
    }

    const duplicate = visibleForms.some((f) => f.label.toLowerCase() === naam.toLowerCase())
    if (duplicate) {
      setNieuwFormulierFout("Dit formulier staat al in de lijst.")
      return
    }

    if (layoutError) {
      setNieuwFormulierFout("Layout-tabel ontbreekt. Draai eerst create-ship-form-layout.sql in Supabase.")
      return
    }

    const key = makeUniqueFormKey(naam, layout)
    const nieuwFormulier: ShipFormDefinition = { key, label: naam }
    const nextLayout: ShipFormLayoutState = {
      ...layout,
      custom_forms: [...layout.custom_forms, nieuwFormulier],
      removed_form_keys: layout.removed_form_keys.filter((removedKey) => removedKey !== key),
    }

    setNieuwFormulierFout("")
    try {
      await persistLayout(nextLayout)
      setDateDraftByKey((prev) => ({ ...prev, [key]: "" }))
      setNieuwFormulierNaam("")
      setToonNieuwFormulierFormulier(false)
    } catch (e) {
      setNieuwFormulierFout(`Opslaan mislukt: ${getErrMsg(e)}`)
    }
  }

  const verwijderFormulierUitLijst = async (formKey: string) => {
    const formDef = visibleForms.find((f) => f.key === formKey)
    if (!formDef) return

    const confirmed = window.confirm(
      `Wil je "${formDef.label}" verwijderen uit de formulierenlijst van ${shipName}?`
    )
    if (!confirmed) return

    if (layoutError) {
      alert("Layout-tabel ontbreekt. Draai eerst create-ship-form-layout.sql in Supabase.")
      return
    }

    try {
      await deleteFormData(formKey)

      const nextLayout: ShipFormLayoutState = isDefaultShipFormKey(formKey)
        ? {
            ...layout,
            removed_form_keys: layout.removed_form_keys.includes(formKey)
              ? layout.removed_form_keys
              : [...layout.removed_form_keys, formKey],
          }
        : {
            ...layout,
            custom_forms: layout.custom_forms.filter((f) => f.key !== formKey),
          }

      await persistLayout(nextLayout)
      setFormContextMenu({ visible: false, x: 0, y: 0, formKey: null })
    } catch (e) {
      alert(`Fout bij verwijderen: ${getErrMsg(e)}`)
    }
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
          opgeslagen. Rechtsklik op een kaart om een formulier uit de lijst te verwijderen.
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

        {layoutError ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Eigen formulieren toevoegen/verwijderen werkt nog niet</p>
            <p className="mt-1">{layoutError}</p>
            <p className="mt-2 text-xs">
              Draai in Supabase SQL editor:{" "}
              <code className="bg-amber-100 px-1">scripts/create-ship-form-layout.sql</code>
            </p>
          </div>
        ) : null}

        <div>
          <Button
            type="button"
            size="sm"
            variant={toonNieuwFormulierFormulier ? "outline" : "default"}
            onClick={() => {
              setNieuwFormulierFout("")
              setToonNieuwFormulierFormulier((prev) => !prev)
            }}
            disabled={!!layoutError}
          >
            {toonNieuwFormulierFormulier ? "Formulier sluiten" : "Formulier toevoegen"}
          </Button>
        </div>

        {toonNieuwFormulierFormulier && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
            <div className="text-sm font-semibold text-blue-900">Nieuw formulier</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1 md:col-span-2">
                <div className="text-gray-700">Naam formulier</div>
                <Input
                  value={nieuwFormulierNaam}
                  onChange={(e) => setNieuwFormulierNaam(e.target.value)}
                  className="h-9 text-xs"
                  placeholder="Bijv. Extra inspectieformulier"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void voegNieuwFormulierToe()
                    }
                  }}
                />
              </div>
            </div>
            {nieuwFormulierFout ? <div className="text-xs font-medium text-red-700">{nieuwFormulierFout}</div> : null}
            <div>
              <Button type="button" size="sm" onClick={() => void voegNieuwFormulierToe()}>
                Formulier toevoegen
              </Button>
            </div>
          </div>
        )}

        {visibleForms.map((formDef) => {
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
              onContextMenu={(e) => openFormContextMenu(e, formDef.key)}
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
                      setDateDraftByKey((prev) => ({ ...prev, [formDef.key]: e.target.value }))
                    }}
                    onBlur={(e) => {
                      void saveDate(formDef.key, e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        void saveDate(formDef.key, dateDraftByKey[formDef.key] ?? "")
                      }
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

        {formContextMenu.visible && formContextMenu.formKey ? (
          <div
            className="fixed z-50 min-w-[220px] rounded-md border border-gray-200 bg-white shadow-lg"
            style={{
              top: formContextMenu.y,
              left: formContextMenu.x,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              onClick={() => {
                if (!formContextMenu.formKey) return
                void verwijderFormulierUitLijst(formContextMenu.formKey)
              }}
            >
              Verwijder formulier uit lijst
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
