-- Create a trigger to automatically send a welcome email when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- We use pg_net (http extension) to call our Edge Function
  -- Ensure your Supabase project has the pg_net extension enabled
  PERFORM
    net.http_post(
      url:='https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/make-server-8a022548/email/welcome',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', current_setting('request.jwt.claim.role', true)
      ),
      body:=jsonb_build_object(
        'email', NEW.email,
        'userId', NEW.id,
        'name', NEW.raw_user_meta_data->>'full_name'
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- We will also need to add the `/email/welcome` route to our Edge Function
