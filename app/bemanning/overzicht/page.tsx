"use client"

import { getCombinedShipDatabase } from "@/utils/ship-utils"
import { useLocalStorageData } from "@/hooks/use-localStorage-data"
import { isCrewMemberOutOfService } from "@/utils/out-of-service-storage"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

const RANK_ORDER = [
  "Schipper",
  "Stuurman",
  "Vol Matroos",
  "Matroos",
  "Lichtmatroos",
  "Deksman"
];

export default function CrewOverviewPage() {
  const { crewDatabase: allCrewData } = useLocalStorageData()
  const [filteredCrew, setFilteredCrew] = useState<any[]>([])
  const [grouped, setGrouped] = useState<{ [rank: string]: any[] }>({})



  useEffect(() => {
    // Combineer alle databases
    
    // MIGRATIE: Zet alle 'Kapitein' direct om naar 'Schipper' in de database
    Object.values(allCrewData).forEach((c: any) => {
      if (c.position === "Kapitein") {
        c.position = "Schipper";
      }
    });
      
      const crew = Object.values(allCrewData).filter((c: any) => !isCrewMemberOutOfService(c.id))
      setFilteredCrew(crew)
      

      
    // Groepeer per rang op basis van exacte dropdownwaarde
      const groupedData: { [rank: string]: any[] } = {}
    crew.forEach((c) => {
      const rank = RANK_ORDER.includes(c.position) ? c.position : "Overig"
        if (!groupedData[rank]) groupedData[rank] = []
        groupedData[rank].push(c)
    })
      setGrouped(groupedData)
  }, [allCrewData])

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bemanning Overzicht</h1>
        <div className="flex gap-2">
          <Link href="/bemanning/nieuw">
            <Button className="bg-green-600 hover:bg-green-700">
              <span className="mr-2">➕</span>
              Nieuw Bemanningslid
            </Button>
          </Link>
          <Link href="/bemanning/update">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <span className="mr-2">🔄</span>
              Update Regimes
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Snelle acties */}
      <div className="mb-8">
        <div className="text-lg font-semibold text-gray-800 mb-4">Snelle acties</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/bemanning/nieuw" className="bg-indigo-600 text-white text-sm py-4 px-6 rounded-lg text-center hover:bg-indigo-700 shadow-lg transition-colors">
            <div className="text-2xl mb-2">➕</div>
            <div className="font-semibold">Nieuw bemanningslid</div>
            <div className="text-xs opacity-90 mt-1">Voeg direct toe</div>
          </Link>
          <Link href="/bemanning/rotatie-kalender" className="bg-purple-600 text-white text-sm py-4 px-6 rounded-lg text-center hover:bg-purple-700 shadow-lg transition-colors">
            <div className="text-2xl mb-2">📅</div>
            <div className="font-semibold">Rotatie Kalender</div>
            <div className="text-xs opacity-90 mt-1">Bekijk schema</div>
          </Link>
          <Link href="/bemanning/oude-bemanningsleden" className="bg-gray-600 text-white text-sm py-4 px-6 rounded-lg text-center hover:bg-gray-700 shadow-lg transition-colors">
            <div className="text-2xl mb-2">👥</div>
            <div className="font-semibold">Oude bemanningsleden</div>
            <div className="text-xs opacity-90 mt-1">Uit dienst</div>
          </Link>
        </div>
      </div>
      {RANK_ORDER.map((rank) => (
        <div key={rank} className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{rank}</h2>
          {grouped[rank]?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped[rank].map((c) => (
                <Card key={c.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {c.firstName[0]}{c.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/bemanning/${c.id}`} className="hover:underline">
                            <h3 className="font-semibold text-gray-900 cursor-pointer">{c.firstName} {c.lastName}</h3>
                          </Link>
                          <p className="text-sm text-gray-600">{c.position}</p>
                        </div>
                      </div>
                      <Badge className={(() => {
                        if (c.status === "ziek") return "bg-red-100 text-red-800"
                        if (!c.regime) return c.status === "aan-boord" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        
                        const statusCalculation = calculateCurrentStatus(c.regime, c.thuisSinds, c.onBoardSince)
                        return statusCalculation.currentStatus === "aan-boord" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                      })()}>
                        {(() => {
                          if (c.status === "ziek") return "Ziek"
                          if (!c.regime) return c.status === "aan-boord" ? "Aan boord" : "Thuis"
                          
                          const statusCalculation = calculateCurrentStatus(c.regime, c.thuisSinds, c.onBoardSince)
                          return statusCalculation.currentStatus === "aan-boord" ? "Aan boord" : "Thuis"
                        })()}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-gray-700">
                      <div><strong>Schip:</strong> {c.shipId ? getCombinedShipDatabase()[c.shipId]?.name || c.shipId : '-'}</div>
                      <div><strong>Volgende Wissel:</strong> {(() => {
                        if (c.status === "ziek") return "Niet van toepassing"
                        if (!c.regime) return "Niet ingesteld"
                        
                        const statusCalculation = calculateCurrentStatus(c.regime, c.thuisSinds, c.onBoardSince)
                        return statusCalculation.nextRotationDate ? new Date(statusCalculation.nextRotationDate).toLocaleDateString("nl-NL") : "Niet berekend"
                      })()}</div>
                      <div><strong>Diploma's:</strong></div>
                      <div className="flex flex-wrap gap-1">
                        {c.qualifications && c.qualifications.length > 0 ? c.qualifications.map((d: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {d}
                          </Badge>
                        )) : <span className="text-xs text-gray-400 italic">Geen diploma's</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">Geen bemanningsleden in deze rang</div>
                )}
        </div>
      ))}
      {/* Mobiele weergave - gebruik dezelfde kaart layout */}
      <div className="block md:hidden">
        {RANK_ORDER.map((rank) => (
          <div key={rank} className="mb-6">
            <h2 className="text-base font-semibold mb-3">{rank}</h2>
            {grouped[rank]?.length ? (
              <div className="grid grid-cols-1 gap-3">
                {grouped[rank].map((c) => (
                  <Card key={c.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                              {c.firstName[0]}{c.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link href={`/bemanning/${c.id}`} className="hover:underline">
                              <h3 className="font-semibold text-gray-900 cursor-pointer text-sm">{c.firstName} {c.lastName}</h3>
                            </Link>
                            <p className="text-xs text-gray-600">{c.position}</p>
                          </div>
                        </div>
                        <Badge className={(() => {
                          if (c.status === "ziek") return "bg-red-100 text-red-800 text-xs"
                          if (!c.regime) return c.status === "aan-boord" ? "bg-green-100 text-green-800 text-xs" : "bg-blue-100 text-blue-800 text-xs"
                          
                          const statusCalculation = calculateCurrentStatus(c.regime, c.thuisSinds, c.onBoardSince)
                          return statusCalculation.currentStatus === "aan-boord" ? "bg-green-100 text-green-800 text-xs" : "bg-blue-100 text-blue-800 text-xs"
                        })()}>
                          {(() => {
                            if (c.status === "ziek") return "Ziek"
                            if (!c.regime) return c.status === "aan-boord" ? "Aan boord" : "Thuis"
                            
                            const statusCalculation = calculateCurrentStatus(c.regime, c.thuisSinds, c.onBoardSince)
                            return statusCalculation.currentStatus === "aan-boord" ? "Aan boord" : "Thuis"
                          })()}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-gray-700">
                        <div><strong>Schip:</strong> {c.shipId ? getCombinedShipDatabase()[c.shipId]?.name || c.shipId : '-'}</div>
                        <div><strong>Volgende Wissel:</strong> {(() => {
                          if (c.status === "ziek") return "Niet van toepassing"
                          if (!c.regime) return "Niet ingesteld"
                          
                          const statusCalculation = calculateCurrentStatus(c.regime, c.thuisSinds, c.onBoardSince)
                          return statusCalculation.nextRotationDate ? new Date(statusCalculation.nextRotationDate).toLocaleDateString("nl-NL") : "Niet berekend"
                        })()}</div>
                        <div><strong>Diploma's:</strong></div>
                        <div className="flex flex-wrap gap-1">
                          {c.qualifications && c.qualifications.length > 0 ? c.qualifications.map((d: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {d}
                            </Badge>
                          )) : <span className="text-xs text-gray-400 italic">Geen diploma's</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic text-center py-4">Geen bemanningsleden in deze rang</div>
            )}
          </div>
        ))}
        {/* Mobiele actieknoppen */}
        <div className="block md:hidden mt-8 space-y-4">
          <div className="text-lg font-semibold text-gray-800 mb-3">Bemanning acties</div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/bemanning/nieuw" className="bg-green-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-green-700 shadow">
              ➕ Nieuw lid
            </Link>
            <Link href="/bemanning/update" className="bg-blue-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-blue-700 shadow">
              🔄 Update Regimes
            </Link>
            <Link href="/bemanning/aflossers" className="bg-indigo-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-indigo-700 shadow">
              🔄 Aflossers
            </Link>
            <Link href="/bemanning/nog-in-te-delen" className="bg-orange-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-orange-700 shadow">
              ⏳ In te delen
            </Link>
            <Link href="/bemanning/print" className="bg-purple-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-purple-700 shadow">
              🖨️ Print
            </Link>
            <button className="bg-teal-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-teal-700 shadow">
              🔍 Zoeken
            </button>
            <button className="bg-gray-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-gray-700 shadow">
              📤 Export
            </button>
            <button className="bg-red-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-red-700 shadow">
              🏥 Ziekte
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 