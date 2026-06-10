import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import {
  CREW_EXPORT_FIELDS,
  getCrewExportFieldValue,
  sortOverviewCrew,
  type CrewExportFieldId,
} from "@/utils/crew-overview-export-fields"
import { normalizeTextForPDF } from "@/utils/pdf-text"

const PAGE_W = 842
const PAGE_H = 595
const M = 28
const BORDER = rgb(0.82, 0.86, 0.9)
const PDF_TEXT = rgb(0.12, 0.14, 0.18)
const HEADER_LINE = rgb(0.2, 0.38, 0.62)

export type CrewOverviewPdfMember = Record<string, unknown> & { id: string }
export type CrewOverviewPdfShip = { id: string; name: string }

export type CrewOverviewPdfOptions = {
  members: CrewOverviewPdfMember[]
  ships: CrewOverviewPdfShip[]
  fieldIds: CrewExportFieldId[]
}

export async function generateCrewOverviewPdf(options: CrewOverviewPdfOptions): Promise<Blob> {
  const { members, ships, fieldIds } = options
  const effectiveFields = fieldIds.includes("name") ? fieldIds : (["name", ...fieldIds] as CrewExportFieldId[])
  const labels = effectiveFields.map(
    (id) => CREW_EXPORT_FIELDS.find((f) => f.id === id)?.label || id
  )

  const shipNameById = new Map(ships.map((s) => [s.id, s.name]))
  const sorted = sortOverviewCrew(members)

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle("Bemanningscontactoverzicht")
  pdfDoc.setProducer("Bamalite HR")

  let page = pdfDoc.addPage([PAGE_W, PAGE_H])
  let { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fs = 7
  const rowLine = 8
  const headerLine = 8
  const charsPerPtWidth = 2.6
  let y = height - M

  const ensureSpace = (need: number) => {
    if (y - need < M) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H])
      ;({ width, height } = page.getSize())
      y = height - M
    }
  }

  const pdfText = (text: string) => normalizeTextForPDF(String(text || "-"))

  const wrapLines = (text: string, maxChars: number) => {
    const clean = pdfText(text).replace(/[\r\n]+/g, " ").trim() || "-"
    const words = clean.split(/\s+/)
    const lines: string[] = []
    let cur = ""
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w
      if (next.length <= maxChars) cur = next
      else {
        if (cur) lines.push(cur)
        cur = w.length > maxChars ? `${w.slice(0, maxChars - 3)}...` : w
      }
    }
    if (cur) lines.push(cur)
    return lines.length ? lines : ["-"]
  }

  const drawPdfText = (
    line: string,
    x: number,
    yPos: number,
    size: number,
    fontFace: typeof font,
    color: ReturnType<typeof rgb>
  ) => {
    page.drawText(pdfText(line), { x, y: yPos, size, font: fontFace, color })
  }

  const innerW = width - 2 * M
  const colCount = effectiveFields.length
  const colWidths = effectiveFields.map((id) => {
    if (id === "name") return Math.floor(innerW * 0.16)
    if (id === "address") return Math.floor(innerW * 0.18)
    if (id === "email") return Math.floor(innerW * 0.14)
    if (id === "phone") return Math.floor(innerW * 0.1)
    return Math.floor(innerW / colCount)
  })
  const totalW = colWidths.reduce((a, b) => a + b, 0)
  if (totalW < innerW) colWidths[colWidths.length - 1] += innerW - totalW
  else if (totalW > innerW) {
    const scale = innerW / totalW
    for (let i = 0; i < colWidths.length; i++) colWidths[i] = Math.floor(colWidths[i] * scale)
  }
  const colXs: number[] = []
  let x = M
  for (const w of colWidths) {
    colXs.push(x)
    x += w
  }

  const drawTableHeader = () => {
    ensureSpace(16)
    let maxH = 1
    labels.forEach((label, i) => {
      const approxChars = Math.max(8, Math.floor(colWidths[i] / charsPerPtWidth))
      const lines = wrapLines(label, approxChars)
      maxH = Math.max(maxH, lines.length)
      lines.forEach((line, li) => {
        drawPdfText(line, colXs[i], y - li * headerLine, 6.5, fontBold, rgb(0.28, 0.32, 0.38))
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

  const drawRow = (cells: string[]) => {
    const lineChunks = cells.map((c, i) => {
      const approxChars = Math.max(8, Math.floor(colWidths[i] / charsPerPtWidth))
      return wrapLines(c, approxChars)
    })
    const rowLines = Math.max(1, ...lineChunks.map((l) => l.length))
    ensureSpace(4 + rowLines * rowLine)
    lineChunks.forEach((lines, i) => {
      lines.forEach((line, li) => {
        drawPdfText(line, colXs[i], y - 3.5 - li * rowLine, fs, font, PDF_TEXT)
      })
    })
    y -= rowLines * rowLine + 4
  }

  drawPdfText("Bemanningscontactoverzicht", M, y, 12, fontBold, rgb(0.08, 0.1, 0.14))
  y -= 13
  const printed = new Date().toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })
  drawPdfText(`${printed} - ${sorted.length} bemanningsleden`, M, y, 6.5, font, rgb(0.45, 0.47, 0.5))
  y -= 10
  page.drawLine({
    start: { x: M, y: y + 2 },
    end: { x: width - M, y: y + 2 },
    thickness: 0.6,
    color: HEADER_LINE,
  })
  y -= 10

  drawTableHeader()

  if (sorted.length === 0) {
    drawRow(["Geen bemanningsleden in dit overzicht.", ...Array(colCount - 1).fill("")])
  } else {
    for (const member of sorted) {
      const cells = effectiveFields.map((id) => getCrewExportFieldValue(member, id, shipNameById))
      drawRow(cells)
    }
  }

  const bytes = await pdfDoc.save()
  return new Blob([bytes], { type: "application/pdf" })
}
