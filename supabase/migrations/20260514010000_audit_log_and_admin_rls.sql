-- Migration: audit_log table + RLS policies for 6 admin tables
-- HIPAA §164.312(b) compliance: durable server-side PHI access audit trail
-- Also closes the security gap: 6 admin tables had RLS enabled but NO policies,
-- meaning any authenticated user could query them via PostgREST.

-- ─── audit_log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz DEFAULT now(),

  -- Who
  user_id             uuid,                    -- null for unauthenticated/system events
  user_role           text,
  user_email          text,
  session_id          text,

  -- What
  event_type          text NOT NULL,           -- 'VIEW_RECORD', 'LOGIN', etc.
  resource_type       text,
  resource_id         text,
  child_id            uuid,
  action_description  text,
  sensitivity         text DEFAULT 'standard', -- 'standard', 'sensitive', 'highly_sensitive'
  success             boolean DEFAULT true,
  error_message       text,

  -- Where
  screen_context      text,
  ip_address          text,
  user_agent          text,

  -- Tamper-evident chain
  entry_hash          text,
  previous_hash       text
);

-- Audit log: only admins can read; anyone authenticated can insert (fire-and-forget)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log"
  ON public.audit_log FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Authenticated users insert audit events"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Service role inserts (for edge function writes)
CREATE POLICY "Service role full access to audit log"
  ON public.audit_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON public.audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON public.audit_log(resource_type, resource_id);

-- ─── Admin-only RLS for 6 previously unprotected tables ──────────────────────
-- These tables had RLS enabled but NO policies = any authenticated user could
-- query them freely. Now locked to admin role only.

-- claim_ready_cases
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'claim_ready_cases' AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Table claim_ready_cases does not exist — skipping RLS policy';
  ELSE
    DROP POLICY IF EXISTS "Admin only claim_ready_cases" ON public.claim_ready_cases;
    CREATE POLICY "Admin only claim_ready_cases"
      ON public.claim_ready_cases FOR ALL
      USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- partner_invoices
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'partner_invoices' AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Table partner_invoices does not exist — skipping RLS policy';
  ELSE
    DROP POLICY IF EXISTS "Admin only partner_invoices" ON public.partner_invoices;
    CREATE POLICY "Admin only partner_invoices"
      ON public.partner_invoices FOR ALL
      USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- provider_settlements
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'provider_settlements' AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Table provider_settlements does not exist — skipping RLS policy';
  ELSE
    DROP POLICY IF EXISTS "Admin only provider_settlements" ON public.provider_settlements;
    CREATE POLICY "Admin only provider_settlements"
      ON public.provider_settlements FOR ALL
      USING (auth.jwt() ->> 'role' = 'admin');

    -- Providers can see their own settlement records
    DROP POLICY IF EXISTS "Providers see own settlements" ON public.provider_settlements;
    CREATE POLICY "Providers see own settlements"
      ON public.provider_settlements FOR SELECT
      USING (provider_id = auth.uid());
  END IF;
END $$;

-- evv_export_batches
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'evv_export_batches' AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Table evv_export_batches does not exist — skipping RLS policy';
  ELSE
    DROP POLICY IF EXISTS "Admin only evv_export_batches" ON public.evv_export_batches;
    CREATE POLICY "Admin only evv_export_batches"
      ON public.evv_export_batches FOR ALL
      USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- evv_reconciliation_runs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'evv_reconciliation_runs' AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Table evv_reconciliation_runs does not exist — skipping RLS policy';
  ELSE
    DROP POLICY IF EXISTS "Admin only evv_reconciliation_runs" ON public.evv_reconciliation_runs;
    CREATE POLICY "Admin only evv_reconciliation_runs"
      ON public.evv_reconciliation_runs FOR ALL
      USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- evv_discrepancies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'evv_discrepancies' AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'Table evv_discrepancies does not exist — skipping RLS policy';
  ELSE
    DROP POLICY IF EXISTS "Admin only evv_discrepancies" ON public.evv_discrepancies;
    CREATE POLICY "Admin only evv_discrepancies"
      ON public.evv_discrepancies FOR ALL
      USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;
