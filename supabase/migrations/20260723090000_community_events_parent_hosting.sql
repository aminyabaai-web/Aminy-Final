-- Community events: parent hosting + village seeding (Wave 3)
--
-- LIVE-SCHEMA FINDINGS (verified via Supabase MCP, 2026-07-23):
--   * community_events uses column `date` (NOT `event_date`). Client code that
--     queried `event_date` silently never loaded events — the CLIENT has been
--     fixed to query `date` (CommunityHub.tsx, CommunityForYou.tsx,
--     community-service.ts). This migration deliberately does NOT rename the
--     column; `date` is the canonical name.
--   * community_events had ONLY a SELECT policy — no INSERT/UPDATE/DELETE, so
--     parents could not create or cancel events at all. Fixed below.
--   * community_events lacked any creator/host/geo/capacity columns needed for
--     parent-hosted meetups. Added below (additive, IF NOT EXISTS).
--   * event_attendees live schema matches the 20260225 migration and its RLS
--     already works (auth.uid() = user_id) — no changes needed there, but
--     attendee_count on community_events was never maintained server-side;
--     a trigger now keeps it in sync with event_attendees.
--
-- Idempotent: safe to re-run.

-- 1. Additive columns for parent-hosted events
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS host_name text;
-- park | library | virtual | other — free-text area details live in `location`
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS location_type text NOT NULL DEFAULT 'other';
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS state text;
-- NULL capacity = no cap
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS capacity integer CHECK (capacity IS NULL OR capacity > 0);
-- active | cancelled (soft-cancel keeps the row so RSVPs stay explainable)
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
-- Partner/Aminy-authored starter content ("first village" density seeding)
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_community_events_date ON community_events (date);
CREATE INDEX IF NOT EXISTS idx_community_events_created_by ON community_events (created_by);

-- 2. RLS: authenticated users can create events they own; creators manage their own
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can create events" ON community_events;
CREATE POLICY "Authenticated users can create events"
  ON community_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators can update their events" ON community_events;
CREATE POLICY "Creators can update their events"
  ON community_events FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators can delete their events" ON community_events;
CREATE POLICY "Creators can delete their events"
  ON community_events FOR DELETE
  USING (auth.uid() = created_by);

-- 3. Keep community_events.attendee_count in sync with event_attendees.
--    SECURITY DEFINER so an RSVP by a non-creator can bump the count despite
--    the creator-only UPDATE policy above.
CREATE OR REPLACE FUNCTION public.sync_event_attendee_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event uuid;
BEGIN
  target_event := COALESCE(NEW.event_id, OLD.event_id);
  IF target_event IS NOT NULL THEN
    UPDATE community_events
    SET attendee_count = (
      SELECT count(*) FROM event_attendees
      WHERE event_id = target_event AND rsvp_status = 'attending'
    )
    WHERE id = target_event;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_event_attendee_count ON event_attendees;
CREATE TRIGGER trg_sync_event_attendee_count
  AFTER INSERT OR UPDATE OR DELETE ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_attendee_count();

-- 4. moderation_queue: user-facing reports were IMPOSSIBLE — the only live
--    policy is service_role ALL, so the report sheet (posts, comments, and now
--    events) always failed with an RLS denial. Let signed-in users file
--    reports they own (reported_by = themselves). Reads/updates stay
--    service-role/admin-only.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'moderation_queue') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can file reports" ON moderation_queue';
    EXECUTE 'CREATE POLICY "Users can file reports" ON moderation_queue FOR INSERT TO authenticated WITH CHECK (reported_by IS NULL OR reported_by = auth.uid())';
  END IF;
END $$;
