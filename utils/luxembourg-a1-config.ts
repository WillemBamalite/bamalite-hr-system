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
  "Land0.6.0", // Suisse [CH]
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
