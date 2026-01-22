"use client"

import { useState, useEffect } from "react"
import { differenceInDays, isBefore, addMonths, addYears } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ship, Users, AlertTriangle, FileText, Cloud, ListTodo, Calendar, AlertCircle } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useShipVisits } from "@/hooks/use-ship-visits"
import { useLanguage } from "@/contexts/LanguageContext"
import Link from "next/link"

export function DashboardStats() {
  const { crew, ships, sickLeave, loans, tasks, trips, incidents } = useSupabaseData()
  const { getShipsNotVisitedInDays, visits } = useShipVisits()
  const { t } = useLanguage()
  
  // Count open tasks from Supabase
  const tasksCount = tasks.filter((t: any) => !t.completed).length
  
  // Count open incidents
  const openIncidentsCount = incidents.filter((i: any) => i.status === 'open' || i.status === 'in_behandeling').length
  
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
          const geldigheid = typeof member.fit_verklaard_jaren === 'number' && member.fit_verklaard_jaren !== null && member.fit_verklaard_jaren !== undefined
            ? member.fit_verklaard_jaren
            : (member.fit_verklaard === false ? 1 : 3)
          
          // Bereken volgende keuringsdatum (ondersteun zowel jaren als 0.5 voor 6 maanden)
          let next: Date
          if (geldigheid === 0.5) {
            next = addMonths(last, 6)
          } else {
            next = addYears(last, geldigheid)
          }
          
          const diffDays = differenceInDays(next, new Date())
          if (isBefore(next, new Date())) {
            overdue++
          } else if (diffDays <= 90 && diffDays >= 0) {
            dueSoon++
          }
        }
      })

      return overdue + dueSoon
    })(),
    scheepsbezoeken: (() => {
      // Return total number of visits
      return visits ? visits.length : 0
    })(),
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Mobiel: 4 tegels naast elkaar, Desktop: 6 tegels naast elkaar */}
      <div className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-4">
        {/* 1. Totaal bemanningsleden */}
        <div className="aspect-[3/1]">
          <Link href="/bemanning/overzicht" className="h-full flex flex-col items-center justify-center bg-blue-50 border border-blue-200 rounded-lg p-2 md:p-4 text-center hover:bg-blue-100 transition cursor-pointer">
            <div className="text-lg md:text-2xl font-bold text-blue-800">{stats.totalCrew}</div>
            <div className='text-[10px] md:text-xs text-blue-700 mt-1'>{t('totalCrewMembers')}</div>
          </Link>
        </div>

        {/* 2. Nog openstaande reizen */}
        <div className="aspect-[3/1]">
          <Link href="/bemanning/aflossers" className="h-full flex flex-col bg-green-50 border border-green-200 rounded-lg p-2 md:p-4 text-center hover:bg-green-100 transition cursor-pointer">
            <div className="text-[10px] md:text-sm font-semibold text-green-900 mb-1 md:mb-2 text-center">Nog openstaande reizen</div>
            <div className="text-[9px] md:text-xs text-green-700 space-y-0.5 md:space-y-1">
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
        </div>

        {/* 3. Zieken */}
        <div className="aspect-[3/1]">
          <Link href="/ziekte" className="h-full flex flex-col bg-red-50 border border-red-200 rounded-lg p-2 md:p-4 text-center hover:bg-red-100 transition cursor-pointer">
            <div className="text-[10px] md:text-sm font-semibold text-red-900 mb-1 md:mb-2 text-center">{t('sickMembers')}</div>
            <div className="text-[9px] md:text-xs text-red-700 space-y-0.5 md:space-y-1">
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
        </div>

        {/* 4. Nieuw personeel */}
        <div className="aspect-[3/1]">
          <Link href="/bemanning/nog-in-te-delen" className="h-full flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-2 md:p-4 text-center hover:bg-gray-100 transition cursor-pointer">
            <div className="text-[10px] md:text-sm font-semibold text-gray-900 mb-1 md:mb-2 text-center">{t('newPersonnelMembers')}</div>
            <div className="text-[9px] md:text-xs text-gray-700 space-y-0.5 md:space-y-1">
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
        </div>

        {/* 5. Studenten */}
        <div className="aspect-[3/1]">
          <Link href="/bemanning/studenten" className="h-full flex flex-col bg-purple-50 border border-purple-200 rounded-lg p-2 md:p-4 text-center hover:bg-purple-100 transition cursor-pointer">
            <div className="text-[10px] md:text-sm font-semibold text-purple-900 mb-1 md:mb-2 text-center">{t('students')}</div>
            <div className="text-[9px] md:text-xs text-purple-700 space-y-0.5 md:space-y-1">
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
        </div>

        {/* 6. Taken */}
        <div className="aspect-[3/1]">
          <Link href="/taken" className="h-full flex flex-col items-center justify-center bg-amber-50 border border-amber-200 rounded-lg p-2 md:p-4 text-center hover:bg-amber-100 transition cursor-pointer">
            <div className="text-lg md:text-2xl font-bold text-amber-800">{tasksCount}</div>
            <div className='text-[10px] md:text-xs text-amber-700 mt-1 flex items-center justify-center gap-1'>
              <ListTodo className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span>Taken</span>
            </div>
          </Link>
        </div>

        {/* 7. Scheepsbezoeken */}
        <div className="aspect-[3/1]">
          <Link href="/schepen/bezoeken" className="h-full flex flex-col items-center justify-center bg-indigo-50 border border-indigo-200 rounded-lg p-2 md:p-4 text-center hover:bg-indigo-100 transition cursor-pointer">
            <div className="text-lg md:text-2xl font-bold text-indigo-800">{stats.scheepsbezoeken}</div>
            <div className='text-[10px] md:text-xs text-indigo-700 mt-1 flex items-center justify-center gap-1'>
              <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span>Scheepsbezoeken</span>
            </div>
          </Link>
        </div>

        {/* 8. Medische keuringen */}
        <div className="aspect-[3/1]">
          <Link href="/bemanning/medische-keuringen" className="h-full flex flex-col items-center justify-center bg-teal-50 border border-teal-200 rounded-lg p-2 md:p-4 text-center hover:bg-teal-100 transition cursor-pointer">
            <div className="text-lg md:text-2xl font-bold text-teal-800">{stats.medischeKeuringen}</div>
            <div className='text-[10px] md:text-xs text-teal-700 mt-1 flex items-center justify-center gap-1'>
              <Cloud className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span>Medische Keuringen</span>
            </div>
          </Link>
        </div>

        {/* 9. Lopende incidenten */}
        <div className="aspect-[3/1]">
          <Link href="/incidenten" className="h-full flex flex-col items-center justify-center bg-rose-50 border border-rose-200 rounded-lg p-2 md:p-4 text-center hover:bg-rose-100 transition cursor-pointer">
            <div className="text-lg md:text-2xl font-bold text-rose-800">{openIncidentsCount}</div>
            <div className='text-[10px] md:text-xs text-rose-700 mt-1 flex items-center justify-center gap-1'>
              <AlertCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span>Lopende Incidenten</span>
            </div>
          </Link>
        </div>

        {/* 10. Openstaande leningen */}
        <div className="aspect-[3/1]">
          <Link href="/bemanning/leningen" className="h-full flex flex-col items-center justify-center bg-yellow-50 border border-yellow-200 rounded-lg p-2 md:p-4 text-center hover:bg-yellow-100 transition cursor-pointer">
            <div className="text-lg md:text-2xl font-bold text-yellow-800">{stats.openLeningen}</div>
            <div className='text-[10px] md:text-xs text-yellow-700 mt-1'>{t('outstandingLoans')}</div>
          </Link>
        </div>

        {/* 11. Oud medewerkers */}
        <div className="aspect-[3/1]">
          <Link href="/bemanning/oude-bemanningsleden" className="h-full flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-lg p-2 md:p-4 text-center hover:bg-slate-100 transition cursor-pointer">
            <div className="text-lg md:text-2xl font-bold text-slate-800">{stats.oudMedewerkers}</div>
            <div className='text-[10px] md:text-xs text-slate-700 mt-1'>{t('oldEmployees')}</div>
          </Link>
        </div>
      </div>
    </div>
  )
}

