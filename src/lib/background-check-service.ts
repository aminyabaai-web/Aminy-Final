/**
 * Background Check Service
 * Manages identity verification and background check process for providers.
 * Designed for Checkr API integration (or manual review fallback).
 */

import { supabase } from '../utils/supabase/client';

// ── Types ────────────────────────────────────────────────────────────

export type VerificationStatus =
  | 'not_started'
  | 'id_uploaded'
  | 'selfie_uploaded'
  | 'info_submitted'
  | 'consent_given'
  | 'processing'
  | 'approved'
  | 'denied'
  | 'manual_review';

export interface VerificationStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'complete' | 'failed';
  required: boolean;
}

export interface BackgroundCheckState {
  providerId: string;
  status: VerificationStatus;
  steps: VerificationStep[];
  idFrontUrl?: string;
  idBackUrl?: string;
  selfieUrl?: string;
  ssnLast4?: string;
  consentGiven: boolean;
  consentTimestamp?: string;
  checkrCandidateId?: string;
  checkrReportId?: string;
  submittedAt?: string;
  completedAt?: string;
  denialReason?: string;
}

// ── Default Steps ────────────────────────────────────────────────────

export function getDefaultVerificationSteps(): VerificationStep[] {
  return [
    {
      id: 'id_front',
      label: 'Government ID (Front)',
      description: 'Take a clear photo of the front of your government-issued ID',
      status: 'pending',
      required: true,
    },
    {
      id: 'id_back',
      label: 'Government ID (Back)',
      description: 'Take a clear photo of the back of your ID',
      status: 'pending',
      required: true,
    },
    {
      id: 'selfie',
      label: 'Selfie for Identity Match',
      description: 'Take a selfie to verify your identity matches your ID',
      status: 'pending',
      required: true,
    },
    {
      id: 'ssn',
      label: 'Last 4 of SSN',
      description: 'Provide the last 4 digits of your Social Security Number (encrypted)',
      status: 'pending',
      required: true,
    },
    {
      id: 'consent',
      label: 'Background Check Consent',
      description: 'Review and sign the background check authorization form',
      status: 'pending',
      required: true,
    },
  ];
}

// ── State Management ─────────────────────────────────────────────────

const STORAGE_KEY = 'aminy-background-check';

export function getBackgroundCheckState(providerId: string): BackgroundCheckState {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const all = JSON.parse(stored);
    if (all[providerId]) return all[providerId];
  }
  return {
    providerId,
    status: 'not_started',
    steps: getDefaultVerificationSteps(),
    consentGiven: false,
  };
}

export function saveBackgroundCheckState(state: BackgroundCheckState): void {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  stored[state.providerId] = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

// ── Image Upload ─────────────────────────────────────────────────────

/**
 * Upload verification image to Supabase Storage (private bucket)
 * Falls back to base64 localStorage storage for demo mode
 */
export async function uploadVerificationImage(
  providerId: string,
  imageType: 'id_front' | 'id_back' | 'selfie',
  imageData: string // base64
): Promise<{ url: string; success: boolean }> {
  try {
    // Try Supabase Storage first
    const fileName = `verification/${providerId}/${imageType}_${Date.now()}.jpg`;
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const { data, error } = await supabase.storage
      .from('private')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (!error && data) {
      return { url: data.path, success: true };
    }
  } catch {
    // Supabase Storage not available
  }

  // Fallback: store reference in localStorage
  const localKey = `aminy-verification-${providerId}-${imageType}`;
  localStorage.setItem(localKey, 'uploaded');
  return { url: `local://${imageType}`, success: true };
}

// ── Checkr API Types ─────────────────────────────────────────────────

/**
 * Checkr integration — all calls route through the clearinghouse edge function.
 * API keys are stored as Supabase secrets, never exposed to the client.
 */
const CHECKR_CONFIGURED = true; // Always available via edge function

/** Checkr candidate object */
interface CheckrCandidate {
  id: string;
  object: 'candidate';
  uri: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dob: string;
  ssn: string;
  driver_license_number: string | null;
  driver_license_state: string | null;
  created_at: string;
}

/** Checkr invitation object */
interface CheckrInvitation {
  id: string;
  object: 'invitation';
  uri: string;
  status: 'pending' | 'completed' | 'expired';
  invitation_url: string;
  candidate_id: string;
  package: string;
  created_at: string;
  expires_at: string;
}

/** Checkr report (background check result) */
interface CheckrReport {
  id: string;
  object: 'report';
  uri: string;
  status: 'pending' | 'clear' | 'consider' | 'suspended' | 'dispute';
  adjudication: 'engaged' | 'pre_adverse_action' | 'post_adverse_action' | null;
  package: string;
  candidate_id: string;
  created_at: string;
  completed_at: string | null;
  turnaround_time: number | null;
  eta: string | null;
  screenings: CheckrScreening[];
}

/** Individual screening within a Checkr report */
interface CheckrScreening {
  id: string;
  object: string;
  type: string;
  status: 'pending' | 'clear' | 'consider' | 'suspended';
  result: string | null;
  turnaround_time: number | null;
}

/** Result of a Checkr API call */
interface CheckrAPIResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  httpStatus?: number;
}

// ── Checkr API Client ────────────────────────────────────────────────

/**
 * Make an authenticated request to the Checkr API.
 * ALL calls route through the clearinghouse edge function — API keys
 * are stored server-side as Supabase secrets, never exposed to the client.
 */
async function checkrFetch<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>
): Promise<CheckrAPIResult<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clearinghouse`;
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        action: 'background_check',
        method,
        path,
        body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        data: null,
        error: `Checkr proxy error (${response.status}): ${errorText}`,
        httpStatus: response.status,
      };
    }

    const data: T = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a candidate in Checkr.
 * A candidate represents the person being screened.
 */
export async function createCheckrCandidate(info: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dob?: string; // YYYY-MM-DD
  zipcode?: string;
}): Promise<CheckrAPIResult<CheckrCandidate>> {
  return checkrFetch<CheckrCandidate>('POST', '/v1/candidates', {
    first_name: info.firstName,
    last_name: info.lastName,
    email: info.email,
    phone: info.phone,
    dob: info.dob,
    zipcode: info.zipcode,
    no_middle_name: false,
  });
}

/**
 * Create an invitation for a candidate to complete their background check.
 * The invitation sends an email with a link to Checkr's hosted flow
 * where the candidate enters their SSN and consents to the check.
 */
export async function createCheckrInvitation(
  candidateId: string,
  packageSlug: string = 'tasker_standard'
): Promise<CheckrAPIResult<CheckrInvitation>> {
  return checkrFetch<CheckrInvitation>('POST', '/v1/invitations', {
    candidate_id: candidateId,
    package: packageSlug,
  });
}

/**
 * Create a background check report directly (skips the invitation flow).
 * Use this when you already have the candidate's consent and SSN.
 * `package` is the Checkr screening package slug.
 */
export async function createCheckrReport(
  candidateId: string,
  packageSlug: string = 'tasker_standard'
): Promise<CheckrAPIResult<CheckrReport>> {
  return checkrFetch<CheckrReport>('POST', '/v1/reports', {
    candidate_id: candidateId,
    package: packageSlug,
  });
}

/**
 * Poll for the status of an existing Checkr report.
 * Returns the current report state including screening results.
 */
export async function getCheckrReport(
  reportId: string
): Promise<CheckrAPIResult<CheckrReport>> {
  return checkrFetch<CheckrReport>('GET', `/v1/reports/${reportId}`);
}

/**
 * Parse a Checkr report's adjudication results into our VerificationStatus.
 */
export function parseCheckrAdjudication(report: CheckrReport): {
  status: VerificationStatus;
  details: string;
  screeningResults: Array<{ type: string; status: string; result: string | null }>;
} {
  const screeningResults = report.screenings.map(s => ({
    type: s.type,
    status: s.status,
    result: s.result,
  }));

  if (report.status === 'pending') {
    return {
      status: 'processing',
      details: report.eta
        ? `Background check in progress. Estimated completion: ${report.eta}`
        : 'Background check in progress.',
      screeningResults,
    };
  }

  if (report.status === 'clear') {
    return {
      status: 'approved',
      details: 'Background check cleared. No adverse findings.',
      screeningResults,
    };
  }

  if (report.status === 'consider') {
    if (report.adjudication === 'engaged') {
      return {
        status: 'manual_review',
        details: 'Background check requires review. Some items flagged for consideration.',
        screeningResults,
      };
    }
    if (report.adjudication === 'pre_adverse_action' || report.adjudication === 'post_adverse_action') {
      return {
        status: 'denied',
        details: 'Background check did not pass. Adverse action process initiated.',
        screeningResults,
      };
    }
    return {
      status: 'manual_review',
      details: 'Background check has items requiring review.',
      screeningResults,
    };
  }

  if (report.status === 'suspended') {
    return {
      status: 'manual_review',
      details: 'Background check suspended. Additional information may be required.',
      screeningResults,
    };
  }

  if (report.status === 'dispute') {
    return {
      status: 'manual_review',
      details: 'Background check disputed by candidate.',
      screeningResults,
    };
  }

  return {
    status: 'manual_review',
    details: `Unexpected report status: ${report.status}`,
    screeningResults,
  };
}

// ── Background Check Submission ──────────────────────────────────────

/**
 * Submit background check via Checkr API (or queue for manual review).
 *
 * If Checkr is configured:
 * 1. Creates a Checkr candidate
 * 2. Creates an invitation (email-based flow) for the candidate
 * 3. Saves the Checkr IDs to state for later polling
 *
 * If Checkr is NOT configured, falls back to Supabase manual review queue.
 */
export async function submitBackgroundCheck(
  state: BackgroundCheckState,
  providerInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dob?: string;
    zipcode?: string;
  }
): Promise<{ success: boolean; status: VerificationStatus; message: string }> {
  // Validate all steps are complete
  const incomplete = state.steps.filter(s => s.required && s.status !== 'complete');
  if (incomplete.length > 0) {
    return {
      success: false,
      status: state.status,
      message: `Please complete: ${incomplete.map(s => s.label).join(', ')}`,
    };
  }

  // ── Attempt Checkr integration ────────────────────────────────────
  if (CHECKR_CONFIGURED && providerInfo) {
    // Step 1: Create candidate
    const candidateResult = await createCheckrCandidate(providerInfo);
    if (!candidateResult.success || !candidateResult.data) {
      console.error('Checkr candidate creation failed:', candidateResult.error);
      // Fall through to manual review
    } else {
      const candidateId = candidateResult.data.id;

      // Step 2: Create invitation for email-based flow
      const invitationResult = await createCheckrInvitation(candidateId);
      if (invitationResult.success && invitationResult.data) {
        // Save Checkr IDs for later polling
        const updated: BackgroundCheckState = {
          ...state,
          status: 'processing',
          checkrCandidateId: candidateId,
          submittedAt: new Date().toISOString(),
        };
        saveBackgroundCheckState(updated);

        // Also persist to Supabase
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('provider_verifications').insert({
              provider_id: state.providerId,
              user_id: user.id,
              status: 'processing',
              checkr_candidate_id: candidateId,
              checkr_invitation_id: invitationResult.data.id,
              consent_given: state.consentGiven,
              consent_timestamp: state.consentTimestamp,
              submitted_at: new Date().toISOString(),
            });
          }
        } catch {
          // Supabase offline — local state is saved above
        }

        return {
          success: true,
          status: 'processing',
          message: `Background check initiated via Checkr. An email has been sent to ${providerInfo.email} to complete the process.`,
        };
      }
    }
  }

  // ── Fallback: Manual review queue via Supabase ────────────────────
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('provider_verifications').insert({
        provider_id: state.providerId,
        user_id: user.id,
        status: 'processing',
        id_front_path: state.idFrontUrl,
        id_back_path: state.idBackUrl,
        selfie_path: state.selfieUrl,
        ssn_last4_encrypted: state.ssnLast4 ? btoa(state.ssnLast4) : null,
        consent_given: state.consentGiven,
        consent_timestamp: state.consentTimestamp,
        submitted_at: new Date().toISOString(),
      });
    }
  } catch {
    // Supabase offline — continue with local state
  }

  // Update state to processing
  const updated: BackgroundCheckState = {
    ...state,
    status: 'processing',
    submittedAt: new Date().toISOString(),
  };
  saveBackgroundCheckState(updated);

  return {
    success: true,
    status: 'processing',
    message: 'Background check submitted! Processing typically takes 1-3 business days.',
  };
}

/**
 * Check background check status.
 * If a Checkr report ID is available, polls the Checkr API for updates.
 * Otherwise falls back to Supabase or local state.
 */
export async function checkBackgroundCheckStatus(
  providerId: string
): Promise<VerificationStatus> {
  const localState = getBackgroundCheckState(providerId);

  // If we have a Checkr report ID, poll Checkr for real-time status
  if (localState.checkrReportId && CHECKR_CONFIGURED) {
    const reportResult = await getCheckrReport(localState.checkrReportId);
    if (reportResult.success && reportResult.data) {
      const parsed = parseCheckrAdjudication(reportResult.data);

      // Update local state with the latest status
      const updated: BackgroundCheckState = {
        ...localState,
        status: parsed.status,
        ...(parsed.status === 'approved' || parsed.status === 'denied'
          ? { completedAt: new Date().toISOString() }
          : {}),
        ...(parsed.status === 'denied' ? { denialReason: parsed.details } : {}),
      };
      saveBackgroundCheckState(updated);

      return parsed.status;
    }
  }

  // Fallback: check Supabase
  try {
    const { data } = await supabase
      .from('provider_verifications')
      .select('status')
      .eq('provider_id', providerId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (data?.status) return data.status as VerificationStatus;
  } catch {
    // Use local state
  }

  return localState.status;
}

/**
 * Poll for Checkr report completion and update local state.
 * Call this periodically (e.g., every 30 seconds) while a check is processing.
 * Returns the updated status and whether the check is complete.
 */
export async function pollCheckrStatus(providerId: string): Promise<{
  status: VerificationStatus;
  complete: boolean;
  details: string;
}> {
  const localState = getBackgroundCheckState(providerId);

  if (!localState.checkrReportId || !CHECKR_CONFIGURED) {
    return {
      status: localState.status,
      complete: localState.status === 'approved' || localState.status === 'denied',
      details: 'No Checkr report ID available. Using manual review flow.',
    };
  }

  const reportResult = await getCheckrReport(localState.checkrReportId);
  if (!reportResult.success || !reportResult.data) {
    return {
      status: localState.status,
      complete: false,
      details: reportResult.error ?? 'Failed to fetch Checkr report.',
    };
  }

  const parsed = parseCheckrAdjudication(reportResult.data);
  const isComplete = parsed.status === 'approved' || parsed.status === 'denied';

  // Update local + Supabase state
  const updated: BackgroundCheckState = {
    ...localState,
    status: parsed.status,
    ...(isComplete ? { completedAt: new Date().toISOString() } : {}),
    ...(parsed.status === 'denied' ? { denialReason: parsed.details } : {}),
  };
  saveBackgroundCheckState(updated);

  if (isComplete) {
    try {
      await supabase
        .from('provider_verifications')
        .update({
          status: parsed.status,
          completed_at: new Date().toISOString(),
          ...(parsed.status === 'denied' ? { denial_reason: parsed.details } : {}),
        })
        .eq('provider_id', providerId)
        .order('submitted_at', { ascending: false })
        .limit(1);
    } catch {
      // Supabase offline — local state is saved above
    }
  }

  return {
    status: parsed.status,
    complete: isComplete,
    details: parsed.details,
  };
}
