-- Migration: Mental Health support + multi-state licensing for providers
--
-- Adds mental-health-specific provider types and multi-state licensing
-- tracking. Required for the "Ask a BCBA" / async messaging product to work
-- across state lines and for parents to find MH providers licensed in THEIR
-- state. Also enables the patient_type field so a family member (parent,
-- sibling) — not just the index child — can be the subject of a visit.

-- ─── Provider types: add mental health classifications ────────────────────
-- The provider_applications table already has a provider_type free-text/enum.
-- Add a structured field for licensure category that's queryable.

ALTER TABLE public.provider_applications
  ADD COLUMN IF NOT EXISTS licensure_category text
    CHECK (licensure_category IN (
      'bcba', 'bcaba', 'rbt',            -- ABA tier
      'lmft', 'lcsw', 'lpc', 'lmhc',     -- Mental health (therapists)
      'psychologist', 'psychiatrist',     -- Mental health (doctoral)
      'slp', 'slpa',                      -- Speech
      'ot', 'cota',                       -- OT
      'pt', 'pta',                        -- PT
      'pediatrician', 'developmental_pediatrician', 'np',  -- Medical
      'other'
    )),
  ADD COLUMN IF NOT EXISTS group_npi text,                 -- Group NPI (for Aminy-contracted groups)
  ADD COLUMN IF NOT EXISTS individual_npi text;            -- Already exists as npi_number — kept separately for clarity

-- ─── Multi-state licensing ────────────────────────────────────────────────
-- Providers can be licensed in multiple states. The async messaging product
-- and telehealth marketplace need to match patients to providers licensed in
-- the PATIENT's state.

CREATE TABLE IF NOT EXISTS public.provider_state_licenses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         uuid NOT NULL,                       -- references provider record (provider_applications.user_id or providers.id)
  state_code          char(2) NOT NULL,                    -- 'AZ', 'CA', 'NY', etc.
  license_number      text NOT NULL,
  license_type        text NOT NULL,                       -- 'BCBA', 'LMFT', 'Psychologist', etc.
  issued_at           date,
  expires_at          date NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'expired', 'revoked', 'denied')),
  verified_at         timestamptz,
  verification_source text,                                -- 'manual', 'cabarrus', 'caqh', 'state_api'
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_licenses_provider
  ON public.provider_state_licenses(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_licenses_state_active
  ON public.provider_state_licenses(state_code, verification_status, expires_at)
  WHERE verification_status = 'verified';
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_license_unique
  ON public.provider_state_licenses(provider_id, state_code, license_type);

ALTER TABLE public.provider_state_licenses ENABLE ROW LEVEL SECURITY;

-- Providers manage their own licenses; admins manage all
DROP POLICY IF EXISTS "Provider manages own licenses" ON public.provider_state_licenses;
CREATE POLICY "Provider manages own licenses"
  ON public.provider_state_licenses FOR ALL
  USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all licenses" ON public.provider_state_licenses;
CREATE POLICY "Admins read all licenses"
  ON public.provider_state_licenses FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- Service role full access (for credentialing automation)
DROP POLICY IF EXISTS "Service role licenses" ON public.provider_state_licenses;
CREATE POLICY "Service role licenses"
  ON public.provider_state_licenses FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Family member as patient (Mental Health uses this) ──────────────────
-- Appointments + outcome assessments can target the index child OR a family
-- member (parent depression therapy, sibling anxiety eval, etc.).

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS patient_type text DEFAULT 'child'
    CHECK (patient_type IN ('child', 'parent', 'sibling', 'caregiver', 'other')),
  ADD COLUMN IF NOT EXISTS patient_name text;              -- when patient is NOT the index child

-- ─── Outcome measure submissions ─────────────────────────────────────────
-- Stores parent/clinician completions of PHQ-9, GAD-7, ABC, etc. Per migration
-- 20260515170000_sms_preferences this is HIPAA PHI — RLS enforced.

CREATE TABLE IF NOT EXISTS public.outcome_measure_submissions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz DEFAULT now(),

  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id            uuid,                                -- null when measure is about parent/family member
  patient_type        text DEFAULT 'child'
    CHECK (patient_type IN ('child', 'parent', 'sibling', 'caregiver', 'other')),

  measure_id          text NOT NULL,                       -- 'phq9', 'gad7', 'phq-a', 'scared-short', 'abc-irritability'
  measure_name        text NOT NULL,

  answers             jsonb NOT NULL,                      -- array of {item_id, value} or just indexed array
  total_score         integer NOT NULL,
  severity_band       text NOT NULL,                       -- 'minimal', 'mild', 'moderate', 'severe', etc.
  band_label          text NOT NULL,
  band_guidance       text,

  /** Who administered/completed it — provider for clinical, self for screening */
  completed_by        text DEFAULT 'self'
    CHECK (completed_by IN ('self', 'parent', 'provider', 'clinical_team')),

  notes               text
);

CREATE INDEX IF NOT EXISTS idx_outcome_submissions_user
  ON public.outcome_measure_submissions(user_id, measure_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcome_submissions_child
  ON public.outcome_measure_submissions(child_id, measure_id, created_at DESC) WHERE child_id IS NOT NULL;

ALTER TABLE public.outcome_measure_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own submissions" ON public.outcome_measure_submissions;
CREATE POLICY "Users own submissions"
  ON public.outcome_measure_submissions FOR ALL
  USING (user_id = auth.uid());

-- ─── Async messaging tier on profiles ────────────────────────────────────
-- For the Ask a BCBA / Ask a Therapist async messaging product. Tracks which
-- async tier the user has purchased (none, basic_rbt, full_bcba, full_therapist).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS async_messaging_tier text DEFAULT 'none'
    CHECK (async_messaging_tier IN ('none', 'basic_rbt', 'full_bcba', 'full_therapist', 'unlimited')),
  ADD COLUMN IF NOT EXISTS async_messaging_purchased_at timestamptz,
  ADD COLUMN IF NOT EXISTS async_messages_used_this_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS async_messages_month_reset_at timestamptz DEFAULT now();
