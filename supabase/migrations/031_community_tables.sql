-- ============================================================================
-- COMMUNITY TABLES
-- Real persistence for community posts, comments, likes, follows
-- ============================================================================

-- Community posts table
-- [MIGRATION FIX] Table community_posts created in earlier migration.
-- Adding columns that would have been lost due to IF NOT EXISTS:
-- Original CREATE TABLE commented out below.
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'general';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Original CREATE TABLE (commented out, columns added above):
-- CREATE TABLE IF NOT EXISTS community_posts (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   content TEXT NOT NULL,
--   image_url TEXT,
--   post_type TEXT DEFAULT 'general',
--   tags TEXT[] DEFAULT '{}',
--   is_anonymous BOOLEAN DEFAULT false,
--   display_name TEXT, -- For anonymous posts
--   like_count INTEGER DEFAULT 0,
--   comment_count INTEGER DEFAULT 0,
--   is_featured BOOLEAN DEFAULT false,
--   is_pinned BOOLEAN DEFAULT false,
--   moderation_status TEXT DEFAULT 'approved',
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW(),
-- 
--   CONSTRAINT valid_post_type CHECK (post_type IN (
--     'general', 'win', 'question', 'tip', 'support', 'milestone', 'resource'
--   )),
--   CONSTRAINT valid_moderation_status CHECK (moderation_status IN (
--     'pending', 'approved', 'flagged', 'removed'
--   ))
-- );


-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON community_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_community_posts_featured ON community_posts(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_community_posts_tags ON community_posts USING GIN(tags);

-- Comments table
-- [MIGRATION FIX] Table community_comments created in earlier migration.
-- Adding columns that would have been lost due to IF NOT EXISTS:
-- Original CREATE TABLE commented out below.
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Original CREATE TABLE (commented out, columns added above):
-- CREATE TABLE IF NOT EXISTS community_comments (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
--   content TEXT NOT NULL,
--   is_anonymous BOOLEAN DEFAULT false,
--   display_name TEXT,
--   like_count INTEGER DEFAULT 0,
--   moderation_status TEXT DEFAULT 'approved',
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW(),
-- 
--   CONSTRAINT valid_comment_moderation CHECK (moderation_status IN (
--     'pending', 'approved', 'flagged', 'removed'
--   ))
-- );


CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user ON community_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON community_comments(parent_comment_id);

-- Likes table (for both posts and comments)
-- [MIGRATION FIX] Table community_likes created in earlier migration.
-- Adding columns that would have been lost due to IF NOT EXISTS:
-- Original CREATE TABLE commented out below.
ALTER TABLE community_likes ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE;

-- Original CREATE TABLE (commented out, columns added above):
-- CREATE TABLE IF NOT EXISTS community_likes (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
--   comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
-- 
--   -- Can only like one thing at a time
--   CONSTRAINT like_target CHECK (
--     (post_id IS NOT NULL AND comment_id IS NULL) OR
--     (post_id IS NULL AND comment_id IS NOT NULL)
--   ),
--   -- One like per user per item
--   UNIQUE(user_id, post_id),
--   UNIQUE(user_id, comment_id)
-- );


CREATE INDEX IF NOT EXISTS idx_community_likes_post ON community_likes(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_likes_comment ON community_likes(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_likes_user ON community_likes(user_id);

-- Follows table
CREATE TABLE IF NOT EXISTS community_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_community_follows_follower ON community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_following ON community_follows(following_id);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS community_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_community_bookmarks_user ON community_bookmarks(user_id);

-- Reports/flags table
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT report_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  CONSTRAINT valid_report_status CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed'))
);

-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
CREATE POLICY "Anyone can view approved posts"
  ON community_posts FOR SELECT
  USING (moderation_status = 'approved');

CREATE POLICY "Users can create posts"
  ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON community_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Anyone can view approved comments"
  ON community_comments FOR SELECT
  USING (moderation_status = 'approved');

CREATE POLICY "Users can create comments"
  ON community_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON community_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON community_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for likes
CREATE POLICY "Anyone can view likes"
  ON community_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own likes"
  ON community_likes FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for follows
CREATE POLICY "Anyone can view follows"
  ON community_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own follows"
  ON community_follows FOR ALL
  USING (auth.uid() = follower_id);

-- RLS Policies for bookmarks
CREATE POLICY "Users can manage own bookmarks"
  ON community_bookmarks FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for reports
CREATE POLICY "Users can create reports"
  ON community_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON community_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin', 'moderator')
    )
  );

-- Functions to update counts
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for count updates
DROP TRIGGER IF EXISTS trg_update_post_like_count ON community_likes;
CREATE TRIGGER trg_update_post_like_count
  AFTER INSERT OR DELETE ON community_likes
  FOR EACH ROW
  WHEN (NEW.post_id IS NOT NULL OR OLD.post_id IS NOT NULL)
  EXECUTE FUNCTION update_post_like_count();

DROP TRIGGER IF EXISTS trg_update_post_comment_count ON community_comments;
CREATE TRIGGER trg_update_post_comment_count
  AFTER INSERT OR DELETE ON community_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

COMMENT ON TABLE community_posts IS 'Community feed posts with support for wins, questions, tips, etc.';
COMMENT ON TABLE community_comments IS 'Comments on community posts with threading support';
COMMENT ON TABLE community_likes IS 'Likes for posts and comments';
COMMENT ON TABLE community_follows IS 'User follow relationships';
