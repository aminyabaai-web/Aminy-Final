-- Create the ENUMs for categories (safe if they already exist)
DO $$ BEGIN
  CREATE TYPE post_category AS ENUM ('wins', 'questions', 'tips', 'support', 'resources', 'bcba-qa');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE group_category AS ENUM ('diagnosis', 'age-group', 'topic', 'local');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. community_posts — already exists in remote DB with user_id column
-- Skip CREATE TABLE (it already exists with different schema)
-- The existing table uses user_id instead of author_id

-- Ensure RLS is enabled (idempotent)
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (safe if they don't exist)
DROP POLICY IF EXISTS "Anyone can view posts" ON community_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON community_posts;

-- Recreate policies using user_id (matching the existing table schema)
CREATE POLICY "Anyone can view posts"
  ON community_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can update their own posts"
  ON community_posts FOR UPDATE
  USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can delete their own posts"
  ON community_posts FOR DELETE
  USING (auth.uid() = user_id::uuid);

-- 2. community_groups
CREATE TABLE IF NOT EXISTS community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'topic',
  is_private BOOLEAN DEFAULT false,
  icon TEXT DEFAULT 'puzzle',
  member_count INTEGER DEFAULT 0,
  recent_activity TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view groups" ON community_groups;
CREATE POLICY "Anyone can view groups"
  ON community_groups FOR SELECT
  USING (true);

-- 3. community_events
CREATE TABLE IF NOT EXISTS community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  attendee_count INTEGER DEFAULT 0,
  is_virtual BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view events" ON community_events;
CREATE POLICY "Anyone can view events"
  ON community_events FOR SELECT
  USING (true);

-- 4. post_interactions (likes and bookmarks)
CREATE TABLE IF NOT EXISTS post_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_liked BOOLEAN DEFAULT false,
  is_bookmarked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all interactions" ON post_interactions;
DROP POLICY IF EXISTS "Users can manage their interactions" ON post_interactions;

CREATE POLICY "Users can view all interactions"
  ON post_interactions FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their interactions"
  ON post_interactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. group_members
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all group memberships" ON group_members;
DROP POLICY IF EXISTS "Users can manage their group memberships" ON group_members;

CREATE POLICY "Users can view all group memberships"
  ON group_members FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their group memberships"
  ON group_members FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. event_attendees
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES community_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rsvp_status TEXT DEFAULT 'attending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all event attendees" ON event_attendees;
DROP POLICY IF EXISTS "Users can manage their event attendance" ON event_attendees;

CREATE POLICY "Users can view all event attendees"
  ON event_attendees FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their event attendance"
  ON event_attendees FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
