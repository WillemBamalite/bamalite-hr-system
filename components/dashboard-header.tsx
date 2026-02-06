"use client"

import { LogOut, User, Calendar, Globe, Printer, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
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

  return (
    <div className="space-y-4 p-6 bg-white border-b print-header">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer">
          <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center shadow-lg">
            <Image
              src="/bemanningslijst-icon.png.png"
              alt="Bemanningslijst logo"
              width={112}
              height={112}
              priority
              className="object-cover w-full h-full"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bemanningslijst</h1>
            <p className="text-gray-600">Beheer bemanning en schepen</p>
          </div>
        </Link>

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
          {/* Last activity indicator */}
          {user && !activityLoading && lastActivity.timestamp && (
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <div className="text-xs text-gray-600 whitespace-nowrap">
                <span className="font-medium">Laatst gewijzigd</span>
                {lastActivity.user && (
                  <span className="ml-1">door {lastActivity.user}</span>
                )}
                <span className="ml-1 text-gray-500">
                  {formatDistanceToNow(lastActivity.timestamp, { addSuffix: true, locale: nl })}
                </span>
              </div>
            </div>
          )}

          {/* Language switch */}
          {user && (
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
              <Globe className="w-4 h-4 text-gray-600" />
              {(['nl','de','fr'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`text-xs px-2 py-1 rounded ${locale===l ? 'bg-white border border-gray-300 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          {user && (
            <div className="flex items-center gap-3">
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
