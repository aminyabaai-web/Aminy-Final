-- Extend existing user_feedback table into a full admin feedback inbox.
-- Applied to remote 2026-06-09 via MCP (user_feedback_inbox_extend).
ALTER TABLE public.user_feedback
  ADD COLUMN IF NOT EXISTS mood text CHECK (mood IN ('easy','okay','hard')),
  ADD COLUMN IF NOT EXISTS context text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS what_felt_easiest text,
  ADD COLUMN IF NOT EXISTS what_could_be_calmer text,
  ADD COLUMN IF NOT EXISTS admin_response text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.user_feedback SET status = 'new' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON public.user_feedback (user_id);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_feedback_insert_own ON public.user_feedback;
CREATE POLICY user_feedback_insert_own ON public.user_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_feedback_select_own ON public.user_feedback;
CREATE POLICY user_feedback_select_own ON public.user_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_feedback_admin_select ON public.user_feedback;
CREATE POLICY user_feedback_admin_select ON public.user_feedback
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS user_feedback_admin_update ON public.user_feedback;
CREATE POLICY user_feedback_admin_update ON public.user_feedback
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
