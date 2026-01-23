"use client"

import { Suspense, useState, use, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { CrewMemberHeader } from "@/components/crew/crew-member-header"
import { CrewMemberProfile } from "@/components/crew/crew-member-profile"
import { CrewMemberNotes } from "@/components/crew/crew-member-notes"
import { CrewMemberStatusChanges } from "@/components/crew/crew-member-status-changes"
import { CrewMemberShipHistory } from "@/components/crew/crew-member-ship-history"
import { CrewMemberPrint } from "@/components/crew/crew-member-print"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { BackButton } from "@/components/ui/back-button"

interface Props {
  params: Promise<{
    id: string
  }>
}

function BemanningslidContent({ params }: Props) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoEdit, setAutoEdit] = useState(false);

  // Check if we should auto-open edit mode
  useEffect(() => {
    const shouldEdit = searchParams.get('edit') === 'true';
    const isHired = searchParams.get('hired') === 'true';
    
    if (shouldEdit && isHired) {
      setAutoEdit(true);
    }
  }, [searchParams]);

  const handleProfileUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  const printLang = (searchParams.get('lang') as 'nl' | 'de') || 'nl'

  return (
    <div className="min-h-screen bg-background">
      {/* Print component - alleen zichtbaar bij printen */}
      <Suspense fallback={null}>
        <CrewMemberPrint crewMemberId={resolvedParams.id} language={printLang} />
      </Suspense>
      
      <Suspense fallback={<div>Laden...</div>}>
        <CrewMemberHeader crewMemberId={resolvedParams.id} />
      </Suspense>
      <MobileHeaderNav />

      <div className="w-full px-2 md:px-8 py-8">
        <main className="w-full px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hoofdprofiel */}
            <div className="lg:col-span-2 space-y-6">
              <Suspense fallback={<div>Profiel laden...</div>}>
                <CrewMemberProfile 
                  key={refreshKey}
                  crewMemberId={resolvedParams.id} 
                  onProfileUpdate={handleProfileUpdate}
                  autoEdit={autoEdit}
                />
              </Suspense>
              <CrewMemberNotes crewMemberId={resolvedParams.id} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <CrewMemberStatusChanges crewMemberId={resolvedParams.id} />
              <CrewMemberShipHistory crewMemberId={resolvedParams.id} />
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
              <Link href="/ziekte" className="bg-red-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-red-700 shadow">
                🏥 Ziekte
              </Link>
              <Link href="/bemanning/nieuw" className="bg-indigo-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-indigo-700 shadow">
                ✏️ Nieuw Lid
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function BemanningslidPage({ params }: Props) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Laden...</div>
      </div>
    }>
      <BemanningslidContent params={params} />
    </Suspense>
  )
}
