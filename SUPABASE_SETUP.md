# 🚀 Supabase Setup voor Bamalite HR Systeem

## **Stap 1: Supabase Project Aanmaken**

1. Ga naar [supabase.com](https://supabase.com)
2. Klik op "Start your project"
3. Log in met GitHub of maak een account
4. Klik op "New Project"
5. Kies een naam: `bamalite-hr-system`
6. Kies een database password (bewaar dit!)
7. Kies een regio dichtbij (bijv. West Europe)
8. Klik "Create new project"

## **Stap 2: Database Schema Instellen**

1. Ga naar je Supabase project dashboard
2. Klik op "SQL Editor" in het linker menu
3. Klik op "New query"
4. Kopieer de inhoud van `database-schema.sql`
5. Plak het in de SQL editor
6. Klik op "Run" om de tabellen aan te maken

## **Stap 3: Environment Variables Instellen**

1. Ga naar "Settings" → "API" in je Supabase dashboard
2. Kopieer de "Project URL" en "anon public" key
3. Maak een bestand `.env.local` in je project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## **Stap 4: Data Migreren**

1. Start je development server: `npm run dev`
2. Ga naar `http://localhost:3000/api/migrate` (we maken dit nog)
3. Of voer het migratie script uit

## **Stap 5: Testen**

1. Controleer of alle data is gemigreerd
2. Test real-time updates
3. Test alle functionaliteit

## **Stap 6: Vercel Deployment**

1. Push naar GitHub
2. Verbind met Vercel
3. Voeg environment variables toe in Vercel
4. Deploy!

---

## **Belangrijke URLs:**

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Project URL:** Je krijgt dit van Supabase
- **API Keys:** In Settings → API

## **Troubleshooting:**

### **Error: "Invalid API key"**
- Controleer of je de juiste anon key gebruikt
- Controleer of de URL correct is

### **Error: "Table does not exist"**
- Controleer of je het SQL schema hebt uitgevoerd
- Controleer of alle tabellen zijn aangemaakt

### **Error: "Permission denied"**
- Controleer of Row Level Security policies correct zijn ingesteld
- Controleer of de tabellen publiek toegankelijk zijn

---

## **Volgende Stappen:**

1. ✅ Supabase project aanmaken
2. ✅ Database schema instellen
3. ✅ Environment variables configureren
4. ✅ Data migreren
5. ✅ Testen
6. ✅ Vercel deployment

**Klaar om te beginnen?** 🎯 