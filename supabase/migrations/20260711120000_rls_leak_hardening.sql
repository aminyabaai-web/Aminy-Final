-- ============================================================================
-- SECURITY: close pre-existing RLS leaks found by the Supabase security advisor.
--
-- Several tables had policies named "Service role can manage all" written as
-- `USING (true)` and granted to the `public` role group (which includes anon
-- AND authenticated). Because permissive RLS policies are OR'd, that `true`
-- overrode the properly-scoped "view own" policies — exposing every row to any
-- user. Service role BYPASSES RLS, so these policies were never needed; they
-- only ever leaked data. This migration DROPS them (access-narrowing only).
--
-- - clinical_outcomes  (PHI): was fully readable/writable by any user.
-- - provider_earnings  (financial): all earnings readable/writable by anyone.
-- - provider_profiles  : any user could modify any provider's profile.
--   (Public SELECT on provider_profiles is INTENTIONAL — the marketplace
--    directory — and is kept.)
-- ============================================================================

-- clinical_outcomes: remove the accidental public-all policy. Scoped
-- "Users can view own outcomes" (SELECT) + "Users insert own outcomes" (INSERT)
-- remain; edge functions use the service role (RLS-exempt) for writes.
DROP POLICY IF EXISTS "Service role can manage all" ON public.clinical_outcomes;

-- provider_earnings: remove public-all, and scope the view policy to the
-- owning provider (provider_id is uuid with no FK — cover both "= auth.uid()"
-- and "a provider_profiles row this user owns").
DROP POLICY IF EXISTS "Service role can manage earnings" ON public.provider_earnings;
DROP POLICY IF EXISTS "Providers can view own earnings" ON public.provider_earnings;
CREATE POLICY "Providers can view own earnings" ON public.provider_earnings
  FOR SELECT USING (
    provider_id = auth.uid()
    OR provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()::text
    )
  );

-- provider_profiles: remove the public "manage all" (anyone-can-modify). Keep
-- the intentional public directory read + the scoped own-profile update.
DROP POLICY IF EXISTS "Service role can manage all" ON public.provider_profiles;

-- ── SECURITY DEFINER hardening ───────────────────────────────────────────────
-- The gift/caregiver RPCs are only meant for signed-in users. They already
-- no-op for anon (auth.uid() is null), but revoke anon EXECUTE anyway so the
-- linter and least-privilege both agree.
REVOKE EXECUTE ON FUNCTION public.redeem_gift_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_caregiver_invites() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_caregiver_for_child(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_write_child(uuid) FROM anon;
