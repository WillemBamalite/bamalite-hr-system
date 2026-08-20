"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Building2, UserPlus, AlertCircle, Printer, ArrowLeftRight, FileText } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { CrewMemberPrint } from "@/components/crew/crew-member-print"
import { useAuth } from "@/contexts/AuthContext"
import {
  buildDoorbelastingRows,
  filterDoorbelastingByMonth,
  formatMonthKeyNl,
  getAvailableDoorbelastingMonths,
  getMonthKeyFromDate,
  shiftMonthKey,
  type DoorbelastingMonthRow,
} from "@/utils/doorbelasting"
import {
  amountRowKey,
  emptyAmountsStore,
  loadDoorbelastingAmountsLocal,
  nextInvoiceNumber,
  resolveDoorbelastingAmount,
  saveDoorbelastingAmountsLocal,
  setDoorbelastingAmount,
  type DoorbelastingAmountsStore,
} from "@/utils/doorbelasting-amounts"
import {
  downloadFirmaInvoice,
  generateFirmaDoorbelastingInvoice,
} from "@/utils/firma-invoice-generator"
import { Input } from "@/components/ui/input"

const COMPANIES = [
  { id: "bamalite", name: "Bamalite S.A.", number: "B 44356" },
  { id: "alcina", name: "Alcina S.A.", number: "B 129072" },
  { id: "europe", name: "Europe Shipping AG.", number: "B 83558" },
  { id: "brugo", name: "Brugo Shipping SARL.", number: "B 277323" },
  { id: "devel", name: "Devel Shipping S.A.", number: "B 139046" },
]

const PRINT_TRANSLATIONS = {
  nl: {
    titlePrefix: "Firma overzicht -",
    description: "Overzicht van alle bemanningsleden bij deze firma.",
    totalLabel: "Totaal",
    crewSingular: "bemanningslid",
    crewPlural: "bemanningsleden",
  },
  de: {
    titlePrefix: "Firmenübersicht -",
    description: "Übersicht aller Besatzungsmitglieder dieser Firma.",
    totalLabel: "Gesamt",
    crewSingular: "Besatzungsmitglied",
    crewPlural: "Besatzungsmitglieder",
  },
} as const

function sortByLastNameAndFirstName(a: any, b: any) {
  const lastA = (a.last_name || "").toString()
  const lastB = (b.last_name || "").toString()
  const lastCompare = lastA.localeCompare(lastB, "nl")
  if (lastCompare !== 0) return lastCompare
  const firstA = (a.first_name || "").toString()
  const firstB = (b.first_name || "").toString()
  return firstA.localeCompare(firstB, "nl")
}

function parseAmountInput(raw: string): number | null {
  const s = String(raw || "").trim()
  if (!s) return null
  const normalized = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function formatAmountInput(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return ""
  return value.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FirmaWisselingPage() {
  const { crew, ships, loading } = useSupabaseData()
  const { user } = useAuth()
  const [mainView, setMainView] = useState<"firma" | "doorbelasting">("firma")
  const [activeTab, setActiveTab] = useState(COMPANIES[0].id)
  const [printLanguage, setPrintLanguage] = useState<"nl" | "de">("nl")
  const [doorbelastingMonth, setDoorbelastingMonth] = useState(getMonthKeyFromDate(new Date()))
  const [amountsStore, setAmountsStore] = useState<DoorbelastingAmountsStore>(emptyAmountsStore)
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({})
  const [vatPercent, setVatPercent] = useState(12)
  const [invoiceBusyKey, setInvoiceBusyKey] = useState<string | null>(null)
  const userEmailLower = String(user?.email || "").toLowerCase()
  const isFirmaReadOnlyUser =
    userEmailLower === "tanja@bamalite.com" ||
    userEmailLower === "karina@bamalite.com" ||
    userEmailLower === "lucie@bamalite.com"
  const isGermanFirmaUser =
    userEmailLower === "tanja@bamalite.com" || userEmailLower === "lucie@bamalite.com"
  const uiText = {
    pageTitle: isGermanFirmaUser ? "Firmenwechsel" : "Firma Wisseling",
    pageSubtitle: isGermanFirmaUser
      ? "Übersicht der Besatzungsmitglieder pro Firma"
      : "Overzicht van bemanningsleden per firma",
    printLanguageLabel: isGermanFirmaUser ? "Sprache Druckversion:" : "Taal printversie:",
    printCompany: isGermanFirmaUser ? "Firma drucken" : "Print firma",
    switchCompany: isGermanFirmaUser ? "Firmenwechsel" : "Wisseling van Firma",
    noCrewToPrint: isGermanFirmaUser
      ? "Es gibt keine Besatzungsmitglieder bei dieser Firma zum Drucken."
      : "Er zijn geen bemanningsleden bij deze firma om te printen.",
    companyNumber: isGermanFirmaUser ? "Firmennummer:" : "Firmanummer:",
    crewCountLabel: isGermanFirmaUser ? "Besatzungsmitglied" : "bemanningslid",
    crewCountPluralSuffix: isGermanFirmaUser ? "er" : "en",
    noCrewInCompany: isGermanFirmaUser
      ? "Keine Besatzungsmitglieder bei dieser Firma"
      : "Geen bemanningsleden bij deze firma",
    shipOtherCompanyTitle: isGermanFirmaUser
      ? "Steht auf Schiff einer anderen Firma"
      : "Staat op schip van andere firma",
    tabFirma: isGermanFirmaUser ? "Pro Firma" : "Per firma",
    tabDoorbelasting: isGermanFirmaUser ? "Weiterverrechnung" : "Doorbelasting",
    doorbelastingTitle: "Weiterverrechnung pro Monat",
    monthLabel: isGermanFirmaUser ? "Monat:" : "Maand:",
    printDoorbelasting: isGermanFirmaUser ? "Monat drucken" : "Print maand",
    noDoorbelasting: isGermanFirmaUser
      ? "Keine Weiterverrechnungen in diesem Monat."
      : "Geen doorbelastingen in deze maand.",
    colName: isGermanFirmaUser ? "Name" : "Naam",
    colFrom: isGermanFirmaUser ? "Eigene Firma" : "Eigen firma",
    colTo: isGermanFirmaUser ? "An Firma" : "Naar firma",
    colShip: isGermanFirmaUser ? "Schiff" : "Schip",
    colMonth: isGermanFirmaUser ? "Monat" : "Maand",
    colBruto: isGermanFirmaUser ? "Bruttogehalt" : "Bruto salaris",
    brutoEmpty: isGermanFirmaUser ? "(noch offen)" : "(nog invullen)",
    sinceLabel: isGermanFirmaUser ? "Seit" : "Sinds",
    noPrintRows: isGermanFirmaUser
      ? "Keine Zeilen zum Drucken in diesem Monat."
      : "Geen regels om te printen in deze maand.",
    vatLabel: isGermanFirmaUser ? "MwSt %:" : "BTW %:",
    invoiceBtn: isGermanFirmaUser ? "Rechnung" : "Factuur",
    invoiceAllBtn: isGermanFirmaUser ? "Rechnungen erstellen" : "Facturen maken",
    invoiceNeedAmount: isGermanFirmaUser
      ? "Zuerst Bruttogehalt eintragen"
      : "Eerst bruto bedrag invullen",
    amountHint: isGermanFirmaUser
      ? "Betrag bleibt in Folgemonaten stehen und kann angepasst werden."
      : "Bedrag blijft in volgende maanden staan en is aanpasbaar.",
  }

  useEffect(() => {
    setAmountsStore(loadDoorbelastingAmountsLocal())
  }, [])

  const getCrewByCompany = (companyName: string) => {
    return crew
      .filter(
        (member: any) =>
          member.company === companyName && !member.is_dummy && member.status !== "uit-dienst"
      )
      .sort(sortByLastNameAndFirstName)
  }

  const hasShipFromDifferentCompany = (member: any) => {
    if (!member.ship_id) return false
    const ship = ships.find((s: any) => s.id === member.ship_id)
    if (!ship || !ship.company) return false
    return ship.company !== member.company
  }

  const allDoorbelastingRows = useMemo(
    () => buildDoorbelastingRows({ crew, ships }),
    [crew, ships]
  )
  const availableMonths = useMemo(() => {
    const fromData = getAvailableDoorbelastingMonths(allDoorbelastingRows)
    const current = getMonthKeyFromDate(new Date())
    const withCurrent = fromData.includes(current) ? fromData : [current, ...fromData]
    // Altijd een paar recente maanden beschikbaar houden voor selectie
    const extras = [0, 1, 2, 3, 4, 5].map((i) => shiftMonthKey(current, -i))
    return Array.from(new Set([...extras, ...withCurrent])).sort((a, b) => (a < b ? 1 : -1))
  }, [allDoorbelastingRows])
  const monthRows = useMemo(
    () => filterDoorbelastingByMonth(allDoorbelastingRows, doorbelastingMonth),
    [allDoorbelastingRows, doorbelastingMonth]
  )

  useEffect(() => {
    if (!availableMonths.includes(doorbelastingMonth) && availableMonths[0]) {
      setDoorbelastingMonth(availableMonths[0])
    }
  }, [availableMonths, doorbelastingMonth])

  useEffect(() => {
    setVatPercent(typeof amountsStore.vatPercent === "number" ? amountsStore.vatPercent : 12)
  }, [amountsStore.vatPercent])

  // Zorg dat meegenomen bedragen per maand eigen kopie krijgen (aanpasbaar zonder vorige maand te wijzigen)
  useEffect(() => {
    if (monthRows.length === 0) return
    setAmountsStore((prev) => {
      let store = prev
      let changed = false
      for (const row of monthRows) {
        const key = amountRowKey(
          row.crewId,
          row.shipId,
          row.fromCompany,
          row.toCompany,
          row.monthKey
        )
        if (typeof store.byMonth[key] === "number") continue
        const carried = resolveDoorbelastingAmount(
          store,
          row.crewId,
          row.shipId,
          row.fromCompany,
          row.toCompany,
          row.monthKey
        )
        if (carried === null) continue
        store = setDoorbelastingAmount(
          store,
          row.crewId,
          row.shipId,
          row.fromCompany,
          row.toCompany,
          row.monthKey,
          carried
        )
        changed = true
      }
      return changed ? store : prev
    })
  }, [doorbelastingMonth, monthRows, amountsStore.updatedAt])

  const getResolvedAmount = (row: DoorbelastingMonthRow): number | null =>
    resolveDoorbelastingAmount(
      amountsStore,
      row.crewId,
      row.shipId,
      row.fromCompany,
      row.toCompany,
      row.monthKey
    )

  const draftKeyFor = (row: DoorbelastingMonthRow) =>
    `${row.crewId}|${row.shipId}|${row.fromCompany}|${row.toCompany}|${row.monthKey}`

  const commitAmount = (row: DoorbelastingMonthRow, raw: string) => {
    const parsed = parseAmountInput(raw)
    const next = setDoorbelastingAmount(
      amountsStore,
      row.crewId,
      row.shipId,
      row.fromCompany,
      row.toCompany,
      row.monthKey,
      parsed
    )
    setAmountsStore(next)
    setAmountDrafts((prev) => {
      const copy = { ...prev }
      delete copy[draftKeyFor(row)]
      return copy
    })
  }

  const persistVat = (value: number) => {
    const safe = Number.isFinite(value) && value >= 0 ? value : 12
    setVatPercent(safe)
    const next = saveDoorbelastingAmountsLocal({ ...amountsStore, vatPercent: safe })
    if (next) setAmountsStore(next)
  }

  const createInvoiceForRow = async (
    row: DoorbelastingMonthRow,
    storeOverride?: DoorbelastingAmountsStore
  ): Promise<DoorbelastingAmountsStore | null> => {
    const workingStore = storeOverride || amountsStore
    const amount = resolveDoorbelastingAmount(
      workingStore,
      row.crewId,
      row.shipId,
      row.fromCompany,
      row.toCompany,
      row.monthKey
    )
    if (amount === null || amount <= 0) {
      alert(uiText.invoiceNeedAmount)
      return null
    }
    const busy = draftKeyFor(row)
    setInvoiceBusyKey(busy)
    try {
      const { number, nextStore } = nextInvoiceNumber(workingStore, row.fromCompany, row.monthKey)
      setAmountsStore(nextStore)
      const blob = await generateFirmaDoorbelastingInvoice({
        fromCompany: row.fromCompany,
        toCompany: row.toCompany,
        shipName: row.shipName,
        employeeName: `${row.lastName} ${row.firstName}`.trim(),
        monthKey: row.monthKey,
        nettoAmount: amount,
        vatPercent,
        invoiceNumber: number,
      })
      const safeName = `${row.lastName}_${row.firstName}`.replace(/[^\w\-]+/g, "_")
      downloadFirmaInvoice(
        blob,
        `Factuur_${number}_${safeName}_${row.shipName.replace(/\s+/g, "_")}.pdf`
      )
      return nextStore
    } catch (err: any) {
      alert(err?.message || "Factuur maken mislukt")
      return null
    } finally {
      setInvoiceBusyKey(null)
    }
  }

  const createInvoicesForMonth = async () => {
    const withAmount = monthRows.filter((row) => {
      const a = getResolvedAmount(row)
      return a !== null && a > 0
    })
    if (withAmount.length === 0) {
      alert(uiText.invoiceNeedAmount)
      return
    }
    let store = amountsStore
    for (const row of withAmount) {
      const next = await createInvoiceForRow(row, store)
      if (next) store = next
    }
  }

  const activeCompany = COMPANIES.find((c) => c.id === activeTab) || COMPANIES[0]
  const activeCompanyCrew = getCrewByCompany(activeCompany.name)
  const t = PRINT_TRANSLATIONS[printLanguage]

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Laden...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <DashboardButton />

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .container {
              max-width: none !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body * { visibility: hidden; }
            .firma-print-root, .firma-print-root *,
            .doorbelasting-print-root, .doorbelasting-print-root * {
              visibility: visible;
            }
            .firma-print-root, .doorbelasting-print-root {
              position: absolute;
              left: 0 !important;
              top: 0 !important;
              right: 0 !important;
              width: 100% !important;
              max-width: none !important;
              min-height: auto;
              margin: 0 !important;
              padding: 0 !important;
              background: white;
              font-family: Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.35;
              box-sizing: border-box;
            }
            .firma-print-toc-page { page-break-after: always; }
            .crew-print-page {
              page-break-after: always;
              width: 100%;
              min-height: 297mm;
              padding: 0;
              background: white;
            }
            .no-print, header, nav, button { display: none !important; }
            .doorbelasting-print-root {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .doorbelasting-print-table {
              width: 100% !important;
              table-layout: fixed;
              border-collapse: collapse;
              font-size: 10pt;
            }
            .doorbelasting-print-table thead th {
              background: #fff7ed !important;
              color: #334155;
              font-weight: 600;
              text-align: left;
              padding: 8px 12px;
              border-bottom: 1px solid #fed7aa;
            }
            .doorbelasting-print-table tbody td {
              padding: 8px 12px;
              border-top: 1px solid #f1f5f9;
              vertical-align: top;
              color: #1e293b;
              word-wrap: break-word;
            }
            .doorbelasting-print-table th:nth-child(1),
            .doorbelasting-print-table td:nth-child(1) { width: 22%; }
            .doorbelasting-print-table th:nth-child(2),
            .doorbelasting-print-table td:nth-child(2) { width: 18%; }
            .doorbelasting-print-table th:nth-child(3),
            .doorbelasting-print-table td:nth-child(3) { width: 18%; }
            .doorbelasting-print-table th:nth-child(4),
            .doorbelasting-print-table td:nth-child(4) { width: 14%; }
            .doorbelasting-print-table th:nth-child(5),
            .doorbelasting-print-table td:nth-child(5) { width: 14%; }
            .doorbelasting-print-table th:nth-child(6),
            .doorbelasting-print-table td:nth-child(6) { width: 14%; }
            .doorbelasting-print-name {
              font-weight: 600;
              color: #0f172a;
            }
            .doorbelasting-print-meta {
              font-size: 9pt;
              color: #64748b;
              margin-top: 1px;
            }
            .doorbelasting-print-to {
              color: #c2410c !important;
              font-weight: 600;
            }
            .doorbelasting-print-bruto {
              color: #94a3b8;
              font-style: italic;
            }
          }
          @media screen {
            .firma-print-root, .doorbelasting-print-root { display: none; }
          }
          @page { size: A4 portrait; margin: 10mm; }
        `,
        }}
      />

      <div className="mb-6 flex flex-col gap-4 no-print">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{uiText.pageTitle}</h1>
            <p className="text-gray-600">{uiText.pageSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isFirmaReadOnlyUser && mainView === "firma" && (
              <Link href="/firma-wisseling/wisseling">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {uiText.switchCompany}
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1 w-fit">
          <button
            type="button"
            onClick={() => setMainView("firma")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              mainView === "firma" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-1.5" />
            {uiText.tabFirma}
          </button>
          <button
            type="button"
            onClick={() => setMainView("doorbelasting")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              mainView === "doorbelasting" ? "bg-orange-600 text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 inline mr-1.5" />
            {uiText.tabDoorbelasting}
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-black/10">
              {filterDoorbelastingByMonth(allDoorbelastingRows, doorbelastingMonth).length}
            </span>
          </button>
        </div>
      </div>

      {mainView === "firma" ? (
        <>
          <div className="mb-4 flex items-center justify-end gap-4 no-print">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="font-medium">{uiText.printLanguageLabel}</span>
              <div className="inline-flex rounded-md border border-gray-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setPrintLanguage("nl")}
                  className={`px-2 py-1 text-xs font-medium rounded-sm ${
                    printLanguage === "nl" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  NL
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLanguage("de")}
                  className={`px-2 py-1 text-xs font-medium rounded-sm ${
                    printLanguage === "de" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  DE
                </button>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (activeCompanyCrew.length === 0) {
                  alert(uiText.noCrewToPrint)
                  return
                }
                window.print()
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              {uiText.printCompany} ({activeCompanyCrew.length})
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full no-print">
            <TabsList className="grid w-full max-w-5xl grid-cols-5 mb-8">
              {COMPANIES.map((company) => {
                const companyCrew = getCrewByCompany(company.name)
                return (
                  <TabsTrigger key={company.id} value={company.id} className="text-sm">
                    <Building2 className="w-4 h-4 mr-2" />
                    {company.name.split(" ")[0]}
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">{companyCrew.length}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {COMPANIES.map((company) => {
              const companyCrew = getCrewByCompany(company.name)
              return (
                <TabsContent key={company.id} value={company.id} className="space-y-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
                        <p className="text-gray-600">
                          {uiText.companyNumber} {company.number}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {companyCrew.length} {uiText.crewCountLabel}
                          {companyCrew.length !== 1 ? uiText.crewCountPluralSuffix : ""}
                        </p>
                      </div>

                      {companyCrew.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">{uiText.noCrewInCompany}</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {companyCrew.map((member: any) => {
                            const needsCompanySwitch = hasShipFromDifferentCompany(member)
                            const ship = ships.find((s: any) => s.id === member.ship_id)
                            return (
                              <Card
                                key={member.id}
                                className={`hover:shadow-md transition-shadow ${
                                  needsCompanySwitch ? "border-orange-300 border-2" : ""
                                }`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center space-x-3">
                                    <Avatar>
                                      <AvatarFallback className="bg-blue-100 text-blue-600">
                                        {member.first_name?.[0] || "?"}
                                        {member.last_name?.[0] || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                          {member.last_name} {member.first_name}
                                        </h3>
                                        {needsCompanySwitch && (
                                          <AlertCircle
                                            className="w-5 h-5 text-orange-500 flex-shrink-0"
                                            title={uiText.shipOtherCompanyTitle}
                                          />
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 truncate">{member.position}</p>
                                      {member.ship_id && (
                                        <p className="text-xs text-gray-500 truncate">
                                          {ship?.name || member.ship_id}
                                          {needsCompanySwitch && ship && (
                                            <span className="ml-1 text-orange-600">({ship.company})</span>
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>

          <div className="firma-print-root">
            <div className="firma-print-toc-page">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t.titlePrefix} {activeCompany.name}
              </h1>
              <p className="text-gray-700 mb-4">{t.description}</p>
              <p className="text-sm text-gray-500 mb-6">
                {t.totalLabel}: {activeCompanyCrew.length}{" "}
                {activeCompanyCrew.length === 1 ? t.crewSingular : t.crewPlural}
              </p>
              <ol className="space-y-1 text-sm">
                {activeCompanyCrew.map((member: any, index: number) => (
                  <li key={member.id} className="flex justify-between border-b border-gray-200 py-1">
                    <span className="font-medium">
                      {index + 1}. {member.last_name} {member.first_name}
                    </span>
                    <span className="text-gray-500">{member.position}</span>
                  </li>
                ))}
              </ol>
            </div>
            <Suspense fallback={null}>
              {activeCompanyCrew.map((member: any) => (
                <CrewMemberPrint
                  key={member.id}
                  crewMemberId={member.id}
                  language={printLanguage}
                  variant="firma"
                />
              ))}
            </Suspense>
          </div>
        </>
      ) : (
        <>
          <Card className="no-print mb-4 border-orange-200">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{uiText.doorbelastingTitle}</h2>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700" htmlFor="doorbelasting-month">
                      {uiText.monthLabel}
                    </label>
                    <select
                      id="doorbelasting-month"
                      className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                      value={doorbelastingMonth}
                      onChange={(e) => setDoorbelastingMonth(e.target.value)}
                    >
                      {availableMonths.map((mk) => (
                        <option key={mk} value={mk}>
                          {formatMonthKeyNl(mk, isGermanFirmaUser)}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-500">
                      ({monthRows.length} {isGermanFirmaUser ? "Personen" : "personen"})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700" htmlFor="doorbelasting-vat">
                      {uiText.vatLabel}
                    </label>
                    <Input
                      id="doorbelasting-vat"
                      className="h-9 w-20"
                      type="number"
                      min={0}
                      step={1}
                      value={vatPercent}
                      onChange={(e) => setVatPercent(Number(e.target.value))}
                      onBlur={() => persistVat(vatPercent)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      void createInvoicesForMonth()
                    }}
                    disabled={monthRows.length === 0 || !!invoiceBusyKey}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {uiText.invoiceAllBtn}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (monthRows.length === 0) {
                        alert(uiText.noPrintRows)
                        return
                      }
                      window.print()
                    }}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    {uiText.printDoorbelasting}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-gray-500">{uiText.amountHint}</p>

              {monthRows.length === 0 ? (
                <div className="text-center py-10 text-gray-500">{uiText.noDoorbelasting}</div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-orange-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">{uiText.colName}</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">{uiText.colFrom}</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">{uiText.colTo}</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">{uiText.colShip}</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">{uiText.colMonth}</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">{uiText.colBruto}</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">{uiText.invoiceBtn}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((row) => {
                        const key = draftKeyFor(row)
                        const resolved = getResolvedAmount(row)
                        const draft =
                          amountDrafts[key] !== undefined
                            ? amountDrafts[key]
                            : formatAmountInput(resolved)
                        const busy = invoiceBusyKey === key
                        return (
                          <tr key={key} className="border-t border-gray-100">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">
                                {row.lastName} {row.firstName}
                              </div>
                              <div className="text-xs text-gray-500">{row.position}</div>
                              {row.sinceDate && (
                                <div className="text-xs text-gray-400">
                                  {uiText.sinceLabel}:{" "}
                                  {new Date(row.sinceDate).toLocaleDateString(
                                    isGermanFirmaUser ? "de-DE" : "nl-NL"
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-800">{row.fromCompany}</td>
                            <td className="px-3 py-2 text-orange-700 font-medium">{row.toCompany}</td>
                            <td className="px-3 py-2 text-gray-800">{row.shipName}</td>
                            <td className="px-3 py-2 text-gray-800">
                              {formatMonthKeyNl(row.monthKey, isGermanFirmaUser)}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                className="h-8 w-32"
                                inputMode="decimal"
                                placeholder={uiText.brutoEmpty}
                                value={draft}
                                onChange={(e) =>
                                  setAmountDrafts((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                onBlur={() => commitAmount(row, draft)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    ;(e.target as HTMLInputElement).blur()
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!resolved || busy || !!invoiceBusyKey}
                                onClick={() => void createInvoiceForRow(row)}
                                title={resolved ? uiText.invoiceBtn : uiText.invoiceNeedAmount}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                {busy ? "..." : uiText.invoiceBtn}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="doorbelasting-print-root">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {uiText.doorbelastingTitle} — {formatMonthKeyNl(doorbelastingMonth, true)}
            </h1>
            <p className="text-sm text-gray-500 mb-4">
              {monthRows.length} Personen
            </p>
            <table className="doorbelasting-print-table">
              <thead>
                <tr>
                  <th>{uiText.colName}</th>
                  <th>{uiText.colFrom}</th>
                  <th>{uiText.colTo}</th>
                  <th>{uiText.colShip}</th>
                  <th>{uiText.colMonth}</th>
                  <th>{uiText.colBruto}</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((row) => {
                  const amount = getResolvedAmount(row)
                  return (
                    <tr key={`print-${row.crewId}-${row.monthKey}-${row.shipId}`}>
                      <td>
                        <div className="doorbelasting-print-name">
                          {row.lastName} {row.firstName}
                        </div>
                        <div className="doorbelasting-print-meta">{row.position}</div>
                        {row.sinceDate && (
                          <div className="doorbelasting-print-meta">
                            {uiText.sinceLabel}:{" "}
                            {new Date(row.sinceDate).toLocaleDateString(
                              isGermanFirmaUser ? "de-DE" : "nl-NL"
                            )}
                          </div>
                        )}
                      </td>
                      <td>{row.fromCompany}</td>
                      <td className="doorbelasting-print-to">{row.toCompany}</td>
                      <td>{row.shipName}</td>
                      <td>{formatMonthKeyNl(row.monthKey, isGermanFirmaUser)}</td>
                      <td className="doorbelasting-print-bruto">
                        {amount !== null
                          ? `€ ${amount.toLocaleString("nl-NL", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : uiText.brutoEmpty}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
