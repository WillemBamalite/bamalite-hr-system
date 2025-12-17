"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Ship, Users, CheckCircle, Clock, UserX, Cake, AlertTriangle } from "lucide-react"
import { ShipOverview } from "@/components/ship-overview"
import { CrewQuickActions } from "@/components/crew/crew-quick-actions"
import { DashboardStats } from "@/components/dashboard-stats"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useLanguage } from "@/contexts/LanguageContext"
import { useState, useEffect, useMemo } from "react"
import { format, isToday } from "date-fns"

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  
  // Gebruik Supabase data
  const { ships, crew, sickLeave, loading, error } = useSupabaseData()

  // Check voor proeftijd aflopend (dag 70 = nog 20 dagen)
  const probationEnding = useMemo(() => {
    if (!crew || crew.length === 0) return []
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return crew.filter((member: any) => {
      if (member.is_dummy || member.is_aflosser || !member.in_dienst_vanaf) return false
      
      const startDate = new Date(member.in_dienst_vanaf)
      startDate.setHours(0, 0, 0, 0)
      
      const diffTime = today.getTime() - startDate.getTime()
      const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      // Dag 70 = nog 20 dagen tot einde proeftijd
      return daysSinceStart === 70
    }).map((member: any) => ({
      ...member,
      daysRemaining: 20
    }))
  }, [crew])

  // Check voor verjaardagen
  const birthdaysToday = useMemo(() => {
    if (!crew || crew.length === 0) return []
    
    const today = new Date()
    const todayMonth = today.getMonth() + 1 // JavaScript months are 0-based
    const todayDay = today.getDate()
    
    return crew.filter((member: any) => {
      // Dummy's hebben geen verjaardag
      if (member.is_dummy === true) return false
      if (!member.birth_date) return false
      
      try {
        // Parse birth date (kan verschillende formaten hebben)
        const birthDate = new Date(member.birth_date)
        const birthMonth = birthDate.getMonth() + 1
        const birthDay = birthDate.getDate()
        
        // Check of maand en dag overeenkomen
        return birthMonth === todayMonth && birthDay === todayDay
      } catch {
        return false
      }
    })
  }, [crew])

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto py-8">
          <div className="text-center py-8 text-gray-500">{t('loading')}...</div>
        </main>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto py-8">
          <div className="text-center py-8 text-gray-500">{t('loading')} data...</div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto py-8">
          <div className="text-center py-8 text-red-500">{t('error')}: {error}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full py-8 px-4">
        {/* Proeftijd melding */}
        {probationEnding.length > 0 && (
          <Alert className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-base font-medium">
              ⚠️ Let op! De proefperiode van {probationEnding.map((member: any, index: number) => (
                <span key={member.id}>
                  <strong>{member.first_name} {member.last_name}</strong>
                  {index < probationEnding.length - 1 && ", "}
                  {index === probationEnding.length - 2 && " en "}
                </span>
              ))} verloopt over 20 dagen.
            </AlertDescription>
          </Alert>
        )}

        {/* Verjaardagsmelding */}
        {birthdaysToday.length > 0 && (
          <Alert className="mb-6 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
            <Cake className="h-5 w-5 text-pink-600" />
            <AlertDescription className="text-base font-medium">
              🎉 {birthdaysToday.map((member: any, index: number) => (
                <span key={member.id}>
                  <strong>{member.first_name} {member.last_name}</strong>
                  {index < birthdaysToday.length - 1 && ", "}
                  {index === birthdaysToday.length - 2 && " en "}
                </span>
              ))} {birthdaysToday.length === 1 ? "is" : "zijn"} vandaag jarig! 🎂
            </AlertDescription>
          </Alert>
        )}
        
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
