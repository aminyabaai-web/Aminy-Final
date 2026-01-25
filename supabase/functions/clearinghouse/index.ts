/**
 * Clearinghouse Edge Function
 *
 * Handles secure communication with healthcare clearinghouses (Availity, Waystar)
 * API keys are stored in Supabase secrets, not exposed to client
 *
 * Endpoints:
 * POST /eligibility - Check insurance eligibility (270/271)
 * POST /claims - Submit claims (837P)
 * POST /claim-status - Check claim status (276/277)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables (stored in Supabase secrets)
const AVAILITY_CLIENT_ID = Deno.env.get('AVAILITY_CLIENT_ID') || '';
const AVAILITY_CLIENT_SECRET = Deno.env.get('AVAILITY_CLIENT_SECRET') || '';
const AVAILITY_API_URL = Deno.env.get('AVAILITY_API_URL') || 'https://api.availity.com';
const AVAILITY_OAUTH_URL = Deno.env.get('AVAILITY_OAUTH_URL') || 'https://api.availity.com/oauth2/token';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token cache
let availityToken: { token: string; expiresAt: number } | null = null;

/**
 * Get Availity OAuth token
 */
async function getAvailityToken(): Promise<string> {
  // Check cache
  if (availityToken && availityToken.expiresAt > Date.now()) {
    return availityToken.token;
  }

  // Request new token
  const response = await fetch(AVAILITY_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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

  // Cache token (expires in ~1 hour typically)
  availityToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // Subtract 60s buffer
  };

  return data.access_token;
}

/**
 * Check if Availity is configured
 */
function isAvailityConfigured(): boolean {
  return !!(AVAILITY_CLIENT_ID && AVAILITY_CLIENT_SECRET);
}

/**
 * Verify request authorization
 */
async function verifyAuth(req: Request): Promise<{ userId: string; role: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  return { userId: user.id, role: user.user_metadata?.role || 'parent' };
}

/**
 * Log audit trail for HIPAA compliance
 */
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

/**
 * Check eligibility via Availity
 */
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
    // Return mock response for development
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
  return {
    success: true,
    ...data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Submit claim via Availity
 */
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

  // Build EDI 837P payload
  const edi837P = buildEDI837P(claim);

  const response = await fetch(`${AVAILITY_API_URL}/availity/v1/claims`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      claimType: claim.claimType === 'professional' ? '837P' : '837I',
      ediPayload: edi837P,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Availity claim submission failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Check claim status via Availity
 */
async function checkClaimStatus(request: {
  claimControlNumber?: string;
  memberId: string;
  payerId: string;
  serviceDateFrom: string;
  serviceDateTo?: string;
  providerNpi: string;
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

  const response = await fetch(`${AVAILITY_API_URL}/availity/v1/claim-statuses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Availity status check failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Build EDI 837P format (simplified)
 */
function buildEDI837P(claim: Record<string, unknown>): string {
  // In production, use proper EDI library
  // This is a placeholder that returns claim as JSON
  // Real implementation would format per X12 837P spec
  const controlNumber = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  return JSON.stringify({ ...claim, controlNumber });
}

// Main handler
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.replace('/clearinghouse', '');

    // Route requests
    if (req.method === 'POST') {
      const body = await req.json();

      if (path === '/eligibility' || path === '' && body.action === 'eligibility') {
        // Log audit event
        await logAuditEvent(auth.userId, 'eligibility_check', 'insurance', {
          payerId: body.payerId,
          memberId: body.memberId?.slice(-4), // Only log last 4 digits for privacy
        });

        const result = await checkEligibility(body);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (path === '/claims' || path === '' && body.action === 'submit_claim') {
        // Log audit event
        await logAuditEvent(auth.userId, 'claim_submit', 'claim', {
          payerId: body.payer?.payerId,
          totalCharges: body.totalCharges,
        });

        const result = await submitClaim(body);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (path === '/claim-status' || path === '' && body.action === 'claim_status') {
        // Log audit event
        await logAuditEvent(auth.userId, 'claim_status_check', 'claim', {
          claimControlNumber: body.claimControlNumber,
        });

        const result = await checkClaimStatus(body);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Health check
    if (req.method === 'GET' && (path === '/health' || path === '')) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          availityConfigured: isAvailityConfigured(),
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Clearinghouse function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
