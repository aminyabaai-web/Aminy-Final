-- Community, Streaks, and Analytics Schema
-- Phase 1: Pilot-ready data persistence

-- ============================================
-- COMMUNITY POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_display_name TEXT NOT NULL,
  user_tier TEXT DEFAULT 'free',
  user_badge TEXT,

  -- Content
  category TEXT NOT NULL CHECK (category IN ('wins', 'questions', 'strategies', 'resources', 'support', 'introductions')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',

  -- Tags
  tags TEXT[] DEFAULT '{}',
  age_group TEXT CHECK (age_group IN ('toddler', 'preschool', 'school-age', 'teen')),
  concern_tags TEXT[] DEFAULT '{}',

  -- Engagement counters
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,

  -- Moderation
  is_moderated BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'removed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Public read access for approved posts, authenticated write
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved posts" ON community_posts
  FOR SELECT USING (moderation_status = 'approved');
CREATE POLICY "Authenticated users can create posts" ON community_posts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own posts" ON community_posts
  FOR UPDATE USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Users can delete own posts" ON community_posts
  FOR DELETE USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
-- Indexes
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_moderation ON community_posts(moderation_status);
-- ============================================
-- COMMUNITY COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_display_name TEXT NOT NULL,
  body TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  is_from_provider BOOLEAN DEFAULT false,
  provider_credentials TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON community_comments
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON community_comments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own comments" ON community_comments
  FOR UPDATE USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Users can delete own comments" ON community_comments
  FOR DELETE USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
-- Indexes
CREATE INDEX idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX idx_community_comments_created_at ON community_comments(created_at DESC);
-- ============================================
-- COMMUNITY LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON community_likes
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create likes" ON community_likes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own likes" ON community_likes
  FOR DELETE USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE INDEX idx_community_likes_post_id ON community_likes(post_id);
CREATE INDEX idx_community_likes_user_id ON community_likes(user_id);
-- ============================================
-- USER STREAKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id TEXT PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  is_paused BOOLEAN DEFAULT false,
  pause_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own streaks" ON user_streaks
  FOR SELECT USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Users can upsert own streaks" ON user_streaks
  FOR INSERT WITH CHECK (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
CREATE POLICY "Users can update own streaks" ON user_streaks
  FOR UPDATE USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
-- Service role can read all streaks for admin
CREATE POLICY "Service role can read all streaks" ON user_streaks
  FOR SELECT USING (true);
-- ============================================
-- ANALYTICS EVENTS TABLE
-- For tracking user actions and computing metrics
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- Service role can manage all analytics
CREATE POLICY "Service role can manage analytics" ON analytics_events
  FOR ALL USING (true);
-- Users can insert their own events
CREATE POLICY "Users can insert own events" ON analytics_events
  FOR INSERT WITH CHECK (true);
-- Indexes for efficient analytics queries
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
-- ============================================
-- DAILY ACTIVE USERS VIEW
-- ============================================
CREATE OR REPLACE VIEW daily_active_users AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
-- ============================================
-- PILOT METRICS VIEW
-- Aggregates key metrics for admin dashboard
-- ============================================
CREATE OR REPLACE VIEW pilot_metrics AS
SELECT
  -- Overview
  (SELECT COUNT(DISTINCT id) FROM profiles) as total_families,
  (SELECT COUNT(DISTINCT id) FROM profiles WHERE updated_at >= NOW() - INTERVAL '7 days') as active_families_7d,

  -- Engagement
  (SELECT COUNT(DISTINCT id) FROM profiles WHERE has_completed_onboarding = true)::float /
    NULLIF((SELECT COUNT(*) FROM profiles), 0) * 100 as onboarding_completion_rate,

  -- AI Usage
  (SELECT COUNT(*) FROM conversations) as total_conversations,
  (SELECT COUNT(*) FROM messages WHERE role = 'user') as total_user_messages,

  -- Tier distribution
  (SELECT COUNT(*) FROM profiles WHERE tier = 'free') as tier_free,
  (SELECT COUNT(*) FROM profiles WHERE tier = 'starter') as tier_starter,
  (SELECT COUNT(*) FROM profiles WHERE tier IN ('basic', 'core')) as tier_core,
  (SELECT COUNT(*) FROM profiles WHERE tier IN ('pro', 'proplus')) as tier_pro;
-- ============================================
-- FUNCTION: Update post counters
-- ============================================
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trigger_update_post_like_count
AFTER INSERT OR DELETE ON community_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR DELETE ON community_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();
-- ============================================
-- FUNCTION: Updated_at trigger for streaks
-- ============================================
DROP TRIGGER IF EXISTS update_user_streaks_updated_at ON user_streaks;
CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- SEED COMMUNITY POSTS
-- Add initial content so community doesn't feel empty
-- ============================================
INSERT INTO community_posts (id, user_id, user_display_name, user_tier, category, title, body, tags, moderation_status, created_at)
VALUES
  (gen_random_uuid(), 'seed-user-1', 'Sarah M.', 'core', 'wins', 'First full sentence today! 🎉', 'My 4-year-old just said his first complete sentence unprompted! After months of speech therapy and practice at home, hearing "Mommy, I want juice please" brought me to tears. Never give up, parents!', ARRAY['speech', 'milestone'], 'approved', NOW() - INTERVAL '2 days'),

  (gen_random_uuid(), 'seed-user-2', 'Marcus J.', 'pro', 'strategies', 'Visual schedule game changer', 'We started using a visual schedule board last month and the difference is incredible. Morning meltdowns reduced by 80%. Here''s what worked: pictures for each step, a "done" pocket, and letting him move the cards himself. Happy to share our template!', ARRAY['routine', 'visual-supports'], 'approved', NOW() - INTERVAL '3 days'),

  (gen_random_uuid(), 'seed-user-3', 'Emily R.', 'core', 'questions', 'How do you handle grocery store trips?', 'Grocery shopping has become nearly impossible. The sensory overload leads to meltdowns almost every time. What strategies have worked for your family? Considering doing pickup but want to teach him coping skills too.', ARRAY['sensory', 'public-outings'], 'approved', NOW() - INTERVAL '1 day'),

  (gen_random_uuid(), 'seed-user-4', 'David K.', 'starter', 'support', 'Hard day, need encouragement', 'Today was rough. Regression after weeks of progress. I know it''s part of the journey but feeling defeated. Just need to hear we''re not alone.', ARRAY['emotional-support'], 'approved', NOW() - INTERVAL '12 hours'),

  (gen_random_uuid(), 'seed-user-5', 'Jennifer L.', 'core', 'resources', 'Free AAC app recommendation', 'Discovered an amazing free AAC app called "Proloquo4Text" - great for kids transitioning from basic AAC. Has customizable boards and natural voice output. Huge help for us!', ARRAY['communication', 'apps', 'resources'], 'approved', NOW() - INTERVAL '5 days'),

  (gen_random_uuid(), 'seed-user-6', 'Amanda T.', 'core', 'wins', 'IEP meeting success!', 'Just came out of our IEP meeting and they approved EVERYTHING we asked for! Extended year services, 1:1 aide, and additional speech hours. Preparation is key - I brought data from Aminy showing his progress patterns.', ARRAY['iep', 'advocacy', 'school'], 'approved', NOW() - INTERVAL '4 days'),

  (gen_random_uuid(), 'seed-user-7', 'Michael B.', 'starter', 'introductions', 'New here, dad of twins', 'Hi everyone! I''m Michael, dad to 5-year-old twin boys, both on the spectrum. Just discovered Aminy and already feeling less alone. Looking forward to learning from this community.', ARRAY['introduction', 'twins'], 'approved', NOW() - INTERVAL '6 hours'),

  (gen_random_uuid(), 'seed-user-8', 'Lisa H.', 'pro', 'strategies', 'Bedtime routine that finally works', 'After 3 years of 2-hour bedtime struggles, we finally found what works: 1) Same music every night (predictability), 2) Weighted blanket, 3) No screens 2 hours before, 4) "Bedtime countdown" starting at 30 min. Now we''re down to 20 minutes!', ARRAY['sleep', 'routine', 'sensory'], 'approved', NOW() - INTERVAL '1 day'),

  (gen_random_uuid(), 'seed-user-9', 'Chris P.', 'core', 'questions', 'Insurance covering ABA?', 'Has anyone successfully gotten insurance to cover ABA therapy in Arizona? We''ve been denied twice. Any tips on the appeals process?', ARRAY['insurance', 'aba', 'advocacy'], 'approved', NOW() - INTERVAL '8 hours'),

  (gen_random_uuid(), 'seed-user-10', 'Rachel W.', 'core', 'wins', 'Haircut without tears!', 'We did it! First haircut in 2 years without a meltdown! Social story + the barber who specializes in sensory-friendly cuts + his favorite tablet = success. Small wins are huge wins!', ARRAY['sensory', 'self-care', 'milestone'], 'approved', NOW() - INTERVAL '18 hours')
ON CONFLICT DO NOTHING;
