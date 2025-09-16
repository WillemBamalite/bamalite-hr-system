"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, UserPlus, Ship, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { crewDatabase, sickLeaveDatabase, sickLeaveHistoryDatabase } from "@/data/crew-database"

export function CrewQuickActions() {

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
      title: "Nieuw Schip",
      description: "Voeg een nieuw schip toe",
      icon: Ship,
      href: "/schepen/nieuw",
      color: "bg-blue-500 hover:bg-blue-600",
      textColor: "text-white",
    },
    {
      title: "Ziekmeldingen",
      description: "Beheer ziekmeldingen",
      icon: AlertTriangle,
      href: "/ziekte",
      color: "bg-blue-500 hover:bg-blue-600",
      textColor: "text-white",
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
        <div className="flex flex-col gap-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Button
                variant="ghost"
                className={`${action.color} ${action.textColor} h-12 p-3 w-full justify-start relative`}
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
          
          <Link href="/bemanning/aflossers">
            <Button
              variant="ghost"
              className="bg-blue-500 hover:bg-blue-600 text-white h-12 p-3 w-full justify-start relative"
            >
              <div className="flex items-center space-x-3 w-full">
                <div className="w-6 h-6 flex-shrink-0">🔄</div>
                <div className="text-left flex-1">
                  <div className="font-medium">Aflossers</div>
                  <div className="text-sm opacity-90">Beheer aflossers</div>
                </div>
              </div>
            </Button>
          </Link>
          
          <Link href="/bemanning/leningen">
            <Button
              variant="ghost"
              className="bg-blue-500 hover:bg-blue-600 text-white h-12 p-3 w-full justify-start relative"
            >
              <div className="flex items-center space-x-3 w-full">
                <div className="w-6 h-6 flex-shrink-0">💰</div>
                <div className="text-left flex-1">
                  <div className="font-medium">Leningen</div>
                  <div className="text-sm opacity-90">Beheer leningen & opleidingen</div>
                </div>
              </div>
            </Button>
          </Link>
          
          <Link href="/bemanning/nog-in-te-delen">
            <Button
              variant="ghost"
              className="bg-blue-500 hover:bg-blue-600 text-white h-12 p-3 w-full justify-start relative"
            >
              <div className="flex items-center space-x-3 w-full">
                <div className="w-6 h-6 flex-shrink-0">⏳</div>
                <div className="text-left flex-1">
                  <div className="font-medium">Nog in te delen</div>
                  <div className="text-sm opacity-90">Bemanning nog in te delen</div>
                </div>
              </div>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
