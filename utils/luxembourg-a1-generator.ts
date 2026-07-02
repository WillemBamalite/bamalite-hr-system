import { addYears, format } from "date-fns"
import { PDFDocument } from "pdf-lib"
import {
  A1_FORM_TEMPLATE_PATH,
  A1_SIGNATURE_IMAGE_PATH,
  A1_ACTIVITY_COUNTRY_CHECKBOXES,
  getCompanyCcssMatricule,
  getShipCertificatePdfPaths,
  LUXEMBOURG_EMPLOYER_ADDRESS,
  LUXEMBOURG_EMPLOYER_PHONE,
} from "@/utils/luxembourg-a1-config"
import { getShipEni, getShipOwner } from "@/utils/luxembourg-a1-ship-data"
import { normalizeCrewAddress } from "@/utils/luxembourg-a1-readiness"
import { normalizeTextForPDF } from "@/utils/pdf-text"

export type LuxembourgA1MemberInput = {
  first_name?: string
  last_name?: string
  matricule?: string
  nationality?: string
  company?: string
  address?: unknown
}

const NATIONALITY_TO_ISO2: Record<string, string> = {
  NL: "NL",
  BE: "BE",
  DE: "DE",
  FR: "FR",
  LUX: "LU",
  LU: "LU",
  PO: "PL",
  PL: "PL",
  CZ: "CZ",
  SLK: "SK",
  SK: "SK",
  SERV: "RS",
  RS: "RS",
  HUN: "HU",
  HU: "HU",
  EG: "EG",
  RO: "RO",
  UA: "UA",
  BG: "BG",
  HR: "HR",
  AT: "AT",
  CH: "CH",
  IT: "IT",
  ES: "ES",
  PT: "PT",
  GB: "GB",
  IE: "IE",
}

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  polen: "PL",
  poland: "PL",
  polska: "PL",
  nederland: "NL",
  netherlands: "NL",
  holland: "NL",
  deutschland: "DE",
  germany: "DE",
  duitsland: "DE",
  belgie: "BE",
  belgium: "BE",
  belgique: "BE",
  luxembourg: "LU",
  luxemburg: "LU",
  france: "FR",
  frankrijk: "FR",
  slowakije: "SK",
  slovakia: "SK",
  tsjechie: "CZ",
  czechia: "CZ",
  hungary: "HU",
  hongarije: "HU",
  roemenie: "RO",
  romania: "RO",
  servie: "RS",
  serbia: "RS",
  kroatie: "HR",
  croatia: "HR",
  oekraine: "UA",
  ukraine: "UA",
}

function toIso2Nationality(code: string): string {
  const raw = String(code || "").trim().toUpperCase()
  if (!raw) return ""
  if (raw.length === 2 && /^[A-Z]{2}$/.test(raw)) return raw
  return NATIONALITY_TO_ISO2[raw] || raw.slice(0, 2)
}

function countryToIso2(country: string, nationalityFallback: string): string {
  const trimmed = String(country || "").trim()
  if (!trimmed) return toIso2Nationality(nationalityFallback)
  const lower = trimmed.toLowerCase()
  if (COUNTRY_NAME_TO_ISO2[lower]) return COUNTRY_NAME_TO_ISO2[lower]
  if (trimmed.length === 2) return trimmed.toUpperCase()
  return toIso2Nationality(nationalityFallback)
}

function parseStreetAndNumber(street: string): { street: string; number: string } {
  const s = String(street || "").trim()
  const match = s.match(/^(.+?)\s+(\d+\s*[a-zA-Z]?-?\d*)$/)
  if (match) {
    return { street: match[1].trim(), number: match[2].trim() }
  }
  return { street: s, number: "" }
}

function formatDdMmYyyy(date: Date): string {
  return format(date, "ddMMyyyy")
}

function formatDateSig(date: Date): string {
  return format(date, "dd/MM/yyyy")
}

function formatEniFull(eni: string): string {
  const digits = String(eni || "").replace(/\D/g, "")
  if (!digits) return ""
  return digits.padStart(8, "0").slice(-8)
}

function setFormText(form: ReturnType<PDFDocument["getForm"]>, fieldName: string, value: string) {
  const text = normalizeTextForPDF(String(value || ""))
  if (!text) return
  try {
    const field = form.getTextField(fieldName)
    try {
      const max = field.getMaxLength()
      if (max === 0) field.setMaxLength(Math.max(120, text.length))
    } catch {
      /* ignore */
    }
    field.setText(text)
  } catch (e) {
    console.warn(`A1 veld "${fieldName}" niet gezet:`, e)
  }
}

function checkA1ActivityCountries(form: ReturnType<PDFDocument["getForm"]>) {
  for (const fieldName of A1_ACTIVITY_COUNTRY_CHECKBOXES) {
    try {
      const cb = form.getCheckBox(fieldName)
      if (!cb.isChecked()) cb.check()
    } catch {
      /* ignore */
    }
  }
}

async function embedSignatureImage(formDoc: PDFDocument, origin: string) {
  try {
    const res = await fetch(`${origin}${A1_SIGNATURE_IMAGE_PATH}?v=${Date.now()}`, {
      cache: "no-store",
    })
    if (!res.ok) return
    const png = await formDoc.embedPng(await res.arrayBuffer())
    const page = formDoc.getPage(0)
    const form = formDoc.getForm()

    const imprRect = form.getButton("impr").acroField.getWidgets()[0].getRectangle()
    const initRect = form.getButton("init").acroField.getWidgets()[0].getRectangle()
    const boxLeft = imprRect.x - 15
    const boxRight = initRect.x + initRect.width + 5
    const boxWidth = boxRight - boxLeft
    const width = Math.min(140, boxWidth - 10)
    const height = (png.height / png.width) * width
    const x = boxLeft + (boxWidth - width) / 2
    const maxTop = Math.min(imprRect.y, initRect.y) - 4
    const y = maxTop - height

    page.drawImage(png, { x, y, width, height })
  } catch (e) {
    console.warn("Handtekening niet toegevoegd:", e)
  }
}

function fillA1Form(
  form: ReturnType<PDFDocument["getForm"]>,
  member: LuxembourgA1MemberInput,
  shipName: string,
  generatedAt: Date
) {
  const company = String(member.company || "").trim()
  const companyMatricule = getCompanyCcssMatricule(company) || ""
  const addr = normalizeCrewAddress(member.address)
  const nationalityIso = toIso2Nationality(String(member.nationality || ""))
  const addressCountryIso = countryToIso2(addr.country, String(member.nationality || ""))
  const { street, number } = parseStreetAndNumber(addr.street)
  const eni = getShipEni(shipName)
  const shipOwner = getShipOwner(shipName) || company
  const validUntil = addYears(generatedAt, 1)

  setFormText(form, "re_mat", companyMatricule)
  setFormText(form, "re_denomnom", company.toUpperCase())
  setFormText(form, "re_nrrue", "15A")
  setFormText(form, "re_rue", "Duarrefstrooss")
  setFormText(form, "re_loc", LUXEMBOURG_EMPLOYER_ADDRESS.city)
  setFormText(form, "re_cp", LUXEMBOURG_EMPLOYER_ADDRESS.postalCode)
  setFormText(form, "re_pays_secu", LUXEMBOURG_EMPLOYER_ADDRESS.country)
  setFormText(form, "re_tel", LUXEMBOURG_EMPLOYER_PHONE)

  setFormText(form, "ca_mat", String(member.matricule || "").trim())
  setFormText(form, "ca_nom_1", String(member.last_name || "").trim().toUpperCase())
  setFormText(form, "ca_prenom_1", String(member.first_name || "").trim().toUpperCase())
  setFormText(form, "ca_rue_leg", street)
  setFormText(form, "ca_nrrue_leg", number)
  setFormText(form, "ca_cp_leg", addr.postalCode)
  setFormText(form, "ca_loc_leg", addr.city)
  setFormText(form, "ca_pays_leg", addressCountryIso || nationalityIso)

  setFormText(form, "deb_jjmmaaaa1", formatDdMmYyyy(generatedAt))
  setFormText(form, "fin_jjmmaaaa1", formatDdMmYyyy(validUntil))

  setFormText(form, "tr_nom_bateau", shipName.toUpperCase())
  setFormText(form, "tr_exp_bateau", company.toUpperCase())
  setFormText(form, "tr_prop_bateau", shipOwner.toUpperCase())
  if (eni) setFormText(form, "tr_nr_eni", formatEniFull(eni))
  setFormText(form, "tr1_pays_secu", "LU")
  setFormText(form, "tr2_pays_secu", "LU")

  setFormText(form, "lieu_sig", LUXEMBOURG_EMPLOYER_ADDRESS.city)
  setFormText(form, "date_sig", formatDateSig(generatedAt))
  setFormText(form, "sig_nom", "BAMALITE S.A.")

  checkA1ActivityCountries(form)

  try {
    form.getRadioGroup("optSignataire").select("3")
  } catch {
    /* ignore */
  }
  try {
    const cb = form.getCheckBox("CheckboxRect")
    if (!cb.isChecked()) cb.check()
  } catch {
    /* ignore */
  }
}

async function appendPdf(merged: PDFDocument, bytes: ArrayBuffer | Uint8Array) {
  const doc = await PDFDocument.load(bytes)
  const pages = await merged.copyPages(doc, doc.getPageIndices())
  for (const page of pages) merged.addPage(page)
}

export async function generateLuxembourgA1Package(options: {
  member: LuxembourgA1MemberInput
  shipName: string
  generatedAt?: Date
  baseUrl?: string
}): Promise<Blob> {
  const { member, shipName } = options
  const generatedAt = options.generatedAt ?? new Date()
  const origin =
    options.baseUrl || (typeof window !== "undefined" ? window.location.origin : "")
  const cacheBust = `v=${Date.now()}`

  const templateRes = await fetch(`${origin}${A1_FORM_TEMPLATE_PATH}?${cacheBust}`, {
    cache: "no-store",
  })
  if (!templateRes.ok) {
    throw new Error("CCSS-formulier kon niet geladen worden")
  }

  const templateBytes = await templateRes.arrayBuffer()
  const formDoc = await PDFDocument.load(templateBytes)
  fillA1Form(formDoc.getForm(), member, shipName, generatedAt)
  await embedSignatureImage(formDoc, origin)

  const certPaths = getShipCertificatePdfPaths(shipName)
  if (!certPaths) {
    throw new Error(`Geen schipscertificaten beschikbaar voor ${shipName}`)
  }

  const merged = await PDFDocument.create()
  await appendPdf(merged, await formDoc.save())

  for (const path of [certPaths.rijnvaart, certPaths.exploitatie]) {
    const res = await fetch(`${origin}${path}?${cacheBust}`, { cache: "no-store" })
    if (!res.ok) {
      throw new Error(`Bijlage niet gevonden: ${path}`)
    }
    await appendPdf(merged, await res.arrayBuffer())
  }

  const year = generatedAt.getFullYear()
  merged.setTitle(`A1 ${year} - ${member.last_name} ${member.first_name}`)
  merged.setProducer("Bamalite HR")
  const bytes = await merged.save()
  return new Blob([Uint8Array.from(bytes)], { type: "application/pdf" })
}

export function buildA1DownloadFilename(
  member: LuxembourgA1MemberInput,
  shipName: string,
  year: number
): string {
  const last = String(member.last_name || "werknemer").replace(/\s+/g, "-")
  const first = String(member.first_name || "").replace(/\s+/g, "-")
  const ship = shipName.replace(/\s+/g, "-")
  return `A1-${year}-${last}-${first}-${ship}.pdf`
}

export function formatA1PackageDateLabel(date = new Date()): string {
  return format(date, "dd-MM-yyyy")
}
