-- =============================================================================
-- Remote Backend Repair
--
-- Purpose:
--   1. Make auth user creation resilient when pg_net is not installed.
--   2. Align the live database with the current caregiver workflow code.
--   3. Backfill the minimum schema required for real-backend proof tests.
--
-- Notes:
--   - This is intentionally idempotent.
--   - It patches the live schema shape without assuming prior migrations ran
--     exactly as the local history suggests.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. Safe auth signup trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    parent_name,
    child_name,
    has_completed_onboarding,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NULL,
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET updated_at = NOW();

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/make-server-8a022548/email/welcome',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', current_setting('request.jwt.claim.role', true)
        ),
        body := jsonb_build_object(
          'email', NEW.email,
          'userId', NEW.id,
          'name', NEW.raw_user_meta_data->>'full_name'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================================
-- 2. Existing table alignment
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS child_id UUID,
  ADD COLUMN IF NOT EXISTS child_age INTEGER,
  ADD COLUMN IF NOT EXISTS child_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS diagnoses TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS communication_level TEXT,
  ADD COLUMN IF NOT EXISTS sensory_sensitivities TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS strengths TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS challenges TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS current_therapies TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS school_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_children_parent_id ON public.children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_user_id ON public.children(user_id);

ALTER TABLE public.treatment_goals
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.treatment_goals
SET current = COALESCE(current_progress, 0)
WHERE current IS NULL;

CREATE INDEX IF NOT EXISTS idx_treatment_goals_user_child ON public.treatment_goals(user_id, child_id);

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS facts_extracted TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS topics TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sentiment TEXT NOT NULL DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

ALTER TABLE public.routine_completions
  DROP CONSTRAINT IF EXISTS routine_completions_routine_id_fkey;

ALTER TABLE public.routine_completions
  ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.routine_completions
  ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE public.routine_completions
  ALTER COLUMN routine_id TYPE TEXT USING routine_id::text;

ALTER TABLE public.routine_completions
  ADD COLUMN IF NOT EXISTS routine_name TEXT,
  ADD COLUMN IF NOT EXISTS completion_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS plan_snapshot_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_routine_completions_user_date ON public.routine_completions(user_id, scheduled_date DESC);

DROP TRIGGER IF EXISTS routine_completions_updated_at ON public.routine_completions;
CREATE TRIGGER routine_completions_updated_at
  BEFORE UPDATE ON public.routine_completions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 3. Canonical AI + workflow tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  summary TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users can view own ai_conversations"
  ON public.ai_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users can create ai_conversations"
  ON public.ai_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users can update own ai_conversations"
  ON public.ai_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete own ai_conversations"
  ON public.ai_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_child ON public.ai_conversations(child_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_last_msg ON public.ai_conversations(last_message_at DESC);

DROP TRIGGER IF EXISTS ai_conversations_updated ON public.ai_conversations;
CREATE TRIGGER ai_conversations_updated
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai_messages" ON public.ai_messages;
CREATE POLICY "Users can view own ai_messages"
  ON public.ai_messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own ai_messages" ON public.ai_messages;
CREATE POLICY "Users can insert own ai_messages"
  ON public.ai_messages FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_msg_created ON public.ai_messages(created_at);

CREATE TABLE IF NOT EXISTS public.memory_facts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC,
  source TEXT,
  source_id TEXT,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, child_id, key)
);

ALTER TABLE public.memory_facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memory facts" ON public.memory_facts;
CREATE POLICY "Users can view own memory facts"
  ON public.memory_facts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own memory facts" ON public.memory_facts;
CREATE POLICY "Users can insert own memory facts"
  ON public.memory_facts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own memory facts" ON public.memory_facts;
CREATE POLICY "Users can update own memory facts"
  ON public.memory_facts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_memory_facts_user_child ON public.memory_facts(user_id, child_id);
CREATE INDEX IF NOT EXISTS idx_memory_facts_extracted_at ON public.memory_facts(extracted_at DESC);

DROP TRIGGER IF EXISTS memory_facts_updated_at ON public.memory_facts;
CREATE TRIGGER memory_facts_updated_at
  BEFORE UPDATE ON public.memory_facts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id TEXT PRIMARY KEY,
  conversation_id TEXT UNIQUE REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  key_topics TEXT[] NOT NULL DEFAULT '{}'::text[],
  emotional_tone TEXT NOT NULL DEFAULT 'neutral',
  action_items TEXT[] NOT NULL DEFAULT '{}'::text[],
  strategies_mentioned TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own summaries" ON public.conversation_summaries;
CREATE POLICY "Users can view own summaries"
  ON public.conversation_summaries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own summaries" ON public.conversation_summaries;
CREATE POLICY "Users can insert own summaries"
  ON public.conversation_summaries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own summaries" ON public.conversation_summaries;
CREATE POLICY "Users can update own summaries"
  ON public.conversation_summaries FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_conv_summaries_user_child ON public.conversation_summaries(user_id, child_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.conversation_compat_map (
  ai_conversation_id TEXT PRIMARY KEY REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.conversation_compat_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversation compat" ON public.conversation_compat_map;
CREATE POLICY "Users can view own conversation compat"
  ON public.conversation_compat_map FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own conversation compat" ON public.conversation_compat_map;
CREATE POLICY "Users can insert own conversation compat"
  ON public.conversation_compat_map FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own conversation compat" ON public.conversation_compat_map;
CREATE POLICY "Users can update own conversation compat"
  ON public.conversation_compat_map FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_conv_compat_user ON public.conversation_compat_map(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_compat_child ON public.conversation_compat_map(child_id);

DROP TRIGGER IF EXISTS conversation_compat_map_updated_at ON public.conversation_compat_map;
CREATE TRIGGER conversation_compat_map_updated_at
  BEFORE UPDATE ON public.conversation_compat_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.daily_plan_snapshots (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'archived')),
  source TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'manual', 'recovered')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_from_goal_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  generated_from_memory_fact_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  generated_from_conversation_summary_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_plan_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily plan snapshots" ON public.daily_plan_snapshots;
CREATE POLICY "Users can view own daily plan snapshots"
  ON public.daily_plan_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own daily plan snapshots" ON public.daily_plan_snapshots;
CREATE POLICY "Users can insert own daily plan snapshots"
  ON public.daily_plan_snapshots FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own daily plan snapshots" ON public.daily_plan_snapshots;
CREATE POLICY "Users can update own daily plan snapshots"
  ON public.daily_plan_snapshots FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_daily_plan_snapshots_user_child_date
  ON public.daily_plan_snapshots(user_id, child_id, plan_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_plan_snapshots_active_unique
  ON public.daily_plan_snapshots(user_id, child_id, plan_date)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS daily_plan_snapshots_updated_at ON public.daily_plan_snapshots;
CREATE TRIGGER daily_plan_snapshots_updated_at
  BEFORE UPDATE ON public.daily_plan_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'routine_completions_plan_snapshot_fk'
  ) THEN
    ALTER TABLE public.routine_completions
      ADD CONSTRAINT routine_completions_plan_snapshot_fk
      FOREIGN KEY (plan_snapshot_id) REFERENCES public.daily_plan_snapshots(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_routine_completions_plan_snapshot
  ON public.routine_completions(plan_snapshot_id);

CREATE TABLE IF NOT EXISTS public.caregiver_summaries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_text TEXT NOT NULL,
  notes TEXT,
  source_plan_snapshot_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  source_conversation_summary_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.caregiver_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own caregiver summaries" ON public.caregiver_summaries;
CREATE POLICY "Users can view own caregiver summaries"
  ON public.caregiver_summaries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own caregiver summaries" ON public.caregiver_summaries;
CREATE POLICY "Users can insert own caregiver summaries"
  ON public.caregiver_summaries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own caregiver summaries" ON public.caregiver_summaries;
CREATE POLICY "Users can update own caregiver summaries"
  ON public.caregiver_summaries FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_caregiver_summaries_user_child_period
  ON public.caregiver_summaries(user_id, child_id, period_end DESC);

DROP TRIGGER IF EXISTS caregiver_summaries_updated_at ON public.caregiver_summaries;
CREATE TRIGGER caregiver_summaries_updated_at
  BEFORE UPDATE ON public.caregiver_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.jr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  activity_name TEXT,
  duration_seconds INTEGER,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  score INTEGER,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.jr_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view own jr sessions" ON public.jr_sessions;
CREATE POLICY "Parents can view own jr sessions"
  ON public.jr_sessions FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "Parents can insert own jr sessions" ON public.jr_sessions;
CREATE POLICY "Parents can insert own jr sessions"
  ON public.jr_sessions FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_jr_sessions_child ON public.jr_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_jr_sessions_parent_completed ON public.jr_sessions(parent_id, completed_at DESC);
