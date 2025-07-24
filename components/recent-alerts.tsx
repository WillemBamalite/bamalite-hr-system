"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, FileX, UserX, Calendar } from "lucide-react"
import { crewDatabase, documentDatabase, sickLeaveDatabase } from "@/data/crew-database"
import { getCustomCrewDocuments } from "@/utils/out-of-service-storage"
import Link from "next/link"

type AlertItem = {
  type: string
  title: string
  description: string
  date: string
  priority: string
  icon: any
  crewMemberId?: string
}

export function RecentAlerts() {
  // Genereer echte alerts
  const alerts: AlertItem[] = []
  const today = new Date()

  // Verlopen documenten (rood) en bijna verlopen (oranje)
  // Verzamel alle crewMemberIds met documenten
  const allCrewIds = Array.from(new Set(Object.values(documentDatabase).map((doc: any) => doc.crewMemberId)))
  const crewDb: Record<string, any> = crewDatabase as Record<string, any>;
  allCrewIds.forEach((crewId: string) => {
    const customDocs = getCustomCrewDocuments(crewId)
    const docs = customDocs || Object.values(documentDatabase).filter((doc: any) => doc.crewMemberId === crewId)
    docs.forEach((doc: any) => {
      const expiry = doc.expiryDate ? new Date(doc.expiryDate) : null
      if (expiry) {
        const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const crew = crewDb[String(doc.crewMemberId)]
        if (crew) {
          if (daysUntilExpiry < 0) {
            alerts.push({
              type: "document",
              title: `${doc.name} verlopen` + (doc.type ? ` (${doc.type})` : ""),
              description: `${crew.firstName} ${crew.lastName}`,
              date: doc.expiryDate,
              priority: "high",
              icon: FileX,
              crewMemberId: crew.id,
            })
          } else if (daysUntilExpiry <= 30) {
            alerts.push({
              type: "document",
              title: `${doc.name} bijna verlopen` + (doc.type ? ` (${doc.type})` : ""),
              description: `${crew.firstName} ${crew.lastName}`,
              date: doc.expiryDate,
              priority: "medium",
              icon: FileX,
              crewMemberId: crew.id,
            })
          }
        }
      }
    })
  })

  // Ziekmeldingen
  Object.values(sickLeaveDatabase).forEach((sick: any) => {
    if (sick.status === "actief") {
      const crew = crewDb[String(sick.crewMemberId)]
      if (crew) {
        alerts.push({
          type: "sick",
          title: "Ziekmelding",
          description: `${crew.firstName} ${crew.lastName} - ${sick.description}`,
          date: sick.startDate,
          priority: "medium",
          icon: UserX,
        })
      }
    }
  })

  // Aankomende rotaties (simulatie)
  alerts.push({
    type: "rotation",
    title: "Rotatie gepland",
            description: "MTS Bellona - 3 bemanningsleden",
    date: "2024-01-15",
    priority: "low",
    icon: Calendar,
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-orange-100 text-orange-800"
      case "low":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "high":
        return "Hoog"
      case "medium":
        return "Gemiddeld"
      case "low":
        return "Laag"
      default:
        return "Normaal"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Recente Meldingen</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.slice(0, 5).map((alert, index) => (
          <div key={index} className="border-l-4 border-l-blue-500 pl-4 py-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <alert.icon className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  {alert.type === "document" && alert.crewMemberId ? (
                    <Link href={`/bemanning/${alert.crewMemberId}`} className="hover:underline">
                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                    </Link>
                  ) : (
                    <>
                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                    </>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{new Date(alert.date).toLocaleDateString("nl-NL")}</p>
                </div>
              </div>
              <Badge className={getPriorityColor(alert.priority)}>{getPriorityText(alert.priority)}</Badge>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Alle meldingen bekijken →</button>
        </div>
      </CardContent>
    </Card>
  )
}
