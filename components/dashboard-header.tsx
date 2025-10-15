"use client"

import { LogOut, User, Calendar, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { supabase } from "@/lib/supabase"

interface DashboardHeaderProps {
  // Empty for now, can add props later if needed
}

export function DashboardHeader({}: DashboardHeaderProps = {}) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [locale, setLocale] = useState<'nl' | 'de' | 'fr'>('nl')
  
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

  // Load preferred locale from Supabase user metadata
  useEffect(() => {
    const loadLocale = async () => {
      if (!user) return
      const { data } = await supabase.auth.getUser()
      const l = (data.user?.user_metadata as any)?.locale as 'nl' | 'de' | 'fr' | undefined
      if (l) setLocale(l)
    }
    loadLocale()
  }, [user])

  const updateLocale = async (l: 'nl' | 'de' | 'fr') => {
    setLocale(l)
    await supabase.auth.updateUser({ data: { locale: l } })
  }
  
  // Don't show header on login page
  if (pathname === '/login') {
    return null
  }

  return (
    <div className="space-y-4 p-6 bg-white border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#1e3a8a] rounded-full flex items-center justify-center shadow-lg border-4 border-[#1e3a8a]">
            <span className="text-4xl font-bold text-yellow-400">B</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bemanningslijst</h1>
            <p className="text-gray-600">Beheer bemanning en schepen</p>
          </div>
        </div>

        {/* Live Datum & Tijd - Midden */}
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {mounted ? format(currentTime, 'EEEE d MMMM yyyy', { locale: nl }) : 'Laden...'}
            </div>
            <div className="text-xs text-gray-600">
              {mounted ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Language switch */}
          {user && (
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
              <Globe className="w-4 h-4 text-gray-600" />
              {(['nl','de','fr'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => updateLocale(l)}
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
                onClick={() => signOut()}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Uitloggen
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
