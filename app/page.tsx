"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Ship, Users, CheckCircle, Clock, UserX } from "lucide-react"
import { ShipOverview } from "@/components/ship-overview"
import { CrewQuickActions } from "@/components/crew/crew-quick-actions"
import { DashboardStats } from "@/components/dashboard-stats"
import { DashboardHeader } from "@/components/dashboard-header"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useState, useEffect } from "react"

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  // State voor universele zoekbalk
  const [search, setSearch] = useState("")
  
  // Gebruik Supabase data
  const { ships, crew, sickLeave, loading, error } = useSupabaseData()

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto py-8">
          <div className="text-center py-8 text-gray-500">Laden...</div>
        </main>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto py-8">
          <div className="text-center py-8 text-gray-500">Data laden...</div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto py-8">
          <div className="text-center py-8 text-red-500">Fout: {error}</div>
        </main>
      </div>
    );
  }

  // Zoekfunctie
  const filteredCrew = crew.filter((member) => {
    const searchTerm = search.toLowerCase()
    return (
      member.first_name.toLowerCase().includes(searchTerm) ||
      member.last_name.toLowerCase().includes(searchTerm) ||
      member.position.toLowerCase().includes(searchTerm) ||
      member.nationality.toLowerCase().includes(searchTerm)
    )
  })

  // Zoek in schepen
  const filteredShips = ships.filter((ship) => {
    const searchTerm = search.toLowerCase()
    return ship.name.toLowerCase().includes(searchTerm)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick Actions - Links */}
          <div className="lg:col-span-1">
            <CrewQuickActions />
          </div>

          {/* Main Content - Rechts */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 gap-6">
              {/* Header */}
              <DashboardHeader search={search} setSearch={setSearch} />

              {/* Stats */}
              <DashboardStats />

              {/* Ship Overview */}
              <ShipOverview />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
