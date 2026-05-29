-- Migration: Consolidate "starter" tier into "core"
-- Starter was a legacy alias for Core ($14.99/mo, same features).
-- Two separate names confused the UI and pricing copy. Drop the alias.

-- Migrate any existing rows with tier='starter' to tier='core'
UPDATE public.profiles
SET tier = 'core'
WHERE tier = 'starter';

-- Note: We keep 'starter' as a valid TypeScript union value for backward compat
-- with legacy frontend code paths, but normalizeTierName() in src/lib/tier-utils.ts
-- already maps starter → core, so this is purely a DB cleanup.
-- The Paywall UI shows only: Core, Pro, Pro+/Family (and Org as B2B).
