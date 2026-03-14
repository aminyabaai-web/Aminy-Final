-- =============================================================================
-- Migration: Workflow Truth Core (March 11, 2026)
--
-- Establishes backend-authoritative storage for the caregiver core workflow:
--   children -> ai conversations/memory -> daily plan -> Junior progress -> caregiver summary
-- =============================================================================

-- ============================================
-- 1. Conversation compatibility map
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_compat_map (
  ai_conversation_id TEXT PRIMARY KEY REFERENCES ai_conversations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE conversation_compat_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversation compat" ON conversation_compat_map;
CREATE POLICY "Users can view own conversation compat"
  ON conversation_compat_map FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own conversation compat" ON conversation_compat_map;
CREATE POLICY "Users can insert own conversation compat"
  ON conversation_compat_map FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own conversation compat" ON conversation_compat_map;
CREATE POLICY "Users can update own conversation compat"
  ON conversation_compat_map FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_conv_compat_user ON conversation_compat_map(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_compat_child ON conversation_compat_map(child_id);

DROP TRIGGER IF EXISTS conversation_compat_map_updated_at ON conversation_compat_map;
CREATE TRIGGER conversation_compat_map_updated_at
  BEFORE UPDATE ON conversation_compat_map
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 2. Daily plan snapshots
-- ============================================

CREATE TABLE IF NOT EXISTS daily_plan_snapshots (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
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

ALTER TABLE daily_plan_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily plan snapshots" ON daily_plan_snapshots;
CREATE POLICY "Users can view own daily plan snapshots"
  ON daily_plan_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own daily plan snapshots" ON daily_plan_snapshots;
CREATE POLICY "Users can insert own daily plan snapshots"
  ON daily_plan_snapshots FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own daily plan snapshots" ON daily_plan_snapshots;
CREATE POLICY "Users can update own daily plan snapshots"
  ON daily_plan_snapshots FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_daily_plan_snapshots_user_child_date
  ON daily_plan_snapshots(user_id, child_id, plan_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_plan_snapshots_status
  ON daily_plan_snapshots(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_plan_snapshots_active_unique
  ON daily_plan_snapshots(user_id, child_id, plan_date)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS daily_plan_snapshots_updated_at ON daily_plan_snapshots;
CREATE TRIGGER daily_plan_snapshots_updated_at
  BEFORE UPDATE ON daily_plan_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 3. Caregiver summaries
-- ============================================

CREATE TABLE IF NOT EXISTS caregiver_summaries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
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

ALTER TABLE caregiver_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own caregiver summaries" ON caregiver_summaries;
CREATE POLICY "Users can view own caregiver summaries"
  ON caregiver_summaries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own caregiver summaries" ON caregiver_summaries;
CREATE POLICY "Users can insert own caregiver summaries"
  ON caregiver_summaries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own caregiver summaries" ON caregiver_summaries;
CREATE POLICY "Users can update own caregiver summaries"
  ON caregiver_summaries FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_caregiver_summaries_user_child_period
  ON caregiver_summaries(user_id, child_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_caregiver_summaries_created
  ON caregiver_summaries(created_at DESC);

DROP TRIGGER IF EXISTS caregiver_summaries_updated_at ON caregiver_summaries;
CREATE TRIGGER caregiver_summaries_updated_at
  BEFORE UPDATE ON caregiver_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 4. Routine completions: link daily-plan items
-- ============================================

ALTER TABLE routine_completions ADD COLUMN IF NOT EXISTS plan_snapshot_id TEXT REFERENCES daily_plan_snapshots(id) ON DELETE SET NULL;
ALTER TABLE routine_completions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_routine_completions_plan_snapshot
  ON routine_completions(plan_snapshot_id);

