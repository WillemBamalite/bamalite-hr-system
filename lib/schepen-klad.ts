import { supabase } from "@/lib/supabase"

export type KladHealthOverride = "ziek" | "beter"

export type KladPlacement = {
  shipId: string
  column: "aan-boord" | "thuis" | "afwezig"
}

export type SchepenKladPayload = {
  placements: Record<string, KladPlacement>
  originals: Record<string, KladPlacement>
  onBoardFromDates: Record<string, string>
  healthOverrides: Record<string, KladHealthOverride>
  kladDate: string | null
  updatedAt: string | null
  updatedBy: string | null
}

const CHANNEL_NAME = "schepen-klad-shared"
const BROADCAST_EVENT = "klad-updated"

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken()
  if (!token) throw new Error("Niet ingelogd")
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

export async function fetchSchepenKlad(): Promise<{
  payload: SchepenKladPayload | null
  error: string | null
}> {
  try {
    const headers = await authHeaders()
    const res = await fetch("/api/schepen-klad", { method: "GET", headers, cache: "no-store" })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.success) {
      return { payload: null, error: json?.error || `HTTP ${res.status}` }
    }
    return { payload: json.data as SchepenKladPayload, error: null }
  } catch (error: any) {
    return { payload: null, error: error?.message || "Laden mislukt" }
  }
}

export async function saveSchepenKlad(payload: {
  placements: Record<string, KladPlacement>
  originals: Record<string, KladPlacement>
  onBoardFromDates: Record<string, string>
  healthOverrides: Record<string, KladHealthOverride>
  kladDate: string
}): Promise<{ payload: SchepenKladPayload | null; error: string | null }> {
  try {
    const headers = await authHeaders()
    const res = await fetch("/api/schepen-klad", {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.success) {
      return { payload: null, error: json?.error || `HTTP ${res.status}` }
    }
    return { payload: json.data as SchepenKladPayload, error: null }
  } catch (error: any) {
    return { payload: null, error: error?.message || "Opslaan mislukt" }
  }
}

export function subscribeSchepenKlad(
  onPing: (meta: { updatedAt?: string | null; updatedBy?: string | null }) => void
): {
  unsubscribe: () => void
  notify: (meta: { updatedAt?: string | null; updatedBy?: string | null }) => Promise<void>
} {
  const channel = supabase
    .channel(CHANNEL_NAME)
    .on("broadcast", { event: BROADCAST_EVENT }, (message: any) => {
      onPing({
        updatedAt: message?.payload?.updatedAt || null,
        updatedBy: message?.payload?.updatedBy || null,
      })
    })
    .subscribe()

  return {
    unsubscribe: () => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // ignore
      }
    },
    notify: async (meta) => {
      try {
        await channel.send({
          type: "broadcast",
          event: BROADCAST_EVENT,
          payload: {
            updatedAt: meta.updatedAt || null,
            updatedBy: meta.updatedBy || null,
          },
        })
      } catch {
        // ignore
      }
    },
  }
}
