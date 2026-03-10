/**
 * Clearinghouse Edge Function
 *
 * Handles secure communication with healthcare clearinghouses and third-party APIs.
 * ALL API keys are stored in Supabase secrets — never exposed to the client.
 *
 * Supported actions (via POST body.action):
 *   eligibility      - Check insurance eligibility (270/271) via Availity
 *   submit_claim     - Submit claims (837P/837I) via Availity
 *   claim_status     - Check claim status (276/277) via Availity
 *   get_remittance   - Fetch remittance advice (835) via Availity
 *   background_check - Proxy Checkr API calls for provider background checks
 *   prior_auth       - Submit prior authorization (stub)
 *
 * Also supports legacy path-based routing:
 *   POST /eligibility, /claims, /claim-status
 *   GET  /health
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Environment variables (stored in Supabase secrets) ──────────────────────

// Availity
const AVAILITY_CLIENT_ID = Deno.env.get('AVAILITY_CLIENT_ID') || '';
const AVAILITY_CLIENT_SECRET = Deno.env.get('AVAILITY_CLIENT_SECRET') || '';
const AVAILITY_API_URL = Deno.env.get('AVAILITY_API_URL') || 'https://api.availity.com';
const AVAILITY_OAUTH_URL = Deno.env.get('AVAILITY_OAUTH_URL') || 'https://api.availity.com/oauth2/token';

// Waystar
const WAYSTAR_API_KEY = Deno.env.get('WAYSTAR_API_KEY') || '';
const WAYSTAR_API_URL = Deno.env.get('WAYSTAR_API_URL') || 'https://api.waystar.com';

// Checkr (background checks)
const CHECKR_API_KEY = Deno.env.get('CHECKR_API_KEY') || '';
const CHECKR_ENV = Deno.env.get('CHECKR_ENV') || 'staging';
const CHECKR_API_BASE = CHECKR_ENV === 'production'
  ? 'https://api.checkr.com'
  : 'https://api.checkr-staging.com';

// Supabase
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

// ── Availity Token Cache ────────────────────────────────────────────────────

let availityToken: { token: string; expiresAt: number } | null = null;

async function getAvailityToken(): Promise<string> {
  if (availityToken && availityToken.expiresAt > Date.now()) {
    return availityToken.token;
  }

  const response = await fetch(AVAILITY_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: AVAILITY_CLIENT_ID,
      client_secret: AVAILITY_CLIENT_SECRET,
      scope: 'hipaa',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Availity OAuth failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  availityToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

function isAvailityConfigured(): boolean {
  return !!(AVAILITY_CLIENT_ID && AVAILITY_CLIENT_SECRET);
}

function isWaystarConfigured(): boolean {
  return !!WAYSTAR_API_KEY;
}

function isCheckrConfigured(): boolean {
  return !!CHECKR_API_KEY;
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
  details: Record<string, unknown>
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

// ── Availity: Eligibility ───────────────────────────────────────────────────

async function checkEligibility(request: {
  memberId: string;
  memberDob: string;
  memberFirstName: string;
  memberLastName: string;
  providerId: string;
  providerTaxId?: string;
  payerId: string;
  serviceDate: string;
  serviceCodes?: string[];
}): Promise<Record<string, unknown>> {
  if (!isAvailityConfigured()) {
    return {
      success: true,
      mock: true,
      transactionId: `MOCK-${Date.now()}`,
      timestamp: new Date().toISOString(),
      subscriber: {
        memberId: request.memberId,
        firstName: request.memberFirstName,
        lastName: request.memberLastName,
        dob: request.memberDob,
        relationship: 'self',
      },
      plan: {
        payerId: request.payerId,
        payerName: 'Test Insurance',
        planName: 'PPO Gold',
        planType: 'PPO',
        effectiveDate: '2024-01-01',
      },
      coverage: {
        isActive: true,
        inNetwork: true,
        deductible: { individual: 500, family: 1500, met: 500, remaining: 0 },
        outOfPocketMax: { individual: 3000, family: 6000, spent: 1250, remaining: 1750 },
        copay: { primaryCare: 25, specialist: 50, telehealth: 25, behavioralHealth: 30 },
        coinsurance: { inNetwork: 20, outOfNetwork: 40 },
      },
      serviceCoverage: [
        { serviceCode: '97153', serviceName: 'ABA Treatment', covered: true, requiresAuth: true, copay: 30 },
        { serviceCode: '97156', serviceName: 'Family Training', covered: true, requiresAuth: false, copay: 25 },
      ],
    };
  }

  const token = await getAvailityToken();
  const response = await fetch(`${AVAILITY_API_URL}/availity/v1/coverages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payerID: request.payerId,
      providerNPI: request.providerId,
      providerTaxID: request.providerTaxId,
      subscriberMemberID: request.memberId,
      subscriberFirstName: request.memberFirstName,
      subscriberLastName: request.memberLastName,
      subscriberDOB: request.memberDob,
      serviceDate: request.serviceDate,
      serviceCodes: request.serviceCodes,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Availity eligibility check failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { success: true, ...data, timestamp: new Date().toISOString() };
}

// ── Availity: Claims ────────────────────────────────────────────────────────

async function submitClaim(claim: {
  claimType: 'professional' | 'institutional';
  billingProvider: Record<string, unknown>;
  subscriber: Record<string, unknown>;
  patient?: Record<string, unknown>;
  payer: Record<string, unknown>;
  diagnosis: Array<{ code: string; isPrimary: boolean }>;
  services: Array<Record<string, unknown>>;
  totalCharges: number;
  priorAuthNumber?: string;
  ediPayload?: string;
}): Promise<Record<string, unknown>> {
  if (!isAvailityConfigured()) {
    return {
      success: true,
      mock: true,
      transactionId: `MOCK-${Date.now()}`,
      claimControlNumber: `CLM${Date.now().toString().slice(-9)}`,
      status: 'accepted',
      timestamp: new Date().toISOString(),
      message: 'Mock claim accepted - configure Availity credentials for production',
    };
  }

  const token = await getAvailityToken();
  const ediPayload = claim.ediPayload || buildEDI837P(claim);

  const response = await fetch(`${AVAILITY_API_URL}/availity/v1/claims`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      claimType: claim.claimType === 'professional' ? '837P' : '837I',
      ediPayload,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Availity claim submission failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

// ── Availity: Claim Status ──────────────────────────────────────────────────

async function checkClaimStatus(request: {
  claimControlNumber?: string;
  memberId: string;
  payerId: string;
  serviceDateFrom: string;
  serviceDateTo?: string;
  providerNpi: string;
  ediPayload?: string;
  format?: string;
}): Promise<Record<string, unknown>> {
  if (!isAvailityConfigured()) {
    return {
      success: true,
      mock: true,
      claims: [{
        claimControlNumber: request.claimControlNumber || `CLM${Date.now()}`,
        status: 'approved',
        statusDate: new Date().toISOString(),
        totalCharged: 500,
        totalPaid: 400,
        checkNumber: 'CHK' + Math.random().toString().slice(2, 10),
        checkDate: new Date().toISOString(),
      }],
    };
  }

  const token = await getAvailityToken();

  // Support raw EDI 276 payload pass-through
  const payload = request.format === '276' && request.ediPayload
    ? { format: '276', payload: request.ediPayload }
    : request;

  const response = await fetch(`${AVAILITY_API_URL}/availity/v1/claim-statuses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Availity status check failed: ${response.status}`);
  }

  return await response.json();
}

// ── Availity: Remittance ────────────────────────────────────────────────────

async function getRemittance(request: {
  providerNpi: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Record<string, unknown>> {
  if (!isAvailityConfigured()) {
    return { success: true, mock: true, eraFiles: [] };
  }

  const token = await getAvailityToken();
  const response = await fetch(`${AVAILITY_API_URL}/availity/v1/remittances`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      providerNPI: request.providerNpi,
      dateFrom: request.dateFrom,
      dateTo: request.dateTo,
    }),
  });

  if (!response.ok) {
    throw new Error(`Availity remittance fetch failed: ${response.status}`);
  }

  return await response.json();
}

// ── Checkr: Background Check Proxy ──────────────────────────────────────────

async function proxyCheckr(request: {
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  if (!isCheckrConfigured()) {
    return {
      success: false,
      error: 'Checkr API key not configured. Set CHECKR_API_KEY in Supabase secrets.',
    };
  }

  const url = `${CHECKR_API_BASE}${request.path}`;
  const headers: Record<string, string> = {
    'Authorization': `Basic ${btoa(CHECKR_API_KEY + ':')}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method: request.method,
    headers,
    ...(request.body && request.method === 'POST' ? { body: JSON.stringify(request.body) } : {}),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      error: `Checkr API error (${response.status}): ${errorText}`,
      httpStatus: response.status,
    };
  }

  const data = await response.json();
  return { success: true, ...data };
}

// ── EDI 837P stub (server-side) ─────────────────────────────────────────────

function buildEDI837P(claim: Record<string, unknown>): string {
  const controlNumber = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  return JSON.stringify({ ...claim, controlNumber });
}

// ── Main Handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const url = new URL(req.url);
    const path = url.pathname.replace('/clearinghouse', '');

    // ── Health check (GET) ────────────────────────────────────────────
    if (req.method === 'GET' && (path === '/health' || path === '')) {
      return jsonResponse({
        status: 'ok',
        availityConfigured: isAvailityConfigured(),
        waystarConfigured: isWaystarConfigured(),
        checkrConfigured: isCheckrConfigured(),
        timestamp: new Date().toISOString(),
      });
    }

    // ── POST actions ──────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json();
      const action = body.action || '';

      // Eligibility
      if (path === '/eligibility' || action === 'eligibility') {
        await logAuditEvent(auth.userId, 'eligibility_check', 'insurance', {
          payerId: body.payerId,
          memberId: body.memberId?.slice(-4),
        });
        const result = await checkEligibility(body);
        return jsonResponse(result);
      }

      // Submit claim
      if (path === '/claims' || action === 'submit_claim') {
        await logAuditEvent(auth.userId, 'claim_submit', 'claim', {
          payerId: body.payer?.payerId,
          totalCharges: body.totalCharges,
        });
        const result = await submitClaim(body);
        return jsonResponse(result);
      }

      // Claim status
      if (path === '/claim-status' || action === 'claim_status') {
        await logAuditEvent(auth.userId, 'claim_status_check', 'claim', {
          claimControlNumber: body.claimControlNumber,
        });
        const result = await checkClaimStatus(body);
        return jsonResponse(result);
      }

      // Remittance advice (ERA 835)
      if (action === 'get_remittance') {
        await logAuditEvent(auth.userId, 'remittance_fetch', 'remittance', {
          providerNpi: body.providerNpi,
        });
        const result = await getRemittance(body);
        return jsonResponse(result);
      }

      // Background check (Checkr proxy)
      if (action === 'background_check') {
        await logAuditEvent(auth.userId, 'background_check', 'provider', {
          checkrPath: body.path,
          checkrMethod: body.method,
        });
        const result = await proxyCheckr({
          method: body.method || 'POST',
          path: body.path,
          body: body.body,
        });
        return jsonResponse(result, result.success === false ? 502 : 200);
      }

      // Prior authorization (stub)
      if (action === 'prior_auth') {
        await logAuditEvent(auth.userId, 'prior_auth', 'authorization', {
          payerId: body.payerId,
          serviceCode: body.serviceCode,
        });
        return jsonResponse({
          success: true,
          mock: true,
          referenceNumber: `PA-${Date.now()}`,
          message: 'Prior auth submission is a stub - implement when EDI 278 support is ready',
        });
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);

  } catch (error) {
    console.error('Clearinghouse function error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Internal error' },
      500
    );
  }
});
