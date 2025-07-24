"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, Calendar, Ship, CheckCircle } from "lucide-react"
import { crewDatabase } from "@/data/crew-database"
import { getRotationAlerts, getUpcomingRotations } from "@/utils/regime-calculator"

export function AutomaticRotationAlerts() {
  const alerts = getRotationAlerts(crewDatabase)
  const upcomingRotations = getUpcomingRotations(crewDatabase)

  const getAlertColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "warning":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <AlertTriangle className="w-4 h-4" />
      case "warning":
        return <Clock className="w-4 h-4" />
      case "info":
        return <Calendar className="w-4 h-4" />
      default:
        return <Calendar className="w-4 h-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Automatische Rotatie Alerts</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Urgente alerts */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Actie Vereist</h4>
            {alerts.map((alert, index) => (
              <div key={index} className={`border rounded-lg p-3 ${getAlertColor(alert.type)}`}>
                <div className="flex items-center space-x-2 mb-2">
                  {getAlertIcon(alert.type)}
                  <Badge className={alert.type === "urgent" ? "bg-red-600 text-white" : "bg-orange-600 text-white"}>
                    {alert.type === "urgent" ? "URGENT" : "WAARSCHUWING"}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{alert.message}</p>
                <div className="flex items-center space-x-2 mt-2 text-xs">
                  <Ship className="w-3 h-3" />
                  <span>{alert.crewMember.shipId?.replace("ms-", "MS ").toUpperCase()}</span>
                  <span>•</span>
                  <span>{alert.crewMember.position}</span>
                  <span>•</span>
                  <span>{alert.crewMember.regime} regime</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aankomende rotaties */}
        {upcomingRotations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Aankomende Rotaties (14 dagen)</h4>
            {upcomingRotations.slice(0, 5).map((rotation, index) => (
              <div key={index} className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {rotation.crewMember.firstName} {rotation.crewMember.lastName}
                    </span>
                  </div>
                  <Badge className="bg-blue-600 text-white">
                    {rotation.daysUntil === 0 ? "VANDAAG" : `${rotation.daysUntil} dagen`}
                  </Badge>
                </div>
                <div className="text-sm text-blue-800">
                  Van boord op {new Date(rotation.date).toLocaleDateString("nl-NL")}
                </div>
                <div className="flex items-center space-x-2 mt-1 text-xs text-blue-600">
                  <Ship className="w-3 h-3" />
                  <span>{rotation.ship?.replace("ms-", "MS ").toUpperCase()}</span>
                  <span>•</span>
                  <span>{rotation.crewMember.position}</span>
                  <span>•</span>
                  <span>{rotation.crewMember.regime} regime</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {alerts.length === 0 && upcomingRotations.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-gray-500">Geen urgente rotaties gepland</p>
          </div>
        )}

        <Button variant="outline" className="w-full bg-transparent">
          Volledige rotatieplanning bekijken
        </Button>
      </CardContent>
    </Card>
  )
}
