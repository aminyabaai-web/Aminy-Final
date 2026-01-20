-- =============================================================================
-- Error Logging & User Feedback Schema
-- =============================================================================

-- Error logs for tracking application issues
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_url TEXT,
  component_name TEXT,
  browser_info TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT CHECK (severity IN ('error', 'warning', 'info')) DEFAULT 'error'
);

-- User feedback for bug reports and suggestions
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  page_url TEXT,
  feedback_type TEXT CHECK (feedback_type IN ('bug', 'suggestion', 'question', 'other')) DEFAULT 'other',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'wont_fix'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_user_feedback_timestamp ON user_feedback(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for error_logs
-- Anyone can insert errors (even anonymous users hitting an error)
CREATE POLICY "Anyone can insert errors" ON error_logs
  FOR INSERT WITH CHECK (true);

-- Only admins can view all errors
CREATE POLICY "Admins can view all errors" ON error_logs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can view their own errors
CREATE POLICY "Users can view own errors" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policies for user_feedback
-- Authenticated users can submit feedback
CREATE POLICY "Users can submit feedback" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON user_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view and update all feedback
CREATE POLICY "Admins can view all feedback" ON user_feedback
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update feedback status" ON user_feedback
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );
