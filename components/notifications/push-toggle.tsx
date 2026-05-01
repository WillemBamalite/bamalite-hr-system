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
  sendTestPush,
} from "@/lib/notifications/push-client"

type Status = "loading" | "unsupported" | "enabled" | "disabled" | "blocked"

export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>("")

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

  return (
    <div className="rounded-md border bg-white p-4">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-blue-700 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            Pushmeldingen op dit apparaat
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Schakel meldingen in om direct op je telefoon op de hoogte te blijven van
            taken, salarislogins en het ochtenddagoverzicht. Werkt het beste vanuit
            Chrome op Android of Safari op iPhone (eerst toevoegen aan beginscherm).
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {status === "loading" && (
              <span className="text-xs text-gray-500">Status laden...</span>
            )}
            {status === "unsupported" && (
              <span className="text-xs text-gray-500">
                Deze browser ondersteunt geen push.
              </span>
            )}
            {status === "blocked" && (
              <span className="text-xs text-red-700">
                Toestemming geblokkeerd in browserinstellingen.
              </span>
            )}
            {status === "disabled" && (
              <Button onClick={handleEnable} disabled={busy} className="bg-blue-600 hover:bg-blue-700">
                <Bell className="w-4 h-4 mr-2" /> Pushmeldingen aanzetten
              </Button>
            )}
            {status === "enabled" && (
              <>
                <Button onClick={handleTest} disabled={busy} variant="outline">
                  <Send className="w-4 h-4 mr-2" /> Testmelding sturen
                </Button>
                <Button onClick={handleDisable} disabled={busy} variant="outline">
                  <BellOff className="w-4 h-4 mr-2" /> Uitzetten
                </Button>
              </>
            )}
          </div>

          {message && (
            <div className="mt-2 text-xs text-gray-700">{message}</div>
          )}
        </div>
      </div>
    </div>
  )
}
