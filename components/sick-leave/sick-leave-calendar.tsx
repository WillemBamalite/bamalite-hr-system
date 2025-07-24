"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, AlertTriangle, CheckCircle } from "lucide-react"

export function SickLeaveCalendar() {
  const upcomingEvents = [
    {
      date: "2024-01-15",
      type: "certificate-expiry",
      title: "Ziektebriefje verloopt",
      description: "Michal Dudka - MS Pluto",
      priority: "high",
    },
    {
      date: "2024-01-17",
      type: "certificate-expiry",
      title: "Ziektebriefje verloopt",
      description: "Ahmed Hassan - MS Bellona",
      priority: "high",
    },
    {
      date: "2024-01-20",
      type: "follow-up",
      title: "Follow-up nodig",
      description: "Peter Jakus - Nog geen ziektebriefje",
      priority: "medium",
    },
  ]

  const getTypeColor = (type: string) => {
    switch (type) {
      case "certificate-expiry":
        return "bg-red-100 text-red-800"
      case "follow-up":
        return "bg-orange-100 text-orange-800"
      case "recovery":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "certificate-expiry":
      case "follow-up":
        return AlertTriangle
      case "recovery":
        return CheckCircle
      default:
        return Calendar
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Aankomende Acties</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingEvents.map((event, index) => {
          const Icon = getTypeIcon(event.type)

          return (
            <div key={index} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {new Date(event.date).toLocaleDateString("nl-NL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <Badge className={getTypeColor(event.type)}>{event.priority === "high" ? "Urgent" : "Normaal"}</Badge>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{event.description}</p>
              </div>

              <Button variant="outline" size="sm" className="w-full bg-transparent">
                Actie ondernemen
              </Button>
            </div>
          )
        })}

        <div className="pt-4 border-t">
          <Button variant="outline" className="w-full bg-transparent">
            Volledige agenda bekijken
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
