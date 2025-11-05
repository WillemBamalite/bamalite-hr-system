"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, Phone, CheckCircle, Clock, Plus, UserX, ArrowLeft } from "lucide-react"
import { crewDatabase } from "@/data/crew-database"
import { getCombinedShipDatabase } from "@/utils/ship-utils"
import { calculateRegimeStatus, calculateCurrentStatus } from "@/utils/regime-calculator"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function AutomaticShipCrewOverview() {
  const router = useRouter()
  // Automatisch berekenen van alle bemanning per schip
  const shipsWithCrew = Object.values(getCombinedShipDatabase())
    .map((ship) => {
      const shipCrew = Object.values(crewDatabase)
        .filter((crew) => crew.shipId === ship.id && crew.status !== "uit-dienst")
        .map((crew) => {
          // Voor zieke bemanning: geen regime berekening
          const regimeCalc =
            crew.status === "ziek" ? null : calculateRegimeStatus(crew.regime, crew.onBoardSince, crew.status)

          return {
            ...crew,
            calculation: regimeCalc,
          }
        })

      return {
        ...ship,
        crew: shipCrew,
      }
    })



  const getStatusColor = (status: string) => {
    switch (status) {
      case "aan-boord":
        return "bg-green-100 text-green-800"
      case "thuis":
        return "bg-blue-100 text-blue-800"
      case "ziek":
        return "bg-red-100 text-red-800"
      case "beschikbaar":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "aan-boord":
        return <CheckCircle className="w-3 h-3" />
      case "thuis":
        return <Clock className="w-3 h-3" />
      case "ziek":
        return <UserX className="w-3 h-3" />
      case "beschikbaar":
        return <CheckCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case "1/1":
        return "bg-purple-100 text-purple-800"
      case "2/2":
        return "bg-blue-100 text-blue-800"
      case "3/3":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱",
      CZ: "��🇿",
      SLK: "🇸🇰",
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

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700 mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Terug
      </button>
      {shipsWithCrew.map((ship) => (
        <Card key={ship.id} className="overflow-hidden">
          <CardHeader className="bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                  <Ship className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{ship.name}</CardTitle>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Bemanning</div>
                <div className="text-lg font-semibold">
                  {ship.crew.length}/{ship.maxCrew}
                </div>
                {ship.crew.filter((c) => c.status === "ziek").length > 0 && (
                  <div className="text-xs text-red-600">{ship.crew.filter((c) => c.status === "ziek").length} ziek</div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y">
              {ship.crew.map((member) => (
                <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback
                          className={`${member.status === "ziek" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                        >
                          {member.firstName[0]}
                          {member.lastName[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </h4>
                          <span className="text-lg">{getNationalityFlag(member.nationality)}</span>
                          <Badge variant="outline" className="text-xs">
                            {member.nationality}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="font-medium">{member.position}</span>
                          {member.status !== "ziek" && (
                            <Badge className={getRegimeColor(member.regime)}>{member.regime} weken</Badge>
                          )}
                          {member.status === "ziek" && (
                            <Badge className="bg-red-100 text-red-800">Regime gepauzeerd</Badge>
                          )}
                          <div className="flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span className="text-xs">{member.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm">
                        {member.status === "ziek" && (
                          <>
                            <div className="text-gray-500">Ziek sinds</div>
                            <div className="font-medium">
                              {member.onBoardSince
                                ? new Date(member.onBoardSince).toLocaleDateString("nl-NL")
                                : "Onbekend"}
                            </div>
                            <div className="text-xs text-red-600 mt-1">Geen regime tot herstel</div>
                          </>
                        )}
                        {member.status !== "ziek" && (
                          <>
                            <div className="text-gray-500">Volgende Wissel</div>
                            <div className="font-medium">
                              {(() => {
                                if (!member.regime) return "Niet ingesteld"
                                
                                const statusCalculation = calculateCurrentStatus(member.regime, member.thuisSinds, member.onBoardSince);
                                return statusCalculation.nextRotationDate ? new Date(statusCalculation.nextRotationDate).toLocaleDateString("nl-NL") : "Niet berekend"
                              })()}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {(() => {
                                if (!member.regime) return ""
                                
                                const statusCalculation = calculateCurrentStatus(member.regime, member.thuisSinds, member.onBoardSince);
                                return `Over ${statusCalculation.daysUntilRotation} dagen`
                              })()}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge className={(() => {
                          if (member.status === "ziek") return "bg-red-100 text-red-800"
                          if (!member.regime) return member.status === "aan-boord" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                          
                          const statusCalculation = calculateCurrentStatus(member.regime, member.thuisSinds, member.onBoardSince)
                          return statusCalculation.currentStatus === "aan-boord" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        })()}>
                          {(() => {
                            if (member.status === "ziek") return <UserX className="w-3 h-3" />
                            if (!member.regime) return member.status === "aan-boord" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />
                            
                            const statusCalculation = calculateCurrentStatus(member.regime, member.thuisSinds, member.onBoardSince)
                            return statusCalculation.currentStatus === "aan-boord" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />
                          })()}
                          <span className="ml-1 capitalize">
                            {(() => {
                              if (member.status === "ziek") return "Ziek"
                              if (!member.regime) return member.status === "aan-boord" ? "Aan boord" : "Thuis"
                              
                              const statusCalculation = calculateCurrentStatus(member.regime, member.thuisSinds, member.onBoardSince)
                              return statusCalculation.currentStatus === "aan-boord" ? "Aan boord" : "Thuis"
                            })()}
                          </span>
                        </Badge>
                        <Link href={`/bemanning/${member.id}`}>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t">
              <Button variant="outline" className="w-full bg-transparent">
                <Plus className="w-4 h-4 mr-2" />
                Bemanningslid toevoegen aan {ship.name}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
