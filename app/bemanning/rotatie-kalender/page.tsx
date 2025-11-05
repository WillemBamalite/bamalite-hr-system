"use client"

import { crewDatabase, shipDatabase } from "@/data/crew-database"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { useState } from "react"

export default function RotationCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Maand navigatie
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  // Kalender data genereren
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const firstDayOfWeek = firstDay.getDay() || 7 // Maandag = 1, Zondag = 7

    const days = []
    
    // Voeg lege dagen toe voor begin van maand
    for (let i = 1; i < firstDayOfWeek; i++) {
      days.push(null)
    }
    
    // Voeg alle dagen van de maand toe
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const days = getDaysInMonth(currentMonth)
  const monthNames = [
    "Januari", "Februari", "Maart", "April", "Mei", "Juni",
    "Juli", "Augustus", "September", "Oktober", "November", "December"
  ]

  const [selectedShip, setSelectedShip] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Helper functie om rotatie dag te bepalen
  const getRotationDay = (shipName: string): string => {
    // Specifieke rotatie dagen per schip
    const rotationDays: { [key: string]: string } = {
      "MTS Bacchus": "donderdag",
      "MTS Neptunus": "donderdag",
    }
    return rotationDays[shipName] || "woensdag" // Default woensdag
  }

  // Helper functie om te bepalen of iemand aflost op een bepaalde datum
  const isRotationDay = (crewMember: any, date: Date) => {
    const dayOfWeek = date.getDay() // 0 = zondag, 3 = woensdag, 4 = donderdag
    const weekOfMonth = Math.ceil(date.getDate() / 7) // 1-5 voor weken van de maand
    
    // Alleen woensdag en donderdag
    if (dayOfWeek !== 3 && dayOfWeek !== 4) {
      return false
    }
    
    // Bepaal rotatie patroon op basis van regime
    const regime = crewMember.regime
    let rotationWeeks: number[] = []
    
    switch (regime) {
      case "1/1":
        // Elke week
        rotationWeeks = [1, 2, 3, 4, 5]
        break
      case "2/2":
        // Elke 2 weken (1e en 3e week)
        rotationWeeks = [1, 3]
        break
      case "3/3":
        // Elke 3 weken (1e, 4e week)
        rotationWeeks = [1, 4]
        break
      default:
        return false
    }
    
    return rotationWeeks.includes(weekOfMonth)
  }

  // Rotatie schema per schip - gebaseerd op individuele regimes
  const getRotationForDate = (date: Date) => {
    const dayOfWeek = date.getDay() // 0 = zondag, 3 = woensdag, 4 = donderdag
    
    // Alleen woensdag en donderdag
    if (dayOfWeek !== 3 && dayOfWeek !== 4) {
      return []
    }
    
    // Groepeer bemanningsleden per schip die op deze datum aflossen
    const shipRotations: { [shipId: string]: any } = {}
    
    Object.values(crewDatabase).forEach((crewMember: any) => {
      if (isRotationDay(crewMember, date)) {
        const shipId = crewMember.shipId
        if (!shipRotations[shipId]) {
          shipRotations[shipId] = {
            shipId,
            shipName: shipDatabase[shipId as keyof typeof shipDatabase]?.name || shipId,
            color: getShipColor(shipId),
            crew: []
          }
        }
        shipRotations[shipId].crew.push(crewMember)
      }
    })
    
    return Object.values(shipRotations)
  }

  // Helper functie voor schepen kleuren
  const getShipColor = (shipId: string) => {
    const colors = [
      "bg-blue-100 border-blue-300",
      "bg-green-100 border-green-300", 
      "bg-purple-100 border-purple-300",
      "bg-orange-100 border-orange-300",
      "bg-red-100 border-red-300",
      "bg-teal-100 border-teal-300",
      "bg-pink-100 border-pink-300",
      "bg-indigo-100 border-indigo-300",
      "bg-yellow-100 border-yellow-300",
      "bg-cyan-100 border-cyan-300",
      "bg-lime-100 border-lime-300",
      "bg-amber-100 border-amber-300",
      "bg-emerald-100 border-emerald-300",
      "bg-violet-100 border-violet-300",
      "bg-rose-100 border-rose-300",
      "bg-slate-100 border-slate-300"
    ]
    
    const shipIds = Object.keys(shipDatabase)
    const index = shipIds.indexOf(shipId)
    return colors[index % colors.length]
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📅 Rotatie Kalender</h1>
                  <Link href="/">
          <Button variant="outline" size="sm">
            ← Terug naar Dashboard
          </Button>
        </Link>
      </div>

      {/* Maand navigatie */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Vorige maand
            </Button>
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
            </div>
            
            <Button variant="outline" size="sm" onClick={nextMonth}>
              Volgende maand
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kalender Grid */}
      <Card>
        <CardContent className="p-6">
          {/* Dagen van de week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 p-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Kalender dagen */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              const rotations = date ? getRotationForDate(date) : []
              
              return (
                <div 
                  key={index} 
                  className={`min-h-[100px] p-2 border rounded-lg ${
                    date ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  {date && (
                    <>
                      <div className="text-sm font-medium mb-1">
                        {date.getDate()}
                      </div>
                      
                      {rotations.length > 0 && (
                        <div className="space-y-1">
                          {rotations.map((rotation, idx) => (
                            <div 
                              key={idx}
                              className={`cursor-pointer hover:opacity-80 transition-opacity ${rotation.color} p-2 rounded`}
                              onClick={() => {
                                setSelectedShip(rotation.shipId)
                                setSelectedDate(date)
                              }}
                            >
                              <div className="text-xs font-medium mb-1">
                                {rotation.shipName}
                              </div>
                              <div className="text-xs text-gray-600">
                                {rotation.crew.length} bemanningsleden
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Geselecteerd schip details */}
      {selectedShip && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">📋 {shipDatabase[selectedShip as keyof typeof shipDatabase]?.name} Details</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedShip(null)
                  setSelectedDate(null)
                }}
              >
                ✕ Sluiten
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Schip Informatie</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Max bemanning:</strong> {shipDatabase[selectedShip as keyof typeof shipDatabase]?.maxCrew}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Rotatie Schema</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Rotatie dag:</strong> {getRotationDay(shipDatabase[selectedShip as keyof typeof shipDatabase]?.name || "")}</div>
                    <div><strong>Bemanningsleden:</strong> {Object.values(crewDatabase).filter((crew: any) => crew.shipId === selectedShip).length}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Bemanningsleden die aflossen</h4>
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-green-700 mb-2">→ Naar aan boord</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.values(crewDatabase)
                      .filter((crew: any) => crew.shipId === selectedShip)
                      .filter((crew: any) => selectedDate && isRotationDay(crew, selectedDate))
                      .map((crew: any) => {
                        // Bereken rotatie periode
                        const regime = crew.regime
                        let daysOn = 0, daysOff = 0
                        
                        switch (regime) {
                          case "1/1":
                            daysOn = 7
                            daysOff = 7
                            break
                          case "2/2":
                            daysOn = 14
                            daysOff = 14
                            break
                          case "3/3":
                            daysOn = 21
                            daysOff = 21
                            break
                        }
                        
                        const rotationStart = selectedDate!
                        const rotationEnd = new Date(selectedDate!)
                        rotationEnd.setDate(rotationEnd.getDate() + daysOn)
                        
                        const homeStart = new Date(rotationEnd)
                        const homeEnd = new Date(homeStart)
                        homeEnd.setDate(homeEnd.getDate() + daysOff)
                        
                        return (
                          <div key={crew.id} className="p-3 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-center space-x-3 mb-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs bg-green-100 text-green-700">
                                  {crew.firstName[0]}{crew.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="text-sm font-medium">{crew.firstName} {crew.lastName}</div>
                                <div className="text-xs text-gray-600">{crew.position} • {crew.regime}</div>
                              </div>
                              <Badge className="bg-green-100 text-green-800" variant="outline">
                                → Aan boord
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Aflos datum:</span>
                                <span className="font-medium">{rotationStart.toLocaleDateString('nl-NL')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Aan boord tot:</span>
                                <span className="font-medium">{rotationEnd.toLocaleDateString('nl-NL')}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
                
                {/* Bemanningsleden die naar huis gaan */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-blue-700 mb-2">← Naar huis</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.values(crewDatabase)
                      .filter((crew: any) => crew.shipId === selectedShip)
                      .filter((crew: any) => selectedDate && isRotationDay(crew, selectedDate))
                      .filter((crew: any) => crew.status === "aan-boord") // Alleen die nu aan boord zijn
                      .map((crew: any) => {
                        // Bereken rotatie periode
                        const regime = crew.regime
                        let daysOn = 0, daysOff = 0
                        
                        switch (regime) {
                          case "1/1":
                            daysOn = 7
                            daysOff = 7
                            break
                          case "2/2":
                            daysOn = 14
                            daysOff = 14
                            break
                          case "3/3":
                            daysOn = 21
                            daysOff = 21
                            break
                        }
                        
                        const rotationStart = selectedDate!
                        const homeStart = new Date(selectedDate!)
                        const homeEnd = new Date(homeStart)
                        homeEnd.setDate(homeEnd.getDate() + daysOff)
                        
                        return (
                          <div key={crew.id} className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-center space-x-3 mb-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                  {crew.firstName[0]}{crew.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="text-sm font-medium">{crew.firstName} {crew.lastName}</div>
                                <div className="text-xs text-gray-600">{crew.position} • {crew.regime}</div>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800" variant="outline">
                                ← Naar huis
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Aflos datum:</span>
                                <span className="font-medium">{rotationStart.toLocaleDateString('nl-NL')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Thuis tot:</span>
                                <span className="font-medium">{homeEnd.toLocaleDateString('nl-NL')}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
                
                                {Object.values(crewDatabase)
                  .filter((crew: any) => crew.shipId === selectedShip && crew.status !== "uit-dienst")
                  .filter((crew: any) => selectedDate && !isRotationDay(crew, selectedDate)).length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-gray-700 mb-2">Overige bemanningsleden</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.values(crewDatabase)
                      .filter((crew: any) => crew.shipId === selectedShip && crew.status !== "uit-dienst")
                      .filter((crew: any) => selectedDate && !isRotationDay(crew, selectedDate))
                      .map((crew: any) => (
                          <div key={crew.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {crew.firstName[0]}{crew.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{crew.firstName} {crew.lastName}</div>
                              <div className="text-xs text-gray-600">{crew.position} • {crew.regime}</div>
                            </div>
                            <Badge 
                              className={crew.status === "aan-boord" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}
                              variant="outline"
                            >
                              {crew.status === "aan-boord" ? "Aan boord" : "Thuis"}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  )
} 