-- User report artifacts and coverage analysis results
-- Replaces KV keys: report:${reportId}, coverage_report:${parentId}:${timestamp}

CREATE TABLE IF NOT EXISTS public.user_reports (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id TEXT,
  child_name TEXT,
  parent_name TEXT,
  report_type TEXT,
  signed_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  report_summary TEXT,
  expires_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_user_id ON public.user_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_child_id ON public.user_reports(user_id, child_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_expires ON public.user_reports(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own reports" ON public.user_reports;
CREATE POLICY "Users can view own reports"
  ON public.user_reports FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own reports" ON public.user_reports;
CREATE POLICY "Users can manage own reports"
  ON public.user_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coverage_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report JSONB NOT NULL DEFAULT '{}',
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coverage_reports_user_id ON public.coverage_reports(user_id);

ALTER TABLE public.coverage_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own coverage reports" ON public.coverage_reports;
CREATE POLICY "Users can view own coverage reports"
  ON public.coverage_reports FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own coverage reports" ON public.coverage_reports;
CREATE POLICY "Users can manage own coverage reports"
  ON public.coverage_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
