export function isCopiedCrewMember(member: any): boolean {
  const notePool = [
    ...(Array.isArray(member?.active_notes) ? member.active_notes : []),
    ...(Array.isArray(member?.notes) ? member.notes : []),
  ]

  return notePool.some((n: any) => {
    const content = String(n?.content || n?.text || n || "")
    return content.startsWith("COPIED_FROM:") || content.startsWith("Gekopieerd van:")
  })
}

function toDateOnly(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Parse crew date fields (ISO, YYYY-MM-DD, DD-MM-YYYY). */
export function parseCrewDate(value: unknown): Date | null {
  const raw = String(value || "").trim()
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(`${raw.slice(0, 10)}T12:00:00`)
    return isNaN(d.getTime()) ? null : d
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split("-")
    const d = new Date(`${year}-${month}-${day}T12:00:00`)
    return isNaN(d.getTime()) ? null : d
  }

  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

export function getMonthKeyFromDate(value: unknown): string | null {
  const d = parseCrewDate(value)
  if (!d) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/**
 * Uit dienst telt pas vanaf de dag ná out_of_service_date.
 * Zonder datum: direct uit dienst (oude gedrag).
 */
export function isEffectivelyOutOfService(member: any, asOf: Date = new Date()): boolean {
  if (String(member?.status || "").toLowerCase() !== "uit-dienst") return false
  const out = parseCrewDate(member?.out_of_service_date)
  if (!out) return true
  return toDateOnly(asOf) > toDateOnly(out)
}

/** Salarismaand: uitgesloten als de maand ná de uit-dienst-maand ligt. */
export function isExcludedFromSalaryMonth(member: any, selectedMonthKey: string): boolean {
  if (String(member?.status || "").toLowerCase() !== "uit-dienst") return false
  const outMonth = getMonthKeyFromDate(member?.out_of_service_date)
  if (!outMonth) return true
  return selectedMonthKey > outMonth
}

export function isRealCrewMember(member: any, asOf?: Date): boolean {
  if (!member) return false
  if (isEffectivelyOutOfService(member, asOf ?? new Date())) return false
  if (member.is_dummy === true) return false
  if (isCopiedCrewMember(member)) return false
  return true
}

const RECRUITMENT_PIPELINE_SUB_STATUSES = [
  "nog-te-benaderen",
  "benaderen",
  "potentie",
  "in-gesprek",
  "kennismaking-gepland",
]

export function isAflosserMember(member: any): boolean {
  if (!member) return false
  const position = String(member.position || "").toLowerCase()
  return position === "aflosser" || member.is_aflosser === true
}

/** Aflosser in vaste dienst — telt wél mee in totaal bemanningsleden. */
export function isVasteAflosser(member: any): boolean {
  return isAflosserMember(member) && member?.vaste_dienst === true
}

/** Uitzendbureau-, zelfstandige- en losse aflossers (niet in totaal bemanningsleden). */
export function isExcludedReliefCrew(member: any): boolean {
  if (!member) return false
  if (isVasteAflosser(member)) return false
  if (member.is_uitzendbureau === true) return true
  if (member.is_zelfstandig === true) return true
  if (isAflosserMember(member)) return true
  return false
}

/** Kandidaten, later-terugkomen, geen-interesse, nog-in-te-delen zonder aanname. */
export function isInRecruitmentPipeline(member: any): boolean {
  if (!member) return false
  if (member.sub_status === "later-terugkomen") return true
  if (member.recruitment_status === "geen-interesse") return true
  if (member.recruitment_status && member.recruitment_status !== "aangenomen") return true
  if (member.status === "nog-in-te-delen" && member.recruitment_status !== "aangenomen") return true
  if (
    member.sub_status &&
    RECRUITMENT_PIPELINE_SUB_STATUSES.includes(member.sub_status) &&
    member.recruitment_status !== "aangenomen"
  ) {
    return true
  }
  return false
}

/**
 * Actieve vaste bemanning (+ aflossers in vaste dienst) voor dashboard-totaal en overzicht:
 * geen uit-dienst (tenzij uit-dienstdatum nog in de toekomst), geen werving zonder contract, etc.
 */
export function countsAsTotalCrewMember(member: any, asOf?: Date): boolean {
  if (!isRealCrewMember(member, asOf)) return false
  if (isExcludedReliefCrew(member)) return false
  if (!isVasteAflosser(member) && isInRecruitmentPipeline(member)) return false
  if (member.arbeidsovereenkomst !== true) return false
  return true
}
