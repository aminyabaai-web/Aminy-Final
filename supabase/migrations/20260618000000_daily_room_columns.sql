-- Migration: Add Daily.co room tracking columns to telehealth_appointments
-- Enables the Daily.co webhook to stamp provider join time and auto-detect no-shows.
--
-- telehealth_appointments is created by the Stripe checkout flow when a payment
-- succeeds. This migration ensures the table exists and adds the two columns
-- needed for no-show detection without disrupting existing rows.

CREATE TABLE IF NOT EXISTS public.telehealth_appointments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  provider_id       uuid,
  slot_id           uuid,
  visit_type        text,
  visit_format      text DEFAULT 'remote',
  status            text DEFAULT 'confirmed',
  payment_status    text DEFAULT 'pending',
  payment_id        text,
  price             integer,
  scheduled_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Add Daily.co columns (idempotent)
ALTER TABLE public.telehealth_appointments
  ADD COLUMN IF NOT EXISTS daily_room_name     text,          -- Daily.co room slug, e.g. "aminy-appt-<uuid>"
  ADD COLUMN IF NOT EXISTS provider_joined_at  timestamptz;   -- stamped by Daily.co webhook on participant-joined

-- Index for webhook lookup by room name (the only field Daily.co gives us)
CREATE INDEX IF NOT EXISTS idx_telehealth_appt_room
  ON public.telehealth_appointments(daily_room_name)
  WHERE daily_room_name IS NOT NULL;

-- RLS: users see their own appointments; service-role writes everything
ALTER TABLE public.telehealth_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own telehealth appointments"
  ON public.telehealth_appointments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can manage telehealth appointments"
  ON public.telehealth_appointments FOR ALL
  USING (auth.role() = 'service_role');
