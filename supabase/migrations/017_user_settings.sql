-- ============================================================================
-- Migration: 017_user_settings.sql
-- Description: User settings, preferences, and profile tables
-- ============================================================================

-- User Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  time_zone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  profile_photo_url TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Child Profiles Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  pronouns TEXT NOT NULL DEFAULT 'they/them',
  avatar_initials TEXT,
  goals TEXT[] DEFAULT '{}',
  junior_status TEXT NOT NULL DEFAULT 'unpaired' CHECK (junior_status IN ('paired', 'unpaired')),
  junior_device_info TEXT,
  care_team_notes_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);

-- RLS for child_profiles
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own children"
  ON child_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own children"
  ON child_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own children"
  ON child_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own children"
  ON child_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Notification Preferences Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Email notifications
  email_daily_summary BOOLEAN NOT NULL DEFAULT TRUE,
  email_weekly_report BOOLEAN NOT NULL DEFAULT TRUE,
  email_goal_milestones BOOLEAN NOT NULL DEFAULT TRUE,
  email_session_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  email_messages BOOLEAN NOT NULL DEFAULT TRUE,
  -- Push notifications
  push_session_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  push_messages BOOLEAN NOT NULL DEFAULT TRUE,
  push_urgent_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  push_daily_tips BOOLEAN NOT NULL DEFAULT TRUE,
  -- SMS notifications
  sms_session_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  sms_urgent_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  sms_appointment_confirmations BOOLEAN NOT NULL DEFAULT TRUE,
  -- Quiet hours
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME NOT NULL DEFAULT '21:00',
  quiet_hours_end TIME NOT NULL DEFAULT '07:00',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification prefs"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification prefs"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification prefs"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Privacy Settings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  allow_model_training BOOLEAN NOT NULL DEFAULT FALSE,
  share_anonymized_data BOOLEAN NOT NULL DEFAULT FALSE,
  local_storage_only BOOLEAN NOT NULL DEFAULT FALSE,
  enhanced_privacy_mode BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for privacy_settings
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own privacy settings"
  ON privacy_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON privacy_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON privacy_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- App Preferences Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT NOT NULL DEFAULT 'en',
  communication_style TEXT NOT NULL DEFAULT 'supportive' CHECK (communication_style IN ('supportive', 'direct', 'playful')),
  preferred_time_of_day TEXT NOT NULL DEFAULT 'morning' CHECK (preferred_time_of_day IN ('morning', 'afternoon', 'evening', 'bedtime')),
  font_size TEXT NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  reduce_motion BOOLEAN NOT NULL DEFAULT FALSE,
  high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for app_preferences
ALTER TABLE app_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own app preferences"
  ON app_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own app preferences"
  ON app_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own app preferences"
  ON app_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Account Deletion Requests Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON account_deletion_requests(status);

-- RLS for account_deletion_requests
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
  ON account_deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert deletion requests"
  ON account_deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Trigger: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS child_profiles_updated_at ON child_profiles;
CREATE TRIGGER child_profiles_updated_at
  BEFORE UPDATE ON child_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS privacy_settings_updated_at ON privacy_settings;
CREATE TRIGGER privacy_settings_updated_at
  BEFORE UPDATE ON privacy_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS app_preferences_updated_at ON app_preferences;
CREATE TRIGGER app_preferences_updated_at
  BEFORE UPDATE ON app_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_profiles IS 'Extended user profile information';
COMMENT ON TABLE child_profiles IS 'Child profiles managed by parent users';
COMMENT ON TABLE notification_preferences IS 'User notification settings by channel';
COMMENT ON TABLE privacy_settings IS 'User privacy and data sharing preferences';
COMMENT ON TABLE app_preferences IS 'User app display and accessibility preferences';
COMMENT ON TABLE account_deletion_requests IS 'Tracks user account deletion requests';
