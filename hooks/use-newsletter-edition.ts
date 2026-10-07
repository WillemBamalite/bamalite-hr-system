"use client"

import { useEffect, useRef, useState } from "react"
import { authenticatedFetch } from "@/lib/authenticated-fetch"
import {
  clearLegacyDraft,
  emptyContent,
  type NewsletterContent,
  normalizeContent,
  readLegacyDraft,
} from "@/utils/newsletter-content"

type SaveStatus = "loading" | "saving" | "saved" | "error"

async function fetchEdition(editionId: string): Promise<{ content: unknown; updatedAt: string | null } | null> {
  const response = await authenticatedFetch(`/api/nieuwsbrief?edition=${editionId}`, { cache: "no-store" })
  const body = await response.json().catch(() => null)
  if (!response.ok || !body?.success) {
    throw new Error(body?.error || "Kon de nieuwsbrief niet laden.")
  }
  if (!body.content) return null
  return { content: body.content, updatedAt: body.updatedAt ? String(body.updatedAt) : null }
}

async function upsertEdition(editionId: string, content: NewsletterContent) {
  const response = await authenticatedFetch("/api/nieuwsbrief", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ editionId, content }),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok || !body?.success) {
    throw new Error(body?.error || "Opslaan is mislukt.")
  }
  return String(body.updatedAt || new Date().toISOString())
}

export function useNewsletterEdition(editionId: string) {
  const [content, setContent] = useState<NewsletterContent>(() => emptyContent(editionId))
  const [status, setStatus] = useState<SaveStatus>("loading")
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)
  const baseline = useRef("")
  const latest = useRef(content)
  const editionRef = useRef(editionId)
  const writeChain = useRef(Promise.resolve())

  latest.current = content
  editionRef.current = editionId

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setStatus("loading")
    setError("")
    baseline.current = ""

    const load = async () => {
      try {
        const row = await fetchEdition(editionId)
        if (cancelled) return
        if (row) {
          const next = normalizeContent(row.content, editionId)
          baseline.current = JSON.stringify(next)
          setContent(next)
          setUpdatedAt(row.updatedAt)
          setStatus("saved")
          setReady(true)
          return
        }

        const legacy = readLegacyDraft(editionId)
        const next = legacy || emptyContent(editionId)
        if (legacy) {
          const savedAt = await upsertEdition(editionId, next)
          if (cancelled) return
          clearLegacyDraft(editionId)
          setUpdatedAt(savedAt)
          setStatus("saved")
        } else {
          setUpdatedAt(null)
          setStatus("saved")
        }
        baseline.current = JSON.stringify(next)
        setContent(next)
        setReady(true)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : "Kon de nieuwsbrief niet laden."
        const legacy = readLegacyDraft(editionId)
        const next = legacy || emptyContent(editionId)
        baseline.current = JSON.stringify(next)
        setContent(next)
        setStatus("error")
        setError(message)
        setReady(true)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [editionId])

  useEffect(() => {
    if (!ready || content.editionId !== editionId) return
    if (JSON.stringify(content) === baseline.current) return

    setStatus("saving")
    const handle = window.setTimeout(() => {
      const snapshot = latest.current
      const id = editionRef.current
      if (snapshot.editionId !== id) return
      const serialized = JSON.stringify(snapshot)
      if (serialized === baseline.current) return
      writeChain.current = writeChain.current
        .catch(() => undefined)
        .then(async () => {
          if (editionRef.current !== id) return
          try {
            const savedAt = await upsertEdition(id, snapshot)
            if (editionRef.current !== id) return
            baseline.current = serialized
            setUpdatedAt(savedAt)
            setStatus("saved")
            setError("")
          } catch (err) {
            if (editionRef.current !== id) return
            setStatus("error")
            setError(err instanceof Error ? err.message : "Opslaan is mislukt.")
          }
        })
    }, 900)

    return () => window.clearTimeout(handle)
  }, [content, ready, editionId])

  return { content, setContent, status, updatedAt, error, ready }
}
