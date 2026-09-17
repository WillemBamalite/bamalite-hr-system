export type WhatsAppParseResult = {
  firstName: string
  lastName: string
  phone: string
  email: string
  position: string
  nationality: string
  residence: string
  birthDate: string
  startMogelijkheid: string
  notes: string
  drivingLicense: boolean
}

const POSITION_ALIASES: Array<{ value: string; patterns: RegExp[] }> = [
  { value: "Kapitein", patterns: [/\bkapitein\b/i, /\bcaptain\b/i, /\bschipper\b/i] },
  { value: "2e kapitein", patterns: [/\b2e?\s*kapitein\b/i, /\bsecond\s*captain\b/i] },
  { value: "Stuurman", patterns: [/\bstuurman\b/i, /\bmate\b/i, /\bbootsman\b/i] },
  { value: "Matroos", patterns: [/\bmatroos\b/i, /\bsailor\b/i, /\bable\s*seaman\b/i] },
  { value: "Lichtmatroos", patterns: [/\blichtmatroos\b/i, /\bleichtmatrose\b/i] },
  { value: "Deksman", patterns: [/\bdeksman\b/i, /\bdeckhand\b/i] },
  { value: "Kok", patterns: [/\bkok\b/i, /\bcook\b/i] },
]

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeText(input: string): string {
  return input
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function extractEmail(text: string): string {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0]?.toLowerCase() || ""
}

function extractPhone(text: string): string {
  // Prefer international / clearly phone-like numbers
  const candidates = text.match(
    /(?:\+|00)?[\d][\d\s()./-]{7,}\d/g
  ) || []

  for (const raw of candidates) {
    const digits = raw.replace(/\D/g, "")
    if (digits.length < 8 || digits.length > 15) continue
    // Skip likely dates (e.g. 21.04.1989 → 21041989)
    if (/^\d{8}$/.test(digits) && /^(19|20)\d{6}$/.test(digits)) continue
    return collapseWhitespace(raw)
  }
  return ""
}

function extractLabeledValue(text: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(
      `(?:^|\\n)\\s*${label}\\s*[:\\-]?\\s*([^\\n]+)`,
      "i"
    )
    const match = text.match(re)
    if (match?.[1]) {
      const value = collapseWhitespace(match[1])
      if (value) return value
    }
  }
  return ""
}

function parseDateToIso(value: string): string {
  const cleaned = collapseWhitespace(value).replace(/[./]/g, "-")
  const dmy = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  return ""
}

function mapNationality(raw: string): string {
  const value = (raw || "").toLowerCase()
  if (!value) return "NL"
  if (value.includes("neder") || value === "nl") return "NL"
  if (value.includes("belg") || value === "be") return "BE"
  if (value.includes("duits") || value.includes("german") || value === "de") return "DE"
  if (value.includes("pool") || value.includes("polish") || value === "pl" || value === "po") return "PO"
  if (value.includes("tsje") || value.includes("czech") || value === "cz") return "CZ"
  if (value.includes("slowa") || value.includes("slovak") || value === "sk" || value === "slk") return "SLK"
  if (value.includes("hong") || value.includes("hungar") || value === "hu") return "HUN"
  if (value.includes("serv") || value.includes("serb")) return "SERV"
  if (value.includes("roeme") || value.includes("romanian") || value === "ro") return "RO"
  return "NL"
}

function detectNationalityFromText(text: string): string {
  const labeled = extractLabeledValue(text, ["Nationaliteit", "Nationality", "Staatsangehörigkeit"])
  if (labeled) return mapNationality(labeled)
  return mapNationality(text)
}

function detectPosition(text: string): string {
  const labeled = extractLabeledValue(text, [
    "Functie",
    "Position",
    "Solliciteer als",
    "Solliciteert als",
    "Ik zoek",
    "Looking for",
  ])
  const haystack = labeled || text
  for (const item of POSITION_ALIASES) {
    if (item.patterns.some((p) => p.test(haystack))) return item.value
  }
  return ""
}

function splitFullName(fullName: string): { firstName: string; lastName: string } | null {
  const cleaned = collapseWhitespace(
    fullName
      .replace(/^ik\s+ben\s+/i, "")
      .replace(/^mijn\s+naam\s+is\s+/i, "")
      .replace(/^i\s+am\s+/i, "")
      .replace(/^my\s+name\s+is\s+/i, "")
  )
  const parts = cleaned.split(" ").filter(Boolean)
  if (parts.length < 2) return null
  // Ignore lines that look like sentences
  if (parts.length > 5) return null
  if (/[@\d]/.test(cleaned)) return null
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

function extractName(text: string): { firstName: string; lastName: string } {
  const labeledFull = extractLabeledValue(text, ["Naam", "Name", "Volledige naam", "Full name"])
  const fromLabeledFull = splitFullName(labeledFull)
  if (fromLabeledFull) return fromLabeledFull

  const first = extractLabeledValue(text, ["Voornaam", "First name", "Firstname"])
  const last = extractLabeledValue(text, ["Achternaam", "Last name", "Lastname", "Surname"])
  if (first && last) {
    return { firstName: first, lastName: last }
  }

  // "Ik ben Jan de Vries" / "My name is ..."
  const intro = text.match(
    /(?:^|\n)\s*(?:ik\s+ben|mijn\s+naam\s+is|i\s+am|my\s+name\s+is)\s+([^\n,.!?]+)/i
  )
  if (intro?.[1]) {
    const fromIntro = splitFullName(intro[1])
    if (fromIntro) return fromIntro
  }

  // WhatsApp export: [date] Name: message  OR  Name: message
  const waHeader = text.match(
    /(?:^|\n)\s*(?:\[[^\]]+\]\s*)?([A-ZÀ-ÖØ-Ý][A-Za-zÀ-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][A-Za-zÀ-öø-ÿ'’-]+){1,3})\s*:/
  )
  if (waHeader?.[1]) {
    const fromHeader = splitFullName(waHeader[1])
    if (fromHeader) return fromHeader
  }

  // First non-empty short line that looks like a person name
  for (const line of text.split("\n")) {
    const cleaned = collapseWhitespace(line.replace(/^[\-•*]\s*/, ""))
    if (!cleaned || cleaned.length > 40) continue
    if (/^(hallo|hoi|hey|goedemorgen|goede|dear|hi)\b/i.test(cleaned)) continue
    const fromLine = splitFullName(cleaned)
    if (fromLine) return fromLine
  }

  return { firstName: first || "", lastName: last || "" }
}

function detectDrivingLicense(text: string): boolean {
  const labeled = extractLabeledValue(text, ["Rijbewijs", "Driving license", "Führerschein"])
  if (labeled) {
    return /^(ja|yes|y|true|rijbewijs)/i.test(labeled)
  }
  return /\brijbewijs\b/i.test(text) && !/\bgeen\s+rijbewijs\b/i.test(text)
}

/**
 * Haalt kandidaatvelden uit vrije WhatsApp-/chattekst.
 * Onzekere velden blijven leeg zodat de gebruiker ze in de preview kan aanvullen.
 */
export function parseWhatsAppCandidateText(raw: string): WhatsAppParseResult {
  const text = normalizeText(raw || "")
  const name = extractName(text)
  const email = extractEmail(text)
  const phone = extractPhone(text)
  const position = detectPosition(text)
  const residence =
    extractLabeledValue(text, ["Woonplaats", "Woonachtig", "City", "Wohnort", "Plaats"]) || ""
  const birthRaw =
    extractLabeledValue(text, ["Geboortedatum", "Geboren", "Date of birth", "DOB", "Geburtstag"]) ||
    ""
  const birthFromText =
    birthRaw ||
    (text.match(/\b(\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/)?.[1] || "")
  const availableRaw = extractLabeledValue(text, [
    "Beschikbaar vanaf",
    "Available from",
    "Start",
    "Kan starten",
  ])

  const notesParts: string[] = []
  if (text) {
    notesParts.push("WhatsApp-bericht:")
    notesParts.push(text)
  }

  return {
    firstName: name.firstName,
    lastName: name.lastName,
    phone,
    email,
    position,
    nationality: detectNationalityFromText(text),
    residence,
    birthDate: parseDateToIso(birthFromText),
    startMogelijkheid: parseDateToIso(availableRaw),
    notes: notesParts.join("\n"),
    drivingLicense: detectDrivingLicense(text),
  }
}
