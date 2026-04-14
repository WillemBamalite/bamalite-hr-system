"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, FileText, Ship } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useEffect, useState, type DragEvent, type MouseEvent } from "react"
import { supabase } from "@/lib/supabase"
import {
  GLOBAL_CUSTOM_CERTIFICATES_STORAGE_KEY,
  SHIP_CERTIFICATE_WARNING_OPTIONS,
  calculateCertificateExpiryDateIso,
  EditableShipCertificate,
  formatInterval,
  formatIsoToDutchDate,
  getGlobalCustomCertificatesForClient,
  getShipCertificateDefaultsForClient,
  getShipCertificateStorageKeyByName,
  getCertificateStatus,
  mergeShipCertificatesWithStored,
} from "@/utils/ship-certificates"

type LabelValue = { label: string; value: string; editableKey?: keyof ClassificationEditableValues }
type DataTable = { title: string; columns: string[]; rows: string[][] }
type ParticularsSection = { title: string; items?: LabelValue[]; tables?: DataTable[] }
type ClassificationEditableValues = {
  lastClassInspection: string
  nextClassInspection: string
  lastDryDock: string
  lastBoxCoolerInspection: string
}

type CertificateDocumentLink = {
  fileName: string
  fileUrl: string
  storagePath: string
  uploadedAt: string
}

type CertificateDocumentMap = Record<string, CertificateDocumentLink[]>

type CertificateContextMenuState = {
  visible: boolean
  x: number
  y: number
  certificateIndex: number | null
}

const APOLLO_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2025-07-09",
  nextClassInspection: "2030-07-08",
  lastDryDock: "2025-07-09",
  lastBoxCoolerInspection: "2025-07-09",
}

const JUPITER_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2021-07-23",
  nextClassInspection: "2026-07-23",
  lastDryDock: "2021-08-03",
  lastBoxCoolerInspection: "2021-08-03",
}

const NEPTUNUS_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2022-07-12",
  nextClassInspection: "2027-07-12",
  lastDryDock: "2022-07-12",
  lastBoxCoolerInspection: "2022-07-12",
}

const BACCHUS_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2024-09-23",
  nextClassInspection: "2026-11-25",
  lastDryDock: "2021-10-12",
  lastBoxCoolerInspection: "2021-10-12",
}

const BELLONA_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2024-03-01",
  nextClassInspection: "2029-03-03",
  lastDryDock: "2024-03-01",
  lastBoxCoolerInspection: "2024-03-01",
}

const PLUTO_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2022-06-09",
  nextClassInspection: "2027-06-09",
  lastDryDock: "2022-06-09",
  lastBoxCoolerInspection: "2022-06-09",
}

const CARITAS_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2025-02-27",
  nextClassInspection: "2030-03-18",
  lastDryDock: "2025-02-27",
  lastBoxCoolerInspection: "2025-02-27",
}

const FRATERNITE_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2025-09-16",
  nextClassInspection: "2030-09-16",
  lastDryDock: "2025-09-16",
  lastBoxCoolerInspection: "2020-10-09",
}

const LIBERTAS_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2023-07-13",
  nextClassInspection: "2028-07-13",
  lastDryDock: "2023-07-13",
  lastBoxCoolerInspection: "2023-07-13",
}

const MAIKE_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2022-10-01",
  nextClassInspection: "2027-10-02",
  lastDryDock: "2022-10-01",
  lastBoxCoolerInspection: "2022-10-01",
}

const EGALITE_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2024-07-18",
  nextClassInspection: "2029-09-16",
  lastDryDock: "2024-07-18",
  lastBoxCoolerInspection: "2024-07-18",
}

const FIDELITAS_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2021-08-26",
  nextClassInspection: "2026-08-25",
  lastDryDock: "2021-08-26",
  lastBoxCoolerInspection: "2021-08-26",
}

const SERENITAS_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2021-09-07",
  nextClassInspection: "2026-09-06",
  lastDryDock: "2021-09-07",
  lastBoxCoolerInspection: "2025-09-07",
}

const HARMONIE_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2023-09-29",
  nextClassInspection: "2028-09-29",
  lastDryDock: "2023-09-29",
  lastBoxCoolerInspection: "2023-09-29",
}

const LINDE_CLASSIFICATION_DEFAULT: ClassificationEditableValues = {
  lastClassInspection: "2025-10-20",
  nextClassInspection: "2026-02-10",
  lastDryDock: "2023-09-22",
  lastBoxCoolerInspection: "2023-09-22",
}

const APOLLO_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "APOLLO" },
      { label: "ENI nummer", value: "02326622" },
      { label: "IMO nummer", value: "9282182" },
      { label: "MMSI", value: "244620961" },
      { label: "Vorige naam", value: "ROZALINDE" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Ja" },
      { label: "Bouwjaar", value: "2004" },
      { label: "Opleverdatum", value: "22-08-2005" },
      { label: "Flame arrestor explosiegroep", value: "IIB3: 0.65 - 0.75" },
      { label: "Rookdetectiesysteem", value: "Ja (5 detectoren, optisch)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamer voor/achter, ingangen machinekamer, accommodatie" },
      { label: "Overdruksysteem", value: "Ja (accommodatie en stuurhuis)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Lloyd's Register (L.R.)" },
      { label: "Class-notaties", value: "IWW Tanker Type C, LS 'T', pv +50kpa, SG 1,00, LMC" },
      { label: "Laatste klasse-inspectie", value: "09-07-2025", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "08-07-2030", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "09-07-2025", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "09-07-2025", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "110,00 m" },
      { label: "Breedte over alles", value: "13,55 m" },
      { label: "Holte", value: "5,50 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "7,50 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "3,90 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "7,50 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "7,00 m" },
      { label: "Max diepgang geladen", value: "3,60 m" },
      { label: "Max diepgang ledig", value: "1,65 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "2,55 m" },
      { label: "Lichtscheepsgewicht", value: "1200,00 ton" },
      { label: "Maximum tonnage", value: "3498,00 ton" },
      { label: "Tonnage bij 2m10", value: "1408,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "14,00 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "0653984967" },
      { label: "E-mail schip", value: "apollo@bamalite.com" },
      { label: "Eigenaar", value: "Bamalite S.A." },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "Bruinsma Freriks Transport B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "06-10-2022" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "12" },
      { label: "Totale tankinhoud (100%)", value: "4408,00 cbm" },
      { label: "Sloptanks", value: "Ja (1 tank, 1,80 cbm)" },
      { label: "Ballasttanks", value: "Ja (6 tanks, 1560,00 cbm)" },
      { label: "Max laadtempo", value: "1200,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 1200 / 260 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "6 inch" },
      { label: "Bocht voor einde dropleiding", value: "Ja" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "10,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Ja" },
      { label: "Aantal ladingpompen", value: "6" },
      { label: "Max pomp capaciteit", value: "600,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "500,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "6,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Radar Saab)" },
      { label: "High-level alarm", value: "Ja (86%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Ja (Tank Head, type DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Screw (35,00)" },
      { label: "Class approved loading instrument", value: "Ja (Suneti)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1", "Stuurboord", "371,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 2", "Stuurboord", "366,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 3", "Stuurboord", "366,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 4", "Stuurboord", "367,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 5", "Stuurboord", "366,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 6", "Stuurboord", "368,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 1", "Bakboord", "368,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 2", "Bakboord", "367,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 3", "Bakboord", "366,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 4", "Bakboord", "366,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 5", "Bakboord", "367,00", "Epoxy (volledig)", "Goed"],
          ["Cargo Tank 6", "Bakboord", "369,00", "Epoxy (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast autokraan (SWL)", value: "2000,00" },
      { label: "Locatie autokraan", value: "Achterdek" },
      { label: "Maximaal bereik", value: "15,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (12,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 100 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Ja (3 m)" },
      { label: "Reddingsboot", value: "Ja (aluminium, met davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "24-09-2025 (Rotterdam)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "1200,00 pk" },
      { label: "Aantal hoofdmotoren", value: "1" },
      { label: "Hoofdmotorfabrikant", value: "Wartsila" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (FK-5-1-12)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 770 pk" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "1" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, achter, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Ja (Track Pilot)" },
    ],
  },
]

const JUPITER_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "JUPITER" },
      { label: "ENI nummer", value: "20000004" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "253242295" },
      { label: "Vorige naam", value: "-" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Nee" },
      { label: "Bouwjaar", value: "2021" },
      { label: "Opleverdatum", value: "23-07-2021" },
      { label: "Flame arrestor explosiegroep", value: "IIB: 0.5 - 0.65" },
      { label: "Rookdetectiesysteem", value: "Ja (11 detectoren, optisch + handmelder)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamer voor/achter, accommodatie, stuurhuis" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis, accommodatie, machinekamer voor/achter)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Lloyd's Register (L.R.)" },
      { label: "Class-notaties", value: "A1 I.W.W. Tanker Type C, SG 1,00, p.v. 50 kPa, LS (T)" },
      { label: "Laatste klasse-inspectie", value: "23-07-2021", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "23-07-2026", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "03-08-2021", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "03-08-2021", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "110,00 m" },
      { label: "Breedte over alles", value: "11,40 m" },
      { label: "Holte", value: "5,04 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "6,00 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "3,60 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "6,00 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "4,20 m" },
      { label: "Max diepgang geladen", value: "3,70 m" },
      { label: "Max diepgang ledig", value: "1,50 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "-" },
      { label: "Lichtscheepsgewicht", value: "1064,00 ton" },
      { label: "Maximum tonnage", value: "3093,00 ton" },
      { label: "Tonnage bij 2m10", value: "1203,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "12,04 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "0031-653984959" },
      { label: "E-mail schip", value: "jupiter@bamalite.com" },
      { label: "Eigenaar", value: "Bamalite S.A." },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "Bruinsma Freriks Transport B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "10-08-2021" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "9" },
      { label: "Totale tankinhoud (100%)", value: "3400,00 cbm" },
      { label: "Sloptanks", value: "Ja (2 tanks, 20,00 cbm)" },
      { label: "Ballasttanks", value: "Ja (10 tanks, 1230,00 cbm)" },
      { label: "Max laadtempo", value: "844,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 844 / 844 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "100 mm" },
      { label: "Bocht voor einde dropleiding", value: "Ja" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "6,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Nee" },
      { label: "Aantal ladingpompen", value: "9" },
      { label: "Max pomp capaciteit", value: "900,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "850,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "6,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee" },
      { label: "Vapour recovery verwarmd", value: "Ja" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Radar)" },
      { label: "High-level alarm", value: "Ja (97,00%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Ja (Tank head, DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Screw (35,00)" },
      { label: "Class approved loading instrument", value: "Ja (Tankstar)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-9", "Midden", "3093,00", "Other (volledig)", "Goed"],
          ["Slop Tank 1", "Midden", "20,00", "Other (volledig)", "Goed"],
          ["Slop Tank 2", "Midden", "20,00", "Other (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast autokraan (SWL)", value: "2000,00" },
      { label: "Locatie autokraan", value: "Achterdek" },
      { label: "Maximaal bereik", value: "15,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (10,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 100 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Ja (200 m)" },
      { label: "Reddingsboot", value: "Ja (GRP/FRP, met davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "23-06-2025 (Amsterdam)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "1194,00 kW" },
      { label: "Aantal hoofdmotoren", value: "1" },
      { label: "Hoofdmotorfabrikant", value: "Caterpillar" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (CO2)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 650 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "1" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, achter, bakboord, stuurboord, machinekamer)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const NEPTUNUS_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "NEPTUNUS" },
      { label: "ENI nummer", value: "02326973" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244660745" },
      { label: "Vorige naam", value: "TRICOLORE" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Ja" },
      { label: "Bouwjaar", value: "2005" },
      { label: "Opleverdatum", value: "06-05-2005" },
      { label: "Flame arrestor explosiegroep", value: "IIB: 0.5 - 0.65" },
      { label: "Rookdetectiesysteem", value: "Ja (4 detectoren, optisch)" },
      { label: "Beschermde zones rookdetectie", value: "Accommodatie en machinekamers" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis en accommodatie)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Lloyd's Register (L.R.)" },
      { label: "Class-notaties", value: "-" },
      { label: "Laatste klasse-inspectie", value: "12-07-2022", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "12-07-2027", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "12-07-2022", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "12-07-2022", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "124,99 m" },
      { label: "Breedte over alles", value: "11,45 m" },
      { label: "Holte", value: "5,32 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "6,95 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "3,69 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "5,94 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "4,94 m" },
      { label: "Max diepgang geladen", value: "3,65 m" },
      { label: "Max diepgang ledig", value: "1,04 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "-" },
      { label: "Lichtscheepsgewicht", value: "780,00 ton" },
      { label: "Maximum tonnage", value: "3513,00 ton" },
      { label: "Tonnage bij 2m10", value: "1406,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "11,00 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31653984973" },
      { label: "E-mail schip", value: "neptunus@bamalite.com" },
      { label: "Eigenaar", value: "Bamalite SA" },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "29-11-2022" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "12" },
      { label: "Totale tankinhoud (100%)", value: "4242,00 cbm" },
      { label: "Sloptanks", value: "Ja (1 tank, 2,00 cbm)" },
      { label: "Ballasttanks", value: "Ja (13 tanks, 1651,00 cbm)" },
      { label: "Max laadtempo", value: "940,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 940 / 260 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "6 mm" },
      { label: "Bocht voor einde dropleiding", value: "Ja" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "10,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Ja" },
      { label: "Aantal ladingpompen", value: "6" },
      { label: "Max pomp capaciteit", value: "1200,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "1000,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "6,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee" },
      { label: "Vapour recovery verwarmd", value: "Ja" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Floater)" },
      { label: "High-level alarm", value: "Ja (90,00%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Ja (Tank head, DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Screw (35,00)" },
      { label: "Class approved loading instrument", value: "Ja (Midas)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-6", "Bakboord", "0,00", "Other (volledig)", "Goed"],
          ["Cargo Tank 1-6", "Stuurboord", "0,00", "Other (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast autokraan (SWL)", value: "2000,00" },
      { label: "Locatie autokraan", value: "Achterdek" },
      { label: "Maximaal bereik", value: "15,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (14,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Ja" },
      { label: "Opvangranden machinegebied", value: "Ja" },
      { label: "Druppelbakken manifold", value: "Ja (3 stuks, 100 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Nee" },
      { label: "Reddingsboot", value: "Ja (aluminium, zonder davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "03-06-2025 (Dordrecht)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "2600,00 BHP" },
      { label: "Aantal hoofdmotoren", value: "2" },
      { label: "Hoofdmotorfabrikant", value: "Caterpillar" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (niet gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (HFC-227 ea)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 630 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "2" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, achter, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const BACCHUS_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "BACCHUS" },
      { label: "ENI nummer", value: "02334345" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244740768" },
      { label: "Vorige naam", value: "-" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Ja" },
      { label: "Bouwjaar", value: "2011" },
      { label: "Opleverdatum", value: "06-09-2011" },
      { label: "Flame arrestor explosiegroep", value: "IIB3: 0.65 - 0.75" },
      { label: "Rookdetectiesysteem", value: "Ja (8 detectoren, Ajax CFP 05/07)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamers en accommodatie" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis en accommodatie)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Bureau Veritas (B.V)" },
      { label: "Class-notaties", value: "I 5 IN(0,6) Z Tanker / Double Hull * -DP = 57,5 kPa -TP = 65 kPa -ADN Type C * MC" },
      { label: "Laatste klasse-inspectie", value: "23-09-2024", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "25-11-2026", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "12-10-2021", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "12-10-2021", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "135,00 m" },
      { label: "Breedte over alles", value: "11,40 m" },
      { label: "Holte", value: "5,58 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "6,80 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "4,10 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "6,80 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "5,70 m" },
      { label: "Max diepgang geladen", value: "3,87 m" },
      { label: "Max diepgang ledig", value: "1,60 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "2,50 m" },
      { label: "Lichtscheepsgewicht", value: "1300,00 ton" },
      { label: "Maximum tonnage", value: "4073,00 ton" },
      { label: "Tonnage bij 2m10", value: "1459,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "1464,00 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31-653984965" },
      { label: "E-mail schip", value: "bacchus@alcina.lu" },
      { label: "Eigenaar", value: "Alcina S.A." },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "04-12-2011" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "12" },
      { label: "Totale tankinhoud (100%)", value: "4508,00 cbm" },
      { label: "Sloptanks", value: "Ja (2 tanks, 25,00 cbm)" },
      { label: "Ballasttanks", value: "Ja (12 tanks, 1772,00 cbm)" },
      { label: "Max laadtempo", value: "1464,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "264 / 1464 / 1464 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "152 mm" },
      { label: "Bocht voor einde dropleiding", value: "Nee" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "5,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Ja" },
      { label: "Aantal ladingpompen", value: "2" },
      { label: "Max pomp capaciteit", value: "1500,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "1200,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "6,00 bar" },
      { label: "Pompkamer aanwezig", value: "Ja (onder dek)" },
      { label: "Ladingleidingen onder dek", value: "Ja (5,00 cbm)" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Tankmate Starpoint)" },
      { label: "High-level alarm", value: "Ja (97,00%)" },
      { label: "Overfill alarm", value: "Ja (97,00%)" },
      { label: "Sampler aansluiting", value: "Ja (tankhead, DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Screw (35,00)" },
      { label: "Class approved loading instrument", value: "Ja (Tankmate Starpoint)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-6", "Bakboord", "2254,00", "Zinc (volledig)", "Goed"],
          ["Cargo Tank 1-6", "Stuurboord", "2254,00", "Zinc (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast autokraan (SWL)", value: "2500,00" },
      { label: "Locatie autokraan", value: "Loading Area" },
      { label: "Maximaal bereik", value: "20,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Steamship Mutual Underwriting Association (Bermuda) Limited" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (10,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 45 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Nee" },
      { label: "Reddingsboot", value: "Ja (staal, zonder davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "15-07-2025 (Flushing)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "1800,00 BHP" },
      { label: "Aantal hoofdmotoren", value: "2" },
      { label: "Hoofdmotorfabrikant", value: "Mitsubishi" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (niet gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (HFC-227 ea)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 600 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "2" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const BELLONA_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "BELLONA" },
      { label: "ENI nummer", value: "02332571" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244650664" },
      { label: "Vorige naam", value: "MATRIX" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Nee" },
      { label: "Bouwjaar", value: "2009" },
      { label: "Opleverdatum", value: "18-12-2009" },
      { label: "Flame arrestor explosiegroep", value: "IIB3: 0.65 - 0.75" },
      { label: "Rookdetectiesysteem", value: "Ja (5 detectoren, optisch)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamer voor en achter" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis en accommodatie)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Lloyd's Register (L.R.)" },
      { label: "Class-notaties", value: "A1 I.W.W. Tanker, Type C, p.v. + 50 KPa, LMC" },
      { label: "Laatste klasse-inspectie", value: "01-03-2024", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "03-03-2029", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "01-03-2024", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "01-03-2024", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "135,00 m" },
      { label: "Breedte over alles", value: "11,45 m" },
      { label: "Holte", value: "5,82 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "6,85 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "4,14 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "6,27 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "5,25 m" },
      { label: "Max diepgang geladen", value: "4,11 m" },
      { label: "Max diepgang ledig", value: "1,40 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "2,16 m" },
      { label: "Lichtscheepsgewicht", value: "1347,00 ton" },
      { label: "Maximum tonnage", value: "4539,00 ton" },
      { label: "Tonnage bij 2m10", value: "1660,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "14,40 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31653984968" },
      { label: "E-mail schip", value: "bellona@alcina.lu" },
      { label: "Eigenaar", value: "Alcina S.A." },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "Bruinsma Freriks Transport B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "23-01-2022" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "14" },
      { label: "Totale tankinhoud (100%)", value: "5320,00 cbm" },
      { label: "Sloptanks", value: "Ja (1 tank, 9,80 cbm)" },
      { label: "Ballasttanks", value: "Ja (13 tanks, 1464,00 cbm)" },
      { label: "Max laadtempo", value: "812,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 812 / 200 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "6 mm" },
      { label: "Bocht voor einde dropleiding", value: "Ja" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "10,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Ja" },
      { label: "Aantal ladingpompen", value: "14" },
      { label: "Max pomp capaciteit", value: "1440,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "1000,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "8,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee (0,00 cbm)" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Radar)" },
      { label: "High-level alarm", value: "Ja (90,00%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Ja (Tank head, DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Marflex Electric (25,00)" },
      { label: "Class approved loading instrument", value: "Ja (Midas)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-7", "Midden", "378,00", "Other (volledig)", "Goed"],
          ["Cargo Tank 1-7", "Midden", "378,00", "Other (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast autokraan (SWL)", value: "1800,00" },
      { label: "Locatie autokraan", value: "Achterdek" },
      { label: "Maximaal bereik", value: "15,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 100.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (20,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 150 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Nee" },
      { label: "Reddingsboot", value: "Ja (GRP/FRP, zonder davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "09-12-2024 (Amsterdam)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "2556,00 BHP" },
      { label: "Aantal hoofdmotoren", value: "2" },
      { label: "Hoofdmotorfabrikant", value: "Mitsubishi" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (HFC-227 ea)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 500 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "2" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const PLUTO_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "PLUTO" },
      { label: "ENI nummer", value: "02334521" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244740957" },
      { label: "Vorige naam", value: "-" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Nee" },
      { label: "Bouwjaar", value: "2011" },
      { label: "Opleverdatum", value: "19-06-2012" },
      { label: "Flame arrestor explosiegroep", value: "IIB: 0.5 - 0.65" },
      { label: "Rookdetectiesysteem", value: "Ja (6 detectoren, optisch)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamers en accommodatie" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis en accommodatie)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Bureau Veritas (B.V)" },
      { label: "Class-notaties", value: "Tanker DP=50kpa TP=65 Kpa ADN Type C" },
      { label: "Laatste klasse-inspectie", value: "09-06-2022", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "09-06-2027", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "09-06-2022", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "09-06-2022", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "85,84 m" },
      { label: "Breedte over alles", value: "9,60 m" },
      { label: "Holte", value: "4,70 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "5,80 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "3,80 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "5,60 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "2,30 m" },
      { label: "Max diepgang geladen", value: "3,07 m" },
      { label: "Max diepgang ledig", value: "1,35 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "2,30 m" },
      { label: "Lichtscheepsgewicht", value: "605,00 ton" },
      { label: "Maximum tonnage", value: "1564,00 ton" },
      { label: "Tonnage bij 2m10", value: "813,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "9,00 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31653984966" },
      { label: "E-mail schip", value: "pluto@alcina.lu" },
      { label: "Eigenaar", value: "Alcina S.A." },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics BV" },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "21-06-2012" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "5" },
      { label: "Totale tankinhoud (100%)", value: "1884,00 cbm" },
      { label: "Sloptanks", value: "Ja (1 tank, 5,00 cbm)" },
      { label: "Ballasttanks", value: "Ja (6 tanks, 600,00 cbm)" },
      { label: "Max laadtempo", value: "812,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 812 / 260 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "150 mm" },
      { label: "Bocht voor einde dropleiding", value: "Nee" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "5,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Nee" },
      { label: "Aantal ladingpompen", value: "3" },
      { label: "Max pomp capaciteit", value: "555,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "505,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "8,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee" },
      { label: "Vapour recovery verwarmd", value: "Ja" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Tankmate Vlotter bal)" },
      { label: "High-level alarm", value: "Ja (86,00%)" },
      { label: "Overfill alarm", value: "Ja (97,00%)" },
      { label: "Sampler aansluiting", value: "Ja (Tankhead, DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Electric (25,00)" },
      { label: "Class approved loading instrument", value: "Ja (Midas)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-5", "Midden", "0,00", "Other (volledig)", "Goed"],
          ["Slop Tank 1", "Midden", "0,00", "Other (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast autokraan (SWL)", value: "500,00" },
      { label: "Locatie autokraan", value: "Loading area" },
      { label: "Maximaal bereik", value: "5,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (20,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 100 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Ja (10 m)" },
      { label: "Reddingsboot", value: "Ja (staal, zonder davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "28-01-2026 (Rotterdam)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "1276,00 BHP" },
      { label: "Aantal hoofdmotoren", value: "1" },
      { label: "Hoofdmotorfabrikant", value: "Mitsubishi" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (HFC-227 ea)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 600 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "1" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (achter, machinekamer, voor, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Ja (camera)" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const CARITAS_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "CARITAS" },
      { label: "ENI nummer", value: "02332991" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244670074" },
      { label: "Vorige naam", value: "En-Avant" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Nee" },
      { label: "Bouwjaar", value: "2010" },
      { label: "Opleverdatum", value: "19-03-2010" },
      { label: "Flame arrestor explosiegroep", value: "IIB2: 0.75 - 0.85" },
      { label: "Rookdetectiesysteem", value: "Ja (5 detectoren, smoke/ionisation)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamer voor en achter" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis, achteraccommodatie)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Lloyd's Register (L.R.)" },
      { label: "Class-notaties", value: "+A1 I.W.W. Tanker Type C, p.v. +50 kPa, S.G. 1,00, LS \"T\", LMC" },
      { label: "Laatste klasse-inspectie", value: "27-02-2025", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "18-03-2030", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "27-02-2025", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "27-02-2025", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "110,00 m" },
      { label: "Breedte over alles", value: "11,45 m" },
      { label: "Holte", value: "5,32 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "5,70 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "2,84 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "4,65 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "4,10 m" },
      { label: "Max diepgang geladen", value: "3,76 m" },
      { label: "Max diepgang ledig", value: "1,55 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "1,34 m" },
      { label: "Lichtscheepsgewicht", value: "1450,00 ton" },
      { label: "Maximum tonnage", value: "3171,00 ton" },
      { label: "Tonnage bij 2m10", value: "1212,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "11,72 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31653984956" },
      { label: "E-mail schip", value: "caritas@develshipping.lu" },
      { label: "Eigenaar", value: "Devel Shipping SA" },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "30-06-2024" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "10" },
      { label: "Totale tankinhoud (100%)", value: "3735,00 cbm" },
      { label: "Sloptanks", value: "Ja (1 tank, 2,11 cbm)" },
      { label: "Ballasttanks", value: "Ja (10 tanks, 1337,00 cbm)" },
      { label: "Max laadtempo", value: "851,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 851 / 399 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "6 mm" },
      { label: "Bocht voor einde dropleiding", value: "Nee" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "10,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Ja" },
      { label: "Aantal ladingpompen", value: "10" },
      { label: "Max pomp capaciteit", value: "1100,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "500,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "8,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee (0,00 cbm)" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Radar)" },
      { label: "High-level alarm", value: "Ja (86,00%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Ja (tussen discharge line en drop line, DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Nee" },
      { label: "Class approved loading instrument", value: "Ja (TankStar)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-10", "Midden", "376,00", "Silicate (volledig)", "Goed"],
          ["Slop Tank 1", "Midden", "1,12", "Silicate (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast autokraan (SWL)", value: "2000,00" },
      { label: "Locatie autokraan", value: "Roofdeck" },
      { label: "Maximaal bereik", value: "20,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Shipowners' Mutual Protection & Indemnity Association (Luxembourg)" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Nee" },
      { label: "Opvangranden rondom dek", value: "Ja (10,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 50 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Ja (12 m)" },
      { label: "Reddingsboot", value: "Ja (aluminium, met davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "20-06-2025 (Rotterdam)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "1118,00 kW" },
      { label: "Aantal hoofdmotoren", value: "1" },
      { label: "Hoofdmotorfabrikant", value: "Caterpillar" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (HFC-227 ea)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 599 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "1" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const FRATERNITE_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "FRATERNITE" },
      { label: "ENI nummer", value: "02332826" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244670460" },
      { label: "Vorige naam", value: "Compaan" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Nee" },
      { label: "Bouwjaar", value: "2010" },
      { label: "Opleverdatum", value: "03-09-2010" },
      { label: "Flame arrestor explosiegroep", value: "IIB3: 0.65 - 0.75" },
      { label: "Rookdetectiesysteem", value: "Ja (4 detectoren, Ajax Sensotec CFP)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamer voor en achter" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis en accommodatie)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Lloyd's Register (L.R.)" },
      { label: "Class-notaties", value: "A1 IWW Tanker Type C, PV + 50kPa, s.g. 1,00, LS \"T\"" },
      { label: "Laatste klasse-inspectie", value: "16-09-2025", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "16-09-2030", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "16-09-2025", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "09-10-2020", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "110,00 m" },
      { label: "Breedte over alles", value: "11,45 m" },
      { label: "Holte", value: "5,42 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "7,10 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "7,36 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "4,50 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "-" },
      { label: "Max diepgang geladen", value: "4,11 m" },
      { label: "Max diepgang ledig", value: "1,56 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "-" },
      { label: "Lichtscheepsgewicht", value: "800,00 ton" },
      { label: "Maximum tonnage", value: "3594,00 ton" },
      { label: "Tonnage bij 2m10", value: "1211,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "12,19 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "-" },
      { label: "E-mail schip", value: "-" },
      { label: "Eigenaar", value: "Devel Shipping SA" },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "08-09-2025" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "10" },
      { label: "Totale tankinhoud (100%)", value: "3768,00 cbm" },
      { label: "Sloptanks", value: "Ja (1 tank, 3,30 cbm)" },
      { label: "Ballasttanks", value: "Ja (10 tanks)" },
      { label: "Max laadtempo", value: "800,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 1400 / 130 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "6 mm" },
      { label: "Bocht voor einde dropleiding", value: "Ja" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "5,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Ja" },
      { label: "Aantal ladingpompen", value: "10" },
      { label: "Max pomp capaciteit", value: "1000,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "450,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "6,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Radar)" },
      { label: "High-level alarm", value: "Ja (90,00%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Ja (elke cargo pump, DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Ja (Pneumatic self-priming, 3,00)" },
      { label: "Class approved loading instrument", value: "Ja (Locopias)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-10", "Midden", "3768,00", "Other (volledig)", "Goed"],
          ["Slop Tank 1", "Midden", "3,30", "Other (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Nee" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Europe Ltd / The Standard Club UK Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (11,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 120 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Ja (16 m)" },
      { label: "Reddingsboot", value: "Ja (GRP/FRP, met davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "01-10-2025 (Dordrecht)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "1350,00 kW" },
      { label: "Aantal hoofdmotoren", value: "1" },
      { label: "Hoofdmotorfabrikant", value: "Caterpillar" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (CO2)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 360 graden, 600 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "1" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const LIBERTAS_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "LIBERTAS" },
      { label: "ENI nummer", value: "08023110" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "253242357" },
      { label: "Vorige naam", value: "-" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type N (Normaal)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Ja" },
      { label: "Bouwjaar", value: "1987 (herbouwd 2018)" },
      { label: "Opleverdatum", value: "01-10-1987" },
      { label: "Flame arrestor explosiegroep", value: "IIB3: 0.65 - 0.75" },
      { label: "Rookdetectiesysteem", value: "Ja (3 detectoren, optisch)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamers en ingang accommodatie" },
      { label: "Overdruksysteem", value: "Nee" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Bureau Veritas (B.V)" },
      { label: "Class-notaties", value: "I HULL * MACH 5 IN(0,6) Z Tanker / Double Hull / Type N / DP 11,5 kPa / TP 13 kPa" },
      { label: "Laatste klasse-inspectie", value: "13-07-2023", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "13-07-2028", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "13-07-2023", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "13-07-2023", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "110,00 m" },
      { label: "Breedte over alles", value: "11,40 m" },
      { label: "Holte", value: "4,40 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "7,80 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "4,20 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "6,00 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "-" },
      { label: "Max diepgang geladen", value: "3,14 m" },
      { label: "Max diepgang ledig", value: "1,60 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "1,56 m" },
      { label: "Lichtscheepsgewicht", value: "1061,00 ton" },
      { label: "Maximum tonnage", value: "2542,21 ton" },
      { label: "Tonnage bij 2m10", value: "1303,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "12,00 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31653984975" },
      { label: "E-mail schip", value: "libertas@develshipping.lu" },
      { label: "Eigenaar", value: "Devel Shipping S.A" },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "01-01-2000" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "12" },
      { label: "Totale tankinhoud (100%)", value: "2941,00 cbm" },
      { label: "Sloptanks", value: "Ja (2 tanks, 6,00 cbm)" },
      { label: "Ballasttanks", value: "Ja (2 tanks, 20,00 cbm)" },
      { label: "Max laadtempo", value: "680,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 680 / 680 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "10 mm" },
      { label: "Bocht voor einde dropleiding", value: "Nee" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "10,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Nee" },
      { label: "Aantal ladingpompen", value: "1" },
      { label: "Max pomp capaciteit", value: "700,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "650,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "6,00 bar" },
      { label: "Pompkamer aanwezig", value: "Ja (onder dek)" },
      { label: "Ladingleidingen onder dek", value: "Ja (5,00 cbm)" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Nee" },
      { label: "Tankniveausysteem", value: "Ja (Floater)" },
      { label: "High-level alarm", value: "Ja (86,00%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Ja (Tank head, closed DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Screw (40,00)" },
      { label: "Class approved loading instrument", value: "Ja (Midas)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-6", "Bakboord", "1470,00", "Other (volledig)", "Goed"],
          ["Cargo Tank 1-6", "Stuurboord", "1470,00", "Other (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Nee" },
      { label: "Hijsinstallaties / kranen", value: "Nee" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (12,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (3 stuks, 200 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Nee" },
      { label: "Reddingsboot", value: "Ja (GRP/FRP, met davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "09-02-2026 (Gent)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "2424,00 kW" },
      { label: "Aantal hoofdmotoren", value: "2" },
      { label: "Hoofdmotorfabrikant", value: "Caterpillar" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (niet gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (HFC-227 ea)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 500 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "2" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, achter, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Nee" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const MAIKE_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "MAIKE" },
      { label: "ENI nummer", value: "02337222" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244110201" },
      { label: "Vorige naam", value: "-" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Ja" },
      { label: "Bouwjaar", value: "2017" },
      { label: "Opleverdatum", value: "02-10-2017" },
      { label: "Flame arrestor explosiegroep", value: "IIB: 0.5 - 0.65" },
      { label: "Rookdetectiesysteem", value: "Ja (3 detectoren, optisch en thermisch)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamers en accommodatie" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis en accommodatie)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Lloyd's Register (L.R.)" },
      { label: "Class-notaties", value: "A1 IWW Tanker Type C, LS 'T', p.v. +50KPa, S.G. 1.00" },
      { label: "Laatste klasse-inspectie", value: "01-10-2022", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "02-10-2027", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "01-10-2022", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "01-10-2022", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "124,95 m" },
      { label: "Breedte over alles", value: "11,40 m" },
      { label: "Holte", value: "5,58 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "12,50 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "5,00 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "6,20 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "5,85 m" },
      { label: "Max diepgang geladen", value: "3,90 m" },
      { label: "Max diepgang ledig", value: "1,04 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "2,40 m" },
      { label: "Lichtscheepsgewicht", value: "1302,00 ton" },
      { label: "Maximum tonnage", value: "3819,00 ton" },
      { label: "Tonnage bij 2m10", value: "1333,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "12,50 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31653984953" },
      { label: "E-mail schip", value: "maike@develshipping.lu" },
      { label: "Eigenaar", value: "Devel Shipping S.A" },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics BV" },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "07-10-2017" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "12" },
      { label: "Totale tankinhoud (100%)", value: "4299,00 cbm" },
      { label: "Sloptanks", value: "Ja (2 tanks, 70,00 cbm)" },
      { label: "Ballasttanks", value: "Ja (13 tanks, 1668,00 cbm)" },
      { label: "Max laadtempo", value: "1000,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 1400 / 500 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "200 mm" },
      { label: "Bocht voor einde dropleiding", value: "Nee" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "8,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Nee" },
      { label: "Aantal ladingpompen", value: "2" },
      { label: "Max pomp capaciteit", value: "1000,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "1000,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "5,00 bar" },
      { label: "Pompkamer aanwezig", value: "Ja (onder dek)" },
      { label: "Ladingleidingen onder dek", value: "Ja (8,00 cbm)" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Tankradar)" },
      { label: "High-level alarm", value: "Ja (90,00%)" },
      { label: "Overfill alarm", value: "Ja (98,00%)" },
      { label: "Sampler aansluiting", value: "Ja (Tank head, DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Screw (35,00)" },
      { label: "Class approved loading instrument", value: "Ja (Locopias)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-6", "Bakboord", "2085,00", "Zinc (volledig)", "Goed"],
          ["Cargo Tank 1-6", "Stuurboord", "2085,00", "Zinc (volledig)", "Goed"],
          ["Slop Tank 1", "Bakboord", "10,00", "Zinc (volledig)", "Goed"],
          ["Slop Tank 1", "Stuurboord", "10,00", "Zinc (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast autokraan (SWL)", value: "2000,00" },
      { label: "Locatie autokraan", value: "Loading area" },
      { label: "Maximaal bereik", value: "15,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 10.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (10,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Ja" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 250 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (250 L)" },
      { label: "Oliekeringsscherm", value: "Nee" },
      { label: "Reddingsboot", value: "Ja (staal, zonder davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "16-06-2025 (Rotterdam)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "1494,00 kW" },
      { label: "Aantal hoofdmotoren", value: "2" },
      { label: "Hoofdmotorfabrikant", value: "Caterpillar" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (HFC-227 ea)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 360 graden, 1000 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "2" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, achter, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Ja" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const EGALITE_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "EGALITE" },
      { label: "ENI nummer", value: "02326634" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244710904" },
      { label: "Vorige naam", value: "Velocity" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Nee" },
      { label: "Bouwjaar", value: "2004" },
      { label: "Opleverdatum", value: "01-01-2004" },
      { label: "Flame arrestor explosiegroep", value: "IIB3: 0.65 - 0.75" },
      { label: "Rookdetectiesysteem", value: "Ja (5 detectoren, optisch)" },
      { label: "Beschermde zones rookdetectie", value: "Accommodatie en machinekamers" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis en accommodatie)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Lloyd's Register (L.R.)" },
      { label: "Class-notaties", value: "A1 I.W.W. Tanker Type C" },
      { label: "Laatste klasse-inspectie", value: "18-07-2024", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "16-09-2029", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "18-07-2024", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "18-07-2024", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "124,99 m" },
      { label: "Breedte over alles", value: "11,45 m" },
      { label: "Holte", value: "5,23 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "6,35 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "5,70 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "6,35 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "4,35 m" },
      { label: "Max diepgang geladen", value: "3,51 m" },
      { label: "Max diepgang ledig", value: "1,18 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "2,35 m" },
      { label: "Lichtscheepsgewicht", value: "1194,00 ton" },
      { label: "Maximum tonnage", value: "3410,00 ton" },
      { label: "Tonnage bij 2m10", value: "1494,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "13,81 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "0653984952" },
      { label: "E-mail schip", value: "egalite@europeshipping.lu" },
      { label: "Eigenaar", value: "Europa Shipping A.G" },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "21-08-2023" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "11" },
      { label: "Totale tankinhoud (100%)", value: "4109,00 cbm" },
      { label: "Sloptanks", value: "Ja (1 tank, 17,00 cbm)" },
      { label: "Ballasttanks", value: "Ja (2 tanks, 10,00 cbm)" },
      { label: "Max laadtempo", value: "1000,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "300 / 1000 / 300 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "6 mm" },
      { label: "Bocht voor einde dropleiding", value: "Ja" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "10,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Ja" },
      { label: "Aantal ladingpompen", value: "11" },
      { label: "Max pomp capaciteit", value: "1320,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "600,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "6,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Vlotter)" },
      { label: "High-level alarm", value: "Ja (90,00%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Ja (Tank Head, closed DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Screw (35,00)" },
      { label: "Class approved loading instrument", value: "Ja (Tank Star)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-11", "Midden", "4109,00", "Epoxy (volledig)", "Goed"],
          ["Slop Tank 1", "Midden", "17,00", "Epoxy (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast autokraan (SWL)", value: "1750,00" },
      { label: "Locatie autokraan", value: "Achterdek" },
      { label: "Maximaal bereik", value: "15,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Steamship Mutual Underwriting Association Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (10,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 100 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Nee" },
      { label: "Reddingsboot", value: "Ja (aluminium, met davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "01-09-2025 (Rotterdam)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "2500,00 BHP" },
      { label: "Aantal hoofdmotoren", value: "2" },
      { label: "Hoofdmotorfabrikant", value: "Mitsubishi" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (FK-5-1-12)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 500 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "2" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, achter, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const FIDELITAS_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "FIDELITAS" },
      { label: "ENI nummer", value: "02327190" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244690815" },
      { label: "Vorige naam", value: "-" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Ja" },
      { label: "Bouwjaar", value: "2005" },
      { label: "Opleverdatum", value: "01-01-2005" },
      { label: "Flame arrestor explosiegroep", value: "IIB: 0.5 - 0.65" },
      { label: "Rookdetectiesysteem", value: "Ja (4 detectoren, Tyco)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamer voor/achter, stuurhuis en accommodatie" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis en accommodatie)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Lloyd's Register (L.R.)" },
      { label: "Class-notaties", value: "I.W.W. Tanker Type C, p.v. +50kPa, S.G. 1.0, L.S. 'T'" },
      { label: "Laatste klasse-inspectie", value: "26-08-2021", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "25-08-2026", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "26-08-2021", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "26-08-2021", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "124,90 m" },
      { label: "Breedte over alles", value: "11,45 m" },
      { label: "Holte", value: "5,50 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "4,50 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "3,70 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "4,50 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "4,75 m" },
      { label: "Max diepgang geladen", value: "3,65 m" },
      { label: "Max diepgang ledig", value: "1,30 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "2,43 m" },
      { label: "Lichtscheepsgewicht", value: "1262,00 ton" },
      { label: "Maximum tonnage", value: "3497,00 ton" },
      { label: "Tonnage bij 2m10", value: "1391,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "13,32 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31653984962" },
      { label: "E-mail schip", value: "fidelitas@europeshipping.lu" },
      { label: "Eigenaar", value: "Europe Shipping A.G" },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "16-06-2023" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "12" },
      { label: "Totale tankinhoud (100%)", value: "4405,00 cbm" },
      { label: "Sloptanks", value: "Nee" },
      { label: "Ballasttanks", value: "Ja (8 tanks, 1543,00 cbm)" },
      { label: "Max laadtempo", value: "1000,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "240 / 720 / 240 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "6 mm" },
      { label: "Bocht voor einde dropleiding", value: "Nee" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "5,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Ja" },
      { label: "Aantal ladingpompen", value: "6" },
      { label: "Max pomp capaciteit", value: "1100,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "800,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "6,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee (0,00 cbm)" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Saab Tankradar)" },
      { label: "High-level alarm", value: "Ja (90,00%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Ja (Tank head, DOPAK)" },
      { label: "Closed waterdip", value: "Ja" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Screw (20,00)" },
      { label: "Class approved loading instrument", value: "Ja (Midas)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-6", "Bakboord", "2202,00", "Other (volledig)", "Goed"],
          ["Cargo Tank 1-6", "Stuurboord", "2203,00", "Other (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Ja" },
      { label: "Gedeelde trommel voor", value: "Ja" },
      { label: "Gedeelde trommel achter", value: "Ja" },
      { label: "Fail-safe systeem voor", value: "Ja" },
      { label: "Fail-safe systeem achter", value: "Ja" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast autokraan (SWL)", value: "2000,00" },
      { label: "Locatie autokraan", value: "Achter" },
      { label: "Maximaal bereik", value: "15,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (10,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 200 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Ja (1 m)" },
      { label: "Reddingsboot", value: "Ja (GRP/FRP, met davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "29-05-2025 (Rotterdam)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "3000,00 BHP" },
      { label: "Aantal hoofdmotoren", value: "2" },
      { label: "Hoofdmotorfabrikant", value: "ABC" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (niet gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (HFC-227 ea)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 500 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "2" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const SERENITAS_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "SERENITAS" },
      { label: "ENI nummer", value: "02321586" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244660240" },
      { label: "Vorige naam", value: "-" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type C (Chemisch)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Nee" },
      { label: "Bouwjaar", value: "1994 (verlengd/herbouwd 2017)" },
      { label: "Opleverdatum", value: "01-01-1994" },
      { label: "Flame arrestor explosiegroep", value: "IIB3: 0.65 - 0.75" },
      { label: "Rookdetectiesysteem", value: "Ja (4 detectoren, optisch)" },
      { label: "Beschermde zones rookdetectie", value: "Stuurhuis, machinekamers, accommodatie" },
      { label: "Overdruksysteem", value: "Ja (stuurhuis)" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Lloyd's Register (L.R.)" },
      { label: "Class-notaties", value: "-" },
      { label: "Laatste klasse-inspectie", value: "07-09-2021", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "06-09-2026", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "07-09-2021", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "07-09-2025", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "124,56 m" },
      { label: "Breedte over alles", value: "11,40 m" },
      { label: "Holte", value: "5,40 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "9,60 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "4,20 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "6,20 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "5,00 m" },
      { label: "Max diepgang geladen", value: "3,61 m" },
      { label: "Max diepgang ledig", value: "1,03 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "2,85 m" },
      { label: "Lichtscheepsgewicht", value: "1200,00 ton" },
      { label: "Maximum tonnage", value: "3444,00 ton" },
      { label: "Tonnage bij 2m10", value: "1399,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "13,60 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31653984963" },
      { label: "E-mail schip", value: "serenitas@europeshipping.lu" },
      { label: "Eigenaar", value: "Europe Shipping A.G" },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics BV" },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "01-01-2003" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "12" },
      { label: "Totale tankinhoud (100%)", value: "4091,00 cbm" },
      { label: "Sloptanks", value: "Ja (2 tanks, 32,00 cbm)" },
      { label: "Ballasttanks", value: "Ja (12 tanks, 1667,00 cbm)" },
      { label: "Max laadtempo", value: "1000,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "464 / 1000 / 464 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "8 mm" },
      { label: "Bocht voor einde dropleiding", value: "Nee" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "10,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Ja" },
      { label: "Aantal ladingpompen", value: "2" },
      { label: "Max pomp capaciteit", value: "900,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "700,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "10,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee (8,00 cbm)" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (Radar)" },
      { label: "High-level alarm", value: "Ja (90,00%)" },
      { label: "Overfill alarm", value: "Ja (97,00%)" },
      { label: "Sampler aansluiting", value: "Ja (Tankhead, closed DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Screw (20,00)" },
      { label: "Class approved loading instrument", value: "Ja (Logopias)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-12", "Bakboord/Stuurboord", "4091,00", "Other (volledig)", "Goed"],
          ["Slop Tank 1-2", "Bakboord/Stuurboord", "32,00", "Other (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Nee" },
      { label: "Hijsinstallaties / kranen", value: "Nee" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (15,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 75 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Ja (10 m)" },
      { label: "Reddingsboot", value: "Ja (staal, met davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "17-12-2024 (Rotterdam)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "2030,00 BHP" },
      { label: "Aantal hoofdmotoren", value: "2" },
      { label: "Hoofdmotorfabrikant", value: "Mitsubishi" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (HFC-227 ea)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 4 kanalen, 700 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "2" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, achter, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Hefbaar" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const HARMONIE_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "HARMONIE" },
      { label: "ENI nummer", value: "04802090" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244660236" },
      { label: "Vorige naam", value: "-" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type N (Normaal)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "2. Integral Cargo Tank" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Ja" },
      { label: "Bouwjaar", value: "1963 (herbouwd 2018)" },
      { label: "Opleverdatum", value: "01-01-1963" },
      { label: "Flame arrestor explosiegroep", value: "IIB3: 0.65 - 0.75" },
      { label: "Rookdetectiesysteem", value: "Ja (4 detectoren, optisch)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamer voor/achter, accommodatie voor/achter" },
      { label: "Overdruksysteem", value: "Nee" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Bureau Veritas (B.V)" },
      { label: "Class-notaties", value: "I HULL 5 IN (0,6) Z Tanker / Double Hull / ADN Type N closed" },
      { label: "Laatste klasse-inspectie", value: "29-09-2023", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "29-09-2028", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "29-09-2023", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "29-09-2023", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "107,12 m" },
      { label: "Breedte over alles", value: "9,96 m" },
      { label: "Holte", value: "4,00 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "6,30 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "4,50 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "6,30 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "4,55 m" },
      { label: "Max diepgang geladen", value: "2,82 m" },
      { label: "Max diepgang ledig", value: "1,40 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "2,06 m" },
      { label: "Lichtscheepsgewicht", value: "777,00 ton" },
      { label: "Maximum tonnage", value: "2005,00 ton" },
      { label: "Tonnage bij 2m10", value: "1274,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "10,00 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31-653984969" },
      { label: "E-mail schip", value: "harmonie@brugoshipping.lu" },
      { label: "Eigenaar", value: "Brugo Shipping SARL" },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics B.V." },
      { label: "Adres operator", value: "Lindtsedijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "01-01-2000" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "12" },
      { label: "Totale tankinhoud (100%)", value: "2290,00 cbm" },
      { label: "Sloptanks", value: "Ja (1 tank, 10,00 cbm)" },
      { label: "Ballasttanks", value: "Ja (13 tanks, 1020,00 cbm)" },
      { label: "Max laadtempo", value: "600,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 600 / 260 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "6 mm" },
      { label: "Bocht voor einde dropleiding", value: "Nee" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "10,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Nee" },
      { label: "Aantal ladingpompen", value: "2" },
      { label: "Max pomp capaciteit", value: "750,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "700,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "6,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Nee" },
      { label: "Tankniveausysteem", value: "Ja (HSH / Krohne)" },
      { label: "High-level alarm", value: "Ja (86,00%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Ja (Tank head, DOPAK)" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Screw (35,00)" },
      { label: "Class approved loading instrument", value: "Ja (Midas)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-6", "Bakboord", "1145,00", "Other (volledig)", "Goed"],
          ["Cargo Tank 1-6", "Stuurboord", "1145,00", "Other (volledig)", "Goed"],
          ["Slop Tank 1", "Midden", "10,00", "Other (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Nee" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast kraan (SWL)", value: "750,00" },
      { label: "Locatie kraan", value: "Loading area" },
      { label: "Maximaal bereik", value: "8,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Steamship Mutual Underwriting Association (Bermuda) Limited" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Ja (10,00 cm)" },
      { label: "Savealls bij tankontluchting", value: "Ja" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 60 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Nee" },
      { label: "Reddingsboot", value: "Ja (staal, met davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "18-11-2025 (Frankfurt)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "1324,00 BHP" },
      { label: "Aantal hoofdmotoren", value: "2" },
      { label: "Hoofdmotorfabrikant", value: "MHI Equipment Europe BV" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (niet gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (FK-5-1-12)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 360 graden, 250 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "2" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Vast" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

const LINDE_SECTIONS: ParticularsSection[] = [
  {
    title: "Algemene informatie",
    items: [
      { label: "Type schip", value: "Tanker" },
      { label: "Scheepsnaam", value: "LINDE" },
      { label: "ENI nummer", value: "02325400" },
      { label: "IMO nummer", value: "-" },
      { label: "MMSI", value: "244660279" },
      { label: "Vorige naam", value: "-" },
      { label: "Vlag", value: "LUXEMBOURG" },
      { label: "ADN type", value: "Type N (Normaal)" },
      { label: "Constructie cargotanks", value: "2" },
      { label: "Type cargotanks", value: "3. Cargotank met afzonderlijke huid" },
      { label: "Temperatuurklasse", value: "T4" },
      { label: "Explosiegroep", value: "IIB" },
      { label: "Dubbelwandig", value: "Ja" },
      { label: "Alle cargotanks met langsschot", value: "Ja" },
      { label: "Bouwjaar", value: "1993 (omgebouwd in 2016)" },
      { label: "Opleverdatum", value: "01-11-1993" },
      { label: "Flame arrestor explosiegroep", value: "IIB3: 0.65 - 0.75" },
      { label: "Rookdetectiesysteem", value: "Ja (4 detectoren, optisch)" },
      { label: "Beschermde zones rookdetectie", value: "Machinekamer voor/achter en accommodatie voor/achter" },
      { label: "Overdruksysteem", value: "Nee" },
    ],
  },
  {
    title: "Classificatie",
    items: [
      { label: "Classificatiemaatschappij", value: "Bureau Veritas (B.V)" },
      { label: "Class-notaties", value: "I 5 Z HULL MC / Double Hull / DP 10 kPa / TP 13 kPa / ADN Type N closed" },
      { label: "Laatste klasse-inspectie", value: "20-10-2025", editableKey: "lastClassInspection" },
      { label: "Volgende klasse-inspectie", value: "10-02-2026", editableKey: "nextClassInspection" },
      { label: "Laatste droogdok", value: "22-09-2023", editableKey: "lastDryDock" },
      { label: "Laatste inspectie box cooler(s)", value: "22-09-2023", editableKey: "lastBoxCoolerInspection" },
    ],
  },
  {
    title: "Afmetingen en tonnage",
    items: [
      { label: "Lengte over alles", value: "110,00 m" },
      { label: "Breedte over alles", value: "11,40 m" },
      { label: "Holte", value: "4,52 m" },
      { label: "Doorvaarthoogte (ledig, stuurhuis hoog)", value: "6,40 m" },
      { label: "Doorvaarthoogte (geladen, stuurhuis laag)", value: "4,50 m" },
      { label: "Min. doorvaarthoogte (ledig, stuurhuis laag)", value: "6,30 m" },
      { label: "Min. doorvaarthoogte (100% ballast)", value: "5,50 m" },
      { label: "Max diepgang geladen", value: "3,38 m" },
      { label: "Max diepgang ledig", value: "1,80 m" },
      { label: "Max diepgang ledig (100% ballast)", value: "2,54 m" },
      { label: "Lichtscheepsgewicht", value: "1174,00 ton" },
      { label: "Maximum tonnage", value: "2722,00 ton" },
      { label: "Tonnage bij 2m10", value: "1202,00 ton" },
      { label: "Inzinking per centimeter op laadlijn", value: "12,00 ton/cm" },
    ],
  },
  {
    title: "Eigendom en exploitatie",
    items: [
      { label: "Telefoon schip", value: "+31 653 984 958" },
      { label: "E-mail schip", value: "linde@brugoshipping.lu" },
      { label: "Eigenaar", value: "Brugo Shipping SARL" },
      { label: "Adres eigenaar", value: "15A Duarrefstroos, L-9990 Weiswampach (LU)" },
      { label: "Technisch operator", value: "BFT Tanker Logistics bv" },
      { label: "Adres operator", value: "Lindtsediijk 30, 3336 LE Zwijndrecht" },
      { label: "Operator sinds", value: "10-01-2008" },
      { label: "Naam veiligheidsadviseur", value: "DGT" },
      { label: "Telefoon veiligheidsadviseur", value: "0032-93449858" },
    ],
  },
  {
    title: "Lading en tanks",
    items: [
      { label: "Aantal ladingtanks", value: "12" },
      { label: "Totale tankinhoud (100%)", value: "2918,00 cbm" },
      { label: "Sloptanks", value: "Ja (1 tank, 3,00 cbm)" },
      { label: "Ballasttanks", value: "Ja (13 tanks, 1236,00 cbm)" },
      { label: "Max laadtempo", value: "650,00 cbm/uur" },
      { label: "Laadtempo start/midden/einde", value: "260 / 650 / 650 cbm/uur" },
      { label: "Ontwerpdruk ladingleidingen", value: "10,00 bar" },
      { label: "Diameter vul-/dropleiding", value: "8 mm" },
      { label: "Bocht voor einde dropleiding", value: "Nee" },
      { label: "Hoogte einde dropleiding boven tankbodem", value: "8,00 cm" },
      { label: "Obstakels voor einde dropleiding", value: "Nee" },
      { label: "Aantal ladingpompen", value: "1" },
      { label: "Max pomp capaciteit", value: "550,00 cbm/uur" },
      { label: "Gemiddeld los tempo", value: "500,00 cbm/uur" },
      { label: "Tegendruk bij max pompcapaciteit", value: "5,00 bar" },
      { label: "Pompkamer aanwezig", value: "Nee" },
      { label: "Ladingleidingen onder dek", value: "Nee" },
      { label: "Vapour recovery verwarmd", value: "Nee" },
      { label: "Waterspray systeem", value: "Ja" },
      { label: "Drukalarm 40 kPa", value: "Ja" },
      { label: "Tankniveausysteem", value: "Ja (KROHNE)" },
      { label: "High-level alarm", value: "Ja (90,00%)" },
      { label: "Overfill alarm", value: "Ja (97,50%)" },
      { label: "Sampler aansluiting", value: "Nee" },
      { label: "Closed waterdip", value: "Nee" },
      { label: "Efficiënt stripping systeem", value: "Ja" },
      { label: "Strippingpomp", value: "Bornemann Screw (35,00)" },
      { label: "Class approved loading instrument", value: "Ja (Midas)" },
    ],
    tables: [
      {
        title: "Tankcapaciteiten",
        columns: ["Tank", "Locatie", "Inhoud (m3)", "Coating", "Conditie"],
        rows: [
          ["Cargo Tank 1-6", "Bakboord", "1459,00", "Other (volledig)", "Goed"],
          ["Cargo Tank 1-6", "Stuurboord", "1459,00", "Other (volledig)", "Goed"],
          ["Slop Tank 1", "Midden", "3,00", "Other (volledig)", "Goed"],
        ],
      },
    ],
  },
  {
    title: "Mooring en hijsmiddelen",
    items: [
      { label: "Afmeerlieren", value: "Nee" },
      { label: "Hijsinstallaties / kranen", value: "Ja" },
      { label: "Veilige werklast kraan (SWL)", value: "1500,00" },
      { label: "Locatie kraan", value: "Achterdek" },
      { label: "Maximaal bereik", value: "15,00 m" },
    ],
  },
  {
    title: "Veiligheid en noodvoorzieningen",
    items: [
      { label: "P&I Club", value: "The Standard Club Ltd" },
      { label: "Milieuaansprakelijkheid", value: "USD 1.000.000.000" },
      { label: "P&I dekt wrakopruiming", value: "Ja" },
      { label: "Opvangranden rondom dek", value: "Nee" },
      { label: "Savealls bij tankontluchting", value: "Nee" },
      { label: "Opvangranden machinegebied", value: "Nee" },
      { label: "Druppelbakken manifold", value: "Ja (2 stuks, 150 L, draagbaar)" },
      { label: "Absorptiemateriaal", value: "Ja (200 L)" },
      { label: "Oliekeringsscherm", value: "Nee" },
      { label: "Reddingsboot", value: "Ja (staal, zonder davits)" },
      { label: "Pollution incident laatste 12 maanden", value: "Nee" },
      { label: "Laatste SIRE inspectie", value: "12-12-2025 (Antwerpen)" },
    ],
  },
  {
    title: "Voortstuwing",
    items: [
      { label: "Brandstof", value: "Gasolie" },
      { label: "Voortstuwingstype", value: "Vaste schroef" },
      { label: "Vermogen", value: "1232,00 BHP" },
      { label: "Aantal hoofdmotoren", value: "1" },
      { label: "Hoofdmotorfabrikant", value: "Mitsubishi" },
      { label: "CCR / Euro-niveau", value: "CCR II" },
      { label: "Bilge hoog-alarm", value: "Ja (niet gekoppeld aan algemeen alarm)" },
      { label: "Vast brandblussysteem", value: "Ja (HFC-227 ea)" },
      { label: "Boegschroef / boegbesturing", value: "Ja, 360 graden, 300 BHP" },
      { label: "Hekschroef", value: "Nee" },
      { label: "Aantal schroeven", value: "1" },
      { label: "Stuurinrichting storingsalarm op brug", value: "Ja" },
    ],
  },
  {
    title: "Stuurhuis en navigatie",
    items: [
      { label: "Eenmansradarnavigatie", value: "Ja" },
      { label: "CCTV", value: "Ja (voor, achter, bakboord, stuurboord)" },
      { label: "Stuurhuis type", value: "Vast" },
      { label: "Bovenbouw zakt over onderbouw", value: "Ja" },
      { label: "ECDIS", value: "Ja" },
      { label: "Radar overlay op ECDIS", value: "Nee" },
      { label: "VDR aanwezig", value: "Nee" },
      { label: "Laden/lossen bedienbaar vanuit stuurhuis", value: "Nee" },
      { label: "Brughoogtedetectiesysteem", value: "Nee" },
      { label: "Semi-autonoom systeem", value: "Nee" },
    ],
  },
]

export default function ShipParticularsPage() {
  const CERTIFICATE_DOCUMENT_BUCKET = "official-warnings"
  const params = useParams<{ shipId: string }>()
  const searchParams = useSearchParams()
  const shipId = String(params?.shipId || "")
  const { ships, loading } = useSupabaseData()
  const [classificationEditable, setClassificationEditable] = useState<ClassificationEditableValues>(
    APOLLO_CLASSIFICATION_DEFAULT
  )
  const [activeTab, setActiveTab] = useState("scheepsgegevens")
  const [certificatenEditable, setCertificatenEditable] = useState<EditableShipCertificate[]>([])
  const [certificateDocuments, setCertificateDocuments] = useState<CertificateDocumentMap>({})
  const [dragOverCertificateIndex, setDragOverCertificateIndex] = useState<number | null>(null)
  const [uploadingCertificateIndex, setUploadingCertificateIndex] = useState<number | null>(null)
  const [certificateContextMenu, setCertificateContextMenu] = useState<CertificateContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    certificateIndex: null,
  })
  const [toonNieuwCertificaatFormulier, setToonNieuwCertificaatFormulier] = useState(false)
  const [nieuwCertificaatNaam, setNieuwCertificaatNaam] = useState("")
  const [nieuwCertificaatDatum, setNieuwCertificaatDatum] = useState("")
  const [nieuwCertificaatInterval, setNieuwCertificaatInterval] = useState("")
  const [nieuwCertificaatWaarschuwing, setNieuwCertificaatWaarschuwing] = useState("1")
  const [nieuwCertificaatVoorAlleSchepen, setNieuwCertificaatVoorAlleSchepen] = useState("nee")
  const [nieuwCertificaatFout, setNieuwCertificaatFout] = useState("")

  const ship = ships.find((s: any) => String(s.id) === shipId)
  const shipNameLower = String(ship?.name || "").trim().toLowerCase()
  const isApollo = shipNameLower === "apollo"
  const isJupiter = shipNameLower === "jupiter"
  const isNeptunus = shipNameLower === "neptunus"
  const isBacchus = shipNameLower === "bacchus"
  const isBellona = shipNameLower === "bellona"
  const isPluto = shipNameLower === "pluto"
  const isCaritas = shipNameLower === "caritas"
  const isFraternite = shipNameLower === "fraternite"
  const isLibertas = shipNameLower === "libertas"
  const isMaike = shipNameLower === "maike"
  const isEgalite = shipNameLower === "egalite" || shipNameLower === "egalité"
  const isFidelitas = shipNameLower === "fidelitas"
  const isSerenitas = shipNameLower === "serenitas"
  const isHarmonie = shipNameLower === "harmonie"
  const isLinde = shipNameLower === "linde"
  const isSupportedShip =
    isApollo ||
    isJupiter ||
    isNeptunus ||
    isBacchus ||
    isBellona ||
    isPluto ||
    isCaritas ||
    isFraternite ||
    isLibertas ||
    isMaike ||
    isEgalite ||
    isFidelitas ||
    isSerenitas ||
    isHarmonie ||
    isLinde
  const sections = isApollo
    ? APOLLO_SECTIONS
    : isJupiter
      ? JUPITER_SECTIONS
      : isNeptunus
        ? NEPTUNUS_SECTIONS
        : isBacchus
          ? BACCHUS_SECTIONS
          : isBellona
            ? BELLONA_SECTIONS
              : isPluto
                ? PLUTO_SECTIONS
                : isCaritas
                  ? CARITAS_SECTIONS
                  : isFraternite
                    ? FRATERNITE_SECTIONS
                    : isLibertas
                      ? LIBERTAS_SECTIONS
                      : isMaike
                        ? MAIKE_SECTIONS
                        : isEgalite
                          ? EGALITE_SECTIONS
                          : isFidelitas
                            ? FIDELITAS_SECTIONS
                            : isSerenitas
                              ? SERENITAS_SECTIONS
                              : isHarmonie
                                ? HARMONIE_SECTIONS
                                : isLinde
                                  ? LINDE_SECTIONS
          : []
  const classificationDefault = isApollo
    ? APOLLO_CLASSIFICATION_DEFAULT
    : isJupiter
      ? JUPITER_CLASSIFICATION_DEFAULT
      : isNeptunus
        ? NEPTUNUS_CLASSIFICATION_DEFAULT
        : isBacchus
          ? BACCHUS_CLASSIFICATION_DEFAULT
          : isBellona
            ? BELLONA_CLASSIFICATION_DEFAULT
              : isPluto
                ? PLUTO_CLASSIFICATION_DEFAULT
                : isCaritas
                  ? CARITAS_CLASSIFICATION_DEFAULT
                  : isFraternite
                    ? FRATERNITE_CLASSIFICATION_DEFAULT
                    : isLibertas
                      ? LIBERTAS_CLASSIFICATION_DEFAULT
                      : isMaike
                        ? MAIKE_CLASSIFICATION_DEFAULT
                        : isEgalite
                          ? EGALITE_CLASSIFICATION_DEFAULT
                          : isFidelitas
                            ? FIDELITAS_CLASSIFICATION_DEFAULT
                            : isSerenitas
                              ? SERENITAS_CLASSIFICATION_DEFAULT
                              : isHarmonie
                                ? HARMONIE_CLASSIFICATION_DEFAULT
                                : isLinde
                                  ? LINDE_CLASSIFICATION_DEFAULT
      : APOLLO_CLASSIFICATION_DEFAULT
  const classificationStorageKey = isApollo
    ? "apollo_particulars_classification"
    : isJupiter
      ? "jupiter_particulars_classification"
      : isNeptunus
        ? "neptunus_particulars_classification"
        : isBacchus
          ? "bacchus_particulars_classification"
          : isBellona
            ? "bellona_particulars_classification"
              : isPluto
                ? "pluto_particulars_classification"
                : isCaritas
                  ? "caritas_particulars_classification"
                  : isFraternite
                    ? "fraternite_particulars_classification"
                    : isLibertas
                      ? "libertas_particulars_classification"
                      : isMaike
                        ? "maike_particulars_classification"
                        : isEgalite
                          ? "egalite_particulars_classification"
                          : isFidelitas
                            ? "fidelitas_particulars_classification"
                            : isSerenitas
                              ? "serenitas_particulars_classification"
                              : isHarmonie
                                ? "harmonie_particulars_classification"
                                : isLinde
                                  ? "linde_particulars_classification"
      : ""
  const certificateStorageKey = getShipCertificateStorageKeyByName(ship?.name || "") || ""

  const normalizeCertificateName = (value: string) => String(value || "").trim().toLowerCase()
  const normalizeShipStorageName = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

  const getCertificateDocumentStorageKey = (shipName: string) =>
    `${normalizeShipStorageName(shipName)}_particulars_certificaten_documenten`

  const getRemovedCertificatesStorageKey = (shipName: string) =>
    `${normalizeShipStorageName(shipName)}_particulars_certificaten_removed`

  const getCertificateDocumentMapKey = (certificateName: string) =>
    normalizeCertificateName(certificateName).replace(/\s+/g, " ").trim()

  const sanitizeFileName = (value: string) => String(value || "").replace(/[^a-zA-Z0-9._-]/g, "_")

  const loadCertificateDocuments = (shipName: string): CertificateDocumentMap => {
    if (typeof window === "undefined") return {}
    const storageKey = getCertificateDocumentStorageKey(shipName)
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (!parsed || typeof parsed !== "object") return {}

      const normalized: CertificateDocumentMap = {}
      Object.entries(parsed).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          const docs = value.filter((item) => item && typeof item === "object") as CertificateDocumentLink[]
          if (docs.length > 0) normalized[key] = docs
          return
        }
        if (value && typeof value === "object") {
          normalized[key] = [value as CertificateDocumentLink]
        }
      })
      return normalized
    } catch {
      return {}
    }
  }

  const persistCertificateDocuments = (shipName: string, next: CertificateDocumentMap) => {
    if (typeof window === "undefined") return
    const storageKey = getCertificateDocumentStorageKey(shipName)
    window.localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const loadRemovedCertificateKeys = (shipName: string): string[] => {
    if (typeof window === "undefined") return []
    const storageKey = getRemovedCertificatesStorageKey(shipName)
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map((item) => normalizeCertificateName(String(item || "")))
        .filter((item) => Boolean(item))
    } catch {
      return []
    }
  }

  const persistRemovedCertificateKeys = (shipName: string, removedKeys: string[]) => {
    if (typeof window === "undefined") return
    const storageKey = getRemovedCertificatesStorageKey(shipName)
    window.localStorage.setItem(storageKey, JSON.stringify(removedKeys))
  }

  const upsertCertificateByName = (
    source: EditableShipCertificate[],
    certificate: EditableShipCertificate
  ): EditableShipCertificate[] => {
    const targetName = normalizeCertificateName(certificate.naam)
    if (!targetName) return source
    const existingIndex = source.findIndex((item) => normalizeCertificateName(item.naam) === targetName)
    if (existingIndex === -1) return [...source, certificate]

    return source.map((item, idx) => (idx === existingIndex ? { ...item, ...certificate } : item))
  }

  const saveShipCertificates = (next: EditableShipCertificate[]) => {
    setCertificatenEditable(next)
    if (typeof window !== "undefined" && certificateStorageKey) {
      window.localStorage.setItem(certificateStorageKey, JSON.stringify(next))
    }
  }

  useEffect(() => {
    setClassificationEditable(classificationDefault)
    if (typeof window === "undefined" || !classificationStorageKey) return
    const stored = window.localStorage.getItem(classificationStorageKey)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      setClassificationEditable({
        ...classificationDefault,
        ...parsed,
      })
    } catch {
      // Ignore invalid local state.
    }
  }, [classificationDefault, classificationStorageKey])

  useEffect(() => {
    const defaults = getShipCertificateDefaultsForClient(ship?.name || "")
    const removed = new Set(loadRemovedCertificateKeys(ship?.name || ""))
    const filteredDefaults = defaults.filter(
      (item) => !removed.has(normalizeCertificateName(item.naam))
    )
    setCertificatenEditable(filteredDefaults)
    if (typeof window === "undefined" || !certificateStorageKey) return
    const stored = window.localStorage.getItem(certificateStorageKey)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      setCertificatenEditable(
        mergeShipCertificatesWithStored(ship?.name || "", parsed, filteredDefaults)
      )
    } catch {
      // Ignore invalid local state.
    }
  }, [certificateStorageKey, ship?.name])

  useEffect(() => {
    if (!ship?.name) {
      setCertificateDocuments({})
      return
    }
    setCertificateDocuments(loadCertificateDocuments(ship.name))
  }, [ship?.name])

  useEffect(() => {
    const requestedTab = String(searchParams?.get("tab") || "").toLowerCase()
    if (requestedTab === "certificaten") {
      setActiveTab("certificaten")
    }
  }, [searchParams])

  useEffect(() => {
    const closeContextMenu = () =>
      setCertificateContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev))
    if (typeof window !== "undefined") {
      window.addEventListener("click", closeContextMenu)
      window.addEventListener("scroll", closeContextMenu, true)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("click", closeContextMenu)
        window.removeEventListener("scroll", closeContextMenu, true)
      }
    }
  }, [])

  const setClassificationField = (key: keyof ClassificationEditableValues, value: string) => {
    const next = { ...classificationEditable, [key]: value }
    setClassificationEditable(next)
    if (typeof window !== "undefined" && classificationStorageKey) {
      window.localStorage.setItem(classificationStorageKey, JSON.stringify(next))
    }
  }

  const setCertificaatHuidig = (index: number, value: string) => {
    const next = certificatenEditable.map((item, idx) => (idx === index ? { ...item, huidig: value } : item))
    saveShipCertificates(next)
  }

  const setCertificaatWaarschuwing = (index: number, maanden: number) => {
    const next = certificatenEditable.map((item, idx) =>
      idx === index ? { ...item, waarschuwingMaanden: maanden } : item
    )
    saveShipCertificates(next)
  }

  const uploadCertificateDocument = async (index: number, file: File | null) => {
    if (!file || !ship?.name) return
    const certificate = certificatenEditable[index]
    if (!certificate) return

    try {
      setUploadingCertificateIndex(index)
      const safeShipName = normalizeShipStorageName(ship.name) || "onbekend-schip"
      const safeCertificateName = normalizeShipStorageName(certificate.naam) || "onbekend-certificaat"
      const safeFileName = sanitizeFileName(file.name)
      const storagePath = `ship-certificates/${safeShipName}/${safeCertificateName}/${Date.now()}-${safeFileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(CERTIFICATE_DOCUMENT_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        alert(`Fout bij uploaden document: ${uploadError.message || "Onbekende fout"}`)
        return
      }
      if (!uploadData?.path) {
        alert("Fout bij uploaden document: geen opslagpad ontvangen.")
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from(CERTIFICATE_DOCUMENT_BUCKET)
        .getPublicUrl(uploadData.path)
      const publicUrl = publicUrlData?.publicUrl
      if (!publicUrl) {
        alert("Fout bij uploaden document: geen publieke URL beschikbaar.")
        return
      }

      const key = getCertificateDocumentMapKey(certificate.naam)
      const existingDocs = certificateDocuments[key] || []
      let nextDocs = [...existingDocs]
      if (existingDocs.length > 0 && typeof window !== "undefined") {
        const shouldDeleteOld = window.confirm("Wil je het oude certificaat verwijderen?")
        if (shouldDeleteOld) {
          const oldPaths = existingDocs.map((doc) => doc.storagePath).filter(Boolean)
          if (oldPaths.length > 0) {
            const { error: removeError } = await supabase.storage
              .from(CERTIFICATE_DOCUMENT_BUCKET)
              .remove(oldPaths)
            if (removeError) {
              alert(`Waarschuwing: oud certificaat kon niet uit opslag verwijderd worden (${removeError.message || "onbekende fout"}).`)
            }
          }
          nextDocs = []
        }
      }

      nextDocs.push({
        fileName: file.name,
        fileUrl: publicUrl,
        storagePath: uploadData.path,
        uploadedAt: new Date().toISOString(),
      })

      const next: CertificateDocumentMap = {
        ...certificateDocuments,
        [key]: nextDocs,
      }
      setCertificateDocuments(next)
      persistCertificateDocuments(ship.name, next)
    } catch (error: any) {
      alert(`Fout bij uploaden document: ${error?.message || "Onbekende fout"}`)
    } finally {
      setUploadingCertificateIndex(null)
      setDragOverCertificateIndex(null)
    }
  }

  const openCertificateDocument = (certificateName: string) => {
    const key = getCertificateDocumentMapKey(certificateName)
    const docs = certificateDocuments[key] || []
    const doc = docs[docs.length - 1]
    if (!doc?.fileUrl || typeof window === "undefined") return
    window.open(doc.fileUrl, "_blank", "noopener,noreferrer")
  }

  const handleCertificateDrop = async (index: number, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const file = event.dataTransfer?.files?.[0] || null
    await uploadCertificateDocument(index, file)
  }

  const handleCertificateContextMenu = (index: number, event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setCertificateContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      certificateIndex: index,
    })
  }

  const verwijderCertificaatUitLijst = async (index: number) => {
    if (!ship?.name) return
    const certificaat = certificatenEditable[index]
    if (!certificaat) return

    const confirmed = window.confirm(
      `Wil je "${certificaat.naam}" verwijderen uit de certificatenlijst van ${ship.name}?`
    )
    if (!confirmed) return

    const certificateKey = getCertificateDocumentMapKey(certificaat.naam)
    const docsToRemove = certificateDocuments[certificateKey] || []
    if (docsToRemove.length > 0) {
      const paths = docsToRemove.map((doc) => doc.storagePath).filter(Boolean)
      if (paths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(CERTIFICATE_DOCUMENT_BUCKET)
          .remove(paths)
        if (removeError) {
          alert(
            `Waarschuwing: gekoppelde documenten konden niet allemaal verwijderd worden (${removeError.message || "onbekende fout"}).`
          )
        }
      }
    }

    const removedKeys = loadRemovedCertificateKeys(ship.name)
    const normalizedName = normalizeCertificateName(certificaat.naam)
    if (normalizedName && !removedKeys.includes(normalizedName)) {
      persistRemovedCertificateKeys(ship.name, [...removedKeys, normalizedName])
    }

    const nextCertificates = certificatenEditable.filter((_, idx) => idx !== index)
    saveShipCertificates(nextCertificates)

    const { [certificateKey]: _, ...restDocs } = certificateDocuments
    setCertificateDocuments(restDocs)
    persistCertificateDocuments(ship.name, restDocs)

    setCertificateContextMenu({ visible: false, x: 0, y: 0, certificateIndex: null })
  }

  const voegNieuwCertificaatToe = () => {
    const naam = nieuwCertificaatNaam.trim()
    if (!naam) {
      setNieuwCertificaatFout("Vul een certificaatnaam in.")
      return
    }

    if (!nieuwCertificaatDatum) {
      setNieuwCertificaatFout("Vul een datum keuring in.")
      return
    }

    const interval = Number(nieuwCertificaatInterval.replace(",", "."))
    if (!Number.isFinite(interval) || interval <= 0) {
      setNieuwCertificaatFout("Vul een geldig interval in jaren in.")
      return
    }

    const waarschuwingMaanden = Number(nieuwCertificaatWaarschuwing)
    if (!SHIP_CERTIFICATE_WARNING_OPTIONS.includes(waarschuwingMaanden as any)) {
      setNieuwCertificaatFout("Waarschuwen vanaf is ongeldig.")
      return
    }

    const nieuwCertificaat: EditableShipCertificate = {
      naam,
      huidig: nieuwCertificaatDatum,
      intervalJaar: interval,
      waarschuwingMaanden,
    }

    setNieuwCertificaatFout("")

    if (typeof window === "undefined") return

    if (nieuwCertificaatVoorAlleSchepen === "ja") {
      const globalExisting = getGlobalCustomCertificatesForClient()
      const nextGlobal = upsertCertificateByName(globalExisting, nieuwCertificaat)
      window.localStorage.setItem(GLOBAL_CUSTOM_CERTIFICATES_STORAGE_KEY, JSON.stringify(nextGlobal))

      const defaults = getShipCertificateDefaultsForClient(ship?.name || "")
      if (!certificateStorageKey) {
        setCertificatenEditable(defaults)
      } else {
        const stored = window.localStorage.getItem(certificateStorageKey)
        try {
          const parsed = stored ? JSON.parse(stored) : null
          setCertificatenEditable(mergeShipCertificatesWithStored(ship?.name || "", parsed, defaults))
        } catch {
          setCertificatenEditable(defaults)
        }
      }
    } else {
      const next = upsertCertificateByName(certificatenEditable, nieuwCertificaat)
      saveShipCertificates(next)
    }

    setNieuwCertificaatNaam("")
    setNieuwCertificaatDatum("")
    setNieuwCertificaatInterval("")
    setNieuwCertificaatWaarschuwing("1")
    setNieuwCertificaatVoorAlleSchepen("nee")
    setToonNieuwCertificaatFormulier(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full py-6 md:py-8 px-3 md:px-4 max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/schepen/overzicht">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Ship className="w-6 h-6 text-blue-600" />
                Scheepsgegevens - {ship?.name || "Onbekend schip"}
              </h1>
              <p className="text-gray-600">Overzicht van scheepsgegevens uit documentatie</p>
            </div>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-gray-600">Laden...</CardContent>
          </Card>
        ) : !ship ? (
          <Card>
            <CardContent className="p-6 text-red-600">Schip niet gevonden.</CardContent>
          </Card>
        ) : !isSupportedShip ? (
          <Card>
            <CardHeader>
              <CardTitle>Scheepsgegevens nog niet ingevoerd</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <p>
                Voor <strong>{ship.name}</strong> is de pagina met scheepsgegevens nog niet gevuld.
              </p>
              <p>
                We starten met Apollo, Jupiter, Neptunus, Bacchus, Bellona, Pluto, Caritas, Fraternite, Libertas, Maike, Egalite, Fidelitas, Serenitas, Harmonie en Linde en vullen daarna de overige schepen op dezelfde manier.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-xl grid-cols-2 mb-2">
                <TabsTrigger value="scheepsgegevens" className="text-base">
                  <Ship className="w-4 h-4 mr-2" />
                  Scheepsgegevens
                </TabsTrigger>
                <TabsTrigger value="certificaten" className="text-base">
                  <FileText className="w-4 h-4 mr-2" />
                  Certificaten
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scheepsgegevens" className="space-y-4">
                {sections.map((section) => (
                  <Card key={section.title}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {section.items && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
                          {section.items.map((item) => (
                            <div key={`${section.title}-${item.label}`} className="flex justify-between border-b border-gray-100 py-1 gap-4">
                              <span className="text-gray-600">{item.label}</span>
                              {section.title === "Classificatie" && item.editableKey ? (
                                <div className="w-[180px]">
                                  <Input
                                    type="date"
                                    value={classificationEditable[item.editableKey] || ""}
                                    onChange={(e) => setClassificationField(item.editableKey as keyof ClassificationEditableValues, e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-900 text-right">
                                  {item.editableKey ? formatIsoToDutchDate(classificationEditable[item.editableKey]) : item.value}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {section.tables?.map((table) => (
                        <div key={`${section.title}-${table.title}`} className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">{table.title}</h4>
                          <div className="overflow-x-auto border rounded">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-100">
                                <tr>
                                  {table.columns.map((col) => (
                                    <th key={col} className="px-2 py-2 text-left font-semibold text-gray-700 border-b">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {table.rows.map((row, idx) => (
                                  <tr key={`${table.title}-${idx}`} className="border-b last:border-b-0">
                                    {row.map((cell, cIdx) => (
                                      <td key={`${idx}-${cIdx}`} className="px-2 py-1.5 text-gray-800 align-top">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="certificaten">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Certificaten & keuringen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600">
                      Huidige datum is aanpasbaar per certificaat. Verloopdatum wordt automatisch berekend op basis van het interval.
                    </div>
                    <div>
                      <Button
                        type="button"
                        size="sm"
                        variant={toonNieuwCertificaatFormulier ? "outline" : "default"}
                        onClick={() => {
                          setNieuwCertificaatFout("")
                          setToonNieuwCertificaatFormulier((prev) => !prev)
                        }}
                      >
                        {toonNieuwCertificaatFormulier ? "Formulier sluiten" : "Certificaat toevoegen"}
                      </Button>
                    </div>
                    {toonNieuwCertificaatFormulier && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
                        <div className="text-sm font-semibold text-blue-900">Nieuw certificaat</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="space-y-1">
                            <div className="text-gray-700">Naam certificaat</div>
                            <Input
                              value={nieuwCertificaatNaam}
                              onChange={(e) => setNieuwCertificaatNaam(e.target.value)}
                              className="h-9 text-xs"
                              placeholder="Bijv. Certificaat voorbeeld"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-700">Datum keuring</div>
                            <Input
                              type="date"
                              value={nieuwCertificaatDatum}
                              onChange={(e) => setNieuwCertificaatDatum(e.target.value)}
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-700">Interval (jaar)</div>
                            <Input
                              value={nieuwCertificaatInterval}
                              onChange={(e) => setNieuwCertificaatInterval(e.target.value)}
                              className="h-9 text-xs"
                              placeholder="Bijv. 1 of 0,5"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-700">Waarschuwen vanaf</div>
                            <Select value={nieuwCertificaatWaarschuwing} onValueChange={setNieuwCertificaatWaarschuwing}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Kies maanden" />
                              </SelectTrigger>
                              <SelectContent>
                                {SHIP_CERTIFICATE_WARNING_OPTIONS.map((optie) => (
                                  <SelectItem key={optie} value={String(optie)}>
                                    {optie} maand{optie === 1 ? "" : "en"} vooraf
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-700">Dit certificaat voor alle schepen</div>
                            <Select value={nieuwCertificaatVoorAlleSchepen} onValueChange={setNieuwCertificaatVoorAlleSchepen}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Maak een keuze" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ja">Ja</SelectItem>
                                <SelectItem value="nee">Nee (alleen dit schip)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {nieuwCertificaatFout && <div className="text-xs font-medium text-red-700">{nieuwCertificaatFout}</div>}
                        <div>
                          <Button type="button" size="sm" onClick={voegNieuwCertificaatToe}>
                            Certificaat toevoegen
                          </Button>
                        </div>
                      </div>
                    )}
                    {certificatenEditable.map((certificaat, index) => {
                      const verloopIso = calculateCertificateExpiryDateIso(certificaat.huidig, certificaat.intervalJaar)
                      const statusInfo = getCertificateStatus(certificaat)
                      const documentKey = getCertificateDocumentMapKey(certificaat.naam)
                      const documentLinks = certificateDocuments[documentKey] || []
                      const hasDocument = documentLinks.length > 0
                      const isDragging = dragOverCertificateIndex === index
                      const isUploading = uploadingCertificateIndex === index
                      const cardClassName =
                        statusInfo.status === "expired"
                          ? "rounded-lg border border-red-300 bg-red-50 px-3 py-3"
                          : statusInfo.status === "warning"
                            ? "rounded-lg border border-orange-300 bg-orange-50 px-3 py-3"
                            : "rounded-lg border border-gray-200 bg-white px-3 py-3"
                      return (
                        <div
                          key={`${certificaat.naam}-${index}`}
                          className={`${cardClassName} ${hasDocument ? "cursor-pointer" : ""} ${isDragging ? "ring-2 ring-blue-400" : ""}`}
                          onClick={() => {
                            if (!hasDocument) return
                            openCertificateDocument(certificaat.naam)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDragOverCertificateIndex(index)
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDragOverCertificateIndex((prev) => (prev === index ? null : prev))
                          }}
                          onDrop={(e) => handleCertificateDrop(index, e)}
                          onContextMenu={(e) => handleCertificateContextMenu(index, e)}
                        >
                          <div className="mb-2">
                            <div className="text-sm font-semibold text-gray-900">{certificaat.naam}</div>
                            {hasDocument && <div className="text-xs text-gray-500">(klik op kaart om te openen)</div>}
                          </div>
                          {!hasDocument && (
                            <div className="mb-2 text-xs text-gray-600">
                              Sleep hier een document naartoe.
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1">
                              <div className="text-gray-600">Huidig</div>
                              <Input
                                type="date"
                                value={certificaat.huidig}
                                onChange={(e) => setCertificaatHuidig(index, e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-gray-600">Verloopdatum</div>
                              <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-gray-900">
                                {formatIsoToDutchDate(verloopIso)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-gray-600">Interval (jaar)</div>
                              <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-gray-900">
                                {formatInterval(certificaat.intervalJaar)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-gray-600">Waarschuwen vanaf</div>
                              <Select
                                value={String(certificaat.waarschuwingMaanden)}
                                onValueChange={(value) => setCertificaatWaarschuwing(index, Number(value))}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Kies maanden" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SHIP_CERTIFICATE_WARNING_OPTIONS.map((optie) => (
                                    <SelectItem key={optie} value={String(optie)}>
                                      {optie} maand{optie === 1 ? "" : "en"} vooraf
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {statusInfo.status === "expired" && (
                            <div className="mt-2 text-xs font-medium text-red-700">Verlopen certificaat</div>
                          )}
                          {statusInfo.status === "warning" && (
                            <div className="mt-2 text-xs font-medium text-orange-700">
                              Loopt binnenkort af (binnen {certificaat.waarschuwingMaanden} maand
                              {certificaat.waarschuwingMaanden === 1 ? "" : "en"})
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {certificateContextMenu.visible && certificateContextMenu.certificateIndex !== null && (
                      <div
                        className="fixed z-50 min-w-[220px] rounded-md border border-gray-200 bg-white shadow-lg"
                        style={{
                          top: certificateContextMenu.y,
                          left: certificateContextMenu.x,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (certificateContextMenu.certificateIndex === null) return
                            void verwijderCertificaatUitLijst(certificateContextMenu.certificateIndex)
                          }}
                        >
                          Verwijder certificaat uit lijst
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  )
}

