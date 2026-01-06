# Contract Veldnamen - Handleiding

Dit document beschrijft welke veldnamen je moet gebruiken in je PDF contract formulier.

## Belangrijk
- Veldnamen zijn **niet hoofdlettergevoelig** (voornaam, VOORNAAM, Voornaam werken allemaal)
- Speciale tekens (spaties, underscores, etc.) worden genegeerd bij matching
- Gebruik duidelijke, korte namen zonder spaties waar mogelijk

## Persoonlijke Gegevens

### Naam
- `voornaam` - Voornaam van de werknemer
- `achternaam` - Achternaam van de werknemer
- `naam` - Volledige naam (voornaam + achternaam)
- `volledigenaam` - Volledige naam (alternatief)

### Geboortegegevens
- `geboortedatum` - Geboortedatum (formaat: dd-MM-yyyy)
- `geboorteplaats` - Geboorteplaats
- `nationaliteit` - Nationaliteit (bijv. "Nederlands", "Duits", etc.)

### Adres
- `adres` - Volledig adres (straat + postcode + plaats)
- `straat` - Straatnaam en huisnummer
- `postcode` - Postcode
- `plaats` - Woonplaats
- `land` - Land

### Contactgegevens
- `telefoon` - Telefoonnummer
- `email` - E-mailadres

## Werkgegevens

### Functie en Bedrijf
- `functie` - Functie/positie (bijv. "Kapitein", "Matroos")
- `positie` - Functie/positie (alternatief)
- `bedrijf` - Bedrijfsnaam
- `firma` - Bedrijfsnaam (alternatief)
- `firmanummer` - Firma nummer (bijv. "B 44356")
- `firmanr` - Firma nummer (korte versie)
- `bedrijfsnummer` - Firma nummer (alternatief)

### Datums
- `indiensttreding` - Datum indiensttreding (formaat: dd-MM-yyyy)
- `in_dienst_vanaf` - Datum indiensttreding (alternatief)
- `datum` - Huidige datum (formaat: dd-MM-yyyy)
- `vandaag` - Huidige datum (alternatief)
- `huidigedatum` - Huidige datum (alternatief)

### Overig
- `matricule` - Matricule nummer

## Salarisgegevens

### Salaris
- `basissalaris` - Basis salaris (bijv. "2500")
- `salaris` - Basis salaris (alternatief)
- `kledinggeld` - Kledinggeld (bijv. "150")
- `reiskosten` - Reiskosten (bijv. "200")

## Voorbeelden

### Goede veldnamen:
- `voornaam`
- `achternaam`
- `geboortedatum`
- `straat`
- `postcode`
- `plaats`
- `telefoon`
- `email`
- `functie`
- `firmanummer`
- `indiensttreding`
- `basissalaris`
- `kledinggeld`
- `reiskosten`

### Ook werkend (door partial matching):
- `voornaam_werknemer`
- `achternaam_werknemer`
- `geboorte_datum`
- `straat_adres`
- `post_code`
- `woon_plaats`
- `telefoon_nummer`
- `e_mail`
- `functie_naam`
- `firma_nummer`
- `in_dienst_treding`
- `basis_salaris`
- `kleding_geld`
- `reis_kosten`

## Tips

1. **Gebruik korte, duidelijke namen**: `voornaam` is beter dan `voornaam_van_de_werknemer`
2. **Vermijd spaties**: Gebruik underscores of camelCase: `voornaam` of `voornaamWerknemer`
3. **Test eerst**: Genereer een contract en kijk in de browser console (F12) welke velden worden gevonden en ingevuld
4. **Exacte match heeft prioriteit**: Als je `voornaam` gebruikt, wordt dat exact gematcht. `voornaam_werknemer` wordt partial gematcht.

## Debugging

Als een veld niet wordt ingevuld:
1. Open de browser console (F12)
2. Genereer een contract
3. Kijk naar de console logs:
   - `=== PDF ANALYSE ===` - Toont hoeveel velden er zijn gevonden
   - `✓ Veld "..." ingevuld met: ...` - Toont welke velden succesvol zijn ingevuld
   - `⚠️ Kon veld ... niet invullen` - Toont welke velden problemen hebben

## Firma Nummers

De volgende firma nummers worden automatisch ingevuld op basis van de geselecteerde firma:

- **Bamalite S.A.** → `B 44356`
- **Alcina S.A.** → `B 129072`
- **Europe Shipping AG.** → `B 83558`
- **Brugo Shipping SARL.** → `B 277323`
- **Devel Shipping S.A.** → `B 139046`

Gebruik een van deze veldnamen voor het firma nummer:
- `firmanummer`
- `firmanr`
- `bedrijfsnummer`

