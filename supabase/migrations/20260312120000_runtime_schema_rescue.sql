-- Runtime schema rescue for the signed-in product experience.
-- Purpose:
-- 1. Backfill compatibility tables/columns the current frontend still queries.
-- 2. Add lightweight RPCs the app expects for usage and streak tracking.
-- 3. Reduce signed-in dashboard/operator runtime errors without widening scope.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- usage_tracking compatibility
-- ---------------------------------------------------------------------------
ALTER TABLE public.usage_tracking
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS features_used TEXT[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_date DATE,
  p_tokens INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.usage_tracking (
    user_id,
    date,
    message_count,
    tokens_used,
    updated_at
  )
  VALUES (
    p_user_id,
    p_date,
    1,
    COALESCE(p_tokens, 0),
    NOW()
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    message_count = COALESCE(public.usage_tracking.message_count, 0) + 1,
    tokens_used = COALESCE(public.usage_tracking.tokens_used, 0) + COALESCE(p_tokens, 0),
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, DATE, INTEGER) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- user_streaks compatibility
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_streaks
  ADD COLUMN IF NOT EXISTS id TEXT DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'daily_checkin',
  ADD COLUMN IF NOT EXISTS streak_type TEXT NOT NULL DEFAULT 'daily_checkin',
  ADD COLUMN IF NOT EXISTS total_activities INTEGER NOT NULL DEFAULT 0;

UPDATE public.user_streaks
SET
  type = COALESCE(NULLIF(type, ''), 'daily_checkin'),
  streak_type = COALESCE(NULLIF(streak_type, ''), type, 'daily_checkin');

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_streaks_user_unique ON public.user_streaks(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_streaks_user_type_unique ON public.user_streaks(user_id, type);

CREATE OR REPLACE FUNCTION public.update_user_streak(
  p_user_id UUID,
  p_streak_type TEXT DEFAULT 'daily_checkin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO public.user_streaks (
    id,
    user_id,
    type,
    streak_type,
    current_streak,
    longest_streak,
    last_activity_date,
    total_activities,
    updated_at
  )
  VALUES (
    gen_random_uuid()::text,
    p_user_id::text,
    COALESCE(NULLIF(p_streak_type, ''), 'daily_checkin'),
    COALESCE(NULLIF(p_streak_type, ''), 'daily_checkin'),
    1,
    1,
    v_today,
    1,
    NOW()
  )
  ON CONFLICT (user_id, type)
  DO UPDATE SET
    streak_type = EXCLUDED.streak_type,
    current_streak = CASE
      WHEN public.user_streaks.last_activity_date = v_today THEN public.user_streaks.current_streak
      WHEN public.user_streaks.last_activity_date = (v_today - INTERVAL '1 day')::date THEN public.user_streaks.current_streak + 1
      ELSE 1
    END,
    longest_streak = GREATEST(
      public.user_streaks.longest_streak,
      CASE
        WHEN public.user_streaks.last_activity_date = v_today THEN public.user_streaks.current_streak
        WHEN public.user_streaks.last_activity_date = (v_today - INTERVAL '1 day')::date THEN public.user_streaks.current_streak + 1
        ELSE 1
      END
    ),
    last_activity_date = v_today,
    total_activities = COALESCE(public.user_streaks.total_activities, 0) + 1,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_streak(UUID, TEXT) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- trial tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trial_tracking (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL,
  conversations_used INTEGER NOT NULL DEFAULT 0,
  max_trial_conversations INTEGER NOT NULL DEFAULT 5,
  has_seen_nudge BOOLEAN NOT NULL DEFAULT FALSE,
  is_converted BOOLEAN NOT NULL DEFAULT FALSE,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trial_tracking_user_unique UNIQUE (user_id)
);

ALTER TABLE public.trial_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own trial" ON public.trial_tracking;
CREATE POLICY "Users can view own trial"
  ON public.trial_tracking FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own trial" ON public.trial_tracking;
CREATE POLICY "Users can insert own trial"
  ON public.trial_tracking FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own trial" ON public.trial_tracking;
CREATE POLICY "Users can update own trial"
  ON public.trial_tracking FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can manage trials" ON public.trial_tracking;
CREATE POLICY "Service role can manage trials"
  ON public.trial_tracking FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trial_tracking_ends_at ON public.trial_tracking(trial_ends_at);
DROP TRIGGER IF EXISTS trial_tracking_updated_at ON public.trial_tracking;
CREATE TRIGGER trial_tracking_updated_at
  BEFORE UPDATE ON public.trial_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- user milestones compatibility
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_milestones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  celebration_shown BOOLEAN NOT NULL DEFAULT FALSE,
  is_earned BOOLEAN NOT NULL DEFAULT TRUE,
  is_celebrated BOOLEAN NOT NULL DEFAULT FALSE,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_milestones_user_type_unique UNIQUE (user_id, milestone_type)
);

ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own milestones" ON public.user_milestones;
CREATE POLICY "Users can view own milestones"
  ON public.user_milestones FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own milestones" ON public.user_milestones;
CREATE POLICY "Users can insert own milestones"
  ON public.user_milestones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own milestones" ON public.user_milestones;
CREATE POLICY "Users can update own milestones"
  ON public.user_milestones FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_milestones_updated_at ON public.user_milestones;
CREATE TRIGGER user_milestones_updated_at
  BEFORE UPDATE ON public.user_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- goals compatibility table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  name TEXT,
  area TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own goals compat" ON public.goals;
CREATE POLICY "Users can view own goals compat"
  ON public.goals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own goals compat" ON public.goals;
CREATE POLICY "Users can insert own goals compat"
  ON public.goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own goals compat" ON public.goals;
CREATE POLICY "Users can update own goals compat"
  ON public.goals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own goals compat" ON public.goals;
CREATE POLICY "Users can delete own goals compat"
  ON public.goals FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO public.goals (id, user_id, child_id, title, name, area, progress, completed, is_active, created_at, updated_at)
SELECT
  tg.id::text,
  tg.user_id,
  tg.child_id,
  tg.title,
  tg.title,
  tg.domain,
  COALESCE(tg.current_progress, 0),
  tg.status = 'completed',
  COALESCE(tg.is_active, tg.status = 'active'),
  tg.created_at,
  tg.updated_at
FROM public.treatment_goals tg
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS goals_updated_at ON public.goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- care plan goals / action items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.care_plan_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  target_frequency TEXT,
  current_progress INTEGER NOT NULL DEFAULT 0,
  target_progress INTEGER NOT NULL DEFAULT 100,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  order_index INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.care_plan_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own care plan goals" ON public.care_plan_goals;
CREATE POLICY "Users can view own care plan goals"
  ON public.care_plan_goals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own care plan goals" ON public.care_plan_goals;
CREATE POLICY "Users can insert own care plan goals"
  ON public.care_plan_goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own care plan goals" ON public.care_plan_goals;
CREATE POLICY "Users can update own care plan goals"
  ON public.care_plan_goals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own care plan goals" ON public.care_plan_goals;
CREATE POLICY "Users can delete own care plan goals"
  ON public.care_plan_goals FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO public.care_plan_goals (user_id, child_id, title, description, category, current_progress, target_progress, status, created_at, updated_at)
SELECT
  tg.user_id,
  tg.child_id,
  tg.title,
  tg.description,
  COALESCE(NULLIF(tg.domain, ''), 'other'),
  COALESCE(tg.current_progress, 0),
  100,
  CASE WHEN tg.status IN ('active', 'completed', 'paused', 'archived') THEN tg.status ELSE 'active' END,
  tg.created_at,
  tg.updated_at
FROM public.treatment_goals tg
WHERE NOT EXISTS (
  SELECT 1
  FROM public.care_plan_goals cpg
  WHERE cpg.user_id = tg.user_id
    AND cpg.child_id IS NOT DISTINCT FROM tg.child_id
    AND cpg.title = tg.title
);

DROP TRIGGER IF EXISTS care_plan_goals_updated_at ON public.care_plan_goals;
CREATE TRIGGER care_plan_goals_updated_at
  BEFORE UPDATE ON public.care_plan_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.care_plan_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_summary_id UUID REFERENCES public.visit_summaries(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'self-created',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.care_plan_action_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own care plan action items" ON public.care_plan_action_items;
CREATE POLICY "Users can view own care plan action items"
  ON public.care_plan_action_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own care plan action items" ON public.care_plan_action_items;
CREATE POLICY "Users can insert own care plan action items"
  ON public.care_plan_action_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own care plan action items" ON public.care_plan_action_items;
CREATE POLICY "Users can update own care plan action items"
  ON public.care_plan_action_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own care plan action items" ON public.care_plan_action_items;
CREATE POLICY "Users can delete own care plan action items"
  ON public.care_plan_action_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS care_plan_action_items_updated_at ON public.care_plan_action_items;
CREATE TRIGGER care_plan_action_items_updated_at
  BEFORE UPDATE ON public.care_plan_action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- memory compatibility
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_memories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  conversation_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_topics TEXT[] NOT NULL DEFAULT '{}'::text[],
  emotional_tone TEXT NOT NULL DEFAULT 'neutral',
  action_items TEXT[] NOT NULL DEFAULT '{}'::text[],
  facts_extracted TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.conversation_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own conversation memories" ON public.conversation_memories;
CREATE POLICY "Users can view own conversation memories"
  ON public.conversation_memories FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own conversation memories" ON public.conversation_memories;
CREATE POLICY "Users can insert own conversation memories"
  ON public.conversation_memories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own conversation memories" ON public.conversation_memories;
CREATE POLICY "Users can update own conversation memories"
  ON public.conversation_memories FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own conversation memories" ON public.conversation_memories;
CREATE POLICY "Users can delete own conversation memories"
  ON public.conversation_memories FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO public.conversation_memories (id, user_id, child_id, conversation_id, summary, key_topics, emotional_tone, action_items, created_at, updated_at)
SELECT
  cs.id,
  cs.user_id,
  cs.child_id,
  cs.conversation_id,
  cs.summary,
  COALESCE(cs.key_topics, '{}'::text[]),
  COALESCE(cs.emotional_tone, 'neutral'),
  COALESCE(cs.action_items, '{}'::text[]),
  cs.created_at,
  cs.created_at
FROM public.conversation_summaries cs
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS conversation_memories_updated_at ON public.conversation_memories;
CREATE TRIGGER conversation_memories_updated_at
  BEFORE UPDATE ON public.conversation_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- app support tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.screen_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  screen_name TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  duration_ms INTEGER,
  previous_screen TEXT,
  tier TEXT,
  device_type TEXT,
  interactions INTEGER NOT NULL DEFAULT 0,
  scroll_depth DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.screen_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own analytics" ON public.screen_analytics;
CREATE POLICY "Users can insert own analytics"
  ON public.screen_analytics FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can view own analytics" ON public.screen_analytics;
CREATE POLICY "Users can view own analytics"
  ON public.screen_analytics FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Service role reads all analytics" ON public.screen_analytics;
CREATE POLICY "Service role reads all analytics"
  ON public.screen_analytics FOR SELECT TO service_role
  USING (true);

CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_activities_unique UNIQUE (user_id, activity_type, activity_date)
);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own activities" ON public.user_activities;
CREATE POLICY "Users can view own activities"
  ON public.user_activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own activities" ON public.user_activities;
CREATE POLICY "Users can insert own activities"
  ON public.user_activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own activities" ON public.user_activities;
CREATE POLICY "Users can update own activities"
  ON public.user_activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_activities_updated_at ON public.user_activities;
CREATE TRIGGER user_activities_updated_at
  BEFORE UPDATE ON public.user_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.health_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  is_connected BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync TIMESTAMPTZ,
  permissions TEXT[] NOT NULL DEFAULT '{}'::text[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_integrations_user_platform_unique UNIQUE (user_id, platform)
);

ALTER TABLE public.health_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own health integrations" ON public.health_integrations;
CREATE POLICY "Users can manage own health integrations"
  ON public.health_integrations FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS health_integrations_updated_at ON public.health_integrations;
CREATE TRIGGER health_integrations_updated_at
  BEFORE UPDATE ON public.health_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.sleep_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  quality TEXT NOT NULL DEFAULT 'fair',
  bedtime TEXT,
  wake_time TEXT,
  interruptions INTEGER NOT NULL DEFAULT 0,
  deep_sleep_percent NUMERIC(5,2),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sleep_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own sleep records" ON public.sleep_records;
CREATE POLICY "Users can manage own sleep records"
  ON public.sleep_records FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- junior content compatibility
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.junior_activities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'sparkles',
  duration TEXT NOT NULL DEFAULT '5-10 min',
  skill_type TEXT NOT NULL DEFAULT 'sensory',
  level SMALLINT NOT NULL DEFAULT 0,
  session_size TEXT NOT NULL DEFAULT 'standard',
  unlocked BOOLEAN NOT NULL DEFAULT TRUE,
  tier TEXT NOT NULL DEFAULT 'core',
  voice_ready BOOLEAN NOT NULL DEFAULT FALSE,
  track TEXT NOT NULL DEFAULT 'Calm Corner',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.junior_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active junior activities" ON public.junior_activities;
CREATE POLICY "Anyone can read active junior activities"
  ON public.junior_activities FOR SELECT TO authenticated
  USING (is_active = true);
DROP POLICY IF EXISTS "Service role can manage junior activities" ON public.junior_activities;
CREATE POLICY "Service role can manage junior activities"
  ON public.junior_activities FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.junior_activities (id, title, description, icon, duration, skill_type, level, session_size, tier, voice_ready, track, sort_order, is_active)
VALUES
  ('calm-bubbles', 'Bubble Pop', 'Pop bubbles with gentle haptics to help settle a busy body.', 'sparkles', '2-4 min', 'sensory', 0, 'micro', 'core', false, 'Calm Corner', 10, true),
  ('calm-ripple', 'Ripple Touch', 'Tap and drag to create slow moving ripples and breathing circles.', 'droplets', '2-5 min', 'sensory', 0, 'micro', 'core', false, 'Calm Corner', 20, true),
  ('calm-breathe', 'Breathing Orb', 'Follow a soothing orb to breathe in, hold, and exhale.', 'circle', '2-3 min', 'sensory', 0, 'micro', 'core', true, 'Calm Corner', 30, true),
  ('reward-stars', 'Star Goal', 'Check progress toward a reward with confetti and celebration.', 'star', '1-2 min', 'routines', 0, 'micro', 'core', false, 'Rewards', 40, true),
  ('transition-first-then', 'First Then', 'See what is happening now and what comes next.', 'arrow-right', '1-2 min', 'routines', 0, 'micro', 'core', false, 'Transitions', 50, true)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS junior_activities_updated_at ON public.junior_activities;
CREATE TRIGGER junior_activities_updated_at
  BEFORE UPDATE ON public.junior_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- audit/action compatibility
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS user_role TEXT,
  ADD COLUMN IF NOT EXISTS resource_type TEXT,
  ADD COLUMN IF NOT EXISTS resource_id TEXT,
  ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS child_id UUID,
  ADD COLUMN IF NOT EXISTS provider_id UUID,
  ADD COLUMN IF NOT EXISTS success BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'goal',
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'self-created',
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS action_items_updated_at ON public.action_items;
CREATE TRIGGER action_items_updated_at
  BEFORE UPDATE ON public.action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- CentralReach sync status compatibility
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cr_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  next_sync_at TIMESTAMPTZ,
  records_synced INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cr_sync_status_unique UNIQUE (user_id, data_type, direction)
);

ALTER TABLE public.cr_sync_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own cr sync status" ON public.cr_sync_status;
CREATE POLICY "Users can view own cr sync status"
  ON public.cr_sync_status FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own cr sync status" ON public.cr_sync_status;
CREATE POLICY "Users can manage own cr sync status"
  ON public.cr_sync_status FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS cr_sync_status_updated_at ON public.cr_sync_status;
CREATE TRIGGER cr_sync_status_updated_at
  BEFORE UPDATE ON public.cr_sync_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
