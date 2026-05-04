import "server-only"

import { createServerSupabase } from "@/lib/supabase-server"

/** Log naar notification_dispatch_log (optioneel; faalt stil als tabel ontbreekt). */
export async function logNotificationDispatch(args: {
  event_key: string
  channel: "email"
  recipient: string
  payload: unknown
  status: "ok" | "error"
  error?: string
}) {
  try {
    const supabase = createServerSupabase()
    await supabase.from("notification_dispatch_log").insert({
      event_key: args.event_key,
      channel: args.channel,
      recipient: args.recipient,
      payload: args.payload as object,
      status: args.status,
      error: args.error || null,
    })
  } catch {
    // tabel optioneel
  }
}
