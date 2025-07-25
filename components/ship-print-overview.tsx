"use client"

import { shipDatabase, sickLeaveDatabase, sickLeaveHistoryDatabase } from "@/data/crew-database"
import { isCrewMemberOutOfService } from "@/utils/out-of-service-storage"
import { format } from "date-fns"
import { nl } from "date-fns/locale/nl"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Printer, Users, CheckCircle, Clock, UserX } from "lucide-react"
import { useCrewData } from "@/hooks/use-crew-data"

export function ShipPrintOverview() {
  // Gebruik de hook voor gecombineerde crew data
  const allCrewData = useCrewData()

  // Firma mapping
  const companyMapping = {
    "ms-bacchus": "ALCINA S.A.",
    "ms-bellona": "ALCINA S.A.",
    "ms-pluto": "ALCINA S.A.",
    "ms-apollo": "BAMALITE S.A.",
    "ms-jupiter": "BAMALITE S.A.",
    "ms-neptunus": "BAMALITE S.A.",
    "ms-realite": "BAMALITE S.A.",
    "ms-harmonie": "BRUGO SHIPPING SARL",
    "ms-linde": "BRUGO SHIPPING SARL",
    "ms-primera": "BRUGO SHIPPING SARL",
    "ms-caritas": "DEVELSHIPPING S.A.",
    "ms-libertas": "DEVELSHIPPING S.A.",
    "ms-maike": "DEVELSHIPPING S.A.",
    "ms-egalite": "EUROPE SHIPPING AG.",
    "ms-fidelitas": "EUROPE SHIPPING AG.",
    "ms-serenitas": "EUROPE SHIPPING AG."
  }

  // Groepeer schepen per firma (exclusief MS Realite voor print)
  const groupedShips = Object.values(shipDatabase).reduce((acc: any, ship: any) => {
    // Skip MS Realite voor print
    if (ship.id === "ms-realite") {
      return acc
    }
    
    const company = companyMapping[ship.id as keyof typeof companyMapping] || "Overig"
    if (!acc[company]) {
      acc[company] = []
    }
    acc[company].push(ship)
    return acc
  }, {})

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱", CZ: "🇨🇿", SLK: "🇸🇰", EG: "🇪🇬", PO: "🇵🇱", 
      SERV: "🇷🇸", HUN: "🇭🇺", BE: "🇧🇪", FR: "🇫🇷", DE: "🇩🇪", LUX: "🇱🇺"
    }
    return flags[nationality] || "🌍"
  }

  const getRotationDate = (crew: any) => {
    if (crew.assignmentHistory && Array.isArray(crew.assignmentHistory) && crew.assignmentHistory.length > 0) {
      const latestAssignment = crew.assignmentHistory
        .filter((assignment: any) => assignment.action === "aflos-periode" || assignment.action === "verplaatst")
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      
      if (latestAssignment && latestAssignment.to) {
        return format(new Date(latestAssignment.to), "dd-MM-yyyy", { locale: nl })
      }
    }
    
    // Bereken op basis van aan boord datum en regime
    if (crew.status === "aan-boord" && crew.onBoardSince) {
      const onBoardDate = new Date(crew.onBoardSince)
      const daysToAdd = crew.regime === "1/1" ? 1 : crew.regime === "2/2" ? 2 : 3
      onBoardDate.setDate(onBoardDate.getDate() + daysToAdd)
      return format(onBoardDate, "dd-MM-yyyy", { locale: nl })
    } else if (crew.status === "thuis" && crew.thuisSinds) {
      const homeDate = new Date(crew.thuisSinds)
      const daysToAdd = crew.regime === "1/1" ? 1 : crew.regime === "2/2" ? 2 : 3
      homeDate.setDate(homeDate.getDate() + daysToAdd)
      return format(homeDate, "dd-MM-yyyy", { locale: nl })
    }
    
    // Fallback naar huidige datum
    const baseDate = new Date()
    const daysToAdd = crew.regime === "1/1" ? 1 : crew.regime === "2/2" ? 2 : 3
    baseDate.setDate(baseDate.getDate() + daysToAdd)
    return format(baseDate, "dd-MM-yyyy", { locale: nl })
  }

  const getOnBoardDate = (crew: any) => {
    if (crew.onBoardSince) {
      return format(new Date(crew.onBoardSince), "dd-MM-yyyy", { locale: nl })
    }
    
    if (crew.assignmentHistory && Array.isArray(crew.assignmentHistory)) {
      const onBoardAssignment = crew.assignmentHistory
        .filter((assignment: any) => assignment.action === "aan-boord" || assignment.action === "verplaatst")
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      
      if (onBoardAssignment && onBoardAssignment.date) {
        return format(new Date(onBoardAssignment.date), "dd-MM-yyyy", { locale: nl })
      }
    }
    
    return "Onbekend"
  }

  const getHomeDate = (crew: any) => {
    // Voor thuis bemanning: gebruik onBoardSince als basis voor wanneer ze naar huis zijn gegaan
    if (crew.status === "thuis" && crew.onBoardSince) {
      const regimeWeeks = Number.parseInt(crew.regime.split("/")[0])
      const homeSince = new Date(crew.onBoardSince)
      homeSince.setDate(homeSince.getDate() + regimeWeeks * 7)
      return format(homeSince, "dd-MM-yyyy", { locale: nl })
    }
    
    if (crew.thuisSinds) {
      return format(new Date(crew.thuisSinds), "dd-MM-yyyy", { locale: nl })
    }
    
    if (crew.assignmentHistory && Array.isArray(crew.assignmentHistory)) {
      const homeAssignment = crew.assignmentHistory
        .filter((assignment: any) => assignment.action === "thuis" || assignment.action === "verplaatst")
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      
      if (homeAssignment && homeAssignment.date) {
        return format(new Date(homeAssignment.date), "dd-MM-yyyy", { locale: nl })
      }
    }
    
    return "Onbekend"
  }

  const getNotes = (crew: any) => {
    if (crew.notes && Array.isArray(crew.notes) && crew.notes.length > 0) {
      const latestNote = crew.notes[crew.notes.length - 1]
      return latestNote.content
    }
    return "Geen bijzonderheden"
  }

  const getSickLeaveInfo = (crewId: string) => {
    // Check localStorage first
    let localStorageSickLeave = {}
    if (typeof window !== 'undefined') {
      try {
        const storedSickLeave = JSON.parse(localStorage.getItem('sickLeaveDatabase') || '{}')
        localStorageSickLeave = storedSickLeave
      } catch (e) {
        console.error('Error parsing localStorage sickLeave:', e)
      }
    }
    
    // Combine databases
    const allSickLeaveData = { ...sickLeaveDatabase, ...localStorageSickLeave }
    
    const sickLeave = Object.values(allSickLeaveData).find((sick: any) => 
      sick.crewMemberId === crewId && (sick.status === "actief" || sick.status === "wacht-op-briefje")
    )
    
    return sickLeave || null
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="print-container">
      {/* Print Button - Alleen zichtbaar op scherm */}
      <div className="no-print mb-6">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Print Overzicht
        </Button>
      </div>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4;
              margin: 0.1cm;
            }
            
            .print-container {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              font-size: 13px;
              line-height: 0.9;
              color: #1f2937;
              background: white;
            }
            .no-print { display: none !important; }
            .page-break { 
              page-break-before: always; 
              margin-top: 1.5cm !important;
            }
            
            .print-header {
              margin-bottom: 6px !important;
              margin-top: 0 !important;
              padding-top: 0 !important;
              display: block !important;
            }
            
            .print-container {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }
            
            .company-header {
              background: #1f2937 !important;
              color: white !important;
              margin-bottom: 0.5px !important;
              padding: 0.5px 1px !important;
              border-radius: 1px !important;
            }
            
            .sick-header {
              background: #dc2626 !important;
              color: white !important;
              margin-bottom: 2px !important;
              padding: 2px !important;
              border-radius: 1px !important;
            }
            
            .ship-card {
              border: 0.5px solid #e5e7eb;
              border-radius: 1px;
              margin-bottom: 0.5px !important;
              background: white;
            }
            
            .ship-card .card-header {
              padding: 0.25px 0.5px !important;
            }
            
            .ship-card .card-content {
              padding: 0.25px 0.5px !important;
            }
            
            .crew-card {
              border: 0.5px solid #e5e7eb;
              border-radius: 1px;
              padding: 0.5px !important;
              background: white;
              margin-bottom: 0px !important;
            }
            
            .aan-boord-bg { 
              background: #f0fdf4 !important; 
              border: 0.5px solid #059669 !important; 
              padding: 0.25px !important;
              margin-bottom: 0px !important;
            }
            .thuis-bg { 
              background: #eff6ff !important; 
              border: 0.5px solid #ea580c !important; 
              padding: 0.25px !important;
              margin-bottom: 0px !important;
            }
            .ziek-bg { background: #fef2f2 !important; border: 0.5px solid #dc2626 !important; }
            .nog-in-te-delen-bg { background: #fef3c7 !important; border: 0.5px solid #d97706 !important; }
            
            .grid { gap: 0.15px !important; }
            .space-y-2 > * + * { margin-top: 0px !important; }
            .space-y-1 > * + * { margin-top: 0px !important; }
            .space-y-0\\.5 > * + * { margin-top: 0.3px !important; }
            .mb-3 { margin-bottom: 0.3px !important; }
            .mb-2 { margin-bottom: 0.3px !important; }
            .mb-8 { margin-bottom: 0.5px !important; }
            .mb-4 { margin-bottom: 0.3px !important; }
            .mt-8 { margin-top: 0.3px !important; }
            .mt-12 { margin-top: 1.5cm !important; }
            .mt-4 { margin-top: 0.3px !important; }
            .mt-2 { margin-top: 0.3px !important; }
            .mt-1 { margin-top: 0.3px !important; }
            .mt-0\\.5 { margin-top: 0.15px !important; }
            .mb-0\\.25 { margin-bottom: 0.1px !important; }
            .mt-0\\.5 { margin-top: 0.15px !important; }
            .p-3 { padding: 0.3px !important; }
            .p-4 { padding: 0.3px !important; }
            .p-2 { padding: 0.3px !important; }
            .p-1 { padding: 0.3px !important; }
            .p-0\\.5 { padding: 0.4px !important; }
            .p-0\\.25 { padding: 0.2px !important; }
            .space-x-3 > * + * { margin-left: 0.5px !important; }
            .space-x-2 > * + * { margin-left: 1px !important; }
            .space-x-1 > * + * { margin-left: 0.5px !important; }
            .ml-5 { margin-left: 2.5px !important; }
            .ml-8 { margin-left: 4px !important; }
            .ml-4 { margin-left: 2px !important; }
            
            .text-lg { font-size: 15px !important; }
            .text-base { font-size: 13px !important; }
            .text-sm { font-size: 12px !important; }
            .text-xs { font-size: 11px !important; }
            .text-2xl { font-size: 20px !important; }
            .text-3xl { font-size: 22px !important; }
            
            .w-6 { width: 2px !important; height: 2px !important; }
            .h-6 { height: 2px !important; }
            .w-8 { width: 3px !important; height: 3px !important; }
            .h-8 { height: 3px !important; }
            .w-4 { width: 2px !important; height: 2px !important; }
            .h-4 { height: 2px !important; }
            .w-3 { width: 1px !important; height: 1px !important; }
            .h-3 { height: 1px !important; }
            .w-1\\.5 { width: 1px !important; height: 1px !important; }
            .h-1\\.5 { height: 1px !important; }
            
            .rounded-lg { border-radius: 1px !important; }
            .rounded { border-radius: 0.5px !important; }
            
            .border-2 { border-width: 0.5px !important; }
            .border { border-width: 0.5px !important; }
            
            .gap-2 { gap: 0.3px !important; }
            .gap-4 { gap: 0.5px !important; }
            .gap-1 { gap: 0.3px !important; }
            .gap-0\\.5 { gap: 0.2px !important; }
            .gap-0\\.25 { gap: 0.1px !important; }
            
            .min-w-0 { min-width: 0 !important; }
            .flex-1 { flex: 1 !important; }
            
            .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
            
            .italic { font-style: italic !important; }
            .font-medium { font-weight: 600 !important; }
            .font-bold { font-weight: 800 !important; }
            .font-semibold { font-weight: 700 !important; }
            
            .text-center { text-align: center !important; }
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            
            .flex { display: flex !important; }
            .grid { display: grid !important; }
            .hidden { display: none !important; }
            .block { display: block !important; }
            
            .items-center { align-items: center !important; }
            .justify-between { justify-content: space-between !important; }
            .justify-center { justify-content: center !important; }
            
            .bg-gradient-to-r { background: linear-gradient(to right, var(--tw-gradient-stops)) !important; }
            .from-gray-800 { --tw-gradient-from: #1f2937 !important; }
            .to-gray-900 { --tw-gradient-to: #111827 !important; }
            .from-red-600 { --tw-gradient-from: #dc2626 !important; }
            .to-red-700 { --tw-gradient-to: #b91c1c !important; }
            
            .bg-green-50 { background-color: #f0fdf4 !important; }
            .bg-blue-50 { background-color: #eff6ff !important; }
            .bg-yellow-50 { background-color: #fef3c7 !important; }
            .bg-yellow-100 { background-color: #fef3c7 !important; }
            .bg-gray-50 { background-color: #f9fafb !important; }
            
            .text-green-600 { color: #059669 !important; }
            .text-green-700 { color: #047857 !important; }
            .text-blue-600 { color: #2563eb !important; }
            .text-blue-700 { color: #1d4ed8 !important; }
            .text-yellow-600 { color: #d97706 !important; }
            .text-yellow-700 { color: #b45309 !important; }
            .text-yellow-800 { color: #92400e !important; }
            .text-orange-600 { color: #ea580c !important; }
            .text-gray-500 { color: #6b7280 !important; }
            .text-gray-600 { color: #4b5563 !important; }
            .text-gray-700 { color: #374151 !important; }
            .text-gray-900 { color: #111827 !important; }
            .text-white { color: white !important; }
            .text-red-600 { color: #dc2626 !important; }
            .text-red-700 { color: #b91c1c !important; }
            
            .border-green-600 { border-color: #059669 !important; }
            .border-orange-500 { border-color: #f97316 !important; }
            .border-yellow-600 { border-color: #d97706 !important; }
            .border-yellow-200 { border-color: #fde047 !important; }
            .border-gray-200 { border-color: #e5e7eb !important; }
            
            .bg-green-100 { background-color: #dcfce7 !important; }
            .bg-blue-100 { background-color: #dbeafe !important; }
            .bg-yellow-100 { background-color: #fef3c7 !important; }
            
            .variant-outline { border: 0.5px solid currentColor !important; background: transparent !important; }
            .variant-secondary { background-color: #f3f4f6 !important; color: #374151 !important; }
            .variant-destructive { background-color: #fef2f2 !important; color: #dc2626 !important; }
          }
        `
      }} />

      {/* Print Header - Direct boven de eerste firma */}
      <div className="print-header text-center mb-4">
        <h1 className="text-sm font-bold text-gray-900 mb-1">Bemanningslijst</h1>
        <p className="text-xs text-gray-500">Printdatum: {format(new Date(), "dd-MM-yyyy HH:mm", { locale: nl })}</p>
      </div>

      {/* Schepen per firma */}
      {Object.entries(groupedShips).map(([company, companyShips]: [string, any], companyIndex) => (
        <div key={company} className={companyIndex > 0 ? "page-break mt-12" : ""}>
          {/* Firma Header */}
          <div className="company-header bg-gradient-to-r from-gray-800 to-gray-900 text-white p-1 rounded mb-1">
            <h2 className="text-sm font-bold text-center">{company}</h2>
          </div>

          {/* Schepen van deze firma */}
          {companyShips.map((ship: any, shipIndex: number) => {
            const shipCrew = Object.values(allCrewData).filter((crew: any) => 
              crew.shipId === ship.id && crew.id !== "ziek"
            )
            
            const aanBoordCrew = shipCrew.filter((crew: any) => crew.status === "aan-boord" && !getSickLeaveInfo(crew.id))
            const thuisCrew = shipCrew.filter((crew: any) => crew.status === "thuis" && !getSickLeaveInfo(crew.id))
            const nogInTeDelenCrew = shipCrew.filter((crew: any) => crew.status === "nog-in-te-delen" && !getSickLeaveInfo(crew.id))

            return (
              <Card key={ship.id} className={`ship-card ${shipIndex > 0 ? 'mt-0.25' : ''}`}>
                <CardHeader className="pb-0.5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs">{ship.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Bemanning Layout - Aan Boord links, Thuis rechts */}
                  <div className="grid grid-cols-2 gap-0.5">
                    {/* Linkerkant - Aan Boord bemanning */}
                    <div>
                      {aanBoordCrew.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-1 mb-0.5">
                            <CheckCircle className="w-2 h-2 text-green-600" />
                            <h4 className="font-medium text-gray-900 text-xs">Aan Boord ({aanBoordCrew.length})</h4>
                          </div>
                          <div className="space-y-0.5">
                            {aanBoordCrew.map((crew: any) => (
                              <div 
                                key={crew.id} 
                                className="flex items-center space-x-1 p-0.5 aan-boord-bg rounded border border-green-600"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-xs text-gray-900">
                                    <span className="text-green-700">{crew.firstName} {crew.lastName}</span>
                                    <span className="text-xs ml-8">{getNationalityFlag(crew.nationality)}</span>
                                  </div>
                                  <div className="text-xs text-gray-600">{crew.position} • {crew.regime}</div>
                                  <div className="text-xs text-gray-600">{getOnBoardDate(crew)} → {getRotationDate(crew)}</div>
                                  {crew.diplomas && crew.diplomas.length > 0 && (
                                    <div className="text-xs text-gray-500">
                                      <span className="font-medium">D:</span> {crew.diplomas.join(', ')}
                                    </div>
                                  )}
                                  {crew.notes && (
                                    <div className="text-xs text-orange-600 italic">
                                        {getNotes(crew)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rechterkant - Thuis bemanning */}
                    <div>
                      {thuisCrew.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-1 mb-0.5">
                            <Clock className="w-2 h-2 text-blue-600" />
                            <h4 className="font-medium text-gray-900 text-xs">Thuis ({thuisCrew.length})</h4>
                          </div>
                          <div className="space-y-0.5">
                            {thuisCrew.map((crew: any) => (
                              <div 
                                key={crew.id} 
                                className="flex items-center space-x-1 p-0.5 thuis-bg rounded border border-orange-500"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-xs text-gray-900">
                                    <span className="text-blue-700">{crew.firstName} {crew.lastName}</span>
                                    <span className="text-xs ml-8">{getNationalityFlag(crew.nationality)}</span>
                                  </div>
                                  <div className="text-xs text-gray-600">{crew.position} • {crew.regime}</div>
                                  <div className="text-xs text-gray-600">{getHomeDate(crew)} → {getRotationDate(crew)}</div>
                                  {crew.diplomas && crew.diplomas.length > 0 && (
                                    <div className="text-xs text-gray-500">
                                      <span className="font-medium">D:</span> {crew.diplomas.join(', ')}
                                    </div>
                                  )}
                                  {crew.notes && (
                                    <div className="text-xs text-orange-600 italic">
                                        {getNotes(crew)}
                                    </div>
                                  )}

                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Ziekte informatie voor dit schip - Compact onder bemanningsleden */}
                  {(() => {
                    const shipSickCrew = shipCrew.filter((crew: any) => {
                      const sickInfo = getSickLeaveInfo(crew.id)
                      return sickInfo !== null
                    })
                    
                    if (shipSickCrew.length > 0) {
                      return (
                        <div className="mt-0.5">
                          <div className="flex items-center space-x-1 mb-0.25">
                            <UserX className="w-1.5 h-1.5 text-red-600" />
                            <h4 className="font-medium text-gray-900 text-xs">Ziek ({shipSickCrew.length})</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-0.25">
                            {shipSickCrew.map((crew: any) => {
                              const sickInfo = getSickLeaveInfo(crew.id)
                              if (!sickInfo) return null
                              
                              return (
                                <div 
                                  key={crew.id} 
                                  className="p-0.25 ziek-bg rounded border border-red-600"
                                >
                                  <div className="min-w-0">
                                    <div className="font-medium text-xs text-gray-900">
                                      <span className="text-red-700">{crew.firstName} {crew.lastName}</span>
                                      <span className="text-xs ml-4">{getNationalityFlag(crew.nationality)}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">{crew.position}</div>
                                    <div className="text-xs text-red-600">
                                      <span className="font-medium">Ziek:</span> {(sickInfo as any)?.notes || "Onbekend"}
                                    </div>
                                    <div className="text-xs text-red-600">
                                      <span className="font-medium">Briefje tot:</span> {(sickInfo as any)?.certificateValidUntil ? format(new Date((sickInfo as any).certificateValidUntil), "dd-MM-yyyy", { locale: nl }) : "Onbekend"}
                                    </div>
                                    <div className="text-xs text-red-600">
                                      <span className="font-medium">Betaald door:</span> {(sickInfo as any)?.paidBy || "Onbekend"} • {(sickInfo as any)?.salaryPercentage || 0}%
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Nog in te delen bemanning */}
                  {nogInTeDelenCrew.length > 0 && (
                    <div className="mt-1">
                      <div className="flex items-center space-x-1 mb-0.5">
                        <Users className="w-2 h-2 text-yellow-600" />
                        <h4 className="font-medium text-gray-900 text-xs">Nog in te delen ({nogInTeDelenCrew.length})</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-0.5">
                        {nogInTeDelenCrew.map((crew: any) => (
                          <div 
                            key={crew.id} 
                                className="flex items-center space-x-1 p-0.5 nog-in-te-delen-bg rounded border border-yellow-600"
                          >
                            <div className="flex-1 min-w-0">
                                  <div className="font-medium text-xs text-gray-900">
                                <span className="text-yellow-700">{crew.firstName} {crew.lastName}</span>
                                    <span className="text-xs ml-8">{getNationalityFlag(crew.nationality)}</span>
                                  </div>
                              <div className="text-xs text-gray-600">{crew.position} • {crew.regime}</div>
                                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                                  Nog in te delen
                                </Badge>
                              {crew.diplomas && crew.diplomas.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  <span className="font-medium">D:</span> {crew.diplomas.join(', ')}
                                </div>
                              )}
                              {crew.notes && (
                                <div className="text-xs text-orange-600 italic">
                                    {getNotes(crew)}
                                </div>
                              )}

                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}



                </CardContent>
              </Card>
            )
          })}
        </div>
      ))}

      {/* Overzicht Sectie - Alle extra informatie op één blad */}
      <div className="page-break">
        {/* Nog in te delen bemanning */}
        {(() => {
          const allNogInTeDelenCrew = Object.values(allCrewData).filter((crew: any) => 
            crew.shipId === "nog-in-te-delen" && crew.status !== "uit-dienst"
          )
          
          if (allNogInTeDelenCrew.length > 0) {
            return (
              <div className="mb-4">
                <div className="sick-header bg-gradient-to-r from-yellow-600 to-yellow-700 text-white p-2 rounded mb-2">
                  <h2 className="text-sm font-bold text-center">👥 NOG IN TE DELEN BEMANNING</h2>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {allNogInTeDelenCrew.map((crew: any) => (
                    <div 
                      key={crew.id} 
                      className="border border-yellow-200 rounded p-1 bg-yellow-50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-xs text-yellow-700">{crew.firstName} {crew.lastName}</h4>
                        <span className="text-xs">{getNationalityFlag(crew.nationality)}</span>
                      </div>
                      <div className="text-xs text-yellow-600">
                        <div>{crew.position} • {crew.regime}</div>
                        {crew.diplomas && crew.diplomas.length > 0 && (
                          <div><span className="font-medium">D:</span> {crew.diplomas.join(', ')}</div>
                        )}
                        {crew.phone && (
                          <div>📞 {crew.phone}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          return null
        })()}

        {/* Ziekte Sectie */}
        <div className="mb-4">
          <div className="sick-header bg-gradient-to-r from-red-600 to-red-700 text-white p-2 rounded mb-2">
            <h2 className="text-sm font-bold text-center">🏥 ZIEKTE OVERZICHT</h2>
        </div>

        {/* Actieve ziekmeldingen */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Actieve ziekmeldingen</h3>
            <div className="space-y-1">
              {(() => {
                // Get localStorage sick leave data
                let localStorageSickLeave = {}
                if (typeof window !== 'undefined') {
                  try {
                    const storedSickLeave = JSON.parse(localStorage.getItem('sickLeaveDatabase') || '{}')
                    localStorageSickLeave = storedSickLeave
                  } catch (e) {
                    console.error('Error parsing localStorage sickLeave:', e)
                  }
                }
                
                // Combine databases
                const allSickLeaveData = { ...sickLeaveDatabase, ...localStorageSickLeave }
                
                return Object.values(allSickLeaveData)
              .filter((sick: any) => sick.status === "actief" || sick.status === "wacht-op-briefje")
              .map((sick: any) => {
                  const crewMember = (allCrewData as any)[sick.crewMemberId]
                if (!crewMember) return null

                return (
                    <div key={sick.id} className="border border-red-200 rounded p-1 bg-red-50">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-xs text-red-700">{crewMember.firstName} {crewMember.lastName}</h4>
                        <Badge variant={sick.status === "actief" ? "destructive" : "secondary"} className="text-xs">
                        {sick.status === "actief" ? "Actief" : "Wacht op briefje"}
                      </Badge>
                      </div>
                      <div className="text-xs text-red-600">
                        <div><span className="font-medium">Ziek vanaf:</span> {sick.startDate ? format(new Date(sick.startDate), "dd-MM-yyyy", { locale: nl }) : "Onbekend"}</div>
                        <div><span className="font-medium">Ziek:</span> {sick.notes || "Onbekend"}</div>
                        <div><span className="font-medium">Briefje tot:</span> {sick.certificateValidUntil ? format(new Date(sick.certificateValidUntil), "dd-MM-yyyy", { locale: nl }) : "Onbekend"}</div>
                        <div><span className="font-medium">Betaald door:</span> {sick.paidBy || "Onbekend"} • {sick.salaryPercentage || 0}%</div>
                      </div>
                    </div>
                  )
                })
              })()}
          </div>
        </div>

        {/* Openstaande terug staan dagen */}
        <div>
            <h3 className="text-sm font-semibold mb-2">Openstaande terug staan dagen</h3>
            <div className="space-y-1">
            {Object.values(sickLeaveHistoryDatabase)
              .filter((history: any) => history.type === "terug-staan" && !history.completed)
              .map((history: any) => {
                  const crewMember = (allCrewData as any)[history.crewMemberId]
                if (!crewMember) return null

                return (
                    <div key={history.id} className="border border-gray-200 rounded p-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-xs">{crewMember.firstName} {crewMember.lastName}</h4>
                        <Badge variant="outline" className="text-xs">Terug staan</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div>
                          <span className="font-medium">Van:</span> {history.startDate ? format(new Date(history.startDate), "dd-MM-yyyy", { locale: nl }) : "Onbekend"}
                      </div>
                      <div>
                          <span className="font-medium">Tot:</span> {history.endDate ? format(new Date(history.endDate), "dd-MM-yyyy", { locale: nl }) : "Onbekend"}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Notitie:</span> {history.note}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Alleen zichtbaar op scherm */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-500 no-print">
        <div className="bg-gray-50 p-3 rounded">
          <p className="font-semibold text-gray-700">Multi-Company HR Management Systeem</p>
          <p className="text-gray-600">Voor vragen: hr@bamalite.com</p>
        </div>
      </div>

      {/* Print Footer - Alleen zichtbaar bij printen */}
      <div className="print-footer hidden print:block mt-2 pt-1 border-t border-gray-200 text-center text-xs text-gray-500">
        <div className="bg-gray-50 p-1 rounded">
          <p className="font-semibold text-gray-700 text-xs">Multi-Company HR Management Systeem</p>
          <p className="text-gray-600 text-xs">Pagina 1 van {Object.keys(groupedShips).length + 1} firma's | Geprint op {format(new Date(), "dd-MM-yyyy HH:mm", { locale: nl })}</p>
        </div>
      </div>
    </div>
  )
} 