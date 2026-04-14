"use client"

import { startOfDay } from "date-fns"

export type EditableShipCertificate = {
  naam: string
  huidig: string
  intervalJaar: number | null
  waarschuwingMaanden: number
}

type CertificateTemplate = {
  naam: string
  huidig: string
  intervalJaar: string
}

type ShipCertificateConfig = {
  shipKey:
    | "apollo"
    | "jupiter"
    | "neptunus"
    | "bacchus"
    | "bellona"
    | "pluto"
    | "caritas"
    | "fraternite"
    | "libertas"
    | "maike"
    | "egalite"
    | "fidelitas"
    | "serenitas"
    | "harmonie"
    | "linde"
    | "primera"
  shipName: string
  storageKey: string
  source: CertificateTemplate[]
}

export type ShipCertificateNotificationItem = {
  id: string
  title: string
  description: string
  severity: "warning" | "danger"
  href: string
  meta: Record<string, unknown>
}

export const SHIP_CERTIFICATE_WARNING_OPTIONS = [1, 2, 3] as const
export const GLOBAL_CUSTOM_CERTIFICATES_STORAGE_KEY = "global_particulars_custom_certificaten"

const APOLLO_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "29-9-2025", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "9-7-2025", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "9-7-2025", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "9-7-2025", intervalJaar: "3" },
  { naam: "EEG ijkcertificaat", huidig: "25-6-2004", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "6-10-2004", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "12-8-2024", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "26-6-2025", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "17-9-2019", intervalJaar: "10" },
  { naam: "Toestellenlijst", huidig: "26-5-2025", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "2-10-2023", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "5-6-2023", intervalJaar: "5" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "-", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "15-11-2023", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "1-7-2025", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-4-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "24-6-2025", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "30-8-2024", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "25-6-2025", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "25-6-2025", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "21-7-2025", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "-", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "-", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-12-2023", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "17-10-2022", intervalJaar: "5" },
  { naam: "Verklaring Overdruk", huidig: "9-7-2024", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "25-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "25-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "1-7-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "1-7-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "25-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "25-6-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "25-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "11-3-2021", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "25-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "1-7-2024", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "25-6-2025", intervalJaar: "2" },
  { naam: "Certificaat AED", huidig: "25-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "25-6-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "25-6-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "25-6-2025", intervalJaar: "1" },
  { naam: "BIQ inspectie", huidig: "19-9-2025", intervalJaar: "1" },
]

const JUPITER_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "15-12-2021", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "15-12-2021", intervalJaar: "10" },
  { naam: "Certificaat Klasse", huidig: "23-7-2021", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "15-12-2021", intervalJaar: "5" },
  { naam: "EEG ijkcertificaat", huidig: "22-6-2021", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "23-7-2021", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "1-8-2024", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "15-7-2021", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "8-7-2021", intervalJaar: "10" },
  { naam: "Toestellenlijst", huidig: "24-6-2024", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "17-6-2021", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "22-11-2021", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "28-2-2025", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "15-11-2023", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "12-1-2021", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-4-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "23-7-2021", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "28-6-2021", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "7-7-2021", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "7-7-2021", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "23-7-2021", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "23-7-2021", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "23-7-2021", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-8-2019", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "17-2-2021", intervalJaar: "5" },
  { naam: "Certificaat Green Award", huidig: "5-8-2024", intervalJaar: "3" },
  { naam: "Verklaring Overdruk", huidig: "-", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "13-6-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "13-6-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "13-6-2025", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "13-6-2025", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "13-6-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "13-6-2025", intervalJaar: "1" },
  { naam: "BIQ inspectie", huidig: "4-10-2024", intervalJaar: "1" },
]

const NEPTUNUS_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "2-12-2022", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "2-12-2022", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "12-7-2022", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "6-2-2025", intervalJaar: "2,5" },
  { naam: "EEG ijkcertificaat", huidig: "12-6-2020", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "18-4-2016", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "23-1-2025", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "27-5-2024", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "19-12-2016", intervalJaar: "15" },
  { naam: "Toestellenlijst", huidig: "5-6-2025", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "6-4-2021", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "6-6-2023", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "-", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "31-12-2022", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "18-5-2022", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-4-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "12-7-2022", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "9-7-2020", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "20-7-2022", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "20-7-2022", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "20-7-2022", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "-", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "-", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-4-2019", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "19-4-2022", intervalJaar: "5" },
  { naam: "Certificaat Green Award", huidig: "14-4-2023", intervalJaar: "3" },
  { naam: "Verklaring Overdruk", huidig: "5-6-2025", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "2-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "2-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "2-1-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "2-1-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "2-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "2-1-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "2-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "5-12-2022", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "2-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "2-1-2025", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "2-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "2-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "2-1-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "2-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "30-6-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "20-5-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "20-5-2025", intervalJaar: "1" },
]

const BACCHUS_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "11-10-2021", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "8-11-2021", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "12-10-2021", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "12-10-2021", intervalJaar: "5" },
  { naam: "EEG ijkcertificaat", huidig: "1-1-2011", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "29-11-2011", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "12-8-2024", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "9-9-2021", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "11-6-2018", intervalJaar: "10" },
  { naam: "Toestellenlijst", huidig: "22-7-2024", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "7-9-2021", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "9-1-2025", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "19-12-2023", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "5-10-2022", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "27-8-2021", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-1-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "1-9-2021", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "9-9-2021", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "23-8-2021", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "23-8-2021", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "23-8-2021", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "12-10-2016", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "12-10-2016", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-1-2021", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "13-10-2021", intervalJaar: "5" },
  { naam: "Certificaat Green Award", huidig: "28-1-2025", intervalJaar: "3" },
  { naam: "Verklaring Overdruk", huidig: "-", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "10-4-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "10-4-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "8-1-2024", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "10-4-2025", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "10-4-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "10-4-2025", intervalJaar: "1" },
  { naam: "BIQ inspectie", huidig: "15-7-2025", intervalJaar: "1" },
]

const BELLONA_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "1-3-2024", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "1-3-2024", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "1-3-2024", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "4-3-2024", intervalJaar: "5" },
  { naam: "EEG ijkcertificaat", huidig: "22-2-2023", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "30-6-2014", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "20-2-2024", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "11-3-2024", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "30-5-2024", intervalJaar: "10" },
  { naam: "Toestellenlijst", huidig: "27-2-2024", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "2-10-2025", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "5-7-2023", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "-", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "13-11-2023", intervalJaar: "2" },
  { naam: "Over- en onderdrukventielen", huidig: "23-2-2024", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-4-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "23-2-2024", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "28-5-2020", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "23-2-2024", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "23-2-2024", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "28-2-2024", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "21-2-2024", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "21-2-2024", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-1-2020", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "26-9-2022", intervalJaar: "5" },
  { naam: "Certificaat Green Award", huidig: "11-3-2025", intervalJaar: "3" },
  { naam: "Verklaring Overdruk", huidig: "20-5-2025", intervalJaar: "5" },
  { naam: "Certificaat Laad en Losslangen", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "12-9-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "11-10-2023", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat Toximeter", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "16-1-2023", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "12-9-2025", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "12-9-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "12-9-2025", intervalJaar: "1" },
  { naam: "BIQ inspectie", huidig: "9-12-2024", intervalJaar: "1" },
  { naam: "ECO Card ID", huidig: "-", intervalJaar: "1" },
]

const PLUTO_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "7-6-2022", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "21-7-2022", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "9-6-2022", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "3-6-2022", intervalJaar: "3" },
  { naam: "EEG ijkcertificaat", huidig: "9-8-2011", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "13-6-2012", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "28-8-2024", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "23-5-2022", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "11-6-2018", intervalJaar: "10" },
  { naam: "Toestellenlijst", huidig: "7-5-2025", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "30-3-2022", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "19-4-2016", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "19-3-2024", intervalJaar: "2" },
  { naam: "Ontheffing Bovenmaats Schip Friesland", huidig: "12-7-2022", intervalJaar: "5" },
  { naam: "Zendvergunning", huidig: "10-1-2024", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "24-5-2022", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-1-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "18-5-2022", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "24-5-2022", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "18-5-2022", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "18-5-2022", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "18-5-2022", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "-", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "-", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-5-2022", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "24-5-2022", intervalJaar: "5" },
  { naam: "Verklaring Overdruk", huidig: "7-5-2025", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "30-1-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "30-1-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "6-12-2021", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "30-1-2024", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "15-7-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "20-1-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "30-1-2024", intervalJaar: "1" },
]

const CARITAS_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "28-2-2025", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "28-2-2025", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "28-2-2025", intervalJaar: "2,5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "28-2-2025", intervalJaar: "5" },
  { naam: "EEG ijkcertificaat", huidig: "19-9-2022", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "30-6-2014", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "23-1-2024", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "19-10-2022", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "21-3-2017", intervalJaar: "15" },
  { naam: "Toestellenlijst", huidig: "19-2-2025", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "16-1-2025", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "30-4-2024", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "-", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "24-5-2024", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "20-2-2025", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-4-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "18-2-2025", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "3-12-2019", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "18-2-2025", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "18-2-2025", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "18-2-2025", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "19-3-2020", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "18-2-2025", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-2-2025", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "20-2-2025", intervalJaar: "5" },
  { naam: "Certificaat Green Award", huidig: "10-6-2024", intervalJaar: "3" },
  { naam: "Verklaring Overdruk", huidig: "19-2-2025", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "19-8-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "19-8-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "19-8-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "19-8-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "15-9-2024", intervalJaar: "2" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "19-8-2025", intervalJaar: "1" },
  { naam: "Certificaat Toximeter", huidig: "19-8-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "19-8-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "20-3-2024", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "19-8-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "19-8-2025", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "19-8-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "19-8-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "19-8-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "19-8-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "28-7-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "8-1-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "8-1-2025", intervalJaar: "2" },
]

const FRATERNITE_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "9-10-2025", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "9-10-2025", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "9-10-2025", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "9-10-2025", intervalJaar: "5" },
  { naam: "EEG ijkcertificaat", huidig: "20-9-2025", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "12-4-2013", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "2-5-2024", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "10-9-2025", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "-", intervalJaar: "10" },
  { naam: "Toestellenlijst", huidig: "10-9-2025", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "10-9-2025", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "-", intervalJaar: "5" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "-", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "16-5-2025", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "23-11-2023", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "16-9-2025", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-1-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "29-9-2025", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "9-10-2025", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "-", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "11-9-2025", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "11-9-2025", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "11-9-2025", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "11-9-2020", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "11-9-2025", intervalJaar: "5" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-1-2020", intervalJaar: "10" },
  { naam: "Certificaat Green Award", huidig: "4-4-2024", intervalJaar: "3" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "10-9-2025", intervalJaar: "5" },
  { naam: "Verklaring Overdruk", huidig: "10-9-2025", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "13-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "13-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "26-1-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "26-1-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "13-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "16-1-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "14-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "29-1-2024", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "16-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "29-1-2024", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "15-1-2025", intervalJaar: "2" },
  { naam: "Certificaat AED", huidig: "13-1-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "11-6-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "16-1-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "16-1-2025", intervalJaar: "1" },
  { naam: "BIQ inspectie", huidig: "-", intervalJaar: "1" },
  { naam: "Eco Card ID", huidig: "-", intervalJaar: "1" },
]

const LIBERTAS_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "13-7-2023", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "7-11-2023", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "12-7-2023", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "7-6-2023", intervalJaar: "5" },
  { naam: "EEG ijkcertificaat", huidig: "24-5-2018", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "14-8-2018", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "31-5-2023", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "14-6-2023", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "12-6-2018", intervalJaar: "15" },
  { naam: "Toestellenlijst", huidig: "6-6-2023", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "28-4-2023", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "26-1-2016", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "-", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "19-11-2021", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "6-6-2023", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "26-2-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "1-6-2023", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "6-6-2023", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "6-6-2023", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "6-6-2023", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "9-6-2023", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "9-6-2023", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-1-2017", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "24-1-2022", intervalJaar: "5" },
  { naam: "Certificaat Laad en Losslangen", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "30-12-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "30-12-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat Toximeter", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "7-10-2021", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "30-12-2024", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "3-12-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "3-12-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "3-12-2025", intervalJaar: "1" },
]

const MAIKE_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "4-7-2022", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "2-10-2022", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "2-10-2022", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "11-6-2025", intervalJaar: "2,5" },
  { naam: "EEG ijkcertificaat", huidig: "22-6-2017", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "28-9-2017", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "17-8-2023", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "7-1-2021", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "30-8-2017", intervalJaar: "10" },
  { naam: "Toestellenlijst", huidig: "27-5-2025", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "26-8-2022", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "22-5-2024", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "18-12-2023", intervalJaar: "4" },
  { naam: "Zendvergunning", huidig: "15-11-2023", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "23-6-2022", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-4-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "21-6-2022", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "31-7-2017", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "22-6-2022", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "22-6-2022", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "22-6-2022", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "1-1-2022", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "1-1-2022", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "12-6-2025", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "4-7-2022", intervalJaar: "5" },
  { naam: "Certificaat Green Award", huidig: "15-8-2024", intervalJaar: "3" },
  { naam: "Verklaring Overdruk", huidig: "27-5-2025", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "10-6-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "10-6-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Toximeter", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "10-6-2025", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "10-6-2025", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "10-6-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "10-6-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "10-6-2025", intervalJaar: "1" },
]

const EGALITE_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "18-7-2024", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "18-7-2024", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "18-9-2024", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "18-6-2024", intervalJaar: "5" },
  { naam: "EEG ijkcertificaat", huidig: "9-9-2024", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "17-9-2004", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "10-6-2024", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "5-8-2024", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "22-9-2020", intervalJaar: "10" },
  { naam: "Toestellenlijst", huidig: "5-6-2024", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "28-9-2023", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "28-2-2024", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "-", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "19-3-2024", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "31-5-2024", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-4-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "27-6-2024", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "3-5-2021", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "29-5-2024", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "28-5-2024", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "3-6-2024", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "-", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "-", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "-", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "31-3-2022", intervalJaar: "5" },
  { naam: "Verklaring Overdruk", huidig: "-", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "29-5-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "29-5-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat Toximeter", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "15-5-2023", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "29-5-2024", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "26-5-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "9-5-2025", intervalJaar: "1" },
  { naam: "BIQ Inspectie", huidig: "12-9-2024", intervalJaar: "1" },
]

const FIDELITAS_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "17-6-2021", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "17-6-2021", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "26-8-2021", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "26-8-2021", intervalJaar: "5" },
  { naam: "EEG ijkcertificaat", huidig: "21-1-2020", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "23-8-2005", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "6-8-2024", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "29-3-2022", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "23-11-2020", intervalJaar: "10" },
  { naam: "Toestellenlijst", huidig: "15-6-2024", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "28-9-2023", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "28-2-2024", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "-", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "19-3-2024", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "4-8-2021", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-4-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "4-8-2021", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "15-6-2023", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "4-8-2021", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "4-8-2021", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "4-8-2021", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "1-1-2015", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "1-1-2015", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-1-2021", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "23-5-2022", intervalJaar: "5" },
  { naam: "Verklaring Overdruk", huidig: "-", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "14-2-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "14-2-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Toximeter", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "16-3-2023", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "14-2-2025", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "4-8-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "BIQ inspectie", huidig: "26-5-2025", intervalJaar: "1" },
]

const SERENITAS_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "4-10-2021", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "4-10-2021", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "7-10-2021", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "15-7-2024", intervalJaar: "2,5" },
  { naam: "EEG ijkcertificaat", huidig: "1-12-2016", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "26-4-2017", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "23-8-2024", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "4-10-2021", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "18-4-2017", intervalJaar: "15" },
  { naam: "Toestellenlijst", huidig: "16-7-2024", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "30-3-2022", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "27-3-2024", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "-", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "31-12-2022", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "4-8-2021", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-4-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "22-9-2021", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "25-9-2020", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "25-9-2020", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "25-9-2020", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "-", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "-", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "2-5-2017", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "4-10-2021", intervalJaar: "5" },
  { naam: "Certificaat Green Award", huidig: "2-10-2023", intervalJaar: "3" },
  { naam: "Verklaring Overdruk", huidig: "16-7-2024", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "11-4-2025", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "18-3-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Toximeter", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "16-6-2021", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "18-3-2024", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "11-4-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "11-4-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "25-2-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "25-2-2025", intervalJaar: "1" },
]

const HARMONIE_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "7-12-2023", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "29-12-2023", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "13-11-2023", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "15-7-2024", intervalJaar: "2,5" },
  { naam: "EEG ijkcertificaat", huidig: "18-3-2019", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "18-5-2019", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "29-9-2023", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "18-5-2021", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "24-6-2019", intervalJaar: "10" },
  { naam: "Toestellenlijst", huidig: "23-8-2023", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "5-2-2021", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "11-6-2019", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "-", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "31-12-2024", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "30-8-2023", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-1-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "21-8-2023", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "30-8-2023", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "30-8-2023", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "13-9-2023", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "22-9-2023", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "22-9-2023", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-1-2018", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "4-10-2021", intervalJaar: "5" },
  { naam: "Certificaat Green Award", huidig: "2-10-2023", intervalJaar: "3" },
  { naam: "Verklaring Overdruk", huidig: "-", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "27-2-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "27-2-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "14-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Toximeter", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "11-3-2021", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "6-2-2025", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "7-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "6-2-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "6-2-2025", intervalJaar: "1" },
  { naam: "BIQ inspectie", huidig: "18-11-2025", intervalJaar: "1" },
]

const LINDE_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "10-2-2021", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "29-6-2021", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "10-2-2021", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "29-1-2024", intervalJaar: "5" },
  { naam: "EEG ijkcertificaat", huidig: "1-3-2017", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "3-4-2017", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "-", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "15-9-2025", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "8-5-2017", intervalJaar: "15" },
  { naam: "Toestellenlijst", huidig: "28-8-2023", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "15-9-2025", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "5-6-2024", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "2-5-2024", intervalJaar: "2" },
  { naam: "Zendvergunning", huidig: "24-6-2024", intervalJaar: "3" },
  { naam: "Over- en onderdrukventielen", huidig: "14-8-2025", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "1-7-2025", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "15-9-2025", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "27-7-2017", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "12-8-2025", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "12-8-2025", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "13-8-2025", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "-", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "-", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "1-1-2017", intervalJaar: "10" },
  { naam: "Certificaat Laad en Losslangen", huidig: "24-11-2024", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "24-11-2024", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "24-11-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "24-11-2024", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "24-11-2024", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "24-11-2024", intervalJaar: "1" },
  { naam: "Certificaat Toximeter", huidig: "24-11-2024", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "24-11-2024", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "13-10-2021", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "24-11-2024", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "24-11-2024", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "24-11-2024", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "24-11-2024", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "8-5-2025", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "17-1-2025", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "17-1-2025", intervalJaar: "1" },
]

const PRIMERA_CERTIFICATES_SOURCE: CertificateTemplate[] = [
  { naam: "Certificaat van Goedkeuring", huidig: "-", intervalJaar: "5" },
  { naam: "Certificaat van Onderzoek", huidig: "-", intervalJaar: "5" },
  { naam: "Certificaat Klasse", huidig: "-", intervalJaar: "5" },
  { naam: "Certificaat Gasdetectie Statement", huidig: "-", intervalJaar: "5" },
  { naam: "EEG ijkcertificaat", huidig: "-", intervalJaar: "-" },
  { naam: "AB Restlading certificaat", huidig: "-", intervalJaar: "-" },
  { naam: "Stuurwerk Certificaat", huidig: "-", intervalJaar: "3" },
  { naam: "Inbouwverklaring Radar en Bochtaanwijzer", huidig: "-", intervalJaar: "5" },
  { naam: "Meetbrief", huidig: "-", intervalJaar: "20" },
  { naam: "Toestellenlijst", huidig: "1-4-2025", intervalJaar: "3" },
  { naam: "Attest Tachograaf", huidig: "-", intervalJaar: "5" },
  { naam: "Rijnvaartverklaring", huidig: "-", intervalJaar: "-" },
  { naam: "Exploitatievergunning Luxembourg", huidig: "9-1-2025", intervalJaar: "5" },
  { naam: "Exploitatievergunning Belgie", huidig: "-", intervalJaar: "2" },
  { naam: "Afgifte Vaartijdenboek", huidig: "-", intervalJaar: "-" },
  { naam: "Zendvergunning", huidig: "-", intervalJaar: "3" },
  { naam: "Bilge Boekje", huidig: "-", intervalJaar: "-" },
  { naam: "Over- en onderdrukventielen", huidig: "-", intervalJaar: "5" },
  { naam: "Stoffenlijst", huidig: "-", intervalJaar: "2" },
  { naam: "Overeenkomst Veiligheidsadviseur", huidig: "31-12-2024", intervalJaar: "1" },
  { naam: "Diktemeting Certificaat", huidig: "-", intervalJaar: "5" },
  { naam: "Autokraan Keuring", huidig: "-", intervalJaar: "10" },
  { naam: "Certificaat Afdichting Roerwerk", huidig: "-", intervalJaar: "5" },
  { naam: "Certificaat Afdichting Schroefas", huidig: "-", intervalJaar: "5" },
  { naam: "Ankerketting Rapport", huidig: "-", intervalJaar: "5" },
  { naam: "Afpersen van Tanks", huidig: "-", intervalJaar: "10" },
  { naam: "Afpersen van Leidingen", huidig: "-", intervalJaar: "10" },
  { naam: "10 jaarlijkse keuring afpersen brandblusinstallatie", huidig: "-", intervalJaar: "10" },
  { naam: "5 jaarlijkse keuring Stuurhuis kolom", huidig: "-", intervalJaar: "5" },
  { naam: "Certificaat Green Award", huidig: "-", intervalJaar: "3" },
  { naam: "Verklaring Overdruk", huidig: "-", intervalJaar: "3" },
  { naam: "Certificaat Laad en Losslangen", huidig: "-", intervalJaar: "1" },
  { naam: "Certificaat Drainslangen", huidig: "-", intervalJaar: "1" },
  { naam: "Certificaat Brandblussers", huidig: "-", intervalJaar: "2" },
  { naam: "Certificaat Brandslangen", huidig: "-", intervalJaar: "2" },
  { naam: "Certificaat Brandmeldcentrale", huidig: "-", intervalJaar: "1" },
  { naam: "Certificaat Draagbare Gasdetectiemeter", huidig: "-", intervalJaar: "1" },
  { naam: "Certificaat Toximeter", huidig: "-", intervalJaar: "1" },
  { naam: "Certificaat H2s Meters", huidig: "-", intervalJaar: "1" },
  { naam: "Certificaat Thermometer", huidig: "-", intervalJaar: "5" },
  { naam: "Certificaat Volgelaatsmaskers", huidig: "-", intervalJaar: "1" },
  { naam: "Certificaat Brandblusinstallatie", huidig: "-", intervalJaar: "2" },
  { naam: "Certificaat Zwemvesten", huidig: "-", intervalJaar: "1" },
  { naam: "Certificaat Valbeveiliging", huidig: "-", intervalJaar: "-" },
  { naam: "Certificaat Luchtnetsysteem", huidig: "-", intervalJaar: "1" },
  { naam: "Certificaat AED", huidig: "-", intervalJaar: "1" },
  { naam: "Certificaat Vaste Gasdetectie", huidig: "-", intervalJaar: "0,5" },
  { naam: "Verklaring ADN Kisten", huidig: "-", intervalJaar: "1" },
  { naam: "Verklaring EHBO Kisten", huidig: "-", intervalJaar: "1" },
  { naam: "BIQ inspectie", huidig: "-", intervalJaar: "1" },
]

const SHIP_CERTIFICATE_CONFIGS: ShipCertificateConfig[] = [
  {
    shipKey: "apollo",
    shipName: "Apollo",
    storageKey: "apollo_particulars_certificaten",
    source: APOLLO_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "jupiter",
    shipName: "Jupiter",
    storageKey: "jupiter_particulars_certificaten",
    source: JUPITER_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "neptunus",
    shipName: "Neptunus",
    storageKey: "neptunus_particulars_certificaten",
    source: NEPTUNUS_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "bacchus",
    shipName: "Bacchus",
    storageKey: "bacchus_particulars_certificaten",
    source: BACCHUS_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "bellona",
    shipName: "Bellona",
    storageKey: "bellona_particulars_certificaten",
    source: BELLONA_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "pluto",
    shipName: "Pluto",
    storageKey: "pluto_particulars_certificaten",
    source: PLUTO_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "caritas",
    shipName: "Caritas",
    storageKey: "caritas_particulars_certificaten",
    source: CARITAS_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "fraternite",
    shipName: "Fraternite",
    storageKey: "fraternite_particulars_certificaten",
    source: FRATERNITE_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "libertas",
    shipName: "Libertas",
    storageKey: "libertas_particulars_certificaten",
    source: LIBERTAS_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "maike",
    shipName: "Maike",
    storageKey: "maike_particulars_certificaten",
    source: MAIKE_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "egalite",
    shipName: "Egalite",
    storageKey: "egalite_particulars_certificaten",
    source: EGALITE_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "fidelitas",
    shipName: "Fidelitas",
    storageKey: "fidelitas_particulars_certificaten",
    source: FIDELITAS_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "serenitas",
    shipName: "Serenitas",
    storageKey: "serenitas_particulars_certificaten",
    source: SERENITAS_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "harmonie",
    shipName: "Harmonie",
    storageKey: "harmonie_particulars_certificaten",
    source: HARMONIE_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "linde",
    shipName: "Linde",
    storageKey: "linde_particulars_certificaten",
    source: LINDE_CERTIFICATES_SOURCE,
  },
  {
    shipKey: "primera",
    shipName: "Primera",
    storageKey: "primera_particulars_certificaten",
    source: PRIMERA_CERTIFICATES_SOURCE,
  },
]

const parseDutchDateToIso = (value: string) => {
  const cleaned = String(value || "").trim()
  if (!cleaned || cleaned === "-") return ""
  const [d, m, y] = cleaned.split("-")
  if (!d || !m || !y) return ""
  const day = String(Number(d)).padStart(2, "0")
  const month = String(Number(m)).padStart(2, "0")
  const year = String(Number(y)).padStart(4, "0")
  return `${year}-${month}-${day}`
}

const parseIntervalYears = (value: string): number | null => {
  const cleaned = String(value || "").trim()
  if (!cleaned || cleaned === "-") return null
  const numeric = Number(cleaned.replace(",", "."))
  return Number.isFinite(numeric) ? numeric : null
}

const normalizeCertificateName = (certificateName: string) =>
  String(certificateName || "").trim().toLowerCase()

const sanitizeStoredCertificate = (raw: unknown): EditableShipCertificate | null => {
  if (!raw || typeof raw !== "object") return null
  const item = raw as Partial<EditableShipCertificate>
  const naam = String(item.naam || "").trim()
  if (!naam) return null

  const huidig = typeof item.huidig === "string" ? item.huidig : ""

  const rawInterval = item.intervalJaar
  const intervalJaar =
    rawInterval === null
      ? null
      : typeof rawInterval === "number" && Number.isFinite(rawInterval)
        ? rawInterval
        : typeof rawInterval === "string"
          ? parseIntervalYears(rawInterval)
          : null

  const waarschuwing = Number(item.waarschuwingMaanden)
  const waarschuwingMaanden = SHIP_CERTIFICATE_WARNING_OPTIONS.includes(waarschuwing as any)
    ? waarschuwing
    : 1

  return {
    naam,
    huidig,
    intervalJaar,
    waarschuwingMaanden,
  }
}

const sanitizeStoredCertificates = (raw: unknown): EditableShipCertificate[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => sanitizeStoredCertificate(item)).filter((item): item is EditableShipCertificate => Boolean(item))
}

const mergeCertificateLists = (
  base: EditableShipCertificate[],
  overrides: EditableShipCertificate[]
): EditableShipCertificate[] => {
  if (overrides.length === 0) return base

  const overrideMap = new Map<string, EditableShipCertificate>()
  overrides.forEach((item) => {
    const key = normalizeCertificateName(item.naam)
    if (!key) return
    overrideMap.set(key, item)
  })

  const mergedBase = base.map((item) => {
    const key = normalizeCertificateName(item.naam)
    const override = overrideMap.get(key)
    if (!override) return item
    return {
      ...item,
      huidig: override.huidig,
      intervalJaar: override.intervalJaar,
      waarschuwingMaanden: override.waarschuwingMaanden,
    }
  })

  const baseNameSet = new Set(base.map((item) => normalizeCertificateName(item.naam)))
  const extraOverrides = overrides.filter((item) => !baseNameSet.has(normalizeCertificateName(item.naam)))

  return [...mergedBase, ...extraOverrides]
}

const toDefaultEditable = (source: CertificateTemplate[]): EditableShipCertificate[] =>
  source.map((item) => ({
    naam: item.naam,
    huidig: parseDutchDateToIso(item.huidig),
    intervalJaar: parseIntervalYears(item.intervalJaar),
    waarschuwingMaanden: 1,
  }))

const normalizeShipName = (shipName: string) =>
  String(shipName || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

export const getShipCertificateConfigByName = (shipName: string): ShipCertificateConfig | null => {
  const normalized = normalizeShipName(shipName)
  return SHIP_CERTIFICATE_CONFIGS.find((c) => normalizeShipName(c.shipName) === normalized) || null
}

export const getShipCertificateStorageKeyByName = (shipName: string): string | null => {
  return getShipCertificateConfigByName(shipName)?.storageKey || null
}

export const getShipCertificateDefaultsByName = (shipName: string): EditableShipCertificate[] => {
  const config = getShipCertificateConfigByName(shipName)
  if (!config) return []
  return toDefaultEditable(config.source)
}

export const getGlobalCustomCertificatesForClient = (): EditableShipCertificate[] => {
  if (typeof window === "undefined") return []
  try {
    const stored = window.localStorage.getItem(GLOBAL_CUSTOM_CERTIFICATES_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : null
    return sanitizeStoredCertificates(parsed)
  } catch {
    return []
  }
}

export const getShipCertificateDefaultsForClient = (shipName: string): EditableShipCertificate[] => {
  const defaults = getShipCertificateDefaultsByName(shipName)
  const globalCustom = getGlobalCustomCertificatesForClient()
  return mergeCertificateLists(defaults, globalCustom)
}

export const formatIsoToDutchDate = (iso: string) => {
  const [y, m, d] = String(iso || "").split("-")
  if (!y || !m || !d) return "-"
  return `${d}-${m}-${y}`
}

export const calculateCertificateExpiryDateIso = (huidigIso: string, intervalJaar: number | null) => {
  if (!huidigIso || intervalJaar === null) return ""
  const [y, m, d] = huidigIso.split("-").map(Number)
  if (!y || !m || !d) return ""

  const monthsToAdd = Math.round(intervalJaar * 12)
  const date = new Date(y, m - 1, d)
  date.setMonth(date.getMonth() + monthsToAdd)

  const year = String(date.getFullYear()).padStart(4, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const formatInterval = (interval: number | null) => {
  if (interval === null) return "-"
  return Number.isInteger(interval) ? String(interval) : String(interval).replace(".", ",")
}

export const mergeShipCertificatesWithStored = (
  shipName: string,
  storedRaw: unknown,
  baseCertificates?: EditableShipCertificate[]
): EditableShipCertificate[] => {
  const defaults = baseCertificates || getShipCertificateDefaultsForClient(shipName)
  const stored = sanitizeStoredCertificates(storedRaw)
  return mergeCertificateLists(defaults, stored)
}

export const getCertificateStatus = (
  certificaat: EditableShipCertificate,
  referenceDate: Date = new Date()
): {
  status: "ok" | "warning" | "expired"
  expiryIso: string
  daysUntilExpiry: number | null
} => {
  const expiryIso = calculateCertificateExpiryDateIso(certificaat.huidig, certificaat.intervalJaar)
  if (!expiryIso) return { status: "ok", expiryIso: "", daysUntilExpiry: null }

  const expiryDate = startOfDay(new Date(expiryIso))
  if (isNaN(expiryDate.getTime())) return { status: "ok", expiryIso: "", daysUntilExpiry: null }

  const today = startOfDay(referenceDate)
  const diffMs = expiryDate.getTime() - today.getTime()
  const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (daysUntilExpiry < 0) return { status: "expired", expiryIso, daysUntilExpiry }

  const warningStart = new Date(expiryDate)
  warningStart.setMonth(warningStart.getMonth() - certificaat.waarschuwingMaanden)
  warningStart.setHours(0, 0, 0, 0)
  if (today.getTime() >= warningStart.getTime()) {
    return { status: "warning", expiryIso, daysUntilExpiry }
  }
  return { status: "ok", expiryIso, daysUntilExpiry }
}

export const buildShipCertificateNotifications = (
  shipName: string,
  certificates: EditableShipCertificate[],
  referenceDate: Date = new Date()
): ShipCertificateNotificationItem[] => {
  const config = getShipCertificateConfigByName(shipName)
  const displayName = config?.shipName || shipName
  const shipKey = config?.shipKey || normalizeShipName(shipName)
  const items: ShipCertificateNotificationItem[] = []

  certificates.forEach((certificaat, index) => {
    const statusInfo = getCertificateStatus(certificaat, referenceDate)
    if (!statusInfo.expiryIso) return
    if (statusInfo.status === "ok") return

    const expiryText = formatIsoToDutchDate(statusInfo.expiryIso)
    const title =
      statusInfo.status === "expired"
        ? "Verlopen certificaat"
        : `Certificaat verloopt binnen ${certificaat.waarschuwingMaanden} maand${
            certificaat.waarschuwingMaanden === 1 ? "" : "en"
          }`

    const dayText =
      statusInfo.daysUntilExpiry === null
        ? ""
        : statusInfo.daysUntilExpiry < 0
          ? `${Math.abs(statusInfo.daysUntilExpiry)} dag${
              Math.abs(statusInfo.daysUntilExpiry) === 1 ? "" : "en"
            } geleden`
          : statusInfo.daysUntilExpiry === 0
            ? "vandaag"
            : `over ${statusInfo.daysUntilExpiry} dag${statusInfo.daysUntilExpiry === 1 ? "" : "en"}`

    items.push({
      id: `${shipKey}-certificaat-${index}`,
      title,
      description: `${displayName} - ${certificaat.naam} (${expiryText}${dayText ? `, ${dayText}` : ""})`,
      severity: statusInfo.status === "expired" ? "danger" : "warning",
      href: "/schepen/overzicht",
      meta: {
        ship: displayName,
        shipKey,
        certificateName: certificaat.naam,
        expiryDate: expiryText,
        warningMonths: certificaat.waarschuwingMaanden,
      },
    })
  })

  return items
}

export const getShipCertificatesForClient = (shipName: string): EditableShipCertificate[] => {
  const config = getShipCertificateConfigByName(shipName)
  if (!config) return []
  if (typeof window === "undefined") return []
  const defaults = getShipCertificateDefaultsForClient(shipName)
  try {
    const stored = window.localStorage.getItem(config.storageKey)
    const parsed = stored ? JSON.parse(stored) : null
    return mergeShipCertificatesWithStored(shipName, parsed, defaults)
  } catch {
    return defaults
  }
}

export const getAllShipCertificateNotificationsForClient = (): ShipCertificateNotificationItem[] => {
  if (typeof window === "undefined") return []
  return SHIP_CERTIFICATE_CONFIGS.flatMap((config) => {
    const certificates = getShipCertificatesForClient(config.shipName)
    return buildShipCertificateNotifications(config.shipName, certificates)
  })
}
