export const CLOTHING_ALLOWANCE_FIXED = 25

/** Standaard Nee tot iemand in Salaris bewerken Ja zet. */
const NO_CLOTHING_ALLOWANCE_NAMES = [
  "tania growen",
  "lucie grognard",
  "jos meijer",
  "bart bruinsma",
  "sandra rodrigues",
  "pawel ekowski",
  "tomasz bryniczka",
  "gijsbert van horssen",
  "leo godde",
  "willem van der bent",
]

const normalizePersonName = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")

export const getCrewFullName = (crewMember: any): string =>
  normalizePersonName(`${crewMember?.first_name || ""} ${crewMember?.last_name || ""}`)

export function crewHasNoClothingAllowanceDefault(crewMember: any): boolean {
  const fullName = getCrewFullName(crewMember)
  if (fullName && NO_CLOTHING_ALLOWANCE_NAMES.includes(fullName)) return true
  const email = String(crewMember?.email || "").trim().toLowerCase()
  return email === "tanja@bamalite.com"
}

/** Ja/Nee uit salarisregel; anders standaard op naam. */
export function resolveClothingAllowanceEnabled(
  crewMember: any,
  clothingAllowance: boolean | null | undefined
): boolean {
  if (typeof clothingAllowance === "boolean") return clothingAllowance
  return !crewHasNoClothingAllowanceDefault(crewMember)
}

export function resolveClothingAllowanceAmount(
  crewMember: any,
  clothingAllowance: boolean | null | undefined
): number {
  return resolveClothingAllowanceEnabled(crewMember, clothingAllowance)
    ? CLOTHING_ALLOWANCE_FIXED
    : 0
}
