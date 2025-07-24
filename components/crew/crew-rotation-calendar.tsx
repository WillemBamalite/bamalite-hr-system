"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, User, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export function CrewRotationCalendar() {
  const router = useRouter()
  const upcomingRotations = [
    {
      date: "2024-01-15",
      ship: "MTS Bellona",
      type: "wissel",
      crewChanges: [
        {
          name: "Frank Hennekam",
          position: "Kapitein",
          action: "af",
          regime: "2/2",
        },
        {
          name: "Rob van Etten",
          position: "Kapitein",
          action: "aan",
          regime: "2/2",
        },
      ],
    },
    {
      date: "2024-01-18",
      ship: "MTS Bellona",
      type: "terugkeer",
      crewChanges: [
        {
          name: "Dominik Medulan",
          position: "Matroos",
          action: "aan",
          regime: "2/2",
        },
      ],
    },
    {
      date: "2024-01-20",
      ship: "MTS Pluto",
      type: "wissel",
      crewChanges: [
        {
          name: "Pavel Krejci",
          position: "Stuurman",
          action: "af",
          regime: "2/2",
        },
        {
          name: "Jan Svoboda Jr",
          position: "Stuurman",
          action: "aan",
          regime: "3/3",
        },
      ],
    },
  ]

  const getTypeColor = (type: string) => {
    switch (type) {
      case "wissel":
        return "bg-blue-100 text-blue-800"
      case "terugkeer":
        return "bg-green-100 text-green-800"
      case "vertrek":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getActionColor = (action: string) => {
    return action === "aan" ? "text-green-600" : "text-red-600"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Aankomende Rotaties</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700 mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </button>
        {upcomingRotations.map((rotation, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">
                  {new Date(rotation.date).toLocaleDateString("nl-NL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
                <div className="text-sm text-gray-500">{rotation.ship}</div>
              </div>
              <Badge className={getTypeColor(rotation.type)}>{rotation.type}</Badge>
            </div>

            <div className="space-y-2">
              {rotation.crewChanges.map((change, changeIndex) => (
                <div key={changeIndex} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="font-medium">{change.name}</span>
                    <span className="text-gray-500">({change.position})</span>
                    <Badge variant="outline" className="text-xs">
                      {change.regime}
                    </Badge>
                  </div>
                  <div className={`font-medium ${getActionColor(change.action)}`}>
                    {change.action === "aan" ? "→ Aan boord" : "← Aan wal"}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t">
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                Rotatie bewerken
              </Button>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full mt-4 bg-transparent">
          Volledige planning bekijken
        </Button>
      </CardContent>
    </Card>
  )
}
