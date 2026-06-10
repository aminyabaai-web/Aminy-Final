-- Rethink BH integration schema — everything supabase/functions/rethink/index.ts
-- reads or writes. Idempotent; safe on schemas where some pieces already exist.
-- (Applied to remote 2026-06-10 via MCP.)

-- behavior_logs: 5 app components write to it but it existed in NO migration
-- and was absent from the remote DB — every behavior log insert (incl. the AI
-- LOG_BEHAVIOR smart action) was silently failing until this migration.
-- Column set is the union of all app writers.
CREATE TABLE IF NOT EXISTS public.behavior_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID,
  behavior_type TEXT NOT NULL,
  trigger TEXT,
  intensity INTEGER,
  duration_minutes INTEGER,
  location TEXT,
  antecedent TEXT,
  consequence TEXT,
  is_positive BOOLEAN DEFAULT false,
  notes TEXT,
  source TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_user ON public.behavior_logs(user_id, logged_at DESC);
ALTER TABLE public.behavior_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "behavior_logs_owner_all" ON public.behavior_logs;
CREATE POLICY "behavior_logs_owner_all" ON public.behavior_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- OAuth token storage (service-role only; no client access)
CREATE TABLE IF NOT EXISTS public.rethink_tokens (
  provider_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.rethink_tokens ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service-role edge function may touch tokens.

-- Link an Aminy family profile to its Rethink client record
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rethink_client_id TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_rethink_client ON public.profiles(rethink_client_id)
  WHERE rethink_client_id IS NOT NULL;

-- session.completed webhook upserts (onConflict: rethink_session_id needs the unique index)
ALTER TABLE public.session_notes
  ADD COLUMN IF NOT EXISTS rethink_session_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS session_type TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS session_date DATE,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_notes_rethink_session
  ON public.session_notes(rethink_session_id) WHERE rethink_session_id IS NOT NULL;

-- goal.updated / goal.mastered webhook upserts
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS rethink_goal_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS progress_notes TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_goals_rethink_goal
  ON public.goals(rethink_goal_id) WHERE rethink_goal_id IS NOT NULL;

-- behavior.updated webhook inserts tag their origin
ALTER TABLE public.behavior_logs ADD COLUMN IF NOT EXISTS source TEXT;

-- authorization.changed webhook upserts
CREATE TABLE IF NOT EXISTS public.coverage_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rethink_auth_id TEXT,
  service_code TEXT,
  authorized_units INTEGER,
  used_units INTEGER,
  remaining_units INTEGER,
  status TEXT,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coverage_auth_rethink
  ON public.coverage_authorizations(rethink_auth_id) WHERE rethink_auth_id IS NOT NULL;
ALTER TABLE public.coverage_authorizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coverage_auth_owner_read" ON public.coverage_authorizations;
CREATE POLICY "coverage_auth_owner_read" ON public.coverage_authorizations
  FOR SELECT USING (auth.uid() = user_id);
-- Writes come only from the service-role edge function.
