"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns"
import { nl } from "date-fns/locale"
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

type CrewEvent = {
  id: string
  fullName: string
  detail?: string
}

type SharedPhotoItem = {
  id: string
  shipName: string
  activityText: string
  caption: string
  imageDataUrl: string
  addedAt: string
}

const joinNames = (items: string[]) => {
  if (items.length === 0) return ""
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} en ${items[1]}`
  return `${items.slice(0, -1).join(", ")} en ${items[items.length - 1]}`
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

  const fallback = new Date(raw)
  return isNaN(fallback.getTime()) ? null : fallback
}

const inSameMonth = (date: Date, month: Date) =>
  date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()

export default function MonthlyNewsletterPage() {
  const { crew, ships, loading, error } = useSupabaseData()
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()))
  const [manualIntro, setManualIntro] = useState("")
  const [manualUpdates, setManualUpdates] = useState("")
  const [manualClosing, setManualClosing] = useState("")
  const [yardShipIds, setYardShipIds] = useState<string[]>([])
  const [biqShipIds, setBiqShipIds] = useState<string[]>([])
  const [sharedPhotos, setSharedPhotos] = useState<SharedPhotoItem[]>([])
  const [photoShipName, setPhotoShipName] = useState("")
  const [photoCaptionText, setPhotoCaptionText] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [spotlightType, setSpotlightType] = useState<"crew" | "ship">("crew")
  const [spotlightCrewId, setSpotlightCrewId] = useState("")
  const [spotlightShipId, setSpotlightShipId] = useState("")
  const [spotlightText, setSpotlightText] = useState("")
  const [safetyTip, setSafetyTip] = useState("")
  const [opsUpdate, setOpsUpdate] = useState("")

  const monthKey = format(selectedMonth, "yyyy-MM")
  const draftStorageKey = `newsletter-monthly-${monthKey}`

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(draftStorageKey)
    if (!raw) {
      setManualIntro("")
      setManualUpdates("")
      setManualClosing("")
      return
    }
    try {
      const parsed = JSON.parse(raw)
      setManualIntro(String(parsed?.intro || ""))
      setManualUpdates(String(parsed?.updates || ""))
      setManualClosing(String(parsed?.closing || ""))
      setYardShipIds(Array.isArray(parsed?.yardShipIds) ? parsed.yardShipIds.map(String) : [])
      setBiqShipIds(Array.isArray(parsed?.biqShipIds) ? parsed.biqShipIds.map(String) : [])
      setSharedPhotos(Array.isArray(parsed?.sharedPhotos) ? parsed.sharedPhotos : [])
      setSpotlightType(parsed?.spotlightType === "ship" ? "ship" : "crew")
      setSpotlightCrewId(String(parsed?.spotlightCrewId || ""))
      setSpotlightShipId(String(parsed?.spotlightShipId || ""))
      setSpotlightText(String(parsed?.spotlightText || ""))
      setSafetyTip(String(parsed?.safetyTip || ""))
      setOpsUpdate(String(parsed?.opsUpdate || ""))
    } catch {
      setManualIntro("")
      setManualUpdates("")
      setManualClosing("")
      setYardShipIds([])
      setBiqShipIds([])
      setSharedPhotos([])
      setSpotlightType("crew")
      setSpotlightCrewId("")
      setSpotlightShipId("")
      setSpotlightText("")
      setSafetyTip("")
      setOpsUpdate("")
    }
  }, [draftStorageKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        intro: manualIntro,
        updates: manualUpdates,
        closing: manualClosing,
        yardShipIds,
        biqShipIds,
        sharedPhotos,
        spotlightType,
        spotlightCrewId,
        spotlightShipId,
        spotlightText,
        safetyTip,
        opsUpdate,
      })
    )
  }, [
    draftStorageKey,
    manualIntro,
    manualUpdates,
    manualClosing,
    yardShipIds,
    biqShipIds,
    sharedPhotos,
    spotlightType,
    spotlightCrewId,
    spotlightShipId,
    spotlightText,
    safetyTip,
    opsUpdate,
  ])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.body.classList.add("newsletter-page-mode")
    document.body.classList.add("newsletter-print-mode")
    return () => {
      document.body.classList.remove("newsletter-page-mode")
      document.body.classList.remove("newsletter-print-mode")
    }
  }, [])

  const shipNameById = useMemo(() => {
    const map = new Map<string, string>()
    ;(ships || []).forEach((ship: any) => map.set(String(ship.id), String(ship.name || "")))
    return map
  }, [ships])

  const shipOptions = useMemo(
    () =>
      (ships || [])
        .map((ship: any) => ({ id: String(ship.id), name: String(ship.name || "").trim() }))
        .filter((s) => Boolean(s.id) && Boolean(s.name))
        .sort((a, b) => a.name.localeCompare(b.name, "nl")),
    [ships]
  )

  const toggleShipInList = (
    shipId: string,
    setter: (updater: (prev: string[]) => string[]) => void
  ) => {
    setter((prev) => (prev.includes(shipId) ? prev.filter((id) => id !== shipId) : [...prev, shipId]))
  }

  const handleAddSharedPhoto = async (file: File | null) => {
    if (!file) return
    setPhotoError("")
    const shipName = photoShipName.trim()
    const captionText = photoCaptionText.trim()

    if (!shipName) {
      setPhotoError("Kies eerst een schip voor de foto.")
      return
    }
    if (!captionText) {
      setPhotoError("Vul een bijschrift voor de foto in.")
      return
    }
    if (!file.type.startsWith("image/")) {
      setPhotoError("Kies een afbeeldingsbestand (jpg/png/webp).")
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setPhotoError("Foto is te groot. Kies een bestand tot 4 MB.")
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ""))
      reader.onerror = () => reject(new Error("Kon foto niet lezen"))
      reader.readAsDataURL(file)
    }).catch(() => "")

    if (!dataUrl) {
      setPhotoError("Kon foto niet toevoegen, probeer opnieuw.")
      return
    }

    const nextItem: SharedPhotoItem = {
      id: `photo-${Date.now()}`,
      shipName,
      activityText: captionText,
      caption: captionText,
      imageDataUrl: dataUrl,
      addedAt: new Date().toISOString(),
    }
    setSharedPhotos((prev) => [nextItem, ...prev].slice(0, 8))
    setPhotoCaptionText("")
  }

  const removeSharedPhoto = (id: string) => {
    setSharedPhotos((prev) => prev.filter((item) => item.id !== id))
  }

  const events = useMemo(() => {
    const leaving: CrewEvent[] = []
    const joining: CrewEvent[] = []
    const anniversaries: CrewEvent[] = []
    const birthdays: CrewEvent[] = []
    const selectedMonthEnd = endOfMonth(selectedMonth)

    ;(crew || []).forEach((member: any) => {
      if (!member || member.is_dummy) return
      const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim()
      const shipName = shipNameById.get(String(member.ship_id || "")) || "Geen schip"

      const outDate = parseFlexibleDate(member.out_of_service_date)
      if (outDate && inSameMonth(outDate, selectedMonth)) {
        leaving.push({
          id: `leave-${member.id}`,
          fullName,
          detail: "",
        })
      }
      const statusValue = String(member.status || "").toLowerCase().trim()
      const isStatusOut = statusValue === "uit-dienst" || statusValue === "uit dienst"
      const leftOnOrBeforeMonthEnd = Boolean(outDate && outDate.getTime() <= selectedMonthEnd.getTime())
      if (isStatusOut || leftOnOrBeforeMonthEnd) return

      const inDate = parseFlexibleDate(member.in_dienst_vanaf)
      const joinsAfterMonthEnd = Boolean(inDate && inDate.getTime() > selectedMonthEnd.getTime())
      if (joinsAfterMonthEnd) return

      if (inDate && inSameMonth(inDate, selectedMonth)) {
        joining.push({
          id: `join-${member.id}`,
          fullName,
          detail: `${format(inDate, "dd-MM-yyyy")} • ${shipName}`,
        })
      }

      if (inDate) {
        const years = selectedMonth.getFullYear() - inDate.getFullYear()
        const milestone = years >= 5 && (years < 30 ? years % 5 === 0 : true)
        if (milestone) {
          const anniversaryDate = new Date(inDate)
          anniversaryDate.setFullYear(selectedMonth.getFullYear())
          if (inSameMonth(anniversaryDate, selectedMonth)) {
            anniversaries.push({
              id: `ann-${member.id}-${years}`,
              fullName,
              detail: `${years} jaar • ${format(anniversaryDate, "dd-MM-yyyy")}`,
            })
          }
        }
      }

      const birthDate = parseFlexibleDate(member.birth_date)
      if (birthDate) {
        const birthdayThisYear = new Date(selectedMonth.getFullYear(), birthDate.getMonth(), birthDate.getDate())
        if (inSameMonth(birthdayThisYear, selectedMonth)) {
          birthdays.push({
            id: `bd-${member.id}`,
            fullName,
            detail: format(birthdayThisYear, "dd-MM"),
          })
        }
      }
    })

    const byName = (a: CrewEvent, b: CrewEvent) => a.fullName.localeCompare(b.fullName, "nl")
    leaving.sort(byName)
    joining.sort(byName)
    anniversaries.sort(byName)
    birthdays.sort(byName)

    return { leaving, joining, anniversaries, birthdays }
  }, [crew, selectedMonth, shipNameById])

  const monthTitle = format(selectedMonth, "MMMM yyyy", { locale: nl })
  const monthLabelUpper = monthTitle.toUpperCase()
  const totalAutoItems =
    events.leaving.length + events.joining.length + events.anniversaries.length + events.birthdays.length

  const blockText = useMemo(() => {
    const leaving =
      events.leaving.length === 0
        ? "Er zijn deze maand geen collega’s uit dienst gegaan."
        : "Deze maand namen we afscheid van collega’s. We danken hen voor hun inzet en wensen hen veel succes en geluk in het vervolg van hun loopbaan."
    const joining =
      events.joining.length === 0
        ? "Er zijn deze maand geen nieuwe collega’s gestart."
        : "We verwelkomen deze maand nieuwe collega’s binnen ons team. Van harte welkom aan boord; we hopen dat jullie je snel thuis voelen binnen het team en wensen jullie een veilige en succesvolle start."
    const anniversary =
      events.anniversaries.length === 0
        ? "Deze maand zijn er geen dienstjubilea."
        : `Deze maand zetten we ${events.anniversaries.length} collega${events.anniversaries.length === 1 ? "" : "'s"} in het zonnetje vanwege hun dienstjubileum. Een mooi moment om stil te staan bij hun inzet, loyaliteit en vakmanschap door de jaren heen.`
    const birthday =
      events.birthdays.length === 0
        ? "Er zijn deze maand geen verjaardagen geregistreerd."
        : `In totaal vieren ${events.birthdays.length} collega${events.birthdays.length === 1 ? "" : "'s"} deze maand hun verjaardag.`
    return { leaving, joining, anniversary, birthday }
  }, [events])

  const operationalNotes = useMemo(() => {
    const yardShips = yardShipIds
      .map((id) => shipNameById.get(id))
      .filter((name): name is string => Boolean(name))
    const biqShips = biqShipIds
      .map((id) => shipNameById.get(id))
      .filter((name): name is string => Boolean(name))

    const lines: string[] = []
    if (yardShips.length > 0) {
      lines.push(
        `Deze maand gaat ${joinNames(yardShips)} naar de werf om klasse te maken. We wensen de bemanning en betrokken teams een vlotte voorbereiding en uitvoering.`
      )
    }
    if (biqShips.length > 0) {
      lines.push(
        `Deze maand wordt op ${joinNames(biqShips)} de BIQ inspectie gehouden. We wensen alle betrokken collega’s veel succes en een goed resultaat.`
      )
    }
    return lines
  }, [yardShipIds, biqShipIds, shipNameById])

  const spotlight = useMemo(() => {
    if (spotlightType === "crew") {
      const member = (crew || []).find((c: any) => String(c.id) === spotlightCrewId)
      if (!member) return null
      return {
        title: `${member.first_name || ""} ${member.last_name || ""}`.trim(),
        subtitle: member.position ? `Functie: ${member.position}` : "",
      }
    }
    const ship = (ships || []).find((s: any) => String(s.id) === spotlightShipId)
    if (!ship) return null
    return {
      title: String(ship.name || ""),
      subtitle: ship.company ? `Firma: ${ship.company}` : "",
    }
  }, [spotlightType, spotlightCrewId, spotlightShipId, crew, ships])

  const opsUpdateText = opsUpdate.trim()
  const officeUpdateText = manualUpdates.trim()
  const officeClosingText = manualClosing.trim()
  const hasOfficeMessage = Boolean(officeUpdateText || officeClosingText)

  if (loading) return <div className="max-w-6xl mx-auto py-8 px-3 text-gray-500">Data laden...</div>
  if (error) return <div className="max-w-6xl mx-auto py-8 px-3 text-red-600">Fout: {error}</div>

  const renderEventSection = (
    title: string,
    items: CrewEvent[],
    emptyText: string,
    options?: { printClass?: string; introText?: string }
  ) => (
    <Card className={`print:shadow-none print:border-gray-300 ${options?.printClass || ""}`}>
      <CardHeader className="pb-3 print:pb-2">
        <CardTitle className="flex items-center justify-between text-base print:text-sm">
          <span className="print:font-semibold">{title}</span>
          <Badge variant="secondary">{items.length}</Badge>
        </CardTitle>
        {options?.introText ? (
          <p className="text-sm text-gray-600 leading-relaxed mt-1">{options.introText}</p>
        ) : null}
      </CardHeader>
      <CardContent className="print:pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">{emptyText}</p>
        ) : (
          <div className="space-y-1.5 print:space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="py-1.5 border-b border-gray-100 last:border-b-0 print:py-1">
                <div className="font-medium text-gray-900 print:text-sm">{item.fullName}</div>
                {item.detail ? <div className="text-sm text-gray-600 print:text-xs">{item.detail}</div> : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <main className="max-w-6xl mx-auto py-6 px-3 sm:px-6 print:max-w-none print:py-0 print:px-0">
        <div className="print:hidden">
          <MobileHeaderNav />
          <DashboardButton />
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center text-sm text-blue-700 hover:text-blue-800">
              <ArrowLeft className="w-4 h-4 mr-1" /> Terug
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Maandelijkse nieuwsbrief</h1>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </Button>
        </div>

        <Card className="mb-4 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-5 py-6 text-white print:hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-white/95 p-1 shadow">
                    <Image
                      src="/bemanningslijst-icon.png.png"
                      alt="Bamalite logo"
                      width={56}
                      height={56}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-wide text-blue-100">Bamalite HR</div>
                    <div className="text-2xl font-semibold">Nieuwsbrief {monthTitle}</div>
                  </div>
                </div>
                <Badge className="bg-white text-blue-900">{totalAutoItems} automatische updates</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 print:hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setSelectedMonth((m) => subMonths(m, 1))}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Vorige maand
              </Button>
              <div className="font-semibold capitalize">{monthTitle}</div>
              <Button variant="outline" onClick={() => setSelectedMonth((m) => addMonths(m, 1))}>
                Volgende maand
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4 print:hidden">
          {renderEventSection(
            "Deze maand in dienst gekomen",
            events.joining,
            "Geen nieuwe indiensttredingen deze maand.",
            { printClass: "print:break-inside-avoid", introText: blockText.joining }
          )}
          {renderEventSection("Dienstjubilea deze maand", events.anniversaries, "Geen dienstjubilea in deze maand.", {
            printClass: "print:break-inside-avoid",
            introText: blockText.anniversary,
          })}
          {renderEventSection("Verjaardagen deze maand", events.birthdays, "Geen verjaardagen in deze maand.", {
            printClass: "print:break-inside-avoid",
            introText: blockText.birthday,
          })}
          {renderEventSection("Deze maand uit dienst", events.leaving, "Niemand heeft ons deze maand verlaten.", {
            printClass: "print:break-inside-avoid",
            introText: blockText.leaving,
          })}
        </div>

        <Card className="mb-8 print:hidden">
          <CardHeader>
            <CardTitle>Eigen inhoud toevoegen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 text-sm font-medium text-gray-700">Intro / maandboodschap</div>
              <Textarea
                value={manualIntro}
                onChange={(e) => setManualIntro(e.target.value)}
                placeholder="Bijv. Korte opening voor de schepen..."
                className="min-h-[90px] bg-white print:hidden"
              />
              <div className="hidden print:block text-sm text-gray-900 whitespace-pre-wrap">
                {manualIntro || "—"}
              </div>
            </div>

            <div className="rounded-md border border-slate-300 bg-white p-3">
              <div className="font-semibold text-slate-900 mb-2">Deze maand in de spotlight</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Type</div>
                  <select
                    value={spotlightType}
                    onChange={(e) => setSpotlightType(e.target.value === "ship" ? "ship" : "crew")}
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                  >
                    <option value="crew">Bemanningslid</option>
                    <option value="ship">Schip</option>
                  </select>
                </div>
                {spotlightType === "crew" ? (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Bemanningslid</div>
                    <select
                      value={spotlightCrewId}
                      onChange={(e) => setSpotlightCrewId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                    >
                      <option value="">Kies bemanningslid...</option>
                      {(crew || [])
                        .filter((m: any) => !m.is_dummy && String(m.status || "").toLowerCase() !== "uit-dienst")
                        .map((m: any) => (
                          <option key={`spotlight-crew-${m.id}`} value={String(m.id)}>
                            {`${m.first_name || ""} ${m.last_name || ""}`.trim()}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Schip</div>
                    <select
                      value={spotlightShipId}
                      onChange={(e) => setSpotlightShipId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                    >
                      <option value="">Kies schip...</option>
                      {shipOptions.map((ship) => (
                        <option key={`spotlight-ship-${ship.id}`} value={ship.id}>
                          {ship.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="md:col-span-1">
                  <div className="text-sm font-medium text-gray-700 mb-1">Toelichting</div>
                  <Textarea
                    value={spotlightText}
                    onChange={(e) => setSpotlightText(e.target.value)}
                    placeholder="Korte spotlighttekst..."
                    className="min-h-[72px] bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3">
              <div className="font-semibold text-cyan-900 mb-2">Korte operationele update</div>
              <Textarea
                value={opsUpdate}
                onChange={(e) => setOpsUpdate(e.target.value)}
                placeholder="Korte operationele update voor deze maand..."
                className="min-h-[80px] bg-white"
              />
            </div>
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <div className="font-semibold text-blue-900 mb-2">Operationele items deze maand (optioneel)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-800 mb-2">Naar de werf voor klasse</div>
                  <div className="space-y-1.5 max-h-36 overflow-auto pr-1">
                    {shipOptions.map((ship) => (
                      <label key={`yard-${ship.id}`} className="flex items-center gap-2 text-sm text-gray-700">
                        <Checkbox
                          checked={yardShipIds.includes(ship.id)}
                          onCheckedChange={() => toggleShipInList(ship.id, setYardShipIds)}
                        />
                        <span>{ship.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800 mb-2">BIQ inspectie</div>
                  <div className="space-y-1.5 max-h-36 overflow-auto pr-1">
                    {shipOptions.map((ship) => (
                      <label key={`biq-${ship.id}`} className="flex items-center gap-2 text-sm text-gray-700">
                        <Checkbox
                          checked={biqShipIds.includes(ship.id)}
                          onCheckedChange={() => toggleShipInList(ship.id, setBiqShipIds)}
                        />
                        <span>{ship.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <div className="font-semibold text-emerald-900 mb-2">Veiligheidstip van de maand</div>
              <Textarea
                value={safetyTip}
                onChange={(e) => setSafetyTip(e.target.value)}
                placeholder="Bijv. Controleer PBM voor vertrek en meld afwijkingen direct."
                className="min-h-[80px] bg-white"
              />
            </div>
            <div className="rounded-md border border-purple-200 bg-purple-50 p-3">
              <div className="font-semibold text-purple-900 mb-2">Gedeelde foto&apos;s van de schepen</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Schip</div>
                  <select
                    value={photoShipName}
                    onChange={(e) => setPhotoShipName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                  >
                    <option value="">Kies schip...</option>
                    {shipOptions.map((ship) => (
                      <option key={`photo-ship-${ship.id}`} value={ship.name}>
                        {ship.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm font-medium text-gray-700 mb-1">Bijschrift bij de foto</div>
                  <input
                    type="text"
                    value={photoCaptionText}
                    onChange={(e) => setPhotoCaptionText(e.target.value)}
                    placeholder="Schrijf hier vrij je eigen fototekst..."
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    void handleAddSharedPhoto(file)
                    e.currentTarget.value = ""
                  }}
                  className="text-sm"
                />
              </div>
              {photoError ? <div className="mt-2 text-sm text-red-700">{photoError}</div> : null}

              {sharedPhotos.length > 0 && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sharedPhotos.map((photo) => (
                    <div key={photo.id} className="rounded-md border bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.imageDataUrl}
                        alt={photo.caption}
                        className="w-full h-40 object-contain rounded bg-gray-100"
                      />
                      <div className="mt-2 text-sm font-medium text-gray-900">{photo.shipName}</div>
                      <div className="text-sm text-gray-600">{photo.caption}</div>
                      <button
                        type="button"
                        onClick={() => removeSharedPhoto(photo.id)}
                        className="mt-2 text-xs text-red-700 hover:text-red-800"
                      >
                        Verwijderen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-gray-700">Extra updates die we willen delen</div>
              <Textarea
                value={manualUpdates}
                onChange={(e) => setManualUpdates(e.target.value)}
                placeholder="Bijv. operationele updates, veiligheid, planning, etc."
                className="min-h-[140px] bg-white print:hidden"
              />
              <div className="hidden print:block text-sm text-gray-900 whitespace-pre-wrap">
                {manualUpdates || "—"}
              </div>
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-gray-700">Afsluiting</div>
              <Textarea
                value={manualClosing}
                onChange={(e) => setManualClosing(e.target.value)}
                placeholder="Bijv. Dankwoord of vooruitblik naar volgende maand."
                className="min-h-[90px] bg-white print:hidden"
              />
              <div className="hidden print:block text-sm text-gray-900 whitespace-pre-wrap">
                {manualClosing || "—"}
              </div>
            </div>
            <p className="text-xs text-gray-500 print:hidden">
              Concept wordt lokaal bewaard per maand in deze browser.
            </p>
          </CardContent>
        </Card>

        <div className="hidden print:block newsletter-print-root">
          <header className="newsletter-cover">
            <div className="newsletter-cover-bar">
              <div className="newsletter-brand">
                <div className="newsletter-brand-logo-wrap">
                  <Image
                    src="/bemanningslijst-icon.png.png"
                    alt="Bamalite logo"
                    width={64}
                    height={64}
                    className="newsletter-brand-logo"
                  />
                </div>
                <div>
                  <div className="newsletter-eyebrow">BAMALITE SCHEEPSNIEUWS</div>
                  <div className="newsletter-title">Maandbericht</div>
                  <div className="newsletter-subtitle capitalize">{monthTitle}</div>
                </div>
              </div>
              <div className="newsletter-edition">Editie {monthLabelUpper}</div>
            </div>
          </header>

          <section className="newsletter-lead">
            <p>
              Beste collega&apos;s, in deze editie delen we de belangrijkste personele en operationele ontwikkelingen van {monthTitle}. 
              {manualIntro ? ` ${manualIntro}` : ""}
            </p>
          </section>

          <div className="newsletter-main-grid">
            <section className="newsletter-article section-leaving">
              <h2>Deze maand uit dienst</h2>
              <p className="newsletter-kicker">{blockText.leaving}</p>
              {events.leaving.length === 0 ? (
                <p className="newsletter-muted">Niemand heeft ons deze maand verlaten.</p>
              ) : (
                events.leaving.map((item) => (
                  <p key={item.id} className="newsletter-person-line">
                    <strong>{item.fullName}</strong> {item.detail ? `· ${item.detail}` : ""}
                  </p>
                ))
              )}
            </section>

            <section className="newsletter-article section-joining">
              <h2>Deze maand in dienst gekomen</h2>
              <p className="newsletter-kicker">{blockText.joining}</p>
              {events.joining.length === 0 ? (
                <p className="newsletter-muted">Geen nieuwe indiensttredingen deze maand.</p>
              ) : (
                events.joining.map((item) => (
                  <p key={item.id} className="newsletter-person-line">
                    <strong>{item.fullName}</strong> {item.detail ? `· ${item.detail}` : ""}
                  </p>
                ))
              )}
            </section>

            <section className="newsletter-article section-anniversary">
              <h2>Dienstjubilea deze maand</h2>
              <p className="newsletter-kicker">{blockText.anniversary}</p>
              {events.anniversaries.length === 0 ? (
                <p className="newsletter-muted">Geen dienstjubilea in deze maand.</p>
              ) : (
                events.anniversaries.map((item) => (
                  <p key={item.id} className="newsletter-person-line">
                    <strong>{item.fullName}</strong> {item.detail ? `· ${item.detail}` : ""}
                  </p>
                ))
              )}
            </section>

            <section className="newsletter-article section-birthday">
              <h2>Verjaardagen deze maand</h2>
              <p className="newsletter-kicker">{blockText.birthday}</p>
              {events.birthdays.length === 0 ? (
                <p className="newsletter-muted">Geen verjaardagen in deze maand.</p>
              ) : (
                <div className="newsletter-two-col-list">
                  {events.birthdays.map((item) => (
                    <p key={item.id} className="newsletter-person-line">
                      <strong>{item.fullName}</strong> {item.detail ? `· ${item.detail}` : ""}
                    </p>
                  ))}
                </div>
              )}
            </section>

            {sharedPhotos[0] ? (
              <section className="newsletter-article full-width newsletter-photo-feature section-photo-feature">
                <div>
                  <h2>Fotomoment van de maand</h2>
                  <p className="newsletter-kicker">
                    Een sfeerbeeld vanaf de vloot, gedeeld door de bemanning.
                  </p>
                  <p className="newsletter-person-line">{sharedPhotos[0].caption}</p>
                </div>
                <figure className="newsletter-photo-feature-figure">
                  <img src={sharedPhotos[0].imageDataUrl} alt={sharedPhotos[0].caption} className="newsletter-photo-feature-image" />
                </figure>
              </section>
            ) : null}

            {spotlight && (
              <section className="newsletter-article feature section-spotlight">
                <h2>Deze maand in de spotlight</h2>
                <h3>{spotlight.title}</h3>
                {spotlightText.trim() ? <p>{spotlightText.trim()}</p> : null}
              </section>
            )}

            {safetyTip.trim() && (
              <section className="newsletter-article feature section-safety">
                <h2>Veiligheidstip van de maand</h2>
                <p>{safetyTip.trim()}</p>
              </section>
            )}

            {opsUpdateText && (
              <section className="newsletter-article section-ops-update">
                <h2>Korte operationele update</h2>
                <p className="newsletter-person-line">{opsUpdateText}</p>
              </section>
            )}

            {operationalNotes.length > 0 && (
              <section className="newsletter-article section-ops-events">
                <h2>Operationeel deze maand</h2>
                {operationalNotes.map((line, idx) => (
                  <p key={`ops-note-${idx}`} className="newsletter-person-line">
                    {line}
                  </p>
                ))}
              </section>
            )}

            {sharedPhotos.length > 1 && (
              <section className="newsletter-article photos section-photo-gallery">
                <h2>Gedeelde foto&apos;s van de schepen</h2>
                <div className="newsletter-photo-grid">
                  {sharedPhotos.slice(1).map((photo) => (
                    <figure key={`print-photo-${photo.id}`} className="newsletter-photo-figure">
                      <img src={photo.imageDataUrl} alt={photo.caption} className="newsletter-photo-image" />
                      <figcaption>
                        <strong>{photo.shipName}</strong> · {photo.caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {hasOfficeMessage && (
              <section className="newsletter-article full-width section-office">
                <h2>Bericht van kantoor</h2>
                {officeUpdateText ? <p>{officeUpdateText}</p> : null}
                {officeClosingText ? <p className="newsletter-kicker">{officeClosingText}</p> : null}
              </section>
            )}
          </div>

          <div className="newsletter-print-footer">
            Bamalite HR · Maandbericht {monthTitle} · Interne distributie schepen
          </div>
        </div>
      </main>
      <style jsx global>{`
        .dashboard-header {
          display: none !important;
        }
        .app-container {
          min-width: 0 !important;
        }
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            background: white !important;
            font-family: "Georgia", "Times New Roman", serif;
          }
          .newsletter-print-mode .print-header,
          .newsletter-print-mode .dashboard-header,
          .newsletter-print-mode nav.block.md\\:hidden.sticky.top-0,
          .newsletter-print-mode .print\\:hidden {
            display: none !important;
          }
          .newsletter-print-mode .app-container {
            min-width: 0 !important;
          }
          .newsletter-print-root {
            padding: 0;
            margin: 0;
            color: #0f172a;
            font-family: "Georgia", "Times New Roman", serif;
          }
          .newsletter-cover {
            margin-bottom: 4mm;
            border: 1px solid #cbd5e1;
          }
          .newsletter-cover-bar {
            display: flex;
            justify-content: space-between;
            align-items: end;
            padding: 4mm;
            background: #0f3a6d;
            color: white;
          }
          .newsletter-brand {
            display: flex;
            align-items: center;
            gap: 3mm;
          }
          .newsletter-brand-logo-wrap {
            width: 18mm;
            height: 18mm;
            border-radius: 999px;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #dbeafe;
            flex-shrink: 0;
          }
          .newsletter-brand-logo {
            width: 16mm;
            height: 16mm;
            object-fit: cover;
            border-radius: 999px;
          }
          .newsletter-eyebrow {
            font-size: 9.5pt;
            letter-spacing: 0.22em;
            opacity: 0.9;
          }
          .newsletter-title {
            font-size: 34pt;
            font-weight: 700;
            line-height: 1;
            text-transform: uppercase;
          }
          .newsletter-subtitle {
            font-size: 12.5pt;
            margin-top: 1mm;
          }
          .newsletter-edition {
            font-size: 10.5pt;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .newsletter-lead {
            margin-bottom: 4mm;
            padding: 3mm;
            border-left: 3px solid #0f3a6d;
            background: #f8fafc;
          }
          .newsletter-lead p {
            margin: 0 0 1.6mm 0;
            font-size: 12.5pt;
            line-height: 1.65;
          }
          .newsletter-lead-metrics {
            font-style: italic;
            color: #334155;
          }
          .newsletter-main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 5mm;
            row-gap: 4mm;
          }
          .newsletter-article {
            border-top: 1px solid #d1d5db;
            padding-top: 2.5mm;
            break-inside: avoid;
          }
          .section-spotlight { order: 1; }
          .section-joining { order: 2; }
          .section-anniversary { order: 3; }
          .section-birthday { order: 4; }
          .section-photo-feature { order: 5; }
          .section-ops-update { order: 6; }
          .section-ops-events { order: 7; }
          .section-safety { order: 8; }
          .section-leaving { order: 9; }
          .section-photo-gallery { order: 10; }
          .section-office { order: 11; }
          .newsletter-article.full-width {
            grid-column: 1 / -1;
          }
          .newsletter-article.feature {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-top: 3px solid #1d4ed8;
            padding: 3mm;
          }
          .newsletter-article h2 {
            margin: 0 0 1.6mm 0;
            font-size: 18pt;
            font-weight: 700;
            color: #0f172a;
          }
          .newsletter-article h3 {
            margin: 0 0 1mm 0;
            font-size: 13pt;
            font-weight: 700;
          }
          .newsletter-kicker {
            margin: 0 0 2mm 0;
            font-size: 11pt;
            color: #475569;
            font-style: italic;
          }
          .newsletter-person-line,
          .newsletter-article p {
            margin: 0 0 1.3mm 0;
            font-size: 12pt;
            line-height: 1.62;
          }
          .newsletter-muted {
            font-size: 11pt;
            color: #64748b;
            margin: 0;
          }
          .newsletter-inline-note {
            margin-top: 2mm;
            padding-top: 1.5mm;
            border-top: 1px solid #cbd5e1;
          }
          .newsletter-photo-feature {
            display: grid;
            grid-template-columns: 1fr 72mm;
            gap: 4mm;
            align-items: start;
            border-top: 1px solid #93c5fd;
            border-bottom: 1px solid #dbeafe;
            padding-top: 3mm;
            padding-bottom: 3mm;
            background: #f8fafc;
          }
          .newsletter-photo-feature-figure {
            margin: 0;
            border: 0;
            padding: 0;
            background: transparent;
          }
          .newsletter-photo-feature-image {
            width: 100%;
            height: 58mm;
            object-fit: contain;
            display: block;
            background: transparent;
          }
          .newsletter-two-col-list {
            columns: 2;
            column-gap: 4mm;
          }
          .newsletter-photo-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 3mm;
          }
          .newsletter-photo-figure {
            margin: 0;
          }
          .newsletter-photo-image {
            width: 100%;
            height: 62mm;
            object-fit: contain;
            background: #ffffff;
            display: block;
          }
          .newsletter-photo-figure figcaption {
            margin-top: 1mm;
            font-size: 10.5pt;
            color: #334155;
          }
          .newsletter-print-footer {
            border-top: 1px solid #e5e7eb;
            margin-top: 7mm;
            padding-top: 2mm;
            font-size: 10pt;
            color: #64748b;
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}

