import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { format } from "date-fns"
import { nl, de } from "date-fns/locale"
import { resolveClothingAllowanceAmount } from "@/utils/clothing-allowance"

const A4_W = 595.28
const A4_H = 841.89

export type CrewProfilePrintLang = "nl" | "de"

type ProfileTranslations = {
  notFilled: string
  printedOn: string
  personalDetails: string
  birthDate: string
  birthPlace: string
  nationality: string
  phone: string
  email: string
  dates: string
  inServiceFrom: string
  address: string
  diplomas: string
  workDetails: string
  function: string
  regime: string
  currentShip: string
  company: string
  salary: string
  bankAccount: string
  baseSalaryInclClothing: string
  travelAllowance: string
  yesWithAmount: string
  no: string
  matriculeNumber: string
  crewProfile: string
  noShip: string
}

const TRANSLATIONS: Record<CrewProfilePrintLang, ProfileTranslations> = {
  nl: {
    notFilled: "Niet ingevuld",
    printedOn: "Geprint op",
    personalDetails: "Persoonlijke Gegevens",
    birthDate: "Geboortedatum",
    birthPlace: "Geboorteplaats",
    nationality: "Nationaliteit",
    phone: "Telefoon",
    email: "E-mail",
    dates: "Datums",
    inServiceFrom: "In dienst vanaf",
    address: "Adres",
    diplomas: "Diploma's",
    workDetails: "Werkgegevens",
    function: "Functie",
    regime: "Regime",
    currentShip: "Huidig Schip",
    company: "Firma",
    salary: "Salaris",
    bankAccount: "Bankrekeningnummer",
    baseSalaryInclClothing: "Basissalaris incl. kledinggeld",
    travelAllowance: "Reiskosten",
    yesWithAmount: "Ja (+€300,00)",
    no: "Nee",
    matriculeNumber: "Matricule nummer",
    crewProfile: "Bemanningsprofiel",
    noShip: "Geen schip",
  },
  de: {
    notFilled: "Nicht ausgefüllt",
    printedOn: "Gedruckt am",
    personalDetails: "Persönliche Angaben",
    birthDate: "Geburtsdatum",
    birthPlace: "Geburtsort",
    nationality: "Nationalität",
    phone: "Telefon",
    email: "E-Mail",
    dates: "Daten",
    inServiceFrom: "Im Dienst seit",
    address: "Adresse",
    diplomas: "Diplome",
    workDetails: "Arbeitsangaben",
    function: "Funktion",
    regime: "Regime",
    currentShip: "Aktuelles Schiff",
    company: "Firma",
    salary: "Gehalt",
    bankAccount: "Bankkontonummer",
    baseSalaryInclClothing: "Grundgehalt inkl. Kleidungsgeld",
    travelAllowance: "Reisekosten",
    yesWithAmount: "Ja (+300,00 €)",
    no: "Nein",
    matriculeNumber: "Matrikelnummer",
    crewProfile: "Besatzungsprofil",
    noShip: "Kein Schiff",
  },
}

const SALARY_META_PREFIX = "__SALARY_META__:"
const REVIEW_META_PREFIX = "__REVIEW_META__:"

const parseMoney = (value: any): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const parseSalaryMetaFromReason = (reasonValue: any) => {
  const reason = String(reasonValue || "")
  const salaryMarkerIndex = reason.lastIndexOf(SALARY_META_PREFIX)
  const markerIndex = salaryMarkerIndex >= 0 ? salaryMarkerIndex : reason.lastIndexOf(REVIEW_META_PREFIX)
  if (markerIndex < 0) return null
  const prefixLength = salaryMarkerIndex >= 0 ? SALARY_META_PREFIX.length : REVIEW_META_PREFIX.length
  const jsonPart = reason.slice(markerIndex + prefixLength).trim()
  if (!jsonPart) return null
  try {
    const parsed = JSON.parse(jsonPart) as { iban?: string; clothing_allowance?: boolean }
    return {
      iban: String(parsed.iban || ""),
      clothing_allowance:
        typeof parsed.clothing_allowance === "boolean" ? parsed.clothing_allowance : undefined,
    }
  } catch {
    return null
  }
}

const formatDateValue = (dateString: string | null | undefined, language: CrewProfilePrintLang) => {
  if (!dateString) return null
  try {
    return format(new Date(dateString), "dd-MM-yyyy", { locale: language === "de" ? de : nl })
  } catch {
    return String(dateString)
  }
}

const normalizeText = (text: string) =>
  String(text || "")
    .replace(/€/g, "EUR ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim()

export type CrewProfilePdfInput = {
  crewMember: any
  shipName: string
  language: CrewProfilePrintLang
  showSalary: boolean
  salaryRows?: any[]
}

function buildSalaryInfo(rows: any[], crewMember: any) {
  const firstWithIbanMeta = rows.find((row: any) => {
    const meta = parseSalaryMetaFromReason(row?.reason)
    return !!String(meta?.iban || "").trim()
  })
  const firstWithBaseSalary = rows.find((row: any) => parseMoney(row?.base_salary) > 0)
  const firstWithTravel = rows.find((row: any) => {
    const travel = row?.travel_allowance
    return typeof travel === "boolean" || String(travel).toLowerCase() === "true" || parseMoney(travel) > 0
  })

  const notesText = Array.isArray(crewMember?.notes)
    ? crewMember.notes.join(" | ")
    : String(crewMember?.notes || "")
  const contractBaseFromNotes = (() => {
    const noteMatch = notesText.match(/contract_basis_salaris_excl_kleding:([0-9.,-]+)/i)
    return noteMatch ? parseMoney(noteMatch[1]) : 0
  })()
  const clothingFromMeta = rows
    .map((row: any) => parseSalaryMetaFromReason(row?.reason)?.clothing_allowance)
    .find((v): v is boolean => typeof v === "boolean")
  const clothingAmount = resolveClothingAllowanceAmount(crewMember, clothingFromMeta)
  const baseFromRows = parseMoney(firstWithBaseSalary?.base_salary)
  const baseIncl = baseFromRows > 0 ? baseFromRows + clothingAmount : 0
  const travel =
    typeof firstWithTravel?.travel_allowance === "boolean"
      ? firstWithTravel.travel_allowance
      : parseMoney(firstWithTravel?.travel_allowance) > 0

  const iban =
    String(parseSalaryMetaFromReason(firstWithIbanMeta?.reason)?.iban || "").trim() ||
    String(crewMember?.iban || "").trim()

  const crewBase =
    parseMoney(crewMember?.basis_salaris) +
    parseMoney(crewMember?.kleding_geld ?? crewMember?.kledinggeld ?? crewMember?.clothing_allowance)

  return {
    iban: iban || null,
    baseSalary:
      baseIncl > 0
        ? baseIncl
        : contractBaseFromNotes > 0
          ? contractBaseFromNotes + clothingAmount
          : crewBase > 0
            ? crewBase
            : null,
    travelAllowance: travel,
  }
}

type Section = {
  title: string
  rows: Array<{ label: string; value: string }>
}

const A4_MARGIN = 40
const TITLE_SIZE = 26
const META_SIZE = 12
const SECTION_TITLE_SIZE = 13
const ROW_SIZE = 12
const FOOTER_SIZE = 9

/**
 * Genereert een nette A4-profiel-PDF met vaste regelafstand en gevulde paginahoogte.
 */
export async function generateCrewProfilePdf(input: CrewProfilePdfInput): Promise<Blob> {
  const { crewMember, shipName, language, showSalary } = input
  const t = TRANSLATIONS[language]
  const locale = language === "de" ? de : nl
  const euro = new Intl.NumberFormat(language === "de" ? "de-DE" : "nl-NL", {
    style: "currency",
    currency: "EUR",
  })

  const fullName = `${crewMember?.first_name || ""} ${crewMember?.last_name || ""}`.trim() || "-"
  const matricule = String(crewMember?.matricule || "").trim()
  const nationality = String(crewMember?.nationality || "").trim() || t.notFilled
  const position = String(crewMember?.position || "").trim() || t.notFilled
  const addressParts = [
    crewMember?.address?.street,
    crewMember?.address?.postalCode && crewMember?.address?.city
      ? `${crewMember.address.postalCode} ${crewMember.address.city}`
      : crewMember?.address?.city || crewMember?.address?.postalCode,
    crewMember?.address?.country,
  ].filter(Boolean)
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : t.notFilled
  const diplomas = Array.isArray(crewMember?.diplomas)
    ? crewMember.diplomas.map((d: any) => String(d || "").trim()).filter(Boolean)
    : []

  const salaryInfo =
    showSalary && Array.isArray(input.salaryRows)
      ? buildSalaryInfo(input.salaryRows, crewMember)
      : null

  const personalRows: Array<{ label: string; value: string }> = [
    {
      label: t.birthDate,
      value: formatDateValue(crewMember?.birth_date, language) || t.notFilled,
    },
  ]
  if (crewMember?.birth_place) {
    personalRows.push({ label: t.birthPlace, value: String(crewMember.birth_place) })
  }
  personalRows.push(
    { label: t.nationality, value: nationality },
    { label: t.phone, value: String(crewMember?.phone || "").trim() || t.notFilled }
  )
  if (crewMember?.email) {
    personalRows.push({ label: t.email, value: String(crewMember.email) })
  }
  personalRows.push({ label: t.address, value: fullAddress })
  if (diplomas.length > 0) {
    personalRows.push({ label: t.diplomas, value: diplomas.join(", ") })
  }

  const sections: Section[] = [{ title: t.personalDetails, rows: personalRows }]

  const workRows: Array<{ label: string; value: string }> = [
    { label: t.function, value: position },
    { label: t.regime, value: String(crewMember?.regime || "").trim() || t.notFilled },
    { label: t.currentShip, value: shipName || t.noShip },
  ]
  if (crewMember?.company) {
    workRows.push({ label: t.company, value: String(crewMember.company) })
  }
  if (crewMember?.in_dienst_vanaf) {
    workRows.push({
      label: t.inServiceFrom,
      value: formatDateValue(crewMember.in_dienst_vanaf, language) || t.notFilled,
    })
  }
  sections.push({ title: t.workDetails, rows: workRows })

  if (showSalary && salaryInfo) {
    sections.push({
      title: t.salary,
      rows: [
        { label: t.bankAccount, value: salaryInfo.iban || t.notFilled },
        {
          label: t.baseSalaryInclClothing,
          value:
            typeof salaryInfo.baseSalary === "number"
              ? euro.format(salaryInfo.baseSalary)
              : t.notFilled,
        },
        {
          label: t.travelAllowance,
          value: salaryInfo.travelAllowance ? t.yesWithAmount : t.no,
        },
      ],
    })
  }

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([A4_W, A4_H])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const printedAt = format(new Date(), "dd-MM-yyyy HH:mm", { locale })
  const footerText = normalizeText(
    `${t.crewProfile} - ${fullName} - ${t.printedOn} ${format(new Date(), "dd-MM-yyyy", { locale })}`
  )

  const blue = rgb(0.12, 0.35, 0.85)
  const labelColor = rgb(0.28, 0.3, 0.35)
  const valueColor = rgb(0.08, 0.08, 0.1)
  const lineColor = rgb(0.55, 0.72, 0.95)
  const mute = rgb(0.4, 0.4, 0.45)

  const contentWidth = A4_W - A4_MARGIN * 2
  const labelColWidth = 210

  const estimateContentHeight = () => {
    let h = 0
    // header block
    h += TITLE_SIZE + 8
    if (matricule) h += META_SIZE + 6
    h += META_SIZE + 18
    for (const section of sections) {
      h += SECTION_TITLE_SIZE + 10 // title + line gap
      h += section.rows.length * (ROW_SIZE + 10)
      h += 8 // after section
    }
    return h
  }

  const footerReserve = 28
  const top = A4_H - A4_MARGIN
  const bottom = A4_MARGIN + footerReserve
  const available = top - bottom
  const natural = estimateContentHeight()
  const leftover = Math.max(0, available - natural)
  const sectionGaps = Math.max(0, sections.length - 1)
  const extraBetweenSections = sectionGaps > 0 ? leftover / (sectionGaps + 2) : leftover / 2
  const extraAfterHeader = leftover - extraBetweenSections * sectionGaps

  let y = top

  // Header — vaste stappen, geen overlap
  page.drawText(normalizeText(fullName), {
    x: A4_MARGIN,
    y: y - TITLE_SIZE,
    size: TITLE_SIZE,
    font: bold,
    color: rgb(0.07, 0.07, 0.09),
  })
  const metaRight = normalizeText(printedAt)
  const printedLabel = normalizeText(t.printedOn)
  page.drawText(printedLabel, {
    x: A4_W - A4_MARGIN - bold.widthOfTextAtSize(printedLabel, 10),
    y: y - 12,
    size: 10,
    font,
    color: mute,
  })
  page.drawText(metaRight, {
    x: A4_W - A4_MARGIN - bold.widthOfTextAtSize(metaRight, 11),
    y: y - 26,
    size: 11,
    font: bold,
    color: valueColor,
  })
  y -= TITLE_SIZE + 10

  if (matricule) {
    page.drawText(normalizeText(`(${t.matriculeNumber} ${matricule})`), {
      x: A4_MARGIN,
      y: y - META_SIZE,
      size: META_SIZE,
      font: bold,
      color: rgb(0.78, 0.12, 0.12),
    })
    y -= META_SIZE + 8
  }

  page.drawText(normalizeText(`${nationality}  |  ${position}`), {
    x: A4_MARGIN,
    y: y - META_SIZE,
    size: META_SIZE,
    font,
    color: rgb(0.25, 0.25, 0.3),
  })
  y -= META_SIZE + 14 + Math.max(10, extraAfterHeader * 0.55)

  const drawRow = (label: string, value: string, rowY: number) => {
    page.drawText(normalizeText(label), {
      x: A4_MARGIN,
      y: rowY,
      size: ROW_SIZE,
      font: bold,
      color: labelColor,
    })
    const val = normalizeText(value)
    // Wrap lange waarden rechts; anders rechts uitlijnen
    const maxValWidth = contentWidth - labelColWidth - 8
    if (font.widthOfTextAtSize(val, ROW_SIZE) <= maxValWidth) {
      page.drawText(val, {
        x: A4_W - A4_MARGIN - font.widthOfTextAtSize(val, ROW_SIZE),
        y: rowY,
        size: ROW_SIZE,
        font,
        color: valueColor,
      })
      return ROW_SIZE + 10
    }
    // multi-line value under label column
    let line = ""
    let used = 0
    let cy = rowY
    const words = val.split(/\s+/)
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, ROW_SIZE) > maxValWidth && line) {
        page.drawText(line, {
          x: A4_MARGIN + labelColWidth,
          y: cy,
          size: ROW_SIZE,
          font,
          color: valueColor,
        })
        cy -= ROW_SIZE + 4
        used += ROW_SIZE + 4
        line = word
      } else {
        line = next
      }
    }
    if (line) {
      page.drawText(line, {
        x: A4_MARGIN + labelColWidth,
        y: cy,
        size: ROW_SIZE,
        font,
        color: valueColor,
      })
      used += ROW_SIZE + 10
    }
    return Math.max(ROW_SIZE + 10, used)
  }

  sections.forEach((section, index) => {
    if (index > 0) y -= extraBetweenSections * 0.9

    page.drawText(normalizeText(section.title), {
      x: A4_MARGIN,
      y: y - SECTION_TITLE_SIZE,
      size: SECTION_TITLE_SIZE,
      font: bold,
      color: blue,
    })
    y -= SECTION_TITLE_SIZE + 4
    page.drawLine({
      start: { x: A4_MARGIN, y },
      end: { x: A4_W - A4_MARGIN, y },
      thickness: 1.25,
      color: lineColor,
    })
    y -= 14

    for (const row of section.rows) {
      const consumed = drawRow(row.label, row.value, y)
      y -= consumed
    }

    y -= 6 + (extraBetweenSections > 0 ? extraBetweenSections * 0.1 : 0)
  })

  // Footer vast onderaan
  page.drawLine({
    start: { x: A4_MARGIN, y: A4_MARGIN + 16 },
    end: { x: A4_W - A4_MARGIN, y: A4_MARGIN + 16 },
    thickness: 0.8,
    color: rgb(0.78, 0.78, 0.8),
  })
  const footerWidth = font.widthOfTextAtSize(footerText, FOOTER_SIZE)
  page.drawText(footerText, {
    x: (A4_W - footerWidth) / 2,
    y: A4_MARGIN,
    size: FOOTER_SIZE,
    font,
    color: mute,
  })

  pdf.setTitle(`${t.crewProfile} - ${fullName}`)
  pdf.setProducer("Bamalite HR")
  const bytes = await pdf.save({ useObjectStreams: false })
  return new Blob([bytes as BlobPart], { type: "application/pdf" })
}

export function openCrewProfilePdfForPrint(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
  iframe.src = url
  document.body.appendChild(iframe)

  const cleanup = () => {
    window.setTimeout(() => {
      try {
        iframe.remove()
      } catch {
        // ignore
      }
      URL.revokeObjectURL(url)
    }, 60_000)
  }

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      const win = window.open(url, "_blank", "noopener,noreferrer")
      if (!win) {
        const a = document.createElement("a")
        a.href = url
        a.download = `profiel-${new Date().toISOString().slice(0, 10)}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } finally {
      cleanup()
    }
  }
}
