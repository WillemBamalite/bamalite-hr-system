-- Web push notification subscriptions
-- Eén rij per browser/device per gebruiker.

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_email ON web_push_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_enabled ON web_push_subscriptions(enabled);

ALTER TABLE web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies: server gebruikt service-role key (bypasst RLS).
-- Voor anon/authenticated alleen lezen van eigen e-mailrijen via auth.email() (optioneel).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'web_push_subscriptions'
      AND policyname = 'Allow individual select on web_push_subscriptions'
  ) THEN
    CREATE POLICY "Allow individual select on web_push_subscriptions"
      ON web_push_subscriptions FOR SELECT
      USING (auth.email() = user_email);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'web_push_subscriptions'
      AND policyname = 'Allow individual insert on web_push_subscriptions'
  ) THEN
    CREATE POLICY "Allow individual insert on web_push_subscriptions"
      ON web_push_subscriptions FOR INSERT
      WITH CHECK (auth.email() = user_email);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'web_push_subscriptions'
      AND policyname = 'Allow individual update on web_push_subscriptions'
  ) THEN
    CREATE POLICY "Allow individual update on web_push_subscriptions"
      ON web_push_subscriptions FOR UPDATE
      USING (auth.email() = user_email)
      WITH CHECK (auth.email() = user_email);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'web_push_subscriptions'
      AND policyname = 'Allow individual delete on web_push_subscriptions'
  ) THEN
    CREATE POLICY "Allow individual delete on web_push_subscriptions"
      ON web_push_subscriptions FOR DELETE
      USING (auth.email() = user_email);
  END IF;
END$$;

-- Tabel voor verzendlog (idempotentie / debugging)
CREATE TABLE IF NOT EXISTS notification_dispatch_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_key TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_dispatch_log_event_key
  ON notification_dispatch_log(event_key);
CREATE INDEX IF NOT EXISTS idx_notification_dispatch_log_created_at
  ON notification_dispatch_log(created_at);

ALTER TABLE notification_dispatch_log ENABLE ROW LEVEL SECURITY;

-- Server-only tabel; geen public policies nodig.
