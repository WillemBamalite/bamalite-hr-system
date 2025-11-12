# Gmail SMTP Setup - Stap voor Stap Instructies

## ⚠️ BELANGRIJK: Dit is VEILIG - je kunt altijd terug naar Resend

De oude Resend code blijft **volledig intact**. Gmail is een **optionele toevoeging** die je kunt in- en uitschakelen via een environment variable.

---

## STAP 1: Installeer Nodemailer (lokaal)

Open PowerShell of Terminal in de project folder en voer uit:

```bash
cd "c:\Dev\bamalite-hr-system Bemanningslijst"
npm install nodemailer
npm install --save-dev @types/nodemailer
```

**Wat doet dit?**
- Installeert nodemailer (om via Gmail SMTP e-mails te versturen)
- Installeert TypeScript types (voor code completion)

**Wacht even tot dit klaar is** - dit kan een minuutje duren.

---

## STAP 2: Maak een Gmail App Password

### 2.1 Ga naar je Google Account
1. Ga naar: https://myaccount.google.com/
2. Log in met je Gmail account (of maak een nieuwe Gmail account aan als je die nog niet hebt)

### 2.2 Schakel 2-Step Verification in
1. Klik links op **Security** (Beveiliging)
2. Scroll naar **2-Step Verification** (2-stapsverificatie)
3. Klik op **Get started** (Aan de slag)
4. Volg de stappen om 2-Step Verification in te schakelen
   - Je moet je telefoonnummer toevoegen
   - Je krijgt een verificatiecode via SMS
   - Bevestig de code

**Waarom nodig?**
- Google vereist 2-Step Verification voor App Passwords
- Dit is een veiligheidsmaatregel

### 2.3 Maak een App Password
1. Ga terug naar **Security** (Beveiliging)
2. Scroll naar **2-Step Verification**
3. Scroll naar beneden en klik op **App passwords** (App-wachtwoorden)
   - Als je dit niet ziet, wacht even - het kan even duren voordat deze optie verschijnt na het inschakelen van 2-Step Verification
4. Selecteer **Mail** als app
5. Selecteer **Other (Custom name)** als device
6. Geef het een naam zoals: **Bamalite HR System**
7. Klik op **Generate** (Genereren)
8. **KOPIEER HET 16-CIJFERIGE WACHTWOORD** (bijv. `abcd efgh ijkl mnop`)
   - Dit wachtwoord zie je maar 1x - kopieer het nu!
   - Let op: er staan spaties tussen - die zijn nodig!

**Wat is dit?**
- Dit is een speciaal wachtwoord dat je gebruikt in plaats van je normale Gmail wachtwoord
- Dit wachtwoord is veilig om in code te gebruiken
- Je kunt dit wachtwoord later altijd verwijderen of een nieuwe aanmaken

---

## STAP 3: Voeg Environment Variables toe (lokaal)

### 3.1 Open .env.local bestand
1. Ga naar de project folder: `c:\Dev\bamalite-hr-system Bemanningslijst`
2. Open het bestand `.env.local` (als dit niet bestaat, maak het aan)
3. Voeg de volgende regels toe:

```
USE_GMAIL_EMAIL=true
GMAIL_USER=jouw-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

**BELANGRIJK:**
- Vervang `jouw-email@gmail.com` met je echte Gmail adres
- Vervang `abcd efgh ijkl mnop` met het App Password dat je in STAP 2 hebt gekopieerd
- **BEHOUD DE SPATIES** in het App Password (die horen erbij!)

**Voorbeeld:**
```
USE_GMAIL_EMAIL=true
GMAIL_USER=bamalite.hr@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

### 3.2 Sla het bestand op
- Sla `.env.local` op
- **BELANGRIJK:** Dit bestand staat in `.gitignore` - het wordt NIET gepusht naar GitHub (veilig!)

---

## STAP 4: Test lokaal

### 4.1 Start de dev server
1. Open PowerShell in de project folder
2. Voer uit: `npm run dev`
3. Wacht tot de server is gestart (je ziet "Ready" in de terminal)

### 4.2 Test een taak
1. Ga naar http://localhost:3000
2. Log in
3. Ga naar **Taken**
4. Klik op **Nieuwe Taak**
5. Vul in:
   - Titel: **Test Gmail**
   - Taaktype: **Schip** of **Bemanningslid**
   - Toegewezen aan: **Leo** (of **Jos**, of **Nautic**)
   - Prioriteit: **Normaal**
6. Klik op **Taak Aanmaken**

### 4.3 Controleer of het werkt
1. **Check de console** (browser console of terminal):
   - Je zou moeten zien: `📧 Gmail mode geactiveerd, verstuur via Gmail SMTP...`
   - Je zou moeten zien: `✅ E-mail succesvol verstuurd naar leo@bamalite.com!`
2. **Check de inbox**:
   - Ga naar het e-mailadres dat je hebt ingevuld (Leo, Jos, etc.)
   - Controleer of de e-mail is aangekomen
   - Controleer ook de **spam folder** als je de e-mail niet ziet

### 4.4 Als het werkt:
- ✅ E-mails worden naar alle adressen verstuurd (Leo, Jos, Willem, Bart)
- ✅ Je ziet geen errors in de console
- ✅ E-mails komen aan in de inbox

### 4.5 Als het NIET werkt:
- ❌ Check of je App Password correct is (met spaties)
- ❌ Check of je Gmail adres correct is
- ❌ Check of 2-Step Verification aan staat
- ❌ Check de console voor errors
- ❌ Check of `USE_GMAIL_EMAIL=true` in `.env.local` staat

**Als het niet werkt: STOP en laat het weten - dan kunnen we terug naar Resend!**

---

## STAP 5: Als het werkt, push naar Vercel

### 5.1 Commit de wijzigingen
1. Open PowerShell in de project folder
2. Voer uit:
   ```bash
   git add .
   git commit -m "Gmail SMTP optie toegevoegd als alternatief voor Resend"
   git push origin master
   ```

### 5.2 Voeg Environment Variables toe in Vercel
1. Ga naar Vercel Dashboard: https://vercel.com
2. Ga naar je project: **bamalite-hr-system**
3. Ga naar **Settings** → **Environment Variables**
4. Voeg toe:
   - **Name:** `USE_GMAIL_EMAIL`
   - **Value:** `true`
   - **Environment:** Production, Preview, Development (alle drie)
5. Voeg toe:
   - **Name:** `GMAIL_USER`
   - **Value:** `jouw-email@gmail.com` (jouw echte Gmail adres)
   - **Environment:** Production, Preview, Development (alle drie)
6. Voeg toe:
   - **Name:** `GMAIL_APP_PASSWORD`
   - **Value:** `abcd efgh ijkl mnop` (het App Password met spaties)
   - **Environment:** Production, Preview, Development (alle drie)
7. Klik op **Save** voor elke variable

### 5.3 Redeploy
1. Vercel zou automatisch moeten deployen na de push
2. Als niet, ga naar **Deployments** en klik op **Redeploy**
3. Wacht tot de deployment klaar is

### 5.4 Test op Vercel
1. Ga naar je Vercel URL (bijv. https://bamalite-hr-system.vercel.app)
2. Log in
3. Maak een test taak aan
4. Controleer of e-mails worden verstuurd naar alle adressen

---

## STAP 6: Terug naar Resend (als je wilt)

### Als je terug wilt naar Resend:
1. Ga naar Vercel → Settings → Environment Variables
2. Verwijder of wijzig `USE_GMAIL_EMAIL` naar `false`
3. Klaar! Het systeem gebruikt weer Resend

### Of lokaal:
1. Open `.env.local`
2. Verwijder of zet `USE_GMAIL_EMAIL=false`
3. Herstart de dev server
4. Klaar!

---

## Troubleshooting

### "Invalid login" error
- ✅ Check of 2-Step Verification aan staat
- ✅ Check of je het App Password gebruikt (niet je normale wachtwoord)
- ✅ Check of het App Password correct is gekopieerd (met spaties)

### "Connection timeout" error
- ✅ Check je internetverbinding
- ✅ Check of Gmail SMTP niet geblokkeerd wordt door firewall

### E-mails komen niet aan
- ✅ Check spam folder
- ✅ Check of het e-mailadres correct is
- ✅ Check console logs voor errors

### "Module not found: nodemailer"
- ✅ Run: `npm install nodemailer`
- ✅ Herstart de dev server

---

## Veiligheid Checklist

- ✅ Resend code blijft intact
- ✅ Gmail is optioneel (alleen als `USE_GMAIL_EMAIL=true`)
- ✅ Geen code wordt verwijderd
- ✅ Altijd terug naar Resend mogelijk
- ✅ `.env.local` wordt niet gepusht (veilig)

---

## Volgende Stappen

1. ✅ **STAP 1:** Installeer nodemailer
2. ✅ **STAP 2:** Maak Gmail App Password
3. ✅ **STAP 3:** Voeg environment variables toe
4. ✅ **STAP 4:** Test lokaal
5. ✅ **STAP 5:** Push naar Vercel (als het werkt)
6. ✅ **STAP 6:** Voeg environment variables toe in Vercel

**Als iets niet werkt: STOP en laat het weten!**

