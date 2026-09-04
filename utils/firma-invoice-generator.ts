import { PDFDocument, StandardFonts } from "pdf-lib"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import {
  formatEuroInvoice,
  formatMonthToken,
  getFirmaInvoiceDetails,
  type FirmaInvoiceDetails,
} from "@/utils/firma-invoice-details"

export type FirmaInvoiceInput = {
  fromCompany: string
  toCompany: string
  /** Eén schip, of meerdere komma-gescheiden als de groep over schepen heen gaat. */
  shipName: string
  /** Eén naam, of meerdere komma-gescheiden (factuur is per firma, niet per persoon). */
  employeeName: string
  monthKey: string
  /** Som van de bruto bedragen van iedereen op deze factuur. */
  nettoAmount: number
  vatPercent: number
  invoiceNumber: string
  invoiceDate?: Date
}

function normalizeText(text: string): string {
  if (!text) return text
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "")
}

/** Vaste labelkolom → EUR-bedragen netjes onder elkaar. */
const MONEY_LABEL_WIDTH = 18

function padMoneyLine(label: string, amount: number): string {
  return `${label.padEnd(MONEY_LABEL_WIDTH, " ")}${formatEuroInvoice(amount)}`
}

const MONEY_FIELD_NAMES = new Set(["regel 11", "regel 12", "regel 13"])

async function fillNamedFields(
  pdfDoc: PDFDocument,
  values: Record<string, string>
): Promise<number> {
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const courier = await pdfDoc.embedFont(StandardFonts.Courier)
  const form = pdfDoc.getForm()
  let filled = 0
  for (const field of form.getFields()) {
    let name = ""
    try {
      name = field.getName()
    } catch {
      continue
    }
    const raw = values[name] ?? values[name.replace(/\s+/g, " ")] ?? ""
    const text = normalizeText(String(raw || ""))
    if (!text) continue
    try {
      if (typeof (field as any).setText === "function") {
        ;(field as any).setText(text)
        filled++
      }
      const font = MONEY_FIELD_NAMES.has(name) ? courier : helvetica
      if (typeof (field as any).defaultUpdateAppearances === "function") {
        ;(field as any).defaultUpdateAppearances(font)
      } else if (typeof (field as any).updateAppearances === "function") {
        ;(field as any).updateAppearances(font)
      }
      if (typeof (field as any).enableReadOnly === "function") {
        ;(field as any).enableReadOnly()
      }
    } catch {
      // ignore
    }
  }
  return filled
}

function requireDetails(company: string): FirmaInvoiceDetails {
  const details = getFirmaInvoiceDetails(company)
  if (!details) {
    throw new Error(`Geen factuurgegevens gevonden voor firma: ${company}`)
  }
  return details
}

/**
 * Vult public/contracts/contract_firma.pdf (regel 1..19).
 * Geen flatten — Acrobat print-safe.
 */
export async function generateFirmaDoorbelastingInvoice(
  input: FirmaInvoiceInput
): Promise<Blob> {
  const maker = requireDetails(input.fromCompany)
  const receiver = requireDetails(input.toCompany)
  const invoiceDate = input.invoiceDate || new Date()
  const vatAmount = Math.round(input.nettoAmount * (input.vatPercent / 100) * 100) / 100
  const total = Math.round((input.nettoAmount + vatAmount) * 100) / 100
  const monthToken = formatMonthToken(input.monthKey)

  const values: Record<string, string> = {
    "regel 1": maker.name,
    "regel 2": format(invoiceDate, "dd-MM-yyyy", { locale: nl }),
    "regel 3": receiver.name,
    "regel 4": receiver.street,
    "regel 5": receiver.postalCity,
    "regel 6": receiver.vatNumber,
    "regel 7": receiver.tradeNumber,
    "regel 8": input.invoiceNumber,
    "regel 9": `Bemanning ${input.shipName} ${monthToken}`,
    "regel 10": input.employeeName,
    "regel 11": padMoneyLine("netto", input.nettoAmount),
    "regel 12": padMoneyLine(`BTW ${input.vatPercent}%`, vatAmount),
    "regel 13": padMoneyLine("Totaal incl. BTW", total),
    "regel 14": maker.street,
    "regel 15": maker.postalCity,
    "regel 16": maker.invoiceEmail || maker.email,
    "regel 17": maker.vatNumber,
    "regel 18": maker.tradeNumber,
    "regel 19": maker.bankAccount,
  }

  const templatePath =
    typeof window !== "undefined"
      ? `${window.location.origin}/contracts/contract_firma.pdf`
      : "/contracts/contract_firma.pdf"
  const res = await fetch(templatePath)
  if (!res.ok) throw new Error(`Kon factuurtemplate niet laden (${res.status})`)
  const bytes = await res.arrayBuffer()
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const filled = await fillNamedFields(pdfDoc, values)
  if (filled === 0) throw new Error("Geen factuurvelden konden worden ingevuld")

  const out = await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    updateFieldAppearances: true,
  })
  return new Blob([out as BlobPart], { type: "application/pdf" })
}

export function downloadFirmaInvoice(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
