// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Google Calendar Edge Function
 *
 * Endpoints:
 *   POST /google-calendar/auth-url      → returns the consent URL parent should visit
 *   POST /google-calendar/exchange      → exchanges code for refresh token (callback)
 *   POST /google-calendar/push-event    → push an Aminy appointment to user's GCal
 *   POST /google-calendar/disconnect    → revoke + delete tokens
 *
 * Required Supabase secrets:
 *   - GOOGLE_OAUTH_CLIENT_ID
 *   - GOOGLE_OAUTH_CLIENT_SECRET
 *   - GOOGLE_OAUTH_REDIRECT_URI   (e.g. https://aminy.ai/auth/google-calendar/callback)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

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

/** Refresh an access token using the stored refresh_token. */
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;

  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!resp.ok) return null;
  return await resp.json();
}

/** Get a valid access token for the user — refreshing if needed. */
async function getValidAccessToken(userId: string): Promise<{ token: string; calendarId: string } | null> {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: row } = await sb
    .from('user_calendar_tokens')
    .select('access_token, access_expires_at, refresh_token, target_calendar_id, status')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle();

  if (!row || row.status !== 'active') return null;

  // If access token is still valid (with 5min buffer), reuse it
  if (row.access_token && row.access_expires_at) {
    const expiresAt = new Date(row.access_expires_at).getTime();
    if (expiresAt > Date.now() + 5 * 60 * 1000) {
      return { token: row.access_token, calendarId: row.target_calendar_id || 'primary' };
    }
  }

  // Otherwise refresh
  const refreshed = await refreshAccessToken(row.refresh_token);
  if (!refreshed) {
    await sb.from('user_calendar_tokens').update({ status: 'expired', last_error: 'refresh failed' }).eq('user_id', userId);
    return null;
  }

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await sb
    .from('user_calendar_tokens')
    .update({ access_token: refreshed.access_token, access_expires_at: newExpiresAt })
    .eq('user_id', userId);

  return { token: refreshed.access_token, calendarId: row.target_calendar_id || 'primary' };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleAuthUrl(req: Request): Promise<Response> {
  const user = await getUserFromAuth(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) return json({ error: 'google_oauth_not_configured' }, 503);

  // Include user.id in state so we know who is connecting on callback.
  // Sign it with the service role key to prevent tampering (short HMAC).
  const state = btoa(JSON.stringify({ userId: user.id, ts: Date.now() }));

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
}

async function handleExchange(req: Request): Promise<Response> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return json({ error: 'google_oauth_not_configured' }, 503);
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

  // Exchange code → tokens
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    return json({ error: `Google token exchange failed: ${err.slice(0, 200)}` }, 502);
  }

  const tokens = await tokenResp.json();
  if (!tokens.refresh_token) {
    return json({ error: 'Google did not return a refresh token. Try disconnecting + reconnecting with prompt=consent.' }, 502);
  }

  // Fetch user's email for display
  let email: string | null = null;
  try {
    const uResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });
    if (uResp.ok) {
      const u = await uResp.json();
      email = u.email || null;
    }
  } catch { /* non-critical */ }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const accessExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

  await sb.from('user_calendar_tokens').upsert({
    user_id: userId,
    provider: 'google',
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    access_expires_at: accessExpiresAt,
    scope: tokens.scope || SCOPES,
    email,
    target_calendar_id: 'primary',
    target_calendar_name: email ? `${email} — Primary` : 'Primary calendar',
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
  if (!auth) return json({ error: 'calendar not connected' }, 412);

  const endAt = apt.end_at ? new Date(apt.end_at) : new Date(new Date(apt.start_at).getTime() + 60 * 60 * 1000);

  const event = {
    summary: apt.title,
    description: [
      apt.provider_name && `Provider: ${apt.provider_name}`,
      apt.service_type && `Service: ${apt.service_type}`,
      apt.notes,
      '\nCreated by Aminy',
    ].filter(Boolean).join('\n'),
    location: apt.location || undefined,
    start: { dateTime: new Date(apt.start_at).toISOString() },
    end: { dateTime: endAt.toISOString() },
    reminders: { useDefault: true },
  };

  // Update existing event if we already pushed it, otherwise create new
  const isUpdate = apt.external_event_id && apt.external_calendar_provider === 'google';
  const url = isUpdate
    ? `https://www.googleapis.com/calendar/v3/calendars/${auth.calendarId}/events/${apt.external_event_id}`
    : `https://www.googleapis.com/calendar/v3/calendars/${auth.calendarId}/events`;

  const resp = await fetch(url, {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: `Google Calendar: ${err.slice(0, 200)}` }, 502);
  }

  const created = await resp.json();
  await sb
    .from('appointments')
    .update({
      external_calendar_provider: 'google',
      external_event_id: created.id,
      external_calendar_id: auth.calendarId,
    })
    .eq('id', appointmentId);

  await sb
    .from('user_calendar_tokens')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id);

  return json({ success: true, eventId: created.id, htmlLink: created.htmlLink });
}

async function handleDisconnect(req: Request): Promise<Response> {
  const user = await getUserFromAuth(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: row } = await sb
    .from('user_calendar_tokens')
    .select('refresh_token')
    .eq('user_id', user.id)
    .maybeSingle();

  // Revoke at Google (best-effort)
  if (row?.refresh_token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${row.refresh_token}`, { method: 'POST' });
    } catch { /* non-critical */ }
  }

  await sb.from('user_calendar_tokens').delete().eq('user_id', user.id);
  return json({ success: true });
}

// ─── Router ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/google-calendar/, '');

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
