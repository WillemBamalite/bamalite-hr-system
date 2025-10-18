"use client"

import Link from 'next/link'
import { UserX } from 'lucide-react'
import { MobileHeaderNav } from '@/components/ui/mobile-header-nav'
import { BackButton } from '@/components/ui/back-button'
import { DashboardButton } from '@/components/ui/dashboard-button'
import { StandBackManagement } from '@/components/sick-leave/stand-back-management'
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
      <div className="mb-6">
        <BackButton href="/" />
      </div>

              {/* Stand Back Management - werkt met Supabase */}
              <StandBackManagement />
    </div>
  )
}
