-- Operator-grade rails hardening
-- Aligns the real backend with the current telehealth, claim-ready, EVV, and CentralReach operator workflows.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS reason_for_visit text,
  ADD COLUMN IF NOT EXISTS user_state text,
  ADD COLUMN IF NOT EXISTS care_rail text,
  ADD COLUMN IF NOT EXISTS financials jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS room_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS settled_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_followup_required_at timestamptz;

UPDATE public.appointments
SET
  start_time = COALESCE(start_time, scheduled_time),
  end_time = COALESCE(end_time, scheduled_time + make_interval(mins => COALESCE(duration_minutes, 25))),
  reason_for_visit = COALESCE(reason_for_visit, concern_label),
  care_rail = COALESCE(care_rail, 'cash_pay_direct'),
  payment_status = COALESCE(payment_status, 'pending'),
  financials = COALESCE(financials, '{}'::jsonb)
WHERE
  start_time IS NULL
  OR end_time IS NULL
  OR reason_for_visit IS NULL
  OR care_rail IS NULL
  OR payment_status IS NULL
  OR financials IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_care_rail ON public.appointments(care_rail);
CREATE INDEX IF NOT EXISTS idx_appointments_settlement_status ON public.appointments(settlement_status);

CREATE TABLE IF NOT EXISTS public.provider_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  provider_id uuid,
  organization text NOT NULL,
  rail text NOT NULL,
  visit_class text NOT NULL,
  gross_payout_cents integer NOT NULL DEFAULT 0,
  source text NOT NULL,
  settlement_terms text NOT NULL,
  payout_status text NOT NULL DEFAULT 'pending',
  payout_due_at timestamptz,
  settled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_settlements_provider_id ON public.provider_settlements(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_settlements_appointment_id ON public.provider_settlements(appointment_id);
CREATE INDEX IF NOT EXISTS idx_provider_settlements_payout_status ON public.provider_settlements(payout_status);

CREATE TABLE IF NOT EXISTS public.partner_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization text NOT NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  line_item_type text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  terms text NOT NULL DEFAULT 'net_15_ach',
  invoice_status text NOT NULL DEFAULT 'pending',
  due_at timestamptz,
  issued_at timestamptz,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_invoices_org ON public.partner_invoices(organization);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_status ON public.partner_invoices(invoice_status);

CREATE TABLE IF NOT EXISTS public.claim_ready_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  child_id uuid REFERENCES public.children(id) ON DELETE SET NULL,
  state text NOT NULL,
  payer_id text NOT NULL,
  payer_name text NOT NULL,
  provider_name text NOT NULL,
  visit_type text NOT NULL,
  service_date date NOT NULL,
  primary_policy_id text,
  secondary_policy_id text,
  queue_status text NOT NULL DEFAULT 'draft',
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  route text NOT NULL DEFAULT 'insured_partner_billed',
  submission_mode text NOT NULL DEFAULT 'partner_billing',
  auth_required boolean NOT NULL DEFAULT false,
  amount_cents integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_ready_cases_state ON public.claim_ready_cases(state);
CREATE INDEX IF NOT EXISTS idx_claim_ready_cases_status ON public.claim_ready_cases(queue_status);
CREATE INDEX IF NOT EXISTS idx_claim_ready_cases_service_date ON public.claim_ready_cases(service_date DESC);

CREATE TABLE IF NOT EXISTS public.evv_export_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES public.children(id) ON DELETE SET NULL,
  system text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  exported_at timestamptz,
  shift_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_export_batches_child_id ON public.evv_export_batches(child_id);
CREATE INDEX IF NOT EXISTS idx_evv_export_batches_status ON public.evv_export_batches(status);

CREATE TABLE IF NOT EXISTS public.evv_reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES public.children(id) ON DELETE SET NULL,
  label text NOT NULL,
  system_of_record text NOT NULL,
  exported_at timestamptz NOT NULL DEFAULT now(),
  payroll_date date NOT NULL,
  records_compared integer NOT NULL DEFAULT 0,
  accuracy numeric(5,2) NOT NULL DEFAULT 0,
  critical_exceptions integer NOT NULL DEFAULT 0,
  export_batch_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_reconciliation_runs_child_id ON public.evv_reconciliation_runs(child_id);
CREATE INDEX IF NOT EXISTS idx_evv_reconciliation_runs_exported_at ON public.evv_reconciliation_runs(exported_at DESC);

CREATE TABLE IF NOT EXISTS public.evv_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.evv_reconciliation_runs(id) ON DELETE CASCADE,
  shift_id uuid,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  details text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_discrepancies_run_id ON public.evv_discrepancies(run_id);
CREATE INDEX IF NOT EXISTS idx_evv_discrepancies_category ON public.evv_discrepancies(category);

CREATE TABLE IF NOT EXISTS public.cr_sync_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.children(id) ON DELETE SET NULL,
  data_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('pull', 'push')),
  status text NOT NULL CHECK (status IN ('started', 'success', 'error', 'partial')),
  records_processed integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  error_code text,
  duration_ms integer,
  sync_metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cr_sync_log_user_id ON public.cr_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_sync_log_user_data_type ON public.cr_sync_log(user_id, data_type, direction);
CREATE INDEX IF NOT EXISTS idx_cr_sync_log_started_at ON public.cr_sync_log(started_at DESC);

CREATE TABLE IF NOT EXISTS public.cr_sync_errors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_log_id uuid REFERENCES public.cr_sync_log(id) ON DELETE SET NULL,
  data_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('pull', 'push')),
  record_id text,
  error_code text,
  error_message text NOT NULL,
  error_details jsonb DEFAULT '{}'::jsonb,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cr_sync_errors_user_id ON public.cr_sync_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_sync_errors_resolved ON public.cr_sync_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_cr_sync_errors_created_at ON public.cr_sync_errors(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.provider_settlements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.partner_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.claim_ready_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.evv_export_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.evv_reconciliation_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.evv_discrepancies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cr_sync_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cr_sync_errors TO authenticated;

GRANT ALL ON public.provider_settlements TO service_role;
GRANT ALL ON public.partner_invoices TO service_role;
GRANT ALL ON public.claim_ready_cases TO service_role;
GRANT ALL ON public.evv_export_batches TO service_role;
GRANT ALL ON public.evv_reconciliation_runs TO service_role;
GRANT ALL ON public.evv_discrepancies TO service_role;
GRANT ALL ON public.cr_sync_log TO service_role;
GRANT ALL ON public.cr_sync_errors TO service_role;
