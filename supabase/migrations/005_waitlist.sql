-- Waitlist table for collecting early access signups
-- Migration: 005_waitlist.sql

-- Create waitlist table
-- [MIGRATION FIX] Table waitlist created in earlier migration.
-- Adding columns that would have been lost due to IF NOT EXISTS:
-- Original CREATE TABLE commented out below.
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'landing_page';
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Original CREATE TABLE (commented out, columns added above):
-- CREATE TABLE IF NOT EXISTS waitlist (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   email TEXT NOT NULL UNIQUE,
--   source TEXT DEFAULT 'landing_page',
--   referral_code TEXT,
--   utm_source TEXT,
--   utm_medium TEXT,
--   utm_campaign TEXT,
--   status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'converted', 'unsubscribed')),
--   invited_at TIMESTAMPTZ,
--   converted_at TIMESTAMPTZ,
--   notes TEXT,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );


-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);

-- Index for created_at ordering
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for signups)
CREATE POLICY "Allow anonymous waitlist inserts" ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only allow authenticated admins to read waitlist
CREATE POLICY "Allow authenticated read of waitlist" ON waitlist
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow authenticated admins to update waitlist
CREATE POLICY "Allow authenticated update of waitlist" ON waitlist
  FOR UPDATE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS waitlist_updated_at_trigger ON waitlist;
CREATE TRIGGER waitlist_updated_at_trigger
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_updated_at();

-- Function to get waitlist position
CREATE OR REPLACE FUNCTION get_waitlist_position(user_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  position INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO position
  FROM waitlist
  WHERE created_at < (
    SELECT created_at FROM waitlist WHERE email = user_email
  )
  AND status = 'waiting';

  RETURN COALESCE(position, 0);
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON TABLE waitlist IS 'Stores early access waitlist signups for Aminy';
COMMENT ON COLUMN waitlist.source IS 'Where the signup came from (landing_page, referral, ad, etc)';
COMMENT ON COLUMN waitlist.status IS 'Current status: waiting, invited, converted, or unsubscribed';
