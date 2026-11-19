export type ProcedureCategory = "schip" | "bemanning" | "overig"

export type ProcedureStatus = "uitgewerkt" | "gepland" | "doorverwijzing"

export type ProcedureSubject = "crew" | "ship" | "company" | "none"

export type ProcedureLink = {
  label: string
  href: string
}

export type ProcedureStep = {
  title: string
  body: string
}

export type ProcedureDocument = {
  name: string
  note?: string
  href?: string
}

/** Loket of postadres, met de stukken die je meeneemt of meestuurt. */
export type ProcedurePack = {
  title: string
  how: string
  lines: string[]
  bring: string[]
  note?: string
}

export type ResidenceRouteId = "nl" | "be" | "de" | "fr" | "lu" | "other" | "unknown"

export type ResidenceRoute = {
  id: ResidenceRouteId
  title: string
  intro: string
  steps: ProcedureStep[]
  documents?: ProcedureDocument[]
  links?: ProcedureLink[]
  /** Conceptmail naar verdragspolis@cz.nl met de gegevens van het bemanningslid. */
  czEmail?: boolean
}

export type Procedure = {
  id: string
  category: ProcedureCategory
  title: string
  summary: string
  status: ProcedureStatus
  subject: ProcedureSubject
  steps?: ProcedureStep[]
  documents?: ProcedureDocument[]
  links?: ProcedureLink[]
  packs?: ProcedurePack[]
  residenceRoutes?: ResidenceRoute[]
  /** Bestaande pagina in deze applicatie. */
  appHref?: string
  sourceNote?: string
}

export const PROCEDURE_CATEGORIES: {
  id: ProcedureCategory
  title: string
  description: string
}[] = [
  {
    id: "bemanning",
    title: "Bemanning",
    description: "Zorg, uitkeringen, pensioen, papieren en einde contract.",
  },
  {
    id: "schip",
    title: "Schip",
    description: "Inschrijving, vergunningen, certificaten en inspecties.",
  },
  {
    id: "overig",
    title: "Overig",
    description: "Klasse-inspectie voorbereiden en schade melden.",
  },
]
