-- Provider read access to linked patients' data (APPLIED LIVE 2026-07-02 via MCP — do not re-apply blindly; policies use IF NOT EXISTS guards)
--
-- Without these, a provider with granted profile_access could read NOTHING
-- about their linked families (children/goals/behavior_logs are owner-only),
-- so the provider portal rendered empty. Scope: SELECT only, and only for
-- providers with an explicit provider_patients row with profile_access='granted'.
-- Note: provider_patients.child_id and parent_user_id are TEXT in the live
-- schema, hence the ::text casts.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='children' AND policyname='children_select_linked_provider') THEN
    CREATE POLICY children_select_linked_provider ON public.children FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.provider_patients pp
              WHERE pp.child_id = children.id::text
                AND pp.provider_id = auth.uid()
                AND pp.profile_access = 'granted')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='goals' AND policyname='goals_select_linked_provider') THEN
    CREATE POLICY goals_select_linked_provider ON public.goals FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.provider_patients pp
              WHERE pp.parent_user_id = goals.user_id::text
                AND pp.provider_id = auth.uid()
                AND pp.profile_access = 'granted')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='behavior_logs' AND policyname='behavior_logs_select_linked_provider') THEN
    CREATE POLICY behavior_logs_select_linked_provider ON public.behavior_logs FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.provider_patients pp
              WHERE pp.parent_user_id = behavior_logs.user_id::text
                AND pp.provider_id = auth.uid()
                AND pp.profile_access = 'granted')
    );
  END IF;
END $$;
