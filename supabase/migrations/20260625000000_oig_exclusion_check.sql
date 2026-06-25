-- OIG Exclusion check type + NPDB placeholder
-- Adds 'oig_exclusion' to the provider_credential_checks check_type constraint.
-- OIG (Office of Inspector General) exclusion checks are REQUIRED before any
-- provider can bill Medicaid (AHCCCS). Serving an excluded provider is a
-- federal violation under 42 CFR § 1001.

ALTER TABLE public.provider_credential_checks
  DROP CONSTRAINT IF EXISTS provider_credential_checks_check_type_check;

ALTER TABLE public.provider_credential_checks
  ADD CONSTRAINT provider_credential_checks_check_type_check
  CHECK (check_type IN ('identity', 'background', 'malpractice', 'oig_exclusion'));

COMMENT ON COLUMN public.provider_credential_checks.check_type IS
  'identity | background | malpractice | oig_exclusion';
