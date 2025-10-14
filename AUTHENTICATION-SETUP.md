# Authenticatie & Supabase-Only Implementatie

## ✅ Wat is geïmplementeerd

### 1. **Authenticatie Systeem**
- ✅ Login pagina (`/login`)
- ✅ Auth Context met `useAuth` hook
- ✅ Protected Routes (redirect naar login als niet ingelogd)
- ✅ Logout functionaliteit in header
- ✅ User email weergave in header

### 2. **Supabase-Only Data Layer**
- ✅ Alle data wordt opgehaald uit Supabase
- ✅ Geen localStorage meer (volledig verwijderd)
- ✅ Real-time synchronisatie tussen gebruikers
- ✅ CRUD operaties voor alle tabellen

### 3. **Row Level Security**
- ✅ SQL script voor RLS policies (`scripts/enable-rls.sql`)
- ✅ Alleen authenticated users kunnen data lezen/schrijven

## 📋 Wat je nu moet doen

### Stap 1: Supabase RLS Inschakelen

1. **Ga naar Supabase Dashboard** → SQL Editor
2. **Kopieer en plak** de inhoud van `scripts/enable-rls.sql`
3. **Voer het script uit**

Dit zorgt ervoor dat alleen ingelogde gebruikers data kunnen zien en wijzigen.

### Stap 2: Test Account Aanmaken

1. **Ga naar Supabase Dashboard** → Authentication → Users
2. **Klik op "Add user"** → "Create new user"
3. **Vul in:**
   - Email: `jouw-email@bedrijf.nl`
   - Password: `een-sterk-wachtwoord`
   - Auto Confirm User: **AAN**
4. **Klik op "Create user"**

### Stap 3: Test de Applicatie

1. **Start de dev server:**
   ```bash
   npm run dev
   ```

2. **Ga naar** `http://localhost:3000`
   - Je wordt automatisch doorgestuurd naar `/login`

3. **Log in met je test account**
   - Email en wachtwoord van Stap 2

4. **Test functionaliteit:**
   - ✅ Voeg een nieuw schip toe
   - ✅ Voeg een nieuw bemanningslid toe
   - ✅ Zet iemand "uit dienst"
   - ✅ Check of data persistent is (refresh de pagina)

### Stap 4: Maak Accounts voor Collega's

Voor elke collega:
1. **Ga naar Supabase Dashboard** → Authentication → Users
2. **Klik op "Add user"**
3. **Vul hun email en een tijdelijk wachtwoord in**
4. **Auto Confirm User: AAN**
5. **Stuur hen hun inloggegevens**

## 🔒 Beveiliging

### Wat is beveiligd:
- ✅ Alle pagina's vereisen login (behalve `/login`)
- ✅ Alle database operaties vereisen authenticatie
- ✅ RLS policies voorkomen ongeautoriseerde toegang
- ✅ Supabase API keys zijn veilig in `.env.local`

### Belangrijke opmerkingen:
- ⚠️ **Deel NOOIT je Supabase API keys publiekelijk**
- ⚠️ **Gebruik sterke wachtwoorden voor alle accounts**
- ⚠️ **RLS moet ingeschakeld blijven** (zie Stap 1)

## 🚀 Deployment naar Vercel

Wanneer je klaar bent om online te gaan:

### 1. Push naar GitHub
```bash
git add .
git commit -m "Add authentication and Supabase-only implementation"
git push
```

### 2. Deploy naar Vercel
1. **Ga naar** [vercel.com](https://vercel.com)
2. **Import je GitHub repository**
3. **Voeg Environment Variables toe:**
   - `NEXT_PUBLIC_SUPABASE_URL`: Jouw Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Jouw Supabase Anon Key
4. **Deploy!**

### 3. Deel de URL met je collega's
- Ze kunnen nu inloggen vanaf elk apparaat
- Alle wijzigingen zijn real-time gesynchroniseerd

## 📝 Verder bouwen

Je kunt nu gewoon verder bouwen zoals je gewend bent:

### Nieuwe pagina toevoegen:
```typescript
// app/nieuwe-pagina/page.tsx
"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function NieuwePagina() {
  return (
    <ProtectedRoute>
      <div>Mijn nieuwe pagina</div>
    </ProtectedRoute>
  )
}
```

### Data ophalen:
```typescript
import { useSupabaseData } from "@/hooks/use-supabase-data"

function MijnComponent() {
  const { crew, ships, loading } = useSupabaseData()
  
  // Gebruik crew en ships zoals je gewend bent
}
```

### Data toevoegen:
```typescript
const { addCrew } = useSupabaseData()

const handleSubmit = async () => {
  await addCrew({
    first_name: 'Jan',
    last_name: 'Jansen',
    // ... rest van de data
  })
}
```

## ❓ Veelgestelde Vragen

**Q: Wat gebeurt er met mijn bestaande localStorage data?**
A: Die wordt niet meer gebruikt. Je moet alles opnieuw toevoegen via de formulieren.

**Q: Kunnen collega's elkaars wijzigingen zien?**
A: Ja! Real-time. Als collega A een bemanningslid toevoegt, ziet collega B dat direct.

**Q: Wat als ik offline ben?**
A: De app werkt niet offline. Je moet online zijn om data te zien/wijzigen.

**Q: Kan ik nog steeds nieuwe features bouwen?**
A: Ja! Alles werkt hetzelfde, alleen de data laag is veranderd.

**Q: Hoe voeg ik een nieuwe tabel toe?**
A: 
1. Maak de tabel in Supabase Dashboard
2. Voeg RLS policies toe (zie `scripts/enable-rls.sql` als voorbeeld)
3. Voeg de tabel toe aan `use-supabase-data.ts`

## 🎉 Klaar!

Je hebt nu een volledig werkend multi-user systeem met authenticatie! 🚀

Alle wijzigingen worden automatisch gesynchroniseerd tussen alle gebruikers.
Je kunt gewoon verder bouwen zoals je gewend bent.

