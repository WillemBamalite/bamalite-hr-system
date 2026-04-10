"use client"

import { useEffect, useMemo, useState } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { BackButton } from "@/components/ui/back-button"
import { isCopiedCrewMember, isRealCrewMember } from "@/utils/crew-filters"

type SalaryHistoryItem = {
  id: string
  month_key: string
  base_salary: number
  travel_allowance: boolean
  raise_amount: number
  advance_amount: number
  overtime_days: number
  overtime_note: string
  inflation_adjustment: number
  notes: string
  total_salary_month: number
}

const getCurrentMonthKey = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

const shiftMonthKey = (monthKey: string, deltaMonths: number) => {
  const [yearStr, monthStr] = (monthKey || "").split("-")
  const year = parseInt(yearStr || "0", 10)
  const month = parseInt(monthStr || "0", 10)
  if (!year || !month) return getCurrentMonthKey()
  const d = new Date(year, month - 1, 1)
  d.setMonth(d.getMonth() + deltaMonths)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const monthKeyToDisplay = (monthKey: string) => {
  const [year, month] = (monthKey || "").split("-")
  if (!year || !month) return monthKey
  return `${month}/${String(year).slice(-2)}`
}

const monthNumberToName = (month: string, german = false) => {
  const map: Record<string, string> = german
    ? {
        "01": "Januar",
        "02": "Februar",
        "03": "Marz",
        "04": "April",
        "05": "Mai",
        "06": "Juni",
        "07": "Juli",
        "08": "August",
        "09": "September",
        "10": "Oktober",
        "11": "November",
        "12": "Dezember",
      }
    : {
        "01": "januari",
        "02": "februari",
        "03": "maart",
        "04": "april",
        "05": "mei",
        "06": "juni",
        "07": "juli",
        "08": "augustus",
        "09": "september",
        "10": "oktober",
        "11": "november",
        "12": "december",
      }
  return map[month] || month
}

type SalaryDraft = {
  id?: string
  crew_id: string
  company: string | null
  month_key: string
  in_service_from: string | null
  iban: string
  base_salary: number | null
  travel_allowance: boolean
  advance_enabled: boolean
  advance_amount: number | null
  deduction_category: "lening" | "voorschot" | "kleding" | "opleidingskosten" | "boetes" | "overig"
  raise_enabled: boolean
  raise_amount: number | null
  overtime_enabled: boolean
  overtime_days: number | null
  overtime_note: string
  inflation_adjustment: number | null
  inflation_batch_id: string
  month_closed: boolean
  month_closed_by: string
  month_closed_at: string
  approval_leo: boolean
  approval_karina: boolean
  notes: string
  review_comment: string
  review_by: string
  review_type: "opmerking" | "correctie"
}

const DEDUCTION_CATEGORY_OPTIONS = [
  { value: "lening", label: "Lening" },
  { value: "voorschot", label: "Voorschot" },
  { value: "kleding", label: "Kleding" },
  { value: "opleidingskosten", label: "Opleidingskosten" },
  { value: "boetes", label: "Boetes" },
  { value: "overig", label: "Overig" },
] as const

const getDeductionCategoryLabel = (value: string) => {
  return DEDUCTION_CATEGORY_OPTIONS.find((o) => o.value === value)?.label || "Overig"
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${dd}/${mm}/${yy} ${hh}:${mi}`
}

const getErrMsg = (e: any) => {
  if (!e) return "Onbekende fout"
  return e?.message || e?.error?.message || e?.details || e?.hint || JSON.stringify(e)
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const formatEuro = (value: number) =>
  `€ ${value.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatCurrency = (value: number) => formatEuro(Number(value || 0))
const SEPA_CCY = "EUR"
const DEFAULT_SEPA_MESSAGE_PREFIX = "Salaris"

const parseMoney = (value: any): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value !== "string") return 0
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseDecimalInput = (value: string): number => {
  const normalized = String(value || "").trim().replace(",", ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const getContractBaseSalaryInclClothing = (crewMember: any): number | null => {
  const notesText = Array.isArray(crewMember?.notes)
    ? crewMember.notes.join(" | ")
    : String(crewMember?.notes || "")
  const noteMatch = notesText.match(/contract_basis_salaris_excl_kleding:([0-9.,-]+)/i)
  const noteBase = noteMatch ? parseMoney(noteMatch[1]) : 0

  const baseRaw =
    crewMember?.basis_salaris ??
    crewMember?.basissalaris ??
    crewMember?.basisSalaris ??
    crewMember?.salaris ??
    crewMember?.salary ??
    null
  const clothingRaw =
    crewMember?.kleding_geld ??
    crewMember?.kledinggeld ??
    crewMember?.kledingGeld ??
    crewMember?.clothing_allowance ??
    null
  const base = parseMoney(baseRaw)
  const clothing = parseMoney(clothingRaw)
  const total = base + clothing
  if (total > 0) return total
  return noteBase > 0 ? noteBase : null
}

const getContractTravelEnabled = (crewMember: any): boolean => {
  const notesText = Array.isArray(crewMember?.notes)
    ? crewMember.notes.join(" | ")
    : String(crewMember?.notes || "")
  const noteMatch = notesText.match(/contract_reiskosten:([0-9.,-]+)/i)
  const noteTravel = noteMatch ? parseMoney(noteMatch[1]) : 0

  const travelRaw =
    crewMember?.reiskosten ??
    crewMember?.travel_allowance ??
    crewMember?.travelAllowance ??
    crewMember?.reis_kosten ??
    null
  if (typeof travelRaw === "boolean") return travelRaw
  const directTravel = parseMoney(travelRaw)
  if (directTravel > 0) return true
  return noteTravel > 0
}

const normalizeIban = (iban: string) => String(iban || "").replace(/\s+/g, "").toUpperCase()

const isValidIban = (ibanInput: string) => {
  const iban = normalizeIban(ibanInput)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`
  let remainder = 0
  for (const ch of rearranged) {
    const value = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch
    for (const digit of value) {
      remainder = (remainder * 10 + Number(digit)) % 97
    }
  }
  return remainder === 1
}

const escapeXml = (value: string) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

const isAflosser = (member: any) =>
  member?.position === "Aflosser" || member?.position === "aflosser" || member?.is_aflosser === true

const isEligibleForSalaryPage = (member: any) => {
  if (!isRealCrewMember(member)) return false
  if (isCopiedCrewMember(member)) return false
  if (isAflosser(member)) {
    // Vaste aflossers tellen mee voor salarissen, ook als recruitment_status nog niet exact "aangenomen" is.
    return member?.vaste_dienst === true
  }
  if (member?.recruitment_status && member.recruitment_status !== "aangenomen") return false
  return true
}

const isEligibleForSalaryMonth = (member: any, selectedMonthKey: string) => {
  const inDienstVanaf = String(member?.in_dienst_vanaf || "").trim()
  if (!inDienstVanaf) return true
  const d = new Date(inDienstVanaf)
  if (isNaN(d.getTime())) return true
  const startMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  return startMonthKey <= selectedMonthKey
}

const KARINA_EMAIL = "karina@bamalite.com"
const LEO_EMAIL = "leo@bamalite.com"
const SALARY_PASSWORD_ADMIN_EMAILS = new Set([
  "leo@bamalite.com",
  "bart@bamalite.com",
  "jos@bamalite.com",
  "willem@bamalite.com",
])
const ENFORCE_SALARY_VALIDATIONS = false
const REVIEW_META_PREFIX = "__REVIEW_META__:"
const SALARY_META_PREFIX = "__SALARY_META__:"

const parseSalaryMetaFromReason = (reasonValue: any) => {
  const reason = String(reasonValue || "")
  const salaryMarkerIndex = reason.lastIndexOf(SALARY_META_PREFIX)
  const markerIndex = salaryMarkerIndex >= 0 ? salaryMarkerIndex : reason.lastIndexOf(REVIEW_META_PREFIX)
  if (markerIndex < 0) return null
  const prefixLength = salaryMarkerIndex >= 0 ? SALARY_META_PREFIX.length : REVIEW_META_PREFIX.length
  const jsonPart = reason.slice(markerIndex + prefixLength).trim()
  if (!jsonPart) return null
  try {
    const parsed = JSON.parse(jsonPart) as {
      iban?: string
      review_comment?: string
      review_by?: string
      review_type?: "opmerking" | "correctie"
      advance_enabled?: boolean
      advance_amount?: number
      deduction_category?: "lening" | "voorschot" | "kleding" | "opleidingskosten" | "boetes" | "overig"
      raise_enabled?: boolean
      raise_amount?: number
      overtime_enabled?: boolean
      overtime_days?: number
      overtime_note?: string
      inflation_adjustment?: number
      inflation_batch_id?: string
      month_closed?: boolean
      month_closed_by?: string
      month_closed_at?: string
      approval_leo?: boolean
      approval_karina?: boolean
    }
    return {
      iban: String(parsed.iban || ""),
      review_comment: String(parsed.review_comment || ""),
      review_by: String(parsed.review_by || ""),
      review_type: parsed.review_type === "correctie" ? "correctie" : "opmerking",
      advance_enabled: parsed.advance_enabled === true,
      advance_amount: typeof parsed.advance_amount === "number" ? parsed.advance_amount : 0,
      deduction_category:
        parsed.deduction_category === "lening" ||
        parsed.deduction_category === "voorschot" ||
        parsed.deduction_category === "kleding" ||
        parsed.deduction_category === "opleidingskosten" ||
        parsed.deduction_category === "boetes" ||
        parsed.deduction_category === "overig"
          ? parsed.deduction_category
          : "voorschot",
      raise_enabled: parsed.raise_enabled === true,
      raise_amount: typeof parsed.raise_amount === "number" ? parsed.raise_amount : 0,
      overtime_enabled: parsed.overtime_enabled === true,
      overtime_days: typeof parsed.overtime_days === "number" ? parsed.overtime_days : 0,
      overtime_note: String(parsed.overtime_note || ""),
      inflation_adjustment: typeof parsed.inflation_adjustment === "number" ? parsed.inflation_adjustment : 0,
      inflation_batch_id: String(parsed.inflation_batch_id || ""),
      month_closed: parsed.month_closed === true,
      month_closed_by: String(parsed.month_closed_by || ""),
      month_closed_at: String(parsed.month_closed_at || ""),
      approval_leo: parsed.approval_leo === true,
      approval_karina: parsed.approval_karina === true,
    }
  } catch {
    return null
  }
}

export default function LoonBemerkingenPage() {
  const { crew, loans } = useSupabaseData()
  const [currentUserId, setCurrentUserId] = useState("")
  const [currentUserEmail, setCurrentUserEmail] = useState("")
  const [salaryPageUnlocked, setSalaryPageUnlocked] = useState(false)
  const [salaryPageGateLoading, setSalaryPageGateLoading] = useState(true)
  const [salaryPageGateMode, setSalaryPageGateMode] = useState<"verify" | "setup">("verify")
  const [salaryPagePasswordInput, setSalaryPagePasswordInput] = useState("")
  const [salaryPagePasswordConfirm, setSalaryPagePasswordConfirm] = useState("")
  const [salaryPageGateBusy, setSalaryPageGateBusy] = useState(false)
  const [adminResetEmail, setAdminResetEmail] = useState("")
  const [adminResetBusy, setAdminResetBusy] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())
  const [rowsByCrewId, setRowsByCrewId] = useState<Record<string, SalaryDraft>>({})
  const [companySwitchByCrewId, setCompanySwitchByCrewId] = useState<Record<string, boolean>>({})
  const [savingCrewId, setSavingCrewId] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string>("")
  const [activeCompanyTab, setActiveCompanyTab] = useState<string>("")
  const [editingCrewId, setEditingCrewId] = useState<string | null>(null)
  const [overtimeDaysInput, setOvertimeDaysInput] = useState<string>("")
  const [inflationPercent, setInflationPercent] = useState<string>("")
  const [applyingInflation, setApplyingInflation] = useState(false)
  const [closingMonth, setClosingMonth] = useState(false)
  const [showSalaryHistory, setShowSalaryHistory] = useState(false)
  const [salaryHistoryLoading, setSalaryHistoryLoading] = useState(false)
  const [salaryHistoryItems, setSalaryHistoryItems] = useState<SalaryHistoryItem[]>([])
  const isTanja = currentUserEmail === "tanja@bamalite.com"
  const isKarinaUser = currentUserEmail === KARINA_EMAIL
  const isLeoUser = currentUserEmail === LEO_EMAIL
  const isSalaryPasswordAdmin = SALARY_PASSWORD_ADMIN_EMAILS.has(currentUserEmail)

  useEffect(() => {
    if (!currentUserEmail) return
    if (typeof window === "undefined") return
    const alreadyNotified = window.sessionStorage.getItem("salary_access_notified") === "1"
    if (alreadyNotified) return

    const notify = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const accessToken = data.session?.access_token
        const headers = new Headers({ "Content-Type": "application/json" })
        if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
        await fetch("/api/salary-access-log", { method: "POST", headers })
        window.sessionStorage.setItem("salary_access_notified", "1")
      } catch {
        // Stil falen: toegang tot pagina mag niet blokkeren op notificatiemail.
      }
    }

    notify()
  }, [currentUserEmail])

  useEffect(() => {
    setMounted(true)
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setCurrentUserId(String(data?.user?.id || ""))
      setCurrentUserEmail(String(data?.user?.email || "").toLowerCase())
    })
    return () => {
      active = false
    }
  }, [])

  const crewById = useMemo(() => {
    const map = new Map<string, any>()
    ;(crew || []).forEach((c: any) => map.set(String(c.id), c))
    return map
  }, [crew])

  const getSalaryPasswordSessionKey = (selectedMonthKey: string) =>
    `salary_page_unlock_${String(currentUserId || currentUserEmail || "unknown")}_${selectedMonthKey}`

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    if (!accessToken) return null
    return new Headers({
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    })
  }

  const loadSalaryPagePasswordGate = async (selectedMonthKey: string) => {
    if (!currentUserId || !currentUserEmail) return
    const sessionKey = getSalaryPasswordSessionKey(selectedMonthKey)
    if (typeof window !== "undefined" && window.sessionStorage.getItem(sessionKey) === "1") {
      setSalaryPageUnlocked(true)
      setSalaryPageGateLoading(false)
      return
    }
    setSalaryPageGateLoading(true)
    try {
      const headers = await getAuthHeaders()
      if (!headers) {
        setSalaryPageUnlocked(false)
        setSalaryPageGateMode("verify")
        return
      }
      const response = await fetch("/api/salary-password/status", {
        method: "POST",
        headers,
        body: JSON.stringify({ monthKey: selectedMonthKey }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || !json?.success) {
        setSalaryPageUnlocked(false)
        setSalaryPageGateMode("verify")
        return
      }
      const hasPassword = json?.hasPassword === true
      setSalaryPageUnlocked(false)
      setSalaryPageGateMode(hasPassword ? "verify" : "setup")
    } finally {
      setSalaryPageGateLoading(false)
    }
  }

  const loadRows = async () => {
    try {
      setLoading(true)
      const { data: currentRows, error: currentError } = await supabase
        .from("loon_bemerkingen")
        .select("*")
        .eq("month_key", monthKey)
      if (currentError) throw currentError

      const { data: olderRows, error: olderError } = await supabase
        .from("loon_bemerkingen")
        .select("*")
        .lt("month_key", monthKey)
        .order("month_key", { ascending: false })
      if (olderError) throw olderError

      const currentByCrew = new Map<string, any>()
      ;(currentRows || []).forEach((r: any) => currentByCrew.set(String(r.crew_id), r))

      const latestPreviousByCrew = new Map<string, any>()
      ;(olderRows || []).forEach((r: any) => {
        const key = String(r.crew_id)
        if (!latestPreviousByCrew.has(key)) {
          latestPreviousByCrew.set(key, r)
        }
      })

      const nextRowsByCrew: Record<string, SalaryDraft> = {}
      const nextCompanySwitchByCrew: Record<string, boolean> = {}
      ;(crew || [])
        .filter((c: any) => isEligibleForSalaryPage(c))
        .filter((c: any) => isEligibleForSalaryMonth(c, monthKey))
        .forEach((c: any) => {
          const crewId = String(c.id)
          const current = currentByCrew.get(crewId)
          const previous = latestPreviousByCrew.get(crewId)
          const currentMeta = parseSalaryMetaFromReason(current?.reason)
          const previousMeta = parseSalaryMetaFromReason(previous?.reason)
          const autoLoanDeduction = getAutoLoanDeductionForCrew(crewId, monthKey)
          const hasManualCurrentDeduction =
            !!current &&
            (
              current?.advance_enabled === true ||
              (typeof current?.advance_amount === "number" && current.advance_amount > 0) ||
              currentMeta?.advance_enabled === true ||
              Number(currentMeta?.advance_amount || 0) > 0
            )
          const previousRaiseEnabled =
            currentMeta?.raise_enabled === true
              ? false
              : (previous?.raise_enabled ?? previousMeta?.raise_enabled ?? false)
          const previousRaiseAmount =
            typeof previous?.raise_amount === "number"
              ? previous.raise_amount
              : (previousMeta?.raise_amount || 0)
          const previousBaseSalary = typeof previous?.base_salary === "number" ? previous.base_salary : null
          const inheritedBaseSalary =
            previousBaseSalary !== null
              ? previousBaseSalary + (previousRaiseEnabled ? previousRaiseAmount : 0)
              : null
          const contractBaseSalaryInclClothing = getContractBaseSalaryInclClothing(c)
          const contractTravelEnabled = getContractTravelEnabled(c)
          const base = current || previous || null
          const currentCompany = String(current?.company || "").trim()
          const previousCompany = String(previous?.company || "").trim()
          const switchedCompanyThisMonth =
            !!current &&
            !!currentCompany &&
            !!previousCompany &&
            currentCompany !== previousCompany
          nextCompanySwitchByCrew[crewId] = switchedCompanyThisMonth
          nextRowsByCrew[crewId] = {
            id: current?.id,
            crew_id: crewId,
            // Firma-indeling volgt primair de firma-wisseling bron (crew.company).
            company: (c.company ?? current?.company ?? previous?.company ?? null) || null,
            month_key: monthKey,
            in_service_from: c?.in_dienst_vanaf || null,
            iban: String(
              current?.iban ??
              currentMeta?.iban ??
              previous?.iban ??
              previousMeta?.iban ??
              c?.iban ??
              rowsByCrewId[crewId]?.iban ??
              ""
            ),
            base_salary:
              typeof current?.base_salary === "number"
                ? current.base_salary
                : (inheritedBaseSalary ?? contractBaseSalaryInclClothing),
            travel_allowance:
              typeof current?.travel_allowance === "boolean"
                ? current.travel_allowance
                : (typeof previous?.travel_allowance === "boolean"
                    ? previous.travel_allowance
                    : contractTravelEnabled),
            advance_enabled:
              hasManualCurrentDeduction
                ? (current?.advance_enabled ?? currentMeta?.advance_enabled ?? false) === true
                : autoLoanDeduction > 0,
            advance_amount:
              hasManualCurrentDeduction
                ? (
                    typeof current?.advance_amount === "number"
                      ? current.advance_amount
                      : (currentMeta?.advance_amount || 0)
                  )
                : autoLoanDeduction,
            deduction_category:
              hasManualCurrentDeduction
                ? (
                    currentMeta?.deduction_category ||
                    (autoLoanDeduction > 0 ? "lening" : "voorschot")
                  )
                : (autoLoanDeduction > 0 ? "lening" : "voorschot"),
            raise_enabled:
              (current?.raise_enabled ?? currentMeta?.raise_enabled ?? false) === true,
            raise_amount:
              typeof current?.raise_amount === "number"
                ? current.raise_amount
                : (currentMeta?.raise_amount || 0),
            overtime_enabled:
              (current?.overtime_enabled ?? currentMeta?.overtime_enabled ?? false) === true,
            overtime_days:
              typeof current?.overtime_days === "number"
                ? current.overtime_days
                : (currentMeta?.overtime_days || 0),
            overtime_note: String(
              current?.overtime_note ??
              currentMeta?.overtime_note ??
              ""
            ),
            inflation_adjustment:
              typeof current?.inflation_adjustment === "number"
                ? current.inflation_adjustment
                : (currentMeta?.inflation_adjustment || 0),
            inflation_batch_id: String(
              current?.inflation_batch_id ??
              currentMeta?.inflation_batch_id ??
              ""
            ),
            month_closed:
              (current?.month_closed ?? currentMeta?.month_closed ?? false) === true,
            month_closed_by: String(
              current?.month_closed_by ??
              currentMeta?.month_closed_by ??
              ""
            ),
            month_closed_at: String(
              current?.month_closed_at ??
              currentMeta?.month_closed_at ??
              ""
            ),
            approval_leo:
              (current?.approval_leo ?? currentMeta?.approval_leo ?? false) === true,
            approval_karina:
              (current?.approval_karina ?? currentMeta?.approval_karina ?? false) === true,
            notes: String(current?.notes ?? ""),
            review_comment: String(
              current?.review_comment ??
              currentMeta?.review_comment ??
              ""
            ),
            review_by: String(
              current?.review_by ??
              currentMeta?.review_by ??
              ""
            ),
            review_type:
              current?.review_type === "correctie"
                ? "correctie"
                : (currentMeta?.review_type || "opmerking"),
          }
        })

      setRowsByCrewId(nextRowsByCrew)
      setCompanySwitchByCrewId(nextCompanySwitchByCrew)
    } catch (e) {
      console.warn("Fout bij laden salarissen:", getErrMsg(e))
      setRowsByCrewId({})
      setCompanySwitchByCrewId({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!mounted || !currentUserId || !currentUserEmail) return
    setSalaryPageUnlocked(false)
    setSalaryPagePasswordInput("")
    setSalaryPagePasswordConfirm("")
    loadSalaryPagePasswordGate(monthKey)
  }, [mounted, currentUserId, currentUserEmail, monthKey])

  useEffect(() => {
    if (!salaryPageUnlocked) return
    if ((crew || []).length > 0) {
      loadRows()
    }
  }, [monthKey, crew, salaryPageUnlocked])

  const groupedByCompany = useMemo(() => {
    const groups: Record<string, SalaryDraft[]> = {}
    Object.values(rowsByCrewId).forEach((row) => {
      const fallbackCrew = crewById.get(row.crew_id)
      const company = (row.company || fallbackCrew?.company || "Onbekende firma").trim() || "Onbekende firma"
      if (!groups[company]) groups[company] = []
      groups[company].push({
        ...row,
        company,
      })
    })
    Object.keys(groups).forEach((company) => {
      groups[company].sort((a, b) => {
        const ac = crewById.get(a.crew_id)
        const bc = crewById.get(b.crew_id)
        const aLast = String(ac?.last_name || "").trim().toLowerCase()
        const bLast = String(bc?.last_name || "").trim().toLowerCase()
        const lastCompare = aLast.localeCompare(bLast)
        if (lastCompare !== 0) return lastCompare
        const aFirst = String(ac?.first_name || "").trim().toLowerCase()
        const bFirst = String(bc?.first_name || "").trim().toLowerCase()
        return aFirst.localeCompare(bFirst)
      })
    })
    return groups
  }, [rowsByCrewId, crewById])

  const companyNames = useMemo(() => Object.keys(groupedByCompany).sort((a, b) => a.localeCompare(b)), [groupedByCompany])
  const monthIsClosed = useMemo(
    () => Object.values(rowsByCrewId).some((r) => r.month_closed === true),
    [rowsByCrewId]
  )

  useEffect(() => {
    if (!editingCrewId || !rowsByCrewId[editingCrewId]) {
      setOvertimeDaysInput("")
      return
    }
    const current = rowsByCrewId[editingCrewId]
    setOvertimeDaysInput(
      typeof current.overtime_days === "number" ? String(current.overtime_days).replace(".", ",") : ""
    )
  }, [editingCrewId])

  useEffect(() => {
    if (companyNames.length === 0) {
      setActiveCompanyTab("")
      return
    }
    if (!activeCompanyTab || !companyNames.includes(activeCompanyTab)) {
      setActiveCompanyTab(companyNames[0])
    }
  }, [companyNames, activeCompanyTab])

  const currentMonthPart = useMemo(() => {
    const [, month] = (monthKey || "").split("-")
    return month || String(new Date().getMonth() + 1).padStart(2, "0")
  }, [monthKey])

  const currentYearPart = useMemo(() => {
    const [year] = (monthKey || "").split("-")
    return year || String(new Date().getFullYear())
  }, [monthKey])

  const formatCrewName = (crewMember: any) => {
    const first = String(crewMember?.first_name || "").trim()
    const last = String(crewMember?.last_name || "").trim()
    return [last, first].filter(Boolean).join(" ").toUpperCase()
  }

  const formatDateShort = (value: string | null | undefined) => {
    if (!value) return "-"
    const d = new Date(value)
    if (isNaN(d.getTime())) return "-"
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`
  }

  const getTeGoedDays = (inServiceFrom: string | null, selectedMonthKey: string) => {
    if (!inServiceFrom) return 0
    const d = new Date(inServiceFrom)
    if (isNaN(d.getTime())) return 0
    const [yearStr, monthStr] = selectedMonthKey.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!year || !month) return 0
    const day = d.getDate()
    if (day < 25) return 0

    // Regelsalaris: betaaldag is de 25e.
    // Start op/na de 25e => resterende dagen van die startmaand worden "te goed"
    // en uitbetaald in de VOLGENDE maand.
    const startYear = d.getFullYear()
    const startMonth = d.getMonth() + 1
    let payoutYear = startYear
    let payoutMonth = startMonth + 1
    if (payoutMonth === 13) {
      payoutMonth = 1
      payoutYear += 1
    }
    if (year !== payoutYear || month !== payoutMonth) return 0

    const endOfMonth = new Date(startYear, startMonth, 0).getDate()
    return endOfMonth - day + 1
  }

  const getTeGoedSourceDaysInMonth = (inServiceFrom: string | null, selectedMonthKey: string) => {
    if (!inServiceFrom) return 0
    const d = new Date(inServiceFrom)
    if (isNaN(d.getTime())) return 0
    const [yearStr, monthStr] = selectedMonthKey.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!year || !month) return 0

    const day = d.getDate()
    if (day < 25) return 0

    let payoutYear = d.getFullYear()
    let payoutMonth = d.getMonth() + 2
    if (payoutMonth === 13) {
      payoutMonth = 1
      payoutYear += 1
    }
    if (year !== payoutYear || month !== payoutMonth) return 0

    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  }

  const getDaysInMonth = (selectedMonthKey: string) => {
    const [yearStr, monthStr] = selectedMonthKey.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!year || !month) return 30
    return new Date(year, month, 0).getDate()
  }

  const getProratedBaseSalaryForMonth = (row: SalaryDraft, selectedMonthKey: string) => {
    const baseSalary = typeof row.base_salary === "number" ? row.base_salary : 0
    if (baseSalary <= 0) return 0
    if (!row.in_service_from) return baseSalary
    const start = new Date(row.in_service_from)
    if (isNaN(start.getTime())) return baseSalary

    const [yearStr, monthStr] = selectedMonthKey.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!year || !month) return baseSalary

    const isStartMonth = start.getFullYear() === year && (start.getMonth() + 1) === month
    if (!isStartMonth) return baseSalary

    const startDay = start.getDate()
    const daysInMonth = getDaysInMonth(selectedMonthKey)
    if (daysInMonth <= 0) return baseSalary

    // Betaaldag is de 25e: start op/na 25 gaat naar te-goed in volgende maand.
    if (startDay >= 25) return 0

    const workedDays = daysInMonth - startDay + 1
    const dayRate = baseSalary / daysInMonth
    return dayRate * workedDays
  }

  const isLoanInstallmentDueForMonth = (loan: any, selectedMonthKey: string) => {
    if (!loan) return false
    if (loan.status !== "open") return false
    if (loan.auto_installment_enabled !== true) return false
    if (loan.auto_deduct_salary !== true) return false
    const start = String(loan.installment_start_period || "")
    if (!/^\d{4}-\d{2}$/.test(start)) return false
    if (selectedMonthKey < start) return false
    const periodType = String(loan.installment_period_type || "month").toLowerCase()
    if (periodType === "year") {
      const [, startMonth] = start.split("-")
      const [, selectedMonth] = selectedMonthKey.split("-")
      return startMonth === selectedMonth
    }
    return true
  }

  const getAutoLoanDeductionForCrew = (crewId: string, selectedMonthKey: string) => {
    const relevant = (loans || []).filter((loan: any) => String(loan.crew_id) === String(crewId))
    if (relevant.length === 0) return 0
    let total = 0
    for (const loan of relevant) {
      if (!isLoanInstallmentDueForMonth(loan, selectedMonthKey)) continue
      const installment = Number(loan.monthly_installment_amount || 0)
      const remaining = Number(loan.amount_remaining ?? loan.amount ?? 0)
      if (!Number.isFinite(installment) || installment <= 0) continue
      if (!Number.isFinite(remaining) || remaining <= 0) continue
      total += Math.min(installment, remaining)
    }
    return Number(total.toFixed(2))
  }

  const getAutoProrationNote = (row: SalaryDraft, selectedMonthKey: string) => {
    const baseSalary = typeof row.base_salary === "number" ? row.base_salary : 0
    if (baseSalary <= 0 || !row.in_service_from) return ""
    const start = new Date(row.in_service_from)
    if (isNaN(start.getTime())) return ""

    const [yearStr, monthStr] = selectedMonthKey.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!year || !month) return ""

    const isStartMonth = start.getFullYear() === year && (start.getMonth() + 1) === month
    if (!isStartMonth) return ""

    const startDay = start.getDate()
    const daysInMonth = getDaysInMonth(selectedMonthKey)
    const dayRate = daysInMonth > 0 ? baseSalary / daysInMonth : 0

    if (startDay >= 25) {
      return `Start op ${startDay}e (na betaaldag 25e): basissalaris gaat via te-goed naar volgende maand.`
    }

    const workedDays = daysInMonth - startDay + 1
    const prorated = dayRate * workedDays
    if (prorated >= baseSalary) return ""
    return `Pro-rata salaris vanaf ${startDay}/${String(month).padStart(2, "0")}: ${workedDays}/${daysInMonth} dagen gewerkt.`
  }

  const getEffectiveMonthlyNote = (row: SalaryDraft, selectedMonthKey: string) => {
    const auto = getAutoProrationNote(row, selectedMonthKey).trim()
    const manual = String(row.notes || "").trim()
    if (auto && manual) return `${auto} | ${manual}`
    if (auto) return auto
    return manual
  }

  const getSalaryTotals = (row: SalaryDraft) => {
    const baseSalary = typeof row.base_salary === "number" ? row.base_salary : 0
    const payableBaseSalary = getProratedBaseSalaryForMonth(row, monthKey)
    const travelAmount = row.travel_allowance ? 300 : 0
    const advanceAmount = row.advance_enabled ? (typeof row.advance_amount === "number" ? row.advance_amount : 0) : 0
    const raiseAmount = row.raise_enabled ? (typeof row.raise_amount === "number" ? row.raise_amount : 0) : 0
    const teGoedDays = getTeGoedDays(row.in_service_from, monthKey)
    const sourceDaysInMonth = getTeGoedSourceDaysInMonth(row.in_service_from, monthKey)
    const amountPerDay = sourceDaysInMonth > 0 ? baseSalary / sourceDaysInMonth : 0
    const teGoedAmount = teGoedDays > 0 ? amountPerDay * teGoedDays : 0
    const totalSalaryMonth = payableBaseSalary + travelAmount + raiseAmount - advanceAmount + teGoedAmount
    return { baseSalary, payableBaseSalary, travelAmount, advanceAmount, raiseAmount, teGoedDays, amountPerDay, teGoedAmount, totalSalaryMonth }
  }

  const getOverworkAmount = (row: SalaryDraft) => {
    const baseSalary = typeof row.base_salary === "number" ? row.base_salary : 0
    const overtimeDays = row.overtime_enabled ? Number(row.overtime_days || 0) : 0
    if (overtimeDays <= 0) return 0
    const crewMember = crewById.get(String(row.crew_id))
    const position = String(crewMember?.position || "").toLowerCase()
    const isCaptainOrSkipper =
      position.includes("kapitein") ||
      position.includes("captain") ||
      position.includes("schipper") ||
      position.includes("skipper")
    if (!isCaptainOrSkipper && baseSalary <= 0) return 0
    const perDayOverwork = isCaptainOrSkipper ? 400 : (baseSalary / 15)
    return perDayOverwork * overtimeDays
  }

  const getOverworkAmountForCrew = (crewId: string, baseSalary: number, overtimeDays: number) => {
    if (overtimeDays <= 0) return 0
    const crewMember = crewById.get(String(crewId))
    const position = String(crewMember?.position || "").toLowerCase()
    const isCaptainOrSkipper =
      position.includes("kapitein") ||
      position.includes("captain") ||
      position.includes("schipper") ||
      position.includes("skipper")
    if (!isCaptainOrSkipper && baseSalary <= 0) return 0
    const perDayOverwork = isCaptainOrSkipper ? 400 : (baseSalary / 15)
    return perDayOverwork * overtimeDays
  }

  const isInServiceThisMonth = (inServiceFrom: string | null, selectedMonthKey: string) => {
    if (!inServiceFrom) return false
    const d = new Date(inServiceFrom)
    if (isNaN(d.getTime())) return false
    const [yearStr, monthStr] = selectedMonthKey.split("-")
    return d.getFullYear() === Number(yearStr) && d.getMonth() + 1 === Number(monthStr)
  }

  const getRowHighlightClass = (crewMember: any, row: SalaryDraft, teGoedDays: number) => {
    const status = String(crewMember?.status || "").toLowerCase()
    const isSickOrAbsent = status === "ziek" || status === "afwezig"
    const isNewThisMonth = isInServiceThisMonth(row.in_service_from, monthKey)
    const isCompanySwitchMonth = companySwitchByCrewId[String(row.crew_id)] === true
    const hasSpecial =
      !!String(row.notes || "").trim() ||
      (row.advance_enabled && Number(row.advance_amount || 0) !== 0) ||
      (row.raise_enabled && Number(row.raise_amount || 0) !== 0) ||
      (row.overtime_enabled && Number(row.overtime_days || 0) > 0) ||
      teGoedDays > 0

    if (isSickOrAbsent) return "bg-red-100"
    if (isCompanySwitchMonth) return "bg-orange-100"
    if (isNewThisMonth) return "bg-blue-100"
    if (hasSpecial) return "bg-emerald-100"
    return ""
  }

  const handleRowClickOpenEdit = (event: any, crewId: string) => {
    if (monthIsClosed) return
    const target = event.target as HTMLElement | null
    if (!target) return
    const interactiveEl = target.closest("button, input, select, textarea, a, label")
    if (interactiveEl) return
    setEditingCrewId(crewId)
  }

  const setCrewField = (
    crewId: string,
    patch: Partial<SalaryDraft>
  ) => {
    const shouldResetApprovals =
      Object.prototype.hasOwnProperty.call(patch, "advance_enabled") ||
      Object.prototype.hasOwnProperty.call(patch, "advance_amount") ||
      Object.prototype.hasOwnProperty.call(patch, "deduction_category") ||
      Object.prototype.hasOwnProperty.call(patch, "overtime_enabled") ||
      Object.prototype.hasOwnProperty.call(patch, "overtime_days") ||
      Object.prototype.hasOwnProperty.call(patch, "overtime_note")

    setRowsByCrewId((prev) => ({
      ...prev,
      [crewId]: {
        ...prev[crewId],
        ...patch,
        ...(shouldResetApprovals
          ? {
              approval_leo: false,
              approval_karina: false,
            }
          : {}),
      },
    }))
  }

  const persistRow = async (crewId: string, row: SalaryDraft) => {
    // IBAN in crew is optioneel: sommige databases hebben (nog) geen `iban` kolom.
    // In dat geval blokkeren we het opslaan van salarissen niet.
    const { error: crewUpdateError } = await supabase
      .from("crew")
      .update({
        iban: row.iban?.trim() ? row.iban.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", crewId)
    if (crewUpdateError) {
      const msg = String(crewUpdateError.message || "").toLowerCase()
      const missingIbanColumn =
        msg.includes("could not find the 'iban' column") ||
        (msg.includes("column") && msg.includes("iban") && msg.includes("does not exist"))
      if (!missingIbanColumn) {
        throw crewUpdateError
      }
    }

    const payload = {
      crew_id: row.crew_id,
      company: row.company,
      month_key: row.month_key,
      base_salary: row.base_salary ?? null,
      travel_allowance: !!row.travel_allowance,
      advance_enabled: !!row.advance_enabled,
      advance_amount: row.advance_amount ?? 0,
      raise_enabled: !!row.raise_enabled,
      raise_amount: row.raise_amount ?? 0,
      overtime_enabled: !!row.overtime_enabled,
      overtime_days: row.overtime_days ?? 0,
      overtime_note: String(row.overtime_note || "").trim(),
      inflation_adjustment: row.inflation_adjustment ?? 0,
      inflation_batch_id: String(row.inflation_batch_id || "").trim(),
      month_closed: !!row.month_closed,
      month_closed_by: String(row.month_closed_by || "").trim(),
      month_closed_at: String(row.month_closed_at || "").trim(),
      approval_leo: !!row.approval_leo,
      approval_karina: !!row.approval_karina,
      iban: row.iban?.trim() || "",
      reason:
        (getEffectiveMonthlyNote(row, row.month_key) || "Salarisadministratie") +
        `\n${SALARY_META_PREFIX}${JSON.stringify({
          iban: row.iban?.trim() || "",
          review_comment: String(row.review_comment || "").trim(),
          review_by: String(row.review_by || "").trim(),
          review_type: row.review_type || "opmerking",
          advance_enabled: !!row.advance_enabled,
          advance_amount: row.advance_amount ?? 0,
          deduction_category: row.deduction_category || "voorschot",
          raise_enabled: !!row.raise_enabled,
          raise_amount: row.raise_amount ?? 0,
          overtime_enabled: !!row.overtime_enabled,
          overtime_days: row.overtime_days ?? 0,
          overtime_note: String(row.overtime_note || "").trim(),
          inflation_adjustment: row.inflation_adjustment ?? 0,
          inflation_batch_id: String(row.inflation_batch_id || "").trim(),
          month_closed: !!row.month_closed,
          month_closed_by: String(row.month_closed_by || "").trim(),
          month_closed_at: String(row.month_closed_at || "").trim(),
          approval_leo: !!row.approval_leo,
          approval_karina: !!row.approval_karina,
        })}` +
        (String(row.review_comment || "").trim()
          ? `\n${REVIEW_META_PREFIX}${JSON.stringify({
              review_comment: String(row.review_comment || "").trim(),
              review_by: String(row.review_by || "").trim(),
              review_type: row.review_type || "opmerking",
            })}`
          : ""),
      notes: getEffectiveMonthlyNote(row, row.month_key),
      review_comment: String(row.review_comment || "").trim(),
      review_by: String(row.review_by || "").trim(),
      review_type: row.review_type || "opmerking",
      updated_at: new Date().toISOString(),
    }

    let { error } = await supabase
      .from("loon_bemerkingen")
      .upsert([payload], { onConflict: "crew_id,month_key" })

    if (error) {
      const msg = String(error.message || "").toLowerCase()
      const missingIbanOnLoonBemerkingen =
        msg.includes("could not find the 'iban' column") ||
        (msg.includes("column") && msg.includes("iban") && msg.includes("does not exist"))
      const missingReviewColumns =
        msg.includes("review_comment") || msg.includes("review_by") || msg.includes("review_type")
      const missingSalaryColumns =
        msg.includes("advance_enabled") ||
        msg.includes("advance_amount") ||
        msg.includes("raise_enabled") ||
        msg.includes("raise_amount") ||
        msg.includes("overtime_enabled") ||
        msg.includes("overtime_days") ||
        msg.includes("overtime_note") ||
        msg.includes("inflation_adjustment") ||
        msg.includes("inflation_batch_id") ||
        msg.includes("month_closed") ||
        msg.includes("month_closed_by") ||
        msg.includes("month_closed_at") ||
        msg.includes("approval_leo") ||
        msg.includes("approval_karina")
      if (missingIbanOnLoonBemerkingen || missingReviewColumns || missingSalaryColumns) {
        const {
          iban: _omitIban,
          review_comment: _omitReviewComment,
          review_by: _omitReviewBy,
          review_type: _omitReviewType,
          advance_enabled: _omitAdvanceEnabled,
          advance_amount: _omitAdvanceAmount,
          raise_enabled: _omitRaiseEnabled,
          raise_amount: _omitRaiseAmount,
          overtime_enabled: _omitOvertimeEnabled,
          overtime_days: _omitOvertimeDays,
          overtime_note: _omitOvertimeNote,
          inflation_adjustment: _omitInflationAdjustment,
          inflation_batch_id: _omitInflationBatchId,
          month_closed: _omitMonthClosed,
          month_closed_by: _omitMonthClosedBy,
          month_closed_at: _omitMonthClosedAt,
          approval_leo: _omitApprovalLeo,
          approval_karina: _omitApprovalKarina,
          ...payloadWithoutOptionalColumns
        } = payload
        const retry = await supabase
          .from("loon_bemerkingen")
          .upsert([payloadWithoutOptionalColumns], { onConflict: "crew_id,month_key" })
        error = retry.error
      }
    }
    if (error) throw error
  }

  const saveCrewRow = async (crewId: string, rowOverride?: SalaryDraft) => {
    const row = rowOverride || rowsByCrewId[crewId]
    if (!row) return false
    if (monthIsClosed) {
      alert(isTanja ? "Dieser Monat ist abgeschlossen und nicht mehr bearbeitbar." : "Deze maand is afgesloten en niet meer aanpasbaar.")
      return false
    }
    const raiseAmount = row.raise_enabled ? (typeof row.raise_amount === "number" ? row.raise_amount : 0) : 0
    const advanceAmount = row.advance_enabled ? (typeof row.advance_amount === "number" ? row.advance_amount : 0) : 0
    const teGoedDaysForValidation = getTeGoedDays(row.in_service_from, row.month_key)
    const hasNotes = !!String(row.notes || "").trim()
    const overtimeDays = row.overtime_enabled ? Number(row.overtime_days || 0) : 0
    const overtimeNotes = String(row.overtime_note || "").toLowerCase()
    const hasFromToRangeInNotes = overtimeNotes.includes("van") && overtimeNotes.includes("tot")

    // Altijd verplicht: overwerk vereist notitie met periode (van/tot).
    if (row.overtime_enabled && overtimeDays > 0 && (!String(row.overtime_note || "").trim() || !hasFromToRangeInNotes)) {
      alert(
        isTanja
          ? "Bei Überstunden ist ein Hinweis mit Zeitraum Pflicht (von ... bis ...)."
          : "Bij overwerk is een opmerking verplicht met periode (van ... tot ...)."
      )
      return false
    }

    if (row.advance_enabled) {
      const category = String(row.deduction_category || "").trim()
      if (!category) {
        alert(isTanja ? "Kategorie für Einbehalt ist verpflichtend." : "Categorie voor in te houden is verplicht.")
        return false
      }
      if (!Number.isFinite(advanceAmount) || advanceAmount <= 0) {
        alert(isTanja ? "Betrag voor Einbehalt moet groter dan 0 zijn." : "Bedrag voor in te houden moet groter dan 0 zijn.")
        return false
      }
    }

    // Harde validatie: bij verhoging, in te houden of te-goed is opmerking verplicht.
    if ((raiseAmount !== 0 || advanceAmount !== 0 || teGoedDaysForValidation > 0) && !hasNotes) {
      alert(
        isTanja
          ? "Bei Erhöhung, Einbehalt oder Te-goed ist ein Hinweis verpflichtend."
          : "Bij verhoging, in te houden of te-goed is een opmerking verplicht."
      )
      return false
    }

    if (ENFORCE_SALARY_VALIDATIONS && raiseAmount !== 0 && !hasNotes) {
      alert(isTanja ? "Bei einer Gehaltsverhoging ist ein Hinweis erforderlich." : "Bij een verhoging ben je verplicht om een opmerking toe te voegen.")
      return false
    }
    if (ENFORCE_SALARY_VALIDATIONS && row.review_type === "correctie" && !String(row.review_comment || "").trim()) {
      alert(isTanja ? "Beim Typ 'Korrektur' ist ein Review-Hinweis erforderlich." : "Bij type 'correctie' is een review-opmerking verplicht.")
      return false
    }
    try {
      setSavingCrewId(crewId)
      await persistRow(crewId, row)
      setLastSavedAt(new Date().toISOString())
      await loadRows()
      return true
    } catch (e) {
      alert(`${isTanja ? "Fehler beim Speichern" : "Fout bij opslaan"}: ${getErrMsg(e)}`)
      return false
    } finally {
      setSavingCrewId(null)
    }
  }

  const handleApprovalToggle = async (
    crewId: string,
    field: "approval_leo" | "approval_karina",
    value: boolean
  ) => {
    if (monthIsClosed) {
      alert(isTanja ? "Dieser Monat ist abgeschlossen en niet meer bewerkbaar." : "Deze maand is afgesloten en niet meer aanpasbaar.")
      return
    }
    const row = rowsByCrewId[crewId]
    if (!row) return
    const updatedRow: SalaryDraft = {
      ...row,
      [field]: value,
    }
    setRowsByCrewId((prev) => ({
      ...prev,
      [crewId]: updatedRow,
    }))
    try {
      setSavingCrewId(crewId)
      await persistRow(crewId, updatedRow)
      setLastSavedAt(new Date().toISOString())
    } catch (e) {
      alert(`${isTanja ? "Fehler beim Speichern" : "Fout bij opslaan"}: ${getErrMsg(e)}`)
      setRowsByCrewId((prev) => ({
        ...prev,
        [crewId]: row,
      }))
    } finally {
      setSavingCrewId(null)
    }
  }

  const applyInflationCorrectionForAll = async () => {
    if (monthIsClosed) {
      alert(isTanja ? "Dieser Monat ist abgeschlossen en niet meer bewerkbaar." : "Deze maand is afgesloten en niet meer aanpasbaar.")
      return
    }
    const percent = Number(String(inflationPercent || "").replace(",", "."))
    if (!Number.isFinite(percent) || percent <= 0) {
      alert(isTanja ? "Geef een geldig percentage groter dan 0 op." : "Vul een geldig percentage groter dan 0 in.")
      return
    }

    const targetRows = Object.values(rowsByCrewId)
      .filter((r) => typeof r.base_salary === "number" && (r.base_salary || 0) > 0)

    if (targetRows.length === 0) {
      alert(isTanja ? "Geen medewerkers met basissalaris gevonden." : "Geen medewerkers met basissalaris gevonden.")
      return
    }

    const ok = window.confirm(
      isTanja
        ? `Inflatiecorrectie van ${percent}% toepassen op ${targetRows.length} medewerkers?`
        : `Inflatiecorrectie van ${percent}% toepassen op ${targetRows.length} medewerkers?`
    )
    if (!ok) return

    try {
      setApplyingInflation(true)
      const batchId = `infl-${monthKey}-${Date.now()}`
      const updatedRows: SalaryDraft[] = targetRows.map((row) => {
        const base = Number(row.base_salary || 0)
        const inflationAmount = Number(((base * percent) / 100).toFixed(2))
        const existingRaise = Number(row.raise_amount || 0)
        const existingInflation = Number(row.inflation_adjustment || 0)
        return {
          ...row,
          raise_enabled: true,
          raise_amount: Number((existingRaise - existingInflation + inflationAmount).toFixed(2)),
          inflation_adjustment: inflationAmount,
          inflation_batch_id: batchId,
          approval_leo: false,
          approval_karina: false,
          notes: String(row.notes || "").trim()
            ? `${String(row.notes || "").trim()} | Inflatiecorrectie ${percent}%`
            : `Inflatiecorrectie ${percent}%`,
        }
      })

      setRowsByCrewId((prev) => {
        const next = { ...prev }
        for (const row of updatedRows) {
          next[row.crew_id] = row
        }
        return next
      })

      await Promise.all(updatedRows.map((row) => persistRow(row.crew_id, row)))
      setLastSavedAt(new Date().toISOString())
      await loadRows()
      alert(isTanja ? "Inflatiecorrectie toegepast." : "Inflatiecorrectie toegepast.")
    } catch (e) {
      alert(`${isTanja ? "Fehler bij toepassen" : "Fout bij toepassen"}: ${getErrMsg(e)}`)
    } finally {
      setApplyingInflation(false)
    }
  }

  const undoInflationCorrectionForAll = async () => {
    if (monthIsClosed) {
      alert(isTanja ? "Deze maand is afgesloten en niet meer aanpasbaar." : "Deze maand is afgesloten en niet meer aanpasbaar.")
      return
    }
    const targetRows = Object.values(rowsByCrewId).filter((r) => Number(r.inflation_adjustment || 0) > 0)
    if (targetRows.length === 0) {
      alert(isTanja ? "Geen inflatiecorrectie gevonden om ongedaan te maken." : "Geen inflatiecorrectie gevonden om ongedaan te maken.")
      return
    }
    const ok = window.confirm(
      isTanja
        ? `Inflatiecorrectie ongedaan maken voor ${targetRows.length} medewerkers?`
        : `Inflatiecorrectie ongedaan maken voor ${targetRows.length} medewerkers?`
    )
    if (!ok) return
    try {
      setApplyingInflation(true)
      const updatedRows: SalaryDraft[] = targetRows.map((row) => {
        const existingRaise = Number(row.raise_amount || 0)
        const existingInflation = Number(row.inflation_adjustment || 0)
        return {
          ...row,
          raise_amount: Number((existingRaise - existingInflation).toFixed(2)),
          raise_enabled: Number((existingRaise - existingInflation).toFixed(2)) !== 0,
          inflation_adjustment: 0,
          inflation_batch_id: "",
          approval_leo: false,
          approval_karina: false,
        }
      })
      setRowsByCrewId((prev) => {
        const next = { ...prev }
        for (const row of updatedRows) next[row.crew_id] = row
        return next
      })
      await Promise.all(updatedRows.map((row) => persistRow(row.crew_id, row)))
      setLastSavedAt(new Date().toISOString())
      await loadRows()
      alert(isTanja ? "Inflatiecorrectie ongedaan gemaakt." : "Inflatiecorrectie ongedaan gemaakt.")
    } catch (e) {
      alert(`${isTanja ? "Fout bij ongedaan maken" : "Fout bij ongedaan maken"}: ${getErrMsg(e)}`)
    } finally {
      setApplyingInflation(false)
    }
  }

  const closeMonth = async () => {
    if (!isLeoUser) return
    if (monthIsClosed) return
    const allRows = Object.values(rowsByCrewId)
    if (allRows.length === 0) {
      alert(isTanja ? "Geen salarissen om af te sluiten." : "Geen salarissen om af te sluiten.")
      return
    }
    const notApproved = allRows.filter((r) => !(r.approval_leo && r.approval_karina))
    if (notApproved.length > 0) {
      alert(
        isTanja
          ? "Monat afsluiten kan pas als alle vinkjes van Leo en Karina aan staan."
          : "Maand afsluiten kan pas als alle vinkjes van Leo en Karina aan staan."
      )
      return
    }
    const ok = window.confirm(isTanja ? "Deze maand definitief afsluiten?" : "Deze maand definitief afsluiten?")
    if (!ok) return

    try {
      setClosingMonth(true)
      const nowIso = new Date().toISOString()
      const updatedRows = allRows.map((r) => ({
        ...r,
        month_closed: true,
        month_closed_by: currentUserEmail,
        month_closed_at: nowIso,
      }))
      setRowsByCrewId((prev) => {
        const next = { ...prev }
        for (const row of updatedRows) next[row.crew_id] = row
        return next
      })
      await Promise.all(updatedRows.map((r) => persistRow(r.crew_id, r)))
      setLastSavedAt(nowIso)
      await loadRows()
    } catch (e) {
      alert(`${isTanja ? "Fehler bij afsluiten" : "Fout bij afsluiten"}: ${getErrMsg(e)}`)
    } finally {
      setClosingMonth(false)
    }
  }

  const syncOvertimeInputToRow = (crewId: string): SalaryDraft | null => {
    if (!crewId) return
    const parsed = overtimeDaysInput.trim() === "" ? 0 : parseDecimalInput(overtimeDaysInput)
    const base = rowsByCrewId[crewId]
    if (!base) return null
    const nextRow: SalaryDraft = {
      ...base,
      overtime_enabled: parsed > 0 || base.overtime_enabled,
      overtime_days: parsed,
    }
    setRowsByCrewId((prev) => ({
      ...prev,
      [crewId]: nextRow,
    }))
    return nextRow
  }

  const loadSalaryHistory = async (crewId: string) => {
    if (!crewId) return
    try {
      setSalaryHistoryLoading(true)
      const { data, error } = await supabase
        .from("loon_bemerkingen")
        .select("*")
        .eq("crew_id", crewId)
        .order("month_key", { ascending: false })
      if (error) throw error

      const history = (data || []).map((item: any) => {
        const meta = parseSalaryMetaFromReason(item?.reason)
        const row: SalaryDraft = {
          id: String(item?.id || ""),
          crew_id: String(item?.crew_id || crewId),
          company: item?.company || null,
          month_key: String(item?.month_key || ""),
          in_service_from: null,
          iban: String(item?.iban ?? meta?.iban ?? ""),
          base_salary: typeof item?.base_salary === "number" ? item.base_salary : 0,
          travel_allowance: !!item?.travel_allowance,
          advance_enabled: (item?.advance_enabled ?? meta?.advance_enabled ?? false) === true,
          advance_amount: typeof item?.advance_amount === "number" ? item.advance_amount : (meta?.advance_amount || 0),
          raise_enabled: (item?.raise_enabled ?? meta?.raise_enabled ?? false) === true,
          raise_amount: typeof item?.raise_amount === "number" ? item.raise_amount : (meta?.raise_amount || 0),
          overtime_enabled: (item?.overtime_enabled ?? meta?.overtime_enabled ?? false) === true,
          overtime_days: typeof item?.overtime_days === "number" ? item.overtime_days : (meta?.overtime_days || 0),
          overtime_note: String(item?.overtime_note ?? meta?.overtime_note ?? ""),
          inflation_adjustment: typeof item?.inflation_adjustment === "number" ? item.inflation_adjustment : (meta?.inflation_adjustment || 0),
          inflation_batch_id: String(item?.inflation_batch_id ?? meta?.inflation_batch_id ?? ""),
          month_closed: (item?.month_closed ?? meta?.month_closed ?? false) === true,
          month_closed_by: String(item?.month_closed_by ?? meta?.month_closed_by ?? ""),
          month_closed_at: String(item?.month_closed_at ?? meta?.month_closed_at ?? ""),
          approval_leo: !!(item?.approval_leo ?? meta?.approval_leo),
          approval_karina: !!(item?.approval_karina ?? meta?.approval_karina),
          notes: String(item?.notes || ""),
          review_comment: String(item?.review_comment || ""),
          review_by: String(item?.review_by || ""),
          review_type: item?.review_type === "correctie" ? "correctie" : "opmerking",
        }
        const totals = getSalaryTotals(row)
        return {
          id: row.id || `${row.crew_id}-${row.month_key}`,
          month_key: row.month_key,
          base_salary: Number(row.base_salary || 0),
          travel_allowance: row.travel_allowance,
          raise_amount: Number(row.raise_amount || 0),
          advance_amount: Number(row.advance_amount || 0),
          overtime_days: Number(row.overtime_days || 0),
          overtime_note: String(row.overtime_note || ""),
          inflation_adjustment: Number(row.inflation_adjustment || 0),
          notes: String(item?.notes || ""),
          total_salary_month: Number(totals.totalSalaryMonth || 0),
        } satisfies SalaryHistoryItem
      })
      setSalaryHistoryItems(history)
    } catch (e) {
      alert(`${isTanja ? "Fehler bij laden historie" : "Fout bij laden historie"}: ${getErrMsg(e)}`)
      setSalaryHistoryItems([])
    } finally {
      setSalaryHistoryLoading(false)
    }
  }

  const downloadCsv = () => {
    const rows = companyNames.flatMap((company) => {
      const companyRows = groupedByCompany[company] || []
      return companyRows.map((r) => {
        const m = crewById.get(String(r.crew_id))
        const name = m ? formatCrewName(m) : "Onbekend"
        const { baseSalary, travelAmount, advanceAmount, raiseAmount, teGoedDays, teGoedAmount, totalSalaryMonth } = getSalaryTotals(r)
        return {
          company,
          name,
          inService: formatDateShort(r.in_service_from),
          iban: r.iban || "",
          baseSalary,
          travel: r.travel_allowance ? "Ja (+300)" : "Nee (0)",
          advance: r.advance_enabled ? `Ja (-${advanceAmount.toFixed(2)})` : "Nee",
          raise: r.raise_enabled ? `Ja (+${raiseAmount.toFixed(2)})` : "Nee",
          teGoed: teGoedDays > 0 ? `${teGoedDays} (${teGoedAmount.toFixed(2)})` : "",
          notes: getEffectiveMonthlyNote(r, monthKey),
          approvalLeo: r.approval_leo ? "Ja" : "Nee",
          approvalKarina: r.approval_karina ? "Ja" : "Nee",
          total: totalSalaryMonth,
        }
      })
    })

    const header = [
      "Firma",
      "Naam",
      "Datum in dienst",
      "IBAN",
      "Basissalaris incl kledinggeld",
      "Reiskosten",
      "Voorschot",
      "Verhoging",
      "Te goed (dagen)",
      "Opmerkingen",
      "Goedgekeurd Leo",
      "Goedgekeurd Karina",
      "Totaal salaris maand",
    ]
    const toCsvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const lines = [
      header.map(toCsvCell).join(";"),
      ...rows.map((r) =>
        [
          r.company,
          r.name,
          r.inService,
          r.iban,
          r.baseSalary.toFixed(2),
          r.travel,
          r.advance,
          r.raise,
          r.teGoed,
          r.notes,
          r.approvalLeo,
          r.approvalKarina,
          r.total.toFixed(2),
        ]
          .map(toCsvCell)
          .join(";")
      ),
    ]
    const csv = `\uFEFF${lines.join("\n")}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `salarissen-${monthKey}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadProfessionalPdfView = () => {
    const reportRows = companyNames
      .map((company) => {
        const people = (groupedByCompany[company] || [])
          .map((r) => {
            const m = crewById.get(String(r.crew_id))
            const name = m ? formatCrewName(m) : "Onbekend"
            const { baseSalary, travelAmount, advanceAmount, raiseAmount, teGoedDays, teGoedAmount, totalSalaryMonth } = getSalaryTotals(r)
            return `
              <tr>
                <td>${escapeHtml(name)}</td>
                <td>${escapeHtml(formatDateShort(r.in_service_from))}</td>
                <td>${escapeHtml(r.iban || "")}</td>
                <td class="num">${formatEuro(baseSalary)}</td>
                <td>${r.travel_allowance ? "Ja (+300,00)" : "Nee"}</td>
                <td>${r.advance_enabled ? `Ja (-${formatEuro(advanceAmount)})` : "Nee"}</td>
                <td>${r.raise_enabled ? `Ja (+${formatEuro(raiseAmount)})` : "Nee"}</td>
                <td>${teGoedDays > 0 ? `${teGoedDays} dagen (+${formatEuro(teGoedAmount)})` : "-"}</td>
                <td>${escapeHtml(getEffectiveMonthlyNote(r, monthKey) || "")}</td>
                <td>${r.approval_leo ? "Ja" : "Nee"}</td>
                <td>${r.approval_karina ? "Ja" : "Nee"}</td>
                <td class="num total">${formatEuro(totalSalaryMonth)}</td>
              </tr>
            `
          })
          .join("")
        return `
          <section>
            <h2>${escapeHtml(company)}</h2>
            <table>
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Datum in dienst</th>
                  <th>IBAN</th>
                  <th>Basissalaris incl. kledinggeld</th>
                  <th>Reiskosten</th>
                  <th>Voorschot</th>
                  <th>Verhoging</th>
                  <th>Te goed</th>
                  <th>Opmerkingen</th>
                  <th>Leo</th>
                  <th>Karina</th>
                  <th>Totaal salaris maand</th>
                </tr>
              </thead>
              <tbody>${people}</tbody>
            </table>
          </section>
        `
      })
      .join("")

    const title = `${isTanja ? "Gehalter" : "Salarissen"} ${monthNumberToName(currentMonthPart, isTanja)} ${currentYearPart}`
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Kon de downloadweergave niet openen. Controleer of pop-ups zijn toegestaan.")
      return
    }
    printWindow.document.write(`
      <!doctype html>
      <html lang="nl">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            .meta { color: #475569; margin-bottom: 18px; font-size: 12px; }
            h2 { margin: 22px 0 8px; font-size: 16px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; vertical-align: top; }
            th { background: #f1f5f9; text-align: left; }
            .num { text-align: right; white-space: nowrap; }
            .total { font-weight: 700; background: #ecfdf5; }
            @media print { body { margin: 12mm; } }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">Gegenereerd op ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
          ${reportRows}
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const downloadSepaXml = () => {
    const debtorName = (process.env.NEXT_PUBLIC_SEPA_DEBTOR_NAME || "").trim()
    const debtorIban = normalizeIban(process.env.NEXT_PUBLIC_SEPA_DEBTOR_IBAN || "")
    const debtorBic = (process.env.NEXT_PUBLIC_SEPA_DEBTOR_BIC || "").trim().toUpperCase()
    if (!debtorName || !debtorIban || !debtorBic) {
      alert("SEPA export mist instellingen. Voeg toe in .env.local: NEXT_PUBLIC_SEPA_DEBTOR_NAME, NEXT_PUBLIC_SEPA_DEBTOR_IBAN, NEXT_PUBLIC_SEPA_DEBTOR_BIC")
      return
    }
    if (!isValidIban(debtorIban)) {
      alert("SEPA export geblokkeerd: Debiteur IBAN is ongeldig.")
      return
    }

    const rows = groupedByCompany[activeCompanyTab] || []
    const invalids: string[] = []
    const payments = rows
      .map((r: SalaryDraft) => {
        const crewMember = crewById.get(String(r.crew_id))
        const name = crewMember ? formatCrewName(crewMember) : "Onbekend"
        const { totalSalaryMonth } = getSalaryTotals(r)
        const amount = Number(totalSalaryMonth.toFixed(2))
        const iban = normalizeIban(r.iban || "")
        const hasApprovals = !!r.approval_leo && !!r.approval_karina
        const validIban = isValidIban(iban)
        const validAmount = amount > 0
        if (!validIban || !validAmount || !hasApprovals) {
          const reasons = [
            !validIban ? "ongeldige IBAN" : "",
            !validAmount ? "bedrag moet > 0 zijn" : "",
            !hasApprovals ? "goedkeuring Leo + Karina ontbreekt" : "",
          ].filter(Boolean).join(", ")
          invalids.push(`${name}: ${reasons}`)
          return null
        }
        return { name, iban, amount }
      })
      .filter((p): p is { name: string; iban: string; amount: number } => !!p)

    if (invalids.length > 0) {
      alert(`SEPA export geblokkeerd. Los eerst op:\n- ${invalids.join("\n- ")}`)
      return
    }
    if (payments.length === 0) {
      alert("Geen betalingen klaar voor SEPA export in deze firma-tab.")
      return
    }

    const now = new Date()
    const creationDateTime = now.toISOString()
    const requestedDate = `${monthKey}-25`
    const msgId = `SAL-${monthKey.replace("-", "")}-${now.getTime()}`
    const pmtInfId = `PMT-${monthKey.replace("-", "")}-${activeCompanyTab.replace(/\s+/g, "").slice(0, 12)}`
    const ctrlSum = payments.reduce((sum, p) => sum + p.amount, 0)
    const companyMsg = `${DEFAULT_SEPA_MESSAGE_PREFIX} ${monthKey}`

    const txsXml = payments
      .map((p, idx) => {
        const endToEndId = `E2E-${monthKey.replace("-", "")}-${String(idx + 1).padStart(4, "0")}`
        return `
        <CdtTrfTxInf>
          <PmtId><EndToEndId>${escapeXml(endToEndId)}</EndToEndId></PmtId>
          <Amt><InstdAmt Ccy="${SEPA_CCY}">${p.amount.toFixed(2)}</InstdAmt></Amt>
          <Cdtr><Nm>${escapeXml(p.name)}</Nm></Cdtr>
          <CdtrAcct><Id><IBAN>${escapeXml(p.iban)}</IBAN></Id></CdtrAcct>
          <RmtInf><Ustrd>${escapeXml(companyMsg)}</Ustrd></RmtInf>
        </CdtTrfTxInf>`
      })
      .join("")

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${ctrlSum.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${escapeXml(debtorName)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(pmtInfId)}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${ctrlSum.toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${requestedDate}</ReqdExctnDt>
      <Dbtr><Nm>${escapeXml(debtorName)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${escapeXml(debtorIban)}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BIC>${escapeXml(debtorBic)}</BIC></FinInstnId></DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>${txsXml}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`

    const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sepa-salarissen-${monthKey}-${activeCompanyTab.replace(/\s+/g, "-").toLowerCase()}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSetMonthlySalaryPassword = async () => {
    const password = String(salaryPagePasswordInput || "")
    const confirm = String(salaryPagePasswordConfirm || "")
    if (password.length < 6) {
      alert(isTanja ? "Passwort muss mindestens 6 Zeichen haben." : "Wachtwoord moet minimaal 6 tekens hebben.")
      return
    }
    if (password !== confirm) {
      alert(isTanja ? "Wachtwoorden komen niet overeen." : "Wachtwoorden komen niet overeen.")
      return
    }
    setSalaryPageGateBusy(true)
    try {
      const headers = await getAuthHeaders()
      if (!headers) throw new Error("Geen sessie")
      const response = await fetch("/api/salary-password/set", {
        method: "POST",
        headers,
        body: JSON.stringify({ monthKey, password }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || !json?.success) {
        throw new Error(String(json?.error || "Instellen mislukt"))
      }
      const sessionKey = getSalaryPasswordSessionKey(monthKey)
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(sessionKey, "1")
      }
      setSalaryPageUnlocked(true)
      setSalaryPagePasswordInput("")
      setSalaryPagePasswordConfirm("")
      await loadRows()
    } catch (e) {
      alert(getErrMsg(e))
    } finally {
      setSalaryPageGateBusy(false)
    }
  }

  const handleVerifyMonthlySalaryPassword = async () => {
    const password = String(salaryPagePasswordInput || "")
    if (!password) {
      alert(isTanja ? "Passwort eingeben." : "Vul je wachtwoord in.")
      return
    }
    setSalaryPageGateBusy(true)
    try {
      const headers = await getAuthHeaders()
      if (!headers) throw new Error("Geen sessie")
      const response = await fetch("/api/salary-password/verify", {
        method: "POST",
        headers,
        body: JSON.stringify({ monthKey, password }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || !json?.success) {
        throw new Error(String(json?.error || "Verificatie mislukt"))
      }
      const sessionKey = getSalaryPasswordSessionKey(monthKey)
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(sessionKey, "1")
      }
      setSalaryPageUnlocked(true)
      setSalaryPagePasswordInput("")
      await loadRows()
    } catch (e) {
      alert(getErrMsg(e))
    } finally {
      setSalaryPageGateBusy(false)
    }
  }

  const handleAdminResetMonthlySalaryPassword = async () => {
    const targetEmail = String(adminResetEmail || "").trim().toLowerCase()
    if (!targetEmail || !targetEmail.includes("@")) {
      alert(isTanja ? "Gültige E-Mail eingeben." : "Vul een geldig e-mailadres in.")
      return
    }
    setAdminResetBusy(true)
    try {
      const headers = await getAuthHeaders()
      if (!headers) throw new Error("Geen sessie")
      const response = await fetch("/api/salary-password/admin-reset", {
        method: "POST",
        headers,
        body: JSON.stringify({ monthKey, targetEmail }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || !json?.success) {
        throw new Error(String(json?.error || "Reset mislukt"))
      }
      alert(isTanja ? "Monatspasswort wurde zurückgesetzt." : "Maandwachtwoord is gereset.")
      setAdminResetEmail("")
    } catch (e) {
      alert(getErrMsg(e))
    } finally {
      setAdminResetBusy(false)
    }
  }

  if (!mounted) return null

  if (salaryPageGateLoading) {
    return (
      <main className="w-full px-4 py-6">
        <MobileHeaderNav />
        <div className="mx-auto max-w-md rounded-lg border bg-white p-5 text-center">
          <div className="text-sm text-slate-600">
            {isTanja ? "Sicherheitskontrolle wird geladen..." : "Beveiligingscontrole laden..."}
          </div>
        </div>
      </main>
    )
  }

  if (!salaryPageUnlocked) {
    return (
      <main className="w-full px-4 py-6">
        <MobileHeaderNav />
        <div className="mx-auto max-w-lg rounded-lg border bg-white p-5 space-y-4">
          <h2 className="text-lg font-semibold">
            {isTanja ? "Monatspasswort Salarissen" : "Maandwachtwoord Salarissen"}
          </h2>
          <p className="text-sm text-slate-600">
            {salaryPageGateMode === "setup"
              ? (isTanja
                  ? `Für ${monthNumberToName(currentMonthPart, true)} ${currentYearPart} zuerst ein persönliches Passwort setzen.`
                  : `Voor ${monthNumberToName(currentMonthPart)} ${currentYearPart} eerst een persoonlijk wachtwoord instellen.`)
              : (isTanja
                  ? "Voer je persoonlijke maandwachtwoord in om toegang te krijgen."
                  : "Voer je persoonlijke maandwachtwoord in om toegang te krijgen.")}
          </p>
          <div>
            <Label>{isTanja ? "Passwort" : "Wachtwoord"}</Label>
            <Input
              type="password"
              value={salaryPagePasswordInput}
              onChange={(e) => setSalaryPagePasswordInput(e.target.value)}
            />
          </div>
          {salaryPageGateMode === "setup" && (
            <div>
              <Label>{isTanja ? "Passwort bestätigen" : "Bevestig wachtwoord"}</Label>
              <Input
                type="password"
                value={salaryPagePasswordConfirm}
                onChange={(e) => setSalaryPagePasswordConfirm(e.target.value)}
              />
            </div>
          )}
          <Button
            onClick={salaryPageGateMode === "setup" ? handleSetMonthlySalaryPassword : handleVerifyMonthlySalaryPassword}
            disabled={salaryPageGateBusy}
          >
            {salaryPageGateBusy
              ? (isTanja ? "Bezig..." : "Bezig...")
              : (salaryPageGateMode === "setup"
                  ? (isTanja ? "Monatspasswort instellen" : "Maandwachtwoord instellen")
                  : (isTanja ? "Ontgrendelen" : "Ontgrendelen"))}
          </Button>
          {isSalaryPasswordAdmin && (
            <div className="mt-2 rounded-md border bg-slate-50 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {isTanja ? "Admin reset" : "Admin reset"}
              </div>
              <div className="text-xs text-slate-500">
                {isTanja
                  ? "Reset maandwachtwoord van een gebruiker voor deze maand."
                  : "Reset maandwachtwoord van een gebruiker voor deze maand."}
              </div>
              <Input
                type="email"
                placeholder="gebruiker@bamalite.com"
                value={adminResetEmail}
                onChange={(e) => setAdminResetEmail(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdminResetMonthlySalaryPassword}
                disabled={adminResetBusy}
              >
                {adminResetBusy ? "Resetten..." : "Reset wachtwoord"}
              </Button>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="w-full px-4 py-6">
      <MobileHeaderNav />
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <DashboardButton />
      </div>
      <div className="mb-4 rounded-lg border-2 border-amber-400 bg-amber-100 px-4 py-3 text-center">
        <div className="text-2xl md:text-3xl font-extrabold tracking-wide text-amber-900">
          NOG IN PROGRESS
        </div>
      </div>

      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}>
              {isTanja ? "Vorheriger Monat" : "Vorige maand"}
            </Button>
            <CardTitle className="text-center text-lg">
              {isTanja ? "Gehalter" : "Salarissen"} - {monthNumberToName(currentMonthPart, isTanja)} {currentYearPart}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}>
              {isTanja ? "Nächster Monat" : "Volgende maand"}
            </Button>
          </div>
          <div className="mt-2 flex justify-center">
            {monthIsClosed ? (
              <span className="inline-flex items-center rounded-md bg-slate-800 text-white text-xs px-2 py-1">
                {isTanja ? "Monat abgeschlossen" : "Maand afgesloten"}
              </span>
            ) : (
              isLeoUser && (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                  onClick={closeMonth}
                  disabled={closingMonth}
                >
                  {closingMonth
                    ? (isTanja ? "Afsluiten..." : "Afsluiten...")
                    : (isTanja ? "Monat afsluiten" : "Maand afsluiten")}
                </Button>
              )
            )}
          </div>
          <div className="text-xs text-gray-500 text-center">
            {isTanja ? "Zuletzt gespeichert" : "Laatst opgeslagen"}: {lastSavedAt ? formatDateTime(lastSavedAt) : "-"}
          </div>
          {isSalaryPasswordAdmin && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Input
                type="email"
                placeholder="Reset maandwachtwoord: e-mail"
                value={adminResetEmail}
                onChange={(e) => setAdminResetEmail(e.target.value)}
                className="h-8 w-64 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAdminResetMonthlySalaryPassword}
                disabled={adminResetBusy}
                className="h-8 text-xs"
              >
                {adminResetBusy ? "Resetten..." : "Reset wachtwoord"}
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>

      <Card className="w-full mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isTanja ? "Download-Version" : "Download versie"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" onClick={downloadProfessionalPdfView}>
              {isTanja ? "Professionell herunterladen (PDF)" : "Download professioneel (PDF)"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCsv}>
              Download CSV
            </Button>
            <Button variant="default" size="sm" onClick={downloadSepaXml}>
              Download SEPA XML
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-3 text-xs text-slate-500 flex flex-wrap items-end gap-2">
        <span>{isTanja ? "Optioneel: Inflationskorrektur" : "Optioneel: inflatiecorrectie"}</span>
        <Input
          disabled={monthIsClosed}
          inputMode="decimal"
          value={inflationPercent}
          onChange={(e) => setInflationPercent(e.target.value)}
          placeholder="%"
          className="h-8 w-20 text-xs"
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
          onClick={applyInflationCorrectionForAll}
          disabled={monthIsClosed || applyingInflation}
        >
          {applyingInflation
            ? (isTanja ? "Anwenden..." : "Toepassen...")
            : (isTanja ? "Toepassen" : "Toepassen")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900"
          onClick={undoInflationCorrectionForAll}
          disabled={monthIsClosed || applyingInflation}
        >
          {isTanja ? "Ongedaan" : "Ongedaan"}
        </Button>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{isTanja ? "Gehalter pro Firma" : "Salarissen per firma"} ({monthKeyToDisplay(monthKey)})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-gray-500">{isTanja ? "Laden..." : "Laden..."}</div>
            ) : Object.keys(groupedByCompany).length === 0 ? (
              <div className="text-sm text-gray-500">{isTanja ? "Noch keine Mitarbeiter gefunden." : "Nog geen medewerkers gevonden."}</div>
            ) : (
              <>
                <Tabs value={activeCompanyTab} onValueChange={setActiveCompanyTab}>
                  <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto bg-transparent p-0 gap-2">
                    {companyNames.map((company) => (
                      <TabsTrigger
                        key={company}
                        value={company}
                        className="whitespace-nowrap border data-[state=active]:bg-white data-[state=active]:border-blue-300 rounded-md px-3 py-1.5"
                      >
                        {company}
                        <span className="ml-2 text-xs text-gray-500">{groupedByCompany[company]?.length || 0}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full min-w-[1700px] text-sm">
                    <thead className="bg-slate-100">
                      <tr className="text-left">
                        <th className="px-3 py-2 text-base font-bold" rowSpan={2}>{isTanja ? "Name" : "Naam"}</th>
                        <th className="px-3 py-2" rowSpan={2}>{isTanja ? "Eintrittsdatum" : "Datum in dienst"}</th>
                        <th className="px-3 py-2" rowSpan={2}>IBAN</th>
                        <th className="px-3 py-2" rowSpan={2}>{isTanja ? "Grundgehalt inkl. Kleidungsgeld" : "Basissalaris incl kledinggeld"}</th>
                        <th className="px-3 py-2" rowSpan={2}>{isTanja ? "Reisekosten" : "Reiskosten"}</th>
                        <th className="px-3 py-2" rowSpan={2}>{isTanja ? "Einbehalt" : "In te houden"}</th>
                        <th className="px-3 py-2" rowSpan={2}>{isTanja ? "Erhöhung" : "Verhoging"}</th>
                        <th className="px-3 py-2" rowSpan={2}>{isTanja ? "Guthaben" : "Te goed"}</th>
                        <th className="px-3 py-2" rowSpan={2}>{isTanja ? "Monatsgehalt gesamt" : "Totaal salaris maand"}</th>
                        <th className="px-3 py-2" rowSpan={2}>{isTanja ? "Bemerkungen" : "Opmerkingen"}</th>
                        <th className="px-3 py-2 text-center font-semibold" colSpan={2}>
                          {isTanja ? "Genehmigt durch:" : "Goedgekeurd door:"}
                        </th>
                      </tr>
                      <tr className="text-left">
                        <th className="px-3 py-2">Leo</th>
                        <th className="px-3 py-2">Karina</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(groupedByCompany[activeCompanyTab] || []).map((r: SalaryDraft) => {
                        const crewMember = crewById.get(String(r.crew_id))
                        const name = crewMember ? formatCrewName(crewMember) : "Onbekend"
                        const { travelAmount, advanceAmount, raiseAmount, teGoedDays, teGoedAmount, totalSalaryMonth } = getSalaryTotals(r)
                        return (
                          <tr
                            key={`${r.crew_id}-${r.month_key}`}
                            className={`border-t border-slate-200 ${monthIsClosed ? "cursor-default" : "cursor-pointer hover:bg-slate-50/80"} ${getRowHighlightClass(crewMember, r, teGoedDays)}`}
                            onClick={(e) => handleRowClickOpenEdit(e, String(r.crew_id))}
                          >
                            <td className="px-3 py-2">
                              <span className="text-left text-slate-900 text-base md:text-lg font-extrabold leading-tight">
                                {name}
                              </span>
                            </td>
                            <td className="px-3 py-2">{formatDateShort(r.in_service_from)}</td>
                            <td className="px-3 py-2">{r.iban || "-"}</td>
                            <td className="px-3 py-2">{formatCurrency(r.base_salary || 0)}</td>
                            <td className="px-3 py-2">{r.travel_allowance ? `Ja (+${formatCurrency(travelAmount)})` : (isTanja ? "Nein" : "Nee")}</td>
                            <td className="px-3 py-2">
                              {r.advance_enabled
                                ? `${getDeductionCategoryLabel(r.deduction_category)} (-${formatCurrency(advanceAmount)})`
                                : (isTanja ? "Nein" : "Nee")}
                            </td>
                            <td className="px-3 py-2">{r.raise_enabled ? `Ja (+${formatCurrency(raiseAmount)})` : (isTanja ? "Nein" : "Nee")}</td>
                            <td className="px-3 py-2">
                              {teGoedDays > 0
                                ? `${teGoedDays} ${isTanja ? "Tage" : "dagen"} (+${formatCurrency(teGoedAmount)})`
                                : "-"}
                            </td>
                            <td className="px-3 py-2 font-bold text-emerald-700">{formatCurrency(totalSalaryMonth)}</td>
                            <td className="px-3 py-2">{getEffectiveMonthlyNote(r, monthKey) || "-"}</td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={!!r.approval_leo}
                                onChange={(e) => handleApprovalToggle(String(r.crew_id), "approval_leo", e.target.checked)}
                                disabled={monthIsClosed || !isLeoUser || savingCrewId === String(r.crew_id)}
                                title={!isLeoUser ? (isTanja ? "Nur Leo kann dieses Häkchen setzen." : "Alleen Leo kan dit vinkje zetten.") : ""}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={!!r.approval_karina}
                                onChange={(e) => handleApprovalToggle(String(r.crew_id), "approval_karina", e.target.checked)}
                                disabled={monthIsClosed || !isKarinaUser || savingCrewId === String(r.crew_id)}
                                title={!isKarinaUser ? (isTanja ? "Nur Karina kann dieses Häkchen setzen." : "Alleen Karina kan dit vinkje zetten.") : ""}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{isTanja ? "Sonstige Zahlungen" : "Overige betalingen"}</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const overtimeRows = (groupedByCompany[activeCompanyTab] || []).filter(
                (r: SalaryDraft) => r.overtime_enabled && Number(r.overtime_days || 0) > 0
              )
              if (overtimeRows.length === 0) {
                return <div className="text-sm text-gray-500">{isTanja ? "Geen overige betalingen." : "Geen overige betalingen."}</div>
              }
              return (
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-slate-100">
                      <tr className="text-left">
                        <th className="px-3 py-2">{isTanja ? "Name" : "Naam"}</th>
                        <th className="px-3 py-2">IBAN</th>
                        <th className="px-3 py-2">{isTanja ? "Extra Arbeitstage" : "Dagen extra gewerkt"}</th>
                        <th className="px-3 py-2">{isTanja ? "Hinweis (von/bis)" : "Opmerking (van/tot)"}</th>
                        <th className="px-3 py-2">{isTanja ? "Betrag" : "Bedrag"}</th>
                        <th className="px-3 py-2">Leo</th>
                        <th className="px-3 py-2">Karina</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overtimeRows.map((r: SalaryDraft) => {
                        const crewMember = crewById.get(String(r.crew_id))
                        const name = crewMember ? formatCrewName(crewMember) : "Onbekend"
                        const overtimeAmount = getOverworkAmount(r)
                        return (
                          <tr key={`overtime-${r.crew_id}-${r.month_key}`} className="border-t border-slate-200">
                            <td className="px-3 py-2">{name}</td>
                            <td className="px-3 py-2">{r.iban || "-"}</td>
                            <td className="px-3 py-2">{Number(r.overtime_days || 0)}</td>
                            <td className="px-3 py-2">{String(r.overtime_note || "").trim() || "-"}</td>
                            <td className="px-3 py-2 font-semibold text-emerald-700">{formatCurrency(overtimeAmount)}</td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={!!r.approval_leo}
                                onChange={(e) => handleApprovalToggle(String(r.crew_id), "approval_leo", e.target.checked)}
                                disabled={!isLeoUser || savingCrewId === String(r.crew_id)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={!!r.approval_karina}
                                onChange={(e) => handleApprovalToggle(String(r.crew_id), "approval_karina", e.target.checked)}
                                disabled={!isKarinaUser || savingCrewId === String(r.crew_id)}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {editingCrewId && rowsByCrewId[editingCrewId] && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-lg border bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isTanja ? "Gehalt bearbeiten" : "Salaris bewerken"} - {formatCrewName(crewById.get(editingCrewId))}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingCrewId(null)
                  setShowSalaryHistory(false)
                  setSalaryHistoryItems([])
                }}
              >
                X
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>IBAN</Label>
                <Input value={rowsByCrewId[editingCrewId].iban || ""} onChange={(e) => setCrewField(editingCrewId, { iban: e.target.value })} />
              </div>
              <div>
                <Label>{isTanja ? "Grundgehalt inkl. Kleidungsgeld" : "Basissalaris incl kledinggeld"}</Label>
                <Input disabled={monthIsClosed} inputMode="decimal" value={rowsByCrewId[editingCrewId].base_salary ?? ""} onChange={(e) => setCrewField(editingCrewId, { base_salary: e.target.value.trim() === "" ? null : Number(e.target.value) })} />
              </div>
              <div>
                <Label>{isTanja ? "Reisekosten" : "Reiskosten"}</Label>
                <Select disabled={monthIsClosed} value={rowsByCrewId[editingCrewId].travel_allowance ? "ja" : "nee"} onValueChange={(v) => setCrewField(editingCrewId, { travel_allowance: v === "ja" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ja">Ja</SelectItem><SelectItem value="nee">{isTanja ? "Nein" : "Nee"}</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isTanja ? "Einbehalt" : "In te houden"}</Label>
                <Select
                  disabled={monthIsClosed}
                  value={rowsByCrewId[editingCrewId].advance_enabled ? "ja" : "nee"}
                  onValueChange={(v) => {
                    const enabled = v === "ja"
                    setCrewField(editingCrewId, {
                      advance_enabled: enabled,
                      advance_amount: enabled ? Number(rowsByCrewId[editingCrewId].advance_amount || 0) : 0,
                      deduction_category: enabled ? rowsByCrewId[editingCrewId].deduction_category : "voorschot",
                    })
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ja">Ja</SelectItem><SelectItem value="nee">{isTanja ? "Nein" : "Nee"}</SelectItem></SelectContent>
                </Select>
              </div>
              {rowsByCrewId[editingCrewId].advance_enabled && (
                <>
                  <div>
                    <Label>{isTanja ? "Kategorie" : "Categorie"}</Label>
                    <Select
                      disabled={monthIsClosed}
                      value={rowsByCrewId[editingCrewId].deduction_category || "voorschot"}
                      onValueChange={(v) =>
                        setCrewField(editingCrewId, {
                          deduction_category: (v as SalaryDraft["deduction_category"]) || "voorschot",
                        })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEDUCTION_CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{isTanja ? "Betrag" : "Bedrag"}</Label>
                    <Input
                      disabled={monthIsClosed}
                      inputMode="decimal"
                      value={rowsByCrewId[editingCrewId].advance_amount ?? ""}
                      onChange={(e) =>
                        setCrewField(editingCrewId, {
                          advance_enabled: true,
                          advance_amount: e.target.value.trim() === "" ? 0 : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </>
              )}
              <div>
                <Label>{isTanja ? "Erhöhungsbetrag" : "Verhoging bedrag"}</Label>
                <Input disabled={monthIsClosed} inputMode="decimal" value={rowsByCrewId[editingCrewId].raise_amount ?? ""} onChange={(e) => setCrewField(editingCrewId, { raise_enabled: e.target.value.trim() !== "", raise_amount: e.target.value.trim() === "" ? 0 : Number(e.target.value) })} />
              </div>
              <div>
                <Label>{isTanja ? "Uberstunden" : "Overwerk"}</Label>
                <Select
                  disabled={monthIsClosed}
                  value={rowsByCrewId[editingCrewId].overtime_enabled ? "ja" : "nee"}
                  onValueChange={(v) => {
                    const enabled = v === "ja"
                    if (!enabled) {
                      setOvertimeDaysInput("")
                    } else {
                      const existing = Number(rowsByCrewId[editingCrewId].overtime_days || 0)
                      setOvertimeDaysInput(existing > 0 ? String(existing).replace(".", ",") : "")
                    }
                    setCrewField(editingCrewId, {
                      overtime_enabled: enabled,
                      overtime_days: enabled ? Number(rowsByCrewId[editingCrewId].overtime_days || 0) : 0,
                    })
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ja">Ja</SelectItem><SelectItem value="nee">{isTanja ? "Nein" : "Nee"}</SelectItem></SelectContent>
                </Select>
              </div>
              {rowsByCrewId[editingCrewId].overtime_enabled && (
                <div>
                  <Label>{isTanja ? "Anzahl Extra-Tage" : "Aantal dagen extra gewerkt"}</Label>
                  <Input
                    disabled={monthIsClosed}
                    inputMode="decimal"
                    value={overtimeDaysInput}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (/^\d*([.,]\d*)?$/.test(raw)) {
                        setOvertimeDaysInput(raw)
                      }
                    }}
                    placeholder={isTanja ? "z. B. 3,5" : "Bijv. 3,5"}
                  />
                </div>
              )}
              {rowsByCrewId[editingCrewId].overtime_enabled && (
                <div className="md:col-span-2">
                  <Label>{isTanja ? "Hinweis Überstunden (von ... bis ...)" : "Opmerking overwerk (van ... tot ...)"}</Label>
                  <Input
                    disabled={monthIsClosed}
                    value={rowsByCrewId[editingCrewId].overtime_note || ""}
                    onChange={(e) => setCrewField(editingCrewId, { overtime_note: e.target.value })}
                    placeholder={isTanja ? "von 26-04-2026 bis 28-04-2026" : "van 26-04-2026 tot 28-04-2026"}
                  />
                </div>
              )}
              <div>
                <Label>{isTanja ? "Bemerkungen" : "Opmerkingen"}</Label>
                <Input disabled={monthIsClosed} value={rowsByCrewId[editingCrewId].notes || ""} onChange={(e) => setCrewField(editingCrewId, { notes: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const nextShow = !showSalaryHistory
                  setShowSalaryHistory(nextShow)
                  if (nextShow) {
                    await loadSalaryHistory(editingCrewId)
                  }
                }}
              >
                {isTanja ? "Gehaltshistorie" : "Salarisgeschiedenis"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingCrewId(null)
                  setShowSalaryHistory(false)
                  setSalaryHistoryItems([])
                }}
              >
                {isTanja ? "Abbrechen" : "Annuleren"}
              </Button>
              <Button
                disabled={monthIsClosed}
                onClick={async () => {
                  const preparedRow = syncOvertimeInputToRow(editingCrewId)
                  const ok = await saveCrewRow(editingCrewId, preparedRow || undefined)
                  if (ok) {
                    setEditingCrewId(null)
                    setShowSalaryHistory(false)
                    setSalaryHistoryItems([])
                  }
                }}
              >
                {isTanja ? "Speichern" : "Opslaan"}
              </Button>
            </div>
            {showSalaryHistory && (
              <div className="mt-4 border-t pt-4">
                <div className="text-sm font-semibold mb-2">
                  {isTanja ? "Gehaltshistorie" : "Salarisgeschiedenis"}
                </div>
                {salaryHistoryLoading ? (
                  <div className="text-sm text-gray-500">{isTanja ? "Laden..." : "Laden..."}</div>
                ) : salaryHistoryItems.length === 0 ? (
                  <div className="text-sm text-gray-500">{isTanja ? "Geen historie gevonden." : "Geen historie gevonden."}</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr className="text-left">
                          <th className="px-2 py-1">Maand</th>
                          <th className="px-2 py-1">{isTanja ? "Basissalaris" : "Basissalaris"}</th>
                          <th className="px-2 py-1">{isTanja ? "Reiskosten" : "Reiskosten"}</th>
                          <th className="px-2 py-1">{isTanja ? "Verhoging" : "Verhoging"}</th>
                          <th className="px-2 py-1">{isTanja ? "Voorschot" : "Voorschot"}</th>
                          <th className="px-2 py-1">{isTanja ? "Overwerk" : "Overwerk"}</th>
                          <th className="px-2 py-1">{isTanja ? "Totaal" : "Totaal"}</th>
                          <th className="px-2 py-1">{isTanja ? "Reden/opmerking" : "Reden/opmerking"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaryHistoryItems.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-2 py-1">{item.month_key}</td>
                            <td className="px-2 py-1">{formatCurrency(item.base_salary)}</td>
                            <td className="px-2 py-1">{item.travel_allowance ? `Ja (+${formatCurrency(300)})` : "Nee"}</td>
                            <td className="px-2 py-1">{formatCurrency(item.raise_amount)}</td>
                            <td className="px-2 py-1">{formatCurrency(item.advance_amount)}</td>
                            <td className="px-2 py-1">
                              {item.overtime_days > 0
                                ? `${item.overtime_days}d (${formatCurrency(getOverworkAmountForCrew(editingCrewId, item.base_salary, item.overtime_days))})`
                                : "-"}
                            </td>
                            <td className="px-2 py-1 font-semibold">{formatCurrency(item.total_salary_month)}</td>
                            <td className="px-2 py-1">{String(item.overtime_note || item.notes || "").trim()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

