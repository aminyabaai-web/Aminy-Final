-- ============================================================================
-- CentralReach Sync Log & Webhook Events Tables
-- Migration: 20260309_cr_sync_log
--
-- Supports:
--   1. cr_sync_log: Detailed sync history per data type (sessions, goals, etc.)
--   2. cr_webhook_events: Incoming webhook event storage + processing status
--   3. cr_sync_errors: Individual sync error records with retry tracking
--
-- Used by:
--   - CRSyncDashboard.tsx (admin error recovery)
--   - CRSyncStatus.tsx (parent-facing sync status)
--   - centralreach-sync-scheduler.ts (sync history persistence)
--   - centralreach-webhooks.ts (webhook event processing)
-- ============================================================================

-- Sync log: one row per sync operation (pull or push)
CREATE TABLE IF NOT EXISTS cr_sync_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid,
  data_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('pull', 'push')),
  status text NOT NULL CHECK (status IN ('started', 'success', 'error', 'partial')),
  records_processed integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  error_code text,
  duration_ms integer,
  sync_metadata jsonb DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cr_sync_log_user_id ON cr_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_sync_log_data_type ON cr_sync_log(data_type);
CREATE INDEX IF NOT EXISTS idx_cr_sync_log_status ON cr_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_cr_sync_log_started_at ON cr_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cr_sync_log_user_data_type ON cr_sync_log(user_id, data_type, direction);

-- Webhook events: incoming events from CentralReach
CREATE TABLE IF NOT EXISTS cr_webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  organization_id text,
  client_id text,
  entity_id text,
  entity_type text,
  payload jsonb DEFAULT '{}',
  received_at timestamptz NOT NULL DEFAULT now(),
  processed boolean DEFAULT false,
  processed_at timestamptz,
  processing_error text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cr_webhook_events_event_id ON cr_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_cr_webhook_events_processed ON cr_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_cr_webhook_events_event_type ON cr_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_cr_webhook_events_received_at ON cr_webhook_events(received_at DESC);

-- Sync errors: individual record-level errors with retry tracking
CREATE TABLE IF NOT EXISTS cr_sync_errors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_log_id uuid REFERENCES cr_sync_log(id) ON DELETE SET NULL,
  data_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('pull', 'push')),
  record_id text,
  error_code text,
  error_message text NOT NULL,
  error_details jsonb DEFAULT '{}',
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cr_sync_errors_user_id ON cr_sync_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_sync_errors_resolved ON cr_sync_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_cr_sync_errors_data_type ON cr_sync_errors(data_type);
CREATE INDEX IF NOT EXISTS idx_cr_sync_errors_created_at ON cr_sync_errors(created_at DESC);

-- RLS Policies
ALTER TABLE cr_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cr_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cr_sync_errors ENABLE ROW LEVEL SECURITY;

-- Users can read their own sync logs
CREATE POLICY cr_sync_log_select ON cr_sync_log
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update sync logs
CREATE POLICY cr_sync_log_insert ON cr_sync_log
  FOR INSERT WITH CHECK (auth.uid() = user_id OR current_setting('role') = 'service_role');

CREATE POLICY cr_sync_log_update ON cr_sync_log
  FOR UPDATE USING (auth.uid() = user_id OR current_setting('role') = 'service_role');

-- Webhook events: service role only for insert, authenticated users can read
CREATE POLICY cr_webhook_events_select ON cr_webhook_events
  FOR SELECT USING (true);

CREATE POLICY cr_webhook_events_insert ON cr_webhook_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY cr_webhook_events_update ON cr_webhook_events
  FOR UPDATE USING (true);

-- Sync errors: users can read their own, service role can manage
CREATE POLICY cr_sync_errors_select ON cr_sync_errors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY cr_sync_errors_insert ON cr_sync_errors
  FOR INSERT WITH CHECK (auth.uid() = user_id OR current_setting('role') = 'service_role');

CREATE POLICY cr_sync_errors_update ON cr_sync_errors
  FOR UPDATE USING (auth.uid() = user_id OR current_setting('role') = 'service_role');

-- Enable Realtime for webhook events (used by client-side WebhookHandler)
ALTER PUBLICATION supabase_realtime ADD TABLE cr_webhook_events;
