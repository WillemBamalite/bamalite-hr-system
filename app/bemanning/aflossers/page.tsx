"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserPlus, Edit, Phone, Mail, MapPin } from "lucide-react"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { useCrewData } from "@/hooks/use-crew-data"

export default function AflossersOverzicht() {
  const { crewDatabase: allCrewData, stats } = useCrewData()

  // Filter aflossers (relief crew)
  const aflossers = Object.values(allCrewData).filter((member: any) => 
    member.position?.toLowerCase().includes("aflos") || 
    member.position?.toLowerCase().includes("relief")
  )

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
      case "uit-dienst":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "aan-boord":
        return "Aan boord"
      case "thuis":
        return "Thuis"
      case "ziek":
        return "Ziek"
      case "uit-dienst":
        return "Uit dienst"
      default:
        return status
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aflossers Overzicht</h1>
          <p className="text-gray-600 mt-1">Relief crew management en overzicht</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/bemanning/aflossers/nieuw">
            <Button className="bg-green-600 hover:bg-green-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Nieuwe Aflosser
            </Button>
          </Link>
          <Link href="/bemanning" className="text-blue-600 hover:text-blue-800">
            ← Terug naar bemanning
          </Link>
        </div>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Totaal Aflossers</p>
                <p className="text-2xl font-bold text-green-600">{stats.aflossers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Aan boord</p>
                <p className="text-2xl font-bold text-green-600">
                  {aflossers.filter((a: any) => a.status === "aan-boord").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Thuis</p>
                <p className="text-2xl font-bold text-blue-600">
                  {aflossers.filter((a: any) => a.status === "thuis").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Ziek</p>
                <p className="text-2xl font-bold text-red-600">
                  {aflossers.filter((a: any) => a.status === "ziek").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aflossers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aflossers.map((aflosser: any) => (
          <Card key={aflosser.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {aflosser.firstName[0]}{aflosser.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <Link 
                        href={`/bemanning/${aflosser.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-700"
                      >
                        {aflosser.firstName} {aflosser.lastName}
                      </Link>
                      <span className="text-lg">{getNationalityFlag(aflosser.nationality)}</span>
                    </div>
                    <p className="text-sm text-gray-500">{aflosser.position}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(aflosser.status)}>
                  {getStatusText(aflosser.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Contact informatie */}
              {aflosser.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{aflosser.phone}</span>
                </div>
              )}
              {aflosser.email && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{aflosser.email}</span>
                </div>
              )}
              {aflosser.address && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {aflosser.address.street && `${aflosser.address.street}, `}
                    {aflosser.address.city && `${aflosser.address.city} `}
                    {aflosser.address.postalCode && `${aflosser.address.postalCode}`}
                    {aflosser.address.country && `, ${aflosser.address.country}`}
                  </span>
                </div>
              )}
              
              {/* Beschikbaarheid */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Beschikbaarheid:</span>
                  <span className="text-sm font-medium">
                    {aflosser.availability || "Op aanvraag"}
                  </span>
                </div>
              </div>

              {/* Acties */}
              <div className="flex items-center space-x-2 pt-2">
                <Link href={`/bemanning/${aflosser.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Bewerken
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lege staat */}
      {aflossers.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen aflossers gevonden</h3>
          <p className="text-gray-500 mb-6">Voeg je eerste aflosser toe om te beginnen</p>
          <Link href="/bemanning/aflossers/nieuw">
            <Button className="bg-green-600 hover:bg-green-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Nieuwe Aflosser Toevoegen
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
} 