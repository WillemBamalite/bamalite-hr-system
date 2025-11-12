# Gmail SMTP Setup - Veilige Implementatie

## ⚠️ BELANGRIJK: Deze implementatie is VEILIG

- De oude Resend code blijft **volledig intact**
- Gmail is een **nieuwe route** naast Resend
- Je kunt **altijd terug** naar Resend door de environment variable te verwijderen
- **Niets wordt verwijderd of overschreven**

## Stappen om Gmail SMTP te gebruiken:

### 1. Installeer nodemailer (lokaal)
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Maak een Gmail App Password

1. Ga naar je Google Account: https://myaccount.google.com/
2. Ga naar **Security** (Beveiliging)
3. Schakel **2-Step Verification** in (als dit nog niet aan staat)
4. Ga naar **App passwords** (App-wachtwoorden)
5. Selecteer **Mail** en **Other (Custom name)**
6. Geef het een naam zoals "Bamalite HR System"
7. Kopieer het gegenereerde 16-cijferige wachtwoord

### 3. Voeg Environment Variables toe

**Lokaal (.env.local):**
```
GMAIL_USER=jouw-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
USE_GMAIL_EMAIL=true
```

**Vercel (Environment Variables):**
1. Ga naar Vercel Dashboard → Project Settings → Environment Variables
2. Voeg toe:
   - `GMAIL_USER` = je Gmail adres
   - `GMAIL_APP_PASSWORD` = het app wachtwoord
   - `USE_GMAIL_EMAIL` = `true`

### 4. Test het lokaal

1. Start de dev server: `npm run dev`
2. Maak een test taak aan
3. Controleer of de e-mail wordt verstuurd
4. Check de console logs voor eventuele errors

### 5. Als het werkt: push naar Vercel

Als het lokaal werkt, push dan de wijzigingen en test op Vercel.

### 6. Als het NIET werkt: Terug naar Resend

**Simpel terug naar Resend:**
1. Verwijder of zet `USE_GMAIL_EMAIL` op `false` in Vercel
2. Klaar! Het systeem gebruikt weer Resend

## Veiligheid

- ✅ Resend code blijft intact
- ✅ Gmail is optioneel
- ✅ Geen code wordt verwijderd
- ✅ Altijd terug naar Resend mogelijk

## Troubleshooting

### "Invalid login" error
- Controleer of 2-Step Verification aan staat
- Controleer of je het App Password gebruikt (niet je normale wachtwoord)
- Controleer of de credentials correct zijn in environment variables

### "Connection timeout" error
- Check je internetverbinding
- Controleer of Gmail SMTP niet geblokkeerd wordt door firewall

### E-mails komen niet aan
- Check spam folder
- Controleer of het e-mailadres correct is
- Check console logs voor errors

