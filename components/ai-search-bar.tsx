"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Search, Sparkles, User, Ship, FileText, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCombinedShipDatabase } from "@/utils/ship-utils"
import { useLocalStorageData } from "@/hooks/use-localStorage-data"

export function AISearchBar() {
  const { crewDatabase, documentDatabase, sickLeaveDatabase } = useLocalStorageData()
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  // Haal localStorage data op
  const [localStorageCrew, setLocalStorageCrew] = useState<any>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedCrew = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
        setLocalStorageCrew(storedCrew)
      } catch (e) {
        console.error('Error parsing localStorage:', e)
      }
    }
  }, [])

  // Combineer alle databases
  const allCrewData = { ...crewDatabase, ...localStorageCrew }

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)

    // Simuleer AI-zoekopdracht met echte data
    setTimeout(() => {
      const searchResults = performSearch(query.toLowerCase())
      setResults(searchResults)
      setIsLoading(false)
    }, 1000)
  }

  const performSearch = (searchQuery: string) => {
    const results: any = {
      crew: [],
      ships: [],
      documents: [],
      sickLeave: [],
      summary: "",
    }

    // Zoek in bemanning
    Object.values(allCrewData).forEach((crew: any) => {
      const fullName = `${crew.firstName} ${crew.lastName}`.toLowerCase()
      if (
        fullName.includes(searchQuery) ||
        crew.position.toLowerCase().includes(searchQuery) ||
        crew.nationality.toLowerCase().includes(searchQuery) ||
        crew.status.toLowerCase().includes(searchQuery)
      ) {
        results.crew.push(crew)
      }
    })

    // Zoek in schepen
    Object.values(getCombinedShipDatabase()).forEach((ship: any) => {
      if (
        ship.name.toLowerCase().includes(searchQuery)
      ) {
        results.ships.push(ship)
      }
    })

    // Zoek in documenten
    Object.values(documentDatabase).forEach((doc: any) => {
      if (doc.name.toLowerCase().includes(searchQuery) || doc.type.toLowerCase().includes(searchQuery)) {
        const crew = (allCrewData as any)[doc.crewMemberId]
        results.documents.push({ ...doc, crewMember: crew })
      }
    })

    // Zoek in ziekmeldingen
    Object.values(sickLeaveDatabase).forEach((sick: any) => {
      const crew = (allCrewData as any)[sick.crewMemberId]
      if (crew) {
        const fullName = `${crew.firstName} ${crew.lastName}`.toLowerCase()
        if (
          fullName.includes(searchQuery) ||
          sick.description.toLowerCase().includes(searchQuery) ||
          searchQuery.includes("ziek")
        ) {
          results.sickLeave.push({ ...sick, crewMember: crew })
        }
      }
    })

    // Genereer AI-achtige samenvatting
    results.summary = generateAISummary(searchQuery, results)

    return results
  }

  const generateAISummary = (query: string, results: any) => {
    if (query.includes("ziek")) {
      return `Gevonden: ${results.sickLeave.length} actieve ziekmeldingen. ${results.crew.filter((c: any) => c.status === "ziek").length} bemanningsleden zijn momenteel ziek.`
    }

    if (query.includes("document")) {
      const expiredDocs = results.documents.filter((d: any) => !d.isValid).length
      return `Gevonden: ${results.documents.length} documenten. ${expiredDocs} documenten zijn verlopen en vereisen vernieuwing.`
    }

    if (results.crew.length > 0) {
      const crew = results.crew[0]
      const ship = crew.shipId ? getCombinedShipDatabase()[crew.shipId] : null
      return `${crew.firstName} ${crew.lastName} is ${crew.position} ${ship ? `op ${ship.name}` : "en is beschikbaar"}. Status: ${crew.status}.`
    }

    if (results.ships.length > 0) {
      const ship = results.ships[0]
      const crewCount = Object.values(crewDatabase).filter((c: any) => c.shipId === ship.id).length
              return `${ship.name} heeft ${crewCount}/${ship.maxCrew} bemanningsleden.`
    }

    return `Gevonden: ${results.crew.length} bemanningsleden, ${results.ships.length} schepen, ${results.documents.length} documenten.`
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const suggestions = [
    "Wie is er ziek?",
            "Planning MTS Bellona",
    "Verlopen documenten",
    "Frank Hennekam",
    "Beschikbare kapiteins",
    "Nederlandse bemanning",
  ]

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Vraag iets over bemanning, roosters, documenten... (bijv. 'Waar is Jan vandaag?')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 pr-4"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              onClick={() => setQuery(suggestion)}
              className="text-xs"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </Card>

      {results && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">AI Assistent</p>
              <p className="text-sm text-blue-800 mt-1">{results.summary}</p>
            </div>
          </div>

          {/* Bemanning resultaten */}
          {results.crew.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>Bemanning ({results.crew.length})</span>
              </h4>
              <div className="space-y-2">
                {results.crew.slice(0, 3).map((crew: any) => (
                  <div key={crew.id} className="bg-white rounded-lg p-2 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">
                          {crew.firstName} {crew.lastName}
                        </span>
                        <span className="text-sm text-gray-600 ml-2">({crew.position})</span>
                      </div>
                      <Badge
                        className={
                          crew.status === "aan-boord"
                            ? "bg-green-100 text-green-800"
                            : crew.status === "ziek"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                        }
                      >
                        {crew.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schepen resultaten */}
          {results.ships.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center space-x-1">
                <Ship className="w-4 h-4" />
                <span>Schepen ({results.ships.length})</span>
              </h4>
              <div className="space-y-2">
                {results.ships.slice(0, 2).map((ship: any) => (
                  <div key={ship.id} className="bg-white rounded-lg p-2 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{ship.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documenten resultaten */}
          {results.documents.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center space-x-1">
                <FileText className="w-4 h-4" />
                <span>Documenten ({results.documents.length})</span>
              </h4>
              <div className="space-y-2">
                {results.documents.slice(0, 2).map((doc: any) => (
                  <div key={doc.id} className="bg-white rounded-lg p-2 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{doc.name}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          ({doc.crewMember?.firstName} {doc.crewMember?.lastName})
                        </span>
                      </div>
                      <Badge className={doc.isValid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {doc.isValid ? "Geldig" : "Verlopen"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ziekte resultaten */}
          {results.sickLeave.length > 0 && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2 flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Ziekmeldingen ({results.sickLeave.length})</span>
              </h4>
              <div className="space-y-2">
                {results.sickLeave.map((sick: any) => (
                  <div key={sick.id} className="bg-white rounded-lg p-2 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">
                          {sick.crewMember.firstName} {sick.crewMember.lastName}
                        </span>
                        <span className="text-sm text-gray-600 ml-2">({sick.description})</span>
                      </div>
                      <Badge className="bg-red-100 text-red-800">
                        {sick.status === "actief" ? "Actief ziek" : sick.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
