"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, MapPin, Phone, AlertCircle, CheckCircle, Clock, Plus } from "lucide-react"
import Link from "next/link"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { calculateCurrentStatus } from "@/utils/regime-calculator"

export function ShipCrewOverview() {
  // Gebruik Supabase data
  const { ships: shipsData, crew: crewData, loading, error } = useSupabaseData();
  
  const ships = shipsData.map((ship: any) => {
      const shipCrew = crewData.filter((crew: any) => 
        crew.ship_id === ship.id && crew.status !== "uit-dienst"
      );
      
      return {
        ...ship,
        crew: shipCrew.map((crew: any) => {
          // Bereken huidige status en next rotation date
          const statusInfo = crew.on_board_since && crew.regime 
            ? calculateCurrentStatus(crew.on_board_since, crew.regime)
            : { status: crew.status, nextRotationDate: null };
          
          return {
            id: crew.id,
            name: `${crew.first_name} ${crew.last_name}`,
            position: crew.position,
            nationality: crew.nationality,
            regime: crew.regime,
            status: crew.status,
            onBoardSince: crew.on_board_since,
            offBoardDate: statusInfo.nextRotationDate,
            terugkeerDatum: null, // Deprecated in Supabase versie
            daysLeft: statusInfo.nextRotationDate ? Math.ceil((new Date(statusInfo.nextRotationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0,
            phone: crew.phone || "",
          };
        })
      };
    });

  const getStatusColor = (status: string, terugkeerDatum?: string) => {
    // Als er een terugkeer datum is, toon dan een speciale status
    if (terugkeerDatum && status === "thuis") {
      return "bg-yellow-100 text-yellow-800"
    }
    
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

  const getStatusIcon = (status: string, terugkeerDatum?: string) => {
    // Als er een terugkeer datum is, toon dan een speciale icon
    if (terugkeerDatum && status === "thuis") {
      return <CheckCircle className="w-3 h-3" />
    }
    
    switch (status) {
      case "aan-boord":
        return <CheckCircle className="w-3 h-3" />
      case "thuis":
        return <Clock className="w-3 h-3" />
      case "ziek":
        return <AlertCircle className="w-3 h-3" />
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
      CZ: "🇨🇿",
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
      {ships.map((ship) => (
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
                <div className="text-lg font-semibold">{ship.crew.length}/8</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y">
              {ship.crew.map((member: any) => (
                <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {member.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">{member.name}</h4>
                          <span className="text-lg">{getNationalityFlag(member.nationality)}</span>
                          <Badge variant="outline" className="text-xs">
                            {member.nationality}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="font-medium">{member.position}</span>
                          <Badge className={getRegimeColor(member.regime)}>{member.regime} weken</Badge>
                          {member.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span className="text-xs">{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm">
                        {member.status === "ziek" && member.onBoardSince && (
                          <>
                            <div className="text-gray-500">Ziek sinds</div>
                            <div className="font-medium">
                              {new Date(member.onBoardSince).toLocaleDateString("nl-NL")}
                            </div>
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
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(member.status, member.terugkeerDatum)}>
                          {getStatusIcon(member.status, member.terugkeerDatum)}
                          <span className="ml-1 capitalize">
                            {member.terugkeerDatum && member.status === "thuis" ? "hersteld" : member.status.replace("-", " ")}
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

      {/* Schepen in aanbouw */}
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="p-6 text-center">
          <Ship className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Schepen in Aanbouw</h3>
          <p className="text-gray-500 mb-4">MS Liberte en MS Fraternite worden binnenkort opgeleverd</p>
          <div className="flex justify-center space-x-2">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              MS Liberte - Q2 2024
            </Badge>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              MS Fraternite - Q3 2024
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
