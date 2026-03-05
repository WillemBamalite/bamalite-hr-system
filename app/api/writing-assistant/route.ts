import { NextResponse } from "next/server"

interface WritingAssistantRequest {
  text: string
  language?: string // e.g. "nl", "de", "fr"
}

interface LanguageToolMatch {
  offset: number
  length: number
  replacements: { value: string }[]
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WritingAssistantRequest
    const text = body.text?.toString() || ""
    const language = body.language || "nl"

    if (!text.trim()) {
      return NextResponse.json(
        { correctedText: text },
        { status: 200 }
      )
    }

    // Gebruik de publieke LanguageTool API voor spelling/grammatica
    const params = new URLSearchParams()
    params.set("text", text)
    params.set("language", language)

    const ltResponse = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    if (!ltResponse.ok) {
      console.error("LanguageTool error status:", ltResponse.status)
      const fallback = await ltResponse.text().catch(() => "")
      console.error("LanguageTool response:", fallback)
      // Fallback: geef originele tekst terug
      return NextResponse.json(
        { correctedText: text },
        { status: 200 }
      )
    }

    const ltResult = await ltResponse.json() as { matches?: LanguageToolMatch[] }
    const matches = ltResult.matches || []

    // Pas vervangingen toe van achter naar voren zodat offsets kloppen blijven
    let correctedText = text
    const sorted = [...matches].sort((a, b) => b.offset - a.offset)

    for (const match of sorted) {
      if (!match.replacements || match.replacements.length === 0) continue
      const replacement = match.replacements[0]?.value
      if (!replacement) continue

      const start = match.offset
      const end = match.offset + match.length
      if (start < 0 || end > correctedText.length) continue

      correctedText =
        correctedText.slice(0, start) +
        replacement +
        correctedText.slice(end)
    }

    return NextResponse.json(
      { correctedText },
      { status: 200 }
    )
  } catch (error) {
    console.error("Writing assistant error:", error)
    // Bij fout: geef tekst ongewijzigd terug
    return NextResponse.json(
      { correctedText: "", error: "Writing assistant failed" },
      { status: 500 }
    )
  }
}

