"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Ship, Users, CheckCircle, Clock, UserX } from "lucide-react"
import { ShipOverview } from "@/components/ship-overview"
import { CrewQuickActions } from "@/components/crew/crew-quick-actions"
import { DashboardStats } from "@/components/dashboard-stats"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useState, useEffect } from "react"

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full py-8 px-4">
        {/* Single column flow: stats → quick actions → ships */}
        <div className="grid grid-cols-1 gap-6">
          {/* Stats */}
          <DashboardStats />

          {/* Snelle acties als knoppen direct onder de kaarten */}
          <CrewQuickActions />

          {/* Schepen overzicht */}
          <ShipOverview />
        </div>
      </main>
    </div>
  )
}
