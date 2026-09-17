import { NextRequest, NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/api-security"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function chunkText(text: string, maxLen: number): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= maxLen) return [trimmed]

  const chunks: string[] = []
  let rest = trimmed
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf("\n", maxLen)
    if (cut < maxLen * 0.4) cut = rest.lastIndexOf(". ", maxLen)
    if (cut < maxLen * 0.4) cut = rest.lastIndexOf(" ", maxLen)
    if (cut < maxLen * 0.4) cut = maxLen
    chunks.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

function detectSourceLang(text: string): "en" | "de" | "auto" {
  const sample = text.toLowerCase()
  const score = (words: string[]) =>
    words.reduce((sum, w) => sum + (sample.match(new RegExp(`\\b${w}\\b`, "g")) || []).length, 0)
  const en = score([
    "the",
    "and",
    "you",
    "for",
    "with",
    "have",
    "this",
    "that",
    "years",
    "looking",
    "available",
    "experience",
    "from",
    "work",
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
    "arbeit",
  ])
  if (en >= 3 && en >= de) return "en"
  if (de >= 3 && de > en) return "de"
  return "auto"
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function translateChunkMyMemory(chunk: string, source: "en" | "de" | "auto"): Promise<string> {
  const langpair = source === "auto" ? "Autodetect|nl" : `${source}|nl`
  const url =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(chunk) +
    "&langpair=" +
    encodeURIComponent(langpair)

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`MyMemory status ${res.status}`)
  }
  const data = await res.json()
  const translated = String(data?.responseData?.translatedText || "").trim()
  const status = Number(data?.responseStatus || 0)
  if (!translated || (status && status !== 200)) {
    throw new Error(String(data?.responseDetails || "MyMemory gaf geen vertaling"))
  }
  // MyMemory soms "QUERY LENGTH LIMIT EXCEEDED" in the text itself
  if (/query length limit/i.test(translated)) {
    throw new Error("Tekstdeel te lang voor vertaling")
  }
  return translated
}

async function translateChunkLibre(chunk: string, source: "en" | "de" | "auto"): Promise<string> {
  const res = await fetch("https://libretranslate.com/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      q: chunk,
      source: source === "auto" ? "auto" : source,
      target: "nl",
      format: "text",
    }),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`LibreTranslate status ${res.status}`)
  }
  const data = await res.json()
  const translated = String(data?.translatedText || "").trim()
  if (!translated) throw new Error("LibreTranslate gaf geen vertaling")
  return translated
}

async function translateChunkWithFallback(
  chunk: string,
  source: "en" | "de" | "auto"
): Promise<string> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await translateChunkMyMemory(chunk, source)
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error(String(e))
      await sleep(400 * (attempt + 1))
    }
  }
  try {
    return await translateChunkLibre(chunk, source)
  } catch (e: any) {
    lastError = e instanceof Error ? e : new Error(String(e))
  }
  throw lastError || new Error("Vertalen mislukt")
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireApiAccess(request, "authenticated")
    if (accessError) return accessError

    const body = await request.json().catch(() => ({}))
    const text = String(body?.text || "").trim()
    if (!text) {
      return NextResponse.json({ success: false, error: "Geen tekst om te vertalen." }, { status: 400 })
    }
    if (text.length > 12000) {
      return NextResponse.json(
        { success: false, error: "Tekst is te lang om te vertalen (max. 12.000 tekens)." },
        { status: 400 }
      )
    }

    const source = detectSourceLang(text)
    // MyMemory free limiet ~500 tekens per request
    const chunks = chunkText(text, 450)
    const translatedParts: string[] = []

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) await sleep(350)
      translatedParts.push(await translateChunkWithFallback(chunks[i], source))
    }

    const translated = translatedParts.join("\n").trim()
    if (!translated) {
      return NextResponse.json({ success: false, error: "Geen vertaling ontvangen." }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      translated,
      detectedLang: source === "auto" ? null : source,
      skipped: false,
    })
  } catch (error: any) {
    console.error("translate-to-nl failed:", error)
    const msg = String(error?.message || "Vertalen mislukt")
    const friendly = /429|rate|limit|quota/i.test(msg)
      ? "Vertaalservice is even overbelast. Wacht ~1 minuut en probeer opnieuw."
      : msg
    return NextResponse.json(
      {
        success: false,
        error: friendly,
      },
      { status: 500 }
    )
  }
}
