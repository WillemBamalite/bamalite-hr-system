"use client"

import { ShipOverview } from "@/components/ship-overview"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"

export default function SchepenOverzichtPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full py-6 md:py-8 px-3 md:px-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Schepen Overzicht</h2>
            <p className="text-gray-600">Overzicht van alle schepen</p>
          </div>
          <DashboardButton />
        </div>

        <ShipOverview />
      </main>

      <MobileHeaderNav />
    </div>
  )
}

