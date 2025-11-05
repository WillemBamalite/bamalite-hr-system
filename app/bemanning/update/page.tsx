"use client"

import { useState, useEffect } from "react"
import { useCrewData } from "@/hooks/use-crew-data"
import { calculateCurrentStatus, autoAdvanceCrewDatabase, manuallyAdjustDates } from "@/utils/regime-calculator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Clock, AlertTriangle, RefreshCw } from "lucide-react"

export default function UpdatePage() {
  const { crewDatabase: allCrewData, forceRefresh } = useCrewData()
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [advanceResult, setAdvanceResult] = useState<{ success: boolean; message: string } | null>(null)
  const [selectedCrew, setSelectedCrew] = useState<any>(null)
  const [newDate, setNewDate] = useState("")
  const [dateType, setDateType] = useState<"thuisSinds" | "onBoardSince">("thuisSinds")

  // Filter crew members met regime
  const crewWithRegime = Object.values(allCrewData).filter((crew: any) => 
    crew.regime && crew.regime !== "Altijd" && !crew.deleted
  )

  // Bereken status voor elke crew member
  const crewWithStatus = crewWithRegime.map((crew: any) => {
    const statusCalculation = calculateCurrentStatus(crew.regime, crew.thuisSinds, crew.onBoardSince)
    return {
      ...crew,
      calculatedStatus: statusCalculation.currentStatus,
      nextRotationDate: statusCalculation.nextRotationDate,
      daysUntilRotation: statusCalculation.daysUntilRotation
    }
  })

  // Groepeer per status
  const aanBoord = crewWithStatus.filter((c: any) => c.calculatedStatus === "aan-boord")
  const thuis = crewWithStatus.filter((c: any) => c.calculatedStatus === "thuis")

  const handleAdvanceDates = async () => {
    setIsAdvancing(true)
    setAdvanceResult(null)
    
    try {
      const result = autoAdvanceCrewDatabase()
      if (result) {
        setAdvanceResult({ success: true, message: "Datums succesvol doorgelopen!" })
        forceRefresh()
      } else {
        setAdvanceResult({ success: false, message: "Geen datums hoefden doorgelopen te worden." })
      }
    } catch (error) {
      setAdvanceResult({ success: false, message: `Fout bij doordraaien datums: ${error}` })
    } finally {
      setIsAdvancing(false)
    }
  }

  const handleManualAdjust = () => {
    if (!selectedCrew || !newDate) return

    try {
      const crewData = localStorage.getItem('crewDatabase')
      if (!crewData) return

      const crew = JSON.parse(crewData)
      const { hasChanges, updatedCrew } = manuallyAdjustDates(selectedCrew.id, newDate, dateType, crew)

      if (hasChanges) {
        localStorage.setItem('crewDatabase', JSON.stringify(updatedCrew))
        window.dispatchEvent(new Event('localStorageUpdate'))
        window.dispatchEvent(new Event('forceRefresh'))
        
        setAdvanceResult({ success: true, message: `Datum succesvol aangepast voor ${selectedCrew.firstName} ${selectedCrew.lastName}` })
        setSelectedCrew(null)
        setNewDate("")
        forceRefresh()
      }
    } catch (error) {
      setAdvanceResult({ success: false, message: `Fout bij aanpassen datum: ${error}` })
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Regime Update</h1>
        <p className="text-gray-600 mb-6">
          Hier kun je de datums automatisch doordraaien en handmatig aanpassen voor bemanningsleden.
        </p>

        {/* Automatische datum doorloop */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Automatische Datum Doorloop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Controleer en loop automatisch alle datums door op basis van het regime. 
              Dit zorgt ervoor dat bemanningsleden automatisch van status wisselen wanneer hun periode voorbij is.
            </p>
            
            <Button 
              onClick={handleAdvanceDates} 
              disabled={isAdvancing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAdvancing ? "Bezig..." : "Datums Doordraaien"}
            </Button>

            {advanceResult && (
              <Alert className={`mt-4 ${advanceResult.success ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
                <AlertDescription className={advanceResult.success ? "text-green-800" : "text-yellow-800"}>
                  {advanceResult.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Handmatige datum aanpassing */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Handmatige Datum Aanpassing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Pas handmatig een datum aan voor een specifiek bemanningslid. 
              De andere datum wordt automatisch berekend op basis van het regime.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="crew-select">Bemanningslid</Label>
                <select 
                  id="crew-select"
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={selectedCrew?.id || ""}
                  onChange={(e) => {
                    const crew = crewWithStatus.find((c: any) => c.id === e.target.value)
                    setSelectedCrew(crew || null)
                  }}
                >
                  <option value="">Selecteer bemanningslid</option>
                  {crewWithStatus.map((crew: any) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.firstName} {crew.lastName} ({crew.regime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="date-type">Datum Type</Label>
                <select 
                  id="date-type"
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={dateType}
                  onChange={(e) => setDateType(e.target.value as "thuisSinds" | "onBoardSince")}
                >
                  <option value="thuisSinds">Thuis sinds</option>
                  <option value="onBoardSince">Aan boord sinds</option>
                </select>
              </div>

              <div>
                <Label htmlFor="new-date">Nieuwe Datum</Label>
                <Input 
                  id="new-date"
                  type="date" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {selectedCrew && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Huidige situatie voor {selectedCrew.firstName} {selectedCrew.lastName}:</h4>
                <div className="text-sm space-y-1">
                  <div>Regime: {selectedCrew.regime}</div>
                  <div>Huidige status: {selectedCrew.calculatedStatus}</div>
                  <div>Thuis sinds: {selectedCrew.thuisSinds ? new Date(selectedCrew.thuisSinds).toLocaleDateString("nl-NL") : "Niet ingesteld"}</div>
                  <div>Aan boord sinds: {selectedCrew.onBoardSince ? new Date(selectedCrew.onBoardSince).toLocaleDateString("nl-NL") : "Niet ingesteld"}</div>
                  <div>Volgende wissel: {selectedCrew.nextRotationDate ? new Date(selectedCrew.nextRotationDate).toLocaleDateString("nl-NL") : "Niet berekend"}</div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleManualAdjust}
              disabled={!selectedCrew || !newDate}
              className="bg-green-600 hover:bg-green-700"
            >
              Datum Aanpassen
            </Button>
          </CardContent>
        </Card>

        {/* Overzicht */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Aan boord */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Aan Boord ({aanBoord.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {aanBoord.map((crew: any) => (
                  <div key={crew.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium">{crew.firstName} {crew.lastName}</div>
                      <div className="text-sm text-gray-600">{crew.regime} • {crew.shipId}</div>
                      <div className="text-xs text-gray-500">
                        Volgende wissel: {crew.nextRotationDate ? new Date(crew.nextRotationDate).toLocaleDateString("nl-NL") : "Niet berekend"}
                        {crew.daysUntilRotation > 0 && ` (over ${crew.daysUntilRotation} dagen)`}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Aan boord</Badge>
                  </div>
                ))}
                {aanBoord.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Geen bemanningsleden aan boord</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Thuis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Thuis ({thuis.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {thuis.map((crew: any) => (
                  <div key={crew.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium">{crew.firstName} {crew.lastName}</div>
                      <div className="text-sm text-gray-600">{crew.regime} • {crew.shipId}</div>
                      <div className="text-xs text-gray-500">
                        Volgende wissel: {crew.nextRotationDate ? new Date(crew.nextRotationDate).toLocaleDateString("nl-NL") : "Niet berekend"}
                        {crew.daysUntilRotation > 0 && ` (over ${crew.daysUntilRotation} dagen)`}
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Thuis</Badge>
                  </div>
                ))}
                {thuis.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Geen bemanningsleden thuis</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 