"use client"

import { ArrowLeft, Edit, Ship } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import { BackButton } from "@/components/ui/back-button"
import { useSupabaseData } from "@/hooks/use-supabase-data"

interface Props {
  crewMemberId: string
}

export function CrewMemberHeader({ crewMemberId }: Props) {
  const router = useRouter()
  const { crew, ships, loading } = useSupabaseData()
  
  // Haal data uit Supabase
  const crewMember = crew.find((c: any) => c.id === crewMemberId)
  
  if (loading) {
    return (
      <header className="border-b bg-white shadow-sm">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between">
            <BackButton />
            <div className="text-gray-600">Laden...</div>
          </div>
        </div>
      </header>
    )
  }
  
  if (!crewMember) {
    return (
      <header className="border-b bg-white shadow-sm">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between">
            <BackButton />
            <div className="text-red-600">Bemanningslid niet gevonden</div>
          </div>
        </div>
      </header>
    )
  }

  const isAflosser = crewMember.position?.toLowerCase().includes("aflos")
  const ship = ships.find((s: any) => s.id === crewMember.ship_id)
  const shipName = ship?.name || "-"

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aan-boord":
        return "bg-green-100 text-green-800"
      case "thuis":
        return "bg-blue-100 text-blue-800"
      case "ziek":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="w-full px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BackButton />

            <div className="flex items-center space-x-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
                  {`${crewMember.first_name} ${crewMember.last_name}`
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">{crewMember.first_name} {crewMember.last_name}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  {!isAflosser && (
                    <span className="text-gray-600">{crewMember.position}</span>
                  )}
                  <Badge variant="outline">{crewMember.nationality}</Badge>
                  {!isAflosser && (
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Ship className="w-3 h-3" />
                      <span>{shipName}</span>
                    </div>
                  )}
                  <Badge className={(() => {
                    if (crewMember.status === "ziek") return "bg-red-100 text-red-800"
                    if (crewMember.status === "nog-in-te-delen") return "bg-gray-100 text-gray-800"
                    if (!crewMember.regime) return crewMember.status === "aan-boord" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                    
                    const statusCalculation = calculateCurrentStatus(
                      crewMember.regime as "1/1" | "2/2" | "3/3" | "Altijd",
                      crewMember.thuis_sinds,
                      crewMember.on_board_since
                    )
                    return statusCalculation.currentStatus === "aan-boord" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                  })()}>
                    {(() => {
                      if (crewMember.status === "ziek") return "Ziek"
                      if (crewMember.status === "nog-in-te-delen") return "Nog in te delen"
                      if (!crewMember.regime) return crewMember.status === "aan-boord" ? "Aan boord" : "Thuis"
                      
                      const statusCalculation = calculateCurrentStatus(
                        crewMember.regime as "1/1" | "2/2" | "3/3" | "Altijd",
                        crewMember.thuis_sinds,
                        crewMember.on_board_since
                      )
                      return statusCalculation.currentStatus === "aan-boord" ? "Aan boord" : "Thuis"
                    })()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Bewerken
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
