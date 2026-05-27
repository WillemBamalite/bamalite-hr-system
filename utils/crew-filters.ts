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

export function isRealCrewMember(member: any): boolean {
  if (!member) return false
  if (member.status === "uit-dienst") return false
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
 * geen uit-dienst, uitzend/zelfstandige aflossers, wervingskandidaten of zonder contract.
 */
export function countsAsTotalCrewMember(member: any): boolean {
  if (!isRealCrewMember(member)) return false
  if (isExcludedReliefCrew(member)) return false
  if (!isVasteAflosser(member) && isInRecruitmentPipeline(member)) return false
  if (member.arbeidsovereenkomst !== true) return false
  return true
}
