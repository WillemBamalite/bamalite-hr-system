export type KpiItem = {
  id: string
  value: string
  title: string
  note: string
  /** Handmatig tot deze cijfers later uit de database komen. */
  source: "manual"
}

export type ChartPoint = {
  id: string
  label: string
  value: string
}

export type NewsletterChart = {
  title: string
  type: "bar" | "line"
  /** Eén regel per punt: "mei 3". Dit is wat je in het formulier typt. */
  lines: string
  points: ChartPoint[]
}

export function parseChartLines(text: string): ChartPoint[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line, index) => {
      const match = line.match(/^(.*?)(-?\d+(?:[.,]\d+)?)\s*%?\s*$/)
      if (!match) return null
      const label = match[1].replace(/[:\-–—,;\s]+$/g, "").trim()
      if (!label) return null
      return { id: `pt-${index}`, label, value: match[2] }
    })
    .filter((point): point is ChartPoint => Boolean(point))
}

export function chartLinesFromPoints(points: ChartPoint[]) {
  return points
    .filter((point) => point.label.trim())
    .map((point) => `${point.label.trim()} ${point.value.trim()}`.trim())
    .join("\n")
}

export const CHART_MONTHS = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
] as const

export function chartMonthValues(lines: string) {
  const values: Record<string, string> = {}
  for (const month of CHART_MONTHS) values[month] = ""
  for (const point of parseChartLines(lines || "")) {
    const month = CHART_MONTHS.find((item) => item.toLowerCase() === point.label.toLowerCase())
    if (month) values[month] = point.value
  }
  return values
}

export function chartLinesFromMonths(values: Record<string, string>) {
  return CHART_MONTHS.filter((month) => values[month]?.trim())
    .map((month) => `${month} ${values[month].trim()}`)
    .join("\n")
}

export const SPOTLIGHT_PHOTO_LIMIT = 4

export type SpotlightContent = {
  type: "crew" | "ship"
  crewId: string
  shipId: string
  photoDataUrl: string
  photos: string[]
  intro: string
  functie: string
  special: string
  fact: string
  quote: string
}

export type OpsCategory = "klasse" | "biq" | "vetting" | "werf" | "inspectie"

export type OpsItem = {
  id: string
  category: OpsCategory
  shipId: string
  period: string
  note: string
}

export type SafetyMoment = {
  title: string
  text: string
  photoDataUrl: string
}

export type LessonLearned = {
  title: string
  text: string
  incidentId: string
  incidentLabel: string
}

export type FleetPhoto = {
  id: string
  shipName: string
  location: string
  caption: string
  imageDataUrl: string
}

export type AgendaItem = {
  id: string
  date: string
  title: string
  note: string
  shipId: string
}

export type WorkshopEntry = {
  id: string
  name: string
  role: string
  date: string
  years: string
}

export type NewsletterContent = {
  editionId: string
  intro: string
  kpis: KpiItem[]
  chart: NewsletterChart
  spotlight: SpotlightContent
  opsUpdate: string
  opsItems: OpsItem[]
  safety: SafetyMoment
  lesson: LessonLearned
  photos: FleetPhoto[]
  workshopNews: string
  workshopBirthdays: WorkshopEntry[]
  workshopJoining: WorkshopEntry[]
  workshopAnniversaries: WorkshopEntry[]
  bftNews: string
  bftBirthdays: WorkshopEntry[]
  bftJoining: WorkshopEntry[]
  bftAnniversaries: WorkshopEntry[]
  agenda: AgendaItem[]
  officeUpdates: string
  officeClosing: string
  hiddenPeople: string[]
}

export const OPS_CATEGORIES: { id: OpsCategory; label: string; hint?: string; printLabel: string }[] = [
  { id: "klasse", label: "Naar de werf voor klasse", printLabel: "Klasse" },
  { id: "werf", label: "Werf / onderhoud", printLabel: "Werf" },
  { id: "biq", label: "BIQ-inspectie", printLabel: "BIQ" },
  { id: "vetting", label: "BFT", hint: "Nieuws van ons bevrachtingskantoor BFT.", printLabel: "BFT" },
  { id: "inspectie", label: "Overige inspectie", printLabel: "Inspectie" },
]

export function newsletterUid(prefix = "n") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function emptyKpis(): KpiItem[] {
  return [0, 1, 2].map((i) => ({
    id: `kpi-${i}`,
    value: "",
    title: "",
    note: "",
    source: "manual" as const,
  }))
}

export function emptyContent(editionId: string): NewsletterContent {
  return {
    editionId,
    intro: "",
    kpis: emptyKpis(),
    chart: { title: "", type: "bar", lines: "", points: [] },
    spotlight: {
      type: "crew",
      crewId: "",
      shipId: "",
      photoDataUrl: "",
      photos: [],
      intro: "",
      functie: "",
      special: "",
      fact: "",
      quote: "",
    },
    opsUpdate: "",
    opsItems: [],
    safety: { title: "", text: "", photoDataUrl: "" },
    lesson: { title: "", text: "", incidentId: "", incidentLabel: "" },
    photos: [],
    workshopNews: "",
    workshopBirthdays: [],
    workshopJoining: [],
    workshopAnniversaries: [],
    bftNews: "",
    bftBirthdays: [],
    bftJoining: [],
    bftAnniversaries: [],
    agenda: [],
    officeUpdates: "",
    officeClosing: "",
    hiddenPeople: [],
  }
}

function asText(value: unknown) {
  return typeof value === "string" ? value : ""
}

function normalizeKpis(raw: unknown): KpiItem[] {
  const list = Array.isArray(raw) ? raw : []
  const next = emptyKpis()
  for (let i = 0; i < 3; i += 1) {
    const item = list[i]
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    next[i] = {
      id: asText(row.id) || next[i].id,
      value: asText(row.value),
      title: asText(row.title),
      note: asText(row.note),
      source: "manual",
    }
  }
  return next
}

function normalizeChart(raw: unknown): NewsletterChart {
  const chart = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const storedPoints = Array.isArray(chart.points) ? chart.points : []
  const pointsFromStore: ChartPoint[] = storedPoints
    .slice(0, 12)
    .map((point) => {
      const row = point && typeof point === "object" ? (point as Record<string, unknown>) : {}
      return {
        id: asText(row.id) || newsletterUid("pt"),
        label: asText(row.label),
        value: asText(row.value),
      }
    })
    .filter((point) => point.label || point.value)
  const lines = asText(chart.lines) || chartLinesFromPoints(pointsFromStore)
  return {
    title: asText(chart.title),
    type: chart.type === "line" ? "line" : "bar",
    lines,
    points: lines.trim() ? parseChartLines(lines) : pointsFromStore,
  }
}

function normalizeSpotlightPhotos(row: Record<string, unknown>) {
  const listed = Array.isArray(row.photos) ? row.photos.map((item) => asText(item).trim()).filter(Boolean) : []
  const first = asText(row.photoDataUrl).trim()
  const photos = first && !listed.includes(first) ? [first, ...listed] : listed
  return photos.slice(0, SPOTLIGHT_PHOTO_LIMIT)
}

function normalizeSpotlight(raw: unknown): SpotlightContent {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const photos = normalizeSpotlightPhotos(row)
  return {
    type: row.type === "ship" ? "ship" : "crew",
    crewId: asText(row.crewId),
    shipId: asText(row.shipId),
    photoDataUrl: photos[0] || "",
    photos,
    intro: asText(row.intro),
    functie: asText(row.functie),
    special: asText(row.special),
    fact: asText(row.fact),
    quote: asText(row.quote),
  }
}

const OPS_IDS = new Set<OpsCategory>(["klasse", "biq", "vetting", "werf", "inspectie"])

function normalizeOps(raw: unknown): OpsItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      const category = asText(row.category) as OpsCategory
      if (!OPS_IDS.has(category)) return null
      return {
        id: asText(row.id) || newsletterUid("ops"),
        category,
        shipId: asText(row.shipId),
        period: asText(row.period),
        note: asText(row.note),
      }
    })
    .filter((item): item is OpsItem => Boolean(item))
}

function normalizePhotos(raw: unknown): FleetPhoto[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 8)
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      const imageDataUrl = asText(row.imageDataUrl)
      if (!imageDataUrl) return null
      return {
        id: asText(row.id) || newsletterUid("photo"),
        shipName: asText(row.shipName),
        location: asText(row.location),
        caption: asText(row.caption),
        imageDataUrl,
      }
    })
    .filter((item): item is FleetPhoto => Boolean(item))
}

function normalizeWorkshop(raw: unknown): WorkshopEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      const name = asText(row.name)
      const role = asText(row.role)
      const date = asText(row.date)
      const years = asText(row.years)
      if (!name && !role && !date && !years) return null
      return {
        id: asText(row.id) || newsletterUid("ws"),
        name,
        role,
        date,
        years,
      }
    })
    .filter((item): item is WorkshopEntry => Boolean(item))
}

function normalizeHiddenPeople(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((item) => asText(item).trim()).filter(Boolean))]
}

function normalizeAgenda(raw: unknown): AgendaItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      const title = asText(row.title)
      const note = asText(row.note)
      const date = asText(row.date)
      const shipId = asText(row.shipId)
      if (!title && !note && !date && !shipId) return null
      return {
        id: asText(row.id) || newsletterUid("ag"),
        date,
        title,
        note,
        shipId,
      }
    })
    .filter((item): item is AgendaItem => Boolean(item))
}

export function normalizeContent(raw: unknown, editionId: string): NewsletterContent {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const safety = row.safety && typeof row.safety === "object" ? (row.safety as Record<string, unknown>) : {}
  const lesson = row.lesson && typeof row.lesson === "object" ? (row.lesson as Record<string, unknown>) : {}
  const opsItems = normalizeOps(row.opsItems)
  const carriedBftNews = opsItems
    .filter((item) => item.category === "vetting" && item.note.trim())
    .map((item) => item.note.trim())
    .join("\n\n")
  const bftNews = asText(row.bftNews) || carriedBftNews
  return {
    editionId,
    intro: asText(row.intro),
    kpis: normalizeKpis(row.kpis),
    chart: normalizeChart(row.chart),
    spotlight: normalizeSpotlight(row.spotlight),
    opsUpdate: asText(row.opsUpdate),
    opsItems: opsItems.filter((item) => item.category !== "vetting"),
    safety: {
      title: asText(safety.title),
      text: asText(safety.text),
      photoDataUrl: asText(safety.photoDataUrl),
    },
    lesson: {
      title: asText(lesson.title),
      text: asText(lesson.text),
      incidentId: asText(lesson.incidentId),
      incidentLabel: asText(lesson.incidentLabel),
    },
    photos: normalizePhotos(row.photos),
    workshopNews: asText(row.workshopNews),
    workshopBirthdays: normalizeWorkshop(row.workshopBirthdays),
    workshopJoining: normalizeWorkshop(row.workshopJoining),
    workshopAnniversaries: normalizeWorkshop(row.workshopAnniversaries),
    bftNews,
    bftBirthdays: normalizeWorkshop(row.bftBirthdays),
    bftJoining: normalizeWorkshop(row.bftJoining),
    bftAnniversaries: normalizeWorkshop(row.bftAnniversaries),
    agenda: normalizeAgenda(row.agenda),
    officeUpdates: asText(row.officeUpdates),
    officeClosing: asText(row.officeClosing),
    hiddenPeople: normalizeHiddenPeople(row.hiddenPeople),
  }
}

function legacyHasContent(raw: Record<string, unknown>) {
  const photos = Array.isArray(raw.sharedPhotos) ? raw.sharedPhotos.length : 0
  const yard = Array.isArray(raw.yardShipIds) ? raw.yardShipIds.length : 0
  const biq = Array.isArray(raw.biqShipIds) ? raw.biqShipIds.length : 0
  return Boolean(
    asText(raw.intro) ||
      asText(raw.updates) ||
      asText(raw.closing) ||
      asText(raw.opsUpdate) ||
      asText(raw.safetyTip) ||
      asText(raw.spotlightText) ||
      asText(raw.spotlightCrewId) ||
      asText(raw.spotlightShipId) ||
      photos ||
      yard ||
      biq
  )
}

/** Eerste keer: oud browser-concept meenemen naar de centrale editie. */
export function migrateLegacyDraft(raw: unknown, editionId: string): NewsletterContent | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  if (row.kpis || row.spotlight && typeof row.spotlight === "object") return null
  if (!legacyHasContent(row)) return null

  const content = emptyContent(editionId)
  content.intro = asText(row.intro)
  content.opsUpdate = asText(row.opsUpdate)
  content.officeUpdates = asText(row.updates)
  content.officeClosing = asText(row.closing)
  content.spotlight = {
    ...content.spotlight,
    type: row.spotlightType === "ship" ? "ship" : "crew",
    crewId: asText(row.spotlightCrewId),
    shipId: asText(row.spotlightShipId),
    intro: asText(row.spotlightText),
  }
  content.safety = { title: "", text: asText(row.safetyTip), photoDataUrl: "" }
  const yard = Array.isArray(row.yardShipIds) ? row.yardShipIds : []
  const biq = Array.isArray(row.biqShipIds) ? row.biqShipIds : []
  content.opsItems = [
    ...yard.map((id) => ({
      id: `yard-${String(id)}`,
      category: "klasse" as const,
      shipId: String(id),
      period: "",
      note: "",
    })),
    ...biq.map((id) => ({
      id: `biq-${String(id)}`,
      category: "biq" as const,
      shipId: String(id),
      period: "",
      note: "",
    })),
  ]
  content.photos = normalizePhotos(row.sharedPhotos)
  return content
}

export function readLegacyDraft(editionId: string): NewsletterContent | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(`newsletter-monthly-${editionId}`)
  if (!raw) return null
  try {
    return migrateLegacyDraft(JSON.parse(raw), editionId)
  } catch {
    return null
  }
}

export function clearLegacyDraft(editionId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(`newsletter-monthly-${editionId}`)
}
