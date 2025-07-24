"use client"

import { ArrowLeft, Edit, Ship, MoreHorizontal, UserX, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { crewDatabase, shipDatabase } from "@/data/crew-database"
import { useRouter } from "next/navigation"

interface Props {
  crewMemberId: string
}

export function CrewMemberHeader({ crewMemberId }: Props) {
  const router = useRouter()
  // Haal echte data uit database
  const crewMember = (crewDatabase as any)[crewMemberId]
  
  if (!crewMember) {
    return (
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug
            </button>
            <div className="text-red-600">Bemanningslid niet gevonden</div>
          </div>
        </div>
      </header>
    )
  }

  const isAflosser = crewMember.position?.toLowerCase().includes("aflos")
  const shipName = crewMember.shipId ? (shipDatabase as any)[crewMember.shipId]?.name : crewMember.ship || "-"

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
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug
            </button>

            <div className="flex items-center space-x-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
                  {`${crewMember.firstName} ${crewMember.lastName}`
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">{crewMember.firstName} {crewMember.lastName}</h1>
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
                  <Badge className={getStatusColor(crewMember.status)}>
                    {crewMember.status === "aan-boord" ? "Aan boord" : 
                     crewMember.status === "thuis" ? "Thuis" : 
                     crewMember.status === "ziek" ? "Ziek" : crewMember.status}
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verplaats naar ander schip
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UserX className="w-4 h-4 mr-2" />
                  Ziekmelding registreren
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">Bemanningslid deactiveren</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
