-- Migration: provider_no_show_events
-- Tracks PROVIDER no-shows (provider failed to join a booked session) so we can:
--   (1) drive the family-facing apology + reschedule/reassign recovery flow, and
--   (2) escalate repeat offenders through reliability tiers (warning → probation
--       → suspended) on a rolling 90-day window.
--
-- The family is NEVER charged for a provider no-show and the provider earns $0,
-- so there is no settlement row here — only the reliability/accountability record.

CREATE TABLE IF NOT EXISTS public.provider_no_show_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),

  provider_id     uuid NOT NULL,                 -- the provider who missed the session
  appointment_id  uuid NOT NULL,                 -- the missed appointment
  family_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  scheduled_start timestamptz,                   -- when the session was supposed to start
  declared_at     timestamptz NOT NULL DEFAULT now(), -- when we flagged the no-show

  -- How the family recovered. 'pending' until they choose.
  resolution      text DEFAULT 'pending'
    CHECK (resolution IN ('pending', 'rescheduled_same', 'reassigned', 'family_dropped'))
);

-- Rolling-window count per provider is the hot query — index for it.
CREATE INDEX IF NOT EXISTS idx_provider_no_show_provider_declared
  ON public.provider_no_show_events(provider_id, declared_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_no_show_appointment
  ON public.provider_no_show_events(appointment_id);

ALTER TABLE public.provider_no_show_events ENABLE ROW LEVEL SECURITY;

-- Families can see the no-show events tied to their own account (drives the
-- apology/recovery card). They cannot see other families' events.
DROP POLICY IF EXISTS "Families view own provider no-shows" ON public.provider_no_show_events;
CREATE POLICY "Families view own provider no-shows"
  ON public.provider_no_show_events FOR SELECT
  USING (family_user_id = auth.uid());

-- Inserts/updates are performed by the service role (edge functions / ops),
-- never directly by end users — no client INSERT/UPDATE policy is granted.
