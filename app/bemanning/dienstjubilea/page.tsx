"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { addMonths, format, parse, startOfMonth, subMonths } from "date-fns"
import { nl } from "date-fns/locale"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { BackButton } from "@/components/ui/back-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type JubileeItem = {
  id: string
  crewId: string
  fullName: string
  years: number
  anniversaryDate: Date
  startDate: Date
  shipName: string
}

const parseFlexibleDate = (value: unknown): Date | null => {
  if (!value || typeof value !== "string") return null
  const raw = value.trim()
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }

  const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2]) - 1
    const year = Number(m[3])
    const d = new Date(year, month, day)
    if (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      d.getDate() === day &&
      !isNaN(d.getTime())
    ) {
      return d
    }
  }

  const parsed = parse(raw, "yyyy-MM-dd", new Date())
  if (!isNaN(parsed.getTime())) return parsed

  const fallback = new Date(raw)
  return isNaN(fallback.getTime()) ? null : fallback
}

export default function CrewServiceAnniversariesPage() {
  const { crew, ships, loading, error } = useSupabaseData()
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()))

  const shipNameById = useMemo(() => {
    const map = new Map<string, string>()
    ;(ships || []).forEach((ship: any) => {
      map.set(String(ship.id), ship.name || "Geen schip")
    })
    return map
  }, [ships])

  const monthItems = useMemo(() => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const results: JubileeItem[] = []

    ;(crew || []).forEach((member: any) => {
      if (!member || member.is_dummy) return
      if (String(member.status || "").toLowerCase() === "uit-dienst") return
      if (!member.in_dienst_vanaf) return

      const startDate = parseFlexibleDate(member.in_dienst_vanaf)
      if (!startDate || isNaN(startDate.getTime())) return
      startDate.setHours(0, 0, 0, 0)

      const years = year - startDate.getFullYear()
      if (years < 5 || years > 60) return

      const isMilestone = years < 30 ? years % 5 === 0 : true
      if (!isMilestone) return

      const anniversaryDate = new Date(startDate)
      anniversaryDate.setFullYear(year)
      anniversaryDate.setHours(0, 0, 0, 0)

      if (anniversaryDate.getMonth() !== month) return
      if (anniversaryDate > new Date(selectedMonth.getFullYear(), 11, 31)) return

      const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim()
      results.push({
        id: `jubilee-${member.id}-${years}-${format(anniversaryDate, "yyyy-MM-dd")}`,
        crewId: String(member.id),
        fullName,
        years,
        anniversaryDate,
        startDate,
        shipName: shipNameById.get(String(member.ship_id)) || "Geen schip",
      })
    })

    results.sort((a, b) => {
      const dayDiff = a.anniversaryDate.getDate() - b.anniversaryDate.getDate()
      if (dayDiff !== 0) return dayDiff
      return a.fullName.localeCompare(b.fullName, "nl")
    })

    return results
  }, [crew, selectedMonth, shipNameById])

  const groupedByDay = useMemo(() => {
    const map = new Map<string, JubileeItem[]>()
    monthItems.forEach((item) => {
      const key = format(item.anniversaryDate, "yyyy-MM-dd")
      const bucket = map.get(key) || []
      bucket.push(item)
      map.set(key, bucket)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [monthItems])

  if (loading) {
    return <div className="max-w-4xl mx-auto py-8 px-2 text-gray-500">Data laden...</div>
  }

  if (error) {
    return <div className="max-w-4xl mx-auto py-8 px-2 text-red-500">Fout: {error}</div>
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackButton href="/bemanning/overzicht" />
          <h1 className="text-3xl font-bold text-gray-900">Dienstjubilea</h1>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setSelectedMonth((prev) => subMonths(prev, 1))}>
              ← Vorige maand
            </Button>
            <div className="text-lg font-semibold text-center">
              {format(selectedMonth, "MMMM yyyy", { locale: nl })}
            </div>
            <Button variant="outline" onClick={() => setSelectedMonth((prev) => addMonths(prev, 1))}>
              Volgende maand →
            </Button>
          </div>
        </CardContent>
      </Card>

      {groupedByDay.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            Geen dienstjubilea in {format(selectedMonth, "MMMM yyyy", { locale: nl })}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map(([dateKey, items]) => (
            <Card key={dateKey}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>{format(new Date(dateKey), "EEEE d MMMM", { locale: nl })}</span>
                  <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-md p-3 bg-amber-50/40">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/bemanning/${item.crewId}`} className="font-semibold text-gray-900 hover:text-blue-600">
                        {item.fullName}
                      </Link>
                      <Badge className="bg-amber-500 hover:bg-amber-500">{item.years} jaar</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      In dienst sinds {format(item.startDate, "dd-MM-yyyy")} • {item.shipName}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
