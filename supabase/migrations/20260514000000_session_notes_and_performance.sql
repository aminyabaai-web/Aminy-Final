-- Migration: session_notes + provider_performance_snapshots
-- These tables are referenced in code but were missing from the schema.
-- session_notes: AI-generated + provider-signed ABA session documentation
-- provider_performance_snapshots: KPI snapshots for network tier scoring

-- ─── session_notes ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_notes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            uuid,                          -- links to telehealth sessions
  provider_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id             uuid,                          -- child/client being served
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- family account
  organization          text,                          -- 'aact', 'independent', etc.

  -- Session metadata
  session_date          date NOT NULL,
  session_start         timestamptz,
  session_end           timestamptz,
  duration_minutes      integer,
  modality              text,                          -- 'bcba-direct', 'rbt-direct', etc.
  cpt_codes             text[],                        -- ['97155'] etc.
  location_type         text DEFAULT 'telehealth',     -- always telehealth for now

  -- AI-generated content
  ai_draft              text,                          -- raw AI output
  ai_generated_at       timestamptz,
  ai_model              text DEFAULT 'claude-3-5-sonnet-20241022',

  -- Provider review
  provider_note         text,                          -- final signed note (may differ from AI draft)
  provider_reviewed_at  timestamptz,
  provider_signed_at    timestamptz,
  signature_hash        text,                          -- hash of signed note for tamper detection

  -- Outcome data captured at session
  goals_addressed       jsonb DEFAULT '[]',            -- [{goal_id, goal_name, outcome, trials}]
  skill_mastered        boolean DEFAULT false,
  session_rating        integer CHECK (session_rating BETWEEN 1 AND 5),
  parent_present        boolean DEFAULT false,
  home_program_reviewed boolean DEFAULT false,

  -- Billing
  units_billed          integer,
  billing_status        text DEFAULT 'pending',        -- 'pending', 'submitted', 'paid', 'denied'
  claim_id              uuid,

  -- Metadata
  status                text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'signed', 'locked')),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- RLS: providers see their own notes; families see notes for their children; admins see all
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers see own session notes"
  ON public.session_notes FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Providers insert own session notes"
  ON public.session_notes FOR INSERT
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers update own unsigned notes"
  ON public.session_notes FOR UPDATE
  USING (provider_id = auth.uid() AND status != 'locked');

CREATE POLICY "Families see notes for their children"
  ON public.session_notes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins see all session notes"
  ON public.session_notes FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_notes_provider ON public.session_notes(provider_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_client ON public.session_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_user ON public.session_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_date ON public.session_notes(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_session_notes_status ON public.session_notes(status);

-- ─── provider_performance_snapshots ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.provider_performance_snapshots (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_period         text NOT NULL,               -- e.g. '2026-05' (YYYY-MM)
  snapshot_date           date NOT NULL DEFAULT CURRENT_DATE,

  -- KPI metrics (raw values — tier computed client-side)
  session_completion_rate numeric(5,2),                -- % sessions completed vs scheduled
  documentation_rate      numeric(5,2),                -- % notes signed within 24h
  outcome_goal_rate       numeric(5,2),                -- % goals with measurable progress
  parent_engagement_score numeric(5,2),                -- % sessions with parent present/engaged
  cancellation_rate       numeric(5,2),                -- % sessions cancelled by provider
  auth_utilization_rate   numeric(5,2),                -- % authorized hours actually billed
  claim_denial_rate       numeric(5,2),                -- % claims denied
  rbt_supervision_rate    numeric(5,2),                -- % RBT sessions with BCBA oversight

  -- Aggregate counts for the period
  total_sessions          integer DEFAULT 0,
  total_signed_notes      integer DEFAULT 0,
  total_goals_addressed   integer DEFAULT 0,
  total_billable_units    integer DEFAULT 0,

  -- Network tier (computed and stored for historical trending)
  network_tier            text CHECK (network_tier IN ('green', 'yellow', 'red')),
  tier_reason             text,                        -- human-readable reason for tier

  -- Flags
  auth_expiring_days      integer,                     -- days until next auth expires (null if none)
  open_denials            integer DEFAULT 0,

  created_at              timestamptz DEFAULT now()
);

ALTER TABLE public.provider_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers see own snapshots"
  ON public.provider_performance_snapshots FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Admins see all snapshots"
  ON public.provider_performance_snapshots FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Allow service role to insert snapshots (for automated cron)
CREATE POLICY "Service role inserts snapshots"
  ON public.provider_performance_snapshots FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_perf_snapshots_provider ON public.provider_performance_snapshots(provider_id);
CREATE INDEX IF NOT EXISTS idx_perf_snapshots_period ON public.provider_performance_snapshots(snapshot_period DESC);

-- ─── updated_at trigger for session_notes ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_session_notes_updated_at ON public.session_notes;
CREATE TRIGGER set_session_notes_updated_at
  BEFORE UPDATE ON public.session_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
