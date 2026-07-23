-- Family Connect — parent-mediated family/buddy matching (Wave 3, "the village")
--
-- Two tables:
--   * family_connect_profiles — an explicit, opt-in discovery card. Deliberately
--     minimal PII: first name only, state only (no city/zip), child AGE BAND
--     (never DOB or exact age), focus areas + interests as free chips.
--   * family_connections — parent→parent hello requests. Recipient controls the
--     status; a decline is silent (the requester only ever sees 'pending', the
--     UI never surfaces 'declined' to them).
--
-- Privacy model:
--   * Connect profiles are readable ONLY by other opted-in users (you must show
--     your own card to see anyone else's) — enforced via a SECURITY DEFINER
--     helper because an EXISTS on the same table inside its own policy would
--     recurse through RLS.
--   * Blocks are respected in BOTH directions server-side: if either user has
--     blocked the other (user_blocks, 20260719000000), the profile is invisible
--     and new connection requests are rejected. user_blocks RLS hides rows
--     where blocker != auth.uid(), so the check also needs SECURITY DEFINER.
--   * Connection rows are visible to the two parties only.

-- ── Helper: is this user opted in to Family Connect? ─────────────────────────
-- SECURITY DEFINER to avoid RLS self-recursion on family_connect_profiles.
-- Hardened: only answers for the calling user (policies only ever ask about
-- auth.uid(), and this prevents probing other users' opt-in state directly).
CREATE OR REPLACE FUNCTION family_connect_opted_in(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT uid = auth.uid() AND EXISTS (
    SELECT 1 FROM family_connect_profiles p
    WHERE p.user_id = uid AND p.opted_in
  );
$$;

-- ── Helper: does a block exist in either direction? ──────────────────────────
-- SECURITY DEFINER because user_blocks RLS only exposes the caller's own rows;
-- respecting "they blocked me" requires reading the other direction too.
-- Hardened: returns block info only when the caller is one of the two users.
CREATE OR REPLACE FUNCTION family_connect_blocked_either_way(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (a = auth.uid() OR b = auth.uid()) AND EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_id = a AND ub.blocked_id = b)
       OR (ub.blocker_id = b AND ub.blocked_id = a)
  );
$$;

REVOKE EXECUTE ON FUNCTION family_connect_opted_in(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION family_connect_blocked_either_way(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION family_connect_opted_in(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION family_connect_blocked_either_way(UUID, UUID) TO authenticated;

-- ── family_connect_profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_connect_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  opted_in BOOLEAN NOT NULL DEFAULT true,
  -- First name only — the client enforces this on save; never a full name.
  display_name TEXT NOT NULL,
  -- Location is state-level only, by design. Never city/zip/coordinates.
  state TEXT,
  -- Age band like '4-6' — never an exact age or date of birth.
  child_age_band TEXT,
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  bio_line TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_connect_profiles_opted_in
  ON family_connect_profiles(opted_in) WHERE opted_in;

ALTER TABLE family_connect_profiles ENABLE ROW LEVEL SECURITY;

-- Readable by the owner, and by OTHER opted-in users (mutual visibility:
-- you must be discoverable to discover), unless a block exists either way.
DROP POLICY IF EXISTS "Opted-in users can view connect profiles" ON family_connect_profiles;
CREATE POLICY "Opted-in users can view connect profiles"
  ON family_connect_profiles FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      opted_in
      AND family_connect_opted_in(auth.uid())
      AND NOT family_connect_blocked_either_way(auth.uid(), user_id)
    )
  );

DROP POLICY IF EXISTS "Users can create own connect profile" ON family_connect_profiles;
CREATE POLICY "Users can create own connect profile"
  ON family_connect_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own connect profile" ON family_connect_profiles;
CREATE POLICY "Users can update own connect profile"
  ON family_connect_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own connect profile" ON family_connect_profiles;
CREATE POLICY "Users can delete own connect profile"
  ON family_connect_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ── family_connections ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  -- Optional short hello from the requester.
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_connection CHECK (requester_id != recipient_id)
);

-- One connection per pair, regardless of who asked first.
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_connections_pair
  ON family_connections (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));
CREATE INDEX IF NOT EXISTS idx_family_connections_requester ON family_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_family_connections_recipient ON family_connections(recipient_id);

ALTER TABLE family_connections ENABLE ROW LEVEL SECURITY;

-- Visible to the two parties only.
DROP POLICY IF EXISTS "Parties can view own connections" ON family_connections;
CREATE POLICY "Parties can view own connections"
  ON family_connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Only an opted-in user can send a hello, only as themselves, and never
-- across a block (either direction).
DROP POLICY IF EXISTS "Opted-in users can send connection requests" ON family_connections;
CREATE POLICY "Opted-in users can send connection requests"
  ON family_connections FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND family_connect_opted_in(auth.uid())
    AND NOT family_connect_blocked_either_way(requester_id, recipient_id)
  );

-- The recipient decides: accept or (silently) decline.
DROP POLICY IF EXISTS "Recipient can update connection status" ON family_connections;
CREATE POLICY "Recipient can update connection status"
  ON family_connections FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Either party can remove the connection (withdraw a hello / disconnect).
DROP POLICY IF EXISTS "Parties can delete own connections" ON family_connections;
CREATE POLICY "Parties can delete own connections"
  ON family_connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
