"use client"

import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { BackButton } from "@/components/ui/back-button"
import { StandBackManagement } from "@/components/sick-leave/stand-back-management"

export default function TerugTeStaanPage() {
  return (
    <div className="max-w-6xl mx-auto py-6 px-2 md:px-4">
      <MobileHeaderNav />
      <BackButton />
      <StandBackManagement />
    </div>
  )
}
