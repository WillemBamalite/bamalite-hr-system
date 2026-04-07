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
import { authenticatedFetch } from "@/lib/authenticated-fetch"

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
  iban: string
  base_salary: number | null
  travel_allowance: boolean
  monthly_adjustment: number | null
  notes: string
  review_comment: string
  review_by: string
  review_type: "opmerking" | "correctie"
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
  `EUR ${value.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const isAflosser = (member: any) =>
  member?.position === "Aflosser" || member?.position === "aflosser" || member?.is_aflosser === true

const isEligibleForSalaryPage = (member: any) => {
  if (!isRealCrewMember(member)) return false
  if (isCopiedCrewMember(member)) return false
  if (member?.recruitment_status && member.recruitment_status !== "aangenomen") return false
  if (isAflosser(member)) {
    return member?.vaste_dienst === true
  }
  return true
}

const KARINA_EMAIL = "karina@bamalite.com"
const REVIEWER_EMAILS = ["leo@bamalite.com", "tanja@bamalite.com", "bart@bamalite.com"]
const ENFORCE_SALARY_VALIDATIONS = false
const REVIEW_META_PREFIX = "__REVIEW_META__:"

const parseReviewMetaFromReason = (reasonValue: any) => {
  const reason = String(reasonValue || "")
  const markerIndex = reason.lastIndexOf(REVIEW_META_PREFIX)
  if (markerIndex < 0) return null
  const jsonPart = reason.slice(markerIndex + REVIEW_META_PREFIX.length).trim()
  if (!jsonPart) return null
  try {
    const parsed = JSON.parse(jsonPart) as {
      review_comment?: string
      review_by?: string
      review_type?: "opmerking" | "correctie"
    }
    return {
      review_comment: String(parsed.review_comment || ""),
      review_by: String(parsed.review_by || ""),
      review_type: parsed.review_type === "correctie" ? "correctie" : "opmerking",
    }
  } catch {
    return null
  }
}

export default function LoonBemerkingenPage() {
  const { crew } = useSupabaseData()
  const [currentUserEmail, setCurrentUserEmail] = useState("")
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())
  const [rowsByCrewId, setRowsByCrewId] = useState<Record<string, SalaryDraft>>({})
  const [savingCrewId, setSavingCrewId] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string>("")
  const [activeCompanyTab, setActiveCompanyTab] = useState<string>("")
  const [sendingReadyMail, setSendingReadyMail] = useState(false)
  const [readyMailInfo, setReadyMailInfo] = useState("")
  const isTanja = currentUserEmail === "tanja@bamalite.com"
  const isKarinaUser = currentUserEmail === KARINA_EMAIL

  useEffect(() => {
    setMounted(true)
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
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
      ;(crew || [])
        .filter((c: any) => isEligibleForSalaryPage(c))
        .forEach((c: any) => {
          const crewId = String(c.id)
          const current = currentByCrew.get(crewId)
          const previous = latestPreviousByCrew.get(crewId)
          const base = current || previous || null
          nextRowsByCrew[crewId] = {
            id: current?.id,
            crew_id: crewId,
            company: (current?.company ?? c.company ?? previous?.company ?? null) || null,
            month_key: monthKey,
            iban: String(current?.iban ?? previous?.iban ?? c?.iban ?? rowsByCrewId[crewId]?.iban ?? ""),
            base_salary: typeof base?.base_salary === "number" ? base.base_salary : null,
            travel_allowance: !!base?.travel_allowance,
            monthly_adjustment:
              typeof current?.monthly_adjustment === "number"
                ? current.monthly_adjustment
                : 0,
            notes: String(current?.notes ?? ""),
            review_comment: String(
              current?.review_comment ??
              parseReviewMetaFromReason(current?.reason)?.review_comment ??
              ""
            ),
            review_by: String(
              current?.review_by ??
              parseReviewMetaFromReason(current?.reason)?.review_by ??
              ""
            ),
            review_type:
              current?.review_type === "correctie"
                ? "correctie"
                : (parseReviewMetaFromReason(current?.reason)?.review_type || "opmerking"),
          }
        })

      setRowsByCrewId(nextRowsByCrew)
    } catch (e) {
      console.warn("Fout bij laden salarissen:", getErrMsg(e))
      setRowsByCrewId({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if ((crew || []).length > 0) {
      loadRows()
    }
  }, [monthKey, crew])

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
        const an = `${ac?.first_name || ""} ${ac?.last_name || ""}`.trim().toLowerCase()
        const bn = `${bc?.first_name || ""} ${bc?.last_name || ""}`.trim().toLowerCase()
        return an.localeCompare(bn)
      })
    })
    return groups
  }, [rowsByCrewId, crewById])

  const companyNames = useMemo(() => Object.keys(groupedByCompany).sort((a, b) => a.localeCompare(b)), [groupedByCompany])

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

  const setCrewField = (
    crewId: string,
    patch: Partial<SalaryDraft>
  ) => {
    setRowsByCrewId((prev) => ({
      ...prev,
      [crewId]: {
        ...prev[crewId],
        ...patch,
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
      monthly_adjustment: row.monthly_adjustment ?? 0,
      iban: row.iban?.trim() || "",
      reason:
        ((row.notes || "").trim() || "Salarisadministratie") +
        (String(row.review_comment || "").trim()
          ? `\n${REVIEW_META_PREFIX}${JSON.stringify({
              review_comment: String(row.review_comment || "").trim(),
              review_by: String(row.review_by || "").trim(),
              review_type: row.review_type || "opmerking",
            })}`
          : ""),
      notes: row.notes || "",
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
      if (missingIbanOnLoonBemerkingen || missingReviewColumns) {
        const {
          iban: _omitIban,
          review_comment: _omitReviewComment,
          review_by: _omitReviewBy,
          review_type: _omitReviewType,
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

  const saveCrewRow = async (crewId: string) => {
    const row = rowsByCrewId[crewId]
    if (!row) return
    const correction = typeof row.monthly_adjustment === "number" ? row.monthly_adjustment : 0
    const hasNotes = !!String(row.notes || "").trim()
    if (ENFORCE_SALARY_VALIDATIONS && correction !== 0 && !hasNotes) {
      alert(isTanja ? "Bei einer Gehaltskorrektur ist ein Hinweis erforderlich." : "Bij een salariscorrectie ben je verplicht om een bijzonderheid toe te voegen.")
      return
    }
    if (ENFORCE_SALARY_VALIDATIONS && row.review_type === "correctie" && !String(row.review_comment || "").trim()) {
      alert(isTanja ? "Beim Typ 'Korrektur' ist ein Review-Hinweis erforderlich." : "Bij type 'correctie' is een review-opmerking verplicht.")
      return
    }
    try {
      setSavingCrewId(crewId)
      await persistRow(crewId, row)
      setLastSavedAt(new Date().toISOString())
      await loadRows()
    } catch (e) {
      alert(`${isTanja ? "Fehler beim Speichern" : "Fout bij opslaan"}: ${getErrMsg(e)}`)
    } finally {
      setSavingCrewId(null)
    }
  }

  const resolveReviewForCrew = async (crewId: string) => {
    const row = rowsByCrewId[crewId]
    if (!row || !isKarinaUser) return
    const cleanedRow: SalaryDraft = {
      ...row,
      review_comment: "",
      review_by: "",
      review_type: "opmerking",
    }
    setRowsByCrewId((prev) => ({
      ...prev,
      [crewId]: cleanedRow,
    }))
    try {
      setSavingCrewId(crewId)
      await persistRow(crewId, cleanedRow)
      setLastSavedAt(new Date().toISOString())
      await loadRows()
    } catch (e) {
      alert(`${isTanja ? "Fehler beim Speichern" : "Fout bij opslaan"}: ${getErrMsg(e)}`)
    } finally {
      setSavingCrewId(null)
    }
  }

  const sendReadyMailToWillem = async () => {
    try {
      setSendingReadyMail(true)
      setReadyMailInfo("")
      const res = await authenticatedFetch("/api/salary-ready", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monthKey,
          company: activeCompanyTab || "",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || "Mail versturen mislukt")
      }
      setReadyMailInfo(
        isTanja
          ? "Testmail erfolgreich an willem@bamalite.com gesendet."
          : "Testmail succesvol verstuurd naar willem@bamalite.com."
      )
    } catch (e) {
      setReadyMailInfo(
        `${isTanja ? "Fehler beim Versenden" : "Fout bij versturen"}: ${getErrMsg(e)}`
      )
    } finally {
      setSendingReadyMail(false)
    }
  }

  const downloadCsv = () => {
    const rows = companyNames.flatMap((company) => {
      const companyRows = groupedByCompany[company] || []
      return companyRows.map((r) => {
        const m = crewById.get(String(r.crew_id))
        const name = m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : "Onbekend"
        const baseSalary = typeof r.base_salary === "number" ? r.base_salary : 0
        const travelAmount = r.travel_allowance ? 300 : 0
        const correctionAmount = typeof r.monthly_adjustment === "number" ? r.monthly_adjustment : 0
        const total = baseSalary + travelAmount + correctionAmount
        return {
          company,
          name,
          iban: r.iban || "",
          baseSalary,
          travel: r.travel_allowance ? "Ja (+300)" : "Nee (0)",
          correction: correctionAmount,
          notes: r.notes || "",
          total,
        }
      })
    })

    const header = [
      "Firma",
      "Naam",
      "IBAN",
      "Basissalaris incl kledinggeld",
      "Reiskosten",
      "Correctie op salaris",
      "Bijzonderheden deze maand",
      "Totaal salaris maand",
    ]
    const toCsvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const lines = [
      header.map(toCsvCell).join(";"),
      ...rows.map((r) =>
        [
          r.company,
          r.name,
          r.iban,
          r.baseSalary.toFixed(2),
          r.travel,
          r.correction.toFixed(2),
          r.notes,
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
            const name = m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : "Onbekend"
            const baseSalary = typeof r.base_salary === "number" ? r.base_salary : 0
            const travelAmount = r.travel_allowance ? 300 : 0
            const correctionAmount = typeof r.monthly_adjustment === "number" ? r.monthly_adjustment : 0
            const total = baseSalary + travelAmount + correctionAmount
            return `
              <tr>
                <td>${escapeHtml(name)}</td>
                <td>${escapeHtml(r.iban || "")}</td>
                <td class="num">${formatEuro(baseSalary)}</td>
                <td>${r.travel_allowance ? "Ja (+300,00)" : "Nee"}</td>
                <td class="num">${formatEuro(correctionAmount)}</td>
                <td>${escapeHtml(r.notes || "")}</td>
                <td class="num total">${formatEuro(total)}</td>
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
                  <th>IBAN</th>
                  <th>Basissalaris incl. kledinggeld</th>
                  <th>Reiskosten</th>
                  <th>Correctie</th>
                  <th>Bijzonderheden deze maand</th>
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

  if (!mounted) return null

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
          <div className="text-xs text-gray-500 text-center">
            {isTanja ? "Zuletzt gespeichert" : "Laatst opgeslagen"}: {lastSavedAt ? formatDateTime(lastSavedAt) : "-"}
          </div>
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
          </div>
          <Button
            variant="default"
            size="sm"
            className="ml-auto bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={sendReadyMailToWillem}
            disabled={sendingReadyMail || !isKarinaUser}
            title={!isKarinaUser ? "Alleen Karina kan salarissen klaarzetten." : ""}
          >
            {sendingReadyMail
              ? (isTanja ? "Senden..." : "Versturen...")
              : (isTanja ? "Klaarzetten (Testmail)" : "Zet klaar (testmail)")}
          </Button>
        </CardContent>
        {readyMailInfo && (
          <CardContent className="pt-0">
            <div className="text-xs text-gray-600">{readyMailInfo}</div>
          </CardContent>
        )}
      </Card>

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

                <div className="space-y-4">
                  {(groupedByCompany[activeCompanyTab] || []).map((r: any) => {
                    const m = crewById.get(String(r.crew_id))
                    const name = m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : "Onbekend"
                    const baseSalary = typeof r.base_salary === "number" ? r.base_salary : 0
                    const travelAmount = r.travel_allowance ? 300 : 0
                    const correctionAmount = typeof r.monthly_adjustment === "number" ? r.monthly_adjustment : 0
                    const totalSalaryMonth = baseSalary + travelAmount + correctionAmount
                    const reviewBy = String(r.review_by || "").toLowerCase()
                    const hasLeoOrTanjaComment =
                      !!String(r.review_comment || "").trim() &&
                      (reviewBy.includes("leo@bamalite.com") || reviewBy.includes("tanja@bamalite.com"))
                    const isKarina = currentUserEmail === KARINA_EMAIL
                    const isReviewer = REVIEWER_EMAILS.includes(currentUserEmail)
                    return (
                      <div
                        key={`${r.crew_id}-${r.month_key}`}
                        className={`rounded-lg p-4 bg-white border-[3px] shadow-sm ${
                          isKarina && hasLeoOrTanjaComment ? "border-red-400 bg-red-50/30" : "border-slate-300"
                        }`}
                      >
                        {isKarina && hasLeoOrTanjaComment && (
                          <div className="mb-2 text-xs font-semibold text-red-700">
                            {isTanja ? "Hinweis von " : "Opmerking van "}{reviewBy.includes("leo@bamalite.com") ? "Leo" : "Tanja"}{isTanja ? " - bitte prüfen" : " - graag nakijken"}
                          </div>
                        )}
                        <div className="grid grid-cols-1 xl:grid-cols-7 gap-2 items-end">
                          <div className="xl:col-span-1">
                            <Label className="text-xs">{isTanja ? "Name" : "Naam"}</Label>
                            <div className="h-10 flex items-center px-2 text-sm font-medium bg-white border rounded-md">
                              {name}
                            </div>
                          </div>
                          <div className="xl:col-span-1">
                            <Label className="text-xs">IBAN</Label>
                            <Input
                              value={r.iban || ""}
                              onChange={(e) =>
                                setCrewField(String(r.crew_id), { iban: e.target.value })
                              }
                              placeholder="Bijv. LU12 0019 4006 4475 0000"
                            />
                          </div>
                          <div className="xl:col-span-1">
                            <Label className="text-xs">{isTanja ? "Grundgehalt inkl. Kleidergeld" : "Basissalaris incl. kledinggeld"}</Label>
                            <Input
                              inputMode="decimal"
                              value={r.base_salary ?? ""}
                              onChange={(e) =>
                                setCrewField(String(r.crew_id), {
                                  base_salary:
                                    e.target.value.trim() === "" ? null : Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div className="xl:col-span-1">
                            <Label className="text-xs">{isTanja ? "Reisekosten" : "Reiskosten"}</Label>
                            <Select
                              value={r.travel_allowance ? "ja" : "nee"}
                              onValueChange={(v) =>
                                setCrewField(String(r.crew_id), { travel_allowance: v === "ja" })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ja">{isTanja ? "Ja" : "Ja"}</SelectItem>
                                <SelectItem value="nee">{isTanja ? "Nein" : "Nee"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="xl:col-span-1">
                            <Label className="text-xs">{isTanja ? "Gehaltskorrektur" : "Correctie op salaris"}</Label>
                            <Input
                              inputMode="decimal"
                              value={r.monthly_adjustment ?? ""}
                              onChange={(e) =>
                                setCrewField(String(r.crew_id), {
                                  monthly_adjustment:
                                    e.target.value.trim() === "" ? null : Number(e.target.value),
                                })
                              }
                              placeholder={isTanja ? "z. B. 150 oder -75" : "Bijv. 150 of -75"}
                            />
                          </div>
                          <div className="xl:col-span-1">
                            <Label className="text-xs">{isTanja ? "Hinweise diesen Monat" : "Bijzonderheden deze maand"}</Label>
                            <Input
                              value={r.notes || ""}
                              onChange={(e) =>
                                setCrewField(String(r.crew_id), { notes: e.target.value })
                              }
                              placeholder={isTanja ? "z. B. Bonus oder Korrektur" : "Bijv. bonus of correctie"}
                            />
                          </div>
                          <div className="xl:col-span-1">
                            <Label className="text-xs">{isTanja ? "Gesamtgehalt Monat" : "Totaal salaris maand"}</Label>
                            <div className="h-10 flex items-center justify-end px-3 text-sm font-bold bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-md">
                              {totalSalaryMonth.toLocaleString(isTanja ? "de-DE" : "nl-NL", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-gray-600 border-gray-300 hover:text-gray-700 hover:bg-gray-100 print:hidden"
                            onClick={() => saveCrewRow(String(r.crew_id))}
                            disabled={savingCrewId === String(r.crew_id)}
                          >
                            {savingCrewId === String(r.crew_id) ? (isTanja ? "Speichern..." : "Opslaan...") : (isTanja ? "Speichern" : "Opslaan")}
                          </Button>
                        </div>
                        {(isReviewer || isKarina || !!String(r.review_comment || "").trim()) && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="text-xs font-semibold text-slate-700 mb-2">{isTanja ? "Review-Hinweise" : "Review-opmerkingen"}</div>
                            {isReviewer ? (
                              <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 items-end">
                                <div className="xl:col-span-1">
                                  <Label className="text-xs">{isTanja ? "Typ" : "Type"}</Label>
                                  <Select
                                    value={r.review_type || "opmerking"}
                                    onValueChange={(v) =>
                                      setCrewField(String(r.crew_id), {
                                        review_type: v === "correctie" ? "correctie" : "opmerking",
                                        review_by: currentUserEmail,
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="opmerking">{isTanja ? "Hinweis" : "Opmerking"}</SelectItem>
                                      <SelectItem value="correctie">{isTanja ? "Korrektur" : "Correctie"}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="xl:col-span-2">
                                  <Label className="text-xs">{isTanja ? "Hinweis für Karina" : "Opmerking voor Karina"}</Label>
                                  <Input
                                    value={r.review_comment || ""}
                                    onChange={(e) =>
                                      setCrewField(String(r.crew_id), {
                                        review_comment: e.target.value,
                                        review_by: currentUserEmail,
                                      })
                                    }
                                    placeholder={isTanja ? "z. B. bitte wegen Reisekosten korrigieren" : "Bijv. graag corrigeren ivm reiskosten"}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`rounded-md border px-3 py-2 text-sm ${
                                  hasLeoOrTanjaComment ? "border-red-300 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700"
                                }`}
                              >
                                {String(r.review_comment || "").trim() ? (
                                  <>
                                    <div className="font-medium">
                                      {r.review_type === "correctie" ? (isTanja ? "Korrektur angefragt" : "Correctie gevraagd") : (isTanja ? "Hinweis" : "Opmerking")}
                                      {r.review_by ? `${isTanja ? " von " : " door "}${r.review_by}` : ""}
                                    </div>
                                    <div className="mt-1">{r.review_comment}</div>
                                  </>
                                ) : (
                                  <div>{isTanja ? "Kein Review-Hinweis vorhanden." : "Geen review-opmerking geplaatst."}</div>
                                )}
                              </div>
                            )}
                            {isKarina &&
                              !!String(r.review_comment || "").trim() &&
                              (
                                <div className="mt-2 flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resolveReviewForCrew(String(r.crew_id))}
                                    disabled={savingCrewId === String(r.crew_id)}
                                  >
                                    {savingCrewId === String(r.crew_id)
                                      ? (isTanja ? "Speichern..." : "Opslaan...")
                                      : (isTanja ? "Als erledigt markieren" : "Afvinken als verwerkt")}
                                  </Button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

