"use client"

import { Suspense, useState, use } from "react"
import { CrewMemberHeader } from "@/components/crew/crew-member-header"
import { CrewMemberProfile } from "@/components/crew/crew-member-profile"
import { CrewMemberNotes } from "@/components/crew/crew-member-notes"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"

interface Props {
  params: Promise<{
    id: string
  }>
}

export default function BemanningslidPage({ params }: Props) {
  const resolvedParams = use(params);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProfileUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <CrewMemberHeader crewMemberId={resolvedParams.id} />
      <MobileHeaderNav />

      <div className="w-full px-2 md:px-8 py-8">
        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hoofdprofiel */}
            <div className="lg:col-span-2 space-y-6">
              <Suspense fallback={<div>Profiel laden...</div>}>
                <CrewMemberProfile 
                  key={refreshKey}
                  crewMemberId={resolvedParams.id} 
                  onProfileUpdate={handleProfileUpdate}
                />
              </Suspense>

            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <CrewMemberNotes crewMemberId={resolvedParams.id} />
            </div>


          </div>

          {/* Mobiele actieknoppen */}
          <div className="block md:hidden mt-8 space-y-4">
            <div className="text-lg font-semibold text-gray-800 mb-3">Lid acties</div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/bemanning/overzicht" className="bg-blue-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-blue-700 shadow">
                👥 Bemanning
              </Link>
              <Link href="/bemanning/aflossers" className="bg-green-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-green-700 shadow">
                🔄 Aflossers
              </Link>
              <Link href="/documenten" className="bg-orange-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-orange-700 shadow">
                📄 Documenten
              </Link>
              <button className="bg-indigo-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-indigo-700 shadow">
                ✏️ Bewerken
              </button>
              <button className="bg-teal-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-teal-700 shadow">
                📤 Document
              </button>
              <button className="bg-gray-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-gray-700 shadow">
                📊 Geschiedenis
              </button>
              <button className="bg-red-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-red-700 shadow">
                🏥 Ziekte
              </button>
              <button className="bg-gray-800 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-gray-900 shadow">
                🚪 Uit dienst
              </button>
            </div>
          </div>
        </main>
      </div>


    </div>
  )
}
