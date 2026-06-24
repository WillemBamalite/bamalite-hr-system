import { format, startOfDay, startOfMonth } from "date-fns"
import { nl } from "date-fns/locale"
import { parseFlexibleDate } from "@/utils/dashboard-notifications"
import { isActiveForCelebrations } from "@/utils/crew-filters"

export type OfficeBirthdayItem = {
  id: string
  crewId: string
  fullName: string
  day: number
  age: number
}

export type OfficeAnniversaryItem = {
  id: string
  crewId: string
  fullName: string
  years: number
  dateLabel: string
  sortDay: number
}

/** Verjaardagen en dienstjubilea in de gekozen kalendermaand. */
export function buildOfficeCelebrationsForMonth(
  crew: any[],
  month: Date = startOfMonth(new Date())
): { birthdays: OfficeBirthdayItem[]; anniversaries: OfficeAnniversaryItem[] } {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const today = startOfDay(new Date())
  const birthdays: OfficeBirthdayItem[] = []
  const anniversaries: OfficeAnniversaryItem[] = []

  for (const member of crew || []) {
    if (!isActiveForCelebrations(member, today)) continue

    const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim()
    if (!fullName) continue

    const birthDate = parseFlexibleDate(member.birth_date)
    if (birthDate && birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate()) {
      birthdays.push({
        id: `birthday-${member.id}`,
        crewId: String(member.id),
        fullName,
        day: birthDate.getDate(),
        age: today.getFullYear() - birthDate.getFullYear(),
      })
    }

    const startDate = parseFlexibleDate(member.in_dienst_vanaf)
    if (!startDate) continue
    startDate.setHours(0, 0, 0, 0)

    const years = year - startDate.getFullYear()
    if (years < 5 || years > 60) continue
    const isMilestone = years < 30 ? years % 5 === 0 : true
    if (!isMilestone) continue

    const anniversaryDate = new Date(startDate)
    anniversaryDate.setFullYear(year)
    anniversaryDate.setHours(0, 0, 0, 0)

    if (anniversaryDate.getMonth() !== monthIndex) continue

    anniversaries.push({
      id: `anniversary-${member.id}-${years}`,
      crewId: String(member.id),
      fullName,
      years,
      dateLabel: format(anniversaryDate, "dd-MM-yyyy"),
      sortDay: anniversaryDate.getDate(),
    })
  }

  birthdays.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day
    return a.fullName.localeCompare(b.fullName, "nl")
  })

  anniversaries.sort((a, b) => {
    if (a.sortDay !== b.sortDay) return a.sortDay - b.sortDay
    return a.fullName.localeCompare(b.fullName, "nl")
  })

  return { birthdays, anniversaries }
}

export function getOfficeCelebrationsMonthLabel(month: Date = startOfMonth(new Date())): string {
  return format(month, "MMMM yyyy", { locale: nl })
}
