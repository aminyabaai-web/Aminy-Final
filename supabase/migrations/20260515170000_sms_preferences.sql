-- Migration: SMS reminder preferences on profiles
-- Used by the appointment-reminders cron edge function to know who to text.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number             text,
  ADD COLUMN IF NOT EXISTS phone_verified           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_reminders_enabled    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_opted_out_at         timestamptz;  -- set when user replies STOP

CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON public.profiles(phone_number)
  WHERE phone_number IS NOT NULL;
