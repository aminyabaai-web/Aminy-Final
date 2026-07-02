// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Aminy Telehealth Pricing Configuration
 *
 * All session pricing, provider compensation, and service definitions.
 * Designed for CPT code alignment and future insurance billing.
 */

export type ProviderCategory = 'behavioral' | 'therapy' | 'diagnostic';
export type BillingSessionType =
  | 'bcba_consult'
  | 'bcba_quick'
  | 'bcba_assessment'
  | 'rbt_session'
  | 'rbt_extended'
  | 'therapist_45'
  | 'therapist_60'
  | 'slp_session'
  | 'ot_session'
  | 'autism_eval'
  | 'adhd_eval'
  | 'combined_eval'
  | 'dev_screening';

export interface SessionPricing {
  id: BillingSessionType;
  name: string;
  shortName: string;
  description: string;
  parentBenefit: string; // What parents get out of this
  duration: number; // in minutes
  durationDisplay: string; // "up to X min"
  price: number;
  providerPay: number;
  margin: number; // percentage
  /**
   * CPT code(s) for superbills. Multi-code strings use '/' or ', ' separators
   * (e.g. '97155/97156', '96130, 96131'). Every referenced code MUST exist in
   * the CPT rules registry (src/lib/billing/cpt-registry.ts) — validated at
   * module load in dev below.
   */
  cptCode: string;
  cptDescription: string;
  category: ProviderCategory;
  providerType: string;
  popular?: boolean;
}

export interface SameDayPricing {
  sessionId: BillingSessionType;
  standardPrice: number;
  sameDayPrice: number;
  providerBonus: number;
  convenienceFee: number;
}

// =============================================================================
// SESSION PRICING
// =============================================================================

export const SESSION_PRICING: Record<BillingSessionType, SessionPricing> = {
  // BEHAVIORAL TEAM
  bcba_consult: {
    id: 'bcba_consult',
    name: 'ABA Specialist Consultation',
    shortName: 'BCBA Consult',
    description: 'One-on-one guidance from a Board Certified Behavior Analyst',
    parentBenefit: 'Get expert strategies tailored to your child\'s unique needs',
    duration: 60,
    durationDisplay: 'up to 60 min',
    price: 149,
    providerPay: 65,
    margin: 56,
    cptCode: '97155/97156',
    cptDescription: 'Adaptive behavior treatment with protocol modification',
    category: 'behavioral',
    providerType: 'bcba',
    popular: true,
  },
  bcba_quick: {
    id: 'bcba_quick',
    name: 'BCBA Quick Check-In',
    shortName: 'BCBA Quick',
    description: 'Brief consultation for specific questions or follow-ups',
    parentBenefit: 'Get quick answers without scheduling a full session',
    duration: 30,
    durationDisplay: 'up to 30 min',
    price: 79,
    providerPay: 35,
    margin: 56,
    cptCode: '97155',
    cptDescription: 'Adaptive behavior treatment with protocol modification',
    category: 'behavioral',
    providerType: 'bcba',
  },
  bcba_assessment: {
    id: 'bcba_assessment',
    name: 'ABA Comprehensive Assessment',
    shortName: 'BCBA Assessment',
    description: 'In-depth evaluation to create a personalized behavior support plan',
    parentBenefit: 'Understand your child\'s strengths and get a clear path forward',
    duration: 90,
    durationDisplay: 'up to 90 min',
    price: 219,
    providerPay: 95,
    margin: 57,
    cptCode: '97151',
    cptDescription: 'Behavior identification assessment',
    category: 'behavioral',
    providerType: 'bcba',
  },
  rbt_session: {
    id: 'rbt_session',
    name: 'ABA Coaching Session',
    shortName: 'ABA Coach',
    description: 'Skill-building session with a trained behavior technician',
    parentBenefit: 'Practice new skills with guided support',
    duration: 30,
    durationDisplay: 'up to 30 min',
    price: 49,
    providerPay: 20,
    margin: 59,
    cptCode: '97153',
    cptDescription: 'Adaptive behavior treatment',
    category: 'behavioral',
    providerType: 'rbt',
  },
  rbt_extended: {
    id: 'rbt_extended',
    name: 'ABA Extended Coaching',
    shortName: 'ABA Coach Extended',
    description: 'Extended skill-building session for deeper practice',
    parentBenefit: 'More time to work through challenges together',
    duration: 60,
    durationDisplay: 'up to 60 min',
    price: 89,
    providerPay: 38,
    margin: 57,
    cptCode: '97153',
    cptDescription: 'Adaptive behavior treatment',
    category: 'behavioral',
    providerType: 'rbt',
  },

  // THERAPY TEAM
  therapist_45: {
    id: 'therapist_45',
    name: 'Family Therapy Session',
    shortName: 'Therapy (45 min)',
    description: 'Support for anxiety, emotions, and family dynamics',
    parentBenefit: 'Build coping skills and strengthen family connections',
    duration: 45,
    durationDisplay: 'up to 45 min',
    price: 129,
    providerPay: 55,
    margin: 57,
    cptCode: '90834',
    cptDescription: 'Psychotherapy, 38-52 minutes',
    category: 'therapy',
    providerType: 'lpc',
  },
  therapist_60: {
    id: 'therapist_60',
    name: 'Family Therapy Session',
    shortName: 'Therapy (60 min)',
    description: 'Extended support for complex situations',
    parentBenefit: 'Deeper exploration and more time for breakthroughs',
    duration: 60,
    durationDisplay: 'up to 60 min',
    price: 159,
    providerPay: 70,
    margin: 56,
    cptCode: '90837',
    cptDescription: 'Psychotherapy, 53+ minutes',
    category: 'therapy',
    providerType: 'lpc',
    popular: true,
  },
  slp_session: {
    id: 'slp_session',
    name: 'Speech Therapy Session',
    shortName: 'Speech Therapy',
    description: 'Communication, language, and feeding support',
    parentBenefit: 'Help your child find their voice and connect',
    duration: 45,
    durationDisplay: 'up to 45 min',
    price: 129,
    providerPay: 55,
    margin: 57,
    cptCode: '92507',
    cptDescription: 'Speech/language treatment, individual',
    category: 'therapy',
    providerType: 'slp',
  },
  ot_session: {
    id: 'ot_session',
    name: 'Occupational Therapy Session',
    shortName: 'OT Session',
    description: 'Sensory, motor, and daily living skills support',
    parentBenefit: 'Help your child feel comfortable and capable in daily life',
    duration: 45,
    durationDisplay: 'up to 45 min',
    price: 129,
    providerPay: 55,
    margin: 57,
    cptCode: '97530',
    cptDescription: 'Therapeutic activities',
    category: 'therapy',
    providerType: 'ot',
  },

  // DIAGNOSTIC SERVICES
  autism_eval: {
    id: 'autism_eval',
    name: 'Autism Evaluation',
    shortName: 'Autism Eval',
    description: 'Comprehensive autism assessment with licensed psychologist',
    parentBenefit: 'Get clarity and a clear path to the right support',
    duration: 90,
    durationDisplay: 'up to 90 min',
    price: 899,
    providerPay: 375,
    margin: 58,
    cptCode: '96130, 96131',
    cptDescription: 'Psychological testing evaluation',
    category: 'diagnostic',
    providerType: 'psychologist',
  },
  adhd_eval: {
    id: 'adhd_eval',
    name: 'ADHD Evaluation',
    shortName: 'ADHD Eval',
    description: 'Thorough ADHD assessment with clinical interview and testing',
    parentBenefit: 'Understand attention challenges and get actionable next steps',
    duration: 60,
    durationDisplay: 'up to 60 min',
    price: 399,
    providerPay: 175,
    margin: 56,
    cptCode: '96130, 96136',
    cptDescription: 'Psychological testing evaluation',
    category: 'diagnostic',
    providerType: 'psychologist',
    popular: true,
  },
  combined_eval: {
    id: 'combined_eval',
    name: 'Autism + ADHD Evaluation',
    shortName: 'Combined Eval',
    description: 'Comprehensive evaluation for both autism and ADHD',
    parentBenefit: 'Complete picture in one appointment - no repeat visits',
    duration: 120,
    durationDisplay: 'up to 120 min',
    price: 1199,
    providerPay: 500,
    margin: 58,
    cptCode: '96130, 96131, 96136',
    cptDescription: 'Psychological testing evaluation',
    category: 'diagnostic',
    providerType: 'psychologist',
  },
  dev_screening: {
    id: 'dev_screening',
    name: 'Developmental Screening',
    shortName: 'Dev Screening',
    description: 'Quick check to see if a full evaluation is needed',
    parentBenefit: 'Peace of mind or early direction - either way, you\'ll know',
    duration: 45,
    durationDisplay: 'up to 45 min',
    price: 149,
    providerPay: 60,
    margin: 60,
    cptCode: '96110',
    cptDescription: 'Developmental screening',
    category: 'diagnostic',
    providerType: 'bcba',
  },
};

// =============================================================================
// SAME-DAY PRIORITY BOOKING
// =============================================================================

export const SAME_DAY_FEE = 35;
export const SAME_DAY_PROVIDER_BONUS = 15;

export const SAME_DAY_PRICING: SameDayPricing[] = [
  {
    sessionId: 'bcba_consult',
    standardPrice: 149,
    sameDayPrice: 184,
    providerBonus: SAME_DAY_PROVIDER_BONUS,
    convenienceFee: SAME_DAY_FEE,
  },
  {
    sessionId: 'rbt_session',
    standardPrice: 49,
    sameDayPrice: 84,
    providerBonus: SAME_DAY_PROVIDER_BONUS,
    convenienceFee: SAME_DAY_FEE,
  },
  {
    sessionId: 'therapist_45',
    standardPrice: 129,
    sameDayPrice: 164,
    providerBonus: SAME_DAY_PROVIDER_BONUS,
    convenienceFee: SAME_DAY_FEE,
  },
  {
    sessionId: 'therapist_60',
    standardPrice: 159,
    sameDayPrice: 194,
    providerBonus: SAME_DAY_PROVIDER_BONUS,
    convenienceFee: SAME_DAY_FEE,
  },
  {
    sessionId: 'slp_session',
    standardPrice: 129,
    sameDayPrice: 164,
    providerBonus: SAME_DAY_PROVIDER_BONUS,
    convenienceFee: SAME_DAY_FEE,
  },
  {
    sessionId: 'ot_session',
    standardPrice: 129,
    sameDayPrice: 164,
    providerBonus: SAME_DAY_PROVIDER_BONUS,
    convenienceFee: SAME_DAY_FEE,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getSessionPricing(sessionId: BillingSessionType): SessionPricing {
  return SESSION_PRICING[sessionId];
}

export function getSessionsByCategory(category: ProviderCategory): SessionPricing[] {
  return Object.values(SESSION_PRICING).filter(s => s.category === category);
}

export function getPopularSessions(): SessionPricing[] {
  return Object.values(SESSION_PRICING).filter(s => s.popular);
}

export function getSameDayPrice(sessionId: BillingSessionType): SameDayPricing | undefined {
  return SAME_DAY_PRICING.find(s => s.sessionId === sessionId);
}

export function formatPrice(price: number): string {
  return `$${price}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

// =============================================================================
// PROVIDER AGREEMENT TERMS
// =============================================================================

export const PROVIDER_SESSION_TERMS = `
Per session compensation includes:
• Face-to-face telehealth time as specified
• Session documentation and care plan notes
• AI-assisted care plan submission for parent review
• Response to parent follow-up messages within 24 business hours

Session time is measured from when the video call connects to when it ends.
Documentation and follow-up messaging are expected but not time-tracked.
`;

// =============================================================================
// PARENT-FACING COPY
// =============================================================================

export const PRICING_MESSAGING = {
  headline: 'Expert Support, When You Need It',
  subheadline: 'Connect with licensed specialists who understand your family\'s journey',

  valueProps: [
    'No waitlists - book within days, not months',
    'Superbill provided for insurance reimbursement',
    'All providers are licensed and background-checked',
    'Sessions from home - no travel, no waiting rooms',
  ],

  sessionIncludes: [
    'Video session with your provider',
    'Written session summary',
    'Personalized recommendations',
    'Follow-up messaging for questions',
  ],

  diagnosticIncludes: [
    'Comprehensive clinical evaluation',
    'Detailed diagnostic report',
    'Treatment recommendations',
    'Superbill for insurance submission',
  ],

  sameDayMessage: 'Need help today? Same-day appointments available with select providers.',

  superbillMessage: 'After your session, we\'ll provide a superbill you can submit to your insurance for potential reimbursement.',

  trustBadges: [
    'HIPAA Compliant',
    'Licensed Providers',
    'Secure Video',
    'Background Checked',
  ],
};

// =============================================================================
// SUBSCRIPTION TIER INTEGRATION
// =============================================================================

export const TIER_DISCOUNTS: Record<string, number> = {
  free: 0,
  starter: 0.10, // Legacy: same as Core
  core: 0.10,    // 10% off sessions
  pro: 0.20,     // 20% off sessions
  proplus: 0.30, // 30% off sessions (Family Plan)
};

export function getPriceForTier(basePrice: number, tier: string): number {
  const discount = TIER_DISCOUNTS[tier] || 0;
  return Math.round(basePrice * (1 - discount));
}
