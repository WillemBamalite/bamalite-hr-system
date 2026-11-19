import type { Procedure, ProcedureCategory } from "@/lib/procedures/types"
import { BEMANNING_REST } from "@/lib/procedures/bemanning-rest"
import { OVERIG_PROCEDURES } from "@/lib/procedures/overig"
import { SCHIP_PROCEDURES } from "@/lib/procedures/schip"
import { PROCEDURE_PACKS } from "@/lib/procedures/packs"

const CCSS_FORM =
  "https://ccss.public.lu/dam-assets/formulaires/fr/ccss-formulaire-entree-secteur-prive-FR.pdf"
const CCSS_INSTRUCTIONS =
  "https://ccss.public.lu/dam-assets/formulaires/fr/ccss-instructions-entree-secteur-prive-FR.pdf"
const CCSS_ENGAGER = "https://ccss.public.lu/fr/employeurs/secteur-prive/engager-personnel.html"
const CCSS_SECULINE = "https://ccss.public.lu/fr/seculine/engagement-salarie.html"
const GUICHET_ENTREE =
  "https://guichet.public.lu/fr/entreprises/ressources-humaines/securite-sociale/declaration-entree.html"
const CNS_FRONTALIERS =
  "https://cns.public.lu/fr/assure/droits-demarches/dossiers-thematiques/frontaliers.html"
const CNS_S1_AUTRE =
  "https://cns.public.lu/fr/assure/droits-demarches/dossiers-thematiques/frontaliers/commande-formulaire-s1-autre.html"
const CZ_VERDRAG = "https://www.cz.nl/zorgverzekering/buitenland/verdragspolis"

export const PROCEDURES: Procedure[] = [
  {
    id: "zorgverzekering-na-inschrijving",
    category: "bemanning",
    title: "Zorgverzekering na inschrijving in Luxemburg",
    summary:
      "Aangifte bij het CCSS, daarna het S1-formulier. Voor wie in Nederland woont: S1 samen met het CZ-aanmeldformulier naar verdragspolis@cz.nl.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote:
      "Stappen volgens CCSS (aangifte binnen 8 dagen), CNS (S1, grensarbeiders) en CZ Verdragspolis (pagina bijgewerkt 6 januari 2025). De mail naar verdragspolis@cz.nl is de werkwijze van Bamalite.",
    steps: [
      {
        title: "Controleer het matricule",
        body: "Een Luxemburgs matricule heeft 13 cijfers. Staat het al op het profiel, dan kan de aangifte meteen. Ontbreekt het bij iemand uit de EU, EER of Zwitserland, vraag het eerst aan via SECUline (bestand DEMMAT, plus een kleurenkopie van identiteitskaart of paspoort) of via MyGuichet: CCSS, Demande de matricule assuré. Op papier volstaat de geboortedatum op het formulier plus die kleurenkopie. Bij nationaliteiten buiten de EU maakt de Direction générale de l'immigration het matricule aan, vaak pas na de verblijfs- of werkvergunning. Daarna pas de aangifte.",
      },
      {
        title: "Aangifte van indiensttreding bij het CCSS",
        body: "Binnen 8 dagen na de eerste werkdag. Liever elektronisch: SECUline, procedure DECAFF, of MyGuichet, CCSS: Déclaration d'entrée (professionele ruimte). Het papieren formulier Déclaration d'entrée pour salarié du secteur privé kan ook. Het CCSS kan een boete opleggen bij een te late aangifte. Guichet.lu noemt 50 euro per maand vertraging nadat een tolerantie van 30 dagen voorbij is, met een maximum van 2.500 euro.",
      },
      {
        title: "Gegevens op de aangifte",
        body: "Matricule en naam van de werkgever, matricule of geboortedatum van de persoon, naam, volledig adres met land, functie, uren per week uit het contract, datum indiensttreding en het einde van de proeftijd als die er is. Bij plaats van tewerkstelling staan vakjes voor Luxemburg, België, Duitsland, Frankrijk, Nederland en andere. Vink de landen aan waar deze persoon met het schip vaart.",
      },
      {
        title: "Bevestiging bewaren",
        body: "Na verwerking stuurt het CCSS een bevestiging (information concernant une déclaration d'entrée) naar het adres van de persoon en naar de werkgever. Daarop staat het 13-cijferige identificatienummer. Zet een nieuw matricule meteen op het profiel. De sociale zekerheidskaart volgt daarna vanzelf. Voor de privésector is de CNS de ziekteverzekeraar. Daarmee lopen ook arbeidsongeval (AAA), pensioen (CNAP) en afhankelijkheid.",
      },
      {
        title: "Zorg in het woonland",
        body: "Wie in Luxemburg woont, is rechtstreeks bij de CNS verzekerd en heeft geen S1 nodig. Wie elders woont, moet zich in het woonland inschrijven met een formulier van de CNS. Welk formulier dat is, hangt van het woonland af en staat rechts zodra je de persoon kiest.",
      },
    ],
    documents: [
      {
        name: "Déclaration d'entrée pour salarié du secteur privé",
        note: "Leeg formulier CCSS, Frans.",
        href: CCSS_FORM,
      },
      {
        name: "Instructies bij de aangifte",
        note: "Uitleg per vak van het formulier.",
        href: CCSS_INSTRUCTIONS,
      },
    ],
    links: [
      { label: "CCSS — personeel in dienst nemen", href: CCSS_ENGAGER },
      { label: "SECUline — aangifte indiensttreding", href: CCSS_SECULINE },
      { label: "Guichet.lu — déclaration d'entrée", href: GUICHET_ENTREE },
      { label: "CNS — grensarbeiders", href: CNS_FRONTALIERS },
    ],
    residenceRoutes: [
      {
        id: "nl",
        title: "Woont in Nederland",
        intro:
          "Bamalite stuurt het S1-formulier samen met het ingevulde CZ-aanmeldformulier naar verdragspolis@cz.nl. CZ is in Nederland het enige orgaan van de woonplaats voor de Verdragspolis. Er is geen extra premie. Eigen risico kan wel. De persoon heeft dan geen recht meer op zorgtoeslag en moet dat doorgeven aan de Belastingdienst. Een wijziging (stoppen met werken, gezinslid gaat werken, uitkering) binnen 4 maanden aan CZ melden.",
        steps: [
          {
            title: "S1 aanvragen bij de CNS",
            body: "Voor Nederland stuurt de CNS het S1 niet vanzelf, anders dan bij een deel van de Franse grensstreek. Bestel het via het CNS-formulier voor landen anders dan Duitsland, België en Frankrijk. Doe dat meteen, of uiterlijk als het stuk 15 dagen na de CCSS-bevestiging nog niet binnen is.",
          },
          {
            title: "CZ-aanmeldformulier invullen",
            body: "Op de pagina Verdragspolis van CZ staat het online registratieformulier. Vul dat in op naam van de werknemer. Zonder S1 maakt CZ de registratie niet af.",
          },
          {
            title: "Samen versturen",
            body: "Stuur het S1 en het CZ-aanmeldformulier samen naar verdragspolis@cz.nl. De conceptmail rechts zet de gegevens uit het profiel alvast in de tekst. Telefoon CZ Verdragspolis: (046) 459 59 86, maandag tot en met vrijdag 8:30–17:30.",
          },
        ],
        documents: [
          {
            name: "S1 bestellen bij de CNS (overige landen, waaronder Nederland)",
            href: CNS_S1_AUTRE,
          },
          {
            name: "CZ — registratieformulier Verdragspolis",
            note: "Online formulier op de CZ-site. Meesturen met het S1.",
            href: CZ_VERDRAG,
          },
        ],
        links: [{ label: "verdragspolis@cz.nl", href: "mailto:verdragspolis@cz.nl" }],
        czEmail: true,
      },
      {
        id: "be",
        title: "Woont in België",
        intro:
          "Voor België is het formulier geen S1 maar een BL1. Daarmee schrijft de persoon zich in bij een Belgisch ziekenfonds naar keuze.",
        steps: [
          {
            title: "BL1 bestellen bij de CNS",
            body: "Via de pagina voor grensarbeiders, kies België. Niet het Nederlandse S1-formulier gebruiken.",
          },
          {
            title: "Inschrijven bij een ziekenfonds",
            body: "De persoon geeft het BL1 af bij het ziekenfonds. Zorg in België loopt daarna via dat fonds. Zorg in Luxemburg loopt via de CNS.",
          },
        ],
        links: [{ label: "CNS — grensarbeiders (kies België)", href: CNS_FRONTALIERS }],
      },
      {
        id: "de",
        title: "Woont in Duitsland",
        intro: "De CNS geeft een S1 af voor inschrijving bij een Duitse Krankenkasse.",
        steps: [
          {
            title: "S1 Duitsland bestellen",
            body: "Via de pagina voor grensarbeiders, kies Duitsland, als het formulier niet vanzelf is toegekomen.",
          },
          {
            title: "Inschrijven bij de Krankenkasse",
            body: "De persoon levert het S1 in bij de Krankenkasse van zijn keuze.",
          },
        ],
        links: [{ label: "CNS — grensarbeiders (kies Duitsland)", href: CNS_FRONTALIERS }],
      },
      {
        id: "fr",
        title: "Woont in Frankrijk",
        intro:
          "In de departementen 08, 10, 51, 52, 54, 55, 57, 67, 68 en 88 stuurt de CNS het document S072 rechtstreeks naar de CPAM. De persoon hoeft dan in principe niets te doen. In de andere departementen gaat het S1 naar het privéadres en moet de persoon het zelf bij de CPAM inleveren.",
        steps: [
          {
            title: "Controleren of het stuk er is",
            body: "Is 15 dagen na de CCSS-bevestiging nog geen S1 of bevestiging van de CPAM binnen, bestel het S1 via de CNS-pagina voor Frankrijk.",
          },
          {
            title: "Buiten de grensdepartementen: afgeven bij de CPAM",
            body: "Het S1 gaat naar het privéadres. De persoon geeft het af bij de CPAM van zijn departement.",
          },
        ],
        links: [{ label: "CNS — grensarbeiders (kies Frankrijk)", href: CNS_FRONTALIERS }],
      },
      {
        id: "lu",
        title: "Woont in Luxemburg",
        intro:
          "Geen S1 en geen CZ. De zorgverzekering is de CNS zelf. De persoon toont de sociale zekerheidskaart bij een zorgverlener.",
        steps: [
          {
            title: "Wachten op de kaart",
            body: "Na de aangifte bij het CCSS volgt de kaart automatisch op het officiële adres. Het matricule op de kaart is het nummer voor elk contact met de CNS.",
          },
        ],
      },
      {
        id: "other",
        title: "Woont in een ander land",
        intro:
          "De CNS geeft een S1 af. Daarmee schrijft de persoon zich in bij de zorgverzekeraar van het woonland. Alleen bij woonland Nederland gaat het stuk naar CZ.",
        steps: [
          {
            title: "S1 bestellen",
            body: "Gebruik het CNS-formulier voor landen anders dan Duitsland, België en Frankrijk. Uiterlijk 15 dagen na de CCSS-bevestiging als het niet vanzelf komt.",
          },
          {
            title: "Inschrijven in het woonland",
            body: "De persoon levert het S1 in bij de lokale zorgverzekeraar.",
          },
        ],
        documents: [
          {
            name: "S1 bestellen bij de CNS (overige landen)",
            href: CNS_S1_AUTRE,
          },
        ],
      },
      {
        id: "unknown",
        title: "Woonland onbekend",
        intro:
          "Zonder land in het adres is niet te zien of deze persoon naar CZ, een ziekenfonds, de CPAM of alleen de CNS moet. Vul het land op het profiel in en open deze procedure opnieuw.",
        steps: [],
      },
    ],
  },
  {
    id: "s1-opnieuw-aanvragen",
    category: "bemanning",
    title: "S1 opnieuw aanvragen",
    summary:
      "Het S1 (of BL1 voor België) is niet aangekomen. Opnieuw bestellen bij de CNS, en voor Nederland daarna alsnog naar CZ.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote:
      "De CNS adviseert het formulier te bestellen als het niet binnen 15 dagen na de bevestiging van het CCSS binnen is.",
    steps: [
      {
        title: "Wachttermijn",
        body: "Bestel opnieuw als het formulier uiterlijk 15 dagen na de brief van het CCSS (déclaration d'entrée) nog niet op het privéadres ligt. In de Franse grensdepartementen komt het document bij de CPAM terecht en niet bij de persoon thuis. Vraag daar eerst of de CPAM al iets heeft ontvangen.",
      },
      {
        title: "Het juiste formulier kiezen",
        body: "Nederland en overige landen: S1 via het formulier voor overige landen. België: BL1. Duitsland en Frankrijk: het formulier van dat land op de CNS-pagina voor grensarbeiders. Het 13-cijferige matricule is verplicht op de bestelling.",
      },
      {
        title: "Versturen op de site van de CNS",
        body: "Velden invullen, op Prévisualiser klikken, de samenvatting controleren en daarna Envoyer. Bewaar een kopie of een schermafdruk van de bevestiging.",
      },
      {
        title: "Nederland: daarna alsnog naar CZ",
        body: "Zodra het S1 binnen is, samen met het CZ-aanmeldformulier naar verdragspolis@cz.nl. Zonder S1 rondt CZ de Verdragspolis niet af.",
      },
    ],
    documents: [
      {
        name: "S1 bestellen (Nederland en overige landen)",
        href: CNS_S1_AUTRE,
      },
    ],
    links: [
      { label: "CNS — grensarbeiders", href: CNS_FRONTALIERS },
      { label: "CZ Verdragspolis", href: CZ_VERDRAG },
      { label: "verdragspolis@cz.nl", href: "mailto:verdragspolis@cz.nl" },
    ],
    residenceRoutes: [
      {
        id: "nl",
        title: "Woont in Nederland",
        intro: "Bestel het S1 bij de CNS en stuur het daarna met het CZ-formulier naar verdragspolis@cz.nl.",
        steps: [],
        czEmail: true,
        documents: [{ name: "S1 bestellen", href: CNS_S1_AUTRE }],
      },
      {
        id: "be",
        title: "Woont in België",
        intro: "Bestel een BL1, geen S1.",
        steps: [],
        links: [{ label: "CNS — grensarbeiders (kies België)", href: CNS_FRONTALIERS }],
      },
      {
        id: "de",
        title: "Woont in Duitsland",
        intro: "Bestel het S1 voor Duitsland.",
        steps: [],
        links: [{ label: "CNS — grensarbeiders (kies Duitsland)", href: CNS_FRONTALIERS }],
      },
      {
        id: "fr",
        title: "Woont in Frankrijk",
        intro:
          "In de grensdepartementen eerst de CPAM navragen. Elders in Frankrijk het S1 nabestellen en afgeven bij de CPAM.",
        steps: [],
        links: [{ label: "CNS — grensarbeiders (kies Frankrijk)", href: CNS_FRONTALIERS }],
      },
      {
        id: "lu",
        title: "Woont in Luxemburg",
        intro: "Een S1 is niet nodig. De zorg loopt via de CNS.",
        steps: [],
      },
      {
        id: "other",
        title: "Woont in een ander land",
        intro: "Bestel het S1 via het formulier voor overige landen en lever het in bij de zorgverzekeraar van het woonland.",
        steps: [],
        documents: [{ name: "S1 bestellen", href: CNS_S1_AUTRE }],
      },
      {
        id: "unknown",
        title: "Woonland onbekend",
        intro: "Vul het land op het profiel in. Zonder woonland is het juiste formulier (S1 of BL1) niet te kiezen.",
        steps: [],
      },
    ],
  },
  ...BEMANNING_REST,
  ...SCHIP_PROCEDURES,
  ...OVERIG_PROCEDURES,
]

export function getProceduresByCategory(category: ProcedureCategory): Procedure[] {
  return PROCEDURES.filter((procedure) => procedure.category === category).map(withPacks)
}

export function getProcedure(category: string, id: string): Procedure | undefined {
  const found = PROCEDURES.find((procedure) => procedure.category === category && procedure.id === id)
  return found ? withPacks(found) : undefined
}

function withPacks(procedure: Procedure): Procedure {
  const packs = PROCEDURE_PACKS[procedure.id]
  return packs ? { ...procedure, packs } : procedure
}

export function isProcedureCategory(value: string): value is ProcedureCategory {
  return value === "schip" || value === "bemanning" || value === "overig"
}
