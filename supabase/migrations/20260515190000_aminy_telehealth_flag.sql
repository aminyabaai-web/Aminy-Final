-- Migration: Flag Aminy-managed telehealth appointments
-- SMS reminders only fire for Aminy telehealth (provider visits booked through
-- the marketplace + telehealth-delivered). External appointments captured in
-- chat or synced from CentralReach get calendar entries but no SMS.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_aminy_telehealth boolean DEFAULT false;

-- Backfill: anything booked through marketplace + flagged telehealth in location
UPDATE public.appointments
SET is_aminy_telehealth = true
WHERE source = 'marketplace_booking'
  AND (
    location ILIKE '%telehealth%'
    OR location ILIKE '%video%'
    OR service_type ILIKE '%telehealth%'
  );

-- Index for the reminder cron's hot path
CREATE INDEX IF NOT EXISTS idx_appointments_aminy_telehealth_reminders
  ON public.appointments(start_at, reminder_24h_sent, reminder_1h_sent)
  WHERE is_aminy_telehealth = true AND status = 'scheduled';
