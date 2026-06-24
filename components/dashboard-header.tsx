"use client"

import { LogOut, Calendar, Printer, ListTodo, Search, ChevronDown, ChevronUp, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { nl, de, fr } from "date-fns/locale"
import { CalendarDialog } from "@/components/agenda/calendar-dialog"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { taskHasUnreadStatusFromOthers } from "@/utils/task-status-unread"

interface DashboardHeaderProps {
  // Empty for now, can add props later if needed
}

export function DashboardHeader({}: DashboardHeaderProps = {}) {
  const { user, role, signOut, canAccessPath } = useAuth()
  const { locale, t } = useLanguage()
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [agendaOpen, setAgendaOpen] = useState(false)
  const [headerFindQuery, setHeaderFindQuery] = useState("")
  const [headerFindMatches, setHeaderFindMatches] = useState(0)
  const { tasks, loading: tasksLoading } = useSupabaseData()
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

  const isCertificatesOverviewPage = pathname === "/schepen/certificaten"

  const uiText = {
    subtitle: locale === "de" ? "Verwaltung von Besatzung und Schiffen" : locale === "fr" ? "Gestion équipage et navires" : "Beheer bemanning en schepen",
    certificatesPageSubtitle:
      locale === "de"
        ? "Übersicht nach Schiff – abgelaufene und bald ablaufende Zertifikate"
        : locale === "fr"
          ? "Vue par navire – certificats expirés ou bientôt expirés"
          : "Overzicht per schip – verlopen en bijna verlopen certificaten",
    searchPlaceholder: locale === "de" ? "Auf Seite suchen..." : locale === "fr" ? "Rechercher sur la page..." : "Zoek in pagina...",
    previousResult: locale === "de" ? "Vorheriges Ergebnis" : locale === "fr" ? "Résultat précédent" : "Vorige resultaat",
    nextResult: locale === "de" ? "Nächstes Ergebnis" : locale === "fr" ? "Résultat suivant" : "Volgende resultaat",
    hitSingle: locale === "de" ? "Treffer" : locale === "fr" ? "résultat" : "treffer",
    hitPlural: locale === "de" ? "Treffer" : locale === "fr" ? "résultats" : "treffers",
    loading: locale === "de" ? "Laden..." : locale === "fr" ? "Chargement..." : "Laden...",
    newTask: locale === "de" ? "Neue Aufgabe" : locale === "fr" ? "Nouvelle tâche" : "Nieuwe taak",
    print: locale === "de" ? "Drucken" : locale === "fr" ? "Imprimer" : "Print",
    statusUpdates: locale === "de" ? "Statusupdates" : locale === "fr" ? "Mises à jour" : "Statusupdates",
    myTasks: locale === "de" ? "Meine Aufgaben" : locale === "fr" ? "Mes tâches" : "Mijn taken",
  }

  const userEmailLower = String(user?.email || "").toLowerCase()
  const statusUnreadCount = useMemo(() => {
    if (!userEmailLower || tasksLoading) return 0
    try {
      return (tasks || []).filter((t: any) => taskHasUnreadStatusFromOthers(t, userEmailLower)).length
    } catch {
      return 0
    }
  }, [tasks, tasksLoading, userEmailLower])

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
  const disableHeaderCalendarClick =
    userEmailLower === "tanja@bamalite.com" ||
    userEmailLower === "karina@bamalite.com" ||
    userEmailLower === "lucie@bamalite.com"
  const hideHeaderCalendarForUser = userEmailLower === "dunja@bamalite.com"

  return (
    <div className="w-full space-y-4 p-6 bg-white border-b print-header sticky top-0 z-40 shadow-sm dashboard-header">
      <div className="flex flex-wrap items-center justify-between gap-4 dashboard-header-row">
        <Link href="/" className="dashboard-header-brand flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center shadow-lg dashboard-header-logo">
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
            <h1 className="text-3xl font-bold text-gray-900">
              {isCertificatesOverviewPage
                ? "Verloopdatums Certificaten en Verklaringen"
                : "Bemanningslijst"}
            </h1>
            <p className="text-gray-600">
              {isCertificatesOverviewPage ? uiText.certificatesPageSubtitle : uiText.subtitle}
            </p>
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
        {!hideHeaderCalendarForUser && (
          <button
            onClick={() => {
              if (disableHeaderCalendarClick) return
              setAgendaOpen(true)
            }}
            disabled={disableHeaderCalendarClick}
            className={`dashboard-header-calendar flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200 transition-colors ${
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
        )}
        
        <div className="flex items-center gap-4 dashboard-header-actions">
          {user && (
            <div className="flex items-center gap-3 dashboard-header-actions-row">
              <div className="dashboard-header-desktop-only flex items-center gap-3">
                {role === "admin_full" && user && (
                  <Link href="/taken?statusUnread=1" className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex items-center gap-2 ${
                        statusUnreadCount > 0 ? "border-amber-500 text-amber-800 hover:bg-amber-50" : ""
                      }`}
                      title="Taken met ongelezen statusupdates van collega's"
                    >
                      <Bell
                        className={`w-4 h-4 shrink-0 ${statusUnreadCount > 0 ? "task-status-bell-attention text-amber-600" : ""}`}
                      />
                      {uiText.statusUpdates}
                    </Button>
                    {statusUnreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-white text-[11px] leading-5 text-center font-semibold ring-2 ring-white">
                        {statusUnreadCount > 99 ? "99+" : statusUnreadCount}
                      </span>
                    )}
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 print-button"
                >
                  <Printer className="w-4 h-4" />
                  {uiText.print}
                </Button>
              </div>
              {/* Snelknop: Nieuwe taak overal in de app */}
              {role === "admin_full" && <Link href="/taken?newTask=1">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2 dashboard-header-mobile-primary-btn"
                >
                  <ListTodo className="w-4 h-4" />
                  {uiText.newTask}
                </Button>
              </Link>}
              {role !== "admin_full" && canAccessPath("/taken") && (
                <Link href="/taken">
                  <Button variant="default" size="sm" className="flex items-center gap-2 dashboard-header-mobile-primary-btn">
                    <ListTodo className="w-4 h-4" />
                    {uiText.myTasks}
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="flex items-center gap-2 dashboard-header-mobile-primary-btn"
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
