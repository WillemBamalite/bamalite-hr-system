"use client"

import { Suspense, use } from "react"
import { CrewMemberHeader } from "@/components/crew/crew-member-header"
import { CrewMemberShipHistory } from "@/components/crew/crew-member-ship-history"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"

interface Props {
  params: Promise<{
    id: string
  }>
}

function GeschiedenisContent({ params }: Props) {
  const resolvedParams = use(params)

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="p-6">Laden...</div>}>
        <CrewMemberHeader crewMemberId={resolvedParams.id} />
      </Suspense>
      <MobileHeaderNav />
      <main className="w-full px-4 py-6 md:px-8">
        <div className="mx-auto max-w-3xl">
          <CrewMemberShipHistory crewMemberId={resolvedParams.id} />
        </div>
      </main>
    </div>
  )
}

export default function ScheepsgeschiedenisPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div>Laden...</div>
        </div>
      }
    >
      <GeschiedenisContent params={params} />
    </Suspense>
  )
}
