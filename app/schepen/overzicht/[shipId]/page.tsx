"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, FileText, Printer, Ship } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent } from "react"
import { supabase } from "@/lib/supabase"
import {
  GLOBAL_CUSTOM_CERTIFICATES_STORAGE_KEY,
  SHIP_CERTIFICATE_WARNING_OPTIONS,
  calculateCertificateExpiryDateIso,
  EditableShipCertificate,
  formatInterval,
  formatIsoToDutchDate,
  getGlobalCustomCertificatesForClient,
  getShipCertificateDefaultsForClient,
  getShipCertificateStorageKeyByName,
  getCertificateStatus,
  mergeShipCertificatesWithStored,
} from "@/utils/ship-certificates"
import {
  APOLLO_CLASSIFICATION_DEFAULT,
  getShipParticularsConfigByName,
  type ClassificationEditableValues,
  type LabelValue,
  type DataTable,
  type ParticularsSection,
} from "../ship-particulars-registry"

type CertificateDocumentLink = {
  fileName: string
  fileUrl: string
  storagePath: string
  uploadedAt: string
}

type CertificateDocumentMap = Record<string, CertificateDocumentLink[]>

type CertificateContextMenuState = {
  visible: boolean
  x: number
  y: number
  certificateIndex: number | null
}

const HIDDEN_SCHEEPSGEGEVENS_LABELS = new Set([
  "Savealls bij tankontluchting",
  "Opvangranden machinegebied",
])

type CloudShipCertificateState = {
  certificates: EditableShipCertificate[]
  documents: CertificateDocumentMap
  removedCertificateKeys: string[]
  updatedAt: string
}

type ShipParticularValueOverrides = Record<string, string>

type LocalCertificateStateMeta = {
  updatedAt: string
  savedAt: string
}

type CloudParticularState = {
  overrides: ShipParticularValueOverrides
  classification: ClassificationEditableValues | null
  updatedAt: string
}


function sortCertificatesForPrintList(certificates: EditableShipCertificate[]): EditableShipCertificate[] {
  const rank = (cert: EditableShipCertificate) => {
    const info = getCertificateStatus(cert)
    if (info.status === "expired") return 0
    if (info.status === "warning") return 1
    return 2
  }
  return [...certificates].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    const da = getCertificateStatus(a).daysUntilExpiry ?? 999999
    const db = getCertificateStatus(b).daysUntilExpiry ?? 999999
    if (da !== db) return da - db
    return a.naam.localeCompare(b.naam, "nl", { sensitivity: "base" })
  })
}

function loadMergedCertificatesForPrintFromStorage(shipName: string): EditableShipCertificate[] {
  if (typeof window === "undefined") return []
  const key = getShipCertificateStorageKeyByName(shipName)
  if (!key) return []
  const defaults = getShipCertificateDefaultsForClient(shipName)
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return mergeShipCertificatesWithStored(shipName, [], defaults)
    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed) ? parsed : []
    return mergeShipCertificatesWithStored(shipName, arr, defaults)
  } catch {
    return mergeShipCertificatesWithStored(shipName, [], defaults)
  }
}

export default function ShipParticularsPage() {
  const CERTIFICATE_DOCUMENT_BUCKET = "official-warnings"
  const CERTIFICATE_META_PREFIX = "ship-certificates-meta"
  const params = useParams<{ shipId: string }>()
  const searchParams = useSearchParams()
  const shipId = String(params?.shipId || "")
  const { ships, loading } = useSupabaseData()
  const [classificationEditable, setClassificationEditable] = useState<ClassificationEditableValues>(
    APOLLO_CLASSIFICATION_DEFAULT
  )
  const [activeTab, setActiveTab] = useState("scheepsgegevens")
  const [certificatenEditable, setCertificatenEditable] = useState<EditableShipCertificate[]>([])
  const [certificateDocuments, setCertificateDocuments] = useState<CertificateDocumentMap>({})
  const [dragOverCertificateIndex, setDragOverCertificateIndex] = useState<number | null>(null)
  const [uploadingCertificateIndex, setUploadingCertificateIndex] = useState<number | null>(null)
  const [certificatesDirty, setCertificatesDirty] = useState(false)
  const [certificatesSaving, setCertificatesSaving] = useState(false)
  const [certificatesSaveMessage, setCertificatesSaveMessage] = useState("")
  const [certificateContextMenu, setCertificateContextMenu] = useState<CertificateContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    certificateIndex: null,
  })
  const [particularValueOverrides, setParticularValueOverrides] = useState<ShipParticularValueOverrides>({})
  const [editingParticularKey, setEditingParticularKey] = useState<string | null>(null)
  const [editingParticularValue, setEditingParticularValue] = useState("")
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printDialogKind, setPrintDialogKind] = useState<"scheepsgegevens" | "certificaten" | null>(null)
  const [printCertificatesLayout, setPrintCertificatesLayout] = useState(false)
  const [selectedPrintShipIds, setSelectedPrintShipIds] = useState<string[]>([])
  const [printShipIds, setPrintShipIds] = useState<string[]>([])
  const [printCertificateShipIds, setPrintCertificateShipIds] = useState<string[]>([])
  const [toonNieuwCertificaatFormulier, setToonNieuwCertificaatFormulier] = useState(false)
  const [nieuwCertificaatNaam, setNieuwCertificaatNaam] = useState("")
  const [nieuwCertificaatDatum, setNieuwCertificaatDatum] = useState("")
  const [nieuwCertificaatInterval, setNieuwCertificaatInterval] = useState("")
  const [nieuwCertificaatWaarschuwing, setNieuwCertificaatWaarschuwing] = useState("1")
  const [nieuwCertificaatVoorAlleSchepen, setNieuwCertificaatVoorAlleSchepen] = useState("nee")
  const [nieuwCertificaatFout, setNieuwCertificaatFout] = useState("")
  const [editingIntervalIndex, setEditingIntervalIndex] = useState<number | null>(null)
  const [editingIntervalValue, setEditingIntervalValue] = useState("")
  const certificatesSyncReadyRef = useRef(false)
  const certificateAutosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ship = ships.find((s: any) => String(s.id) === shipId)
  const supportedShipsForPrint = ships.filter((s: any) => Boolean(getShipParticularsConfigByName(s?.name || "")))
  const allSupportedShipIds = supportedShipsForPrint.map((s: any) => String(s.id))
  const shipsWithCertificatePrint = useMemo(
    () =>
      ships.filter((s: any) => Boolean(getShipCertificateStorageKeyByName(String(s?.name || "").trim()))),
    [ships]
  )
  const allCertificateShipIds = useMemo(
    () => shipsWithCertificatePrint.map((s: any) => String(s.id)),
    [shipsWithCertificatePrint]
  )
  const particularsConfig = ship?.name ? getShipParticularsConfigByName(ship.name) : null
  const isSupportedShip = Boolean(particularsConfig)
  const sections = particularsConfig?.sections ?? []
  const classificationDefault = particularsConfig?.classificationDefault ?? APOLLO_CLASSIFICATION_DEFAULT
  const classificationStorageKey = particularsConfig?.classificationStorageKey ?? ""
  const certificateStorageKey = getShipCertificateStorageKeyByName(ship?.name || "") || ""
  const printShipIdsToRender = printShipIds.length > 0 ? printShipIds : ship ? [String(ship.id)] : []
  const certificateStateMetaStorageKey = certificateStorageKey
    ? `${certificateStorageKey}_state_meta`
    : ""

  const loadCertificateStateMeta = (): LocalCertificateStateMeta => {
    if (typeof window === "undefined" || !certificateStateMetaStorageKey) {
      return { updatedAt: "", savedAt: "" }
    }
    try {
      const raw = window.localStorage.getItem(certificateStateMetaStorageKey)
      if (!raw) return { updatedAt: "", savedAt: "" }
      const parsed = JSON.parse(raw)
      return {
        updatedAt: String(parsed?.updatedAt || ""),
        savedAt: String(parsed?.savedAt || ""),
      }
    } catch {
      return { updatedAt: "", savedAt: "" }
    }
  }

  const persistCertificateStateMeta = (meta: LocalCertificateStateMeta) => {
    if (typeof window === "undefined" || !certificateStateMetaStorageKey) return
    window.localStorage.setItem(certificateStateMetaStorageKey, JSON.stringify(meta))
  }

  const parseTime = (iso: string) => {
    const ms = new Date(String(iso || "")).getTime()
    return Number.isFinite(ms) ? ms : 0
  }

  const normalizeCertificateName = (value: string) => String(value || "").trim().toLowerCase()
  const normalizeShipStorageName = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

  const getCertificateDocumentStorageKey = (shipName: string) =>
    `${normalizeShipStorageName(shipName)}_particulars_certificaten_documenten`

  const getRemovedCertificatesStorageKey = (shipName: string) =>
    `${normalizeShipStorageName(shipName)}_particulars_certificaten_removed`

  const getCertificateDocumentMapKey = (certificateName: string) =>
    normalizeCertificateName(certificateName).replace(/\s+/g, " ").trim()

  const sanitizeFileName = (value: string) => String(value || "").replace(/[^a-zA-Z0-9._-]/g, "_")

  const loadCertificateDocuments = (shipName: string): CertificateDocumentMap => {
    if (typeof window === "undefined") return {}
    const storageKey = getCertificateDocumentStorageKey(shipName)
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (!parsed || typeof parsed !== "object") return {}

      const normalized: CertificateDocumentMap = {}
      Object.entries(parsed).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          const docs = value.filter((item) => item && typeof item === "object") as CertificateDocumentLink[]
          if (docs.length > 0) normalized[key] = docs
          return
        }
        if (value && typeof value === "object") {
          normalized[key] = [value as CertificateDocumentLink]
        }
      })
      return normalized
    } catch {
      return {}
    }
  }

  const persistCertificateDocuments = (
    shipName: string,
    next: CertificateDocumentMap,
    options?: { markDirty?: boolean }
  ) => {
    if (typeof window === "undefined") return
    const shouldMarkDirty = options?.markDirty !== false
    const storageKey = getCertificateDocumentStorageKey(shipName)
    window.localStorage.setItem(storageKey, JSON.stringify(next))
    const meta = loadCertificateStateMeta()
    persistCertificateStateMeta({
      ...meta,
      updatedAt: new Date().toISOString(),
    })
    if (shouldMarkDirty) {
      setCertificatesDirty(true)
      setCertificatesSaveMessage("")
    }
  }

  const loadRemovedCertificateKeys = (shipName: string): string[] => {
    if (typeof window === "undefined") return []
    const storageKey = getRemovedCertificatesStorageKey(shipName)
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map((item) => normalizeCertificateName(String(item || "")))
        .filter((item) => Boolean(item))
    } catch {
      return []
    }
  }

  const persistRemovedCertificateKeys = (
    shipName: string,
    removedKeys: string[],
    options?: { markDirty?: boolean }
  ) => {
    if (typeof window === "undefined") return
    const shouldMarkDirty = options?.markDirty !== false
    const storageKey = getRemovedCertificatesStorageKey(shipName)
    window.localStorage.setItem(storageKey, JSON.stringify(removedKeys))
    const meta = loadCertificateStateMeta()
    persistCertificateStateMeta({
      ...meta,
      updatedAt: new Date().toISOString(),
    })
    if (shouldMarkDirty) {
      setCertificatesDirty(true)
      setCertificatesSaveMessage("")
    }
  }

  const getCloudShipStatePath = (shipName: string) =>
    `${CERTIFICATE_META_PREFIX}/${normalizeShipStorageName(shipName)}/state.json`

  const getCloudGlobalCustomCertificatesPath = () =>
    `${CERTIFICATE_META_PREFIX}/global/custom-certificates.json`

  const getParticularOverridesStorageKey = (shipName: string) =>
    `${normalizeShipStorageName(shipName)}_particulars_value_overrides`

  const getCloudParticularOverridesPath = (shipName: string) =>
    `${CERTIFICATE_META_PREFIX}/${normalizeShipStorageName(shipName)}/particulars-overrides.json`

  const getParticularFieldKey = (sectionTitle: string, label: string) =>
    `${sectionTitle}::${label}`

  const loadLocalParticularOverrides = (shipName: string): ShipParticularValueOverrides => {
    if (typeof window === "undefined") return {}
    const raw = window.localStorage.getItem(getParticularOverridesStorageKey(shipName))
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === "object" ? (parsed as ShipParticularValueOverrides) : {}
    } catch {
      return {}
    }
  }

  const persistLocalParticularOverrides = (shipName: string, overrides: ShipParticularValueOverrides) => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(getParticularOverridesStorageKey(shipName), JSON.stringify(overrides))
  }

  const downloadJsonFromStorage = async (path: string): Promise<any | null> => {
    const { data, error } = await supabase.storage.from(CERTIFICATE_DOCUMENT_BUCKET).download(path)
    if (error || !data) return null
    try {
      const text = await data.text()
      if (!text) return null
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  const uploadJsonToStorage = async (path: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
    const { error } = await supabase.storage.from(CERTIFICATE_DOCUMENT_BUCKET).upload(path, blob, {
      upsert: true,
      cacheControl: "0",
      contentType: "application/json",
    })
    if (error) {
      throw new Error(error.message || "Kon bestand niet opslaan in cloudopslag.")
    }
  }

  const loadCloudGlobalCustomCertificates = async (): Promise<EditableShipCertificate[] | null> => {
    const parsed = await downloadJsonFromStorage(getCloudGlobalCustomCertificatesPath())
    if (!parsed || !Array.isArray(parsed.customCertificates)) return null
    return parsed.customCertificates as EditableShipCertificate[]
  }

  const saveCloudGlobalCustomCertificates = async (customCertificates: EditableShipCertificate[]) => {
    await uploadJsonToStorage(getCloudGlobalCustomCertificatesPath(), {
      customCertificates,
      updatedAt: new Date().toISOString(),
    })
  }

  const loadCloudParticularState = async (shipName: string): Promise<CloudParticularState | null> => {
    const parsed = await downloadJsonFromStorage(getCloudParticularOverridesPath(shipName))
    if (!parsed || typeof parsed !== "object") return null
    const rawOverrides = parsed.overrides
    const overrides =
      rawOverrides && typeof rawOverrides === "object"
        ? (rawOverrides as ShipParticularValueOverrides)
        : {}
    const rawClassification = parsed.classification
    const classification =
      rawClassification && typeof rawClassification === "object"
        ? ({
            lastClassInspection: String((rawClassification as any).lastClassInspection || ""),
            nextClassInspection: String((rawClassification as any).nextClassInspection || ""),
            lastDryDock: String((rawClassification as any).lastDryDock || ""),
            lastBoxCoolerInspection: String((rawClassification as any).lastBoxCoolerInspection || ""),
          } as ClassificationEditableValues)
        : null
    return {
      overrides,
      classification,
      updatedAt: String(parsed.updatedAt || ""),
    }
  }

  const saveCloudParticularState = async (
    shipName: string,
    overrides: ShipParticularValueOverrides,
    classification: ClassificationEditableValues
  ) => {
    await uploadJsonToStorage(getCloudParticularOverridesPath(shipName), {
      overrides,
      classification,
      updatedAt: new Date().toISOString(),
    })
  }

  const loadCloudShipState = async (shipName: string): Promise<CloudShipCertificateState | null> => {
    const parsed = await downloadJsonFromStorage(getCloudShipStatePath(shipName))
    if (!parsed || typeof parsed !== "object") return null
    const certificates = Array.isArray(parsed.certificates) ? parsed.certificates : []
    const removedCertificateKeys = Array.isArray(parsed.removedCertificateKeys)
      ? parsed.removedCertificateKeys.map((item: unknown) => normalizeCertificateName(String(item || ""))).filter(Boolean)
      : []

    const documents: CertificateDocumentMap = {}
    const rawDocuments = parsed.documents
    if (rawDocuments && typeof rawDocuments === "object") {
      Object.entries(rawDocuments as Record<string, unknown>).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          documents[key] = value.filter((doc) => doc && typeof doc === "object") as CertificateDocumentLink[]
        } else if (value && typeof value === "object") {
          documents[key] = [value as CertificateDocumentLink]
        }
      })
    }

    return {
      certificates,
      documents,
      removedCertificateKeys,
      updatedAt: String(parsed.updatedAt || ""),
    }
  }

  const saveCloudShipState = async (
    shipName: string,
    certificates: EditableShipCertificate[],
    documents: CertificateDocumentMap,
    removedCertificateKeys: string[]
  ) => {
    await uploadJsonToStorage(getCloudShipStatePath(shipName), {
      certificates,
      documents,
      removedCertificateKeys,
      updatedAt: new Date().toISOString(),
    })
    // DB-spiegel voor gedeeld certificatenoverzicht (zodat alle gebruikers dezelfde wijzigingen zien).
    try {
      const shipKey = normalizeShipStorageName(shipName)
      const { error: mirrorError } = await supabase.from("ship_certificate_states").upsert(
        {
          ship_key: shipKey,
          ship_name: shipName,
          certificates,
          removed_certificate_keys: removedCertificateKeys,
          documents,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ship_key" }
      )
      if (mirrorError) {
        console.warn("ship_certificate_states upsert mislukt:", mirrorError.message || mirrorError)
      }
    } catch (error) {
      console.warn("Kon ship_certificate_states niet bijwerken:", (error as any)?.message || error)
    }
  }

  const upsertCertificateByName = (
    source: EditableShipCertificate[],
    certificate: EditableShipCertificate
  ): EditableShipCertificate[] => {
    const targetName = normalizeCertificateName(certificate.naam)
    if (!targetName) return source
    const existingIndex = source.findIndex((item) => normalizeCertificateName(item.naam) === targetName)
    if (existingIndex === -1) return [...source, certificate]

    return source.map((item, idx) => (idx === existingIndex ? { ...item, ...certificate } : item))
  }

  const saveShipCertificates = (next: EditableShipCertificate[]) => {
    setCertificatenEditable(next)
    if (typeof window !== "undefined" && certificateStorageKey) {
      window.localStorage.setItem(certificateStorageKey, JSON.stringify(next))
      const meta = loadCertificateStateMeta()
      persistCertificateStateMeta({
        ...meta,
        updatedAt: new Date().toISOString(),
      })
    }
    setCertificatesDirty(true)
    setCertificatesSaveMessage("")
  }

  const saveCertificatesNow = async () => {
    if (!ship?.name) return
    setCertificatesSaving(true)
    setCertificatesSaveMessage("")
    try {
      const removed = loadRemovedCertificateKeys(ship.name)
      await saveCloudShipState(ship.name, certificatenEditable, certificateDocuments, removed)
      const meta = loadCertificateStateMeta()
      persistCertificateStateMeta({
        ...meta,
        savedAt: new Date().toISOString(),
      })
      setCertificatesDirty(false)
      setCertificatesSaveMessage("Opgeslagen")
    } catch (error: any) {
      const rawMessage = String(error?.message || "onbekende fout")
      const isRlsError = rawMessage.toLowerCase().includes("row-level security")
      setCertificatesSaveMessage(
        isRlsError
          ? "Opslaan mislukt: Supabase opslagrechten (RLS) blokkeren cloud-sync."
          : `Opslaan mislukt: ${rawMessage}`
      )
    } finally {
      setCertificatesSaving(false)
    }
  }

  const applyCloudShipState = (shipName: string, cloudShipState: CloudShipCertificateState) => {
    if (typeof window !== "undefined" && certificateStorageKey) {
      window.localStorage.setItem(certificateStorageKey, JSON.stringify(cloudShipState.certificates || []))
    }
    persistRemovedCertificateKeys(shipName, cloudShipState.removedCertificateKeys || [], {
      markDirty: false,
    })
    persistCertificateDocuments(shipName, cloudShipState.documents || {}, { markDirty: false })
    setCertificateDocuments(cloudShipState.documents || {})
    persistCertificateStateMeta({
      updatedAt: cloudShipState.updatedAt || "",
      savedAt: cloudShipState.updatedAt || "",
    })
    const defaults = getShipCertificateDefaultsForClient(shipName)
    const effectiveRemoved = new Set(cloudShipState.removedCertificateKeys || [])
    const filteredDefaults = defaults.filter(
      (item) => !effectiveRemoved.has(normalizeCertificateName(item.naam))
    )
    const merged = mergeShipCertificatesWithStored(
      shipName,
      cloudShipState.certificates || [],
      filteredDefaults
    )
    setCertificatenEditable(merged)
    setCertificatesDirty(false)
    setCertificatesSaveMessage("")
  }

  useEffect(() => {
    setClassificationEditable(classificationDefault)
    if (typeof window === "undefined" || !classificationStorageKey) return
    const stored = window.localStorage.getItem(classificationStorageKey)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      setClassificationEditable({
        ...classificationDefault,
        ...parsed,
      })
    } catch {
      // Ignore invalid local state.
    }
  }, [classificationDefault, classificationStorageKey])

  useEffect(() => {
    if (typeof window === "undefined" || !ship?.name) return
    let cancelled = false
    certificatesSyncReadyRef.current = false

    const syncCertificateState = async () => {
      // 1) Global custom certificates from cloud -> local cache
      const cloudGlobalCustom = await loadCloudGlobalCustomCertificates()
      if (cancelled) return
      if (cloudGlobalCustom) {
        window.localStorage.setItem(
          GLOBAL_CUSTOM_CERTIFICATES_STORAGE_KEY,
          JSON.stringify(cloudGlobalCustom)
        )
      } else {
        const localGlobal = getGlobalCustomCertificatesForClient()
        if (localGlobal.length > 0) {
          void saveCloudGlobalCustomCertificates(localGlobal)
        }
      }

      // 2) Ship state: cloud-first. Migrate local only when cloud has no state yet.
      const cloudShipState = await loadCloudShipState(ship.name)
      if (cancelled) return

      const localStoredRaw = certificateStorageKey
        ? window.localStorage.getItem(certificateStorageKey)
        : null
      const localStoredCertificates = (() => {
        if (!localStoredRaw) return null
        try {
          return JSON.parse(localStoredRaw)
        } catch {
          return null
        }
      })()

      const localRemoved = loadRemovedCertificateKeys(ship.name)
      const localDocuments = loadCertificateDocuments(ship.name)
      const localStoredArray = Array.isArray(localStoredCertificates) ? localStoredCertificates : []
      const localMeta = loadCertificateStateMeta()
      const localHasData =
        localStoredArray.length > 0 ||
        Object.keys(localDocuments).length > 0 ||
        localRemoved.length > 0
      const localUpdatedAtMs = parseTime(localMeta.updatedAt)
      const localSavedAtMs = parseTime(localMeta.savedAt)
      const localHasUnsaved = localUpdatedAtMs > localSavedAtMs

      if (cloudShipState) {
        applyCloudShipState(ship.name, cloudShipState)
      } else if (localHasData) {
        // Eenmalige migratie: behoud bestaande lokale data en zet die centraal in cloud.
        const removed = localRemoved
        await saveCloudShipState(ship.name, localStoredArray, localDocuments, removed)
        const refreshedCloudState = await loadCloudShipState(ship.name)
        if (cancelled) return
        if (refreshedCloudState) {
          applyCloudShipState(ship.name, refreshedCloudState)
        } else {
          const defaults = getShipCertificateDefaultsForClient(ship.name)
          const filteredDefaults = defaults.filter(
            (item) => !new Set(removed).has(normalizeCertificateName(item.naam))
          )
          const merged = mergeShipCertificatesWithStored(ship.name, localStoredArray, filteredDefaults)
          setCertificatenEditable(merged)
          setCertificateDocuments(localDocuments)
          setCertificatesDirty(localHasUnsaved)
        }
      } else {
        const defaults = getShipCertificateDefaultsForClient(ship.name)
        setCertificatenEditable(defaults)
        setCertificateDocuments({})
        setCertificatesDirty(false)
      }
      if (!cancelled) {
        certificatesSyncReadyRef.current = true
      }
    }

    void syncCertificateState()
    return () => {
      cancelled = true
      certificatesSyncReadyRef.current = false
    }
  }, [certificateStorageKey, ship?.name])

  useEffect(() => {
    if (!ship?.name || certificatesDirty || certificatesSaving || !certificatesSyncReadyRef.current) return
    let cancelled = false
    const refreshFromCloud = async () => {
      const cloudShipState = await loadCloudShipState(ship.name)
      if (cancelled || !cloudShipState) return
      applyCloudShipState(ship.name, cloudShipState)
    }
    const onFocus = () => {
      void refreshFromCloud()
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshFromCloud()
      }
    }
    const interval = window.setInterval(() => {
      void refreshFromCloud()
    }, 15000)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [ship?.name, certificatesDirty, certificatesSaving])

  useEffect(() => {
    if (!ship?.name) {
      setCertificateDocuments({})
      return
    }
    setCertificateDocuments(loadCertificateDocuments(ship.name))
  }, [ship?.name])

  useEffect(() => {
    if (typeof window === "undefined" || !ship?.name) {
      setParticularValueOverrides({})
      setEditingParticularKey(null)
      setEditingParticularValue("")
      return
    }

    let cancelled = false
    const syncParticularOverrides = async () => {
      const cloudState = await loadCloudParticularState(ship.name)
      if (cancelled) return
      if (cloudState) {
        setParticularValueOverrides(cloudState.overrides || {})
        persistLocalParticularOverrides(ship.name, cloudState.overrides || {})
        if (typeof window !== "undefined" && classificationStorageKey) {
          const cloudClassification = cloudState.classification
          if (cloudClassification) {
            const mergedClassification = {
              ...classificationDefault,
              ...cloudClassification,
            }
            setClassificationEditable(mergedClassification)
            window.localStorage.setItem(classificationStorageKey, JSON.stringify(mergedClassification))
          }
        }
        return
      }

      const localOverrides = loadLocalParticularOverrides(ship.name)
      setParticularValueOverrides(localOverrides)
      let localClassification = classificationDefault
      if (typeof window !== "undefined" && classificationStorageKey) {
        try {
          const storedClassification = window.localStorage.getItem(classificationStorageKey)
          if (storedClassification) {
            localClassification = {
              ...classificationDefault,
              ...JSON.parse(storedClassification),
            }
          }
        } catch {
          localClassification = classificationDefault
        }
      }
      if (Object.keys(localOverrides).length > 0 || Object.values(localClassification).some(Boolean)) {
        void saveCloudParticularState(ship.name, localOverrides, localClassification)
      }
    }

    void syncParticularOverrides()
    return () => {
      cancelled = true
    }
  }, [ship?.name, classificationDefault, classificationStorageKey])

  useEffect(() => {
    const requestedTab = String(searchParams?.get("tab") || "").toLowerCase()
    if (requestedTab === "certificaten") {
      setActiveTab("certificaten")
    }
  }, [searchParams])

  useEffect(() => {
    if (typeof window === "undefined" || !certificatesDirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [certificatesDirty])

  useEffect(() => {
    if (!ship?.name || !certificatesDirty || certificatesSaving || !certificatesSyncReadyRef.current) return
    if (certificateAutosaveTimeoutRef.current) {
      clearTimeout(certificateAutosaveTimeoutRef.current)
    }
    certificateAutosaveTimeoutRef.current = setTimeout(() => {
      void saveCertificatesNow()
    }, 900)
    return () => {
      if (certificateAutosaveTimeoutRef.current) {
        clearTimeout(certificateAutosaveTimeoutRef.current)
        certificateAutosaveTimeoutRef.current = null
      }
    }
  }, [
    ship?.name,
    certificatesDirty,
    certificatesSaving,
    certificatenEditable,
    certificateDocuments,
  ])

  useEffect(() => {
    const closeContextMenu = () =>
      setCertificateContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev))
    if (typeof window !== "undefined") {
      window.addEventListener("click", closeContextMenu)
      window.addEventListener("scroll", closeContextMenu, true)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("click", closeContextMenu)
        window.removeEventListener("scroll", closeContextMenu, true)
      }
    }
  }, [])

  useEffect(() => {
    if (!ship) return
    const currentId = String(ship.id)
    setSelectedPrintShipIds((prev) => (prev.length > 0 ? prev : [currentId]))
    setPrintShipIds((prev) => (prev.length > 0 ? prev : [currentId]))
  }, [ship?.id])

  const printCertificatesLayoutRef = useRef(false)
  useEffect(() => {
    printCertificatesLayoutRef.current = printCertificatesLayout
  }, [printCertificatesLayout])

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return
    const onBeforePrint = () => {
      if (!printCertificatesLayoutRef.current) return
      document.documentElement.classList.add("certificate-print-mode")
      document.body.classList.add("certificate-print-mode")
    }
    const onAfterPrint = () => {
      setPrintCertificatesLayout(false)
      setPrintCertificateShipIds([])
    }
    window.addEventListener("beforeprint", onBeforePrint)
    window.addEventListener("afterprint", onAfterPrint)
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint)
      window.removeEventListener("afterprint", onAfterPrint)
    }
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const body = document.body
    if (printCertificatesLayout) {
      root.classList.add("certificate-print-mode")
      body.classList.add("certificate-print-mode")
    } else {
      root.classList.remove("certificate-print-mode")
      body.classList.remove("certificate-print-mode")
    }
    return () => {
      root.classList.remove("certificate-print-mode")
      body.classList.remove("certificate-print-mode")
    }
  }, [printCertificatesLayout])

  const setClassificationField = (key: keyof ClassificationEditableValues, value: string) => {
    const next = { ...classificationEditable, [key]: value }
    setClassificationEditable(next)
    if (typeof window !== "undefined" && classificationStorageKey) {
      window.localStorage.setItem(classificationStorageKey, JSON.stringify(next))
    }
    if (ship?.name) {
      void saveCloudParticularState(ship.name, particularValueOverrides, next)
    }
  }

  const beginEditParticularValue = (sectionTitle: string, label: string, currentValue: string) => {
    const key = getParticularFieldKey(sectionTitle, label)
    setEditingParticularKey(key)
    setEditingParticularValue(currentValue)
  }

  const saveParticularValue = (sectionTitle: string, label: string, value: string) => {
    if (!ship?.name) return
    const fieldKey = getParticularFieldKey(sectionTitle, label)
    const nextOverrides = {
      ...particularValueOverrides,
      [fieldKey]: value,
    }
    setParticularValueOverrides(nextOverrides)
    persistLocalParticularOverrides(ship.name, nextOverrides)
    void saveCloudParticularState(ship.name, nextOverrides, classificationEditable)
    setEditingParticularKey(null)
  }

  const setCertificaatHuidig = (index: number, value: string) => {
    const next = certificatenEditable.map((item, idx) => (idx === index ? { ...item, huidig: value } : item))
    saveShipCertificates(next)
  }

  const setCertificaatWaarschuwing = (index: number, maanden: number) => {
    const next = certificatenEditable.map((item, idx) =>
      idx === index ? { ...item, waarschuwingMaanden: maanden } : item
    )
    saveShipCertificates(next)
  }

  const beginEditCertificaatInterval = (index: number, intervalJaar: number | null) => {
    setEditingIntervalIndex(index)
    setEditingIntervalValue(intervalJaar === null ? "" : formatInterval(intervalJaar))
  }

  const saveCertificaatInterval = (index: number) => {
    const raw = editingIntervalValue.trim()
    if (raw === "" || raw === "-") {
      const next = certificatenEditable.map((item, idx) => (idx === index ? { ...item, intervalJaar: null } : item))
      saveShipCertificates(next)
      setEditingIntervalIndex(null)
      return
    }

    const parsed = Number(raw.replace(",", "."))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      alert("Vul een geldig interval in (bijv. 1 of 0,5).")
      return
    }

    const next = certificatenEditable.map((item, idx) => (idx === index ? { ...item, intervalJaar: parsed } : item))
    saveShipCertificates(next)
    setEditingIntervalIndex(null)
  }

  const uploadCertificateDocument = async (index: number, file: File | null) => {
    if (!file || !ship?.name) return
    const certificate = certificatenEditable[index]
    if (!certificate) return

    try {
      setUploadingCertificateIndex(index)
      const safeShipName = normalizeShipStorageName(ship.name) || "onbekend-schip"
      const safeCertificateName = normalizeShipStorageName(certificate.naam) || "onbekend-certificaat"
      const safeFileName = sanitizeFileName(file.name)
      const storagePath = `ship-certificates/${safeShipName}/${safeCertificateName}/${Date.now()}-${safeFileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(CERTIFICATE_DOCUMENT_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        alert(`Fout bij uploaden document: ${uploadError.message || "Onbekende fout"}`)
        return
      }
      if (!uploadData?.path) {
        alert("Fout bij uploaden document: geen opslagpad ontvangen.")
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from(CERTIFICATE_DOCUMENT_BUCKET)
        .getPublicUrl(uploadData.path)
      const publicUrl = publicUrlData?.publicUrl
      if (!publicUrl) {
        alert("Fout bij uploaden document: geen publieke URL beschikbaar.")
        return
      }

      const key = getCertificateDocumentMapKey(certificate.naam)
      const existingDocs = certificateDocuments[key] || []
      let nextDocs = [...existingDocs]
      if (existingDocs.length > 0 && typeof window !== "undefined") {
        const shouldDeleteOld = window.confirm("Wil je het oude certificaat verwijderen?")
        if (shouldDeleteOld) {
          const oldPaths = existingDocs.map((doc) => doc.storagePath).filter(Boolean)
          if (oldPaths.length > 0) {
            const { error: removeError } = await supabase.storage
              .from(CERTIFICATE_DOCUMENT_BUCKET)
              .remove(oldPaths)
            if (removeError) {
              alert(`Waarschuwing: oud certificaat kon niet uit opslag verwijderd worden (${removeError.message || "onbekende fout"}).`)
            }
          }
          nextDocs = []
        }
      }

      nextDocs.push({
        fileName: file.name,
        fileUrl: publicUrl,
        storagePath: uploadData.path,
        uploadedAt: new Date().toISOString(),
      })

      const next: CertificateDocumentMap = {
        ...certificateDocuments,
        [key]: nextDocs,
      }
      setCertificateDocuments(next)
      persistCertificateDocuments(ship.name, next)
    } catch (error: any) {
      alert(`Fout bij uploaden document: ${error?.message || "Onbekende fout"}`)
    } finally {
      setUploadingCertificateIndex(null)
      setDragOverCertificateIndex(null)
    }
  }

  const openCertificateDocument = (certificateName: string) => {
    const key = getCertificateDocumentMapKey(certificateName)
    const docs = certificateDocuments[key] || []
    const doc = docs[docs.length - 1]
    if (!doc?.fileUrl || typeof window === "undefined") return
    window.open(doc.fileUrl, "_blank", "noopener,noreferrer")
  }

  const handleCertificateDrop = async (index: number, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const file = event.dataTransfer?.files?.[0] || null
    await uploadCertificateDocument(index, file)
  }

  const handleCertificateContextMenu = (index: number, event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setCertificateContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      certificateIndex: index,
    })
  }

  const verwijderCertificaatUitLijst = async (index: number) => {
    if (!ship?.name) return
    const certificaat = certificatenEditable[index]
    if (!certificaat) return

    const confirmed = window.confirm(
      `Wil je "${certificaat.naam}" verwijderen uit de certificatenlijst van ${ship.name}?`
    )
    if (!confirmed) return

    const certificateKey = getCertificateDocumentMapKey(certificaat.naam)
    const docsToRemove = certificateDocuments[certificateKey] || []
    if (docsToRemove.length > 0) {
      const paths = docsToRemove.map((doc) => doc.storagePath).filter(Boolean)
      if (paths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(CERTIFICATE_DOCUMENT_BUCKET)
          .remove(paths)
        if (removeError) {
          alert(
            `Waarschuwing: gekoppelde documenten konden niet allemaal verwijderd worden (${removeError.message || "onbekende fout"}).`
          )
        }
      }
    }

    const removedKeys = loadRemovedCertificateKeys(ship.name)
    const normalizedName = normalizeCertificateName(certificaat.naam)
    if (normalizedName && !removedKeys.includes(normalizedName)) {
      persistRemovedCertificateKeys(ship.name, [...removedKeys, normalizedName])
    }

    const nextCertificates = certificatenEditable.filter((_, idx) => idx !== index)
    saveShipCertificates(nextCertificates)

    const { [certificateKey]: _, ...restDocs } = certificateDocuments
    setCertificateDocuments(restDocs)
    persistCertificateDocuments(ship.name, restDocs)

    setCertificateContextMenu({ visible: false, x: 0, y: 0, certificateIndex: null })
  }

  const printScheepsgegevens = () => {
    setPrintCertificatesLayout(false)
    setPrintCertificateShipIds([])
    setPrintDialogKind("scheepsgegevens")
    setPrintDialogOpen(true)
  }

  const openPrintCertificatesDialog = () => {
    if (typeof window === "undefined") return
    if (!ship?.name || !certificateStorageKey) {
      alert("Voor dit schip zijn geen certificaten beschikbaar om te printen.")
      return
    }
    if (allCertificateShipIds.length === 0) {
      alert("Er zijn geen schepen met een certificaatlijst om te printen.")
      return
    }
    setPrintCertificatesLayout(false)
    setPrintDialogKind("certificaten")
    const currentId = String(ship.id)
    setSelectedPrintShipIds((prev) => {
      const filtered = prev.filter((id) => allCertificateShipIds.includes(id))
      if (filtered.length > 0) return filtered
      return allCertificateShipIds.includes(currentId) ? [currentId] : [allCertificateShipIds[0]]
    })
    setPrintDialogOpen(true)
  }

  const togglePrintShipId = (targetShipId: string, checked: boolean) => {
    if (checked) {
      setSelectedPrintShipIds((prev) => Array.from(new Set([...prev, targetShipId])))
      return
    }
    setSelectedPrintShipIds((prev) => prev.filter((id) => id !== targetShipId))
  }

  const handleToggleSelectAllPrintShips = (checked: boolean) => {
    const ids = printDialogKind === "certificaten" ? allCertificateShipIds : allSupportedShipIds
    if (checked) {
      setSelectedPrintShipIds(ids)
      return
    }
    setSelectedPrintShipIds([])
  }

  const startPrintSelectedShips = () => {
    if (selectedPrintShipIds.length === 0) {
      alert("Selecteer minimaal een schip om te printen.")
      return
    }
    setPrintCertificatesLayout(false)
    setPrintCertificateShipIds([])
    setPrintShipIds(selectedPrintShipIds)
    setPrintDialogOpen(false)
    setPrintDialogKind(null)
    setActiveTab("scheepsgegevens")
    setCertificateContextMenu({ visible: false, x: 0, y: 0, certificateIndex: null })
    if (typeof window !== "undefined") {
      window.setTimeout(() => window.print(), 380)
    }
  }

  const startPrintSelectedCertificates = () => {
    if (typeof window === "undefined") return
    const chosen = selectedPrintShipIds.filter((id) => allCertificateShipIds.includes(id))
    if (chosen.length === 0) {
      alert("Selecteer minimaal een schip met een certificaatlijst.")
      return
    }
    document.documentElement.classList.add("certificate-print-mode")
    document.body.classList.add("certificate-print-mode")
    setPrintCertificateShipIds(chosen)
    setPrintCertificatesLayout(true)
    setPrintDialogOpen(false)
    setPrintDialogKind(null)
    setActiveTab("certificaten")
    setCertificateContextMenu({ visible: false, x: 0, y: 0, certificateIndex: null })
    window.setTimeout(() => window.print(), 380)
  }

  const dialogShipIdsForPrint =
    printDialogKind === "certificaten" ? allCertificateShipIds : allSupportedShipIds
  const dialogShipRowsForPrint =
    printDialogKind === "certificaten" ? shipsWithCertificatePrint : supportedShipsForPrint
  const allDialogShipsSelected =
    dialogShipIdsForPrint.length > 0 &&
    dialogShipIdsForPrint.every((id) => selectedPrintShipIds.includes(id))

  const voegNieuwCertificaatToe = async () => {
    const naam = nieuwCertificaatNaam.trim()
    if (!naam) {
      setNieuwCertificaatFout("Vul een certificaatnaam in.")
      return
    }

    if (!nieuwCertificaatDatum) {
      setNieuwCertificaatFout("Vul een datum keuring in.")
      return
    }

    const interval = Number(nieuwCertificaatInterval.replace(",", "."))
    if (!Number.isFinite(interval) || interval <= 0) {
      setNieuwCertificaatFout("Vul een geldig interval in jaren in.")
      return
    }

    const waarschuwingMaanden = Number(nieuwCertificaatWaarschuwing)
    if (!SHIP_CERTIFICATE_WARNING_OPTIONS.includes(waarschuwingMaanden as any)) {
      setNieuwCertificaatFout("Waarschuwen vanaf is ongeldig.")
      return
    }

    const nieuwCertificaat: EditableShipCertificate = {
      naam,
      huidig: nieuwCertificaatDatum,
      intervalJaar: interval,
      waarschuwingMaanden,
    }

    setNieuwCertificaatFout("")

    if (typeof window === "undefined") return

    if (nieuwCertificaatVoorAlleSchepen === "ja") {
      const globalExisting = getGlobalCustomCertificatesForClient()
      const nextGlobal = upsertCertificateByName(globalExisting, nieuwCertificaat)
      window.localStorage.setItem(GLOBAL_CUSTOM_CERTIFICATES_STORAGE_KEY, JSON.stringify(nextGlobal))
      try {
        await saveCloudGlobalCustomCertificates(nextGlobal)
      } catch (error: any) {
        setNieuwCertificaatFout(
          `Opslaan globaal certificaat mislukt: ${error?.message || "onbekende fout"}`
        )
        return
      }

      const defaults = getShipCertificateDefaultsForClient(ship?.name || "")
      if (!certificateStorageKey) {
        setCertificatenEditable(defaults)
      } else {
        const stored = window.localStorage.getItem(certificateStorageKey)
        try {
          const parsed = stored ? JSON.parse(stored) : null
          setCertificatenEditable(mergeShipCertificatesWithStored(ship?.name || "", parsed, defaults))
        } catch {
          setCertificatenEditable(defaults)
        }
      }
    } else {
      const next = upsertCertificateByName(certificatenEditable, nieuwCertificaat)
      saveShipCertificates(next)
    }

    setNieuwCertificaatNaam("")
    setNieuwCertificaatDatum("")
    setNieuwCertificaatInterval("")
    setNieuwCertificaatWaarschuwing("1")
    setNieuwCertificaatVoorAlleSchepen("nee")
    setToonNieuwCertificaatFormulier(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <main className="w-full py-6 md:py-8 px-3 md:px-4 max-w-6xl mx-auto print:max-w-none print:px-0 print:py-0">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/schepen/overzicht">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Ship className="w-6 h-6 text-blue-600" />
                Scheepsgegevens - {ship?.name || "Onbekend schip"}
              </h1>
              <p className="text-gray-600">Overzicht van scheepsgegevens uit documentatie</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={printScheepsgegevens}>
              <Printer className="w-4 h-4 mr-2" />
              Print scheepsgegevens
            </Button>
            {isSupportedShip && certificateStorageKey ? (
              <Button variant="outline" size="sm" onClick={openPrintCertificatesDialog}>
                <FileText className="w-4 h-4 mr-2" />
                Print certificaten
              </Button>
            ) : null}
          </div>
        </div>
        <Dialog
          open={printDialogOpen}
          onOpenChange={(open) => {
            setPrintDialogOpen(open)
            if (!open) setPrintDialogKind(null)
          }}
        >
          <DialogContent className="sm:max-w-[560px] print:hidden">
            <DialogHeader>
              <DialogTitle>
                {printDialogKind === "certificaten"
                  ? "Selecteer schepen voor certificaatprint"
                  : "Selecteer te printen schepen"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b pb-3">
                <Checkbox
                  id="print-select-all-ships"
                  checked={allDialogShipsSelected}
                  onCheckedChange={(checked) => handleToggleSelectAllPrintShips(Boolean(checked))}
                />
                <label htmlFor="print-select-all-ships" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Select all
                </label>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {dialogShipRowsForPrint.map((shipOption: any) => {
                  const optionId = String(shipOption.id)
                  const checked = selectedPrintShipIds.includes(optionId)
                  return (
                    <div key={optionId} className="flex items-center space-x-2">
                      <Checkbox
                        id={`print-ship-${optionId}`}
                        checked={checked}
                        onCheckedChange={(value) => togglePrintShipId(optionId, Boolean(value))}
                      />
                      <label htmlFor={`print-ship-${optionId}`} className="text-sm text-gray-800 cursor-pointer">
                        {shipOption.name}
                      </label>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button
                  onClick={() =>
                    printDialogKind === "certificaten"
                      ? startPrintSelectedCertificates()
                      : startPrintSelectedShips()
                  }
                >
                  Print selectie
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="print:hidden">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-gray-600">Laden...</CardContent>
          </Card>
        ) : !ship ? (
          <Card>
            <CardContent className="p-6 text-red-600">Schip niet gevonden.</CardContent>
          </Card>
        ) : !isSupportedShip ? (
          <Card>
            <CardHeader>
              <CardTitle>Scheepsgegevens nog niet ingevoerd</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <p>
                Voor <strong>{ship.name}</strong> is de pagina met scheepsgegevens nog niet gevuld.
              </p>
              <p>
                We starten met Apollo, Jupiter, Neptunus, Bacchus, Bellona, Pluto, Caritas, Fraternite, Libertas, Maike, Egalite, Fidelitas, Serenitas, Harmonie en Linde en vullen daarna de overige schepen op dezelfde manier.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="hidden print:block mb-4">
              <h1 className="text-xl font-bold text-gray-900">Scheepsgegevens - {ship?.name || "Onbekend schip"}</h1>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-xl grid-cols-2 mb-2 print:hidden">
                <TabsTrigger value="scheepsgegevens" className="text-base">
                  <Ship className="w-4 h-4 mr-2" />
                  Scheepsgegevens
                </TabsTrigger>
                <TabsTrigger value="certificaten" className="text-base">
                  <FileText className="w-4 h-4 mr-2" />
                  Certificaten
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scheepsgegevens" className="space-y-4">
                {sections.map((section) => (
                  <Card key={section.title} className="print:shadow-none print:border-gray-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {section.items && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
                          {section.items
                            .filter((item) => !HIDDEN_SCHEEPSGEGEVENS_LABELS.has(item.label))
                            .map((item) => {
                              const fieldKey = getParticularFieldKey(section.title, item.label)
                              const displayValue = particularValueOverrides[fieldKey] ?? item.value
                              const isEditingField = editingParticularKey === fieldKey

                              return (
                                <div key={`${section.title}-${item.label}`} className="flex justify-between border-b border-gray-100 py-1 gap-4">
                                  <span className="text-gray-600">{item.label}</span>
                                  {section.title === "Classificatie" && item.editableKey ? (
                                    <div className="w-[180px]">
                                      <Input
                                        type="date"
                                        value={classificationEditable[item.editableKey] || ""}
                                        onChange={(e) =>
                                          setClassificationField(
                                            item.editableKey as keyof ClassificationEditableValues,
                                            e.target.value
                                          )
                                        }
                                        className="h-8 text-xs print:hidden"
                                      />
                                      <span className="hidden print:block text-gray-900 text-right">
                                        {formatIsoToDutchDate(classificationEditable[item.editableKey])}
                                      </span>
                                    </div>
                                  ) : isEditingField ? (
                                    <div className="w-[220px]">
                                      <Input
                                        autoFocus
                                        value={editingParticularValue}
                                        onChange={(e) => setEditingParticularValue(e.target.value)}
                                        onBlur={() =>
                                          saveParticularValue(section.title, item.label, editingParticularValue)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            saveParticularValue(section.title, item.label, editingParticularValue)
                                          } else if (e.key === "Escape") {
                                            setEditingParticularKey(null)
                                          }
                                        }}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  ) : (
                                    <span
                                      className="text-gray-900 text-right cursor-text"
                                      onDoubleClick={() =>
                                        beginEditParticularValue(section.title, item.label, displayValue)
                                      }
                                      onClick={(e) => {
                                        if (e.detail === 2) {
                                          beginEditParticularValue(section.title, item.label, displayValue)
                                        }
                                      }}
                                      title="Dubbelklik om te wijzigen"
                                    >
                                      {item.editableKey
                                        ? formatIsoToDutchDate(classificationEditable[item.editableKey])
                                        : displayValue}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      )}
                      {section.tables?.map((table) => (
                        <div key={`${section.title}-${table.title}`} className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">{table.title}</h4>
                          <div className="overflow-x-auto border rounded">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-100">
                                <tr>
                                  {table.columns.map((col) => (
                                    <th key={col} className="px-2 py-2 text-left font-semibold text-gray-700 border-b">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {table.rows.map((row, idx) => (
                                  <tr key={`${table.title}-${idx}`} className="border-b last:border-b-0">
                                    {row.map((cell, cIdx) => (
                                      <td key={`${idx}-${cIdx}`} className="px-2 py-1.5 text-gray-800 align-top">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="certificaten" className="print:hidden">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Certificaten & keuringen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600">
                      Huidige datum is aanpasbaar per certificaat. Verloopdatum wordt automatisch berekend op basis van het interval.
                    </div>
                    <div>
                      <Button
                        type="button"
                        size="sm"
                        variant={toonNieuwCertificaatFormulier ? "outline" : "default"}
                        onClick={() => {
                          setNieuwCertificaatFout("")
                          setToonNieuwCertificaatFormulier((prev) => !prev)
                        }}
                      >
                        {toonNieuwCertificaatFormulier ? "Formulier sluiten" : "Certificaat toevoegen"}
                      </Button>
                    </div>
                    {toonNieuwCertificaatFormulier && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
                        <div className="text-sm font-semibold text-blue-900">Nieuw certificaat</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="space-y-1">
                            <div className="text-gray-700">Naam certificaat</div>
                            <Input
                              value={nieuwCertificaatNaam}
                              onChange={(e) => setNieuwCertificaatNaam(e.target.value)}
                              className="h-9 text-xs"
                              placeholder="Bijv. Certificaat voorbeeld"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-700">Datum keuring</div>
                            <Input
                              type="date"
                              value={nieuwCertificaatDatum}
                              onChange={(e) => setNieuwCertificaatDatum(e.target.value)}
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-700">Interval (jaar)</div>
                            <Input
                              value={nieuwCertificaatInterval}
                              onChange={(e) => setNieuwCertificaatInterval(e.target.value)}
                              className="h-9 text-xs"
                              placeholder="Bijv. 1 of 0,5"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-700">Waarschuwen vanaf</div>
                            <Select value={nieuwCertificaatWaarschuwing} onValueChange={setNieuwCertificaatWaarschuwing}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Kies maanden" />
                              </SelectTrigger>
                              <SelectContent>
                                {SHIP_CERTIFICATE_WARNING_OPTIONS.map((optie) => (
                                  <SelectItem key={optie} value={String(optie)}>
                                    {optie} maand{optie === 1 ? "" : "en"} vooraf
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-700">Dit certificaat voor alle schepen</div>
                            <Select value={nieuwCertificaatVoorAlleSchepen} onValueChange={setNieuwCertificaatVoorAlleSchepen}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Maak een keuze" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ja">Ja</SelectItem>
                                <SelectItem value="nee">Nee (alleen dit schip)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {nieuwCertificaatFout && <div className="text-xs font-medium text-red-700">{nieuwCertificaatFout}</div>}
                        <div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              void voegNieuwCertificaatToe()
                            }}
                          >
                            Certificaat toevoegen
                          </Button>
                        </div>
                      </div>
                    )}
                    {certificatenEditable.map((certificaat, index) => {
                      const verloopIso = calculateCertificateExpiryDateIso(certificaat.huidig, certificaat.intervalJaar)
                      const statusInfo = getCertificateStatus(certificaat)
                      const documentKey = getCertificateDocumentMapKey(certificaat.naam)
                      const documentLinks = certificateDocuments[documentKey] || []
                      const hasDocument = documentLinks.length > 0
                      const isDragging = dragOverCertificateIndex === index
                      const isUploading = uploadingCertificateIndex === index
                      const cardClassName =
                        statusInfo.status === "expired"
                          ? "rounded-lg border border-red-300 bg-red-50 px-3 py-3"
                          : statusInfo.status === "warning"
                            ? "rounded-lg border border-orange-300 bg-orange-50 px-3 py-3"
                            : "rounded-lg border border-gray-200 bg-white px-3 py-3"
                      return (
                        <div
                          key={`${certificaat.naam}-${index}`}
                          className={`${cardClassName} ${hasDocument ? "cursor-pointer" : ""} ${isDragging ? "ring-2 ring-blue-400" : ""}`}
                          onClick={() => {
                            if (!hasDocument) return
                            openCertificateDocument(certificaat.naam)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDragOverCertificateIndex(index)
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDragOverCertificateIndex((prev) => (prev === index ? null : prev))
                          }}
                          onDrop={(e) => handleCertificateDrop(index, e)}
                          onContextMenu={(e) => handleCertificateContextMenu(index, e)}
                        >
                          <div className="mb-2">
                            <div className="text-sm font-semibold text-gray-900">{certificaat.naam}</div>
                            {hasDocument && <div className="text-xs text-gray-500">(klik op kaart om te openen)</div>}
                          </div>
                          {!hasDocument && (
                            <div className="mb-2 text-xs text-gray-600">
                              Sleep hier een document naartoe.
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1">
                              <div className="text-gray-600">Huidig</div>
                              <Input
                                type="date"
                                value={certificaat.huidig}
                                onChange={(e) => setCertificaatHuidig(index, e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-gray-600">Verloopdatum</div>
                              <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-gray-900">
                                {formatIsoToDutchDate(verloopIso)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-gray-600">Interval (jaar)</div>
                              {editingIntervalIndex === index ? (
                                <Input
                                  autoFocus
                                  value={editingIntervalValue}
                                  onChange={(e) => setEditingIntervalValue(e.target.value)}
                                  onBlur={() => saveCertificaatInterval(index)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      saveCertificaatInterval(index)
                                    } else if (e.key === "Escape") {
                                      setEditingIntervalIndex(null)
                                    }
                                  }}
                                  className="h-9 text-xs"
                                  placeholder="Bijv. 1 of 0,5"
                                />
                              ) : (
                                <div
                                  className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-gray-900 cursor-text"
                                  onDoubleClick={() => beginEditCertificaatInterval(index, certificaat.intervalJaar)}
                                  title="Dubbelklik om interval te wijzigen"
                                >
                                  {formatInterval(certificaat.intervalJaar)}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="text-gray-600">Waarschuwen vanaf</div>
                              <Select
                                value={String(certificaat.waarschuwingMaanden)}
                                onValueChange={(value) => setCertificaatWaarschuwing(index, Number(value))}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Kies maanden" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SHIP_CERTIFICATE_WARNING_OPTIONS.map((optie) => (
                                    <SelectItem key={optie} value={String(optie)}>
                                      {optie} maand{optie === 1 ? "" : "en"} vooraf
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {statusInfo.status === "expired" && (
                            <div className="mt-2 text-xs font-medium text-red-700">Verlopen certificaat</div>
                          )}
                          {statusInfo.status === "warning" && (
                            <div className="mt-2 text-xs font-medium text-orange-700">
                              Loopt binnenkort af (binnen {certificaat.waarschuwingMaanden} maand
                              {certificaat.waarschuwingMaanden === 1 ? "" : "en"})
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="text-xs text-gray-700">
                        {certificatesDirty
                          ? "Er zijn niet-opgeslagen wijzigingen in certificaten."
                          : "Alle certificaatwijzigingen zijn opgeslagen."}
                      </div>
                      <div className="flex items-center gap-2">
                        {certificatesSaveMessage && (
                          <div
                            className={`text-xs ${
                              certificatesSaveMessage.toLowerCase().includes("mislukt")
                                ? "text-red-700"
                                : "text-green-700"
                            }`}
                          >
                            {certificatesSaveMessage}
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          disabled={certificatesSaving || !certificatesDirty}
                          onClick={() => {
                            void saveCertificatesNow()
                          }}
                        >
                          {certificatesSaving ? "Opslaan..." : "Opslaan wijzigingen"}
                        </Button>
                      </div>
                    </div>
                    {certificateContextMenu.visible && certificateContextMenu.certificateIndex !== null && (
                      <div
                        className="fixed z-50 min-w-[220px] rounded-md border border-gray-200 bg-white shadow-lg"
                        style={{
                          top: certificateContextMenu.y,
                          left: certificateContextMenu.x,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (certificateContextMenu.certificateIndex === null) return
                            void verwijderCertificaatUitLijst(certificateContextMenu.certificateIndex)
                          }}
                        >
                          Verwijder certificaat uit lijst
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
        </div>

        <div className={`hidden ${printCertificatesLayout ? "print:hidden" : "print:block"}`}>
          {printShipIdsToRender.map((printId) => {
            const printShip = ships.find((s: any) => String(s.id) === String(printId))
            const printConfig = getShipParticularsConfigByName(printShip?.name || "")
            if (!printShip || !printConfig) return null

            const classificationValues = (() => {
              const defaults = printConfig.classificationDefault
              if (typeof window === "undefined") return defaults
              const storedRaw = window.localStorage.getItem(printConfig.classificationStorageKey)
              if (!storedRaw) return defaults
              try {
                const parsed = JSON.parse(storedRaw)
                return { ...defaults, ...parsed }
              } catch {
                return defaults
              }
            })()
            const printParticularOverrides = loadLocalParticularOverrides(printShip.name)

            return (
              <div key={`print-${printId}`} className="mb-6 print:mb-8 break-after-page last:break-after-auto">
                <h1 className="text-xl font-bold text-gray-900 mb-3">
                  Scheepsgegevens - {printShip.name}
                </h1>
                <div className="space-y-4">
                  {printConfig.sections.map((section) => (
                    <Card key={`print-${printShip.id}-${section.title}`} className="print:shadow-none print:border-gray-300">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {section.items && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
                            {section.items
                              .filter((item) => !HIDDEN_SCHEEPSGEGEVENS_LABELS.has(item.label))
                              .map((item) => (
                              <div key={`print-${printShip.id}-${section.title}-${item.label}`} className="flex justify-between border-b border-gray-100 py-1 gap-4">
                                <span className="text-gray-600">{item.label}</span>
                                <span className="text-gray-900 text-right">
                                  {section.title === "Classificatie" && item.editableKey
                                    ? formatIsoToDutchDate(classificationValues[item.editableKey])
                                    : printParticularOverrides[getParticularFieldKey(section.title, item.label)] ?? item.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {section.tables?.map((table) => (
                          <div key={`print-${printShip.id}-${section.title}-${table.title}`} className="mt-4">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">{table.title}</h4>
                            <div className="overflow-x-auto border rounded">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    {table.columns.map((col) => (
                                      <th key={`print-${printShip.id}-${section.title}-${table.title}-${col}`} className="px-2 py-2 text-left font-semibold text-gray-700 border-b">
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {table.rows.map((row, rowIdx) => (
                                    <tr key={`print-${printShip.id}-${section.title}-${table.title}-row-${rowIdx}`} className="border-b last:border-b-0">
                                      {row.map((cell, cellIdx) => (
                                        <td key={`print-${printShip.id}-${section.title}-${table.title}-row-${rowIdx}-cell-${cellIdx}`} className="px-2 py-1.5 text-gray-800 align-top">
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {printCertificatesLayout && printCertificateShipIds.length > 0 ? (
          <div className={`hidden print:block`}>
            {printCertificateShipIds.map((certPrintShipId, shipIdx) => {
              const printCertShip = ships.find((s: any) => String(s.id) === String(certPrintShipId))
              if (!printCertShip?.name) return null
              if (!getShipCertificateStorageKeyByName(printCertShip.name)) return null
              const certsForShip = sortCertificatesForPrintList(
                String(ship?.id) === String(printCertShip.id)
                  ? certificatenEditable
                  : loadMergedCertificatesForPrintFromStorage(printCertShip.name)
              )
              const printedOn = new Date().toLocaleDateString("nl-NL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
              return (
                <div
                  key={`cert-print-${certPrintShipId}`}
                  className={shipIdx > 0 ? "print:break-before-page" : ""}
                >
                  <div className="mb-4 certificate-print-title">
                    <h1 className="text-2xl font-bold text-gray-900">
                      Verloopdatums Certificaten, Keuringen en Verklaringen
                    </h1>
                    <p className="text-base font-semibold text-gray-800 mt-2">Schip: {printCertShip.name}</p>
                    <p className="text-sm text-gray-600 mt-1">Afgedrukt op {printedOn}</p>
                    <p className="text-sm text-gray-900 mt-3 font-medium">
                      <span className="inline-block mr-1 h-3 w-3 rounded-sm bg-red-600 align-middle" aria-hidden />
                      <span className="text-red-900 font-bold">Rood</span> = verlopen ·{" "}
                      <span
                        className="inline-block mr-1 h-3 w-3 rounded-sm bg-orange-500 align-middle"
                        aria-hidden
                      />
                      <span className="text-orange-900 font-bold">Oranje</span> = bijna verlopen
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Gesorteerd: eerst verlopen, dan bijna verlopen, daarna overige.
                    </p>
                  </div>
                  <table className="w-full text-sm border-collapse border-2 border-gray-800 certificate-print-table">
                    <thead>
                      <tr className="bg-gray-300">
                        <th className="border-2 border-gray-800 px-3 py-2 text-left font-bold">Certificaat</th>
                        <th className="border-2 border-gray-800 px-3 py-2 text-left font-bold">Huidig</th>
                        <th className="border-2 border-gray-800 px-3 py-2 text-left font-bold">Verloopdatum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certsForShip.map((cert) => {
                        const verloopIso = calculateCertificateExpiryDateIso(cert.huidig, cert.intervalJaar)
                        const statusInfo = getCertificateStatus(cert)
                        const rowClass =
                          statusInfo.status === "expired"
                            ? "bg-red-300 text-red-950 border-red-800"
                            : statusInfo.status === "warning"
                              ? "bg-orange-300 text-orange-950 border-orange-800"
                              : "bg-white text-gray-900"
                        const rowPrintColorStyle: CSSProperties = {
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }
                        const cellBorder = "border-2 border-gray-700 px-3 py-2 align-top"
                        return (
                          <tr
                            key={`print-cert-${printCertShip.id}-${cert.naam}`}
                            className={rowClass}
                            style={rowPrintColorStyle}
                          >
                            <td className={`${cellBorder} font-semibold`}>{cert.naam}</td>
                            <td className={cellBorder}>{cert.huidig ? formatIsoToDutchDate(cert.huidig) : "-"}</td>
                            <td className={cellBorder}>{verloopIso ? formatIsoToDutchDate(verloopIso) : "-"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        ) : null}
      </main>
    </div>
  )
}

