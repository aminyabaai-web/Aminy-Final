-- Lifecycle email guardrails (lifecycle-emails cron edge function):
--   1. lifecycle_email_log — idempotency ledger so the daily cron can never send the
--      same lifecycle email to the same user twice. Sequenced emails use suffixed
--      email_type values (e.g. 'trial_countdown_5', 'weekly_digest_2026_w27').
--   2. profiles.lifecycle_emails_enabled — marketing/lifecycle opt-out. Transactional
--      emails (password reset, auth, provider messages) are NOT gated by this flag.
--
-- The lifecycle-emails function degrades gracefully if this migration has not been
-- applied yet (retries queries without the new table/column), so deploy order is safe
-- in either direction.

-- ─── 1. Idempotency log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lifecycle_email_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  email_type  text NOT NULL,
  sent_at     timestamptz DEFAULT now(),
  UNIQUE(user_id, email_type)
);

-- Service-role-only: written exclusively by the lifecycle-emails edge function.
ALTER TABLE public.lifecycle_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to lifecycle email log"
  ON public.lifecycle_email_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_lifecycle_email_log_user
  ON public.lifecycle_email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_email_log_type
  ON public.lifecycle_email_log(email_type);

-- ─── 2. Lifecycle/marketing email opt-out ────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lifecycle_emails_enabled boolean DEFAULT true;

COMMENT ON COLUMN public.profiles.lifecycle_emails_enabled IS
  'Opt-out flag for lifecycle/marketing emails (welcome, re-engage, trial, digest). Does not affect transactional email.';
