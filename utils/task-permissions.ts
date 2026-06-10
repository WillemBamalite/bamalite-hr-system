export const TASK_ASSIGNEES = [
  "Nautic",
  "Leo",
  "Willem",
  "Jos",
  "Bart",
  "Dunja",
  "Karina",
] as const

export type TaskAssignee = (typeof TASK_ASSIGNEES)[number]

const TASK_MANAGER_EMAILS = new Set([
  "leo@bamalite.com",
  "willem@bamalite.com",
  "bart@bamalite.com",
  "jos@bamalite.com",
])

const TASK_OFFICE_EMAIL_TO_ASSIGNEE: Record<string, TaskAssignee> = {
  "dunja@bamalite.com": "Dunja",
  "karina@bamalite.com": "Karina",
}

/** Tabs op de takenpagina voor management. */
export const MANAGEMENT_TASK_TABS: TaskAssignee[] = [
  "Nautic",
  "Leo",
  "Willem",
  "Jos",
  "Bart",
  "Dunja",
  "Karina",
]

/** Dunja en Karina mogen taken aan elkaar en zichzelf toewijzen. */
export const OFFICE_TASK_ASSIGNEES: TaskAssignee[] = ["Dunja", "Karina"]

export const ASSIGNEE_EMAIL_MAP: Record<string, string> = {
  nautic: "nautic@bamalite.com",
  leo: "leo@bamalite.com",
  willem: "willem@bamalite.com",
  jos: "jos@bamalite.com",
  bart: "bart@bamalite.com",
  dunja: "dunja@bamalite.com",
  karina: "karina@bamalite.com",
}

export function normalizeEmail(email?: string | null): string {
  return String(email || "").trim().toLowerCase()
}

export function isTaskManagementUser(email?: string | null): boolean {
  return TASK_MANAGER_EMAILS.has(normalizeEmail(email))
}

export function isTaskOfficeUser(email?: string | null): boolean {
  return normalizeEmail(email) in TASK_OFFICE_EMAIL_TO_ASSIGNEE
}

export function canAccessTasksPage(email?: string | null): boolean {
  const e = normalizeEmail(email)
  return isTaskManagementUser(e) || isTaskOfficeUser(e)
}

export function getTaskAssigneeForEmail(email?: string | null): TaskAssignee | null {
  const e = normalizeEmail(email)
  if (TASK_OFFICE_EMAIL_TO_ASSIGNEE[e]) return TASK_OFFICE_EMAIL_TO_ASSIGNEE[e]
  if (e.includes("leo")) return "Leo"
  if (e.includes("willem")) return "Willem"
  if (e.includes("jos")) return "Jos"
  if (e.includes("bart")) return "Bart"
  if (e.includes("nautic")) return "Nautic"
  return null
}

export function resolveAssigneeFromEmail(email?: string | null): TaskAssignee | null {
  const e = normalizeEmail(email)
  if (!e) return null
  if (TASK_OFFICE_EMAIL_TO_ASSIGNEE[e]) return TASK_OFFICE_EMAIL_TO_ASSIGNEE[e]
  if (e.includes("nautic")) return "Nautic"
  if (e.includes("leo")) return "Leo"
  if (e.includes("willem")) return "Willem"
  if (e.includes("jos")) return "Jos"
  if (e.includes("bart")) return "Bart"
  if (e.includes("dunja")) return "Dunja"
  if (e.includes("karina")) return "Karina"
  return null
}

export function isOfficeAssignableAssignee(assignee: string): boolean {
  return OFFICE_TASK_ASSIGNEES.includes(assignee as TaskAssignee)
}

export function isTaskAssignedToViewer(
  viewerEmail: string | null | undefined,
  task: { assigned_to?: string | null }
): boolean {
  const self = getTaskAssigneeForEmail(viewerEmail)
  return Boolean(self && String(task?.assigned_to || "") === self)
}

export function isTaskDelegatedByViewer(
  viewerEmail: string | null | undefined,
  task: { assigned_to?: string | null; created_by?: string | null }
): boolean {
  if (!isTaskOfficeUser(viewerEmail)) return false
  const self = getTaskAssigneeForEmail(viewerEmail)
  if (!self) return false
  return (
    normalizeEmail(task?.created_by) === normalizeEmail(viewerEmail) &&
    String(task?.assigned_to || "") !== self &&
    isOfficeAssignableAssignee(String(task?.assigned_to || ""))
  )
}

export function canViewTask(
  viewerEmail: string | null | undefined,
  task: { assigned_to?: string | null; created_by?: string | null }
): boolean {
  const viewer = normalizeEmail(viewerEmail)
  if (isTaskManagementUser(viewer)) return true
  if (!getTaskAssigneeForEmail(viewer)) return false
  return isTaskAssignedToViewer(viewer, task) || isTaskDelegatedByViewer(viewer, task)
}

export function canManageTask(
  viewerEmail: string | null | undefined,
  task: { assigned_to?: string | null }
): boolean {
  const viewer = normalizeEmail(viewerEmail)
  if (isTaskManagementUser(viewer)) return true
  return isTaskAssignedToViewer(viewer, task)
}

export function canAssignTaskTo(viewerEmail: string | null | undefined, assignee: string): boolean {
  const viewer = normalizeEmail(viewerEmail)
  if (isTaskManagementUser(viewer)) {
    return TASK_ASSIGNEES.includes(assignee as TaskAssignee)
  }
  if (isTaskOfficeUser(viewer)) {
    return isOfficeAssignableAssignee(assignee)
  }
  return false
}

export function getVisibleAssigneeTabs(email?: string | null): TaskAssignee[] {
  if (isTaskManagementUser(email)) return [...MANAGEMENT_TASK_TABS]
  const self = getTaskAssigneeForEmail(email)
  return self ? [self] : []
}

export function getCreatableAssignees(email?: string | null): TaskAssignee[] {
  if (isTaskManagementUser(email)) return [...TASK_ASSIGNEES]
  if (isTaskOfficeUser(email)) return [...OFFICE_TASK_ASSIGNEES]
  return []
}

export function filterTasksForViewer<
  T extends { assigned_to?: string | null; created_by?: string | null },
>(tasks: T[], viewerEmail?: string | null): T[] {
  const viewer = normalizeEmail(viewerEmail)
  if (isTaskManagementUser(viewer)) return tasks
  if (!getTaskAssigneeForEmail(viewer)) return []
  return tasks.filter((t) => canViewTask(viewer, t))
}

export function filterReceivedTasksForOfficeViewer<
  T extends { assigned_to?: string | null },
>(tasks: T[], viewerEmail?: string | null): T[] {
  const self = getTaskAssigneeForEmail(viewerEmail)
  if (!self) return []
  return tasks.filter((t) => String(t.assigned_to || "") === self)
}

export function filterDelegatedTasksForOfficeViewer<
  T extends { assigned_to?: string | null; created_by?: string | null },
>(tasks: T[], viewerEmail?: string | null): T[] {
  return tasks.filter((t) => isTaskDelegatedByViewer(viewerEmail, t))
}

export function getAssigneeEmail(assignee: string): string | null {
  return ASSIGNEE_EMAIL_MAP[String(assignee || "").toLowerCase().trim()] || null
}
