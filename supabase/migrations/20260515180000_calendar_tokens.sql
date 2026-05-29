-- Migration: Google Calendar OAuth tokens — per-user persisted refresh tokens.
-- When a parent connects their Google Calendar, we store the refresh token here
-- so the calendar-sync edge function can mint access tokens on demand.

CREATE TABLE IF NOT EXISTS public.user_calendar_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  provider        text NOT NULL DEFAULT 'google'
                    CHECK (provider IN ('google', 'apple', 'outlook')),

  -- OAuth tokens (encrypted at rest by Postgres)
  refresh_token   text NOT NULL,             -- long-lived
  access_token    text,                       -- short-lived (1h) — refreshed on demand
  access_expires_at timestamptz,

  -- Which calendar the user wants Aminy events written to (Google calendarId).
  -- Default 'primary' = user's main calendar. They can change to a dedicated
  -- "Aminy" calendar via the connect flow.
  target_calendar_id text DEFAULT 'primary',
  target_calendar_name text DEFAULT 'Primary calendar',

  -- Connection metadata
  scope           text,                       -- the OAuth scope granted
  email           text,                       -- Google account email connected
  connected_at    timestamptz DEFAULT now(),
  last_synced_at  timestamptz,
  status          text DEFAULT 'active'
                    CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_error      text
);

CREATE INDEX IF NOT EXISTS idx_calendar_tokens_user ON public.user_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_tokens_status ON public.user_calendar_tokens(status) WHERE status = 'active';

ALTER TABLE public.user_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read/manage their own calendar connection
DROP POLICY IF EXISTS "Users manage own calendar tokens" ON public.user_calendar_tokens;
CREATE POLICY "Users manage own calendar tokens"
  ON public.user_calendar_tokens FOR ALL
  USING (user_id = auth.uid());

-- Service role full access (for the OAuth callback + sync function)
DROP POLICY IF EXISTS "Service role calendar tokens" ON public.user_calendar_tokens;
CREATE POLICY "Service role calendar tokens"
  ON public.user_calendar_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Track external calendar event IDs on appointments so we can update/delete
-- the matching Google Calendar event when the appointment changes.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS external_calendar_provider text,
  ADD COLUMN IF NOT EXISTS external_event_id          text,
  ADD COLUMN IF NOT EXISTS external_calendar_id       text;

CREATE INDEX IF NOT EXISTS idx_appointments_external_event
  ON public.appointments(external_calendar_provider, external_event_id)
  WHERE external_event_id IS NOT NULL;
