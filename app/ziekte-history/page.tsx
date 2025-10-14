"use client"

import Link from 'next/link'
import { UserX } from 'lucide-react'
import { MobileHeaderNav } from '@/components/ui/mobile-header-nav'
import { BackButton } from '@/components/ui/back-button'
import { DashboardButton } from '@/components/ui/dashboard-button'
import { StandBackDaysOverview } from '@/components/sick-leave/stand-back-days-overview'
import { useSupabaseData } from '@/hooks/use-supabase-data'

export default function SickLeaveHistoryPage() {
  const { loading } = useSupabaseData()

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <MobileHeaderNav />
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackButton href="/" />
          <div>
            <h1 className="text-2xl font-bold">Terug Te Staan Dagen</h1>
            <p className="text-sm text-gray-600">Overzicht van openstaande terug te staan dagen na ziekte</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/ziekte" className="bg-blue-600 text-white text-sm py-2 px-4 rounded-lg hover:bg-blue-700 shadow flex items-center gap-2">
            <UserX className="w-4 h-4" />
            Ziekte Overzicht
          </Link>
        </div>
      </div>

      {/* Stand Back Days Overview - direct van Supabase */}
      <StandBackDaysOverview />
    </div>
  )
}
