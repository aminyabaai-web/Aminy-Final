-- Migration 015: Admin Portal and Content Moderation
-- Adds tables for:
-- 1. Content moderation queue
-- 2. Admin audit log
-- 3. User moderation status
-- 4. Admin role management

-- ============================================
-- CONTENT MODERATION QUEUE
-- ============================================

-- [MIGRATION FIX] Table moderation_queue created in earlier migration.
-- Adding columns that would have been lost due to IF NOT EXISTS:
-- Original CREATE TABLE commented out below.
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_text TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_author_id UUID REFERENCES auth.users(id);
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_author_name TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES auth.users(id);
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS ai_explanation TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Original CREATE TABLE (commented out, columns added above):
-- CREATE TABLE IF NOT EXISTS moderation_queue (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   -- Content being moderated
--   content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'message', 'profile', 'document')),
--   content_id UUID NOT NULL,
--   content_text TEXT,
--   content_author_id UUID REFERENCES auth.users(id),
--   content_author_name TEXT,
--   -- Flag information
--   flag_category TEXT NOT NULL CHECK (flag_category IN (
--     'spam', 'harassment', 'misinformation', 'inappropriate',
--     'self_harm', 'privacy', 'copyright', 'other'
--   )),
--   flag_reason TEXT,
--   flagged_by UUID REFERENCES auth.users(id), -- Null if AI-flagged
--   flagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   -- AI moderation
--   ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
--   ai_explanation TEXT,
--   -- Resolution
--   status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
--   resolved_by UUID REFERENCES auth.users(id),
--   resolved_at TIMESTAMPTZ,
--   resolution_notes TEXT,
--   -- Metadata
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );


-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_flagged_at ON moderation_queue(flagged_at);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content_author ON moderation_queue(content_author_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content_type ON moderation_queue(content_type);

-- ============================================
-- USER MODERATION STATUS
-- ============================================

-- Add moderation fields to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'moderation_status') THEN
    ALTER TABLE profiles ADD COLUMN moderation_status TEXT DEFAULT 'good_standing'
      CHECK (moderation_status IN ('good_standing', 'warned', 'restricted', 'suspended', 'banned'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'moderation_notes') THEN
    ALTER TABLE profiles ADD COLUMN moderation_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'warning_count') THEN
    ALTER TABLE profiles ADD COLUMN warning_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'last_moderation_action') THEN
    ALTER TABLE profiles ADD COLUMN last_moderation_action TIMESTAMPTZ;
  END IF;
END $$;

-- User moderation history
CREATE TABLE IF NOT EXISTS user_moderation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN (
    'warning_issued', 'warning_cleared',
    'restricted', 'unrestricted',
    'suspended', 'unsuspended',
    'banned', 'unbanned',
    'content_removed', 'content_restored'
  )),
  reason TEXT NOT NULL,
  related_content_id UUID,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  -- Auto-expiring actions
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_moderation_history_user ON user_moderation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_history_action ON user_moderation_history(action);

-- ============================================
-- ADMIN AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who performed the action
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_email TEXT NOT NULL,
  -- What action was performed
  action TEXT NOT NULL,
  action_category TEXT NOT NULL CHECK (action_category IN (
    'user_management', 'moderation', 'financial', 'system',
    'data_access', 'configuration', 'support'
  )),
  -- Target of the action
  target_type TEXT NOT NULL CHECK (target_type IN (
    'user', 'content', 'subscription', 'refund', 'promo_code',
    'provider', 'system_setting', 'report', 'other'
  )),
  target_id TEXT,
  target_details JSONB,
  -- Before/after state
  previous_state JSONB,
  new_state JSONB,
  -- Context
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_category ON admin_audit_log(action_category);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);

-- ============================================
-- ADMIN ROLES AND PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_system_role BOOLEAN DEFAULT false, -- Cannot be deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default admin roles
INSERT INTO admin_roles (name, description, permissions, is_system_role)
VALUES
  ('super_admin', 'Full system access', '["*"]', true),
  ('admin', 'Standard admin access', '["users.view", "users.edit", "moderation.*", "analytics.view", "support.*"]', true),
  ('moderator', 'Content moderation only', '["moderation.*", "users.view", "users.warn"]', true),
  ('support', 'Customer support access', '["users.view", "users.impersonate", "support.*", "subscriptions.view"]', true),
  ('analyst', 'Read-only analytics access', '["analytics.view", "users.view"]', true)
ON CONFLICT (name) DO NOTHING;

-- Admin role assignments
CREATE TABLE IF NOT EXISTS admin_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_role_assignments_user ON admin_role_assignments(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Moderation queue: Only admins and moderators can access
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all moderation queue items"
  ON moderation_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can manage moderation queue"
  ON moderation_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- User moderation history: Only admins can view
ALTER TABLE user_moderation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view user moderation history"
  ON user_moderation_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can manage user moderation history"
  ON user_moderation_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Admin audit log: Only super admins can view
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_role_assignments ara
      JOIN admin_roles ar ON ar.id = ara.role_id
      WHERE ara.user_id = auth.uid()
      AND ar.name = 'super_admin'
    )
  );

CREATE POLICY "System can insert audit log"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin roles: Only super admins can manage
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All admins can view roles"
  ON admin_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Super admins can manage roles"
  ON admin_role_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_role_assignments ara
      JOIN admin_roles ar ON ar.id = ara.role_id
      WHERE ara.user_id = auth.uid()
      AND ar.name = 'super_admin'
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_moderation_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS moderation_queue_updated_at ON moderation_queue;
CREATE TRIGGER moderation_queue_updated_at
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_moderation_queue_updated_at();

-- Update user warning count on moderation action
CREATE OR REPLACE FUNCTION update_user_warning_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action = 'warning_issued' THEN
    UPDATE profiles
    SET warning_count = warning_count + 1,
        last_moderation_action = NOW()
    WHERE id = NEW.user_id;
  ELSIF NEW.action = 'warning_cleared' THEN
    UPDATE profiles
    SET warning_count = GREATEST(0, warning_count - 1),
        last_moderation_action = NOW()
    WHERE id = NEW.user_id;
  ELSIF NEW.action IN ('suspended', 'banned') THEN
    UPDATE profiles
    SET moderation_status = CASE WHEN NEW.action = 'banned' THEN 'banned' ELSE 'suspended' END,
        last_moderation_action = NOW()
    WHERE id = NEW.user_id;
  ELSIF NEW.action IN ('unsuspended', 'unbanned') THEN
    UPDATE profiles
    SET moderation_status = 'good_standing',
        last_moderation_action = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_moderation_history_trigger ON user_moderation_history;
CREATE TRIGGER user_moderation_history_trigger
  AFTER INSERT ON user_moderation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_user_warning_count();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user has admin permission
CREATE OR REPLACE FUNCTION has_admin_permission(user_id UUID, permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_role_assignments ara
    JOIN admin_roles ar ON ar.id = ara.role_id
    WHERE ara.user_id = $1
    AND (ara.expires_at IS NULL OR ara.expires_at > NOW())
    AND (
      ar.permissions @> '["*"]'::jsonb
      OR ar.permissions @> to_jsonb(permission)
      OR ar.permissions @> to_jsonb(split_part(permission, '.', 1) || '.*')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's admin roles
CREATE OR REPLACE FUNCTION get_user_admin_roles(user_id UUID)
RETURNS TABLE(role_name TEXT, permissions JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT ar.name, ar.permissions
  FROM admin_role_assignments ara
  JOIN admin_roles ar ON ar.id = ara.role_id
  WHERE ara.user_id = $1
  AND (ara.expires_at IS NULL OR ara.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE moderation_queue IS 'Content flagged for moderation review';
COMMENT ON TABLE user_moderation_history IS 'History of moderation actions taken against users';
COMMENT ON TABLE admin_audit_log IS 'Audit trail of all admin actions for compliance';
COMMENT ON TABLE admin_roles IS 'Admin role definitions with permission sets';
COMMENT ON TABLE admin_role_assignments IS 'Maps users to admin roles';
