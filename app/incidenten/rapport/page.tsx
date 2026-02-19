"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { BackButton } from "@/components/ui/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, FileText, Clock, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { supabase } from "@/lib/supabase"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import React from "react"
import { PDFDocument, rgb, StandardFonts, PDFImage } from "pdf-lib"

type TimelineEventCardProps = {
  event: any
  onEdit: () => void
  onDelete: () => void
}

const TimelineEventCard: React.FC<TimelineEventCardProps> = ({
  event,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="border rounded-md p-2 space-y-1 bg-white">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-xs">
          {event.event_time
            ? format(new Date(event.event_time), "d MMM yyyy, HH:mm", { locale: nl })
            : "Geen tijd opgegeven"}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="xs" onClick={onEdit}>
            Bewerken
          </Button>
          <Button variant="destructive" size="xs" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="font-medium text-xs">{event.title}</div>
      {event.description && (
        <div className="text-xs text-gray-700 whitespace-pre-wrap">
          {event.description}
        </div>
      )}
    </div>
  )
}

type TabId =
  | "basis"
  | "tijdlijn"
  | "interviews"
  | "betrokkenen"
  | "feiten"
  | "analyse"
  | "acties"
  | "lessons"
  | "bijlagen"
  | "rapport"

export default function IncidentRapportWizardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("basis")
  const { incidents, ships } = useSupabaseData()

  const [savingBasis, setSavingBasis] = useState(false)
  const [reportId, setReportId] = useState<string | null>(null)
  const [reports, setReports] = useState<any[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  const [basisForm, setBasisForm] = useState({
    title: "",
    relatedIncidentId: "",
    incidentType: "",
    internalShipId: "",
    externalShipName: "",
    internalCompany: "Bamalite S.A.",
    externalCompany: "",
    incidentDate: format(new Date(), "yyyy-MM-dd"),
    incidentTime: "",
    locationDescription: "",
    locationGps: "",
    loaded: "" as "" | "geladen" | "leeg",
    product: "",
    quantity: "",
    voyageFrom: "",
    voyageTo: "",
    departureDate: "",
    arrivalDate: "",
    cargoHazards: "",
    weatherConditions: "",
    visibility: "",
    waterInfluence: "",
  })

  const [timelineEvents, setTimelineEvents] = useState<any[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [timelineForm, setTimelineForm] = useState({
    id: "" as string | "",
    phase: "voorfase",
    date: "",
    time: "",
    title: "",
    description: "",
    involved: "",
    decision: "",
    reactionTime: "",
  })

  const [interviews, setInterviews] = useState<any[]>([])
  const [loadingInterviews, setLoadingInterviews] = useState(false)
  const [interviewForm, setInterviewForm] = useState({
    id: "" as string | "",
    personName: "",
    role: "",
    experience: "",
    rhinePatent: "",
    sailingLicence: "",
    radarLicense: "",
    vhfCertificate: "",
    adnBasic: "",
    adnC: "",
    tankBargeExperience: "",
    restHours: "",
    workHours48h: "",
    stressFactors: "",
    distractionFactors: "",
    freeStatement: "",
    observations: "",
    actions: "",
    decisions: "",
    expectations: "",
    deviations: "",
    procedureExists: "" as "" | "ja" | "nee",
    procedureFollowed: "" as "" | "ja" | "nee",
    procedureReason: "",
  })
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null)

  const [participants, setParticipants] = useState<any[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [participantForm, setParticipantForm] = useState({
    id: "" as string | "",
    category: "aan_boord" as "aan_boord" | "extern",
    name: "",
    role: "",
    company: "",
    directInvolved: "" as "" | "ja" | "nee",
    possibleContribution: "",
    notes: "",
  })
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null)

  const [facts, setFacts] = useState<any[]>([])
  const [loadingFacts, setLoadingFacts] = useState(false)
  const [factForm, setFactForm] = useState({
    id: "" as string | "",
    category: "mens" as "mens" | "techniek" | "omgeving" | "operationeel" | "organisatie" | "extern",
    description: "",
    source: "",
    certainty: "zeker" as "zeker" | "waarschijnlijk" | "onbekend",
  })
  const [selectedFact, setSelectedFact] = useState<any | null>(null)

  const [analysisItems, setAnalysisItems] = useState<any[]>([])
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [analysisForm, setAnalysisForm] = useState({
    id: "" as string | "",
    analysisType: "directe_aanleiding" as "directe_aanleiding" | "bijdragende_factor" | "barriere" | "conclusie",
    category: "" as "" | "technisch" | "operationeel" | "organisatorisch" | "samenvattend",
    description: "",
    barrierPresent: "" as "" | "ja" | "nee",
    barrierWorked: "" as "" | "ja" | "nee",
  })
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null)

  const [actions, setActions] = useState<any[]>([])
  const [loadingActions, setLoadingActions] = useState(false)
  const [actionForm, setActionForm] = useState({
    id: "" as string | "",
    relatedAnalysisId: "",
    description: "",
    responsible: "",
    deadline: "",
    status: "open" as "open" | "in_uitvoering" | "afgerond" | "geannuleerd",
    notes: "",
  })
  const [selectedAction, setSelectedAction] = useState<any | null>(null)

  const [lessonsLearned, setLessonsLearned] = useState<any[]>([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [lessonForm, setLessonForm] = useState({
    id: "" as string | "",
    category: "operationeel" as "operationeel" | "technisch" | "organisatorisch",
    lesson: "",
  })
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null)

  const [attachments, setAttachments] = useState<any[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [attachmentForm, setAttachmentForm] = useState({
    id: "" as string | "",
    attachmentType: "foto" as
      | "foto"
      | "video"
      | "pdf"
      | "email"
      | "ais"
      | "logboek"
      | "verklaring"
      | "ander",
    description: "",
    attachmentDate: "",
    linkedToTimelineEventId: "",
    linkedToFactId: "",
    linkedToInterviewId: "",
    linkedToActionId: "",
    file: null as File | null,
  })
  const [selectedAttachment, setSelectedAttachment] = useState<any | null>(null)

  const formatDateSafe = (value?: string | null) => {
    if (!value) return ""
    try {
      return format(new Date(value), "d MMMM yyyy", { locale: nl })
    } catch {
      return ""
    }
  }

  const generateIncidentNarrative = () => {
    if (!currentReport) return ""

    const lines: string[] = []

    // 1. Opening
    lines.push(
      `Op ${formatDateSafe(currentReport.incident_date) || "onbekende datum"} vond op ${
        currentReport.location_description || "onbekende locatie"
      } een incident plaats met het schip ${
        currentReport.external_ship_name ||
        ships.find((s: any) => s.id === currentReport.internal_ship_id)?.name ||
        "onbekend schip"
      }.`
    )

    // 2. Situatie vooraf (voorfase)
    const beforeEvents = timelineEvents.filter((e) => e.phase === "voorfase")
    if (beforeEvents.length > 0) {
      lines.push(
        "In de periode voorafgaand aan het incident was de situatie als volgt (samenvatting van de tijdlijn):"
      )
      beforeEvents
        .slice()
        .sort(
          (a, b) =>
            new Date(a.event_time || a.created_at).getTime() -
            new Date(b.event_time || b.created_at).getTime()
        )
        .forEach((e) => {
          lines.push(
            `- Rond ${
              e.event_time ? format(new Date(e.event_time), "HH:mm", { locale: nl }) : "onbekend tijdstip"
            }: ${e.title}${e.description ? ` – ${e.description}` : ""}.`
          )
        })
    }

    // 3. Verloop van het incident (incidentmoment)
    const incidentEvents = timelineEvents.filter((e) => e.phase === "incident")
    if (incidentEvents.length > 0) {
      lines.push("Het verloop van het incident kan als volgt worden beschreven:")
      incidentEvents
        .slice()
        .sort(
          (a, b) =>
            new Date(a.event_time || a.created_at).getTime() -
            new Date(b.event_time || b.created_at).getTime()
        )
        .forEach((e) => {
          lines.push(
            `- Om ${
              e.event_time ? format(new Date(e.event_time), "HH:mm", { locale: nl }) : "onbekend tijdstip"
            }: ${e.title}${e.description ? ` – ${e.description}` : ""}.`
          )
        })
    }

    // 4. Eerste maatregelen na het incident (na_incident)
    const afterEvents = timelineEvents.filter((e) => e.phase === "na_incident")
    if (afterEvents.length > 0) {
      lines.push(
        "In de eerste minuten en uren na het incident zijn de volgende maatregelen en acties vastgelegd:"
      )
      afterEvents
        .slice()
        .sort(
          (a, b) =>
            new Date(a.event_time || a.created_at).getTime() -
            new Date(b.event_time || b.created_at).getTime()
        )
        .forEach((e) => {
          lines.push(
            `- Om ${
              e.event_time ? format(new Date(e.event_time), "HH:mm", { locale: nl }) : "onbekend tijdstip"
            }: ${e.title}${e.description ? ` – ${e.description}` : ""}.`
          )
        })
    }

    // 5. Feiten (zeker)
    const certainFacts = facts.filter((f) => f.certainty === "zeker")
    if (certainFacts.length > 0) {
      lines.push("Op basis van de verzamelde feiten is onder andere het volgende vastgesteld:")
      certainFacts.forEach((f) => {
        lines.push(`- [${f.category}] ${f.description}.`)
      })
    }

    // 6. Observaties uit interviews (optioneel)
    if (interviews.length > 0) {
      lines.push("Uit de interviews met betrokkenen komen de volgende waarnemingen naar voren:")
      interviews.forEach((i) => {
        const text =
          i.observations || i.free_statement || i.actions || i.decisions || i.expectations || ""
        if (text) {
          lines.push(`- ${i.person_name}: ${text}`)
        }
      })
    }

    return lines.join("\n\n")
  }

  const generateFullReportText = () => {
    if (!currentReport) return ""

    const sections: string[] = []

    // 1.1 Barge information
    sections.push("1.1 BARGE INFORMATION")
    sections.push("")
    if (currentReport.incident_type) {
      sections.push(`Type incident: ${currentReport.incident_type}`)
    }
    if (currentReport.internal_company || currentReport.external_company) {
      sections.push(
        `Bedrijf: ${currentReport.internal_company || currentReport.external_company}`
      )
    }
    if (currentReport.internal_ship_id || currentReport.external_ship_name) {
      const shipName =
        currentReport.external_ship_name ||
        ships.find((s: any) => s.id === currentReport.internal_ship_id)?.name ||
        "Onbekend"
      sections.push(`Schip: ${shipName}`)
    }
    if (currentReport.location_description) {
      sections.push(`Locatie: ${currentReport.location_description}`)
    }
    if (currentReport.location_gps) {
      sections.push(`GPS: ${currentReport.location_gps}`)
    }
    sections.push("")

    // 1.2 Voyage information
    if (
      currentReport.voyage_from ||
      currentReport.voyage_to ||
      currentReport.departure_date ||
      currentReport.arrival_date
    ) {
      sections.push("1.2 VOYAGE INFORMATION")
      sections.push("")
      if (currentReport.voyage_from || currentReport.voyage_to) {
        sections.push(
          `Reis: ${currentReport.voyage_from || "Onbekend"} naar ${currentReport.voyage_to || "Onbekend"}`
        )
      }
      if (currentReport.departure_date || currentReport.arrival_date) {
        sections.push(
          `Periode: ${formatDateSafe(currentReport.departure_date) || "Onbekend"} – ${formatDateSafe(currentReport.arrival_date) || "Onbekend"}`
        )
      }
      if (typeof currentReport.loaded === "boolean") {
        sections.push(`Belading: ${currentReport.loaded ? "Geladen" : "Leeg"}`)
      }
      if (currentReport.product) {
        sections.push(`Product: ${currentReport.product}`)
      }
      if (currentReport.quantity) {
        sections.push(`Hoeveelheid: ${currentReport.quantity}`)
      }
      if (
        currentReport.weather_conditions ||
        currentReport.visibility ||
        currentReport.water_influence
      ) {
        const weather = [
          currentReport.weather_conditions,
          currentReport.visibility,
          currentReport.water_influence,
        ]
          .filter(Boolean)
          .join(" | ")
        sections.push(`Weer en omstandigheden: ${weather}`)
      }
      if (currentReport.cargo_hazards) {
        sections.push(`Gevaren product: ${currentReport.cargo_hazards}`)
      }
      sections.push("")
    }

    // 1.3 Brief description
    if (facts.length > 0) {
      sections.push("1.3 BRIEF DESCRIPTION OF THE INCIDENT")
      sections.push("")
      sections.push("Samenvatting feiten:")
      facts.forEach((f) => {
        sections.push(
          `[${f.category}] ${f.description}${f.certainty && f.certainty !== "zeker" ? ` (zekerheid: ${f.certainty})` : ""}`
        )
      })
      sections.push("")
    }

    // 1.5 Time sheet
    if (timelineEvents.length > 0) {
      sections.push("1.5 TIME SHEET OF THE INCIDENT")
      sections.push("")
      timelineEvents
        .slice()
        .sort(
          (a, b) =>
            new Date(a.event_time || a.created_at).getTime() -
            new Date(b.event_time || b.created_at).getTime()
        )
        .forEach((e) => {
          const timeStr = e.event_time
            ? format(new Date(e.event_time), "d MMM yyyy HH:mm", { locale: nl })
            : "Zonder tijdstip"
          sections.push(`${timeStr}: ${e.title}`)
        })
      sections.push("")
    }

    // 1.6 Incident description
    const narrative = generateIncidentNarrative()
    if (narrative) {
      sections.push("1.6 INCIDENT DESCRIPTION")
      sections.push("")
      sections.push(narrative)
      sections.push("")
    }

    // 1.7 Manning - special marker voor tabel
    if (interviews.length > 0 || participants.length > 0) {
      sections.push("1.7 MANNING")
      sections.push("")
      if (participants.length > 0) {
        sections.push("Betrokkenen:")
        participants.forEach((p) => {
          const roleInfo = p.role
            ? ` (${p.role}${p.company ? `, ${p.company}` : ""})`
            : ""
          sections.push(`${p.name}${roleInfo}${p.direct_involved ? " – Direct betrokken" : ""}`)
        })
        sections.push("")
      }
      // Special marker voor tabel - wordt later vervangen door echte tabel
      if (interviews.length > 0) {
        sections.push("__MANNING_TABLE__")
        sections.push("")
      }
    }

    // 2. Analysis
    if (analysisItems.length > 0) {
      sections.push("2. ANALYSIS")
      sections.push("")
      analysisItems.forEach((a) => {
        const typeLabel =
          a.analysis_type === "directe_aanleiding"
            ? "Directe aanleiding"
            : a.analysis_type === "bijdragende_factor"
            ? "Bijdragende factor"
            : a.analysis_type === "barriere"
            ? "Barrière"
            : "Conclusie"
        const categoryLabel = a.category ? ` (${a.category})` : ""
        sections.push(`${typeLabel}${categoryLabel}: ${a.description}`)
      })
      sections.push("")
    }

    // 3. Corrective measures
    if (actions.length > 0) {
      sections.push("3. CORRECTIVE / PREVENTIVE MEASURES")
      sections.push("")
      actions.forEach((a) => {
        let actionText = `Actie (${a.status || "onbekend"}): ${a.description}`
        if (a.responsible) actionText += ` – verantwoordelijk: ${a.responsible}`
        if (a.deadline) actionText += ` – deadline: ${formatDateSafe(a.deadline)}`
        sections.push(actionText)
      })
      sections.push("")
    }

    // 4. Lessons learned
    if (lessonsLearned.length > 0) {
      sections.push("4. LESSONS LEARNED")
      sections.push("")
      lessonsLearned.forEach((l) => {
        const categoryLabel =
          l.category === "operationeel"
            ? "Operationeel"
            : l.category === "technisch"
            ? "Technisch"
            : "Organisatorisch"
        sections.push(`${categoryLabel}: ${l.lesson}`)
      })
      sections.push("")
    }

    // Appendix - special marker voor bijlagen met foto's
    if (attachments.length > 0) {
      sections.push("APPENDIX (BIJLAGEN)")
      sections.push("")
      attachments.forEach((att) => {
        if (att.attachment_type === "foto" || att.attachment_type === "video") {
          // Special marker voor foto's - wordt later vervangen door embedded image
          sections.push(`__ATTACHMENT_IMAGE__${att.id}__${att.file_name}__`)
        } else {
          sections.push(`${att.file_name} (${att.attachment_type || "bijlage"})`)
        }
      })
    }

    return sections.join("\n")
  }

  const generatePDF = async () => {
    if (!currentReport) {
      alert("Geen rapport geselecteerd.")
      return
    }

    try {
      // Laad het PDF template
      const templateUrl = "/contracts/Incident_rapporten.pdf"
      const templateResponse = await fetch(templateUrl)
      if (!templateResponse.ok) {
        throw new Error(
          `Kon PDF-template niet laden (status ${templateResponse.status})`
        )
      }
      const templateBytes = await templateResponse.arrayBuffer()

      // Laad het PDF document
      const pdfDoc = await PDFDocument.load(templateBytes)

      // Haal alle pagina's op (template heeft ~15 pagina's)
      const pages = pdfDoc.getPages()
      const firstPage = pages[0]
      const { width, height } = firstPage.getSize()

      // Laad fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      // Genereer de volledige rapporttekst
      let reportText = generateFullReportText()

      // Vervang Unicode karakters die niet in WinAnsi kunnen
      reportText = reportText
        .replace(/→/g, "naar")
        .replace(/–/g, "-")
        .replace(/—/g, "-")
        .replace(/"/g, '"')
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/'/g, "'")

      // Instellingen voor tekst plaatsing
      const fontSize = 10
      const lineHeight = fontSize * 1.2
      const marginLeft = 50
      const marginRight = 50
      const marginTopFirstPage = 200 // Lagere start op eerste pagina (onder bedrijfsgegevens)
      const marginTopOtherPages = 80 // Hoog beginnen vanaf pagina 2
      const marginBottom = 50
      const maxWidth = width - marginLeft - marginRight
      const sectionSpacing = 20 // Extra ruimte tussen secties

      // Split tekst in regels die passen binnen de breedte
      const splitTextIntoLines = (text: string, maxWidth: number, font: any, fontSize: number) => {
        const words = text.split(" ")
        const lines: string[] = []
        let currentLine = ""

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const testWidth = font.widthOfTextAtSize(testLine, fontSize)

          if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) {
          lines.push(currentLine)
        }
        return lines
      }

      // Verwerk de tekst per regel
      const textLines = reportText.split("\n")
      let currentY = height - marginTopFirstPage
      let currentPage = firstPage
      let pageIndex = 0
      let previousWasHeading = false
      let previousWasEmpty = false

      // Helper functie om naar volgende pagina te gaan
      const moveToNextPage = () => {
        pageIndex++
        // Gebruik bestaande template pagina als die bestaat, anders maak nieuwe
        if (pageIndex < pages.length) {
          currentPage = pages[pageIndex]
        } else {
          currentPage = pdfDoc.addPage([width, height])
        }
        // Vanaf pagina 2 hoog beginnen
        currentY = height - marginTopOtherPages
      }

      // Helper functie om Manning tabel te tekenen
      const drawManningTable = (
        page: any,
        startY: number,
        tableWidth: number,
        tableLeft: number
      ) => {
        if (interviews.length === 0) return startY

        const baseRowHeight = 16
        const colWidth = (tableWidth - 150) / interviews.length // Eerste kolom 150px, rest verdeeld
        const headerHeight = 32
        let y = startY

        // Teken header
        page.drawRectangle({
          x: tableLeft,
          y: y - headerHeight,
          width: tableWidth,
          height: headerHeight,
          color: rgb(0.9, 0.9, 0.9),
        })

        // Header tekst
        page.drawText("1.7 Manning", {
          x: tableLeft + 5,
          y: y - headerHeight / 2 - 5,
          size: fontSize + 1,
          font: helveticaBoldFont,
        })

        // Kolom headers (namen)
        let x = tableLeft + 150
        interviews.forEach((i) => {
          page.drawText(i.person_name || "Onbekend", {
            x: x + 2,
            y: y - headerHeight / 2 - 5,
            size: fontSize - 1,
            font: helveticaBoldFont,
            maxWidth: colWidth - 4,
          })
          if (i.role) {
            page.drawText(i.role, {
              x: x + 2,
              y: y - headerHeight / 2 - 15,
              size: fontSize - 2,
              font: helveticaFont,
              maxWidth: colWidth - 4,
            })
          }
          x += colWidth
        })

        y -= headerHeight

        // Teken tabel rijen
        const rows = [
          { label: "Rank / functie", getValue: (i: any) => i.role || "-" },
          { label: "Rhine patent", getValue: (i: any) => i.rhine_patent || "-" },
          { label: "Sailing licence", getValue: (i: any) => i.sailing_licence || "-" },
          { label: "Radar license", getValue: (i: any) => i.radar_license || "-" },
          { label: "VHF-Certificate", getValue: (i: any) => i.vhf_certificate || "-" },
          { label: "ADN Basic", getValue: (i: any) => i.adn_basic || "-" },
          { label: "ADN-C", getValue: (i: any) => i.adn_c || "-" },
          {
            label: "Experience on this barge / voyage",
            getValue: (i: any) => i.experience || "-",
          },
          {
            label: "Experience in tank barges",
            getValue: (i: any) => i.tank_barge_experience || "-",
          },
          {
            label: "Hours rest before coming on watch",
            getValue: (i: any) => i.rest_hours || "-",
          },
          {
            label: "Hours work before incident (48h)",
            getValue: (i: any) => i.work_hours_48h || "-",
          },
        ]

        rows.forEach((row) => {
          // Bepaal benodigde hoogte op basis van aantal regels (wrap per cel)
          const labelLines = splitTextIntoLines(
            row.label,
            140,
            helveticaBoldFont,
            fontSize - 1
          )
          let maxLines = labelLines.length

          const valueLinesPerInterview: string[][] = []
          interviews.forEach((i) => {
            const value = row.getValue(i)
            const lines = splitTextIntoLines(
              String(value),
              colWidth - 4,
              helveticaFont,
              fontSize - 1
            )
            valueLinesPerInterview.push(lines)
            if (lines.length > maxLines) maxLines = lines.length
          })

          const rowHeight = baseRowHeight * Math.max(1, maxLines)

          // Teken border
          page.drawRectangle({
            x: tableLeft,
            y: y - rowHeight,
            width: tableWidth,
            height: rowHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.5,
          })

          // Label (meerdere regels indien nodig)
          let labelY = y - 6
          labelLines.forEach((lbl) => {
            page.drawText(lbl, {
              x: tableLeft + 5,
              y: labelY - (fontSize - 1),
              size: fontSize - 1,
              font: helveticaBoldFont,
            })
            labelY -= baseRowHeight
          })

          // Waarden per kolom (meerdere regels per cel)
          let x = tableLeft + 150
          valueLinesPerInterview.forEach((lines, idx) => {
            let cellY = y - 6
            lines.forEach((valLine) => {
              page.drawText(valLine, {
                x: x + 2,
                y: cellY - (fontSize - 1),
                size: fontSize - 1,
                font: helveticaFont,
              })
              cellY -= baseRowHeight
            })
            x += colWidth
          })

          y -= rowHeight
        })

        return y
      }

      // Helper functie om foto te embedden
      const embedImage = async (imageUrl: string) => {
        try {
          const response = await fetch(imageUrl)
          const imageBytes = await response.arrayBuffer()
          const image = await pdfDoc.embedJpg(imageBytes).catch(() => null)
          if (!image) {
            // Probeer PNG als JPG faalt
            return await pdfDoc.embedPng(imageBytes).catch(() => null)
          }
          return image
        } catch (error) {
          console.error("Error embedding image:", error)
          return null
        }
      }

      for (const line of textLines) {
        // Check of we een nieuwe pagina nodig hebben
        if (currentY < marginBottom) {
          moveToNextPage()
        }

        // Check voor Manning tabel marker
        if (line.trim() === "__MANNING_TABLE__") {
          currentY -= sectionSpacing
          const tableWidth = maxWidth
          const tableLeft = marginLeft
          currentY = drawManningTable(currentPage, currentY, tableWidth, tableLeft)
          currentY -= sectionSpacing
          continue
        }

        // Check voor attachment image marker
        const imageMatch = line.match(/^__ATTACHMENT_IMAGE__([^_]+)__(.+?)__$/)
        if (imageMatch) {
          const attachmentId = imageMatch[1]
          const fileName = imageMatch[2]
          const attachment = attachments.find((a) => a.id === attachmentId)

          if (attachment && attachment.file_url) {
            currentY -= sectionSpacing
            const image = await embedImage(attachment.file_url)
            if (image) {
              // Bereken afmetingen (max breedte 400px, behoud aspect ratio)
              const maxImageWidth = 400
              const maxImageHeight = 300
              const imageDims = image.scale(1)
              let imageWidth = imageDims.width
              let imageHeight = imageDims.height

              if (imageWidth > maxImageWidth) {
                const scale = maxImageWidth / imageWidth
                imageWidth = maxImageWidth
                imageHeight = imageHeight * scale
              }
              if (imageHeight > maxImageHeight) {
                const scale = maxImageHeight / imageHeight
                imageHeight = maxImageHeight
                imageWidth = imageWidth * scale
              }

              // Check of we een nieuwe pagina nodig hebben voor de foto
              if (currentY - imageHeight < marginBottom) {
                moveToNextPage()
              }

              // Teken de foto
              currentPage.drawImage(image, {
                x: marginLeft,
                y: currentY - imageHeight,
                width: imageWidth,
                height: imageHeight,
              })

              // Teken bestandsnaam onder de foto
              currentY -= imageHeight + 10
              currentPage.drawText(fileName, {
                x: marginLeft,
                y: currentY,
                size: fontSize - 1,
                font: helveticaFont,
                color: rgb(0.5, 0.5, 0.5),
              })
              currentY -= lineHeight
            } else {
              // Als embedden faalt, toon alleen bestandsnaam
              currentPage.drawText(`${fileName} (foto kon niet worden geladen)`, {
                x: marginLeft,
                y: currentY,
                size: fontSize,
                font: helveticaFont,
              })
              currentY -= lineHeight
            }
            currentY -= sectionSpacing
          }
          continue
        }

        // Check of het een kopje is (ALL CAPS of nummering)
        const isHeading =
          line.match(/^\d+\.\d*\s+[A-Z]/) ||
          (line === line.toUpperCase() && line.length > 0 && line.length < 100)

        // Extra ruimte voor nieuwe sectie (na lege regel + kopje)
        if (isHeading && previousWasEmpty) {
          currentY -= sectionSpacing
        }

        // Skip lege regels maar onthoud ze voor spacing
        if (line.trim() === "") {
          previousWasEmpty = true
          if (!previousWasHeading) {
            currentY -= lineHeight * 0.5
          }
          continue
        }

        const font = isHeading ? helveticaBoldFont : helveticaFont
        const lineFontSize = isHeading ? fontSize + 2 : fontSize
        const lineLineHeight = lineFontSize * 1.3

        // Split lange regels
        const lines = splitTextIntoLines(line, maxWidth, font, lineFontSize)

        for (const splitLine of lines) {
          if (currentY < marginBottom) {
            moveToNextPage()
          }

          currentPage.drawText(splitLine, {
            x: marginLeft,
            y: currentY,
            size: lineFontSize,
            font: font,
            color: rgb(0, 0, 0),
          })

          currentY -= lineLineHeight
        }

        // Extra ruimte na kopjes
        if (isHeading) {
          currentY -= lineLineHeight * 0.8
          previousWasHeading = true
        } else {
          previousWasHeading = false
        }
        previousWasEmpty = false
      }

      // Sla het PDF op
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Incidentrapport_${currentReport.title || "rapport"}_${format(new Date(), "yyyy-MM-dd")}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error("Error generating PDF:", error)
      alert(`Fout bij genereren PDF: ${error?.message || "Onbekende fout"}`)
    }
  }

  const applyReportToForm = (report: any) => {
    setBasisForm({
      title: report.title || "",
      relatedIncidentId: report.related_incident_id || "",
      incidentType: report.incident_type || "",
      internalShipId: report.internal_ship_id || "",
      externalShipName: report.external_ship_name || "",
      internalCompany: report.internal_company || "Bamalite S.A.",
      externalCompany: report.external_company || "",
      incidentDate: report.incident_date || format(new Date(), "yyyy-MM-dd"),
      incidentTime: report.incident_time || "",
      locationDescription: report.location_description || "",
      locationGps: report.location_gps || "",
      loaded:
        report.loaded === null || report.loaded === undefined
          ? ""
          : report.loaded
          ? "geladen"
          : "leeg",
      product: report.product || "",
      quantity: report.quantity != null ? String(report.quantity) : "",
      voyageFrom: report.voyage_from || "",
      voyageTo: report.voyage_to || "",
      departureDate: report.departure_date || "",
      arrivalDate: report.arrival_date || "",
      cargoHazards: report.cargo_hazards || "",
      weatherConditions: report.weather_conditions || "",
      visibility: report.visibility || "",
      waterInfluence: report.water_influence || "",
    })
    setReportId(report.id)
    setSelectedReportId(report.id)
  }

  const resetFormToNew = () => {
    setReportId(null)
    setSelectedReportId(null)
    setBasisForm({
      title: "",
      relatedIncidentId: "",
      incidentType: "",
      internalShipId: "",
      externalShipName: "",
      internalCompany: "Bamalite S.A.",
      externalCompany: "",
      incidentDate: format(new Date(), "yyyy-MM-dd"),
      incidentTime: "",
      locationDescription: "",
      locationGps: "",
      loaded: "" as "" | "geladen" | "leeg",
      product: "",
      quantity: "",
      voyageFrom: "",
      voyageTo: "",
      departureDate: "",
      arrivalDate: "",
      cargoHazards: "",
      weatherConditions: "",
      visibility: "",
      waterInfluence: "",
    })
  }

  const loadReports = async () => {
    try {
      setLoadingReports(true)
      const { data, error } = await supabase
        .from("incident_reports")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setReports(data || [])

      if (!reportId && data && data.length > 0) {
        applyReportToForm(data[0])
      }
    } catch (error) {
      console.error("Error loading incident reports:", error)
    } finally {
      setLoadingReports(false)
    }
  }

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetTimelineForm = () => {
    setTimelineForm({
      id: "",
      phase: "voorfase",
      date: basisForm.incidentDate || format(new Date(), "yyyy-MM-dd"),
      time: "",
      title: "",
      description: "",
      involved: "",
      decision: "",
      reactionTime: "",
    })
  }

  const loadTimeline = async (reportIdToLoad: string) => {
    try {
      setLoadingTimeline(true)
      const { data, error } = await supabase
        .from("incident_timeline_events")
        .select("*")
        .eq("report_id", reportIdToLoad)
        .order("event_time", { ascending: true })

      if (error) throw error

      setTimelineEvents(data || [])
    } catch (error) {
      console.error("Error loading incident timeline events:", error)
      setTimelineEvents([])
    } finally {
      setLoadingTimeline(false)
    }
  }

  const resetInterviewForm = () => {
    setInterviewForm({
      id: "",
      personName: "",
      role: "",
      experience: "",
      rhinePatent: "",
      sailingLicence: "",
      radarLicense: "",
      vhfCertificate: "",
      adnBasic: "",
      adnC: "",
      tankBargeExperience: "",
      restHours: "",
      workHours48h: "",
      stressFactors: "",
      distractionFactors: "",
      freeStatement: "",
      observations: "",
      actions: "",
      decisions: "",
      expectations: "",
      deviations: "",
      procedureExists: "",
      procedureFollowed: "",
      procedureReason: "",
    })
  }

  const loadInterviews = async (reportIdToLoad: string) => {
    try {
      setLoadingInterviews(true)
      const { data, error } = await supabase
        .from("incident_interviews")
        .select("*")
        .eq("report_id", reportIdToLoad)
        .order("created_at", { ascending: true })

      if (error) throw error

      setInterviews(data || [])
    } catch (error) {
      console.error("Error loading incident interviews:", error)
      setInterviews([])
    } finally {
      setLoadingInterviews(false)
    }
  }

  const resetParticipantForm = () => {
    setParticipantForm({
      id: "",
      category: "aan_boord",
      name: "",
      role: "",
      company: "",
      directInvolved: "",
      possibleContribution: "",
      notes: "",
    })
  }

  const loadParticipants = async (reportIdToLoad: string) => {
    try {
      setLoadingParticipants(true)
      const { data, error } = await supabase
        .from("incident_participants")
        .select("*")
        .eq("report_id", reportIdToLoad)
        .order("created_at", { ascending: true })

      if (error) throw error

      setParticipants(data || [])
    } catch (error) {
      console.error("Error loading incident participants:", error)
      setParticipants([])
    } finally {
      setLoadingParticipants(false)
    }
  }

  const resetFactForm = () => {
    setFactForm({
      id: "",
      category: "mens",
      description: "",
      source: "",
      certainty: "zeker",
    })
  }

  const loadFacts = async (reportIdToLoad: string) => {
    try {
      setLoadingFacts(true)
      const { data, error } = await supabase
        .from("incident_facts")
        .select("*")
        .eq("report_id", reportIdToLoad)
        .order("created_at", { ascending: true })

      if (error) throw error

      setFacts(data || [])
    } catch (error) {
      console.error("Error loading incident facts:", error)
      setFacts([])
    } finally {
      setLoadingFacts(false)
    }
  }

  const loadAnalysis = async (reportIdToLoad: string) => {
    try {
      setLoadingAnalysis(true)
      const { data, error } = await supabase
        .from("incident_analysis")
        .select("*")
        .eq("report_id", reportIdToLoad)
        .order("created_at", { ascending: true })

      if (error) throw error

      setAnalysisItems(data || [])
    } catch (error) {
      console.error("Error loading incident analysis:", error)
      setAnalysisItems([])
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const resetAnalysisForm = () => {
    setAnalysisForm({
      id: "",
      analysisType: "directe_aanleiding",
      category: "",
      description: "",
      barrierPresent: "",
      barrierWorked: "",
    })
    setSelectedAnalysis(null)
  }

  const loadActions = async (reportIdToLoad: string) => {
    try {
      setLoadingActions(true)
      const { data, error } = await supabase
        .from("incident_actions")
        .select("*")
        .eq("report_id", reportIdToLoad)
        .order("created_at", { ascending: true })

      if (error) throw error

      setActions(data || [])
    } catch (error) {
      console.error("Error loading incident actions:", error)
      setActions([])
    } finally {
      setLoadingActions(false)
    }
  }

  const resetActionForm = () => {
    setActionForm({
      id: "",
      relatedAnalysisId: "",
      description: "",
      responsible: "",
      deadline: "",
      status: "open",
      notes: "",
    })
    setSelectedAction(null)
  }

  const loadLessons = async (reportIdToLoad: string) => {
    try {
      setLoadingLessons(true)
      const { data, error } = await supabase
        .from("incident_lessons_learned")
        .select("*")
        .eq("report_id", reportIdToLoad)
        .order("created_at", { ascending: true })

      if (error) throw error

      setLessonsLearned(data || [])
    } catch (error) {
      console.error("Error loading lessons learned:", error)
      setLessonsLearned([])
    } finally {
      setLoadingLessons(false)
    }
  }

  const resetLessonForm = () => {
    setLessonForm({
      id: "",
      category: "operationeel",
      lesson: "",
    })
    setSelectedLesson(null)
  }

  const loadAttachments = async (reportIdToLoad: string) => {
    try {
      setLoadingAttachments(true)
      const { data, error } = await supabase
        .from("incident_attachments")
        .select("*")
        .eq("report_id", reportIdToLoad)
        .order("created_at", { ascending: false })

      if (error) throw error

      setAttachments(data || [])
    } catch (error) {
      console.error("Error loading attachments:", error)
      setAttachments([])
    } finally {
      setLoadingAttachments(false)
    }
  }

  const resetAttachmentForm = () => {
    setAttachmentForm({
      id: "",
      attachmentType: "foto",
      description: "",
      attachmentDate: "",
      linkedToTimelineEventId: "",
      linkedToFactId: "",
      linkedToInterviewId: "",
      linkedToActionId: "",
      file: null,
    })
    setSelectedAttachment(null)
  }

  useEffect(() => {
    if (reportId) {
      loadTimeline(reportId)
      resetTimelineForm()
      loadInterviews(reportId)
      loadParticipants(reportId)
      loadFacts(reportId)
      loadAnalysis(reportId)
      loadActions(reportId)
      loadLessons(reportId)
      loadAttachments(reportId)
    } else {
      setTimelineEvents([])
      resetTimelineForm()
      setInterviews([])
      resetInterviewForm()
      setParticipants([])
      resetParticipantForm()
      setFacts([])
      resetFactForm()
      setAnalysisItems([])
      resetAnalysisForm()
      setActions([])
      resetActionForm()
      setLessonsLearned([])
      resetLessonForm()
      setAttachments([])
      resetAttachmentForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  const currentReport = reportId
    ? reports.find((r: any) => r.id === reportId) || null
    : null

  const handleSaveBasis = async () => {
    if (!basisForm.title.trim()) {
      alert("Titel is verplicht")
      return
    }

    setSavingBasis(true)
    try {
      const payload: any = {
        title: basisForm.title.trim(),
        incident_number: null,
        incident_type: basisForm.incidentType || null,
        related_incident_id: basisForm.relatedIncidentId || null,
        internal_ship_id: basisForm.internalShipId || null,
        external_ship_name: basisForm.externalShipName || null,
        internal_company: basisForm.internalCompany || null,
        external_company: basisForm.externalCompany || null,
        incident_date: basisForm.incidentDate || null,
        incident_time: basisForm.incidentTime || null,
        location_description: basisForm.locationDescription || null,
        location_gps: basisForm.locationGps || null,
        loaded:
          basisForm.loaded === ""
            ? null
            : basisForm.loaded === "geladen"
            ? true
            : false,
        product: basisForm.product || null,
        quantity: basisForm.quantity ? Number(basisForm.quantity) : null,
        voyage_from: basisForm.voyageFrom || null,
        voyage_to: basisForm.voyageTo || null,
        departure_date: basisForm.departureDate || null,
        arrival_date: basisForm.arrivalDate || null,
        cargo_hazards: basisForm.cargoHazards || null,
        weather_conditions: basisForm.weatherConditions || null,
        visibility: basisForm.visibility || null,
        water_influence: basisForm.waterInfluence || null,
      }

      if (reportId) {
        const { error } = await supabase
          .from("incident_reports")
          .update(payload)
          .eq("id", reportId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("incident_reports")
          .insert([payload])
          .select("id")
          .single()

        if (error) throw error
        setReportId(data.id)
        setSelectedReportId(data.id)
      }

      await loadReports()
      if (reportId || (payload && payload.id)) {
        const idToLoad = reportId || (payload && (payload.id as string))
        if (idToLoad) {
          await loadTimeline(idToLoad)
        }
      }

      alert("Basis & Reis opgeslagen.")
    } catch (error: any) {
      console.error("Error saving incident report basis:", error)
      alert(
        `Fout bij opslaan basisgegevens: ${
          error?.message || error?.error?.message || "Onbekende fout"
        }`
      )
    } finally {
      setSavingBasis(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-6xl mx-auto py-8 px-4 md:px-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BackButton />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  Incidentenrapport opstellen
                </h1>
                <p className="text-sm text-gray-600">
                  Zelfstandig onderzoeksdossier, los van de standaard
                  incidentenlijst. We bouwen dit stap voor stap uit.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled
            >
              <FileText className="w-4 h-4" />
              Rapport genereren (komt nog)
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Onderzoeksmodules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { id: "basis", label: "Basis & Reis" },
                  { id: "tijdlijn", label: "Tijdlijn" },
                  { id: "interviews", label: "Interviews" },
                  { id: "betrokkenen", label: "Betrokkenen" },
                  { id: "feiten", label: "Feiten & Omstandigheden" },
                  { id: "analyse", label: "Analyse" },
                  { id: "acties", label: "Acties" },
                  { id: "lessons", label: "Lessons Learned" },
                  { id: "bijlagen", label: "Bijlagen" },
                  { id: "rapport", label: "Rapport Preview" },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id as TabId)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              {activeTab === "basis" && (
                <div className="space-y-4 text-sm text-gray-700">
                  <p>
                    Vul hier de basisinformatie en reisgegevens van het incident
                    in. Dit is de fundering van het hele incidentenrapport.
                  </p>

                  {/* Overzicht van bestaande dossiers */}
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="md:w-1/3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">
                          Bestaande dossiers
                        </span>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={resetFormToNew}
                        >
                          Nieuw dossier
                        </Button>
                      </div>
                      <div className="border rounded-md bg-white max-h-64 overflow-y-auto">
                        {loadingReports ? (
                          <div className="p-3 text-xs text-gray-500">
                            Dossiers laden...
                          </div>
                        ) : reports.length === 0 ? (
                          <div className="p-3 text-xs text-gray-500">
                            Nog geen incidentrapporten opgeslagen.
                          </div>
                        ) : (
                          <ul className="divide-y">
                            {reports.map((r: any) => (
                              <li
                                key={r.id}
                                className={`p-2 text-xs cursor-pointer hover:bg-blue-50 ${
                                  selectedReportId === r.id
                                    ? "bg-blue-100 border-l-2 border-blue-500"
                                    : ""
                                }`}
                                onClick={() => applyReportToForm(r)}
                              >
                                <div className="font-semibold text-gray-800 truncate">
                                  {r.title || "Zonder titel"}
                                </div>
                                <div className="text-[11px] text-gray-500 flex justify-between">
                                  <span>
                                    {r.incident_date
                                      ? format(
                                          new Date(r.incident_date),
                                          "d MMM yyyy",
                                          { locale: nl }
                                        )
                                      : "Datum onbekend"}
                                  </span>
                                  <span>{r.status || "basis"}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="md:flex-1">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="basis-title">Titel *</Label>
                      <Input
                        id="basis-title"
                        value={basisForm.title}
                        onChange={(e) =>
                          setBasisForm((f) => ({ ...f, title: e.target.value }))
                        }
                        placeholder="Bijv. Aanvaring bij Duisburg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-related">Koppelen aan incident</Label>
                      <Select
                        value={basisForm.relatedIncidentId || "none"}
                        onValueChange={(value) =>
                          setBasisForm((f) => ({
                            ...f,
                            relatedIncidentId: value === "none" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger id="basis-related">
                          <SelectValue placeholder="Geen koppeling" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geen koppeling</SelectItem>
                          {incidents.map((i: any) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-type">Type incident</Label>
                      <Input
                        id="basis-type"
                        value={basisForm.incidentType}
                        onChange={(e) =>
                          setBasisForm((f) => ({ ...f, incidentType: e.target.value }))
                        }
                        placeholder="Bijv. aanvaring, bijna-aanvaring, technische storing, persoonlijke schade..."
                      />
                      <p className="text-xs text-gray-500">
                        Vrij veld: vul zelf in hoe jij het incident typeert.
                      </p>
                    </div>

                    <div className="md:col-span-2 pt-2 mt-2 border-t text-xs font-semibold text-gray-500">
                      Scheepsgegevens
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-date">Incidentdatum</Label>
                      <Input
                        id="basis-date"
                        type="date"
                        value={basisForm.incidentDate}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            incidentDate: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-time">Incidenttijd</Label>
                      <Input
                        id="basis-time"
                        type="time"
                        value={basisForm.incidentTime}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            incidentTime: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-internal-ship">Intern schip</Label>
                      <Select
                        value={basisForm.internalShipId || "none-ship"}
                        onValueChange={(value) =>
                          setBasisForm((f) => ({
                            ...f,
                            internalShipId: value === "none-ship" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger id="basis-internal-ship">
                          <SelectValue placeholder="Geen intern schip" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none-ship">Geen intern schip</SelectItem>
                          {ships.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-external-ship">Extern schip</Label>
                      <Input
                        id="basis-external-ship"
                        value={basisForm.externalShipName}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            externalShipName: e.target.value,
                          }))
                        }
                        placeholder="Naam extern schip"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-internal-company">Intern bedrijf</Label>
                      <Input
                        id="basis-internal-company"
                        value={basisForm.internalCompany}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            internalCompany: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-external-company">Extern bedrijf</Label>
                      <Input
                        id="basis-external-company"
                        value={basisForm.externalCompany}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            externalCompany: e.target.value,
                          }))
                        }
                        placeholder="Naam extern bedrijf"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="basis-location-desc">Locatie (omschrijving)</Label>
                      <Input
                        id="basis-location-desc"
                        value={basisForm.locationDescription}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            locationDescription: e.target.value,
                          }))
                        }
                        placeholder="Bijv. km 768 Waal, stuurboordwal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-location-gps">Locatie (GPS)</Label>
                      <Input
                        id="basis-location-gps"
                        value={basisForm.locationGps}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            locationGps: e.target.value,
                          }))
                        }
                        placeholder="Bijv. 51.1234 N, 5.6789 E"
                      />
                    </div>

                    <div className="md:col-span-2 pt-2 mt-2 border-t text-xs font-semibold text-gray-500">
                      Ladinggegevens
                    </div>

                    <div className="space-y-2">
                      <Label>Belading</Label>
                      <Select
                        value={basisForm.loaded || "none-loaded"}
                        onValueChange={(value: "geladen" | "leeg" | "none-loaded") =>
                          setBasisForm((f) => ({
                            ...f,
                            loaded: value === "none-loaded" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Niet opgegeven" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none-loaded">Niet opgegeven</SelectItem>
                          <SelectItem value="geladen">Geladen</SelectItem>
                          <SelectItem value="leeg">Leeg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-product">Product</Label>
                      <Input
                        id="basis-product"
                        value={basisForm.product}
                        onChange={(e) =>
                          setBasisForm((f) => ({ ...f, product: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-hazards">Gevaren</Label>
                      <Textarea
                        id="basis-hazards"
                        rows={2}
                        value={basisForm.cargoHazards}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            cargoHazards: e.target.value,
                          }))
                        }
                        placeholder="Bijv. ADR-klasse, giftig, corrosief, ontvlambaar, milieugevaarlijk"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-quantity">Hoeveelheid (ton)</Label>
                      <Input
                        id="basis-quantity"
                        type="number"
                        step="0.1"
                        value={basisForm.quantity}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            quantity: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="md:col-span-2 pt-2 mt-2 border-t text-xs font-semibold text-gray-500">
                      Reisgegevens
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-from">Reis van</Label>
                      <Input
                        id="basis-from"
                        value={basisForm.voyageFrom}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            voyageFrom: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-to">Reis naar</Label>
                      <Input
                        id="basis-to"
                        value={basisForm.voyageTo}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            voyageTo: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-departure">Datum vertrek</Label>
                      <Input
                        id="basis-departure"
                        type="date"
                        value={basisForm.departureDate}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            departureDate: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-arrival">Datum aankomst</Label>
                      <Input
                        id="basis-arrival"
                        type="date"
                        value={basisForm.arrivalDate}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            arrivalDate: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="md:col-span-2 pt-2 mt-2 border-t text-xs font-semibold text-gray-500">
                      Weer &amp; omstandigheden
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-weather">Weersomstandigheden</Label>
                      <Textarea
                        id="basis-weather"
                        rows={2}
                        value={basisForm.weatherConditions}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            weatherConditions: e.target.value,
                          }))
                        }
                        placeholder="Bijv. bewolkt, regen, windkracht 5 Bft uit ZW"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-visibility">Zichtbaarheid</Label>
                      <Input
                        id="basis-visibility"
                        value={basisForm.visibility}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            visibility: e.target.value,
                          }))
                        }
                        placeholder="Bijv. goed (~4 km), matig, slecht (mist)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basis-water">Invloed water / stroming</Label>
                      <Textarea
                        id="basis-water"
                        rows={2}
                        value={basisForm.waterInfluence}
                        onChange={(e) =>
                          setBasisForm((f) => ({
                            ...f,
                            waterInfluence: e.target.value,
                          }))
                        }
                        placeholder="Bijv. sterke afvaartstroming, hoogwater, golfslag van passerende schepen"
                      />
                    </div>

                    {/* Beschrijving komt later in aparte analyse/omschrijving-sectie.
                        We koppelen deze niet automatisch aan locatie, om verwarring te voorkomen. */}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-500">
                      {reportId
                        ? `Dossier ID: ${reportId}`
                        : "Dossier is nog niet opgeslagen."}
                    </div>
                    <Button
                      onClick={handleSaveBasis}
                      disabled={savingBasis}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {savingBasis ? "Opslaan..." : "Basis & Reis opslaan"}
                    </Button>
                  </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tijdlijn" && (
                <div className="space-y-4 text-sm text-gray-700">
                  {!reportId && (
                    <Card>
                      <CardContent className="py-4 text-sm text-gray-600">
                        Sla eerst <strong>Basis &amp; Reis</strong> op voordat je
                        tijdlijnmomenten toevoegt.
                      </CardContent>
                    </Card>
                  )}

                  {reportId && (
                    <>
                      <p>
                        Bouw hier de tijdlijn van het incident op in logische fasen.
                        Focus op <strong>feiten</strong> en volgorde, niet op de
                        analyse – die komt later.
                      </p>

                      {/* Formulier voor nieuw / te bewerken moment */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {timelineForm.id ? "Moment bewerken" : "Nieuw moment toevoegen"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="tl-phase">Fase</Label>
                              <Select
                                value={timelineForm.phase}
                                onValueChange={(value) =>
                                  setTimelineForm((f) => ({
                                    ...f,
                                    phase: value as "voorfase" | "direct_vooraf" | "incident" | "na_incident",
                                  }))
                                }
                              >
                                <SelectTrigger id="tl-phase">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="voorfase">Voorfase (&gt;24 uur)</SelectItem>
                                  <SelectItem value="direct_vooraf">Direct voorafgaand (1–2 uur)</SelectItem>
                                  <SelectItem value="incident">Incidentmoment</SelectItem>
                                  <SelectItem value="na_incident">Eerste 60 minuten erna</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="tl-date">Datum</Label>
                              <Input
                                id="tl-date"
                                type="date"
                                value={timelineForm.date}
                                onChange={(e) =>
                                  setTimelineForm((f) => ({ ...f, date: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="tl-time">Tijd</Label>
                              <Input
                                id="tl-time"
                                type="time"
                                value={timelineForm.time}
                                onChange={(e) =>
                                  setTimelineForm((f) => ({ ...f, time: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="tl-title">Korte omschrijving</Label>
                            <Input
                              id="tl-title"
                              value={timelineForm.title}
                              onChange={(e) =>
                                setTimelineForm((f) => ({ ...f, title: e.target.value }))
                              }
                              placeholder="Bijv. Wachtoverdracht tussen ploeg A en B"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="tl-desc">Beschrijving</Label>
                            <Textarea
                              id="tl-desc"
                              rows={3}
                              value={timelineForm.description}
                              onChange={(e) =>
                                setTimelineForm((f) => ({
                                  ...f,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Feitelijke beschrijving van wat er gebeurde, zonder analyse."
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="tl-involved">Betrokkenen</Label>
                              <Input
                                id="tl-involved"
                                value={timelineForm.involved}
                                onChange={(e) =>
                                  setTimelineForm((f) => ({
                                    ...f,
                                    involved: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. kapitein, stuurman, matroos"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="tl-decision">Besluitvorming</Label>
                              <Input
                                id="tl-decision"
                                value={timelineForm.decision}
                                onChange={(e) =>
                                  setTimelineForm((f) => ({
                                    ...f,
                                    decision: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. besluit om snelheid te verlagen"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="tl-reaction">Reactietijd</Label>
                              <Input
                                id="tl-reaction"
                                value={timelineForm.reactionTime}
                                onChange={(e) =>
                                  setTimelineForm((f) => ({
                                    ...f,
                                    reactionTime: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. ± 2 minuten"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetTimelineForm}
                            >
                              Leeg formulier
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={async () => {
                                if (!timelineForm.title.trim()) {
                                  alert("Titel is verplicht voor een tijdlijnevent.")
                                  return
                                }
                                try {
                                  const datePart =
                                    timelineForm.date ||
                                    basisForm.incidentDate ||
                                    format(new Date(), "yyyy-MM-dd")
                                  const timePart = timelineForm.time || "00:00"
                                  const eventTime = new Date(
                                    `${datePart}T${timePart}:00`
                                  ).toISOString()

                                  const payload: any = {
                                    report_id: reportId,
                                    phase: timelineForm.phase,
                                    event_time: eventTime,
                                    title: timelineForm.title.trim(),
                                    description:
                                      timelineForm.description.trim() || null,
                                    involved_persons:
                                      timelineForm.involved.trim() || null,
                                    decision: timelineForm.decision.trim() || null,
                                    reaction_time:
                                      timelineForm.reactionTime.trim() || null,
                                  }

                                  if (timelineForm.id) {
                                    const { error } = await supabase
                                      .from("incident_timeline_events")
                                      .update(payload)
                                      .eq("id", timelineForm.id)

                                    if (error) throw error
                                  } else {
                                    const { error } = await supabase
                                      .from("incident_timeline_events")
                                      .insert([payload])

                                    if (error) throw error
                                  }

                                  await loadTimeline(reportId)
                                  resetTimelineForm()
                                } catch (error: any) {
                                  console.error(
                                    "Error saving timeline event:",
                                    error
                                  )
                                  alert(
                                    `Fout bij opslaan tijdlijnevent: ${
                                      error?.message ||
                                      error?.error?.message ||
                                      "Onbekende fout"
                                    }`
                                  )
                                }
                              }}
                            >
                              {timelineForm.id ? "Moment bijwerken" : "Moment opslaan"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Overzicht van momenten per fase */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                        {/* Voorfase */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Voorfase (&gt;24 uur vooraf)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {loadingTimeline ? (
                              <p className="text-gray-500 text-xs">Tijdlijn laden...</p>
                            ) : (
                              timelineEvents
                                .filter((e) => e.phase === "voorfase")
                                .map((e) => (
                                  <TimelineEventCard
                                    key={e.id}
                                    event={e}
                                    onEdit={() => {
                                      const d = e.event_time
                                        ? new Date(e.event_time)
                                        : new Date()
                                      setTimelineForm({
                                        id: e.id,
                                        phase: e.phase,
                                        date: format(d, "yyyy-MM-dd"),
                                        time: format(d, "HH:mm"),
                                        title: e.title || "",
                                        description: e.description || "",
                                        involved: e.involved_persons || "",
                                        decision: e.decision || "",
                                        reactionTime: e.reaction_time || "",
                                      })
                                    }}
                                    onDelete={async () => {
                                      if (
                                        !confirm(
                                          "Weet je zeker dat je dit moment wilt verwijderen?"
                                        )
                                      )
                                        return
                                      try {
                                        const { error } = await supabase
                                          .from("incident_timeline_events")
                                          .delete()
                                          .eq("id", e.id)

                                        if (error) throw error
                                        await loadTimeline(reportId)
                                      } catch (error: any) {
                                        console.error(
                                          "Error deleting timeline event:",
                                          error
                                        )
                                        alert(
                                          `Fout bij verwijderen tijdlijnevent: ${
                                            error?.message ||
                                            error?.error?.message ||
                                            "Onbekende fout"
                                          }`
                                        )
                                      }
                                    }}
                                  />
                                ))
                            )}
                          </CardContent>
                        </Card>

                        {/* Direct voorafgaand */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Direct voorafgaand (1–2 uur)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {loadingTimeline ? (
                              <p className="text-gray-500 text-xs">Tijdlijn laden...</p>
                            ) : (
                              timelineEvents
                                .filter((e) => e.phase === "direct_vooraf")
                                .map((e) => (
                                  <TimelineEventCard
                                    key={e.id}
                                    event={e}
                                    onEdit={() => {
                                      const d = e.event_time
                                        ? new Date(e.event_time)
                                        : new Date()
                                      setTimelineForm({
                                        id: e.id,
                                        phase: e.phase,
                                        date: format(d, "yyyy-MM-dd"),
                                        time: format(d, "HH:mm"),
                                        title: e.title || "",
                                        description: e.description || "",
                                        involved: e.involved_persons || "",
                                        decision: e.decision || "",
                                        reactionTime: e.reaction_time || "",
                                      })
                                    }}
                                    onDelete={async () => {
                                      if (
                                        !confirm(
                                          "Weet je zeker dat je dit moment wilt verwijderen?"
                                        )
                                      )
                                        return
                                      try {
                                        const { error } = await supabase
                                          .from("incident_timeline_events")
                                          .delete()
                                          .eq("id", e.id)

                                        if (error) throw error
                                        await loadTimeline(reportId)
                                      } catch (error: any) {
                                        console.error(
                                          "Error deleting timeline event:",
                                          error
                                        )
                                        alert(
                                          `Fout bij verwijderen tijdlijnevent: ${
                                            error?.message ||
                                            error?.error?.message ||
                                            "Onbekende fout"
                                          }`
                                        )
                                      }
                                    }}
                                  />
                                ))
                            )}
                          </CardContent>
                        </Card>

                        {/* Incidentmoment */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Incidentmoment
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {loadingTimeline ? (
                              <p className="text-gray-500 text-xs">Tijdlijn laden...</p>
                            ) : (
                              timelineEvents
                                .filter((e) => e.phase === "incident")
                                .map((e) => (
                                  <TimelineEventCard
                                    key={e.id}
                                    event={e}
                                    onEdit={() => {
                                      const d = e.event_time
                                        ? new Date(e.event_time)
                                        : new Date()
                                      setTimelineForm({
                                        id: e.id,
                                        phase: e.phase,
                                        date: format(d, "yyyy-MM-dd"),
                                        time: format(d, "HH:mm"),
                                        title: e.title || "",
                                        description: e.description || "",
                                        involved: e.involved_persons || "",
                                        decision: e.decision || "",
                                        reactionTime: e.reaction_time || "",
                                      })
                                    }}
                                    onDelete={async () => {
                                      if (
                                        !confirm(
                                          "Weet je zeker dat je dit moment wilt verwijderen?"
                                        )
                                      )
                                        return
                                      try {
                                        const { error } = await supabase
                                          .from("incident_timeline_events")
                                          .delete()
                                          .eq("id", e.id)

                                        if (error) throw error
                                        await loadTimeline(reportId)
                                      } catch (error: any) {
                                        console.error(
                                          "Error deleting timeline event:",
                                          error
                                        )
                                        alert(
                                          `Fout bij verwijderen tijdlijnevent: ${
                                            error?.message ||
                                            error?.error?.message ||
                                            "Onbekende fout"
                                          }`
                                        )
                                      }
                                    }}
                                  />
                                ))
                            )}
                          </CardContent>
                        </Card>

                        {/* Eerste 60 minuten erna */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Eerste 60 minuten erna
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {loadingTimeline ? (
                              <p className="text-gray-500 text-xs">Tijdlijn laden...</p>
                            ) : (
                              timelineEvents
                                .filter((e) => e.phase === "na_incident")
                                .map((e) => (
                                  <TimelineEventCard
                                    key={e.id}
                                    event={e}
                                    onEdit={() => {
                                      const d = e.event_time
                                        ? new Date(e.event_time)
                                        : new Date()
                                      setTimelineForm({
                                        id: e.id,
                                        phase: e.phase,
                                        date: format(d, "yyyy-MM-dd"),
                                        time: format(d, "HH:mm"),
                                        title: e.title || "",
                                        description: e.description || "",
                                        involved: e.involved_persons || "",
                                        decision: e.decision || "",
                                        reactionTime: e.reaction_time || "",
                                      })
                                    }}
                                    onDelete={async () => {
                                      if (
                                        !confirm(
                                          "Weet je zeker dat je dit moment wilt verwijderen?"
                                        )
                                      )
                                        return
                                      try {
                                        const { error } = await supabase
                                          .from("incident_timeline_events")
                                          .delete()
                                          .eq("id", e.id)

                                        if (error) throw error
                                        await loadTimeline(reportId)
                                      } catch (error: any) {
                                        console.error(
                                          "Error deleting timeline event:",
                                          error
                                        )
                                        alert(
                                          `Fout bij verwijderen tijdlijnevent: ${
                                            error?.message ||
                                            error?.error?.message ||
                                            "Onbekende fout"
                                          }`
                                        )
                                      }
                                    }}
                                  />
                                ))
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "interviews" && (
                <div className="space-y-4 text-sm text-gray-700">
                  {!reportId && (
                    <Card>
                      <CardContent className="py-4 text-sm text-gray-600">
                        Sla eerst <strong>Basis &amp; Reis</strong> op voordat je
                        interviews toevoegt.
                      </CardContent>
                    </Card>
                  )}

                  {reportId && (
                    <>
                      <p>
                        Per betrokken persoon maak je hier een compleet interview aan
                        met vrije verklaring en verdiepingsvragen. We houden het
                        feitelijk en zonder oordeel.
                      </p>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {interviewForm.id
                              ? "Interview bewerken"
                              : "Nieuw interview toevoegen"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Persoon & functie */}
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor="iv-name">
                                Naam bemanningslid (voor Manning-overzicht)
                              </Label>
                              <Input
                                id="iv-name"
                                value={interviewForm.personName}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    personName: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. Jan Jansen"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="iv-role">
                                Rang / functie tijdens het incident
                              </Label>
                              <Input
                                id="iv-role"
                                value={interviewForm.role}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    role: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. kapitein, stuurman, matroos"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="iv-experience">
                                Ervaring op dit schip / traject (korte omschrijving)
                              </Label>
                              <Input
                                id="iv-experience"
                                value={interviewForm.experience}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    experience: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. 5 jaar op dit schip / traject"
                              />
                            </div>

                            {/* Certificaten / patenten */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor="iv-rhine">
                                  Rhine patent
                                </Label>
                                <Input
                                  id="iv-rhine"
                                  value={interviewForm.rhinePatent}
                                  onChange={(e) =>
                                    setInterviewForm((f) => ({
                                      ...f,
                                      rhinePatent: e.target.value,
                                    }))
                                  }
                                  placeholder="Bijv. nummer of Y/N"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="iv-sailing">
                                  Sailing licence
                                </Label>
                                <Input
                                  id="iv-sailing"
                                  value={interviewForm.sailingLicence}
                                  onChange={(e) =>
                                    setInterviewForm((f) => ({
                                      ...f,
                                      sailingLicence: e.target.value,
                                    }))
                                  }
                                  placeholder="Bijv. Y / type"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="iv-radar">
                                  Radar license
                                </Label>
                                <Input
                                  id="iv-radar"
                                  value={interviewForm.radarLicense}
                                  onChange={(e) =>
                                    setInterviewForm((f) => ({
                                      ...f,
                                      radarLicense: e.target.value,
                                    }))
                                  }
                                  placeholder="Bijv. Y / type"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="iv-vhf">
                                  VHF-Certificate
                                </Label>
                                <Input
                                  id="iv-vhf"
                                  value={interviewForm.vhfCertificate}
                                  onChange={(e) =>
                                    setInterviewForm((f) => ({
                                      ...f,
                                      vhfCertificate: e.target.value,
                                    }))
                                  }
                                  placeholder="Bijv. Y"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="iv-adn-basic">
                                  ADN Basic
                                </Label>
                                <Input
                                  id="iv-adn-basic"
                                  value={interviewForm.adnBasic}
                                  onChange={(e) =>
                                    setInterviewForm((f) => ({
                                      ...f,
                                      adnBasic: e.target.value,
                                    }))
                                  }
                                  placeholder="Bijv. Y"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="iv-adn-c">
                                  ADN-C
                                </Label>
                                <Input
                                  id="iv-adn-c"
                                  value={interviewForm.adnC}
                                  onChange={(e) =>
                                    setInterviewForm((f) => ({
                                      ...f,
                                      adnC: e.target.value,
                                    }))
                                  }
                                  placeholder="Bijv. Y"
                                />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label htmlFor="iv-tankexp">
                                  Ervaring in de tankvaart
                                </Label>
                                <Input
                                  id="iv-tankexp"
                                  value={interviewForm.tankBargeExperience}
                                  onChange={(e) =>
                                    setInterviewForm((f) => ({
                                      ...f,
                                      tankBargeExperience: e.target.value,
                                    }))
                                  }
                                  placeholder="Bijv. 10 jaar ervaring op tankers"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Belasting & menselijk functioneren */}
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor="iv-rest">
                                Uren aaneengesloten rust in de 24 uur vóór het incident
                              </Label>
                              <Input
                                id="iv-rest"
                                value={interviewForm.restHours}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    restHours: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. 8 uur in laatste 24 uur"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="iv-work48">
                                Uren gewerkt in de 48 uur vóór het incident
                              </Label>
                              <Input
                                id="iv-work48"
                                value={interviewForm.workHours48h}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    workHours48h: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. 22 uur in 48 uur"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="iv-stress">
                                Waren er factoren die voor extra stress of belasting zorgden?
                              </Label>
                              <Input
                                id="iv-stress"
                                value={interviewForm.stressFactors}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    stressFactors: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. tijdsdruk, privé-stress"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor="iv-distraction">
                                Was er sprake van afleiding tijdens het werk (bijv. telefoon, andere taken)?
                              </Label>
                              <Input
                                id="iv-distraction"
                                value={interviewForm.distractionFactors}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    distractionFactors: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. telefoon, andere werkzaamheden"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                              <Label htmlFor="iv-free">
                              Kun je in je eigen woorden stap voor stap beschrijven wat er is gebeurd?
                            </Label>
                            <Textarea
                              id="iv-free"
                              rows={4}
                              value={interviewForm.freeStatement}
                              onChange={(e) =>
                                setInterviewForm((f) => ({
                                  ...f,
                                  freeStatement: e.target.value,
                                }))
                              }
                              placeholder="Laat de betrokkene het incident in eigen woorden beschrijven."
                            />
                          </div>

                          {/* Verloop van het incident vanuit deze persoon */}
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor="iv-observations">
                                Wat heb je precies waargenomen (wat zag, hoorde of merkte je)?
                              </Label>
                              <Textarea
                                id="iv-observations"
                                rows={3}
                                value={interviewForm.observations}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    observations: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="iv-actions">
                                Welke concrete handelingen heb je zelf uitgevoerd (in welke volgorde)?
                              </Label>
                              <Textarea
                                id="iv-actions"
                                rows={3}
                                value={interviewForm.actions}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    actions: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor="iv-decisions">
                                Welke beslissingen zijn er genomen, en door wie?
                              </Label>
                              <Textarea
                                id="iv-decisions"
                                rows={2}
                                value={interviewForm.decisions}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    decisions: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="iv-expect">
                                Waar ging je van uit dat er zou gebeuren toen je deze acties uitvoerde?
                              </Label>
                              <Textarea
                                id="iv-expect"
                                rows={2}
                                value={interviewForm.expectations}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    expectations: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="iv-deviations">
                                Waren er afwijkingen ten opzichte van de normale werkwijze / procedure?
                              </Label>
                              <Textarea
                                id="iv-deviations"
                                rows={2}
                                value={interviewForm.deviations}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    deviations: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          {/* Procedures */}
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label>
                                Bestond er een vaste procedure of werkinstructie voor deze situatie?
                              </Label>
                              <Select
                                value={interviewForm.procedureExists || "onbekend"}
                                onValueChange={(value) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    procedureExists:
                                      value === "onbekend" ? "" : (value as "ja" | "nee"),
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="onbekend">Onbekend</SelectItem>
                                  <SelectItem value="ja">Ja</SelectItem>
                                  <SelectItem value="nee">Nee</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label>
                                Is deze procedure gevolgd tijdens het incident?
                              </Label>
                              <Select
                                value={interviewForm.procedureFollowed || "onbekend"}
                                onValueChange={(value) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    procedureFollowed:
                                      value === "onbekend" ? "" : (value as "ja" | "nee"),
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="onbekend">Onbekend</SelectItem>
                                  <SelectItem value="ja">Ja</SelectItem>
                                  <SelectItem value="nee">Nee</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="iv-proc-reason">
                                Kun je toelichten waarom er is afgeweken van de procedure (indien van toepassing)?
                              </Label>
                              <Textarea
                                id="iv-proc-reason"
                                rows={2}
                                value={interviewForm.procedureReason}
                                onChange={(e) =>
                                  setInterviewForm((f) => ({
                                    ...f,
                                    procedureReason: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetInterviewForm}
                            >
                              Leeg formulier
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={async () => {
                                if (!interviewForm.personName.trim()) {
                                  alert("Naam is verplicht voor een interview.")
                                  return
                                }
                                try {
                                  const payload: any = {
                                    report_id: reportId,
                                    person_name: interviewForm.personName.trim(),
                                    role: interviewForm.role.trim() || null,
                                    experience:
                                      interviewForm.experience.trim() || null,
                                    rhine_patent:
                                      interviewForm.rhinePatent.trim() || null,
                                    sailing_licence:
                                      interviewForm.sailingLicence.trim() || null,
                                    radar_license:
                                      interviewForm.radarLicense.trim() || null,
                                    vhf_certificate:
                                      interviewForm.vhfCertificate.trim() || null,
                                    adn_basic:
                                      interviewForm.adnBasic.trim() || null,
                                    adn_c: interviewForm.adnC.trim() || null,
                                    tank_barge_experience:
                                      interviewForm.tankBargeExperience.trim() ||
                                      null,
                                    rest_hours:
                                      interviewForm.restHours.trim() || null,
                                    work_hours_48h:
                                      interviewForm.workHours48h.trim() || null,
                                    stress_factors:
                                      interviewForm.stressFactors.trim() || null,
                                    distraction_factors:
                                      interviewForm.distractionFactors.trim() ||
                                      null,
                                    free_statement:
                                      interviewForm.freeStatement.trim() || null,
                                    observations:
                                      interviewForm.observations.trim() || null,
                                    actions: interviewForm.actions.trim() || null,
                                    decisions:
                                      interviewForm.decisions.trim() || null,
                                    expectations:
                                      interviewForm.expectations.trim() || null,
                                    deviations:
                                      interviewForm.deviations.trim() || null,
                                    procedure_exists:
                                      interviewForm.procedureExists === ""
                                        ? null
                                        : interviewForm.procedureExists === "ja",
                                    procedure_followed:
                                      interviewForm.procedureFollowed === ""
                                        ? null
                                        : interviewForm.procedureFollowed === "ja",
                                    procedure_not_followed_reason:
                                      interviewForm.procedureReason.trim() || null,
                                  }

                                  if (interviewForm.id) {
                                    const { error } = await supabase
                                      .from("incident_interviews")
                                      .update(payload)
                                      .eq("id", interviewForm.id)

                                    if (error) throw error
                                  } else {
                                    const { error } = await supabase
                                      .from("incident_interviews")
                                      .insert([payload])

                                    if (error) throw error
                                  }

                                  await loadInterviews(reportId)
                                  resetInterviewForm()
                                } catch (error: any) {
                                  console.error("Error saving interview:", error)
                                  alert(
                                    `Fout bij opslaan interview: ${
                                      error?.message ||
                                      error?.error?.message ||
                                      "Onbekende fout"
                                    }`
                                  )
                                }
                              }}
                            >
                              {interviewForm.id
                                ? "Interview bijwerken"
                                : "Interview opslaan"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Overzicht interviews */}
                        <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Interviews betrokkenen
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {loadingInterviews ? (
                            <p className="text-xs text-gray-500">
                              Interviews laden...
                            </p>
                          ) : interviews.length === 0 ? (
                            <p className="text-xs text-gray-500">
                              Nog geen interviews toegevoegd.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {interviews.map((iv: any) => (
                                <li
                                  key={iv.id}
                                  className={`border rounded-md p-2 bg-white space-y-1 cursor-pointer ${
                                    selectedInterview?.id === iv.id
                                      ? "ring-2 ring-blue-500"
                                      : ""
                                  }`}
                                  onClick={() => setSelectedInterview(iv)}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="font-semibold text-xs">
                                        {iv.person_name}{" "}
                                        {iv.role && (
                                          <span className="text-gray-500">
                                            ({iv.role})
                                          </span>
                                        )}
                                      </div>
                                      {iv.experience && (
                                        <div className="text-[11px] text-gray-500">
                                          Ervaring: {iv.experience}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setInterviewForm({
                                            id: iv.id,
                                            personName: iv.person_name || "",
                                            role: iv.role || "",
                                            experience: iv.experience || "",
                                            rhinePatent: iv.rhine_patent || "",
                                            sailingLicence: iv.sailing_licence || "",
                                            radarLicense: iv.radar_license || "",
                                            vhfCertificate: iv.vhf_certificate || "",
                                            adnBasic: iv.adn_basic || "",
                                            adnC: iv.adn_c || "",
                                            tankBargeExperience:
                                              iv.tank_barge_experience || "",
                                            restHours: iv.rest_hours || "",
                                            workHours48h:
                                              iv.work_hours_48h || "",
                                            stressFactors:
                                              iv.stress_factors || "",
                                            distractionFactors:
                                              iv.distraction_factors || "",
                                            freeStatement:
                                              iv.free_statement || "",
                                            observations: iv.observations || "",
                                            actions: iv.actions || "",
                                            decisions: iv.decisions || "",
                                            expectations: iv.expectations || "",
                                            deviations: iv.deviations || "",
                                            procedureExists:
                                              iv.procedure_exists === null ||
                                              iv.procedure_exists ===
                                                undefined
                                                ? ""
                                                : iv.procedure_exists
                                                ? "ja"
                                                : "nee",
                                            procedureFollowed:
                                              iv.procedure_followed === null ||
                                              iv.procedure_followed ===
                                                undefined
                                                ? ""
                                                : iv.procedure_followed
                                                ? "ja"
                                                : "nee",
                                            procedureReason:
                                              iv.procedure_not_followed_reason ||
                                              "",
                                          })
                                        }}
                                      >
                                        Bewerken
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="xs"
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          if (
                                            !confirm(
                                              "Weet je zeker dat je dit interview wilt verwijderen?"
                                            )
                                          )
                                            return
                                          try {
                                            const { error } = await supabase
                                              .from("incident_interviews")
                                              .delete()
                                              .eq("id", iv.id)

                                            if (error) throw error
                                            await loadInterviews(reportId)
                                          } catch (error: any) {
                                            console.error(
                                              "Error deleting interview:",
                                              error
                                            )
                                            alert(
                                              `Fout bij verwijderen interview: ${
                                                error?.message ||
                                                error?.error?.message ||
                                                "Onbekende fout"
                                              }`
                                            )
                                          }
                                        }}
                                      >
                                        Verwijderen
                                      </Button>
                                    </div>
                                  </div>
                                  {iv.free_statement && (
                                    <div className="text-xs text-gray-700 line-clamp-3">
                                      Vrije verklaring: {iv.free_statement}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>

                      {selectedInterview && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              Interviewweergave – {selectedInterview.person_name}
                              {selectedInterview.role && (
                                <span className="ml-1 text-xs text-gray-500">
                                  ({selectedInterview.role})
                                </span>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm text-gray-800">
                            {selectedInterview.experience && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Ervaring
                                </div>
                                <div>{selectedInterview.experience}</div>
                              </div>
                            )}
                            {selectedInterview.rest_hours && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Rust (24 uur vóór incident)
                                </div>
                                <div>{selectedInterview.rest_hours}</div>
                              </div>
                            )}
                            {selectedInterview.work_hours_48h && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Werkuren laatste 48 uur
                                </div>
                                <div>{selectedInterview.work_hours_48h}</div>
                              </div>
                            )}
                            {selectedInterview.stress_factors && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Stress / belasting
                                </div>
                                <div>{selectedInterview.stress_factors}</div>
                              </div>
                            )}
                            {selectedInterview.distraction_factors && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Afleiding
                                </div>
                                <div>{selectedInterview.distraction_factors}</div>
                              </div>
                            )}
                            {selectedInterview.free_statement && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Vrije verklaring
                                </div>
                                <div className="whitespace-pre-wrap">
                                  {selectedInterview.free_statement}
                                </div>
                              </div>
                            )}
                            {selectedInterview.observations && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Waarnemingen
                                </div>
                                <div className="whitespace-pre-wrap">
                                  {selectedInterview.observations}
                                </div>
                              </div>
                            )}
                            {selectedInterview.actions && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Acties
                                </div>
                                <div className="whitespace-pre-wrap">
                                  {selectedInterview.actions}
                                </div>
                              </div>
                            )}
                            {selectedInterview.decisions && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Besluitvorming
                                </div>
                                <div className="whitespace-pre-wrap">
                                  {selectedInterview.decisions}
                                </div>
                              </div>
                            )}
                            {selectedInterview.expectations && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Verwachting
                                </div>
                                <div className="whitespace-pre-wrap">
                                  {selectedInterview.expectations}
                                </div>
                              </div>
                            )}
                            {selectedInterview.deviations && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Afwijkingen t.o.v. normaal / procedure
                                </div>
                                <div className="whitespace-pre-wrap">
                                  {selectedInterview.deviations}
                                </div>
                              </div>
                            )}
                            {(selectedInterview.procedure_exists !== null ||
                              selectedInterview.procedure_followed !== null ||
                              selectedInterview.procedure_not_followed_reason) && (
                              <div className="space-y-1">
                                <div className="font-semibold text-xs text-gray-500">
                                  Procedure
                                </div>
                                <div className="text-xs text-gray-800 space-y-0.5">
                                  {selectedInterview.procedure_exists !== null && (
                                    <div>
                                      Bestond er een procedure?{" "}
                                      <span className="font-semibold">
                                        {selectedInterview.procedure_exists
                                          ? "Ja"
                                          : "Nee"}
                                      </span>
                                    </div>
                                  )}
                                  {selectedInterview.procedure_followed !==
                                    null && (
                                    <div>
                                      Is de procedure gevolgd?{" "}
                                      <span className="font-semibold">
                                        {selectedInterview.procedure_followed
                                          ? "Ja"
                                          : "Nee"}
                                      </span>
                                    </div>
                                  )}
                                  {selectedInterview
                                    .procedure_not_followed_reason && (
                                    <div className="whitespace-pre-wrap">
                                      Toelichting:{" "}
                                      {
                                        selectedInterview.procedure_not_followed_reason
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "betrokkenen" && (
                <div className="space-y-4 text-sm text-gray-700">
                  {!reportId && (
                    <Card>
                      <CardContent className="py-4 text-sm text-gray-600">
                        Sla eerst <strong>Basis &amp; Reis</strong> op voordat je
                        betrokkenen toevoegt.
                      </CardContent>
                    </Card>
                  )}

                  {reportId && (
                    <>
                      <p>
                        Hier leg je vast wie er bij het incident betrokken waren
                        (aan boord en extern). Dit vormt de basis voor interviews,
                        tijdlijn en analyse.
                      </p>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {participantForm.id
                              ? "Betrokkene bewerken"
                              : "Nieuwe betrokkene toevoegen"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label>Type betrokkene</Label>
                              <Select
                                value={participantForm.category}
                                onValueChange={(value) =>
                                  setParticipantForm((f) => ({
                                    ...f,
                                    category: value as "aan_boord" | "extern",
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="aan_boord">
                                    Aan boord (bemanning / opvarenden)
                                  </SelectItem>
                                  <SelectItem value="extern">
                                    Externe partij (bijv. ander schip, walbedrijf)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="pt-name">
                                Wat is de naam van deze betrokkene?
                              </Label>
                              <Input
                                id="pt-name"
                                value={participantForm.name}
                                onChange={(e) =>
                                  setParticipantForm((f) => ({
                                    ...f,
                                    name: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. Jan Jansen of naam extern schip/bedrijf"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="pt-role">
                                Wat was zijn/haar rol / functie tijdens het incident?
                              </Label>
                              <Input
                                id="pt-role"
                                value={participantForm.role}
                                onChange={(e) =>
                                  setParticipantForm((f) => ({
                                    ...f,
                                    role: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. kapitein, stuurman, matroos, VTC-operator"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="pt-company">
                                Bij welk schip / bedrijf hoort deze betrokkene?
                              </Label>
                              <Input
                                id="pt-company"
                                value={participantForm.company}
                                onChange={(e) =>
                                  setParticipantForm((f) => ({
                                    ...f,
                                    company: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. mps Bamalite, rederij X, bedrijf Y"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label>
                                Was deze persoon direct betrokken bij het incident?
                              </Label>
                              <Select
                                value={participantForm.directInvolved || "onbekend"}
                                onValueChange={(value) =>
                                  setParticipantForm((f) => ({
                                    ...f,
                                    directInvolved:
                                      value === "onbekend" ? "" : (value as "ja" | "nee"),
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="onbekend">Onbekend</SelectItem>
                                  <SelectItem value="ja">Ja</SelectItem>
                                  <SelectItem value="nee">Nee</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="pt-contribution">
                                Welke feitelijke handelingen of beslissingen van deze
                                betrokkene zijn relevant voor het ontstaan of verloop
                                van het incident?
                              </Label>
                              <Textarea
                                id="pt-contribution"
                                rows={3}
                                value={participantForm.possibleContribution}
                                onChange={(e) =>
                                  setParticipantForm((f) => ({
                                    ...f,
                                    possibleContribution: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. uitgevoerde manoeuvre, gegeven instructies, communicatie, ingreep om schade te beperken, etc."
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="pt-notes">
                                Opmerkingen over deze betrokkene die relevant zijn voor
                                het onderzoek
                              </Label>
                              <Textarea
                                id="pt-notes"
                                rows={2}
                                value={participantForm.notes}
                                onChange={(e) =>
                                  setParticipantForm((f) => ({
                                    ...f,
                                    notes: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. eerder incident, beperkte ervaring, taalbarrière, medische beperking, etc."
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetParticipantForm}
                            >
                              Leeg formulier
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={async () => {
                                if (!participantForm.name.trim()) {
                                  alert(
                                    "Naam is verplicht voor een betrokkene."
                                  )
                                  return
                                }
                                try {
                                  const payload: any = {
                                    report_id: reportId,
                                    category: participantForm.category,
                                    name: participantForm.name.trim(),
                                    role: participantForm.role.trim() || null,
                                    company:
                                      participantForm.company.trim() || null,
                                    direct_involved:
                                      participantForm.directInvolved === ""
                                        ? null
                                        : participantForm.directInvolved ===
                                          "ja",
                                    possible_contribution:
                                      participantForm.possibleContribution.trim() ||
                                      null,
                                    notes:
                                      participantForm.notes.trim() || null,
                                  }

                                  if (participantForm.id) {
                                    const { error } = await supabase
                                      .from("incident_participants")
                                      .update(payload)
                                      .eq("id", participantForm.id)

                                    if (error) throw error
                                  } else {
                                    const { error } = await supabase
                                      .from("incident_participants")
                                      .insert([payload])

                                    if (error) throw error
                                  }

                                  await loadParticipants(reportId)
                                  resetParticipantForm()
                                } catch (error: any) {
                                  console.error(
                                    "Error saving participant:",
                                    error
                                  )
                                  alert(
                                    `Fout bij opslaan betrokkene: ${
                                      error?.message ||
                                      error?.error?.message ||
                                      "Onbekende fout"
                                    }`
                                  )
                                }
                              }}
                            >
                              {participantForm.id
                                ? "Betrokkene bijwerken"
                                : "Betrokkene opslaan"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Overzicht betrokkenen
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {loadingParticipants ? (
                            <p className="text-xs text-gray-500">
                              Betrokkenen laden...
                            </p>
                          ) : participants.length === 0 ? (
                            <p className="text-xs text-gray-500">
                              Nog geen betrokkenen toegevoegd.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {participants.map((p: any) => (
                                <li
                                  key={p.id}
                                  className={`border rounded-md p-2 bg-white space-y-1 cursor-pointer ${
                                    selectedParticipant?.id === p.id
                                      ? "ring-2 ring-blue-500"
                                      : ""
                                  }`}
                                  onClick={() => setSelectedParticipant(p)}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="font-semibold text-xs">
                                        {p.name}{" "}
                                        {p.role && (
                                          <span className="text-gray-500">
                                            ({p.role})
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-gray-500">
                                        {p.category === "aan_boord"
                                          ? "Aan boord"
                                          : "Extern"}
                                        {p.company && ` – ${p.company}`}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setParticipantForm({
                                            id: p.id,
                                            category: p.category,
                                            name: p.name || "",
                                            role: p.role || "",
                                            company: p.company || "",
                                            directInvolved:
                                              p.direct_involved === null ||
                                              p.direct_involved === undefined
                                                ? ""
                                                : p.direct_involved
                                                ? "ja"
                                                : "nee",
                                            possibleContribution:
                                              p.possible_contribution || "",
                                            notes: p.notes || "",
                                          })
                                        }}
                                      >
                                        Bewerken
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="xs"
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          if (
                                            !confirm(
                                              "Weet je zeker dat je deze betrokkene wilt verwijderen?"
                                            )
                                          )
                                            return
                                          try {
                                            const { error } = await supabase
                                              .from("incident_participants")
                                              .delete()
                                              .eq("id", p.id)

                                            if (error) throw error
                                            await loadParticipants(reportId)
                                            if (
                                              selectedParticipant &&
                                              selectedParticipant.id === p.id
                                            ) {
                                              setSelectedParticipant(null)
                                            }
                                          } catch (error: any) {
                                            console.error(
                                              "Error deleting participant:",
                                              error
                                            )
                                            alert(
                                              `Fout bij verwijderen betrokkene: ${
                                                error?.message ||
                                                error?.error?.message ||
                                                "Onbekende fout"
                                              }`
                                            )
                                          }
                                        }}
                                      >
                                        Verwijderen
                                      </Button>
                                    </div>
                                  </div>
                                  {p.possible_contribution && (
                                    <div className="text-xs text-gray-700 line-clamp-2">
                                      Mogelijke bijdrage:{" "}
                                      {p.possible_contribution}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>

                      {selectedParticipant && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              Betrokkene – {selectedParticipant.name}
                              {selectedParticipant.role && (
                                <span className="ml-1 text-xs text-gray-500">
                                  ({selectedParticipant.role})
                                </span>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm text-gray-800">
                            <div className="text-xs text-gray-500">
                              Type:{" "}
                              <span className="font-semibold">
                                {selectedParticipant.category === "aan_boord"
                                  ? "Aan boord"
                                  : "Extern"}
                              </span>
                            </div>
                            {selectedParticipant.company && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Schip / bedrijf
                                </div>
                                <div>{selectedParticipant.company}</div>
                              </div>
                            )}
                            {selectedParticipant.direct_involved !== null && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Direct betrokken bij incident
                                </div>
                                <div>
                                  {selectedParticipant.direct_involved
                                    ? "Ja"
                                    : "Nee"}
                                </div>
                              </div>
                            )}
                            {selectedParticipant.possible_contribution && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Mogelijke bijdrage aan het incident
                                </div>
                                <div className="whitespace-pre-wrap">
                                  {selectedParticipant.possible_contribution}
                                </div>
                              </div>
                            )}
                            {selectedParticipant.notes && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Opmerkingen
                                </div>
                                <div className="whitespace-pre-wrap">
                                  {selectedParticipant.notes}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "feiten" && (
                <div className="space-y-4 text-sm text-gray-700">
                  {!reportId && (
                    <Card>
                      <CardContent className="py-4 text-sm text-gray-600">
                        Sla eerst <strong>Basis &amp; Reis</strong> op voordat je
                        feiten toevoegt.
                      </CardContent>
                    </Card>
                  )}

                  {reportId && (
                    <>
                      <p>
                        Hier leg je alleen <strong>feiten en omstandigheden</strong> vast,
                        zonder conclusies of meningen. Onzekere feiten kunnen later als
                        open punt gebruikt worden in de analyse.
                      </p>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {factForm.id ? "Feit bewerken" : "Nieuw feit toevoegen"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1">
                            <Label>In welke categorie valt dit feit?</Label>
                            <Select
                              value={factForm.category}
                              onValueChange={(value) =>
                                setFactForm((f) => ({
                                  ...f,
                                  category: value as
                                    | "mens"
                                    | "techniek"
                                    | "omgeving"
                                    | "operationeel"
                                    | "organisatie"
                                    | "extern",
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mens">Mens</SelectItem>
                                <SelectItem value="techniek">Techniek</SelectItem>
                                <SelectItem value="omgeving">Omgeving</SelectItem>
                                <SelectItem value="operationeel">
                                  Operationeel
                                </SelectItem>
                                <SelectItem value="organisatie">
                                  Organisatie
                                </SelectItem>
                                <SelectItem value="extern">Extern</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="fact-desc">
                              Wat is het feit dat je wilt vastleggen? (kort en feitelijk)
                            </Label>
                            <Textarea
                              id="fact-desc"
                              rows={3}
                              value={factForm.description}
                              onChange={(e) =>
                                setFactForm((f) => ({
                                  ...f,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Bijv. radar op brug 1 was uitgeschakeld; stuurman had 3 uur wacht achter elkaar; zicht was beperkt tot ca. 500 meter; etc."
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="fact-source">
                              Wat is de bron van dit feit?
                            </Label>
                            <Input
                              id="fact-source"
                              value={factForm.source}
                              onChange={(e) =>
                                setFactForm((f) => ({
                                  ...f,
                                  source: e.target.value,
                                }))
                              }
                              placeholder="Bijv. logboek, AIS, foto, interview kapitein, checklist, enz."
                            />
                          </div>

                          <div className="space-y-1">
                            <Label>Hoe zeker is dit feit op dit moment?</Label>
                            <Select
                              value={factForm.certainty}
                              onValueChange={(value) =>
                                setFactForm((f) => ({
                                  ...f,
                                  certainty: value as "zeker" | "waarschijnlijk" | "onbekend",
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="zeker">
                                  Zeker (bevestigd door meerdere bronnen)
                                </SelectItem>
                                <SelectItem value="waarschijnlijk">
                                  Waarschijnlijk (1 bron, nog te bevestigen)
                                </SelectItem>
                                <SelectItem value="onbekend">
                                  Onbekend / nog niet bevestigd
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetFactForm}
                            >
                              Leeg formulier
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={async () => {
                                if (!factForm.description.trim()) {
                                  alert("Beschrijving van het feit is verplicht.")
                                  return
                                }
                                try {
                                  const payload: any = {
                                    report_id: reportId,
                                    category: factForm.category,
                                    description: factForm.description.trim(),
                                    source: factForm.source.trim() || null,
                                    certainty: factForm.certainty,
                                    is_open_point:
                                      factForm.certainty === "waarschijnlijk" ||
                                      factForm.certainty === "onbekend",
                                  }

                                  if (factForm.id) {
                                    const { error } = await supabase
                                      .from("incident_facts")
                                      .update(payload)
                                      .eq("id", factForm.id)

                                    if (error) throw error
                                  } else {
                                    const { error } = await supabase
                                      .from("incident_facts")
                                      .insert([payload])

                                    if (error) throw error
                                  }

                                  await loadFacts(reportId)
                                  resetFactForm()
                                } catch (error: any) {
                                  console.error("Error saving fact:", error)
                                  alert(
                                    `Fout bij opslaan feit: ${
                                      error?.message ||
                                      error?.error?.message ||
                                      "Onbekende fout"
                                    }`
                                  )
                                }
                              }}
                            >
                              {factForm.id ? "Feit bijwerken" : "Feit opslaan"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Feiten per categorie
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          {loadingFacts ? (
                            <p className="text-xs text-gray-500">
                              Feiten laden...
                            </p>
                          ) : facts.length === 0 ? (
                            <p className="text-xs text-gray-500">
                              Nog geen feiten vastgelegd.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                              {["mens", "techniek", "omgeving", "operationeel", "organisatie", "extern"].map(
                                (cat) => {
                                  const catFacts = facts.filter(
                                    (f) => f.category === cat
                                  )
                                  if (catFacts.length === 0) return null
                                  const labelMap: Record<string, string> = {
                                    mens: "Mens",
                                    techniek: "Techniek",
                                    omgeving: "Omgeving",
                                    operationeel: "Operationeel",
                                    organisatie: "Organisatie",
                                    extern: "Extern",
                                  }
                                  return (
                                    <div key={cat} className="space-y-2">
                                      <div className="font-semibold text-xs text-gray-600 uppercase tracking-wide">
                                        {labelMap[cat]}
                                      </div>
                                      <ul className="space-y-2">
                                        {catFacts.map((f) => (
                                          <li
                                            key={f.id}
                                            className={`border rounded-md p-2 bg-white text-xs cursor-pointer ${
                                              selectedFact?.id === f.id
                                                ? "ring-2 ring-blue-500"
                                                : ""
                                            }`}
                                            onClick={() => setSelectedFact(f)}
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="font-medium text-gray-800 line-clamp-2">
                                                {f.description}
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <span
                                                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                    f.certainty === "zeker"
                                                      ? "bg-green-100 text-green-800"
                                                      : f.certainty === "waarschijnlijk"
                                                      ? "bg-yellow-100 text-yellow-800"
                                                      : "bg-red-100 text-red-800"
                                                  }`}
                                                >
                                                  {f.certainty}
                                                </span>
                                                <Button
                                                  variant="outline"
                                                  size="xs"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setFactForm({
                                                      id: f.id,
                                                      category: f.category,
                                                      description:
                                                        f.description || "",
                                                      source: f.source || "",
                                                      certainty:
                                                        f.certainty ||
                                                        "zeker",
                                                    })
                                                  }}
                                                >
                                                  Bewerken
                                                </Button>
                                                <Button
                                                  variant="destructive"
                                                  size="xs"
                                                  onClick={async (e) => {
                                                    e.stopPropagation()
                                                    if (
                                                      !confirm(
                                                        "Weet je zeker dat je dit feit wilt verwijderen?"
                                                      )
                                                    )
                                                      return
                                                    try {
                                                      const { error } =
                                                        await supabase
                                                          .from(
                                                            "incident_facts"
                                                          )
                                                          .delete()
                                                          .eq("id", f.id)

                                                      if (error) throw error
                                                      await loadFacts(reportId)
                                                      if (
                                                        selectedFact &&
                                                        selectedFact.id ===
                                                          f.id
                                                      ) {
                                                        setSelectedFact(null)
                                                      }
                                                    } catch (error: any) {
                                                      console.error(
                                                        "Error deleting fact:",
                                                        error
                                                      )
                                                      alert(
                                                        `Fout bij verwijderen feit: ${
                                                          error?.message ||
                                                          error?.error
                                                            ?.message ||
                                                          "Onbekende fout"
                                                        }`
                                                      )
                                                    }
                                                  }}
                                                >
                                                  Verwijderen
                                                </Button>
                                              </div>
                                            </div>
                                            {f.source && (
                                              <div className="text-[11px] text-gray-500 mt-0.5">
                                                Bron: {f.source}
                                              </div>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )
                                }
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {selectedFact && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              Feit – detailweergave
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm text-gray-800">
                            <div>
                              <div className="font-semibold text-xs text-gray-500">
                                Categorie
                              </div>
                              <div>
                                {(() => {
                                  switch (selectedFact.category) {
                                    case "mens":
                                      return "Mens"
                                    case "techniek":
                                      return "Techniek"
                                    case "omgeving":
                                      return "Omgeving"
                                    case "operationeel":
                                      return "Operationeel"
                                    case "organisatie":
                                      return "Organisatie"
                                    case "extern":
                                      return "Extern"
                                    default:
                                      return selectedFact.category
                                  }
                                })()}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-gray-500">
                                Beschrijving
                              </div>
                              <div className="whitespace-pre-wrap">
                                {selectedFact.description}
                              </div>
                            </div>
                            {selectedFact.source && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Bron
                                </div>
                                <div>{selectedFact.source}</div>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-xs text-gray-500">
                                Zekerheid
                              </div>
                              <div>
                                {selectedFact.certainty === "zeker"
                                  ? "Zeker"
                                  : selectedFact.certainty === "waarschijnlijk"
                                  ? "Waarschijnlijk"
                                  : "Onbekend / nog niet bevestigd"}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "analyse" && (
                <div className="space-y-4 text-sm text-gray-700">
                  {!reportId && (
                    <Card>
                      <CardContent className="py-4 text-sm text-gray-600">
                        Sla eerst <strong>Basis &amp; Reis</strong> op voordat je
                        analyse-elementen toevoegt.
                      </CardContent>
                    </Card>
                  )}

                  {reportId && (
                    <>
                      <p>
                        Analyseer hier het incident op basis van de verzamelde feiten,
                        tijdlijn en interviews. Focus op directe aanleiding, bijdragende
                        factoren, barrières en conclusies.
                      </p>

                      {/* Formulier voor nieuw / te bewerken analyse-element */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {analysisForm.id
                              ? "Analyse-element bewerken"
                              : "Nieuw analyse-element toevoegen"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1">
                            <Label htmlFor="an-type">Type analyse-element</Label>
                            <Select
                              value={analysisForm.analysisType}
                              onValueChange={(value) => {
                                setAnalysisForm((f) => ({
                                  ...f,
                                  analysisType: value as
                                    | "directe_aanleiding"
                                    | "bijdragende_factor"
                                    | "barriere"
                                    | "conclusie",
                                  category:
                                    value === "bijdragende_factor" ||
                                    value === "conclusie"
                                      ? f.category || "technisch"
                                      : "",
                                }))
                              }}
                            >
                              <SelectTrigger id="an-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="directe_aanleiding">
                                  Directe aanleiding
                                </SelectItem>
                                <SelectItem value="bijdragende_factor">
                                  Bijdragende factor
                                </SelectItem>
                                <SelectItem value="barriere">Barrière</SelectItem>
                                <SelectItem value="conclusie">Conclusie</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {(analysisForm.analysisType === "bijdragende_factor" ||
                            analysisForm.analysisType === "conclusie") && (
                            <div className="space-y-1">
                              <Label htmlFor="an-category">Categorie</Label>
                              <Select
                                value={analysisForm.category}
                                onValueChange={(value) =>
                                  setAnalysisForm((f) => ({
                                    ...f,
                                    category: value as
                                      | "technisch"
                                      | "operationeel"
                                      | "organisatorisch"
                                      | "samenvattend",
                                  }))
                                }
                              >
                                <SelectTrigger id="an-category">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="technisch">Technisch</SelectItem>
                                  <SelectItem value="operationeel">
                                    Operationeel
                                  </SelectItem>
                                  <SelectItem value="organisatorisch">
                                    Organisatorisch
                                  </SelectItem>
                                  {analysisForm.analysisType === "conclusie" && (
                                    <SelectItem value="samenvattend">
                                      Samenvattend
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-1">
                            <Label htmlFor="an-desc">Beschrijving</Label>
                            <Textarea
                              id="an-desc"
                              rows={4}
                              value={analysisForm.description}
                              onChange={(e) =>
                                setAnalysisForm((f) => ({
                                  ...f,
                                  description: e.target.value,
                                }))
                              }
                              placeholder={
                                analysisForm.analysisType === "directe_aanleiding"
                                  ? "Wat was de directe trigger van het incident?"
                                  : analysisForm.analysisType === "bijdragende_factor"
                                  ? "Welke factor heeft bijgedragen aan het ontstaan of verloop van het incident?"
                                  : analysisForm.analysisType === "barriere"
                                  ? "Welke maatregel had dit incident moeten voorkomen?"
                                  : "Wat is de conclusie op basis van de verzamelde feiten?"
                              }
                            />
                          </div>

                          {analysisForm.analysisType === "barriere" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>Was deze barrière aanwezig?</Label>
                                <Select
                                  value={analysisForm.barrierPresent || "onbekend"}
                                  onValueChange={(value) =>
                                    setAnalysisForm((f) => ({
                                      ...f,
                                      barrierPresent:
                                        value === "onbekend"
                                          ? ""
                                          : (value as "ja" | "nee"),
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="onbekend">Onbekend</SelectItem>
                                    <SelectItem value="ja">Ja</SelectItem>
                                    <SelectItem value="nee">Nee</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>Werkte deze barrière?</Label>
                                <Select
                                  value={analysisForm.barrierWorked || "onbekend"}
                                  onValueChange={(value) =>
                                    setAnalysisForm((f) => ({
                                      ...f,
                                      barrierWorked:
                                        value === "onbekend"
                                          ? ""
                                          : (value as "ja" | "nee"),
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="onbekend">Onbekend</SelectItem>
                                    <SelectItem value="ja">Ja</SelectItem>
                                    <SelectItem value="nee">Nee</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetAnalysisForm}
                            >
                              Leeg formulier
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={async () => {
                                if (!analysisForm.description.trim()) {
                                  alert("Beschrijving is verplicht.")
                                  return
                                }
                                if (
                                  (analysisForm.analysisType === "bijdragende_factor" ||
                                    analysisForm.analysisType === "conclusie") &&
                                  !analysisForm.category
                                ) {
                                  alert("Categorie is verplicht voor dit type.")
                                  return
                                }
                                try {
                                  const payload: any = {
                                    report_id: reportId,
                                    analysis_type: analysisForm.analysisType,
                                    description: analysisForm.description.trim(),
                                    category:
                                      analysisForm.category || null,
                                    barrier_present:
                                      analysisForm.barrierPresent === ""
                                        ? null
                                        : analysisForm.barrierPresent === "ja",
                                    barrier_worked:
                                      analysisForm.barrierWorked === ""
                                        ? null
                                        : analysisForm.barrierWorked === "ja",
                                  }

                                  if (analysisForm.id) {
                                    const { error } = await supabase
                                      .from("incident_analysis")
                                      .update(payload)
                                      .eq("id", analysisForm.id)

                                    if (error) throw error
                                  } else {
                                    const { error } = await supabase
                                      .from("incident_analysis")
                                      .insert([payload])

                                    if (error) throw error
                                  }

                                  await loadAnalysis(reportId)
                                  resetAnalysisForm()
                                } catch (error: any) {
                                  console.error("Error saving analysis:", error)
                                  alert(
                                    `Fout bij opslaan analyse-element: ${
                                      error?.message ||
                                      error?.error?.message ||
                                      "Onbekende fout"
                                    }`
                                  )
                                }
                              }}
                            >
                              {analysisForm.id
                                ? "Element bijwerken"
                                : "Element opslaan"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Overzicht per type */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Directe aanleiding */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Directe aanleiding</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {loadingAnalysis ? (
                              <p className="text-gray-500 text-xs">Laden...</p>
                            ) : (
                              analysisItems
                                .filter((a) => a.analysis_type === "directe_aanleiding")
                                .map((a) => (
                                  <div
                                    key={a.id}
                                    className={`border rounded-md p-2 space-y-1 bg-white cursor-pointer ${
                                      selectedAnalysis?.id === a.id
                                        ? "border-blue-500 bg-blue-50"
                                        : ""
                                    }`}
                                    onClick={() => setSelectedAnalysis(a)}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="font-medium text-xs">
                                        {a.description}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="outline"
                                          size="xs"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setAnalysisForm({
                                              id: a.id,
                                              analysisType: a.analysis_type,
                                              category: a.category || "",
                                              description: a.description || "",
                                              barrierPresent:
                                                a.barrier_present === null
                                                  ? ""
                                                  : a.barrier_present
                                                  ? "ja"
                                                  : "nee",
                                              barrierWorked:
                                                a.barrier_worked === null
                                                  ? ""
                                                  : a.barrier_worked
                                                  ? "ja"
                                                  : "nee",
                                            })
                                          }}
                                        >
                                          Bewerken
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="xs"
                                          onClick={async (e) => {
                                            e.stopPropagation()
                                            if (
                                              !confirm(
                                                "Weet je zeker dat je dit element wilt verwijderen?"
                                              )
                                            )
                                              return
                                            try {
                                              const { error } = await supabase
                                                .from("incident_analysis")
                                                .delete()
                                                .eq("id", a.id)

                                              if (error) throw error
                                              await loadAnalysis(reportId)
                                              if (selectedAnalysis?.id === a.id) {
                                                setSelectedAnalysis(null)
                                              }
                                            } catch (error: any) {
                                              console.error(
                                                "Error deleting analysis:",
                                                error
                                              )
                                              alert(
                                                `Fout bij verwijderen: ${
                                                  error?.message ||
                                                  error?.error?.message ||
                                                  "Onbekende fout"
                                                }`
                                              )
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                            )}
                            {!loadingAnalysis &&
                              analysisItems.filter(
                                (a) => a.analysis_type === "directe_aanleiding"
                              ).length === 0 && (
                                <p className="text-xs text-gray-500">
                                  Nog geen directe aanleiding vastgesteld.
                                </p>
                              )}
                          </CardContent>
                        </Card>

                        {/* Bijdragende factoren */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">
                              Bijdragende factoren
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            {["technisch", "operationeel", "organisatorisch"].map(
                              (cat) => {
                                const factors = analysisItems.filter(
                                  (a) =>
                                    a.analysis_type === "bijdragende_factor" &&
                                    a.category === cat
                                )
                                return (
                                  <div key={cat} className="space-y-1">
                                    <div className="font-semibold text-xs text-gray-600">
                                      {cat === "technisch"
                                        ? "Technisch"
                                        : cat === "operationeel"
                                        ? "Operationeel"
                                        : "Organisatorisch"}
                                    </div>
                                    {factors.map((a) => (
                                      <div
                                        key={a.id}
                                        className={`border rounded-md p-2 space-y-1 bg-white cursor-pointer text-xs ${
                                          selectedAnalysis?.id === a.id
                                            ? "border-blue-500 bg-blue-50"
                                            : ""
                                        }`}
                                        onClick={() => setSelectedAnalysis(a)}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div>{a.description}</div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="outline"
                                              size="xs"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setAnalysisForm({
                                                  id: a.id,
                                                  analysisType: a.analysis_type,
                                                  category: a.category || "",
                                                  description: a.description || "",
                                                  barrierPresent: "",
                                                  barrierWorked: "",
                                                })
                                              }}
                                            >
                                              Bewerken
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="xs"
                                              onClick={async (e) => {
                                                e.stopPropagation()
                                                if (
                                                  !confirm(
                                                    "Weet je zeker dat je dit element wilt verwijderen?"
                                                  )
                                                )
                                                  return
                                                try {
                                                  const { error } = await supabase
                                                    .from("incident_analysis")
                                                    .delete()
                                                    .eq("id", a.id)

                                                  if (error) throw error
                                                  await loadAnalysis(reportId)
                                                  if (selectedAnalysis?.id === a.id) {
                                                    setSelectedAnalysis(null)
                                                  }
                                                } catch (error: any) {
                                                  console.error(
                                                    "Error deleting analysis:",
                                                    error
                                                  )
                                                  alert(
                                                    `Fout bij verwijderen: ${
                                                      error?.message ||
                                                      error?.error?.message ||
                                                      "Onbekende fout"
                                                    }`
                                                  )
                                                }
                                              }}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {factors.length === 0 && (
                                      <p className="text-xs text-gray-400">
                                        Geen factoren in deze categorie.
                                      </p>
                                    )}
                                  </div>
                                )
                              }
                            )}
                          </CardContent>
                        </Card>

                        {/* Barrières */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Barrières</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {loadingAnalysis ? (
                              <p className="text-gray-500 text-xs">Laden...</p>
                            ) : (
                              analysisItems
                                .filter((a) => a.analysis_type === "barriere")
                                .map((a) => (
                                  <div
                                    key={a.id}
                                    className={`border rounded-md p-2 space-y-1 bg-white cursor-pointer ${
                                      selectedAnalysis?.id === a.id
                                        ? "border-blue-500 bg-blue-50"
                                        : ""
                                    }`}
                                    onClick={() => setSelectedAnalysis(a)}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="font-medium text-xs">
                                        {a.description}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="outline"
                                          size="xs"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setAnalysisForm({
                                              id: a.id,
                                              analysisType: a.analysis_type,
                                              category: "",
                                              description: a.description || "",
                                              barrierPresent:
                                                a.barrier_present === null
                                                  ? ""
                                                  : a.barrier_present
                                                  ? "ja"
                                                  : "nee",
                                              barrierWorked:
                                                a.barrier_worked === null
                                                  ? ""
                                                  : a.barrier_worked
                                                  ? "ja"
                                                  : "nee",
                                            })
                                          }}
                                        >
                                          Bewerken
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="xs"
                                          onClick={async (e) => {
                                            e.stopPropagation()
                                            if (
                                              !confirm(
                                                "Weet je zeker dat je dit element wilt verwijderen?"
                                              )
                                            )
                                              return
                                            try {
                                              const { error } = await supabase
                                                .from("incident_analysis")
                                                .delete()
                                                .eq("id", a.id)

                                              if (error) throw error
                                              await loadAnalysis(reportId)
                                              if (selectedAnalysis?.id === a.id) {
                                                setSelectedAnalysis(null)
                                              }
                                            } catch (error: any) {
                                              console.error(
                                                "Error deleting analysis:",
                                                error
                                              )
                                              alert(
                                                `Fout bij verwijderen: ${
                                                  error?.message ||
                                                  error?.error?.message ||
                                                  "Onbekende fout"
                                                }`
                                              )
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    {(a.barrier_present !== null ||
                                      a.barrier_worked !== null) && (
                                      <div className="text-xs text-gray-600 space-y-0.5">
                                        {a.barrier_present !== null && (
                                          <div>
                                            Aanwezig:{" "}
                                            <span className="font-semibold">
                                              {a.barrier_present ? "Ja" : "Nee"}
                                            </span>
                                          </div>
                                        )}
                                        {a.barrier_worked !== null && (
                                          <div>
                                            Werkte:{" "}
                                            <span className="font-semibold">
                                              {a.barrier_worked ? "Ja" : "Nee"}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))
                            )}
                            {!loadingAnalysis &&
                              analysisItems.filter(
                                (a) => a.analysis_type === "barriere"
                              ).length === 0 && (
                                <p className="text-xs text-gray-500">
                                  Nog geen barrières vastgesteld.
                                </p>
                              )}
                          </CardContent>
                        </Card>

                        {/* Conclusies */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Conclusies</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            {["technisch", "operationeel", "organisatorisch", "samenvattend"].map(
                              (cat) => {
                                const conclusions = analysisItems.filter(
                                  (a) =>
                                    a.analysis_type === "conclusie" &&
                                    a.category === cat
                                )
                                return (
                                  <div key={cat} className="space-y-1">
                                    <div className="font-semibold text-xs text-gray-600">
                                      {cat === "technisch"
                                        ? "Technisch"
                                        : cat === "operationeel"
                                        ? "Operationeel"
                                        : cat === "organisatorisch"
                                        ? "Organisatorisch"
                                        : "Samenvattend"}
                                    </div>
                                    {conclusions.map((a) => (
                                      <div
                                        key={a.id}
                                        className={`border rounded-md p-2 space-y-1 bg-white cursor-pointer text-xs ${
                                          selectedAnalysis?.id === a.id
                                            ? "border-blue-500 bg-blue-50"
                                            : ""
                                        }`}
                                        onClick={() => setSelectedAnalysis(a)}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div>{a.description}</div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="outline"
                                              size="xs"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setAnalysisForm({
                                                  id: a.id,
                                                  analysisType: a.analysis_type,
                                                  category: a.category || "",
                                                  description: a.description || "",
                                                  barrierPresent: "",
                                                  barrierWorked: "",
                                                })
                                              }}
                                            >
                                              Bewerken
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="xs"
                                              onClick={async (e) => {
                                                e.stopPropagation()
                                                if (
                                                  !confirm(
                                                    "Weet je zeker dat je dit element wilt verwijderen?"
                                                  )
                                                )
                                                  return
                                                try {
                                                  const { error } = await supabase
                                                    .from("incident_analysis")
                                                    .delete()
                                                    .eq("id", a.id)

                                                  if (error) throw error
                                                  await loadAnalysis(reportId)
                                                  if (selectedAnalysis?.id === a.id) {
                                                    setSelectedAnalysis(null)
                                                  }
                                                } catch (error: any) {
                                                  console.error(
                                                    "Error deleting analysis:",
                                                    error
                                                  )
                                                  alert(
                                                    `Fout bij verwijderen: ${
                                                      error?.message ||
                                                      error?.error?.message ||
                                                      "Onbekende fout"
                                                    }`
                                                  )
                                                }
                                              }}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {conclusions.length === 0 && (
                                      <p className="text-xs text-gray-400">
                                        Geen conclusie in deze categorie.
                                      </p>
                                    )}
                                  </div>
                                )
                              }
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Detailweergave geselecteerd element */}
                      {selectedAnalysis && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              Detailweergave –{" "}
                              {selectedAnalysis.analysis_type === "directe_aanleiding"
                                ? "Directe aanleiding"
                                : selectedAnalysis.analysis_type === "bijdragende_factor"
                                ? "Bijdragende factor"
                                : selectedAnalysis.analysis_type === "barriere"
                                ? "Barrière"
                                : "Conclusie"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {selectedAnalysis.category && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Categorie
                                </div>
                                <div className="text-xs text-gray-800">
                                  {selectedAnalysis.category === "technisch"
                                    ? "Technisch"
                                    : selectedAnalysis.category === "operationeel"
                                    ? "Operationeel"
                                    : selectedAnalysis.category === "organisatorisch"
                                    ? "Organisatorisch"
                                    : "Samenvattend"}
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-xs text-gray-500">
                                Beschrijving
                              </div>
                              <div className="text-xs text-gray-800 whitespace-pre-wrap">
                                {selectedAnalysis.description}
                              </div>
                            </div>
                            {selectedAnalysis.analysis_type === "barriere" && (
                              <div className="space-y-1">
                                <div className="font-semibold text-xs text-gray-500">
                                  Barrière-evaluatie
                                </div>
                                <div className="text-xs text-gray-800 space-y-0.5">
                                  {selectedAnalysis.barrier_present !== null && (
                                    <div>
                                      Aanwezig:{" "}
                                      <span className="font-semibold">
                                        {selectedAnalysis.barrier_present ? "Ja" : "Nee"}
                                      </span>
                                    </div>
                                  )}
                                  {selectedAnalysis.barrier_worked !== null && (
                                    <div>
                                      Werkte:{" "}
                                      <span className="font-semibold">
                                        {selectedAnalysis.barrier_worked ? "Ja" : "Nee"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "acties" && (
                <div className="space-y-4 text-sm text-gray-700">
                  {!reportId && (
                    <Card>
                      <CardContent className="py-4 text-sm text-gray-600">
                        Sla eerst <strong>Basis &amp; Reis</strong> op voordat je
                        acties toevoegt.
                      </CardContent>
                    </Card>
                  )}

                  {reportId && (
                    <>
                      <p>
                        Definieer hier corrigerende en preventieve acties die
                        voortvloeien uit de analyse. Elke actie heeft een
                        verantwoordelijke en een deadline.
                      </p>

                      {/* Formulier voor nieuwe / te bewerken actie */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {actionForm.id
                              ? "Actie bewerken"
                              : "Nieuwe actie toevoegen"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1">
                            <Label htmlFor="ac-related">
                              Koppelen aan oorzaak (optioneel)
                            </Label>
                            <Select
                              value={actionForm.relatedAnalysisId || "none"}
                              onValueChange={(value) =>
                                setActionForm((f) => ({
                                  ...f,
                                  relatedAnalysisId: value === "none" ? "" : value,
                                }))
                              }
                            >
                              <SelectTrigger id="ac-related">
                                <SelectValue placeholder="Geen koppeling" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Geen koppeling</SelectItem>
                                {analysisItems
                                  .filter(
                                    (a) =>
                                      a.analysis_type === "directe_aanleiding" ||
                                      a.analysis_type === "bijdragende_factor"
                                  )
                                  .map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                      {a.analysis_type === "directe_aanleiding"
                                        ? "Directe aanleiding"
                                        : `${a.category === "technisch" ? "Technisch" : a.category === "operationeel" ? "Operationeel" : a.category === "organisatorisch" ? "Organisatorisch" : ""} - ${a.description.substring(0, 50)}${a.description.length > 50 ? "..." : ""}`}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">
                              Optioneel: koppel deze actie aan een specifieke oorzaak
                              uit de analyse.
                            </p>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="ac-desc">
                              Omschrijving van de actie *
                            </Label>
                            <Textarea
                              id="ac-desc"
                              rows={3}
                              value={actionForm.description}
                              onChange={(e) =>
                                setActionForm((f) => ({
                                  ...f,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Bijv. Procedure voor wachtoverdracht herzien en implementeren"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="ac-responsible">
                                Verantwoordelijke *
                              </Label>
                              <Input
                                id="ac-responsible"
                                value={actionForm.responsible}
                                onChange={(e) =>
                                  setActionForm((f) => ({
                                    ...f,
                                    responsible: e.target.value,
                                  }))
                                }
                                placeholder="Bijv. Nautic, Leo, Jos, Willem, Bart"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="ac-deadline">Deadline</Label>
                              <Input
                                id="ac-deadline"
                                type="date"
                                value={actionForm.deadline}
                                onChange={(e) =>
                                  setActionForm((f) => ({
                                    ...f,
                                    deadline: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="ac-status">Status</Label>
                            <Select
                              value={actionForm.status}
                              onValueChange={(value) =>
                                setActionForm((f) => ({
                                  ...f,
                                  status: value as
                                    | "open"
                                    | "in_uitvoering"
                                    | "afgerond"
                                    | "geannuleerd",
                                }))
                              }
                            >
                              <SelectTrigger id="ac-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_uitvoering">
                                  In uitvoering
                                </SelectItem>
                                <SelectItem value="afgerond">Afgerond</SelectItem>
                                <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="ac-notes">Opmerkingen</Label>
                            <Textarea
                              id="ac-notes"
                              rows={2}
                              value={actionForm.notes}
                              onChange={(e) =>
                                setActionForm((f) => ({
                                  ...f,
                                  notes: e.target.value,
                                }))
                              }
                              placeholder="Bijv. voortgang, belemmeringen, aanvullende informatie"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetActionForm}
                            >
                              Leeg formulier
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={async () => {
                                if (!actionForm.description.trim()) {
                                  alert("Omschrijving is verplicht.")
                                  return
                                }
                                if (!actionForm.responsible.trim()) {
                                  alert("Verantwoordelijke is verplicht.")
                                  return
                                }
                                try {
                                  const payload: any = {
                                    report_id: reportId,
                                    related_analysis_id:
                                      actionForm.relatedAnalysisId || null,
                                    description: actionForm.description.trim(),
                                    responsible: actionForm.responsible.trim(),
                                    deadline: actionForm.deadline || null,
                                    status: actionForm.status,
                                    notes: actionForm.notes.trim() || null,
                                  }

                                  if (actionForm.id) {
                                    const { error } = await supabase
                                      .from("incident_actions")
                                      .update(payload)
                                      .eq("id", actionForm.id)

                                    if (error) throw error
                                  } else {
                                    const { error } = await supabase
                                      .from("incident_actions")
                                      .insert([payload])

                                    if (error) throw error
                                  }

                                  await loadActions(reportId)
                                  resetActionForm()
                                } catch (error: any) {
                                  console.error("Error saving action:", error)
                                  alert(
                                    `Fout bij opslaan actie: ${
                                      error?.message ||
                                      error?.error?.message ||
                                      "Onbekende fout"
                                    }`
                                  )
                                }
                              }}
                            >
                              {actionForm.id ? "Actie bijwerken" : "Actie opslaan"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Overzicht acties */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Overzicht acties</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {loadingActions ? (
                            <p className="text-gray-500 text-xs">Laden...</p>
                          ) : actions.length === 0 ? (
                            <p className="text-xs text-gray-500">
                              Nog geen acties toegevoegd.
                            </p>
                          ) : (
                            actions.map((a) => {
                              const statusColors: Record<string, string> = {
                                open: "bg-gray-100 text-gray-800",
                                in_uitvoering: "bg-blue-100 text-blue-800",
                                afgerond: "bg-green-100 text-green-800",
                                geannuleerd: "bg-red-100 text-red-800",
                              }
                              const statusLabels: Record<string, string> = {
                                open: "Open",
                                in_uitvoering: "In uitvoering",
                                afgerond: "Afgerond",
                                geannuleerd: "Geannuleerd",
                              }
                              return (
                                <div
                                  key={a.id}
                                  className={`border rounded-md p-3 space-y-2 bg-white cursor-pointer ${
                                    selectedAction?.id === a.id
                                      ? "border-blue-500 bg-blue-50"
                                      : ""
                                  }`}
                                  onClick={() => setSelectedAction(a)}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 space-y-1">
                                      <div className="font-medium text-xs">
                                        {a.description}
                                      </div>
                                      <div className="text-xs text-gray-600 space-y-0.5">
                                        <div>
                                          Verantwoordelijke:{" "}
                                          <span className="font-semibold">
                                            {a.responsible}
                                          </span>
                                        </div>
                                        {a.deadline && (
                                          <div>
                                            Deadline:{" "}
                                            <span className="font-semibold">
                                              {format(
                                                new Date(a.deadline),
                                                "d MMM yyyy",
                                                { locale: nl }
                                              )}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-1 rounded text-xs font-semibold ${
                                          statusColors[a.status] || statusColors.open
                                        }`}
                                      >
                                        {statusLabels[a.status] || "Open"}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="outline"
                                          size="xs"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const relatedAnalysis = analysisItems.find(
                                              (an) => an.id === a.related_analysis_id
                                            )
                                            setActionForm({
                                              id: a.id,
                                              relatedAnalysisId:
                                                a.related_analysis_id || "",
                                              description: a.description || "",
                                              responsible: a.responsible || "",
                                              deadline: a.deadline
                                                ? format(
                                                    new Date(a.deadline),
                                                    "yyyy-MM-dd"
                                                  )
                                                : "",
                                              status: a.status || "open",
                                              notes: a.notes || "",
                                            })
                                          }}
                                        >
                                          Bewerken
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="xs"
                                          onClick={async (e) => {
                                            e.stopPropagation()
                                            if (
                                              !confirm(
                                                "Weet je zeker dat je deze actie wilt verwijderen?"
                                              )
                                            )
                                              return
                                            try {
                                              const { error } = await supabase
                                                .from("incident_actions")
                                                .delete()
                                                .eq("id", a.id)

                                              if (error) throw error
                                              await loadActions(reportId)
                                              if (selectedAction?.id === a.id) {
                                                setSelectedAction(null)
                                              }
                                            } catch (error: any) {
                                              console.error(
                                                "Error deleting action:",
                                                error
                                              )
                                              alert(
                                                `Fout bij verwijderen: ${
                                                  error?.message ||
                                                  error?.error?.message ||
                                                  "Onbekende fout"
                                                }`
                                              )
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                  {a.notes && (
                                    <div className="text-xs text-gray-600 pt-1 border-t">
                                      <span className="font-semibold">Opmerkingen: </span>
                                      {a.notes}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </CardContent>
                      </Card>

                      {/* Detailweergave geselecteerde actie */}
                      {selectedAction && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              Detailweergave – Actie
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {selectedAction.related_analysis_id && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Gekoppeld aan oorzaak
                                </div>
                                <div className="text-xs text-gray-800">
                                  {(() => {
                                    const related = analysisItems.find(
                                      (an) => an.id === selectedAction.related_analysis_id
                                    )
                                    if (!related) return "Onbekend"
                                    return related.description
                                  })()}
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-xs text-gray-500">
                                Omschrijving
                              </div>
                              <div className="text-xs text-gray-800 whitespace-pre-wrap">
                                {selectedAction.description}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Verantwoordelijke
                                </div>
                                <div className="text-xs text-gray-800">
                                  {selectedAction.responsible}
                                </div>
                              </div>
                              {selectedAction.deadline && (
                                <div>
                                  <div className="font-semibold text-xs text-gray-500">
                                    Deadline
                                  </div>
                                  <div className="text-xs text-gray-800">
                                    {format(
                                      new Date(selectedAction.deadline),
                                      "d MMM yyyy",
                                      { locale: nl }
                                    )}
                                  </div>
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Status
                                </div>
                                <div className="text-xs text-gray-800">
                                  {selectedAction.status === "open"
                                    ? "Open"
                                    : selectedAction.status === "in_uitvoering"
                                    ? "In uitvoering"
                                    : selectedAction.status === "afgerond"
                                    ? "Afgerond"
                                    : "Geannuleerd"}
                                </div>
                              </div>
                            </div>
                            {selectedAction.notes && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Opmerkingen
                                </div>
                                <div className="text-xs text-gray-800 whitespace-pre-wrap">
                                  {selectedAction.notes}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "lessons" && (
                <div className="space-y-4 text-sm text-gray-700">
                  {!reportId && (
                    <Card>
                      <CardContent className="py-4 text-sm text-gray-600">
                        Sla eerst <strong>Basis &amp; Reis</strong> op voordat je
                        lessons learned toevoegt.
                      </CardContent>
                    </Card>
                  )}

                  {reportId && (
                    <>
                      <p>
                        Formuleer hier de lessons learned per categorie. Minimaal één
                        operationele les en één structurele reflectie (technisch of
                        organisatorisch).
                      </p>

                      {/* Formulier voor nieuwe / te bewerken lesson */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {lessonForm.id
                              ? "Lesson learned bewerken"
                              : "Nieuwe lesson learned toevoegen"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1">
                            <Label htmlFor="ll-category">Categorie</Label>
                            <Select
                              value={lessonForm.category}
                              onValueChange={(value) =>
                                setLessonForm((f) => ({
                                  ...f,
                                  category: value as
                                    | "operationeel"
                                    | "technisch"
                                    | "organisatorisch",
                                }))
                              }
                            >
                              <SelectTrigger id="ll-category">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="operationeel">
                                  Operationeel
                                </SelectItem>
                                <SelectItem value="technisch">Technisch</SelectItem>
                                <SelectItem value="organisatorisch">
                                  Organisatorisch
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="ll-lesson">Lesson learned *</Label>
                            <Textarea
                              id="ll-lesson"
                              rows={4}
                              value={lessonForm.lesson}
                              onChange={(e) =>
                                setLessonForm((f) => ({
                                  ...f,
                                  lesson: e.target.value,
                                }))
                              }
                              placeholder={
                                lessonForm.category === "operationeel"
                                  ? "Bijv. Bij wachtoverdracht moeten alle relevante informatie over verkeer en omstandigheden expliciet worden doorgegeven."
                                  : lessonForm.category === "technisch"
                                  ? "Bijv. Het systeem voor automatische waarschuwingen moet worden verbeterd om valse meldingen te voorkomen."
                                  : "Bijv. Procedures moeten regelmatig worden geëvalueerd en bijgewerkt op basis van praktijkervaringen."
                              }
                            />
                            <p className="text-xs text-gray-500">
                              {lessonForm.category === "operationeel"
                                ? "Operationele les: wat kunnen we leren voor de dagelijkse praktijk?"
                                : lessonForm.category === "technisch"
                                ? "Technische les: wat kunnen we leren over systemen, apparatuur of technische processen?"
                                : "Organisatorische les: wat kunnen we leren over procedures, structuur of organisatie?"}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetLessonForm}
                            >
                              Leeg formulier
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={async () => {
                                if (!lessonForm.lesson.trim()) {
                                  alert("Lesson learned is verplicht.")
                                  return
                                }
                                try {
                                  const payload: any = {
                                    report_id: reportId,
                                    category: lessonForm.category,
                                    lesson: lessonForm.lesson.trim(),
                                  }

                                  if (lessonForm.id) {
                                    const { error } = await supabase
                                      .from("incident_lessons_learned")
                                      .update(payload)
                                      .eq("id", lessonForm.id)

                                    if (error) throw error
                                  } else {
                                    const { error } = await supabase
                                      .from("incident_lessons_learned")
                                      .insert([payload])

                                    if (error) throw error
                                  }

                                  await loadLessons(reportId)
                                  resetLessonForm()
                                } catch (error: any) {
                                  console.error("Error saving lesson:", error)
                                  alert(
                                    `Fout bij opslaan lesson learned: ${
                                      error?.message ||
                                      error?.error?.message ||
                                      "Onbekende fout"
                                    }`
                                  )
                                }
                              }}
                            >
                              {lessonForm.id
                                ? "Lesson bijwerken"
                                : "Lesson opslaan"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Overzicht lessons learned per categorie */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {["operationeel", "technisch", "organisatorisch"].map(
                          (cat) => {
                            const lessons = lessonsLearned.filter(
                              (l) => l.category === cat
                            )
                            return (
                              <Card key={cat}>
                                <CardHeader>
                                  <CardTitle className="text-sm">
                                    {cat === "operationeel"
                                      ? "Operationeel"
                                      : cat === "technisch"
                                      ? "Technisch"
                                      : "Organisatorisch"}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                  {loadingLessons ? (
                                    <p className="text-gray-500 text-xs">Laden...</p>
                                  ) : lessons.length === 0 ? (
                                    <p className="text-xs text-gray-400">
                                      Nog geen lessons learned in deze categorie.
                                    </p>
                                  ) : (
                                    lessons.map((l) => (
                                      <div
                                        key={l.id}
                                        className={`border rounded-md p-2 space-y-1 bg-white cursor-pointer text-xs ${
                                          selectedLesson?.id === l.id
                                            ? "border-blue-500 bg-blue-50"
                                            : ""
                                        }`}
                                        onClick={() => setSelectedLesson(l)}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex-1 whitespace-pre-wrap">
                                            {l.lesson}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="outline"
                                              size="xs"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setLessonForm({
                                                  id: l.id,
                                                  category: l.category,
                                                  lesson: l.lesson || "",
                                                })
                                              }}
                                            >
                                              Bewerken
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="xs"
                                              onClick={async (e) => {
                                                e.stopPropagation()
                                                if (
                                                  !confirm(
                                                    "Weet je zeker dat je deze lesson learned wilt verwijderen?"
                                                  )
                                                )
                                                  return
                                                try {
                                                  const { error } = await supabase
                                                    .from("incident_lessons_learned")
                                                    .delete()
                                                    .eq("id", l.id)

                                                  if (error) throw error
                                                  await loadLessons(reportId)
                                                  if (selectedLesson?.id === l.id) {
                                                    setSelectedLesson(null)
                                                  }
                                                } catch (error: any) {
                                                  console.error(
                                                    "Error deleting lesson:",
                                                    error
                                                  )
                                                  alert(
                                                    `Fout bij verwijderen: ${
                                                      error?.message ||
                                                      error?.error?.message ||
                                                      "Onbekende fout"
                                                    }`
                                                  )
                                                }
                                              }}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </CardContent>
                              </Card>
                            )
                          }
                        )}
                      </div>

                      {/* Detailweergave geselecteerde lesson */}
                      {selectedLesson && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              Detailweergave – Lesson Learned
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div>
                              <div className="font-semibold text-xs text-gray-500">
                                Categorie
                              </div>
                              <div className="text-xs text-gray-800">
                                {selectedLesson.category === "operationeel"
                                  ? "Operationeel"
                                  : selectedLesson.category === "technisch"
                                  ? "Technisch"
                                  : "Organisatorisch"}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-gray-500">
                                Lesson learned
                              </div>
                              <div className="text-xs text-gray-800 whitespace-pre-wrap">
                                {selectedLesson.lesson}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "bijlagen" && (
                <div className="space-y-4 text-sm text-gray-700">
                  {!reportId && (
                    <Card>
                      <CardContent className="py-4 text-sm text-gray-600">
                        Sla eerst <strong>Basis &amp; Reis</strong> op voordat je
                        bijlagen toevoegt.
                      </CardContent>
                    </Card>
                  )}

                  {reportId && (
                    <>
                      <p>
                        Upload en beheer bijlagen zoals foto&apos;s, video&apos;s,
                        PDF&apos;s, e-mails, AIS-data, logboeken en verklaringen. Je
                        kunt bijlagen koppelen aan tijdlijn events, feiten, interviews
                        of acties.
                      </p>

                      {/* Formulier voor nieuwe / te bewerken bijlage */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {attachmentForm.id
                              ? "Bijlage bewerken"
                              : "Nieuwe bijlage toevoegen"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1">
                            <Label htmlFor="att-type">Type bijlage *</Label>
                            <Select
                              value={attachmentForm.attachmentType}
                              onValueChange={(value) =>
                                setAttachmentForm((f) => ({
                                  ...f,
                                  attachmentType: value as
                                    | "foto"
                                    | "video"
                                    | "pdf"
                                    | "email"
                                    | "ais"
                                    | "logboek"
                                    | "verklaring"
                                    | "ander",
                                }))
                              }
                            >
                              <SelectTrigger id="att-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="foto">Foto</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="pdf">PDF</SelectItem>
                                <SelectItem value="email">E-mail</SelectItem>
                                <SelectItem value="ais">AIS-data</SelectItem>
                                <SelectItem value="logboek">Logboek</SelectItem>
                                <SelectItem value="verklaring">Verklaring</SelectItem>
                                <SelectItem value="ander">Ander</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="att-file">Bestand *</Label>
                            <Input
                              id="att-file"
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setAttachmentForm((f) => ({ ...f, file }))
                                }
                              }}
                              disabled={!!attachmentForm.id}
                            />
                            {attachmentForm.file && (
                              <p className="text-xs text-gray-500">
                                Geselecteerd: {attachmentForm.file.name} (
                                {(attachmentForm.file.size / 1024 / 1024).toFixed(2)}{" "}
                                MB)
                              </p>
                            )}
                            {attachmentForm.id && (
                              <p className="text-xs text-gray-500">
                                Bestand kan niet worden gewijzigd na upload.
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="att-description">Omschrijving</Label>
                            <Textarea
                              id="att-description"
                              rows={2}
                              value={attachmentForm.description}
                              onChange={(e) =>
                                setAttachmentForm((f) => ({
                                  ...f,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Korte omschrijving van de bijlage..."
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="att-date">Datum bijlage</Label>
                            <Input
                              id="att-date"
                              type="date"
                              value={attachmentForm.attachmentDate}
                              onChange={(e) =>
                                setAttachmentForm((f) => ({
                                  ...f,
                                  attachmentDate: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="att-link">Koppelen aan (optioneel)</Label>
                            <Select
                              value={
                                attachmentForm.linkedToTimelineEventId
                                  ? `timeline-${attachmentForm.linkedToTimelineEventId}`
                                  : attachmentForm.linkedToFactId
                                  ? `fact-${attachmentForm.linkedToFactId}`
                                  : attachmentForm.linkedToInterviewId
                                  ? `interview-${attachmentForm.linkedToInterviewId}`
                                  : attachmentForm.linkedToActionId
                                  ? `action-${attachmentForm.linkedToActionId}`
                                  : "none"
                              }
                              onValueChange={(value) => {
                                if (value === "none") {
                                  setAttachmentForm((f) => ({
                                    ...f,
                                    linkedToTimelineEventId: "",
                                    linkedToFactId: "",
                                    linkedToInterviewId: "",
                                    linkedToActionId: "",
                                  }))
                                } else if (value.startsWith("timeline-")) {
                                  setAttachmentForm((f) => ({
                                    ...f,
                                    linkedToTimelineEventId: value.replace(
                                      "timeline-",
                                      ""
                                    ),
                                    linkedToFactId: "",
                                    linkedToInterviewId: "",
                                    linkedToActionId: "",
                                  }))
                                } else if (value.startsWith("fact-")) {
                                  setAttachmentForm((f) => ({
                                    ...f,
                                    linkedToTimelineEventId: "",
                                    linkedToFactId: value.replace("fact-", ""),
                                    linkedToInterviewId: "",
                                    linkedToActionId: "",
                                  }))
                                } else if (value.startsWith("interview-")) {
                                  setAttachmentForm((f) => ({
                                    ...f,
                                    linkedToTimelineEventId: "",
                                    linkedToFactId: "",
                                    linkedToInterviewId: value.replace(
                                      "interview-",
                                      ""
                                    ),
                                    linkedToActionId: "",
                                  }))
                                } else if (value.startsWith("action-")) {
                                  setAttachmentForm((f) => ({
                                    ...f,
                                    linkedToTimelineEventId: "",
                                    linkedToFactId: "",
                                    linkedToInterviewId: "",
                                    linkedToActionId: value.replace("action-", ""),
                                  }))
                                }
                              }}
                            >
                              <SelectTrigger id="att-link">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Geen koppeling</SelectItem>
                                {timelineEvents.length > 0 && (
                                  <>
                                    <div className="px-2 py-1 text-xs font-semibold text-gray-500">
                                      Tijdlijn events
                                    </div>
                                    {timelineEvents.map((e) => (
                                      <SelectItem
                                        key={e.id}
                                        value={`timeline-${e.id}`}
                                      >
                                        Tijdlijn: {e.title}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                                {facts.length > 0 && (
                                  <>
                                    <div className="px-2 py-1 text-xs font-semibold text-gray-500">
                                      Feiten
                                    </div>
                                    {facts.map((f) => (
                                      <SelectItem key={f.id} value={`fact-${f.id}`}>
                                        Feit: {f.description.substring(0, 50)}
                                        {f.description.length > 50 ? "..." : ""}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                                {interviews.length > 0 && (
                                  <>
                                    <div className="px-2 py-1 text-xs font-semibold text-gray-500">
                                      Interviews
                                    </div>
                                    {interviews.map((i) => (
                                      <SelectItem
                                        key={i.id}
                                        value={`interview-${i.id}`}
                                      >
                                        Interview: {i.person_name}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                                {actions.length > 0 && (
                                  <>
                                    <div className="px-2 py-1 text-xs font-semibold text-gray-500">
                                      Acties
                                    </div>
                                    {actions.map((a) => (
                                      <SelectItem key={a.id} value={`action-${a.id}`}>
                                        Actie: {a.description.substring(0, 50)}
                                        {a.description.length > 50 ? "..." : ""}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetAttachmentForm}
                            >
                              Leeg formulier
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              disabled={uploadingFile || (!attachmentForm.file && !attachmentForm.id)}
                              onClick={async () => {
                                if (!attachmentForm.file && !attachmentForm.id) {
                                  alert("Selecteer een bestand om te uploaden.")
                                  return
                                }

                                try {
                                  setUploadingFile(true)

                                  let fileUrl = ""
                                  let fileName = ""
                                  let fileSize = 0
                                  let mimeType = ""

                                  if (attachmentForm.file) {
                                    // Upload naar Supabase Storage
                                    const safeFileName = attachmentForm.file.name.replace(
                                      /[^a-zA-Z0-9._-]/g,
                                      "_"
                                    )
                                    // NB: filePath is het pad BINNEN de bucket (dus zonder bucketnaam prefix)
                                    const filePath = `${reportId}/${Date.now()}-${safeFileName}`

                                    const { data: uploadData, error: uploadError } =
                                      await supabase.storage
                                        .from("incident-attachments")
                                        .upload(filePath, attachmentForm.file, {
                                          cacheControl: "3600",
                                          upsert: false,
                                        })

                                    if (uploadError) {
                                      throw new Error(
                                        `Storage upload fout: ${
                                          uploadError?.message ||
                                          uploadError?.error?.message ||
                                          String(uploadError)
                                        }`
                                      )
                                    }
                                    if (!uploadData?.path) {
                                      throw new Error("Storage upload fout: geen pad teruggekregen")
                                    }

                                    // Haal publieke URL op
                                    const {
                                      data: { publicUrl },
                                    } = supabase.storage
                                      .from("incident-attachments")
                                      .getPublicUrl(filePath)

                                    if (!publicUrl) {
                                      throw new Error(
                                        "Storage fout: geen publicUrl teruggekregen (bucket bestaat niet of is niet public)"
                                      )
                                    }

                                    fileUrl = publicUrl
                                    fileName = attachmentForm.file.name
                                    fileSize = attachmentForm.file.size
                                    mimeType = attachmentForm.file.type
                                  } else {
                                    // Bij bewerken: gebruik bestaande waarden
                                    const existing = attachments.find(
                                      (a) => a.id === attachmentForm.id
                                    )
                                    if (existing) {
                                      fileUrl = existing.file_url
                                      fileName = existing.file_name
                                      fileSize = existing.file_size || 0
                                      mimeType = existing.mime_type || ""
                                    }
                                  }

                                  const payload: any = {
                                    report_id: reportId,
                                    attachment_type: attachmentForm.attachmentType,
                                    file_name: fileName,
                                    file_url: fileUrl,
                                    file_size: fileSize,
                                    mime_type: mimeType,
                                    description: attachmentForm.description.trim() || null,
                                    attachment_date:
                                      attachmentForm.attachmentDate || null,
                                    linked_to_timeline_event_id:
                                      attachmentForm.linkedToTimelineEventId || null,
                                    linked_to_fact_id:
                                      attachmentForm.linkedToFactId || null,
                                    linked_to_interview_id:
                                      attachmentForm.linkedToInterviewId || null,
                                    linked_to_action_id:
                                      attachmentForm.linkedToActionId || null,
                                  }

                                  if (attachmentForm.id) {
                                    const { error } = await supabase
                                      .from("incident_attachments")
                                      .update(payload)
                                      .eq("id", attachmentForm.id)

                                    if (error) {
                                      throw new Error(
                                        `Database update fout: ${
                                          error?.message || error?.error?.message || String(error)
                                        }`
                                      )
                                    }
                                  } else {
                                    const { error } = await supabase
                                      .from("incident_attachments")
                                      .insert([payload])

                                    if (error) {
                                      throw new Error(
                                        `Database insert fout: ${
                                          error?.message || error?.error?.message || String(error)
                                        }`
                                      )
                                    }
                                  }

                                  await loadAttachments(reportId)
                                  resetAttachmentForm()
                                } catch (error: any) {
                                  console.error("Error saving attachment:", error)
                                  const message =
                                    error?.message ||
                                    error?.error?.message ||
                                    (typeof error === "string" ? error : "") ||
                                    String(error) ||
                                    "Onbekende fout"
                                  alert(
                                    `Fout bij opslaan bijlage: ${message}`
                                  )
                                } finally {
                                  setUploadingFile(false)
                                }
                              }}
                            >
                              {uploadingFile
                                ? "Uploaden..."
                                : attachmentForm.id
                                ? "Bijlage bijwerken"
                                : "Bijlage uploaden"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Overzicht bijlagen */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Overzicht bijlagen</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {loadingAttachments ? (
                            <p className="text-gray-500 text-xs">Laden...</p>
                          ) : attachments.length === 0 ? (
                            <p className="text-xs text-gray-400">
                              Nog geen bijlagen toegevoegd.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {attachments.map((att) => {
                                const typeLabels: Record<string, string> = {
                                  foto: "Foto",
                                  video: "Video",
                                  pdf: "PDF",
                                  email: "E-mail",
                                  ais: "AIS-data",
                                  logboek: "Logboek",
                                  verklaring: "Verklaring",
                                  ander: "Ander",
                                }

                                let linkedTo = ""
                                if (att.linked_to_timeline_event_id) {
                                  const event = timelineEvents.find(
                                    (e) => e.id === att.linked_to_timeline_event_id
                                  )
                                  linkedTo = event
                                    ? `Tijdlijn: ${event.title}`
                                    : "Tijdlijn event"
                                } else if (att.linked_to_fact_id) {
                                  const fact = facts.find(
                                    (f) => f.id === att.linked_to_fact_id
                                  )
                                  linkedTo = fact
                                    ? `Feit: ${fact.description.substring(0, 30)}...`
                                    : "Feit"
                                } else if (att.linked_to_interview_id) {
                                  const interview = interviews.find(
                                    (i) => i.id === att.linked_to_interview_id
                                  )
                                  linkedTo = interview
                                    ? `Interview: ${interview.person_name}`
                                    : "Interview"
                                } else if (att.linked_to_action_id) {
                                  const action = actions.find(
                                    (a) => a.id === att.linked_to_action_id
                                  )
                                  linkedTo = action
                                    ? `Actie: ${action.description.substring(0, 30)}...`
                                    : "Actie"
                                }

                                return (
                                  <div
                                    key={att.id}
                                    className={`border rounded-md p-3 space-y-1 bg-white text-xs ${
                                      selectedAttachment?.id === att.id
                                        ? "border-blue-500 bg-blue-50"
                                        : ""
                                    }`}
                                    onClick={() => setSelectedAttachment(att)}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 space-y-1">
                                        <div className="font-semibold">
                                          {typeLabels[att.attachment_type] || "Onbekend"}
                                        </div>
                                        <div className="text-gray-600">
                                          {att.file_name}
                                        </div>
                                        {att.description && (
                                          <div className="text-gray-500">
                                            {att.description}
                                          </div>
                                        )}
                                        {linkedTo && (
                                          <div className="text-blue-600 text-xs">
                                            🔗 {linkedTo}
                                          </div>
                                        )}
                                        {att.attachment_date && (
                                          <div className="text-gray-400 text-xs">
                                            {format(
                                              new Date(att.attachment_date),
                                              "d MMM yyyy",
                                              { locale: nl }
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="outline"
                                          size="xs"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(att.file_url, "_blank")
                                          }}
                                        >
                                          Openen
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="xs"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setAttachmentForm({
                                              id: att.id,
                                              attachmentType: att.attachment_type,
                                              description: att.description || "",
                                              attachmentDate: att.attachment_date || "",
                                              linkedToTimelineEventId:
                                                att.linked_to_timeline_event_id || "",
                                              linkedToFactId:
                                                att.linked_to_fact_id || "",
                                              linkedToInterviewId:
                                                att.linked_to_interview_id || "",
                                              linkedToActionId:
                                                att.linked_to_action_id || "",
                                              file: null,
                                            })
                                          }}
                                        >
                                          Bewerken
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="xs"
                                          onClick={async (e) => {
                                            e.stopPropagation()
                                            if (
                                              !confirm(
                                                "Weet je zeker dat je deze bijlage wilt verwijderen? Het bestand wordt ook uit de opslag verwijderd."
                                              )
                                            )
                                              return
                                            try {
                                              // Verwijder uit storage
                                              const filePath = att.file_url.split(
                                                "/incident-attachments/"
                                              )[1]
                                              if (filePath) {
                                                await supabase.storage
                                                  .from("incident-attachments")
                                                  .remove([filePath])
                                              }

                                              // Verwijder uit database
                                              const { error } = await supabase
                                                .from("incident_attachments")
                                                .delete()
                                                .eq("id", att.id)

                                              if (error) throw error
                                              await loadAttachments(reportId)
                                              if (selectedAttachment?.id === att.id) {
                                                setSelectedAttachment(null)
                                              }
                                            } catch (error: any) {
                                              console.error("Error deleting attachment:", error)
                                              alert(
                                                `Fout bij verwijderen: ${
                                                  error?.message ||
                                                  error?.error?.message ||
                                                  "Onbekende fout"
                                                }`
                                              )
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Detailweergave geselecteerde bijlage */}
                      {selectedAttachment && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">
                              Detailweergave – Bijlage
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div>
                              <div className="font-semibold text-xs text-gray-500">
                                Type
                              </div>
                              <div className="text-xs text-gray-800">
                                {selectedAttachment.attachment_type === "foto"
                                  ? "Foto"
                                  : selectedAttachment.attachment_type === "video"
                                  ? "Video"
                                  : selectedAttachment.attachment_type === "pdf"
                                  ? "PDF"
                                  : selectedAttachment.attachment_type === "email"
                                  ? "E-mail"
                                  : selectedAttachment.attachment_type === "ais"
                                  ? "AIS-data"
                                  : selectedAttachment.attachment_type === "logboek"
                                  ? "Logboek"
                                  : selectedAttachment.attachment_type === "verklaring"
                                  ? "Verklaring"
                                  : "Ander"}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-gray-500">
                                Bestandsnaam
                              </div>
                              <div className="text-xs text-gray-800">
                                {selectedAttachment.file_name}
                              </div>
                            </div>
                            {selectedAttachment.description && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Omschrijving
                                </div>
                                <div className="text-xs text-gray-800 whitespace-pre-wrap">
                                  {selectedAttachment.description}
                                </div>
                              </div>
                            )}
                            {selectedAttachment.attachment_date && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Datum
                                </div>
                                <div className="text-xs text-gray-800">
                                  {format(
                                    new Date(selectedAttachment.attachment_date),
                                    "d MMM yyyy",
                                    { locale: nl }
                                  )}
                                </div>
                              </div>
                            )}
                            {(selectedAttachment.linked_to_timeline_event_id ||
                              selectedAttachment.linked_to_fact_id ||
                              selectedAttachment.linked_to_interview_id ||
                              selectedAttachment.linked_to_action_id) && (
                              <div>
                                <div className="font-semibold text-xs text-gray-500">
                                  Gekoppeld aan
                                </div>
                                <div className="text-xs text-gray-800">
                                  {selectedAttachment.linked_to_timeline_event_id &&
                                    (() => {
                                      const event = timelineEvents.find(
                                        (e) =>
                                          e.id ===
                                          selectedAttachment.linked_to_timeline_event_id
                                      )
                                      return event
                                        ? `Tijdlijn: ${event.title}`
                                        : "Tijdlijn event"
                                    })()}
                                  {selectedAttachment.linked_to_fact_id &&
                                    (() => {
                                      const fact = facts.find(
                                        (f) =>
                                          f.id === selectedAttachment.linked_to_fact_id
                                      )
                                      return fact
                                        ? `Feit: ${fact.description.substring(0, 50)}...`
                                        : "Feit"
                                    })()}
                                  {selectedAttachment.linked_to_interview_id &&
                                    (() => {
                                      const interview = interviews.find(
                                        (i) =>
                                          i.id ===
                                          selectedAttachment.linked_to_interview_id
                                      )
                                      return interview
                                        ? `Interview: ${interview.person_name}`
                                        : "Interview"
                                    })()}
                                  {selectedAttachment.linked_to_action_id &&
                                    (() => {
                                      const action = actions.find(
                                        (a) =>
                                          a.id === selectedAttachment.linked_to_action_id
                                      )
                                      return action
                                        ? `Actie: ${action.description.substring(0, 50)}...`
                                        : "Actie"
                                    })()}
                                </div>
                              </div>
                            )}
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  window.open(selectedAttachment.file_url, "_blank")
                                }
                              >
                                Bestand openen
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "rapport" && (
                <div className="space-y-4 text-sm text-gray-800">
                  {!reportId && (
                    <Card>
                      <CardContent className="py-4 text-sm text-gray-600">
                        Sla eerst <strong>Basis &amp; Reis</strong> op voordat je
                        een rapportpreview bekijkt.
                      </CardContent>
                    </Card>
                  )}

                  {reportId && currentReport && (
                    <>
                      <Card>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-base">
                                Rapport Preview
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                Bekijk hieronder de volledige rapportopbouw. Klik op
                                "Genereer PDF" om het rapport te exporteren met het
                                bedrijfsbriefhoofd.
                              </p>
                            </div>
                            <Button
                              onClick={generatePDF}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Genereer PDF
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    <div className="border rounded-md bg-white p-4 md:p-6 space-y-6 max-h-[75vh] overflow-auto">
                      {/* Titel */}
                      <div>
                        <h3 className="text-lg font-semibold">
                          Incidentrapport – {currentReport.title || "Zonder titel"}
                        </h3>
                        {currentReport.incident_date && (
                          <p className="text-xs text-gray-500">
                            Datum incident: {formatDateSafe(currentReport.incident_date)}
                          </p>
                        )}
                      </div>

                      {/* 1.1 Barge information / scheepsinformatie */}
                      <section className="space-y-1">
                        <h4 className="font-semibold text-sm uppercase tracking-wide">
                          1.1 Barge information
                        </h4>
                        <div className="text-xs space-y-0.5">
                          {currentReport.incident_type && (
                            <p>
                              <span className="font-semibold">Type incident: </span>
                              {currentReport.incident_type}
                            </p>
                          )}
                          {(currentReport.internal_company || currentReport.external_company) && (
                            <p>
                              <span className="font-semibold">Bedrijf: </span>
                              {currentReport.internal_company || currentReport.external_company}
                            </p>
                          )}
                          {(currentReport.internal_ship_id || currentReport.external_ship_name) && (
                            <p>
                              <span className="font-semibold">Schip: </span>
                              {currentReport.external_ship_name ||
                                ships.find((s: any) => s.id === currentReport.internal_ship_id)
                                  ?.name ||
                                "Onbekend"}
                            </p>
                          )}
                          {currentReport.location_description && (
                            <p>
                              <span className="font-semibold">Locatie: </span>
                              {currentReport.location_description}
                            </p>
                          )}
                          {currentReport.location_gps && (
                            <p>
                              <span className="font-semibold">GPS: </span>
                              {currentReport.location_gps}
                            </p>
                          )}
                        </div>
                      </section>

                      {/* 1.2 Voyage information */}
                      {(currentReport.voyage_from ||
                        currentReport.voyage_to ||
                        currentReport.departure_date ||
                        currentReport.arrival_date) && (
                        <section className="space-y-1">
                          <h4 className="font-semibold text-sm uppercase tracking-wide">
                            1.2 Voyage information
                          </h4>
                          <div className="text-xs space-y-0.5">
                            {(currentReport.voyage_from || currentReport.voyage_to) && (
                              <p>
                                <span className="font-semibold">Reis: </span>
                                {currentReport.voyage_from || "Onbekend"} {"→"}{" "}
                                {currentReport.voyage_to || "Onbekend"}
                              </p>
                            )}
                            {(currentReport.departure_date || currentReport.arrival_date) && (
                              <p>
                                <span className="font-semibold">Periode: </span>
                                {formatDateSafe(currentReport.departure_date) || "Onbekend"} {"–"}{" "}
                                {formatDateSafe(currentReport.arrival_date) || "Onbekend"}
                              </p>
                            )}
                            {typeof currentReport.loaded === "boolean" && (
                              <p>
                                <span className="font-semibold">Belading: </span>
                                {currentReport.loaded ? "Geladen" : "Leeg"}
                              </p>
                            )}
                            {currentReport.product && (
                              <p>
                                <span className="font-semibold">Product: </span>
                                {currentReport.product}
                              </p>
                            )}
                            {currentReport.quantity && (
                              <p>
                                <span className="font-semibold">Hoeveelheid: </span>
                                {currentReport.quantity}
                              </p>
                            )}
                            {(currentReport.weather_conditions ||
                              currentReport.visibility ||
                              currentReport.water_influence) && (
                              <p>
                                <span className="font-semibold">Weer en omstandigheden: </span>
                                {[
                                  currentReport.weather_conditions,
                                  currentReport.visibility,
                                  currentReport.water_influence,
                                ]
                                  .filter(Boolean)
                                  .join(" | ")}
                              </p>
                            )}
                            {currentReport.cargo_hazards && (
                              <p>
                                <span className="font-semibold">Gevaren product: </span>
                                {currentReport.cargo_hazards}
                              </p>
                            )}
                          </div>
                        </section>
                      )}

                      {/* 1.3 Brief description of the incident / feitenoverzicht (kort) */}
                      {(timelineEvents.length > 0 || facts.length > 0) && (
                        <section className="space-y-2">
                          <h4 className="font-semibold text-sm uppercase tracking-wide">
                            1.3 Brief description of the incident
                          </h4>
                          {facts.length > 0 && (
                            <div className="text-xs space-y-0.5">
                              <p className="font-semibold mt-1">Samenvatting feiten:</p>
                              {facts.map((f) => (
                                <p key={f.id}>
                                  [{f.category}] {f.description}
                                  {f.certainty && f.certainty !== "zeker"
                                    ? ` (zekerheid: ${f.certainty})`
                                    : ""}
                                </p>
                              ))}
                            </div>
                          )}
                        </section>
                      )}

                      {/* 1.6 Incident description (uitgebreide lopende tekst) */}
                      {(timelineEvents.length > 0 || facts.length > 0) && (
                        <section className="space-y-2">
                          <h4 className="font-semibold text-sm uppercase tracking-wide">
                            1.6 Incident description
                          </h4>
                          <p className="text-xs whitespace-pre-wrap">
                            {generateIncidentNarrative() ||
                              "Er zijn nog onvoldoende gegevens ingevoerd om een uitgebreide incidentbeschrijving te genereren."}
                          </p>
                        </section>
                      )}

                      {/* 1.5 Time sheet of the incident (tijdlijn) */}
                      {timelineEvents.length > 0 && (
                        <section className="space-y-2">
                          <h4 className="font-semibold text-sm uppercase tracking-wide">
                            1.5 Time sheet of the incident
                          </h4>
                          <div className="text-xs space-y-0.5">
                            {timelineEvents
                              .slice()
                              .sort(
                                (a, b) =>
                                  new Date(a.event_time || a.created_at).getTime() -
                                  new Date(b.event_time || b.created_at).getTime()
                              )
                              .map((e) => (
                                <p key={e.id}>
                                  {e.event_time
                                    ? format(new Date(e.event_time), "d MMM yyyy HH:mm", {
                                        locale: nl,
                                      })
                                    : "Zonder tijdstip"}
                                  {": "}
                                  {e.title}
                                </p>
                              ))}
                          </div>
                        </section>
                      )}

                      {/* 1.7 Manning (interviews & betrokkenen) */}
                      {(interviews.length > 0 || participants.length > 0) && (
                        <section className="space-y-2">
                          <h4 className="font-semibold text-sm uppercase tracking-wide">
                            1.7 Manning
                          </h4>
                          {participants.length > 0 && (
                            <div className="text-xs space-y-0.5">
                              <p className="font-semibold">Betrokkenen (overzicht):</p>
                              {participants.map((p) => (
                                <p key={p.id}>
                                  {p.name}{" "}
                                  {p.role ? `(${p.role}${p.company ? `, ${p.company}` : ""})` : ""}
                                  {p.direct_involved ? " – Direct betrokken" : ""}
                                </p>
                              ))}
                            </div>
                          )}
                          {interviews.length > 0 && (
                            <div className="space-y-2 text-xs">
                              <p className="font-semibold mt-1">
                                Manning tijdens het incident (samenvatting per persoon):
                              </p>
                              <div className="overflow-auto border rounded-md bg-white">
                                <table className="w-full border-collapse text-[11px]">
                                  <thead>
                                    <tr>
                                      <th className="border px-2 py-1 text-left font-semibold bg-gray-50">
                                        1.7 Manning
                                      </th>
                                      {interviews.map((i) => (
                                        <th
                                          key={i.id}
                                          className="border px-2 py-1 text-left font-semibold bg-gray-50"
                                        >
                                          <div>{i.person_name || "Onbekend"}</div>
                                          {i.role && (
                                            <div className="text-[10px] text-gray-600">{i.role}</div>
                                          )}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">Rank / functie</td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.role || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">
                                        Rhine patent
                                      </td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.rhine_patent || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">
                                        Sailing licence
                                      </td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.sailing_licence || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">
                                        Radar license
                                      </td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.radar_license || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">
                                        VHF-Certificate
                                      </td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.vhf_certificate || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">ADN Basic</td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.adn_basic || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">ADN-C</td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.adn_c || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">
                                        Experience on this barge / voyage
                                      </td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.experience || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">
                                        Experience in tank barges
                                      </td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.tank_barge_experience || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">
                                        Hours rest before coming on watch
                                      </td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.rest_hours || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr>
                                      <td className="border px-2 py-1 font-semibold">
                                        Hours work before incident (48h)
                                      </td>
                                      {interviews.map((i) => (
                                        <td key={i.id} className="border px-2 py-1">
                                          {i.work_hours_48h || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </section>
                      )}

                      {/* 2. Analysis */}
                      {analysisItems.length > 0 && (
                        <section className="space-y-2">
                          <h4 className="font-semibold text-sm uppercase tracking-wide">
                            2. Analysis
                          </h4>
                          <div className="text-xs space-y-1">
                            {analysisItems.map((a) => (
                              <p key={a.id}>
                                <span className="font-semibold">
                                  {a.analysis_type === "directe_aanleiding"
                                    ? "Directe aanleiding"
                                    : a.analysis_type === "bijdragende_factor"
                                    ? "Bijdragende factor"
                                    : a.analysis_type === "barriere"
                                    ? "Barrière"
                                    : "Conclusie"}
                                  {a.category ? ` (${a.category})` : ""}:{" "}
                                </span>
                                {a.description}
                              </p>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* 3. Corrective / preventive measures (actions) */}
                      {actions.length > 0 && (
                        <section className="space-y-2">
                          <h4 className="font-semibold text-sm uppercase tracking-wide">
                            3. Corrective / preventive measures
                          </h4>
                          <div className="text-xs space-y-1">
                            {actions.map((a) => (
                              <p key={a.id}>
                                <span className="font-semibold">
                                  Actie ({a.status || "onbekend"}):{" "}
                                </span>
                                {a.description}
                                {a.responsible ? ` – verantwoordelijk: ${a.responsible}` : ""}
                                {a.deadline
                                  ? ` – deadline: ${formatDateSafe(a.deadline)}`
                                  : ""}
                              </p>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* 4. Lessons learned */}
                      {lessonsLearned.length > 0 && (
                        <section className="space-y-2">
                          <h4 className="font-semibold text-sm uppercase tracking-wide">
                            4. Lessons learned
                          </h4>
                          <div className="text-xs space-y-1">
                            {lessonsLearned.map((l) => (
                              <p key={l.id}>
                                <span className="font-semibold">
                                  {l.category === "operationeel"
                                    ? "Operationeel"
                                    : l.category === "technisch"
                                    ? "Technisch"
                                    : "Organisatorisch"}
                                  {": "}
                                </span>
                                {l.lesson}
                              </p>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Appendix (bijlagen) */}
                      {attachments.length > 0 && (
                        <section className="space-y-2">
                          <h4 className="font-semibold text-sm uppercase tracking-wide">
                            Appendix (bijlagen)
                          </h4>
                          <div className="text-xs space-y-0.5">
                            {attachments.map((att) => (
                              <p key={att.id}>
                                {att.file_name}{" "}
                                <span className="text-gray-500">
                                  ({att.attachment_type || "bijlage"})
                                </span>
                              </p>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}

