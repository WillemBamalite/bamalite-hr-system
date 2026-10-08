"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { addMonths, format, startOfMonth, subMonths } from "date-fns"
import { nl } from "date-fns/locale"
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useNewsletterEdition } from "@/hooks/use-newsletter-edition"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { Button } from "@/components/ui/button"
import { NewsletterForm } from "@/components/newsletter/NewsletterForm"
import { NewsletterPaper } from "@/components/newsletter/NewsletterPaper"
import { buildNewsletterEvents } from "@/utils/newsletter-events"

export default function MonthlyNewsletterPage() {
  const { crew, ships, incidents, loading, error } = useSupabaseData()
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()))
  const [showPreview, setShowPreview] = useState(false)
  const editionId = format(selectedMonth, "yyyy-MM")
  const monthTitle = format(selectedMonth, "MMMM yyyy", { locale: nl })
  const { content, setContent, status, updatedAt, error: saveError, ready } = useNewsletterEdition(editionId)

  const events = useMemo(
    () => buildNewsletterEvents(crew, ships, selectedMonth),
    [crew, ships, selectedMonth]
  )
  useEffect(() => {
    document.body.classList.add("newsletter-page-mode")
    return () => {
      document.body.classList.remove("newsletter-page-mode")
    }
  }, [])

  const savedLabel = updatedAt
    ? format(new Date(updatedAt), "d MMMM yyyy, HH:mm", { locale: nl })
    : ""

  if (loading) return <div className="max-w-6xl mx-auto py-8 px-3 text-gray-500">Data laden...</div>
  if (error) return <div className="max-w-6xl mx-auto py-8 px-3 text-red-600">Fout: {error}</div>

  return (
    <div className="min-h-screen bg-[#f4f1ea] print:bg-white">
      <main className="newsletter-editor mx-auto max-w-6xl px-3 py-6 sm:px-6">
        <div className="print:hidden">
          <MobileHeaderNav />
          <DashboardButton />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center text-sm text-[#10243f] hover:underline">
              <ArrowLeft className="mr-1 h-4 w-4" /> Terug
            </Link>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9c7c45]">Bamalite Scheepsnieuws</div>
              <h1 className="text-2xl font-bold text-[#10243f]">Maandelijkse nieuwsbrief</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview((value) => !value)}>
              {showPreview ? "Verberg voorbeeld" : "Krantvoorbeeld"}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print / PDF
            </Button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <Button variant="outline" onClick={() => setSelectedMonth((month) => subMonths(month, 1))}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Vorige maand
          </Button>
          <div className="text-center">
            <div className="font-semibold capitalize text-[#10243f]">{monthTitle}</div>
            <div className="text-xs text-slate-500">Editie {editionId}</div>
          </div>
          <Button variant="outline" onClick={() => setSelectedMonth((month) => addMonths(month, 1))}>
            Volgende maand
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          {status === "loading" || !ready
            ? "Nieuwsbrief laden..."
            : status === "saving"
              ? "Opslaan..."
              : status === "error"
                ? saveError
                : savedLabel
                  ? `Concept opgeslagen ✓  Laatst opgeslagen: ${savedLabel}`
                  : "Nog niet opgeslagen. Wijzigingen worden automatisch bewaard."}
        </p>

        {ready ? (
          <NewsletterForm content={content} setContent={setContent} crew={crew || []} ships={ships || []} incidents={incidents || []} events={events} month={selectedMonth} />
        ) : null}
      </main>

      {ready && content.editionId === editionId ? (
        <div className={showPreview ? "newsletter-print-root is-preview" : "newsletter-print-root"}>
          <NewsletterPaper month={selectedMonth} events={events} content={content} crew={crew || []} ships={ships || []} />
        </div>
      ) : null}
    </div>
  )
}
