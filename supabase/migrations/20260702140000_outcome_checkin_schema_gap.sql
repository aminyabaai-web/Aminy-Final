-- Schema-gap fix (outcomes pipeline): WeeklyOutcomeCheckIn writes payload/recorded_at
-- and Dashboard10's trend reader selects them, but the live outcome_events table only
-- had metric_name/metric_value/context/created_at — so every parent weekly check-in
-- insert failed silently in prod (table has 0 rows). Add the missing columns so the
-- check-in write, the Dashboard10 trend read, and the canonical analytics readers
-- (metric_*/context) all share one pipeline.
-- APPLIED to live via Supabase MCP on 2026-07-02 (migration name: outcome_checkin_schema_gap).
ALTER TABLE outcome_events ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE outcome_events ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT now();

-- Parents can record a baseline before a child profile row exists.
ALTER TABLE clinical_outcomes ALTER COLUMN child_id DROP NOT NULL;
