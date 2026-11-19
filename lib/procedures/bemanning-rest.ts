import type { Procedure } from "@/lib/procedures/types"

const CAE_FORM =
  "https://cae.public.lu/dam-assets/fr/formulaires/interactifs_nouveaux/af-fr-14-028-000020-2025-1.pdf"
const CAE_STEPS =
  "https://cae.public.lu/fr/allocations/allocation-pour-lavenir-des-enfants/demarches-.html"
const CAE_DIFFERENTIEL =
  "https://cae.public.lu/fr/allocations/frontalier/complement-differentiel.html"
const CAE_GUICHET = "https://cae.public.lu/fr/demarches/guichet-electronique.html"
const CNS_FAMILIE =
  "https://cns.public.lu/fr/assure/droits-demarches/dossiers-thematiques/famille/assurance-membres-famille.html"
const CZ = "https://www.cz.nl/zorgverzekering/buitenland/verdragspolis"
const CNAP_FORMS = "https://cnap.public.lu/fr/documentation/formulaires.html"
const CNAP_VIEILLESSE =
  "https://cnap.public.lu/fr/pensions/pension-vieillesse-65/pension-vieillesse-652.html"
const CNAP_SURVIE = "https://cnap.public.lu/fr/pensions/pension-survie/pension-survie2.html"
const CNAP_FORM_PERSOON =
  "https://guichet.public.lu/dam-assets/catalogue-formulaires/retraite/demande-obtention-pension-veillesse/demande-pension-personnelle-fr.pdf"
const CNAP_FORM_SURVIE =
  "https://guichet.public.lu/dam-assets/catalogue-formulaires/deces-disparition/demande-pension-survie/demande-pension-survie-fr.pdf"
const CNS_WERKGEVER =
  "https://cns.public.lu/fr/employeur/maladie-accident-conges/declaration-incapacite-salarie.html"
const CNS_FORMULIER =
  "https://cns.public.lu/fr/assure/droits-demarches/demarches-frequentes/formulaire-declaration-incapacite-travail.html"
const CNS_INDEMNITEIT =
  "https://cns.public.lu/fr/employeur/maladie-accident-conges/indemnite-maladie-salaries.html"
const GUICHET_LOON =
  "https://guichet.public.lu/fr/entreprises/ressources-humaines/sante/incapacite-travail/continuation-salaire.html"
const CCSS_ZIEK =
  "https://ccss.public.lu/fr/employeurs/secteur-prive/declarer-incapacite-travail.html"
const AAA_UITLEG =
  "https://guichet.public.lu/dam-assets/catalogue-formulaires/travail/document/accident-travail-maladie/instructions-accident-travail-trajet/instructions-declaration-accident-FR.pdf"
const AAA_CSL =
  "https://www.csl.lu/fr/vos-droits/securite-sociale/accident/declaration-des-accidents-du-travail-de-trajet/"
const ILT_KEURING =
  "https://www.ilent.nl/onderwerpen/scheepvaart-algemeen/medische-keuring-scheepvaart"
const STM = "https://www.stm.lu/fr/examen-pour-professionnel-de-la-navigation-fluviale"
const GUICHET_KWALIFICATIE =
  "https://guichet.public.lu/fr/entreprises/sectoriel/transport/fluvial/certificat-qualification-operations-autorisations-specifiques.html"
const SAB = "https://sabni.nl/vaardocumenten/dienstboekjes/eerste-afgifte/"
const SAB_FORM =
  "https://sabni.nl/images/downloads/aanvraagformulieren/Aanvraagformulier%20dienstboekjes%20en%20vaartijdverklaringen.pdf"
const CBR_AANVRAAG =
  "https://www.cbr.nl/nl/veelgestelde-vragen/hoe-vraag-ik-mijn-kwalificatiecertificaat-of-vaardocument-binnenvaart-aan-1"
const CBR_VERLENGEN =
  "https://www.cbr.nl/nl/veelgestelde-vragen/hoe-verleng-ik-mijn-kwalificatiecertificaat-of-vaardocument-binnenvaart"

export const BEMANNING_REST: Procedure[] = [
  {
    id: "zorgverzekering-gezin",
    category: "bemanning",
    title: "Zorgverzekering voor gezinsleden",
    summary:
      "Partner of kind meeverzekeren. Alleen als zij zelf geen eigen verzekering hebben. Partner en kinderen staan nog niet op het profiel.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote:
      "CNS voor wie in Luxemburg woont. CZ Verdragspolis voor gezinsleden die in Nederland wonen. Gezinsgegevens vul je zelf in.",
    steps: [
      {
        title: "Eerst kijken of een eigen verzekering verplicht is",
        body: "Een partner of kind kan alleen meeliften als hij zelf geen verplichte verzekering heeft. Werkt de partner in Nederland, of krijgt hij een Nederlandse uitkering, dan moet hij zelf een Nederlandse basisverzekering. Een kind dat werkt, hoe weinig ook, kan niet op de Verdragspolis. Dat staat zo bij CZ.",
      },
      {
        title: "Gegevens die je zelf bij elkaar zoekt",
        body: "Die staan niet in de bemanningslijst: naam en geboortedatum van partner en kinderen, of ze in hetzelfde huis wonen, of de partner werkt, en een geboorteakte of huwelijksakte. Het matricule van de werknemer heb je wel nodig.",
      },
    ],
    links: [
      { label: "CNS — gezinsleden", href: CNS_FAMILIE },
      { label: "CZ Verdragspolis", href: CZ },
    ],
    residenceRoutes: [
      {
        id: "lu",
        title: "Gezin woont in Luxemburg",
        intro:
          "De werknemer is de hoofdverzekerde bij de CNS. Partner, geregistreerde partner of kind zonder eigen dekking kan meeverzekerd worden. Een minderjarig kind in het huishouden loopt vaak mee. Partner en meerderjarig kind niet vanzelf.",
        steps: [
          {
            title: "CNS contacteren",
            body: "Bel de dienst coassurance, (+352) 2757-1, of gebruik het contactformulier van de CNS. Doe dat zodra een partner of meerderjarig kind geen eigen verzekering meer heeft, bijvoorbeeld na een afmelding bij het CCSS.",
          },
          {
            title: "Papieren",
            body: "Kind: geboorteakte en een recent attest van woonplaats of gezinssamenstelling. Partner: huwelijksakte plus hetzelfde attest. Een partnerschap dat in het buitenland is gesloten, moet eerst in het Luxemburgse répertoire civil staan.",
          },
        ],
      },
      {
        id: "nl",
        title: "Gezin woont in Nederland",
        intro:
          "Het gezin loopt niet als coassuré bij de CNS. Zij horen bij de Nederlandse Verdragspolis van CZ, maar alleen als zij geen eigen Nederlandse basisverzekering mogen hebben.",
        steps: [
          {
            title: "Eerst de werknemer zelf",
            body: "De werknemer moet al een S1 en een Verdragspolis hebben. Zonder die registratie kan een gezinslid er niet bij.",
          },
          {
            title: "Gezinslid toevoegen bij CZ",
            body: "Op de pagina Verdragspolis staat de knop om een gezinslid toe te voegen. CZ zet uiteen wanneer een partner of kind wel en niet mag. Stuur wat CZ daarna vraagt naar verdragspolis@cz.nl.",
          },
        ],
        links: [{ label: "CZ Verdragspolis", href: CZ }],
      },
      {
        id: "be",
        title: "Gezin woont in België",
        intro: "Het gezin schrijft zich in bij het Belgische ziekenfonds, met het BL1 van de werknemer of met een eigen recht.",
        steps: [
          {
            title: "Ziekenfonds",
            body: "Het fonds zegt welke akten het wil zien voor partner en kinderen. Een partner die in België werkt, blijft bij zijn eigen fonds.",
          },
        ],
      },
      {
        id: "de",
        title: "Gezin woont in Duitsland",
        intro: "Inschrijving bij de Krankenkasse, met het S1 van de werknemer of met een eigen recht.",
        steps: [
          {
            title: "Krankenkasse",
            body: "Vraag daar gezinsverzekering (Familienversicherung) aan als de partner of het kind zelf niet verzekerd hoeft te zijn.",
          },
        ],
      },
      {
        id: "fr",
        title: "Gezin woont in Frankrijk",
        intro: "De CPAM schrijft het gezin in op basis van het S1 of S072 van de werknemer.",
        steps: [
          {
            title: "CPAM",
            body: "Geef geboorte- of huwelijksakte en de samenstelling van het gezin door aan de CPAM van het departement.",
          },
        ],
      },
      {
        id: "other",
        title: "Gezin woont elders",
        intro: "Het S1 van de werknemer is het document waarmee het lokale ziekenfonds het gezin kan inschrijven, als dat fonds gezinsleden meeneemt.",
        steps: [
          {
            title: "Lokaal fonds vragen",
            body: "Vraag welk formulier zij naast het S1 willen. De CNS-coassurance is voor wonen in Luxemburg, niet voor dit woonland.",
          },
        ],
      },
      {
        id: "unknown",
        title: "Woonland onbekend",
        intro: "Zonder land in het adres is niet te zien of het gezin naar de CNS, naar CZ of naar een fonds in België, Duitsland of Frankrijk moet.",
        steps: [],
      },
    ],
  },
  {
    id: "kinderbijslag-luxemburg",
    category: "bemanning",
    title: "Kinderbijslag Luxemburg",
    summary:
      "Aanvraag bij de Caisse pour l'avenir des enfants. Wie in een ander land woont, moet daar óók aanvragen.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote:
      "CAE, formulier allocation familiale 2025. Een grensarbeider moet in het woonland én in Luxemburg aanvragen, anders bekijkt geen van beide landen het recht.",
    steps: [
      {
        title: "In twee landen aanvragen",
        body: "De CAE zegt het uitdrukkelijk: zonder aanvraag in het woonland of in het werkland wordt het recht nergens onderzocht. Luxemburg is het werkland. Het woonland blijft dus verplicht, ook als je verwacht dat Luxemburg meer betaalt.",
      },
      {
        title: "Formulier",
        body: "Papier: Demande d’allocation familiale, opsturen naar Caisse pour l’avenir des enfants, B.P. 394, L-2013 Luxembourg. Online via MyGuichet kan alleen met LuxTrust of een Luxemburgse eID. De meeste grensarbeiders gebruiken daarom het papieren formulier.",
      },
      {
        title: "Bijlagen als het gezin niet in Luxemburg woont",
        body: "Een recent attest van woonplaats of gezinssamenstelling met alle gezinsleden, een geboorteakte van elk kind, en een bankattest (RIB). Is er al kinderbijslag in het buitenland betaald, dan een verklaring van die kas. Voor elk nieuw kind een nieuw formulier plus geboorteakte.",
      },
      {
        title: "Wijzigingen meteen doorgeven",
        body: "Scheiding, verhuizing, een kind dat gaat werken of stopt met school, of een partner die in een ander land gaat werken. De CAE kan een boete opleggen tot het bedrag dat ten onrechte is betaald, en het te veel terugvragen.",
      },
    ],
    documents: [
      { name: "Demande d’allocation familiale (CAE, 2025)", href: CAE_FORM },
    ],
    links: [
      { label: "CAE — wat je moet meesturen", href: CAE_STEPS },
      { label: "CAE — online via MyGuichet", href: CAE_GUICHET },
    ],
    residenceRoutes: [
      {
        id: "nl",
        title: "Kinderen wonen in Nederland",
        intro: "Vraag ook Nederlandse kinderbijslag aan bij de SVB. De CAE bepaalt daarna of Luxemburg het verschil bijpast.",
        steps: [],
        links: [{ label: "SVB kinderbijslag", href: "https://www.svb.nl/nl/kinderbijslag" }],
      },
      {
        id: "be",
        title: "Kinderen wonen in België",
        intro:
          "Het Belgische gewest betaalt eerst als daar een recht is. De CAE betaalt het verschil (complément différentiel) twee keer per jaar: rond eind juli voor januari–juni en rond eind januari voor juli–december. Welk fonds betaalt, hangt van het gewest af: Groeipakket in Vlaanderen, en de fondsen van Wallonië, Brussel of de Duitstalige Gemeenschap.",
        steps: [],
      },
      {
        id: "de",
        title: "Kinderen wonen in Duitsland",
        intro: "Vraag Kindergeld aan bij de Familienkasse, en de Luxemburgse bijslag bij de CAE.",
        steps: [],
        links: [
          {
            label: "Familienkasse — Kindergeld",
            href: "https://www.arbeitsagentur.de/familie-und-kinder",
          },
        ],
      },
      {
        id: "fr",
        title: "Kinderen wonen in Frankrijk",
        intro:
          "Vraag de Franse bijslag aan bij de CAF. De CAE meldt dat Frankrijk voor één kind ouder dan drie jaar niets betaalt. De Luxemburgse aanvraag blijft nodig.",
        steps: [],
        links: [{ label: "CAF", href: "https://www.caf.fr" }],
      },
      {
        id: "lu",
        title: "Kinderen wonen in Luxemburg",
        intro: "Alleen de CAE. Voor een inwoner: geboorteakte en bankattest. Geen aparte aanvraag in een ander land.",
        steps: [],
      },
      {
        id: "other",
        title: "Kinderen wonen elders",
        intro: "Vraag de gezinsbijslag aan in het woonland én stuur het CAE-formulier. Voeg de verklaring van de buitenlandse kas toe als die al betaalt.",
        steps: [],
      },
      {
        id: "unknown",
        title: "Woonland onbekend",
        intro: "Vul het land op het profiel in. Zonder woonland is de tweede aanvraag niet te kiezen.",
        steps: [],
      },
    ],
  },
  {
    id: "kinderbijslag-aanvullend",
    category: "bemanning",
    title: "Aanvullende kinderbijslag",
    summary:
      "Het complément différentiel: Luxemburg past het verschil bij als het woonland minder betaalt dan Luxemburg.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote: "CAE, pagina complément différentiel. Zelfde aanvraagformulier als de gewone kinderbijslag, plus het attest van de buitenlandse kas.",
    steps: [
      {
        title: "Wanneer dit speelt",
        body: "Als er in twee landen recht is, betaalt het ene land eerst en het andere het verschil tot het hogere bedrag. Dat verschil heet het complément différentiel. Het is geen tweede volledige kinderbijslag.",
      },
      {
        title: "Zelfde formulier",
        body: "De CAE vraagt geen apart formulier. Gebruik de demande d’allocation familiale en kruis aan dat er in het buitenland al gezinsbijslag is of was. Zet de naam van die kas, het land en het dossiernummer erop.",
      },
      {
        title: "Attest van de andere kas",
        body: "Vraag bij de kas die betaalt of het laatst betaalde een certificat concernant le droit aux prestations familiales. Zonder dat stuk kan de CAE het verschil niet vaststellen. Stuur ook gezinssamenstelling, geboorteakte en bankattest mee als die nog niet in het dossier zitten.",
      },
      {
        title: "Uitbetaling",
        body: "Bij een gezin in België waarvan de andere ouder daar werkt, betaalt de Belgische kas maandelijks en de CAE het verschil twee keer per jaar. In andere combinaties rekent de CAE zelf uit wie eerst betaalt. Geef een wijziging in werk of gezin meteen door, anders klopt het verschil niet.",
      },
    ],
    documents: [{ name: "Demande d’allocation familiale (CAE, 2025)", href: CAE_FORM }],
    links: [{ label: "CAE — complément différentiel", href: CAE_DIFFERENTIEL }],
  },
  {
    id: "pensioen-ouderdom",
    category: "bemanning",
    title: "Luxemburgs ouderdomspensioen",
    summary: "Aanvraag bij de CNAP. Het pensioen gaat niet vanzelf in.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote:
      "CNAP. Eén formulier voor ouderdom, vervroegd ouderdom en invaliditeit. Opsturen per post naar CNAP, L-2096 Luxembourg. Enkele maanden voor de datum indienen.",
    steps: [
      {
        title: "Op tijd aanvragen",
        body: "De CNAP keert alleen uit na een formele aanvraag. Dien die enkele maanden vóór de gewenste ingangsdatum in. Het gewone ouderdomspensioen is vanaf 65 jaar. Vervroegd kan vanaf 57 of 60 jaar, maar alleen als de verzekerde loopbaan lang genoeg is. De CNAP beoordeelt dat, niet wij.",
      },
      {
        title: "Formulier",
        body: "Demande de pension personnelle. Kruis pension de vieillesse à 65 ans of pension de vieillesse anticipée aan. Invullen: naam, geboorteplaats en -datum, matricule, nationaliteit, adres, burgerlijke staat, bankrekening met een RIB, laatste werk en of er nog ziekengeld loopt. Ondertekenen en per post naar CNAP, L-2096 Luxembourg. Het origineel, niet alleen een scan, tenzij je de online weg via MyGuichet gebruikt.",
      },
      {
        title: "Ook in andere landen gewerkt",
        body: "Heeft de persoon in meer landen pensioen opgebouwd, dan gaat de aanvraag naar de kas van het land waar hij het laatst verzekerd was. Die kas schakelt de andere in. Woonde hij buiten Luxemburg, geef dan ook het woonland door zodat de buitenlandse jaren meetellen.",
      },
      {
        title: "Wat je uit de bemanningslijst haalt",
        body: "Naam, geboortedatum, nationaliteit, adres, matricule en de firma. De bankrekening van de persoon, de burgerlijke staat en de loopbaan buiten dit bedrijf staan er niet in.",
      },
    ],
    documents: [{ name: "Demande de pension personnelle", href: CNAP_FORM_PERSOON }],
    links: [
      { label: "CNAP — formulieren", href: CNAP_FORMS },
      { label: "CNAP — ouderdomspensioen", href: CNAP_VIEILLESSE },
    ],
  },
  {
    id: "pensioen-invaliditeit",
    category: "bemanning",
    title: "Luxemburgs invaliditeitspensioen",
    summary: "Zelfde CNAP-formulier als het ouderdomspensioen, met het vak invaliditeit en de medische oorzaak.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote: "CNAP, demande de pension personnelle, vak pension d’invalidité. De controlearts van de sociale zekerheid beoordeelt de medische kant.",
    steps: [
      {
        title: "Wanneer",
        body: "Als de persoon door ziekte of ongeval blijvend niet meer het werk kan doen dat op de arbeidsmarkt gebruikelijk is, en de CNAP de wachttijd erkent. Een lang ziektebriefje is nog geen invaliditeitspensioen. De aanvraag is apart van de ziekmelding bij de CNS.",
      },
      {
        title: "Formulier",
        body: "Zelfde demande de pension personnelle. Kruis pension d’invalidité aan en de oorzaak: ziekte, arbeidsongeval of beroepsziekte, verkeersongeval, of iets anders. Vermeld of er nog ziekengeld of een reclassering loopt. RIB bijvoegen. Post naar CNAP, L-2096 Luxembourg.",
      },
      {
        title: "Medisch dossier",
        body: "De CNAP en de controlearts vragen de medische stukken op. Stuur mee wat de arts al heeft gegeven, maar niet het loondossier. Een arbeidsongeval moet daarnaast bij de AAA aangegeven zijn. Zie die procedure.",
      },
      {
        title: "Loopbaan in meer landen",
        body: "Ook hier geldt: aanvragen bij de kas van het land van de laatste verzekering, of zoals de CNAP in de brief vraagt. Woonland en buitenlandse ziekenfondsen vermelden.",
      },
    ],
    documents: [{ name: "Demande de pension personnelle", href: CNAP_FORM_PERSOON }],
    links: [{ label: "CNAP — formulieren", href: CNAP_FORMS }],
  },
  {
    id: "pensioen-nabestaanden",
    category: "bemanning",
    title: "Nabestaandenpensioen",
    summary: "Aanvraag door de nabestaande bij de CNAP na overlijden. Gaat niet vanzelf in, ook niet als de overledene al pensioen had.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote:
      "CNAP, demande de pension de survie. Overlijdensakte en een huwelijksakte die ná het overlijden is afgegeven. Post naar CNAP, L-2096 Luxembourg.",
    steps: [
      {
        title: "Wie vraagt aan",
        body: "De langstlevende echtgenoot of geregistreerde partner, of de voogd voor een wees. De CNAP stuurt soms zelf een formulier als zij het overlijden van een pensioengerechtigde kennen en het adres hebben. Afwachten is geen aanvraag. Zonder formulier gebeurt er niets.",
      },
      {
        title: "Formulier en akten",
        body: "Demande en obtention d’une pension de survie. Meesturen: uittreksel van de overlijdensakte, en een volledige huwelijksakte of partnerschapsverklaring die ná het overlijden is afgegeven. RIB van de aanvrager. Voor een kind van 18 tot 27 jaar dat studeert of in de leer is: schoolbewijs of leercontract. Voor een volle wees die minderjarig is: de voogdijakte. Deze akten zijn volgens de CNAP gratis op grond van artikel 398 van het socialezekerheidswetboek.",
      },
      {
        title: "Wezen",
        body: "Een wezenpensioen loopt tot 18 jaar, en tot 27 jaar zolang de opleiding duurt. Op het formulier alleen de kinderen zetten die daarvoor in aanmerking komen, met matricule of geboortedatum.",
      },
      {
        title: "Grensarbeider",
        body: "De CNAP raadt nabestaanden van een grensarbeider aan de aanvraag ook bij de instelling van het woonland te doen. Had de overledene in meer landen gewerkt, dan gaat het dossier naar de kas van de laatste verzekering. Die vraagt de andere landen uit.",
      },
    ],
    documents: [{ name: "Demande de pension de survie", href: CNAP_FORM_SURVIE }],
    links: [
      { label: "CNAP — nabestaandenpensioen", href: CNAP_SURVIE },
      { label: "CNAP — formulieren", href: CNAP_FORMS },
    ],
  },
  {
    id: "ziekmelding-cns",
    category: "bemanning",
    title: "Ziekmelding en verlenging via CNS",
    summary:
      "Certificaat naar de werknemer, naar de werkgever en naar de CNS. De loondoorbetaling stopt na de 77e ziektedag in 18 maanden.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote:
      "CNS en Guichet. De 77 dagen zijn kalenderdagen in de 18 maanden vóór de maand die je bekijkt. De ziekmelding zelf houd je bij op de pagina Ziekte.",
    steps: [
      {
        title: "De persoon meldt zich ziek bij de werkgever",
        body: "Op de eerste dag van afwezigheid. Het medische attest gaat naar de werkgever: elektronisch via MyGuichet als de arts in Luxemburg een elektronisch certificaat maakt en de professionele ruimte van de firma aanstaat, anders op papier (volet 2). Een attest uit het buitenland blijft papier of een scan. Een zeevaart- of huisartsenbrief zonder de verplichte gegevens is niet genoeg voor de CNS.",
      },
      {
        title: "Naar de CNS vanaf de derde werkdag",
        body: "Tot en met twee werkdagen: niets naar de CNS. Vanaf drie werkdagen: het certificaat vóór het einde van de derde werkdag bij de CNS. Verlenging: vóór het einde van de tweede werkdag na de dag waarop hij weer had moeten beginnen. Het attest mag hooguit twee dagen terugwerken. Daarna telt de CNS pas vanaf de dag van het onderzoek. Digitaal via het formulier op de site van de CNS, met een leesbare pdf van hooguit 5 MB. Per post, zonder postzegel vanuit Luxemburg: Caisse nationale de santé, Indemnités pécuniaires, L-2980 Luxembourg. De poststempel telt.",
      },
      {
        title: "Werkgever verklaart elke maand",
        body: "De periodes van de vorige maand en de exacte afwezige uren, ook op een feestdag waarop hij had moeten werken. Via SECUline (DECMAL) of MyGuichet, procedure CCSS: Déclaration de salaires et incapacités de travail. Blijf dat doen als de CNS al betaalt. De uren ziekte mogen niet hoger zijn dan de aangegeven werkuren. Zonder deze aangifte kan de Mutualiteit het loon niet terugbetalen en kan de CNS het ziekengeld niet berekenen.",
      },
      {
        title: "Wie het loon betaalt",
        body: "De firma betaalt door tot het einde van de maand waarin de 77e ziektedag valt. Die 77 dagen zijn kalenderdagen, weekenden mee, geteld over de 18 maanden vóór de maand die je bekijkt. Vanaf de eerste dag van de maand daarna betaalt de CNS, nadat zij de firma heeft geschreven. Wisselt iemand van werkgever, dan begint de teller van 77 dagen opnieuw. De CNS betaalt in totaal hooguit 78 weken binnen 104 weken. Daarna stopt het ziekengeld.",
      },
      {
        title: "Buiten Luxemburg ziek",
        body: "De termijnen zijn dezelfde, of de persoon nu thuis is of aan boord in een ander land. Een arts buiten Luxemburg maakt geen Luxemburgs elektronisch certificaat. Stuur dat attest als pdf via het CNS-formulier of per post. Zet de ziektedagen ook op de pagina Ziekte, met betaald door CNS zodra de CNS het overneemt.",
      },
    ],
    documents: [{ name: "CNS — certificaat digitaal insturen", href: CNS_FORMULIER }],
    links: [
      { label: "CNS — voor de werkgever", href: CNS_WERKGEVER },
      { label: "CNS — wanneer de kas betaalt", href: CNS_INDEMNITEIT },
      { label: "Guichet — loondoorbetaling", href: GUICHET_LOON },
      { label: "CCSS — maandelijkse aangifte", href: CCSS_ZIEK },
    ],
  },
  {
    id: "arbeidsongeval-aaa",
    category: "bemanning",
    title: "Arbeidsongeval melden via AAA",
    summary:
      "Elk ongeval op het werk of onderweg, ook zonder verlet. De werkgever meldt bij de AAA, het ziektebriefje gaat apart naar de CNS.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote:
      "Instructies AAA via Guichet. Melding door de werkgever, zo snel mogelijk en uiterlijk één jaar na het ongeval. declaration.aaa@secu.lu.",
    steps: [
      {
        title: "Wat je meldt",
        body: "Elk arbeidsongeval en elk ongeval op de weg van of naar het werk. Ook een klein ongeval zonder ziekteverzuim, en een ongeval waarbij alleen het voertuig schade heeft en niemand gewond is. Twijfel je of het werk is, meld het toch en kruis op het formulier aan dat de toedracht niet vaststaat. Voeg dan een verklaring van twijfel toe.",
      },
      {
        title: "Wie en wanneer",
        body: "De werkgever of iemand die daarvoor gevolmachtigd is. Zo snel mogelijk, uiterlijk één jaar na de dag van het ongeval. De persoon zelf kan de AAA binnen dat jaar schrijven als de firma niet meldt. De AAA vraagt dan eerst de firma om standpunt.",
      },
      {
        title: "Hoe",
        body: "Het voorgeschreven formulier van www.aaa.lu, rubriek documentatie, formulieren. Volledig invullen: matricule werkgever (13 of 15 cijfers), matricule van de persoon, plaats, uur, toedracht, getuigen. Opsturen naar Association d’assurance accident, L-2976 Luxembourg, of als pdf naar declaration.aaa@secu.lu, of fax +352 49 53 35. Een kopie aan de persoon geven en een kopie in het dossier houden. De AAA stuurt zo nodig een kopie naar de ITM.",
      },
      {
        title: "Ziektebrief en rekeningen apart",
        body: "Medische attesten en honoraria gaan naar de CNS, niet naar de AAA. Volg daarvoor de procedure ziekmelding. De AAA regelt de erkenning en de vergoeding van het ongeval. Alleen materiële schade aan het eigen voertuig, zonder letsel: op het formulier dat vak aankruisen. Vergoeding daarvan vraagt de persoon zelf, met een eigen risico van twee derde van het minimumloon, en alleen als de schade niet ergens anders verzekerd is.",
      },
    ],
    documents: [{ name: "Instructies aangifte arbeidsongeval (AAA)", href: AAA_UITLEG }],
    links: [
      { label: "Uitleg termijnen en adressen", href: AAA_CSL },
      { label: "AAA", href: "https://www.aaa.lu" },
      { label: "declaration.aaa@secu.lu", href: "mailto:declaration.aaa@secu.lu" },
    ],
  },
  {
    id: "medische-keuring-binnenvaart",
    category: "bemanning",
    title: "Medische keuring binnenvaart",
    summary:
      "Geneeskundige verklaring voor dienstboekje of vaarbevoegdheid. Niet de keuring van de bedrijfsarts, en niet een keuring voor de zeevaart.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote:
      "ILT voor Nederlandse documenten. STM Luxemburg alleen voor een EU-certificaat dat Luxemburg zelf afgeeft. Een Rijnpatent-keuring moet bij een erkende arts in een Rijnoeverstaat. De verklaring is hooguit 3 maanden geldig op de dag van de aanvraag. De einddatum zet je daarna op Medische keuringen.",
    steps: [
      {
        title: "Welke keuring",
        body: "Voor een dienstboekje of een Nederlands of Europees kwalificatiecertificaat via het CBR: een arts die het ministerie van Infrastructuur en Waterstaat heeft aangewezen. Niet de eigen huisarts en niet de bedrijfsarts. Identiteit met paspoort of identiteitskaart, niet met het dienstboekje. Een zeevaartkeuring telt niet. Bij goedkeuring krijg je een geneeskundige verklaring. Bij afkeuring een verklaring van ongeschiktheid. Een tijdelijke afkeuring moet bij dezelfde arts herkeurd worden.",
      },
      {
        title: "Luxemburgs EU-certificaat",
        body: "Alleen als het certificaat in Luxemburg wordt afgegeven of verlengd: de keuring bij de Service de santé au travail (STM). Die verklaring geldt niet voor een Rijnpatent en niet voor een certificaat uit een ander land. Vernieuwing van een Luxemburgs EU-certificaat moet ook in Luxemburg gebeuren. De STM-verklaring binnen 3 maanden indienen bij het ministerie van Mobiliteit.",
      },
      {
        title: "Rijnpatent",
        body: "De medische verklaring voor een Rijnvergunning vraag je bij een erkende medische instantie in een lidstaat van de Centrale Commissie voor de Rijnvaart. De Luxemburgse STM-verklaring is daarvoor niet genoeg. Guichet zegt dat uitdrukkelijk.",
      },
      {
        title: "Geldigheid",
        body: "Bij de eerste afgifte mag de verklaring niet ouder zijn dan 3 maanden. Daarna: om de vijf jaar vanaf 60 jaar, en om de twee jaar vanaf 70 jaar, volgens het Rijnreglement. Beperkingen komen op het certificaat. Zet de uitslag en de einddatum op de pagina Medische keuringen, zodat de vervaldatum in de bemanningslijst zichtbaar blijft.",
      },
    ],
    links: [
      { label: "ILT — keuring binnenvaart", href: ILT_KEURING },
      { label: "STM Luxemburg", href: STM },
      { label: "Guichet — kwalificatiecertificaat", href: GUICHET_KWALIFICATIE },
    ],
  },
  {
    id: "dienstboekje-vaarbevoegdheid",
    category: "bemanning",
    title: "Dienstboekje en vaarbevoegdheid",
    summary: "Dienstboekje bij de SAB. Schipperscertificaat en Rijnvergunning bij het CBR.",
    status: "uitgewerkt",
    subject: "crew",
    sourceNote: "SAB voor het dienstboekje en de vaartijd. CBR divisie CCV voor het EU-kwalificatiecertificaat en de specifieke vergunningen, waaronder varen op de Rijn.",
    steps: [
      {
        title: "Eerste dienstboekje",
        body: "Verplicht op een bedrijfsmatig binnenschip. Aanvragen bij de SAB, digitaal in de webshop of per post naar Postbus 5700, 3008 AS Rotterdam. Nodig: aanvraagformulier, één pasfoto, kopie van een geldig identiteitsbewijs, en een originele geneeskundige verklaring binnenvaart van hooguit 3 maanden. Voor deksman tot en met stuurman die nog nooit een boekje had: minimaal 16 jaar, of 15 jaar met een leerovereenkomst, plus het certificaat basistraining veiligheid deksman of een STCW-basistraining. Een VCA-certificaat telt niet. Een monsterboekje kan voor hooguit twee jaar zeevaart meetellen, waarbij 250 zeedagen als één jaar gelden.",
      },
      {
        title: "Vervolg, stempel en functie",
        body: "Een vol boekje, een functiewijziging naar matroos of machinist, en een vaartijdverklaring voor een examen, een vaarbewijs of ADN type C of G vraag je ook bij de SAB. Het schip vult de reizen in het boekje. Zonder bijgehouden reizen kan de SAB geen vaartijd afgeven.",
      },
      {
        title: "Vaarbevoegdheid schipper",
        body: "Het EU-kwalificatiecertificaat schipper vraag je via Mijn CBR met DigiD, of zonder DigiD met het papieren formulier naar klantenservice.CCV@cbr.nl of CBR divisie CCV, Postbus 1810, 2280 DV Rijswijk. Een specifieke vergunning, zoals varen op de Rijn of met radar, kan pas als het schipperscertificaat er is. Die vergunningen staan op het certificaat en verlopen tegelijk.",
      },
      {
        title: "Verlengen",
        body: "Vanaf drie maanden voor de einddatum, bij dezelfde instantie als de eerste afgifte. Meesturen: kopie van de geneeskundige verklaring van hooguit 3 maanden, tenzij voor die leeftijd een vrijstelling geldt, en een pasfoto met naam en geboortedatum op de achterkant. Met een verlopen certificaat mag je niet varen. Verlengen mag nog wel nadat het verlopen is.",
      },
    ],
    documents: [{ name: "Aanvraagformulier dienstboekje en vaartijd (SAB)", href: SAB_FORM }],
    links: [
      { label: "SAB — eerste dienstboekje", href: SAB },
      { label: "CBR — aanvragen", href: CBR_AANVRAAG },
      { label: "CBR — verlengen", href: CBR_VERLENGEN },
    ],
  },
]
