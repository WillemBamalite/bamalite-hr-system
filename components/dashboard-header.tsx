"use client"

import { Bell, LogOut, User, Calendar, Globe, Printer, Clock, ListTodo, Search } from "lucide-react"
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
import { useDashboardSearchOptional } from "@/contexts/DashboardSearchContext"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useShipVisits } from "@/hooks/use-ship-visits"
import { buildDashboardNotifications } from "@/utils/dashboard-notifications"

interface DashboardHeaderProps {
  // Empty for now, can add props later if needed
}

export function DashboardHeader({}: DashboardHeaderProps = {}) {
  const { user, signOut } = useAuth()
  const { locale, setLocale, t } = useLanguage()
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [agendaOpen, setAgendaOpen] = useState(false)
  const { lastActivity, loading: activityLoading } = useLastActivity()
  const dashboardSearch = useDashboardSearchOptional()
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

  // Get date locale for formatting
  const getDateLocale = () => {
    switch (locale) {
      case 'de': return de
      case 'fr': return fr
      default: return nl
    }
  }
  
  // Don't show header on login page
  if (pathname === '/login') {
    return null
  }

  const showDashboardSearch = pathname === "/" && dashboardSearch
  const notificationCount = (() => {
    if (dataLoading) return 0
    try {
      return buildDashboardNotifications({
        crew: crew || [],
        tasks: tasks || [],
        ships: ships || [],
        sickLeave: sickLeave || [],
        visits: visits || [],
        getShipsNotVisitedInDays,
      }).length
    } catch {
      return 0
    }
  })()

  return (
    <div className="space-y-4 p-6 bg-white border-b print-header sticky top-0 z-40 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
            <p className="text-gray-600">Beheer bemanning en schepen</p>
          </div>
        </Link>

        {showDashboardSearch && (
          <div className="flex flex-1 items-center gap-2 min-w-0 max-w-xl basis-full sm:basis-auto sm:min-w-[14rem] print:hidden">
            <div className="relative flex-1 min-w-0">
              <Input
                value={dashboardSearch.searchQuery}
                onChange={(e) => dashboardSearch.setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") dashboardSearch.runSearch()
                }}
                placeholder="Zoek schip of bemanningslid..."
                className="pl-8 w-full bg-white"
                aria-label="Zoek schip of bemanningslid"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 bg-gray-900 text-white hover:bg-gray-800"
              onClick={() => dashboardSearch.runSearch()}
            >
              Zoek
            </Button>
          </div>
        )}

        {/* Live Datum & Tijd - Midden */}
        <button
          onClick={() => setAgendaOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <Calendar className="w-5 h-5 text-blue-600" />
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {mounted ? format(currentTime, 'EEEE d MMMM yyyy', { locale: nl }) : 'Laden...'}
            </div>
            <div className="text-xs text-gray-600">
              {mounted ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
            </div>
          </div>
        </button>
        
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <Link href="/meldingen" className="relative">
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
                  Meldingen
                </Button>
                {notificationCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] leading-5 text-center font-semibold ring-2 ring-white">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </Link>
              {/* Snelknop: Nieuwe taak overal in de app */}
              <Link href="/taken?newTask=1">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ListTodo className="w-4 h-4" />
                  Nieuwe taak
                </Button>
              </Link>
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
                Print
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
