"use client"

import { useSupabaseData } from "@/hooks/use-supabase-data"
import { format } from "date-fns"
import { nl, de } from "date-fns/locale"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { useEffect, useMemo, useState } from "react"

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
    const parsed = JSON.parse(jsonPart) as { iban?: string }
    return { iban: String(parsed.iban || "") }
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
  const baseSalaryFromRows = parseMoney(rowBaseValue)
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
      baseSalaryFromRows > 0
        ? baseSalaryFromRows
        : crewBaseIncl > 0
          ? crewBaseIncl
          : contractBaseFromNotes > 0
            ? contractBaseFromNotes
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

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱",
      CZ: "🇨🇿",
      SLK: "🇸🇰",
      EG: "🇪🇬",
      PO: "🇵🇱",
      SERV: "🇷🇸",
      HUN: "🇭🇺",
      BE: "🇧🇪",
      FR: "🇫🇷",
      DE: "🇩🇪",
      LUX: "🇱🇺",
    }
    return flags[nationality] || "🌍"
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
            body * {
              visibility: hidden;
            }
            .crew-print-content,
            .crew-print-content * {
              visibility: visible;
            }
            .crew-print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 210mm;
              min-height: 297mm;
              padding: 20mm;
              background: white;
              font-family: 'Arial', sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              page-break-after: always;
            }
            .no-print,
            header,
            nav,
            button {
              display: none !important;
            }
          }
          @media screen {
            .crew-print-content {
              display: none;
            }
          }
          @page {
            size: A4;
            margin: 0;
          }
        `}} />
      )}
      
      <div className={variant === 'single' ? "crew-print-content" : "crew-print-page"}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-1">
                {crewMember.first_name} {crewMember.last_name}
              </h1>
              {(() => {
                const matricule = (crewMember as any).matricule
                if (matricule && matricule.toString().trim() !== '') {
                  return (
                    <p className="text-red-600 text-2xl font-semibold mb-2">
                      ({translations.matriculeNumber} {matricule})
                    </p>
                  )
                }
                return null
              })()}
              <div className="flex items-center gap-2 text-base text-gray-700">
                <span>{getNationalityFlag(crewMember.nationality)} {crewMember.nationality}</span>
                <span>•</span>
                <span>{crewMember.position}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">{translations.printedOn}</div>
              <div className="font-semibold">{format(new Date(), 'dd-MM-yyyy HH:mm', { locale: dateLocale })}</div>
            </div>
          </div>
        </div>

        {/* Main Content - Vertical Layout */}
        <div className="space-y-6">
          {/* Persoonlijke Gegevens */}
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
                <span>{getNationalityFlag(crewMember.nationality)} {crewMember.nationality}</span>
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

          {/* Datums */}
          {(crewMember as any).in_dienst_vanaf && (
            <div>
              <h2 className="text-lg font-bold text-blue-600 mb-3 border-b border-blue-200 pb-1">
                {translations.dates}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">{translations.inServiceFrom}</span>
                  <span>{formatDate((crewMember as any).in_dienst_vanaf)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Adres */}
          <div>
            <h2 className="text-lg font-bold text-blue-600 mb-3 border-b border-blue-200 pb-1">
              {translations.address}
            </h2>
            <div className="text-sm">
              <p className="text-gray-900">{fullAddress}</p>
            </div>
          </div>

          {/* Diploma's */}
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

          {/* Werkgegevens */}
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
                    {salaryInfo?.travelAllowance ? translations.yesWithAmount : translations.no}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          {translations.crewProfile} - {crewMember.first_name} {crewMember.last_name} - {translations.printedOn} {format(new Date(), 'dd-MM-yyyy', { locale: dateLocale })}
        </div>
      </div>
    </>
  )
}

