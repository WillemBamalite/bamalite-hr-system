import { endOfMonth, format, subMonths } from "date-fns"
import { nl } from "date-fns/locale"

/**
 * Wie in welke lijst komt, blijft gelijk aan de bestaande nieuwsbrief.
 * Alleen de extra velden (datumlabel, schip, jaren) zijn voor de krantweergave.
 */
export type NewsletterPerson = {
  id: string
  fullName: string
  shipName: string
  detail: string
  sortDateValue?: number
  years?: number
  dateLabel?: string
  dayLabel?: string
}

export type NewsletterEvents = {
  leaving: NewsletterPerson[]
  joining: NewsletterPerson[]
  anniversaries: NewsletterPerson[]
  birthdays: NewsletterPerson[]
}

export const parseFlexibleDate = (value: unknown): Date | null => {
  if (!value || typeof value !== "string") return null
  const raw = value.trim()
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [ys, ms, ds] = raw.slice(0, 10).split("-")
    const year = Number(ys)
    const month = Number(ms) - 1
    const day = Number(ds)
    const d = new Date(year, month, day)
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day && !isNaN(d.getTime())) return d
    return null
  }

  const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2]) - 1
    const year = Number(m[3])
    const d = new Date(year, month, day)
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day && !isNaN(d.getTime())) {
      return d
    }
  }

  const fallback = new Date(raw)
  return isNaN(fallback.getTime()) ? null : fallback
}

const inSameMonth = (date: Date, month: Date) =>
  date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()

/** De krant komt op de 1e uit, dus de cijfers zijn van de maand ervoor. */
export function figuresMonthLabel(editionMonth: Date) {
  const previous = subMonths(editionMonth, 1)
  const sameYear = previous.getFullYear() === editionMonth.getFullYear()
  const name = format(previous, sameYear ? "MMMM" : "MMMM yyyy", { locale: nl })
  const titled = name.charAt(0).toUpperCase() + name.slice(1)
  return `${titled} in cijfers`
}

export function buildNewsletterEvents(crew: any[] | null | undefined, ships: any[] | null | undefined, selectedMonth: Date): NewsletterEvents {
  const shipNameById = new Map<string, string>()
  ;(ships || []).forEach((ship: any) => shipNameById.set(String(ship.id), String(ship.name || "").trim()))

  const leaving: NewsletterPerson[] = []
  const joining: NewsletterPerson[] = []
  const anniversaries: NewsletterPerson[] = []
  const birthdays: NewsletterPerson[] = []
  const selectedMonthEnd = endOfMonth(selectedMonth)

  ;(crew || []).forEach((member: any) => {
    if (!member || member.is_dummy) return
    const fullName = `${member.first_name || ""} ${member.last_name || ""}`.replace(/\s+/g, " ").trim()
    const shipName = shipNameById.get(String(member.ship_id || "")) || ""

    const outDate = parseFlexibleDate(member.out_of_service_date)
    if (outDate && inSameMonth(outDate, selectedMonth)) {
      leaving.push({
        id: `leave-${member.id}`,
        fullName,
        shipName,
        detail: "",
      })
    }
    const statusValue = String(member.status || "").toLowerCase().trim()
    const isStatusOut = statusValue === "uit-dienst" || statusValue === "uit dienst"
    const leftOnOrBeforeMonthEnd = Boolean(outDate && outDate.getTime() <= selectedMonthEnd.getTime())
    if (isStatusOut || leftOnOrBeforeMonthEnd) return

    const inDate = parseFlexibleDate(member.in_dienst_vanaf)
    const joinsAfterMonthEnd = Boolean(inDate && inDate.getTime() > selectedMonthEnd.getTime())
    if (joinsAfterMonthEnd) return

    if (inDate && inSameMonth(inDate, selectedMonth)) {
      joining.push({
        id: `join-${member.id}`,
        fullName,
        shipName,
        detail: `${format(inDate, "dd-MM-yyyy")} • ${shipName || "Geen schip"}`,
        sortDateValue: inDate.getTime(),
        dateLabel: format(inDate, "d MMMM", { locale: nl }),
      })
    }

    if (inDate) {
      const years = selectedMonth.getFullYear() - inDate.getFullYear()
      const milestone = years >= 5 && (years < 30 ? years % 5 === 0 : true)
      if (milestone) {
        const anniversaryDate = new Date(inDate)
        anniversaryDate.setFullYear(selectedMonth.getFullYear())
        if (inSameMonth(anniversaryDate, selectedMonth)) {
          anniversaries.push({
            id: `ann-${member.id}-${years}`,
            fullName,
            shipName,
            years,
            detail: `${years} jaar • ${format(anniversaryDate, "dd-MM-yyyy")}`,
            dateLabel: format(anniversaryDate, "d MMMM", { locale: nl }),
          })
        }
      }
    }

    const birthDate = parseFlexibleDate(member.birth_date)
    if (birthDate) {
      const birthdayThisYear = new Date(selectedMonth.getFullYear(), birthDate.getMonth(), birthDate.getDate())
      if (inSameMonth(birthdayThisYear, selectedMonth)) {
        birthdays.push({
          id: `bd-${member.id}`,
          fullName,
          shipName,
          detail: format(birthdayThisYear, "dd-MM"),
          sortDateValue: birthdayThisYear.getTime(),
          dayLabel: format(birthdayThisYear, "dd MMM", { locale: nl }).replace(".", ""),
        })
      }
    }
  })

  const byName = (a: NewsletterPerson, b: NewsletterPerson) => a.fullName.localeCompare(b.fullName, "nl")
  const byDateThenName = (a: NewsletterPerson, b: NewsletterPerson) => {
    const d = (a.sortDateValue || 0) - (b.sortDateValue || 0)
    if (d !== 0) return d
    return byName(a, b)
  }
  leaving.sort(byName)
  joining.sort(byDateThenName)
  anniversaries.sort(byName)
  birthdays.sort(byDateThenName)

  return { leaving, joining, anniversaries, birthdays }
}
