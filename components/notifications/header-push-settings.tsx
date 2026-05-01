"use client"

import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { isPushSetupUser } from "@/lib/notifications/push-setup-users"
import { PushToggle } from "@/components/notifications/push-toggle"

export function HeaderPushSettings() {
  const { user } = useAuth()
  const { locale } = useLanguage()

  if (!isPushSetupUser(user?.email)) return null

  const label =
    locale === "de" ? "Einstellungen" : locale === "fr" ? "Paramètres" : "Instellingen"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2 shrink-0"
          title={label}
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-3">
        <PushToggle variant="menu" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
