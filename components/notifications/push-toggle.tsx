"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  disablePushNotifications,
  enablePushNotifications,
  getCurrentPushPermission,
  getCurrentSubscription,
  isPushSupported,
  runMorningBundleNow,
  sendTestPush,
} from "@/lib/notifications/push-client"
import { cn } from "@/lib/utils"

type Status = "loading" | "unsupported" | "enabled" | "disabled" | "blocked"

export type PushToggleVariant = "card" | "menu"

type PushToggleProps = {
  /** card = volledige kaart; menu = compact voor header-dropdown */
  variant?: PushToggleVariant
}

export function PushToggle({ variant = "card" }: PushToggleProps) {
  const [status, setStatus] = useState<Status>("loading")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>("")
  const [isTestMode, setIsTestMode] = useState(false)

  const refreshStatus = async () => {
    if (!(await isPushSupported())) {
      setStatus("unsupported")
      return
    }
    const perm = await getCurrentPushPermission()
    if (perm === "denied") {
      setStatus("blocked")
      return
    }
    const sub = await getCurrentSubscription()
    setStatus(sub ? "enabled" : "disabled")
  }

  useEffect(() => {
    refreshStatus()
    void (async () => {
      try {
        const resp = await fetch("/api/notifications/public-key")
        const json = await resp.json().catch(() => ({}))
        setIsTestMode(Boolean(json?.testMode))
      } catch {
        setIsTestMode(false)
      }
    })()
  }, [])

  const handleEnable = async () => {
    setBusy(true)
    setMessage("")
    const res = await enablePushNotifications()
    if (!res.success) {
      setMessage(res.error || "Kon push niet aanzetten.")
    } else {
      setMessage("Push aangezet voor dit apparaat.")
    }
    await refreshStatus()
    setBusy(false)
  }

  const handleDisable = async () => {
    setBusy(true)
    setMessage("")
    const res = await disablePushNotifications()
    if (!res.success) {
      setMessage(res.error || "Kon push niet uitschakelen.")
    } else {
      setMessage("Push uitgeschakeld op dit apparaat.")
    }
    await refreshStatus()
    setBusy(false)
  }

  const handleTest = async () => {
    setBusy(true)
    setMessage("")
    const res = await sendTestPush()
    setMessage(
      res.success
        ? "Testmelding verstuurd. Check je telefoon of dit venster."
        : res.error || "Kon testmelding niet versturen."
    )
    setBusy(false)
  }

  const handleMorningTest = async () => {
    setBusy(true)
    setMessage("")
    const res = await runMorningBundleNow()
    setMessage(
      res.success
        ? "Ochtendbundel gestart. In testmodus gaat push + mail alleen naar jou."
        : res.error || "Kon ochtendbundel niet starten."
    )
    setBusy(false)
  }

  const isMenu = variant === "menu"

  return (
    <div
      className={cn(
        isMenu ? "border-0 bg-transparent p-0 shadow-none" : "rounded-md border bg-white p-4"
      )}
    >
      <div className={cn("flex items-start gap-3", isMenu && "gap-2")}>
        <Bell className={cn("text-blue-700 mt-0.5 shrink-0", isMenu ? "w-4 h-4" : "w-5 h-5")} />
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-semibold text-gray-900",
              isMenu ? "text-xs" : "text-sm"
            )}
          >
            Pushmeldingen op dit apparaat
          </div>
          <div className={cn("text-gray-600 mt-1", isMenu ? "text-[11px] leading-snug" : "text-xs")}>
            Schakel meldingen in om direct op je telefoon op de hoogte te blijven van taken,
            salarislogins en het ochtenddagoverzicht. Werkt het beste vanuit Chrome op Android of
            Safari op iPhone (eerst toevoegen aan beginscherm).
          </div>

          <div className={cn("flex flex-wrap gap-2", isMenu ? "mt-2" : "mt-3")}>
            {status === "loading" && (
              <span className={cn("text-gray-500", isMenu ? "text-[11px]" : "text-xs")}>
                Status laden...
              </span>
            )}
            {status === "unsupported" && (
              <span className={cn("text-gray-500", isMenu ? "text-[11px]" : "text-xs")}>
                Deze browser ondersteunt geen push.
              </span>
            )}
            {status === "blocked" && (
              <span className={cn("text-red-700", isMenu ? "text-[11px]" : "text-xs")}>
                Toestemming geblokkeerd in browserinstellingen.
              </span>
            )}
            {status === "disabled" && (
              <Button
                onClick={handleEnable}
                disabled={busy}
                size={isMenu ? "sm" : "default"}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Bell className={cn("mr-2", isMenu ? "w-3.5 h-3.5" : "w-4 h-4")} />
                Pushmeldingen aanzetten
              </Button>
            )}
            {status === "enabled" && (
              <>
                {isTestMode && (
                  <>
                    <Button onClick={handleTest} disabled={busy} variant="outline" size={isMenu ? "sm" : "default"}>
                      <Send className={cn("mr-2", isMenu ? "w-3.5 h-3.5" : "w-4 h-4")} />
                      Testmelding sturen
                    </Button>
                    <Button
                      onClick={handleMorningTest}
                      disabled={busy}
                      variant="outline"
                      size={isMenu ? "sm" : "default"}
                    >
                      <Send className={cn("mr-2", isMenu ? "w-3.5 h-3.5" : "w-4 h-4")} />
                      Test ochtendmelding nu
                    </Button>
                  </>
                )}
                {!isTestMode && (
                  <span className={cn("text-gray-600 self-center", isMenu ? "text-[11px]" : "text-xs")}>
                    Push staat aan op dit apparaat.
                  </span>
                )}
                <Button onClick={handleDisable} disabled={busy} variant="outline" size={isMenu ? "sm" : "default"}>
                  <BellOff className={cn("mr-2", isMenu ? "w-3.5 h-3.5" : "w-4 h-4")} />
                  Uitzetten
                </Button>
              </>
            )}
          </div>

          {message && (
            <div className={cn("mt-2 text-gray-700", isMenu ? "text-[11px]" : "text-xs")}>{message}</div>
          )}
        </div>
      </div>
    </div>
  )
}
