-- Batch email lookup for service-role callers (lifecycle-emails cron).
-- auth.users is not exposed via PostgREST, so edge functions cannot select it
-- directly; this SECURITY DEFINER function bridges that for service_role only.
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id, u.email::text FROM auth.users u WHERE u.id = ANY(user_ids);
$$;

REVOKE ALL ON FUNCTION public.get_user_emails(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_emails(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_emails(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_emails(uuid[]) TO service_role;
