"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { CheckCircle2, AlertCircle, Copy, ExternalLink, Search } from "lucide-react"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { BackButton } from "@/components/ui/back-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { isRealCrewMember, parseCrewDate } from "@/utils/crew-filters"
import { normalizeCrewAddress } from "@/utils/luxembourg-a1-readiness"
import { getCompanyCcssMatricule } from "@/utils/luxembourg-a1-config"
import { getFirmaInvoiceDetails, FIRMA_INVOICE_DETAILS } from "@/utils/firma-invoice-details"
import { getShipParticularsConfigByName } from "@/app/schepen/overzicht/ship-particulars-registry"
import { getProcedure, isProcedureCategory } from "@/lib/procedures/catalog"
import type {
  ProcedureDocument,
  ProcedureLink,
  ProcedurePack,
  ProcedureStep,
} from "@/lib/procedures/types"
import { isEuEeaSwissNationality, resolveResidence } from "@/lib/procedures/residence"

type CrewRow = Record<string, unknown> & { id: string; ship_id?: string }

function formatDate(value: unknown): string {
  const parsed = parseCrewDate(value)
  if (!parsed) return ""
  return format(parsed, "d MMMM yyyy", { locale: nl })
}

function LinkList({ links }: { links: ProcedureLink[] }) {
  if (links.length === 0) return null
  return (
    <ul className="space-y-1">
      {links.map((link) => (
        <li key={link.href + link.label}>
          <a
            href={link.href}
            target={link.href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noreferrer"
            className="text-sm text-blue-700 hover:underline inline-flex items-center gap-1"
          >
            {link.label}
            {link.href.startsWith("http") && <ExternalLink className="w-3 h-3" />}
          </a>
        </li>
      ))}
    </ul>
  )
}

function PackList({ packs }: { packs: ProcedurePack[] }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-5">
      <h2 className="font-semibold text-gray-900">Waarheen en wat meenemen</h2>
      {packs.map((pack) => (
        <div key={pack.title} className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">{pack.title}</h3>
          <p className="text-sm text-gray-700">{pack.how}</p>
          <address className="not-italic text-sm text-gray-900 leading-relaxed">
            {pack.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <ul className="space-y-1.5 pt-1">
            {pack.bring.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-gray-800">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {pack.note && <p className="text-xs text-gray-500">{pack.note}</p>}
        </div>
      ))}
    </section>
  )
}

function DocumentList({ documents }: { documents: ProcedureDocument[] }) {
  if (documents.length === 0) return null
  return (
    <ul className="space-y-2">
      {documents.map((document) => (
        <li key={document.name} className="text-sm text-gray-800">
          {document.href ? (
            <a href={document.href} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
              {document.name}
            </a>
          ) : (
            <span className="font-medium">{document.name}</span>
          )}
          {document.note && <div className="text-xs text-gray-500">{document.note}</div>}
        </li>
      ))}
    </ul>
  )
}

function StepList({ steps }: { steps: ProcedureStep[] }) {
  if (steps.length === 0) return null
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold flex items-center justify-center shrink-0">
            {index + 1}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{step.title}</div>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function buildCzEmail(input: {
  name: string
  birth: string
  nationality: string
  address: string
  matricule: string
  company: string
  employerMatricule: string
  position: string
  inDienst: string
  ship: string
}) {
  const subject = `Aanmelding Verdragspolis – ${input.name} – S1 Luxemburg`
  const lines = [
    "Geachte heer, mevrouw,",
    "",
    "Hierbij melden wij onderstaande werknemer aan voor de Verdragspolis.",
    "Het S1-formulier van de CNS en het ingevulde CZ-aanmeldformulier sturen wij mee.",
    "",
    `Naam: ${input.name || "—"}`,
    `Geboortedatum: ${input.birth || "—"}`,
    `Nationaliteit: ${input.nationality || "—"}`,
    `Adres: ${input.address || "—"}`,
    `Matricule: ${input.matricule || "—"}`,
    `Werkgever: ${input.company || "—"}`,
    `Matricule werkgever: ${input.employerMatricule || "—"}`,
    `Functie: ${input.position || "—"}`,
    `In dienst vanaf: ${input.inDienst || "—"}`,
    `Schip: ${input.ship || "—"}`,
    "",
    "Met vriendelijke groet,",
    input.company || "Bamalite",
  ]
  return { to: "verdragspolis@cz.nl", subject, body: lines.join("\n") }
}

export function HandleidingenProcedure() {
  const params = useParams<{ category: string; procedureId: string }>()
  const categoryId = String(params.category || "")
  const procedureId = String(params.procedureId || "")
  const procedure =
    isProcedureCategory(categoryId) ? getProcedure(categoryId, procedureId) : undefined
  const { crew, ships, loading } = useSupabaseData()
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const shipById = useMemo(
    () => new Map(ships.map((ship: { id: string; name: string }) => [ship.id, ship])),
    [ships]
  )

  const people = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (crew || [])
      .filter((member: CrewRow) => isRealCrewMember(member))
      .filter((member: CrewRow) => {
        if (!q) return true
        const name = `${member.first_name || ""} ${member.last_name || ""}`.toLowerCase()
        return name.includes(q)
      })
      .sort((a: CrewRow, b: CrewRow) =>
        String(a.last_name || "").localeCompare(String(b.last_name || ""), "nl")
      )
  }, [crew, search])

  const selected =
    (crew || []).find((member: CrewRow) => member.id === selectedId && isRealCrewMember(member)) ||
    null

  if (!procedure) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <BackButton href="/handleidingen" />
        <p className="mt-4 text-gray-600">Deze procedure staat niet in de lijst.</p>
      </div>
    )
  }

  const backHref = `/handleidingen/${procedure.category}`

  const address = selected ? normalizeCrewAddress(selected.address) : null
  const residence = selected
    ? resolveResidence(address?.country, String(selected.nationality || ""))
    : null
  const route =
    residence && procedure.residenceRoutes
      ? procedure.residenceRoutes.find((item) => item.id === residence.route)
      : undefined

  const company = String(selected?.company || "").trim()
  const employerMatricule = company ? getCompanyCcssMatricule(company) || "" : ""
  const firma = company ? getFirmaInvoiceDetails(company) : null
  const ship = selected?.ship_id ? shipById.get(String(selected.ship_id)) : undefined
  const fullName = selected
    ? `${selected.first_name || ""} ${selected.last_name || ""}`.trim()
    : ""
  const addressLine = address
    ? [address.street, [address.postalCode, address.city].filter(Boolean).join(" "), address.country]
        .filter(Boolean)
        .join(", ")
    : ""
  const eu = selected ? isEuEeaSwissNationality(String(selected.nationality || "")) : null

  const known: { label: string; value: string }[] = selected
    ? [
        { label: "Naam", value: fullName },
        { label: "Nationaliteit", value: String(selected.nationality || "") },
        { label: "Geboortedatum", value: formatDate(selected.birth_date) },
        { label: "Matricule", value: String(selected.matricule || "") },
        { label: "Adres", value: addressLine },
        { label: "Firma", value: company },
        { label: "Matricule werkgever", value: employerMatricule },
        { label: "Functie", value: String(selected.position || "") },
        { label: "In dienst vanaf", value: formatDate(selected.in_dienst_vanaf) },
        { label: "Einde proeftijd", value: formatDate(selected.proeftijd_datum) },
        { label: "Schip", value: ship?.name || "" },
        { label: "Telefoon", value: String(selected.phone || "") },
        { label: "E-mail", value: String(selected.email || "") },
      ]
    : []

  const email = selected
    ? buildCzEmail({
        name: fullName,
        birth: formatDate(selected.birth_date),
        nationality: String(selected.nationality || ""),
        address: addressLine,
        matricule: String(selected.matricule || ""),
        company,
        employerMatricule,
        position: String(selected.position || ""),
        inDienst: formatDate(selected.in_dienst_vanaf),
        ship: ship?.name || "",
      })
    : null

  const copyEmail = async () => {
    if (!email) return
    const text = `Aan: ${email.to}\nOnderwerp: ${email.subject}\n\n${email.body}`
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      const area = document.createElement("textarea")
      area.value = text
      area.setAttribute("readonly", "")
      area.style.position = "fixed"
      area.style.left = "-9999px"
      document.body.appendChild(area)
      area.select()
      ok = document.execCommand("copy")
      document.body.removeChild(area)
    }
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />
      <div className="flex flex-wrap items-start gap-4 mb-6">
        <BackButton href={backHref} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{procedure.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{procedure.summary}</p>
        </div>
      </div>

      {procedure.status === "gepland" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          De officiële stappen van deze procedure worden nog uitgewerkt. De plek in het menu staat
          vast, zodat hij later op dezelfde manier opent.
        </div>
      )}

      {procedure.status === "uitgewerkt" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {(procedure.packs || []).length > 0 && <PackList packs={procedure.packs || []} />}
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Stappen</h2>
              <StepList steps={procedure.steps || []} />
            </section>
            {(procedure.documents || []).length > 0 && (
              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Formulieren</h2>
                <DocumentList documents={procedure.documents || []} />
              </section>
            )}
            {(procedure.links || []).length > 0 && (
              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Instanties</h2>
                <LinkList links={procedure.links || []} />
              </section>
            )}
            {procedure.sourceNote && (
              <p className="text-xs text-gray-500">{procedure.sourceNote}</p>
            )}
          </div>

          <div className="space-y-4">
            {procedure.subject === "crew" && (<>
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Bemanningslid</h2>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Zoek op naam"
                  className="pl-9"
                />
              </div>
              {loading ? (
                <p className="text-sm text-gray-500">Gegevens laden...</p>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {people.slice(0, 40).map((member: CrewRow) => {
                    const name = `${member.first_name || ""} ${member.last_name || ""}`.trim()
                    const active = member.id === selectedId
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(member.id)
                          setCopied(false)
                        }}
                        className={`w-full text-left rounded px-2 py-1.5 text-sm ${
                          active ? "bg-blue-100 text-blue-900" : "hover:bg-gray-50"
                        }`}
                      >
                        {name}
                      </button>
                    )
                  })}
                  {people.length === 0 && (
                    <p className="text-sm text-gray-500">Niemand gevonden.</p>
                  )}
                </div>
              )}
            </section>

            {selected && (
              <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">Gegevens uit de bemanningslijst</h2>
                  <Link href={`/bemanning/${selected.id}`} className="text-xs text-blue-700 hover:underline">
                    Profiel openen
                  </Link>
                </div>
                <ul className="space-y-1">
                  {known.map((field) => (
                    <li key={field.label} className="flex items-start gap-2 text-sm">
                      {field.value ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      )}
                      <span>
                        <span className="text-gray-500">{field.label}: </span>
                        {field.value || "ontbreekt"}
                      </span>
                    </li>
                  ))}
                </ul>
                {eu === false && !String(selected.matricule || "").trim() && (
                  <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
                    Deze nationaliteit valt buiten de EU, EER en Zwitserland. Het matricule komt
                    dan van de immigratiedienst, vaak pas na visum D of de werkvergunning.
                  </p>
                )}
                {eu === true && !String(selected.matricule || "").trim() && (
                  <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
                    Nog geen matricule. Vraag dat eerst aan bij het CCSS, met een kleurenkopie van
                    het identiteitsbewijs, en zet het daarna op het profiel.
                  </p>
                )}
                {procedure.id === "zorgverzekering-na-inschrijving" && firma && (
                  <p className="text-xs text-gray-500">
                    Werkgever op de aangifte: {firma.name}, {firma.street}, {firma.postalCity}.
                    Telefoon {firma.phone}.
                  </p>
                )}
                {procedure.id === "zorgverzekering-na-inschrijving" && (
                  <p className="text-xs text-gray-500">
                    Uren per week staan niet in de bemanningslijst. Die komen uit het contract.
                  </p>
                )}
              </section>
            )}

            {selected && route && (
              <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-blue-950">{route.title}</h2>
                  {residence?.assumedFromNationality && (
                    <Badge variant="outline" className="border-amber-500 text-amber-800">
                      Woonland ontbreekt
                    </Badge>
                  )}
                </div>
                {residence?.assumedFromNationality && (
                  <p className="text-sm text-amber-900">
                    Het land staat niet in het adres. De route volgt de nationaliteit. Controleer
                    of deze persoon daar ook woont.
                  </p>
                )}
                <p className="text-sm text-blue-950">{route.intro}</p>
                <StepList steps={route.steps} />
                <DocumentList documents={route.documents || []} />
                <LinkList links={route.links || []} />
                {route.czEmail && email && (
                  <div className="space-y-2 pt-2">
                    <div className="text-sm font-medium text-blue-950">
                      Conceptmail naar {email.to}
                    </div>
                    <pre className="text-xs bg-white border border-blue-100 rounded p-3 whitespace-pre-wrap text-gray-800">
                      {`Onderwerp: ${email.subject}\n\n${email.body}`}
                    </pre>
                    <Button type="button" size="sm" variant="outline" onClick={copyEmail}>
                      <Copy className="w-4 h-4 mr-2" />
                      {copied ? "Gekopieerd" : "Kopieer mail"}
                    </Button>
                  </div>
                )}
              </section>
            )}
            </>
            )}
            {procedure.subject === "ship" && <ShipContext ships={ships} loading={loading} />}
            {procedure.subject === "company" && <CompanyContext />}
          </div>
        </div>
      )}
    </div>
  )
}

function shipParticular(shipName: string, test: (label: string) => boolean): string {
  const config = getShipParticularsConfigByName(shipName)
  if (!config) return ""
  for (const section of config.sections || []) {
    for (const item of section.items || []) {
      if (test(String(item.label || "").toLowerCase())) {
        return String(item.value || "").trim()
      }
    }
  }
  return ""
}

function ContextList({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <ul className="space-y-1">
      {rows.map((field) => (
        <li key={field.label} className="flex items-start gap-2 text-sm">
          {field.value ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          )}
          <span>
            <span className="text-gray-500">{field.label}: </span>
            {field.value || "ontbreekt"}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ShipContext({
  ships,
  loading,
}: {
  ships: { id: string; name?: string; company?: string }[]
  loading: boolean
}) {
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const q = search.trim().toLowerCase()
  const list = [...ships]
    .filter((ship) => !q || String(ship.name || "").toLowerCase().includes(q))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "nl"))
  const selected = ships.find((ship) => ship.id === selectedId) || null
  const name = String(selected?.name || "")
  const rows = selected
    ? [
        { label: "Naam", value: name },
        { label: "Firma in de lijst", value: String(selected.company || "") },
        { label: "ENI", value: shipParticular(name, (label) => label.includes("eni")) },
        { label: "Eigenaar", value: shipParticular(name, (label) => label === "eigenaar") },
        {
          label: "Classificatie",
          value: shipParticular(name, (label) => label.includes("classificatie")),
        },
        { label: "ADN-type", value: shipParticular(name, (label) => label.includes("adn type")) },
      ]
    : []

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Schip</h2>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek op scheepsnaam"
            className="pl-9"
          />
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Gegevens laden...</p>
        ) : (
          <div className="max-h-52 overflow-y-auto space-y-1">
            {list.map((ship) => (
              <button
                key={ship.id}
                type="button"
                onClick={() => setSelectedId(ship.id)}
                className={`w-full text-left rounded px-2 py-1.5 text-sm ${
                  ship.id === selectedId ? "bg-blue-100 text-blue-900" : "hover:bg-gray-50"
                }`}
              >
                {ship.name}
              </button>
            ))}
          </div>
        )}
      </section>
      {selected && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Gegevens uit de scheepslijst</h2>
          <ContextList rows={rows} />
          <p className="text-xs text-gray-500">
            De certificaten zelf vul je nog met de hand in. Dit zijn de gegevens die al vastliggen.
          </p>
        </section>
      )}
    </div>
  )
}

function CompanyContext() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const entries = Object.entries(FIRMA_INVOICE_DETAILS)
  const selected = selectedKey ? FIRMA_INVOICE_DETAILS[selectedKey] : null
  const rows = selected
    ? [
        { label: "Naam", value: selected.name },
        { label: "Adres", value: `${selected.street}, ${selected.postalCity}` },
        { label: "Telefoon", value: selected.phone },
        { label: "E-mail", value: selected.email },
        { label: "Btw", value: selected.vatNumber },
        { label: "Handelsregister", value: selected.tradeNumber },
        { label: "Bank", value: selected.bankAccount },
        { label: "CCSS-matricule", value: getCompanyCcssMatricule(selectedKey) || "" },
      ]
    : []

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Firma</h2>
        <div className="space-y-1">
          {entries.map(([key, company]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
              className={`w-full text-left rounded px-2 py-1.5 text-sm ${
                key === selectedKey ? "bg-blue-100 text-blue-900" : "hover:bg-gray-50"
              }`}
            >
              {company.name}
            </button>
          ))}
        </div>
      </section>
      {selected && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Gegevens van de firma</h2>
          <ContextList rows={rows} />
        </section>
      )}
    </div>
  )
}
