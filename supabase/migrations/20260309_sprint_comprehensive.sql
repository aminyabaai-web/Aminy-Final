-- =============================================================================
-- Migration: Comprehensive Sprint (March 9, 2026)
--
-- Adds:
-- 1. RLS policies to ALL tables missing them
-- 2. Junior activities CMS table (move from hardcoded)
-- 3. Conversations table (persist chat history to Supabase)
-- 4. Screen analytics tracking table
-- 5. Performance indexes on high-query columns
-- 6. Adaptive difficulty tracking table
-- 7. AI proactive insights table
-- =============================================================================

-- ============================================
-- 1. RLS POLICIES FOR ALL TABLES
-- ============================================

-- Helper: Enable RLS on tables that don't have it yet
-- We use DO blocks to avoid errors if table doesn't exist

DO $$ BEGIN
  -- profiles
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
      CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
      CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
      CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
    END IF;
  END IF;

  -- children
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'children' AND schemaname = 'public') THEN
    ALTER TABLE children ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'Users can view own children') THEN
      CREATE POLICY "Users can view own children" ON children FOR SELECT TO authenticated USING (parent_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'Users can manage own children') THEN
      CREATE POLICY "Users can manage own children" ON children FOR ALL TO authenticated USING (parent_id = auth.uid());
    END IF;
  END IF;

  -- subscriptions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'subscriptions' AND schemaname = 'public') THEN
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Users can view own subscription') THEN
      CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'System can manage subscriptions') THEN
      CREATE POLICY "System can manage subscriptions" ON subscriptions FOR ALL TO service_role USING (true);
    END IF;
  END IF;

  -- care_plans
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'care_plans' AND schemaname = 'public') THEN
    ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'care_plans' AND policyname = 'Users can view own care plans') THEN
      CREATE POLICY "Users can view own care plans" ON care_plans FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'care_plans' AND policyname = 'Users can manage own care plans') THEN
      CREATE POLICY "Users can manage own care plans" ON care_plans FOR ALL TO authenticated USING (user_id = auth.uid());
    END IF;
  END IF;

  -- telehealth_sessions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'telehealth_sessions' AND schemaname = 'public') THEN
    ALTER TABLE telehealth_sessions ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'telehealth_sessions' AND policyname = 'Users can view own telehealth sessions') THEN
      CREATE POLICY "Users can view own telehealth sessions" ON telehealth_sessions FOR SELECT TO authenticated
        USING (patient_id = auth.uid() OR provider_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'telehealth_sessions' AND policyname = 'Users can create telehealth sessions') THEN
      CREATE POLICY "Users can create telehealth sessions" ON telehealth_sessions FOR INSERT TO authenticated
        WITH CHECK (patient_id = auth.uid());
    END IF;
  END IF;

  -- audit_logs
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_logs' AND schemaname = 'public') THEN
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Users can view own audit logs') THEN
      CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'System can insert audit logs') THEN
      CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
  END IF;

  -- prior_auth_requests
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'prior_auth_requests' AND schemaname = 'public') THEN
    ALTER TABLE prior_auth_requests ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prior_auth_requests' AND policyname = 'Users can view own prior auths') THEN
      CREATE POLICY "Users can view own prior auths" ON prior_auth_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prior_auth_requests' AND policyname = 'Users can manage own prior auths') THEN
      CREATE POLICY "Users can manage own prior auths" ON prior_auth_requests FOR ALL TO authenticated USING (user_id = auth.uid());
    END IF;
  END IF;

  -- superbills
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'superbills' AND schemaname = 'public') THEN
    ALTER TABLE superbills ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'superbills' AND policyname = 'Users can view own superbills') THEN
      CREATE POLICY "Users can view own superbills" ON superbills FOR SELECT TO authenticated
        USING (patient_id = auth.uid() OR provider_id = auth.uid());
    END IF;
  END IF;

  -- provider_credentials
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'provider_credentials' AND schemaname = 'public') THEN
    ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_credentials' AND policyname = 'Providers can view own credentials') THEN
      CREATE POLICY "Providers can view own credentials" ON provider_credentials FOR SELECT TO authenticated USING (provider_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_credentials' AND policyname = 'Providers can manage own credentials') THEN
      CREATE POLICY "Providers can manage own credentials" ON provider_credentials FOR ALL TO authenticated USING (provider_id = auth.uid());
    END IF;
  END IF;

  -- outcomes_tracking
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'outcomes_tracking' AND schemaname = 'public') THEN
    ALTER TABLE outcomes_tracking ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'outcomes_tracking' AND policyname = 'Users can view own outcomes') THEN
      CREATE POLICY "Users can view own outcomes" ON outcomes_tracking FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'outcomes_tracking' AND policyname = 'Users can manage own outcomes') THEN
      CREATE POLICY "Users can manage own outcomes" ON outcomes_tracking FOR ALL TO authenticated USING (user_id = auth.uid());
    END IF;
  END IF;

  -- trial_tracking
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'trial_tracking' AND schemaname = 'public') THEN
    ALTER TABLE trial_tracking ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trial_tracking' AND policyname = 'Users can view own trial') THEN
      CREATE POLICY "Users can view own trial" ON trial_tracking FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trial_tracking' AND policyname = 'System can manage trials') THEN
      CREATE POLICY "System can manage trials" ON trial_tracking FOR ALL TO service_role USING (true);
    END IF;
  END IF;

  -- organizations (from 039)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'organizations' AND schemaname = 'public') THEN
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Org members can view org') THEN
      CREATE POLICY "Org members can view org" ON organizations FOR SELECT TO authenticated
        USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
    END IF;
  END IF;

  -- organization_members
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'organization_members' AND schemaname = 'public') THEN
    ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_members' AND policyname = 'Members can view own membership') THEN
      CREATE POLICY "Members can view own membership" ON organization_members FOR SELECT TO authenticated
        USING (user_id = auth.uid());
    END IF;
  END IF;

END $$;


-- ============================================
-- 2. JUNIOR ACTIVITIES CMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS junior_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎯',
  duration TEXT NOT NULL DEFAULT '5 min',
  skill_type TEXT NOT NULL CHECK (skill_type IN (
    'speech', 'social', 'routines', 'sensory', 'executive', 'aac', 'prosody', 'fluency', 'regulation'
  )),
  level INT NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 3),
  session_size TEXT NOT NULL DEFAULT 'standard' CHECK (session_size IN ('micro', 'standard', 'extended')),
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'core', 'pro', 'proplus')),
  track TEXT NOT NULL CHECK (track IN (
    'speech', 'social', 'routines', 'sensory', 'executive', 'aac', 'prosody', 'fluency', 'all'
  )),
  voice_ready BOOLEAN NOT NULL DEFAULT false,
  unlocked BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  -- Content for the activity
  instructions JSONB DEFAULT '[]',
  prompts JSONB DEFAULT '[]',
  target_words JSONB DEFAULT '[]',
  reward_coins INT NOT NULL DEFAULT 3,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE junior_activities ENABLE ROW LEVEL SECURITY;

-- Activities are readable by all authenticated users
CREATE POLICY "Anyone can view active activities" ON junior_activities
  FOR SELECT TO authenticated USING (is_active = true);

-- Only admins/service role can manage activities
CREATE POLICY "Service role manages activities" ON junior_activities
  FOR ALL TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_jr_activities_track ON junior_activities(track);
CREATE INDEX IF NOT EXISTS idx_jr_activities_skill ON junior_activities(skill_type);
CREATE INDEX IF NOT EXISTS idx_jr_activities_tier ON junior_activities(tier);
CREATE INDEX IF NOT EXISTS idx_jr_activities_level ON junior_activities(level);
CREATE INDEX IF NOT EXISTS idx_jr_activities_sort ON junior_activities(sort_order);


-- ============================================
-- 3. CONVERSATIONS TABLE (Persist Chat History)
-- ============================================

-- [MIGRATION FIX] Table conversations created in earlier migration.
-- Adding columns that would have been lost due to IF NOT EXISTS:
-- Original CREATE TABLE commented out below.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS messages JSONB NOT NULL DEFAULT '[]';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_count INT NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS facts_extracted JSONB DEFAULT '[]';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'crisis'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- Original CREATE TABLE (commented out, columns added above):
-- CREATE TABLE IF NOT EXISTS conversations (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   child_id UUID REFERENCES children(id) ON DELETE SET NULL,
--   title TEXT DEFAULT 'New Conversation',
--   messages JSONB NOT NULL DEFAULT '[]',
--   message_count INT NOT NULL DEFAULT 0,
--   -- AI context
--   facts_extracted JSONB DEFAULT '[]',
--   sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'crisis')),
--   topics TEXT[] DEFAULT '{}',
--   -- Metadata
--   last_message_at TIMESTAMPTZ,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );


ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_child ON conversations(child_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);


-- ============================================
-- 4. SCREEN ANALYTICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS screen_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  screen_name TEXT NOT NULL,
  -- Timing
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  duration_ms INT,
  -- Context
  previous_screen TEXT,
  tier TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  -- Interaction
  interactions INT DEFAULT 0,
  scroll_depth FLOAT DEFAULT 0,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE screen_analytics ENABLE ROW LEVEL SECURITY;

-- Users can insert their own analytics
CREATE POLICY "Users can insert own analytics" ON screen_analytics
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Service role can read all analytics (for dashboards)
CREATE POLICY "Service role reads all analytics" ON screen_analytics
  FOR SELECT TO service_role USING (true);

-- Users can read their own analytics
CREATE POLICY "Users can view own analytics" ON screen_analytics
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_screen_analytics_user ON screen_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_screen_analytics_screen ON screen_analytics(screen_name);
CREATE INDEX IF NOT EXISTS idx_screen_analytics_session ON screen_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_screen_analytics_entered ON screen_analytics(entered_at DESC);


-- ============================================
-- 5. ADAPTIVE DIFFICULTY TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS adaptive_difficulty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  skill_domain TEXT NOT NULL,
  -- Current state
  current_level INT NOT NULL DEFAULT 0 CHECK (current_level BETWEEN 0 AND 3),
  -- Rolling accuracy (last 10 attempts)
  recent_attempts JSONB NOT NULL DEFAULT '[]', -- [{correct: bool, timestamp: ISO, activityId: uuid}]
  rolling_accuracy FLOAT NOT NULL DEFAULT 0.5,
  -- Thresholds (configurable per child)
  level_up_threshold FLOAT NOT NULL DEFAULT 0.8,   -- >80% accuracy = level up
  level_down_threshold FLOAT NOT NULL DEFAULT 0.4,  -- <40% accuracy = level down
  -- History
  level_changes JSONB NOT NULL DEFAULT '[]', -- [{from: int, to: int, reason: string, timestamp: ISO}]
  total_attempts INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  -- Metadata
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(child_id, skill_domain)
);

ALTER TABLE adaptive_difficulty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view child difficulty" ON adaptive_difficulty
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

CREATE POLICY "Parents can manage child difficulty" ON adaptive_difficulty
  FOR ALL TO authenticated
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_adaptive_child ON adaptive_difficulty(child_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_domain ON adaptive_difficulty(skill_domain);


-- ============================================
-- 6. AI PROACTIVE INSIGHTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  -- Insight content
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'daily_tip', 'progress_celebration', 'strategy_suggestion',
    'pattern_detected', 'milestone_approaching', 'care_plan_update'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  action_url TEXT, -- Deep link to relevant screen
  -- State
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  -- Source data
  source_data JSONB DEFAULT '{}',
  confidence FLOAT DEFAULT 0.5,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON ai_insights
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own insights" ON ai_insights
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System can create insights" ON ai_insights
  FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_insights_user ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_unread ON ai_insights(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_insights_type ON ai_insights(insight_type);


-- ============================================
-- 7. PERFORMANCE INDEXES ON EXISTING TABLES
-- ============================================

-- Add indexes only if the tables exist
DO $$ BEGIN
  -- profiles
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
    CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);
  END IF;

  -- children
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'children') THEN
    CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
  END IF;

  -- care_plans
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'care_plans') THEN
    CREATE INDEX IF NOT EXISTS idx_care_plans_user ON care_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_care_plans_child ON care_plans(child_id);
  END IF;

  -- telehealth_sessions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'telehealth_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_telehealth_patient ON telehealth_sessions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_telehealth_provider ON telehealth_sessions(provider_id);
    CREATE INDEX IF NOT EXISTS idx_telehealth_scheduled ON telehealth_sessions(scheduled_at);
  END IF;

  -- audit_logs
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
  END IF;

  -- jr_sessions (if exists from earlier migration)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'jr_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_jr_sessions_child ON jr_sessions(child_id);
    CREATE INDEX IF NOT EXISTS idx_jr_sessions_created ON jr_sessions(created_at DESC);
  END IF;

  -- community tables
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'community_posts') THEN
    CREATE INDEX IF NOT EXISTS idx_posts_user ON community_posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_category ON community_posts(category);
  END IF;
END $$;


-- ============================================
-- 8. UPDATE TRIGGERS FOR NEW TABLES
-- ============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Junior activities
DROP TRIGGER IF EXISTS jr_activities_updated ON junior_activities;
CREATE TRIGGER jr_activities_updated
  BEFORE UPDATE ON junior_activities
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Conversations
DROP TRIGGER IF EXISTS conversations_updated ON conversations;
CREATE TRIGGER conversations_updated
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Adaptive difficulty
DROP TRIGGER IF EXISTS adaptive_difficulty_updated ON adaptive_difficulty;
CREATE TRIGGER adaptive_difficulty_updated
  BEFORE UPDATE ON adaptive_difficulty
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE junior_activities IS 'CMS-managed Junior activities - replaces hardcoded array';
COMMENT ON TABLE conversations IS 'Persisted AI conversation history - replaces localStorage';
COMMENT ON TABLE screen_analytics IS 'Screen-level usage analytics for product insights';
COMMENT ON TABLE adaptive_difficulty IS 'ML-adaptive difficulty tracking per child per skill domain';
COMMENT ON TABLE ai_insights IS 'AI-generated proactive insights and tips for parents';
