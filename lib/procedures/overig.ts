import type { Procedure } from "@/lib/procedures/types"

export const OVERIG_PROCEDURES: Procedure[] = [
  {
    id: "klasse-voorbereiden",
    category: "overig",
    title: "Klasse-inspectie voorbereiden",
    summary:
      "Checklist vóór de surveyor van Lloyd’s Register of Bureau Veritas aan boord komt. De datum staat bij het schip.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "De keuring zelf vraag je aan via de procedure Klasse-inspectie aanvragen. Dit is de voorbereiding aan boord en op kantoor.",
    steps: [
      {
        title: "Papieren bij elkaar",
        body: "Uniecertificaat of Certificaat van Onderzoek, meetbrief, Rijnvaartverklaring, exploitatievergunning, ADN-certificaat met stoffenlijst, klassecertificaat, verzekeringsbewijs, en de bemanningslijst met geldige vaardocumenten en ADN-verklaringen. De pdf’s van Rijnvaartverklaring en exploitatievergunning liggen al bij het schip in deze applicatie. Het origineel moet aan boord.",
      },
      {
        title: "Vorige punten",
        body: "Elk open punt van de vorige klassekeuring dicht, met foto of factuur van het herstel. Een punt dat nog open is, vooraf aan de surveyor schrijven, niet pas op de dag zelf.",
      },
      {
        title: "Aan boord",
        body: "Veilige toegang, verlichting, en de ruimtes gasvrij als de surveyor in tanks of besloten ruimtes moet. Testboeken bij de hand: de maandelijkse testen, blusmiddelen, stuurwerk en de alarmering, zoals die ook als scheepsformulier worden bijgehouden. Journaal en olielogboek actueel.",
      },
      {
        title: "Op de dag",
        body: "Iemand aan boord die de tekeningen en de certificaten kan aanwijzen. Noteer elk nieuw punt letterlijk zoals de surveyor het zegt. Na afloop het rapport naar het ministerie voor het Uniecertificaat, en naar adn@mmtp.etat.lu als het ADN-certificaat mee verlengd wordt.",
      },
    ],
    links: [
      { label: "Lloyd’s Register", href: "https://www.lr.org" },
      { label: "Bureau Veritas", href: "https://marine-offshore.bureauveritas.com" },
    ],
  },
  {
    id: "schade-verzekeraar",
    category: "overig",
    title: "Schade melden bij de verzekeraar",
    summary:
      "Eerst vastleggen, dan melden, geen aansprakelijkheid erkennen. Het polisnummer staat niet in de bemanningslijst.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "De maatschappij en het polisnummer houd je buiten deze applicatie. De melding volgt de polis. Dit is de volgorde die bij een cascoschade of een ladingschade hoort, vóór de brief de deur uit gaat.",
    steps: [
      {
        title: "Vastleggen",
        body: "Tijd, plaats, ENI en naam van het schip, wat er gebeurde, wie erbij was, en foto’s van de schade vóór er iets wordt gerepareerd. Uittreksel uit het journaal. Bij letsel ook de procedure arbeidsongeval. Bij een derde schip of een terminal: namen en hun verzekeraar, zonder toe te geven dat je schuld hebt.",
      },
      {
        title: "Melden",
        body: "Bij de casco- of P&I-verzekeraar van de firma die het schip exploiteert, binnen de termijn van de polis. Meestal wil de polis een melding zodra de schade bekend is. Stuur de feiten, de foto’s en een schatting als je die hebt. Vraag of een expert langskomt vóór je laat repareren. Het klassebureau aparte schade-opname geven als de klasse of het certificaat geraakt is.",
      },
      {
        title: "Niet doen",
        body: "Geen schuld erkennen tegenover de tegenpartij, geen finale kwijting tekenen, en geen wrakstukken weggooien voordat de expert ze heeft gezien. Een reparatie die niet kan wachten, eerst telefonisch bij de verzekeraar afstemmen en daarna bevestigen.",
      },
      {
        title: "Dossier",
        body: "Facturen, het expertrapport en de afrekening bij het schip bewaren. Krijgt het Certificaat van Onderzoek een voorlopige aantekening, dan loopt dat via de procedure tijdelijk certificaat.",
      },
    ],
  },
]
