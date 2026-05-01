import "server-only"

import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"
import { getPushRecipients } from "./recipients"

type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
  eventKey?: string
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ocwraavhrtpvbqlkwnlb.supabase.co"

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04"

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:willem@bamalite.com"
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ""

let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error(
      "VAPID keys ontbreken. Stel NEXT_PUBLIC_VAPID_PUBLIC_KEY en VAPID_PRIVATE_KEY in."
    )
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  vapidConfigured = true
}

function getServerSupabase() {
  // Service-role indien beschikbaar (bypasst RLS), anders anon (alleen lezen waar policies toelaten).
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function sendPushToRecipients(
  payload: PushPayload,
  recipientsOverride?: string[]
): Promise<{ sent: number; failed: number; total: number }> {
  ensureVapid()
  const supabase = getServerSupabase()
  const recipients =
    recipientsOverride && recipientsOverride.length > 0
      ? recipientsOverride
      : getPushRecipients()

  if (recipients.length === 0) {
    return { sent: 0, failed: 0, total: 0 }
  }

  const { data: subs, error } = await supabase
    .from("web_push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_email, enabled")
    .in("user_email", recipients)
    .eq("enabled", true)

  if (error) {
    throw new Error(`Kon subscriptions niet ophalen: ${error.message}`)
  }

  const total = subs?.length || 0
  let sent = 0
  let failed = 0
  const expiredEndpoints: string[] = []

  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint as string,
          keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url || "/meldingen",
          tag: payload.tag || payload.eventKey || "bamalite-hr",
        }),
        { TTL: 60 * 60 }
      )
      sent++
      await logDispatch({
        event_key: payload.eventKey || "live",
        channel: "push",
        recipient: sub.user_email as string,
        payload,
        status: "ok",
      })
    } catch (err: any) {
      failed++
      const status = Number(err?.statusCode || err?.status || 0)
      if (status === 404 || status === 410) {
        expiredEndpoints.push(sub.endpoint as string)
      }
      await logDispatch({
        event_key: payload.eventKey || "live",
        channel: "push",
        recipient: (sub.user_email as string) || "",
        payload,
        status: "error",
        error: String(err?.message || err),
      })
    }
  }

  if (expiredEndpoints.length > 0) {
    await supabase
      .from("web_push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints)
  }

  return { sent, failed, total }
}

export async function logDispatch(args: {
  event_key: string
  channel: "push" | "email"
  recipient: string
  payload: unknown
  status: "ok" | "error"
  error?: string
}) {
  try {
    const supabase = getServerSupabase()
    await supabase.from("notification_dispatch_log").insert({
      event_key: args.event_key,
      channel: args.channel,
      recipient: args.recipient,
      payload: args.payload as any,
      status: args.status,
      error: args.error || null,
    })
  } catch {
    // log table is optioneel; faal niet de hele dispatch
  }
}

/**
 * Eenvoudige in-process throttle om dubbele live pushes binnen een tijdvenster te voorkomen.
 * Geldt per node-instance; voor productie volstaat dit voor onze use-cases.
 */
const recentDispatches = new Map<string, number>()

export function shouldDispatch(eventKey: string, windowMs = 5 * 60 * 1000): boolean {
  const now = Date.now()
  const last = recentDispatches.get(eventKey) || 0
  if (now - last < windowMs) return false
  recentDispatches.set(eventKey, now)
  return true
}

export const __vapidPublicKey = VAPID_PUBLIC_KEY
