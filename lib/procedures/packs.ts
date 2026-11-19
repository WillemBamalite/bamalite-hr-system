import type { ProcedurePack } from "@/lib/procedures/types"

const AED = [
  "Administration de l’enregistrement, des domaines et de la TVA",
  "Bureau des Actes Civils — Schiltzeplatz (Hôtel des Postes)",
  "L-6774 Grevenmacher",
  "Post: B.P. 22, L-6701 Grevenmacher",
  "Telefoon +352 247-80585",
  "Fax +352 247-90400",
  "grevenmacher@en.etat.lu",
  "Balie: 08.30–12.00 en 14.00–16.00",
]

const MMTP = [
  "Ministère de la Mobilité et des Travaux publics",
  "Service Navigation intérieure et logistique",
  "4, place de l’Europe, L-1499 Luxembourg",
  "Post: L-2940 Luxembourg",
  "Telefoon +352 247 84 400",
  "inlandnavigation@mmtp.etat.lu",
]

const MMTP_ADN = [
  "Zelfde gebouw: 4, place de l’Europe, L-1499 Luxembourg",
  "ADN-dossiers per mail: adn@mmtp.etat.lu",
  "Pdf’s noemen: Justificatif 1, Justificatif 2, enzovoort",
]

export const PROCEDURE_PACKS: Record<string, ProcedurePack[]> = {
  "schip-inschrijven": [
    {
      title: "1. Notaris Serres — vóór er iets naar Grevenmacher gaat",
      how: "Per mail. Dit is de eerste stap bij een aankoop.",
      lines: [
        "Notaris Patrick Serres",
        "secretariat@notaireserres.lu",
        "Telefoon +352 236 1951",
      ],
      bring: [
        "Koopcontract in het Duits of Engels",
        "Bewijs van uitschrijving uit het oude scheepsregister, in het Duits, Engels of Frans",
        "Melding dat het schip naar Grevenmacher komt en dat er geen hypotheek op staat",
      ],
    },
    {
      title: "2. Ministerie — meetbrief laten erkennen",
      how: "Per mail, nadat het contract bij de notaris ligt. Bij Bamalite loopt dit via Kevin Schreuder.",
      lines: [
        "Kevin Schreuder",
        "inlandnavigation@mmtp.etat.lu",
        "Telefoon +352 247 844 32",
        "Service Navigation intérieure et logistique",
        "4, place de l’Europe, L-1499 Luxembourg",
      ],
      bring: [
        "Formulier F0, aangekruist namens de eigenaar",
        "De buitenlandse meetbrief",
        "Klassecertificaat en verzekeringsattest",
        "Bareboat-charter, als de eigenaar in het buitenland zit",
      ],
      note: "Guichet vraagt dezelfde bijlagen bij F0. Zonder erkende meetbrief schrijft de AED het schip niet in.",
    },
    {
      title: "3. Mapje voor het scheepsregister in Grevenmacher",
      how: "Bellen pas als je weet wanneer het schip in Grevenmacher ligt. Na het bezoek gaat het origineel van het gele bewijs naar Serres, een kopie in het mapje. De volmachten van Serres komen daarna. Formulieren ook op een stick. Alles in het Frans of Duits.",
      lines: [
        "Colette Bentner, colette.bentner@en.etat.lu",
        "Op het formulier +352 247-80588, op het begeleidende blad +352 247-80800",
        ...AED,
      ],
      bring: [
        "Duits aanvraagformulier Antrag zur Einschreibung von Binnenschiffen, ingevuld en getekend. Het voorbeeld opent onder Formulieren",
        "Meetbrief die het ministerie heeft erkend",
        "Doorhalingsbewijs uit het oude register, origineel, in het Duits of Frans",
        "Koopakte via de notaris, op transcriptiepapier, met de volmachten volledig mee overgenomen",
        "Geel bewijs: origineel naar Serres, kopie in het mapje",
        "Verklaring 1: het commerciële en economische beheer zit in Luxemburg, en de activiteit is niet beperkt tot personeelsbeheer",
        "Verklaring 2: behalve het varen zelf gebeurt het werk in Luxemburg, en dat kun je bij een controle laten zien",
        "Verklaring 3: geen doorverhuur of onderverhuur, de beschikkingsmacht ligt bij de aanvrager",
        "Verklaring 4: de vracht valt in de winst-en-verliesrekening van de firma",
        "Verklaring 5: de kantoorploeg, zonder de bemanning, met hun uren en de arbeidscontracten. Bemanning hoort niet op die lijst",
        "RCS-uittreksel waaruit blijkt wie mag tekenen",
        "Vestigingsvergunning",
        "Bareboat-charter, als die er is",
        "Jaarrekening of afschrijvingstabel van de schepen",
        "Aanvraag van de Rijnvaartverklaring. De Duitse aanwijzing van het loket zet die in hetzelfde dossier",
      ],
      note: "De Duitse aanwijzing in het mapje noemt bij een getoond schip ongeveer 200 euro aan zegel, hypotheekbewaring, certificaten en kopieën, plus 1,2% registratierecht en 0,5% transcriptierecht op de koopakte. Die bedragen staan op een blad met een verouderd briefhoofd. Gebruik ze niet als vast tarief zonder het loket te vragen. Het officiële reglement vraagt daarnaast de gecontroleerde meetbrief, het handelsregisteruittreksel en de eigendomstitel. Die zitten in de lijst hierboven.",
    },
    {
      title: "Uitschrijven",
      how: "Schriftelijk bij hetzelfde loket. Daarna het ministerie, het klassebureau en de verzekeraar.",
      lines: AED,
      bring: [
        "Verzoek tot doorhaling",
        "Bewijs van verkoop, sloop, of inschrijving in een ander register",
        "Bij verlies of onherstelbare schade: attest van de meetdienst",
        "Het inschrijvingsbewijs, als je het nog hebt",
      ],
    },
  ],
  "eigendom-exploitant": [
    {
      title: "AED Grevenmacher — nieuwe eigenaar of exploitant",
      how: "Eerst dit loket. Het ministerie zet de technische certificaten pas om als het attest er is.",
      lines: AED,
      bring: [
        "Koopakte of factuur, en het bewijs dat de vorige inschrijving is doorgehaald of wordt overgedragen",
        "Uittreksel handelsregister van de nieuwe eigenaar of exploitant, of identiteit bij een natuurlijk persoon",
        "Inschrijvingsbewijs van het schip",
        "Het oude exploitantenattest en de oude Rijnvaartverklaring, als die de oude naam dragen",
        "Volmacht, als niet de bestuurder zelf tekent",
      ],
      note: "Het certificat d’exploitant en de Rijnvaartverklaring komen van dit loket, niet van het klassebureau.",
    },
    {
      title: "Daarna het ministerie — formulier F0 opnieuw",
      how: "Per mail, zodra het nieuwe attest van de AED binnen is.",
      lines: MMTP,
      bring: [
        "Formulier F0 op de nieuwe naam",
        "Kopie van het nieuwe exploitantenattest of van de nieuwe inschrijving",
        "Klassecertificaat en verzekeringsattest op de nieuwe naam, zodra die er zijn",
      ],
    },
  ],
  rijnvaartverklaring: [
    {
      title: "AED Grevenmacher — Rijnvaartverklaring",
      how: "Het formulier van de Centrale Commissie voor de Rijnvaart vraagt het complete dossier per post naar B.P. 22. Je kunt ook naar de balie. Neem dan de originelen mee, naast de kopieën.",
      lines: AED,
      bring: [
        "Aanvraagformulier attest d’appartenance, ingevuld en getekend. Link staat bij Formulieren. Er is een Franse en een Duitse versie",
        "Kopie paspoort of identiteitsbewijs van de eigenaar. Is de eigenaar een vennootschap, dan ook van de bestuurders",
        "Uittreksel handelsregister van de eigenaar, jonger dan 6 maanden. Zit de vennootschap in een holding, dan ook een uittreksel van de holding. Er moet een natuurlijke persoon als bestuurder op staan als dat van toepassing is",
        "Kopie van het geldige Certificaat van Onderzoek (certificat de visite)",
        "Kopie van het inschrijvingsbewijs",
        "Geldig exploitantenattest, als de exploitant niet dezelfde persoon of vennootschap is als de eigenaar",
        "Bij een wijziging of een duplicaat: het oude certificaat, of een verklaring dat het zoek is",
      ],
      note: "Lijst uit het CCNR-dossier (maart 2026). Het reglement van 11 juni 1987 legt de afgifte bij de ontvanger in Grevenmacher. Alleen het land van inschrijving geeft dit stuk af. Het origineel hoort aan boord.",
    },
  ],
  exploitatievergunning: [
    {
      title: "AED Grevenmacher — exploitantenattest",
      how: "Zelfde loket als de Rijnvaartverklaring. De AED publiceert geen aparte bijlagenlijst alleen voor dit attest. Neem mee wat dit loket voor de inschrijving en het Rijncertificaat ook vraagt, plus het bewijs van beheer vanuit Luxemburg.",
      lines: AED,
      bring: [
        "Schriftelijk verzoek. Het loket heeft aangifteformulieren",
        "Uittreksel handelsregister van de exploitant, of identiteit als het een natuurlijk persoon is",
        "Bewijs dat het beheer vanuit Luxemburg gebeurt: zetel in Luxemburg, thuishaven Port de Mertert, of de bareboat-charter als de eigenaar in het buitenland zit",
        "Inschrijvingsbewijs of meetbrief, zodat het loket het schip herkent",
        "Het oude attest, als je het laat wijzigen of verlengen",
        "Volmacht, als een gemachtigde tekent",
      ],
      note: "Bel +352 247-80585 voordat je rijdt als het om een wijziging gaat. Formulier F0 van het ministerie wil dit attest zien zodra er geen Luxemburgse thuishaven is.",
    },
  ],
  "certificaat-van-onderzoek": [
    {
      title: "Ministerie — Uniecertificaat (formulier F1)",
      how: "Per mail of per post, na de keuring van het klassebureau. Het ministerie geeft het certificaat af. Het bureau keurt.",
      lines: MMTP,
      bring: [
        "Formulier F1, demande de certificat de l’Union. Download op de Guichet-pagina bij Formulieren",
        "Kopie van het vorige certificaat, verplicht als het een wijziging is",
        "Kopie van de meetbrief",
        "Bij nieuwbouw: bouw- of koopcontract, factuur of kadastraal uittreksel",
        "Conformiteitsverklaring van Lloyd’s Register of Bureau Veritas, het bureau dat op het schip staat",
        "Bewijs dat de kosten aan het klassebureau zijn betaald",
        "Bij een duplicaat: bewijs van verlies, diefstal of vernietiging",
      ],
      note: "Guichet, 19 februari 2025. Definitief certificaat 200 euro, voorlopig 100 euro, vervanging of aanpassing 50 euro. Tankers: hooguit 5 jaar.",
    },
  ],
  meetbrief: [
    {
      title: "Klassebureau — de meting",
      how: "Afspraak bij Lloyd’s Register of Bureau Veritas, het bureau dat bij het schip staat. Geen loket van het ministerie voor de meting zelf.",
      lines: ["Het bureau staat rechts, zodra je het schip kiest."],
      bring: [
        "ENI en huidige naam, zoals op het certificaat",
        "Vorige meetbrief, als die er is",
        "Tekeningen als de romp of de tonnage is gewijzigd",
      ],
    },
    {
      title: "Ministerie — Luxemburgse brief of erkenning van een buitenlandse",
      how: "Per mail of op papier. Een vrije brief mag voor een nieuwe Luxemburgse meetbrief. Erkenning van een buitenlandse brief gaat met formulier F0.",
      lines: MMTP,
      bring: [
        "Formulier F0 bij erkenning van een buitenlandse meetbrief",
        "De buitenlandse meetbrief, of het rapport van de nieuwe meting",
        "Kopie van het exploitantenattest als er geen thuishaven is",
        "Bewijs van de thuishaven als er geen exploitantenattest is",
        "Klassecertificaat en verzekeringsattest, zoals F0 die noemt",
      ],
      note: "Hooguit 15 jaar, 10 jaar bij gevaarlijke goederen. Opnieuw meten als een verbouwing de tonnage verandert.",
    },
  ],
  "tijdelijk-certificaat": [
    {
      title: "Eerst het klassebureau",
      how: "Schade-opname vóór je het ministerie om een voorlopig certificaat vraagt.",
      lines: ["Lloyd’s Register of Bureau Veritas, het bureau dat bij het schip staat."],
      bring: [
        "Tijd, plaats en ENI",
        "Foto’s van vóór de reparatie",
        "Journaaluitreksel",
        "Het geldende Certificaat van Onderzoek",
      ],
    },
    {
      title: "Ministerie — voorlopig Uniecertificaat",
      how: "Alleen als het certificaat door de schade niet meer klopt. 100 euro volgens Guichet.",
      lines: MMTP,
      bring: [
        "Verzoek om een certificat provisoire, met formulier F1",
        "Voorlopig bericht of schade-rapport van het klassebureau",
        "Kopie van het beschadigde of niet meer geldige certificaat",
        "Kopie van de meetbrief",
      ],
      note: "Na de reparatie een nieuwe keuring en het definitieve certificaat aanvragen vóór het voorlopige afloopt. De geldigheidsduur van het voorlopige stuk zet het ministerie op het certificaat.",
    },
  ],
  "adn-certificaat-schip": [
    {
      title: "Ministerie — ADN-certificaat van het schip",
      how: "Per mail, na de ADN-keuring. Niet het ADN-certificaat van de bemanning.",
      lines: MMTP_ADN,
      bring: [
        "Formulier Guichet, droog vrachtschip of tanker, ingevuld, gedateerd en getekend",
        "Kopie identiteitskaart van de aanvrager",
        "Inschrijvingsbewijs",
        "Klassecertificaat",
        "Keuringsrapport van Lloyd’s Register, Bureau Veritas of Germanischer Lloyd, in het Frans, Duits of Engels",
        "Bij een tanker: de stoffenlijst van datzelfde bureau",
        "Het vorige ADN-certificaat",
        "Volmacht, als een gemachtigde tekent",
        "Bij verlies of diefstal: politieverklaring. Bij vernietiging: het oude certificaat terug",
        "Bij wijziging of verlenging zonder keuring: een brief die motiveert waarom",
      ],
      note: "Guichet, 16 december 2024. Hooguit 5 jaar. De 100 euro voor het conformiteitsattest betaal je aan het klassebureau, niet aan het ministerie. Een voorlopig ADN-certificaat is hooguit 3 maanden, en na schade alleen voor één reis en één lading.",
    },
  ],
  "klasse-inspectie": [
    {
      title: "Aan boord als de surveyor komt",
      how: "De afspraak maak je bij het bureau dat rechts bij het schip staat. Er is geen Luxemburgs loket voor de keuring zelf. Het rapport stuur je daarna naar het ministerie.",
      lines: [
        "Lloyd’s Register of Bureau Veritas, zoals op het schip",
        "Rapport Uniecertificaat daarna naar inlandnavigation@mmtp.etat.lu",
        "Rapport ADN daarna naar adn@mmtp.etat.lu",
      ],
      bring: [
        "Originelen: Certificaat van Onderzoek, meetbrief, Rijnvaartverklaring, exploitantenattest, ADN-certificaat met stoffenlijst, klassecertificaat, verzekering",
        "Vorige klasse-rapporten, en foto of factuur van elk punt dat toen openstond",
        "ENI en naam zoals op het certificaat",
        "Bemanningslijst met geldige vaardocumenten",
        "Testboeken, journaal en olielogboek",
      ],
    },
  ],
  "zorgverzekering-na-inschrijving": [
    {
      title: "CCSS — aangifte indienst, binnen 8 dagen",
      how: "Liever SECUline (DECAFF) of MyGuichet, professionele ruimte. Het papieren formulier kan ook. Het adres van het loket staat op het formulier zelf. Gebruik dat, niet een oud postbusnummer uit een map.",
      lines: [
        "SECUline of MyGuichet, per firma, met het werkgeversmatricule dat rechts staat",
        "Papieren formulier: Déclaration d’entrée pour salarié du secteur privé",
      ],
      bring: [
        "Matricule van de persoon, 13 cijfers. Ontbreekt het bij een EU-nationaliteit: eerst DEMMAT of Demande de matricule, met een kleurenkopie van identiteitskaart of paspoort",
        "Naam, volledig adres met land, functie",
        "Uren per week uit het contract",
        "Datum indiensttreding en einde proeftijd",
        "Landen waar hij met het schip vaart: L, B, D, F, NL of ander",
        "Matricule van de werkgever",
      ],
      note: "Guichet: te laat melden kan 50 euro per maand kosten na 30 dagen tolerantie, tot 2.500 euro. Bewaar de bevestiging. Daarop staat het matricule.",
    },
  ],
  "s1-opnieuw-aanvragen": [
    {
      title: "CNS — S1 of BL1 opnieuw",
      how: "Online bij de CNS. Nederland krijgt het S1 niet vanzelf.",
      lines: ["Bestellen via de CNS-pagina die bij Instanties staat.", "Doen als het stuk 15 dagen na de CCSS-bevestiging nog niet binnen is."],
      bring: [
        "Matricule van de persoon",
        "Woonadres in het land waar hij zorg wil",
        "Voor Nederland daarna: het S1 én het CZ-aanmeldformulier samen naar verdragspolis@cz.nl",
      ],
    },
  ],
  "zorgverzekering-gezin": [
    {
      title: "CNS — gezinsleden meeverzekeren",
      how: "Alleen als het gezin in Luxemburg woont. Partner en meerderjarig kind lopen niet vanzelf mee.",
      lines: [
        "Caisse nationale de santé",
        "Telefoon (+352) 2757-1",
        "De pagina staat bij Instanties",
      ],
      bring: [
        "Matricule van de werknemer",
        "Identiteit van partner of kind",
        "Bewijs dat zij in het huishouden in Luxemburg wonen",
        "Bij een partnerschap uit het buitenland: inschrijving in het répertoire civil",
      ],
      note: "Gezinsgegevens staan niet op het bemanningsprofiel. Die haal je uit de akten, niet uit deze lijst.",
    },
  ],
  "kinderbijslag-luxemburg": [
    {
      title: "CAE — kinderbijslag",
      how: "Papieren formulier per post. MyGuichet alleen met LuxTrust of een Luxemburgse eID. Vraag ook aan in het woonland, anders onderzoekt geen van beide landen het recht.",
      lines: [
        "Caisse pour l’avenir des enfants",
        "B.P. 394",
        "L-2013 Luxembourg",
      ],
      bring: [
        "Demande d’allocation familiale, ingevuld en getekend. Formulier 2025 staat bij Formulieren",
        "Recent attest van woonplaats of gezinssamenstelling, met alle gezinsleden, als het gezin niet in Luxemburg woont",
        "Geboorteakte van elk kind. Een nieuw kind is een nieuw formulier plus geboorteakte",
        "Bankattest (RIB)",
        "Betaalt een buitenlandse kas al: een verklaring van die kas",
      ],
    },
  ],
  "kinderbijslag-aanvullend": [
    {
      title: "CAE — het verschil, zelfde formulier",
      how: "Geen tweede aanvraag. Zelfde postadres als de gewone kinderbijslag.",
      lines: ["Caisse pour l’avenir des enfants", "B.P. 394", "L-2013 Luxembourg"],
      bring: [
        "Demande d’allocation familiale, met aangekruist dat er in het buitenland al gezinsbijslag is of was",
        "Naam van die kas, het land en het dossiernummer",
        "Certificat van die kas over het recht op gezinsbijslag",
        "Gezinssamenstelling, geboorteakte en RIB, als die nog niet in het dossier zitten",
      ],
      note: "Bij een gezin in België betaalt de Belgische kas maandelijks en de CAE het verschil twee keer per jaar.",
    },
  ],
  "pensioen-ouderdom": [
    {
      title: "CNAP — ouderdomspensioen",
      how: "Het origineel per post, enkele maanden vóór de gewenste datum. Of MyGuichet. Het pensioen gaat niet vanzelf in.",
      lines: ["Caisse nationale d’assurance pension", "L-2096 Luxembourg"],
      bring: [
        "Demande de pension personnelle, vak ouderdom 65 of vervroegd",
        "Matricule, naam, geboorteplaats en -datum, nationaliteit, adres, burgerlijke staat",
        "RIB van de rekening waarop het pensioen moet",
        "Laatste werk, en of er nog ziekengeld loopt",
      ],
      note: "De bankrekening en de burgerlijke staat staan niet in de bemanningslijst. Vervroegd pensioen beoordeelt de CNAP. Heeft hij in meer landen gewerkt, dan de aanvraag naar de kas van het land waar hij het laatst verzekerd was.",
    },
  ],
  "pensioen-invaliditeit": [
    {
      title: "CNAP — invaliditeit, zelfde formulier",
      how: "Origineel per post. Kruis invalidité aan en vul de oorzaak in.",
      lines: ["Caisse nationale d’assurance pension", "L-2096 Luxembourg"],
      bring: [
        "Demande de pension personnelle, vak pension d’invalidité",
        "Medische stukken die de oorzaak onderbouwen. De controlearts van de sociale zekerheid beoordeelt",
        "Matricule, adres en RIB",
        "Is het een arbeidsongeval: ook de aangifte bij de AAA, apart van deze brief",
      ],
    },
  ],
  "pensioen-nabestaanden": [
    {
      title: "CNAP — nabestaandenpensioen",
      how: "Origineel per post. De overlevende partner vraagt ook aan bij de kas van het woonland.",
      lines: ["Caisse nationale d’assurance pension", "L-2096 Luxembourg"],
      bring: [
        "Demande de pension de survie",
        "Overlijdensakte",
        "Volledige huwelijks- of partnerschapsakte, afgegeven ná het overlijden",
        "Voor een wees van 18 tot 27: bewijs van school of opleiding. Voor een minderjarige volle wees: de voogdij",
        "RIB van de nabestaande",
      ],
      note: "De akte na het overlijden is gratis volgens de CNAP (artikel 398 van de Code de la sécurité sociale).",
    },
  ],
  "ziekmelding-cns": [
    {
      title: "CNS — ziektebrief vanaf de derde werkdag",
      how: "Digitaal, pdf hooguit 5 MB, of per post. Vanuit Luxemburg zonder postzegel. De poststempel telt. Tot en met twee werkdagen gaat er niets naar de CNS.",
      lines: [
        "Caisse nationale de santé",
        "Indemnités pécuniaires",
        "L-2980 Luxembourg",
      ],
      bring: [
        "Het medische attest. Een arts buiten Luxemburg maakt geen elektronisch Luxemburgs certificaat: scan of papier",
        "Verlenging: vóór het einde van de tweede werkdag na de dag waarop hij weer had moeten beginnen",
        "De werkgever blijft maandelijks de uren aangeven via SECUline (DECMAL) of MyGuichet, ook als de CNS al betaalt",
      ],
      note: "Het attest mag hooguit twee dagen terugwerken. De ziektedagen zelf zet je op de pagina Ziekte.",
    },
  ],
  "arbeidsongeval-aaa": [
    {
      title: "AAA — arbeidsongeval of ongeval onderweg",
      how: "De werkgever, zo snel mogelijk en uiterlijk één jaar. Medische attesten en rekeningen gaan naar de CNS, niet hierheen.",
      lines: [
        "Association d’assurance accident",
        "L-2976 Luxembourg",
        "Pdf: declaration.aaa@secu.lu",
        "Fax +352 49 53 35",
        "Formulier: www.aaa.lu, documentatie, formulieren",
      ],
      bring: [
        "Het AAA-formulier, volledig",
        "Matricule werkgever, 13 of 15 cijfers, en matricule van de persoon",
        "Plaats, uur, toedracht, getuigen",
        "Twijfel je aan de toedracht: dat vak aankruisen en een verklaring van twijfel bijvoegen",
        "Kopie aan de persoon en een kopie in het firmadossier",
      ],
    },
  ],
  "medische-keuring-binnenvaart": [
    {
      title: "Naar de aangewezen arts",
      how: "Niet de eigen huisarts en niet de bedrijfsarts. Voor een Nederlands of CBR-document: een arts die IenW heeft aangewezen. Voor een certificaat dat Luxemburg zelf afgeeft: de STM. Een Rijnpatent-keuring is een erkende arts in een Rijnoeverstaat, niet de STM.",
      lines: [
        "ILT-lijst van aangewezen artsen, via de link bij Instanties",
        "STM alleen voor een EU-certificaat dat in Luxemburg wordt afgegeven of verlengd",
        "Die STM-verklaring binnen 3 maanden naar het ministerie van Mobiliteit",
      ],
      bring: [
        "Paspoort of identiteitskaart. Het dienstboekje telt niet als identiteit",
        "Een zeevaartkeuring telt niet",
        "De verklaring mag op de dag van de aanvraag hooguit 3 maanden oud zijn",
      ],
    },
  ],
  "dienstboekje-vaarbevoegdheid": [
    {
      title: "SAB — dienstboekje en vaartijd",
      how: "Webshop of per post.",
      lines: ["SAB", "Postbus 5700", "3008 AS Rotterdam"],
      bring: [
        "Aanvraagformulier dienstboekjes en vaartijdverklaringen",
        "Eén pasfoto",
        "Kopie van een geldig identiteitsbewijs",
        "Originele geneeskundige verklaring binnenvaart, hooguit 3 maanden oud",
        "Eerste boekje, deksman tot en met stuurman: minimaal 16 jaar, of 15 met een leerovereenkomst, plus basistraining veiligheid deksman of STCW. VCA telt niet",
      ],
    },
    {
      title: "CBR — schipperscertificaat of Rijnvergunning",
      how: "Mijn CBR met DigiD, of per post of mail.",
      lines: [
        "CBR divisie CCV",
        "Postbus 1810",
        "2280 DV Rijswijk",
        "klantenservice.CCV@cbr.nl",
      ],
      bring: [
        "Aanvraag of verlenging. Verlengen kan vanaf 3 maanden vóór de einddatum",
        "Kopie geneeskundige verklaring, hooguit 3 maanden, tenzij voor die leeftijd een vrijstelling geldt",
        "Pasfoto met naam en geboortedatum op de achterkant",
        "Een specifieke vergunning (Rijn, radar) pas als het schipperscertificaat er al is",
      ],
    },
  ],
  "klasse-voorbereiden": [
    {
      title: "Aan boord, vóór de surveyor er is",
      how: "De afspraak zelf staat bij Klasse-inspectie aanvragen. Dit is de map.",
      lines: ["Aan boord. Originelen, niet alleen de pdf uit de applicatie."],
      bring: [
        "Certificaat van Onderzoek, meetbrief, Rijnvaartverklaring, exploitatievergunning, ADN-certificaat met stoffenlijst, klassecertificaat, verzekering",
        "Bemanningslijst met geldige vaardocumenten en ADN-verklaringen",
        "Vorige bevindingen dicht, met foto of factuur",
        "Testboeken, journaal, olielogboek",
        "Tanks gasvrij als iemand naar binnen moet",
        "Eén persoon die de tekeningen kan aanwijzen",
      ],
    },
  ],
  "schade-verzekeraar": [
    {
      title: "Klaarleggen vóór je de verzekeraar belt",
      how: "Het polisnummer staat niet in de bemanningslijst. Meld bij de casco- of P&I-verzekeraar van de firma die het schip exploiteert, binnen de termijn van de polis.",
      lines: ["Eerst de feiten, dan de melding. Geen schuld erkennen."],
      bring: [
        "Tijd, plaats, ENI, naam van het schip",
        "Foto’s van vóór de reparatie",
        "Journaaluitreksel",
        "Namen van derden en hun verzekeraar, zonder een erkenning van schuld",
        "Bij letsel: ook de AAA-aangifte, apart",
      ],
      note: "Vraag of een expert moet komen vóór je laat repareren. Een reparatie die niet kan wachten: eerst bellen, daarna schriftelijk bevestigen.",
    },
  ],
}
