"use client"

import { useState, useEffect } from "react"
import { differenceInDays, isBefore, addMonths, addYears } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ship, Users, AlertTriangle, FileText, Cloud, ListTodo } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useLanguage } from "@/contexts/LanguageContext"
import Link from "next/link"

export function DashboardStats() {
  const { crew, ships, sickLeave, loans, tasks, trips } = useSupabaseData()
  const { t } = useLanguage()
  
  // Count open tasks from Supabase
  const tasksCount = tasks.filter((t: any) => !t.completed).length
  
  // Bereken stats uit Supabase data
  const aflossers = crew.filter((c) => 
    c.position === "Aflosser" || c.position === "aflosser" || c.is_aflosser === true
  )
  
  const activeCrew = crew.filter((c) => c.status !== 'uit-dienst')
  
  const stats = {
    // Totaal bemanningsleden: alleen actieve vaste bemanning (geen aflossers, geen uit-dienst, geen dummy's)
    totalCrew: activeCrew.filter((c) => 
      c.position !== 'Aflosser' && 
      c.position !== 'aflosser' && 
      c.is_aflosser !== true &&
      c.status !== 'uit-dienst' &&
      !c.is_dummy
    ).length,
    reizenStats: {
      gepland: trips.filter((trip: any) => trip.status === 'gepland').length,
      ingedeeld: trips.filter((trip: any) => trip.status === 'ingedeeld').length,
      actief: trips.filter((trip: any) => trip.status === 'actief').length
    },
    ziekenStats: (() => {
      // Filter actieve ziekmeldingen (inclusief wacht-op-briefje)
      const activeSickLeaves = sickLeave.filter((s: any) => {
        const crewMember = crew.find((c) => c.id === s.crew_member_id)
        return (s.status === "actief" || s.status === "wacht-op-briefje") && crewMember && crewMember.status !== 'uit-dienst'
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // 1. Verlopen briefje: geen briefje of verlopen
      const verlopenBriefje = activeSickLeaves.filter((s: any) => {
        // Status "wacht-op-briefje" gaat NIET naar deze categorie
        if (s.status === "wacht-op-briefje") return false
        
        // Geen briefje
        if (!s.certificate_valid_until) return true
        
        // Verlopen briefje
        const validUntil = new Date(s.certificate_valid_until)
        validUntil.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry < 0
      }).length

      // 2. Bijna verlopen: wacht op briefje of verloopt binnen 3 dagen
      const bijnaVerlopen = activeSickLeaves.filter((s: any) => {
        // Wacht op briefje status (altijd in deze categorie)
        if (s.status === "wacht-op-briefje") return true
        
        // Bijna verlopen briefjes (verloopt over 3 dagen of minder, maar nog niet verlopen)
        if (!s.certificate_valid_until) return false
        
        const validUntil = new Date(s.certificate_valid_until)
        validUntil.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 3
      }).length

      // 3. Geldig briefje: geldig voor meer dan 3 dagen
      const geldigBriefje = activeSickLeaves.filter((s: any) => {
        // Moet status "actief" zijn
        if (s.status !== "actief") return false
        
        // Moet een geldig briefje hebben
        if (!s.certificate_valid_until) return false
        
        const validUntil = new Date(s.certificate_valid_until)
        validUntil.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry > 3
      }).length

      return { verlopenBriefje, bijnaVerlopen, geldigBriefje }
    })(),
    aanBoord: activeCrew.filter((c) => 
      c.status === "aan-boord" && 
      c.position !== 'Aflosser' && 
      c.position !== 'aflosser' && 
      c.is_aflosser !== true &&
      c.status !== 'uit-dienst' &&
      !c.is_dummy
    ).length,
    thuis: activeCrew.filter((c) => 
      c.status === "thuis" && 
      c.position !== 'Aflosser' && 
      c.position !== 'aflosser' && 
      c.is_aflosser !== true &&
      c.status !== 'uit-dienst' &&
      !c.is_dummy
    ).length,
    actieveZiekmeldingen: sickLeave.filter((s) => {
      const crewMember = crew.find((c) => c.id === s.crew_member_id)
      return s.status === "actief" && crewMember && crewMember.status !== 'uit-dienst'
    }).length,
    ziekmeldingenMetBriefje: sickLeave.filter((s) => {
      const crewMember = crew.find((c) => c.id === s.crew_member_id)
      return s.status === "wacht-op-briefje" && crewMember && crewMember.status !== 'uit-dienst'
    }).length,
    nieuwPersoneelStats: (() => {
      // Helper functie om checklist status te checken
      const isChecklistComplete = (member: any) => {
        const contractSigned = member.arbeidsovereenkomst === true;
        const luxembourgRegistered = member.ingeschreven_luxembourg === true;
        const insured = member.verzekerd === true;
        return contractSigned && luxembourgRegistered && insured;
      };
      
      // Helper functie om te checken of iemand een schip heeft
      const hasShip = (member: any) => {
        return member.ship_id && 
               member.ship_id !== 'none' && 
               member.ship_id !== '' && 
               member.ship_id !== null;
      };
      
      // Filter bemanningsleden zonder schip (exclude aflossers, uit dienst en dummy's)
      // Dit komt overeen met unassignedCrew in de pagina
      const unassignedCrew = activeCrew.filter((member: any) => 
        member.status === "nog-in-te-delen" && 
        !member.is_aflosser &&
        !member.is_dummy &&
        member.status !== 'uit-dienst'
      );
      
      // 1. Nog Te Benaderen: kandidaten die nog niet aangenomen zijn
      const nogTeBenaderen = unassignedCrew.filter((m: any) => 
        (!m.sub_status || m.sub_status === "nog-te-benaderen") &&
        m.status !== 'uit-dienst' &&
        m.recruitment_status !== "aangenomen"
      );
      
      // 2. Nog Af Te Ronden: aangenomen mensen MET schip maar MET incomplete checklist
      const nogAfTeRonden = activeCrew.filter((member: any) => {
        if (member.is_aflosser || member.status === 'uit-dienst' || member.is_dummy) {
          return false;
        }
        // Moet aangenomen zijn
        if (member.recruitment_status !== "aangenomen") {
          return false;
        }
        // Moet een schip hebben
        if (!hasShip(member)) {
          return false;
        }
        // Checklist moet incompleet zijn
        return !isChecklistComplete(member);
      });
      
      // 3. Nog In Te Delen: aangenomen mensen ZONDER schip (ongeacht checklist status)
      const nogInTeDelen = activeCrew.filter((member: any) => {
        if (member.is_aflosser || member.status === 'uit-dienst' || member.is_dummy) {
          return false;
        }
        // Moet aangenomen zijn
        if (member.recruitment_status !== 'aangenomen') {
          return false;
        }
        // Moet GEEN schip hebben
        return !hasShip(member);
      });
      
      return {
        nogTeBenaderen: nogTeBenaderen.length,
        nogInTeDelen: nogInTeDelen.length,
        nogAfTeRonden: nogAfTeRonden.length
      };
    })(),
    oudMedewerkers: crew.filter((c) => c.status === 'uit-dienst').length,
    openLeningen: (loans || []).filter((l: any) => l.status === 'open').length,
    studentenStats: {
      BBL: crew.filter((c: any) => c.is_student && c.status !== 'uit-dienst' && c.education_type === 'BBL').length,
      BOL: crew.filter((c: any) => c.is_student && c.status !== 'uit-dienst' && c.education_type === 'BOL').length
    },
    medischeKeuringen: (() => {
      // Zelfde logica als pagina Medische Keuringen: som van Verlopen + Binnenkort (3 mnd)
      const activeCrewForMedical = activeCrew.filter((c: any) => 
        c.status !== 'uit-dienst' &&
        c.position !== 'Aflosser' && 
        c.position !== 'aflosser' && 
        c.is_aflosser !== true &&
        !(c.is_student && c.education_type === 'BOL')
      )

      let overdue = 0
      let dueSoon = 0

      activeCrewForMedical.forEach((member: any) => {
        const isNewMember = !member.laatste_keuring_datum && !!member.proeftijd_datum

        if (isNewMember) {
          const proeftijdStart = new Date(member.proeftijd_datum as string)
          const deadline = addYears(addMonths(proeftijdStart, 3), 1)
          const diffDays = differenceInDays(deadline, new Date())
          if (isBefore(deadline, new Date())) {
            overdue++
          } else if (diffDays <= 90 && diffDays >= 0) {
            dueSoon++
          }
          return
        }

        // Oude medewerkers zonder keuring/proeftijd: niet meetellen
        if (!member.laatste_keuring_datum && !member.proeftijd_datum) {
          return
        }

        if (member.laatste_keuring_datum) {
          const last = new Date(member.laatste_keuring_datum)
          const years = typeof member.fit_verklaard_jaren === 'number' && member.fit_verklaard_jaren
            ? member.fit_verklaard_jaren
            : (member.fit_verklaard === false ? 1 : 3)
          const next = addYears(last, years)
          const diffDays = differenceInDays(next, new Date())
          if (isBefore(next, new Date())) {
            overdue++
          } else if (diffDays <= 90 && diffDays >= 0) {
            dueSoon++
          }
        }
      })

      return overdue + dueSoon
    })()
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
        <Link href="/bemanning/overzicht" className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center hover:bg-blue-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-blue-800">{stats.totalCrew}</div>
          <div className='text-xs text-blue-700 mt-1'>{t('totalCrewMembers')}</div>
        </Link>
        <Link href="/bemanning/aflossers" className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition cursor-pointer">
          <div className="text-sm font-semibold text-green-900 mb-2 text-center">Nog openstaande reizen</div>
          <div className="text-xs text-green-700 space-y-1">
            <div className="flex justify-between">
              <span>geplande reizen:</span>
              <span className="font-semibold text-green-900">{stats.reizenStats.gepland}</span>
            </div>
            <div className="flex justify-between">
              <span>ingedeelde reizen:</span>
              <span className="font-semibold text-green-900">{stats.reizenStats.ingedeeld}</span>
            </div>
            <div className="flex justify-between">
              <span>actieve reizen:</span>
              <span className="font-semibold text-green-900">{stats.reizenStats.actief}</span>
            </div>
          </div>
        </Link>
        <Link href="/bemanning/studenten" className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition cursor-pointer">
          <div className="text-sm font-semibold text-purple-900 mb-2 text-center">{t('students')}</div>
          <div className="text-xs text-purple-700 space-y-1">
            <div className="flex justify-between">
              <span>BBL:</span>
              <span className="font-semibold text-purple-900">{stats.studentenStats.BBL}</span>
            </div>
            <div className="flex justify-between">
              <span>BOL:</span>
              <span className="font-semibold text-purple-900">{stats.studentenStats.BOL}</span>
            </div>
          </div>
        </Link>
        <Link href="/ziekte" className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition cursor-pointer">
          <div className="text-sm font-semibold text-red-900 mb-2 text-center">{t('sickMembers')}</div>
          <div className="text-xs text-red-700 space-y-1">
            <div className="flex justify-between">
              <span>verlopen briefje:</span>
              <span className="font-semibold text-red-900">{stats.ziekenStats.verlopenBriefje}</span>
            </div>
            <div className="flex justify-between">
              <span>bijna verlopen:</span>
              <span className="font-semibold text-red-900">{stats.ziekenStats.bijnaVerlopen}</span>
            </div>
            <div className="flex justify-between">
              <span>geldig briefje:</span>
              <span className="font-semibold text-red-900">{stats.ziekenStats.geldigBriefje}</span>
            </div>
          </div>
        </Link>
        <Link href="/bemanning/nog-in-te-delen" className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition cursor-pointer">
          <div className="text-sm font-semibold text-gray-900 mb-2 text-center">{t('newPersonnelMembers')}</div>
          <div className="text-xs text-gray-700 space-y-1">
            <div className="flex justify-between">
              <span>nog te benaderen:</span>
              <span className="font-semibold text-gray-900">{stats.nieuwPersoneelStats.nogTeBenaderen}</span>
            </div>
            <div className="flex justify-between">
              <span>nog in te delen:</span>
              <span className="font-semibold text-gray-900">{stats.nieuwPersoneelStats.nogInTeDelen}</span>
            </div>
            <div className="flex justify-between">
              <span>nog af te ronden:</span>
              <span className="font-semibold text-gray-900">{stats.nieuwPersoneelStats.nogAfTeRonden}</span>
            </div>
          </div>
        </Link>
        <Link href="/bemanning/medische-keuringen" className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center hover:bg-teal-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-teal-800">{stats.medischeKeuringen}</div>
          <div className='text-xs text-teal-700 mt-1 flex items-center justify-center gap-1'>
            <Cloud className="w-3 h-3" />
            <span>Medische Keuringen</span>
          </div>
        </Link>
        <Link href="/taken" className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center hover:bg-amber-100 transition cursor-pointer">
          <div className="text-2xl font-bold text-amber-800">{tasksCount}</div>
          <div className='text-xs text-amber-700 mt-1 flex items-center justify-center gap-1'>
            <ListTodo className="w-3 h-3" />
            <span>Taken</span>
          </div>
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

