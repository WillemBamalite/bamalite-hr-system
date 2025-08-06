"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Users, Search, Plus, Printer } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { crewDatabase } from "@/data/crew-database"
import { getCombinedShipDatabase } from "@/utils/ship-utils"

export function CrewManagementHeader() {
  const router = useRouter()

  // Bereken statistieken
  const crew = Object.values(crewDatabase).filter((c: any) => c.status !== "uit-dienst")
  const totalCrew = crew.length
  const onBoardCrew = crew.filter((crew: any) => crew.status === "aan-boord").length
  const atHomeCrew = crew.filter((crew: any) => crew.status === "thuis").length
  const sickCrew = crew.filter((crew: any) => crew.status === "ziek").length
  const availableCrew = crew.filter((crew: any) => !crew.shipId).length
  const operationalShips = Object.values(getCombinedShipDatabase()).filter((ship: any) => ship.status === "Operationeel").length

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700">
              <ArrowLeft className="w-4 h-4" />
              <span>Terug</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bemanning Management</h1>
                <p className="text-sm text-gray-600">Beheer alle bemanningsleden en hun toewijzingen</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link href="/bemanning/nieuw">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nieuw Bemanningslid
              </Button>
            </Link>
            <Link href="/bemanning/aflossers">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Aflossers
              </Button>
            </Link>
            <Link href="/bemanning/aflossers/nieuw">
              <Button className="bg-blue-100 hover:bg-blue-200 text-blue-800">
                Nieuw aflosser
              </Button>
            </Link>
            <Link href="/bemanning/nog-in-te-delen">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Nog in te delen
              </Button>
            </Link>
            <Link href="/bemanning/print">
              <Button variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print Overzicht
              </Button>
            </Link>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Zoek bemanningsleden..." className="pl-10" />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-900">{totalCrew}</div>
            <div className="text-xs font-medium text-blue-600">Totaal Bemanning</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-900">{onBoardCrew}</div>
            <div className="text-xs font-medium text-green-600">Aan Boord</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-900">{atHomeCrew}</div>
            <div className="text-xs font-medium text-orange-600">Thuis</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-900">{sickCrew}</div>
            <div className="text-xs font-medium text-red-600">Ziek</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-900">{availableCrew}</div>
            <div className="text-xs font-medium text-purple-600">Beschikbaar</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900">{operationalShips}</div>
            <div className="text-xs font-medium text-gray-600">Actieve Schepen</div>
          </div>
        </div>
      </div>
    </header>
  )
}
