# E-mail Notificaties Instellen

De applicatie verstuurt nu automatisch e-mails wanneer een taak wordt toegewezen aan Leo, Willem of Jos.

## Stappen om e-mail functionaliteit te activeren:

### 1. Resend Account Aanmaken
1. Ga naar https://resend.com
2. Maak een gratis account aan
3. Ga naar API Keys in je dashboard
4. Maak een nieuwe API key aan (kopieer deze!)

### 2. Environment Variables Instellen
Voeg de volgende variabelen toe aan je `.env.local` bestand:

```env
RESEND_API_KEY=re_your_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Voor productie (Vercel):
- Ga naar je Vercel project settings
- Klik op "Environment Variables"
- Voeg `RESEND_API_KEY` toe met je Resend API key
- Voeg `NEXT_PUBLIC_APP_URL` toe met je productie URL (bijv. https://bamalite-hr-system.vercel.app)

### 3. Domain Verificatie (Optioneel voor productie)
Voor productie moet je je domein verifiëren bij Resend:
- Ga naar Domains in je Resend dashboard
- Voeg je domein toe (bijv. bamalite.com)
- Voeg de DNS records toe die Resend vraagt
- Wacht op verificatie

**Let op:** Voor ontwikkeling/testen kun je het `onboarding@resend.dev` e-mailadres gebruiken (zonder domein verificatie).

### 4. E-mail Mapping
De volgende personen krijgen e-mails op deze adressen:
- **Leo** → leo@bamalite.com
- **Willem** → willem@bamalite.com
- **Jos** → jos@bamalite.com

### 5. Testen
1. Start de development server: `npm run dev`
2. Ga naar `/taken`
3. Maak een nieuwe taak aan en wijs deze toe aan Leo, Willem of Jos
4. Controleer of er een e-mail wordt ontvangen

## Troubleshooting

- **E-mails worden niet verstuurd:** Controleer of `RESEND_API_KEY` correct is ingesteld in je environment variables
- **"Domain not verified" fout:** Gebruik `onboarding@resend.dev` voor testen, of verifieer je domein bij Resend
- **API errors:** Check de browser console en server logs voor meer details

