-- ============================================================================
-- Migration 040: RLS Hardening & Comprehensive Indexes
-- Purpose: Tighten overly permissive RLS policies and add missing indexes
-- Date: 2026-03-09
--
-- This migration:
--   1. Replaces `USING (true)` policies with user-scoped policies
--   2. Adds missing DELETE policies where needed
--   3. Tightens INSERT WITH CHECK to scope by auth.uid()
--   4. Adds composite and missing indexes for query performance
-- ============================================================================

-- ============================================================================
-- SECTION 1: TIGHTEN OVERLY PERMISSIVE RLS POLICIES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- secure_messages (migration 012): SELECT/INSERT/UPDATE all use USING(true)
-- Tighten: users can only see messages in threads they belong to
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'secure_messages') THEN
    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "Users can view messages in their threads" ON secure_messages;
    DROP POLICY IF EXISTS "Users can insert messages" ON secure_messages;
    DROP POLICY IF EXISTS "Users can update read status" ON secure_messages;

    -- Scoped SELECT: only messages in threads the user belongs to
    CREATE POLICY "secure_messages_select_own"
      ON secure_messages FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM message_threads mt
          WHERE mt.id = secure_messages.thread_id
          AND (
            mt.provider_id = coalesce(auth.jwt() ->> 'sub', '')
            OR mt.parent_id = coalesce(auth.jwt() ->> 'sub', '')
          )
        )
      );

    -- Scoped INSERT: sender must match current user
    CREATE POLICY "secure_messages_insert_own"
      ON secure_messages FOR INSERT TO authenticated
      WITH CHECK (
        sender_id = coalesce(auth.jwt() ->> 'sub', '')
      );

    -- Scoped UPDATE: only messages in own threads (for read receipts)
    CREATE POLICY "secure_messages_update_own"
      ON secure_messages FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM message_threads mt
          WHERE mt.id = secure_messages.thread_id
          AND (
            mt.provider_id = coalesce(auth.jwt() ->> 'sub', '')
            OR mt.parent_id = coalesce(auth.jwt() ->> 'sub', '')
          )
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- message_threads (migration 012): INSERT uses WITH CHECK(true)
-- Tighten: parent_id or provider_id must match authenticated user
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'message_threads') THEN
    DROP POLICY IF EXISTS "Users can insert threads" ON message_threads;
    CREATE POLICY "message_threads_insert_own"
      ON message_threads FOR INSERT TO authenticated
      WITH CHECK (
        parent_id = coalesce(auth.jwt() ->> 'sub', '')
        OR provider_id = coalesce(auth.jwt() ->> 'sub', '')
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- ab_experiment_assignments (migration 012): FOR ALL USING(true)
-- Tighten: users see own assignments, service role manages
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ab_experiment_assignments') THEN
    DROP POLICY IF EXISTS "Anyone can view assignments" ON ab_experiment_assignments;
    DROP POLICY IF EXISTS "Service role can manage assignments" ON ab_experiment_assignments;

    CREATE POLICY "ab_assignments_select_own"
      ON ab_experiment_assignments FOR SELECT TO authenticated
      USING (user_id = coalesce(auth.jwt() ->> 'sub', ''));

    CREATE POLICY "ab_assignments_insert_own"
      ON ab_experiment_assignments FOR INSERT TO authenticated
      WITH CHECK (user_id = coalesce(auth.jwt() ->> 'sub', ''));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- ab_experiment_events (migration 012): FOR ALL USING(true)
-- Tighten: users see/insert own events only
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ab_experiment_events') THEN
    DROP POLICY IF EXISTS "Anyone can view events" ON ab_experiment_events;
    DROP POLICY IF EXISTS "Service role can manage events" ON ab_experiment_events;

    CREATE POLICY "ab_events_select_own"
      ON ab_experiment_events FOR SELECT TO authenticated
      USING (user_id = coalesce(auth.jwt() ->> 'sub', ''));

    CREATE POLICY "ab_events_insert_own"
      ON ab_experiment_events FOR INSERT TO authenticated
      WITH CHECK (user_id = coalesce(auth.jwt() ->> 'sub', ''));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- feature_flags (migration 012): FOR ALL USING(true) for admin management
-- Tighten: anyone can read, only admins can mutate
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'feature_flags') THEN
    DROP POLICY IF EXISTS "Admins can manage feature flags" ON feature_flags;
    -- Keep SELECT open (feature flags are public config)
    -- Add admin-only write policy
    CREATE POLICY "feature_flags_admin_write"
      ON feature_flags FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND p.role = 'admin'
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- screening_results (migration 012): INSERT uses WITH CHECK(true)
-- Tighten: user_id must match auth.uid text
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'screening_results') THEN
    DROP POLICY IF EXISTS "Users can insert screenings" ON screening_results;
    CREATE POLICY "screening_results_insert_own"
      ON screening_results FOR INSERT TO authenticated
      WITH CHECK (user_id = coalesce(auth.jwt() ->> 'sub', ''));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- fiscal_agent_submissions (migration 012): INSERT uses WITH CHECK(true)
-- Tighten: user_id must match auth user
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'fiscal_agent_submissions') THEN
    DROP POLICY IF EXISTS "Users can insert submissions" ON fiscal_agent_submissions;
    CREATE POLICY "fiscal_submissions_insert_own"
      ON fiscal_agent_submissions FOR INSERT TO authenticated
      WITH CHECK (
        user_id = coalesce(auth.jwt() ->> 'sub', '')
        OR provider_id = coalesce(auth.jwt() ->> 'sub', '')
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- From migration 011 (clinical phase 2):
-- Many tables use USING(true) — tighten where possible
-- ---------------------------------------------------------------------------

-- abc_entries: tighten INSERT
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'abc_entries' AND schemaname = 'public') THEN
    -- The existing policies reference user_id with auth.uid()::text or auth.jwt()->>'sub'
    -- Just ensure INSERT is scoped (if it exists with true)
    DROP POLICY IF EXISTS "Users can insert abc entries" ON abc_entries;
    CREATE POLICY "abc_entries_insert_own"
      ON abc_entries FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
  END IF;
END $$;

-- treatment_plans: add user-scoped policies if currently USING(true)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'treatment_plans' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can view treatment plans" ON treatment_plans;
    DROP POLICY IF EXISTS "Users can insert treatment plans" ON treatment_plans;
    DROP POLICY IF EXISTS "Users can update treatment plans" ON treatment_plans;

    CREATE POLICY "treatment_plans_select_own"
      ON treatment_plans FOR SELECT TO authenticated
      USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));

    CREATE POLICY "treatment_plans_insert_own"
      ON treatment_plans FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));

    CREATE POLICY "treatment_plans_update_own"
      ON treatment_plans FOR UPDATE TO authenticated
      USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));

    -- Add missing DELETE policy
    CREATE POLICY "treatment_plans_delete_own"
      ON treatment_plans FOR DELETE TO authenticated
      USING (user_id = auth.uid()::text OR user_id = coalesce(auth.jwt() ->> 'sub', ''));
  END IF;
END $$;

-- treatment_goals: tighten from USING(true)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'treatment_goals' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can view treatment goals" ON treatment_goals;
    DROP POLICY IF EXISTS "Users can insert treatment goals" ON treatment_goals;
    DROP POLICY IF EXISTS "Users can update treatment goals" ON treatment_goals;

    CREATE POLICY "treatment_goals_select_own"
      ON treatment_goals FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM treatment_plans tp
          WHERE tp.id::text = treatment_goals.plan_id::text
          AND (tp.user_id = auth.uid()::text OR tp.user_id = coalesce(auth.jwt() ->> 'sub', ''))
        )
      );

    CREATE POLICY "treatment_goals_insert_own"
      ON treatment_goals FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM treatment_plans tp
          WHERE tp.id::text = treatment_goals.plan_id::text
          AND (tp.user_id = auth.uid()::text OR tp.user_id = coalesce(auth.jwt() ->> 'sub', ''))
        )
      );

    CREATE POLICY "treatment_goals_update_own"
      ON treatment_goals FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM treatment_plans tp
          WHERE tp.id::text = treatment_goals.plan_id::text
          AND (tp.user_id = auth.uid()::text OR tp.user_id = coalesce(auth.jwt() ->> 'sub', ''))
        )
      );
  END IF;
END $$;

-- goal_progress_updates: tighten from USING(true)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'goal_progress_updates' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can view goal progress" ON goal_progress_updates;
    DROP POLICY IF EXISTS "Users can insert goal progress" ON goal_progress_updates;

    CREATE POLICY "goal_progress_select_own"
      ON goal_progress_updates FOR SELECT TO authenticated
      USING (
        recorded_by = auth.uid()::text
        OR recorded_by = coalesce(auth.jwt() ->> 'sub', '')
      );

    CREATE POLICY "goal_progress_insert_own"
      ON goal_progress_updates FOR INSERT TO authenticated
      WITH CHECK (
        recorded_by = auth.uid()::text
        OR recorded_by = coalesce(auth.jwt() ->> 'sub', '')
      );
  END IF;
END $$;

-- clinical_outcomes: tighten from USING(true)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'clinical_outcomes' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can view outcomes" ON clinical_outcomes;
    DROP POLICY IF EXISTS "Users can insert outcomes" ON clinical_outcomes;

    CREATE POLICY "clinical_outcomes_select_own"
      ON clinical_outcomes FOR SELECT TO authenticated
      USING (
        recorded_by = auth.uid()::text
        OR recorded_by = coalesce(auth.jwt() ->> 'sub', '')
      );

    CREATE POLICY "clinical_outcomes_insert_own"
      ON clinical_outcomes FOR INSERT TO authenticated
      WITH CHECK (
        recorded_by = auth.uid()::text
        OR recorded_by = coalesce(auth.jwt() ->> 'sub', '')
      );
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: ADD MISSING DELETE POLICIES
-- ============================================================================

-- stress_logs: add DELETE policy
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stress_logs') THEN
    DROP POLICY IF EXISTS "stress_logs_delete_own" ON stress_logs;
    CREATE POLICY "stress_logs_delete_own"
      ON stress_logs FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- goal_achievements: add DELETE policy
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'goal_achievements') THEN
    DROP POLICY IF EXISTS "goal_achievements_delete_own" ON goal_achievements;
    CREATE POLICY "goal_achievements_delete_own"
      ON goal_achievements FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- wins_journal: add DELETE policy
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'wins_journal') THEN
    DROP POLICY IF EXISTS "wins_journal_delete_own" ON wins_journal;
    CREATE POLICY "wins_journal_delete_own"
      ON wins_journal FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- medications: add DELETE policy
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'medications') THEN
    DROP POLICY IF EXISTS "medications_delete_own" ON medications;
    CREATE POLICY "medications_delete_own"
      ON medications FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- medication_logs: add DELETE policy
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'medication_logs') THEN
    DROP POLICY IF EXISTS "medication_logs_delete_own" ON medication_logs;
    CREATE POLICY "medication_logs_delete_own"
      ON medication_logs FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: COMPREHENSIVE INDEXES FOR QUERY PERFORMANCE
-- ============================================================================

-- Composite indexes for common query patterns
-- These use IF NOT EXISTS to be safe for re-runs

-- profiles: user lookup + tier queries
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
    CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
  END IF;
END $$;

-- children: user_id + created_at for listing
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'children') THEN
    CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
    CREATE INDEX IF NOT EXISTS idx_children_created_at ON children(created_at DESC);
  END IF;
END $$;

-- child_profiles: user_id + child_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'child_profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_child_profiles_created_at ON child_profiles(created_at DESC);
  END IF;
END $$;

-- stress_logs: user_id + created_at for time-series
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stress_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_stress_logs_user_id ON stress_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_stress_logs_created_at ON stress_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stress_logs_user_created ON stress_logs(user_id, created_at DESC);
  END IF;
END $$;

-- routine_completions: user_id + created_at for tracking
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'routine_completions') THEN
    CREATE INDEX IF NOT EXISTS idx_routine_completions_user_id ON routine_completions(user_id);
    CREATE INDEX IF NOT EXISTS idx_routine_completions_created_at ON routine_completions(created_at DESC);
  END IF;
END $$;

-- goal_achievements: user_id + created_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'goal_achievements') THEN
    CREATE INDEX IF NOT EXISTS idx_goal_achievements_user_id ON goal_achievements(user_id);
    CREATE INDEX IF NOT EXISTS idx_goal_achievements_created_at ON goal_achievements(created_at DESC);
  END IF;
END $$;

-- calm_coins: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'calm_coins') THEN
    CREATE INDEX IF NOT EXISTS idx_calm_coins_user_id ON calm_coins(user_id);
    CREATE INDEX IF NOT EXISTS idx_calm_coins_created_at ON calm_coins(created_at DESC);
  END IF;
END $$;

-- rewards: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'rewards') THEN
    CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);
  END IF;
END $$;

-- wins_journal: user_id + created_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'wins_journal') THEN
    CREATE INDEX IF NOT EXISTS idx_wins_journal_user_id ON wins_journal(user_id);
    CREATE INDEX IF NOT EXISTS idx_wins_journal_created_at ON wins_journal(created_at DESC);
  END IF;
END $$;

-- goals: user_id + status
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'goals') THEN
    CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
    CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at DESC);
  END IF;
END $$;

-- medications: user_id + child_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'medications') THEN
    CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
    CREATE INDEX IF NOT EXISTS idx_medications_child_id ON medications(child_id);
  END IF;
END $$;

-- medication_logs: user_id + created_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'medication_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_medication_logs_user_id ON medication_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_medication_logs_created_at ON medication_logs(created_at DESC);
  END IF;
END $$;

-- behavior_intervention_plans: user_id + child_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'behavior_intervention_plans') THEN
    CREATE INDEX IF NOT EXISTS idx_bip_user_id ON behavior_intervention_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_bip_child_id ON behavior_intervention_plans(child_id);
  END IF;
END $$;

-- assessment_results: user_id + child_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'assessment_results') THEN
    CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON assessment_results(user_id);
    CREATE INDEX IF NOT EXISTS idx_assessment_results_child_id ON assessment_results(child_id);
    CREATE INDEX IF NOT EXISTS idx_assessment_results_created_at ON assessment_results(created_at DESC);
  END IF;
END $$;

-- crisis_logs: user_id + created_at (time-sensitive)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'crisis_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_crisis_logs_user_id ON crisis_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_crisis_logs_created_at ON crisis_logs(created_at DESC);
  END IF;
END $$;

-- telehealth_sessions: user_id + provider_id + status
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'telehealth_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_user_id ON telehealth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_provider_id ON telehealth_sessions(provider_id);
    CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_status ON telehealth_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_scheduled ON telehealth_sessions(scheduled_at);
  END IF;
END $$;

-- marketplace_bookings: user_id + provider_id + status
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'marketplace_bookings') THEN
    CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_user_id ON marketplace_bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_provider_id ON marketplace_bookings(provider_id);
    CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_status ON marketplace_bookings(status);
    CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_created ON marketplace_bookings(created_at DESC);
  END IF;
END $$;

-- user_preferences: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_preferences') THEN
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
  END IF;
END $$;

-- user_profiles (from migration 017): id + role
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);
  END IF;
END $$;

-- notification_preferences: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notification_preferences') THEN
    CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
  END IF;
END $$;

-- privacy_settings: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'privacy_settings') THEN
    CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON privacy_settings(user_id);
  END IF;
END $$;

-- app_preferences: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'app_preferences') THEN
    CREATE INDEX IF NOT EXISTS idx_app_preferences_user_id ON app_preferences(user_id);
  END IF;
END $$;

-- care_plan_action_items: user_id + care_plan_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'care_plan_action_items') THEN
    CREATE INDEX IF NOT EXISTS idx_care_plan_action_items_user_id ON care_plan_action_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_care_plan_action_items_created ON care_plan_action_items(created_at DESC);
  END IF;
END $$;

-- care_plan_goals: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'care_plan_goals') THEN
    CREATE INDEX IF NOT EXISTS idx_care_plan_goals_user_id ON care_plan_goals(user_id);
  END IF;
END $$;

-- jr_sessions: user_id + child_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'jr_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_jr_sessions_user_id ON jr_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_jr_sessions_child_id ON jr_sessions(child_id);
    CREATE INDEX IF NOT EXISTS idx_jr_sessions_created_at ON jr_sessions(created_at DESC);
  END IF;
END $$;

-- caregiver_time_entries: user_id + provider_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'caregiver_time_entries') THEN
    CREATE INDEX IF NOT EXISTS idx_caregiver_time_entries_user_id ON caregiver_time_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_caregiver_time_entries_provider_id ON caregiver_time_entries(provider_id);
    CREATE INDEX IF NOT EXISTS idx_caregiver_time_entries_created ON caregiver_time_entries(created_at DESC);
  END IF;
END $$;

-- vault_documents: user_id + created_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'vault_documents') THEN
    CREATE INDEX IF NOT EXISTS idx_vault_documents_user_id ON vault_documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_vault_documents_created_at ON vault_documents(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_vault_documents_type ON vault_documents(document_type);
  END IF;
END $$;

-- analytics_events: user_id + event_type + created_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'analytics_events') THEN
    CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events(user_id, event_type);
  END IF;
END $$;

-- user_streaks: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_streaks') THEN
    CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
  END IF;
END $$;

-- daily_routines: user_id + child_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'daily_routines') THEN
    CREATE INDEX IF NOT EXISTS idx_daily_routines_user_id ON daily_routines(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_routines_child_id ON daily_routines(child_id);
  END IF;
END $$;

-- treatment_plans: user_id + child_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'treatment_plans') THEN
    CREATE INDEX IF NOT EXISTS idx_treatment_plans_user_id ON treatment_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_treatment_plans_child_id ON treatment_plans(child_id);
    CREATE INDEX IF NOT EXISTS idx_treatment_plans_created ON treatment_plans(created_at DESC);
  END IF;
END $$;

-- abc_entries: user_id + child_id + created_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'abc_entries') THEN
    CREATE INDEX IF NOT EXISTS idx_abc_entries_user_id ON abc_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_abc_entries_child_id ON abc_entries(child_id);
    CREATE INDEX IF NOT EXISTS idx_abc_entries_created ON abc_entries(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_abc_entries_user_child ON abc_entries(user_id, child_id);
  END IF;
END $$;

-- gad7_responses: user_id + created_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'gad7_responses') THEN
    CREATE INDEX IF NOT EXISTS idx_gad7_responses_user_id ON gad7_responses(user_id);
    CREATE INDEX IF NOT EXISTS idx_gad7_responses_created ON gad7_responses(created_at DESC);
  END IF;
END $$;

-- phq9_responses: user_id + created_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'phq9_responses') THEN
    CREATE INDEX IF NOT EXISTS idx_phq9_responses_user_id ON phq9_responses(user_id);
    CREATE INDEX IF NOT EXISTS idx_phq9_responses_created ON phq9_responses(created_at DESC);
  END IF;
END $$;

-- nps_responses: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'nps_responses') THEN
    CREATE INDEX IF NOT EXISTS idx_nps_responses_user_id ON nps_responses(user_id);
    CREATE INDEX IF NOT EXISTS idx_nps_responses_created ON nps_responses(created_at DESC);
  END IF;
END $$;

-- error_logs: user_id + created_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'error_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
  END IF;
END $$;

-- user_feedback: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_feedback') THEN
    CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);
  END IF;
END $$;

-- stripe_customers: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stripe_customers') THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
  END IF;
END $$;

-- promo_redemptions: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'promo_redemptions') THEN
    CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_id ON promo_redemptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_promo_redemptions_created ON promo_redemptions(created_at DESC);
  END IF;
END $$;

-- account_deletion_requests: user_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'account_deletion_requests') THEN
    CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON account_deletion_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status ON account_deletion_requests(status);
  END IF;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================
COMMENT ON SCHEMA public IS 'Migration 040: RLS hardening + comprehensive indexes applied 2026-03-09';
