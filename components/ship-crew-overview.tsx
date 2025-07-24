"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, MapPin, Phone, AlertCircle, CheckCircle, Clock, Plus } from "lucide-react"
import Link from "next/link"

export function ShipCrewOverview() {
  const ships = [
    {
      id: "ms-bellona",
      name: "MTS Bellona",
      status: "Operationeel",
      crew: [
        {
          id: "frank-hennekam",
          name: "Frank Hennekam",
          position: "Kapitein",
          nationality: "NL",
          regime: "2/2",
          status: "aan-boord",
          onBoardSince: "2024-01-01",
          offBoardDate: "2024-01-15",
          daysLeft: 3,
          phone: "+31 6 12345678",
        },
        {
          id: "yovanni-smith",
          name: "Yovanni Smith",
          position: "Stuurman",
          nationality: "NL",
          regime: "3/3",
          status: "aan-boord",
          onBoardSince: "2023-12-20",
          offBoardDate: "2024-01-20",
          daysLeft: 8,
          phone: "+31 6 23456789",
        },
        {
          id: "dominik-medulan",
          name: "Dominik Medulan",
          position: "Matroos",
          nationality: "CZ",
          regime: "2/2",
          status: "thuis",
          onBoardSince: null,
          offBoardDate: "2024-01-18",
          daysLeft: -2,
          phone: "+420 123 456 789",
        },
        {
          id: "jakub-misar",
          name: "Jakub Misar",
          position: "Deksman",
          nationality: "CZ",
          regime: "3/3",
          status: "aan-boord",
          onBoardSince: "2024-01-05",
          offBoardDate: "2024-01-25",
          daysLeft: 13,
          phone: "+420 234 567 890",
        },
        {
          id: "jack-suiker",
          name: "Jack Suiker",
          position: "Lichtmatroos",
          nationality: "NL",
          regime: "1/1",
          status: "aan-boord",
          onBoardSince: "2024-01-12",
          offBoardDate: "2024-01-19",
          daysLeft: 7,
          phone: "+31 6 34567890",
        },
      ],
    },
    {
      id: "ms-bacchus",
      name: "MTS Bacchus",
      status: "Operationeel",
      crew: [
        {
          id: "koert-van-veen",
          name: "Koert van Veen",
          position: "Kapitein",
          nationality: "NL",
          regime: "2/2",
          status: "aan-boord",
          onBoardSince: "2024-01-08",
          offBoardDate: "2024-01-22",
          daysLeft: 10,
          phone: "+31 6 67890123",
        },
        {
          id: "joao-fonseca",
          name: "Joao Jose Brito Fonseca",
          position: "Stuurman",
          nationality: "NL",
          regime: "3/3",
          status: "aan-boord",
          onBoardSince: "2024-01-01",
          offBoardDate: "2024-01-28",
          daysLeft: 16,
          phone: "+31 6 78901234",
        },
        {
          id: "roy-landsbergen",
          name: "Roy Landsbergen",
          position: "Stuurman",
          nationality: "NL",
          regime: "2/2",
          status: "thuis",
          onBoardSince: null,
          offBoardDate: "2024-01-20",
          daysLeft: -1,
          phone: "+31 6 89012345",
        },
        {
          id: "ernst-van-de-vlucht",
          name: "Ernst van de Vlucht",
          position: "Lichtmatroos",
          nationality: "NL",
          regime: "1/1",
          status: "aan-boord",
          onBoardSince: "2024-01-10",
          offBoardDate: "2024-01-17",
          daysLeft: 5,
          phone: "+31 6 90123456",
        },
      ],
    },
    {
      id: "ms-pluto",
      name: "MTS Pluto",
      status: "Operationeel",
      crew: [
        {
          id: "jaroslav-polak",
          name: "Jaroslav Polak",
          position: "Kapitein",
          nationality: "CZ",
          regime: "3/3",
          status: "aan-boord",
          onBoardSince: "2024-01-02",
          offBoardDate: "2024-01-23",
          daysLeft: 11,
          phone: "+420 345 678 901",
        },
        {
          id: "pavel-krejci",
          name: "Pavel Krejci",
          position: "Stuurman",
          nationality: "CZ",
          regime: "2/2",
          status: "aan-boord",
          onBoardSince: "2024-01-06",
          offBoardDate: "2024-01-20",
          daysLeft: 8,
          phone: "+420 456 789 012",
        },
        {
          id: "michal-dudka",
          name: "Michal Dudka",
          position: "Stuurman",
          nationality: "CZ",
          regime: "3/3",
          status: "ziek",
          onBoardSince: "2024-01-01",
          offBoardDate: "2024-01-22",
          daysLeft: 10,
          phone: "+420 567 890 123",
        },
      ],
    },
  ]

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

  const getStatusIcon = (status: string) => {
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
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {ship.status}
                    </Badge>
                  </div>
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
              {ship.crew.map((member) => (
                <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
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
                          <div className="flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span className="text-xs">{member.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm">
                        {member.status === "aan-boord" && (
                          <>
                            <div className="text-gray-500">Aan boord sinds</div>
                            <div className="font-medium">
                              {new Date(member.onBoardSince!).toLocaleDateString("nl-NL")}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Nog {member.daysLeft} dagen</div>
                          </>
                        )}
                        {member.status === "thuis" && (
                          <>
                            <div className="text-gray-500">Terug aan boord</div>
                            <div className="font-medium">
                              {new Date(member.offBoardDate).toLocaleDateString("nl-NL")}
                            </div>
                          </>
                        )}
                        {member.status === "ziek" && (
                          <>
                            <div className="text-gray-500">Ziek sinds</div>
                            <div className="font-medium">
                              {new Date(member.onBoardSince!).toLocaleDateString("nl-NL")}
                            </div>
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
