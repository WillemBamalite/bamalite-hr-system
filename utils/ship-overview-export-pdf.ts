import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import {
  calculateCertificateExpiryDateIso,
  formatIsoToDutchDate,
  getCertificateStatus,
  getVisibleShipCertificatesSharedForClient,
} from "@/utils/ship-certificates"
import {
  getShipParticularsConfigByName,
  type ClassificationEditableValues,
  type LabelValue,
} from "@/app/schepen/overzicht/ship-particulars-registry"
import { getParticularFieldKey, loadLocalParticularOverrides } from "@/utils/ship-particulars-overrides"

const HIDDEN_PARTICULAR_LABELS = new Set(["Savealls bij tankontluchting", "Opvangranden machinegebied"])

/** Staand A4; marges compact maar leesbaar. */
const PAGE_W = 595
const PAGE_H = 842
const M = 26
const HEADER_LINE = rgb(0.2, 0.38, 0.62)
const BORDER = rgb(0.82, 0.86, 0.9)
const PDF_TEXT = rgb(0.12, 0.14, 0.18)
/** Bijna verlopen: keuring + verloop in oranje */
const PDF_DATE_WARN = rgb(0.78, 0.38, 0.02)
/** Verlopen: keuring + verloop in rood */
const PDF_DATE_EXPIRED = rgb(0.72, 0.1, 0.08)

function normCertName(s: string) {
  return String(s || "").trim().toLowerCase()
}

function parseParticularFieldId(id: string): { section: string; label: string } | null {
  const i = id.indexOf("::")
  if (i <= 0) return null
  return { section: id.slice(0, i), label: id.slice(i + 2) }
}

function loadClassificationValues(
  storageKey: string,
  defaults: ClassificationEditableValues
): ClassificationEditableValues {
  if (!storageKey || typeof window === "undefined") return defaults
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return defaults
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

function resolveItemDisplay(
  sectionTitle: string,
  item: LabelValue,
  overrides: Record<string, string>,
  classification: ClassificationEditableValues
): string {
  const key = getParticularFieldKey(sectionTitle, item.label)
  if (item.editableKey && sectionTitle === "Classificatie") {
    const iso = classification[item.editableKey]
    return iso ? formatIsoToDutchDate(iso) : "-"
  }
  const v = overrides[key]
  return v !== undefined && v !== "" ? v : item.value || "-"
}

export type ShipOverviewPdfShip = { id: string; name: string }

export type ShipOverviewPdfOptions = {
  ships: ShipOverviewPdfShip[]
  certificateNames: string[]
  particularFieldIds: string[]
}

export async function generateShipOverviewPdf(options: ShipOverviewPdfOptions): Promise<Blob> {
  const { ships, certificateNames, particularFieldIds } = options
  const wantCerts = certificateNames.length > 0
  const wantParts = particularFieldIds.length > 0
  const certNameSet = new Set(certificateNames.map(normCertName))

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle("Schepen — selectief overzicht")
  pdfDoc.setProducer("Bamalite HR")
  let page = pdfDoc.addPage([PAGE_W, PAGE_H])
  let { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  /** Body en tabellen: leesbaar, nog redelijk compact. */
  const fs = 6.5
  const rowLine = 7.5
  const headerLine = 7.5
  const charsPerPtWidth = 2.75
  let y = height - M

  const ensureSpace = (need: number) => {
    if (y - need < M) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H])
      ;({ width, height } = page.getSize())
      y = height - M
    }
  }

  /** Eén regel titel + dunne lijn i.p.v. grote gekleurde balk. */
  const drawShipTitle = (title: string) => {
    ensureSpace(16)
    page.drawText(title, {
      x: M,
      y: y - 2,
      size: 9,
      font: fontBold,
      color: rgb(0.12, 0.14, 0.18),
    })
    y -= 10
    page.drawLine({
      start: { x: M, y: y + 1 },
      end: { x: width - M, y: y + 1 },
      thickness: 0.6,
      color: HEADER_LINE,
    })
    y -= 7
  }

  /** Alias i.v.m. oude aanroepen / webpack-cache na hernoemen naar drawShipTitle */
  const drawShipHeader = drawShipTitle

  const wrapLines = (text: string, maxChars: number) => {
    const clean = String(text || "-").replace(/[\r\n]+/g, " ").trim() || "-"
    const words = clean.split(/\s+/)
    const lines: string[] = []
    let cur = ""
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w
      if (next.length <= maxChars) cur = next
      else {
        if (cur) lines.push(cur)
        cur = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w
      }
    }
    if (cur) lines.push(cur)
    return lines.length ? lines : ["-"]
  }

  const drawTableHeader = (labels: string[], colXs: number[]) => {
    ensureSpace(14)
    let maxH = 1
    labels.forEach((label, i) => {
      const lines = wrapLines(label, i === 0 ? 34 : 18)
      maxH = Math.max(maxH, lines.length)
      lines.forEach((line, li) => {
        page.drawText(line, {
          x: colXs[i],
          y: y - li * headerLine,
          size: 6.5,
          font: fontBold,
          color: rgb(0.28, 0.32, 0.38),
        })
      })
    })
    y -= 2 + maxH * headerLine
    page.drawLine({
      start: { x: M, y: y + 2 },
      end: { x: width - M, y: y + 2 },
      thickness: 0.5,
      color: BORDER,
    })
    y -= 5
  }

  const drawRow = (cells: string[], colXs: number[], colWidths: number[], _alt: boolean) => {
    const approxChars = (w: number) => Math.max(10, Math.floor(w / charsPerPtWidth))
    const lineChunks = cells.map((c, i) => wrapLines(c, approxChars(colWidths[i])))
    const rowLines = Math.max(1, ...lineChunks.map((l) => l.length))
    ensureSpace(4 + rowLines * rowLine)
    lineChunks.forEach((lines, i) => {
      lines.forEach((line, li) => {
        page.drawText(line, {
          x: colXs[i],
          y: y - 3.5 - li * rowLine,
          size: fs,
          font,
          color: PDF_TEXT,
        })
      })
    })
    y -= rowLines * rowLine + 5
  }

  /** Certificaatrij; datums oranje/rood. Geen zebra-achtergrond (compact). */
  const drawCertificateDataRow = (
    name: string,
    keuring: string,
    verloop: string,
    status: "ok" | "warning" | "expired",
    colXs: number[],
    colWidths: number[],
    _alt: boolean
  ) => {
    const dateColor =
      status === "expired" ? PDF_DATE_EXPIRED : status === "warning" ? PDF_DATE_WARN : PDF_TEXT
    const colors = [PDF_TEXT, dateColor, dateColor]
    const cells = [name, keuring, verloop]
    const approxChars = (w: number) => Math.max(10, Math.floor(w / charsPerPtWidth))
    const lineChunks = cells.map((c, i) => wrapLines(c, approxChars(colWidths[i])))
    const rowLines = Math.max(1, ...lineChunks.map((l) => l.length))
    ensureSpace(4 + rowLines * rowLine)
    lineChunks.forEach((lines, i) => {
      const colColor = colors[i] ?? PDF_TEXT
      lines.forEach((line, li) => {
        page.drawText(line, {
          x: colXs[i],
          y: y - 3.5 - li * rowLine,
          size: fs,
          font,
          color: colColor,
        })
      })
    })
    y -= rowLines * rowLine + 5
  }

  page.drawText("Schepen — selectief overzicht", {
    x: M,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.14),
  })
  y -= 12
  const printed = new Date().toLocaleString("nl-NL", {
    dateStyle: "short",
    timeStyle: "short",
  })
  page.drawText(printed, { x: M, y, size: 6, font, color: rgb(0.45, 0.47, 0.5) })
  y -= 11

  for (let si = 0; si < ships.length; si++) {
    const innerW = width - 2 * M
    const ship = ships[si]
    drawShipTitle(ship.name)

    const pConfig = getShipParticularsConfigByName(ship.name)
    const overrides = loadLocalParticularOverrides(ship.name)
    const classification = pConfig
      ? loadClassificationValues(pConfig.classificationStorageKey, pConfig.classificationDefault)
      : {
          lastClassInspection: "",
          nextClassInspection: "",
          lastDryDock: "",
          lastBoxCoolerInspection: "",
        }

    if (wantCerts) {
      const certs = await getVisibleShipCertificatesSharedForClient(ship.name)
      const picked = certs.filter((c) => certNameSet.has(normCertName(c.naam)))
      const wName = Math.floor(innerW * 0.44)
      const wKeur = Math.floor(innerW * 0.26)
      const wVerl = innerW - wName - wKeur - 4
      const colXs = [M, M + wName, M + wName + wKeur]
      const colW = [wName - 2, wKeur - 2, wVerl]
      drawTableHeader(["Naam", "Keuring", "Verloopt"], colXs)
      if (picked.length === 0) {
        drawRow(["Geen van de gekozen certificaten op dit schip.", "", ""], colXs, colW, false)
      } else {
        picked.forEach((cert, ri) => {
          const verloopIso = calculateCertificateExpiryDateIso(cert.huidig, cert.intervalJaar)
          const st = getCertificateStatus(cert)
          drawCertificateDataRow(
            cert.naam,
            cert.huidig ? formatIsoToDutchDate(cert.huidig) : "-",
            verloopIso ? formatIsoToDutchDate(verloopIso) : "-",
            st.status,
            colXs,
            colW,
            ri % 2 === 1
          )
        })
      }
      y -= 2
    }

    if (wantParts) {
      page.drawText("Scheepsgegevens", { x: M, y, size: 6.5, font: fontBold, color: rgb(0.28, 0.32, 0.38) })
      y -= 7
      const wSec = Math.min(108, Math.floor(innerW * 0.2))
      const wFld = Math.min(128, Math.floor(innerW * 0.26))
      const wVal = innerW - wSec - wFld - 4
      const colXs2 = [M, M + wSec, M + wSec + wFld]
      const colW2 = [wSec - 2, wFld - 2, wVal]
      drawTableHeader(["Sectie", "Veld", "Waarde"], colXs2)
      if (!pConfig) {
        drawRow(["—", "—", "Geen particulars-config voor dit schip."], colXs2, colW2, false)
      } else {
        let rowIdx = 0
        for (const fid of particularFieldIds) {
          const parsed = parseParticularFieldId(fid)
          if (!parsed) continue
          const sec = pConfig.sections.find((s) => s.title === parsed.section)
          const item = sec?.items?.find((it) => it.label === parsed.label)
          if (!item || HIDDEN_PARTICULAR_LABELS.has(item.label)) {
            drawRow([parsed.section, parsed.label, "— n.v.t."], colXs2, colW2, rowIdx % 2 === 1)
            rowIdx++
            continue
          }
          const display = resolveItemDisplay(parsed.section, item, overrides, classification)
          drawRow([parsed.section, parsed.label, display], colXs2, colW2, rowIdx % 2 === 1)
          rowIdx++
        }
      }
      y -= 2
    }

    y -= 5
    if (si < ships.length - 1) {
      ensureSpace(14)
      page.drawLine({
        start: { x: M, y: y + 4 },
        end: { x: width - M, y: y + 4 },
        thickness: 0.3,
        color: rgb(0.88, 0.9, 0.92),
      })
      y -= 8
    }
  }

  const bytes = await pdfDoc.save()
  return new Blob([bytes], { type: "application/pdf" })
}
