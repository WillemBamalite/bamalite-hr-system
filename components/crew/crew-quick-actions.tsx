"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, UserPlus, Ship, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { crewDatabase, sickLeaveDatabase, sickLeaveHistoryDatabase } from "@/data/crew-database"
import { useLanguage } from "@/contexts/LanguageContext"

export function CrewQuickActions() {
  const { t } = useLanguage();

  const quickActions = [
    {
      title: t('newCrewMember'),
      description: t('addANewCrewMember'),
      icon: UserPlus,
      href: "/bemanning/nieuw",
      color: "bg-blue-500 hover:bg-blue-600",
      textColor: "text-white",
    },


    {
      title: t('newShip'),
      description: t('addANewShip'),
      icon: Ship,
      href: "/schepen/nieuw",
      color: "bg-blue-500 hover:bg-blue-600",
      textColor: "text-white",
    },
    // Ziekmeldingen verwijderd: staat als kaart bovenaan



  ]

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center space-x-2 text-base">
          <Plus className="w-4 h-4" />
          <span>{t('quickActions')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href} className="block group">
              <div className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200">
                  <action.icon className="w-4 h-4" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-sm text-gray-900">{action.title}</div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </div>
              </div>
            </Link>
          ))}
          
          {/* Aflossers knop verwijderd: staat als kaart bovenaan */}
          
          {/* Removed leningen from quick actions: now shown as stat card */}
          {/* Removed nog-in-te-delen: shown as stat card */}
          {/* Removed oude-bemanningsleden: shown as stat card */}

          {/* Leningen knop verwijderd */}
          {/* <Link href="/bemanning/leningen">
            <Button variant="secondary" className="h-10 px-3 w-full justify-start relative border border-blue-500/40">
              <div className="flex items-center space-x-3 w-full">
                <div className="w-4 h-4 flex-shrink-0">💰</div>
                <div className="text-left flex-1">
                  <div className="font-medium text-sm">Leningen</div>
                  <div className="text-xs text-muted-foreground">Beheer leningen & opleidingen</div>
                </div>
              </div>
            </Button>
          </Link> */}
          
          {/* Nog in te delen knop verwijderd */}

          {/* Oude medewerkers knop verwijderd */}
        </div>
      </CardContent>
    </Card>
  )
}
