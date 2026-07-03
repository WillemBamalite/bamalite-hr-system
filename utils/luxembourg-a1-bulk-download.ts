import JSZip from "jszip"
import { COMPANY_CCSS_MATRICULE } from "@/utils/luxembourg-a1-config"
import {
  buildA1DownloadFilename,
  generateLuxembourgA1Package,
  type LuxembourgA1MemberInput,
} from "@/utils/luxembourg-a1-generator"

export type LuxembourgA1BulkItem = {
  member: LuxembourgA1MemberInput
  shipName: string
  shipCompany?: string | null
}

export const A1_BULK_COMPANIES = Object.keys(COMPANY_CCSS_MATRICULE)

export function normalizeA1CompanyKey(company: string | null | undefined): string | null {
  const raw = String(company || "").trim()
  if (!raw) return null
  if (COMPANY_CCSS_MATRICULE[raw]) return raw
  const norm = raw.toLowerCase().replace(/[\s.]/g, "")
  for (const key of A1_BULK_COMPANIES) {
    if (key.toLowerCase().replace(/[\s.]/g, "") === norm) return key
  }
  return null
}

export function buildA1BulkZipFilenameForCompany(year: number, company: string): string {
  const slug = company
    .replace(/\s+/g, "-")
    .replace(/\./g, "")
    .replace(/[^a-zA-Z0-9-]/g, "")
  return `A1-${year}-${slug}.zip`
}

export async function generateLuxembourgA1BulkZip(options: {
  items: LuxembourgA1BulkItem[]
  generatedAt?: Date
  baseUrl?: string
  onProgress?: (done: number, total: number) => void
}): Promise<Blob> {
  const { items, onProgress } = options
  const generatedAt = options.generatedAt ?? new Date()
  const year = generatedAt.getFullYear()
  const zip = new JSZip()

  for (let i = 0; i < items.length; i++) {
    const { member, shipName } = items[i]
    const blob = await generateLuxembourgA1Package({
      member,
      shipName,
      shipCompany: items[i].shipCompany,
      generatedAt,
      baseUrl: options.baseUrl,
    })
    zip.file(buildA1DownloadFilename(member, shipName, year), blob)
    onProgress?.(i + 1, items.length)
  }

  return zip.generateAsync({ type: "blob" })
}

export type LuxembourgA1CompanyZip = {
  company: string
  blob: Blob
  filename: string
  count: number
}

export async function generateLuxembourgA1BulkZipsByCompany(options: {
  items: LuxembourgA1BulkItem[]
  generatedAt?: Date
  baseUrl?: string
  onProgress?: (done: number, total: number) => void
}): Promise<LuxembourgA1CompanyZip[]> {
  const generatedAt = options.generatedAt ?? new Date()
  const year = generatedAt.getFullYear()
  const grouped = new Map<string, LuxembourgA1BulkItem[]>()

  for (const company of A1_BULK_COMPANIES) {
    grouped.set(company, [])
  }

  for (const item of options.items) {
    const key = normalizeA1CompanyKey(item.member.company) || "Onbekend"
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  const entries = A1_BULK_COMPANIES.map((company) => ({
    company,
    items: grouped.get(company) || [],
  })).filter((entry) => entry.items.length > 0)

  const total = entries.reduce((sum, entry) => sum + entry.items.length, 0)
  let done = 0
  const results: LuxembourgA1CompanyZip[] = []

  for (const entry of entries) {
    const zip = new JSZip()
    for (const item of entry.items) {
      const blob = await generateLuxembourgA1Package({
        member: item.member,
        shipName: item.shipName,
        shipCompany: item.shipCompany,
        generatedAt,
        baseUrl: options.baseUrl,
      })
      zip.file(
        buildA1DownloadFilename(item.member, item.shipName, year),
        blob
      )
      done += 1
      options.onProgress?.(done, total)
    }
    results.push({
      company: entry.company,
      blob: await zip.generateAsync({ type: "blob" }),
      filename: buildA1BulkZipFilenameForCompany(year, entry.company),
      count: entry.items.length,
    })
  }

  return results
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadLuxembourgA1CompanyZips(
  zips: LuxembourgA1CompanyZip[],
  delayMs = 350
) {
  for (let i = 0; i < zips.length; i++) {
    triggerBrowserDownload(zips[i].blob, zips[i].filename)
    if (i < zips.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}
