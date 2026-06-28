-- Fix "Database error granting user" on OAuth (Google/Apple) + email sign-in.
--
-- Root cause: public.update_last_active_at() (trigger on auth.users sign-in)
-- was SECURITY DEFINER with NO search_path and an UNQUALIFIED `profiles`
-- reference. Under GoTrue's auth role the search_path omits `public`, so it
-- raised `relation "profiles" does not exist`, rolling back the grant
-- transaction and blocking ALL sign-ins/sign-ups (provider-agnostic).
--
-- Fix: pin search_path, fully-qualify public.profiles, and make the
-- non-critical last-active update never block authentication.
CREATE OR REPLACE FUNCTION public.update_last_active_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles SET last_active_at = now() WHERE id = NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;
