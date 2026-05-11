// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Practice Operating System — Headway for ABA
 *
 * Independent BCBAs shouldn't need to join agencies. They should be able to:
 * 1. Get credentialed with payers (we handle the paperwork)
 * 2. Get clients referred to them (we have the family marketplace)
 * 3. Manage their RBTs (supervision, scheduling, payroll tracking)
 * 4. Bill insurance (we submit claims and handle denials)
 * 5. Get paid reliably (no clawbacks — Headway's killer feature)
 * 6. Document sessions (AI-assisted, audit-ready)
 * 7. Track outcomes (for re-auth justification and practice growth)
 *
 * Phase 1: ABA (BCBAs + RBTs)
 * Phase 2: Speech Therapy (SLPs + SLPAs)
 * Phase 3: Mental Health (LCSWs, LPCs, Psychologists)
 *
 * Revenue model: Free EHR + practice tools. We take a % of claims we process.
 * This mirrors Headway's model but applied to ABA, where no one does this.
 */

// ─── Provider Types ─────────────────────────────────────────────────

export type ProviderType =
  | 'bcba'      // Board Certified Behavior Analyst
  | 'bcaba'     // Board Certified Assistant Behavior Analyst
  | 'rbt'       // Registered Behavior Technician
  | 'slp'       // Speech-Language Pathologist (Phase 2)
  | 'slpa'      // Speech-Language Pathology Assistant (Phase 2)
  | 'lcsw'      // Licensed Clinical Social Worker (Phase 3)
  | 'lpc'       // Licensed Professional Counselor (Phase 3)
  | 'psyd'      // Psychologist (Phase 3)
  | 'ot'        // Occupational Therapist (Phase 2)
  | 'ota';      // Occupational Therapy Assistant (Phase 2)

export type PracticeSize = 'solo' | 'small-group' | 'group' | 'enterprise';

export interface PracticeProfile {
  id: string;
  ownerId: string;
  practiceName: string;
  practiceType: ProviderType;
  practiceSize: PracticeSize;
  state: string;
  npi: string;
  taxId: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  bankAccountLinked: boolean;
  stripeConnectId?: string;
  credentialingStatus: CredentialingStatus;
  providers: PracticeProvider[];
  createdAt: string;
  launchDate?: string;
  isLive: boolean;
}

export interface PracticeProvider {
  id: string;
  userId: string;
  name: string;
  type: ProviderType;
  npi: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  supervisorId?: string; // For RBTs, SLPAs, OTAs
  credentialingStatus: Record<string, CredentialingPhase>;
  clientCount: number;
  weeklyHours: number;
  joinedAt: string;
}

// ─── Credentialing (Headway-style) ──────────────────────────────────

export type CredentialingPhase =
  | 'not-started'
  | 'application-submitted'
  | 'under-review'
  | 'additional-info-needed'
  | 'credentialed'
  | 'contracting'
  | 'effective'  // Can bill this payer
  | 'denied';

export interface CredentialingStatus {
  overallProgress: number; // 0-100
  payers: PayerCredentialingStatus[];
  estimatedEffectiveDate?: string;
  blockers: string[];
}

export interface PayerCredentialingStatus {
  payerId: string;
  payerName: string;
  phase: CredentialingPhase;
  submittedAt?: string;
  estimatedDays: number;
  documentsNeeded: string[];
  nextAction: string;
  notes?: string;
}

// ─── 30-Day Onboarding (Headway Promise) ────────────────────────────

export interface OnboardingChecklist {
  steps: OnboardingStep[];
  currentStep: number;
  estimatedDaysToLaunch: number;
  startedAt: string;
  targetLaunchDate: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  category: 'profile' | 'credentials' | 'banking' | 'compliance' | 'setup';
  isComplete: boolean;
  isRequired: boolean;
  estimatedMinutes: number;
  helpUrl?: string;
}

export function generateOnboardingChecklist(
  providerType: ProviderType
): OnboardingChecklist {
  const steps: OnboardingStep[] = [
    // Week 1: Profile & Credentials
    {
      id: 'basic-profile',
      title: 'Complete your provider profile',
      description: 'Name, credentials, NPI, license information',
      category: 'profile',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 10,
    },
    {
      id: 'caqh-link',
      title: 'Link or create CAQH profile',
      description: 'We pre-populate from CAQH to save you time',
      category: 'credentials',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 15,
      helpUrl: '/credentialing-support',
    },
    {
      id: 'malpractice',
      title: 'Upload malpractice insurance',
      description: 'Current certificate of insurance (COI)',
      category: 'credentials',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 5,
    },
    {
      id: 'license-verify',
      title: 'Verify state license',
      description: `Your ${providerType.toUpperCase()} license will be verified automatically`,
      category: 'credentials',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 2,
    },
    {
      id: 'background-check',
      title: 'Background check consent',
      description: 'Required for all providers. Results in 3-5 business days.',
      category: 'compliance',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 5,
    },

    // Week 2: Banking & Payer Selection
    {
      id: 'bank-account',
      title: 'Connect bank account for payments',
      description: 'Secure connection via Stripe. Get paid biweekly.',
      category: 'banking',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 5,
    },
    {
      id: 'select-payers',
      title: 'Choose insurance payers',
      description: 'Select which payers you want to be credentialed with',
      category: 'credentials',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 10,
    },
    {
      id: 'submit-credentialing',
      title: 'Submit credentialing applications',
      description: 'We handle all paperwork — you just review and sign',
      category: 'credentials',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 15,
    },

    // Week 3: Practice Setup
    {
      id: 'availability',
      title: 'Set your availability',
      description: 'Define your weekly schedule and session types',
      category: 'setup',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 10,
    },
    {
      id: 'session-rates',
      title: 'Set cash-pay rates',
      description: 'For clients without insurance or out-of-network',
      category: 'setup',
      isComplete: false,
      isRequired: false,
      estimatedMinutes: 5,
    },
    {
      id: 'telehealth-setup',
      title: 'Test telehealth setup',
      description: 'Camera, microphone, and connection check',
      category: 'setup',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 5,
    },
    {
      id: 'note-templates',
      title: 'Review AI note templates',
      description: 'Customize SOAP templates for your practice',
      category: 'setup',
      isComplete: false,
      isRequired: false,
      estimatedMinutes: 10,
    },
  ];

  // Add RBT management for BCBAs
  if (providerType === 'bcba' || providerType === 'bcaba') {
    steps.push({
      id: 'rbt-management',
      title: 'Set up RBT supervision',
      description: 'Add your RBTs, set supervision schedules, define protocols',
      category: 'setup',
      isComplete: false,
      isRequired: false,
      estimatedMinutes: 15,
    });
  }

  // Add supervisor linkage for RBTs
  if (providerType === 'rbt') {
    steps.push({
      id: 'link-supervisor',
      title: 'Link to your supervising BCBA',
      description: 'Your BCBA will need to approve your supervision arrangement',
      category: 'credentials',
      isComplete: false,
      isRequired: true,
      estimatedMinutes: 5,
    });
  }

  const startedAt = new Date().toISOString();
  const targetLaunch = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return {
    steps,
    currentStep: 0,
    estimatedDaysToLaunch: 30,
    startedAt,
    targetLaunchDate: targetLaunch.toISOString().split('T')[0],
  };
}

// ─── Phased Payment Protection ──────────────────────────────────────
//
// Phase 1 (0-20 providers): No clawback guarantee. We bill, fight denials,
//   and maintain 97%+ clean claim rate. Provider bears denial risk.
// Phase 2 (20+ providers, $100K+/mo claims): Limited no-clawback for
//   payers with <5% denial rate. Capped at $X/provider/month.
// Phase 3 ($1M+/mo claims): Full Headway-style no-clawback.
//   Reserve fund = 15% of monthly claims.

export type ClawbackPhase = 'standard' | 'limited-protection' | 'full-protection';

export interface PaymentGuarantee {
  guaranteedRate: number; // cents per unit
  payer: string;
  cptCode: string;
  effectiveDate: string;
  clawbackPhase: ClawbackPhase;
  clawbackProtected: boolean; // whether THIS specific payer qualifies
  protectionCap?: number; // max monthly clawback absorption in cents
  paymentSchedule: 'biweekly';
  estimatedPayDate: string;
  denialRiskNote: string;
}

export interface ClawbackConfig {
  phase: ClawbackPhase;
  providerCount: number;
  monthlyClaimVolume: number;
  reserveFundBalance: number;
  protectedPayers: string[]; // payers with <5% denial rate
  maxMonthlyAbsorption: number; // cents
}

export function getClawbackPhase(config: {
  providerCount: number;
  monthlyClaimVolume: number;
}): ClawbackPhase {
  if (config.monthlyClaimVolume >= 100000000) return 'full-protection'; // $1M+
  if (config.providerCount >= 20 && config.monthlyClaimVolume >= 10000000) return 'limited-protection'; // $100K+
  return 'standard';
}

export function calculateGuaranteedRate(
  cptCode: string,
  payer: string,
  _state: string,
  clawbackConfig?: ClawbackConfig
): PaymentGuarantee {
  // ABA-specific contracted rates (AZ market)
  const rates: Record<string, Record<string, number>> = {
    '97153': { // Direct ABA (1:1 RBT)
      'AHCCCS': 3200, // $32/15min unit
      'BCBS': 3800,
      'UHC': 3500,
      'Aetna': 3600,
      'Cigna': 3400,
      'default': 3000,
    },
    '97155': { // Protocol modification (BCBA)
      'AHCCCS': 4200,
      'BCBS': 5000,
      'UHC': 4800,
      'Aetna': 4600,
      'Cigna': 4400,
      'default': 4000,
    },
    '97156': { // Parent training (BCBA)
      'AHCCCS': 4000,
      'BCBS': 4800,
      'UHC': 4500,
      'Aetna': 4400,
      'Cigna': 4200,
      'default': 3800,
    },
    '97151': { // Assessment (BCBA)
      'AHCCCS': 5000,
      'BCBS': 6200,
      'UHC': 5800,
      'Aetna': 5600,
      'Cigna': 5400,
      'default': 5000,
    },
  };

  const cptRates = rates[cptCode] || rates['97153'];
  const rate = cptRates[payer] || cptRates['default'];

  const nextPayDate = getNextBiweeklyPayDate();

  const phase = clawbackConfig
    ? getClawbackPhase(clawbackConfig)
    : 'standard';

  const isProtectedPayer = clawbackConfig?.protectedPayers.includes(payer) ?? false;
  const clawbackProtected = phase === 'full-protection'
    || (phase === 'limited-protection' && isProtectedPayer);

  let denialRiskNote: string;
  if (clawbackProtected) {
    denialRiskNote = 'Payment protected — if this claim is denied, you still get paid. We handle the appeal.';
  } else if (phase === 'limited-protection') {
    denialRiskNote = `Payment protection not yet available for ${payer}. We submit claims and fight every denial, but you bear the risk until this payer qualifies (<5% denial rate).`;
  } else {
    denialRiskNote = 'We submit your claims and file appeals on denials. You get paid when the payer pays. 97%+ clean claim rate.';
  }

  return {
    guaranteedRate: rate,
    payer,
    cptCode,
    effectiveDate: new Date().toISOString().split('T')[0],
    clawbackPhase: phase,
    clawbackProtected,
    protectionCap: clawbackProtected ? clawbackConfig?.maxMonthlyAbsorption : undefined,
    paymentSchedule: 'biweekly',
    estimatedPayDate: nextPayDate,
    denialRiskNote,
  };
}

function getNextBiweeklyPayDate(): string {
  const now = new Date();
  const day = now.getDate();
  let payDate: Date;
  if (day <= 15) {
    payDate = new Date(now.getFullYear(), now.getMonth(), 15);
  } else {
    payDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  if (payDate <= now) {
    payDate.setDate(payDate.getDate() + 14);
  }
  return payDate.toISOString().split('T')[0];
}

// ─── RBT Management (Unique to ABA) ────────────────────────────────

export interface RBTSupervisionConfig {
  rbtId: string;
  rbtName: string;
  bcbaId: string;
  supervisoryRatio: string; // e.g., "1:1", "1:3"
  monthlySupervisionHoursRequired: number;
  monthlySupervisionHoursCompleted: number;
  lastSupervisionDate?: string;
  nextSupervisionDue: string;
  clients: string[];
  complianceStatus: 'compliant' | 'at-risk' | 'non-compliant';
}

export function checkRBTCompliance(config: RBTSupervisionConfig): {
  compliant: boolean;
  hoursRemaining: number;
  daysUntilDue: number;
  action: string;
} {
  const hoursRemaining = config.monthlySupervisionHoursRequired - config.monthlySupervisionHoursCompleted;
  const dueDate = new Date(config.nextSupervisionDue);
  const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  let action = '';
  if (hoursRemaining <= 0) {
    action = 'Supervision hours met for this period';
  } else if (daysUntilDue <= 3) {
    action = `URGENT: ${hoursRemaining.toFixed(1)} supervision hours needed in ${daysUntilDue} days`;
  } else if (daysUntilDue <= 7) {
    action = `Schedule ${hoursRemaining.toFixed(1)} hours of supervision this week`;
  } else {
    action = `${hoursRemaining.toFixed(1)} hours remaining, ${daysUntilDue} days until due`;
  }

  return {
    compliant: hoursRemaining <= 0,
    hoursRemaining: Math.max(0, hoursRemaining),
    daysUntilDue,
    action,
  };
}

// ─── Practice Dashboard KPIs ────────────────────────────────────────

export interface PracticeKPIs {
  totalClients: number;
  activeClients: number;
  weeklySessionsScheduled: number;
  weeklySessionsCompleted: number;
  completionRate: number;
  monthlyRevenue: number;
  outstandingClaims: number;
  denialRate: number;
  averageDaysToPayment: number;
  rbtComplianceRate: number;
  clientSatisfaction: number; // 0-5
  nextPaymentAmount: number;
  nextPaymentDate: string;
}

export function calculatePracticeHealth(kpis: PracticeKPIs): {
  score: number;
  status: 'thriving' | 'healthy' | 'needs-attention' | 'at-risk';
  topIssue?: string;
  topWin?: string;
} {
  let score = 50; // baseline

  // Revenue health
  if (kpis.monthlyRevenue > 10000) score += 15;
  else if (kpis.monthlyRevenue > 5000) score += 10;
  else if (kpis.monthlyRevenue > 2000) score += 5;

  // Completion rate
  if (kpis.completionRate >= 90) score += 10;
  else if (kpis.completionRate >= 80) score += 5;
  else score -= 5;

  // Denial rate
  if (kpis.denialRate <= 5) score += 10;
  else if (kpis.denialRate <= 10) score += 5;
  else score -= 10;

  // RBT compliance
  if (kpis.rbtComplianceRate >= 95) score += 10;
  else if (kpis.rbtComplianceRate >= 80) score += 5;
  else score -= 10;

  // Client satisfaction
  if (kpis.clientSatisfaction >= 4.5) score += 5;
  else if (kpis.clientSatisfaction < 3.5) score -= 5;

  score = Math.max(0, Math.min(100, score));

  let status: 'thriving' | 'healthy' | 'needs-attention' | 'at-risk';
  if (score >= 80) status = 'thriving';
  else if (score >= 60) status = 'healthy';
  else if (score >= 40) status = 'needs-attention';
  else status = 'at-risk';

  let topIssue: string | undefined;
  if (kpis.denialRate > 10) topIssue = `Denial rate at ${kpis.denialRate}% — review top denial reasons`;
  else if (kpis.rbtComplianceRate < 80) topIssue = 'RBT supervision hours falling behind';
  else if (kpis.completionRate < 80) topIssue = `${Math.round(100 - kpis.completionRate)}% of sessions cancelled or no-showed`;

  let topWin: string | undefined;
  if (kpis.completionRate >= 95) topWin = `${kpis.completionRate}% session completion — exceptional`;
  else if (kpis.clientSatisfaction >= 4.5) topWin = `${kpis.clientSatisfaction}/5 client satisfaction`;
  else if (kpis.denialRate <= 3) topWin = `Only ${kpis.denialRate}% denial rate — clean billing`;

  return { score, status, topIssue, topWin };
}

// ─── Phase Configuration ────────────────────────────────────────────

export const PROVIDER_PHASES: Record<ProviderType, { phase: number; label: string; available: boolean }> = {
  bcba: { phase: 1, label: 'ABA', available: true },
  bcaba: { phase: 1, label: 'ABA', available: true },
  rbt: { phase: 1, label: 'ABA', available: true },
  slp: { phase: 2, label: 'Speech Therapy', available: false },
  slpa: { phase: 2, label: 'Speech Therapy', available: false },
  ot: { phase: 2, label: 'Occupational Therapy', available: false },
  ota: { phase: 2, label: 'Occupational Therapy', available: false },
  lcsw: { phase: 3, label: 'Mental Health', available: false },
  lpc: { phase: 3, label: 'Mental Health', available: false },
  psyd: { phase: 3, label: 'Mental Health', available: false },
};

export function isProviderTypeAvailable(type: ProviderType): boolean {
  return PROVIDER_PHASES[type]?.available ?? false;
}
