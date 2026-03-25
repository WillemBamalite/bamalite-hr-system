import { format, isPast, isToday, startOfDay } from "date-fns"

export type DashboardNotificationSeverity = "info" | "warning" | "danger"
export type DashboardNotificationKind =
  | "probation"
  | "birthday"
  | "anniversary"
  | "certificate_expiring"
  | "task"
  | "ship_visit"

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
      const startDate = new Date(member.in_dienst_vanaf)
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
      const bd = new Date(member.birth_date)
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
      const start = new Date(member.in_dienst_vanaf)
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
        if (record.expiry_email_sent_at) return false
        const validUntil = new Date(record.certificate_valid_until)
        if (isNaN(validUntil.getTime())) return false
        validUntil.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry === 3
      })
      .map((record: any) => {
        const crewMember = (crew || []).find((c: any) => c.id === record.crew_member_id)
        const validUntil = new Date(record.certificate_valid_until)
        validUntil.setHours(0, 0, 0, 0)
        return { record, crewMember, validUntil }
      })
      .filter((x: any) => x.crewMember) || []

  for (const item of expiringCertificates) {
    const name = `${item.crewMember.first_name ?? ""} ${item.crewMember.last_name ?? ""}`.trim()
    notifications.push({
      id: `certificate:${item.record.id}:${toYmd(item.validUntil)}`,
      kind: "certificate_expiring",
      severity: "warning",
      title: "Ziektebriefje verloopt over 3 dagen",
      description: `${name} – verloopt op ${format(item.validUntil, "dd-MM-yyyy")}`,
      href: item.crewMember?.id ? `/bemanning/${item.crewMember.id}` : undefined,
    })
  }

  // Urgente taken en taken met verlopen deadline (blijven in meldingen tot opgelost)
  const urgentTasks =
    (tasks || []).filter((task: any) => {
      if (task?.status === "completed" || task?.completed === true) return false
      if (task?.priority === "urgent") return true
      if (task?.deadline) {
        const deadlineDate = startOfDay(new Date(task.deadline))
        if (isNaN(deadlineDate.getTime())) return false
        if (isPast(deadlineDate) || isToday(deadlineDate)) return true
      }
      return false
    }) || []

  for (const task of urgentTasks) {
    const isUrgent = task?.priority === "urgent"
    const hasExpiredDeadline =
      !!task?.deadline &&
      (isPast(startOfDay(new Date(task.deadline))) || isToday(startOfDay(new Date(task.deadline))))
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

