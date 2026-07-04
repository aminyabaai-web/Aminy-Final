-- ============================================================================
-- Migration: 20260703180000_notification_pref_columns.sql
-- Description: Add app-scheduling notification toggles to user_preferences.
--   These gate whether Aminy may INITIATE outreach:
--     weekly_briefing  — weekly progress briefing (email + in-app nudge)
--     daily_tips       — daily gentle tips (push)
--     proactive_nudges — proactive in-app check-ins
--   All opt-OUT, so default TRUE.
--
-- NOTE: DO NOT hand-apply. Applied via the normal migration pipeline.
--   Client gating (src/lib/notification-prefs.ts) stops app-initiated
--   scheduling only — deployed edge crons must ALSO check these columns.
-- ============================================================================

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS weekly_briefing BOOLEAN DEFAULT true;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS daily_tips BOOLEAN DEFAULT true;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS proactive_nudges BOOLEAN DEFAULT true;

COMMENT ON COLUMN user_preferences.weekly_briefing IS 'Weekly progress briefing (email + in-app nudge). Opt-out; default on.';
COMMENT ON COLUMN user_preferences.daily_tips IS 'Daily gentle tips via push. Opt-out; default on.';
COMMENT ON COLUMN user_preferences.proactive_nudges IS 'Proactive in-app check-ins from Aminy. Opt-out; default on.';
