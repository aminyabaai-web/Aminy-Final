-- ============================================================================
-- 028: Calendar Integrations
-- Bi-directional Google Calendar sync support
-- ============================================================================

-- Calendar integration records (one per user per provider)
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT,        -- OAuth access token (encrypted at rest by Supabase)
  refresh_token TEXT,       -- OAuth refresh token for long-lived access
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT DEFAULT 'primary',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Calendar event mappings (tracks which Aminy appointments map to which external events)
CREATE TABLE IF NOT EXISTS calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL,
  calendar_integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error', 'deleted')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(appointment_id, calendar_integration_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user
  ON calendar_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_provider
  ON calendar_integrations(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_appointment
  ON calendar_event_mappings(appointment_id);

CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_integration
  ON calendar_event_mappings(calendar_integration_id);

CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_external
  ON calendar_event_mappings(external_event_id);

-- Row Level Security
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own calendar integrations
CREATE POLICY "Users manage own calendar integrations"
  ON calendar_integrations FOR ALL
  USING (auth.uid() = user_id);

-- Users can only manage their own calendar event mappings
-- (via the calendar_integration they own)
CREATE POLICY "Users manage own calendar event mappings"
  ON calendar_event_mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendar_integrations ci
      WHERE ci.id = calendar_event_mappings.calendar_integration_id
      AND ci.user_id = auth.uid()
    )
  );

-- Service role bypass for edge functions
-- (Edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS)

-- Updated_at trigger for calendar_integrations
CREATE OR REPLACE FUNCTION update_calendar_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_calendar_integrations_updated_at
  BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_integrations_updated_at();
