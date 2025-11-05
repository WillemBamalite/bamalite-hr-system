"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, History, Download, Users, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { sickLeaveHistoryDatabase, sickLeaveDatabase } from "@/data/crew-database"

export function SickLeaveHistoryHeader() {
  const router = useRouter()

  // Bereken statistieken
  const totalHistoryRecords = Object.values(sickLeaveHistoryDatabase).length
  const openStandBackRecords = Object.values(sickLeaveHistoryDatabase).filter(
    (record: any) => record.standBackDaysRemaining > 0,
  ).length
  const totalOpenDays = Object.values(sickLeaveHistoryDatabase)
    .filter((record: any) => record.standBackDaysRemaining > 0)
    .reduce((sum, record: any) => sum + record.standBackDaysRemaining, 0)
  const currentSickCount = Object.values(sickLeaveDatabase).length

  const handleExportHistory = () => {
    // Hier zou je een CSV/Excel export kunnen implementeren

    alert("Export functionaliteit wordt geïmplementeerd")
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700">
              <ArrowLeft className="w-4 h-4" />
              <span>Terug</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <History className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ziekte History & Terug Staan</h1>
                <p className="text-sm text-gray-600">
                  Volledige history van ziekmeldingen en terug staan dagen management
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Statistieken badges */}
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                <Users className="w-3 h-3 mr-1" />
                {totalHistoryRecords} history records
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {currentSickCount} actief ziek
              </Badge>
              {openStandBackRecords > 0 && <Badge variant="destructive">{totalOpenDays} dagen openstaand</Badge>}
            </div>

            <Button onClick={handleExportHistory} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export History
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-blue-600">Totaal History</div>
            <div className="text-2xl font-bold text-blue-900">{totalHistoryRecords}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-red-600">Actief Ziek</div>
            <div className="text-2xl font-bold text-red-900">{currentSickCount}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-orange-600">Openstaande Personen</div>
            <div className="text-2xl font-bold text-orange-900">{openStandBackRecords}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-yellow-600">Openstaande Dagen</div>
            <div className="text-2xl font-bold text-yellow-900">{totalOpenDays}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
