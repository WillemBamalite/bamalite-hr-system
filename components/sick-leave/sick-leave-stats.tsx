"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserX, FileText, Ship, Calendar } from "lucide-react"
import { crewDatabase, sickLeaveDatabase } from "@/data/crew-database"

export function SickLeaveStats() {
  const sickCrew = Object.values(crewDatabase).filter((crew: any) => crew.status === "ziek" && crew.status !== "uit-dienst")
  const activeSickLeave = Object.values(sickLeaveDatabase).filter((sick: any) => sick.status === "actief")
  const withCertificate = activeSickLeave.filter((sick: any) => sick.hasCertificate)
  const onBoardSick = activeSickLeave.filter((sick: any) => sick.sickLocation === "aan-boord")

  // Bereken gemiddelde duur
  const totalDays = activeSickLeave.reduce((sum, sick: any) => {
    const startDate = new Date(sick.startDate)
    const today = new Date()
    const days = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    return sum + days
  }, 0)
  const averageDuration = activeSickLeave.length > 0 ? (totalDays / activeSickLeave.length).toFixed(1) : "0"

  const stats = [
    {
      title: "Actief Ziek",
      value: sickCrew.length.toString(),
      description: `${withCertificate.length} met ziektebriefje`,
      icon: UserX,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Ziektebriefjes",
      value: withCertificate.length.toString(),
      description: "Actieve certificaten",
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Aan Boord Ziek",
      value: onBoardSick.length.toString(),
      description: "100% doorbetaling",
      icon: Ship,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Gemiddelde Duur",
      value: averageDuration,
      description: "dagen per ziekmelding",
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
