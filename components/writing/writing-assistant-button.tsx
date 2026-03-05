"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

interface WritingAssistantButtonProps {
  value: string
  onChange: (newValue: string) => void
  language?: string // "nl" | "de" | "fr"
}

export function WritingAssistantButton({
  value,
  onChange,
  language = "nl",
}: WritingAssistantButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!value.trim()) return
    try {
      setLoading(true)
      const response = await fetch("/api/writing-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: value,
          language,
        }),
      })

      if (!response.ok) {
        console.error("Writing assistant API error:", response.status)
        alert("Kon de tekst niet automatisch verbeteren.")
        return
      }

      const data = await response.json()
      if (data.correctedText && typeof data.correctedText === "string") {
        onChange(data.correctedText)
      }
    } catch (error) {
      console.error("Writing assistant request failed:", error)
      alert("Kon de tekst niet automatisch verbeteren (netwerkfout).")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading || !value.trim()}
      className="gap-1"
    >
      <Sparkles className="w-4 h-4" />
      {loading ? "Verbeteren..." : "Verbeter tekst"}
    </Button>
  )
}

