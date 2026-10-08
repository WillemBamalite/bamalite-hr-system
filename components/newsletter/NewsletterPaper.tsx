"use client"

import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { figuresMonthLabel, parseFlexibleDate, type NewsletterEvents } from "@/utils/newsletter-events"
import {
  OPS_CATEGORIES,
  type NewsletterChart,
  type NewsletterContent,
  type OpsCategory,
  type WorkshopEntry,
} from "@/utils/newsletter-content"

type Props = {
  month: Date
  events: NewsletterEvents
  content: NewsletterContent
  crew: any[]
  ships: any[]
}

const OPS_ORDER: OpsCategory[] = ["klasse", "werf", "biq", "vetting", "inspectie"]

function shipNameOf(ships: any[], shipId: string) {
  const ship = (ships || []).find((item) => String(item.id) === shipId)
  return ship ? String(ship.name || "").trim() : ""
}

function crewNameOf(crew: any[], crewId: string) {
  const member = (crew || []).find((item) => String(item.id) === crewId)
  if (!member) return ""
  return `${member.first_name || ""} ${member.last_name || ""}`.trim()
}

function chartPoints(chart: NewsletterChart) {
  return chart.points
    .map((point) => ({
      label: point.label.trim(),
      value: Number(String(point.value).replace("%", "").replace(",", ".").trim()),
    }))
    .filter((point) => point.label && Number.isFinite(point.value))
}

function FleetChart({ chart }: { chart: NewsletterChart }) {
  const points = chartPoints(chart)
  if (!chart.title.trim() || points.length === 0) return null

  const max = Math.max(...points.map((point) => point.value), 1)
  const width = 680
  const height = 176
  const padX = 16
  const padTop = 16
  const padBottom = 42
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom

  if (chart.type === "line") {
    const step = points.length === 1 ? 0 : innerW / (points.length - 1)
    const coords = points.map((point, index) => ({
      ...point,
      x: padX + index * step,
      y: padTop + innerH - (Math.max(point.value, 0) / max) * innerH,
    }))
    const path = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ")
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="np-chart-svg" role="img" aria-label={chart.title}>
        <line x1={padX} y1={padTop + innerH} x2={width - padX} y2={padTop + innerH} className="np-chart-base" />
        <path d={path} className="np-chart-line" />
        {coords.map((point) => (
          <g key={`${point.label}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="3.5" className="np-chart-dot" />
            <text x={point.x} y={point.y - 8} textAnchor="middle" className="np-chart-value">
              {point.value}
            </text>
            <text x={point.x} y={height - 16} textAnchor="middle" className="np-chart-label">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    )
  }

  const gap = 14
  const barWidth = Math.min(42, (innerW - gap * Math.max(points.length - 1, 0)) / points.length)
  const total = barWidth * points.length + gap * Math.max(points.length - 1, 0)
  const start = padX + (innerW - total) / 2

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="np-chart-svg" role="img" aria-label={chart.title}>
      <line x1={padX} y1={padTop + innerH} x2={width - padX} y2={padTop + innerH} className="np-chart-base" />
      {points.map((point, index) => {
        const barHeight = (Math.max(point.value, 0) / max) * innerH
        const x = start + index * (barWidth + gap)
        const y = padTop + innerH - barHeight
        return (
          <g key={`${point.label}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 0)} className="np-chart-bar" />
            <text x={x + barWidth / 2} y={Math.max(y - 6, 12)} textAnchor="middle" className="np-chart-value">
              {point.value}
            </text>
            <text x={x + barWidth / 2} y={height - 16} textAnchor="middle" className="np-chart-label">
              {point.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function workshopDate(value: string) {
  const parsed = parseFlexibleDate(value)
  if (!parsed) return value.trim()
  return format(parsed, "dd-MM-yyyy")
}

function filledWorkshop(items: WorkshopEntry[] | undefined) {
  return (items || []).filter((item) => item.name.trim())
}

function ManualOfficePaper({
  rubric,
  meta,
  logoSrc,
  logoAlt,
  joining,
  birthdays,
  anniversaries,
  news,
}: {
  rubric: string
  meta: string
  logoSrc: string
  logoAlt: string
  joining: WorkshopEntry[]
  birthdays: WorkshopEntry[]
  anniversaries: WorkshopEntry[]
  news: string
}) {
  return (
    <section className="np-block">
      <div className="np-workshop-head">
        <div>
          <div className="np-rubric">{rubric}</div>
          <div className="np-meta">{meta}</div>
        </div>
        <img src={logoSrc} alt={logoAlt} className="np-workshop-logo" />
      </div>
      {joining.length > 0 ? (
        <div className="np-block">
          <span className="np-label">Nieuw in dienst</span>
          {joining.map((person) => (
            <div key={person.id} className="np-person">
              <div className="np-person-name">{person.name}</div>
              <div className="np-person-meta">
                {[person.role, person.date ? `in dienst vanaf ${workshopDate(person.date)}` : ""].filter(Boolean).join(" • ")}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {birthdays.length > 0 ? (
        <div className="np-block">
          <span className="np-label">Verjaardagen</span>
          {birthdays.map((person) => (
            <div key={person.id} className="np-person">
              <div className="np-person-name">{person.name}</div>
              {person.date ? <div className="np-person-meta">jarig op {workshopDate(person.date)}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
      {anniversaries.length > 0 ? (
        <div className="np-block">
          <span className="np-label">Dienstjubilea</span>
          {anniversaries.map((person) => (
            <div key={person.id} className="np-person">
              <div className="np-person-name">
                {person.years.trim() ? `${person.years.trim()} jaar — ` : ""}
                {person.name}
              </div>
              <div className="np-person-meta">
                {[person.role, person.date ? workshopDate(person.date) : ""].filter(Boolean).join(" • ")}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {news.trim() ? <p className="np-plain">{news.trim()}</p> : null}
    </section>
  )
}

function agendaParts(date: string) {
  if (!date) return null
  const parsed = parseFlexibleDate(date)
  if (!parsed) return null
  return {
    day: format(parsed, "dd", { locale: nl }),
    month: format(parsed, "MMM", { locale: nl }).replace(".", ""),
  }
}

export function NewsletterPaper({ month, events, content, crew, ships }: Props) {
  const monthTitle = format(month, "MMMM yyyy", { locale: nl })
  const monthTitleCap = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)
  const edition = String(month.getMonth() + 1).padStart(2, "0")
  const year = month.getFullYear()
  const footerLeft = `Bamalite Scheepsnieuws  •  ${monthTitleCap}  •  Interne distributie`.replace(/["\\]/g, "")

  const kpis = content.kpis.filter((item) => item.value.trim() || item.title.trim())
  const spotlight = content.spotlight
  const spotlightName = spotlight.type === "ship" ? shipNameOf(ships, spotlight.shipId) : crewNameOf(crew, spotlight.crewId)
  const spotlightPhotos = (spotlight.photos?.length ? spotlight.photos : spotlight.photoDataUrl ? [spotlight.photoDataUrl] : []).filter(Boolean)
  const spotlightBits = [spotlight.intro, spotlight.functie, spotlight.special, spotlight.fact, spotlight.quote, spotlightName, ...spotlightPhotos]
    .some((value) => String(value || "").trim())
  const opsItems = OPS_ORDER.filter((category) => category !== "vetting").flatMap((category) =>
    content.opsItems.filter((item) => item.category === category && (item.shipId || item.period.trim() || item.note.trim())),
  )
  const showChart = chartPoints(content.chart).length > 0 && Boolean(content.chart.title.trim())
  const showSafety = Boolean(content.safety.title.trim() || content.safety.text.trim() || content.safety.photoDataUrl)
  const lesson = content.lesson || { title: "", text: "", incidentId: "", incidentLabel: "" }
  const showLesson = Boolean(lesson.title.trim() || lesson.text.trim())
  const photos = content.photos.filter((photo) => photo.imageDataUrl)
  const feature = photos[0]
  const gallery = photos.slice(1)
  const agenda = [...content.agenda]
    .filter((item) => item.date || item.title.trim() || item.note.trim() || item.shipId)
    .sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date)
      if (a.date) return -1
      if (b.date) return 1
      return 0
    })
  const workshopBirthdays = filledWorkshop(content.workshopBirthdays)
  const workshopJoining = filledWorkshop(content.workshopJoining)
  const workshopAnniversaries = filledWorkshop(content.workshopAnniversaries)
  const showWorkshop = Boolean(
    workshopBirthdays.length || workshopJoining.length || workshopAnniversaries.length || (content.workshopNews || "").trim(),
  )
  const hiddenPeople = new Set(content.hiddenPeople || [])
  const joining = events.joining.filter((person) => !hiddenPeople.has(person.id))
  const birthdays = events.birthdays.filter((person) => !hiddenPeople.has(person.id))
  const anniversaries = events.anniversaries.filter((person) => !hiddenPeople.has(person.id))
  const showOffice = Boolean(content.officeUpdates.trim() || content.officeClosing.trim())
  const showPeople = joining.length > 0 || birthdays.length > 0 || anniversaries.length > 0
  const showFleet = Boolean(content.opsUpdate.trim()) || opsItems.length > 0 || showChart || showSafety
  const showFromShips = photos.length > 0 || agenda.length > 0 || showOffice
  const birthdayColumns = birthdays.length >= 9 ? 3 : birthdays.length >= 4 ? 2 : 1

  const css = `
    .newsletter-print-root { display: none; }
    .newsletter-print-root.is-preview { display: block; }
    .np-sheet {
      color: #1c1915;
      font-family: var(--font-news-sans), "Segoe UI", sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .np-sheet * { box-sizing: border-box; }
    .np-display { font-family: var(--font-news-display), Georgia, "Palatino Linotype", serif; }
    .np-mast { padding-bottom: 2.5mm; margin-bottom: 5mm; border-bottom: 3.5px solid #10243f; }
    .np-mast-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; }
    .np-brand { display: flex; align-items: center; gap: 4.5mm; }
    .np-logo {
      width: 28mm; height: 28mm; border-radius: 999px; object-fit: cover; display: block;
      border: 0; background: transparent;
    }
    .np-workshop-head { display: flex; align-items: center; justify-content: space-between; gap: 4mm; margin-bottom: 2.5mm; }
    .np-workshop-logo { height: 16mm; width: auto; max-width: 68mm; object-fit: contain; display: block; }
    .np-brand-kicker {
      font-size: 11pt; letter-spacing: 0.32em; color: #9c7c45; font-weight: 700;
    }
    .np-brand-title {
      font-family: var(--font-news-display), Georgia, serif;
      font-size: 36pt; line-height: 0.9; letter-spacing: 0.01em; color: #10243f; font-weight: 700;
    }
    .np-brand-month { margin-top: 1.5mm; font-size: 13pt; color: #10243f; font-weight: 600; }
    .np-edition { text-align: right; color: #10243f; }
    .np-edition-label { font-size: 9pt; letter-spacing: 0.2em; color: #9c7c45; font-weight: 700; }
    .np-edition-num {
      font-family: var(--font-news-display), Georgia, serif;
      font-size: 28pt; line-height: 0.9; font-weight: 700;
    }
    .np-edition-year { font-size: 11pt; letter-spacing: 0.14em; font-weight: 700; }
    .np-tagline {
      margin-top: 3mm; padding-top: 1.5mm; border-top: 1.5px solid #9c7c45;
      font-size: 8.5pt; letter-spacing: 0.18em; text-transform: uppercase;
      color: #10243f; text-align: center; font-weight: 700;
    }
    .np-rule { border: 0; border-top: 1px solid #d9d1c3; margin: 4.5mm 0 3.5mm; }
    .np-part {
      display: flex; align-items: center; gap: 3mm; margin: 5mm 0 3mm;
      break-after: avoid; page-break-after: avoid;
      font-size: 12pt; letter-spacing: 0.12em; text-transform: uppercase; color: #9c7c45; font-weight: 700; line-height: 1.25;
    }
    .np-part:before, .np-part:after { content: ""; flex: 1; height: 1px; background: #d9d1c3; }
    .np-rubric {
      margin: 0 0 1.5mm; font-size: 12pt; letter-spacing: 0.1em; text-transform: uppercase; line-height: 1.25;
      color: #9c7c45; font-weight: 700; break-after: avoid; page-break-after: avoid;
    }
    .np-blurb {
      margin: 0 0 2.5mm; font-family: var(--font-news-display), Georgia, serif;
      font-style: italic; font-size: 11pt; line-height: 1.4; color: #10243f;
    }
    .np-h { margin: 0 0 2mm; font-size: 16pt; line-height: 1.15; color: #10243f; font-weight: 700; }
    .np-lead {
      margin: 0 0 4.5mm; font-family: var(--font-news-display), Georgia, serif;
      font-size: 12.5pt; line-height: 1.55; color: #1c1915;
    }
    .np-block { margin: 0 0 4.5mm; }
    .np-sheet > .np-block + .np-block:not(.np-chart),
    .np-sheet > .np-spot + .np-block:not(.np-chart),
    .np-sheet > .np-block + .np-spot,
    .np-sheet > .np-lead + .np-spot,
    .np-sheet > .np-mast + .np-spot,
    .np-sheet > .np-safety + .np-block:not(.np-chart),
    .np-sheet > .np-safety + .np-spot {
      margin-top: 1.5mm;
      padding-top: 4mm;
      border-top: 1px solid #d9d1c3;
    }
    .np-keep, .np-person, .np-bday, .np-jubilee, .np-ops, .np-agenda, .np-kpi, figure {
      break-inside: avoid; page-break-inside: avoid;
    }
    .np-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-bottom: 5mm; }
    .np-kpi { padding-top: 1mm; border-top: 2px solid #9c7c45; }
    .np-kpi-value {
      font-family: var(--font-news-display), Georgia, serif;
      font-size: 26pt; line-height: 1; color: #10243f; font-weight: 700;
    }
    .np-kpi-title { margin-top: 1mm; font-size: 8pt; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; color: #10243f; }
    .np-kpi-note { margin-top: 0.6mm; font-size: 9pt; color: #5c6570; }
    .np-spot {
      display: grid; grid-template-columns: 1.4fr 0.8fr; gap: 5mm; margin-bottom: 5mm; align-items: start;
      break-inside: avoid; page-break-inside: avoid;
    }
    .np-spot.no-photo { grid-template-columns: 1fr; }
    .np-spot-photos { display: flex; flex-direction: column; gap: 2.5mm; }
    .np-spot-name { font-size: 20pt; margin: 0 0 1.5mm; color: #10243f; line-height: 1.05; }
    .np-spot-role { margin: -0.5mm 0 2mm; font-size: 9pt; letter-spacing: 0.12em; text-transform: uppercase; color: #5c6570; }
    .np-spot p { margin: 0 0 2mm; }
    .np-label { display: block; margin-bottom: 1mm; font-size: 12pt; letter-spacing: 0.08em; text-transform: uppercase; color: #9c7c45; font-weight: 700; line-height: 1.25; }
    .np-quote {
      margin: 2mm 0 0; padding: 0 0 0 3.5mm; border-left: 2px solid #9c7c45;
      font-family: var(--font-news-display), Georgia, serif; font-style: italic; font-size: 12pt; line-height: 1.4; color: #10243f;
    }
    .np-spot-photo { margin: 0; }
    .np-feature img, .np-safety img { width: 100%; display: block; object-fit: contain; background: #f6f3ec; }
    .np-spot-photo img { width: 100%; height: auto; display: block; }
    .np-cols-2 { columns: 2; column-gap: 7mm; }
    .np-person { break-inside: avoid; margin: 0 0 2.2mm; }
    .np-person-name { font-weight: 700; color: #10243f; }
    .np-person-meta { color: #3d4a5c; font-size: 10pt; }
    .np-bdays { column-gap: 6mm; margin-top: 1mm; }
    .np-bday { display: flex; gap: 2.5mm; margin: 0 0 1.1mm; font-size: 10pt; }
    .np-bday-date { width: 16mm; flex: none; font-weight: 700; color: #10243f; font-variant-numeric: tabular-nums; text-transform: lowercase; }
    .np-jubilees { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
    .np-jubilee {
      display: flex; gap: 3mm; align-items: center; border-top: 1px solid #d9d1c3; padding-top: 2mm;
    }
    .np-years { min-width: 16mm; color: #10243f; }
    .np-years strong {
      display: block; font-family: var(--font-news-display), Georgia, serif; font-size: 22pt; line-height: 0.9;
    }
    .np-years span { font-size: 8pt; letter-spacing: 0.12em; text-transform: uppercase; color: #9c7c45; }
    .np-jubilee h3 { margin: 0; font-family: var(--font-news-sans), "Segoe UI", sans-serif; font-size: 11pt; font-weight: 700; }
    .np-jubilee p { margin: 0; color: #3d4a5c; font-size: 9.5pt; }
    .np-ops-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 5mm; }
    .np-ops { border-top: 1px solid #d9d1c3; padding-top: 1.6mm; }
    .np-ops-ship { font-size: 12pt; font-weight: 700; color: #10243f; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.25; }
    .np-ops-meta { font-size: 12pt; letter-spacing: 0.08em; text-transform: uppercase; color: #9c7c45; font-weight: 700; line-height: 1.25; }
    .np-ops p, .np-plain { margin: 0.8mm 0 0; }
    .np-chart { background: #f7f4ee; border-top: 2px solid #9c7c45; padding: 3mm 3mm 1mm; }
    .np-chart-svg { width: 100%; height: auto; display: block; }
    .np-chart-base { stroke: #d9d1c3; stroke-width: 1; }
    .np-chart-bar { fill: #10243f; }
    .np-chart-line { fill: none; stroke: #10243f; stroke-width: 1.6; }
    .np-chart-dot { fill: #9c7c45; }
    .np-chart-value, .np-chart-label { font-family: var(--font-news-sans), "Segoe UI", sans-serif; fill: #10243f; }
    .np-chart-value { font-size: 10px; font-weight: 700; }
    .np-chart-label { font-size: 10px; fill: #3d4a5c; }
    .np-safety {
      display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 4mm; background: #10243f; color: white;
      padding: 4mm; break-inside: avoid; page-break-inside: avoid;
    }
    .np-safety.no-photo { grid-template-columns: 1fr; }
    .np-safety .np-rubric { color: #d4bc86; }
    .np-safety .np-h, .np-safety p { color: white; }
    .np-safety p { margin: 0; font-size: 11pt; line-height: 1.45; }
    .np-safety img { max-height: 48mm; background: #0c1c33; }
    .np-lesson {
      padding: 3.5mm 4mm; background: #f7f4ee; border-left: 3px solid #9c7c45;
      break-inside: avoid; page-break-inside: avoid;
    }
    .np-lesson-ref { margin: 2mm 0 0; font-size: 9.5pt; color: #3d4a5c; }
    .np-feature { margin: 0 0 3mm; }
    .np-feature img { max-height: 92mm; }
    .np-feature-kicker { margin-top: 2mm; }
    .np-caption { margin: 1mm 0 0; font-family: var(--font-news-display), Georgia, serif; font-style: italic; font-size: 12pt; }
    .np-meta { margin: 0.4mm 0 0; font-size: 9pt; letter-spacing: 0.08em; text-transform: uppercase; color: #5c6570; }
    .np-gallery { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; }
    .np-gallery.two { grid-template-columns: 1fr 1fr; }
    .np-gallery.one { grid-template-columns: 1fr; }
    .np-gallery figure { margin: 0; }
    .np-gallery img { width: 100%; height: 38mm; object-fit: contain; background: #f6f3ec; display: block; }
    .np-gallery figcaption { margin-top: 1mm; font-size: 8.5pt; color: #3d4a5c; }
    .np-agenda { display: grid; grid-template-columns: 18mm 1fr; gap: 2mm 3mm; margin-bottom: 2.4mm; }
    .np-date { color: #10243f; }
    .np-date strong { display: block; font-family: var(--font-news-display), Georgia, serif; font-size: 14pt; line-height: 1; }
    .np-date span { font-size: 8pt; letter-spacing: 0.12em; text-transform: uppercase; color: #9c7c45; }
    .np-agenda h3 { margin: 0; font-size: 11pt; font-family: var(--font-news-sans), "Segoe UI", sans-serif; text-transform: uppercase; letter-spacing: 0.04em; }
    .np-agenda p { margin: 0.3mm 0 0; color: #3d4a5c; }
    .np-closing {
      margin: 2mm 0 0; font-family: var(--font-news-display), Georgia, serif; font-style: italic; color: #10243f;
    }
    @media screen {
      .newsletter-print-root.is-preview { background: #e6e0d4; padding: 28px 12px 48px; }
      .newsletter-print-root.is-preview .np-sheet {
        width: 186mm; margin: 0 auto; background: white; padding: 8mm 8mm 10mm;
        box-shadow: 0 16px 40px rgba(16, 36, 63, 0.16);
      }
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 11mm 12mm 16mm 12mm;
        @bottom-left {
          content: "${footerLeft}";
          font-family: "Segoe UI", sans-serif;
          font-size: 8pt;
          color: #6b7280;
        }
        @bottom-right {
          content: counter(page, decimal-leading-zero) "  /  " counter(pages, decimal-leading-zero);
          font-family: "Segoe UI", sans-serif;
          font-size: 8pt;
          color: #10243f;
        }
      }
      .newsletter-print-root { display: block !important; background: white !important; padding: 0 !important; }
      .newsletter-editor, .dashboard-header, .print-header { display: none !important; }
      .np-sheet { width: auto !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; background: white !important; }
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <article className="np-sheet">
        <header className="np-mast">
          <div className="np-mast-top">
            <div className="np-brand">
              <img src="/bemanningslijst-icon.png.png" alt="Bamalite" className="np-logo" />
              <div>
                <div className="np-brand-kicker">Bamalite</div>
                <div className="np-brand-title">Scheepsnieuws</div>
                <div className="np-brand-month">{monthTitleCap}</div>
              </div>
            </div>
            <div className="np-edition">
              <div className="np-edition-label">Editie</div>
              <div className="np-edition-num">{edition}</div>
              <div className="np-edition-year">{year}</div>
            </div>
          </div>
          <div className="np-tagline">Mensen · Schepen · Operatie · Veiligheid · Foto&apos;s · Vooruitblik</div>
        </header>

        {content.intro.trim() ? <p className="np-lead">{content.intro.trim()}</p> : null}

        {kpis.length > 0 ? (
          <section className="np-block">
            <div className="np-rubric">{figuresMonthLabel(month)}</div>
            <div className="np-kpis" style={{ gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))` }}>
              {kpis.map((item) => (
                <div key={item.id} className="np-kpi">
                  {item.value.trim() ? <div className="np-kpi-value">{item.value.trim()}</div> : null}
                  {item.title.trim() ? <div className="np-kpi-title">{item.title.trim()}</div> : null}
                  {item.note.trim() ? <div className="np-kpi-note">{item.note.trim()}</div> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {spotlightBits ? (
          <section className={`np-spot ${spotlightPhotos.length ? "" : "no-photo"}`}>
            <div className="np-spot-copy">
              <div className="np-rubric">{spotlight.type === "ship" ? "Schip in de spotlight" : "Collega in de spotlight"}</div>
              <h2 className="np-display np-spot-name">{spotlightName || "In de spotlight"}</h2>
              {spotlight.type === "crew" && spotlight.functie.trim() ? <div className="np-spot-role">{spotlight.functie.trim()}</div> : null}
              {spotlight.intro.trim() ? <p>{spotlight.intro.trim()}</p> : null}
              {spotlight.type === "ship" && spotlight.special.trim() ? (
                <p>
                  <span className="np-label">Wat dit schip bijzonder maakt</span>
                  {spotlight.special.trim()}
                </p>
              ) : null}
              {spotlight.fact.trim() ? (
                <p>
                  <span className="np-label">Leuk weetje</span>
                  {spotlight.fact.trim()}
                </p>
              ) : null}
              {spotlight.quote.trim() ? <blockquote className="np-quote">{spotlight.quote.trim()}</blockquote> : null}
            </div>
            {spotlightPhotos.length ? (
              <div className="np-spot-photos">
                {spotlightPhotos.map((src, index) => (
                  <figure key={`${index}-${src.slice(0, 24)}`} className="np-spot-photo">
                    <img src={src} alt={spotlightName || "Spotlight"} />
                  </figure>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {showPeople ? <div className="np-part">Onze mensen</div> : null}

        {joining.length > 0 ? (
          <section className="np-block">
            <div className="np-rubric">Welkom aan boord</div>
            <p className="np-blurb">
              {joining.length === 1
                ? "Wij verwelkomen onze nieuwe collega aan boord. Veel succes en welkom in het team."
                : "Wij verwelkomen onze nieuwe collega’s aan boord. Veel succes en welkom in het team."}
            </p>
            <div className={joining.length >= 4 ? "np-cols-2" : ""}>
              {joining.map((person) => (
                <div key={person.id} className="np-person">
                  <div className="np-person-name">{person.fullName}</div>
                  <div className="np-person-meta">
                    {person.shipName ? `${person.shipName} • ` : ""}gestart {person.dateLabel}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {birthdays.length > 0 ? (
          <section className="np-block">
            <div className="np-rubric">Verjaardagen</div>
            <p className="np-blurb">
              {birthdays.length === 1
                ? "Wij feliciteren onze jarige van deze maand."
                : "Wij feliciteren iedereen die deze maand jarig is."}
            </p>
            <div className="np-bdays" style={{ columnCount: birthdayColumns }}>
              {birthdays.map((person) => (
                <div key={person.id} className="np-bday">
                  <span className="np-bday-date">{person.dayLabel}</span>
                  <span>{person.fullName}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {anniversaries.length > 0 ? (
          <section className="np-block">
            <div className="np-rubric">Dienstjubilea</div>
            <p className="np-blurb">
              {anniversaries.length === 1
                ? "Wij feliciteren onze collega met dit dienstjubileum."
                : "Wij feliciteren onze collega’s met hun dienstjubileum."}
            </p>
            <div className={anniversaries.length > 1 ? "np-jubilees" : ""}>
              {anniversaries.map((person) => (
                <article key={person.id} className="np-jubilee">
                  <div className="np-years">
                    <strong>{person.years}</strong>
                    <span>jaar</span>
                  </div>
                  <div>
                    <h3>{person.fullName}</h3>
                    <p>
                      {person.dateLabel}
                      {person.shipName ? ` · ${person.shipName}` : ""}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {showFleet ? <div className="np-part">Onze vloot</div> : null}

        {content.opsUpdate.trim() ? (
          <section className="np-block np-keep">
            <div className="np-rubric">Operationele update</div>
            <p className="np-plain">{content.opsUpdate.trim()}</p>
          </section>
        ) : null}

        {opsItems.length > 0 ? (
          <section className="np-block">
            <div className="np-rubric">Operationeel deze maand</div>
            <div className={opsItems.length > 1 ? "np-ops-grid" : ""}>
              {opsItems.map((item) => {
                const meta = OPS_CATEGORIES.find((category) => category.id === item.category)
                const name = shipNameOf(ships, item.shipId)
                return (
                  <article key={item.id} className="np-ops">
                    {name ? <div className="np-ops-ship">{name}</div> : null}
                    <div className="np-ops-meta">
                      {meta?.printLabel || "Operationeel"}
                      {item.period.trim() ? ` • ${item.period.trim()}` : ""}
                    </div>
                    {item.note.trim() ? <p>{item.note.trim()}</p> : null}
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {showChart ? (
          <section className="np-block np-chart np-keep">
            <div className="np-rubric">Vloot in cijfers</div>
            <h2 className="np-display np-h">{content.chart.title.trim()}</h2>
            <FleetChart chart={content.chart} />
          </section>
        ) : null}

        {showSafety ? (
          <section className={`np-safety ${content.safety.photoDataUrl ? "" : "no-photo"}`}>
            <div>
              <div className="np-rubric">Veiligheidsmoment</div>
              {content.safety.title.trim() ? <h2 className="np-display np-h">{content.safety.title.trim()}</h2> : null}
              {content.safety.text.trim() ? <p>{content.safety.text.trim()}</p> : null}
            </div>
            {content.safety.photoDataUrl ? (
              <img src={content.safety.photoDataUrl} alt={content.safety.title.trim() || "Veiligheidsmoment"} />
            ) : null}
          </section>
        ) : null}

        {showLesson ? (
          <section className="np-block np-lesson np-keep">
            <div className="np-rubric">Lesson learned van de maand</div>
            {lesson.title.trim() ? <h2 className="np-display np-h">{lesson.title.trim()}</h2> : null}
            {lesson.text.trim() ? <p className="np-plain">{lesson.text.trim()}</p> : null}
            {lesson.incidentLabel.trim() ? (
              <p className="np-lesson-ref">Naar aanleiding van het incident: {lesson.incidentLabel.trim()}</p>
            ) : null}
          </section>
        ) : null}

        {showFromShips ? <div className="np-part">Vanaf de schepen</div> : null}

        {feature ? (
          <section className="np-block">
            <figure className="np-feature np-keep">
              <img src={feature.imageDataUrl} alt={feature.caption || "Foto van de maand"} />
              <div className="np-rubric np-feature-kicker">Foto van de maand</div>
              <div className="np-meta">
                {[feature.shipName, feature.location].filter(Boolean).join(" • ")}
              </div>
              {feature.caption.trim() ? <p className="np-caption">“{feature.caption.trim()}”</p> : null}
            </figure>
            {gallery.length > 0 ? (
              <>
                <div className={`np-gallery ${gallery.length === 1 ? "one" : ""} ${gallery.length === 2 ? "two" : ""}`}>
                  {gallery.map((photo) => (
                    <figure key={photo.id}>
                      <img src={photo.imageDataUrl} alt={photo.caption || photo.shipName} />
                      <figcaption>
                        <strong>{photo.shipName}</strong>
                        {photo.location ? ` • ${photo.location}` : ""}
                        {photo.caption ? ` — ${photo.caption}` : ""}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {showWorkshop ? (
          <ManualOfficePaper
            rubric="Nieuws vanuit de werkplaats"
            meta="AM Bruinsma BV"
            logoSrc="/am-bruinsma-logo.png.png"
            logoAlt="AM Bruinsma"
            joining={workshopJoining}
            birthdays={workshopBirthdays}
            anniversaries={workshopAnniversaries}
            news={content.workshopNews || ""}
          />
        ) : null}

        {(filledWorkshop(content.bftBirthdays).length ||
          filledWorkshop(content.bftJoining).length ||
          filledWorkshop(content.bftAnniversaries).length ||
          (content.bftNews || "").trim()) ? (
          <ManualOfficePaper
            rubric="Bevrachtingskantoor BFT"
            meta="BFT Tanker Logistics"
            logoSrc="/bft-logo.png"
            logoAlt="BFT Tanker Logistics"
            joining={filledWorkshop(content.bftJoining)}
            birthdays={filledWorkshop(content.bftBirthdays)}
            anniversaries={filledWorkshop(content.bftAnniversaries)}
            news={content.bftNews || ""}
          />
        ) : null}

        {agenda.length > 0 ? (
          <section className="np-block">
            <div className="np-rubric">Wat komt eraan?</div>
            {agenda.map((item) => {
              const when = agendaParts(item.date)
              const ship = shipNameOf(ships, item.shipId)
              return (
                <article key={item.id} className="np-agenda">
                  <div className="np-date">
                    {when ? (
                      <>
                        <strong>{when.day}</strong>
                        <span>{when.month}</span>
                      </>
                    ) : null}
                  </div>
                  <div>
                    {item.title.trim() ? <h3>{item.title.trim()}</h3> : null}
                    {ship ? <div className="np-meta">{ship}</div> : null}
                    {item.note.trim() ? <p>{item.note.trim()}</p> : null}
                  </div>
                </article>
              )
            })}
          </section>
        ) : null}

        {showOffice ? (
          <section className="np-block np-keep">
            <div className="np-rubric">Bericht van kantoor</div>
            {content.officeUpdates.trim() ? <p className="np-plain">{content.officeUpdates.trim()}</p> : null}
            {content.officeClosing.trim() ? <p className="np-closing">{content.officeClosing.trim()}</p> : null}
          </section>
        ) : null}
      </article>
    </>
  )
}
