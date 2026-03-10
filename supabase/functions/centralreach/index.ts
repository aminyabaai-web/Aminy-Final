/**
 * CentralReach Edge Function
 *
 * Handles secure server-side communication with CentralReach practice management API.
 * ALL OAuth credentials are stored in Supabase secrets — never exposed to the client.
 *
 * Supported actions (via POST body.action):
 *   oauth_token_refresh   - Exchange/refresh OAuth 2.0 tokens
 *   sync_clients          - Fetch client roster from CentralReach
 *   sync_sessions         - Fetch therapy session data
 *   get_sessions          - Alias for sync_sessions
 *   get_goals             - Fetch treatment goals & progress
 *   get_insurance         - Fetch insurance/authorization info
 *   get_home_programs     - Fetch BCBA-assigned home programs
 *   push_behavior_log     - Push ABC incident log to CR
 *   push_routine          - Push home routine completion
 *   push_junior_session   - Push Junior gamified session results
 *   push_wellness         - Push caregiver wellness metrics
 *   push_home_progress    - Push home program completion rates
 *   webhook_verify        - Verify CentralReach webhook signatures
 *
 * Also supports:
 *   GET /  - Health check
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Environment variables (stored in Supabase secrets) ──────────────────────

const CR_CLIENT_ID = Deno.env.get('CENTRALREACH_CLIENT_ID') || '';
const CR_CLIENT_SECRET = Deno.env.get('CENTRALREACH_CLIENT_SECRET') || '';
const CR_BASE_URL = Deno.env.get('CENTRALREACH_BASE_URL') || 'https://members.centralreach.com/api';
const CR_ORG_ID = Deno.env.get('CENTRALREACH_ORG_ID') || '';
const CR_WEBHOOK_SECRET = Deno.env.get('CENTRALREACH_WEBHOOK_SECRET') || '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Auth & Audit ────────────────────────────────────────────────────────────

async function verifyAuth(req: Request): Promise<{ userId: string; role: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return { userId: user.id, role: user.user_metadata?.role || 'parent' };
}

async function logAuditEvent(
  userId: string,
  action: string,
  resourceType: string,
  details: Record<string, unknown>,
): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  await supabase.from('audit_log').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    details,
    timestamp: new Date().toISOString(),
  }).catch(err => console.warn('Audit log failed:', err));
}

// ── CentralReach Token Management ───────────────────────────────────────────

interface CRTokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  organization_id: string;
}

/**
 * Get a valid CentralReach access token for the given organization.
 * Reads stored tokens from DB, auto-refreshes if expired.
 */
async function getCRAccessToken(orgId: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Look up stored tokens
  const { data: tokenRow, error } = await supabase
    .from('centralreach_tokens')
    .select('access_token, refresh_token, expires_at, organization_id')
    .eq('organization_id', orgId)
    .single();

  if (error || !tokenRow) {
    throw new Error(`No CentralReach tokens found for org ${orgId}. Run OAuth flow first.`);
  }

  const row = tokenRow as CRTokenRow;

  // Check if token is still valid (with 60s buffer)
  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt > Date.now() + 60_000) {
    return row.access_token;
  }

  // Token expired — refresh it
  console.log(`[CR] Refreshing expired token for org ${orgId}`);
  const refreshResponse = await fetch(`${CR_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CR_CLIENT_ID,
      client_secret: CR_CLIENT_SECRET,
      refresh_token: row.refresh_token,
    }),
  });

  if (!refreshResponse.ok) {
    const errText = await refreshResponse.text();
    throw new Error(`CentralReach token refresh failed: ${refreshResponse.status} - ${errText}`);
  }

  const tokens = await refreshResponse.json();

  // Store refreshed tokens
  await supabase.from('centralreach_tokens').upsert({
    organization_id: orgId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || row.refresh_token,
    expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  return tokens.access_token;
}

// ── Generic CentralReach API Proxy ──────────────────────────────────────────

async function crApiRequest(
  method: string,
  path: string,
  orgId: string,
  body?: unknown,
): Promise<unknown> {
  const accessToken = await getCRAccessToken(orgId);

  const url = `${CR_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-CR-Organization': orgId,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`CentralReach API ${method} ${path} failed: ${response.status} - ${errText}`);
  }

  return response.json();
}

// ── Action Handlers ─────────────────────────────────────────────────────────

async function handleOAuthTokenRefresh(
  payload: { code?: string; refresh_token?: string },
  userId: string,
): Promise<unknown> {
  const grantType = payload.code ? 'authorization_code' : 'refresh_token';
  const params: Record<string, string> = {
    grant_type: grantType,
    client_id: CR_CLIENT_ID,
    client_secret: CR_CLIENT_SECRET,
  };

  if (payload.code) {
    params.code = payload.code;
    params.redirect_uri = `${SUPABASE_URL}/functions/v1/centralreach/oauth/callback`;
  } else if (payload.refresh_token) {
    params.refresh_token = payload.refresh_token;
  } else {
    throw new Error('Either code or refresh_token is required');
  }

  const response = await fetch(`${CR_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OAuth token exchange failed: ${response.status} - ${errText}`);
  }

  const tokens = await response.json();

  // Store tokens in DB
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const orgId = tokens.organization_id || CR_ORG_ID;

  await supabase.from('centralreach_tokens').upsert({
    organization_id: orgId,
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  await logAuditEvent(userId, 'cr_oauth_token_exchange', 'centralreach', {
    grant_type: grantType,
    organization_id: orgId,
  });

  return { success: true, organization_id: orgId, expires_in: tokens.expires_in };
}

async function handleSyncClients(
  payload: { page?: number; pageSize?: number; status?: string },
  userId: string,
  orgId: string,
): Promise<unknown> {
  const { page = 1, pageSize = 50, status = 'active' } = payload;

  const data = await crApiRequest(
    'GET',
    `/v1/clients?page=${page}&pageSize=${pageSize}&status=${status}`,
    orgId,
  );

  await logAuditEvent(userId, 'cr_sync_clients', 'centralreach', {
    page, pageSize, status, organization_id: orgId,
  });

  return data;
}

async function handleSyncSessions(
  payload: { clientId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number },
  userId: string,
  orgId: string,
): Promise<unknown> {
  const { clientId, startDate, endDate, page = 1, pageSize = 50 } = payload;

  let path = `/v1/sessions?page=${page}&pageSize=${pageSize}`;
  if (clientId) path += `&clientId=${clientId}`;
  if (startDate) path += `&startDate=${startDate}`;
  if (endDate) path += `&endDate=${endDate}`;

  const data = await crApiRequest('GET', path, orgId);

  await logAuditEvent(userId, 'cr_sync_sessions', 'centralreach', {
    clientId, startDate, endDate, organization_id: orgId,
  });

  return data;
}

async function handleGetGoals(
  payload: { clientId: string; domain?: string },
  userId: string,
  orgId: string,
): Promise<unknown> {
  let path = `/v1/clients/${payload.clientId}/goals`;
  if (payload.domain) path += `?domain=${payload.domain}`;

  const data = await crApiRequest('GET', path, orgId);

  await logAuditEvent(userId, 'cr_get_goals', 'centralreach', {
    clientId: payload.clientId, organization_id: orgId,
  });

  return data;
}

async function handleGetInsurance(
  payload: { clientId: string },
  userId: string,
  orgId: string,
): Promise<unknown> {
  const data = await crApiRequest('GET', `/v1/clients/${payload.clientId}/insurance`, orgId);

  await logAuditEvent(userId, 'cr_get_insurance', 'centralreach', {
    clientId: payload.clientId, organization_id: orgId,
  });

  return data;
}

async function handleGetHomePrograms(
  payload: { clientId: string; status?: string },
  userId: string,
  orgId: string,
): Promise<unknown> {
  let path = `/v1/clients/${payload.clientId}/home-programs`;
  if (payload.status) path += `?status=${payload.status}`;

  const data = await crApiRequest('GET', path, orgId);

  await logAuditEvent(userId, 'cr_get_home_programs', 'centralreach', {
    clientId: payload.clientId, organization_id: orgId,
  });

  return data;
}

// ── Push Handlers ───────────────────────────────────────────────────────────

async function handlePushData(
  action: string,
  payload: Record<string, unknown>,
  userId: string,
  orgId: string,
): Promise<unknown> {
  // Map action to CentralReach API endpoint
  const endpointMap: Record<string, { method: string; path: string }> = {
    push_behavior_log: { method: 'POST', path: '/v1/data-points/behavior' },
    push_routine: { method: 'POST', path: '/v1/data-points/routine' },
    push_junior_session: { method: 'POST', path: '/v1/data-points/session' },
    push_wellness: { method: 'POST', path: '/v1/data-points/wellness' },
    push_home_progress: { method: 'POST', path: '/v1/data-points/home-program-progress' },
  };

  const endpoint = endpointMap[action];
  if (!endpoint) {
    throw new Error(`Unknown push action: ${action}`);
  }

  const data = await crApiRequest(endpoint.method, endpoint.path, orgId, payload);

  await logAuditEvent(userId, `cr_${action}`, 'centralreach', {
    organization_id: orgId,
    clientId: payload.clientId,
    dataType: action,
  });

  return data;
}

// ── Webhook Verification ────────────────────────────────────────────────────

async function verifyWebhookSignature(
  payload: string,
  signature: string,
): Promise<boolean> {
  if (!CR_WEBHOOK_SECRET) {
    console.warn('[CR] No webhook secret configured — skipping verification');
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(CR_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSig = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (expectedSig.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    mismatch |= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ── Main Handler ────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    return jsonResponse({
      status: 'healthy',
      service: 'centralreach',
      timestamp: new Date().toISOString(),
      configured: !!(CR_CLIENT_ID && CR_CLIENT_SECRET),
    });
  }

  // All POST actions require auth
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const { action, ...payload } = body;

    if (!action) {
      return jsonResponse({ error: 'Missing action in request body' }, 400);
    }

    // Webhook verification doesn't require user auth
    if (action === 'webhook_verify') {
      const isValid = await verifyWebhookSignature(
        payload.rawBody || '',
        payload.signature || '',
      );
      return jsonResponse({ valid: isValid });
    }

    // All other actions require auth
    const auth = await verifyAuth(req);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const orgId = (payload.organization_id as string) || CR_ORG_ID;

    switch (action) {
      case 'oauth_token_refresh':
        return jsonResponse(await handleOAuthTokenRefresh(payload, auth.userId));

      case 'sync_clients':
        return jsonResponse(await handleSyncClients(payload, auth.userId, orgId));

      case 'sync_sessions':
      case 'get_sessions':
        return jsonResponse(await handleSyncSessions(payload, auth.userId, orgId));

      case 'get_goals':
        return jsonResponse(await handleGetGoals(payload, auth.userId, orgId));

      case 'get_insurance':
        return jsonResponse(await handleGetInsurance(payload, auth.userId, orgId));

      case 'get_home_programs':
        return jsonResponse(await handleGetHomePrograms(payload, auth.userId, orgId));

      case 'push_behavior_log':
      case 'push_routine':
      case 'push_junior_session':
      case 'push_wellness':
      case 'push_home_progress':
        return jsonResponse(await handlePushData(action, payload, auth.userId, orgId));

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error(`[CentralReach] Error:`, err);
    return jsonResponse({ error: message }, 500);
  }
});
