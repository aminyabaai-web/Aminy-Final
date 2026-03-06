/**
 * Post-Session Orchestrator
 *
 * Automates the multi-step workflow after a telehealth session ends.
 * Each step is independent with its own error handling so failures
 * in one step never block the others.
 *
 * Flow:
 *   1. Generate superbill with AI-suggested CPT codes (critical)
 *   2. Save SOAP notes / visit summary (if provider)
 *   3. Schedule parent follow-up notification (fire-and-forget)
 *   4. Update care plan progress (if goals exist)
 *   5. Submit to insurance via clearinghouse (critical, if configured)
 *   6. Generate FHIR encounter record (fire-and-forget)
 */

import {
  generateSuperbillFromSession,
  saveSuperbillToSupabase,
  type SessionForSuperbill,
  type ClinicalNoteForSuperbill,
  type ProviderForSuperbill,
} from './superbill-service';
import { scheduleNotification } from './push-notifications';
import {
  submitInsuranceClaim,
  isClearinghouseConfigured,
  type ClaimSubmission,
  type ClaimResponse,
} from './clearinghouse-integration';
import { toFHIREncounter, toFHIRBundle } from './fhir-resources';
import { supabase } from '../utils/supabase/client';
import {
  getGoals,
  updateGoalProgress,
  createVisitSummary,
  type CarePlanGoal,
} from './care-plan';
import type { Appointment } from '../types/telehealth';

// ============================================================================
// Types
// ============================================================================

export interface SessionCompletionData {
  appointmentId: string;
  userId: string;
  childId: string;
  providerId: string;
  providerName: string;
  providerCredentials?: string;
  providerNPI?: string;
  providerTaxId?: string;
  providerType?: string;
  childName: string;
  sessionStart: string; // ISO datetime
  sessionEnd: string;
  sessionDuration: number; // minutes
  visitType: string; // e.g., 'aba-initial', 'speech-follow-up'
  visitFormat?: 'remote' | 'in-person';
  diagnosisCodes: string[];
  sessionNotes?: string; // SOAP notes text if provider submitted them
  /** Structured SOAP note content keyed by section */
  soapContent?: Record<string, string>;
  /** If the provider explicitly picked a CPT code */
  explicitCPTCode?: string;
  /** Insurance information for claim submission */
  insurance?: {
    memberId: string;
    memberFirstName: string;
    memberLastName: string;
    memberDob: string;
    memberGender: 'M' | 'F' | 'U';
    payerId: string;
    payerName: string;
    memberAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zip: string;
    };
    priorAuthNumber?: string;
  };
  /** Provider's billing address for claim submission */
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  billingPhone?: string;
}

export interface OrchestrationStep {
  step: string;
  status: 'pending' | 'running' | 'success' | 'skipped' | 'error';
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
  durationMs?: number;
}

export interface OrchestrationResult {
  orchestrationId: string;
  sessionId: string;
  startedAt: string;
  completedAt: string;
  superbill?: { id: string; totalBilled: number };
  visitSummary?: { id: string };
  notification?: { scheduled: boolean; scheduledFor?: string; notificationId?: string };
  claim?: { submitted: boolean; controlNumber?: string; status?: string };
  fhirEncounter?: { created: boolean; id?: string };
  carePlanUpdate?: { goalsUpdated: number; goalIds: string[] };
  steps: OrchestrationStep[];
  errors: Array<{ step: string; error: string }>;
}

// ============================================================================
// Orchestration Events (for debugging and audit trail)
// ============================================================================

const orchestration_events: Array<{
  orchestrationId: string;
  timestamp: string;
  step: string;
  event: string;
  data?: unknown;
}> = [];

function logEvent(
  orchestrationId: string,
  step: string,
  event: string,
  data?: unknown
): void {
  const entry = {
    orchestrationId,
    timestamp: new Date().toISOString(),
    step,
    event,
    data,
  };
  orchestration_events.push(entry);
  if (import.meta.env.DEV) console.log(`[session-orchestrator] [${step}] ${event}`, data ?? '');
}

/** Expose events for debugging */
export function getOrchestrationEvents() {
  return [...orchestration_events];
}

/** Clear events (e.g., after persisting to backend) */
export function clearOrchestrationEvents() {
  orchestration_events.length = 0;
}

// ============================================================================
// Main Orchestrator
// ============================================================================

export async function orchestratePostSession(
  data: SessionCompletionData
): Promise<OrchestrationResult> {
  const orchestrationId = `orch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();

  const result: OrchestrationResult = {
    orchestrationId,
    sessionId: data.appointmentId,
    startedAt,
    completedAt: '', // filled at end
    steps: [],
    errors: [],
  };

  logEvent(orchestrationId, 'orchestrator', 'started', {
    appointmentId: data.appointmentId,
    userId: data.userId,
    visitType: data.visitType,
  });

  // ─── Step 1: Generate Superbill (critical, awaited) ──────────────────
  const superbillStep = await runStep(orchestrationId, 'superbill', async () => {
    const session: SessionForSuperbill = {
      id: data.appointmentId,
      patientId: data.userId,
      patientName: data.childName,
      scheduledAt: data.sessionStart,
      duration: data.sessionDuration,
      type: data.visitType,
      status: 'completed',
    };

    const clinicalNote: ClinicalNoteForSuperbill = {
      noteType: 'session-completion',
      content: data.soapContent ?? (data.sessionNotes ? { notes: data.sessionNotes } : {}),
      cptCode: data.explicitCPTCode,
      patientName: data.childName,
      sessionId: data.appointmentId,
    };

    const provider: ProviderForSuperbill = {
      id: data.providerId,
      name: data.providerName,
      credentials: data.providerCredentials ?? '',
      type: data.providerType ?? '',
      npi: data.providerNPI,
      taxId: data.providerTaxId,
    };

    const superbill = generateSuperbillFromSession(session, clinicalNote, provider);
    const savedId = await saveSuperbillToSupabase(superbill);

    return {
      id: savedId ?? superbill.id,
      totalBilled: superbill.totalBilled,
      lineItems: superbill.lineItems,
      diagnosisCodes: superbill.diagnosisCodes,
    };
  });

  result.steps.push(superbillStep);
  if (superbillStep.status === 'success' && superbillStep.result) {
    const sbResult = superbillStep.result as { id: string; totalBilled: number };
    result.superbill = { id: sbResult.id, totalBilled: sbResult.totalBilled };
  } else if (superbillStep.error) {
    result.errors.push({ step: 'superbill', error: superbillStep.error });
  }

  // ─── Step 2: Save Visit Summary (if session notes provided) ──────────
  const visitSummaryStep = await runStep(orchestrationId, 'visit-summary', async () => {
    if (!data.sessionNotes && !data.soapContent) {
      return { skipped: true, reason: 'No session notes provided' };
    }

    const summary = await createVisitSummary(data.userId, {
      appointmentId: data.appointmentId,
      providerId: data.providerId,
      reasonForVisit: data.visitType,
      whatWeDiscussed: data.soapContent
        ? Object.entries(data.soapContent).map(([k, v]) => `${k}: ${v}`)
        : [data.sessionNotes ?? ''],
      planForNext7Days: extractActionItems(data.sessionNotes, data.soapContent),
      whatToTrack: extractTrackingItems(data.sessionNotes, data.soapContent),
      followUpRecommendation: extractFollowUp(data.sessionNotes, data.soapContent),
      childId: data.childId,
    });

    return { id: summary.id };
  });

  result.steps.push(visitSummaryStep);
  if (visitSummaryStep.status === 'success' && visitSummaryStep.result) {
    const vsResult = visitSummaryStep.result as { id?: string; skipped?: boolean };
    if (!vsResult.skipped && vsResult.id) {
      result.visitSummary = { id: vsResult.id };
    }
  } else if (visitSummaryStep.error) {
    result.errors.push({ step: 'visit-summary', error: visitSummaryStep.error });
  }

  // ─── Step 3: Schedule Follow-up Notification (fire-and-forget) ───────
  const notificationStep = await runStep(orchestrationId, 'notification', async () => {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 1); // Next day
    followUpDate.setHours(9, 0, 0, 0); // 9 AM

    const notificationId = await scheduleNotification(data.userId, {
      userId: data.userId,
      title: 'Session Follow-up',
      body: `How is ${data.childName} doing after yesterday's session with ${data.providerName}? Tap to check in.`,
      scheduledFor: followUpDate,
      type: 'custom',
      data: {
        route: '/care-plan',
        appointmentId: data.appointmentId,
        type: 'post-session-followup',
      },
    });

    return {
      scheduled: notificationId !== null,
      scheduledFor: followUpDate.toISOString(),
      notificationId,
    };
  });

  result.steps.push(notificationStep);
  if (notificationStep.status === 'success' && notificationStep.result) {
    const nResult = notificationStep.result as {
      scheduled: boolean;
      scheduledFor: string;
      notificationId: string | null;
    };
    result.notification = {
      scheduled: nResult.scheduled,
      scheduledFor: nResult.scheduledFor,
      notificationId: nResult.notificationId ?? undefined,
    };
  } else if (notificationStep.error) {
    result.errors.push({ step: 'notification', error: notificationStep.error });
  }

  // ─── Step 4: Update Care Plan Progress ───────────────────────────────
  const carePlanStep = await runStep(orchestrationId, 'care-plan', async () => {
    const activeGoals = await getGoals(data.userId, {
      status: 'active',
      childId: data.childId,
    });

    if (activeGoals.length === 0) {
      return { skipped: true, reason: 'No active goals', goalsUpdated: 0, goalIds: [] };
    }

    const updatedGoalIds: string[] = [];
    const sessionContext = (data.sessionNotes ?? '') +
      (data.soapContent ? ' ' + Object.values(data.soapContent).join(' ') : '');

    for (const goal of activeGoals) {
      // Increment progress for goals related to the session
      if (isGoalRelatedToSession(goal, data.visitType, sessionContext)) {
        const newProgress = Math.min(
          goal.targetProgress,
          goal.currentProgress + calculateProgressIncrement(goal, data.sessionDuration)
        );

        await updateGoalProgress(goal.id, data.userId, newProgress);
        updatedGoalIds.push(goal.id);
      }
    }

    return { goalsUpdated: updatedGoalIds.length, goalIds: updatedGoalIds };
  });

  result.steps.push(carePlanStep);
  if (carePlanStep.status === 'success' && carePlanStep.result) {
    const cpResult = carePlanStep.result as {
      goalsUpdated: number;
      goalIds: string[];
      skipped?: boolean;
    };
    if (!cpResult.skipped) {
      result.carePlanUpdate = { goalsUpdated: cpResult.goalsUpdated, goalIds: cpResult.goalIds };
    }
  } else if (carePlanStep.error) {
    result.errors.push({ step: 'care-plan', error: carePlanStep.error });
  }

  // ─── Step 5: Submit Insurance Claim (critical, if configured) ────────
  const claimStep = await runStep(orchestrationId, 'insurance-claim', async () => {
    if (!isClearinghouseConfigured()) {
      return { skipped: true, reason: 'No clearinghouse configured' };
    }

    if (!data.insurance) {
      return { skipped: true, reason: 'No insurance information provided' };
    }

    if (!data.providerNPI || !data.providerTaxId) {
      return { skipped: true, reason: 'Missing provider NPI or Tax ID for claim' };
    }

    const superbillData = superbillStep.result as {
      lineItems?: Array<{
        cptCode: string;
        units: number;
        totalCharge: number;
      }>;
      totalBilled?: number;
      diagnosisCodes?: string[];
    } | null;

    if (!superbillData?.lineItems) {
      return { skipped: true, reason: 'Superbill generation failed, cannot submit claim' };
    }

    const isTelehealth = data.visitFormat === 'remote' ||
      data.visitType.toLowerCase().includes('tele');
    const placeOfService = isTelehealth ? '02' : '11';

    const diagCodes = superbillData.diagnosisCodes ?? data.diagnosisCodes;

    const claim: ClaimSubmission = {
      claimType: 'professional',
      billingProvider: {
        npi: data.providerNPI,
        taxId: data.providerTaxId,
        name: data.providerName,
        address: data.billingAddress ?? {
          line1: '',
          city: '',
          state: '',
          zip: '',
        },
        phone: data.billingPhone ?? '',
      },
      subscriber: {
        memberId: data.insurance.memberId,
        firstName: data.insurance.memberFirstName,
        lastName: data.insurance.memberLastName,
        dob: data.insurance.memberDob,
        gender: data.insurance.memberGender,
        address: data.insurance.memberAddress ?? {
          line1: '',
          city: '',
          state: '',
          zip: '',
        },
      },
      payer: {
        payerId: data.insurance.payerId,
        payerName: data.insurance.payerName,
      },
      diagnosis: diagCodes.map((code, i) => ({
        code,
        isPrimary: i === 0,
      })),
      services: superbillData.lineItems.map(item => ({
        serviceDate: data.sessionStart.split('T')[0],
        procedureCode: item.cptCode,
        units: item.units,
        chargeAmount: item.totalCharge,
        placeOfService,
        diagnosisPointers: [1], // Point to primary diagnosis
      })),
      totalCharges: superbillData.totalBilled ?? 0,
      priorAuthNumber: data.insurance.priorAuthNumber,
    };

    const response: ClaimResponse = await submitInsuranceClaim(claim);
    return {
      submitted: response.success,
      controlNumber: response.claimControlNumber,
      status: response.status,
    };
  });

  result.steps.push(claimStep);
  if (claimStep.status === 'success' && claimStep.result) {
    const clResult = claimStep.result as {
      submitted?: boolean;
      controlNumber?: string;
      status?: string;
      skipped?: boolean;
    };
    if (!clResult.skipped) {
      result.claim = {
        submitted: clResult.submitted ?? false,
        controlNumber: clResult.controlNumber,
        status: clResult.status,
      };
    }
  } else if (claimStep.error) {
    result.errors.push({ step: 'insurance-claim', error: claimStep.error });
  }

  // ─── Step 6: Generate FHIR Encounter (fire-and-forget) ──────────────
  const fhirStep = await runStep(orchestrationId, 'fhir-encounter', async () => {
    const appointment: Appointment = {
      id: data.appointmentId,
      userId: data.userId,
      providerId: data.providerId,
      scheduledAt: data.sessionStart,
      startTime: data.sessionStart,
      endTime: data.sessionEnd,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      visitType: mapVisitType(data.visitType),
      visitFormat: data.visitFormat === 'remote' ? 'remote' : 'in-office',
      duration: data.sessionDuration,
      visitReason: data.visitType,
      whoIsThisFor: 'child',
      userState: '',
      price: 0,
      paymentStatus: 'completed',
      videoProvider: 'zoom',
      status: 'completed',
      createdAt: data.sessionStart,
      updatedAt: data.sessionEnd,
    };

    const encounter = toFHIREncounter(appointment, data.childId);
    const bundle = toFHIRBundle([encounter], {
      bundleId: `encounter-${data.appointmentId}`,
    });

    // Persist to Supabase for later retrieval / FHIR export
    const { error } = await supabase.from('fhir_exports').insert({
      user_id: data.userId,
      child_id: data.childId,
      appointment_id: data.appointmentId,
      resource_type: 'Encounter',
      fhir_bundle: bundle,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Non-critical: log but do not throw
      console.warn('[session-orchestrator] FHIR persist warning:', error.message);
    }

    return { created: true, id: encounter.id };
  });

  result.steps.push(fhirStep);
  if (fhirStep.status === 'success' && fhirStep.result) {
    const fhResult = fhirStep.result as { created: boolean; id: string };
    result.fhirEncounter = { created: fhResult.created, id: fhResult.id };
  } else if (fhirStep.error) {
    result.errors.push({ step: 'fhir-encounter', error: fhirStep.error });
  }

  // ─── Finalize ────────────────────────────────────────────────────────
  result.completedAt = new Date().toISOString();
  logEvent(orchestrationId, 'orchestrator', 'completed', {
    totalSteps: result.steps.length,
    successSteps: result.steps.filter(s => s.status === 'success').length,
    errorSteps: result.steps.filter(s => s.status === 'error').length,
    skippedSteps: result.steps.filter(s => s.status === 'skipped').length,
    totalErrors: result.errors.length,
  });

  // Persist orchestration result to Supabase (non-blocking)
  persistOrchestrationResult(result).catch(err => {
    console.warn('[session-orchestrator] Failed to persist orchestration result:', err);
  });

  return result;
}

// ============================================================================
// Step Runner
// ============================================================================

async function runStep(
  orchestrationId: string,
  stepName: string,
  fn: () => Promise<unknown>
): Promise<OrchestrationStep> {
  const step: OrchestrationStep = {
    step: stepName,
    status: 'running',
    startedAt: new Date().toISOString(),
  };

  logEvent(orchestrationId, stepName, 'started');

  try {
    const result = await fn();

    // Check if the step was skipped
    if (result && typeof result === 'object' && 'skipped' in result && (result as { skipped?: boolean }).skipped) {
      step.status = 'skipped';
      step.result = result;
      logEvent(orchestrationId, stepName, 'skipped', (result as { reason?: string }).reason);
    } else {
      step.status = 'success';
      step.result = result;
      logEvent(orchestrationId, stepName, 'success', result);
    }
  } catch (err) {
    step.status = 'error';
    step.error = err instanceof Error ? err.message : String(err);
    logEvent(orchestrationId, stepName, 'error', step.error);
  }

  step.completedAt = new Date().toISOString();
  step.durationMs = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();

  return step;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract action items from session notes or SOAP content.
 * Returns a list of follow-up tasks for the care plan.
 */
function extractActionItems(
  notes?: string,
  soapContent?: Record<string, string>
): string[] {
  const items: string[] = [];

  // Check SOAP Plan section for action items
  const planText = soapContent?.plan ?? soapContent?.Plan ?? soapContent?.assessment ?? '';
  if (planText) {
    // Split on bullet points, numbered lists, or line breaks
    const lines = planText.split(/[\n\r]+/).filter(l => l.trim().length > 5);
    items.push(...lines.slice(0, 5).map(l => l.replace(/^[\s\-\*\d.]+/, '').trim()));
  }

  // Fallback to notes if no structured content
  if (items.length === 0 && notes) {
    items.push('Review session notes and follow provider recommendations');
  }

  return items;
}

/**
 * Extract items to track from session notes / SOAP content.
 */
function extractTrackingItems(
  notes?: string,
  soapContent?: Record<string, string>
): string[] {
  const objectiveText = soapContent?.objective ?? soapContent?.Objective ?? '';
  if (objectiveText) {
    return ['Monitor progress on items discussed during session'];
  }
  if (notes) {
    return ['Track any changes noted since last session'];
  }
  return [];
}

/**
 * Extract follow-up recommendation from session notes / SOAP.
 */
function extractFollowUp(
  notes?: string,
  soapContent?: Record<string, string>
): string | undefined {
  const planText = soapContent?.plan ?? soapContent?.Plan ?? '';
  if (planText.toLowerCase().includes('follow')) {
    return planText;
  }
  return notes ? 'Follow up as recommended by provider' : undefined;
}

/**
 * Determine if a care plan goal is related to the completed session.
 */
function isGoalRelatedToSession(
  goal: CarePlanGoal,
  visitType: string,
  sessionContext: string
): boolean {
  const lowerContext = sessionContext.toLowerCase();
  const lowerTitle = goal.title.toLowerCase();
  const lowerDesc = (goal.description ?? '').toLowerCase();
  const lowerVisitType = visitType.toLowerCase();

  // Category-to-visit-type mapping
  const categoryVisitMap: Record<string, string[]> = {
    'communication': ['speech', 'slp', 'language'],
    'behavior': ['aba', 'behavior', 'bcba'],
    'social': ['social', 'group', 'peer'],
    'sensory': ['sensory', 'ot', 'occupational'],
    'daily-routine': ['routine', 'aba', 'follow-up'],
    'self-care': ['self-care', 'aba', 'ot'],
    'motor': ['ot', 'occupational', 'motor', 'pt'],
    'academic': ['academic', 'tutoring', 'educational'],
  };

  // Check if goal category matches visit type
  const relatedTypes = categoryVisitMap[goal.category] ?? [];
  if (relatedTypes.some(t => lowerVisitType.includes(t))) {
    return true;
  }

  // Check if goal title/description appears in session context
  const keywords = lowerTitle.split(/\s+/).filter(w => w.length > 3);
  const matchCount = keywords.filter(kw => lowerContext.includes(kw)).length;
  if (matchCount >= 2 || (keywords.length <= 2 && matchCount >= 1)) {
    return true;
  }

  return false;
}

/**
 * Calculate how much progress to add for a session.
 * Uses session duration and goal's target to determine increment.
 */
function calculateProgressIncrement(goal: CarePlanGoal, sessionDurationMinutes: number): number {
  const totalTarget = goal.targetProgress || 100;

  // Assume ~12 sessions to complete a goal on average
  const perSessionIncrement = totalTarget / 12;

  // Scale by session length (25 min = 0.5x, 50 min = 1x, 80 min = 1.5x)
  const durationMultiplier = Math.max(0.5, sessionDurationMinutes / 50);

  return Math.round(perSessionIncrement * durationMultiplier);
}

/**
 * Map visit type string to the VisitType enum.
 */
function mapVisitType(visitType: string): 'consult' | 'deep-review' {
  const lower = visitType.toLowerCase();
  if (lower.includes('deep') || lower.includes('50') || lower.includes('review')) {
    return 'deep-review';
  }
  return 'consult';
}

/**
 * Persist orchestration result to Supabase for audit trail.
 */
async function persistOrchestrationResult(result: OrchestrationResult): Promise<void> {
  try {
    await supabase.from('orchestration_events').insert({
      id: result.orchestrationId,
      session_id: result.sessionId,
      started_at: result.startedAt,
      completed_at: result.completedAt,
      steps: result.steps,
      errors: result.errors,
      superbill_id: result.superbill?.id,
      claim_control_number: result.claim?.controlNumber,
      fhir_encounter_id: result.fhirEncounter?.id,
      goals_updated: result.carePlanUpdate?.goalsUpdated ?? 0,
    });
  } catch (err) {
    // Truly non-critical: just log
    console.warn('[session-orchestrator] persistOrchestrationResult error:', err);
  }
}
