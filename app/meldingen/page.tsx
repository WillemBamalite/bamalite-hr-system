"use client"

import Link from "next/link"
import { AlertTriangle, Bell, Calendar, Cake, ClipboardList, ShieldAlert, Ship } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useShipVisits } from "@/hooks/use-ship-visits"
import { buildDashboardNotifications } from "@/utils/dashboard-notifications"
import { useState } from "react"
import { format } from "date-fns"

const kindLabel = (kind: string) => {
  switch (kind) {
    case "birthday":
      return "Verjaardagen"
    case "probation":
      return "Proeftijd"
    case "task":
      return "Taken"
    case "ship_visit":
      return "Scheepsbezoeken"
    case "certificate_expiring":
      return "Ziektebriefjes"
    case "anniversary":
      return "Dienstjubilea"
    case "luxembourg_pending_boarding":
      return "Nieuw personeel"
    default:
      return "Overig"
  }
}

const severityBadge = (severity: string) => {
  switch (severity) {
    case "danger":
      return "bg-red-100 text-red-800 border border-red-200"
    case "warning":
      return "bg-orange-100 text-orange-800 border border-orange-200"
    default:
      return "bg-blue-100 text-blue-800 border border-blue-200"
  }
}

const severityLeftBorder = (severity: string) => {
  switch (severity) {
    case "danger":
      return "border-l-red-500"
    case "warning":
      return "border-l-orange-500"
    default:
      return "border-l-blue-500"
  }
}

const kindIcon = (kind: string) => {
  switch (kind) {
    case "probation":
      return ShieldAlert
    case "birthday":
      return Cake
    case "anniversary":
      return Calendar
    case "certificate_expiring":
      return AlertTriangle
    case "task":
      return ClipboardList
    case "ship_visit":
      return Ship
    case "luxembourg_pending_boarding":
      return AlertTriangle
    default:
      return Bell
  }
}

const groupHeaderClasses = (groupName: string) => {
  switch (groupName) {
    case "Taken":
      return "bg-red-50 border-red-200"
    case "Scheepsbezoeken":
      return "bg-orange-50 border-orange-200"
    case "Proeftijd":
      return "bg-amber-50 border-amber-200"
    case "Ziektebriefjes":
      return "bg-orange-50 border-orange-200"
    case "Verjaardagen":
      return "bg-pink-50 border-pink-200"
    case "Dienstjubilea":
      return "bg-yellow-50 border-yellow-200"
    case "Nieuw personeel":
      return "bg-amber-50 border-amber-200"
    default:
      return "bg-blue-50 border-blue-200"
  }
}

const groupCountBadge = (groupName: string) => {
  switch (groupName) {
    case "Taken":
      return "bg-red-100 text-red-800 border border-red-200"
    case "Scheepsbezoeken":
      return "bg-orange-100 text-orange-800 border border-orange-200"
    case "Proeftijd":
      return "bg-amber-100 text-amber-900 border border-amber-200"
    case "Ziektebriefjes":
      return "bg-orange-100 text-orange-800 border border-orange-200"
    case "Verjaardagen":
      return "bg-pink-100 text-pink-800 border border-pink-200"
    case "Dienstjubilea":
      return "bg-yellow-100 text-yellow-900 border border-yellow-200"
    case "Nieuw personeel":
      return "bg-amber-100 text-amber-900 border border-amber-200"
    default:
      return "bg-blue-100 text-blue-800 border border-blue-200"
  }
}

export default function MeldingenPage() {
  const { crew, tasks, ships, sickLeave, loading, error } = useSupabaseData()
  const { visits, getShipsNotVisitedInDays } = useShipVisits()
  const [sendingCertificateEmailId, setSendingCertificateEmailId] = useState<string | null>(null)
  const [sentCertificateNotificationIds, setSentCertificateNotificationIds] = useState<Record<string, boolean>>({})
  const [sentCertificateNotificationDates, setSentCertificateNotificationDates] = useState<Record<string, string>>({})

  const formatSentOn = (value: unknown) => {
    if (!value || typeof value !== "string") return ""
    const d = new Date(value)
    if (isNaN(d.getTime())) return ""
    return format(d, "dd/MM/yy")
  }

  const notifications = buildDashboardNotifications({
    crew: crew || [],
    tasks: tasks || [],
    ships: ships || [],
    sickLeave: sickLeave || [],
    visits: visits || [],
    getShipsNotVisitedInDays,
  })

  const grouped = notifications.reduce((acc, n) => {
    const key = kindLabel(n.kind)
    acc[key] ||= []
    acc[key].push(n)
    return acc
  }, {} as Record<string, typeof notifications>)

  const gridGroupsRow1 = ["Taken", "Scheepsbezoeken", "Nieuw personeel"] as const
  const gridGroupsRow2 = ["Ziektebriefjes", "Verjaardagen", "Dienstjubilea", "Proeftijd"] as const
  const otherGroups = ["Overig"] as const

  const gridGroups = [...gridGroupsRow1, ...gridGroupsRow2]
  const orderedOtherGroups = otherGroups.filter((k) => (grouped[k] || []).length > 0)

  const handleSendCertificateEmail = async (notification: any) => {
    const meta = (notification?.meta || {}) as Record<string, any>
    const recipientEmail = String(meta.recipientEmail || "").trim()
    if (!recipientEmail) {
      alert("Geen e-mailadres gevonden voor dit bemanningslid.")
      return
    }

    try {
      setSendingCertificateEmailId(notification.id)
      const response = await fetch("/api/send-certificate-expiry-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crewName: meta.crewName || notification.description || "Bemanningslid",
          expiryDate: meta.expiryDate,
          expiryDateForPDF: meta.expiryDateForPDF || meta.expiryDate,
          daysUntilExpiry: Number(meta.daysUntilExpiry ?? 0),
          recipientEmail,
          sickLeaveId: meta.sickLeaveId,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "E-mail versturen mislukt")
      }

      setSentCertificateNotificationIds((prev) => ({ ...prev, [notification.id]: true }))
      setSentCertificateNotificationDates((prev) => ({
        ...prev,
        [notification.id]: new Date().toISOString(),
      }))
      alert("E-mail succesvol verstuurd.")
    } catch (e: any) {
      alert(`Fout bij versturen e-mail: ${e?.message || "Onbekende fout"}`)
    } finally {
      setSendingCertificateEmailId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full py-8 px-4">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Meldingen</h2>
            <p className="text-gray-600">Alles wat ook op het dashboard zichtbaar is</p>
          </div>
          <div className="flex items-center gap-2">
            <DashboardButton />
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="p-6 text-gray-600">Meldingen laden…</CardContent>
          </Card>
        )}
        {!loading && error && (
          <Card>
            <CardContent className="p-6 text-red-600">Fout: {error}</CardContent>
          </Card>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-white">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Overzicht
                  </span>
                  <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
                    {notifications.length} totaal
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {notifications.length === 0 ? (
                  <div className="p-6 text-gray-600">Geen meldingen op dit moment.</div>
                ) : (
                  <div className="p-4 text-sm text-gray-600">
                    Meldingen zijn gegroepeerd per type, zodat je snel ziet wat er speelt.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {gridGroups.map((groupName) => {
                const group = grouped[groupName] || []
                return (
                  <Card key={groupName} className="overflow-hidden h-full">
                    <CardHeader className={`border-b py-4 ${groupHeaderClasses(groupName)}`}>
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{groupName}</span>
                        <Badge className={groupCountBadge(groupName)}>{group.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {group.length === 0 ? (
                        <div className="p-4 text-sm text-gray-600">Geen meldingen.</div>
                      ) : (
                        <div className="divide-y">
                          {group.map((n) => {
                            const Icon = kindIcon(n.kind)
                            const isCertificateNotification = n.kind === "certificate_expiring"
                            const isMailSent =
                              isCertificateNotification &&
                              (Boolean((n.meta as any)?.mailSent) || Boolean(sentCertificateNotificationIds[n.id]))
                            const sentOnText = formatSentOn(
                              sentCertificateNotificationDates[n.id] || (n.meta as any)?.mailSentAt
                            )
                            const hasRecipientEmail = !!String((n.meta as any)?.recipientEmail || "").trim()
                            const Row = (
                              <div
                                className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${severityLeftBorder(
                                  n.severity
                                )}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="mt-1 shrink-0">
                                      <Icon className="w-4 h-4 text-gray-600" />
                                    </div>
                                    <div className="min-w-0">
                                      {n.kind === "task" ? (
                                        <>
                                          {n.description && (
                                            <div className="font-semibold text-gray-900">{n.description}</div>
                                          )}
                                          <div className="text-sm text-gray-600">{n.title}</div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="font-semibold text-gray-900">{n.title}</div>
                                          {n.description && (
                                            <div className="text-sm text-gray-600">{n.description}</div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <Badge className={severityBadge(n.severity)}>
                                    {n.severity === "danger"
                                      ? "Urgent"
                                      : n.severity === "warning"
                                        ? "Let op"
                                        : "Info"}
                                  </Badge>
                                </div>
                                {isCertificateNotification && (
                                  <div className="mt-3">
                                    {isMailSent ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge className="bg-green-100 text-green-800 border border-green-200">
                                          Mail is verstuurd
                                        </Badge>
                                        {sentOnText && (
                                          <span className="text-xs text-green-800">Verstuurd op: {sentOnText}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={!hasRecipientEmail || sendingCertificateEmailId === n.id}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleSendCertificateEmail(n)
                                        }}
                                      >
                                        {sendingCertificateEmailId === n.id
                                          ? "Mail versturen..."
                                          : hasRecipientEmail
                                            ? "Wil je diegene mail sturen?"
                                            : "Geen e-mail bekend"}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )

                            return n.href ? (
                              <Link key={n.id} href={n.href} className="block">
                                {Row}
                              </Link>
                            ) : (
                              <div key={n.id}>{Row}</div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {orderedOtherGroups.length > 0 && (
              <div className="space-y-6">
                {orderedOtherGroups.map((groupName) => {
                  const group = grouped[groupName] || []
                  return (
                    <Card key={groupName} className="overflow-hidden">
                      <CardHeader className={`border-b py-4 ${groupHeaderClasses(groupName)}`}>
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>{groupName}</span>
                          <Badge className={groupCountBadge(groupName)}>{group.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {group.map((n) => {
                            const Icon = kindIcon(n.kind)
                            const Row = (
                              <div
                                className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${severityLeftBorder(
                                  n.severity
                                )}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="mt-1 shrink-0">
                                      <Icon className="w-4 h-4 text-gray-600" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-semibold text-gray-900">{n.title}</div>
                                      {n.description && (
                                        <div className="text-sm text-gray-600">{n.description}</div>
                                      )}
                                    </div>
                                  </div>
                                  <Badge className={severityBadge(n.severity)}>
                                    {n.severity === "danger"
                                      ? "Urgent"
                                      : n.severity === "warning"
                                        ? "Let op"
                                        : "Info"}
                                  </Badge>
                                </div>
                              </div>
                            )

                            return n.href ? (
                              <Link key={n.id} href={n.href} className="block">
                                {Row}
                              </Link>
                            ) : (
                              <div key={n.id}>{Row}</div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <MobileHeaderNav />
    </div>
  )
}

