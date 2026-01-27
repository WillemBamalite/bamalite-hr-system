"use client"

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Building2, UserPlus, AlertCircle, Printer } from 'lucide-react'
import { useSupabaseData } from '@/hooks/use-supabase-data'
import { DashboardButton } from '@/components/ui/dashboard-button'
import { CrewMemberPrint } from '@/components/crew/crew-member-print'

const COMPANIES = [
  { id: 'bamalite', name: 'Bamalite S.A.', number: 'B 44356' },
  { id: 'alcina', name: 'Alcina S.A.', number: 'B 129072' },
  { id: 'europe', name: 'Europe Shipping AG.', number: 'B 83558' },
  { id: 'brugo', name: 'Brugo Shipping SARL.', number: 'B 277323' },
  { id: 'devel', name: 'Devel Shipping S.A.', number: 'B 139046' },
]

// Rang-volgorde voor sortering
const RANK_ORDER: Record<string, number> = {
  'kapitein': 1,
  '2e kapitein': 2,
  'stuurman': 3,
  'vol matroos': 4,
  'matroos': 5,
  'licht matroos': 6,
  'deksman': 7,
}

function sortByRankAndName(a: any, b: any) {
  const posA = (a.position || '').toString().toLowerCase()
  const posB = (b.position || '').toString().toLowerCase()
  const rankA = RANK_ORDER[posA] ?? 999
  const rankB = RANK_ORDER[posB] ?? 999

  if (rankA !== rankB) return rankA - rankB

  const lastA = (a.last_name || '').toString()
  const lastB = (b.last_name || '').toString()
  return lastA.localeCompare(lastB, 'nl')
}

export default function FirmaWisselingPage() {
  const { crew, ships, loading } = useSupabaseData()
  const [activeTab, setActiveTab] = useState(COMPANIES[0].id)

  // Filter crew per firma
  const getCrewByCompany = (companyName: string) => {
    return crew
      .filter((member: any) => 
        member.company === companyName && 
        !member.is_dummy && 
        member.status !== 'uit-dienst'
      )
      .sort(sortByRankAndName)
  }

  // Check of iemand op een schip van een andere firma staat
  const hasShipFromDifferentCompany = (member: any) => {
    if (!member.ship_id) return false
    
    const ship = ships.find((s: any) => s.id === member.ship_id)
    if (!ship || !ship.company) return false
    
    // Als het schip een andere company heeft dan de persoon, toon indicator
    return ship.company !== member.company
  }

  const activeCompany = COMPANIES.find((c) => c.id === activeTab) || COMPANIES[0]
  const activeCompanyCrew = getCrewByCompany(activeCompany.name)

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
      
      {/* Print CSS voor firma-overzicht + persoonlijke pagina's */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .firma-print-root,
            .firma-print-root * {
              visibility: visible;
            }
            .firma-print-root {
              position: absolute;
              left: 0;
              top: 0;
              width: 210mm;
              min-height: 297mm;
              padding: 20mm;
              background: white;
              font-family: 'Arial', sans-serif;
              font-size: 11pt;
              line-height: 1.5;
            }
            .firma-print-toc-page {
              page-break-after: always;
            }
            .crew-print-page {
              page-break-after: always;
              width: 210mm;
              min-height: 297mm;
              padding: 20mm 20mm 25mm 20mm;
              background: white;
            }
            .no-print,
            header,
            nav,
            button {
              display: none !important;
            }
          }
          @media screen {
            .firma-print-root {
              display: none;
            }
          }
          @page {
            size: A4;
            margin: 0;
          }
        `
        }}
      />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Firma Wisseling</h1>
          <p className="text-gray-600">Overzicht van bemanningsleden per firma</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (activeCompanyCrew.length === 0) {
                alert('Er zijn geen bemanningsleden bij deze firma om te printen.')
                return
              }
              window.print()
            }}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print firma ({activeCompanyCrew.length})
          </Button>
          <Link href="/firma-wisseling/wisseling">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Wisseling van Firma
            </Button>
          </Link>
        </div>
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

      {/* Print layout: inhoudsopgave + alle persoonlijke pagina's van actieve firma */}
      <div className="firma-print-root">
        {/* Inhoudsopgave */}
        <div className="firma-print-toc-page">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Firma overzicht - {activeCompany.name}
          </h1>
          <p className="text-gray-700 mb-4">
            Overzicht van alle bemanningsleden bij deze firma.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Totaal: {activeCompanyCrew.length} bemanningslid{activeCompanyCrew.length === 1 ? '' : 'en'}
          </p>
          <ol className="space-y-1 text-sm">
            {activeCompanyCrew.map((member: any, index: number) => (
              <li key={member.id} className="flex justify-between border-b border-gray-200 py-1">
                <span className="font-medium">
                  {index + 1}. {member.first_name} {member.last_name}
                </span>
                <span className="text-gray-500">{member.position}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Alle individuele printpagina's voor deze firma */}
        <Suspense fallback={null}>
          {activeCompanyCrew.map((member: any) => (
            <CrewMemberPrint
              key={member.id}
              crewMemberId={member.id}
              language="nl"
              variant="firma"
            />
          ))}
        </Suspense>
      </div>
    </div>
  )
}

