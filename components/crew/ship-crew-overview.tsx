"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, Users, FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { crewDatabase, shipDatabase } from "@/data/crew-database"
import { getActiveCrewForShip, getAvailableCrew } from "@/utils/crew-filter"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import { useRouter } from "next/navigation"

export function ShipCrewOverview() {
  const router = useRouter()
  // Groepeer bemanning per schip
  const shipCrewData = Object.values(shipDatabase)
    .filter((ship: any) => ship.status === "Operationeel")
    .map((ship: any) => {
      const shipCrew = getActiveCrewForShip(ship.id)
      const onBoard = shipCrew.filter((crew: any) => {
        if (crew.status === "ziek") return false
        if (!crew.regime) return crew.status === "aan-boord"
        
        const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
        return statusCalculation.currentStatus === "aan-boord"
      })
      const atHome = shipCrew.filter((crew: any) => {
        if (crew.status === "ziek") return false
        if (!crew.regime) return crew.status === "thuis"
        
        const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
        return statusCalculation.currentStatus === "thuis"
      })
      const sick = shipCrew.filter((crew: any) => crew.status === "ziek")

      return {
        ship,
        onBoard,
        atHome,
        sick,
        total: shipCrew.length,
      }
    })

  // Beschikbare bemanning (niet toegewezen)
  const availableCrew = getAvailableCrew()

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aan-boord":
        return "bg-green-100 text-green-800"
      case "thuis":
        return "bg-blue-100 text-blue-800"
      case "ziek":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "aan-boord":
        return "Aan Boord"
      case "thuis":
        return "Thuis"
      case "ziek":
        return "Ziek"
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700 mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Terug
      </button>
      {/* Schepen overzicht */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {shipCrewData.map((shipData) => (
          <Card key={shipData.ship.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Ship className="w-5 h-5" />
                  <span>{shipData.ship.name}</span>
                </CardTitle>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {shipData.ship.status}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                <p>
  
                </p>

                <p>
                  <strong>Bemanning:</strong> {shipData.total}/{shipData.ship.maxCrew}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Statistieken */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-lg font-bold text-green-700">{shipData.onBoard.length}</div>
                    <div className="text-xs text-green-600">Aan Boord</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-lg font-bold text-blue-700">{shipData.atHome.length}</div>
                    <div className="text-xs text-blue-600">Thuis</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <div className="text-lg font-bold text-red-700">{shipData.sick.length}</div>
                    <div className="text-xs text-red-600">Ziek</div>
                  </div>
                </div>

                {/* Bemanning lijst */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {[...shipData.onBoard, ...shipData.atHome, ...shipData.sick].map((crew: any) => (
                    <div key={crew.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {crew.firstName[0]}
                            {crew.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">
                              {crew.firstName} {crew.lastName}
                            </span>
                            <span className="text-sm">{getNationalityFlag(crew.nationality)}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <span>{crew.position}</span>
                            <span>•</span>
                            <span>{crew.regime}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`${(() => {
                          if (crew.status === "ziek") return "bg-red-100 text-red-800"
                          if (!crew.regime) return getStatusColor(crew.status)
                          
                          const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
                          return statusCalculation.currentStatus === "aan-boord" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        })()} text-xs`}>
                          {(() => {
                            if (crew.status === "ziek") return "Ziek"
                            if (!crew.regime) return getStatusText(crew.status)
                            
                            const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
                            return statusCalculation.currentStatus === "aan-boord" ? "Aan Boord" : "Thuis"
                          })()}
                        </Badge>
                        <Link href={`/bemanning/${crew.id}`}>
                          <Button variant="ghost" size="sm">
                            <FileText className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {shipData.total === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Geen bemanning toegewezen</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Beschikbare bemanning */}
      {availableCrew.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Beschikbare Bemanning ({availableCrew.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCrew.map((crew: any) => (
                <div key={crew.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {crew.firstName[0]}
                        {crew.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {crew.firstName} {crew.lastName}
                        </span>
                        <span>{getNationalityFlag(crew.nationality)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{crew.position}</span>
                        <span>•</span>
                        <span>{crew.regime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-purple-100 text-purple-800 text-xs">Beschikbaar</Badge>
                    <Link href={`/bemanning/${crew.id}`}>
                      <Button variant="ghost" size="sm">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
