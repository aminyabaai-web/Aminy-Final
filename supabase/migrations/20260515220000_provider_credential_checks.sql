-- Migration: Provider credential checks — unified ledger for Stripe Identity,
-- Checkr background check, and Malpractice insurance verification. State
-- licenses are in provider_state_licenses (see migration 20260515200000).

CREATE TABLE IF NOT EXISTS public.provider_credential_checks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   uuid NOT NULL,
  check_type    text NOT NULL CHECK (check_type IN ('identity', 'background', 'malpractice')),
  status        text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'pending', 'in_progress', 'requires_input', 'verified', 'failed', 'expired')),

  /** External service reference (Stripe session ID, Checkr report/invitation ID) */
  external_ref  text,

  started_at    timestamptz,
  completed_at  timestamptz,
  expires_at    timestamptz,                  -- for malpractice, license re-verification cadence

  result_data   jsonb,                         -- raw service payload (no PII beyond what's needed)
  failure_reason text,

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credential_checks_unique
  ON public.provider_credential_checks(provider_id, check_type);

CREATE INDEX IF NOT EXISTS idx_credential_checks_status
  ON public.provider_credential_checks(status, started_at);

ALTER TABLE public.provider_credential_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers see own checks" ON public.provider_credential_checks;
CREATE POLICY "Providers see own checks"
  ON public.provider_credential_checks FOR SELECT
  USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages credential checks" ON public.provider_credential_checks;
CREATE POLICY "Service role manages credential checks"
  ON public.provider_credential_checks FOR ALL
  USING (auth.role() = 'service_role');

-- ─── CE Credit tracking for BCBA/RBT recertification ─────────────────────

CREATE TABLE IF NOT EXISTS public.provider_ce_credits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   uuid NOT NULL,

  course_name   text NOT NULL,
  provider_org  text,                          -- 'BACB approved', 'Mary Barbera', etc.
  credit_type   text NOT NULL
    CHECK (credit_type IN ('general', 'ethics', 'supervision', 'cultural_diversity', 'other')),
  credit_hours  numeric(5,2) NOT NULL,

  completed_at  timestamptz NOT NULL,
  certificate_url text,                        -- uploaded certificate PDF
  expires_at    timestamptz,                   -- when this credit no longer counts toward next cycle

  /** Re-cert cycle this credit applies to (e.g. '2026-2028') */
  recert_cycle  text,

  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_credits_provider
  ON public.provider_ce_credits(provider_id, completed_at DESC);

ALTER TABLE public.provider_ce_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers manage own CE credits" ON public.provider_ce_credits;
CREATE POLICY "Providers manage own CE credits"
  ON public.provider_ce_credits FOR ALL
  USING (provider_id = auth.uid());

-- ─── 1099 form tracking ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.provider_tax_forms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   uuid NOT NULL,
  tax_year      integer NOT NULL,
  form_type     text NOT NULL DEFAULT '1099-NEC' CHECK (form_type IN ('1099-NEC', '1099-MISC', 'W-9')),

  /** Total non-employee compensation in cents for the year */
  total_compensation_cents bigint NOT NULL DEFAULT 0,
  /** Backup withholding (rare; usually 0) */
  federal_tax_withheld_cents bigint DEFAULT 0,

  /** PDF URL after generation (Supabase Storage) */
  pdf_url       text,
  generated_at  timestamptz,
  /** When we sent it to the provider */
  sent_at       timestamptz,
  /** When provider acknowledged (downloaded) */
  acknowledged_at timestamptz,

  /** Did we e-file with IRS? */
  irs_filed_at  timestamptz,
  irs_filing_ref text,

  created_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_forms_unique
  ON public.provider_tax_forms(provider_id, tax_year, form_type);

ALTER TABLE public.provider_tax_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers see own tax forms" ON public.provider_tax_forms;
CREATE POLICY "Providers see own tax forms"
  ON public.provider_tax_forms FOR SELECT
  USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages tax forms" ON public.provider_tax_forms;
CREATE POLICY "Service role manages tax forms"
  ON public.provider_tax_forms FOR ALL
  USING (auth.role() = 'service_role');
