import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { sortOverviewCrew } from "@/utils/crew-overview-export-fields"
import { normalizeTextForPDF } from "@/utils/pdf-text"

const PAGE_W = 842
const PAGE_H = 595
const M = 28
const BORDER = rgb(0.82, 0.86, 0.9)
const PDF_TEXT = rgb(0.12, 0.14, 0.18)
const HEADER_LINE = rgb(0.2, 0.38, 0.62)

export type MissingMatriculePdfMember = Record<string, unknown> & {
  id: string
  first_name?: string
  last_name?: string
  position?: string
  ship_id?: string
  status?: string
  nationality?: string
  birth_date?: string
}

export type MissingMatriculePdfShip = { id: string; name: string }

function formatStatus(status: string): string {
  switch (status) {
    case "aan-boord":
      return "Aan boord"
    case "thuis":
      return "Thuis"
    case "ziek":
      return "Ziek"
    default:
      return status || "-"
  }
}

export async function generateMissingMatriculePdf(options: {
  members: MissingMatriculePdfMember[]
  ships: MissingMatriculePdfShip[]
  totalCrewCount: number
}): Promise<Blob> {
  const { members, ships, totalCrewCount } = options
  const shipNameById = new Map(ships.map((s) => [s.id, s.name]))
  const sorted = sortOverviewCrew(members)

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle("Ontbrekende matricule nummers")
  pdfDoc.setProducer("Bamalite HR")

  let page = pdfDoc.addPage([PAGE_W, PAGE_H])
  let { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fs = 7
  const rowLine = 9
  let y = height - M

  const pdfText = (text: string) => normalizeTextForPDF(String(text || "-"))

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

  const ensureSpace = (need: number) => {
    if (y - need < M) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H])
      ;({ width, height } = page.getSize())
      y = height - M
    }
  }

  const labels = ["Naam", "Functie", "Schip", "Status", "Nationaliteit", "Geboortedatum"]
  const colWidths = [155, 85, 95, 70, 75, 85]
  const colXs: number[] = []
  let x = M
  for (const w of colWidths) {
    colXs.push(x)
    x += w
  }

  drawPdfText("Ontbrekende matricule nummers", M, y, 12, fontBold, rgb(0.08, 0.1, 0.14))
  y -= 13
  drawPdfText("Zelfde selectie als pagina Totaal bemanningsleden", M, y, 7, font, rgb(0.35, 0.38, 0.42))
  y -= 10
  const printed = new Date().toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })
  drawPdfText(
    `${printed} — ${sorted.length} van ${totalCrewCount} bemanningsleden`,
    M,
    y,
    6.5,
    font,
    rgb(0.45, 0.47, 0.5)
  )
  y -= 10
  page.drawLine({
    start: { x: M, y: y + 2 },
    end: { x: width - M, y: y + 2 },
    thickness: 0.6,
    color: HEADER_LINE,
  })
  y -= 10

  ensureSpace(16)
  labels.forEach((label, i) => {
    drawPdfText(label, colXs[i], y, 6.5, fontBold, rgb(0.28, 0.32, 0.38))
  })
  y -= 8
  page.drawLine({
    start: { x: M, y: y + 2 },
    end: { x: width - M, y: y + 2 },
    thickness: 0.5,
    color: BORDER,
  })
  y -= 6

  if (sorted.length === 0) {
    drawPdfText("Alle bemanningsleden hebben een matricule nummer.", M, y, fs, font, PDF_TEXT)
  } else {
    for (const member of sorted) {
      ensureSpace(rowLine + 4)
      const cells = [
        `${member.first_name || ""} ${member.last_name || ""}`.trim(),
        String(member.position || "-"),
        shipNameById.get(String(member.ship_id || "")) || "Geen schip",
        formatStatus(String(member.status || "")),
        String(member.nationality || "-"),
        member.birth_date ? String(member.birth_date).slice(0, 10) : "-",
      ]
      cells.forEach((cell, i) => {
        drawPdfText(cell, colXs[i], y, fs, font, PDF_TEXT)
      })
      y -= rowLine
    }
  }

  const bytes = await pdfDoc.save()
  return new Blob([bytes], { type: "application/pdf" })
}
