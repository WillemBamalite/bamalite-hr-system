import { format, isPast, isToday, startOfDay } from "date-fns"

export type DashboardNotificationSeverity = "info" | "warning" | "danger"
export type DashboardNotificationKind =
  | "probation"
  | "birthday"
  | "anniversary"
  | "certificate_expiring"
  | "task"
  | "ship_visit"
  | "luxembourg_pending_boarding"

export type DashboardNotification = {
  id: string
  kind: DashboardNotificationKind
  severity: DashboardNotificationSeverity
  title: string
  description?: string
  href?: string
  meta?: Record<string, unknown>
}

const toYmd = (d: Date) => format(d, "yyyy-MM-dd")

const parseFlexibleDate = (value: unknown): Date | null => {
  if (!value || typeof value !== "string") return null
  const raw = value.trim()
  if (!raw) return null

  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }

  // dd-MM-yyyy
  const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2]) - 1
    const year = Number(m[3])
    const d = new Date(year, month, day)
    if (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      d.getDate() === day &&
      !isNaN(d.getTime())
    ) {
      return d
    }
  }

  const fallback = new Date(raw)
  return isNaN(fallback.getTime()) ? null : fallback
}

export function buildDashboardNotifications(args: {
  crew: any[]
  tasks: any[]
  ships: any[]
  sickLeave: any[]
  visits: any[]
  getShipsNotVisitedInDays: (days: number, ships: any[]) => any[]
}) {
  const { crew, tasks, ships, sickLeave, visits, getShipsNotVisitedInDays } = args

  const today = startOfDay(new Date())
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()

  const notifications: DashboardNotification[] = []
  const isActiveCrewMember = (member: any) => {
    if (!member) return false
    if (member.is_dummy === true) return false
    if (String(member.status || "").toLowerCase() === "uit-dienst") return false
    return true
  }

  // Proeftijd aflopend (dag 70 = nog 20 dagen)
  const probationEnding =
    crew?.filter((member: any) => {
      if (!isActiveCrewMember(member)) return false
      if (member?.is_aflosser || !member?.in_dienst_vanaf) return false
      const startDate = parseFlexibleDate(member.in_dienst_vanaf)
      if (!startDate) return false
      if (isNaN(startDate.getTime())) return false
      startDate.setHours(0, 0, 0, 0)
      const diffTime = today.getTime() - startDate.getTime()
      const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return daysSinceStart === 70
    }) || []

  for (const member of probationEnding) {
    notifications.push({
      id: `probation:${member.id}:${toYmd(today)}`,
      kind: "probation",
      severity: "warning",
      title: "Proeftijd verloopt over 20 dagen",
      description: `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim(),
      href: member?.id ? `/bemanning/${member.id}` : undefined,
    })
  }

  // Verjaardagen vandaag
  const birthdaysToday =
    crew?.filter((member: any) => {
      if (!isActiveCrewMember(member)) return false
      if (!member?.birth_date) return false
      const bd = parseFlexibleDate(member.birth_date)
      if (!bd) return false
      if (isNaN(bd.getTime())) return false
      return bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay
    }) || []

  for (const member of birthdaysToday) {
    notifications.push({
      id: `birthday:${member.id}:${toYmd(today)}`,
      kind: "birthday",
      severity: "info",
      title: "Verjaardag",
      description: `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim(),
      href: member?.id ? `/bemanning/${member.id}` : undefined,
    })
  }

  // Dienstjubilea komende 7 dagen (zelfde regels als dashboard)
  const upcomingWorkAnniversaries = (() => {
    if (!crew || crew.length === 0) return []
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 6)
    const MS_PER_DAY = 24 * 60 * 60 * 1000

    const results: { member: any; years: number; daysUntil: number; date: Date }[] = []
    crew.forEach((member: any) => {
      if (!isActiveCrewMember(member)) return
      if (!member?.in_dienst_vanaf) return
      const start = parseFlexibleDate(member.in_dienst_vanaf)
      if (!start) return
      if (isNaN(start.getTime())) return
      start.setHours(0, 0, 0, 0)

      for (let years = 5; years <= 60; years++) {
        const isMilestone = years < 30 ? years % 5 === 0 : true
        if (!isMilestone) continue
        const anniversaryDate = new Date(start)
        anniversaryDate.setFullYear(start.getFullYear() + years)
        anniversaryDate.setHours(0, 0, 0, 0)

        if (anniversaryDate < today) continue
        if (anniversaryDate > maxDate) break

        const daysUntil = Math.round((anniversaryDate.getTime() - today.getTime()) / MS_PER_DAY)
        if (daysUntil >= 0 && daysUntil <= 6) {
          results.push({ member, years, daysUntil, date: anniversaryDate })
          break
        }
      }
    })

    results.sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
      const nameA = `${a.member?.last_name || ""} ${a.member?.first_name || ""}`.toLowerCase()
      const nameB = `${b.member?.last_name || ""} ${b.member?.first_name || ""}`.toLowerCase()
      return nameA.localeCompare(nameB)
    })
    return results
  })()

  for (const item of upcomingWorkAnniversaries) {
    notifications.push({
      id: `anniversary:${item.member.id}:${item.years}:${toYmd(item.date)}`,
      kind: "anniversary",
      severity: "info",
      title: `Dienstjubileum: ${item.years} jaar`,
      description: `${item.member.first_name ?? ""} ${item.member.last_name ?? ""}`.trim(),
      href: item.member?.id ? `/bemanning/${item.member.id}` : undefined,
      meta: { daysUntil: item.daysUntil },
    })
  }

  // Ziektebriefjes die over 3 dagen verlopen (en waar nog geen e-mail is verstuurd)
  const expiringCertificates =
    (sickLeave || [])
      .filter((record: any) => {
        if (!record?.certificate_valid_until) return false
        if (record.status !== "actief" && record.status !== "wacht-op-briefje") return false
        const validUntil = parseFlexibleDate(record.certificate_valid_until)
        if (!validUntil) return false
        if (isNaN(validUntil.getTime())) return false
        validUntil.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 3
      })
      .map((record: any) => {
        const crewMember = (crew || []).find((c: any) => c.id === record.crew_member_id)
        const validUntil = parseFlexibleDate(record.certificate_valid_until) || new Date()
        validUntil.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const sentAt = parseFlexibleDate(record.expiry_email_sent_at)
        const reminderWindowStart = new Date(validUntil)
        reminderWindowStart.setDate(reminderWindowStart.getDate() - 3)
        reminderWindowStart.setHours(0, 0, 0, 0)
        // Alleen "mail al verstuurd" als de verzending binnen de huidige reminder-window ligt.
        // Zo kan bij een nieuwe/veranderde geldigheidsdatum opnieuw gemaild worden.
        const mailSentForCurrentExpiry =
          !!sentAt && sentAt.getTime() >= reminderWindowStart.getTime() && sentAt.getTime() <= validUntil.getTime()
        return {
          record,
          crewMember,
          validUntil,
          daysUntilExpiry,
          mailSent: mailSentForCurrentExpiry,
        }
      })
      .filter((x: any) => x.crewMember) || []

  for (const item of expiringCertificates) {
    const name = `${item.crewMember.first_name ?? ""} ${item.crewMember.last_name ?? ""}`.trim()
    const title =
      item.daysUntilExpiry === 0
        ? "Ziektebriefje verloopt vandaag"
        : `Ziektebriefje verloopt over ${item.daysUntilExpiry} ${
            item.daysUntilExpiry === 1 ? "dag" : "dagen"
          }`
    notifications.push({
      id: `certificate:${item.record.id}:${toYmd(item.validUntil)}`,
      kind: "certificate_expiring",
      severity: item.mailSent ? "info" : "warning",
      title,
      description: `${name} – verloopt op ${format(item.validUntil, "dd-MM-yyyy")}`,
      href: item.crewMember?.id ? `/bemanning/${item.crewMember.id}` : undefined,
      meta: {
        sickLeaveId: item.record.id,
        crewName: name,
        recipientEmail: item.crewMember?.email || null,
        expiryDate: format(item.validUntil, "dd-MM-yyyy"),
        expiryDateForPDF: format(item.validUntil, "dd-MM-yyyy"),
        daysUntilExpiry: item.daysUntilExpiry,
        mailSent: item.mailSent,
        mailSentAt: item.record.expiry_email_sent_at || null,
      },
    })
  }

  // Urgente taken en taken met verlopen deadline (blijven in meldingen tot opgelost)
  const urgentTasks =
    (tasks || []).filter((task: any) => {
      if (task?.status === "completed" || task?.completed === true) return false
      if (task?.priority === "urgent") return true
      if (task?.deadline) {
        const parsedDeadline = parseFlexibleDate(task.deadline)
        if (!parsedDeadline) return false
        const deadlineDate = startOfDay(parsedDeadline)
        if (isNaN(deadlineDate.getTime())) return false
        if (isPast(deadlineDate) || isToday(deadlineDate)) return true
      }
      return false
    }) || []

  for (const task of urgentTasks) {
    const isUrgent = task?.priority === "urgent"
    const parsedDeadline = task?.deadline ? parseFlexibleDate(task.deadline) : null
    const hasExpiredDeadline =
      !!parsedDeadline && (isPast(startOfDay(parsedDeadline)) || isToday(startOfDay(parsedDeadline)))
    notifications.push({
      id: `task:${task.id}`,
      kind: "task",
      severity: isUrgent ? "danger" : hasExpiredDeadline ? "warning" : "info",
      title: isUrgent ? "URGENT taak" : "Taak met (bijna) verlopen deadline",
      description: task?.title || "Taak",
      href: task?.id ? `/taken?taskId=${task.id}` : "/taken",
      meta: { deadline: task?.deadline || null },
    })
  }

  // Scheepsbezoek meldingen >50 dagen
  const shipsNotVisited50Days = ships?.length ? getShipsNotVisitedInDays(50, ships) : []

  const getUnvisitedPloegen = (shipId: string): ("A" | "B")[] => {
    if (!visits) return ["A", "B"]
    const shipVisits = visits.filter((v: any) => v.ship_id === shipId)
    const today0 = new Date()
    today0.setHours(0, 0, 0, 0)

    const unvisited: ("A" | "B")[] = []
    const check = (ploeg: "A" | "B") => {
      const ploegVisits = shipVisits
        .filter((v: any) => v.ploeg === ploeg)
        .sort((a: any, b: any) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
      const last = ploegVisits[0]
      if (!last) {
        unvisited.push(ploeg)
        return
      }
      const vd = new Date(last.visit_date)
      if (isNaN(vd.getTime())) {
        unvisited.push(ploeg)
        return
      }
      vd.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today0.getTime() - vd.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays >= 50) unvisited.push(ploeg)
    }
    check("A")
    check("B")
    return unvisited
  }

  for (const ship of shipsNotVisited50Days || []) {
    const unvisited = getUnvisitedPloegen(ship.id)
    let detail = ""
    if (unvisited.length === 2) detail = "Ploeg A en B"
    else if (unvisited.length === 1) detail = `Ploeg ${unvisited[0]}`
    notifications.push({
      id: `ship_visit:${ship.id}`,
      kind: "ship_visit",
      severity: "warning",
      title: "Scheepsbezoek nodig (>50 dagen)",
      description: `${ship.name}${detail ? ` – ${detail}` : ""}`,
      href: "/schepen/bezoeken",
      meta: { shipId: ship.id, unvisitedPloegen: unvisited },
    })
  }

  // Nieuw personeel: binnen 7 dagen aan boord maar nog niet ingeschreven in Luxembourg
  const hasAssignedShip = (member: any) =>
    !!member?.ship_id && member.ship_id !== "none" && member.ship_id !== ""

  const luxembourgPendingBoarding = (crew || [])
    .filter((member: any) => {
      if (!isActiveCrewMember(member)) return false
      if (member?.is_aflosser === true) return false
      if (member?.recruitment_status !== "aangenomen") return false
      if (!hasAssignedShip(member)) return false
      if (member?.ingeschreven_luxembourg === true) return false

      const status = String(member?.status || "").toLowerCase()
      if (status === "aan-boord") return false

      const expectedStart = parseFlexibleDate(member?.expected_start_date)
      if (!expectedStart) return false

      expectedStart.setHours(0, 0, 0, 0)
      const daysUntilBoarding = Math.ceil((expectedStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilBoarding >= 0 && daysUntilBoarding <= 7
    })
    .map((member: any) => {
      const expectedStart = parseFlexibleDate(member?.expected_start_date) || today
      expectedStart.setHours(0, 0, 0, 0)
      const daysUntilBoarding = Math.ceil((expectedStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const ship = (ships || []).find((s: any) => s.id === member.ship_id)
      return { member, expectedStart, daysUntilBoarding, shipName: ship?.name || "Onbekend schip" }
    })

  for (const item of luxembourgPendingBoarding) {
    const name = `${item.member.first_name ?? ""} ${item.member.last_name ?? ""}`.trim()
    const dayText =
      item.daysUntilBoarding === 0
        ? "vandaag"
        : `over ${item.daysUntilBoarding} ${item.daysUntilBoarding === 1 ? "dag" : "dagen"}`

    notifications.push({
      id: `luxembourg_pending_boarding:${item.member.id}:${toYmd(item.expectedStart)}`,
      kind: "luxembourg_pending_boarding",
      severity: "warning",
      title: "Niet ingeschreven in Luxembourg (bijna aan boord)",
      description: `${name} gaat ${dayText} aan boord op ${item.shipName} (${format(item.expectedStart, "dd-MM-yyyy")})`,
      href: "/bemanning/nog-in-te-delen",
      meta: {
        crewId: item.member.id,
        shipId: item.member.ship_id,
        expectedStartDate: toYmd(item.expectedStart),
        daysUntilBoarding: item.daysUntilBoarding,
      },
    })
  }

  // Sorteer: danger -> warning -> info, daarna op titel
  const severityRank: Record<DashboardNotificationSeverity, number> = {
    danger: 0,
    warning: 1,
    info: 2,
  }
  notifications.sort((a, b) => {
    const r = severityRank[a.severity] - severityRank[b.severity]
    if (r !== 0) return r
    return a.title.localeCompare(b.title)
  })

  return notifications
}

