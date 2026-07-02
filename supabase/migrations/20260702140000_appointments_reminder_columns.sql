-- Appointments: columns required by the appointment-reminders cron + the
-- marketplace-booking mirror insert (ConversationalBooking).
--
-- The deployed cron selects title/provider_name/service_type/start_at/location/
-- reminder_24h_sent/reminder_1h_sent and filters is_aminy_telehealth=true, and
-- the booking mirror inserts the same shape — but the live table predates all
-- of these, so the mirror insert silently failed and the cron's select errored.
-- All additions are nullable/defaulted → zero impact on existing rows/queries.

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS provider_name text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_type text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS start_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS end_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS child_id uuid;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_aminy_telehealth boolean DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_1h_sent boolean DEFAULT false;

-- Backfill start_at from the legacy scheduled_time/start_time so existing rows
-- are visible to the reminder window queries.
UPDATE public.appointments
  SET start_at = COALESCE(start_at, scheduled_time, start_time)
  WHERE start_at IS NULL AND (scheduled_time IS NOT NULL OR start_time IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_appointments_reminders
  ON public.appointments (start_at)
  WHERE is_aminy_telehealth = true;
