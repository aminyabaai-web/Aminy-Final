-- =============================================================================
-- Junior Activities CMS Table
-- Stores activity definitions that were previously hardcoded in the client.
-- Enables OTA content updates without app deploys.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.junior_activities (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  icon          TEXT NOT NULL DEFAULT 'sparkles',          -- emoji or lucide icon name
  duration      TEXT NOT NULL DEFAULT '5-10 min',          -- human-readable duration range
  skill_type    TEXT NOT NULL CHECK (skill_type IN (
                  'speech', 'social', 'routines', 'sensory', 'executive', 'aac'
                )),
  level         SMALLINT NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 3),
  session_size  TEXT NOT NULL DEFAULT 'standard' CHECK (session_size IN (
                  'micro', 'standard', 'extended'
                )),
  unlocked      BOOLEAN NOT NULL DEFAULT true,
  tier          TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN (
                  'starter', 'core', 'pro'
                )),
  voice_ready   BOOLEAN NOT NULL DEFAULT false,
  track         TEXT NOT NULL DEFAULT 'General',
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_junior_activities_track ON public.junior_activities (track);
CREATE INDEX IF NOT EXISTS idx_junior_activities_skill_type ON public.junior_activities (skill_type);
CREATE INDEX IF NOT EXISTS idx_junior_activities_level ON public.junior_activities (level);
CREATE INDEX IF NOT EXISTS idx_junior_activities_active ON public.junior_activities (is_active) WHERE is_active = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_junior_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_junior_activities_updated_at ON public.junior_activities;
CREATE TRIGGER trg_junior_activities_updated_at
  BEFORE UPDATE ON public.junior_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_junior_activities_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.junior_activities ENABLE ROW LEVEL SECURITY;

-- Public read: all authenticated users can read active activities
CREATE POLICY "Anyone can read active junior activities"
  ON public.junior_activities
  FOR SELECT
  USING (is_active = true);

-- Only service_role can insert/update/delete (admin/CMS operations)
CREATE POLICY "Service role can manage junior activities"
  ON public.junior_activities
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- Junior Adaptive Difficulty Tracking
-- Stores per-child, per-domain accuracy history for ML-adaptive difficulty
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.junior_difficulty_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      TEXT NOT NULL,
  parent_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_domain  TEXT NOT NULL CHECK (skill_domain IN (
                  'speech', 'social', 'routines', 'sensory', 'executive', 'aac'
                )),
  correct       BOOLEAN NOT NULL,
  level_at_time SMALLINT NOT NULL DEFAULT 0,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_difficulty_history_child_domain
  ON public.junior_difficulty_history (child_id, skill_domain, recorded_at DESC);

ALTER TABLE public.junior_difficulty_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own child difficulty history"
  ON public.junior_difficulty_history
  FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own child difficulty history"
  ON public.junior_difficulty_history
  FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- =============================================================================
-- Junior Achievements / Badges
-- Tracks unlocked badges per child
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.junior_achievements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      TEXT NOT NULL,
  parent_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id      TEXT NOT NULL,
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  progress      JSONB DEFAULT '{}',   -- { current: number, target: number }
  UNIQUE (child_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_child
  ON public.junior_achievements (child_id);

ALTER TABLE public.junior_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own child achievements"
  ON public.junior_achievements
  FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can manage own child achievements"
  ON public.junior_achievements
  FOR ALL
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);
