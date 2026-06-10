-- Community reply notifications: the scheduled_notifications INSERT policy
-- requires auth.uid() = user_id, so a replier can never insert a row for the
-- post author directly. This SECURITY DEFINER RPC is the sanctioned path.
-- (Applied to remote 2026-06-10 via MCP.)
CREATE OR REPLACE FUNCTION public.notify_community_reply(target_user uuid, post_title text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  -- No self-notifications
  IF target_user = auth.uid() THEN
    RETURN;
  END IF;
  INSERT INTO scheduled_notifications (user_id, title, body, notification_type, scheduled_for, data)
  VALUES (
    target_user,
    'New reply to your post',
    left('Someone replied to your post "' || coalesce(post_title, '') || '"', 200),
    'custom',
    now(),
    jsonb_build_object('type', 'community_reply', 'from_user', auth.uid())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notify_community_reply(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.notify_community_reply(uuid, text) TO authenticated;
