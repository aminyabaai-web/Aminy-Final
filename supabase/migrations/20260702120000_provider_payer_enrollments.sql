-- Provider payer-enrollment checklist progress
-- Persists CredentialingOrchestrator playbook step checkmarks (previously an
-- in-memory Set that was lost on every reload). One row per checked step.

CREATE TABLE IF NOT EXISTS public.provider_payer_enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  payer_id    text NOT NULL,
  step_key    text NOT NULL,
  checked_at  timestamptz DEFAULT now(),
  UNIQUE(provider_id, payer_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_provider_payer_enrollments_provider
  ON public.provider_payer_enrollments(provider_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.provider_payer_enrollments ENABLE ROW LEVEL SECURITY;

-- A provider manages only their own checklist rows.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='provider_payer_enrollments' AND policyname='provider_own_enrollment_steps') THEN
    CREATE POLICY "provider_own_enrollment_steps" ON public.provider_payer_enrollments
      FOR ALL USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_payer_enrollments TO authenticated;
GRANT ALL ON public.provider_payer_enrollments TO service_role;
