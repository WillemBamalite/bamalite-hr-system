import JSZip from "jszip"
import {
  buildA1DownloadFilename,
  generateLuxembourgA1Package,
  type LuxembourgA1MemberInput,
} from "@/utils/luxembourg-a1-generator"

export type LuxembourgA1BulkItem = {
  member: LuxembourgA1MemberInput
  shipName: string
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
      generatedAt,
      baseUrl: options.baseUrl,
    })
    zip.file(buildA1DownloadFilename(member, shipName, year), blob)
    onProgress?.(i + 1, items.length)
  }

  return zip.generateAsync({ type: "blob" })
}

export function buildA1BulkZipFilename(year: number): string {
  return `A1-${year}-alle-pakketten.zip`
}
