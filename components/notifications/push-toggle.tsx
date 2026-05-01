"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import {
  disablePushNotifications,
  enablePushNotifications,
  getCurrentPushPermission,
  getCurrentSubscription,
  isPushSupported,
  runMorningBundleNow,
  sendTestPush,
} from "@/lib/notifications/push-client"

type Status = "loading" | "unsupported" | "enabled" | "disabled" | "blocked"

const PUSH_SETUP_EMAILS = new Set(["willem@bamalite.com", "leo@bamalite.com"])

const dismissKey = (email: string) => `push-setup-dismissed:${email.toLowerCase()}`

export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>("")
  const [isTestMode, setIsTestMode] = useState(false)
  const [viewerEmail, setViewerEmail] = useState<string>("")
  const [dismissed, setDismissed] = useState(false)
  const [gateReady, setGateReady] = useState(false)

  const eligible = viewerEmail ? PUSH_SETUP_EMAILS.has(viewerEmail.toLowerCase()) : false

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
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const email = String(data?.session?.user?.email || "").trim().toLowerCase()
        setViewerEmail(email)
        if (typeof window !== "undefined" && email) {
          setDismissed(window.localStorage.getItem(dismissKey(email)) === "1")
        }
      } catch {
        setViewerEmail("")
      }
      setGateReady(true)
    })()
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

  const persistDismiss = () => {
    if (!viewerEmail || typeof window === "undefined") return
    window.localStorage.setItem(dismissKey(viewerEmail), "1")
    setDismissed(true)
  }

  const handleEnable = async () => {
    setBusy(true)
    setMessage("")
    const res = await enablePushNotifications()
    if (!res.success) {
      setMessage(res.error || "Kon push niet aanzetten.")
    } else {
      setMessage("Push aangezet voor dit apparaat.")
      persistDismiss()
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
      if (typeof window !== "undefined" && viewerEmail) {
        window.localStorage.removeItem(dismissKey(viewerEmail))
        setDismissed(false)
      }
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

  if (!gateReady) return null
  if (!eligible) return null
  if (dismissed && !(isTestMode && status === "enabled")) return null
  if (status === "enabled" && !isTestMode) return null

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
              <>
                <Button onClick={handleEnable} disabled={busy} className="bg-blue-600 hover:bg-blue-700">
                  <Bell className="w-4 h-4 mr-2" /> Pushmeldingen aanzetten
                </Button>
                <button
                  type="button"
                  onClick={() => persistDismiss()}
                  className="text-xs text-gray-600 underline px-2 py-2"
                >
                  Niet nu
                </button>
              </>
            )}
            {status === "enabled" && (
              <>
                {isTestMode && (
                  <>
                    <Button onClick={handleTest} disabled={busy} variant="outline">
                      <Send className="w-4 h-4 mr-2" /> Testmelding sturen
                    </Button>
                    <Button onClick={handleMorningTest} disabled={busy} variant="outline">
                      <Send className="w-4 h-4 mr-2" /> Test ochtendmelding nu
                    </Button>
                  </>
                )}
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
