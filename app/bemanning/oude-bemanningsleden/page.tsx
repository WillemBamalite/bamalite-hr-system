"use client"

import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"

const RANK_ORDER = [
  "Schipper",
  "Stuurman", 
  "Vol Matroos",
  "Matroos",
  "Lichtmatroos",
  "Deksman"
];

export default function FormerCrewPage() {
  const { crew, deleteCrew } = useSupabaseData()
  const [grouped, setGrouped] = useState<{ [rank: string]: any[] }>({})
  
  // Filter crew members die uit dienst zijn
  const formerCrew = crew.filter((c: any) => c.status === 'uit-dienst')

  // Group by rank whenever crew changes
  useEffect(() => {
    const groupedData: { [rank: string]: any[] } = {}
    formerCrew.forEach((crewMember: any) => {
      const rawPos = crewMember.position || "Overig"
      const normalized = rawPos === "Kapitein" ? "Schipper" : rawPos
      const rank = RANK_ORDER.includes(normalized) ? normalized : "Overig"
      if (!groupedData[rank]) groupedData[rank] = []
      groupedData[rank].push(crewMember)
    })
    setGrouped(groupedData)
  }, [crew.length])

  const handleDeleteCrew = async (crewId: string, fullName: string) => {
    if (!confirm(`Weet je zeker dat je ${fullName} definitief wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) {
      return
    }
    try {
      await deleteCrew(crewId)
      alert('Bemanningslid definitief verwijderd.')
    } catch (e) {
      console.error('Definitief verwijderen mislukt:', e)
      alert('Verwijderen mislukt. Probeer opnieuw.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Terug naar Dashboard</span>
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
                            {(crew.first_name || "?").charAt(0)}{(crew.last_name || "?").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/bemanning/${crew.id}`} className="hover:underline">
                            <h3 className="font-semibold text-gray-900 cursor-pointer">
                              {crew.first_name} {crew.last_name}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-600">{crew.position === 'Kapitein' ? 'Schipper' : crew.position}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-100 text-gray-800" variant="outline">
                          Uit dienst
                        </Badge>
                        <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteCrew(crew.id, `${crew.first_name} ${crew.last_name}`)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-700">
                      {crew.out_of_service_date && (
                        <div>
                          <strong>Uit dienst sinds:</strong> {new Date(crew.out_of_service_date).toLocaleDateString('nl-NL')}
                        </div>
                      )}
                      {crew.out_of_service_reason && (
                        <div>
                          <strong>Reden:</strong> {crew.out_of_service_reason}
                        </div>
                      )}
                      {crew.ship_id && (
                        <div>
                          <strong>Laatste schip:</strong> {crew.ship_id}
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

      {/* Overig section */}
      {grouped["Overig"]?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Overig</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grouped["Overig"].map((crew) => (
              <Card key={crew.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gray-100 text-gray-700">
                          {(crew.first_name || "?").charAt(0)}{(crew.last_name || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/bemanning/${crew.id}`} className="hover:underline">
                          <h3 className="font-semibold text-gray-900 cursor-pointer">
                            {crew.first_name} {crew.last_name}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-600">{crew.position === 'Kapitein' ? 'Schipper' : crew.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-100 text-gray-800" variant="outline">
                        Uit dienst
                      </Badge>
                      <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteCrew(crew.id, `${crew.first_name} ${crew.last_name}`)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700">
                    {crew.out_of_service_date && (
                      <div>
                        <strong>Uit dienst sinds:</strong> {new Date(crew.out_of_service_date).toLocaleDateString('nl-NL')}
                      </div>
                    )}
                    {crew.out_of_service_reason && (
                      <div>
                        <strong>Reden:</strong> {crew.out_of_service_reason}
                      </div>
                    )}
                    {crew.ship_id && (
                      <div>
                        <strong>Laatste schip:</strong> {crew.ship_id}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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