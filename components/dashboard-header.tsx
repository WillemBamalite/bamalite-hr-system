"use client"

import { Bell, LogOut, User, Calendar, Globe, Printer, Clock, ListTodo, Search, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { nl, de, fr } from "date-fns/locale"
import { useLastActivity } from "@/hooks/use-last-activity"
import { CalendarDialog } from "@/components/agenda/calendar-dialog"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useShipVisits } from "@/hooks/use-ship-visits"
import { buildDashboardNotifications } from "@/utils/dashboard-notifications"
import { getAllShipCertificateNotificationsForClient } from "@/utils/ship-certificates"

interface DashboardHeaderProps {
  // Empty for now, can add props later if needed
}

export function DashboardHeader({}: DashboardHeaderProps = {}) {
  const { user, role, signOut } = useAuth()
  const { locale, t } = useLanguage()
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [agendaOpen, setAgendaOpen] = useState(false)
  const [headerFindQuery, setHeaderFindQuery] = useState("")
  const [headerFindMatches, setHeaderFindMatches] = useState(0)
  const { lastActivity, loading: activityLoading } = useLastActivity()
  const { crew, tasks, ships, sickLeave, loading: dataLoading } = useSupabaseData()
  const { visits, getShipsNotVisitedInDays } = useShipVisits()
  
  // Prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Update tijd elke seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const q = headerFindQuery.trim()
    if (!q || typeof window === "undefined") {
      setHeaderFindMatches(0)
      return
    }

    const bodyText = document.body?.innerText || ""
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(escaped, "gi")
    const matches = bodyText.match(regex)
    setHeaderFindMatches(matches ? matches.length : 0)
  }, [headerFindQuery, pathname])

  // Get date locale for formatting
  const getDateLocale = () => {
    switch (locale) {
      case 'de': return de
      case 'fr': return fr
      default: return nl
    }
  }

  const uiText = {
    subtitle: locale === "de" ? "Verwaltung von Besatzung und Schiffen" : locale === "fr" ? "Gestion équipage et navires" : "Beheer bemanning en schepen",
    searchPlaceholder: locale === "de" ? "Auf Seite suchen..." : locale === "fr" ? "Rechercher sur la page..." : "Zoek in pagina...",
    previousResult: locale === "de" ? "Vorheriges Ergebnis" : locale === "fr" ? "Résultat précédent" : "Vorige resultaat",
    nextResult: locale === "de" ? "Nächstes Ergebnis" : locale === "fr" ? "Résultat suivant" : "Volgende resultaat",
    hitSingle: locale === "de" ? "Treffer" : locale === "fr" ? "résultat" : "treffer",
    hitPlural: locale === "de" ? "Treffer" : locale === "fr" ? "résultats" : "treffers",
    loading: locale === "de" ? "Laden..." : locale === "fr" ? "Chargement..." : "Laden...",
    notifications: locale === "de" ? "Benachrichtigungen" : locale === "fr" ? "Notifications" : "Meldingen",
    newTask: locale === "de" ? "Neue Aufgabe" : locale === "fr" ? "Nouvelle tâche" : "Nieuwe taak",
    print: locale === "de" ? "Drucken" : locale === "fr" ? "Imprimer" : "Print",
  }
  
  // Don't show header on login page
  if (pathname === '/login') {
    return null
  }

  const runFind = (direction: "next" | "prev") => {
    const query = headerFindQuery.trim()
    if (!query || typeof window === "undefined" || typeof window.find !== "function") return
    window.find(
      query,
      false, // caseSensitive
      direction === "prev", // backwards
      true, // wrapAround
      false, // wholeWord
      false, // searchInFrames
      false, // showDialog
    )
  }
  const notificationCount = (() => {
    if (dataLoading) return 0
    const userEmailForNotifications = String(user?.email || "").toLowerCase()
    const showShipCertificateNotifications =
      userEmailForNotifications === "jos@bamalite.com" || userEmailForNotifications === "willem@bamalite.com"
    const shipCertificateAlerts = showShipCertificateNotifications
      ? getAllShipCertificateNotificationsForClient().map((n) => ({
          id: n.id,
          kind: "ship_certificate_paper" as const,
          severity: n.severity,
          title: n.title,
          description: n.description,
          href: n.href,
          meta: n.meta,
        }))
      : []
    try {
      return buildDashboardNotifications({
        crew: crew || [],
        tasks: tasks || [],
        ships: ships || [],
        sickLeave: sickLeave || [],
        visits: visits || [],
        getShipsNotVisitedInDays,
        shipCertificateAlerts,
      }).length
    } catch {
      return 0
    }
  })()
  const userEmailLower = String(user?.email || "").toLowerCase()
  const disableHeaderCalendarClick =
    userEmailLower === "tanja@bamalite.com" ||
    userEmailLower === "karina@bamalite.com" ||
    userEmailLower === "lucie@bamalite.com"

  return (
    <div className="space-y-4 p-6 bg-white border-b print-header sticky top-0 z-40 shadow-sm dashboard-header">
      <div className="flex flex-wrap items-center justify-between gap-4 dashboard-header-row">
        <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center shadow-lg">
            <Image
              src="/bemanningslijst-icon.png.png"
              alt="Bemanningslijst logo"
              width={80}
              height={80}
              priority
              className="object-cover w-full h-full"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bemanningslijst</h1>
            <p className="text-gray-600">{uiText.subtitle}</p>
          </div>
        </Link>

        <div className="flex flex-1 items-center gap-2 min-w-0 max-w-xl basis-full sm:basis-auto sm:min-w-[14rem] print:hidden dashboard-header-search">
          <div className="relative flex-1 min-w-0">
            <Input
              value={headerFindQuery}
              onChange={(e) => setHeaderFindQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runFind("next")
              }}
              placeholder={uiText.searchPlaceholder}
              className="pl-8 w-full bg-white"
              aria-label={uiText.searchPlaceholder}
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => runFind("prev")}
            title={uiText.previousResult}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            className="shrink-0 bg-gray-900 text-white hover:bg-gray-800"
            onClick={() => runFind("next")}
            title={uiText.nextResult}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <div className="text-xs text-gray-600 whitespace-nowrap min-w-[74px] text-right">
            {headerFindQuery.trim()
              ? `${headerFindMatches} ${headerFindMatches === 1 ? uiText.hitSingle : uiText.hitPlural}`
              : ""}
          </div>
        </div>

        {/* Live Datum & Tijd - Midden */}
        <button
          onClick={() => {
            if (disableHeaderCalendarClick) return
            setAgendaOpen(true)
          }}
          disabled={disableHeaderCalendarClick}
          className={`flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200 transition-colors ${
            disableHeaderCalendarClick ? "cursor-default" : "hover:bg-blue-100 cursor-pointer"
          }`}
          title={disableHeaderCalendarClick ? "Alleen zichtbaar, niet bewerkbaar" : ""}
        >
          <Calendar className="w-5 h-5 text-blue-600" />
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {mounted ? format(currentTime, 'EEEE d MMMM yyyy', { locale: getDateLocale() }) : uiText.loading}
            </div>
            <div className="text-xs text-gray-600">
              {mounted ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
            </div>
          </div>
        </button>
        
        <div className="flex items-center gap-4 dashboard-header-actions">
          {user && (
            <div className="flex items-center gap-3 dashboard-header-actions-row">
              {role === "admin_full" && <Link href="/meldingen" className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-2 ${
                    notificationCount > 0
                      ? "border-red-400 text-red-700 hover:bg-red-50 hover:text-red-800"
                      : ""
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {uiText.notifications}
                </Button>
                {notificationCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] leading-5 text-center font-semibold ring-2 ring-white">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </Link>}
              {/* Snelknop: Nieuwe taak overal in de app */}
              {role === "admin_full" && <Link href="/taken?newTask=1">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ListTodo className="w-4 h-4" />
                  {uiText.newTask}
                </Button>
              </Link>}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{user.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="flex items-center gap-2 print-button"
              >
                <Printer className="w-4 h-4" />
                {uiText.print}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t('logout')}
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Agenda Dialog */}
      <CalendarDialog open={agendaOpen} onOpenChange={setAgendaOpen} />
    </div>
  )
}
