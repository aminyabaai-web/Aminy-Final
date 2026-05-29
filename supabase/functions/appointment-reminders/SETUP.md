# Appointment Reminders — Setup

## 1. Set Twilio secrets in Supabase
```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxxxxxxxxx
supabase secrets set TWILIO_FROM_NUMBER=+15555550000
# Optional: gate cron invocation behind a shared secret
supabase secrets set CRON_SHARED_SECRET=$(openssl rand -hex 32)
```

## 2. Deploy the function
```bash
supabase functions deploy appointment-reminders
```

## 3. Apply the SMS preferences migration
```bash
supabase db push
# This adds phone_number, sms_reminders_enabled to profiles.
```

## 4. Schedule the cron job

### Option A — Supabase pg_cron (recommended)
Run this in the Supabase SQL editor:

```sql
-- Enable pg_cron + pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule every 15 minutes
SELECT cron.schedule(
  'appointment-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/appointment-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-cron-secret', current_setting('app.settings.cron_shared_secret', true)
    )
  );
  $$
);

-- Verify the schedule
SELECT * FROM cron.job WHERE jobname = 'appointment-reminders';
```

### Option B — External cron (GitHub Actions / Vercel Cron / Cloudflare Workers)
Hit `POST https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/appointment-reminders` every 15 min with `Authorization: Bearer <service-role-key>` and `x-cron-secret: <CRON_SHARED_SECRET>`.

## 5. Verify
Insert a test appointment 24 hours out, ensure the test user has `phone_number` set and `sms_reminders_enabled=true`, wait for the cron to fire, check Twilio logs.

```sql
INSERT INTO public.appointments (user_id, title, provider_name, start_at, status, source)
VALUES (
  auth.uid(),
  'Test SMS Reminder',
  'Dr. Test',
  NOW() + INTERVAL '24 hours',
  'scheduled',
  'manual'
);
```

## Output

The cron function returns JSON like:
```json
{ "sent_24h": 2, "sent_1h": 1, "skipped": 0, "errors": [] }
```

Reminders are idempotent — the `reminder_24h_sent` / `reminder_1h_sent` flags prevent double-sending.

## SMS opt-out

If a user replies "STOP" to a Twilio reminder, configure a Twilio webhook to call a new endpoint (or add to `make-server-8a022548`) that sets `sms_opted_out_at` + `sms_reminders_enabled=false` on their profile. Future reminders for them will be marked skipped.
