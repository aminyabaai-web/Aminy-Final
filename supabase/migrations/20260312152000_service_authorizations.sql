-- ============================================================================
-- Service authorizations for Arizona EVV / fiscal-agent pilot workflows
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.service_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  fiscal_agent TEXT NOT NULL CHECK (fiscal_agent IN ('acumen', 'dci', 'ppl', 'conduent', 'other')),
  authorization_number TEXT,
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  authorized_units INTEGER NOT NULL DEFAULT 0 CHECK (authorized_units >= 0),
  used_units INTEGER NOT NULL DEFAULT 0 CHECK (used_units >= 0),
  unit_type TEXT NOT NULL CHECK (unit_type IN ('hours', '15min', 'daily', 'monthly')),
  effective_date DATE NOT NULL,
  end_date DATE NOT NULL,
  provider_npi TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_authorizations_child_id
  ON public.service_authorizations(child_id);

CREATE INDEX IF NOT EXISTS idx_service_authorizations_end_date
  ON public.service_authorizations(end_date DESC);

ALTER TABLE public.service_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own service authorizations" ON public.service_authorizations;
CREATE POLICY "Users can view own service authorizations"
  ON public.service_authorizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.children
      WHERE children.id = service_authorizations.child_id
        AND children.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own service authorizations" ON public.service_authorizations;
CREATE POLICY "Users can insert own service authorizations"
  ON public.service_authorizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.children
      WHERE children.id = service_authorizations.child_id
        AND children.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own service authorizations" ON public.service_authorizations;
CREATE POLICY "Users can update own service authorizations"
  ON public.service_authorizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.children
      WHERE children.id = service_authorizations.child_id
        AND children.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.children
      WHERE children.id = service_authorizations.child_id
        AND children.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.service_authorizations TO authenticated;
GRANT ALL ON public.service_authorizations TO service_role;
