-- Enable RLS + owner-only policies on 7 user-bound tables that the Supabase
-- security advisor flagged as exposed via PostgREST without RLS.
--
-- These are HIPAA-relevant — notification_history contains push payload bodies
-- (may reference child names / events), evv_timesheets contains patient_id and
-- geolocation, etc. Service-role keys (used by edge functions) bypass RLS, so
-- existing server code keeps working.
--
-- Applied directly to the live Supabase project (qpzsvafwcwyrkdolrjbu) via
-- MCP apply_migration; this file checks the same statements into version
-- control.
--
-- Out of scope for this migration:
--   - 6 admin-only tables (claim_ready_cases, partner_invoices, provider_settlements,
--     evv_export_batches, evv_reconciliation_runs, evv_discrepancies) — these
--     have no user_id column and are read by admin dashboards from an
--     authenticated (not service-role) context. Locking them needs an admin
--     role/claim design first.
--   - 7 SECURITY DEFINER views (evv_records, provider_dashboard_stats,
--     screening_summary, pilot_metrics, ab_experiment_summary,
--     fiscal_submissions_summary, daily_active_users) — need per-view review
--     to confirm they don't lose results under SECURITY INVOKER.

-- push_subscriptions: user-managed push tokens (full CRUD by owner)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- notification_preferences: user-managed (full CRUD by owner)
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "users manage own notification preferences" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- notification_history: read-only for owner (server writes via service_role)
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own notification history" ON public.notification_history;
CREATE POLICY "users read own notification history" ON public.notification_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- scheduled_notifications: read-only for owner; server writes
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own scheduled notifications" ON public.scheduled_notifications;
CREATE POLICY "users read own scheduled notifications" ON public.scheduled_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- cr_sync_log: read-only for owner (CentralReach sync activity is user-scoped)
ALTER TABLE public.cr_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own cr_sync_log" ON public.cr_sync_log;
CREATE POLICY "users read own cr_sync_log" ON public.cr_sync_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- cr_sync_errors: read-only for owner
ALTER TABLE public.cr_sync_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own cr_sync_errors" ON public.cr_sync_errors;
CREATE POLICY "users read own cr_sync_errors" ON public.cr_sync_errors
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- evv_timesheets: caregiver sees own shifts; parent of patient sees own child's
-- shifts (patient_id is the child UUID; children.parent_id is the owning user)
ALTER TABLE public.evv_timesheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "caregivers and parents read evv_timesheets" ON public.evv_timesheets;
CREATE POLICY "caregivers and parents read evv_timesheets" ON public.evv_timesheets
  FOR SELECT TO authenticated
  USING (
    auth.uid() = caregiver_id
    OR EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = evv_timesheets.patient_id
        AND children.parent_id = auth.uid()
    )
  );
