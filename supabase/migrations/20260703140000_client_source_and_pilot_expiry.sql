-- Sourcing-based insured rates + pilot evaluation window (July 2026).
-- Additive + nullable only.

-- Who sourced the client for this booking — drives the insured platform take
-- permanently (see src/lib/payout-rail.ts resolvePayoutRail):
--   'aminy_marketplace' = family found the provider through the Aminy parent
--     app / marketplace funnel → insured_aminy_sourced rail, 20% take
--     (applies even to AACT/partner-affiliated providers)
--   'partner_org'       = the partner org (AACT/Rise) brought the client
--     → aact_pilot rail, 5% take, forever (no expiry step-up)
--   'provider_sourced'  = provider brought their own client → insured, 10%
-- NULL (legacy rows) resolves as provider-sourced.
ALTER TABLE marketplace_bookings
  ADD COLUMN IF NOT EXISTS client_source text;

COMMENT ON COLUMN marketplace_bookings.client_source IS
  'Who sourced the client: aminy_marketplace (Aminy funnel, 20% insured take), partner_org (partner brought the client, 5%), provider_sourced (10%). NULL = legacy, treated as provider_sourced.';

-- 6-month pilot evaluation window — CONTRACTUAL RECORD ONLY; rates are
-- sourcing-based and do NOT step up when this passes. No code behavior.
-- NULL = no evaluation window recorded (owner sets per contract).
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS pilot_ends_at timestamptz;

COMMENT ON COLUMN organizations.pilot_ends_at IS
  '6-month pilot evaluation window — contractual record only; rates are sourcing-based and do not step up.';
