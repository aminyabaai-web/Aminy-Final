// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Outlook (Microsoft Graph) Calendar Edge Function
 *
 * Parallel to google-calendar. Same endpoints:
 *   POST /outlook-calendar/auth-url
 *   POST /outlook-calendar/exchange
 *   POST /outlook-calendar/push-event
 *   POST /outlook-calendar/disconnect
 *
 * Required Supabase secrets:
 *   - MS_OAUTH_CLIENT_ID
 *   - MS_OAUTH_CLIENT_SECRET
 *   - MS_OAUTH_REDIRECT_URI  (e.g. https://aminy.ai/auth/outlook-calendar/callback)
 *   - MS_TENANT (default 'common' — supports personal + work accounts)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MS_CLIENT_ID = Deno.env.get('MS_OAUTH_CLIENT_ID');
const MS_CLIENT_SECRET = Deno.env.get('MS_OAUTH_CLIENT_SECRET');
const MS_REDIRECT_URI = Deno.env.get('MS_OAUTH_REDIRECT_URI');
const MS_TENANT = Deno.env.get('MS_TENANT') || 'common';

const SCOPES = [
  'offline_access',
  'User.Read',
  'Calendars.ReadWrite',
].join(' ');

const AUTHORIZE_URL = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`;
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function getUserFromAuth(req: Request): Promise<{ id: string } | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data } = await sb.auth.getUser(token);
  return data?.user ? { id: data.user.id } : null;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  if (!MS_CLIENT_ID || !MS_CLIENT_SECRET) return null;

  const body = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: SCOPES,
  });

  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!resp.ok) return null;
  return await resp.json();
}

async function getValidAccessToken(userId: string): Promise<{ token: string; calendarId: string } | null> {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: row } = await sb
    .from('user_calendar_tokens')
    .select('access_token, access_expires_at, refresh_token, target_calendar_id, status')
    .eq('user_id', userId)
    .eq('provider', 'outlook')
    .maybeSingle();

  if (!row || row.status !== 'active') return null;

  if (row.access_token && row.access_expires_at) {
    const expiresAt = new Date(row.access_expires_at).getTime();
    if (expiresAt > Date.now() + 5 * 60 * 1000) {
      return { token: row.access_token, calendarId: row.target_calendar_id || 'primary' };
    }
  }

  const refreshed = await refreshAccessToken(row.refresh_token);
  if (!refreshed) {
    await sb.from('user_calendar_tokens').update({ status: 'expired', last_error: 'refresh failed' })
      .eq('user_id', userId).eq('provider', 'outlook');
    return null;
  }

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await sb
    .from('user_calendar_tokens')
    .update({
      access_token: refreshed.access_token,
      access_expires_at: newExpiresAt,
      // Microsoft may rotate the refresh_token — capture if returned
      ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
    })
    .eq('user_id', userId).eq('provider', 'outlook');

  return { token: refreshed.access_token, calendarId: row.target_calendar_id || 'primary' };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleAuthUrl(req: Request): Promise<Response> {
  const user = await getUserFromAuth(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (!MS_CLIENT_ID || !MS_REDIRECT_URI) return json({ error: 'ms_oauth_not_configured' }, 503);

  const state = btoa(JSON.stringify({ userId: user.id, ts: Date.now() }));
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: MS_REDIRECT_URI,
    response_mode: 'query',
    scope: SCOPES,
    state,
  });

  return json({ url: `${AUTHORIZE_URL}?${params}` });
}

async function handleExchange(req: Request): Promise<Response> {
  if (!MS_CLIENT_ID || !MS_CLIENT_SECRET || !MS_REDIRECT_URI) {
    return json({ error: 'ms_oauth_not_configured' }, 503);
  }

  const { code, state } = await req.json();
  if (!code || !state) return json({ error: 'code and state required' }, 400);

  let userId: string;
  try {
    userId = JSON.parse(atob(state)).userId;
    if (!userId) throw new Error('no userId in state');
  } catch {
    return json({ error: 'invalid state' }, 400);
  }

  const body = new URLSearchParams({
    code,
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    redirect_uri: MS_REDIRECT_URI,
    grant_type: 'authorization_code',
    scope: SCOPES,
  });

  const tokenResp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    return json({ error: `Microsoft token exchange failed: ${err.slice(0, 200)}` }, 502);
  }

  const tokens = await tokenResp.json();
  if (!tokens.refresh_token) {
    return json({ error: 'Microsoft did not return a refresh token. Ensure offline_access scope is granted.' }, 502);
  }

  // Fetch user's email via Graph
  let email: string | null = null;
  try {
    const u = await fetch(`${GRAPH_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });
    if (u.ok) {
      const data = await u.json();
      email = data.mail || data.userPrincipalName || null;
    }
  } catch { /* non-critical */ }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const accessExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

  // user_calendar_tokens has a unique on user_id — but only ONE provider per user
  // for the MVP. We delete any existing Google connection if Outlook is being added
  // (the user picks one as their primary push destination). Future: support both.
  await sb.from('user_calendar_tokens').upsert({
    user_id: userId,
    provider: 'outlook',
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    access_expires_at: accessExpiresAt,
    scope: tokens.scope || SCOPES,
    email,
    target_calendar_id: 'primary',
    target_calendar_name: email ? `${email} — Outlook` : 'Outlook calendar',
    connected_at: new Date().toISOString(),
    status: 'active',
    last_error: null,
  }, { onConflict: 'user_id' });

  return json({ success: true, email });
}

async function handlePushEvent(req: Request): Promise<Response> {
  const user = await getUserFromAuth(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { appointmentId } = await req.json();
  if (!appointmentId) return json({ error: 'appointmentId required' }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: apt } = await sb
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!apt) return json({ error: 'appointment not found' }, 404);

  const auth = await getValidAccessToken(user.id);
  if (!auth) return json({ error: 'outlook calendar not connected' }, 412);

  const endAt = apt.end_at ? new Date(apt.end_at) : new Date(new Date(apt.start_at).getTime() + 60 * 60 * 1000);

  const eventPayload = {
    subject: apt.title,
    body: {
      contentType: 'Text',
      content: [
        apt.provider_name && `Provider: ${apt.provider_name}`,
        apt.service_type && `Service: ${apt.service_type}`,
        apt.notes,
        '\nCreated by Aminy',
      ].filter(Boolean).join('\n'),
    },
    start: { dateTime: new Date(apt.start_at).toISOString(), timeZone: 'UTC' },
    end:   { dateTime: endAt.toISOString(), timeZone: 'UTC' },
    location: apt.location ? { displayName: apt.location } : undefined,
    isReminderOn: true,
    reminderMinutesBeforeStart: 60,
  };

  const isUpdate = apt.external_event_id && apt.external_calendar_provider === 'outlook';
  const url = isUpdate
    ? `${GRAPH_BASE}/me/events/${apt.external_event_id}`
    : `${GRAPH_BASE}/me/events`;

  const resp = await fetch(url, {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: `Microsoft Graph: ${err.slice(0, 200)}` }, 502);
  }

  const created = await resp.json();
  await sb
    .from('appointments')
    .update({
      external_calendar_provider: 'outlook',
      external_event_id: created.id,
      external_calendar_id: auth.calendarId,
    })
    .eq('id', appointmentId);

  await sb
    .from('user_calendar_tokens')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('provider', 'outlook');

  return json({ success: true, eventId: created.id, htmlLink: created.webLink });
}

async function handleDisconnect(req: Request): Promise<Response> {
  const user = await getUserFromAuth(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  await sb.from('user_calendar_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'outlook');

  // Note: Microsoft doesn't have a simple revoke endpoint like Google; users
  // can manage app access at https://myaccount.microsoft.com/Apps. We just
  // drop the local tokens — refresh will fail next time if user revoked there.

  return json({ success: true });
}

// ─── Router ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/outlook-calendar/, '');

  try {
    switch (path) {
      case '/auth-url':   return await handleAuthUrl(req);
      case '/exchange':   return await handleExchange(req);
      case '/push-event': return await handlePushEvent(req);
      case '/disconnect': return await handleDisconnect(req);
      default:            return json({ error: 'unknown path', path }, 404);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'internal error';
    return json({ error: msg.slice(0, 300) }, 500);
  }
});
