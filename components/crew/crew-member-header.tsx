"use client"

import { ArrowLeft, Edit, Ship, MoreHorizontal, UserX, RefreshCw, Trash2 } from "lucide-react"
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
import { useState } from "react"

interface Props {
  crewMemberId: string
}

export function CrewMemberHeader({ crewMemberId }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  // Haal echte data uit database
  const crewMember = (crewDatabase as any)[crewMemberId]
  
  const handleDelete = async () => {
    if (!confirm(`Weet je zeker dat je ${crewMember.firstName} ${crewMember.lastName} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      return
    }
    
    setIsDeleting(true)
    
    try {
      // Haal huidige localStorage data op
      const crewData = localStorage.getItem('crewDatabase')
      const storedData = crewData ? JSON.parse(crewData) : {}
      
      // Voeg een "deleted" flag toe aan de crew member in localStorage
      // Dit zorgt ervoor dat de useCrewData hook deze member niet meer toont
      storedData[crewMemberId] = {
        ...storedData[crewMemberId],
        deleted: true,
        status: 'deleted'
      }
      
      // Sla op in localStorage
      localStorage.setItem('crewDatabase', JSON.stringify(storedData))
      
      // Dispatch events om app te updaten
      window.dispatchEvent(new CustomEvent('localStorageUpdate'))
      window.dispatchEvent(new CustomEvent('forceRefresh'))
      
      // Ga terug naar bemanningslijst
      router.push('/bemanning')
      
    } catch (error) {
      console.error('Error deleting crew member:', error)
      alert('Er is een fout opgetreden bij het verwijderen van het bemanningslid.')
    } finally {
      setIsDeleting(false)
    }
  }
  
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
                <DropdownMenuItem 
                  className="text-red-600" 
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? 'Verwijderen...' : 'Bemanningslid verwijderen'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
