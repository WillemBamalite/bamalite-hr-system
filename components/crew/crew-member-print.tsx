"use client"

import { useSupabaseData } from "@/hooks/use-supabase-data"
import { format } from "date-fns"
import { nl, de } from "date-fns/locale"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import { useSearchParams } from "next/navigation"

interface Props {
  crewMemberId: string
  language?: 'nl' | 'de'
  /**
   * single  = standalone print (detailpagina bemanningslid, met eigen globale print CSS)
   * firma   = gebruikt binnen firma-wisseling verzamelprint (geen globale CSS, alleen pagina-breaks)
   */
  variant?: 'single' | 'firma'
}

export function CrewMemberPrint({ crewMemberId, language, variant = 'single' }: Props) {
  const searchParams = useSearchParams()
  const { crew, ships } = useSupabaseData()
  
  // Haal taal uit URL parameter of gebruik prop, default naar 'nl'
  const printLanguage = language || (searchParams.get('lang') as 'nl' | 'de') || 'nl'
  
  const crewMember = crew.find((c: any) => c.id === crewMemberId)
  
  if (!crewMember) {
    return null
  }

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
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          {translations.crewProfile} - {crewMember.first_name} {crewMember.last_name} - {translations.printedOn} {format(new Date(), 'dd-MM-yyyy', { locale: dateLocale })}
        </div>
      </div>
    </>
  )
}

