"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, UserPlus, Printer, History, AlertTriangle, FileText, Calendar } from "lucide-react"
import Link from "next/link"
import { crewDatabase, sickLeaveDatabase, sickLeaveHistoryDatabase } from "@/data/crew-database"

export function CrewQuickActions() {
  // Bereken quick stats
  const sickCount = Object.values(sickLeaveDatabase).length
  const openStandBackDays = Object.values(sickLeaveHistoryDatabase)
    .filter((record: any) => record.standBackDaysRemaining > 0)
    .reduce((sum, record: any) => sum + record.standBackDaysRemaining, 0)

  const expiredDocsCount = Object.values(crewDatabase).filter((crew: any) => {
    if (crew.status === "uit-dienst") return false
    const docs = crew.documents || {}
    return !docs.vaarbewijs?.valid || !docs.medisch?.valid || !docs.certificaat?.valid
  }).length

  const upcomingRotations = Object.values(crewDatabase).filter((crew: any) => {
    if (!crew.nextRotationDate || crew.status === "uit-dienst") return false
    const rotationDate = new Date(crew.nextRotationDate)
    const today = new Date()
    const daysUntil = Math.ceil((rotationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil <= 7 && daysUntil >= 0
  }).length

  const quickActions = [
    {
      title: "Nieuw Bemanningslid",
      description: "Voeg een nieuw bemanningslid toe",
      icon: UserPlus,
      href: "/bemanning/nieuw",
      color: "bg-blue-500 hover:bg-blue-600",
      textColor: "text-white",
    },
    {
      title: "Ziekte History",
      description: "Bekijk ziekte history en terug staan dagen",
      icon: History,
      href: "/ziekte-history",
      color: "bg-orange-500 hover:bg-orange-600",
      textColor: "text-white",
      badge: openStandBackDays > 0 ? `${openStandBackDays} dagen` : null,
      badgeColor: "bg-red-500",
    },
    {
      title: "Ziekmeldingen",
      description: "Beheer actieve ziekmeldingen",
      icon: AlertTriangle,
      href: "/ziekte",
      color: "bg-red-500 hover:bg-red-600",
      textColor: "text-white",
      badge: sickCount > 0 ? `${sickCount} actief` : null,
      badgeColor: "bg-red-700",
    },
    {
      title: "Documenten",
      description: "Beheer bemanningsdocumenten",
      icon: FileText,
      href: "/documenten",
      color: "bg-green-500 hover:bg-green-600",
      textColor: "text-white",
      badge: expiredDocsCount > 0 ? `${expiredDocsCount} verlopen` : null,
      badgeColor: "bg-red-500",
    },
    {
      title: "Rotaties",
      description: "Bekijk aankomende rotaties",
      icon: Calendar,
      href: "/rotaties",
      color: "bg-purple-500 hover:bg-purple-600",
      textColor: "text-white",
      badge: upcomingRotations > 0 ? `${upcomingRotations} deze week` : null,
      badgeColor: "bg-yellow-500",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>Snelle Acties</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Button
                variant="ghost"
                className={`${action.color} ${action.textColor} h-auto p-4 w-full justify-start relative`}
              >
                <div className="flex items-center space-x-3 w-full">
                  <action.icon className="w-6 h-6 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm opacity-90">{action.description}</div>
                  </div>
                </div>
                {action.badge && (
                  <Badge className={`${action.badgeColor} text-white absolute -top-2 -right-2 text-xs`}>
                    {action.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </div>

        <Link href="/bemanning/aflossers">
          <Button variant="outline" className="w-full mb-2">Aflossers</Button>
        </Link>
        <Link href="/bemanning/nog-in-te-delen">
          <Button variant="outline" className="w-full mb-2">Bemanning nog in te delen</Button>
        </Link>

        {/* Alert sectie */}
        {(sickCount > 0 || openStandBackDays > 0 || expiredDocsCount > 0) && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-medium text-yellow-800">Aandachtspunten</h3>
            </div>
            <div className="space-y-1 text-sm text-yellow-700">
              {sickCount > 0 && <p>• {sickCount} bemanningsleden zijn momenteel ziek</p>}
              {openStandBackDays > 0 && <p>• {openStandBackDays} dagen terug staan nog openstaand</p>}
              {expiredDocsCount > 0 && <p>• {expiredDocsCount} bemanningsleden hebben verlopen documenten</p>}
              {upcomingRotations > 0 && <p>• {upcomingRotations} rotaties gepland voor deze week</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
