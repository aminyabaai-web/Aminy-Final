// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Benefits Discovery Orchestrator
 *
 * When a parent enters their state + insurance info, this orchestrator
 * automatically runs benefits discovery:
 *
 *   1. Check eligibility via clearinghouse (if configured)
 *   2. Look up state benefits database
 *   3. Generate prior auth request template
 *   4. Schedule benefits navigator consultation
 *
 * Each step is independent and wrapped in try/catch so a failure
 * in one step never blocks the others.
 */

import {
  verifyInsuranceEligibility,
  isClearinghouseConfigured,
  type EligibilityRequest,
  type EligibilityResponse,
} from './clearinghouse-integration';
import {
  getStateBenefits,
  checkEligibility as checkStateBenefitsEligibility,
  getRecommendedPrograms,
  generateAppealLetter,
  type EligibilityResult,
  type AppealLetterParams,
} from './benefits-service';
import type { StateBenefitProgram } from './benefits-database';
import { scheduleNotification } from './push-notifications';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface BenefitsDiscoveryData {
  userId: string;
  childId: string;
  childName: string;
  childAge: number;
  childDob: string;
  parentName: string;
  /** US state abbreviation (e.g., "CA", "TX") */
  stateAbbr: string;
  /** Diagnosis codes (ICD-10) or plain-text diagnoses */
  diagnoses: string[];
  /** Insurance information */
  insurance?: {
    payerId: string;
    payerName: string;
    memberId: string;
    memberFirstName: string;
    memberLastName: string;
    memberDob: string;
    groupNumber?: string;
  };
  /** NPI of the provider making the request */
  providerNPI?: string;
  providerTaxId?: string;
  /** Services being requested (for prior auth) */
  requestedServices?: string[];
  /** Concerns that drive the services needed */
  concerns?: string[];
}

export interface BenefitsStep {
  step: string;
  status: 'pending' | 'running' | 'success' | 'skipped' | 'error';
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
  durationMs?: number;
}

export interface BenefitsDiscoveryResult {
  orchestrationId: string;
  userId: string;
  startedAt: string;
  completedAt: string;
  eligibilityCheck?: {
    performed: boolean;
    isActive?: boolean;
    planName?: string;
    copay?: number;
    deductibleRemaining?: number;
    servicesChecked?: Array<{
      serviceCode: string;
      covered: boolean;
      requiresAuth: boolean;
    }>;
  };
  stateBenefits?: {
    stateAbbr: string;
    stateName: string;
    programs: Array<{
      name: string;
      type: string;
      summary: string;
      nextSteps: string[];
    }>;
    recommendedPrograms: Array<{
      name: string;
      relevance: string;
      coveredServices: string[];
    }>;
    autismMandate?: {
      exists: boolean;
      summary: string;
    };
  };
  priorAuth?: {
    generated: boolean;
    templateId?: string;
    appealLetterGenerated?: boolean;
  };
  navigatorConsultation?: {
    scheduled: boolean;
    notificationId?: string;
  };
  steps: BenefitsStep[];
  errors: Array<{ step: string; error: string }>;
}

// ============================================================================
// Event Log
// ============================================================================

const benefits_events: Array<{
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
  benefits_events.push(entry);
  if (import.meta.env.DEV) console.log(`[benefits-orchestrator] [${step}] ${event}`, data ?? '');
}

export function getBenefitsEvents() {
  return [...benefits_events];
}

export function clearBenefitsEvents() {
  benefits_events.length = 0;
}

// ============================================================================
// Main Orchestrator
// ============================================================================

export async function orchestrateBenefitsDiscovery(
  data: BenefitsDiscoveryData
): Promise<BenefitsDiscoveryResult> {
  const orchestrationId = `ben-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();

  const result: BenefitsDiscoveryResult = {
    orchestrationId,
    userId: data.userId,
    startedAt,
    completedAt: '',
    steps: [],
    errors: [],
  };

  logEvent(orchestrationId, 'orchestrator', 'started', {
    userId: data.userId,
    state: data.stateAbbr,
    hasInsurance: !!data.insurance,
    diagnoses: data.diagnoses,
  });

  // ─── Step 1: Check Eligibility via Clearinghouse ─────────────────────
  let eligibilityResponse: EligibilityResponse | null = null;

  const eligibilityStep = await runStep(orchestrationId, 'eligibility-check', async () => {
    if (!isClearinghouseConfigured()) {
      return { skipped: true, reason: 'No clearinghouse configured' };
    }

    if (!data.insurance) {
      return { skipped: true, reason: 'No insurance information provided' };
    }

    if (!data.providerNPI) {
      return { skipped: true, reason: 'No provider NPI for eligibility check' };
    }

    const request: EligibilityRequest = {
      memberId: data.insurance.memberId,
      memberDob: data.insurance.memberDob,
      memberFirstName: data.insurance.memberFirstName,
      memberLastName: data.insurance.memberLastName,
      providerId: data.providerNPI,
      providerTaxId: data.providerTaxId,
      payerId: data.insurance.payerId,
      serviceDate: new Date().toISOString().split('T')[0],
      serviceCodes: data.requestedServices?.length
        ? mapServicesToCPTCodes(data.requestedServices)
        : ['97153', '97155', '92507'], // Default: ABA adaptive, ABA supervision, speech
      placeOfService: '02', // Telehealth
    };

    eligibilityResponse = await verifyInsuranceEligibility(request);

    return {
      performed: true,
      isActive: eligibilityResponse.coverage.isActive,
      planName: eligibilityResponse.plan.planName,
      copay: eligibilityResponse.coverage.copay.behavioralHealth,
      deductibleRemaining: eligibilityResponse.coverage.deductible.remaining,
      servicesChecked: eligibilityResponse.serviceCoverage.map(svc => ({
        serviceCode: svc.serviceCode,
        covered: svc.covered,
        requiresAuth: svc.requiresAuth,
      })),
    };
  });

  result.steps.push(eligibilityStep);
  if (eligibilityStep.status === 'success' && eligibilityStep.result) {
    const eResult = eligibilityStep.result as BenefitsDiscoveryResult['eligibilityCheck'] & { skipped?: boolean };
    if (!eResult?.skipped) {
      result.eligibilityCheck = eResult;
    }
  } else if (eligibilityStep.error) {
    result.errors.push({ step: 'eligibility-check', error: eligibilityStep.error });
  }

  // ─── Step 2: Look Up State Benefits ──────────────────────────────────
  const stateBenefitsStep = await runStep(orchestrationId, 'state-benefits', async () => {
    const stateData: StateBenefitProgram | null = getStateBenefits(data.stateAbbr);

    if (!stateData) {
      return {
        stateAbbr: data.stateAbbr,
        stateName: data.stateAbbr,
        programs: [],
        recommendedPrograms: [],
        autismMandate: undefined,
        noDataAvailable: true,
      };
    }

    // Check eligibility against state programs
    const eligibility: EligibilityResult | null = checkStateBenefitsEligibility(
      data.stateAbbr,
      data.childAge,
      data.diagnoses.length > 0 ? data.diagnoses : ['autism']
    );

    // Get recommended programs based on concerns
    const recommendedPrograms = getRecommendedPrograms(
      data.stateAbbr,
      data.concerns ?? data.diagnoses
    );

    const programs = eligibility?.programs ?? [];

    // Persist state benefits lookup to Supabase for the dashboard
    const { error: lookupError } = await supabase.from('benefits_lookups').insert({
      user_id: data.userId,
      child_id: data.childId,
      state_abbr: data.stateAbbr,
      diagnoses: data.diagnoses,
      programs_found: programs.length,
      recommended_programs: recommendedPrograms.length,
      has_autism_mandate: stateData.autismMandate?.exists ?? false,
      created_at: new Date().toISOString(),
    });
    if (lookupError) {
      console.warn('[benefits-orchestrator] benefits lookup persist warning:', lookupError.message);
    }

    return {
      stateAbbr: data.stateAbbr,
      stateName: stateData.state,
      programs,
      recommendedPrograms,
      autismMandate: stateData.autismMandate
        ? { exists: stateData.autismMandate.exists, summary: stateData.autismMandate.summary }
        : undefined,
    };
  });

  result.steps.push(stateBenefitsStep);
  if (stateBenefitsStep.status === 'success' && stateBenefitsStep.result) {
    const sbResult = stateBenefitsStep.result as BenefitsDiscoveryResult['stateBenefits'];
    result.stateBenefits = sbResult;
  } else if (stateBenefitsStep.error) {
    result.errors.push({ step: 'state-benefits', error: stateBenefitsStep.error });
  }

  // ─── Step 3: Generate Prior Auth Request Template ────────────────────
  const priorAuthStep = await runStep(orchestrationId, 'prior-auth', async () => {
    const services = data.requestedServices ?? ['ABA therapy', 'Speech therapy'];
    const needsAuth = eligibilityResponse?.serviceCoverage.some(s => s.requiresAuth) ?? true;

    if (!needsAuth && eligibilityResponse) {
      return { skipped: true, reason: 'No services require prior authorization' };
    }

    // Generate a prior auth request template
    const templateId = `pa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const priorAuthTemplate = {
      id: templateId,
      userId: data.userId,
      childId: data.childId,
      childName: data.childName,
      childDob: data.childDob,
      parentName: data.parentName,
      stateAbbr: data.stateAbbr,
      diagnoses: data.diagnoses,
      requestedServices: services,
      insuranceInfo: data.insurance ?? null,
      providerNPI: data.providerNPI,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    // Persist the template
    const { error: paError } = await supabase.from('prior_auth_requests').insert({
      id: templateId,
      user_id: data.userId,
      child_id: data.childId,
      template_data: priorAuthTemplate,
      status: 'draft',
      created_at: new Date().toISOString(),
    });
    if (paError) {
      console.warn('[benefits-orchestrator] prior auth persist warning:', paError.message);
    }

    // Also generate an appeal letter template in case of denial
    let appealLetterGenerated = false;
    try {
      const appealParams: AppealLetterParams = {
        childName: data.childName,
        childAge: data.childAge,
        parentName: data.parentName,
        insuranceCompany: data.insurance?.payerName ?? 'Insurance Company',
        serviceRequested: services,
        diagnosisCodes: data.diagnoses.filter(d => /^[A-Z]\d/.test(d)),
        state: data.stateAbbr,
      };

      const appealLetter = generateAppealLetter(appealParams);

      const { error: appealError } = await supabase.from('appeal_letters').insert({
        user_id: data.userId,
        child_id: data.childId,
        prior_auth_id: templateId,
        letter_content: appealLetter,
        status: 'draft',
        created_at: new Date().toISOString(),
      });
      if (appealError) {
        console.warn('[benefits-orchestrator] appeal letter persist warning:', appealError.message);
      }

      appealLetterGenerated = true;
    } catch {
      // Appeal letter generation is non-critical
    }

    return {
      generated: true,
      templateId,
      appealLetterGenerated,
    };
  });

  result.steps.push(priorAuthStep);
  if (priorAuthStep.status === 'success' && priorAuthStep.result) {
    const paResult = priorAuthStep.result as BenefitsDiscoveryResult['priorAuth'] & { skipped?: boolean };
    if (!paResult?.skipped) {
      result.priorAuth = paResult;
    }
  } else if (priorAuthStep.error) {
    result.errors.push({ step: 'prior-auth', error: priorAuthStep.error });
  }

  // ─── Step 4: Schedule Benefits Navigator Consultation ────────────────
  const navigatorStep = await runStep(orchestrationId, 'navigator-consultation', async () => {
    // Schedule a notification to prompt the parent to speak with a benefits navigator
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 1); // Next day
    scheduledFor.setHours(10, 0, 0, 0); // 10 AM

    const programCount = result.stateBenefits?.programs?.length ?? 0;

    const notificationId = await scheduleNotification(data.userId, {
      userId: data.userId,
      title: 'Benefits Review Ready',
      body: programCount > 0
        ? `We found ${programCount} programs ${data.childName} may qualify for in ${data.stateAbbr}. Tap to review your benefits summary.`
        : `Your benefits review for ${data.childName} is ready. Tap to see what's available in ${data.stateAbbr}.`,
      scheduledFor,
      type: 'custom',
      data: {
        route: '/benefits',
        type: 'benefits-review',
        orchestrationId,
      },
    });

    return {
      scheduled: notificationId !== null,
      notificationId: notificationId ?? undefined,
    };
  });

  result.steps.push(navigatorStep);
  if (navigatorStep.status === 'success' && navigatorStep.result) {
    const nResult = navigatorStep.result as { scheduled: boolean; notificationId?: string };
    result.navigatorConsultation = nResult;
  } else if (navigatorStep.error) {
    result.errors.push({ step: 'navigator-consultation', error: navigatorStep.error });
  }

  // ─── Finalize ────────────────────────────────────────────────────────
  result.completedAt = new Date().toISOString();
  logEvent(orchestrationId, 'orchestrator', 'completed', {
    totalSteps: result.steps.length,
    successSteps: result.steps.filter(s => s.status === 'success').length,
    errorSteps: result.steps.filter(s => s.status === 'error').length,
    skippedSteps: result.steps.filter(s => s.status === 'skipped').length,
  });

  // Persist result (non-blocking)
  persistBenefitsResult(result).catch(err => {
    console.warn('[benefits-orchestrator] Failed to persist result:', err);
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
): Promise<BenefitsStep> {
  const step: BenefitsStep = {
    step: stepName,
    status: 'running',
    startedAt: new Date().toISOString(),
  };

  logEvent(orchestrationId, stepName, 'started');

  try {
    const result = await fn();

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
 * Map human-readable service names to CPT codes for eligibility checking.
 */
function mapServicesToCPTCodes(services: string[]): string[] {
  const cptMap: Record<string, string[]> = {
    'aba': ['97153', '97155', '97156', '97151'],
    'aba therapy': ['97153', '97155'],
    'speech': ['92507', '92508'],
    'speech therapy': ['92507', '92508'],
    'occupational therapy': ['97530', '97110'],
    'ot': ['97530', '97110'],
    'behavioral health': ['90837', '90834'],
    'counseling': ['90837', '90834'],
    'psychological evaluation': ['96136', '96137'],
    'diagnostic evaluation': ['96130', '96131'],
  };

  const codes = new Set<string>();
  for (const service of services) {
    const lower = service.toLowerCase();
    for (const [key, value] of Object.entries(cptMap)) {
      if (lower.includes(key)) {
        value.forEach(c => codes.add(c));
      }
    }
  }

  // Default to common behavioral health codes if no match
  if (codes.size === 0) {
    return ['97153', '92507', '90837'];
  }

  return Array.from(codes);
}

/**
 * Persist benefits discovery result to Supabase.
 */
async function persistBenefitsResult(result: BenefitsDiscoveryResult): Promise<void> {
  try {
    await supabase.from('orchestration_events').insert({
      id: result.orchestrationId,
      session_id: null,
      type: 'benefits-discovery',
      started_at: result.startedAt,
      completed_at: result.completedAt,
      steps: result.steps,
      errors: result.errors,
      metadata: {
        stateAbbr: result.stateBenefits?.stateAbbr,
        programsFound: result.stateBenefits?.programs?.length ?? 0,
        eligibilityChecked: result.eligibilityCheck?.performed ?? false,
        priorAuthGenerated: result.priorAuth?.generated ?? false,
      },
    });
  } catch (err) {
    console.warn('[benefits-orchestrator] persistBenefitsResult error:', err);
  }
}
