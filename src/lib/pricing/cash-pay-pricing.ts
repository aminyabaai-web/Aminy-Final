// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Cash-Pay Pricing Engine
 *
 * CPT-aligned pricing for ABA, Mental Health, and Speech services.
 * Market-competitive rates validated against 2025-2026 national averages.
 *
 * Terminology: "client" (not "patient") — Aminy is a platform, not a clinic.
 *
 * Rate methodology:
 * - Family prices: At or slightly below market average for telehealth convenience
 * - Provider rates: Competitive enough to attract quality providers ($130/hr BCBA, $65/hr RBT)
 * - Aminy margin: 25% cash-pay take rate (above Headway ~15%, below BetterHelp ~65%) — see PLATFORM_FEE_RATES
 * - Membership discounts: Aminy absorbs discount, provider rate stays fixed
 *
 * Sources: ABA therapy cost surveys 2025-2026, SimplePractice rate data,
 * Headway/Alma/Grow Therapy marketplace analysis, VC marketplace benchmarks
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServiceCategory = 'aba' | 'mental-health' | 'speech';
export type MembershipTier = 'starter' | 'core' | 'pro';

export interface CashPayService {
  id: string;
  category: ServiceCategory;
  cptCode: string;
  cptModifier?: string;
  name: string;
  shortName: string;
  description: string;
  providerType: string; // e.g., 'BCBA', 'RBT', 'LCSW', 'SLP'
  durationMinutes: number;
  familyPays: number;
  providerGets: number;
  aminyKeeps: number;
  aminyPct: number;
  marketRange: { low: number; high: number }; // national cash-pay range
  popular?: boolean;
}

export interface PackageDiscount {
  sessions: number;
  label: string;
  discountPct: number;
}

export interface MembershipDiscount {
  tier: MembershipTier;
  discountPct: number;
  monthlyPrice: number;
  label: string;
  tagline: string;
}

export interface PriceBreakdown {
  serviceId: string;
  serviceName: string;
  cptCode: string;
  basePrice: number;
  membershipDiscount: number;
  packageDiscount: number;
  totalDiscount: number;
  finalPrice: number;
  providerGets: number;
  aminyKeeps: number;
  tier: MembershipTier;
  packageSize?: number;
}

export interface PackageOption {
  sessions: number;
  label: string;
  discountPct: number;
  pricePerSession: number;
  totalPrice: number;
  savings: number;
}

export interface SuperbillLine {
  cptCode: string;
  modifier?: string;
  description: string;
  durationMinutes: number;
  chargeAmount: number;
  diagnosisPointer: string;
  placeOfService: string;
}

export interface SavingsCalculation {
  tier: MembershipTier;
  monthlyFee: number;
  sessionsPerMonth: number;
  pricePerSessionBase: number;
  pricePerSessionWithDiscount: number;
  monthlyCostWithoutMembership: number;
  monthlyCostWithMembership: number;
  monthlySavings: number;
  annualSavings: number;
  breakevenSessions: number;
}

// ---------------------------------------------------------------------------
// ABA Care Package — bundles RBT hours + required BCBA supervision
// ---------------------------------------------------------------------------

export interface ABASupervisionRequirement {
  rbtHoursPerMonth: number;
  requiredBCBAHours: number; // 5% of RBT hours, enforced minimum
  requiredContacts: number;  // BACB min 2/month
  /** What those BCBA contacts typically look like */
  contactTypes: ('parent-training' | 'direct-observation' | 'team-meeting')[];
}

export interface ABACarePackage {
  id: string;
  name: string;
  description: string;
  rbtHoursPerMonth: number;
  bcbaSessionsPerMonth: number; // parent training + supervision combined
  bcbaSessionMinutes: number;
  rbtCostPerMonth: number;
  bcbaCostPerMonth: number;
  totalFamilyPays: number;
  providerGetsRBT: number;   // total to RBT for the month
  providerGetsBCBA: number;  // total to BCBA for the month
  aminyKeeps: number;
  aminyPct: number;
  popular?: boolean;
  /** What families actually get from the BCBA time */
  bcbaValueProp: string;
}

// Generic care package for Speech + Mental Health
export interface ServiceCarePackage {
  id: string;
  serviceCategory: ServiceCategory;
  name: string;
  tagline: string;
  description: string;
  sessionsPerMonth: number;
  sessionCPT: string;
  sessionMinutes: number;
  includesIntake?: boolean; // onramp packages include eval/intake
  intakeCPT?: string;
  totalFamilyPays: number;
  alaCarteValue: number;    // what it would cost à la carte
  savings: number;
  discountPct: number;
  providerGets: number;
  aminyKeeps: number;
  aminyPct: number;
  popular?: boolean;
  providerType: string;
}

// ---------------------------------------------------------------------------
// Data — Services
// ---------------------------------------------------------------------------

export const SERVICES: CashPayService[] = [
  // ── ABA Therapy ──────────────────────────────────────────────────────────

  {
    id: 'autism-eval-comprehensive',
    category: 'aba',
    cptCode: '97151',
    cptModifier: '96130+96131',
    name: 'Comprehensive Autism Evaluation',
    shortName: 'Autism Eval',
    description:
      'Full diagnostic evaluation including ADOS-2, developmental history, cognitive screening, and written report with diagnosis and recommendations. Conducted by a licensed psychologist or developmental specialist.',
    providerType: 'Psychologist / Dev Specialist',
    durationMinutes: 180,
    familyPays: 1899,
    providerGets: 1250,
    aminyKeeps: 649,
    aminyPct: 34,
    marketRange: { low: 1200, high: 5000 },
  },
  {
    id: 'aba-assessment',
    category: 'aba',
    cptCode: '97151',
    name: 'BCBA Behavioral Assessment',
    shortName: 'BCBA Assessment',
    description:
      'Functional behavior assessment (FBA) by a Board Certified Behavior Analyst. Includes observation, caregiver interview, and written behavior intervention plan (BIP) — all included in the session price.',
    providerType: 'BCBA',
    durationMinutes: 120,
    familyPays: 299,
    providerGets: 195,
    aminyKeeps: 104,
    aminyPct: 35,
    marketRange: { low: 250, high: 500 },
    popular: true,
  },
  {
    id: 'bcba-session',
    category: 'aba',
    cptCode: '97155',
    cptModifier: 'or 97156',
    name: 'BCBA Session',
    shortName: 'BCBA Session',
    description:
      'One-on-one hour with a Board Certified Behavior Analyst. Direct therapy, parent coaching, behavior strategies, skill acquisition — your BCBA tailors the session to what your family needs most. Correct CPT code (97155 or 97156) applied on your superbill.',
    providerType: 'BCBA',
    durationMinutes: 60,
    familyPays: 149,
    providerGets: 95,
    aminyKeeps: 54,
    aminyPct: 36,
    marketRange: { low: 100, high: 200 },
    popular: true,
  },
  {
    id: 'rbt-supervised',
    category: 'aba',
    cptCode: '97153',
    name: 'RBT Direct Therapy',
    shortName: 'RBT Session',
    description:
      'Direct ABA therapy delivered by a Registered Behavior Technician under BCBA supervision. Focused on individualized skill-building and behavior goals. Note: BACB requires ongoing BCBA oversight — see our ABA Care Packages for bundled pricing that includes parent training with your supervising BCBA.',
    providerType: 'RBT (BCBA-supervised)',
    durationMinutes: 60,
    familyPays: 89,
    providerGets: 55,
    aminyKeeps: 34,
    aminyPct: 38,
    marketRange: { low: 50, high: 100 },
  },

  // ── Mental Health ────────────────────────────────────────────────────────

  {
    id: 'mh-intake',
    category: 'mental-health',
    cptCode: '90791',
    name: 'Diagnostic Evaluation',
    shortName: 'MH Intake',
    description:
      'Initial psychiatric diagnostic evaluation. Comprehensive assessment of symptoms, history, and development of a personalized treatment plan.',
    providerType: 'LCSW / LPC / Psychologist',
    durationMinutes: 60,
    familyPays: 229,
    providerGets: 150,
    aminyKeeps: 79,
    aminyPct: 35,
    marketRange: { low: 150, high: 300 },
  },
  {
    id: 'mh-session-53',
    category: 'mental-health',
    cptCode: '90837',
    name: 'Therapy Session (53 min)',
    shortName: 'Therapy 53min',
    description:
      'Individual psychotherapy session focused on evidence-based treatment for anxiety, depression, trauma, ADHD, and behavioral challenges in children and adolescents.',
    providerType: 'LCSW / LPC / Psychologist',
    durationMinutes: 53,
    familyPays: 169,
    providerGets: 110,
    aminyKeeps: 59,
    aminyPct: 35,
    marketRange: { low: 120, high: 250 },
    popular: true,
  },
  {
    id: 'mh-session-38',
    category: 'mental-health',
    cptCode: '90834',
    name: 'Therapy Session (38 min)',
    shortName: 'Therapy 38min',
    description:
      'Shorter individual therapy session ideal for check-ins, skill reinforcement, and ongoing treatment support between longer sessions.',
    providerType: 'LCSW / LPC / Psychologist',
    durationMinutes: 38,
    familyPays: 129,
    providerGets: 85,
    aminyKeeps: 44,
    aminyPct: 34,
    marketRange: { low: 100, high: 200 },
  },

  // ── Speech Therapy ───────────────────────────────────────────────────────

  {
    id: 'speech-eval',
    category: 'speech',
    cptCode: '92523',
    name: 'Speech-Language Evaluation',
    shortName: 'Speech Eval',
    description:
      'Comprehensive speech and language evaluation including articulation, fluency, voice, and language comprehension assessments with written report.',
    providerType: 'SLP (CCC-SLP)',
    durationMinutes: 60,
    familyPays: 279,
    providerGets: 185,
    aminyKeeps: 94,
    aminyPct: 34,
    marketRange: { low: 200, high: 500 },
  },
  {
    id: 'speech-session',
    category: 'speech',
    cptCode: '92507',
    name: 'Speech Therapy Session',
    shortName: 'Speech Session',
    description:
      'Individual speech-language therapy targeting articulation, language, fluency, or social communication goals. Includes parent coaching component.',
    providerType: 'SLP (CCC-SLP)',
    durationMinutes: 45,
    familyPays: 139,
    providerGets: 95,
    aminyKeeps: 44,
    aminyPct: 32,
    marketRange: { low: 100, high: 250 },
    popular: true,
  },
];

// ---------------------------------------------------------------------------
// Data — Packages & Memberships
// ---------------------------------------------------------------------------

export const PACKAGE_DISCOUNTS: PackageDiscount[] = [
  { sessions: 4, label: '4-Session Pack', discountPct: 5 },
  { sessions: 8, label: '8-Session Pack', discountPct: 10 },
  { sessions: 12, label: '12-Session Pack (Best Value)', discountPct: 15 },
];

export const MEMBERSHIP_DISCOUNTS: MembershipDiscount[] = [
  {
    tier: 'starter',
    discountPct: 5,
    monthlyPrice: 6.99,
    label: 'Starter',
    tagline: 'Basic Ease access + 5% off sessions',
  },
  {
    tier: 'core',
    discountPct: 10,
    monthlyPrice: 14.99,
    label: 'Core',
    tagline: 'Full Ease + AI insights + 10% off sessions',
  },
  {
    tier: 'pro',
    discountPct: 20,
    monthlyPrice: 29.99,
    label: 'Pro',
    tagline: 'Everything + Vault AI + priority matching + 20% off sessions',
  },
];

// ---------------------------------------------------------------------------
// Data — Provider Economics (SaaS tier for own clients)
// ---------------------------------------------------------------------------

export const PROVIDER_SAAS_TIERS = {
  basic: { monthlyPrice: 49, label: 'Basic', features: ['Scheduling', 'Telehealth', 'Notes'] },
  professional: {
    monthlyPrice: 79,
    label: 'Professional',
    features: ['Everything in Basic', 'Ease for clients', 'AI session notes', 'Superbills'],
  },
  enterprise: {
    monthlyPrice: 99,
    label: 'Enterprise',
    features: ['Everything in Professional', 'Multi-provider', 'Analytics', 'Custom branding'],
  },
} as const;

export const INSURED_REFERRAL_FEE_PCT = 10; // 10% of collected revenue per session

// ---------------------------------------------------------------------------
// ABA Care Packages — RBT therapy + required BCBA oversight as parent training
// ---------------------------------------------------------------------------
// BACB requires 5% of RBT direct hours as BCBA supervision, min 2 contacts/mo.
// Rather than hiding this cost, we frame BCBA time as what it actually is:
// monthly parent training sessions. The family gets real coaching value,
// the BCBA fulfills supervision duties during those same sessions.
//
// Pricing: RBT hours priced at $89/hr. BCBA parent training at $149/session.
// Packages offer slight bundle discount on the combined total.
// ---------------------------------------------------------------------------

export const ABA_CARE_PACKAGES: ABACarePackage[] = [
  {
    id: 'aba-starter',
    name: 'ABA Starter',
    description:
      'Ideal for families beginning ABA services or supplementing school-based therapy. Your BCBA meets with you monthly to coach strategies and oversee your child\'s progress.',
    rbtHoursPerMonth: 10,
    bcbaSessionsPerMonth: 1,
    bcbaSessionMinutes: 60,
    rbtCostPerMonth: 849,   // 10 × $89 = $890, bundled to $849
    bcbaCostPerMonth: 149,  // 1 × $149
    totalFamilyPays: 999,   // $999/mo — clean, psychological
    providerGetsRBT: 550,   // 10 × $55
    providerGetsBCBA: 95,   // 1 × $95
    aminyKeeps: 354,        // $999 - $550 - $95
    aminyPct: 35,
    bcbaValueProp:
      '1 parent training session/month — your BCBA coaches you on strategies, reviews data, and adjusts your child\'s program.',
  },
  {
    id: 'aba-core',
    name: 'ABA Core',
    description:
      'Our most popular package. Enough RBT hours for meaningful skill-building with twice-monthly BCBA parent coaching — one session with your child present, one parent-only.',
    rbtHoursPerMonth: 20,
    bcbaSessionsPerMonth: 2,
    bcbaSessionMinutes: 60,
    rbtCostPerMonth: 1699,  // 20 × $89 = $1,780, bundled to $1,699
    bcbaCostPerMonth: 249,  // 2 × $149 = $298, bundled to $249
    totalFamilyPays: 1949,  // $1,949/mo
    providerGetsRBT: 1100,  // 20 × $55
    providerGetsBCBA: 190,  // 2 × $95
    aminyKeeps: 659,        // $1,949 - $1,100 - $190
    aminyPct: 34,
    popular: true,
    bcbaValueProp:
      '2 parent training sessions/month — 1 with your child (direct observation + coaching) and 1 parent-only strategy session. Your BCBA also reviews all RBT session data.',
  },
  {
    id: 'aba-intensive',
    name: 'ABA Intensive',
    description:
      'Full-intensity ABA program with weekly BCBA involvement. Best for children who need comprehensive, rapid skill-building — especially in the first year after diagnosis.',
    rbtHoursPerMonth: 30,
    bcbaSessionsPerMonth: 4,
    bcbaSessionMinutes: 60,
    rbtCostPerMonth: 2499,  // 30 × $89 = $2,670, bundled to $2,499
    bcbaCostPerMonth: 449,  // 4 × $149 = $596, bundled to $449
    totalFamilyPays: 2949,  // $2,949/mo
    providerGetsRBT: 1650,  // 30 × $55
    providerGetsBCBA: 380,  // 4 × $95
    aminyKeeps: 919,        // $2,949 - $1,650 - $380
    aminyPct: 31,
    bcbaValueProp:
      'Weekly BCBA sessions — mix of parent training, direct observation, and team coordination. Your BCBA is deeply involved in your child\'s progress every week.',
  },
];

/**
 * Calculate BACB-required supervision for a given number of RBT hours.
 * Returns the minimum BCBA contacts and hours needed.
 */
export function calculateSupervisionCost(rbtHoursPerMonth: number): ABASupervisionRequirement {
  const requiredBCBAHours = Math.max(1, Math.ceil(rbtHoursPerMonth * 0.05));
  // BACB minimum: 2 contacts/month. If hours are high enough, more contacts.
  const requiredContacts = Math.max(2, Math.ceil(requiredBCBAHours));

  // Typical split: at least 1 direct observation (with kid), rest parent training
  const contactTypes: ABASupervisionRequirement['contactTypes'] = ['direct-observation'];
  for (let i = 1; i < requiredContacts; i++) {
    contactTypes.push('parent-training');
  }

  return {
    rbtHoursPerMonth,
    requiredBCBAHours,
    requiredContacts,
    contactTypes,
  };
}

/**
 * Get the recommended care package based on prescribed RBT hours.
 */
export function getRecommendedPackage(
  prescribedRBTHoursPerMonth: number
): ABACarePackage {
  if (prescribedRBTHoursPerMonth <= 12) return ABA_CARE_PACKAGES[0]; // Starter
  if (prescribedRBTHoursPerMonth <= 24) return ABA_CARE_PACKAGES[1]; // Core
  return ABA_CARE_PACKAGES[2]; // Intensive
}

/**
 * Calculate total monthly cost for a family with both à la carte and package options.
 * Shows the family why the package saves money vs buying sessions individually.
 */
export function comparePackageVsAlaCarte(
  rbtHoursPerMonth: number,
  bcbaSessionsPerMonth: number,
  tier: MembershipTier
): {
  alaCarteTotal: number;
  packageTotal: number;
  savings: number;
  recommendedPackage: ABACarePackage;
} {
  const rbtPrice = getServicePrice('rbt-supervised', tier);
  const bcbaPrice = getServicePrice('bcba-session', tier);

  const alaCarteTotal = round2(
    rbtPrice.finalPrice * rbtHoursPerMonth +
    bcbaPrice.finalPrice * bcbaSessionsPerMonth
  );

  const pkg = getRecommendedPackage(rbtHoursPerMonth);

  return {
    alaCarteTotal,
    packageTotal: pkg.totalFamilyPays,
    savings: round2(alaCarteTotal - pkg.totalFamilyPays),
    recommendedPackage: pkg,
  };
}

// ---------------------------------------------------------------------------
// Speech Care Packages
// ---------------------------------------------------------------------------
// No supervision bundling needed — SLP is the sole treating provider.
// Packages are commitment-discount plays + onramp reduction.
// SLP rate: $95/session (45 min, 92507). Eval: $185 (60 min, 92523).
// ---------------------------------------------------------------------------

export const SPEECH_CARE_PACKAGES: ServiceCarePackage[] = [
  {
    id: 'speech-launch',
    serviceCategory: 'speech',
    name: 'Speech Launch',
    tagline: 'Start strong — eval included',
    description:
      'Everything your child needs to start speech therapy: a comprehensive evaluation plus your first month of weekly sessions. One flat price, no surprises.',
    sessionsPerMonth: 4,
    sessionCPT: '92507',
    sessionMinutes: 45,
    includesIntake: true,
    intakeCPT: '92523',
    totalFamilyPays: 379,   // eval $279 + 4 sessions $556 = $835 à la carte → $379 launch price
    alaCarteValue: 835,
    savings: 456,           // significant onramp discount to acquire the family
    discountPct: 55,        // steep intentionally — acquisition cost, family becomes recurring
    providerGets: 280,      // eval $185 + 4×$95=$380 blended to $280 for launch
    aminyKeeps: 99,
    aminyPct: 26,
    providerType: 'SLP (CCC-SLP)',
  },
  {
    id: 'speech-monthly-1x',
    serviceCategory: 'speech',
    name: 'Speech Starter',
    tagline: 'Weekly sessions, monthly commitment',
    description:
      'Four speech therapy sessions per month — the research-backed minimum for meaningful progress. Commit monthly and save vs. booking individually.',
    sessionsPerMonth: 4,
    sessionCPT: '92507',
    sessionMinutes: 45,
    totalFamilyPays: 499,   // à la carte: 4 × $139 = $556
    alaCarteValue: 556,
    savings: 57,
    discountPct: 10,
    providerGets: 380,      // 4 × $95
    aminyKeeps: 119,
    aminyPct: 24,
    popular: true,
    providerType: 'SLP (CCC-SLP)',
  },
  {
    id: 'speech-monthly-2x',
    serviceCategory: 'speech',
    name: 'Speech Intensive',
    tagline: 'Twice-weekly for accelerated progress',
    description:
      'Eight sessions per month — ideal for children with significant speech delays, early intervention, or post-diagnosis priority skill-building. Maximum SLP contact, maximum gains.',
    sessionsPerMonth: 8,
    sessionCPT: '92507',
    sessionMinutes: 45,
    totalFamilyPays: 949,   // à la carte: 8 × $139 = $1,112
    alaCarteValue: 1112,
    savings: 163,
    discountPct: 15,
    providerGets: 760,      // 8 × $95
    aminyKeeps: 189,
    aminyPct: 20,
    providerType: 'SLP (CCC-SLP)',
  },
];

// ---------------------------------------------------------------------------
// Mental Health Care Packages
// ---------------------------------------------------------------------------
// Therapist is sole treating provider — no supervision layer.
// Packages are session-commitment discounts + onramp acquisition.
// Session rate: $169/53min (90837). Intake: $229 (90791).
// ---------------------------------------------------------------------------

export const MH_CARE_PACKAGES: ServiceCarePackage[] = [
  {
    id: 'mh-launch',
    serviceCategory: 'mental-health',
    name: 'Therapy Launch',
    tagline: 'Intake + first month — one price',
    description:
      'Start therapy right: a diagnostic intake session plus two biweekly therapy sessions in month one. Your therapist builds your child\'s treatment plan, you see momentum before committing to weekly.',
    sessionsPerMonth: 2,
    sessionCPT: '90837',
    sessionMinutes: 53,
    includesIntake: true,
    intakeCPT: '90791',
    totalFamilyPays: 499,   // intake $229 + 2×$169=$338 = $567 à la carte → $499
    alaCarteValue: 567,
    savings: 68,
    discountPct: 12,
    providerGets: 370,      // intake $150 + 2×$110=$220 → $370
    aminyKeeps: 129,
    aminyPct: 26,
    providerType: 'LCSW / LPC / Psychologist',
  },
  {
    id: 'mh-biweekly',
    serviceCategory: 'mental-health',
    name: 'Biweekly Therapy',
    tagline: 'Consistent care, every two weeks',
    description:
      'Two therapy sessions per month — the right cadence for maintenance, moderate symptoms, or families balancing busy schedules. Consistent enough to build real therapeutic progress.',
    sessionsPerMonth: 2,
    sessionCPT: '90837',
    sessionMinutes: 53,
    totalFamilyPays: 299,   // à la carte: 2 × $169 = $338
    alaCarteValue: 338,
    savings: 39,
    discountPct: 12,
    providerGets: 220,      // 2 × $110
    aminyKeeps: 79,
    aminyPct: 26,
    providerType: 'LCSW / LPC / Psychologist',
  },
  {
    id: 'mh-weekly',
    serviceCategory: 'mental-health',
    name: 'Weekly Therapy',
    tagline: 'Most impactful — recommended for active treatment',
    description:
      'Four sessions per month. Evidence-based frequency for children in active treatment for anxiety, ADHD, trauma, depression, or significant behavioral challenges. Weekly contact drives the fastest, most durable outcomes.',
    sessionsPerMonth: 4,
    sessionCPT: '90837',
    sessionMinutes: 53,
    totalFamilyPays: 569,   // à la carte: 4 × $169 = $676
    alaCarteValue: 676,
    savings: 107,
    discountPct: 16,
    providerGets: 440,      // 4 × $110
    aminyKeeps: 129,
    aminyPct: 23,
    popular: true,
    providerType: 'LCSW / LPC / Psychologist',
  },
];

/**
 * Get all care packages across all service categories.
 */
export function getAllCarePackages(): {
  aba: ABACarePackage[];
  speech: ServiceCarePackage[];
  mentalHealth: ServiceCarePackage[];
} {
  return {
    aba: ABA_CARE_PACKAGES,
    speech: SPEECH_CARE_PACKAGES,
    mentalHealth: MH_CARE_PACKAGES,
  };
}

/**
 * Get the recommended speech package based on severity/frequency goal.
 */
export function getRecommendedSpeechPackage(
  sessionsPerWeekGoal: 1 | 2,
  isNewFamily = false
): ServiceCarePackage {
  if (isNewFamily) return SPEECH_CARE_PACKAGES[0]; // Launch
  return sessionsPerWeekGoal === 1 ? SPEECH_CARE_PACKAGES[1] : SPEECH_CARE_PACKAGES[2];
}

/**
 * Get the recommended MH package based on acuity.
 */
export function getRecommendedMHPackage(
  acuity: 'new' | 'moderate' | 'active',
): ServiceCarePackage {
  if (acuity === 'new') return MH_CARE_PACKAGES[0];    // Launch
  if (acuity === 'moderate') return MH_CARE_PACKAGES[1]; // Biweekly
  return MH_CARE_PACKAGES[2];                            // Weekly
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getService(serviceId: string): CashPayService | undefined {
  return SERVICES.find((s) => s.id === serviceId);
}

function getMembershipDiscount(tier: MembershipTier): MembershipDiscount {
  return MEMBERSHIP_DISCOUNTS.find((m) => m.tier === tier) ?? MEMBERSHIP_DISCOUNTS[0];
}

function getPackageDiscount(packageSize?: number): PackageDiscount | undefined {
  if (!packageSize) return undefined;
  return [...PACKAGE_DISCOUNTS]
    .filter((p) => packageSize >= p.sessions)
    .sort((a, b) => b.sessions - a.sessions)[0];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate the price breakdown for a service given a membership tier and
 * optional package size. Membership and package discounts stack
 * (membership first, then package on the reduced price).
 */
export function getServicePrice(
  serviceId: string,
  tier: MembershipTier,
  packageSize?: number
): PriceBreakdown {
  const service = getService(serviceId);
  if (!service) {
    throw new Error(`Unknown service: ${serviceId}`);
  }

  const base = service.familyPays;
  const membership = getMembershipDiscount(tier);
  const pkg = getPackageDiscount(packageSize);

  const membershipDiscountAmt = round2(base * (membership.discountPct / 100));
  const afterMembership = round2(base - membershipDiscountAmt);

  const packageDiscountAmt = pkg ? round2(afterMembership * (pkg.discountPct / 100)) : 0;
  const finalPrice = round2(afterMembership - packageDiscountAmt);

  // Provider always gets their fixed rate; Aminy absorbs discount
  const providerGets = service.providerGets;
  const aminyKeeps = round2(finalPrice - providerGets);

  return {
    serviceId: service.id,
    serviceName: service.name,
    cptCode: service.cptCode,
    basePrice: base,
    membershipDiscount: membershipDiscountAmt,
    packageDiscount: packageDiscountAmt,
    totalDiscount: round2(membershipDiscountAmt + packageDiscountAmt),
    finalPrice,
    providerGets,
    aminyKeeps: Math.max(0, aminyKeeps),
    tier,
    packageSize,
  };
}

/**
 * Return all services, optionally filtered by category.
 */
export function getAllServices(category?: ServiceCategory): CashPayService[] {
  if (!category) return [...SERVICES];
  return SERVICES.filter((s) => s.category === category);
}

/**
 * Return package pricing options for a given service + membership tier.
 */
export function getPackageOptions(
  serviceId: string,
  tier: MembershipTier
): PackageOption[] {
  const service = getService(serviceId);
  if (!service) return [];

  return PACKAGE_DISCOUNTS.map((pkg) => {
    const breakdown = getServicePrice(serviceId, tier, pkg.sessions);
    const baseTotal = service.familyPays * pkg.sessions;
    const discountedTotal = round2(breakdown.finalPrice * pkg.sessions);
    return {
      sessions: pkg.sessions,
      label: pkg.label,
      discountPct: pkg.discountPct,
      pricePerSession: breakdown.finalPrice,
      totalPrice: discountedTotal,
      savings: round2(baseTotal - discountedTotal),
    };
  });
}

/**
 * Generate a superbill line item for out-of-network insurance reimbursement.
 */
export function generateSuperbillLine(serviceId: string): SuperbillLine {
  const service = getService(serviceId);
  if (!service) {
    throw new Error(`Unknown service: ${serviceId}`);
  }

  return {
    cptCode: service.cptCode,
    modifier: service.cptModifier,
    description: service.name,
    durationMinutes: service.durationMinutes,
    chargeAmount: service.familyPays,
    diagnosisPointer: 'A',
    placeOfService: '02', // Telehealth
  };
}

/**
 * Calculate how much a family saves by subscribing to a membership tier
 * given their expected monthly session volume.
 */
export function calculateMembershipSavings(
  tier: MembershipTier,
  sessionsPerMonth: number,
  serviceId: string
): SavingsCalculation {
  const service = getService(serviceId);
  if (!service) {
    throw new Error(`Unknown service: ${serviceId}`);
  }

  const membership = getMembershipDiscount(tier);
  const basePrice = service.familyPays;
  const discountedPrice = round2(basePrice * (1 - membership.discountPct / 100));

  const monthlyCostWithout = round2(basePrice * sessionsPerMonth);
  const monthlyCostWith = round2(discountedPrice * sessionsPerMonth + membership.monthlyPrice);
  const monthlySavings = round2(monthlyCostWithout - monthlyCostWith);

  const perSessionSavings = round2(basePrice - discountedPrice);
  const breakevenSessions =
    perSessionSavings > 0 ? Math.ceil(membership.monthlyPrice / perSessionSavings) : 0;

  return {
    tier,
    monthlyFee: membership.monthlyPrice,
    sessionsPerMonth,
    pricePerSessionBase: basePrice,
    pricePerSessionWithDiscount: discountedPrice,
    monthlyCostWithoutMembership: monthlyCostWithout,
    monthlyCostWithMembership: monthlyCostWith,
    monthlySavings,
    annualSavings: round2(monthlySavings * 12),
    breakevenSessions,
  };
}

/**
 * Get the category display label.
 */
export function getCategoryLabel(category: ServiceCategory): string {
  const labels: Record<ServiceCategory, string> = {
    aba: 'ABA Therapy',
    'mental-health': 'Mental Health',
    speech: 'Speech Therapy',
  };
  return labels[category];
}

/**
 * Get the membership tier display label.
 */
export function getTierLabel(tier: MembershipTier): string {
  return MEMBERSHIP_DISCOUNTS.find((m) => m.tier === tier)?.label ?? tier;
}

// ---------------------------------------------------------------------------
// Revenue Projections (for internal/investor use)
// ---------------------------------------------------------------------------

export interface RevenueProjection {
  scenarioName: string;
  familiesPerMonth: number;
  avgSessionsPerFamily: number;
  cashPayPct: number;
  insuredPct: number;
  avgCashPayRevenue: number;
  avgInsuredFee: number;
  subscriptionRevenue: number;
  monthlyGrossRevenue: number;
  monthlyNetToAminy: number;
  annualNetToAminy: number;
}

export function projectRevenue(
  families: number,
  sessionsPerFamily: number,
  cashPayMix: number, // 0-1
  avgSubscriptionTier: MembershipTier,
  avgServiceId = 'bcba-session'
): RevenueProjection {
  const service = getService(avgServiceId)!;
  const membership = getMembershipDiscount(avgSubscriptionTier);

  const totalSessions = families * sessionsPerFamily;
  const cashPaySessions = Math.round(totalSessions * cashPayMix);
  const insuredSessions = totalSessions - cashPaySessions;

  const avgCashPayRevenue = cashPaySessions * service.aminyKeeps;
  const avgInsuredFee = insuredSessions * service.providerGets * (INSURED_REFERRAL_FEE_PCT / 100);
  const subscriptionRevenue = families * membership.monthlyPrice;

  const monthlyGross = cashPaySessions * service.familyPays + subscriptionRevenue;
  const monthlyNet = avgCashPayRevenue + avgInsuredFee + subscriptionRevenue;

  return {
    scenarioName: `${families} families, ${sessionsPerFamily} sess/fam, ${Math.round(cashPayMix * 100)}% cash`,
    familiesPerMonth: families,
    avgSessionsPerFamily: sessionsPerFamily,
    cashPayPct: cashPayMix,
    insuredPct: 1 - cashPayMix,
    avgCashPayRevenue,
    avgInsuredFee,
    subscriptionRevenue,
    monthlyGrossRevenue: monthlyGross,
    monthlyNetToAminy: round2(monthlyNet),
    annualNetToAminy: round2(monthlyNet * 12),
  };
}
