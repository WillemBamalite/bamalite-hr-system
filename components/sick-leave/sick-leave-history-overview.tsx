"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { History, Calendar, FileText, CheckCircle, AlertTriangle, Ship, Euro } from "lucide-react"
import { crewDatabase, sickLeaveHistoryDatabase, shipDatabase } from "@/data/crew-database"

export function SickLeaveHistoryOverview() {
  // Combineer history data met bemanning data
  const historyRecords = Object.values(sickLeaveHistoryDatabase)
    .map((record: any) => {
      const crewMember = crewDatabase[record.crewMemberId]
      const ship = crewMember?.shipId ? shipDatabase[crewMember.shipId] : null
      return {
        ...record,
        crewMember,
        ship,
      }
    })
    .filter((record) => record.crewMember && record.crewMember.status !== "uit-dienst")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

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

  const getStandBackStatusColor = (status: string) => {
    switch (status) {
      case "voltooid":
        return "bg-green-100 text-green-800"
      case "openstaand":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStandBackStatusIcon = (status: string) => {
    switch (status) {
      case "voltooid":
        return <CheckCircle className="w-3 h-3" />
      case "openstaand":
        return <AlertTriangle className="w-3 h-3" />
      default:
        return null
    }
  }

  const getStandBackStatusText = (status: string) => {
    switch (status) {
      case "voltooid":
        return "Voltooid"
      case "openstaand":
        return "Openstaand"
      default:
        return status
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <History className="w-5 h-5" />
          <span>Volledige Ziekte History</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {historyRecords.map((record) => (
            <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
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
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge className={getStandBackStatusColor(record.standBackStatus)}>
                    {getStandBackStatusIcon(record.standBackStatus)}
                    <span className="ml-1">{getStandBackStatusText(record.standBackStatus)}</span>
                  </Badge>
                </div>
              </div>

              {/* Ziekte details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Ziekte periode</label>
                  <div className="flex items-center space-x-1 mt-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-medium">
                      {new Date(record.startDate).toLocaleDateString("nl-NL")} -{" "}
                      {new Date(record.endDate).toLocaleDateString("nl-NL")}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Duur</label>
                  <p className="text-sm font-medium mt-1">{record.daysCount} dagen</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Salarispercentage</label>
                  <div className="flex items-center space-x-1 mt-1">
                    <Euro className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-medium">{record.salaryPercentage}%</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Locatie</label>
                  <p className="text-sm font-medium mt-1">
                    {record.sickLocation === "aan-boord" ? "Aan boord" : "Thuis"}
                  </p>
                </div>
              </div>

              {/* Klacht beschrijving */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500">Klacht</label>
                <p className="text-sm text-gray-700 mt-1">{record.description}</p>
              </div>

              {/* Terug staan dagen details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-gray-50 p-3 rounded-lg">
                <div>
                  <label className="text-xs font-medium text-gray-500">Terug staan vereist</label>
                  <p className="text-sm font-medium mt-1">{record.standBackDaysRequired} dagen</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Voltooid</label>
                  <p className="text-sm font-medium mt-1">{record.standBackDaysCompleted} dagen</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Resterend</label>
                  <p className="text-sm font-medium mt-1 text-red-600">{record.standBackDaysRemaining} dagen</p>
                </div>
              </div>

              {/* Voortgangsbalk */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Terug staan voortgang</span>
                  <span>
                    {record.standBackDaysCompleted}/{record.standBackDaysRequired} dagen
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${record.standBackStatus === "voltooid" ? "bg-green-500" : "bg-orange-500"}`}
                    style={{ width: `${(record.standBackDaysCompleted / record.standBackDaysRequired) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Ziektebriefje status */}
              <div className="flex items-center justify-between pt-3 border-t mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Ziektebriefje:</span>
                </div>
                <Badge className={record.hasCertificate ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {record.hasCertificate ? "Aanwezig" : "Niet aanwezig"}
                </Badge>
              </div>

              {/* History van afboekingen */}
              {record.standBackHistory.length > 0 && (
                <div className="border-t pt-3">
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Afboek History</label>
                  <div className="space-y-2">
                    {record.standBackHistory.map((entry: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded border"
                      >
                        <div>
                          <span className="font-medium text-green-600">{entry.daysCompleted} dagen afgeBoekt</span>
                          <span className="text-gray-600 ml-2">
                            op {new Date(entry.date).toLocaleDateString("nl-NL")}
                          </span>
                        </div>
                        <div className="text-gray-500">{entry.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {historyRecords.length === 0 && (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Geen ziekte history gevonden</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
