export async function compressImageFile(file: File, maxWidth = 1400, quality = 0.72): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Kies een afbeelding (jpg, png of webp).")
  }
  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Foto is te groot. Kies een bestand tot 4 MB.")
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxWidth / Math.max(bitmap.width, 1))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Kon foto niet verwerken.")
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    return canvas.toDataURL("image/jpeg", quality)
  } catch {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ""))
      reader.onerror = () => reject(new Error("Kon foto niet lezen."))
      reader.readAsDataURL(file)
    })
    if (!dataUrl) throw new Error("Kon foto niet toevoegen.")
    return dataUrl
  }
}
