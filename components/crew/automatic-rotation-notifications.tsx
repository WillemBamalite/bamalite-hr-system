"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw, Ship, CheckCircle, Info, UserX, Calendar } from "lucide-react"
import { getRotationNotifications, getSickCrewStatus, getTodaysRotations } from "@/utils/automatic-rotation-engine"

export function AutomaticRotationNotifications() {
  const notifications = getRotationNotifications()
  const sickCrew = getSickCrewStatus()
  const todaysRotations = getTodaysRotations()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RotateCcw className="w-5 h-5" />
          <span>Automatische Rotaties</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vandaag's automatische rotaties */}
        {notifications.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Vandaag Uitgevoerd</span>
            </h4>
            {notifications.map((notification, index) => (
              <div key={index} className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <Badge className="bg-blue-600 text-white">AUTOMATISCH</Badge>
                </div>
                <p className="text-sm font-medium text-blue-900">{notification.message}</p>
                <div className="mt-2 space-y-1">
                  {notification.details.map((detail, detailIndex) => (
                    <div key={detailIndex} className="text-xs text-blue-700 flex items-center space-x-1">
                      <span>•</span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Zieke bemanning (geen regime) */}
        {sickCrew.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <UserX className="w-4 h-4" />
              <span>Zieke Bemanning (Geen Regime)</span>
            </h4>
            {sickCrew.map((sick, index) => (
              <div key={index} className="border rounded-lg p-3 bg-red-50 border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <UserX className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-900">
                      {sick.crewMember.firstName} {sick.crewMember.lastName}
                    </span>
                  </div>
                  <Badge className="bg-red-600 text-white">ZIEK</Badge>
                </div>
                <div className="text-sm text-red-800">
                  {sick.daysSick} dagen ziek • {sick.crewMember.position}
                </div>
                <div className="flex items-center space-x-2 mt-1 text-xs text-red-600">
                  <Ship className="w-3 h-3" />
                  <span>{sick.shipName}</span>
                  <span>•</span>
                  <span>Regime gepauzeerd tot herstel</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rotatie samenvatting */}
        {todaysRotations.totalChanges > 0 && (
          <div className="border-t pt-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Rotatie Samenvatting</span>
              </div>
              <div className="text-sm text-green-800">
                Vandaag {todaysRotations.totalChanges} automatische wijzigingen uitgevoerd
              </div>
              <div className="text-xs text-green-600 mt-1">
                Alle rotaties verlopen volgens planning • Geen handmatige actie vereist
              </div>
            </div>
          </div>
        )}

        {notifications.length === 0 && sickCrew.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-gray-500">Geen rotaties vandaag</p>
            <p className="text-xs text-gray-400 mt-1">Systeem draait automatisch elke dag om 00:00</p>
          </div>
        )}

        <Button variant="outline" className="w-full bg-transparent">
          Rotatie geschiedenis bekijken
        </Button>
      </CardContent>
    </Card>
  )
}
