# 🔍 SUPABASE MIGRATIE AUDIT RAPPORT
## Datum: 14 Oktober 2025

---

## ✅ WAT WERKT AL (Volledig op Supabase)

### Hooks
- ✅ `hooks/use-supabase-data.ts` - Hoofdhook met CRUD operaties
  - Ships: load, add, update, delete
  - Crew: load, add, update, delete  
  - Sick Leave: load, add, update
  - Automatische rotatie & activatie

### Pagina's (Gemigreerd)
- ✅ `app/page.tsx` - Dashboard
- ✅ `app/bemanning/overzicht/page.tsx` - Crew overzicht
- ✅ `app/bemanning/nog-in-te-delen/page.tsx` - Nog in te delen
- ✅ `app/bemanning/aflossers/page.tsx` - Aflossers
- ✅ `app/bemanning/aflossers/nieuw/page.tsx` - Nieuwe aflosser
- ✅ `app/bemanning/aflossers/[id]/page.tsx` - Aflosser detail
- ✅ `app/bemanning/aflossers/voltooide-reizen/page.tsx` - Voltooide reizen
- ✅ `app/bemanning/aflossers/vaste-dienst/page.tsx` - Vaste dienst
- ✅ `app/bemanning/studenten/page.tsx` - Studenten
- ✅ `app/bemanning/oude-bemanningsleden/page.tsx` - Oude bemanningsleden  
- ✅ `app/bemanning/leningen/page.tsx` - Leningen
- ✅ `app/ziekte/page.tsx` - Ziekte dashboard
- ✅ `app/ziekte/nieuw/page.tsx` - Nieuwe ziekmelding
- ✅ `app/ziekte-history/page.tsx` - Ziekte geschiedenis
- ✅ `app/schepen/nieuw/page.tsx` - Nieuw schip

### Components (Gemigreerd)
- ✅ `components/ship-overview.tsx` - Schepen overzicht
- ✅ `components/dashboard-stats.tsx` - Dashboard statistieken
- ✅ `components/crew/new-crew-form.tsx` - Nieuw bemanningslid formulier
- ✅ `components/crew/crew-member-header.tsx` - Bemanningslid header
- ✅ `components/crew/crew-member-profile.tsx` - Bemanningslid profiel
- ✅ `components/crew/crew-member-status-changes.tsx` - Status wijzigingen
- ✅ `components/ai-search-bar.tsx` - AI zoekbalk (gebruikt useLocalStorageData maar alleen voor lezen)

---

## 🔴 WAT WERKT NIET / NOG MIGREREN

### Kritieke Issues

#### 1. **ONTBREKENDE FUNCTIE: `addStandBackRecord`**
**Locatie:** `hooks/use-supabase-data.ts`
**Probleem:** Functie wordt gebruikt in `app/ziekte/page.tsx` (regel 22, 242) maar bestaat NIET in de hook
**Impact:** 🔴 CRITICAL - Beter melden werkt niet!
**Oplossing:** Functie toevoegen + exporteren

#### 2. **ONTBREKENDE SQL KOLOMMEN**
**Probleem:** Database heeft niet alle benodigde kolommen
**Impact:** 🔴 CRITICAL - Veel functionaliteit werkt niet
**Status:** SQL scripts gemaakt, MOET GERUND WORDEN
**Scripts:**
- `scripts/complete-migration.sql` (GECOMBINEERD SCRIPT)
- Of individueel:
  - `scripts/add-out-of-service-fields.sql`
  - `scripts/add-missing-crew-fields.sql`
  - `scripts/add-sub-status-column.sql`

**Kolommen die toegevoegd worden:**
- `out_of_service_date` - Voor uit dienst functie
- `out_of_service_reason` - Voor uit dienst functie
- `birth_place` - Geboorteplaats
- `matricule` - Matriculenummer
- `company` - Bedrijf
- `smoking` - Rookt ja/nee
- `experience` - Werkervaring
- `sub_status` - Sub-status voor nog-in-te-delen
- `expected_start_date` - Verwachte startdatum

### Pagina's die NOG localStorage gebruiken

#### 3. **Print Pagina**
**Locatie:** `app/bemanning/print/page.tsx`
**Gebruikt:** `useCrewData` (localStorage)
**Impact:** 🟡 MEDIUM - Print functie werkt met oude data
**Oplossing:** Migreer naar `useSupabaseData`

#### 4. **Toewijzen Pagina**  
**Locatie:** `app/bemanning/aflossers/toewijzen/page.tsx`
**Gebruikt:** `useCrewData` (localStorage)
**Impact:** 🟡 MEDIUM - Aflossers toewijzen werkt niet correct
**Oplossing:** Migreer naar `useSupabaseData`

#### 5. **Update Pagina**
**Locatie:** `app/bemanning/update/page.tsx`
**Gebruikt:** `useCrewData` (localStorage)
**Impact:** 🟡 MEDIUM - Handmatig updaten werkt niet correct
**Oplossing:** Migreer naar `useSupabaseData`

#### 6. **Aflossers Component**
**Locatie:** `app/bemanning/aflossers.tsx`
**Gebruikt:** `useCrewData` (localStorage)
**Impact:** 🟡 MEDIUM - Oude component, mogelijk niet meer gebruikt
**Oplossing:** Check of dit nog gebruikt wordt, anders verwijderen

### Components die NOG localStorage gebruiken

#### 7. **Ship Crew Overview Component**
**Locatie:** `components/ship-crew-overview.tsx`
**Gebruikt:** `useCrewData` (localStorage)
**Impact:** 🟠 HIGH - Dit is een belangrijke component!
**Oplossing:** Migreer naar `useSupabaseData`

#### 8. **Crew Print Overview**
**Locatie:** `components/crew/crew-print-overview.tsx`
**Gebruikt:** `useCrewData` (localStorage)  
**Impact:** 🟡 MEDIUM - Print functie
**Oplossing:** Migreer naar `useSupabaseData`

#### 9. **Ship Print Overview**
**Locatie:** `components/ship-print-overview.tsx`
**Gebruikt:** `useCrewData` (localStorage)
**Impact:** 🟡 MEDIUM - Print functie
**Oplossing:** Migreer naar `useSupabaseData`

#### 10. **Sick Leave Overview**
**Locatie:** `components/sick-leave/sick-leave-overview.tsx`
**Gebruikt:** `useCrewData` (localStorage)
**Impact:** 🟠 HIGH - Ziekte overzicht
**Oplossing:** Migreer naar `useSupabaseData`

#### 11. **Stand Back Days Overview**
**Locatie:** `components/sick-leave/stand-back-days-overview.tsx`
**Gebruikt:** `useCrewData` (localStorage)
**Impact:** 🟡 MEDIUM - Stand back days
**Oplossing:** Migreer naar `useSupabaseData`

### Oude Hooks (Moeten verwijderd worden na migratie)

- ⚠️ `hooks/use-crew-data.ts` - localStorage hook
- ⚠️ `hooks/use-localStorage-data.ts` - localStorage hook  
- ⚠️ `hooks/use-supabase-crew.ts` - Oude Supabase hook (redundant?)
- ⚠️ `hooks/use-supabase-data-old-backup.ts` - Backup (kan weg)
- ⚠️ `hooks/use-supabase-data-new.ts` - Wat is het verschil met use-supabase-data.ts?

---

## 📋 ACTIEPLAN (PRIORITEIT)

### PRIO 1: FIX KRITIEKE ISSUES 🔴

#### Stap 1: Run SQL Scripts
```bash
# Ga naar Supabase Dashboard → SQL Editor
# Run: scripts/complete-migration.sql
# Daarna: Settings → API → Restart API
```

#### Stap 2: Fix addStandBackRecord Functie
**File:** `hooks/use-supabase-data.ts`
**Wat:** Voeg functie toe:
```typescript
const addStandBackRecord = async (recordData: any) => {
  try {
    const { data, error } = await supabase
      .from('stand_back_records')
      .insert([recordData])
      .select()
    
    if (error) throw error
    await loadData()
    return data
  } catch (err) {
    console.error('Error adding stand back record:', err)
    throw err
  }
}
```
**En exporteer in return:**
```typescript
return {
  // ... bestaande exports
  addStandBackRecord,  // TOEVOEGEN
}
```

### PRIO 2: MIGREER BELANGRIJKE COMPONENTS 🟠

#### Stap 3: Ship Crew Overview Component
**File:** `components/ship-crew-overview.tsx`
**Wijzig:**
```typescript
// VAN:
import { useCrewData } from "@/hooks/use-crew-data"
const { crewDatabase } = useCrewData()

// NAAR:
import { useSupabaseData } from "@/hooks/use-supabase-data"
const { crew, ships, loading, error } = useSupabaseData()
```

#### Stap 4: Sick Leave Overview  
**File:** `components/sick-leave/sick-leave-overview.tsx`
**Wijzig:** Zelfde als stap 3

### PRIO 3: MIGREER OVERIGE PAGINA'S 🟡

#### Stap 5: Print Pagina
**File:** `app/bemanning/print/page.tsx`

#### Stap 6: Toewijzen Pagina
**File:** `app/bemanning/aflossers/toewijzen/page.tsx`

#### Stap 7: Update Pagina
**File:** `app/bemanning/update/page.tsx`

### PRIO 4: CLEANUP 🧹

#### Stap 8: Verwijder Oude Hooks
- `hooks/use-crew-data.ts`
- `hooks/use-localStorage-data.ts`
- Eventuele andere redundante hooks

#### Stap 9: Clear localStorage op alle clients
- Via `app/clear-localStorage/page.tsx`
- Of handmatig: `localStorage.clear()`

---

## 🎯 GESCHATTE TIJD

- **PRIO 1 (Kritiek):** 30 minuten
  - SQL scripts: 5 min
  - addStandBackRecord fix: 10 min
  - Testen: 15 min

- **PRIO 2 (Important):** 1-2 uur
  - Ship Crew Overview: 30 min
  - Sick Leave Overview: 30 min
  - Stand Back Days: 30 min

- **PRIO 3 (Medium):** 2-3 uur
  - Print pagina: 45 min
  - Toewijzen: 1 uur
  - Update: 1 uur

- **PRIO 4 (Cleanup):** 30 min

**TOTAAL:** ~4-6 uur voor volledige migratie

---

## 🚨 BEKENDE RISICO'S

1. **Stand Back Records Table** - Bestaat deze tabel in Supabase?
2. **Loans Table** - Wordt gebruikt maar niet geïmplementeerd
3. **Real-time Sync** - Meerdere gebruikers tegelijk kan conflicten geven
4. **Data Verlies** - Zorg dat alle localStorage data eerst gemigreerd is!

---

## ✅ CHECKLIST VOOR VOLLEDIGE MIGRATIE

- [ ] SQL scripts gerund in Supabase
- [ ] Supabase API gerestart
- [ ] `addStandBackRecord` functie toegevoegd
- [ ] Ship Crew Overview gemigreerd
- [ ] Sick Leave Overview gemigreerd  
- [ ] Stand Back Days gemigreerd
- [ ] Print pagina gemigreerd
- [ ] Toewijzen pagina gemigreerd
- [ ] Update pagina gemigreerd
- [ ] Alle functionaliteit getest
- [ ] localStorage gecleared op alle clients
- [ ] Oude hooks verwijderd
- [ ] Multi-user testing gedaan
- [ ] Documentatie bijgewerkt

---

## 📞 VOLGENDE STAP

**START HIER:** Stap 1 - Run SQL Scripts en fix addStandBackRecord!


