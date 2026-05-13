"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, AlertTriangle, ChevronRight, Ship } from "lucide-react"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { ShipOverviewDownloadButton } from "@/components/schepen/ship-overview-download-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import {
  formatIsoToDutchDate,
  getCertificateStatus,
  getVisibleShipCertificatesSharedForClient,
} from "@/utils/ship-certificates"

type CertIssue = {
  name: string
  expiryIso: string
  daysUntil: number | null
  severity: "expired" | "warning"
}

type ShipCertRow = {
  id: string
  name: string
  issues: CertIssue[]
  expiredCount: number
  warningCount: number
}

function ShipCertificateTile({ ship }: { ship: ShipCertRow }) {
  const preview = ship.issues.slice(0, 5)
  const tileStyle =
    ship.expiredCount > 0
      ? "border-2 border-red-600 bg-red-100 shadow-sm hover:bg-red-200/90 hover:border-red-700"
      : ship.warningCount > 0
        ? "border-2 border-orange-500 bg-orange-100 shadow-sm hover:bg-orange-200/90 hover:border-orange-600"
        : "border-2 border-emerald-600 bg-emerald-100 shadow-sm hover:bg-emerald-200/90 hover:border-emerald-700"

  return (
    <Link href={`/schepen/overzicht/${ship.id}`} className="block">
      <Card className={`h-full hover:shadow-lg transition-all cursor-pointer ${tileStyle}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="text-lg font-semibold text-gray-900 leading-tight">{ship.name}</div>
            <ChevronRight className="w-4 h-4 text-gray-600 shrink-0 mt-1" />
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                ship.expiredCount > 0 ? "bg-red-700 text-white" : "bg-red-200 text-red-900"
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              {ship.expiredCount} verlopen
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                ship.warningCount > 0 ? "bg-orange-600 text-white" : "bg-orange-200 text-orange-900"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {ship.warningCount} bijna
            </span>
          </div>

          {preview.length === 0 ? (
            <div className="text-xs font-medium text-emerald-900 bg-emerald-200/80 rounded-md border-2 border-emerald-600 p-2.5">
              Geen verlopen of bijna verlopen certificaten.
            </div>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {preview.map((item) => (
                <li key={`${ship.id}-${item.name}-${item.expiryIso}`} className="leading-snug text-gray-800">
                  <span
                    className={
                      item.severity === "expired" ? "font-semibold text-red-800" : "font-semibold text-orange-800"
                    }
                  >
                    {item.name}
                  </span>
                  <span className="text-gray-700">
                    {" "}
                    — verloopt op {formatIsoToDutchDate(item.expiryIso)}
                  </span>
                </li>
              ))}
              {ship.issues.length > preview.length && (
                <li className="text-gray-700 font-medium italic">+{ship.issues.length - preview.length} meer...</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export default function SchepenCertificatenPage() {
  const { ships, loading } = useSupabaseData()
  const [shipIssueMap, setShipIssueMap] = useState<Record<string, CertIssue[]>>({})

  const loadIssues = useCallback(async () => {
    const now = new Date()
    const entries = await Promise.all(
      (ships || []).map(async (ship: any) => {
        const shipName = String(ship?.name || "").trim()
        const certs = await getVisibleShipCertificatesSharedForClient(shipName)
        const issues: CertIssue[] = certs
          .map((cert) => {
            const statusInfo = getCertificateStatus(cert, now)
            if (statusInfo.status === "ok" || !statusInfo.expiryIso) return null
            return {
              name: cert.naam,
              expiryIso: statusInfo.expiryIso,
              daysUntil: statusInfo.daysUntilExpiry,
              severity: statusInfo.status === "expired" ? "expired" : "warning",
            } satisfies CertIssue
          })
          .filter((item): item is CertIssue => Boolean(item))
          .sort((a, b) => {
            const aDays = a.daysUntil ?? Number.MAX_SAFE_INTEGER
            const bDays = b.daysUntil ?? Number.MAX_SAFE_INTEGER
            return aDays - bDays
          })
        return [String(ship.id), issues] as const
      })
    )
    setShipIssueMap(Object.fromEntries(entries))
  }, [ships])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await loadIssues()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
  }, [loadIssues])

  useEffect(() => {
    const onFocus = () => {
      void loadIssues()
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadIssues()
      }
    }
    const interval = window.setInterval(() => {
      void loadIssues()
    }, 30000)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [loadIssues])

  const shipsGroupedBySeverity = useMemo(() => {
    const rows: ShipCertRow[] = (ships || []).map((ship: any) => {
      const shipName = String(ship?.name || "").trim()
      const issues = shipIssueMap[String(ship.id)] || []
      const expiredCount = issues.filter((i) => i.severity === "expired").length
      const warningCount = issues.filter((i) => i.severity === "warning").length
      return {
        id: String(ship.id),
        name: shipName || "Onbekend schip",
        issues,
        expiredCount,
        warningCount,
      }
    })

    const byName = (a: ShipCertRow, b: ShipCertRow) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" })

    const expired = rows
      .filter((s) => s.expiredCount > 0)
      .sort((a, b) => {
        if (b.expiredCount !== a.expiredCount) return b.expiredCount - a.expiredCount
        if (b.warningCount !== a.warningCount) return b.warningCount - a.warningCount
        return byName(a, b)
      })

    const warningOnly = rows
      .filter((s) => s.expiredCount === 0 && s.warningCount > 0)
      .sort((a, b) => {
        if (b.warningCount !== a.warningCount) return b.warningCount - a.warningCount
        return byName(a, b)
      })

    const ok = rows.filter((s) => s.expiredCount === 0 && s.warningCount === 0).sort(byName)

    return { expired, warningOnly, ok }
  }, [ships, shipIssueMap])

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full py-6 md:py-8 px-3 md:px-4">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Schepen en Certificaten</h1>
            <p className="text-gray-600">
              Klik op een schip om direct naar scheepsgegevens te gaan. Eerst schepen met verlopen certificaten, daarna
              bijna verlopen, onderaan alles in orde. De datum bij elk certificaat is de berekende verloopdatum (laatste
              keuring plus interval), vergeleken met vandaag.
            </p>
          </div>
          {!loading && ships && ships.length > 0 ? (
            <ShipOverviewDownloadButton
              ships={(ships as any[]).map((s) => ({ id: String(s.id), name: String(s.name || "").trim() }))}
            />
          ) : null}
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-gray-600">Laden...</CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {shipsGroupedBySeverity.expired.length > 0 && (
              <section aria-labelledby="cert-section-expired">
                <h2
                  id="cert-section-expired"
                  className="mb-3 flex flex-wrap items-center gap-2 text-base font-bold text-red-900"
                >
                  <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" aria-hidden />
                  Verlopen certificaten
                  <span className="rounded-full bg-red-700 px-2 py-0.5 text-xs font-semibold text-white">
                    {shipsGroupedBySeverity.expired.length} schepen
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {shipsGroupedBySeverity.expired.map((ship) => (
                    <ShipCertificateTile key={ship.id} ship={ship} />
                  ))}
                </div>
              </section>
            )}

            {shipsGroupedBySeverity.warningOnly.length > 0 && (
              <section aria-labelledby="cert-section-warning">
                <h2
                  id="cert-section-warning"
                  className="mb-3 flex flex-wrap items-center gap-2 text-base font-bold text-orange-900"
                >
                  <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" aria-hidden />
                  Bijna verlopen
                  <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {shipsGroupedBySeverity.warningOnly.length} schepen
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {shipsGroupedBySeverity.warningOnly.map((ship) => (
                    <ShipCertificateTile key={ship.id} ship={ship} />
                  ))}
                </div>
              </section>
            )}

            {shipsGroupedBySeverity.ok.length > 0 && (
              <section aria-labelledby="cert-section-ok">
                <h2
                  id="cert-section-ok"
                  className="mb-3 flex flex-wrap items-center gap-2 text-base font-bold text-emerald-900"
                >
                  <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" aria-hidden />
                  Geen verlopen of bijna verlopen certificaten
                  <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
                    {shipsGroupedBySeverity.ok.length} schepen
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {shipsGroupedBySeverity.ok.map((ship) => (
                    <ShipCertificateTile key={ship.id} ship={ship} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <MobileHeaderNav />
    </div>
  )
}
