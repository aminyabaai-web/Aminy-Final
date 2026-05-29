-- Migration: Add partner_org tracking to provider applications
-- When a partner (AACT, Rise) bulk-imports their roster OR a provider signs up via
-- a partner invite link, we tag the application with the partner_org so the right
-- contract terms get applied at approval time.

ALTER TABLE public.provider_applications
  ADD COLUMN IF NOT EXISTS partner_org   text,
  ADD COLUMN IF NOT EXISTS invited_at    timestamptz;

-- Add the email uniqueness constraint required by upserts in AACTPartnerSetup
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_applications_email
  ON public.provider_applications(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_provider_applications_partner_org
  ON public.provider_applications(partner_org)
  WHERE partner_org IS NOT NULL;
