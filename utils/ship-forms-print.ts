import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { supabase } from "@/lib/supabase"
import {
  buildVisibleShipForms,
  createEmptyShipFormLayout,
  type ShipFormDefinition,
  type ShipFormLayoutState,
} from "@/utils/ship-forms-registry"
import { SHIP_FORMS_STORAGE_BUCKET } from "@/utils/ship-forms-storage"

export type ShipFormsPrintShip = {
  id: string
  name: string
}

export type ShipFormsPrintOptions = {
  ships: ShipFormsPrintShip[]
  /** true = overzicht + geüploade formulieren in één PDF */
  includeDocuments: boolean
}

type FormRecord = {
  form_key: string
  form_date: string | null
  file_name: string | null
  file_path: string | null
}

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN = 40

const parseLayoutRow = (row: unknown): ShipFormLayoutState => {
  if (!row || typeof row !== "object") return createEmptyShipFormLayout()
  const data = row as { custom_forms?: unknown; removed_form_keys?: unknown }
  const customRaw = Array.isArray(data.custom_forms) ? data.custom_forms : []
  const removedRaw = Array.isArray(data.removed_form_keys) ? data.removed_form_keys : []
  return {
    custom_forms: customRaw
      .map((item) => {
        const entry = item as { key?: string; label?: string; naam?: string }
        return {
          key: String(entry.key || "").trim(),
          label: String(entry.label || entry.naam || "").trim(),
        }
      })
      .filter((item) => item.key && item.label),
    removed_form_keys: removedRaw.map((key) => String(key || "").trim()).filter(Boolean),
  }
}

const formatDateNl = (value: string | null | undefined) => {
  const raw = String(value || "").trim()
  if (!raw) return "—"
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return raw
  return `${m[3]}-${m[2]}-${m[1]}`
}

const getPublicFileUrl = (storagePath: string) => {
  const { data } = supabase.storage.from(SHIP_FORMS_STORAGE_BUCKET).getPublicUrl(storagePath)
  return data?.publicUrl || ""
}

async function appendPdfBytes(merged: PDFDocument, bytes: ArrayBuffer | Uint8Array) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const pages = await merged.copyPages(doc, doc.getPageIndices())
  for (const page of pages) merged.addPage(page)
}

async function addNotePage(
  merged: PDFDocument,
  title: string,
  lines: string[],
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>
) {
  const page = merged.addPage([A4_WIDTH, A4_HEIGHT])
  let y = A4_HEIGHT - MARGIN
  page.drawText(title, { x: MARGIN, y, size: 14, font: bold, color: rgb(0.1, 0.1, 0.15) })
  y -= 24
  for (const line of lines) {
    page.drawText(line.slice(0, 95), {
      x: MARGIN,
      y,
      size: 10,
      font,
      color: rgb(0.25, 0.25, 0.3),
    })
    y -= 14
    if (y < MARGIN) break
  }
}

async function addImageAsPage(
  merged: PDFDocument,
  bytes: ArrayBuffer,
  contentType: string,
  caption: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>
) {
  const page = merged.addPage([A4_WIDTH, A4_HEIGHT])
  page.drawText(caption.slice(0, 90), {
    x: MARGIN,
    y: A4_HEIGHT - MARGIN,
    size: 11,
    font: bold,
    color: rgb(0.1, 0.1, 0.15),
  })

  const lower = contentType.toLowerCase()
  let image
  try {
    if (lower.includes("png")) {
      image = await merged.embedPng(bytes)
    } else if (lower.includes("jpeg") || lower.includes("jpg")) {
      image = await merged.embedJpg(bytes)
    } else {
      // Probeer jpeg/png op extensie-agnostische bytes
      try {
        image = await merged.embedJpg(bytes)
      } catch {
        image = await merged.embedPng(bytes)
      }
    }
  } catch {
    page.drawText("Afbeelding kon niet worden toegevoegd.", {
      x: MARGIN,
      y: A4_HEIGHT - MARGIN - 28,
      size: 10,
      font,
      color: rgb(0.5, 0.2, 0.2),
    })
    return
  }

  const maxW = A4_WIDTH - MARGIN * 2
  const maxH = A4_HEIGHT - MARGIN * 2 - 28
  const scale = Math.min(maxW / image.width, maxH / image.height, 1)
  const w = image.width * scale
  const h = image.height * scale
  page.drawImage(image, {
    x: MARGIN,
    y: A4_HEIGHT - MARGIN - 28 - h,
    width: w,
    height: h,
  })
}

async function drawOverviewForShip(
  merged: PDFDocument,
  shipName: string,
  forms: ShipFormDefinition[],
  recordsByKey: Record<string, FormRecord>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>
) {
  let page = merged.addPage([A4_WIDTH, A4_HEIGHT])
  let y = A4_HEIGHT - MARGIN

  page.drawText(`Formulieren — ${shipName}`, {
    x: MARGIN,
    y,
    size: 20,
    font: bold,
    color: rgb(0.08, 0.12, 0.2),
  })
  y -= 28
  page.drawText(`Afgedrukt: ${new Date().toLocaleDateString("nl-NL")}`, {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: rgb(0.4, 0.4, 0.45),
  })
  y -= 28

  const colForm = MARGIN
  const colDate = A4_WIDTH - MARGIN - 110
  const rowSize = 14
  const rowGap = 22

  page.drawText("Formulier", { x: colForm, y, size: 12, font: bold })
  page.drawText("Datum", { x: colDate, y, size: 12, font: bold })
  y -= 8
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.75),
  })
  y -= rowGap

  for (const form of forms) {
    if (y < MARGIN + 36) {
      page = merged.addPage([A4_WIDTH, A4_HEIGHT])
      y = A4_HEIGHT - MARGIN
      page.drawText(`Formulieren — ${shipName} (vervolg)`, {
        x: MARGIN,
        y,
        size: 16,
        font: bold,
      })
      y -= 28
      page.drawText("Formulier", { x: colForm, y, size: 12, font: bold })
      page.drawText("Datum", { x: colDate, y, size: 12, font: bold })
      y -= 8
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: A4_WIDTH - MARGIN, y },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.75),
      })
      y -= rowGap
    }

    const record = recordsByKey[form.key]
    const dateLabel = formatDateNl(record?.form_date)
    const label = String(form.label || form.key)

    page.drawText(label.slice(0, 48), {
      x: colForm,
      y,
      size: rowSize,
      font,
      color: rgb(0.12, 0.12, 0.18),
    })
    page.drawText(dateLabel, {
      x: colDate,
      y,
      size: rowSize,
      font,
      color: rgb(0.12, 0.12, 0.18),
    })
    y -= rowGap
  }
}

async function loadShipFormData(shipId: string) {
  const [formsRes, layoutRes] = await Promise.all([
    supabase
      .from("ship_forms")
      .select("form_key, form_date, file_name, file_path")
      .eq("ship_id", shipId),
    supabase
      .from("ship_form_layout")
      .select("custom_forms, removed_form_keys")
      .eq("ship_id", shipId)
      .maybeSingle(),
  ])

  if (formsRes.error) throw formsRes.error

  const layout = layoutRes.error
    ? createEmptyShipFormLayout()
    : parseLayoutRow(layoutRes.data)

  const recordsByKey: Record<string, FormRecord> = {}
  for (const row of formsRes.data || []) {
    const key = String(row.form_key || "")
    if (!key) continue
    recordsByKey[key] = {
      form_key: key,
      form_date: row.form_date ? String(row.form_date).slice(0, 10) : null,
      file_name: row.file_name ? String(row.file_name) : null,
      file_path: row.file_path ? String(row.file_path) : null,
    }
  }

  return {
    forms: buildVisibleShipForms(layout),
    recordsByKey,
  }
}

/**
 * Bouwt één PDF: overzicht per schip, optioneel met geüploade formulierdocumenten erachter.
 */
export async function generateShipFormsPrintPdf(
  options: ShipFormsPrintOptions
): Promise<Blob> {
  const ships = (options.ships || []).filter((s) => s?.id && s?.name)
  if (ships.length === 0) throw new Error("Selecteer minimaal een schip.")

  const merged = await PDFDocument.create()
  const font = await merged.embedFont(StandardFonts.Helvetica)
  const bold = await merged.embedFont(StandardFonts.HelveticaBold)

  for (const ship of ships) {
    const { forms, recordsByKey } = await loadShipFormData(ship.id)
    await drawOverviewForShip(merged, ship.name, forms, recordsByKey, font, bold)

    if (!options.includeDocuments) continue

    for (const form of forms) {
      const record = recordsByKey[form.key]
      if (!record?.file_path) continue

      const url = getPublicFileUrl(record.file_path)
      if (!url) {
        await addNotePage(
          merged,
          `${ship.name} — ${form.label}`,
          ["Document-URL kon niet worden opgehaald."],
          font,
          bold
        )
        continue
      }

      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const bytes = await res.arrayBuffer()
        const contentType = String(res.headers.get("content-type") || "").toLowerCase()
        const fileName = String(record.file_name || record.file_path).toLowerCase()
        const caption = `${ship.name} — ${form.label}`

        const looksPdf =
          contentType.includes("pdf") || fileName.endsWith(".pdf")
        const looksImage =
          contentType.includes("image/") ||
          /\.(png|jpe?g|webp)$/i.test(fileName)

        if (looksPdf) {
          try {
            await appendPdfBytes(merged, bytes)
          } catch {
            await addNotePage(
              merged,
              caption,
              [
                `PDF kon niet worden bijgevoegd: ${record.file_name || "bestand"}`,
                "Mogelijk is het bestand beveiligd of beschadigd.",
              ],
              font,
              bold
            )
          }
        } else if (looksImage) {
          await addImageAsPage(merged, bytes, contentType || fileName, caption, font, bold)
        } else {
          await addNotePage(
            merged,
            caption,
            [
              `Bestandstype niet printbaar in één PDF: ${record.file_name || "onbekend"}`,
              "Open het document apart vanuit Formulieren.",
            ],
            font,
            bold
          )
        }
      } catch (e: any) {
        await addNotePage(
          merged,
          `${ship.name} — ${form.label}`,
          [
            `Document laden mislukt: ${record.file_name || record.file_path}`,
            String(e?.message || e || "onbekende fout"),
          ],
          font,
          bold
        )
      }
    }
  }

  merged.setTitle("Formulieren print")
  merged.setProducer("Bamalite HR")
  const out = await merged.save({ useObjectStreams: false })
  return new Blob([out as BlobPart], { type: "application/pdf" })
}

export function openShipFormsPrintPdf(blob: Blob) {
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
        a.download = `formulieren-print-${new Date().toISOString().slice(0, 10)}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } finally {
      cleanup()
    }
  }
}
