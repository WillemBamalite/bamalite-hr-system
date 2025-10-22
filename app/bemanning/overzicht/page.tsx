"use client"

import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useLanguage } from "@/contexts/LanguageContext"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { BackButton } from "@/components/ui/back-button"
import { DashboardButton } from "@/components/ui/dashboard-button"

const RANK_ORDER = [
  "Kapitein",
  "Stuurman",
  "Lichtmatroos",
  "Matroos",
  "Deksman",
  "Aflosser"
];

export default function CrewOverviewPage() {
  const { crew, ships, loading, error } = useSupabaseData()
  const { t } = useLanguage()
  const [filteredCrew, setFilteredCrew] = useState<any[]>([])
  const [grouped, setGrouped] = useState<{ [rank: string]: any[] }>({})

  // Gebruik uitsluitend live Supabase data voor het overzicht
  // Hierdoor worden statuswijzigingen direct zichtbaar en is er geen
  // afhankelijkheid meer van mogelijk verouderde localStorage data.
  const buildLiveCrew = (hookCrew: any[]): any[] => {
    return (hookCrew || []).filter(Boolean)
  }

  useEffect(() => {
    const merged = buildLiveCrew(crew)
    const visible = merged.filter((c: any) => c.status !== 'uit-dienst')
    setFilteredCrew(visible)
    const groupedData: { [rank: string]: any[] } = {}
    visible.forEach((c: any) => {
      const rank = RANK_ORDER.includes(c.position) ? c.position : "Overig"
      if (!groupedData[rank]) groupedData[rank] = []
      groupedData[rank].push(c)
    })
    setGrouped(groupedData)
  }, [crew])

  // Luister naar localStorage updates vanuit de form
  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => {
      const merged = buildLiveCrew(crew)
      const visible = merged.filter((c: any) => c.status !== 'uit-dienst')
      setFilteredCrew(visible)
      const groupedData: { [rank: string]: any[] } = {}
      visible.forEach((c: any) => {
        const rank = RANK_ORDER.includes(c.position) ? c.position : 'Overig'
        if (!groupedData[rank]) groupedData[rank] = []
        groupedData[rank].push(c)
      })
      setGrouped(groupedData)
    }
    window.addEventListener('localStorageUpdate', update)
    window.addEventListener('forceRefresh', update as any)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('localStorageUpdate', update)
      window.removeEventListener('forceRefresh', update as any)
      window.removeEventListener('storage', update)
    }
  }, [crew])

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱",
      CZ: "🇨🇿",
      SLK: "🇸🇰",
      EG: "🇪🇬",
      PO: "🇵🇱",
      SERV: "🇷🇸",
      HUN: "🇭🇺",
      BE: "🇧🇪",
      FR: "🇫🇷",
      DE: "🇩🇪",
      LUX: "🇱🇺",
    }
    return flags[nationality] || "🌍"
  }

  const getShipName = (shipId: string) => {
    const ship = ships.find(s => s.id === shipId)
    return ship ? ship.name : "Geen schip"
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Fout: {error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <BackButton href="/" />
          <h1 className="text-3xl font-bold text-gray-900">{t('crew')} {t('overview')}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/bemanning/nieuw">
            <Button className="bg-green-600 hover:bg-green-700">
              <span className="mr-2">➕</span>
              {t('newCrewMember')}
            </Button>
          </Link>
        </div>
      </div>
      

      {RANK_ORDER.map((rank) => (
        <div key={rank} className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{rank}</span>
                <Badge variant="secondary">{grouped[rank]?.length || 0} leden</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grouped[rank] && grouped[rank].length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[rank].map((member) => (
                    <div key={member.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {((member.first_name || member.firstName || "?") as string).charAt(0)}
                            {((member.last_name || member.lastName || "?") as string).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Link 
                            href={`/bemanning/${member.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {(member.first_name || member.firstName || "")} {(member.last_name || member.lastName || "")}
                          </Link>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{getNationalityFlag(member.nationality)}</span>
                            <span>•</span>
                            <span>{member.nationality}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status:</span>
                          <Badge 
                            variant={
                              member.status === "aan-boord" ? "default" :
                              member.status === "thuis" ? "secondary" :
                              member.status === "ziek" ? "destructive" :
                              "outline"
                            }
                          >
                            {member.status}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-500">Schip:</span>
                          <span className="font-medium">{getShipName(member.ship_id)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-500">Regime:</span>
                          <span className="font-medium">{member.regime}</span>
                        </div>
                        
                        {member.phone && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Telefoon:</span>
                            <span className="font-medium">{member.phone}</span>
                          </div>
                        )}
                        
                        {member.is_student && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Student:</span>
                            <Badge variant="outline" className="text-purple-600">
                              {member.education_type}
                            </Badge>
                          </div>
                        )}
                        
                        {member.is_aflosser && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Type:</span>
                            <Badge variant="outline" className="text-orange-600">
                              Aflosser
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Geen {rank.toLowerCase()}en gevonden</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Overig */}
      {grouped["Overig"] && grouped["Overig"].length > 0 && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Overig</span>
                <Badge variant="secondary">{grouped["Overig"].length} leden</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped["Overig"].map((member) => (
                  <div key={member.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {((member.first_name || member.firstName || '?') as string).charAt(0)}
                          {((member.last_name || member.lastName || '?') as string).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Link 
                          href={`/bemanning/${member.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {(member.first_name || member.firstName || '')} {(member.last_name || member.lastName || '')}
                        </Link>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{getNationalityFlag(member.nationality)}</span>
                          <span>•</span>
                          <span>{member.position}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <Badge 
                          variant={
                            member.status === "aan-boord" ? "default" :
                            member.status === "thuis" ? "secondary" :
                            member.status === "ziek" ? "destructive" :
                            "outline"
                          }
                        >
                          {member.status}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-500">Schip:</span>
                        <span className="font-medium">{getShipName(member.ship_id)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 