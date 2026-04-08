// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// ai-provider-search.ts — AI-powered provider search engine with intent detection,
// urgency scoring, rail selection, and provider fit ranking for Aminy platform.
// Enhanced with Headway-level intent routing, 5-level urgency, care-path rails,
// 10-factor scoring, and payment path recommendations.

// ─── Intent Types ───────────────────────────────────────────────────

export type Intent =
  | 'find-aba'
  | 'find-speech'
  | 'find-ot'
  | 'find-psych'
  | 'find-peds'
  | 'get-eval'
  | 'crisis'
  | 'second-opinion'
  | 'change-provider'
  | 'schedule';

/** High-level parent intent category for routing */
export type IntentCategory =
  | 'diagnosis-seeking'
  | 'therapy-seeking'
  | 'crisis'
  | 'insurance-help'
  | 'second-opinion'
  | 'switching-providers';

/** Numeric urgency score 1-5 */
export type UrgencyScore = 1 | 2 | 3 | 4 | 5;

/** Care-path rail for routing */
export type CareRail =
  | 'cash-telehealth'
  | 'insured-in-network'
  | 'insured-out-of-network-superbill'
  | 'in-clinic-referral'
  | 'crisis-hotline';

export interface SearchIntent {
  query: string;
  intents: Intent[];
  category: IntentCategory;
  urgency: 'routine' | 'soon' | 'urgent' | 'crisis';
  urgencyScore: UrgencyScore;
  rail: 'telehealth' | 'in-person' | 'either';
  careRail: CareRail;
  paymentPath: 'insurance' | 'cash' | 'either';
}

export interface FitScore {
  overall: number;
  factors: Record<string, number>;
  recommendation: string;
}

/** 10-factor scoring detail */
export interface FitScoreDetailed extends FitScore {
  factorBreakdown: FitFactorBreakdown;
}

export interface FitFactorBreakdown {
  credentialMatch: number;
  specialtyMatch: number;
  ageExpertise: number;
  availability: number;
  languageMatch: number;
  insuranceCompatibility: number;
  telehealthCapability: number;
  ratingReviews: number;
  geographicProximity: number;
  culturalCompetency: number;
}

export interface ProviderProfile {
  id: string;
  name: string;
  specialties: string[];
  credentials: string[];
  acceptedInsurance: string[];
  telehealth: boolean;
  inPerson: boolean;
  languages: string[];
  ageRange?: { min: number; max: number };
  availability?: 'open' | 'waitlist' | 'full';
  waitTimeDays?: number;
  rating?: number;
  reviewCount?: number;
  location?: { lat: number; lng: number; city: string; state: string };
  cashRate?: number;
  diagnoses?: string[];
  crisisCapable?: boolean;
  culturalCompetencies?: string[];
  nextAvailableSlot?: string; // ISO date
}

/** Payment path recommendation for a family */
export interface PaymentPathRecommendation {
  recommended: CareRail;
  options: PaymentOption[];
  savingsMessage: string;
}

export interface PaymentOption {
  rail: CareRail;
  label: string;
  estimatedCost: number;
  description: string;
  pros: string[];
  cons: string[];
}

// ─── Keyword Maps ────────────────────────────────────────────────────

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  'find-aba': [
    'aba', 'applied behavior', 'behavior analyst', 'bcba', 'rbt',
    'behavior therapy', 'behavioral therapy', 'behavior intervention',
    'discrete trial', 'natural environment teaching', 'verbal behavior',
  ],
  'find-speech': [
    'speech', 'slp', 'speech-language', 'speech therapy', 'language therapy',
    'articulation', 'stuttering', 'fluency', 'apraxia', 'feeding therapy',
    'swallowing', 'augmentative communication', 'aac',
  ],
  'find-ot': [
    'occupational therapy', 'ot', 'sensory integration', 'fine motor',
    'handwriting', 'self-care skills', 'sensory processing', 'sensory diet',
    'occupational therapist',
  ],
  'find-psych': [
    'psychologist', 'psychiatrist', 'psych', 'mental health', 'counseling',
    'therapy', 'counselor', 'therapist', 'anxiety', 'depression', 'adhd',
    'medication management', 'psychiatric', 'behavioral health',
  ],
  'find-peds': [
    'pediatrician', 'pediatric', 'peds', 'developmental pediatrician',
    'dev peds', 'child doctor', 'well child', 'developmental screening',
  ],
  'get-eval': [
    'evaluation', 'eval', 'assessment', 'diagnosis', 'diagnostic',
    'testing', 'screening', 'developmental eval', 'neuropsych',
    'comprehensive eval', 'initial eval', 'reevaluation',
  ],
  'crisis': [
    'suicide', 'suicidal', 'self-harm', 'self harm', 'cutting', 'kill myself',
    'kill themselves', 'want to die', 'end my life', 'emergency', 'crisis',
    'danger', 'dangerous behavior', 'elopement', 'running away',
    'aggressive', 'hurting others', 'hurting themselves', '988', '911',
    'overdose', 'poisoning', 'not safe', 'unsafe',
  ],
  'second-opinion': [
    'second opinion', 'another opinion', 'different perspective',
    'not sure about diagnosis', 'disagree with', 'want another',
    'alternative view', 'misdiagnosed',
  ],
  'change-provider': [
    'change provider', 'switch provider', 'new provider', 'different provider',
    'not happy with', 'bad experience', 'find someone else', 'replace',
    'looking for a new', 'change therapist', 'switch therapist',
  ],
  schedule: [
    'schedule', 'appointment', 'book', 'availability', 'next available',
    'open slot', 'when can', 'set up', 'sign up', 'get started',
  ],
};

const URGENCY_CRISIS_KEYWORDS = [
  'suicide', 'suicidal', 'self-harm', 'self harm', 'kill myself',
  'kill themselves', 'want to die', 'end my life', '911', 'emergency',
  'overdose', 'not safe', 'unsafe', 'crisis', 'danger', 'hurting',
];

const URGENCY_HIGH_KEYWORDS = [
  'waitlist', 'been waiting', 'months on waitlist', 'regression', 'regressing',
  'losing skills', 'kicked out', 'expelled', 'suspended', 'school exclusion',
  'can\'t attend school', 'removed from class', 'aggressive at school',
  'getting worse fast', 'rapid decline', 'urgent',
];

const URGENCY_URGENT_KEYWORDS = [
  'asap', 'right away', 'immediately', 'today', 'can\'t wait',
  'aggressive', 'running away', 'elopement',
];

const URGENCY_MODERATE_KEYWORDS = [
  'new diagnosis', 'just diagnosed', 'recently diagnosed', 'first time',
  'never had', 'need to start', 'looking for first', 'initial',
  'just found out', 'pediatrician said', 'doctor recommended',
];

const URGENCY_SOON_KEYWORDS = [
  'soon', 'this week', 'quickly', 'need help', 'struggling',
  'getting worse', 'concerned', 'worried', 'not improving',
];

const TELEHEALTH_KEYWORDS = ['telehealth', 'virtual', 'online', 'remote', 'video', 'from home'];
const IN_PERSON_KEYWORDS = ['in-person', 'in person', 'office', 'clinic', 'face to face', 'local', 'near me', 'nearby'];

const INSURANCE_KEYWORDS = ['insurance', 'covered', 'in-network', 'in network', 'copay', 'ahcccs', 'medicaid', 'bcbs', 'blue cross', 'united', 'aetna', 'cigna', 'tricare'];
const CASH_KEYWORDS = ['cash', 'self-pay', 'self pay', 'out of pocket', 'private pay', 'no insurance'];

const INSURANCE_HELP_KEYWORDS = [
  'insurance', 'coverage', 'covered', 'copay', 'coinsurance', 'deductible',
  'out of pocket', 'superbill', 'preauthorization', 'prior auth',
  'how much', 'what does it cost', 'can i afford', 'billing',
  'claims', 'denied', 'denial', 'appeal',
];

/** Credential abbreviations mapped to service types */
const CREDENTIAL_SERVICE_MAP: Record<string, string[]> = {
  'find-aba': ['bcba', 'bcaba', 'rbt', 'lba'],
  'find-speech': ['ccc-slp', 'slp', 'cf-slp', 'slpa'],
  'find-ot': ['otr', 'otr/l', 'cota', 'ot'],
  'find-psych': ['lcsw', 'lpc', 'lmft', 'psyd', 'phd', 'md', 'do', 'pmhnp'],
  'find-peds': ['md', 'do', 'np', 'dnp'],
  'get-eval': ['psyd', 'phd', 'md', 'do', 'bcba', 'ccc-slp', 'otr'],
};

// ─── Core Functions ──────────────────────────────────────────────────

export function parseSearchIntent(query: string): SearchIntent {
  const q = query.toLowerCase().trim();

  const intents = detectIntents(q);
  const urgencyScore = detectUrgencyScore(q);
  const urgency = urgencyScoreToLevel(urgencyScore);
  const rail = detectRail(q);
  const paymentPath = detectPaymentPath(q);
  const category = classifyIntentCategory(q, intents, urgencyScore);
  const careRail = selectCareRail(category, urgencyScore, rail, paymentPath);

  // Crisis always gets added if urgency is crisis
  if (urgency === 'crisis' && !intents.includes('crisis')) {
    intents.unshift('crisis');
  }

  // Default to schedule if no specific intent detected
  if (intents.length === 0) {
    intents.push('schedule');
  }

  return { query, intents, category, urgency, urgencyScore, rail, careRail, paymentPath };
}

/** Classify the parent query into a high-level intent category */
export function classifyIntentCategory(
  q: string,
  intents: Intent[],
  urgencyScore: UrgencyScore,
): IntentCategory {
  // Crisis takes priority
  if (urgencyScore === 5 || intents.includes('crisis')) {
    return 'crisis';
  }

  // Insurance help
  const insuranceHelpScore = INSURANCE_HELP_KEYWORDS.filter(kw => q.includes(kw)).length;
  if (insuranceHelpScore >= 2) {
    return 'insurance-help';
  }

  // Second opinion
  if (intents.includes('second-opinion')) {
    return 'second-opinion';
  }

  // Switching providers
  if (intents.includes('change-provider')) {
    return 'switching-providers';
  }

  // Diagnosis seeking
  if (intents.includes('get-eval') || intents.includes('find-peds')) {
    return 'diagnosis-seeking';
  }

  // Default: therapy seeking
  return 'therapy-seeking';
}

/** Detect urgency on a 1-5 numeric scale */
export function detectUrgencyScore(query: string): UrgencyScore {
  const q = query.toLowerCase().trim();

  if (URGENCY_CRISIS_KEYWORDS.some(kw => q.includes(kw))) return 5;
  if (URGENCY_HIGH_KEYWORDS.some(kw => q.includes(kw))) return 4;
  if (URGENCY_URGENT_KEYWORDS.some(kw => q.includes(kw))) return 4;
  if (URGENCY_MODERATE_KEYWORDS.some(kw => q.includes(kw))) return 3;
  if (URGENCY_SOON_KEYWORDS.some(kw => q.includes(kw))) return 2;

  return 1;
}

function urgencyScoreToLevel(score: UrgencyScore): 'routine' | 'soon' | 'urgent' | 'crisis' {
  switch (score) {
    case 5: return 'crisis';
    case 4: return 'urgent';
    case 3: return 'soon';
    case 2: return 'soon';
    case 1: return 'routine';
  }
}

/** Backward-compatible urgency detection */
export function detectUrgency(query: string): 'routine' | 'soon' | 'urgent' | 'crisis' {
  return urgencyScoreToLevel(detectUrgencyScore(query));
}

/** Select the optimal care-path rail */
export function selectCareRail(
  category: IntentCategory,
  urgencyScore: UrgencyScore,
  rail: 'telehealth' | 'in-person' | 'either',
  paymentPath: 'insurance' | 'cash' | 'either',
): CareRail {
  // Crisis always goes to hotline
  if (urgencyScore === 5 || category === 'crisis') {
    return 'crisis-hotline';
  }

  // Cash-pay telehealth is fastest for urgent + no insurance preference
  if (urgencyScore >= 4 && paymentPath !== 'insurance' && rail !== 'in-person') {
    return 'cash-telehealth';
  }

  // If they specifically want in-person, route to in-clinic
  if (rail === 'in-person') {
    if (paymentPath === 'insurance') return 'insured-in-network';
    return 'in-clinic-referral';
  }

  // Insurance path selection
  if (paymentPath === 'insurance') {
    return 'insured-in-network';
  }

  if (paymentPath === 'cash') {
    return 'cash-telehealth';
  }

  // "Either" payment — recommend based on urgency
  if (urgencyScore >= 3) {
    return 'cash-telehealth'; // fastest
  }

  return 'insured-in-network'; // cheapest for family
}

function detectIntents(q: string): Intent[] {
  const matched: Intent[] = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => {
      if (q.includes(kw)) return acc + 1;
      return acc;
    }, 0);
    if (score > 0) {
      matched.push(intent as Intent);
    }
  }

  // Sort by match strength (more keyword hits = higher priority)
  matched.sort((a, b) => {
    const scoreA = INTENT_KEYWORDS[a].filter(kw => q.includes(kw)).length;
    const scoreB = INTENT_KEYWORDS[b].filter(kw => q.includes(kw)).length;
    return scoreB - scoreA;
  });

  return matched;
}

function detectRail(q: string): 'telehealth' | 'in-person' | 'either' {
  const wantsTelehealth = TELEHEALTH_KEYWORDS.some(kw => q.includes(kw));
  const wantsInPerson = IN_PERSON_KEYWORDS.some(kw => q.includes(kw));

  if (wantsTelehealth && !wantsInPerson) return 'telehealth';
  if (wantsInPerson && !wantsTelehealth) return 'in-person';
  return 'either';
}

function detectPaymentPath(q: string): 'insurance' | 'cash' | 'either' {
  const wantsInsurance = INSURANCE_KEYWORDS.some(kw => q.includes(kw));
  const wantsCash = CASH_KEYWORDS.some(kw => q.includes(kw));

  if (wantsInsurance && !wantsCash) return 'insurance';
  if (wantsCash && !wantsInsurance) return 'cash';
  return 'either';
}

// ─── Provider Scoring (Enhanced 10-Factor) ──────────────────────────

export function scoreProviderFit(
  provider: ProviderProfile,
  intent: SearchIntent,
  childProfile?: { age?: number; diagnoses?: string[]; insurance?: string; language?: string; lat?: number; lng?: number }
): FitScore {
  const factors: Record<string, number> = {};

  // 1. Credential match (0-10)
  factors.credentialMatch = scoreCredentialMatch(provider, intent);

  // 2. Specialty match (0-15)
  factors.specialtyMatch = scoreSpecialtyMatch(provider, intent);

  // 3. Age expertise (0-10)
  factors.ageExpertise = scoreAgeExpertise(provider, childProfile);

  // 4. Availability (0-15)
  factors.availability = scoreAvailability(provider, intent);

  // 5. Language match (0-5)
  factors.languageMatch = scoreLanguageMatch(provider, childProfile);

  // 6. Insurance compatibility (0-15)
  factors.insuranceCompatibility = scorePaymentMatch(provider, intent, childProfile);

  // 7. Telehealth capability (0-10)
  factors.telehealthCapability = scoreTelehealthCapability(provider, intent);

  // 8. Rating/reviews (0-8)
  factors.ratingReviews = scoreQuality(provider);

  // 9. Geographic proximity (0-7)
  factors.geographicProximity = scoreGeographicProximity(provider, childProfile);

  // 10. Cultural competency (0-5)
  factors.culturalCompetency = scoreCulturalCompetency(provider, childProfile);

  const overall = Object.values(factors).reduce((sum, v) => sum + v, 0);
  const recommendation = generateRecommendation(provider, intent, factors, overall);

  return { overall, factors, recommendation };
}

function scoreCredentialMatch(provider: ProviderProfile, intent: SearchIntent): number {
  const provCreds = provider.credentials.map(c => c.toLowerCase());

  for (const intentType of intent.intents) {
    const expectedCreds = CREDENTIAL_SERVICE_MAP[intentType];
    if (!expectedCreds) continue;

    const matched = expectedCreds.some(ec =>
      provCreds.some(pc => pc.includes(ec) || ec.includes(pc))
    );
    if (matched) return 10;
  }

  // Partial credit if they have any relevant credentials
  if (provCreds.length > 0) return 3;
  return 0;
}

function scoreSpecialtyMatch(provider: ProviderProfile, intent: SearchIntent): number {
  const specialtyMap: Record<string, string[]> = {
    'find-aba': ['aba', 'bcba', 'rbt', 'behavior analysis', 'applied behavior analysis'],
    'find-speech': ['speech', 'slp', 'speech-language pathology', 'speech therapy'],
    'find-ot': ['occupational therapy', 'ot', 'sensory integration'],
    'find-psych': ['psychology', 'psychiatry', 'mental health', 'counseling'],
    'find-peds': ['pediatrics', 'developmental pediatrics'],
    'get-eval': ['evaluation', 'assessment', 'diagnostic', 'neuropsychology'],
    crisis: ['crisis intervention', 'emergency', 'behavioral crisis'],
    'second-opinion': [],
    'change-provider': [],
    schedule: [],
  };

  let maxScore = 0;
  for (const intentType of intent.intents) {
    const targetSpecialties = specialtyMap[intentType] ?? [];
    if (targetSpecialties.length === 0) continue;

    const provSpecs = provider.specialties.map(s => s.toLowerCase());
    const matchCount = targetSpecialties.filter(ts =>
      provSpecs.some(ps => ps.includes(ts) || ts.includes(ps))
    ).length;

    const score = targetSpecialties.length > 0
      ? (matchCount / targetSpecialties.length) * 15
      : 0;
    maxScore = Math.max(maxScore, score);
  }

  return Math.round(maxScore);
}

function scoreAgeExpertise(
  provider: ProviderProfile,
  childProfile?: { age?: number },
): number {
  if (!childProfile?.age || !provider.ageRange) return 5; // neutral

  const { age } = childProfile;
  const { min, max } = provider.ageRange;

  // Perfect match — within range
  if (age >= min && age <= max) {
    // Bonus for early intervention specialists when child is 0-3
    if (age <= 3 && min === 0) return 10;
    return 8;
  }

  // Close miss (within 2 years of range boundary)
  const distance = age < min ? min - age : age - max;
  if (distance <= 2) return 4;

  return 1; // far out of range
}

function scoreAvailability(provider: ProviderProfile, intent: SearchIntent): number {
  if (provider.availability === 'full') return 0;
  if (provider.availability === 'waitlist') {
    if (intent.urgency === 'crisis' || intent.urgency === 'urgent') return 2;
    return 6;
  }

  // Open availability
  let score = 10;
  if (provider.waitTimeDays !== undefined) {
    if (provider.waitTimeDays <= 2) score = 15; // within 48hrs = bonus
    else if (provider.waitTimeDays <= 7) score = 13;
    else if (provider.waitTimeDays <= 14) score = 10;
    else if (provider.waitTimeDays <= 30) score = 7;
    else score = 4;
  }

  // Urgency bonus for fast availability
  if (intent.urgency === 'crisis' && provider.crisisCapable) score = 15;

  return score;
}

function scoreLanguageMatch(
  provider: ProviderProfile,
  childProfile?: { language?: string },
): number {
  if (!childProfile?.language) return 3; // neutral

  const lang = childProfile.language.toLowerCase();
  if (provider.languages.some(l => l.toLowerCase() === lang)) return 5;
  if (provider.languages.some(l => l.toLowerCase() === 'english') && lang === 'english') return 5;

  return 0;
}

function scorePaymentMatch(
  provider: ProviderProfile,
  intent: SearchIntent,
  childProfile?: { insurance?: string }
): number {
  if (intent.paymentPath === 'cash') {
    return provider.cashRate !== undefined ? 15 : 5;
  }

  if (intent.paymentPath === 'insurance' || childProfile?.insurance) {
    const targetIns = childProfile?.insurance?.toLowerCase() ?? '';
    const accepted = provider.acceptedInsurance.map(i => i.toLowerCase());

    if (targetIns && accepted.some(a => a.includes(targetIns) || targetIns.includes(a))) {
      return 15;
    }
    if (accepted.length > 0) return 8;
    return 0;
  }

  return provider.acceptedInsurance.length > 0 || provider.cashRate !== undefined ? 10 : 5;
}

function scoreTelehealthCapability(provider: ProviderProfile, intent: SearchIntent): number {
  if (intent.careRail === 'cash-telehealth' || intent.rail === 'telehealth') {
    return provider.telehealth ? 10 : 0;
  }
  if (intent.rail === 'in-person') {
    return provider.inPerson ? 10 : 0;
  }
  // "Either" — both options is best
  if (provider.telehealth && provider.inPerson) return 10;
  if (provider.telehealth || provider.inPerson) return 7;
  return 0;
}

function scoreQuality(provider: ProviderProfile): number {
  let score = 4;
  if (provider.rating !== undefined) {
    if (provider.rating >= 4.8) score = 8;
    else if (provider.rating >= 4.5) score = 7;
    else if (provider.rating >= 4.0) score = 5;
    else if (provider.rating >= 3.5) score = 3;
    else score = 1;
  }
  if (provider.reviewCount !== undefined && provider.reviewCount > 20) score = Math.min(8, score + 1);
  return score;
}

function scoreGeographicProximity(
  provider: ProviderProfile,
  childProfile?: { lat?: number; lng?: number },
): number {
  // If telehealth-only search, proximity doesn't matter much
  if (!childProfile?.lat || !childProfile?.lng || !provider.location) return 3;

  const distKm = haversineDistance(
    childProfile.lat, childProfile.lng,
    provider.location.lat, provider.location.lng,
  );

  if (distKm <= 5) return 7;
  if (distKm <= 15) return 6;
  if (distKm <= 30) return 5;
  if (distKm <= 50) return 3;
  if (distKm <= 100) return 2;
  return 1;
}

function scoreCulturalCompetency(
  provider: ProviderProfile,
  childProfile?: { language?: string },
): number {
  if (!provider.culturalCompetencies || provider.culturalCompetencies.length === 0) return 2;

  let score = 3; // base for having any flags
  if (provider.culturalCompetencies.length >= 3) score = 4;
  // Bonus if their cultural competencies include the child's language/culture
  if (childProfile?.language) {
    const lang = childProfile.language.toLowerCase();
    if (provider.culturalCompetencies.some(c => c.toLowerCase().includes(lang))) {
      score = 5;
    }
  }
  return score;
}

/** Haversine distance between two lat/lng points in km */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateRecommendation(
  provider: ProviderProfile,
  intent: SearchIntent,
  factors: Record<string, number>,
  overall: number
): string {
  if (intent.urgency === 'crisis') {
    if (provider.crisisCapable) {
      return `CRISIS: ${provider.name} is crisis-capable. Contact immediately. If in immediate danger, call 988 (Suicide & Crisis Lifeline) or 911.`;
    }
    return 'CRISIS: This provider may not handle crisis situations. Please call 988 or 911 for immediate help.';
  }

  if (overall >= 80) return `Excellent match. ${provider.name} closely fits your needs across specialty, availability, and preferences.`;
  if (overall >= 60) return `Strong match. ${provider.name} is a good fit with some considerations.`;
  if (overall >= 40) return `Moderate match. ${provider.name} partially meets your criteria.`;
  if (overall >= 20) return `Limited match. ${provider.name} may not fully align with your needs but could be worth considering.`;
  return `Low match. Consider exploring other options that better fit your requirements.`;
}

// ─── Payment Path Recommendation ────────────────────────────────────

/** Average session rates by service type for Arizona market */
const AVERAGE_RATES: Record<string, { cash: number; insuredCopay: number; insuredOON: number }> = {
  'find-aba': { cash: 65, insuredCopay: 25, insuredOON: 45 },
  'find-speech': { cash: 150, insuredCopay: 35, insuredOON: 100 },
  'find-ot': { cash: 150, insuredCopay: 35, insuredOON: 100 },
  'find-psych': { cash: 175, insuredCopay: 30, insuredOON: 120 },
  'find-peds': { cash: 200, insuredCopay: 40, insuredOON: 140 },
  'get-eval': { cash: 1500, insuredCopay: 200, insuredOON: 800 },
  default: { cash: 150, insuredCopay: 30, insuredOON: 100 },
};

const MEMBERSHIP_DISCOUNT = 0.15; // 15% Aminy membership discount on cash-pay

export function recommendPaymentPath(
  intent: SearchIntent,
  hasInsurance: boolean,
  insuranceName?: string,
): PaymentPathRecommendation {
  const serviceType = intent.intents[0] || 'default';
  const rates = AVERAGE_RATES[serviceType] || AVERAGE_RATES['default'];

  const cashWithDiscount = Math.round(rates.cash * (1 - MEMBERSHIP_DISCOUNT));

  const options: PaymentOption[] = [];

  // Cash-pay telehealth
  options.push({
    rail: 'cash-telehealth',
    label: 'Cash-Pay Telehealth',
    estimatedCost: cashWithDiscount,
    description: `$${cashWithDiscount}/session with Aminy membership (${Math.round(MEMBERSHIP_DISCOUNT * 100)}% off). Available in any state via telehealth.`,
    pros: ['Fastest access (often within 48hrs)', 'No auth required', 'Any licensed provider nationwide', 'Simple billing'],
    cons: ['Higher per-session cost', 'Not applied to deductible', 'No insurance EOB'],
  });

  // In-network insured
  if (hasInsurance) {
    options.push({
      rail: 'insured-in-network',
      label: `In-Network (${insuranceName || 'Your Plan'})`,
      estimatedCost: rates.insuredCopay,
      description: `Est. $${rates.insuredCopay}/session copay. Applies to deductible and out-of-pocket max.`,
      pros: ['Lowest cost per session', 'Counts toward deductible/OOP max', 'Insurance protections apply'],
      cons: ['Limited to in-network providers', 'May require prior auth', 'Longer wait times', 'May need referral'],
    });
  }

  // Out-of-network with superbill
  if (hasInsurance) {
    options.push({
      rail: 'insured-out-of-network-superbill',
      label: 'Out-of-Network + Superbill',
      estimatedCost: rates.insuredOON,
      description: `Pay $${rates.cash} upfront, get ~$${rates.cash - rates.insuredOON} back via superbill reimbursement.`,
      pros: ['Access to any provider', 'Still get partial reimbursement', 'Faster than in-network waitlists', 'Counts toward OON deductible'],
      cons: ['Higher upfront cost', 'Reimbursement takes 2-6 weeks', 'OON deductible may be high'],
    });
  }

  // In-clinic referral
  options.push({
    rail: 'in-clinic-referral',
    label: 'In-Clinic Referral',
    estimatedCost: hasInsurance ? rates.insuredCopay : rates.cash,
    description: 'In-person sessions at a local clinic. Best for children who need hands-on assessment or are not suited for telehealth.',
    pros: ['Hands-on assessment possible', 'Better for young children (under 3)', 'Relationship building', 'Access to clinic resources'],
    cons: ['Geographic limitations', 'Travel time', 'May have longer wait'],
  });

  // Determine recommendation
  let recommended: CareRail;
  let savingsMessage: string;

  if (intent.urgencyScore >= 4 && !hasInsurance) {
    recommended = 'cash-telehealth';
    savingsMessage = `Save $${rates.cash - cashWithDiscount}/session with your Aminy membership. Get seen within 48 hours.`;
  } else if (hasInsurance && intent.urgencyScore <= 2) {
    recommended = 'insured-in-network';
    const savings = cashWithDiscount - rates.insuredCopay;
    savingsMessage = `You save ~$${savings}/session using your ${insuranceName || 'insurance'} vs. cash-pay.`;
  } else if (hasInsurance && intent.urgencyScore >= 3) {
    recommended = 'insured-out-of-network-superbill';
    savingsMessage = `Get seen faster with out-of-network providers. Submit a superbill to get ~$${rates.cash - rates.insuredOON} back per session.`;
  } else {
    recommended = 'cash-telehealth';
    savingsMessage = `Save $${rates.cash - cashWithDiscount}/session with your Aminy membership discount.`;
  }

  return { recommended, options, savingsMessage };
}

// ─── Ranking ─────────────────────────────────────────────────────────

export function rankProviders(
  providers: ProviderProfile[],
  intent: SearchIntent,
  childProfile?: { age?: number; diagnoses?: string[]; insurance?: string; language?: string; lat?: number; lng?: number }
): Array<ProviderProfile & { fitScore: FitScore }> {
  // Crisis: always return crisis resources first
  if (intent.urgency === 'crisis') {
    const crisisProviders = providers.filter(p => p.crisisCapable);
    const others = providers.filter(p => !p.crisisCapable);

    const scoredCrisis = crisisProviders.map(p => ({
      ...p,
      fitScore: scoreProviderFit(p, intent, childProfile),
    }));

    const scoredOthers = others.map(p => ({
      ...p,
      fitScore: scoreProviderFit(p, intent, childProfile),
    }));

    scoredCrisis.sort((a, b) => b.fitScore.overall - a.fitScore.overall);
    scoredOthers.sort((a, b) => b.fitScore.overall - a.fitScore.overall);

    return [...scoredCrisis, ...scoredOthers];
  }

  const scored = providers.map(p => ({
    ...p,
    fitScore: scoreProviderFit(p, intent, childProfile),
  }));

  scored.sort((a, b) => b.fitScore.overall - a.fitScore.overall);

  return scored;
}

// ─── Crisis Detection Helper ─────────────────────────────────────────

export interface CrisisResponse {
  isCrisis: boolean;
  hotline: string;
  message: string;
  resources: Array<{ name: string; number: string; description: string }>;
}

export function detectCrisis(query: string): CrisisResponse | null {
  const q = query.toLowerCase();
  const isCrisis = URGENCY_CRISIS_KEYWORDS.some(kw => q.includes(kw));

  if (!isCrisis) return null;

  return {
    isCrisis: true,
    hotline: '988',
    message:
      'If you or someone you know is in immediate danger, please call 911. For crisis support, call or text 988 (Suicide & Crisis Lifeline).',
    resources: [
      {
        name: 'Suicide & Crisis Lifeline',
        number: '988',
        description: 'Call or text 24/7 for crisis support',
      },
      {
        name: 'Crisis Text Line',
        number: 'Text HOME to 741741',
        description: 'Free 24/7 crisis counseling via text',
      },
      {
        name: 'Emergency Services',
        number: '911',
        description: 'For immediate life-threatening situations',
      },
      {
        name: 'Arizona Crisis Line',
        number: '1-844-534-4673',
        description: 'Solari Crisis & Human Services — Arizona-specific crisis support',
      },
    ],
  };
}
