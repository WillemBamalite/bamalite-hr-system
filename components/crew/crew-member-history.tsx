"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ship, Calendar, MapPin, RotateCcw, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface Props {
  crewMemberId: string
}

export function CrewMemberHistory({ crewMemberId }: Props) {
  const router = useRouter()
  // Mock data - later vervangen met echte data
  const history = [
    {
      id: "1",
      type: "ship-assignment",
      date: "2024-01-01",
      description: "Toegewezen aan MS Libertas als Schipper",
      ship: "MS Libertas",
              details: "Rotatie 2/2 weken",
    },
    {
      id: "2",
      type: "rotation",
      date: "2023-12-15",
      description: "Aan wal gegaan na rotatie",
      ship: "MS Libertas",
      details: "Normale rotatie volgens 2/2 schema",
    },
    {
      id: "3",
      type: "ship-change",
      date: "2023-11-20",
      description: "Overgeplaatst van MS Fortuna naar MS Libertas",
      ship: "MS Libertas",
      details: "Verzoek bemanningslid vanwege route voorkeur",
    },
    {
      id: "4",
      type: "document-update",
      date: "2023-10-05",
      description: "Medische keuring vernieuwd",
      details: "Geldig tot 2025-01-10",
    },
    {
      id: "5",
      type: "sick-leave",
      date: "2023-09-12",
      description: "Ziekmelding - griep",
      details: "5 dagen ziek, met ziektebriefje",
    },
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ship-assignment":
      case "ship-change":
        return Ship
      case "rotation":
        return RotateCcw
      case "document-update":
        return Calendar
      case "sick-leave":
        return MapPin
      default:
        return Calendar
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "ship-assignment":
        return "bg-blue-100 text-blue-800"
      case "ship-change":
        return "bg-purple-100 text-purple-800"
      case "rotation":
        return "bg-green-100 text-green-800"
      case "document-update":
        return "bg-orange-100 text-orange-800"
      case "sick-leave":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "ship-assignment":
        return "Schip Toewijzing"
      case "ship-change":
        return "Schip Wissel"
      case "rotation":
        return "Rotatie"
      case "document-update":
        return "Document Update"
      case "sick-leave":
        return "Ziekmelding"
      default:
        return "Activiteit"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Geschiedenis & Activiteiten</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700 mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </button>
          {history.map((item) => {
            const Icon = getTypeIcon(item.type)

            return (
              <div key={item.id} className="flex items-start space-x-4 pb-4 border-b last:border-b-0">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full mt-1">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900">{item.description}</p>
                    <Badge className={getTypeColor(item.type)} variant="secondary">
                      {getTypeLabel(item.type)}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{item.details}</p>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{new Date(item.date).toLocaleDateString("nl-NL")}</span>
                    {item.ship && (
                      <>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Ship className="w-3 h-3" />
                          <span>{item.ship}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
