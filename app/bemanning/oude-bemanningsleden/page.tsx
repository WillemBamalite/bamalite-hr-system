"use client"

import { crewDatabase } from "@/data/crew-database"
import { getOutOfServiceCrew, getOutOfServiceRecord } from "@/utils/out-of-service-storage"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users } from "lucide-react"
import { useState, useEffect } from "react"

const RANK_ORDER = [
  "Schipper",
  "Stuurman", 
  "Vol Matroos",
  "Matroos",
  "Lichtmatroos",
  "Deksman"
];

export default function FormerCrewPage() {
  const [formerCrew, setFormerCrew] = useState<any[]>([])
  const [grouped, setGrouped] = useState<{ [rank: string]: any[] }>({})

  useEffect(() => {
    // Filter crew members who are out of service
    const outOfServiceRecords = getOutOfServiceCrew()
    const filteredCrew = Object.values(crewDatabase).filter((crew: any) => 
      outOfServiceRecords.some(record => record.crewMemberId === crew.id)
    )
    setFormerCrew(filteredCrew)

    // Group by rank
    const groupedData: { [rank: string]: any[] } = {}
    filteredCrew.forEach((crew) => {
      const rank = RANK_ORDER.includes(crew.position) ? crew.position : "Overig"
      if (!groupedData[rank]) groupedData[rank] = []
      groupedData[rank].push(crew)
    })
    setGrouped(groupedData)
  }, [])

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/bemanning/overzicht">
          <Button variant="ghost" size="sm" className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Terug naar Bemanning</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Oude Bemanningsleden</h1>
          <p className="text-sm text-gray-600">Bemanningsleden die uit dienst zijn</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">
                {formerCrew.length} voormalig bemanningslid{formerCrew.length !== 1 ? 'en' : ''}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Former crew by rank */}
      {RANK_ORDER.map((rank) => (
        <div key={rank} className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{rank}</h2>
          {grouped[rank]?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped[rank].map((crew) => (
                <Card key={crew.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gray-100 text-gray-700">
                            {crew.firstName[0]}{crew.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/bemanning/${crew.id}`} className="hover:underline">
                            <h3 className="font-semibold text-gray-900 cursor-pointer">
                              {crew.firstName} {crew.lastName}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-600">{crew.position}</p>
                        </div>
                      </div>
                      <Badge className="bg-gray-100 text-gray-800" variant="outline">
                        Uit dienst
                      </Badge>
                    </div>

                                         <div className="space-y-2 text-sm text-gray-700">
                       {(() => {
                         const outOfServiceRecord = getOutOfServiceRecord(crew.id)
                         return outOfServiceRecord ? (
                           <>
                             <div>
                               <strong>Uit dienst sinds:</strong> {new Date(outOfServiceRecord.outOfServiceDate).toLocaleDateString('nl-NL')}
                             </div>
                             <div>
                               <strong>Reden:</strong> {outOfServiceRecord.outOfServiceReason}
                             </div>
                           </>
                         ) : null
                       })()}
                       {crew.shipId && (
                         <div>
                           <strong>Laatste schip:</strong> {crew.shipId}
                         </div>
                       )}
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">Geen voormalige bemanningsleden in deze rang</div>
          )}
        </div>
      ))}

      {/* Empty state */}
      {formerCrew.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen voormalige bemanningsleden</h3>
          <p className="text-gray-600">Er zijn nog geen bemanningsleden uit dienst gezet.</p>
        </div>
      )}
    </div>
  )
} 