-- Migration: Appointments table — captures any appointment the parent mentions
-- in chat OR books through the marketplace. ABA, PT, OT, ST, Mental Health,
-- Pediatrician, Other.
--
-- The chat smart action [ACTION:ADD_APPOINTMENT:...] writes here. The Care
-- Coordination hub reads from here.

CREATE TABLE IF NOT EXISTS public.appointments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id        uuid,                       -- which child (if multi-child household)

  title           text NOT NULL,
  provider_name   text,                       -- "Dr. Sarah Lee" or "OT — Hands of Hope"
  service_type    text,                       -- 'ABA', 'PT', 'OT', 'ST', 'MentalHealth', 'Pediatrician', 'Other'

  start_at        timestamptz NOT NULL,
  end_at          timestamptz,

  location        text,                       -- 'Telehealth', '123 Main St', etc.
  notes           text,
  status          text DEFAULT 'scheduled'    -- 'scheduled', 'completed', 'cancelled', 'rescheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show')),

  -- Reminder preferences (which channels fire SMS/push, when)
  reminder_24h_sent     boolean DEFAULT false,
  reminder_1h_sent      boolean DEFAULT false,
  follow_up_sent        boolean DEFAULT false,

  -- Where the appointment came from
  source          text DEFAULT 'manual'        -- 'manual', 'ai_chat', 'marketplace_booking', 'centralreach_sync', 'rethink_sync'
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_start ON public.appointments(user_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_child ON public.appointments(child_id, start_at DESC) WHERE child_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status, start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_reminders ON public.appointments(reminder_24h_sent, reminder_1h_sent, start_at) WHERE status = 'scheduled';

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own appointments" ON public.appointments;
CREATE POLICY "Users manage own appointments"
  ON public.appointments FOR ALL
  USING (user_id = auth.uid());

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointments_updated_at ON public.appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_appointments_updated_at();
