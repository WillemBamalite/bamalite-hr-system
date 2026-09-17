"use client"


import { getNationalityFlag } from "@/utils/nationality-display"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { format } from "date-fns"
import { nl, de } from "date-fns/locale"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { useEffect, useMemo, useState } from "react"
import { resolveClothingAllowanceAmount } from "@/utils/clothing-allowance"

interface Props {
  crewMemberId: string
  language?: 'nl' | 'de'
  /**
   * single  = standalone print (detailpagina bemanningslid, met eigen globale print CSS)
   * firma   = gebruikt binnen firma-wisseling verzamelprint (geen globale CSS, alleen pagina-breaks)
   */
  variant?: 'single' | 'firma'
}

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
    const parsed = JSON.parse(jsonPart) as { iban?: string; clothing_allowance?: boolean }
    return {
      iban: String(parsed.iban || ""),
      clothing_allowance:
        typeof parsed.clothing_allowance === "boolean" ? parsed.clothing_allowance : undefined,
    }
  } catch {
    return null
  }
}

const buildSalaryInfoFromRows = (rows: any[], crewMember: any) => {
  const firstWithIban = rows.find((row: any) => {
    const rowIban =
      row?.iban ??
      row?.bank_account ??
      row?.bankrekeningnummer ??
      row?.iban_number ??
      ""
    return String(rowIban).trim() !== ""
  })
  const firstWithIbanMeta = rows.find((row: any) => {
    const meta = parseSalaryMetaFromReason(row?.reason)
    return !!String(meta?.iban || "").trim()
  })
  const firstWithBaseSalary = rows.find((row: any) => {
    const rawBase =
      row?.base_salary ??
      row?.basissalaris ??
      row?.basis_salaris ??
      row?.salary ??
      row?.salaris ??
      null
    return parseMoney(rawBase) > 0
  })
  const firstWithTravelAllowance = rows.find((row: any) => {
    const travel =
      row?.travel_allowance ??
      row?.reiskosten ??
      row?.travel ??
      row?.reis_kosten ??
      null
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
  const rowIbanValue =
    firstWithIban?.iban ??
    firstWithIban?.bank_account ??
    firstWithIban?.bankrekeningnummer ??
    firstWithIban?.iban_number ??
    ""
  const rowBaseValue =
    firstWithBaseSalary?.base_salary ??
    firstWithBaseSalary?.basissalaris ??
    firstWithBaseSalary?.basis_salaris ??
    firstWithBaseSalary?.salary ??
    firstWithBaseSalary?.salaris ??
    null
  const clothingFromMeta = rows
    .map((row: any) => parseSalaryMetaFromReason(row?.reason)?.clothing_allowance)
    .find((v): v is boolean => typeof v === "boolean")
  const clothingAmount = resolveClothingAllowanceAmount(crewMember, clothingFromMeta)
  const baseSalaryFromRows = parseMoney(rowBaseValue)
  const baseSalaryFromRowsIncl = baseSalaryFromRows > 0 ? baseSalaryFromRows + clothingAmount : 0
  const travelFromRowsRaw =
    firstWithTravelAllowance?.travel_allowance ??
    firstWithTravelAllowance?.reiskosten ??
    firstWithTravelAllowance?.travel ??
    firstWithTravelAllowance?.reis_kosten ??
    null
  const travelFromRows =
    typeof travelFromRowsRaw === "boolean"
      ? travelFromRowsRaw
      : String(travelFromRowsRaw).toLowerCase() === "true" || parseMoney(travelFromRowsRaw) > 0

  return {
    iban: String(rowIbanValue || ibanFromMeta || crewIban || ""),
    baseSalary:
      baseSalaryFromRowsIncl > 0
        ? baseSalaryFromRowsIncl
        : crewBaseIncl > 0
          ? crewBaseIncl
          : contractBaseFromNotes > 0
            ? contractBaseFromNotes + CLOTHING_ALLOWANCE
            : null,
    travelAllowance: travelFromRows || crewTravelAllowance || contractTravelFromNotes,
  }
}

export function CrewMemberPrint({ crewMemberId, language, variant = 'single' }: Props) {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { crew, ships } = useSupabaseData()
  const [salaryInfo, setSalaryInfo] = useState<{
    iban: string
    baseSalary: number | null
    travelAllowance: boolean
  } | null>(null)
  
  // Haal taal uit URL parameter of gebruik prop, default naar 'nl'
  const printLanguage = language || (searchParams.get('lang') as 'nl' | 'de') || 'nl'
  
  const crewMember = crew.find((c: any) => c.id === crewMemberId)
  const currentUserEmail = String(user?.email || "").toLowerCase()
  const showSalarySection = currentUserEmail === "willem@bamalite.com"

  // Translation object
  const t = {
    nl: {
      noShip: "Geen schip",
      notFilled: "Niet ingevuld",
      printedOn: "Geprint op",
      personalDetails: "Persoonlijke Gegevens",
      birthDate: "Geboortedatum:",
      birthPlace: "Geboorteplaats:",
      nationality: "Nationaliteit:",
      phone: "Telefoon:",
      email: "E-mail:",
      dates: "Datums",
      inServiceFrom: "In dienst vanaf:",
      address: "Adres",
      diplomas: "Diploma's",
      workDetails: "Werkgegevens",
      function: "Functie:",
      regime: "Regime:",
      currentShip: "Huidig Schip:",
      company: "Firma:",
      salary: "Salaris",
      bankAccount: "Bankrekeningnummer:",
      baseSalaryInclClothing: "Basissalaris incl. kledinggeld:",
      travelAllowance: "Reiskosten:",
      yesWithAmount: "Ja (+€300,00)",
      no: "Nee",
      matriculeNumber: "Matricule nummer:",
      crewProfile: "Bemanningsprofiel",
      sick: "Ziek",
      toBeAssigned: "Nog in te delen",
      onBoard: "Aan boord",
      home: "Thuis"
    },
    de: {
      noShip: "Kein Schiff",
      notFilled: "Nicht ausgefüllt",
      printedOn: "Gedruckt am",
      personalDetails: "Persönliche Angaben",
      birthDate: "Geburtsdatum:",
      birthPlace: "Geburtsort:",
      nationality: "Nationalität:",
      phone: "Telefon:",
      email: "E-Mail:",
      dates: "Daten",
      inServiceFrom: "Im Dienst seit:",
      address: "Adresse",
      diplomas: "Diplome",
      workDetails: "Arbeitsangaben",
      function: "Funktion:",
      regime: "Regime:",
      currentShip: "Aktuelles Schiff:",
      company: "Firma:",
      salary: "Gehalt",
      bankAccount: "Bankkontonummer:",
      baseSalaryInclClothing: "Grundgehalt inkl. Kleidungsgeld:",
      travelAllowance: "Reisekosten:",
      yesWithAmount: "Ja (+300,00 €)",
      no: "Nein",
      matriculeNumber: "Matrikelnummer:",
      crewProfile: "Besatzungsprofil",
      sick: "Krank",
      toBeAssigned: "Noch zuzuteilen",
      onBoard: "An Bord",
      home: "Zuhause"
    }
  }

  const translations = t[printLanguage]
  const dateLocale = printLanguage === 'de' ? de : nl
  const euroFormatter = useMemo(
    () =>
      new Intl.NumberFormat(printLanguage === "de" ? "de-DE" : "nl-NL", {
        style: "currency",
        currency: "EUR",
      }),
    [printLanguage]
  )

  const getShipName = (shipId: string) => {
    if (!shipId || shipId === "none") return translations.noShip
    const ship = ships.find(s => s.id === shipId)
    return ship ? ship.name : translations.noShip
  }

  

  const getStatusText = () => {
    if (crewMember.status === "ziek") return translations.sick
    if (crewMember.status === "nog-in-te-delen") return translations.toBeAssigned
    if (!crewMember.regime) return crewMember.status === "aan-boord" ? translations.onBoard : translations.home
    
    const statusCalculation = calculateCurrentStatus(
      crewMember.regime as "1/1" | "2/2" | "3/3" | "Altijd",
      crewMember.thuis_sinds,
      crewMember.on_board_since
    )
    return statusCalculation.currentStatus === "aan-boord" ? translations.onBoard : translations.home
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return translations.notFilled
    try {
      return format(new Date(dateString), 'dd-MM-yyyy', { locale: dateLocale })
    } catch {
      return dateString
    }
  }

  useEffect(() => {
    if (!showSalarySection || !crewMemberId || !crewMember) {
      setSalaryInfo(null)
      return
    }

    let cancelled = false
    ;(async () => {
      let resolved: { iban: string; baseSalary: number | null; travelAllowance: boolean } | null = null
      const { data, error } = await supabase
        .from("loon_bemerkingen")
        .select("*")
        .eq("crew_id", crewMemberId)
        .order("month_key", { ascending: false })
        .limit(48)

      resolved = buildSalaryInfoFromRows(!error && Array.isArray(data) ? data : [], crewMember)

      if (cancelled) return
      setSalaryInfo(resolved)
    })()

    return () => {
      cancelled = true
    }
  }, [crewMemberId, crewMember, showSalarySection])

  if (!crewMember) {
    return null
  }

  const address = crewMember.address || {}
  const fullAddress = [
    address.street,
    address.postalCode && address.city ? `${address.postalCode} ${address.city}` : (address.city || address.postalCode),
    address.country
  ].filter(Boolean).join(', ') || translations.notFilled

  return (
    <>
      {variant === 'single' && (
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            html, body {
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }
            .dashboard-header,
            .print-header,
            .app-container > .dashboard-header,
            .print\\:hidden {
              display: none !important;
            }
            .crew-print-content {
              display: flex !important;
              flex-direction: column !important;
              justify-content: flex-start !important;
              box-sizing: border-box !important;
              width: 100% !important;
              max-width: none !important;
              min-height: 277mm !important;
              height: 277mm !important;
              margin: 0 !important;
              padding: 2mm 0 !important;
              background: #fff !important;
              color: #111 !important;
              font-family: Arial, Helvetica, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .crew-print-top {
              flex: 0 0 auto;
              margin-bottom: 8mm;
            }
            .crew-print-header {
              display: flex !important;
              justify-content: space-between !important;
              align-items: flex-start !important;
              gap: 8mm !important;
            }
            .crew-print-header-main {
              flex: 1 1 auto;
              min-width: 0;
            }
            .crew-print-header-meta {
              flex: 0 0 auto;
              text-align: right;
              white-space: nowrap;
              font-size: 12pt !important;
              color: #555 !important;
            }
            .crew-print-title {
              margin: 0 0 2mm 0 !important;
              font-size: 34pt !important;
              line-height: 1.1 !important;
              font-weight: 700 !important;
              color: #111 !important;
            }
            .crew-print-matricule {
              margin: 0 0 2mm 0 !important;
              font-size: 16pt !important;
              font-weight: 700 !important;
              color: #dc2626 !important;
            }
            .crew-print-subtitle {
              margin: 0 !important;
              font-size: 14pt !important;
              color: #374151 !important;
            }
            .crew-print-body {
              flex: 1 1 auto;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-evenly !important;
              gap: 0 !important;
              min-height: 0;
            }
            .crew-print-section {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .crew-print-section-title {
              margin: 0 0 3mm 0 !important;
              padding-bottom: 1.5mm !important;
              border-bottom: 1.5pt solid #93c5fd !important;
              font-size: 16pt !important;
              font-weight: 700 !important;
              color: #2563eb !important;
            }
            .crew-print-rows {
              display: flex;
              flex-direction: column;
              gap: 2.8mm;
            }
            .crew-print-row {
              display: flex !important;
              justify-content: space-between !important;
              align-items: baseline !important;
              gap: 8mm !important;
              font-size: 14pt !important;
              line-height: 1.35 !important;
            }
            .crew-print-label {
              color: #4b5563 !important;
              font-weight: 600 !important;
            }
            .crew-print-value {
              color: #111 !important;
              text-align: right !important;
            }
            .crew-print-address {
              margin: 0 !important;
              font-size: 14pt !important;
              line-height: 1.45 !important;
              color: #111 !important;
            }
            .crew-print-badges {
              display: flex;
              flex-wrap: wrap;
              gap: 2.5mm;
            }
            .crew-print-badge {
              display: inline-block;
              padding: 1.5mm 3mm;
              border: 1pt solid #93c5fd;
              border-radius: 2mm;
              background: #eff6ff;
              color: #1d4ed8;
              font-size: 12pt;
              font-weight: 600;
            }
            .crew-print-footer {
              flex: 0 0 auto;
              margin-top: 6mm;
              padding-top: 3mm;
              border-top: 1pt solid #d1d5db;
              text-align: center;
              font-size: 10pt !important;
              color: #6b7280 !important;
            }
          }
          @media screen {
            .crew-print-content {
              display: none !important;
            }
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        `}} />
      )}

      <div className={variant === 'single' ? "crew-print-content" : "crew-print-page"}>
        {variant === 'single' ? (
          <>
            <div className="crew-print-top">
              <div className="crew-print-header">
                <div className="crew-print-header-main">
                  <h1 className="crew-print-title">
                    {crewMember.first_name} {crewMember.last_name}
                  </h1>
                  {(crewMember as any).matricule &&
                    String((crewMember as any).matricule).trim() !== "" && (
                      <p className="crew-print-matricule">
                        ({translations.matriculeNumber} {(crewMember as any).matricule})
                      </p>
                    )}
                  <p className="crew-print-subtitle">
                    {getNationalityFlag(crewMember.nationality)} • {crewMember.position}
                  </p>
                </div>
                <div className="crew-print-header-meta">
                  <div>{translations.printedOn}</div>
                  <div>
                    {format(new Date(), "dd-MM-yyyy HH:mm", { locale: dateLocale })}
                  </div>
                </div>
              </div>
            </div>

            <div className="crew-print-body">
              <div className="crew-print-section">
                <h2 className="crew-print-section-title">{translations.personalDetails}</h2>
                <div className="crew-print-rows">
                  <div className="crew-print-row">
                    <span className="crew-print-label">{translations.birthDate}</span>
                    <span className="crew-print-value">{formatDate(crewMember.birth_date)}</span>
                  </div>
                  {(crewMember as any).birth_place ? (
                    <div className="crew-print-row">
                      <span className="crew-print-label">{translations.birthPlace}</span>
                      <span className="crew-print-value">{(crewMember as any).birth_place}</span>
                    </div>
                  ) : null}
                  <div className="crew-print-row">
                    <span className="crew-print-label">{translations.nationality}</span>
                    <span className="crew-print-value">
                      {getNationalityFlag(crewMember.nationality)}
                    </span>
                  </div>
                  <div className="crew-print-row">
                    <span className="crew-print-label">{translations.phone}</span>
                    <span className="crew-print-value">
                      {crewMember.phone || translations.notFilled}
                    </span>
                  </div>
                  {crewMember.email ? (
                    <div className="crew-print-row">
                      <span className="crew-print-label">{translations.email}</span>
                      <span className="crew-print-value">{crewMember.email}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="crew-print-section">
                <h2 className="crew-print-section-title">{translations.address}</h2>
                <p className="crew-print-address">{fullAddress}</p>
              </div>

              {crewMember.diplomas && crewMember.diplomas.length > 0 ? (
                <div className="crew-print-section">
                  <h2 className="crew-print-section-title">{translations.diplomas}</h2>
                  <div className="crew-print-badges">
                    {crewMember.diplomas.map((diploma: string, index: number) => (
                      <span key={index} className="crew-print-badge">
                        {diploma}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="crew-print-section">
                <h2 className="crew-print-section-title">{translations.workDetails}</h2>
                <div className="crew-print-rows">
                  <div className="crew-print-row">
                    <span className="crew-print-label">{translations.function}</span>
                    <span className="crew-print-value">{crewMember.position}</span>
                  </div>
                  <div className="crew-print-row">
                    <span className="crew-print-label">{translations.regime}</span>
                    <span className="crew-print-value">
                      {crewMember.regime || translations.notFilled}
                    </span>
                  </div>
                  <div className="crew-print-row">
                    <span className="crew-print-label">{translations.currentShip}</span>
                    <span className="crew-print-value">{getShipName(crewMember.ship_id)}</span>
                  </div>
                  {(crewMember as any).company ? (
                    <div className="crew-print-row">
                      <span className="crew-print-label">{translations.company}</span>
                      <span className="crew-print-value">{(crewMember as any).company}</span>
                    </div>
                  ) : null}
                  {(crewMember as any).in_dienst_vanaf ? (
                    <div className="crew-print-row">
                      <span className="crew-print-label">{translations.inServiceFrom}</span>
                      <span className="crew-print-value">
                        {formatDate((crewMember as any).in_dienst_vanaf)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {showSalarySection ? (
                <div className="crew-print-section">
                  <h2 className="crew-print-section-title">{translations.salary}</h2>
                  <div className="crew-print-rows">
                    <div className="crew-print-row">
                      <span className="crew-print-label">{translations.bankAccount}</span>
                      <span className="crew-print-value">
                        {salaryInfo?.iban || translations.notFilled}
                      </span>
                    </div>
                    <div className="crew-print-row">
                      <span className="crew-print-label">{translations.baseSalaryInclClothing}</span>
                      <span className="crew-print-value">
                        {typeof salaryInfo?.baseSalary === "number"
                          ? euroFormatter.format(salaryInfo.baseSalary)
                          : translations.notFilled}
                      </span>
                    </div>
                    <div className="crew-print-row">
                      <span className="crew-print-label">{translations.travelAllowance}</span>
                      <span className="crew-print-value">
                        {salaryInfo?.travelAllowance
                          ? translations.yesWithAmount
                          : translations.no}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="crew-print-footer">
              {translations.crewProfile} - {crewMember.first_name} {crewMember.last_name} -{" "}
              {translations.printedOn}{" "}
              {format(new Date(), "dd-MM-yyyy", { locale: dateLocale })}
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-1">
                    {crewMember.first_name} {crewMember.last_name}
                  </h1>
                  {(() => {
                    const matricule = (crewMember as any).matricule
                    if (matricule && matricule.toString().trim() !== "") {
                      return (
                        <p className="text-red-600 text-2xl font-semibold mb-2">
                          ({translations.matriculeNumber} {matricule})
                        </p>
                      )
                    }
                    return null
                  })()}
                  <div className="flex items-center gap-2 text-base text-gray-700">
                    <span>{getNationalityFlag(crewMember.nationality)}</span>
                    <span>•</span>
                    <span>{crewMember.position}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{translations.printedOn}</div>
                  <div className="font-semibold">
                    {format(new Date(), "dd-MM-yyyy HH:mm", { locale: dateLocale })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-blue-600 mb-3 border-b border-blue-200 pb-1">
                  {translations.personalDetails}
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">{translations.birthDate}</span>
                    <span>{formatDate(crewMember.birth_date)}</span>
                  </div>
                  {(crewMember as any).birth_place && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">{translations.birthPlace}</span>
                      <span>{(crewMember as any).birth_place}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">{translations.nationality}</span>
                    <span>{getNationalityFlag(crewMember.nationality)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">{translations.phone}</span>
                    <span>{crewMember.phone || translations.notFilled}</span>
                  </div>
                  {crewMember.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">{translations.email}</span>
                      <span>{crewMember.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-blue-600 mb-3 border-b border-blue-200 pb-1">
                  {translations.address}
                </h2>
                <div className="text-sm">
                  <p className="text-gray-900">{fullAddress}</p>
                </div>
              </div>

              {crewMember.diplomas && crewMember.diplomas.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-blue-600 mb-3 border-b border-blue-200 pb-1">
                    {translations.diplomas}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {crewMember.diplomas.map((diploma: string, index: number) => (
                      <span
                        key={index}
                        className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 rounded text-sm font-medium text-blue-700"
                      >
                        {diploma}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-lg font-bold text-blue-600 mb-3 border-b border-blue-200 pb-1">
                  {translations.workDetails}
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">{translations.function}</span>
                    <span>{crewMember.position}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">{translations.regime}</span>
                    <span>{crewMember.regime || translations.notFilled}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">{translations.currentShip}</span>
                    <span>{getShipName(crewMember.ship_id)}</span>
                  </div>
                  {(crewMember as any).company && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">{translations.company}</span>
                      <span>{(crewMember as any).company}</span>
                    </div>
                  )}
                  {(crewMember as any).in_dienst_vanaf && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">{translations.inServiceFrom}</span>
                      <span>{formatDate((crewMember as any).in_dienst_vanaf)}</span>
                    </div>
                  )}
                </div>
              </div>

              {showSalarySection && (
                <div>
                  <h2 className="text-lg font-bold text-blue-600 mb-3 border-b border-blue-200 pb-1">
                    {translations.salary}
                  </h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">{translations.bankAccount}</span>
                      <span>{salaryInfo?.iban || translations.notFilled}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">{translations.baseSalaryInclClothing}</span>
                      <span>
                        {typeof salaryInfo?.baseSalary === "number"
                          ? euroFormatter.format(salaryInfo.baseSalary)
                          : translations.notFilled}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">{translations.travelAllowance}</span>
                      <span>
                        {salaryInfo?.travelAllowance
                          ? translations.yesWithAmount
                          : translations.no}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
              {translations.crewProfile} - {crewMember.first_name} {crewMember.last_name} -{" "}
              {translations.printedOn}{" "}
              {format(new Date(), "dd-MM-yyyy", { locale: dateLocale })}
            </div>
          </>
        )}
      </div>
    </>
  )
}

