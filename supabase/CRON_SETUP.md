# Push Notifications Cron Setup

## Stap 1: Deploy de Edge Function

1. Ga naar je Supabase Dashboard: https://supabase.com/dashboard
2. Selecteer je project
3. Ga naar **Edge Functions** in het menu
4. Klik op **Create a new function**
5. Geef het de naam: `notifications-push`
6. Kopieer de code uit `supabase/functions/notifications-push/index.ts`
7. Klik op **Deploy**

## Stap 2: Test de Edge Function (optioneel)

Je kunt de functie handmatig testen via:
- Supabase Dashboard → Edge Functions → `notifications-push` → **Invoke**
- Of via curl:
```bash
curl -X POST https://ocwraavhrtpvbqlkwnlb.supabase.co/functions/v1/notifications-push \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Stap 3: Maak de database tabel

1. Ga naar **SQL Editor** in Supabase Dashboard
2. Kopieer de SQL uit `supabase/migrations/20250122_create_device_tokens.sql`
3. Voer de SQL uit (klik op **Run**)

## Stap 4: Stel de Cron Job in

1. Ga naar **Database** → **Cron Jobs** (of **Database** → **Extensions** → zoek naar `pg_cron`)
2. Als `pg_cron` nog niet geïnstalleerd is:
   - Ga naar **Database** → **Extensions**
   - Zoek naar `pg_cron` en klik op **Enable**

3. Voer deze SQL uit om de cron job te maken:

```sql
SELECT cron.schedule(
  'daily-push-notifications',
  '0 10 * * *',  -- Elke dag om 10:00 UTC (11:00 Nederlandse tijd in winter, 12:00 in zomer)
  $$
  SELECT
    net.http_post(
      url := 'https://ocwraavhrtpvbqlkwnlb.supabase.co/functions/v1/notifications-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Let op:** Je moet eerst de service role key als setting instellen:

```sql
-- Voer dit EENMALIG uit (vervang YOUR_SERVICE_ROLE_KEY met je echte key)
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

**Alternatief (eenvoudiger):** Gebruik Supabase's ingebouwde cron via het Dashboard:
1. Ga naar **Database** → **Cron Jobs**
2. Klik op **New Cron Job**
3. Vul in:
   - **Name:** `daily-push-notifications`
   - **Schedule:** `0 10 * * *` (elke dag om 10:00 UTC)
   - **Command:** 
   ```sql
   SELECT net.http_post(
     url := 'https://ocwraavhrtpvbqlkwnlb.supabase.co/functions/v1/notifications-push',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
     ),
     body := '{}'::jsonb
   );
   ```
   (Vervang `YOUR_SERVICE_ROLE_KEY` met je echte service role key)

## Stap 5: Test de app

1. Open de app op je telefoon
2. Log in
3. De app vraagt om toestemming voor notificaties → klik **Toestaan**
4. De push token wordt automatisch opgeslagen in Supabase
5. Wacht tot 10:00 (of test handmatig via de Edge Function)

## Troubleshooting

- **Geen notificaties ontvangen?**
  - Check of de device token is opgeslagen: `SELECT * FROM device_tokens;`
  - Check de Edge Function logs in Supabase Dashboard
  - Test de Edge Function handmatig

- **Cron job werkt niet?**
  - Check of `pg_cron` extension is enabled
  - Check de cron job logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

- **Push token niet opgeslagen?**
  - Check of de RLS policies correct zijn ingesteld
  - Check de app console logs voor errors


