/** Statusupdate-entry zoals opgeslagen op taken */
export type TaskStatusEntry = {
  text?: string
  at?: string
  by?: string
}

function normEmail(s: string | null | undefined) {
  return String(s || "")
    .trim()
    .toLowerCase()
}

/** Bouwt tijdlijn (chronologisch: oud → nieuw) uit status_updates + legacy velden */
export function getTaskStatusTimeline(task: Record<string, unknown>): TaskStatusEntry[] {
  const raw = task?.status_updates
  const list: TaskStatusEntry[] = Array.isArray(raw) ? [...(raw as TaskStatusEntry[])] : []
  if (!list.length && task?.status_update) {
    list.push({
      text: String(task.status_update),
      at: task.status_update_at ? String(task.status_update_at) : undefined,
      by: String(task.taken_by || task.created_by || "Onbekend"),
    })
  }
  return list.filter((e) => e && (e.text || e.at))
}

/** Laatste ISO-timestamp onder entries van anderen (niet de ingelogde gebruiker) */
export function getLatestStatusAtFromOthers(task: Record<string, unknown>, viewerEmail: string): string | null {
  const me = normEmail(viewerEmail)
  if (!me) return null
  const timeline = getTaskStatusTimeline(task)
  let best: string | null = null
  for (const e of timeline) {
    const by = normEmail(e.by)
    if (!by || by === me) continue
    const at = e.at ? String(e.at).trim() : ""
    if (!at) continue
    if (!best || at > best) best = at
  }
  return best
}

/** Hoogste "at" in de hele tijdlijn (voor read-cursor na "alles gezien") */
export function getLatestStatusAtOverall(task: Record<string, unknown>): string | null {
  const timeline = getTaskStatusTimeline(task)
  let best: string | null = null
  for (const e of timeline) {
    const at = e.at ? String(e.at).trim() : ""
    if (!at) continue
    if (!best || at > best) best = at
  }
  return best
}

function getReadCursor(task: Record<string, unknown>, viewerEmail: string): string | null {
  const me = normEmail(viewerEmail)
  if (!me) return null
  const reads = task?.status_reads
  if (!reads || typeof reads !== "object") return null
  const v = (reads as Record<string, unknown>)[me]
  if (v == null || typeof v !== "string") return null
  const s = v.trim()
  return s || null
}

/**
 * True als er voor deze kijker minstens één statusupdate van een ander is
 * die nieuwer is dan de opgeslagen read-cursor (status_reads[email]).
 */
export function taskHasUnreadStatusFromOthers(task: Record<string, unknown>, viewerEmail: string): boolean {
  if (task?.completed === true || String(task?.status || "") === "completed") return false
  const latestOther = getLatestStatusAtFromOthers(task, viewerEmail)
  if (!latestOther) return false
  const read = getReadCursor(task, viewerEmail)
  if (!read) return true
  return latestOther > read
}

/** JSON status_reads na markeren als gelezen door viewer (merge met bestaande keys) */
export function buildNextStatusReads(
  task: Record<string, unknown>,
  viewerEmail: string
): Record<string, string> {
  const me = normEmail(viewerEmail)
  const prev =
    task.status_reads && typeof task.status_reads === "object" && !Array.isArray(task.status_reads)
      ? { ...(task.status_reads as Record<string, string>) }
      : {}
  const maxAt = getLatestStatusAtOverall(task)
  if (me && maxAt) prev[me] = maxAt
  return prev
}
