/** Vaste werkgevergegevens (zelfde voor alle firma's). */
export const LUXEMBOURG_EMPLOYER_ADDRESS = {
  street: "Duarrefstrooss 15A",
  postalCode: "L-9990",
  city: "Weiswampach",
  country: "LU",
  countryLabel: "Luxembourg",
} as const

/** Vast telefoonnummer werkgever (re_tel bovenaan het formulier). */
export const LUXEMBOURG_EMPLOYER_PHONE = "691143034"

/** Landen waar activiteit wordt uitgeoefend (vinkjes op het CCSS-formulier). */
export const A1_ACTIVITY_COUNTRY_CHECKBOXES = [
  "Land0.0.0", // Luxembourg [LU]
  "Land0.0.1", // Belgique [BE]
  "Land0.0.2", // Allemagne [DE]
  "Land0.0.3", // France [FR]
  "Land0.0.4", // Pays-Bas [NL]
  "Land0.1.2", // Suisse [CH] — niet Land0.6.0 (dat is Slovaquie)
] as const

/** CCSS-matricule per werkgever (re_mat op het formulier). */
export const COMPANY_CCSS_MATRICULE: Record<string, string> = {
  "Bamalite S.A.": "19932206865",
  "Alcina S.A.": "20072217234",
  "Brugo Shipping SARL.": "20232422859",
  "Devel Shipping S.A.": "20082214101",
  "Europe Shipping AG.": "20012221607",
}

export function getCompanyCcssMatricule(company: string | null | undefined): string | null {
  const raw = String(company || "").trim()
  if (!raw) return null
  if (COMPANY_CCSS_MATRICULE[raw]) return COMPANY_CCSS_MATRICULE[raw]
  const norm = raw.toLowerCase().replace(/[\s.]/g, "")
  for (const [key, value] of Object.entries(COMPANY_CCSS_MATRICULE)) {
    if (key.toLowerCase().replace(/[\s.]/g, "") === norm) return value
  }
  return null
}

function normalizeCompanyName(company: string): string {
  return company.trim().toLowerCase().replace(/[\s.]/g, "")
}

/** Zelfde firma (ook bij kleine schrijfverschillen). */
export function companiesMatchForA1(
  companyA: string | null | undefined,
  companyB: string | null | undefined
): boolean {
  const a = String(companyA || "").trim()
  const b = String(companyB || "").trim()
  if (!a || !b) return true
  if (a === b) return true
  const knownA = getCompanyCcssMatricule(a)
  const knownB = getCompanyCcssMatricule(b)
  if (knownA && knownB) return knownA === knownB
  return normalizeCompanyName(a) === normalizeCompanyName(b)
}

/** Bemanningslid staat op schip van andere firma (nog niet omgezet via Firma Wisseling). */
export function isCrewShipCompanyMismatch(
  memberCompany: string | null | undefined,
  shipCompany: string | null | undefined
): boolean {
  const member = String(memberCompany || "").trim()
  const ship = String(shipCompany || "").trim()
  if (!member || !ship) return false
  return !companiesMatchForA1(member, ship)
}

/** Werkgever-matricule op het formulier (basis + suffix 99). */
export function getCompanyCcssMatriculeForForm(company: string | null | undefined): string | null {
  const base = getCompanyCcssMatricule(company)
  if (!base) return null
  return base.endsWith("99") ? base : `${base}99`
}

/** Dekkingsperiode: 1 juli t/m 31 juni (aanvraag in jan–jun hoort bij lopend seizoen). */
export function getA1CoveragePeriod(referenceDate = new Date()): {
  start: Date
  endDay: number
  endMonth: number
  endYear: number
} {
  const year = referenceDate.getFullYear()
  const coverageStartYear = referenceDate.getMonth() >= 6 ? year : year - 1
  return {
    start: new Date(coverageStartYear, 6, 1),
    endDay: 31,
    endMonth: 6,
    endYear: coverageStartYear + 1,
  }
}

/** Schepen waar schipscertificaten (PDF) nog niet in de map staan. */
export const SHIPS_WITHOUT_A1_CERTIFICATE_PDFS = new Set(["voluntas"])

export const A1_FORM_TEMPLATE_PATH =
  "/forms/luxembourg-a1/ccss-formulaire-activites-etranger-batelierrhenan-FR (9).pdf"

export const A1_SIGNATURE_IMAGE_PATH = "/forms/luxembourg-a1/handtekening-bamalite.png"

export function getShipCertificatePdfPaths(shipName: string): {
  rijnvaart: string
  exploitatie: string
} | null {
  const key = String(shipName || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  if (!key || SHIPS_WITHOUT_A1_CERTIFICATE_PDFS.has(key)) return null
  const display =
    shipName.trim().charAt(0).toUpperCase() + shipName.trim().slice(1).toLowerCase()
  return {
    rijnvaart: `/forms/luxembourg-a1/Rijnvaartverklaring ${display}.pdf`,
    exploitatie: `/forms/luxembourg-a1/Exploitatievergunning ${display}.pdf`,
  }
}
