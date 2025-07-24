"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, MapPin, Phone, CheckCircle, Clock, Plus, UserX, ArrowLeft } from "lucide-react"
import { crewDatabase, shipDatabase } from "@/data/crew-database"
import { calculateRegimeStatus } from "@/utils/regime-calculator"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function AutomaticShipCrewOverview() {
  const router = useRouter()
  // Automatisch berekenen van alle bemanning per schip
  const shipsWithCrew = Object.values(shipDatabase)
    .filter((ship) => ship.status === "Operationeel")
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
        location: getShipLocation(ship.id),
      }
    })

  function getShipLocation(shipId: string): string {
    const locations: { [key: string]: string } = {
      "ms-bellona": "Nederlandse wateren",
      "ms-bacchus": "Duitse route",
      "ms-pluto": "Tsjechische route",
      "ms-apollo": "Poolse route",
      "ms-jupiter": "Duitse wateren",
      "ms-neptunus": "Slowaakse route",
      "ms-libertas": "Belgische route",
      "ms-realite": "Franse route",
      "ms-harmonie": "Tsjechische wateren",
      "ms-linde": "Duitse route",
      "ms-primera": "Slowaakse route",
      "ms-caritas": "Nederlandse route",
      "ms-maike": "Belgische wateren",
      "ms-egalite": "Franse wateren",
      "ms-fidelitas": "Duitse route",
      "ms-serenitas": "Tsjechische route",
    }
    return locations[shipId] || "Onbekende locatie"
  }

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
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{ship.location}</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {ship.status}
                    </Badge>
                  </div>
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
                        {member.status === "aan-boord" && member.calculation && (
                          <>
                            <div className="text-gray-500">Aan boord sinds</div>
                            <div className="font-medium">
                              {new Date(member.onBoardSince!).toLocaleDateString("nl-NL")}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Automatische wissel over {member.calculation.daysLeft} dagen
                            </div>
                          </>
                        )}
                        {member.status === "thuis" && (
                          <>
                            <div className="text-gray-500">Status</div>
                            <div className="font-medium">Thuis</div>
                            <div className="text-xs text-gray-400 mt-1">Wacht op rotatie</div>
                          </>
                        )}
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
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(member.status)}>
                          {getStatusIcon(member.status)}
                          <span className="ml-1 capitalize">{member.status.replace("-", " ")}</span>
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
