"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ship, Users, AlertTriangle, FileText } from "lucide-react"
import { getCombinedShipDatabase } from "@/utils/ship-utils"
import { useLocalStorageData } from "@/hooks/use-localStorage-data"
import { isCrewMemberOutOfService } from "@/utils/out-of-service-storage"
// import { calculateCurrentStatus } from "@/utils/regime-calculator"
import Link from "next/link"

export function DashboardStats() {
  const { crewDatabase: allCrewData, forceRefresh } = useLocalStorageData()
  
  // Bereken stats direct uit allCrewData
  const crewMembers = Object.values(allCrewData)
  const aflossers = crewMembers.filter((c: any) => 
    !c.deleted && (
      c.isAflosser === true || 
      c.position === "Aflosser" ||
      c.function === "Aflosser"
    )
  )
  
  const stats = {
    totalCrew: crewMembers.filter((c: any) => !c.deleted).length,
    aflossers: aflossers.length,
    studenten: crewMembers.filter((c: any) => !c.deleted && c.isStudent).length,
    aanBoord: crewMembers.filter((c: any) => {
      if (c.deleted) return false
      if (c.status === "ziek") return false
      if (!c.regime) return c.status === "aan-boord"
      
      return c.status === "aan-boord"
    }).length,
    thuis: crewMembers.filter((c: any) => {
      if (c.deleted) return false
      if (c.status === "ziek") return false
      if (!c.regime) return c.status === "thuis"
      
      return c.status === "thuis"
    }).length,
    actieveZiekmeldingen: 0, // TODO: Bereken uit sickLeaveDatabase
    ziekmeldingenMetBriefje: 0, // TODO: Bereken uit sickLeaveDatabase
    nogInTeDelen: crewMembers.filter((c: any) => 
      !c.deleted && c.status === "nog-in-te-delen" && 
      c.status !== "uit-dienst" && 
      c.status !== "ziek"
    ).length
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Link href="/bemanning/overzicht" className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center hover:bg-blue-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-blue-800">{stats.totalCrew}</div>
          <div className="text-xs text-blue-700 mt-1">Totaal bemanningsleden</div>
        </Link>
        <Link href="/bemanning/aflossers" className="bg-green-50 border border-green-200 rounded-lg p-4 text-center hover:bg-green-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-green-800">{stats.aflossers}</div>
          <div className="text-xs text-green-700 mt-1">Aflossers</div>
        </Link>
        <Link href="/bemanning/studenten" className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center hover:bg-purple-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-purple-800">{stats.studenten}</div>
          <div className="text-xs text-purple-700 mt-1">Studenten</div>
        </Link>
        <Link href="/ziekte" className="bg-red-50 border border-red-200 rounded-lg p-4 text-center hover:bg-red-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-red-800">{stats.actieveZiekmeldingen}</div>
          <div className="text-xs text-red-700 mt-1">Ziek</div>
        </Link>
        <Link href="/bemanning/nog-in-te-delen" className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-gray-800">{stats.nogInTeDelen}</div>
          <div className="text-xs text-gray-700 mt-1">Nog in te delen</div>
        </Link>
      </div>
    </div>
  )
}
