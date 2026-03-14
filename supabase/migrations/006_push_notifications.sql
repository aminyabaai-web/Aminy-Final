-- ============================================
-- PUSH NOTIFICATIONS INFRASTRUCTURE
-- ============================================
-- This migration creates the tables and cron job needed for
-- scheduled push notifications via web push (VAPID)

-- ============================================
-- PUSH SUBSCRIPTIONS TABLE
-- Stores user push subscription data from browsers
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Users can manage their own subscriptions
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
-- Service role for cron job
CREATE POLICY "Service role can manage push subscriptions" ON push_subscriptions
  FOR ALL USING (true);
-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
-- Updated_at trigger
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- SCHEDULED NOTIFICATIONS TABLE
-- Queue of notifications to be sent by cron job
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT DEFAULT '/icons/icon-192.png',
  badge TEXT DEFAULT '/icons/badge-72.png',
  tag TEXT DEFAULT 'aminy-notification',
  data JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'daily_checkin',
    'streak_reminder',
    'routine_nudge',
    'calm_moment',
    'weekly_digest',
    'appointment_reminder',
    'custom'
  )),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
-- Users can view their own scheduled notifications
CREATE POLICY "Users can view own scheduled notifications" ON scheduled_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create scheduled notifications" ON scheduled_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel own notifications" ON scheduled_notifications
  FOR DELETE USING (auth.uid() = user_id);
-- Service role for cron job
CREATE POLICY "Service role can manage scheduled notifications" ON scheduled_notifications
  FOR ALL USING (true);
-- Indexes for efficient cron job queries
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_due
  ON scheduled_notifications(scheduled_for)
  WHERE sent = false;
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_type
  ON scheduled_notifications(user_id, notification_type);
-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- User preferences for when/how to receive notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Global toggle
  notifications_enabled BOOLEAN DEFAULT true,

  -- Notification types enabled
  daily_checkin_enabled BOOLEAN DEFAULT true,
  streak_reminder_enabled BOOLEAN DEFAULT true,
  routine_nudge_enabled BOOLEAN DEFAULT true,
  calm_moment_enabled BOOLEAN DEFAULT true,
  weekly_digest_enabled BOOLEAN DEFAULT true,
  appointment_reminder_enabled BOOLEAN DEFAULT true,

  -- Timing preferences
  preferred_checkin_time TIME DEFAULT '09:00',
  preferred_timezone TEXT DEFAULT 'America/Los_Angeles',

  -- Quiet hours (no notifications during this period)
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '07:00',

  -- Days to send notifications (bitmask: Sunday=1, Monday=2, etc.)
  active_days INTEGER DEFAULT 127, -- All days by default

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Service role access
CREATE POLICY "Service role can read notification preferences" ON notification_preferences
  FOR SELECT USING (true);
-- Updated_at trigger
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- NOTIFICATION HISTORY TABLE
-- Tracks sent notifications for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_notification_id UUID REFERENCES scheduled_notifications(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'clicked', 'dismissed', 'failed')),
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB DEFAULT '{}'
);
-- Enable RLS
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notification history" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);
-- Service role for insertion
CREATE POLICY "Service role can manage notification history" ON notification_history
  FOR ALL USING (true);
-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_notification_history_user_date
  ON notification_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_type_status
  ON notification_history(notification_type, delivery_status);
-- ============================================
-- CRON JOB FUNCTION: Process Due Notifications
-- Called by pg_cron every minute
-- ============================================
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_count INTEGER := 0;
  notification RECORD;
  subscription RECORD;
  user_prefs RECORD;
  current_user_time TIME;
  is_quiet_hours BOOLEAN;
  day_of_week INTEGER;
BEGIN
  -- Process notifications that are due
  FOR notification IN
    SELECT sn.*, p.child_name, p.parent_name
    FROM scheduled_notifications sn
    LEFT JOIN profiles p ON sn.user_id = p.id
    WHERE sn.sent = false
      AND sn.scheduled_for <= NOW()
      AND sn.retry_count < sn.max_retries
    ORDER BY sn.priority DESC, sn.scheduled_for ASC
    LIMIT 100 -- Process in batches
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Get user notification preferences
      SELECT * INTO user_prefs
      FROM notification_preferences
      WHERE user_id = notification.user_id;

      -- Check if notifications are enabled
      IF user_prefs IS NOT NULL AND NOT user_prefs.notifications_enabled THEN
        -- Mark as sent (skipped)
        UPDATE scheduled_notifications
        SET sent = true, sent_at = NOW(), error = 'User disabled notifications'
        WHERE id = notification.id;
        CONTINUE;
      END IF;

      -- Check specific notification type preference
      IF user_prefs IS NOT NULL THEN
        CASE notification.notification_type
          WHEN 'daily_checkin' THEN
            IF NOT user_prefs.daily_checkin_enabled THEN
              UPDATE scheduled_notifications
              SET sent = true, sent_at = NOW(), error = 'Type disabled by user'
              WHERE id = notification.id;
              CONTINUE;
            END IF;
          WHEN 'streak_reminder' THEN
            IF NOT user_prefs.streak_reminder_enabled THEN
              UPDATE scheduled_notifications
              SET sent = true, sent_at = NOW(), error = 'Type disabled by user'
              WHERE id = notification.id;
              CONTINUE;
            END IF;
          -- Add other types as needed
          ELSE
            NULL; -- Allow unknown types through
        END CASE;

        -- Check quiet hours
        IF user_prefs.quiet_hours_enabled THEN
          current_user_time := (NOW() AT TIME ZONE COALESCE(user_prefs.preferred_timezone, 'UTC'))::TIME;

          IF user_prefs.quiet_hours_start > user_prefs.quiet_hours_end THEN
            -- Quiet hours span midnight
            is_quiet_hours := current_user_time >= user_prefs.quiet_hours_start
                           OR current_user_time <= user_prefs.quiet_hours_end;
          ELSE
            is_quiet_hours := current_user_time >= user_prefs.quiet_hours_start
                          AND current_user_time <= user_prefs.quiet_hours_end;
          END IF;

          IF is_quiet_hours AND notification.priority != 'high' THEN
            -- Reschedule for after quiet hours
            UPDATE scheduled_notifications
            SET scheduled_for = (DATE_TRUNC('day', NOW() AT TIME ZONE user_prefs.preferred_timezone)
                                 + user_prefs.quiet_hours_end + INTERVAL '1 minute')
                                AT TIME ZONE user_prefs.preferred_timezone
            WHERE id = notification.id;
            CONTINUE;
          END IF;
        END IF;

        -- Check active days
        day_of_week := EXTRACT(DOW FROM NOW() AT TIME ZONE COALESCE(user_prefs.preferred_timezone, 'UTC'));
        IF (user_prefs.active_days & (1 << day_of_week)) = 0 THEN
          UPDATE scheduled_notifications
          SET sent = true, sent_at = NOW(), error = 'Not an active day'
          WHERE id = notification.id;
          CONTINUE;
        END IF;
      END IF;

      -- Mark as sent (actual push will be handled by edge function)
      -- The edge function reads from a "pending" view
      UPDATE scheduled_notifications
      SET sent = true, sent_at = NOW()
      WHERE id = notification.id;

      -- Record in history
      INSERT INTO notification_history (
        user_id, scheduled_notification_id, title, body, notification_type, metadata
      ) VALUES (
        notification.user_id, notification.id, notification.title,
        notification.body, notification.notification_type, notification.data
      );

      notification_count := notification_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log error and increment retry count
      UPDATE scheduled_notifications
      SET retry_count = retry_count + 1,
          error = SQLERRM
      WHERE id = notification.id;
    END;
  END LOOP;

  RETURN notification_count;
END;
$$;
-- ============================================
-- VIEW: Pending Notifications for Edge Function
-- Edge function polls this to send actual web push
-- ============================================
CREATE OR REPLACE VIEW pending_push_notifications AS
SELECT
  nh.id AS history_id,
  nh.user_id,
  nh.title,
  nh.body,
  nh.notification_type,
  nh.metadata,
  ps.endpoint,
  ps.p256dh_key,
  ps.auth_key
FROM notification_history nh
JOIN push_subscriptions ps ON nh.user_id = ps.user_id
WHERE nh.delivery_status = 'sent'
  AND nh.sent_at > NOW() - INTERVAL '5 minutes';
-- ============================================
-- HELPER: Schedule Daily Check-ins for User
-- Call this when user enables notifications
-- ============================================
CREATE OR REPLACE FUNCTION schedule_daily_checkins(
  p_user_id UUID,
  p_child_name TEXT DEFAULT 'your child',
  p_days_ahead INTEGER DEFAULT 7
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_prefs notification_preferences;
  checkin_time TIME;
  checkin_tz TEXT;
  scheduled_count INTEGER := 0;
  day_offset INTEGER;
  scheduled_datetime TIMESTAMPTZ;
  messages TEXT[] := ARRAY[
    'Good morning! Ready to start %s''s routine? 🌅',
    'How did last night go? Let''s plan today together. 💙',
    'Time for your daily check-in. %s is doing great! ✨',
    'Morning! What''s one thing you''re looking forward to today? 🎯',
    'Rise and shine! Your streak continues. Let''s keep it going! 🔥',
    'A new day, a new opportunity. Let''s make it count! 🌟',
    'Good morning! Small steps lead to big progress. 💪'
  ];
BEGIN
  -- Get user preferences
  SELECT * INTO user_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- Use defaults if no preferences
  checkin_time := COALESCE(user_prefs.preferred_checkin_time, '09:00');
  checkin_tz := COALESCE(user_prefs.preferred_timezone, 'America/Los_Angeles');

  -- Delete existing scheduled daily check-ins
  DELETE FROM scheduled_notifications
  WHERE user_id = p_user_id
    AND notification_type = 'daily_checkin'
    AND sent = false;

  -- Schedule for the next N days
  FOR day_offset IN 1..p_days_ahead LOOP
    scheduled_datetime := (
      DATE_TRUNC('day', NOW() AT TIME ZONE checkin_tz)
      + (day_offset || ' days')::INTERVAL
      + checkin_time
    ) AT TIME ZONE checkin_tz;

    INSERT INTO scheduled_notifications (
      user_id, title, body, notification_type, scheduled_for, data
    ) VALUES (
      p_user_id,
      'Aminy',
      FORMAT(messages[(day_offset % ARRAY_LENGTH(messages, 1)) + 1], p_child_name),
      'daily_checkin',
      scheduled_datetime,
      jsonb_build_object('childName', p_child_name, 'route', '/care')
    );

    scheduled_count := scheduled_count + 1;
  END LOOP;

  RETURN scheduled_count;
END;
$$;
-- ============================================
-- HELPER: Schedule Streak Reminder
-- ============================================
CREATE OR REPLACE FUNCTION schedule_streak_reminder(
  p_user_id UUID,
  p_current_streak INTEGER,
  p_hours_until_deadline INTEGER DEFAULT 4
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
  body_text TEXT;
BEGIN
  IF p_current_streak >= 7 THEN
    body_text := FORMAT('🔥 Don''t break your %s-day streak! Check in before midnight.', p_current_streak);
  ELSIF p_current_streak >= 3 THEN
    body_text := FORMAT('You''re on a %s-day streak! Keep it going today.', p_current_streak);
  ELSE
    body_text := 'Start building your streak today - just a quick check-in!';
  END IF;

  INSERT INTO scheduled_notifications (
    user_id, title, body, notification_type, scheduled_for, priority, data
  ) VALUES (
    p_user_id,
    'Streak Reminder',
    body_text,
    'streak_reminder',
    NOW() + (p_hours_until_deadline || ' hours')::INTERVAL,
    CASE WHEN p_current_streak >= 7 THEN 'high' ELSE 'normal' END,
    jsonb_build_object('currentStreak', p_current_streak, 'route', '/care')
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;
-- ============================================
-- ENABLE PG_CRON (requires superuser/Supabase dashboard)
-- Run this in the Supabase SQL Editor with admin privileges:
--
-- SELECT cron.schedule(
--   'process-push-notifications',        -- job name
--   '* * * * *',                          -- every minute
--   $$SELECT process_scheduled_notifications()$$
-- );
--
-- To verify the cron job:
-- SELECT * FROM cron.job;
--
-- To check recent job runs:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- ============================================

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON pending_push_notifications TO authenticated;
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API subscriptions for each user/device';
COMMENT ON TABLE scheduled_notifications IS 'Queue of notifications to be processed by cron job';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification timing and types';
COMMENT ON TABLE notification_history IS 'Audit log of all sent notifications';
COMMENT ON FUNCTION process_scheduled_notifications IS 'Cron job function - processes due notifications every minute';
COMMENT ON FUNCTION schedule_daily_checkins IS 'Helper to set up daily check-in notifications for a user';
COMMENT ON FUNCTION schedule_streak_reminder IS 'Schedule a streak reminder notification';
