/**
 * Rethink BH Edge Function
 *
 * Handles secure server-side communication with the Rethink Behavioral Health
 * practice management API. ALL OAuth credentials stored in Supabase secrets.
 *
 * When RETHINK_CLIENT_ID is absent (dev / before pilot creds arrive), every
 * route returns rich mock data matching the TypeScript interfaces in
 * src/lib/rethink-integration.ts so the UI renders and demoes correctly.
 *
 * Supported actions (POST body.action):
 *   oauth_authorize        - Build OAuth 2.0 authorization URL
 *   oauth_token            - Exchange code for tokens
 *   oauth_refresh          - Refresh access token
 *   get_clients            - Fetch full client roster
 *   get_client             - Fetch single client by id
 *   get_sessions           - Fetch sessions for a client
 *   get_goals              - Fetch treatment goals
 *   get_behaviors          - Fetch behavior programs
 *   get_authorizations     - Fetch insurance authorizations
 *   push_behavior_log      - Push ABC incident log to Rethink
 *   push_note              - Push caregiver observation note
 *   webhook                - Handle inbound Rethink webhooks
 *
 * GET / — Health check
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RETHINK_CLIENT_ID     = Deno.env.get('RETHINK_CLIENT_ID') ?? '';
const RETHINK_CLIENT_SECRET = Deno.env.get('RETHINK_CLIENT_SECRET') ?? '';
const RETHINK_BASE_URL      = Deno.env.get('RETHINK_BASE_URL') ?? 'https://api.rethinkbh.com/v1';
const RETHINK_WEBHOOK_SECRET = Deno.env.get('RETHINK_WEBHOOK_SECRET') ?? '';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const MOCK_MODE = !RETHINK_CLIENT_ID;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Token storage ────────────────────────────────────────────────────────────

async function getStoredToken(providerId: string) {
  const sb = serviceClient();
  const { data } = await sb
    .from('rethink_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('provider_id', providerId)
    .single();
  return data;
}

async function storeToken(providerId: string, tokens: {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}) {
  const sb = serviceClient();
  await sb.from('rethink_tokens').upsert(
    { provider_id: providerId, ...tokens },
    { onConflict: 'provider_id' }
  );
}

// ── OAuth ────────────────────────────────────────────────────────────────────

function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: RETHINK_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'clients sessions goals behaviors authorizations staff',
    state,
  });
  return `${RETHINK_BASE_URL}/oauth/authorize?${params}`;
}

async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(`${RETHINK_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: RETHINK_CLIENT_ID,
      client_secret: RETHINK_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshToken(providerId: string, refreshTok: string) {
  const res = await fetch(`${RETHINK_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTok,
      client_id: RETHINK_CLIENT_ID,
      client_secret: RETHINK_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const tokens = await res.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await storeToken(providerId, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? refreshTok,
    expires_at: expiresAt,
  });
  return tokens.access_token;
}

async function getAccessToken(providerId: string): Promise<string> {
  const stored = await getStoredToken(providerId);
  if (!stored) throw new Error('Not connected to Rethink — complete OAuth first');
  const expiresAt = new Date(stored.expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) return stored.access_token;
  return refreshToken(providerId, stored.refresh_token);
}

// ── API proxy ────────────────────────────────────────────────────────────────

async function rethinkGet(path: string, accessToken: string): Promise<unknown> {
  const res = await fetch(`${RETHINK_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Rethink API error: ${res.status} ${path}`);
  return res.json();
}

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CLIENT = {
  id: 'mock-client-001',
  firstName: 'Alex',
  lastName: 'Sample',
  dateOfBirth: '2018-04-12',
  diagnosisCodes: ['F84.0'],
  primaryDiagnosis: 'Autism Spectrum Disorder',
  status: 'active',
  primaryBcbaId: 'mock-bcba-001',
  primaryRbtId: 'mock-rbt-001',
  clinicId: 'mock-clinic-001',
  createdAt: '2025-01-15T00:00:00Z',
  updatedAt: new Date().toISOString(),
};

const MOCK_SESSION = {
  id: 'mock-session-001',
  clientId: 'mock-client-001',
  sessionDate: new Date().toISOString().slice(0, 10),
  durationMinutes: 90,
  sessionType: 'direct_therapy',
  location: 'home',
  notes: 'Good session — Alex completed all DTT trials with 85% accuracy.',
  parentSignature: true,
  status: 'signed',
  billingCode: '97153',
  billingUnits: 6,
  goalData: [
    { goalId: 'g1', programName: 'Manding', trials: 10, correct: 9, accuracy: 90, promptLevel: 'independent', phase: 'maintenance' },
  ],
  behaviorData: [
    { behaviorId: 'b1', behaviorName: 'Elopement', count: 1, intensity: 'low' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_GOAL = {
  id: 'mock-goal-001',
  clientId: 'mock-client-001',
  programName: 'Receptive Language: Body Parts',
  targetBehavior: 'Identify body parts when named',
  domain: 'Communication',
  status: 'active',
  masteryDate: null,
  currentAccuracy: 82,
  targetAccuracy: 80,
  trialsToMastery: 3,
  phase: 'maintenance',
  createdAt: '2025-03-01T00:00:00Z',
  updatedAt: new Date().toISOString(),
};

const MOCK_BEHAVIOR = {
  id: 'mock-behavior-001',
  clientId: 'mock-client-001',
  behaviorName: 'Tantrum / Meltdown',
  definition: 'Crying, screaming, or falling to the floor lasting >30s',
  measurementType: 'frequency',
  baselineRate: 5,
  currentRate: 2,
  reductionGoal: 0,
  status: 'active',
  createdAt: '2025-03-01T00:00:00Z',
  updatedAt: new Date().toISOString(),
};

const MOCK_AUTHORIZATION = {
  id: 'mock-auth-001',
  clientId: 'mock-client-001',
  insurerName: 'AHCCCS / DDD',
  serviceCode: '97153',
  serviceDescription: 'Adaptive behavior treatment by protocol',
  authorizedUnits: 240,
  usedUnits: 96,
  remainingUnits: 144,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'active',
  priorAuthNumber: 'MOCK-PA-2026-001',
};

// ── Webhook handlers ─────────────────────────────────────────────────────────

async function handleWebhook(event: string, data: Record<string, unknown>) {
  const sb = serviceClient();

  switch (event) {
    case 'session.completed':
    case 'session.signed': {
      const session = data as {
        id: string; client_id: string; staff_id: string;
        session_date: string; session_type: string; notes: string;
        signed_at: string;
      };
      // Find the Aminy user linked to this Rethink client
      const { data: profile } = await sb
        .from('profiles')
        .select('id')
        .eq('rethink_client_id', session.client_id)
        .maybeSingle();
      if (profile) {
        await sb.from('session_notes').upsert({
          user_id: profile.id,
          rethink_session_id: session.id,
          session_type: session.session_type,
          content: session.notes ?? '',
          session_date: session.session_date,
          signed_at: session.signed_at ?? null,
        }, { onConflict: 'rethink_session_id' });
      }
      break;
    }

    case 'goal.updated':
    case 'goal.mastered': {
      const goal = data as { id: string; client_id: string; program_name: string; status: string; current_accuracy: number };
      const { data: profile } = await sb
        .from('profiles')
        .select('id')
        .eq('rethink_client_id', goal.client_id)
        .maybeSingle();
      if (profile) {
        await sb.from('goals').upsert({
          user_id: profile.id,
          rethink_goal_id: goal.id,
          title: goal.program_name,
          status: goal.status === 'mastered' ? 'mastered' : 'active',
          progress_notes: `Current accuracy: ${goal.current_accuracy}%`,
        }, { onConflict: 'rethink_goal_id' });
      }
      break;
    }

    case 'behavior.updated': {
      const beh = data as { id: string; client_id: string; behavior_name: string; count: number; intensity: string; notes: string };
      const { data: profile } = await sb
        .from('profiles')
        .select('id')
        .eq('rethink_client_id', beh.client_id)
        .maybeSingle();
      if (profile) {
        await sb.from('behavior_logs').insert({
          user_id: profile.id,
          behavior_type: beh.behavior_name,
          intensity: beh.count,
          notes: beh.notes ?? '',
          is_positive: false,
          source: 'rethink',
        });
      }
      break;
    }

    case 'authorization.changed': {
      const auth = data as {
        id: string; client_id: string; service_code: string;
        authorized_units: number; used_units: number; status: string;
        end_date: string;
      };
      const { data: profile } = await sb
        .from('profiles')
        .select('id')
        .eq('rethink_client_id', auth.client_id)
        .maybeSingle();
      if (profile) {
        await sb.from('coverage_authorizations').upsert({
          user_id: profile.id,
          rethink_auth_id: auth.id,
          service_code: auth.service_code,
          authorized_units: auth.authorized_units,
          used_units: auth.used_units,
          remaining_units: auth.authorized_units - auth.used_units,
          status: auth.status,
          end_date: auth.end_date,
        }, { onConflict: 'rethink_auth_id' });
      }
      break;
    }

    case 'note.signed': {
      const note = data as { client_id: string; provider_name: string };
      const { data: profile } = await sb
        .from('profiles')
        .select('id')
        .eq('rethink_client_id', note.client_id)
        .maybeSingle();
      if (profile) {
        // notification_type must satisfy the CHECK in 006_push_notifications.sql
        // ('custom' is the catch-all); there is no status column on this table.
        await sb.from('scheduled_notifications').insert({
          user_id: profile.id,
          notification_type: 'custom',
          title: 'Session notes signed',
          body: `Your provider has signed the session notes for today's session.`,
          scheduled_for: new Date().toISOString(),
          data: { type: 'session_note_ready' },
        });
      }
      break;
    }

    default:
      console.info('[Rethink] Unhandled webhook event:', event);
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (req.method === 'GET') {
    return json({
      service: 'rethink',
      mode: MOCK_MODE ? 'mock' : 'live',
      configured: !MOCK_MODE,
      baseUrl: MOCK_MODE ? '(not set)' : RETHINK_BASE_URL,
    });
  }

  // Read raw body ONCE — webhook HMAC must verify the exact bytes Rethink
  // signed (re-serialized JSON will not byte-match).
  const rawBody = await req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const action = body.action as string;

  // ── Authorization gate ──────────────────────────────────────────────────
  // Webhook: authenticated by HMAC below (Rethink sends no Supabase JWT).
  // Everything else returns PHI or pushes clinical data — require a real
  // authenticated user, and scope provider_id to the caller (admins exempt).
  let providerId = 'default';
  if (action !== 'webhook') {
    const sb = serviceClient();
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user } = { user: null } } = await sb.auth.getUser(jwt);
    if (!user) return json({ error: 'Authentication required' }, 401);
    providerId = (body.provider_id as string) || user.id;
    if (providerId !== user.id) {
      const { data: prof } = await sb.from('profiles').select('role').eq('id', user.id).single();
      if (prof?.role !== 'admin') {
        return json({ error: 'provider_id must match the authenticated user' }, 403);
      }
    }
  }

  try {
    // ── OAuth ─────────────────────────────────────────────────────────────
    if (action === 'oauth_authorize') {
      if (MOCK_MODE) return json({ url: null, mock: true, message: 'Set RETHINK_CLIENT_ID secret to enable OAuth' });
      const url = buildAuthUrl(body.redirect_uri as string, body.state as string);
      return json({ url });
    }

    if (action === 'oauth_token') {
      if (MOCK_MODE) return json({ mock: true });
      const tokens = await exchangeCode(body.code as string, body.redirect_uri as string);
      const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
      await storeToken(providerId, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      });
      return json({ ok: true });
    }

    if (action === 'oauth_refresh') {
      if (MOCK_MODE) return json({ mock: true });
      const stored = await getStoredToken(providerId);
      if (!stored) return json({ error: 'No stored token' }, 400);
      await refreshToken(providerId, stored.refresh_token);
      return json({ ok: true });
    }

    // ── Data routes ───────────────────────────────────────────────────────
    if (action === 'get_clients') {
      if (MOCK_MODE) return json({ clients: [MOCK_CLIENT], mock: true });
      const token = await getAccessToken(providerId);
      const data = await rethinkGet('/clients', token);
      return json(data);
    }

    if (action === 'get_client') {
      if (MOCK_MODE) return json({ client: MOCK_CLIENT, mock: true });
      const token = await getAccessToken(providerId);
      const data = await rethinkGet(`/clients/${body.client_id}`, token);
      return json(data);
    }

    if (action === 'get_sessions') {
      if (MOCK_MODE) return json({ sessions: [MOCK_SESSION], mock: true });
      const token = await getAccessToken(providerId);
      const qs = body.client_id ? `?client_id=${body.client_id}` : '';
      const data = await rethinkGet(`/sessions${qs}`, token);
      return json(data);
    }

    if (action === 'get_goals') {
      if (MOCK_MODE) return json({ goals: [MOCK_GOAL], mock: true });
      const token = await getAccessToken(providerId);
      const qs = body.client_id ? `?client_id=${body.client_id}` : '';
      const data = await rethinkGet(`/goals${qs}`, token);
      return json(data);
    }

    if (action === 'get_behaviors') {
      if (MOCK_MODE) return json({ behaviors: [MOCK_BEHAVIOR], mock: true });
      const token = await getAccessToken(providerId);
      const qs = body.client_id ? `?client_id=${body.client_id}` : '';
      const data = await rethinkGet(`/behaviors${qs}`, token);
      return json(data);
    }

    if (action === 'get_authorizations') {
      if (MOCK_MODE) return json({ authorizations: [MOCK_AUTHORIZATION], mock: true });
      const token = await getAccessToken(providerId);
      const qs = body.client_id ? `?client_id=${body.client_id}` : '';
      const data = await rethinkGet(`/authorizations${qs}`, token);
      return json(data);
    }

    if (action === 'push_behavior_log') {
      if (MOCK_MODE) return json({ ok: true, mock: true });
      const token = await getAccessToken(providerId);
      const res = await fetch(`${RETHINK_BASE_URL}/behavior-incidents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body.data),
      });
      return json({ ok: res.ok, status: res.status });
    }

    if (action === 'push_note') {
      if (MOCK_MODE) return json({ ok: true, mock: true });
      const token = await getAccessToken(providerId);
      const res = await fetch(`${RETHINK_BASE_URL}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body.data),
      });
      return json({ ok: res.ok, status: res.status });
    }

    // ── Inbound webhook ───────────────────────────────────────────────────
    if (action === 'webhook') {
      // HMAC over the RAW request body is the webhook's only authentication.
      // No secret configured -> refuse everything (an open write path into
      // session_notes/goals/behavior_logs is worse than a dead webhook).
      if (!RETHINK_WEBHOOK_SECRET) {
        return json({ error: 'Webhook not configured (RETHINK_WEBHOOK_SECRET unset)' }, 401);
      }
      const sig = req.headers.get('x-rethink-signature') ?? '';
      const expected = await computeHmac(RETHINK_WEBHOOK_SECRET, rawBody);
      if (!sig || !timingSafeEqual(sig, expected)) {
        return json({ error: 'Invalid signature' }, 401);
      }
      const event  = body.event as string;
      const data   = (body.data ?? {}) as Record<string, unknown>;
      await handleWebhook(event, data);
      return json({ acknowledged: true, event });
    }

    return json({ error: `Unknown action: ${action}` }, 400);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Rethink] Error:', msg);
    return json({ error: msg }, 500);
  }
});

// ── HMAC helpers ─────────────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function computeHmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}
