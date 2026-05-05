"use client"

import Link from "next/link"
import { useMemo } from "react"
import { AlertCircle, AlertTriangle, ChevronRight, Ship } from "lucide-react"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { Card, CardContent } from "@/components/ui/card"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import {
  formatIsoToDutchDate,
  getCertificateStatus,
  getShipCertificatesForClient,
} from "@/utils/ship-certificates"

type CertIssue = {
  name: string
  expiryIso: string
  daysUntil: number | null
  severity: "expired" | "warning"
}

export default function SchepenCertificatenPage() {
  const { ships, loading } = useSupabaseData()

  const shipsWithCertificateStatus = useMemo(() => {
    const now = new Date()
    return (ships || [])
      .map((ship: any) => {
        const shipName = String(ship?.name || "").trim()
        const certs = getShipCertificatesForClient(shipName)
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
      .sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" }))
  }, [ships])

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full py-6 md:py-8 px-3 md:px-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schepen en Certificaten</h1>
            <p className="text-gray-600">Klik op een schip om direct naar scheepsgegevens te gaan.</p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-gray-600">Laden...</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {shipsWithCertificateStatus.map((ship) => {
              const preview = ship.issues.slice(0, 5)
              const tileStyle =
                ship.expiredCount > 0
                  ? "border-red-200 hover:border-red-300 bg-red-50/40"
                  : ship.warningCount > 0
                    ? "border-orange-200 hover:border-orange-300 bg-orange-50/40"
                    : "border-emerald-200 hover:border-emerald-300 bg-emerald-50/40"
              return (
                <Link key={ship.id} href={`/schepen/overzicht/${ship.id}`} className="block">
                  <Card className={`h-full hover:shadow-md transition-all cursor-pointer ${tileStyle}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="text-lg font-semibold text-gray-900 leading-tight">{ship.name}</div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-800">
                          <AlertCircle className="w-3 h-3" />
                          {ship.expiredCount} verlopen
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-orange-800">
                          <AlertTriangle className="w-3 h-3" />
                          {ship.warningCount} bijna
                        </span>
                      </div>

                      {preview.length === 0 ? (
                        <div className="text-xs text-emerald-700 bg-emerald-50 rounded border border-emerald-200 p-2">
                          Geen verlopen of bijna verlopen certificaten.
                        </div>
                      ) : (
                        <ul className="space-y-1.5 text-xs">
                          {preview.map((item) => (
                            <li key={`${ship.id}-${item.name}-${item.expiryIso}`} className="leading-snug text-gray-700">
                              <span
                                className={
                                  item.severity === "expired" ? "font-medium text-red-700" : "font-medium text-orange-700"
                                }
                              >
                                {item.name}
                              </span>
                              <span className="text-gray-500"> - {formatIsoToDutchDate(item.expiryIso)}</span>
                            </li>
                          ))}
                          {ship.issues.length > preview.length && (
                            <li className="text-gray-500 italic">+{ship.issues.length - preview.length} meer...</li>
                          )}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>
      <MobileHeaderNav />
    </div>
  )
}
