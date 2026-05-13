import "server-only"

import { addDays, addMonths, differenceInCalendarDays, format, startOfDay } from "date-fns"
import type { SupabaseClient } from "@supabase/supabase-js"
import { parseFlexibleDate } from "@/utils/dashboard-notifications"

const CREATED_BY = "HR-systeem"
const ASSIGNED = "Nautic"

function titleFunctioneren(first: string, last: string) {
  return `Vragen naar functioneren - ${first} ${last}`.trim()
}

function titleSamenwerking(first: string, last: string) {
  return `Samenwerking doorzetten of stoppen - ${first} ${last}`.trim()
}

function normalizeShipId(shipId: unknown): string | null {
  if (shipId == null || shipId === "") return null
  const s = String(shipId)
  if (s === "none" || s === "unassigned") return null
  return s
}

function isActiveCrewRow(m: Record<string, unknown>): boolean {
  if (m.is_dummy === true) return false
  if (String(m.status || "").toLowerCase() === "uit-dienst") return false
  return true
}

/**
 * Maakt HR-onboardingtaken pas aan zodra de ingangsdatum dat toelaat:
 * - functioneren: vanaf 10 kalenderdagen na in_dienst_vanaf
 * - samenwerking: vanaf 2 kalendermaanden na in_dienst_vanaf
 *
 * Idempotent: bestaande taak metzelfde titel-prefix voor hetzelfde bemanningslid wordt overgeslagen.
 */
export async function createDueHrOnboardingTasks(supabase: SupabaseClient): Promise<{
  createdFunctioneren: number
  createdSamenwerking: number
  errors: string[]
}> {
  const errors: string[] = []
  let createdFunctioneren = 0
  let createdSamenwerking = 0

  const { data: crewRows, error: crewErr } = await supabase.from("crew").select(
    "id, first_name, last_name, in_dienst_vanaf, ship_id, status, is_dummy"
  )
  if (crewErr) {
    errors.push(crewErr.message)
    return { createdFunctioneren: 0, createdSamenwerking: 0, errors }
  }

  const crew = (crewRows || []).filter((r) => isActiveCrewRow(r as any))
  const today = startOfDay(new Date())
  const ymdToday = format(today, "yyyy-MM-dd")

  const { data: existingTasks, error: taskErr } = await supabase
    .from("tasks")
    .select("related_crew_id, title")
    .eq("created_by", CREATED_BY)
    .not("related_crew_id", "is", null)

  if (taskErr) {
    errors.push(taskErr.message)
    return { createdFunctioneren: 0, createdSamenwerking: 0, errors }
  }

  const hasFn = new Set<string>()
  const hasSam = new Set<string>()
  for (const t of existingTasks || []) {
    const cid = String((t as any).related_crew_id || "")
    const title = String((t as any).title || "").toLowerCase()
    if (!cid) continue
    if (title.startsWith("vragen naar functioneren")) hasFn.add(cid)
    if (title.startsWith("samenwerking doorzetten of stoppen")) hasSam.add(cid)
  }

  for (const raw of crew) {
    const m = raw as any
    const id = String(m.id || "")
    if (!id) continue

    const in0 = parseFlexibleDate(m.in_dienst_vanaf)
    if (!in0) continue
    const inStart = startOfDay(in0)

    const fnDue = startOfDay(addDays(inStart, 10))
    const samDue = startOfDay(addMonths(inStart, 2))

    const fnEligible = differenceInCalendarDays(today, fnDue) >= 0
    const samEligible = differenceInCalendarDays(today, samDue) >= 0

    const first = String(m.first_name || "").trim()
    const last = String(m.last_name || "").trim()

    const base = {
      task_type: "crew",
      related_crew_id: id,
      related_ship_id: normalizeShipId(m.ship_id),
      assigned_to: ASSIGNED,
      priority: "normaal",
      created_date: ymdToday,
      created_by: CREATED_BY,
      status: "open",
      completed: false,
    }

    if (fnEligible && !hasFn.has(id)) {
      const { error: insErr } = await supabase.from("tasks").insert([
        {
          ...base,
          title: titleFunctioneren(first, last),
          description: `Neem contact op met ${first} ${last} (en eventueel het schip) om na ongeveer 10 dienstdagen te vragen naar het functioneren.`,
          deadline: format(fnDue, "yyyy-MM-dd"),
        },
      ])
      if (insErr) errors.push(`${id} functioneren: ${insErr.message}`)
      else {
        createdFunctioneren++
        hasFn.add(id)
      }
    }

    if (samEligible && !hasSam.has(id)) {
      const { error: insErr } = await supabase.from("tasks").insert([
        {
          ...base,
          title: titleSamenwerking(first, last),
          description: `Beoordeel ongeveer twee maanden na indiensttreding of de samenwerking met ${first} ${last} wordt doorgezet of gestopt.`,
          deadline: format(samDue, "yyyy-MM-dd"),
        },
      ])
      if (insErr) errors.push(`${id} samenwerking: ${insErr.message}`)
      else {
        createdSamenwerking++
        hasSam.add(id)
      }
    }
  }

  return { createdFunctioneren, createdSamenwerking, errors }
}
