"use client"

import { LogOut, User, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"

interface DashboardHeaderProps {
  // Empty for now, can add props later if needed
}

export function DashboardHeader({}: DashboardHeaderProps = {}) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  
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
