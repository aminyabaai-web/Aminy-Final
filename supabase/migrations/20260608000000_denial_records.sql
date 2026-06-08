-- denial_records table
-- Tracks insurance claim denials for provider analytics and recovery workflows.
-- Referenced by ClaimsDashboard.tsx (getDenialRecordsForPatient in denial-management lib).

CREATE TABLE IF NOT EXISTS denial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  claim_id TEXT,
  service_date DATE NOT NULL,
  cpt_code TEXT NOT NULL,           -- e.g. 97155, 97156
  billed_amount_cents INTEGER NOT NULL DEFAULT 0,
  denied_amount_cents INTEGER NOT NULL DEFAULT 0,
  payer_name TEXT NOT NULL,
  denial_reason_code TEXT,          -- e.g. CO-4, CO-97, PR-96
  denial_reason TEXT,               -- Human-readable reason
  appeal_status TEXT DEFAULT 'pending' CHECK (appeal_status IN ('pending', 'appealing', 'won', 'lost', 'written_off')),
  appeal_deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-patient and per-provider lookups
CREATE INDEX IF NOT EXISTS denial_records_patient_id_idx ON denial_records(patient_id);
CREATE INDEX IF NOT EXISTS denial_records_provider_id_idx ON denial_records(provider_id);
CREATE INDEX IF NOT EXISTS denial_records_service_date_idx ON denial_records(service_date DESC);
CREATE INDEX IF NOT EXISTS denial_records_payer_name_idx ON denial_records(payer_name);

-- RLS: providers can only see their own denial records; patients see their own
ALTER TABLE denial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "denial_records_provider_access" ON denial_records
  FOR ALL USING (
    provider_id = auth.uid()
    OR patient_id = auth.uid()
  );

-- updated_at auto-trigger
CREATE OR REPLACE FUNCTION update_denial_records_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS denial_records_updated_at ON denial_records;
CREATE TRIGGER denial_records_updated_at
  BEFORE UPDATE ON denial_records
  FOR EACH ROW EXECUTE FUNCTION update_denial_records_updated_at();
