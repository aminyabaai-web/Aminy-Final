-- Provider-suggested goals → parent home feed
-- PatientAISummary lets a provider approve an AI care-plan suggestion, which
-- inserts a row into public.goals with user_id = the parent's auth user id.
-- The existing INSERT policy on goals is owner-only (auth.uid() = user_id),
-- which would block that cross-user write. This policy allows a provider to
-- insert ONLY provider-suggested goals (area = 'provider_suggested') and ONLY
-- for families that have granted that provider profile access.
--
-- Note: provider_patients.parent_user_id is TEXT in the live schema, so the
-- comparison casts goals.user_id (uuid) to text.

DROP POLICY IF EXISTS "Providers with granted access can insert suggested goals" ON public.goals;
CREATE POLICY "Providers with granted access can insert suggested goals"
  ON public.goals FOR INSERT TO authenticated
  WITH CHECK (
    area = 'provider_suggested'
    AND EXISTS (
      SELECT 1
      FROM public.provider_patients pp
      WHERE pp.provider_id = auth.uid()
        AND pp.parent_user_id = goals.user_id::text
        AND pp.profile_access = 'granted'
    )
  );
