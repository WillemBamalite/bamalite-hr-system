"use client";

import { Suspense } from "react"
import { DashboardStats } from "@/components/dashboard-stats"
import { ShipOverview } from "@/components/ship-overview"
import { RecentAlerts } from "@/components/recent-alerts"
import { AISearchBar } from "@/components/ai-search-bar"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CardContent, Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { crewDatabase, shipDatabase, sickLeaveDatabase, sickLeaveHistoryDatabase, documentDatabase } from "@/data/crew-database"
import { Search, Users, Ship, FileText, UserX, Calendar, MapPin, Phone, Mail, Printer } from "lucide-react"
import { DataBackup } from "@/components/data-backup"
import { useCrewData } from "@/hooks/use-crew-data"

export default function Dashboard() {
  // State voor universele zoekbalk
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)



  // Gebruik de nieuwe hook voor gecombineerde data
  const { crewDatabase: allCrewData, documentDatabase: allDocsData } = useCrewData()

  // Zoekfunctie
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const results: any[] = []
    const searchLower = query.toLowerCase()

    // Zoek in bemanning
    Object.values(allCrewData).forEach((crew: any) => {
      if (crew.id === "ziek") return // Skip placeholder
      
      const fullName = `${crew.firstName} ${crew.lastName}`.toLowerCase()
      const position = crew.position?.toLowerCase() || ""
      const nationality = crew.nationality?.toLowerCase() || ""
      const ship = crew.shipId || ""
      
      if (fullName.includes(searchLower) || 
          position.includes(searchLower) || 
          nationality.includes(searchLower) ||
          ship.includes(searchLower)) {
        results.push({
          type: "crew",
          data: crew,
          relevance: fullName.includes(searchLower) ? 3 : 
                   position.includes(searchLower) ? 2 : 1
        })
      }
    })

    // Zoek in schepen
    Object.values(shipDatabase).forEach((ship: any) => {
      const name = ship.name?.toLowerCase() || ""
      const route = ship.route?.toLowerCase() || ""
      const location = ship.location?.toLowerCase() || ""
      
      if (name.includes(searchLower) || 
          route.includes(searchLower) || 
          location.includes(searchLower)) {
        results.push({
          type: "ship",
          data: ship,
          relevance: name.includes(searchLower) ? 3 : 1
        })
      }
    })

    // Zoek in ziekmeldingen
    Object.values(sickLeaveDatabase).forEach((sick: any) => {
      const crewMember = (allCrewData as Record<string, any>)[sick.crewMemberId]
      if (crewMember) {
        const fullName = `${crewMember.firstName} ${crewMember.lastName}`.toLowerCase()
        const description = sick.description?.toLowerCase() || ""
        
        if (fullName.includes(searchLower) || description.includes(searchLower)) {
          results.push({
            type: "sick",
            data: { ...sick, crewMember },
            relevance: fullName.includes(searchLower) ? 3 : 1
          })
        }
      }
    })

    // Zoek in documenten
    Object.values(allDocsData).forEach((doc: any) => {
      const name = doc.name?.toLowerCase() || ""
      const type = doc.type?.toLowerCase() || ""
      const crewMember = (allCrewData as Record<string, any>)[doc.crewMemberId]
      
      if (crewMember) {
        const fullName = `${crewMember.firstName} ${crewMember.lastName}`.toLowerCase()
        
        if (name.includes(searchLower) || 
            type.includes(searchLower) || 
            fullName.includes(searchLower)) {
          results.push({
            type: "document",
            data: { ...doc, crewMember },
            relevance: fullName.includes(searchLower) ? 3 : 
                     name.includes(searchLower) ? 2 : 1
          })
        }
      }
    })

    // Sorteer op relevantie
    results.sort((a, b) => b.relevance - a.relevance)
    setSearchResults(results.slice(0, 10)) // Max 10 resultaten
    setShowResults(true)
  }

  const handleSearch = () => {
    performSearch(search)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch(search)
    }
  }

  // Auto-suggest tijdens typen
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)
    
    // Toon suggesties tijdens typen
    if (value.trim().length >= 2) {
      performSearch(value)
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }

  const handleInputFocus = () => {
    if (search.trim().length >= 2) {
      setShowResults(true)
    }
  }

  const handleInputBlur = () => {
    // Wacht even voordat we de resultaten verbergen (voor klikken op resultaten)
    setTimeout(() => {
      setShowResults(false)
    }, 200)
  }

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱", CZ: "🇨🇿", SLK: "🇸🇰", EG: "🇪🇬", PO: "🇵🇱", 
      SERV: "🇷🇸", HUN: "🇭🇺", BE: "🇧🇪", FR: "🇫🇷", DE: "🇩🇪", LUX: "🇱🇺"
    }
    return flags[nationality] || "🌍"
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case "crew": return <Users className="w-4 h-4" />
      case "ship": return <Ship className="w-4 h-4" />
      case "sick": return <UserX className="w-4 h-4" />
      case "document": return <FileText className="w-4 h-4" />
      default: return <Search className="w-4 h-4" />
    }
  }

  const getResultBadge = (type: string) => {
    switch (type) {
      case "crew": return "Bemanning"
      case "ship": return "Schip"
      case "sick": return "Ziek"
      case "document": return "Document"
      default: return "Overig"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Universele zoekbalk */}
        <div className="w-full max-w-md mx-auto mb-4 relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
            placeholder="Zoek in bemanning, aflossers, schepen, documenten..."
                className="w-full border rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button 
              variant="secondary" 
              onClick={handleSearch}
              className="px-4 py-2"
            >
              Zoek
            </Button>
            <Link href="/print">
              <Button 
                variant="outline"
                className="px-4 py-2"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </Link>
          </div>

          {/* Zoekresultaten */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <Link 
                  key={`${result.type}-${index}`} 
                  href={result.type === "crew" ? `/bemanning/${result.data.id}` :
                        result.type === "ship" ? `/bemanning/overzicht` :
                        result.type === "sick" ? `/ziekte` :
                        result.type === "document" ? `/bemanning/overzicht` : "/"}
                  onClick={() => {
                    setShowResults(false)
                    setSearch("") // Clear search after clicking
                  }}
                  className="block p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.type === "crew" && `${result.data.firstName} ${result.data.lastName}`}
                          {result.type === "ship" && result.data.name}
                          {result.type === "sick" && `${result.data.crewMember.firstName} ${result.data.crewMember.lastName}`}
                          {result.type === "document" && result.data.name}
                        </p>
                        {result.type === "crew" && (
                          <span className="text-lg">{getNationalityFlag(result.data.nationality)}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {getResultBadge(result.type)}
                        </Badge>
                        <p className="text-xs text-gray-500 truncate">
                          {result.type === "crew" && `${result.data.position} • ${result.data.shipId || "Niet toegewezen"}`}
                          {result.type === "ship" && `${result.data.route} • ${result.data.location}`}
                          {result.type === "sick" && `${result.data.description || "Ziekte"} • ${result.data.status}`}
                          {result.type === "document" && `${result.data.type} • ${result.data.crewMember?.firstName} ${result.data.crewMember?.lastName}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Geen resultaten */}
          {showResults && searchResults.length === 0 && search.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
              <p className="text-sm text-gray-500 text-center">Geen resultaten gevonden voor "{search}"</p>
            </div>
          )}
        </div>

        {/* Dashboard Statistieken */}
        <Suspense fallback={<div>Laden...</div>}>
          <DashboardStats />
        </Suspense>

        {/* Hoofdcontent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ShipOverview />
          </div>
          <div className="space-y-6">
            <RecentAlerts />
            <DataBackup />
          </div>
        </div>
      </main>
    </div>
  )
}
