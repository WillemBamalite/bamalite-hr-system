# Push notificaties + dagelijkse mails — setup

## 1. Database
Voer dit SQL-script uit in Supabase (SQL editor):

`scripts/create-web-push-subscriptions.sql`

Dit maakt de tabellen `web_push_subscriptions` en `notification_dispatch_log`.

## 2. VAPID keys genereren
In je projectfolder:

```
node scripts/generate-vapid-keys.js
```

Voeg de output toe aan:
- `.env.local` (lokaal)
- Vercel → Project → Settings → Environment Variables (productie)

Vereiste vars:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (bv. `mailto:willem@bamalite.com`)

Optioneel:
- `SUPABASE_SERVICE_ROLE_KEY` (aanbevolen — anders gebruikt het anon key en valt terug op RLS-policies)

## 3. Testmodus aan
Zet in `.env.local` en op Vercel:
```
NOTIFICATIONS_TEST_MODE=true
```
In testmodus gaan **alle pushes en mails alleen naar willem@bamalite.com**.

Zet de var op `false` (of verwijder hem) zodra je tevreden bent. Dan gebruikt het systeem de echte ontvangerlijsten:
- Push → willem + leo
- Daily mail management → willem + leo + bart + jos
- Daily mail kantoor → karina + tanja + lucie

## 4. Push aanzetten op telefoon
Open de site op je telefoon en log in:
- Android Chrome: ga naar `/meldingen` → klik **"Pushmeldingen aanzetten"** → sta toe.
- iPhone Safari: voeg de site eerst toe aan beginscherm (deelmenu → "Zet op beginscherm"), open de app vanaf het beginscherm, dan `/meldingen` → **aanzetten**.

Vervolgens: klik **"Testmelding sturen"** om te valideren.

## 5. Wat verstuurt wat

### Live push (per event)
- Salarislijst-login (bij `/api/salary-access-log`)
- Nieuwe taak (via `addTask` in `useSupabaseData`)
- Statusupdate taak (via `updateTask` in `useSupabaseData`)
- Taak afgerond (via `completeTask` in `useSupabaseData`)

### Ochtend cron 07:30 (Vercel)
`/api/notifications/morning-bundle`:
- 1 gebundelde push naar willem + leo
- mail naar management
- mail naar kantoor

## 6. Nuttige cURL voor handmatig triggeren
```bash
curl -X GET https://<your-domain>/api/notifications/morning-bundle \
  -H "Authorization: Bearer $CRON_SECRET"
```
