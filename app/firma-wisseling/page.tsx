"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Building2, UserPlus, AlertCircle } from 'lucide-react'
import { useSupabaseData } from '@/hooks/use-supabase-data'
import { DashboardButton } from '@/components/ui/dashboard-button'

const COMPANIES = [
  { id: 'bamalite', name: 'Bamalite S.A.', number: 'B 44356' },
  { id: 'alcina', name: 'Alcina S.A.', number: 'B 129072' },
  { id: 'europe', name: 'Europe Shipping AG.', number: 'B 83558' },
  { id: 'brugo', name: 'Brugo Shipping SARL.', number: 'B 277323' },
  { id: 'devel', name: 'Devel Shipping S.A.', number: 'B 139046' },
]

export default function FirmaWisselingPage() {
  const { crew, ships, loading } = useSupabaseData()
  const [activeTab, setActiveTab] = useState(COMPANIES[0].id)

  // Filter crew per firma
  const getCrewByCompany = (companyName: string) => {
    return crew.filter((member: any) => 
      member.company === companyName && 
      !member.is_dummy && 
      member.status !== 'uit-dienst'
    )
  }

  // Check of iemand op een schip van een andere firma staat
  const hasShipFromDifferentCompany = (member: any) => {
    if (!member.ship_id) return false
    
    const ship = ships.find((s: any) => s.id === member.ship_id)
    if (!ship || !ship.company) return false
    
    // Als het schip een andere company heeft dan de persoon, toon indicator
    return ship.company !== member.company
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Laden...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <DashboardButton />
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Firma Wisseling</h1>
          <p className="text-gray-600">Overzicht van bemanningsleden per firma</p>
        </div>
        <Link href="/firma-wisseling/wisseling">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Wisseling van Firma
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-5xl grid-cols-5 mb-8">
          {COMPANIES.map((company) => {
            const companyCrew = getCrewByCompany(company.name)
            return (
              <TabsTrigger 
                key={company.id} 
                value={company.id} 
                className="text-sm"
              >
                <Building2 className="w-4 h-4 mr-2" />
                {company.name.split(' ')[0]}
                <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {companyCrew.length}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Tab Content voor elke firma */}
        {COMPANIES.map((company) => {
          const companyCrew = getCrewByCompany(company.name)
          
          return (
            <TabsContent key={company.id} value={company.id} className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
                    <p className="text-gray-600">Firmanummer: {company.number}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {companyCrew.length} bemanningslid{companyCrew.length !== 1 ? 'en' : ''}
                    </p>
                  </div>

                  {companyCrew.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      Geen bemanningsleden bij deze firma
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {companyCrew.map((member: any) => {
                        const needsCompanySwitch = hasShipFromDifferentCompany(member)
                        const ship = ships.find((s: any) => s.id === member.ship_id)
                        
                        return (
                          <Card key={member.id} className={`hover:shadow-md transition-shadow ${needsCompanySwitch ? 'border-orange-300 border-2' : ''}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarFallback className="bg-blue-100 text-blue-600">
                                    {member.first_name?.[0] || '?'}{member.last_name?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-gray-900 truncate">
                                      {member.first_name} {member.last_name}
                                    </h3>
                                    {needsCompanySwitch && (
                                      <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" title="Staat op schip van andere firma" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 truncate">{member.position}</p>
                                  {member.ship_id && (
                                    <p className="text-xs text-gray-500 truncate">
                                      {ship?.name || member.ship_id}
                                      {needsCompanySwitch && ship && (
                                        <span className="ml-1 text-orange-600">({ship.company})</span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}

