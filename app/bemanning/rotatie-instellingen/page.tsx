"use client"

import { useState } from "react"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function RotationSettingsPage() {
  const [rotationPattern, setRotationPattern] = useState("every-2-weeks")
  const [selectedWeeks, setSelectedWeeks] = useState([1, 3])
  const [wednesdayShips, setWednesdayShips] = useState([
    "MTS Bellona", "MTS Pluto", "MTS Apollo", "MTS Jupiter", "MTS Realite", 
    "MTS Harmonie", "MTS Linde", "MTS Primera", "MTS Caritas", "MTS Maike", 
    "MTS Libertas", "MTS Egalite", "MTS Fidelitas", "MTS Serenitas"
  ])
  const [thursdayShips, setThursdayShips] = useState([
    "MTS Bacchus", "MTS Neptunus"
  ])

  const allShips = [
    "MTS Bellona", "MTS Bacchus", "MTS Pluto", "MTS Apollo", "MTS Jupiter", 
    "MTS Neptunus", "MTS Realite", "MTS Harmonie", "MTS Linde", "MTS Primera", 
    "MTS Caritas", "MTS Maike", "MTS Libertas", "MTS Egalite", "MTS Fidelitas", "MTS Serenitas"
  ]

  const handleWeekToggle = (week: number) => {
    if (selectedWeeks.includes(week)) {
      setSelectedWeeks(selectedWeeks.filter(w => w !== week))
    } else {
      setSelectedWeeks([...selectedWeeks, week].sort())
    }
  }

  const handleShipToggle = (ship: string, day: "wednesday" | "thursday") => {
    if (day === "wednesday") {
      if (wednesdayShips.includes(ship)) {
        setWednesdayShips(wednesdayShips.filter(s => s !== ship))
      } else {
        setWednesdayShips([...wednesdayShips, ship])
      }
    } else {
      if (thursdayShips.includes(ship)) {
        setThursdayShips(thursdayShips.filter(s => s !== ship))
      } else {
        setThursdayShips([...thursdayShips, ship])
      }
    }
  }

  const saveSettings = () => {
    // Hier zou je de instellingen opslaan in een database of config file
    console.log("Instellingen opgeslagen:", {
      pattern: rotationPattern,
      weeks: selectedWeeks,
      wednesdayShips,
      thursdayShips
    })
    // Voor nu simuleren we een opslag
    alert("Instellingen opgeslagen!")
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">⚙️ Rotatie Instellingen</h1>
        <Link href="/bemanning/overzicht">
          <Button variant="outline" size="sm">
            ← Terug naar overzicht
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Rotatie Patroon */}
        <Card>
          <CardHeader>
            <CardTitle>Rotatie Patroon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pattern">Frequentie</Label>
              <Select value={rotationPattern} onValueChange={setRotationPattern}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="every-week">Elke week</SelectItem>
                  <SelectItem value="every-2-weeks">Elke 2 weken</SelectItem>
                  <SelectItem value="every-3-weeks">Elke 3 weken</SelectItem>
                  <SelectItem value="every-4-weeks">Elke 4 weken</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rotationPattern === "every-2-weeks" && (
              <div>
                <Label>Selecteer weken</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map(week => (
                    <div key={week} className="flex items-center space-x-2">
                      <Checkbox
                        id={`week-${week}`}
                        checked={selectedWeeks.includes(week)}
                        onCheckedChange={() => handleWeekToggle(week)}
                      />
                      <Label htmlFor={`week-${week}`}>{week}e week</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Woensdag Schepen */}
        <Card>
          <CardHeader>
            <CardTitle>Woensdag Rotaties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {allShips.map(ship => (
                <div key={ship} className="flex items-center space-x-2">
                  <Checkbox
                    id={`wed-${ship}`}
                    checked={wednesdayShips.includes(ship)}
                    onCheckedChange={() => handleShipToggle(ship, "wednesday")}
                  />
                  <Label htmlFor={`wed-${ship}`} className="text-sm">{ship}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Donderdag Schepen */}
        <Card>
          <CardHeader>
            <CardTitle>Donderdag Rotaties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {allShips.map(ship => (
                <div key={ship} className="flex items-center space-x-2">
                  <Checkbox
                    id={`thu-${ship}`}
                    checked={thursdayShips.includes(ship)}
                    onCheckedChange={() => handleShipToggle(ship, "thursday")}
                  />
                  <Label htmlFor={`thu-${ship}`} className="text-sm">{ship}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Samenvatting */}
        <Card>
          <CardHeader>
            <CardTitle>Samenvatting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>Patroon:</strong> {rotationPattern === "every-2-weeks" ? "Elke 2 weken" : rotationPattern}
            </div>
            {rotationPattern === "every-2-weeks" && (
              <div>
                <strong>Weken:</strong> {selectedWeeks.map(w => `${w}e`).join(", ")}
              </div>
            )}
            <div>
              <strong>Woensdag ({wednesdayShips.length} schepen):</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {wednesdayShips.map(ship => (
                  <Badge key={ship} variant="outline" className="text-xs">
                    {ship}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <strong>Donderdag ({thursdayShips.length} schepen):</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {thursdayShips.map(ship => (
                  <Badge key={ship} variant="outline" className="text-xs">
                    {ship}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acties */}
        <div className="flex gap-4">
          <Button onClick={saveSettings} className="flex-1">
            💾 Instellingen Opslaan
          </Button>
          <Link href="/bemanning/rotatie-kalender" className="flex-1">
            <Button variant="outline" className="w-full">
              📅 Bekijk Kalender
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 