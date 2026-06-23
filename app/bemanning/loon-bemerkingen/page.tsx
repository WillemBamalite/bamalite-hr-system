"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import {
  hasOutOfServiceStatus,
  isCopiedCrewMember,
  isExcludedFromSalaryMonth,
  isRealCrewMember,
  parseCrewDate,
} from "@/utils/crew-filters"
import { calculateOverwerkAmount } from "@/utils/overwerk-pay-rates"
import { humanizeSalaryDisplayNote } from "@/utils/overwerk-settlement"
import {
  listConfiguredSepaCompanies,
  parseSepaDebtorsFromEnv,
  resolveSepaDebtorForCompany,
} from "@/utils/sepa-debtor-config"
import {
  applyApprovalOwnership,
  applySickAdjustmentToSalary,
  canUserSetSalaryApproval,
  collectOverigeBetalingenForMonth,
  buildSepaExtraWorkMessage,
  getOvertimePayoutMonthKey,
  getPayableClothingAllowance,
  getSalaryPaymentDateForMonth,
  getSickDaysInMonth,
  isOvertimePayableRow,
  readSalaryApproval,
  readSalaryApprovalPaidAt,
  resolveSepaExecutionDate,
  resolveStorageApprovalKeys,
  resolveOvertimeInputMode,
  type OvertimeInputMode,
  getSickSalaryNote,
  getTotalDeductionAmount,
  normalizeDeductionsFromMeta,
  shiftMonthKey,
  stripAutoSickNotesFromManual,
  syncLegacyAdvanceFields,
  type SalaryDeduction,
  type SalaryDeductionCategory,
} from "@/utils/salary-month-helpers"

const TRAVEL_AMOUNT_OPTIONS = [0, 150, 300] as const
/** Bedrijfsauto: geen reiskostenvergoeding, wel zichtbaar als "Auto". */
const TRAVEL_AMOUNT_COMPANY_CAR = -1 as const
type TravelAmountOption = (typeof TRAVEL_AMOUNT_OPTIONS)[number] | typeof TRAVEL_AMOUNT_COMPANY_CAR

const getPayableTravelAmount = (amount: TravelAmountOption | number | null | undefined): number => {
  const n = typeof amount === "number" ? amount : 0
  if (n === TRAVEL_AMOUNT_COMPANY_CAR || n <= 0) return 0
  return n
}

const isCompanyCarTravel = (amount: unknown): boolean =>
  amount === TRAVEL_AMOUNT_COMPANY_CAR || String(amount || "").toLowerCase() === "auto"

type SalaryHistoryItem = {
  id: string
  month_key: string
  base_salary: number
  travel_amount: number
  raise_amount: number
  advance_amount: number
  overtime_days: number
  overtime_note: string
  inflation_adjustment: number
  notes: string
  total_salary_month: number
  approval_leo_paid_at: string
  approval_karina_paid_at: string
}

const getCurrentMonthKey = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
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
  out_of_service_date: string | null
  iban: string
  base_salary: number | null
  travel_amount: TravelAmountOption
  advance_enabled: boolean
  advance_amount: number | null
  deduction_category: SalaryDeductionCategory
  deductions: SalaryDeduction[]
  raise_enabled: boolean
  raise_amount: number | null
  overtime_enabled: boolean
  overtime_mode: OvertimeInputMode
  overtime_days: number | null
  overtime_manual_amount: number | null
  overtime_note: string
  inflation_adjustment: number | null
  inflation_batch_id: string
  month_closed: boolean
  month_closed_by: string
  month_closed_at: string
  approval_leo: boolean
  approval_karina: boolean
  approval_leo_paid_at: string
  approval_karina_paid_at: string
  overtime_approval_leo: boolean
  overtime_approval_karina: boolean
  overtime_approval_leo_paid_at: string
  overtime_approval_karina_paid_at: string
  notes: string
  review_comment: string
  review_by: string
  review_type: "opmerking" | "correctie"
  /** Handmatige override gewerkte dagen bij pro-rata; null = automatisch berekenen. */
  proration_worked_days: number | null
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
const CLOTHING_ALLOWANCE_FIXED = 25

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

/** Salarisvelden: komma als decimaal, optioneel punt als duizendtallen (zelfde als parseMoney). */
const parseSalaryMoneyInput = (raw: string): number | null => {
  const s = String(raw || "").trim()
  if (s === "") return null
  const n = parseMoney(s)
  return Number.isFinite(n) ? n : null
}

const parseSalaryMoneyInputOrZero = (raw: string): number => {
  const s = String(raw || "").trim()
  if (s === "") return 0
  return parseMoney(s)
}

/** Tekst voor het basissalaris-veld (komma als decimaal), niet telkens naar number normaliseren tijdens typen. */
const formatSalaryInputFromNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return ""
  const n = Number(value)
  if (Number.isInteger(n)) return String(n)
  return String(n).replace(".", ",")
}

const formatInputDateToDutch = (isoDate: string) => {
  const [y, m, d] = String(isoDate || "").split("-")
  if (!y || !m || !d) return ""
  return `${d}-${m}-${y}`
}

const formatDutchDateToInput = (dutchDate: string) => {
  const [d, m, y] = String(dutchDate || "").split("-")
  if (!d || !m || !y) return ""
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
}

const buildOvertimeNoteFromDateRange = (fromIso: string, toIso: string) => {
  const from = formatInputDateToDutch(fromIso)
  const to = formatInputDateToDutch(toIso)
  if (!from || !to) return ""
  return `van ${from} tot ${to}`
}

const getCrewNotesText = (crewMember: any): string =>
  Array.isArray(crewMember?.notes)
    ? crewMember.notes.join(" | ")
    : String(crewMember?.notes || "")

const getContractBaseSalaryInclClothing = (crewMember: any): number | null => {
  const notesText = getCrewNotesText(crewMember)
  const noteMatch = notesText.match(/contract_basis_salaris_excl_kleding:([0-9.,-]+)/i)
  const noteBase = noteMatch ? parseMoney(noteMatch[1]) : 0
  const noteClothingMatch = notesText.match(/contract_kledinggeld:([0-9.,-]+)/i)
  const noteClothing = noteClothingMatch ? parseMoney(noteClothingMatch[1]) : 0

  const baseRaw =
    crewMember?.basis_salaris ??
    crewMember?.basissalaris ??
    crewMember?.basisSalaris ??
    crewMember?.salaris ??
    crewMember?.salary ??
    null
  const base = parseMoney(baseRaw)
  const clothing = getCrewClothingAllowance(crewMember)
  const total = base + clothing
  if (total > 0) return total
  if (noteBase > 0) return noteBase + noteClothing
  return null
}

const getCrewBaseSalaryExclClothing = (crewMember: any): number => {
  const baseRaw =
    crewMember?.basis_salaris ??
    crewMember?.basissalaris ??
    crewMember?.basisSalaris ??
    crewMember?.salaris ??
    crewMember?.salary ??
    null
  return parseMoney(baseRaw)
}

const getCrewClothingAllowance = (crewMember: any): number => {
  // Bedrijfsregel: kledinggeld is voor iedereen altijd vast EUR 25 per maand.
  return CLOTHING_ALLOWANCE_FIXED
}

const getContractBaseSalaryExclClothing = (crewMember: any): number | null => {
  const fromCrew = getCrewBaseSalaryExclClothing(crewMember)
  if (fromCrew > 0) return fromCrew

  const notesText = getCrewNotesText(crewMember)
  const noteExclMatch = notesText.match(/contract_basis_salaris_excl_kleding:([0-9.,-]+)/i)
  const noteExcl = noteExclMatch ? parseMoney(noteExclMatch[1]) : 0
  if (noteExcl > 0) return noteExcl

  const incl = getContractBaseSalaryInclClothing(crewMember)
  if (incl !== null && incl > 0) {
    const clothing = getCrewClothingAllowance(crewMember) || CLOTHING_ALLOWANCE_FIXED
    return Math.max(0, incl - clothing)
  }
  return null
}

/** Zorg dat opgeslagen/getoond basissalaris exclusief kledinggeld is (pro-rata-basis). */
const normalizeBaseSalaryExclClothingForCrew = (
  baseSalary: number | null | undefined,
  crewMember: any
): number | null => {
  if (typeof baseSalary !== "number" || !Number.isFinite(baseSalary)) return null
  const clothing = getCrewClothingAllowance(crewMember) || CLOTHING_ALLOWANCE_FIXED
  const crewExcl = getCrewBaseSalaryExclClothing(crewMember)

  const notesText = getCrewNotesText(crewMember)
  const noteExclMatch = notesText.match(/contract_basis_salaris_excl_kleding:([0-9.,-]+)/i)
  const noteExcl = noteExclMatch ? parseMoney(noteExclMatch[1]) : 0

  if (crewExcl > 0 && Math.abs(baseSalary - crewExcl) < 0.01) return baseSalary
  if (noteExcl > 0 && Math.abs(baseSalary - noteExcl) < 0.01) return baseSalary
  if (crewExcl > 0 && Math.abs(baseSalary - (crewExcl + clothing)) < 0.01) return crewExcl
  if (noteExcl > 0 && Math.abs(baseSalary - (noteExcl + clothing)) < 0.01) return noteExcl

  return baseSalary
}

const normalizeTravelAmount = (value: unknown): TravelAmountOption => {
  if (isCompanyCarTravel(value)) return TRAVEL_AMOUNT_COMPANY_CAR
  const amount = typeof value === "number" ? value : parseMoney(value)
  if (amount === TRAVEL_AMOUNT_COMPANY_CAR) return TRAVEL_AMOUNT_COMPANY_CAR
  if (amount >= 225) return 300
  if (amount >= 75) return 150
  return 0
}

const getContractTravelAmount = (crewMember: any): TravelAmountOption => {
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
  if (typeof travelRaw === "boolean") return travelRaw ? 300 : 0
  const directTravel = parseMoney(travelRaw)
  if (directTravel > 0) return normalizeTravelAmount(directTravel)
  if (noteTravel > 0) return normalizeTravelAmount(noteTravel)
  return 0
}

const resolveTravelAmountFromRow = (dbRow: any, meta: ReturnType<typeof parseSalaryMetaFromReason>): TravelAmountOption => {
  if (typeof meta?.travel_amount === "number") {
    return normalizeTravelAmount(meta.travel_amount)
  }
  if (dbRow?.travel_allowance === true) return 300
  if (dbRow?.travel_allowance === false) return 0
  if (typeof dbRow?.travel_allowance === "number") {
    return normalizeTravelAmount(dbRow.travel_allowance)
  }
  return 0
}

const formatTravelDisplay = (amount: number, german = false) => {
  if (amount === TRAVEL_AMOUNT_COMPANY_CAR) return german ? "Firmenwagen" : "Bedrijfsauto"
  if (amount <= 0) return german ? "Nein" : "Nee"
  return `Ja (+${formatCurrency(amount)})`
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

const isEligibleForSalaryPage = (member: any, selectedMonthKey: string) => {
  if (!member || member.is_dummy === true) return false
  if (isCopiedCrewMember(member)) return false
  if (isExcludedFromSalaryMonth(member, selectedMonthKey)) return false
  if (isAflosser(member)) {
    return member?.vaste_dienst === true
  }
  if (member?.recruitment_status && member.recruitment_status !== "aangenomen") return false
  if (hasOutOfServiceStatus(member)) return true
  return isRealCrewMember(member)
}

const isEligibleForSalaryMonth = (member: any, selectedMonthKey: string) => {
  if (isExcludedFromSalaryMonth(member, selectedMonthKey)) return false
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
      deduction_category?: SalaryDeductionCategory
      deductions?: SalaryDeduction[]
      raise_enabled?: boolean
      raise_amount?: number
      overtime_enabled?: boolean
      overtime_mode?: OvertimeInputMode
      overtime_days?: number
      overtime_manual_amount?: number
      overtime_note?: string
      inflation_adjustment?: number
      inflation_batch_id?: string
      month_closed?: boolean
      month_closed_by?: string
      month_closed_at?: string
      approval_leo?: boolean
      approval_karina?: boolean
      approval_leo_paid_at?: string
      approval_karina_paid_at?: string
      overtime_approval_leo?: boolean
      overtime_approval_karina?: boolean
      overtime_approval_leo_paid_at?: string
      overtime_approval_karina_paid_at?: string
      proration_worked_days?: number | null
      travel_amount?: number
    }
    const deductions = normalizeDeductionsFromMeta(
      {
        deductions: parsed.deductions,
        advance_enabled: parsed.advance_enabled,
        advance_amount: parsed.advance_amount,
        deduction_category: parsed.deduction_category,
      },
      null
    )
    const legacyAdvance = syncLegacyAdvanceFields(deductions)
    return {
      iban: String(parsed.iban || ""),
      review_comment: String(parsed.review_comment || ""),
      review_by: String(parsed.review_by || ""),
      review_type: parsed.review_type === "correctie" ? "correctie" : "opmerking",
      advance_enabled: legacyAdvance.advance_enabled,
      advance_amount: legacyAdvance.advance_amount,
      deduction_category: legacyAdvance.deduction_category,
      deductions,
      raise_enabled: parsed.raise_enabled === true,
      raise_amount: typeof parsed.raise_amount === "number" ? parsed.raise_amount : 0,
      overtime_enabled: parsed.overtime_enabled === true,
      overtime_mode: resolveOvertimeInputMode(parsed.overtime_mode),
      overtime_days: typeof parsed.overtime_days === "number" ? parsed.overtime_days : 0,
      overtime_manual_amount:
        typeof parsed.overtime_manual_amount === "number" ? parsed.overtime_manual_amount : 0,
      overtime_note: String(parsed.overtime_note || ""),
      inflation_adjustment: typeof parsed.inflation_adjustment === "number" ? parsed.inflation_adjustment : 0,
      inflation_batch_id: String(parsed.inflation_batch_id || ""),
      month_closed: parsed.month_closed === true,
      month_closed_by: String(parsed.month_closed_by || ""),
      month_closed_at: String(parsed.month_closed_at || ""),
      approval_leo: parsed.approval_leo === true,
      approval_karina: parsed.approval_karina === true,
      approval_leo_paid_at: String(parsed.approval_leo_paid_at || ""),
      approval_karina_paid_at: String(parsed.approval_karina_paid_at || ""),
      overtime_approval_leo: parsed.overtime_approval_leo === true,
      overtime_approval_karina: parsed.overtime_approval_karina === true,
      overtime_approval_leo_paid_at: String(parsed.overtime_approval_leo_paid_at || ""),
      overtime_approval_karina_paid_at: String(parsed.overtime_approval_karina_paid_at || ""),
      proration_worked_days:
        typeof parsed.proration_worked_days === "number" ? parsed.proration_worked_days : null,
      travel_amount:
        typeof parsed.travel_amount === "number"
          ? normalizeTravelAmount(parsed.travel_amount)
          : undefined,
    }
  } catch {
    return null
  }
}

export default function LoonBemerkingenPage() {
  const { crew, loans, sickLeave } = useSupabaseData()
  const [currentUserId, setCurrentUserId] = useState("")
  const [currentUserEmail, setCurrentUserEmail] = useState("")
  const [salaryPageUnlocked, setSalaryPageUnlocked] = useState(false)
  const [salaryPageGateLoading, setSalaryPageGateLoading] = useState(true)
  const [salaryPageGateMode, setSalaryPageGateMode] = useState<"verify" | "setup">("verify")
  const [salaryPagePasswordInput, setSalaryPagePasswordInput] = useState("")
  const [salaryPagePasswordConfirm, setSalaryPagePasswordConfirm] = useState("")
  const [salaryPageGateBusy, setSalaryPageGateBusy] = useState(false)
  const [salaryPasswordMonthKey] = useState(getCurrentMonthKey())
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
  const [editingSourceMonthKey, setEditingSourceMonthKey] = useState<string | null>(null)
  const [baseSalaryEditText, setBaseSalaryEditText] = useState("")
  const [overtimeDaysInput, setOvertimeDaysInput] = useState<string>("")
  const [overtimeModeInput, setOvertimeModeInput] = useState<OvertimeInputMode>("days")
  const [overtimeAmountInput, setOvertimeAmountInput] = useState<string>("")
  const editingFormHydrationKeyRef = useRef("")
  const [prorationDaysInput, setProrationDaysInput] = useState<string>("")
  const [overtimeFromDate, setOvertimeFromDate] = useState<string>("")
  const [overtimeToDate, setOvertimeToDate] = useState<string>("")
  const [inflationPercent, setInflationPercent] = useState<string>("")
  const [applyingInflation, setApplyingInflation] = useState(false)
  const [closingMonth, setClosingMonth] = useState(false)
  const [showSalaryHistory, setShowSalaryHistory] = useState(false)
  const [salaryHistoryLoading, setSalaryHistoryLoading] = useState(false)
  const [salaryHistoryItems, setSalaryHistoryItems] = useState<SalaryHistoryItem[]>([])
  const [previousMonthRowsByCrewId, setPreviousMonthRowsByCrewId] = useState<Record<string, SalaryDraft>>({})
  const [previousMonthWarning, setPreviousMonthWarning] = useState<{
    monthKey: string
    notClosed: boolean
    unapprovedCount: number
  } | null>(null)
  const [approvalDatePrompt, setApprovalDatePrompt] = useState<{
    crewId: string
    field: "approval_leo" | "approval_karina"
    paymentDate: string
    sourceMonthKey?: string
  } | null>(null)
  const [bulkSalaryApprovalPrompt, setBulkSalaryApprovalPrompt] = useState<{
    paymentDate: string
    company: string
  } | null>(null)
  const [bulkApprovingSalary, setBulkApprovingSalary] = useState(false)
  const [deductionAmountTexts, setDeductionAmountTexts] = useState<Record<string, string>>({})
  const isTanja = currentUserEmail === "tanja@bamalite.com"
  const isKarinaUser = currentUserEmail === KARINA_EMAIL
  const isLeoUser = currentUserEmail === LEO_EMAIL
  const canDownloadSepa = isLeoUser || isKarinaUser
  const canBulkApproveSalary = isLeoUser || isKarinaUser
  const ownSalaryApprovalField: "approval_leo" | "approval_karina" | null = isLeoUser
    ? "approval_leo"
    : isKarinaUser
      ? "approval_karina"
      : null
  const isSalaryPasswordAdmin = SALARY_PASSWORD_ADMIN_EMAILS.has(currentUserEmail)
  const overtimeCalendarReadOnlyUser = isTanja || isKarinaUser

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

      const prevMonthKey = shiftMonthKey(monthKey, -1)
      const { data: prevMonthRows, error: prevMonthError } = await supabase
        .from("loon_bemerkingen")
        .select("*")
        .eq("month_key", prevMonthKey)
      if (prevMonthError) throw prevMonthError

      const prevWarningRows = prevMonthRows || []
      const prevNotClosed =
        prevWarningRows.length > 0 &&
        !prevWarningRows.some((r: any) => {
          const meta = parseSalaryMetaFromReason(r?.reason)
          return (r?.month_closed ?? meta?.month_closed) === true
        })
      const prevUnapproved = prevWarningRows.filter((r: any) => {
        const meta = parseSalaryMetaFromReason(r?.reason)
        const leo = (r?.approval_leo ?? meta?.approval_leo) === true
        const karina = (r?.approval_karina ?? meta?.approval_karina) === true
        return !(leo && karina)
      }).length
      if (prevWarningRows.length > 0 && (prevNotClosed || prevUnapproved > 0)) {
        setPreviousMonthWarning({
          monthKey: prevMonthKey,
          notClosed: prevNotClosed,
          unapprovedCount: prevUnapproved,
        })
      } else {
        setPreviousMonthWarning(null)
      }

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
      const nextPrevMonthRows: Record<string, SalaryDraft> = {}
      ;(crew || [])
        .filter((c: any) => isEligibleForSalaryPage(c, monthKey))
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
              Number(currentMeta?.advance_amount || 0) > 0 ||
              (currentMeta?.deductions?.length || 0) > 0
            )
          const manualDeductions = hasManualCurrentDeduction
            ? normalizeDeductionsFromMeta(currentMeta, current)
            : []
          const autoLoanDeductions: SalaryDeduction[] =
            !hasManualCurrentDeduction && autoLoanDeduction > 0
              ? [{ id: "auto-loan", amount: autoLoanDeduction, category: "lening" }]
              : []
          const deductions = manualDeductions.length > 0 ? manualDeductions : autoLoanDeductions
          const legacyAdvance = syncLegacyAdvanceFields(deductions)
          const previousRaiseEnabled =
            currentMeta?.raise_enabled === true
              ? false
              : (previous?.raise_enabled ?? previousMeta?.raise_enabled ?? false)
          const previousRaiseAmount =
            typeof previous?.raise_amount === "number"
              ? previous.raise_amount
              : (previousMeta?.raise_amount || 0)
          const previousBaseSalary = normalizeBaseSalaryExclClothingForCrew(
            typeof previous?.base_salary === "number" ? previous.base_salary : null,
            c
          )
          const inheritedBaseSalary =
            previousBaseSalary !== null
              ? previousBaseSalary + (previousRaiseEnabled ? previousRaiseAmount : 0)
              : null
          const contractBaseSalaryExclClothing = getContractBaseSalaryExclClothing(c)
          const contractTravelAmount = getContractTravelAmount(c)
          const base = current || previous || null
          const currentCompany = String(current?.company || "").trim()
          const previousCompany = String(previous?.company || "").trim()
          const switchedCompanyThisMonth =
            !!current &&
            !!currentCompany &&
            !!previousCompany &&
            currentCompany !== previousCompany
          const rawCurrentNotes = String(current?.notes ?? "")
          nextCompanySwitchByCrew[crewId] = switchedCompanyThisMonth
          const draftRow: SalaryDraft = {
            id: current?.id,
            crew_id: crewId,
            // Firma-indeling volgt primair de firma-wisseling bron (crew.company).
            company: (c.company ?? current?.company ?? previous?.company ?? null) || null,
            month_key: monthKey,
            in_service_from: c?.in_dienst_vanaf || null,
            out_of_service_date: c?.out_of_service_date || null,
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
                ? (
                    normalizeBaseSalaryExclClothingForCrew(current.base_salary, c) ??
                    current.base_salary
                  )
                : (inheritedBaseSalary ?? contractBaseSalaryExclClothing),
            travel_amount: current
              ? resolveTravelAmountFromRow(current, currentMeta)
              : (previous
                  ? resolveTravelAmountFromRow(previous, previousMeta)
                  : contractTravelAmount),
            advance_enabled: legacyAdvance.advance_enabled,
            advance_amount: legacyAdvance.advance_amount,
            deduction_category: legacyAdvance.deduction_category,
            deductions,
            raise_enabled:
              (current?.raise_enabled ?? currentMeta?.raise_enabled ?? false) === true,
            raise_amount:
              typeof current?.raise_amount === "number"
                ? current.raise_amount
                : (currentMeta?.raise_amount || 0),
            overtime_enabled:
              (current?.overtime_enabled ?? currentMeta?.overtime_enabled ?? false) === true,
            overtime_mode: resolveOvertimeInputMode(
              current?.overtime_mode ?? currentMeta?.overtime_mode
            ),
            overtime_days:
              typeof current?.overtime_days === "number"
                ? current.overtime_days
                : (currentMeta?.overtime_days || 0),
            overtime_manual_amount:
              typeof current?.overtime_manual_amount === "number"
                ? current.overtime_manual_amount
                : typeof currentMeta?.overtime_manual_amount === "number"
                  ? currentMeta.overtime_manual_amount
                  : 0,
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
            approval_leo: readSalaryApproval(current, currentMeta, "approval_leo"),
            approval_karina: readSalaryApproval(current, currentMeta, "approval_karina"),
            approval_leo_paid_at: readSalaryApprovalPaidAt(
              current,
              currentMeta,
              "approval_leo_paid_at"
            ),
            approval_karina_paid_at: readSalaryApprovalPaidAt(
              current,
              currentMeta,
              "approval_karina_paid_at"
            ),
            overtime_approval_leo: readSalaryApproval(current, currentMeta, "overtime_approval_leo"),
            overtime_approval_karina: readSalaryApproval(
              current,
              currentMeta,
              "overtime_approval_karina"
            ),
            overtime_approval_leo_paid_at: readSalaryApprovalPaidAt(
              current,
              currentMeta,
              "overtime_approval_leo_paid_at"
            ),
            overtime_approval_karina_paid_at: readSalaryApprovalPaidAt(
              current,
              currentMeta,
              "overtime_approval_karina_paid_at"
            ),
            notes: rawCurrentNotes,
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
            proration_worked_days:
              typeof currentMeta?.proration_worked_days === "number"
                ? currentMeta.proration_worked_days
                : null,
          }
          draftRow.notes = stripAutoSickNotesFromManual(
            getNormalizedManualNote(draftRow.notes, getAutoProrationNote(draftRow, monthKey))
          )
          nextRowsByCrew[crewId] = draftRow
        })

      for (const prevRow of prevMonthRows || []) {
        const crewId = String(prevRow.crew_id)
        const meta = parseSalaryMetaFromReason(prevRow?.reason)
        const deductions = normalizeDeductionsFromMeta(meta, prevRow)
        const legacyAdvance = syncLegacyAdvanceFields(deductions)
        nextPrevMonthRows[crewId] = {
          id: prevRow?.id,
          crew_id: crewId,
          company: prevRow?.company || null,
          month_key: prevMonthKey,
          in_service_from: crewById.get(crewId)?.in_dienst_vanaf || null,
          out_of_service_date: crewById.get(crewId)?.out_of_service_date || null,
          iban: String(prevRow?.iban ?? meta?.iban ?? ""),
          base_salary: typeof prevRow?.base_salary === "number" ? prevRow.base_salary : 0,
          travel_amount: resolveTravelAmountFromRow(prevRow, meta),
          advance_enabled: legacyAdvance.advance_enabled,
          advance_amount: legacyAdvance.advance_amount,
          deduction_category: legacyAdvance.deduction_category,
          deductions,
          raise_enabled: (prevRow?.raise_enabled ?? meta?.raise_enabled ?? false) === true,
          raise_amount: typeof prevRow?.raise_amount === "number" ? prevRow.raise_amount : (meta?.raise_amount || 0),
          overtime_enabled: (prevRow?.overtime_enabled ?? meta?.overtime_enabled ?? false) === true,
          overtime_mode: resolveOvertimeInputMode(prevRow?.overtime_mode ?? meta?.overtime_mode),
          overtime_days: typeof prevRow?.overtime_days === "number" ? prevRow.overtime_days : (meta?.overtime_days || 0),
          overtime_manual_amount:
            typeof prevRow?.overtime_manual_amount === "number"
              ? prevRow.overtime_manual_amount
              : typeof meta?.overtime_manual_amount === "number"
                ? meta.overtime_manual_amount
                : 0,
          overtime_note: String(prevRow?.overtime_note ?? meta?.overtime_note ?? ""),
          inflation_adjustment: typeof prevRow?.inflation_adjustment === "number" ? prevRow.inflation_adjustment : (meta?.inflation_adjustment || 0),
          inflation_batch_id: String(prevRow?.inflation_batch_id ?? meta?.inflation_batch_id ?? ""),
          month_closed: (prevRow?.month_closed ?? meta?.month_closed ?? false) === true,
          month_closed_by: String(prevRow?.month_closed_by ?? meta?.month_closed_by ?? ""),
          month_closed_at: String(prevRow?.month_closed_at ?? meta?.month_closed_at ?? ""),
          approval_leo: readSalaryApproval(prevRow, meta, "approval_leo"),
          approval_karina: readSalaryApproval(prevRow, meta, "approval_karina"),
          approval_leo_paid_at: readSalaryApprovalPaidAt(prevRow, meta, "approval_leo_paid_at"),
          approval_karina_paid_at: readSalaryApprovalPaidAt(prevRow, meta, "approval_karina_paid_at"),
          overtime_approval_leo: readSalaryApproval(prevRow, meta, "overtime_approval_leo"),
          overtime_approval_karina: readSalaryApproval(prevRow, meta, "overtime_approval_karina"),
          overtime_approval_leo_paid_at: readSalaryApprovalPaidAt(
            prevRow,
            meta,
            "overtime_approval_leo_paid_at"
          ),
          overtime_approval_karina_paid_at: readSalaryApprovalPaidAt(
            prevRow,
            meta,
            "overtime_approval_karina_paid_at"
          ),
          notes: String(prevRow?.notes || ""),
          review_comment: String(prevRow?.review_comment ?? meta?.review_comment ?? ""),
          review_by: String(prevRow?.review_by ?? meta?.review_by ?? ""),
          review_type: prevRow?.review_type === "correctie" ? "correctie" : (meta?.review_type || "opmerking"),
          proration_worked_days:
            typeof meta?.proration_worked_days === "number" ? meta.proration_worked_days : null,
        }
      }

      setRowsByCrewId(nextRowsByCrew)
      setCompanySwitchByCrewId(nextCompanySwitchByCrew)
      setPreviousMonthRowsByCrewId(nextPrevMonthRows)
    } catch (e) {
      console.warn("Fout bij laden salarissen:", getErrMsg(e))
      setRowsByCrewId({})
      setCompanySwitchByCrewId({})
      setPreviousMonthRowsByCrewId({})
      setPreviousMonthWarning(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!mounted || !currentUserId || !currentUserEmail) return
    setSalaryPageUnlocked(false)
    setSalaryPagePasswordInput("")
    setSalaryPagePasswordConfirm("")
    loadSalaryPagePasswordGate(salaryPasswordMonthKey)
  }, [mounted, currentUserId, currentUserEmail, salaryPasswordMonthKey])

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
  const overigeBetalingenRows = useMemo(() => {
    return collectOverigeBetalingenForMonth(
      monthKey,
      Object.values(rowsByCrewId),
      Object.values(previousMonthRowsByCrewId)
    )
  }, [rowsByCrewId, previousMonthRowsByCrewId, monthKey])
  const monthIsClosed = useMemo(
    () => Object.values(rowsByCrewId).some((r) => r.month_closed === true),
    [rowsByCrewId]
  )
  const salaryReadOnlyUser = isTanja
  const salaryEditingDisabled = monthIsClosed || salaryReadOnlyUser

  const editingRow = useMemo(() => {
    if (!editingCrewId) return null
    if (editingSourceMonthKey) {
      return previousMonthRowsByCrewId[editingCrewId] || rowsByCrewId[editingCrewId] || null
    }
    return rowsByCrewId[editingCrewId] || null
  }, [editingCrewId, editingSourceMonthKey, rowsByCrewId, previousMonthRowsByCrewId])

  useEffect(() => {
    if (!editingRow || !editingCrewId) {
      editingFormHydrationKeyRef.current = ""
      setBaseSalaryEditText("")
      setOvertimeDaysInput("")
      setOvertimeModeInput("days")
      setOvertimeAmountInput("")
      setOvertimeFromDate("")
      setOvertimeToDate("")
      setProrationDaysInput("")
      return
    }
    const hydrationKey = `${editingCrewId}::${editingSourceMonthKey || monthKey}`
    if (editingFormHydrationKeyRef.current === hydrationKey) return
    editingFormHydrationKeyRef.current = hydrationKey

    const current = editingRow
    const rowMonth = current.month_key || monthKey
    setBaseSalaryEditText(formatSalaryInputFromNumber(current.base_salary))
    setOvertimeModeInput(resolveOvertimeInputMode(current.overtime_mode))
    setOvertimeDaysInput(
      typeof current.overtime_days === "number" ? String(current.overtime_days).replace(".", ",") : ""
    )
    setOvertimeAmountInput(
      typeof current.overtime_manual_amount === "number" && current.overtime_manual_amount > 0
        ? formatSalaryInputFromNumber(current.overtime_manual_amount)
        : ""
    )
    const autoProrationDays = getWorkedDaysInSalaryMonth(current, rowMonth)
    setProrationDaysInput(
      typeof current.proration_worked_days === "number"
        ? String(current.proration_worked_days)
        : autoProrationDays !== null
          ? String(autoProrationDays)
          : ""
    )
    const note = String(current.overtime_note || "")
    const regex = /van\s+(\d{2})-(\d{2})-(\d{4})\s+tot\s+(\d{2})-(\d{2})-(\d{4})/i
    const match = note.match(regex)
    if (match) {
      const from = formatDutchDateToInput(`${match[1]}-${match[2]}-${match[3]}`)
      const to = formatDutchDateToInput(`${match[4]}-${match[5]}-${match[6]}`)
      setOvertimeFromDate(from)
      setOvertimeToDate(to)
    } else {
      setOvertimeFromDate("")
      setOvertimeToDate("")
    }
    const texts: Record<string, string> = {}
    for (const d of current.deductions || []) {
      texts[d.id] = formatSalaryInputFromNumber(d.amount)
    }
    setDeductionAmountTexts(texts)
  }, [editingRow, editingCrewId, editingSourceMonthKey, monthKey])

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

  const salaryPasswordMonthPart = useMemo(() => {
    const [, month] = (salaryPasswordMonthKey || "").split("-")
    return month || String(new Date().getMonth() + 1).padStart(2, "0")
  }, [salaryPasswordMonthKey])

  const salaryPasswordYearPart = useMemo(() => {
    const [year] = (salaryPasswordMonthKey || "").split("-")
    return year || String(new Date().getFullYear())
  }, [salaryPasswordMonthKey])

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

    const startMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    return getSalaryMonthDivisorDays(startMonthKey)
  }

  /** Kalenderdagen in maand (voor gewerkte dagen / te-goed-telling). */
  const getCalendarDaysInMonth = (selectedMonthKey: string) => {
    const [yearStr, monthStr] = selectedMonthKey.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!year || !month) return 30
    return new Date(year, month, 0).getDate()
  }

  /** Salarisdagtarief: maand = 30 dagen, februari = 28. */
  const getSalaryMonthDivisorDays = (selectedMonthKey: string) => {
    const [, monthStr] = (selectedMonthKey || "").split("-")
    const month = Number(monthStr)
    return month === 2 ? 28 : 30
  }

  /**
   * Gewerkte dagen in salarismaand (kalenderdagen, incl. start; uit-dienst-dag telt niet mee).
   * null = volledige maand, 0 = geen basis deze maand (bv. start na 25e).
   */
  const getWorkedDaysInSalaryMonth = (row: SalaryDraft, selectedMonthKey: string): number | null => {
    const [yearStr, monthStr] = selectedMonthKey.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!year || !month) return null

    const calendarDays = getCalendarDaysInMonth(selectedMonthKey)
    const start = row.in_service_from ? parseCrewDate(row.in_service_from) : null
    const end = row.out_of_service_date ? parseCrewDate(row.out_of_service_date) : null

    const isStartMonth = !!(start && start.getFullYear() === year && start.getMonth() + 1 === month)
    const isEndMonth = !!(end && end.getFullYear() === year && end.getMonth() + 1 === month)

    if (!isStartMonth && !isEndMonth) return null

    let rangeStart = 1
    let rangeEnd = calendarDays

    if (isStartMonth && start) {
      const startDay = start.getDate()
      if (startDay >= 25) return 0
      rangeStart = Math.max(rangeStart, startDay)
    }

    if (isEndMonth && end) {
      // Uit-dienst datum = eerste dag niet meer in dienst (zelfde regel als crew-filters).
      rangeEnd = Math.min(rangeEnd, Math.max(1, end.getDate() - 1))
    }

    if (rangeEnd < rangeStart) return 0
    return rangeEnd - rangeStart + 1
  }

  const getEffectiveWorkedDaysInSalaryMonth = (row: SalaryDraft, selectedMonthKey: string): number | null => {
    if (typeof row.proration_worked_days === "number" && Number.isFinite(row.proration_worked_days)) {
      return Math.max(0, row.proration_worked_days)
    }
    return getWorkedDaysInSalaryMonth(row, selectedMonthKey)
  }

  const hasProrationInMonth = (row: SalaryDraft, selectedMonthKey: string) =>
    getWorkedDaysInSalaryMonth(row, selectedMonthKey) !== null

  const getProratedMonthlyAmount = (
    fullAmount: number,
    row: SalaryDraft,
    selectedMonthKey: string
  ) => {
    if (fullAmount <= 0) return 0
    const workedDays = getEffectiveWorkedDaysInSalaryMonth(row, selectedMonthKey)
    if (workedDays === null) return fullAmount

    const divisorDays = getSalaryMonthDivisorDays(selectedMonthKey)
    if (divisorDays <= 0) return fullAmount
    if (workedDays <= 0) return 0

    return (fullAmount / divisorDays) * workedDays
  }

  const getRowBaseSalaryExclClothing = (row: SalaryDraft) => {
    const crewMember = crewById.get(String(row.crew_id))
    const raw = typeof row.base_salary === "number" ? row.base_salary : 0
    return normalizeBaseSalaryExclClothingForCrew(raw, crewMember) ?? raw
  }

  const getRowClothingAllowance = (row: SalaryDraft) => {
    const crewMember = crewById.get(String(row.crew_id))
    const fromContract = getCrewClothingAllowance(crewMember)
    return fromContract > 0 ? fromContract : CLOTHING_ALLOWANCE_FIXED
  }

  const getProratedBaseSalaryForMonth = (row: SalaryDraft, selectedMonthKey: string) => {
    return getProratedMonthlyAmount(getRowBaseSalaryExclClothing(row), row, selectedMonthKey)
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
    const baseSalaryExcl = getRowBaseSalaryExclClothing(row)
    const clothingAmount = getRowClothingAllowance(row)
    const travelAmount = getPayableTravelAmount(row.travel_amount)
    if (baseSalaryExcl <= 0 && travelAmount <= 0) return ""

    const [yearStr, monthStr] = selectedMonthKey.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!year || !month) return ""

    const start = row.in_service_from ? parseCrewDate(row.in_service_from) : null
    const end = row.out_of_service_date ? parseCrewDate(row.out_of_service_date) : null
    const isStartMonth = !!(start && start.getFullYear() === year && start.getMonth() + 1 === month)
    const isEndMonth = !!(end && end.getFullYear() === year && end.getMonth() + 1 === month)

    if (!isStartMonth && !isEndMonth) return ""

    const divisorDays = getSalaryMonthDivisorDays(selectedMonthKey)
    const extras = [
      clothingAmount > 0 ? `kledinggeld ${formatCurrency(clothingAmount)}` : "",
      travelAmount > 0 ? `reiskosten ${formatCurrency(travelAmount)}` : "",
    ].filter(Boolean)
    const extraSuffix = extras.length > 0 ? ` + ${extras.join(" + ")}` : ""

    if (isStartMonth && start && start.getDate() >= 25) {
      const extraStartSuffix = extras.length > 0 ? ` (+ ${extras.join(" + ")})` : ""
      return `Start op ${start.getDate()}e (na betaaldag 25e): pro-rata excl. kledinggeld via te-goed naar volgende maand${extraStartSuffix}.`
    }

    const workedDays = getEffectiveWorkedDaysInSalaryMonth(row, selectedMonthKey)
    if (workedDays === null) return ""

    const autoWorkedDays = getWorkedDaysInSalaryMonth(row, selectedMonthKey)
    const proratedBase = getProratedBaseSalaryForMonth(row, selectedMonthKey)
    if (proratedBase >= baseSalaryExcl && autoWorkedDays === workedDays) return ""

    const monthLabel = String(month).padStart(2, "0")
    const lastPaidDay = isEndMonth && end ? Math.max(1, end.getDate() - 1) : null

    if (isStartMonth && isEndMonth && start && end && lastPaidDay) {
      return `Pro-rata ${start.getDate()}/${monthLabel}-${lastPaidDay}/${monthLabel}: salaris excl. kledinggeld ${workedDays}d × ${baseSalaryExcl}/${divisorDays}${extraSuffix}.`
    }
    if (isEndMonth && end && lastPaidDay) {
      return `Pro-rata t/m ${lastPaidDay}/${monthLabel}: salaris excl. kledinggeld ${workedDays}d × ${baseSalaryExcl}/${divisorDays}${extraSuffix}.`
    }
    if (isStartMonth && start) {
      return `Pro-rata vanaf ${start.getDate()}/${monthLabel}: salaris excl. kledinggeld ${workedDays}d × ${baseSalaryExcl}/${divisorDays}${extraSuffix}.`
    }
    return ""
  }

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  const getNormalizedManualNote = (manualValue: string, autoValue: string) => {
    let manual = String(manualValue || "").trim()
    const auto = String(autoValue || "").trim()
    if (!manual) return ""
    if (auto) {
      const autoRegex = new RegExp(`\\s*\\|?\\s*${escapeRegExp(auto)}\\s*\\|?\\s*`, "gi")
      manual = manual.replace(autoRegex, " | ").replace(/\s*\|\s*\|\s*/g, " | ").trim()
      manual = manual.replace(/^\|\s*/, "").replace(/\s*\|$/, "").trim()
    }
    // voorkom dubbele segmenten bij herhaald opslaan
    const uniqueParts = Array.from(
      new Set(
        manual
          .split("|")
          .map((p) => p.trim())
          .filter(Boolean)
      )
    )
    return uniqueParts.join(" | ")
  }

  const getAutoSickNote = (row: SalaryDraft, selectedMonthKey: string) => {
    const breakdown = getSickDaysInMonth(
      row.crew_id,
      selectedMonthKey,
      sickLeave || [],
      row.in_service_from,
      row.out_of_service_date
    )
    return getSickSalaryNote(breakdown)
  }

  const getEffectiveMonthlyNote = (row: SalaryDraft, selectedMonthKey: string) => {
    const autoParts = [
      getAutoProrationNote(row, selectedMonthKey).trim(),
      getAutoSickNote(row, selectedMonthKey).trim(),
    ].filter(Boolean)
    let manual = stripAutoSickNotesFromManual(humanizeSalaryDisplayNote(String(row.notes || "")))
    for (const auto of autoParts) {
      manual = getNormalizedManualNote(manual, auto)
    }
    return [...autoParts, manual].filter(Boolean).join(" | ")
  }

  const formatDeductionsDisplay = (row: SalaryDraft) => {
    const deductions = row.deductions || []
    if (deductions.length === 0) {
      return row.advance_enabled ? `${getDeductionCategoryLabel(row.deduction_category)} (-${formatCurrency(Number(row.advance_amount || 0))})` : ""
    }
    return deductions
      .map((d) => `${getDeductionCategoryLabel(d.category)} (-${formatCurrency(d.amount)})`)
      .join(" | ")
  }

  const getSalaryTotals = (row: SalaryDraft) => {
    const selectedMonthKey = row.month_key || monthKey
    const baseSalaryExcl = getRowBaseSalaryExclClothing(row)
    const sickBreakdown = getSickDaysInMonth(
      row.crew_id,
      selectedMonthKey,
      sickLeave || [],
      row.in_service_from,
      row.out_of_service_date
    )
    const clothingAmount = getPayableClothingAllowance(getRowClothingAllowance(row), sickBreakdown)
    const divisorDays = getSalaryMonthDivisorDays(selectedMonthKey)
    const workedDays = getEffectiveWorkedDaysInSalaryMonth(row, selectedMonthKey)
    const payableBaseSalary = applySickAdjustmentToSalary(
      baseSalaryExcl,
      divisorDays,
      workedDays,
      sickBreakdown,
      clothingAmount
    )
    const clothingInTotal = sickBreakdown.totalSickDays > 0 ? 0 : clothingAmount
    const travelAmount = getPayableTravelAmount(row.travel_amount)
    const advanceAmount = getTotalDeductionAmount(row.deductions || [])
    const raiseAmount = row.raise_enabled ? (typeof row.raise_amount === "number" ? row.raise_amount : 0) : 0
    const teGoedDays = getTeGoedDays(row.in_service_from, selectedMonthKey)
    const sourceDaysInMonth = getTeGoedSourceDaysInMonth(row.in_service_from, selectedMonthKey)
    const amountPerDay = sourceDaysInMonth > 0 ? baseSalaryExcl / sourceDaysInMonth : 0
    const teGoedProRata = teGoedDays > 0 ? amountPerDay * teGoedDays : 0
    const teGoedClothing = teGoedDays > 0 ? clothingAmount : 0
    const teGoedAmount = teGoedProRata + teGoedClothing
    const totalSalaryMonth =
      payableBaseSalary + clothingInTotal + travelAmount + raiseAmount - advanceAmount + teGoedAmount
    return {
      baseSalary: baseSalaryExcl,
      payableBaseSalary,
      clothingAmount,
      travelAmount,
      advanceAmount,
      raiseAmount,
      teGoedDays,
      amountPerDay,
      teGoedAmount,
      totalSalaryMonth,
    }
  }

  const getOverworkAmount = (row: SalaryDraft) => {
    if (!row.overtime_enabled) return 0
    if (resolveOvertimeInputMode(row.overtime_mode) === "amount") {
      return Number(row.overtime_manual_amount || 0)
    }
    const baseSalaryExcl = getRowBaseSalaryExclClothing(row)
    const overtimeDays = Number(row.overtime_days || 0)
    const crewMember = crewById.get(String(row.crew_id))
    return calculateOverwerkAmount(crewMember?.position, overtimeDays, baseSalaryExcl)
  }

  const getOverworkAmountForCrew = (crewId: string, baseSalary: number, overtimeDays: number) => {
    const crewMember = crewById.get(String(crewId))
    const baseSalaryExcl = Math.max(0, baseSalary - CLOTHING_ALLOWANCE_FIXED)
    return calculateOverwerkAmount(crewMember?.position, overtimeDays, baseSalaryExcl)
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
      (row.deductions?.length || 0) > 0 ||
      (row.advance_enabled && Number(row.advance_amount || 0) !== 0) ||
      (row.raise_enabled && Number(row.raise_amount || 0) !== 0) ||
      (row.overtime_enabled && isOvertimePayableRow(row)) ||
      teGoedDays > 0

    if (isSickOrAbsent) return "bg-red-100"
    if (isCompanySwitchMonth) return "bg-orange-100"
    if (isNewThisMonth) return "bg-blue-100"
    if (hasSpecial) return "bg-emerald-100"
    return ""
  }

  const handleRowClickOpenEdit = (event: any, crewId: string, sourceMonthKey?: string) => {
    if (monthIsClosed) return
    const target = event.target as HTMLElement | null
    if (!target) return
    const interactiveEl = target.closest("button, input, select, textarea, a, label")
    if (interactiveEl) return
    setEditingCrewId(crewId)
    setEditingSourceMonthKey(sourceMonthKey && sourceMonthKey !== monthKey ? sourceMonthKey : null)
  }

  const setCrewField = (
    crewId: string,
    patch: Partial<SalaryDraft>,
    sourceMonthKey?: string | null
  ) => {
    if (salaryReadOnlyUser) return
    const rowMonthKey = sourceMonthKey ?? editingSourceMonthKey ?? monthKey
    const shouldResetSalaryApprovals =
      Object.prototype.hasOwnProperty.call(patch, "advance_enabled") ||
      Object.prototype.hasOwnProperty.call(patch, "advance_amount") ||
      Object.prototype.hasOwnProperty.call(patch, "deduction_category") ||
      Object.prototype.hasOwnProperty.call(patch, "deductions") ||
      Object.prototype.hasOwnProperty.call(patch, "proration_worked_days")
    const shouldResetOvertimeApprovals =
      Object.prototype.hasOwnProperty.call(patch, "overtime_enabled") ||
      Object.prototype.hasOwnProperty.call(patch, "overtime_mode") ||
      Object.prototype.hasOwnProperty.call(patch, "overtime_days") ||
      Object.prototype.hasOwnProperty.call(patch, "overtime_manual_amount") ||
      Object.prototype.hasOwnProperty.call(patch, "overtime_note")

    const applyPatch = (prev: Record<string, SalaryDraft>) => ({
      ...prev,
      [crewId]: {
        ...prev[crewId],
        ...patch,
        ...(shouldResetSalaryApprovals
          ? {
              approval_leo: false,
              approval_karina: false,
              approval_leo_paid_at: "",
              approval_karina_paid_at: "",
            }
          : {}),
        ...(shouldResetOvertimeApprovals
          ? {
              overtime_approval_leo: false,
              overtime_approval_karina: false,
              overtime_approval_leo_paid_at: "",
              overtime_approval_karina_paid_at: "",
            }
          : {}),
      },
    })

    if (rowMonthKey !== monthKey) {
      setPreviousMonthRowsByCrewId(applyPatch)
    } else {
      setRowsByCrewId(applyPatch)
    }
  }

  const persistRow = async (crewId: string, row: SalaryDraft) => {
    let rowForPersist = row
    const needsApprovalGuard =
      !canUserSetSalaryApproval(currentUserEmail, "approval_leo") ||
      !canUserSetSalaryApproval(currentUserEmail, "approval_karina")
    if (needsApprovalGuard) {
      const { data: existing } = await supabase
        .from("loon_bemerkingen")
        .select("approval_leo, approval_karina, approval_leo_paid_at, approval_karina_paid_at, reason")
        .eq("crew_id", crewId)
        .eq("month_key", row.month_key)
        .maybeSingle()
      const existingMeta = parseSalaryMetaFromReason(existing?.reason)
      rowForPersist = applyApprovalOwnership(row, currentUserEmail, {
        approval_leo: existing?.approval_leo === true,
        approval_karina: existing?.approval_karina === true,
        approval_leo_paid_at: String(existing?.approval_leo_paid_at || ""),
        approval_karina_paid_at: String(existing?.approval_karina_paid_at || ""),
        overtime_approval_leo: existingMeta?.overtime_approval_leo === true,
        overtime_approval_karina: existingMeta?.overtime_approval_karina === true,
        overtime_approval_leo_paid_at: String(existingMeta?.overtime_approval_leo_paid_at || ""),
        overtime_approval_karina_paid_at: String(existingMeta?.overtime_approval_karina_paid_at || ""),
      })
    }

    // IBAN in crew is optioneel: sommige databases hebben (nog) geen `iban` kolom.
    // In dat geval blokkeren we het opslaan van salarissen niet.
    const { error: crewUpdateError } = await supabase
      .from("crew")
      .update({
        iban: rowForPersist.iban?.trim() ? rowForPersist.iban.trim() : null,
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

    const crewMember = crewById.get(String(crewId))
    const baseSalaryExcl =
      normalizeBaseSalaryExclClothingForCrew(rowForPersist.base_salary, crewMember) ?? rowForPersist.base_salary

    const legacyAdvance = syncLegacyAdvanceFields(rowForPersist.deductions || [])

    const payload = {
      crew_id: rowForPersist.crew_id,
      company: rowForPersist.company,
      month_key: rowForPersist.month_key,
      base_salary: baseSalaryExcl ?? null,
      travel_allowance: getPayableTravelAmount(rowForPersist.travel_amount) > 0,
      advance_enabled: legacyAdvance.advance_enabled,
      advance_amount: legacyAdvance.advance_amount,
      raise_enabled: !!rowForPersist.raise_enabled,
      raise_amount: rowForPersist.raise_amount ?? 0,
      overtime_enabled: !!rowForPersist.overtime_enabled,
      overtime_days: rowForPersist.overtime_days ?? 0,
      overtime_note: String(rowForPersist.overtime_note || "").trim(),
      inflation_adjustment: rowForPersist.inflation_adjustment ?? 0,
      inflation_batch_id: String(rowForPersist.inflation_batch_id || "").trim(),
      month_closed: !!rowForPersist.month_closed,
      month_closed_by: String(rowForPersist.month_closed_by || "").trim(),
      month_closed_at: String(rowForPersist.month_closed_at || "").trim(),
      approval_leo: !!rowForPersist.approval_leo,
      approval_karina: !!rowForPersist.approval_karina,
      iban: rowForPersist.iban?.trim() || "",
      reason:
        (getEffectiveMonthlyNote(rowForPersist, rowForPersist.month_key) || "Salarisadministratie") +
        `\n${SALARY_META_PREFIX}${JSON.stringify({
          iban: rowForPersist.iban?.trim() || "",
          review_comment: String(rowForPersist.review_comment || "").trim(),
          review_by: String(rowForPersist.review_by || "").trim(),
          review_type: rowForPersist.review_type || "opmerking",
          advance_enabled: legacyAdvance.advance_enabled,
          advance_amount: legacyAdvance.advance_amount,
          deduction_category: legacyAdvance.deduction_category,
          deductions: rowForPersist.deductions || [],
          raise_enabled: !!rowForPersist.raise_enabled,
          raise_amount: rowForPersist.raise_amount ?? 0,
          overtime_enabled: !!rowForPersist.overtime_enabled,
          overtime_mode: resolveOvertimeInputMode(rowForPersist.overtime_mode),
          overtime_days: rowForPersist.overtime_days ?? 0,
          overtime_manual_amount: rowForPersist.overtime_manual_amount ?? 0,
          overtime_note: String(rowForPersist.overtime_note || "").trim(),
          inflation_adjustment: rowForPersist.inflation_adjustment ?? 0,
          inflation_batch_id: String(rowForPersist.inflation_batch_id || "").trim(),
          month_closed: !!rowForPersist.month_closed,
          month_closed_by: String(rowForPersist.month_closed_by || "").trim(),
          month_closed_at: String(rowForPersist.month_closed_at || "").trim(),
          approval_leo: !!rowForPersist.approval_leo,
          approval_karina: !!rowForPersist.approval_karina,
          approval_leo_paid_at: String(rowForPersist.approval_leo_paid_at || "").trim(),
          approval_karina_paid_at: String(rowForPersist.approval_karina_paid_at || "").trim(),
          overtime_approval_leo: !!rowForPersist.overtime_approval_leo,
          overtime_approval_karina: !!rowForPersist.overtime_approval_karina,
          overtime_approval_leo_paid_at: String(rowForPersist.overtime_approval_leo_paid_at || "").trim(),
          overtime_approval_karina_paid_at: String(
            rowForPersist.overtime_approval_karina_paid_at || ""
          ).trim(),
          proration_worked_days:
            typeof rowForPersist.proration_worked_days === "number"
              ? rowForPersist.proration_worked_days
              : null,
          travel_amount: rowForPersist.travel_amount ?? 0,
        })}` +
        (String(rowForPersist.review_comment || "").trim()
          ? `\n${REVIEW_META_PREFIX}${JSON.stringify({
              review_comment: String(rowForPersist.review_comment || "").trim(),
              review_by: String(rowForPersist.review_by || "").trim(),
              review_type: rowForPersist.review_type || "opmerking",
            })}`
          : ""),
      notes: getNormalizedManualNote(
        String(rowForPersist.notes || ""),
        getAutoProrationNote(rowForPersist, rowForPersist.month_key)
      ),
      review_comment: String(rowForPersist.review_comment || "").trim(),
      review_by: String(rowForPersist.review_by || "").trim(),
      review_type: rowForPersist.review_type || "opmerking",
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
    if (salaryReadOnlyUser) {
      alert(isTanja ? "Alleen-lezen modus: wijzigingen opslaan is uitgeschakeld." : "Alleen-lezen modus: wijzigingen opslaan is uitgeschakeld.")
      return false
    }
    if (monthIsClosed) {
      alert(isTanja ? "Dieser Monat ist abgeschlossen und nicht mehr bearbeitbar." : "Deze maand is afgesloten en niet meer aanpasbaar.")
      return false
    }
    const raiseAmount = row.raise_enabled ? (typeof row.raise_amount === "number" ? row.raise_amount : 0) : 0
    const advanceAmount = getTotalDeductionAmount(row.deductions || [])
    const teGoedDaysForValidation = getTeGoedDays(row.in_service_from, row.month_key)
    const hasNotes = !!String(row.notes || "").trim()
    const overtimeMode = resolveOvertimeInputMode(row.overtime_mode)
    const overtimeDays = row.overtime_enabled ? Number(row.overtime_days || 0) : 0
    const overtimeManualAmount = row.overtime_enabled ? Number(row.overtime_manual_amount || 0) : 0
    const overtimeNotes = String(row.overtime_note || "").toLowerCase()
    const hasFromToRangeInNotes = overtimeNotes.includes("van") && overtimeNotes.includes("tot")

    if (row.overtime_enabled && overtimeMode === "amount") {
      if (overtimeManualAmount <= 0) {
        alert(
          isTanja
            ? "Bei manueller Überstunden-Eingabe ist ein Betrag Pflicht."
            : "Bij handmatig extra werk is een bedrag verplicht."
        )
        return false
      }
    } else if (row.overtime_enabled && overtimeDays > 0) {
      if (!String(row.overtime_note || "").trim() || !hasFromToRangeInNotes) {
        alert(
          isTanja
            ? "Bei Überstunden ist ein Hinweis mit Zeitraum Pflicht (von ... bis ...)."
            : "Bij overwerk is een opmerking verplicht met periode (van ... tot ...)."
        )
        return false
      }
    } else if (row.overtime_enabled) {
      alert(
        isTanja
          ? "Bei Überstunden geben Sie entweder Tage + Zeitraum oder einen manuellen Betrag an."
          : "Bij extra werk vul je dagen + periode in, of kies handmatig bedrag."
      )
      return false
    }

    if (row.overtime_enabled && isOvertimePayableRow(row) && overtimeMode === "days" && overtimeDays > 0) {
      const payoutMonth = getOvertimePayoutMonthKey(String(row.overtime_note || ""), row.month_key)
      if (payoutMonth !== row.month_key) {
        const payoutLabel = monthNumberToName(payoutMonth.split("-")[1] || "", isTanja)
        alert(
          isTanja
            ? `Extra werk na de 25e wordt uitbetaald in ${payoutLabel} (overige betalingen).`
            : `Extra werk na de 25e wordt uitbetaald in ${payoutLabel} (overige betalingen).`
        )
      }
    }

    if ((row.deductions || []).length > 0) {
      for (const deduction of row.deductions) {
        if (!String(deduction.category || "").trim()) {
          alert(isTanja ? "Kategorie für Einbehalt ist verpflichtend." : "Categorie voor in te houden is verplicht.")
          return false
        }
        if (!Number.isFinite(deduction.amount) || deduction.amount <= 0) {
          alert(isTanja ? "Betrag voor Einbehalt moet groter dan 0 zijn." : "Bedrag voor in te houden moet groter dan 0 zijn.")
          return false
        }
      }
    } else if (row.advance_enabled) {
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

  const getRowForApproval = (crewId: string, sourceMonthKey?: string) => {
    const key = sourceMonthKey || monthKey
    if (key === monthKey) return rowsByCrewId[crewId] || null
    return previousMonthRowsByCrewId[crewId] || null
  }

  const setRowInState = (crewId: string, row: SalaryDraft, sourceMonthKey?: string) => {
    const key = sourceMonthKey || monthKey
    if (key === monthKey) {
      setRowsByCrewId((prev) => ({ ...prev, [crewId]: row }))
      return
    }
    setPreviousMonthRowsByCrewId((prev) => ({ ...prev, [crewId]: row }))
  }

  const requestApprovalToggle = (
    crewId: string,
    field: "approval_leo" | "approval_karina",
    value: boolean,
    sourceMonthKey?: string
  ) => {
    if (monthIsClosed) {
      alert(isTanja ? "Dieser Monat ist abgeschlossen en niet meer bewerkbaar." : "Deze maand is afgesloten en niet meer aanpasbaar.")
      return
    }
    if (!value) {
      void applyApprovalToggle(crewId, field, false, "", sourceMonthKey)
      return
    }
    // Overige betalingen: handmatige betaaldatum. Normaal salaris: altijd de 25e van de maand.
    if (sourceMonthKey !== undefined) {
      const today = new Date()
      const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
      setApprovalDatePrompt({ crewId, field, paymentDate: defaultDate, sourceMonthKey })
      return
    }
    void applyApprovalToggle(crewId, field, true, getSalaryPaymentDateForMonth(monthKey), sourceMonthKey)
  }

  const applyApprovalToggle = async (
    crewId: string,
    field: "approval_leo" | "approval_karina",
    value: boolean,
    paymentDate: string,
    sourceMonthKey?: string
  ) => {
    const row = getRowForApproval(crewId, sourceMonthKey)
    if (!row) return
    const kind = sourceMonthKey !== undefined ? "overtime" : "salary"
    const { flag, paidAt } = resolveStorageApprovalKeys(field, kind)
    const updatedRow: SalaryDraft = {
      ...row,
      [flag]: value,
      [paidAt]: value ? paymentDate : "",
    }
    setRowInState(crewId, updatedRow, sourceMonthKey)
    try {
      setSavingCrewId(crewId)
      await persistRow(crewId, updatedRow)
      setLastSavedAt(new Date().toISOString())
      if (sourceMonthKey && sourceMonthKey !== monthKey) {
        await loadRows()
      }
    } catch (e) {
      alert(`${isTanja ? "Fehler beim Speichern" : "Fout bij opslaan"}: ${getErrMsg(e)}`)
      setRowInState(crewId, row, sourceMonthKey)
    } finally {
      setSavingCrewId(null)
    }
  }

  const handleApprovalToggle = async (
    crewId: string,
    field: "approval_leo" | "approval_karina",
    value: boolean,
    sourceMonthKey?: string
  ) => {
    requestApprovalToggle(crewId, field, value, sourceMonthKey)
  }

  const requestBulkSalaryApproval = () => {
    if (!canBulkApproveSalary || !ownSalaryApprovalField || monthIsClosed) return
    const company = activeCompanyTab || companyNames[0] || ""
    const rows = groupedByCompany[company] || []
    if (rows.length === 0) {
      alert("Geen salarisrijen om af te vinken voor deze firma.")
      return
    }
    setBulkSalaryApprovalPrompt({
      company,
      paymentDate: getSalaryPaymentDateForMonth(monthKey),
    })
  }

  const applyBulkSalaryApproval = async (paymentDate: string, company: string) => {
    if (!ownSalaryApprovalField || !paymentDate.trim()) return
    const paidAtField =
      ownSalaryApprovalField === "approval_leo" ? "approval_leo_paid_at" : "approval_karina_paid_at"
    const rows = (groupedByCompany[company] || []).map(
      (r) => rowsByCrewId[String(r.crew_id)] || r
    )
    if (rows.length === 0) return

    try {
      setBulkApprovingSalary(true)
      const updatedRows: SalaryDraft[] = rows.map((row) => ({
        ...row,
        [ownSalaryApprovalField]: true,
        [paidAtField]: paymentDate,
      }))
      setRowsByCrewId((prev) => {
        const next = { ...prev }
        for (const row of updatedRows) next[String(row.crew_id)] = row
        return next
      })
      await Promise.all(updatedRows.map((row) => persistRow(String(row.crew_id), row)))
      setLastSavedAt(new Date().toISOString())
    } catch (e) {
      alert(`Fout bij bulk afvinken: ${getErrMsg(e)}`)
      await loadRows()
    } finally {
      setBulkApprovingSalary(false)
    }
  }

  const applyInflationCorrectionForAll = async () => {
    if (salaryReadOnlyUser) {
      alert(isTanja ? "Alleen-lezen modus: inflatiecorrectie is uitgeschakeld." : "Alleen-lezen modus: inflatiecorrectie is uitgeschakeld.")
      return
    }
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
      .filter((r) => typeof r.base_salary === "number" && Number(r.base_salary || 0) > CLOTHING_ALLOWANCE_FIXED)

    if (targetRows.length === 0) {
      alert(isTanja ? "Geen medewerkers met basissalaris gevonden." : "Geen medewerkers met basissalaris gevonden.")
      return
    }

    const ok = window.confirm(
      isTanja
        ? `Inflatiecorrectie van ${percent}% toepassen op ${targetRows.length} medewerkers (excl. kledinggeld)?`
        : `Inflatiecorrectie van ${percent}% toepassen op ${targetRows.length} medewerkers (excl. kledinggeld)?`
    )
    if (!ok) return

    try {
      setApplyingInflation(true)
      const batchId = `infl-${monthKey}-${Date.now()}`
      const updatedRows: SalaryDraft[] = targetRows.map((row) => {
        const base = getRowBaseSalaryExclClothing(row)
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
    if (salaryReadOnlyUser) {
      alert(isTanja ? "Alleen-lezen modus: ongedaan maken is uitgeschakeld." : "Alleen-lezen modus: ongedaan maken is uitgeschakeld.")
      return
    }
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

  const syncOvertimeDateNoteToRow = (from: string, to: string) => {
    if (!editingCrewId || !from || !to) return
    const note = buildOvertimeNoteFromDateRange(from, to)
    if (!note) return
    setCrewField(
      editingCrewId,
      { overtime_note: note, overtime_mode: "days" },
      editingSourceMonthKey || undefined
    )
  }

  const syncOvertimeInputToRow = (crewId: string): SalaryDraft | null => {
    if (!crewId) return null
    const base = editingSourceMonthKey
      ? previousMonthRowsByCrewId[crewId]
      : rowsByCrewId[crewId]
    if (!base) return null

    if (overtimeModeInput === "amount") {
      const manualAmount = parseSalaryMoneyInputOrZero(overtimeAmountInput)
      const nextRow: SalaryDraft = {
        ...base,
        overtime_enabled: manualAmount > 0 || base.overtime_enabled,
        overtime_mode: "amount",
        overtime_manual_amount: manualAmount,
        overtime_days: 0,
        overtime_note: manualAmount > 0 ? "handmatig bedrag" : "",
      }
      setCrewField(crewId, nextRow, editingSourceMonthKey)
      return nextRow
    }

    const parsed = overtimeDaysInput.trim() === "" ? 0 : parseDecimalInput(overtimeDaysInput)
    const note =
      overtimeFromDate && overtimeToDate
        ? buildOvertimeNoteFromDateRange(overtimeFromDate, overtimeToDate) ||
          String(base.overtime_note || "")
        : String(base.overtime_note || "")
    const nextRow: SalaryDraft = {
      ...base,
      overtime_enabled: parsed > 0 || base.overtime_enabled,
      overtime_mode: "days",
      overtime_manual_amount: 0,
      overtime_days: parsed,
      overtime_note: note,
    }
    setCrewField(crewId, nextRow, editingSourceMonthKey)
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
          in_service_from: crewById.get(crewId)?.in_dienst_vanaf || null,
          out_of_service_date: crewById.get(crewId)?.out_of_service_date || null,
          iban: String(item?.iban ?? meta?.iban ?? ""),
          base_salary:
            normalizeBaseSalaryExclClothingForCrew(
              typeof item?.base_salary === "number" ? item.base_salary : 0,
              crewById.get(crewId)
            ) ?? (typeof item?.base_salary === "number" ? item.base_salary : 0),
          travel_amount: resolveTravelAmountFromRow(item, meta),
          advance_enabled: (item?.advance_enabled ?? meta?.advance_enabled ?? false) === true,
          advance_amount: typeof item?.advance_amount === "number" ? item.advance_amount : (meta?.advance_amount || 0),
          deduction_category: meta?.deduction_category || "voorschot",
          deductions: normalizeDeductionsFromMeta(meta, item),
          raise_enabled: (item?.raise_enabled ?? meta?.raise_enabled ?? false) === true,
          raise_amount: typeof item?.raise_amount === "number" ? item.raise_amount : (meta?.raise_amount || 0),
          overtime_enabled: (item?.overtime_enabled ?? meta?.overtime_enabled ?? false) === true,
          overtime_mode: resolveOvertimeInputMode(meta?.overtime_mode),
          overtime_days: typeof item?.overtime_days === "number" ? item.overtime_days : (meta?.overtime_days || 0),
          overtime_manual_amount:
            typeof meta?.overtime_manual_amount === "number" ? meta.overtime_manual_amount : 0,
          overtime_note: String(item?.overtime_note ?? meta?.overtime_note ?? ""),
          inflation_adjustment: typeof item?.inflation_adjustment === "number" ? item.inflation_adjustment : (meta?.inflation_adjustment || 0),
          inflation_batch_id: String(item?.inflation_batch_id ?? meta?.inflation_batch_id ?? ""),
          month_closed: (item?.month_closed ?? meta?.month_closed ?? false) === true,
          month_closed_by: String(item?.month_closed_by ?? meta?.month_closed_by ?? ""),
          month_closed_at: String(item?.month_closed_at ?? meta?.month_closed_at ?? ""),
          approval_leo: !!(item?.approval_leo ?? meta?.approval_leo),
          approval_karina: !!(item?.approval_karina ?? meta?.approval_karina),
          approval_leo_paid_at: String(item?.approval_leo_paid_at ?? meta?.approval_leo_paid_at ?? ""),
          approval_karina_paid_at: String(item?.approval_karina_paid_at ?? meta?.approval_karina_paid_at ?? ""),
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
          travel_amount: Number(r.travel_amount ?? 0),
          raise_amount: Number(row.raise_amount || 0),
          advance_amount: Number(getTotalDeductionAmount(row.deductions || [])),
          overtime_days: Number(row.overtime_days || 0),
          overtime_note: String(row.overtime_note || ""),
          inflation_adjustment: Number(row.inflation_adjustment || 0),
          notes: String(item?.notes || ""),
          total_salary_month: Number(totals.totalSalaryMonth || 0),
          approval_leo_paid_at: String(row.approval_leo_paid_at || ""),
          approval_karina_paid_at: String(row.approval_karina_paid_at || ""),
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
          travel: formatTravelDisplay(r.travel_amount ?? 0),
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
      "Basissalaris excl. kledinggeld",
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
                <td>${escapeHtml(formatTravelDisplay(r.travel_amount ?? 0))}</td>
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
                  <th>Basissalaris excl. kledinggeld</th>
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
    if (!canDownloadSepa) {
      alert("SEPA export is alleen beschikbaar voor Leo en Karina.")
      return
    }

    const sepaDebtors = parseSepaDebtorsFromEnv()
    const debtor = resolveSepaDebtorForCompany(activeCompanyTab, sepaDebtors)
    if (!debtor) {
      const configured = listConfiguredSepaCompanies(sepaDebtors)
      alert(
        configured.length > 0
          ? `Geen SEPA-rekening gevonden voor firma "${activeCompanyTab}".\n\nGeconfigureerde firmas:\n- ${configured.join("\n- ")}\n\nPas NEXT_PUBLIC_SEPA_DEBTORS_JSON aan in .env.local.`
          : "SEPA export mist instellingen. Voeg NEXT_PUBLIC_SEPA_DEBTORS_JSON toe in .env.local (per firma: naam, IBAN, BIC)."
      )
      return
    }
    const debtorName = debtor.name
    const debtorIban = normalizeIban(debtor.iban)
    const debtorBic = debtor.bic.trim().toUpperCase()
    if (!isValidIban(debtorIban)) {
      alert(`SEPA export geblokkeerd: Debiteur IBAN is ongeldig voor ${debtorName}.`)
      return
    }

    const rows = groupedByCompany[activeCompanyTab] || []
    const skippedNotApproved: string[] = []
    const skippedInvalid: string[] = []
    const salaryMsg = `${DEFAULT_SEPA_MESSAGE_PREFIX} ${monthKey}`

    const resolveCompanyForCrew = (crewId: string, rowCompany?: string) => {
      const fallbackCrew = crewById.get(String(crewId))
      return (rowCompany || fallbackCrew?.company || "Onbekende firma").trim() || "Onbekende firma"
    }

    const salaryPayments = rows
      .map((r: SalaryDraft) => {
        const crewMember = crewById.get(String(r.crew_id))
        const name = crewMember ? formatCrewName(crewMember) : "Onbekend"
        const { totalSalaryMonth } = getSalaryTotals(r)
        const amount = Number(totalSalaryMonth.toFixed(2))
        const iban = normalizeIban(r.iban || "")
        const hasKarinaApproval = !!r.approval_karina
        const validIban = isValidIban(iban)
        const validAmount = amount > 0

        if (!hasKarinaApproval) {
          skippedNotApproved.push(`${name} (salaris)`)
          return null
        }
        if (!validIban || !validAmount) {
          const reasons = [
            !validIban ? "ongeldige IBAN" : "",
            !validAmount ? "bedrag moet > 0 zijn" : "",
          ].filter(Boolean).join(", ")
          skippedInvalid.push(`${name} (salaris): ${reasons}`)
          return null
        }
        return {
          name,
          iban,
          amount,
          message: salaryMsg,
          executionDate: resolveSepaExecutionDate(r.approval_karina_paid_at, monthKey),
        }
      })
      .filter(
        (p): p is { name: string; iban: string; amount: number; message: string; executionDate: string } =>
          !!p
      )

    const overtimeForCompany = overigeBetalingenRows.filter((r) => {
      const sourceRow = getRowForApproval(String(r.crew_id), r.sourceMonthKey)
      return resolveCompanyForCrew(String(r.crew_id), sourceRow?.company) === activeCompanyTab
    })

    const extraWorkPayments = overtimeForCompany
      .map((r) => {
        const crewMember = crewById.get(String(r.crew_id))
        const name = crewMember ? formatCrewName(crewMember) : "Onbekend"
        const sourceRow = getRowForApproval(String(r.crew_id), r.sourceMonthKey)
        const amount = Number((sourceRow ? getOverworkAmount(sourceRow) : 0).toFixed(2))
        const iban = normalizeIban(r.iban || sourceRow?.iban || "")
        const hasKarinaApproval = !!sourceRow?.overtime_approval_karina
        const validIban = isValidIban(iban)
        const validAmount = amount > 0

        if (!hasKarinaApproval) {
          skippedNotApproved.push(`${name} (extra werk)`)
          return null
        }
        if (!validIban || !validAmount) {
          const reasons = [
            !validIban ? "ongeldige IBAN" : "",
            !validAmount ? "bedrag moet > 0 zijn" : "",
          ].filter(Boolean).join(", ")
          skippedInvalid.push(`${name} (extra werk): ${reasons}`)
          return null
        }
        return {
          name,
          iban,
          amount,
          message: buildSepaExtraWorkMessage(r.overtime_note, r.sourceMonthKey),
          executionDate: resolveSepaExecutionDate(
            sourceRow?.overtime_approval_karina_paid_at,
            r.sourceMonthKey || monthKey
          ),
        }
      })
      .filter(
        (p): p is { name: string; iban: string; amount: number; message: string; executionDate: string } =>
          !!p
      )

    const payments = [...salaryPayments, ...extraWorkPayments]

    if (payments.length === 0) {
      const lines = [
        "Geen betalingen om te exporteren.",
        "Alleen door Karina afgevinkte salaris- en extra-werkrijen met geldig IBAN en bedrag > €0 worden meegenomen.",
      ]
      if (skippedNotApproved.length > 0) {
        lines.push(`\n${skippedNotApproved.length} nog niet afgevinkt door Karina.`)
      }
      if (skippedInvalid.length > 0) {
        lines.push(`\nNiet exporteerbaar ondanks vinkjes:\n- ${skippedInvalid.join("\n- ")}`)
      }
      alert(lines.join("\n"))
      return
    }

    const now = new Date()
    const creationDateTime = now.toISOString()
    const msgId = `SAL-${monthKey.replace("-", "")}-${now.getTime()}`
    const ctrlSum = payments.reduce((sum, p) => sum + p.amount, 0)

    const paymentsByDate = new Map<string, typeof payments>()
    for (const payment of payments) {
      const group = paymentsByDate.get(payment.executionDate) || []
      group.push(payment)
      paymentsByDate.set(payment.executionDate, group)
    }

    let txIndex = 0
    const companySlug = activeCompanyTab.replace(/\s+/g, "").slice(0, 12)
    const pmtInfXml = [...paymentsByDate.keys()]
      .sort()
      .map((executionDate) => {
        const groupPayments = paymentsByDate.get(executionDate) || []
        const groupSum = groupPayments.reduce((sum, p) => sum + p.amount, 0)
        const pmtInfId = `PMT-${monthKey.replace("-", "")}-${companySlug}-${executionDate.replace(/-/g, "")}`
        const txsXml = groupPayments
          .map((p) => {
            txIndex += 1
            const endToEndId = `E2E-${monthKey.replace("-", "")}-${String(txIndex).padStart(4, "0")}`
            return `
        <CdtTrfTxInf>
          <PmtId><EndToEndId>${escapeXml(endToEndId)}</EndToEndId></PmtId>
          <Amt><InstdAmt Ccy="${SEPA_CCY}">${p.amount.toFixed(2)}</InstdAmt></Amt>
          <Cdtr><Nm>${escapeXml(p.name)}</Nm></Cdtr>
          <CdtrAcct><Id><IBAN>${escapeXml(p.iban)}</IBAN></Id></CdtrAcct>
          <RmtInf><Ustrd>${escapeXml(p.message)}</Ustrd></RmtInf>
        </CdtTrfTxInf>`
          })
          .join("")

        return `
    <PmtInf>
      <PmtInfId>${escapeXml(pmtInfId)}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${groupPayments.length}</NbOfTxs>
      <CtrlSum>${groupSum.toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${executionDate}</ReqdExctnDt>
      <Dbtr><Nm>${escapeXml(debtorName)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${escapeXml(debtorIban)}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BIC>${escapeXml(debtorBic)}</BIC></FinInstnId></DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>${txsXml}
    </PmtInf>`
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
    </GrpHdr>${pmtInfXml}
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

    const executionDates = [...paymentsByDate.keys()].sort()
    const summaryParts = [
      `SEPA bestand gedownload met ${payments.length} betaling(en) voor ${activeCompanyTab}.`,
      `${salaryPayments.length} salaris, ${extraWorkPayments.length} extra werk.`,
      `Uitvoerdatum(s): ${executionDates.map((d) => formatDateShort(d)).join(", ")}.`,
      `Totaal: ${formatCurrency(ctrlSum)}`,
    ]
    if (skippedNotApproved.length > 0) {
      summaryParts.push(
        `${skippedNotApproved.length} overgeslagen (nog niet afgevinkt door Karina).`
      )
    }
    if (skippedInvalid.length > 0) {
      summaryParts.push(
        `${skippedInvalid.length} niet meegenomen ondanks vinkjes — los eerst op:\n- ${skippedInvalid.join("\n- ")}`
      )
    }
    alert(summaryParts.join("\n\n"))
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
        body: JSON.stringify({ monthKey: salaryPasswordMonthKey, password }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || !json?.success) {
        throw new Error(String(json?.error || "Instellen mislukt"))
      }
      const sessionKey = getSalaryPasswordSessionKey(salaryPasswordMonthKey)
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
        body: JSON.stringify({ monthKey: salaryPasswordMonthKey, password }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || !json?.success) {
        throw new Error(String(json?.error || "Verificatie mislukt"))
      }
      const sessionKey = getSalaryPasswordSessionKey(salaryPasswordMonthKey)
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
        body: JSON.stringify({ monthKey: salaryPasswordMonthKey, targetEmail }),
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
                  ? `Für ${monthNumberToName(salaryPasswordMonthPart, true)} ${salaryPasswordYearPart} zuerst ein persönliches Passwort setzen.`
                  : `Voor ${monthNumberToName(salaryPasswordMonthPart)} ${salaryPasswordYearPart} eerst een persoonlijk wachtwoord instellen.`)
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

      {previousMonthWarning && (
        <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <div className="font-semibold">
            {isTanja ? "Hinweis vorige maand" : "Melding vorige maand"}
          </div>
          <div className="mt-1">
            {previousMonthWarning.notClosed && (
              <div>
                {isTanja
                  ? `${monthNumberToName(previousMonthWarning.monthKey.split("-")[1] || "", true)} ${previousMonthWarning.monthKey.split("-")[0]} is nog niet afgesloten.`
                  : `${monthNumberToName(previousMonthWarning.monthKey.split("-")[1] || "")} ${previousMonthWarning.monthKey.split("-")[0]} is nog niet afgesloten.`}
              </div>
            )}
            {previousMonthWarning.unapprovedCount > 0 && (
              <div>
                {isTanja
                  ? `${previousMonthWarning.unapprovedCount} betaling(en) in ${monthKeyToDisplay(previousMonthWarning.monthKey)} nog niet volledig afgevinkt.`
                  : `${previousMonthWarning.unapprovedCount} betaling(en) in ${monthKeyToDisplay(previousMonthWarning.monthKey)} nog niet volledig afgevinkt.`}
              </div>
            )}
          </div>
        </div>
      )}

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
            {canDownloadSepa && (
              <Button variant="default" size="sm" onClick={downloadSepaXml}>
                Download SEPA XML
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-3 text-xs text-slate-500 flex flex-wrap items-end gap-2">
        <span>{isTanja ? "Optioneel: Inflationskorrektur" : "Optioneel: inflatiecorrectie"}</span>
        <Input
          disabled={salaryEditingDisabled}
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
          disabled={salaryEditingDisabled || applyingInflation}
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
          disabled={salaryEditingDisabled || applyingInflation}
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

                {canBulkApproveSalary && !monthIsClosed && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={requestBulkSalaryApproval}
                      disabled={bulkApprovingSalary || (groupedByCompany[activeCompanyTab] || []).length === 0}
                    >
                      {bulkApprovingSalary ? "Bezig..." : "Alles afvinken"}
                    </Button>
                  </div>
                )}

                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full min-w-[1700px] text-sm">
                    <thead className="bg-slate-100">
                      <tr className="text-left">
                        <th className="px-3 py-2 text-base font-bold" rowSpan={2}>{isTanja ? "Name" : "Naam"}</th>
                        <th className="px-3 py-2" rowSpan={2}>{isTanja ? "Eintrittsdatum" : "Datum in dienst"}</th>
                        <th className="px-3 py-2" rowSpan={2}>IBAN</th>
                        <th className="px-3 py-2" rowSpan={2}>{isTanja ? "Grundgehalt exkl. Kleidungsgeld" : "Basissalaris excl. kledinggeld"}</th>
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
                        const { baseSalary, travelAmount, advanceAmount, raiseAmount, teGoedDays, teGoedAmount, totalSalaryMonth } = getSalaryTotals(r)
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
                            <td className="px-3 py-2">{formatCurrency(baseSalary)}</td>
                            <td className="px-3 py-2">{formatTravelDisplay(r.travel_amount ?? 0, isTanja)}</td>
                            <td className="px-3 py-2">
                              {formatDeductionsDisplay(r) || (isTanja ? "Nein" : "Nee")}
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
                <div className="mt-2 flex justify-end">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    {isTanja ? "Totaal salaris firma" : "Totaal salaris firma"}:{" "}
                    {formatCurrency(
                      (groupedByCompany[activeCompanyTab] || []).reduce(
                        (sum, row) => sum + getSalaryTotals(row).totalSalaryMonth,
                        0
                      )
                    )}
                  </div>
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
              const companyCrewIds = new Set(
                (groupedByCompany[activeCompanyTab] || []).map((r: SalaryDraft) => String(r.crew_id))
              )
              const overtimeRows = overigeBetalingenRows.filter((r) => companyCrewIds.has(String(r.crew_id)))
              if (overtimeRows.length === 0) {
                return <div className="text-sm text-gray-500">{isTanja ? "Geen overige betalingen." : "Geen overige betalingen."}</div>
              }
              return (
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead className="bg-slate-100">
                      <tr className="text-left">
                        <th className="px-3 py-2">{isTanja ? "Name" : "Naam"}</th>
                        <th className="px-3 py-2">IBAN</th>
                        <th className="px-3 py-2">{isTanja ? "Extra Arbeitstage" : "Dagen extra gewerkt"}</th>
                        <th className="px-3 py-2">{isTanja ? "Hinweis (von/bis)" : "Opmerking (van/tot)"}</th>
                        <th className="px-3 py-2">{isTanja ? "Betrag" : "Bedrag"}</th>
                        <th className="px-3 py-2">{isTanja ? "Betaaldatum" : "Betaaldatum"}</th>
                        <th className="px-3 py-2">Leo</th>
                        <th className="px-3 py-2">Karina</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overtimeRows.map((r) => {
                        const crewMember = crewById.get(String(r.crew_id))
                        const name = crewMember ? formatCrewName(crewMember) : "Onbekend"
                        const sourceRow = getRowForApproval(String(r.crew_id), r.sourceMonthKey)
                        const overtimeAmount = sourceRow ? getOverworkAmount(sourceRow) : 0
                        const paidDates = [
                          r.approval_leo_paid_at ? `Leo: ${formatDateShort(r.approval_leo_paid_at)}` : "",
                          r.approval_karina_paid_at ? `Karina: ${formatDateShort(r.approval_karina_paid_at)}` : "",
                        ].filter(Boolean).join(" | ")
                        const fromOtherMonth = r.sourceMonthKey !== monthKey
                        return (
                          <tr
                            key={`overtime-${r.crew_id}-${r.sourceMonthKey}-${r.month_key}`}
                            className={`border-t border-slate-200 ${monthIsClosed ? "" : "cursor-pointer hover:bg-slate-50/80"}`}
                            onClick={(e) => handleRowClickOpenEdit(e, String(r.crew_id), r.sourceMonthKey)}
                          >
                            <td className="px-3 py-2">
                              {name}
                              {fromOtherMonth && (
                                <div className="text-xs text-slate-500">
                                  {isTanja ? "uit" : "uit"} {monthKeyToDisplay(r.sourceMonthKey)}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">{r.iban || "-"}</td>
                            <td className="px-3 py-2">
                              {sourceRow && resolveOvertimeInputMode(sourceRow.overtime_mode) === "amount"
                                ? (isTanja ? "handmatig" : "handmatig")
                                : Number(r.overtime_days || 0)}
                            </td>
                            <td className="px-3 py-2">
                              {sourceRow && resolveOvertimeInputMode(sourceRow.overtime_mode) === "amount"
                                ? (isTanja ? "Handmatig bedrag" : "Handmatig bedrag")
                                : String(r.overtime_note || "").trim() || "-"}
                            </td>
                            <td className="px-3 py-2 font-semibold text-emerald-700">{formatCurrency(overtimeAmount)}</td>
                            <td className="px-3 py-2 text-xs">{paidDates || "-"}</td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={!!r.approval_leo}
                                onChange={(e) => handleApprovalToggle(String(r.crew_id), "approval_leo", e.target.checked, r.sourceMonthKey)}
                                disabled={monthIsClosed || !isLeoUser || savingCrewId === String(r.crew_id)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={!!r.approval_karina}
                                onChange={(e) => handleApprovalToggle(String(r.crew_id), "approval_karina", e.target.checked, r.sourceMonthKey)}
                                disabled={monthIsClosed || !isKarinaUser || savingCrewId === String(r.crew_id)}
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

      {editingCrewId && editingRow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-lg border bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isTanja ? "Gehalt bearbeiten" : "Salaris bewerken"} - {formatCrewName(crewById.get(editingCrewId))}
                {editingSourceMonthKey && (
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({monthKeyToDisplay(editingSourceMonthKey)})
                  </span>
                )}
              </h3>
              {salaryReadOnlyUser && (
                <span className="mr-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {isTanja ? "Alleen-lezen" : "Alleen-lezen"}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingCrewId(null)
                  setEditingSourceMonthKey(null)
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
                <Input value={editingRow.iban || ""} onChange={(e) => setCrewField(editingCrewId, { iban: e.target.value })} />
              </div>
              <div>
                <Label>{isTanja ? "Grundgehalt exkl. Kleidungsgeld" : "Basissalaris excl. kledinggeld"}</Label>
                <Input
                  type="text"
                  disabled={salaryEditingDisabled}
                  inputMode="decimal"
                  autoComplete="off"
                  value={baseSalaryEditText}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\s/g, "")
                    if (v !== "" && !/^[-\d.,]*$/.test(v)) return
                    setBaseSalaryEditText(v)
                  }}
                  onBlur={() => {
                    const parsed = parseSalaryMoneyInput(baseSalaryEditText.trim())
                    const normalized =
                      normalizeBaseSalaryExclClothingForCrew(
                        parsed,
                        crewById.get(editingCrewId)
                      ) ?? parsed
                    setCrewField(editingCrewId, { base_salary: normalized })
                    setBaseSalaryEditText(formatSalaryInputFromNumber(normalized))
                  }}
                />
              </div>
              {hasProrationInMonth(editingRow, editingRow.month_key || monthKey) && (
                <div>
                  <Label>{isTanja ? "Gewerkte Tage" : "Gewerkte dagen deze maand"}</Label>
                  <Input
                    disabled={salaryEditingDisabled}
                    inputMode="decimal"
                    value={prorationDaysInput}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (/^\d*([.,]\d*)?$/.test(raw)) setProrationDaysInput(raw)
                    }}
                    onBlur={() => {
                      const rowMonth = editingRow.month_key || monthKey
                      const autoDays = getWorkedDaysInSalaryMonth(editingRow, rowMonth)
                      const parsed = prorationDaysInput.trim() === "" ? null : parseDecimalInput(prorationDaysInput)
                      setCrewField(editingCrewId, {
                        proration_worked_days:
                          parsed === null || parsed === autoDays ? null : Math.max(0, parsed),
                      })
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {isTanja
                      ? `Automatisch: ${getWorkedDaysInSalaryMonth(editingRow, editingRow.month_key || monthKey) ?? "-"} Tage (uit-dienst-dag telt niet).`
                      : `Automatisch: ${getWorkedDaysInSalaryMonth(editingRow, editingRow.month_key || monthKey) ?? "-"} dagen (uit-dienst-dag telt niet mee).`}
                  </p>
                </div>
              )}
              <div>
                <Label>{isTanja ? "Reisekosten" : "Reiskosten"}</Label>
                <Select
                  disabled={salaryEditingDisabled}
                  value={
                    editingRow.travel_amount === TRAVEL_AMOUNT_COMPANY_CAR
                      ? "auto"
                      : String(editingRow.travel_amount ?? 0)
                  }
                  onValueChange={(v) =>
                    setCrewField(editingCrewId, {
                      travel_amount: normalizeTravelAmount(v === "auto" ? TRAVEL_AMOUNT_COMPANY_CAR : v),
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{isTanja ? "Nein" : "Nee"}</SelectItem>
                    <SelectItem value="auto">{isTanja ? "Firmenwagen" : "Bedrijfsauto"}</SelectItem>
                    <SelectItem value="150">€ 150</SelectItem>
                    <SelectItem value="300">€ 300</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>{isTanja ? "Einbehalt" : "In te houden"}</Label>
                <Select
                  disabled={salaryEditingDisabled}
                  value={(editingRow.deductions?.length || 0) > 0 ? "ja" : "nee"}
                  onValueChange={(v) => {
                    if (v === "nee") {
                      setDeductionAmountTexts({})
                      setCrewField(editingCrewId, {
                        deductions: [],
                        advance_enabled: false,
                        advance_amount: 0,
                        deduction_category: "voorschot",
                      })
                      return
                    }
                    const existing = editingRow.deductions || []
                    const nextDeductions =
                      existing.length > 0
                        ? existing
                        : [{ id: `ded-${Date.now()}`, amount: 0, category: "voorschot" as SalaryDeductionCategory }]
                    const legacy = syncLegacyAdvanceFields(nextDeductions)
                    setCrewField(editingCrewId, { deductions: nextDeductions, ...legacy })
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ja">Ja</SelectItem><SelectItem value="nee">{isTanja ? "Nein" : "Nee"}</SelectItem></SelectContent>
                </Select>
              </div>
              {(editingRow.deductions?.length || 0) > 0 && (
                <div className="md:col-span-2 space-y-2 rounded-md border p-3">
                  <div className="text-sm font-medium">{isTanja ? "Inhoudingen" : "Inhoudingen"}</div>
                  {(editingRow.deductions || []).map((deduction) => (
                    <div key={deduction.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-4">
                        <Label className="text-xs">{isTanja ? "Kategorie" : "Categorie"}</Label>
                        <Select
                          disabled={salaryEditingDisabled}
                          value={deduction.category || "voorschot"}
                          onValueChange={(v) => {
                            const next = (editingRow.deductions || []).map((d) =>
                              d.id === deduction.id
                                ? { ...d, category: (v as SalaryDeductionCategory) || "voorschot" }
                                : d
                            )
                            const legacy = syncLegacyAdvanceFields(next)
                            setCrewField(editingCrewId, { deductions: next, ...legacy })
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DEDUCTION_CATEGORY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-5">
                        <Label className="text-xs">{isTanja ? "Betrag" : "Bedrag"}</Label>
                        <Input
                          disabled={salaryEditingDisabled}
                          inputMode="decimal"
                          value={deductionAmountTexts[deduction.id] ?? formatSalaryInputFromNumber(deduction.amount)}
                          onChange={(e) => {
                            const raw = e.target.value
                            if (raw !== "" && !/^[-\d.,]*$/.test(raw)) return
                            setDeductionAmountTexts((prev) => ({ ...prev, [deduction.id]: raw }))
                          }}
                          onBlur={() => {
                            const parsed = parseSalaryMoneyInputOrZero(deductionAmountTexts[deduction.id] ?? "")
                            const next = (editingRow.deductions || []).map((d) =>
                              d.id === deduction.id ? { ...d, amount: parsed } : d
                            )
                            const legacy = syncLegacyAdvanceFields(next)
                            setCrewField(editingCrewId, { deductions: next, ...legacy })
                            setDeductionAmountTexts((prev) => ({
                              ...prev,
                              [deduction.id]: formatSalaryInputFromNumber(parsed),
                            }))
                          }}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={salaryEditingDisabled}
                          onClick={() => {
                            const next = (editingRow.deductions || []).filter((d) => d.id !== deduction.id)
                            const legacy = syncLegacyAdvanceFields(next)
                            setCrewField(editingCrewId, { deductions: next, ...legacy })
                            setDeductionAmountTexts((prev) => {
                              const copy = { ...prev }
                              delete copy[deduction.id]
                              return copy
                            })
                          }}
                        >
                          {isTanja ? "Entfernen" : "Verwijderen"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={salaryEditingDisabled}
                    onClick={() => {
                      const next = [
                        ...(editingRow.deductions || []),
                        { id: `ded-${Date.now()}`, amount: 0, category: "voorschot" as SalaryDeductionCategory },
                      ]
                      const legacy = syncLegacyAdvanceFields(next)
                      setCrewField(editingCrewId, { deductions: next, ...legacy })
                    }}
                  >
                    {isTanja ? "Inhouding toevoegen" : "Inhouding toevoegen"}
                  </Button>
                </div>
              )}
              <div>
                <Label>{isTanja ? "Erhöhungsbetrag" : "Verhoging bedrag"}</Label>
                <Input
                  disabled={salaryEditingDisabled}
                  inputMode="decimal"
                  value={editingRow.raise_amount ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value
                    setCrewField(editingCrewId, {
                      raise_enabled: raw.trim() !== "",
                      raise_amount: parseSalaryMoneyInputOrZero(raw),
                    })
                  }}
                />
              </div>
              <div>
                <Label>{isTanja ? "Uberstunden" : "Overwerk"}</Label>
                <Select
                  disabled={salaryEditingDisabled}
                  value={editingRow.overtime_enabled ? "ja" : "nee"}
                  onValueChange={(v) => {
                    const enabled = v === "ja"
                    if (!enabled) {
                      setOvertimeDaysInput("")
                      setOvertimeAmountInput("")
                      setOvertimeModeInput("days")
                      setOvertimeFromDate("")
                      setOvertimeToDate("")
                    } else {
                      const mode = resolveOvertimeInputMode(editingRow.overtime_mode)
                      setOvertimeModeInput(mode)
                      if (mode === "amount") {
                        const existingAmount = Number(editingRow.overtime_manual_amount || 0)
                        setOvertimeAmountInput(
                          existingAmount > 0 ? String(existingAmount).replace(".", ",") : ""
                        )
                      } else {
                        const existing = Number(editingRow.overtime_days || 0)
                        setOvertimeDaysInput(existing > 0 ? String(existing).replace(".", ",") : "")
                      }
                    }
                    setCrewField(editingCrewId, {
                      overtime_enabled: enabled,
                      overtime_mode: enabled ? resolveOvertimeInputMode(editingRow.overtime_mode) : "days",
                      overtime_days: enabled ? Number(editingRow.overtime_days || 0) : 0,
                      overtime_manual_amount: enabled ? Number(editingRow.overtime_manual_amount || 0) : 0,
                      overtime_note: enabled
                        ? String(editingRow.overtime_note || "")
                        : "",
                    })
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ja">Ja</SelectItem><SelectItem value="nee">{isTanja ? "Nein" : "Nee"}</SelectItem></SelectContent>
                </Select>
              </div>
              {editingRow.overtime_enabled && (
                <div>
                  <Label>{isTanja ? "Invoer extra werk" : "Invoer extra werk"}</Label>
                  <Select
                    disabled={salaryEditingDisabled}
                    value={overtimeModeInput}
                    onValueChange={(v: OvertimeInputMode) => {
                      setOvertimeModeInput(v)
                      if (v === "amount") {
                        setOvertimeDaysInput("")
                        setOvertimeFromDate("")
                        setOvertimeToDate("")
                        setCrewField(editingCrewId, {
                          overtime_mode: "amount",
                          overtime_days: 0,
                          overtime_note: "",
                        })
                      } else {
                        setOvertimeAmountInput("")
                        setCrewField(editingCrewId, {
                          overtime_mode: "days",
                          overtime_manual_amount: 0,
                        })
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">{isTanja ? "Tage + Zeitraum" : "Dagen + periode"}</SelectItem>
                      <SelectItem value="amount">{isTanja ? "Manueller Betrag" : "Handmatig bedrag"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingRow.overtime_enabled && overtimeModeInput === "days" && (
                <div>
                  <Label>{isTanja ? "Anzahl Extra-Tage" : "Aantal dagen extra gewerkt"}</Label>
                  <Input
                    disabled={salaryEditingDisabled}
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
              {editingRow.overtime_enabled && overtimeModeInput === "amount" && (
                <div>
                  <Label>{isTanja ? "Betrag extra werk" : "Bedrag extra werk"}</Label>
                  <Input
                    disabled={salaryEditingDisabled}
                    inputMode="decimal"
                    value={overtimeAmountInput}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (/^\d*([.,]\d*)?$/.test(raw)) {
                        setOvertimeAmountInput(raw)
                      }
                    }}
                    placeholder="0,00"
                  />
                </div>
              )}
              {editingRow.overtime_enabled && overtimeModeInput === "days" && (
                <div className="md:col-span-2">
                  <Label>{isTanja ? "Periode extra werk" : "Periode extra werk"}</Label>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 rounded-md border p-2">
                    <div>
                      <Label className="text-xs">{isTanja ? "Van" : "Van"}</Label>
                      <Input
                        type="date"
                        disabled={salaryEditingDisabled || overtimeCalendarReadOnlyUser}
                        value={overtimeFromDate}
                        onChange={(e) => {
                          const from = e.target.value
                          setOvertimeFromDate(from)
                          syncOvertimeDateNoteToRow(from, overtimeToDate)
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{isTanja ? "Tot" : "Tot"}</Label>
                      <Input
                        type="date"
                        disabled={salaryEditingDisabled || overtimeCalendarReadOnlyUser}
                        value={overtimeToDate}
                        onChange={(e) => {
                          const to = e.target.value
                          setOvertimeToDate(to)
                          syncOvertimeDateNoteToRow(overtimeFromDate, to)
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    {editingRow.overtime_note && editingRow.overtime_note !== "handmatig bedrag"
                      ? `${isTanja ? "Automatische opmerking" : "Automatische opmerking"}: ${editingRow.overtime_note}`
                      : (isTanja ? "Kies begin- en einddatum om automatisch 'van ... tot ...' te vullen." : "Kies begin- en einddatum om automatisch 'van ... tot ...' te vullen.")}
                  </div>
                </div>
              )}
              <div>
                <Label>{isTanja ? "Bemerkungen" : "Opmerkingen"}</Label>
                <Input disabled={salaryEditingDisabled} value={editingRow.notes || ""} onChange={(e) => setCrewField(editingCrewId, { notes: e.target.value })} />
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
                  setEditingSourceMonthKey(null)
                  setShowSalaryHistory(false)
                  setSalaryHistoryItems([])
                }}
              >
                {isTanja ? "Abbrechen" : "Annuleren"}
              </Button>
              <Button
                disabled={salaryEditingDisabled}
                onClick={async () => {
                  if (!editingCrewId) return
                  const parsedBase = parseSalaryMoneyInput(baseSalaryEditText.trim())
                  const preparedRow = syncOvertimeInputToRow(editingCrewId)
                  const base = preparedRow || editingRow
                  if (!base) return
                  const rowMonth = base.month_key || monthKey
                  const autoProrationDays = getWorkedDaysInSalaryMonth(base, rowMonth)
                  const parsedProration =
                    prorationDaysInput.trim() === "" ? null : parseDecimalInput(prorationDaysInput)
                  const toSave: SalaryDraft = {
                    ...base,
                    base_salary:
                      normalizeBaseSalaryExclClothingForCrew(
                        parsedBase,
                        crewById.get(editingCrewId)
                      ) ?? parsedBase,
                    proration_worked_days:
                      parsedProration === null || parsedProration === autoProrationDays
                        ? null
                        : Math.max(0, parsedProration),
                  }
                  const syncedDeductions = (toSave.deductions || []).map((d) => {
                    const text = deductionAmountTexts[d.id]
                    if (text === undefined) return d
                    return { ...d, amount: parseSalaryMoneyInputOrZero(text) }
                  })
                  const legacyDeductions = syncLegacyAdvanceFields(syncedDeductions)
                  const finalRow: SalaryDraft = {
                    ...toSave,
                    deductions: syncedDeductions,
                    ...legacyDeductions,
                  }
                  const ok = await saveCrewRow(editingCrewId, finalRow)
                  if (ok) {
                    setEditingCrewId(null)
                    setEditingSourceMonthKey(null)
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
                          <th className="px-2 py-1">{isTanja ? "Betaaldatum" : "Betaaldatum"}</th>
                          <th className="px-2 py-1">{isTanja ? "Reden/opmerking" : "Reden/opmerking"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaryHistoryItems.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-2 py-1">{item.month_key}</td>
                            <td className="px-2 py-1">{formatCurrency(item.base_salary)}</td>
                            <td className="px-2 py-1">{formatTravelDisplay(item.travel_amount ?? 0)}</td>
                            <td className="px-2 py-1">{formatCurrency(item.raise_amount)}</td>
                            <td className="px-2 py-1">{formatCurrency(item.advance_amount)}</td>
                            <td className="px-2 py-1">
                              {item.overtime_days > 0
                                ? `${item.overtime_days}d (${formatCurrency(getOverworkAmountForCrew(editingCrewId, item.base_salary, item.overtime_days))})`
                                : "-"}
                            </td>
                            <td className="px-2 py-1 font-semibold">{formatCurrency(item.total_salary_month)}</td>
                            <td className="px-2 py-1 text-xs">
                              {[
                                item.approval_leo_paid_at ? `Leo: ${formatDateShort(item.approval_leo_paid_at)}` : "",
                                item.approval_karina_paid_at ? `Karina: ${formatDateShort(item.approval_karina_paid_at)}` : "",
                              ].filter(Boolean).join(" | ") || "-"}
                            </td>
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

      {bulkSalaryApprovalPrompt && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-5">
            <h3 className="text-lg font-semibold mb-3">Alle salarissen afvinken</h3>
            <p className="text-sm text-slate-600 mb-3">
              {bulkSalaryApprovalPrompt.company}: {groupedByCompany[bulkSalaryApprovalPrompt.company]?.length || 0}{" "}
              salarisrijen. Overige betalingen worden niet meegenomen. Standaard is de 25e; pas aan indien nodig
              (bijv. december eerder).
            </p>
            <Label>Betaaldatum voor alle salarissen</Label>
            <Input
              type="date"
              className="mt-1"
              value={bulkSalaryApprovalPrompt.paymentDate}
              onChange={(e) =>
                setBulkSalaryApprovalPrompt((prev) =>
                  prev ? { ...prev, paymentDate: e.target.value } : prev
                )
              }
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkSalaryApprovalPrompt(null)}>
                Annuleren
              </Button>
              <Button
                disabled={bulkApprovingSalary}
                onClick={async () => {
                  if (!bulkSalaryApprovalPrompt.paymentDate) {
                    alert("Betaaldatum is verplicht.")
                    return
                  }
                  const { paymentDate, company } = bulkSalaryApprovalPrompt
                  setBulkSalaryApprovalPrompt(null)
                  await applyBulkSalaryApproval(paymentDate, company)
                }}
              >
                {bulkApprovingSalary ? "Bezig..." : "Alles afvinken"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {approvalDatePrompt && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-5">
            <h3 className="text-lg font-semibold mb-3">
              {isTanja ? "Betaaldatum invoeren" : "Betaaldatum invoeren"}
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Vul de betaaldatum in voor deze overige betaling.
            </p>
            <Label>{isTanja ? "Betaaldatum" : "Betaaldatum"}</Label>
            <Input
              type="date"
              className="mt-1"
              value={approvalDatePrompt.paymentDate}
              onChange={(e) =>
                setApprovalDatePrompt((prev) =>
                  prev ? { ...prev, paymentDate: e.target.value } : prev
                )
              }
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApprovalDatePrompt(null)}>
                {isTanja ? "Abbrechen" : "Annuleren"}
              </Button>
              <Button
                onClick={async () => {
                  if (!approvalDatePrompt.paymentDate) {
                    alert(isTanja ? "Betaaldatum is verplicht." : "Betaaldatum is verplicht.")
                    return
                  }
                  const { crewId, field, paymentDate, sourceMonthKey } = approvalDatePrompt
                  setApprovalDatePrompt(null)
                  await applyApprovalToggle(crewId, field, true, paymentDate, sourceMonthKey)
                }}
              >
                {isTanja ? "Bevestigen" : "Bevestigen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

