/**
 * CAQH ProView Verification Edge Function
 *
 * Proxies requests to the CAQH ProView API, keeping API credentials
 * server-side. Supports:
 *   POST /profile   — Fetch full CAQH provider profile
 *   POST /status    — Check attestation/roster status
 *   POST /roster    — Check roster status for a specific org
 *
 * Environment variables (set in Supabase Dashboard > Edge Functions > Secrets):
 *   CAQH_ORG_ID          — Your CAQH-assigned organization ID
 *   CAQH_USERNAME         — CAQH ProView API username
 *   CAQH_PASSWORD         — CAQH ProView API password
 *   SUPABASE_URL          — Supabase project URL (auto-set)
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (auto-set)
 *
 * Deploy with:  supabase functions deploy caqh-verification
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Environment ──────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CAQH_ORG_ID = Deno.env.get("CAQH_ORG_ID") ?? "";
const CAQH_USERNAME = Deno.env.get("CAQH_USERNAME") ?? "";
const CAQH_PASSWORD = Deno.env.get("CAQH_PASSWORD") ?? "";

// CAQH ProView API base (v8 is the latest stable version)
const CAQH_API_BASE = "https://proview-demo.caqh.org/RosterAPI/api";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── CORS ─────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://aminy.ai",
  "https://www.aminy.ai",
  "https://app.aminy.ai",
  ...(Deno.env.get("ENVIRONMENT") !== "production"
    ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]
    : []),
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// ── Authentication ───────────────────────────────────────────────────

async function verifyAuth(
  req: Request
): Promise<{ userId: string; email: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { userId: user.id, email: user.email ?? "" };
  } catch {
    return null;
  }
}

// ── CAQH ProView API helpers ─────────────────────────────────────────

/** Build Basic auth header for CAQH API */
function caqhAuthHeader(): string {
  return `Basic ${btoa(`${CAQH_USERNAME}:${CAQH_PASSWORD}`)}`;
}

/** Validate that CAQH credentials are configured */
function validateCAQHConfig(): string | null {
  if (!CAQH_ORG_ID) return "CAQH_ORG_ID not configured";
  if (!CAQH_USERNAME) return "CAQH_USERNAME not configured";
  if (!CAQH_PASSWORD) return "CAQH_PASSWORD not configured";
  return null;
}

// ── Types ────────────────────────────────────────────────────────────

interface CAQHStatusResponse {
  provider_found_flag: string;
  provider_status: string;
  provider_status_date: string;
  provider_practice_state: string;
  roster_status: string;
  authorization_flag: string;
  provider_id: string;
  organization_id: string;
  anniversary_date: string;
  next_recredential_date: string;
}

interface CAQHProfileResponse {
  provider: {
    caqh_provider_id: string;
    po_provider_id: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
    npi: string;
    type1_npi: string;
    gender: string;
    personal_email: string;
    practice_state: string;
    tax_id: string;
    dea_number: string;
    upin: string;
    dob: string;
    languages: string[];
    specialties: Array<{
      specialty_name: string;
      specialty_type: string;
      board_name: string;
      board_certification_status: string;
      certification_date: string;
      recertification_date: string;
    }>;
    licenses: Array<{
      license_state: string;
      license_number: string;
      license_type: string;
      license_issue_date: string;
      license_expiration_date: string;
      license_status: string;
    }>;
    practice_locations: Array<{
      practice_name: string;
      address_line_1: string;
      address_line_2: string;
      city: string;
      state: string;
      zip: string;
      phone: string;
      fax: string;
    }>;
    education: Array<{
      school_name: string;
      degree: string;
      graduation_date: string;
    }>;
    liability_insurance: {
      carrier_name: string;
      policy_number: string;
      coverage_amount: string;
      expiration_date: string;
    } | null;
  };
}

// ── Request Handlers ─────────────────────────────────────────────────

/**
 * GET /status — Check CAQH ProView attestation status for a provider.
 * Query params: npi (required), org_id (optional, defaults to env)
 */
async function handleStatusCheck(
  npi: string,
  orgId?: string
): Promise<Response> {
  const configError = validateCAQHConfig();
  if (configError) {
    return new Response(
      JSON.stringify({ error: configError, source: "config" }),
      { status: 500 }
    );
  }

  const effectiveOrgId = orgId || CAQH_ORG_ID;

  try {
    const url = new URL(`${CAQH_API_BASE}/providerstatus`);
    url.searchParams.set("Product", "PV");
    url.searchParams.set("Organization_Id", effectiveOrgId);
    url.searchParams.set("NPI_Provider_Id", npi);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: caqhAuthHeader(),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CAQH status API error (${response.status}):`, errorText);

      return new Response(
        JSON.stringify({
          error: `CAQH API returned ${response.status}`,
          details: errorText,
          source: "caqh_api",
        }),
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const data: CAQHStatusResponse = await response.json();

    // Parse into our normalized format
    const attestationDate = data.provider_status_date || null;
    const nextRecredentialDate = data.next_recredential_date || null;

    let daysUntilExpiration: number | null = null;
    if (nextRecredentialDate) {
      const expDate = new Date(nextRecredentialDate);
      const now = new Date();
      daysUntilExpiration = Math.ceil(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Determine attestation status
    let attestationStatus: "current" | "expired" | "not-attested" | "in-progress";
    switch (data.provider_status?.toLowerCase()) {
      case "re-attested":
      case "attested":
      case "initial profile complete":
        attestationStatus = daysUntilExpiration !== null && daysUntilExpiration < 0
          ? "expired"
          : "current";
        break;
      case "in progress":
      case "initial profile incomplete":
        attestationStatus = "in-progress";
        break;
      default:
        attestationStatus = "not-attested";
    }

    const result = {
      caqhProviderId: data.provider_id,
      npi,
      organizationId: effectiveOrgId,
      providerFound: data.provider_found_flag === "Y",
      attestationStatus,
      attestationDate,
      nextAttestationDue: nextRecredentialDate,
      rosterStatus: data.roster_status || "unknown",
      authorizationFlag: data.authorization_flag === "Y",
      practiceState: data.provider_practice_state,
      anniversaryDate: data.anniversary_date || null,
      daysUntilExpiration,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CAQH status check failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        source: "edge_function",
      }),
      { status: 500 }
    );
  }
}

/**
 * POST /profile — Fetch the full CAQH ProView profile for a provider.
 * Body: { caqhProviderId: string } OR { npi: string }
 */
async function handleProfileFetch(
  caqhProviderId: string
): Promise<Response> {
  const configError = validateCAQHConfig();
  if (configError) {
    return new Response(
      JSON.stringify({ error: configError, source: "config" }),
      { status: 500 }
    );
  }

  try {
    const url = new URL(`${CAQH_API_BASE}/providerprofile`);
    url.searchParams.set("Product", "PV");
    url.searchParams.set("Organization_Id", CAQH_ORG_ID);
    url.searchParams.set("Caqh_Provider_Id", caqhProviderId);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: caqhAuthHeader(),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CAQH profile API error (${response.status}):`, errorText);

      return new Response(
        JSON.stringify({
          error: `CAQH profile API returned ${response.status}`,
          details: errorText,
          source: "caqh_api",
        }),
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const data: CAQHProfileResponse = await response.json();
    const p = data.provider;

    // Map CAQH response to our CAQHProfile type
    const profile = {
      caqhNumber: p.caqh_provider_id,
      providerId: p.po_provider_id,
      firstName: p.first_name,
      lastName: p.last_name,
      middleName: p.middle_name || null,
      suffix: p.suffix || null,
      npiNumber: p.npi || p.type1_npi,
      taxId: p.tax_id,
      dateOfBirth: p.dob,
      ssn: null, // Never included in API response
      gender: (p.gender === "Male" ? "M" : p.gender === "Female" ? "F" : "O") as
        | "M"
        | "F"
        | "O",
      practiceAddress: p.practice_locations?.[0]
        ? {
            line1: p.practice_locations[0].address_line_1,
            line2: p.practice_locations[0].address_line_2 || null,
            city: p.practice_locations[0].city,
            state: p.practice_locations[0].state,
            zip: p.practice_locations[0].zip,
          }
        : { line1: "", line2: null, city: "", state: p.practice_state, zip: "" },
      mailingAddress: p.practice_locations?.[0]
        ? {
            line1: p.practice_locations[0].address_line_1,
            line2: p.practice_locations[0].address_line_2 || null,
            city: p.practice_locations[0].city,
            state: p.practice_locations[0].state,
            zip: p.practice_locations[0].zip,
          }
        : { line1: "", line2: null, city: "", state: p.practice_state, zip: "" },
      phone: p.practice_locations?.[0]?.phone ?? "",
      fax: p.practice_locations?.[0]?.fax ?? null,
      email: p.personal_email,
      licenses: (p.licenses ?? []).map((l) => ({
        licenseNumber: l.license_number,
        state: l.license_state,
        type: l.license_type,
        issueDate: l.license_issue_date,
        expirationDate: l.license_expiration_date,
        status: (l.license_status?.toLowerCase() === "active"
          ? "active"
          : l.license_status?.toLowerCase() === "inactive"
          ? "inactive"
          : l.license_status?.toLowerCase() === "revoked"
          ? "revoked"
          : "pending") as "active" | "inactive" | "revoked" | "pending",
      })),
      boardCertifications: (p.specialties ?? []).map((s) => ({
        board: s.board_name,
        specialty: s.specialty_name,
        certificationNumber: "",
        issueDate: s.certification_date,
        expirationDate: s.recertification_date,
        status: (s.board_certification_status?.toLowerCase() === "active"
          ? "active"
          : s.board_certification_status?.toLowerCase() === "expired"
          ? "expired"
          : "inactive") as "active" | "inactive" | "expired",
      })),
      education: (p.education ?? []).map((e) => ({
        institution: e.school_name,
        degree: e.degree,
        graduationDate: e.graduation_date,
      })),
      liabilityInsurance: p.liability_insurance
        ? {
            carrier: p.liability_insurance.carrier_name,
            policyNumber: p.liability_insurance.policy_number,
            coverageAmount: parseInt(
              p.liability_insurance.coverage_amount?.replace(/[^0-9]/g, "") || "0",
              10
            ),
            expirationDate: p.liability_insurance.expiration_date,
          }
        : null,
      attestationDate: null, // Not in profile response, use /status endpoint
      attestationStatus: "not-attested" as const,
      nextAttestationDue: null,
    };

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CAQH profile fetch failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        source: "edge_function",
      }),
      { status: 500 }
    );
  }
}

/**
 * POST /roster — Add a provider to the organization's CAQH roster
 */
async function handleRosterAdd(
  npi: string,
  orgId?: string
): Promise<Response> {
  const configError = validateCAQHConfig();
  if (configError) {
    return new Response(
      JSON.stringify({ error: configError, source: "config" }),
      { status: 500 }
    );
  }

  const effectiveOrgId = orgId || CAQH_ORG_ID;

  try {
    const url = `${CAQH_API_BASE}/roster`;
    const rosterEntry = {
      organization_id: effectiveOrgId,
      provider: [
        {
          npi: npi,
          po_provider_id: "",
          last_recredential_date: "",
          next_recredential_date: "",
          delegation_flag: "N",
          application_type: "3", // Re-credentialing
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: caqhAuthHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(rosterEntry),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `CAQH roster API returned ${response.status}`,
          details: errorText,
        }),
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CAQH roster add failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        source: "edge_function",
      }),
      { status: 500 }
    );
  }
}

// ── Main Router ──────────────────────────────────────────────────────

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify authentication
  const user = await verifyAuth(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/caqh-verification\/?/, "").replace(/^\//, "");

  let response: Response;

  try {
    if (req.method !== "POST") {
      response = new Response(
        JSON.stringify({ error: `Method ${req.method} not allowed` }),
        { status: 405 }
      );
    } else {
      const body = await req.json();

      switch (path) {
        case "status": {
          const npi = body.npi as string | undefined;
          if (!npi) {
            response = new Response(
              JSON.stringify({ error: "Missing required field: npi" }),
              { status: 400 }
            );
          } else {
            response = await handleStatusCheck(npi, body.org_id as string | undefined);
          }
          break;
        }

        case "profile": {
          const caqhId = body.caqhProviderId as string | undefined;
          if (!caqhId) {
            response = new Response(
              JSON.stringify({ error: "Missing required field: caqhProviderId" }),
              { status: 400 }
            );
          } else {
            response = await handleProfileFetch(caqhId);
          }
          break;
        }

        case "roster": {
          const npi = body.npi as string | undefined;
          if (!npi) {
            response = new Response(
              JSON.stringify({ error: "Missing required field: npi" }),
              { status: 400 }
            );
          } else {
            response = await handleRosterAdd(npi, body.org_id as string | undefined);
          }
          break;
        }

        default:
          response = new Response(
            JSON.stringify({
              error: `Unknown endpoint: ${path}`,
              availableEndpoints: ["status", "profile", "roster"],
            }),
            { status: 404 }
          );
      }
    }
  } catch (error) {
    console.error("CAQH verification edge function error:", error);
    response = new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error",
        source: "edge_function",
      }),
      { status: 500 }
    );
  }

  // Apply CORS and Content-Type headers to the response
  const finalHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    finalHeaders.set(key, value);
  }
  if (!finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  return new Response(response.body, {
    status: response.status,
    headers: finalHeaders,
  });
});
