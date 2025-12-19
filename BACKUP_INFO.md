# Bemanningslijst - Backup Informatie

**Laatste Backup:** 17 december 2025

## Belangrijke Links

- **GitHub Repository:** https://github.com/WillemBamalite/bamalite-hr-system
- **Vercel Deployment:** Live versie op Vercel (automatisch gepusht)
- **Supabase Database:** Cloud database met automatische backups

## Belangrijke Features

### 1. Schepen Overzicht
- Overzicht van alle schepen met bemanningsleden
- Status: "Aan Boord", "Thuis", "Ziek"
- Dummy's toevoegen voor ontbrekende functies
- A/B designatie voor bemanningsleden
- Scroll positie behoud bij wijzigingen
- Notities toevoegen/verwijderen per bemanningslid
- Kleurcodering per bemanningslid

### 2. Nieuw Personeel
- Kandidaten toevoegen en beheren
- Checklist: Arbeidsovereenkomst, Ingeschreven Luxemburg, Verzekerd
- Status tracking: Nog te benaderen, Nog in te delen, Nog af te ronden, Later terugkomen
- Kleurcodering voor contact stadia (geel/blauw/paars)
- Toewijzen aan schip

### 3. Aflossers Beheer
- Vaste aflossers in dienst
- Zelfstandige aflossers
- Aflossers van uitzendbureaus
- Overwerkers tab met beschikbaarheid
- Reis status: Gepland → Ingedeeld → Actief → Voltooid
- Betaalstatus voor zelfstandige aflossers

### 4. Taken Systeem
- Taken met prioriteit (Hoog, Normaal, Laag)
- Toewijzen aan: Nautic, Leo, Willem, Jos, Bart
- Status updates door degene die de taak oppakt
- Automatische email notificaties
- Tabbed interface per persoon
- Kolommen: Schepen, Personeel, Algemeen

### 5. Ziekteverlof
- Ziektebriefjes bijhouden
- Vervaldatums tracken
- Email notificatie bijna verlopen (3 dagen)
- Tabs: Ziekte, Terug te staan
- Groepering van terug te staan records

### 6. Studenten
- BBL en BOL studenten
- Overzicht met/ zonder schip
- Toewijzen aan schepen

### 7. Medische Keuringen
- Vervaldatums medische keuringen
- Opties: 1 jaar, 2 jaar, 3 jaar, 6 maanden
- Overzicht van alle bemanningsleden met aflossers in vaste dienst

### 8. Agenda
- Agenda items toevoegen
- Calendar view
- Items gekoppeld aan taken (deadline)
- "Voor wie" specificatie

### 9. Dashboard
- Statistieken overzicht
- Nieuw Personeel: nog te benaderen / nog in te delen / nog af te ronden
- Nog openstaande reizen: geplande / ingedeelde / actieve reizen
- Studenten: BBL / BOL
- Zieken: verlopen briefje / bijna verlopen / geldig briefje
- Proeftijd meldingen (70 dagen)
- Verjaardagsmeldingen

### 10. Email Systeem
- Gmail SMTP voor email notificaties
- Automatische emails bij:
  - Nieuwe taken
  - Bijna verlopen ziektebriefjes
  - Proeftijd aflopend (70 dagen)

## Database Tabellen

- `crew` - Bemanningsleden
- `ships` - Schepen
- `trips` - Reizen voor aflossers
- `tasks` - Taken
- `sick_leave` - Ziekteverlof
- `agenda_items` - Agenda items
- `stand_back_records` - Terug te staan records
- `crew_color_tags` - Kleurcodering

## Belangrijke Technische Details

- **Framework:** Next.js 14 (App Router)
- **TypeScript:** Ja
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Email:** Gmail SMTP via Nodemailer

## Backups

### Git/GitHub
- Alle code staat in Git
- Automatisch gepusht naar GitHub
- Repository: WillemBamalite/bamalite-hr-system

### Database
- Supabase heeft automatische backups
- Point-in-time recovery beschikbaar
- Maandelijks handmatige export aanbevolen

### Vercel
- Automatische deployments bij elke push
- Versiegeschiedenis beschikbaar

## Belangrijke Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `OPENAI_API_KEY` (voor Nautisch project)

## Recente Belangrijke Wijzigingen

- Scroll positie behoud bij wijzigingen in schepen overzicht
- Proeftijd meldingen (70 dagen) met email
- Tasks tabbed interface met status updates
- Overwerkers beschikbaarheid tracking
- Agenda systeem
- Verbeterde ziekteverlof tracking

## Notities voor Toekomstige Wijzigingen

- System werkt prima, alleen fine-tuning nodig
- Belangrijk om regelmatig te pushen na belangrijke wijzigingen
- Database exports maandelijks aanbevelen
- Alle conversaties met AI worden bewaard in Cursor



