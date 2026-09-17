const TRANSLATION_MARKERS = ["Nederlandse vertaling:", "Automatische vertaling:"]

function findTranslationMarkerIndex(text: string): { index: number; marker: string } | null {
  let best: { index: number; marker: string } | null = null
  for (const marker of TRANSLATION_MARKERS) {
    const index = text.indexOf(marker)
    if (index < 0) continue
    if (!best || index < best.index) best = { index, marker }
  }
  return best
}

export function looksNonDutch(text: string): boolean {
  const sample = String(text || "").toLowerCase()
  if (sample.trim().length < 40) return false

  const score = (words: string[]) =>
    words.reduce((sum, w) => sum + (sample.match(new RegExp(`\\b${w}\\b`, "g")) || []).length, 0)

  const nl = score([
    "het",
    "een",
    "van",
    "voor",
    "niet",
    "zijn",
    "met",
    "naar",
    "als",
    "ook",
    "bij",
    "deze",
    "beschikbaar",
    "ervaring",
  ])
  const en = score([
    "the",
    "and",
    "you",
    "for",
    "with",
    "have",
    "this",
    "that",
    "am",
    "years",
    "looking",
    "available",
    "experience",
    "from",
  ])
  const de = score([
    "und",
    "ich",
    "der",
    "die",
    "das",
    "bin",
    "für",
    "mit",
    "nicht",
    "jahre",
    "suche",
    "verfügbar",
    "erfahrung",
  ])

  const foreign = Math.max(en, de)
  return foreign >= 3 && foreign > nl
}

export function extractWhatsAppBody(notes: string): string {
  const text = String(notes || "")
  const found = findTranslationMarkerIndex(text)
  const withoutTranslation = found
    ? text.slice(0, found.index).replace(/\n*-+\n*$/, "").trim()
    : text
  const header = /^WhatsApp-bericht:\s*/i
  if (header.test(withoutTranslation)) {
    return withoutTranslation.replace(header, "").trim()
  }
  return withoutTranslation.trim()
}

export function hasDutchTranslation(notes: string): boolean {
  return findTranslationMarkerIndex(String(notes || "")) !== null
}

/** Vervangt de notitie door de Nederlandse tekst (origineel EN/DE verdwijnt). */
export function replaceNotesWithDutchTranslation(notes: string, translated: string): string {
  const nl = String(translated || "").trim()
  if (!nl) return String(notes || "").trim()
  const hadWhatsAppHeader = /^WhatsApp-bericht:/i.test(String(notes || "").trim())
  return hadWhatsAppHeader ? `WhatsApp-bericht:\n${nl}` : nl
}

/** @deprecated gebruik replaceNotesWithDutchTranslation */
export function appendDutchTranslation(notes: string, translated: string): string {
  return replaceNotesWithDutchTranslation(notes, translated)
}

export function splitNotesOriginalAndTranslation(notes: string): {
  original: string
  translation: string | null
} {
  const text = String(notes || "")
  const found = findTranslationMarkerIndex(text)
  if (!found) {
    return { original: text.trim(), translation: null }
  }
  const original = text.slice(0, found.index).replace(/\n*-+\n*$/, "").trim()
  const translation = text.slice(found.index + found.marker.length).trim()
  return { original, translation: translation || null }
}

/** Voor weergave: als er al een oude "origineel + vertaling" notitie is, toon alleen NL. */
export function getDisplayNotesText(notes: string): string {
  const { original, translation } = splitNotesOriginalAndTranslation(notes)
  if (translation) {
    const hadWhatsAppHeader = /^WhatsApp-bericht:/i.test(original)
    return hadWhatsAppHeader ? `WhatsApp-bericht:\n${translation}` : translation
  }
  return original
}
