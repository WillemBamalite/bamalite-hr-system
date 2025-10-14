# Test Script voor Supabase-First Migratie

## Pre-Test Checklist

- [ ] Supabase is actief (niet gepauzeerd)
- [ ] SQL script is uitgevoerd (`scripts/add-company-field.sql`)
- [ ] Backup van oude data gemaakt
- [ ] Nieuwe hook is geactiveerd (`use-supabase-data.ts`)

---

## Test 1: Online Modus - Basis CRUD

### Doel
Verifieer dat alle CRUD operaties werken met Supabase als primary source.

### Stappen

1. **Open de applicatie**
   - URL: http://localhost:3000
   - Check: Groene "Online" badge verschijnt in header

2. **Voeg nieuw bemanningslid toe**
   - Ga naar "Nieuw bemanningslid"
   - Vul alle velden in:
     - Voornaam: Test
     - Achternaam: User
     - Nationaliteit: NL
     - Functie: Matroos
     - Schip: Kies een schip
     - Regime: 2/2
     - Startdatum: Vandaag
     - Bedrijf: A.M. Bruinsma B.V.
   - Klik "Bemanningslid toevoegen"
   - ✅ Check: Succesbericht verschijnt
   - ✅ Check: Bemanningslid verschijnt direct in overzicht

3. **Refresh de pagina**
   - Druk F5
   - ✅ Check: Bemanningslid is nog steeds zichtbaar
   - ✅ Check: Alle data is correct

4. **Update bemanningslid**
   - Klik op het nieuwe bemanningslid
   - Wijzig de functie naar "Stuurman"
   - Sla op
   - ✅ Check: Wijziging is direct zichtbaar
   - Refresh de pagina
   - ✅ Check: Wijziging blijft bestaan

5. **Zet bemanningslid uit dienst**
   - Klik op "Uit dienst"
   - Vul datum en reden in
   - Bevestig
   - ✅ Check: Bemanningslid verdwijnt uit actief overzicht
   - ✅ Check: Bemanningslid verschijnt in "Oude werknemers"

### Verwacht Resultaat
Alle operaties werken zonder errors. Data blijft bestaan na refresh.

---

## Test 2: Multi-Device Synchronisatie

### Doel
Verifieer dat data synchroniseert tussen verschillende browsers/apparaten.

### Stappen

1. **Open de applicatie in Browser 1 (bijv. Chrome)**
   - URL: http://localhost:3000
   - Login/open dashboard

2. **Open de applicatie in Browser 2 (bijv. Firefox/Edge)**
   - URL: http://localhost:3000
   - Login/open dashboard
   - ✅ Check: Dezelfde data is zichtbaar in beide browsers

3. **Voeg nieuw bemanningslid toe in Browser 1**
   - Voeg "Multi Device Test" toe
   - ✅ Check: Verschijnt direct in Browser 1

4. **Refresh Browser 2**
   - Druk F5 in Browser 2
   - ✅ Check: "Multi Device Test" verschijnt ook in Browser 2

5. **Update in Browser 2**
   - Wijzig "Multi Device Test" naar "Kapitein"
   - Sla op

6. **Refresh Browser 1**
   - Druk F5 in Browser 1
   - ✅ Check: Wijziging is zichtbaar in Browser 1

### Verwacht Resultaat
Data synchroniseert correct tussen browsers. Wijzigingen in de ene browser zijn zichtbaar in de andere na refresh.

---

## Test 3: Offline Modus

### Doel
Verifieer dat de applicatie blijft werken zonder internet en automatisch synchroniseert bij reconnect.

### Stappen

1. **Open Developer Tools**
   - Druk F12
   - Ga naar "Network" tab

2. **Zet offline modus aan**
   - Klik op "No throttling" dropdown
   - Selecteer "Offline"
   - ✅ Check: Gele "Offline" badge verschijnt in header

3. **Voeg nieuw bemanningslid toe (offline)**
   - Ga naar "Nieuw bemanningslid"
   - Vul in:
     - Voornaam: Offline
     - Achternaam: Test
     - Functie: Matroos
   - Klik "Bemanningslid toevoegen"
   - ✅ Check: Succesbericht verschijnt
   - ✅ Check: Bemanningslid verschijnt in overzicht (lokaal)

4. **Refresh de pagina (nog steeds offline)**
   - Druk F5
   - ✅ Check: "Offline Test" is nog steeds zichtbaar
   - ✅ Check: Gele "Offline" badge is nog steeds zichtbaar

5. **Zet online modus aan**
   - In Network tab: selecteer "No throttling"
   - ✅ Check: Groene "Online" badge verschijnt
   - ✅ Check: Blauwe "Synchroniseren..." badge verschijnt kort
   - Wacht 2-3 seconden
   - ✅ Check: Sync is voltooid

6. **Verifieer in Supabase**
   - Open Supabase dashboard
   - Ga naar Table Editor → crew
   - ✅ Check: "Offline Test" staat in de database

7. **Verifieer in andere browser**
   - Open een andere browser
   - Ga naar http://localhost:3000
   - ✅ Check: "Offline Test" is zichtbaar

### Verwacht Resultaat
App blijft werken offline. Data wordt automatisch gesynchroniseerd bij reconnect.

---

## Test 4: Sync Queue

### Doel
Verifieer dat de sync queue correct werkt bij meerdere offline operaties.

### Stappen

1. **Zet offline modus aan**
   - Developer Tools → Network → Offline

2. **Voer meerdere operaties uit**
   - Voeg 3 nieuwe bemanningsleden toe
   - Update 2 bestaande bemanningsleden
   - Zet 1 bemanningslid uit dienst

3. **Check sync queue**
   - Open browser console
   - Type: `JSON.parse(localStorage.getItem('bamalite-sync-queue'))`
   - ✅ Check: 6 operaties in de queue (3 create, 2 update, 1 update voor uit-dienst)

4. **Zet online modus aan**
   - Network → No throttling
   - Wacht 5 seconden
   - ✅ Check: "Synchroniseren..." badge verschijnt en verdwijnt

5. **Check sync queue opnieuw**
   - Console: `JSON.parse(localStorage.getItem('bamalite-sync-queue'))`
   - ✅ Check: Queue is leeg `[]`

6. **Verifieer in Supabase**
   - Alle 6 operaties moeten zichtbaar zijn in de database

### Verwacht Resultaat
Alle offline operaties worden correct opgeslagen in de queue en gesynchroniseerd bij reconnect.

---

## Test 5: Data Persistence

### Doel
Verifieer dat data persistent is over browser restarts en apparaten.

### Stappen

1. **Voeg testdata toe**
   - Voeg "Persistence Test" bemanningslid toe
   - ✅ Check: Verschijnt in overzicht

2. **Sluit de browser volledig**
   - Sluit alle tabs
   - Sluit de browser applicatie

3. **Open de browser opnieuw**
   - Start de browser
   - Ga naar http://localhost:3000
   - ✅ Check: "Persistence Test" is nog steeds zichtbaar

4. **Test op ander apparaat (optioneel)**
   - Open de applicatie op een ander apparaat (telefoon, tablet, andere computer)
   - ✅ Check: Alle data is zichtbaar

### Verwacht Resultaat
Data blijft bestaan over browser restarts en is toegankelijk op alle apparaten.

---

## Test 6: Error Handling

### Doel
Verifieer dat de applicatie correct omgaat met Supabase errors.

### Stappen

1. **Pauzeer Supabase**
   - Ga naar Supabase dashboard
   - Pauzeer het project

2. **Probeer data te laden**
   - Refresh de applicatie
   - ✅ Check: Gele "Offline" badge verschijnt
   - ✅ Check: Cached data wordt getoond
   - ✅ Check: Geen crashes of white screens

3. **Probeer data toe te voegen**
   - Voeg nieuw bemanningslid toe
   - ✅ Check: Succesbericht verschijnt
   - ✅ Check: Data wordt lokaal opgeslagen
   - ✅ Check: Operatie wordt toegevoegd aan sync queue

4. **Herstart Supabase**
   - Activeer het project weer
   - Wacht tot het actief is

5. **Refresh de applicatie**
   - Druk F5
   - ✅ Check: Groene "Online" badge verschijnt
   - ✅ Check: Sync queue wordt verwerkt
   - ✅ Check: Alle data is gesynchroniseerd

### Verwacht Resultaat
Applicatie blijft werken tijdens Supabase downtime en synchroniseert automatisch bij herstel.

---

## Test 7: Cache Invalidation

### Doel
Verifieer dat de cache correct wordt geüpdatet bij wijzigingen.

### Stappen

1. **Voeg data toe in Browser 1**
   - Voeg "Cache Test" bemanningslid toe

2. **Check cache**
   - Console: `JSON.parse(localStorage.getItem('bamalite-cache-crew'))`
   - ✅ Check: "Cache Test" staat in de cache

3. **Update in Supabase direct**
   - Ga naar Supabase Table Editor
   - Wijzig "Cache Test" naar "Cache Test Updated"

4. **Refresh Browser 1**
   - Druk F5
   - ✅ Check: "Cache Test Updated" is zichtbaar
   - ✅ Check: Cache is geüpdatet met nieuwe data

### Verwacht Resultaat
Cache wordt correct geïnvalideerd en geüpdatet bij data wijzigingen.

---

## Test Resultaten

| Test | Status | Opmerkingen |
|------|--------|-------------|
| 1. Online Modus - Basis CRUD | ⏳ | |
| 2. Multi-Device Synchronisatie | ⏳ | |
| 3. Offline Modus | ⏳ | |
| 4. Sync Queue | ⏳ | |
| 5. Data Persistence | ⏳ | |
| 6. Error Handling | ⏳ | |
| 7. Cache Invalidation | ⏳ | |

**Legenda:**
- ⏳ Nog niet getest
- ✅ Geslaagd
- ❌ Gefaald
- ⚠️ Gedeeltelijk geslaagd

---

## Troubleshooting

### Test faalt: "Data verdwijnt na refresh"
**Mogelijke oorzaken:**
- Supabase is gepauzeerd
- Supabase credentials zijn incorrect
- Network errors

**Oplossing:**
1. Check Supabase status
2. Check browser console voor errors
3. Check Network tab voor failed requests

### Test faalt: "Sync queue wordt niet verwerkt"
**Mogelijke oorzaken:**
- Online event wordt niet getriggerd
- Supabase is nog steeds offline
- Sync errors

**Oplossing:**
1. Check browser console voor errors
2. Manueel sync triggeren: `window.dispatchEvent(new Event('online'))`
3. Check sync queue: `JSON.parse(localStorage.getItem('bamalite-sync-queue'))`

### Test faalt: "Multi-device sync werkt niet"
**Mogelijke oorzaken:**
- Cache wordt niet geïnvalideerd
- Supabase data is niet geüpdatet
- Browser cache issues

**Oplossing:**
1. Hard refresh (Ctrl+Shift+R)
2. Clear cache: `localStorage.clear()`
3. Check Supabase database direct

---

## Post-Test Cleanup

Na het voltooien van alle tests:

1. **Verwijder testdata**
   ```sql
   DELETE FROM crew WHERE first_name IN ('Test', 'Offline', 'Multi Device Test', 'Persistence Test', 'Cache Test');
   ```

2. **Clear sync queue**
   ```javascript
   localStorage.removeItem('bamalite-sync-queue')
   ```

3. **Clear cache (optioneel)**
   ```javascript
   localStorage.removeItem('bamalite-cache-ships')
   localStorage.removeItem('bamalite-cache-crew')
   localStorage.removeItem('bamalite-cache-sick-leave')
   localStorage.removeItem('bamalite-cache-loans')
   ```

---

## Conclusie

Als alle tests slagen, is de migratie succesvol en is het systeem klaar voor productie gebruik met:

✅ Supabase als single source of truth  
✅ Offline-first functionaliteit  
✅ Multi-device synchronisatie  
✅ Automatische sync bij reconnect  
✅ Robuuste error handling  

**Datum getest:** _____________  
**Getest door:** _____________  
**Resultaat:** ⏳ In progress / ✅ Geslaagd / ❌ Gefaald

