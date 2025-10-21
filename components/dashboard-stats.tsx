"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ship, Users, AlertTriangle, FileText } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useLanguage } from "@/contexts/LanguageContext"
import Link from "next/link"

export function DashboardStats() {
  const { crew, ships, sickLeave, loans } = useSupabaseData()
  const { t } = useLanguage()
  
  // Bereken stats uit Supabase data
  const aflossers = crew.filter((c) => 
    c.position === "Aflosser" || c.position === "aflosser"
  )
  
  const activeCrew = crew.filter((c) => c.status !== 'uit-dienst')
  const stats = {
    totalCrew: activeCrew.filter((c) => c.position !== 'Aflosser' && c.position !== 'aflosser').length,
    aflossers: aflossers.filter((c) => c.status !== 'uit-dienst').length,
    zieken: sickLeave.filter((s: any) => {
      const crewMember = crew.find((c) => c.id === s.crew_member_id)
      return (s.status === "actief" || s.status === "wacht-op-briefje") && crewMember && crewMember.status !== 'uit-dienst'
    }).length,
    aanBoord: activeCrew.filter((c) => c.status === "aan-boord").length,
    thuis: activeCrew.filter((c) => c.status === "thuis").length,
    actieveZiekmeldingen: sickLeave.filter((s) => {
      const crewMember = crew.find((c) => c.id === s.crew_member_id)
      return s.status === "actief" && crewMember && crewMember.status !== 'uit-dienst'
    }).length,
    ziekmeldingenMetBriefje: sickLeave.filter((s) => {
      const crewMember = crew.find((c) => c.id === s.crew_member_id)
      return s.status === "wacht-op-briefje" && crewMember && crewMember.status !== 'uit-dienst'
    }).length,
    nogInTeDelen: (() => {
      // Gebruik dezelfde logica als de Nieuw Personeel pagina
      const unassignedCrew = activeCrew.filter((member: any) => 
        member.status === "nog-in-te-delen" && 
        !member.is_aflosser
      );
      
      const allCrewWithIncompleteChecklist = activeCrew.filter((member: any) => {
        if (member.is_aflosser) {
          return false;
        }
        
        // Moet aangenomen zijn
        if (member.recruitment_status !== "aangenomen") {
          return false;
        }
        
        // Check checklist - gebruik directe velden (meer betrouwbaar)
        const contractSigned = member.arbeidsovereenkomst === true;
        const luxembourgRegistered = member.ingeschreven_luxembourg === true;
        const insured = member.verzekerd === true;
        
        const isChecklistComplete = contractSigned && luxembourgRegistered && insured;
        const hasShip = member.ship_id && member.ship_id !== 'none' && member.ship_id !== '';
        
        // Als checklist compleet is EN heeft een schip toegewezen, dan niet tellen
        if (isChecklistComplete && hasShip) {
          return false;
        }
        
        // Anders tellen als checklist incompleet is
        return !isChecklistComplete;
      });
      
      const nogTeBenaderen = unassignedCrew.filter((m: any) => 
        !m.sub_status || m.sub_status === "nog-te-benaderen"
      );
      
      return nogTeBenaderen.length + allCrewWithIncompleteChecklist.length;
    })(),
    oudMedewerkers: crew.filter((c) => c.status === 'uit-dienst').length,
    openLeningen: (loans || []).filter((l: any) => l.status === 'open').length,
    studenten: crew.filter((c) => c.is_student && c.status !== 'uit-dienst').length
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <Link href="/bemanning/overzicht" className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center hover:bg-blue-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-blue-800">{stats.totalCrew}</div>
          <div className='text-xs text-blue-700 mt-1'>{t('totalCrewMembers')}</div>
        </Link>
        <Link href="/bemanning/aflossers" className="bg-green-50 border border-green-200 rounded-lg p-4 text-center hover:bg-green-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-green-800">{stats.aflossers}</div>
          <div className='text-xs text-green-700 mt-1'>{t('reliefCrewMembers')}</div>
        </Link>
        <Link href="/bemanning/studenten" className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center hover:bg-purple-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-purple-800">{stats.studenten}</div>
          <div className='text-xs text-purple-700 mt-1'>{t('students')}</div>
        </Link>
        <Link href="/ziekte" className="bg-red-50 border border-red-200 rounded-lg p-4 text-center hover:bg-red-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-red-800">{stats.zieken}</div>
          <div className='text-xs text-red-700 mt-1'>{t('sickMembers')}</div>
        </Link>
        <Link href="/bemanning/nog-in-te-delen" className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-gray-800">{stats.nogInTeDelen}</div>
          <div className='text-xs text-gray-700 mt-1'>{t('newPersonnelMembers')}</div>
        </Link>
        <Link href="/bemanning/leningen" className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center hover:bg-yellow-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-yellow-800">{stats.openLeningen}</div>
          <div className='text-xs text-yellow-700 mt-1'>{t('outstandingLoans')}</div>
        </Link>
        <Link href="/bemanning/oude-bemanningsleden" className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center hover:bg-slate-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-slate-800">{stats.oudMedewerkers}</div>
          <div className='text-xs text-slate-700 mt-1'>{t('oldEmployees')}</div>
        </Link>
      </div>
    </div>
  )
}
