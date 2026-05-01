"use client"

import { supabase } from "@/lib/supabase"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  } catch {
    return null
  }
}

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (!("serviceWorker" in navigator)) return false
  if (!("PushManager" in window)) return false
  if (!("Notification" in window)) return false
  return true
}

export async function getCurrentPushPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "default"
  return Notification.permission
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!(await isPushSupported())) return null
  const reg = await navigator.serviceWorker.getRegistration("/sw.js")
  if (!reg) return null
  const sub = await reg.pushManager.getSubscription()
  return sub
}

export async function enablePushNotifications(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    if (!(await isPushSupported())) {
      return { success: false, error: "Deze browser ondersteunt geen push." }
    }

    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      return { success: false, error: "Toestemming geweigerd in browser." }
    }

    const reg =
      (await navigator.serviceWorker.getRegistration("/sw.js")) ||
      (await navigator.serviceWorker.register("/sw.js"))
    await navigator.serviceWorker.ready

    const keyResp = await fetch("/api/notifications/public-key")
    const keyJson = await keyResp.json().catch(() => ({}))
    const publicKey = String(keyJson?.publicKey || "")
    if (!publicKey) {
      return {
        success: false,
        error: "Server VAPID-key ontbreekt. Stel NEXT_PUBLIC_VAPID_PUBLIC_KEY in.",
      }
    }

    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      try {
        await existing.unsubscribe()
      } catch {}
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    const token = await getAuthToken()
    const resp = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userAgent: navigator.userAgent,
      }),
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => "")
      return { success: false, error: `Server fout: ${text || resp.status}` }
    }

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message || "Onbekende fout" }
  }
}

export async function disablePushNotifications(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const sub = await getCurrentSubscription()
    if (!sub) return { success: true }
    const endpoint = sub.endpoint
    try {
      await sub.unsubscribe()
    } catch {}
    const token = await getAuthToken()
    await fetch("/api/notifications/unsubscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ endpoint }),
    })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message || "Onbekende fout" }
  }
}

export async function sendTestPush(): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken()
  const resp = await fetch("/api/notifications/test-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => "")
    return { success: false, error: `Server fout: ${text || resp.status}` }
  }
  return { success: true }
}

export async function runMorningBundleNow(): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken()
  const resp = await fetch("/api/notifications/morning-bundle", {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => "")
    return { success: false, error: `Server fout: ${text || resp.status}` }
  }
  return { success: true }
}
