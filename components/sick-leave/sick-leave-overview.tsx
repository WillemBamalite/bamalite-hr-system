"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserX, FileText, Calendar, AlertTriangle, CheckCircle, Euro, Ship, Phone } from "lucide-react"
import { shipDatabase } from "@/data/crew-database"
import { useCrewData } from "@/hooks/use-crew-data"

export function SickLeaveOverview() {
  const { activeSickLeaves, crewDatabase } = useCrewData()
  
  // Gebruik de centrale actieve ziekmeldingen
  const sickLeaveRecords = activeSickLeaves
    .map((sick: any) => {
      const crewMember = (crewDatabase as any)[sick.crewMemberId]
      const ship = crewMember?.shipId ? (shipDatabase as any)[crewMember.shipId] : null

      // Bereken dagen ziek
      const startDate = new Date(sick.startDate)
      const today = new Date()
      const daysCount = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      return {
        ...sick,
        crewMember,
        ship,
        daysCount,
      }
    })
    .filter((record) => record.crewMember && record.crewMember.status !== "uit-dienst") // Filter out records zonder crew member en uit dienst
    .filter((record) => record.status !== "hersteld") // Filter out herstelde records

  const getStatusColor = (status: string) => {
    switch (status) {
      case "actief":
        return "bg-red-100 text-red-800"
      case "hersteld":
        return "bg-green-100 text-green-800"
      case "wacht-op-briefje":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "actief":
        return <UserX className="w-3 h-3" />
      case "hersteld":
        return <CheckCircle className="w-3 h-3" />
      case "wacht-op-briefje":
        return <AlertTriangle className="w-3 h-3" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "actief":
        return "Actief ziek"
      case "hersteld":
        return "Hersteld"
      case "wacht-op-briefje":
        return "Wacht op ziektebriefje"
      default:
        return status
    }
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

  const getCertificateStatus = (record: any) => {
    if (!record.hasCertificate) {
      return {
        color: "bg-red-100 text-red-800",
        text: "Geen ziektebriefje",
        icon: AlertTriangle,
      }
    }

    if (record.certificateValidUntil) {
      const validUntil = new Date(record.certificateValidUntil)
      const today = new Date()
      const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiry <= 0) {
        return {
          color: "bg-red-100 text-red-800",
          text: "Ziektebriefje verlopen",
          icon: AlertTriangle,
        }
      } else if (daysUntilExpiry <= 2) {
        return {
          color: "bg-orange-100 text-orange-800",
          text: `Verloopt over ${daysUntilExpiry} dag${daysUntilExpiry > 1 ? "en" : ""}`,
          icon: AlertTriangle,
        }
      } else {
        return {
          color: "bg-green-100 text-green-800",
          text: `Geldig tot ${validUntil.toLocaleDateString("nl-NL")}`,
          icon: CheckCircle,
        }
      }
    }

    return {
      color: "bg-green-100 text-green-800",
      text: "Ziektebriefje aanwezig",
      icon: CheckCircle,
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserX className="w-5 h-5" />
          <span>Ziekmeldingen Overzicht</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sickLeaveRecords.map((record) => {
            const certificateStatus = getCertificateStatus(record)
            const CertificateIcon = certificateStatus.icon

            return (
              <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-red-100 text-red-700">
                        {record.crewMember.firstName[0]}
                        {record.crewMember.lastName[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {record.crewMember.firstName} {record.crewMember.lastName}
                        </h4>
                        <span className="text-lg">{getNationalityFlag(record.crewMember.nationality)}</span>
                        <Badge variant="outline" className="text-xs">
                          {record.crewMember.nationality}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="font-medium">{record.crewMember.position}</span>
                        {record.ship && (
                          <div className="flex items-center space-x-1">
                            <Ship className="w-3 h-3" />
                            <span>{record.ship.name}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{record.crewMember.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(record.status)}>
                      {getStatusIcon(record.status)}
                      <span className="ml-1">{getStatusText(record.status)}</span>
                    </Badge>
                    <Button variant="outline" size="sm">
                      Bewerken
                    </Button>
                  </div>
                </div>

                {/* Ziekte details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Startdatum</label>
                    <div className="flex items-center space-x-1 mt-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-medium">
                        {new Date(record.startDate).toLocaleDateString("nl-NL")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Duur</label>
                    <p className="text-sm font-medium mt-1">
                      {record.daysCount} dag{record.daysCount > 1 ? "en" : ""}
                      {record.status === "actief" && " (lopend)"}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Salarispercentage</label>
                    <div className="flex items-center space-x-1 mt-1">
                      <Euro className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-medium">{record.salaryPercentage}%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Locatie ziekte</label>
                    <p className="text-sm font-medium mt-1">
                      {record.sickLocation === "aan-boord" ? "Aan boord" : "Thuis"}
                    </p>
                  </div>
                </div>

                {/* Klacht beschrijving */}
                {record.description && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500">Klacht</label>
                    <p className="text-sm text-gray-700 mt-1">{record.description}</p>
                  </div>
                )}

                {/* Ziektebriefje status */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Ziektebriefje:</span>
                  </div>
                  <Badge className={certificateStatus.color}>
                    <CertificateIcon className="w-3 h-3 mr-1" />
                    {certificateStatus.text}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>

        {sickLeaveRecords.length === 0 && (
          <div className="text-center py-8">
            <UserX className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Geen actieve ziekmeldingen</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
