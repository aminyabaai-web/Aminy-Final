-- Two-rate insured rail + pilot expiry (July 2026). Additive + nullable only.

-- Who sourced the client for this booking:
--   'aminy_marketplace' = family found the provider through the Aminy parent
--     app / marketplace funnel → insured take 20% (insured_aminy_sourced rail)
--   'provider_sourced'  = provider brought their own client → insured take 10%
-- NULL (legacy rows) resolves as provider-sourced. See src/lib/payout-rail.ts.
ALTER TABLE marketplace_bookings
  ADD COLUMN IF NOT EXISTS client_source text;

COMMENT ON COLUMN marketplace_bookings.client_source IS
  'Who sourced the client: aminy_marketplace (Aminy funnel, 20% insured take) or provider_sourced (10%). NULL = legacy, treated as provider_sourced.';

-- Optional pilot-contract expiry (owner sets per contract; no default).
-- After this timestamp the aact_pilot (5%) rail resolves to the standard
-- insured rail (then per-booking sourcing applies). NULL = pilot never expires.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS pilot_ends_at timestamptz;

COMMENT ON COLUMN organizations.pilot_ends_at IS
  'Optional pilot expiry: after this the aact_pilot (5%) rail resolves to the standard insured rail. NULL = no expiry.';
