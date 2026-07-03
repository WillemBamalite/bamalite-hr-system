import { getShipEni } from "@/utils/luxembourg-a1-ship-data"
import {
  getCompanyCcssMatricule,
  getShipCertificatePdfPaths,
  isCrewShipCompanyMismatch,
  SHIPS_WITHOUT_A1_CERTIFICATE_PDFS,
} from "@/utils/luxembourg-a1-config"

export type NormalizedCrewAddress = {
  street: string
  city: string
  postalCode: string
  country: string
}

/** Profielen gebruiken postalCode; sommige records postal_code. */
export function normalizeCrewAddress(address: unknown): NormalizedCrewAddress {
  const a =
    address && typeof address === "object" ? (address as Record<string, unknown>) : {}
  return {
    street: String(a.street || "").trim(),
    city: String(a.city || "").trim(),
    postalCode: String(a.postalCode || a.postal_code || "").trim(),
    country: String(a.country || "").trim(),
  }
}

export type A1MissingFieldId =
  | "matricule"
  | "voornaam"
  | "achternaam"
  | "geboortedatum"
  | "nationaliteit"
  | "adres_straat"
  | "adres_plaats"
  | "adres_postcode"
  | "adres_land"
  | "firma"
  | "firma_matricule"
  | "firma_schip_mismatch"
  | "schip"
  | "schip_eni"
  | "schip_papieren"

export const A1_MISSING_FIELD_LABELS: Record<A1MissingFieldId, string> = {
  matricule: "Matricule nummer",
  voornaam: "Voornaam",
  achternaam: "Achternaam",
  geboortedatum: "Geboortedatum",
  nationaliteit: "Nationaliteit",
  adres_straat: "Adres (straat)",
  adres_plaats: "Adres (plaats)",
  adres_postcode: "Adres (postcode)",
  adres_land: "Adres (land)",
  firma: "Firma (werkgever)",
  firma_matricule: "Firma CCSS-matricule (onbekende firma)",
  firma_schip_mismatch: "Schip hoort bij andere firma (nog niet omgezet via Firma Wisseling)",
  schip: "Schip toegewezen",
  schip_eni: "ENI-nummer schip",
  schip_papieren: "Rijnvaartverklaring / Exploitatievergunning (PDF)",
}

export type A1ReadinessResult = {
  ready: boolean
  missing: A1MissingFieldId[]
  shipName: string | null
  company: string | null
}

function normalizeShipKey(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function assessLuxembourgA1Readiness(
  member: Record<string, unknown>,
  shipName: string | null,
  shipCompany?: string | null
): A1ReadinessResult {
  const missing: A1MissingFieldId[] = []
  const company = String(member.company || "").trim() || null

  if (!String(member.first_name || "").trim()) missing.push("voornaam")
  if (!String(member.last_name || "").trim()) missing.push("achternaam")
  if (!String(member.birth_date || "").trim()) missing.push("geboortedatum")
  if (!String(member.nationality || "").trim()) missing.push("nationaliteit")
  if (!String(member.matricule || "").trim()) missing.push("matricule")

  const address = normalizeCrewAddress(member.address)
  if (!address.street) missing.push("adres_straat")
  if (!address.city) missing.push("adres_plaats")
  if (!address.postalCode) missing.push("adres_postcode")
  if (!address.country) missing.push("adres_land")

  if (!company) missing.push("firma")
  else if (!getCompanyCcssMatricule(company)) missing.push("firma_matricule")

  if (company && shipCompany && isCrewShipCompanyMismatch(company, shipCompany)) {
    missing.push("firma_schip_mismatch")
  }

  if (!shipName) {
    missing.push("schip")
  } else {
    const shipKey = normalizeShipKey(shipName)
    if (SHIPS_WITHOUT_A1_CERTIFICATE_PDFS.has(shipKey)) {
      missing.push("schip_papieren")
    } else if (!getShipCertificatePdfPaths(shipName)) {
      missing.push("schip_papieren")
    }
    if (!getShipEni(shipName)) missing.push("schip_eni")
  }

  return {
    ready: missing.length === 0,
    missing,
    shipName,
    company,
  }
}

export function sortCrewByName<T extends { last_name?: string; first_name?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const last = String(a.last_name || "").localeCompare(String(b.last_name || ""), "nl")
    if (last !== 0) return last
    return String(a.first_name || "").localeCompare(String(b.first_name || ""), "nl")
  })
}
