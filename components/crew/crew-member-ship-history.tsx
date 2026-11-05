"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ship, ChevronRight } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { format, differenceInCalendarDays } from "date-fns"
import { nl } from "date-fns/locale"
import { buildPersonalTimeline, historyStatusLabel } from "@/utils/crew-personal-history"

interface Props {
  crewMemberId: string
}

const STATUS_CLASS: Record<string, string> = {
  "aan-boord": "bg-green-100 text-green-800 border-green-300",
  thuis: "bg-blue-100 text-blue-800 border-blue-300",
  ziek: "bg-red-100 text-red-800 border-red-300",
  afwezig: "bg-amber-100 text-amber-900 border-amber-300",
  "geen-schip": "bg-gray-100 text-gray-800 border-gray-300",
  "uit-dienst": "bg-gray-100 text-gray-700 border-gray-300",
}

function formatDay(value: string) {
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return format(parsed, "dd-MM-yyyy", { locale: nl })
}

function periodLength(from: string, to: string | null) {
  const start = new Date(`${from}T12:00:00`)
  const end = to ? new Date(`${to}T12:00:00`) : new Date()
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const days = differenceInCalendarDays(end, start) + 1
  if (days <= 0) return null
  if (days < 30) return `${days} ${days === 1 ? "dag" : "dagen"}`
  const months = Math.floor(days / 30)
  if (days < 365) return `${months} ${months === 1 ? "maand" : "maanden"}`
  const years = Math.floor(days / 365)
  const remainingMonths = Math.floor((days % 365) / 30)
  if (remainingMonths > 0) {
    return `${years} ${years === 1 ? "jaar" : "jaren"} en ${remainingMonths} ${remainingMonths === 1 ? "maand" : "maanden"}`
  }
  return `${years} ${years === 1 ? "jaar" : "jaren"}`
}

export function CrewMemberShipHistoryButton({ crewMemberId }: Props) {
  return (
    <Link href={`/bemanning/${crewMemberId}/geschiedenis`} className="block">
      <Card className="hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
        <CardContent className="py-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold text-gray-900">
            <Ship className="w-5 h-5" />
            Scheepsgeschiedenis
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-blue-700">
            Openen
            <ChevronRight className="w-4 h-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}

export function CrewMemberShipHistory({ crewMemberId }: Props) {
  const { crew, ships, sickLeave, loading } = useSupabaseData()
  const crewMember = crew.find((member: any) => member.id === crewMemberId)

  if (loading && !crewMember) {
    return <div className="text-sm text-gray-500">Historie laden...</div>
  }

  if (!crewMember) {
    return <div className="text-sm text-red-600">Bemanningslid niet gevonden</div>
  }

  const shipName = (shipId: string | null) => {
    if (!shipId) return null
    return ships.find((ship: any) => ship.id === shipId)?.name || "Onbekend schip"
  }

  const periods = buildPersonalTimeline(crewMember, sickLeave)
  const name = `${crewMember.first_name || ""} ${crewMember.last_name || ""}`.trim()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Ship className="w-5 h-5" />
          Scheepsgeschiedenis van {name}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Aan boord, thuis, ziek, afwezig en zonder schip. Elke wijziging blijft hier staan en de lijn loopt door.
        </p>
      </CardHeader>
      <CardContent>
        {periods.length === 0 ? (
          <p className="text-sm text-gray-500">Nog geen historie voor deze persoon.</p>
        ) : (
          <div className="space-y-2">
            {periods.map((period) => {
              const label = historyStatusLabel(period.status)
              const ship = shipName(period.ship_id)
              const length = periodLength(period.from, period.to)
              return (
                <div
                  key={period.id}
                  className="flex flex-col gap-2 rounded-lg border bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDay(period.from)}
                      {period.to ? ` t/m ${formatDay(period.to)}` : " · loopt door"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {label}
                      {ship ? ` · ${ship}` : ""}
                      {length ? ` · ${length}` : ""}
                    </p>
                  </div>
                  <Badge className={`w-fit border ${STATUS_CLASS[period.status] || STATUS_CLASS["geen-schip"]}`}>
                    {label}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
