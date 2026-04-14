import { NextRequest, NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/api-security"
import {
  getBearerToken,
  getServiceRoleSupabaseClient,
  getUserFromBearerToken,
} from "@/lib/salary-page-password"

const WILLEM_EMAIL = "willem@bamalite.com"
const SALARY_META_PREFIX = "__SALARY_META__:"
const REVIEW_META_PREFIX = "__REVIEW_META__:"

const parseMoney = (value: any): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const parseSalaryMetaFromReason = (reasonValue: any) => {
  const reason = String(reasonValue || "")
  const salaryMarkerIndex = reason.lastIndexOf(SALARY_META_PREFIX)
  const markerIndex = salaryMarkerIndex >= 0 ? salaryMarkerIndex : reason.lastIndexOf(REVIEW_META_PREFIX)
  if (markerIndex < 0) return null
  const prefixLength = salaryMarkerIndex >= 0 ? SALARY_META_PREFIX.length : REVIEW_META_PREFIX.length
  const jsonPart = reason.slice(markerIndex + prefixLength).trim()
  if (!jsonPart) return null
  try {
    const parsed = JSON.parse(jsonPart) as { iban?: string }
    return { iban: String(parsed.iban || "") }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const token = getBearerToken(request)
    const user = await getUserFromBearerToken(token)
    if (!user) {
      return NextResponse.json({ success: false, error: "Geen gebruiker gevonden" }, { status: 401 })
    }
    if (String(user.email || "").toLowerCase() !== WILLEM_EMAIL) {
      return NextResponse.json({ success: false, error: "Geen toegang" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const crewId = String(body?.crewId || "").trim()
    if (!crewId) {
      return NextResponse.json({ success: false, error: "Ontbrekende crewId" }, { status: 400 })
    }

    const adminClient = getServiceRoleSupabaseClient()
    if (!adminClient) {
      return NextResponse.json({ success: false, error: "Server configuratie ontbreekt" }, { status: 500 })
    }

    const [salaryRes, crewRes] = await Promise.all([
      adminClient
        .from("loon_bemerkingen")
        .select("month_key, iban, base_salary, travel_allowance, reason")
        .eq("crew_id", crewId)
        .order("month_key", { ascending: false })
        .limit(48),
      adminClient.from("crew").select("*").eq("id", crewId).maybeSingle(),
    ])

    if (salaryRes.error) {
      return NextResponse.json({ success: false, error: salaryRes.error.message }, { status: 500 })
    }
    if (crewRes.error) {
      return NextResponse.json({ success: false, error: crewRes.error.message }, { status: 500 })
    }

    const rows = Array.isArray(salaryRes.data) ? salaryRes.data : []
    const crewMember = crewRes.data || {}

    const firstWithIban = rows.find((row: any) => String(row?.iban || "").trim() !== "")
    const firstWithIbanMeta = rows.find((row: any) => {
      const meta = parseSalaryMetaFromReason(row?.reason)
      return !!String(meta?.iban || "").trim()
    })
    const firstWithBaseSalary = rows.find((row: any) => parseMoney(row?.base_salary) > 0)
    const firstWithTravelAllowance = rows.find((row: any) => {
      const travel = row?.travel_allowance
      return typeof travel === "boolean" || String(travel).toLowerCase() === "true" || parseMoney(travel) > 0
    })

    const crewIban = String((crewMember as any)?.iban || "").trim()
    const notesText = Array.isArray((crewMember as any)?.notes)
      ? (crewMember as any).notes.join(" | ")
      : String((crewMember as any)?.notes || "")
    const contractBaseFromNotes = (() => {
      const noteMatch = notesText.match(/contract_basis_salaris_excl_kleding:([0-9.,-]+)/i)
      return noteMatch ? parseMoney(noteMatch[1]) : 0
    })()
    const crewBaseRaw =
      (crewMember as any)?.basis_salaris ??
      (crewMember as any)?.basissalaris ??
      (crewMember as any)?.basisSalaris ??
      (crewMember as any)?.salaris ??
      (crewMember as any)?.salary ??
      null
    const crewClothingRaw =
      (crewMember as any)?.kleding_geld ??
      (crewMember as any)?.kledinggeld ??
      (crewMember as any)?.kledingGeld ??
      (crewMember as any)?.clothing_allowance ??
      null
    const crewBaseIncl = parseMoney(crewBaseRaw) + parseMoney(crewClothingRaw)
    const crewTravelAllowanceRaw = (crewMember as any)?.travel_allowance ?? (crewMember as any)?.reiskosten
    const crewTravelAllowance =
      typeof crewTravelAllowanceRaw === "boolean"
        ? crewTravelAllowanceRaw
        : Number.isFinite(Number(crewTravelAllowanceRaw))
          ? Number(crewTravelAllowanceRaw) > 0
          : false
    const contractTravelFromNotes = (() => {
      const noteMatch = notesText.match(/contract_reiskosten:([0-9.,-]+)/i)
      return noteMatch ? parseMoney(noteMatch[1]) > 0 : false
    })()
    const ibanFromMeta = String(parseSalaryMetaFromReason(firstWithIbanMeta?.reason)?.iban || "").trim()
    const baseSalaryFromRows = parseMoney(firstWithBaseSalary?.base_salary)
    const travelFromRowsRaw = firstWithTravelAllowance?.travel_allowance
    const travelFromRows =
      typeof travelFromRowsRaw === "boolean"
        ? travelFromRowsRaw
        : String(travelFromRowsRaw).toLowerCase() === "true" || parseMoney(travelFromRowsRaw) > 0

    return NextResponse.json({
      success: true,
      salary: {
        iban: String(firstWithIban?.iban || ibanFromMeta || crewIban || ""),
        baseSalary:
          baseSalaryFromRows > 0
            ? baseSalaryFromRows
            : crewBaseIncl > 0
              ? crewBaseIncl
              : contractBaseFromNotes > 0
                ? contractBaseFromNotes
                : null,
        travelAllowance: travelFromRows || crewTravelAllowance || contractTravelFromNotes,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
