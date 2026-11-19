import type { Procedure } from "@/lib/procedures/types"

const TRANSPORTS =
  "https://transports.public.lu/fr/transporter/transports-fluviaux/immatriculation-certificats-navigation-fluviale.html"
const REGISTRE = "https://transports.public.lu/fr/se-deplacer/voyages-fluviaux/registre-fluvial.html"
const GUICHET_CERT =
  "https://guichet.public.lu/fr/entreprises/sectoriel/transport/fluvial/immatriculation-delivrance-certificats-techniques.html"
const F0 =
  "https://guichet.public.lu/dam-assets/catalogue-formulaires/navigation/certificat-jaugeage/gestion-bateau.pdf"
const ADN =
  "https://guichet.public.lu/fr/entreprises/sectoriel/transport/fluvial/agrement-transport-marchandises-dangereuses.html"
const LR = "https://www.lr.org"
const BV = "https://marine-offshore.bureauveritas.com"

export const SCHIP_PROCEDURES: Procedure[] = [
  {
    id: "schip-inschrijven",
    category: "schip",
    title: "Schip inschrijven en uitschrijven",
    summary:
      "Aankoop en eerste inschrijving in Luxemburg. Eerst de notaris, dan de meetbrief, dan het mapje naar Grevenmacher zodra het schip daar ligt.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "De volgorde en het mapje zijn de werkwijze van Bamalite bij een aankoop, naar het dossier van januari 2026. De officiële voorwaarde blijft: een wezenlijk deel van het beheer moet vanuit Luxemburg gebeuren, en de AED schrijft pas in als de meetbrief is erkend. De Duitse aanwijzing in dat mapje noemt nog 6, avenue Émile Reuter en telefoon 75 00 19. Dat adres is verouderd. Het loket is Schiltzeplatz.",
    steps: [
      {
        title: "Of het schip erin mag",
        body: "Het register staat open voor schepen die in Luxemburg varen, en voor schepen die voor meer dan de helft eigendom zijn van een EU-burger of een vennootschap met zetel in de EU, als een wezenlijk deel van het beheer vanuit Luxemburg gebeurt. Zonder dat beheer geen inschrijving. De vijf Duitse verklaringen in het mapje zijn het bewijs daarvan.",
      },
      {
        title: "Koopcontract naar de notaris",
        body: "Mail het Duitse of Engelse koopcontract naar notaris Patrick Serres, secretariat@notaireserres.lu, telefoon +352 236 1951. Stuur er het bewijs van uitschrijving uit het oude scheepsregister bij, in het Duits, Engels of Frans. Meld dat het schip naar Grevenmacher komt en dat er geen hypotheek op staat.",
      },
      {
        title: "Meetbrief laten erkennen",
        body: "Daarna formulier F0 naar inlandnavigation@mmtp.etat.lu, bij Kevin Schreuder, telefoon +352 247 844 32. Dat is de aanvraag om de buitenlandse meetbrief te erkennen. Kruis aan dat je namens de eigenaar tekent. De bijlagen van F0 blijven: meetbrief, klassecertificaat, verzekeringsattest, en bij een eigenaar in het buitenland de bareboat-charter.",
      },
      {
        title: "Bellen als het schip in Grevenmacher ligt",
        body: "Pas als de datum bekend is waarop het schip in Grevenmacher is, bel je het scheepsregister. Colette Bentner, colette.bentner@en.etat.lu. Op het aanvraagformulier staat +352 247-80588, op het begeleidende blad +352 247-80800. Het loket is bureau des Actes Civils, Schiltzeplatz, L-6774 Grevenmacher. Balie 08.30–12.00 en 14.00–16.00.",
      },
      {
        title: "Geel bewijs naar de notaris, daarna het mapje",
        body: "Als het register het schip heeft bezocht, maak je een kopie van het gele bewijs en breng je het origineel naar Serres. Serres maakt de volmachten om het Luxemburgse contract te tekenen. Daarna moet het mapje snel af. De formulieren zet je ook op een stick. Alles wat het loket krijgt, is Frans of Duits. Een vertaling alleen van een beëdigd vertaler. Tekenen doet wie op het RCS-uittreksel tekenbevoegd is. In het voorbeelddossier was dat Jos Meijer als Manager Operations, met het uittreksel erbij.",
      },
      {
        title: "Uitschrijven",
        body: "Schriftelijk bij de AED, met het bewijs dat het schip verkocht, gesloopt of in een ander register ingeschreven wordt. Vraag een attest van doorhaling. Geef dezelfde wijziging door aan inlandnavigation@mmtp.etat.lu, aan de classificatiemaatschappij en aan de verzekeraar. Zonder doorhaling blijft het schip Luxemburgse plichten houden.",
      },
    ],
    documents: [
      { name: "Formulier F0 — beheer van het schip", href: F0 },
      {
        name: "Antrag zur Einschreibung von Binnenschiffen",
        note: "Het formulier van het scheepsregister. Dit is het ingevulde voorbeeld uit het mapje (Fraternite), met de aantekening kopieën voorbeelden. Guichet publiceert geen leeg exemplaar. Het lege formulier ligt bij het loket. Niet dit blad opsturen.",
        href: "/forms/scheepsregister/antrag-zur-einschreibung-voorbeeld.pdf",
      },
      {
        name: "Vijf verklaringen bij de inschrijving",
        note: "Anlage 1 tot en met 5 uit hetzelfde mapje, ingevuld als voorbeeld. Elke verklaring opnieuw tekenen voor het schip dat je inschrijft.",
        href: "/forms/scheepsregister/verklaringen-inschrijving-voorbeeld.pdf",
      },
    ],
    links: [
      { label: "Transports.lu — inschrijving en certificaten", href: TRANSPORTS },
      { label: "Register", href: REGISTRE },
      { label: "Notaris Serres", href: "mailto:secretariat@notaireserres.lu" },
      { label: "inlandnavigation@mmtp.etat.lu", href: "mailto:inlandnavigation@mmtp.etat.lu" },
      { label: "Colette Bentner", href: "mailto:colette.bentner@en.etat.lu" },
    ],
  },
  {
    id: "eigendom-exploitant",
    category: "schip",
    title: "Eigendom of exploitant wijzigen",
    summary: "Verkoop of een andere exploitant: register, formulier F0 en het exploitantenattest opnieuw.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "Het exploitantenattest (certificat d’exploitant) komt van de AED. Formulier F0 gaat naar het ministerie. De Rijnvaartverklaring en de exploitatievergunning in de applicatie zijn de afgegeven stukken, niet de aanvraag.",
    steps: [
      {
        title: "Eigendom",
        body: "Koopakte of factuur, en het bewijs dat de vorige inschrijving is doorgehaald of wordt overgedragen. Nieuwe eigenaar op het register bij de AED. Daarna formulier F0 opnieuw, omdat het beheer vanuit Luxemburg opnieuw moet blijken.",
      },
      {
        title: "Exploitant",
        body: "Het certificat d’exploitant bewijst dat het beheer vanuit Luxemburg gebeurt. Bij een andere exploitant een nieuw attest bij de AED. Zolang dat attest er niet is, kan het ministerie de technische certificaten niet op de nieuwe partij zetten. Stuur het attest naar inlandnavigation@mmtp.etat.lu zodra het binnen is.",
      },
      {
        title: "Wat mee wijzigt",
        body: "Klassebureau, verzekering, Uniecertificaat, ADN-certificaat en de Rijnvaartverklaring noemen de eigenaar of de exploitant. Elk document dat de oude naam draagt, opnieuw aanvragen. De pdf’s die al bij het schip liggen, vervang je pas als het nieuwe stuk binnen is.",
      },
    ],
    documents: [{ name: "Formulier F0", href: F0 }],
    links: [
      { label: "Register en taakverdeling AED / ministerie", href: REGISTRE },
      { label: "inlandnavigation@mmtp.etat.lu", href: "mailto:inlandnavigation@mmtp.etat.lu" },
    ],
  },
  {
    id: "rijnvaartverklaring",
    category: "schip",
    title: "Rijnvaartverklaring",
    summary:
      "Het certificat rhénan. De AED in Grevenmacher geeft het af. Een bestaand Rijncertificaat geldt op de Moezel als binnenvaartcertificaat.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "CCNR-aanvraagdossier, maart 2026, en het reglement van 11 juni 1987. De AED in Grevenmacher geeft het certificat rhénan af. De pdf per schip in deze applicatie is het afgegeven stuk, niet de aanvraag.",
    documents: [
      {
        name: "CCNR — aanvraag Rijnvaartverklaring (Frans)",
        href: "https://www.ccr-zkr.org/sites/default/files/2026-03/Demande_Attestation_appartenance_fr.pdf",
      },
      {
        name: "CCNR — dezelfde aanvraag (Duits)",
        href: "https://www.ccr-zkr.org/sites/default/files/2026-03/Demande_Attestation_appartenance_de.pdf",
      },
    ],
    steps: [
      {
        title: "Nieuw",
        body: "Eerst het technische dossier bij het ministerie: meting, klasseverklaring van Lloyd’s Register of Bureau Veritas, en formulier F0. Daarna het Rijncertificaat vragen bij het bureau des Actes Civils van de AED in Grevenmacher. Zonder inschrijving of zonder bewijs van Luxemburgs beheer geven zij het niet af.",
      },
      {
        title: "Wijzigen",
        body: "Naam, eigenaar, exploitant, tonnage of een verbouwing: eerst de classificatiemaatschappij, dan het Uniecertificaat bij het ministerie als dat mee wijzigt, en pas daarna een nieuw Rijncertificaat bij de AED. Het oude exemplaar inleveren of als vermist aangeven.",
      },
      {
        title: "Bewaren",
        body: "Het origineel hoort aan boord. De pdf in de map van het schip is de kopie voor de A1-aanvraag en voor het kantoor. Vervang die kopie als de AED een nieuw stuk stuurt.",
      },
    ],
    links: [
      { label: "Transports.lu — Rijncertificaat en Uniecertificaat", href: TRANSPORTS },
      { label: "Register", href: REGISTRE },
    ],
  },
  {
    id: "exploitatievergunning",
    category: "schip",
    title: "Exploitatievergunning",
    summary:
      "Het certificat d’exploitant van de AED. Bewijst dat het schip vanuit Luxemburg wordt beheerd. Nodig voor de inschrijving als er geen Luxemburgse thuishaven is.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "Formulier F0 en Transports.lu. De exploitatievergunning die als pdf bij het schip ligt, is dit attest. Verlengen of wijzigen loopt via de AED, niet via het klassebureau.",
    steps: [
      {
        title: "Aanvragen",
        body: "Bij de AED, bureau des Actes Civils, Grevenmacher. Het ministerie wil het attest zien bij formulier F0 als het schip geen thuishaven in Mertert heeft. Zonder attest moet je een ander bewijs van de thuishaven meesturen.",
      },
      {
        title: "Verlengen of op een andere naam",
        body: "Vraag een nieuw attest vóór het oude afloopt, of meteen bij een andere exploitant of eigenaar. Stuur de kopie naar inlandnavigation@mmtp.etat.lu. Tot die kopie binnen is, blijven technische aanvragen op de oude naam staan.",
      },
      {
        title: "Aan boord en op kantoor",
        body: "Origineel aan boord bij de andere scheepspapieren. De pdf in de applicatie bijwerken zodra het nieuwe attest er is. Die pdf gaat ook mee in het Luxemburgse A1-pakket.",
      },
    ],
    documents: [{ name: "Formulier F0 — verwijst naar het exploitantenattest", href: F0 }],
    links: [{ label: "Transports.lu", href: TRANSPORTS }],
  },
  {
    id: "certificaat-van-onderzoek",
    category: "schip",
    title: "Certificaat van Onderzoek",
    summary:
      "Het Uniecertificaat (certificat de bateau de navigation intérieure). Voor tankers hooguit 5 jaar. Het klassebureau keurt, het ministerie geeft het certificaat af.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "Guichet, afgifte van technische binnenvaartcertificaten. Richtlijn (EU) 2016/1629 en ES-TRIN. 200 euro voor een definitief certificaat, 100 euro voor een voorlopig, 50 euro voor vervanging of aanpassing, volgens die pagina.",
    steps: [
      {
        title: "Wanneer verplicht",
        body: "Voor vrachtschepen en passagiersschepen van 20 meter of meer, of waarvan lengte × breedte × diepgang minstens 100 m³ is. Een binnenvaarttanker valt daaronder. Gevaarlijke goederen: geldig hooguit 5 jaar. Andere schepen hooguit 10 jaar. Verlengen vóór de einddatum.",
      },
      {
        title: "Aanvraag",
        body: "Formulier F1 bij de Service Navigation intérieure et logistique, met de gevraagde bijlagen: kopie van het vorige certificaat als het een wijziging is, meetbrief, bij nieuwbouw het bouw- of koopcontract of een kadastraal uittreksel, de conformiteitsverklaring van een erkend klassebureau, en het bewijs dat het klassebureau betaald is. Een commissie geeft advies. Met een volledige klasseverklaring is geen tweede bezoek van die commissie nodig.",
      },
      {
        title: "Klassebureau",
        body: "De schepen in deze lijst staan bij Lloyd’s Register of Bureau Veritas. De keuring vraag je bij het bureau dat op het schip staat. Het ministerie geeft het Uniecertificaat pas af na die verklaring. Plan de keuring vroeg genoeg, want het certificaat mag niet verlopen zijn om te varen.",
      },
    ],
    links: [
      { label: "Guichet — technisch certificaat", href: GUICHET_CERT },
      { label: "Transports.lu", href: TRANSPORTS },
      { label: "Lloyd’s Register", href: LR },
      { label: "Bureau Veritas", href: BV },
    ],
  },
  {
    id: "meetbrief",
    category: "schip",
    title: "Meetbrief",
    summary:
      "Certificat de jaugeage. Verplicht vóór de inschrijving. Hooguit 15 jaar, voor gevaarlijke goederen hooguit 10 jaar.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "Transports.lu. De meting doen een erkend klassebureau of een erkende expert. Een buitenlandse meetbrief erkent de directie binnenvaart.",
    steps: [
      {
        title: "Nieuwe meting",
        body: "Vraag de meting aan bij Lloyd’s Register of Bureau Veritas, het bureau van het schip. Stuur formulier F0 naar inlandnavigation@mmtp.etat.lu. Op papier kan ook een vrije brief om een Luxemburgse meetbrief te vragen.",
      },
      {
        title: "Buitenlandse meetbrief",
        body: "Erkenning door de directie binnenvaart van het ministerie. Zelfde formulier F0, plus de buitenlandse meetbrief en het bewijs van beheer vanuit Luxemburg (exploitantenattest).",
      },
      {
        title: "Verlengen",
        body: "Vóór de einddatum. 15 jaar is het maximum, 10 jaar als het schip gevaarlijke stoffen vervoert. Na een verbouwing die de tonnage verandert, meteen opnieuw meten. De nieuwe brief daarna ook op het Uniecertificaat en, als de cijfers daarop staan, op de Rijnvaartverklaring laten zetten.",
      },
    ],
    documents: [{ name: "Formulier F0", href: F0 }],
    links: [{ label: "Transports.lu — meetbrief", href: TRANSPORTS }],
  },
  {
    id: "tijdelijk-certificaat",
    category: "schip",
    title: "Tijdelijk certificaat na schade",
    summary:
      "Eerst het klassebureau voor de schade. Daarna, als het Uniecertificaat niet meer klopt, een voorlopig certificaat bij het ministerie.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "Guichet: een certificat provisoire kost 100 euro en overbrugt de tijd tot het definitieve Uniecertificaat. Het klassebureau bepaalt of het schip onder voorwaarden mag varen.",
    steps: [
      {
        title: "Schade vastleggen",
        body: "Foto’s, plaats, tijd, en een uittreksel uit het journaal. Het klassebureau van het schip (Lloyd’s of Bureau Veritas) meteen vragen om een schade-opname. Niet verder varen als de expert het schip daarvoor afkeurt.",
      },
      {
        title: "Voorlopig certificaat",
        body: "Als het Certificaat van Onderzoek door de schade niet meer deugt, vraagt de eigenaar bij de Service Navigation intérieure een certificat de bateau de navigation intérieure provisoire, in afwachting van het definitieve. Guichet noemt daarvoor 100 euro. Meesturen wat het formulier van de technische certificaten vraagt, plus het voorlopige bericht van het klassebureau.",
      },
      {
        title: "Na de reparatie",
        body: "Nieuwe keuring door het klassebureau. Daarna het definitieve certificaat aanvragen vóór het voorlopige afloopt. Wijzigt de tonnage of de ADN-lijst, dan ook meetbrief en ADN-certificaat aanpassen. De verzekeraar krijgt het expertiserapport. Zie daarvoor de procedure schade melden.",
      },
    ],
    links: [
      { label: "Guichet — ook het voorlopige certificaat", href: GUICHET_CERT },
      { label: "Lloyd’s Register", href: LR },
      { label: "Bureau Veritas", href: BV },
    ],
  },
  {
    id: "adn-certificaat-schip",
    category: "schip",
    title: "ADN-certificaat van het schip",
    summary:
      "Certificat d’agrément ADN. Hooguit 5 jaar. Aanvraag per mail naar adn@mmtp.etat.lu, na een keuring door het klassebureau.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "Guichet, agrément marchandises dangereuses. Luxemburg geeft het alleen af als het schip in Luxemburg is ingeschreven, of de thuishaven Luxemburg is, of de eigenaar in Luxemburg gevestigd is. Erkende bureaus voor het conformiteitsattest: Germanischer Lloyd, Lloyd’s Register en Bureau Veritas.",
    steps: [
      {
        title: "Voorwaarde",
        body: "Een tanker heeft dit certificaat nodig om gevaarlijke stoffen te vervoeren, tenzij de stof onder een vrijstelling van het ADN valt. Het type (C of N) staat bij de scheepsgegevens. Het certificaat van het schip is iets anders dan de ADN-verklaring van de bemanning.",
      },
      {
        title: "Keuring",
        body: "Het klassebureau keurt het schip op het ADN en maakt het rapport, en voor een tanker de lijst van stoffen die geladen mogen worden. Transports.lu noemt als geldige conformiteitsattesten die van Germanischer Lloyd, Lloyd’s Register en Bureau Veritas. De kosten van dat attest, 100 euro volgens Transports.lu, betaal je aan het bureau.",
      },
      {
        title: "Aanvraag",
        body: "Formulier van Guichet, droog vrachtschip of tanker, ingevuld en getekend, als pdf naar adn@mmtp.etat.lu. Bestanden noemen: Justificatif 1, Justificatif 2, enzovoort. Meesturen: identiteitskaart van de aanvrager, inschrijvingsbewijs, klassecertificaat, keuringsrapport, de stoffenlijst, het vorige ADN-certificaat, en een volmacht als een gemachtigde tekent. Bij verlies een politieverklaring. Bij een wijziging of verlenging een brief die uitlegt wat er wijzigt.",
      },
      {
        title: "Geldigheid",
        body: "Hooguit 5 jaar, korter als het keuringsrapport dat zegt. Verlengen vóór de einddatum. Er is ruimte voor één jaar uitstel, maar reken daar niet op om de keuring uit te stellen. Na een verbouwing of een andere stoffenlijst het certificaat laten aanpassen, niet zelf de lijst overschrijven.",
      },
    ],
    links: [
      { label: "Guichet — ADN-certificaat schip", href: ADN },
      { label: "Transports.lu — ADN", href: TRANSPORTS },
      { label: "adn@mmtp.etat.lu", href: "mailto:adn@mmtp.etat.lu" },
    ],
  },
  {
    id: "klasse-inspectie",
    category: "schip",
    title: "Klasse-inspectie aanvragen",
    summary: "De periodieke keuring bij Lloyd’s Register of Bureau Veritas, het bureau dat op het schip staat.",
    status: "uitgewerkt",
    subject: "ship",
    sourceNote:
      "Het bureau staat per schip in de scheepsgegevens, samen met de laatste en de volgende klassekeuring. Luxemburg erkent het rapport daarna voor het Uniecertificaat en het ADN-certificaat.",
    steps: [
      {
        title: "Welk bureau",
        body: "Niet wisselen zonder de klasse over te dragen. Lloyd’s Register of Bureau Veritas, zoals op het schip vermeld. De aanvraag loopt via de portal of de surveyor van dat bureau. Zeg erbij dat het een Luxemburgs binnenschip is en welk certificaat meeloopt: klasse, Unie, ADN.",
      },
      {
        title: "Datum",
        body: "De volgende keuringsdatum staat bij het schip. Vraag de surveyor ruim vóór die datum, en vóór de einddatum van het Uniecertificaat en het ADN-certificaat. Die kunnen korter zijn dan de klassecyclus.",
      },
      {
        title: "Na het bezoek",
        body: "Het rapport en de conformiteitsverklaring gaan naar inlandnavigation@mmtp.etat.lu voor het Uniecertificaat, en naar adn@mmtp.etat.lu als het ADN-certificaat mee verlengd wordt. Openstaande punten afsluiten vóór je het certificaat als geldig beschouwt. De checklist daarvoor staat bij Overig, klasse-inspectie voorbereiden.",
      },
    ],
    links: [
      { label: "Lloyd’s Register", href: LR },
      { label: "Bureau Veritas", href: BV },
      { label: "Ministerie — wat zij met het rapport doen", href: GUICHET_CERT },
    ],
  },
]
