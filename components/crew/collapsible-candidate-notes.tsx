"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  extractWhatsAppBody,
  getDisplayNotesText,
  hasDutchTranslation,
  looksNonDutch,
  replaceNotesWithDutchTranslation,
  splitNotesOriginalAndTranslation,
} from "@/utils/note-translate"
import { supabase } from "@/lib/supabase"

type Props = {
  notesText: string
  memberId?: string
  onNotesUpdated?: (nextNotes: string) => void | Promise<void>
  collapsedCharLimit?: number
}

export function CollapsibleCandidateNotes({
  notesText,
  memberId,
  onNotesUpdated,
  collapsedCharLimit = 180,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState("")
  const cleanedRef = useRef(false)

  const displayText = useMemo(() => getDisplayNotesText(notesText), [notesText])
  const isLong = displayText.length > collapsedCharLimit
  const preview = isLong ? `${displayText.slice(0, collapsedCharLimit).trim()}…` : displayText
  const sourceForTranslate = extractWhatsAppBody(notesText) || notesText
  const canTranslate =
    !hasDutchTranslation(notesText) && looksNonDutch(sourceForTranslate)

  // Oude "EN + NL" notities opschonen naar alleen NL
  useEffect(() => {
    if (cleanedRef.current || !onNotesUpdated) return
    const { translation } = splitNotesOriginalAndTranslation(notesText)
    if (!translation) return
    cleanedRef.current = true
    const cleaned = getDisplayNotesText(notesText)
    if (cleaned && cleaned !== notesText) {
      void onNotesUpdated(cleaned)
    }
  }, [notesText, onNotesUpdated])

  const handleTranslate = async () => {
    const source = sourceForTranslate.trim()
    if (!source) return
    setTranslating(true)
    setError("")
    try {
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token
      if (!accessToken) throw new Error("Niet ingelogd")

      const res = await fetch("/api/translate-to-nl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ text: source }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success || !json?.translated) {
        throw new Error(json?.error || "Vertalen mislukt")
      }
      if (json.skipped || json.detectedLang === "nl") {
        setError("Tekst lijkt al Nederlands.")
        return
      }
      const next = replaceNotesWithDutchTranslation(notesText, json.translated)
      if (onNotesUpdated) {
        await onNotesUpdated(next)
      }
      setExpanded(false)
    } catch (e: any) {
      setError(e?.message || "Vertalen mislukt")
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className="text-sm text-gray-600">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">Notities:</span>
        <div className="flex items-center gap-2">
          {canTranslate && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={translating || !memberId}
              onClick={() => void handleTranslate()}
            >
              {translating ? "Vertalen…" : "Vertaal NL"}
            </Button>
          )}
          {isLong && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Inklappen" : "Uitklappen"}
            </button>
          )}
        </div>
      </div>

      <p className="italic mt-1 whitespace-pre-wrap">{expanded || !isLong ? displayText : preview}</p>

      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
  )
}
