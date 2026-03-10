/**
 * Clinical Screening Instruments
 *
 * Validated, free-to-use screening tools for pediatric concerns.
 * These are SCREENINGS, not diagnoses — results indicate risk level
 * and recommend next steps (professional evaluation).
 *
 * All instruments here are public domain or free for clinical use.
 *
 * Pre-signup: results stored in localStorage
 * Post-signup: migrated to Supabase + MemoryFacts
 */

import { syncEncryptedStorage } from './security/encrypted-storage';

// ============================================
// TYPES
// ============================================

export type ScreeningType = 'mchat' | 'vanderbilt' | 'scared' | 'phq-a' | 'psc' | 'csbs';

export type RiskLevel = 'low' | 'moderate' | 'high';

export interface ScreeningQuestion {
  id: string;
  text: string;
  /** For parent-friendly context */
  helpText?: string;
  /** Some instruments have reverse-scored items */
  reverseScored?: boolean;
}

export interface ScreeningResult {
  instrumentId: ScreeningType;
  instrumentName: string;
  completedAt: string;
  childAgeMonths?: number;
  answers: Record<string, boolean | number>;
  totalScore: number;
  riskLevel: RiskLevel;
  /** Plain-language explanation */
  summary: string;
  /** What to do next */
  nextSteps: string[];
  /** Provider types that can evaluate */
  recommendedProviders: string[];
}

export interface ScreeningInstrument {
  id: ScreeningType;
  name: string;
  shortName: string;
  description: string;
  /** What concern it screens for */
  screenFor: string;
  /** Age range in months */
  ageRange: { min: number; max: number };
  /** How long it takes */
  estimatedMinutes: number;
  questions: ScreeningQuestion[];
  /** Scoring function */
  score: (answers: Record<string, boolean>) => { total: number; risk: RiskLevel };
  /** Result interpretation */
  interpret: (score: number, risk: RiskLevel) => { summary: string; nextSteps: string[]; providers: string[] };
}

// ============================================
// M-CHAT-R/F (Modified Checklist for Autism in Toddlers)
// Ages 16-30 months, 20 yes/no questions
// ============================================

const MCHAT_QUESTIONS: ScreeningQuestion[] = [
  { id: 'q1', text: 'If you point at something across the room, does your child look at it?', helpText: 'For example, if you point at a toy or an animal, does your child look at the toy or animal?' },
  { id: 'q2', text: 'Have you ever wondered if your child might be deaf?' },
  { id: 'q3', text: 'Does your child play pretend or make-believe?', helpText: 'For example, pretend to drink from an empty cup, pretend to talk on a phone, or pretend to feed a doll or stuffed animal?' },
  { id: 'q4', text: 'Does your child like climbing on things?', helpText: 'For example, furniture, playground equipment, or stairs' },
  { id: 'q5', text: 'Does your child make unusual finger movements near their eyes?', helpText: 'For example, does your child wiggle their fingers close to their eyes?' },
  { id: 'q6', text: 'Does your child point with one finger to ask for something or to get help?', helpText: 'For example, pointing to a snack or toy that is out of reach' },
  { id: 'q7', text: 'Does your child point with one finger to show you something interesting?', helpText: 'For example, pointing to an airplane in the sky or a big truck in the road' },
  { id: 'q8', text: 'Is your child interested in other children?', helpText: 'For example, does your child watch other children, smile at them, or go to them?' },
  { id: 'q9', text: 'Does your child show you things by bringing them to you or holding them up for you to see?', helpText: 'Not to get help, but just to share?' },
  { id: 'q10', text: 'Does your child respond when you call their name?', helpText: 'For example, does your child look up, talk or babble, or stop what they are doing when you call their name?' },
  { id: 'q11', text: 'When you smile at your child, does your child smile back at you?' },
  { id: 'q12', text: 'Does your child get upset by everyday noises?', helpText: 'For example, does your child scream or cry to noise such as a vacuum cleaner or loud music?' },
  { id: 'q13', text: 'Does your child walk?' },
  { id: 'q14', text: 'Does your child look you in the eye when you are talking to them, playing with them, or dressing them?' },
  { id: 'q15', text: 'Does your child try to copy what you do?', helpText: 'For example, wave bye-bye, clap, or make a funny noise when you do' },
  { id: 'q16', text: 'If you turn your head to look at something, does your child look around to see what you are looking at?' },
  { id: 'q17', text: 'Does your child try to get you to watch them?', helpText: 'For example, does your child look at you for praise, or say "look" or "watch me"?' },
  { id: 'q18', text: 'Does your child understand when you tell them to do something?', helpText: 'For example, if you don\'t point, can your child understand "put the book on the chair" or "bring me the blanket"?' },
  { id: 'q19', text: 'If something new happens, does your child look at your face to see how you feel about it?', helpText: 'For example, if they hear a strange or funny noise, or see a new toy, will they look at your face?' },
  { id: 'q20', text: 'Does your child like movement activities?', helpText: 'For example, being swung or bounced on your knee' },
];

// Items where "Yes" = pass (no risk), "No" = fail (risk)
// Items 2, 5, 12 are reverse-scored (Yes = fail)
const MCHAT_REVERSE_ITEMS = ['q2', 'q5', 'q12'];

function scoreMchat(answers: Record<string, boolean>): { total: number; risk: RiskLevel } {
  let failCount = 0;

  for (const q of MCHAT_QUESTIONS) {
    const answer = answers[q.id];
    if (answer === undefined) continue;

    const isReverse = MCHAT_REVERSE_ITEMS.includes(q.id);
    // For most items: No = fail. For reverse items: Yes = fail.
    const failed = isReverse ? answer === true : answer === false;
    if (failed) failCount++;
  }

  const risk: RiskLevel =
    failCount >= 8 ? 'high' :
    failCount >= 3 ? 'moderate' :
    'low';

  return { total: failCount, risk };
}

function interpretMchat(score: number, risk: RiskLevel) {
  if (risk === 'low') {
    return {
      summary: `Your child scored in the low-risk range (${score}/20 flagged items). This suggests typical development for this age, though every child develops differently.`,
      nextSteps: [
        'Continue monitoring developmental milestones',
        'Bring up any new concerns at your next pediatric visit',
        'Re-screen at 24 months if your child is under 24 months',
      ],
      providers: ['Pediatrician'],
    };
  }
  if (risk === 'moderate') {
    return {
      summary: `Your child scored in the moderate-risk range (${score}/20 flagged items). This doesn't mean your child has autism — it means a professional evaluation is recommended to understand your child's development better.`,
      nextSteps: [
        'Schedule a developmental evaluation with a specialist',
        'Talk to your pediatrician about a referral',
        'Early intervention services can start even before a diagnosis',
        'Save these results to share with your provider',
      ],
      providers: ['Developmental Pediatrician', 'Child Psychologist', 'BCBA'],
    };
  }
  return {
    summary: `Your child scored in the high-risk range (${score}/20 flagged items). This indicates a comprehensive developmental evaluation is strongly recommended. Many children in this range benefit significantly from early intervention — the earlier, the better.`,
    nextSteps: [
      'Request a comprehensive developmental evaluation as soon as possible',
      'Contact your state\'s Early Intervention program (free, ages 0-3)',
      'Ask your pediatrician for a referral to a developmental specialist',
      'Early intervention can make a significant difference — don\'t wait',
      'Save these results to bring to your evaluation',
    ],
    providers: ['Developmental Pediatrician', 'Child Psychologist', 'BCBA', 'Speech-Language Pathologist'],
  };
}

// ============================================
// PSC (Pediatric Symptom Checklist) — General behavioral screening
// Ages 4-16, 35 items, 3-point scale
// ============================================

const PSC_QUESTIONS: ScreeningQuestion[] = [
  { id: 'psc1', text: 'Complains of aches and pains' },
  { id: 'psc2', text: 'Spends more time alone' },
  { id: 'psc3', text: 'Tires easily, has little energy' },
  { id: 'psc4', text: 'Fidgety, unable to sit still' },
  { id: 'psc5', text: 'Has trouble with a teacher' },
  { id: 'psc6', text: 'Less interested in school' },
  { id: 'psc7', text: 'Acts as if driven by a motor' },
  { id: 'psc8', text: 'Daydreams too much' },
  { id: 'psc9', text: 'Distracted easily' },
  { id: 'psc10', text: 'Is afraid of new situations' },
  { id: 'psc11', text: 'Feels sad, unhappy' },
  { id: 'psc12', text: 'Is irritable, angry' },
  { id: 'psc13', text: 'Feels hopeless' },
  { id: 'psc14', text: 'Has trouble concentrating' },
  { id: 'psc15', text: 'Less interested in friends' },
  { id: 'psc16', text: 'Fights with other children' },
  { id: 'psc17', text: 'Absent from school' },
  { id: 'psc18', text: 'School grades dropping' },
  { id: 'psc19', text: 'Is down on self' },
  { id: 'psc20', text: 'Visits doctor with doctor finding nothing wrong' },
  { id: 'psc21', text: 'Has trouble sleeping' },
  { id: 'psc22', text: 'Worries a lot' },
  { id: 'psc23', text: 'Wants to be with you more than before' },
  { id: 'psc24', text: 'Feels like they are bad' },
  { id: 'psc25', text: 'Takes unnecessary risks' },
  { id: 'psc26', text: 'Gets hurt frequently' },
  { id: 'psc27', text: 'Seems to be having less fun' },
  { id: 'psc28', text: 'Acts younger than children their age' },
  { id: 'psc29', text: 'Does not listen to rules' },
  { id: 'psc30', text: 'Does not show feelings' },
  { id: 'psc31', text: 'Does not understand other people\'s feelings' },
  { id: 'psc32', text: 'Teases others' },
  { id: 'psc33', text: 'Blames others for their troubles' },
  { id: 'psc34', text: 'Takes things that do not belong to them' },
  { id: 'psc35', text: 'Refuses to share' },
];

function scorePsc(answers: Record<string, boolean>): { total: number; risk: RiskLevel } {
  // PSC uses 0/1/2 scoring (Never/Sometimes/Often) but simplified to boolean for MVP
  // Boolean: true = "Sometimes/Often" (score 1), false = "Never" (score 0)
  let total = 0;
  for (const q of PSC_QUESTIONS) {
    if (answers[q.id] === true) total++;
  }

  const risk: RiskLevel =
    total >= 28 ? 'high' :
    total >= 20 ? 'moderate' :
    'low';

  return { total, risk };
}

function interpretPsc(score: number, risk: RiskLevel) {
  if (risk === 'low') {
    return {
      summary: `Your child scored ${score}/35 on the behavioral screening, which is in the typical range. No significant behavioral concerns were identified.`,
      nextSteps: [
        'Continue supporting your child\'s emotional development',
        'Discuss any specific concerns at your next pediatric visit',
      ],
      providers: ['Pediatrician'],
    };
  }
  if (risk === 'moderate') {
    return {
      summary: `Your child scored ${score}/35, which suggests some behavioral concerns that may benefit from professional attention. This is not a diagnosis — it's an indication that talking to a professional could help.`,
      nextSteps: [
        'Discuss these results with your child\'s pediatrician',
        'Consider a behavioral health consultation',
        'School counselor may also be a resource',
      ],
      providers: ['Pediatrician', 'Child Psychologist', 'Licensed Counselor'],
    };
  }
  return {
    summary: `Your child scored ${score}/35, which is above the clinical threshold for behavioral concerns. A professional evaluation is recommended to understand what your child may need.`,
    nextSteps: [
      'Schedule an evaluation with a behavioral health professional',
      'Talk to your pediatrician about a referral',
      'Consider reaching out to your school\'s support services',
      'Save these results to share with providers',
    ],
    providers: ['Child Psychologist', 'BCBA', 'Licensed Counselor', 'Developmental Pediatrician'],
  };
}

// ============================================
// INSTRUMENT REGISTRY
// ============================================

export const SCREENING_INSTRUMENTS: Record<ScreeningType, ScreeningInstrument> = {
  mchat: {
    id: 'mchat',
    name: 'M-CHAT-R/F',
    shortName: 'Autism Screening',
    description: 'Modified Checklist for Autism in Toddlers — a validated screening for autism spectrum disorder risk in young children.',
    screenFor: 'Autism Spectrum Disorder',
    ageRange: { min: 16, max: 30 },
    estimatedMinutes: 5,
    questions: MCHAT_QUESTIONS,
    score: scoreMchat,
    interpret: interpretMchat,
  },
  psc: {
    id: 'psc',
    name: 'PSC-35',
    shortName: 'Behavioral Screening',
    description: 'Pediatric Symptom Checklist — screens for behavioral, emotional, and social concerns in children.',
    screenFor: 'Behavioral & Emotional Concerns',
    ageRange: { min: 48, max: 192 },
    estimatedMinutes: 10,
    questions: PSC_QUESTIONS,
    score: scorePsc,
    interpret: interpretPsc,
  },
  // Stubs for future instruments
  vanderbilt: {
    id: 'vanderbilt',
    name: 'Vanderbilt Assessment',
    shortName: 'ADHD Screening',
    description: 'Screens for ADHD symptoms including inattention, hyperactivity, and impulsivity.',
    screenFor: 'ADHD',
    ageRange: { min: 72, max: 144 },
    estimatedMinutes: 10,
    questions: [],
    score: () => ({ total: 0, risk: 'low' as RiskLevel }),
    interpret: () => ({ summary: 'Coming soon', nextSteps: [], providers: [] }),
  },
  scared: {
    id: 'scared',
    name: 'SCARED',
    shortName: 'Anxiety Screening',
    description: 'Screen for Child Anxiety Related Disorders — identifies anxiety disorders in children and adolescents.',
    screenFor: 'Anxiety Disorders',
    ageRange: { min: 96, max: 216 },
    estimatedMinutes: 10,
    questions: [],
    score: () => ({ total: 0, risk: 'low' as RiskLevel }),
    interpret: () => ({ summary: 'Coming soon', nextSteps: [], providers: [] }),
  },
  'phq-a': {
    id: 'phq-a',
    name: 'PHQ-A',
    shortName: 'Depression Screening',
    description: 'Patient Health Questionnaire for Adolescents — screens for depression in teens.',
    screenFor: 'Depression',
    ageRange: { min: 132, max: 204 },
    estimatedMinutes: 5,
    questions: [],
    score: () => ({ total: 0, risk: 'low' as RiskLevel }),
    interpret: () => ({ summary: 'Coming soon', nextSteps: [], providers: [] }),
  },
  csbs: {
    id: 'csbs',
    name: 'CSBS DP',
    shortName: 'Communication Screening',
    description: 'Communication and Symbolic Behavior Scales — screens for speech and communication delays.',
    screenFor: 'Speech & Communication Delays',
    ageRange: { min: 6, max: 24 },
    estimatedMinutes: 5,
    questions: [],
    score: () => ({ total: 0, risk: 'low' as RiskLevel }),
    interpret: () => ({ summary: 'Coming soon', nextSteps: [], providers: [] }),
  },
};

// ============================================
// CONCERN → SCREENER ROUTING
// ============================================

export interface ConcernRoute {
  concern: string;
  keywords: string[];
  recommendedScreeners: ScreeningType[];
  urgencyNote?: string;
}

export const CONCERN_ROUTES: ConcernRoute[] = [
  {
    concern: 'Autism / ASD',
    keywords: ['autism', 'asd', 'spectrum', 'eye contact', 'not talking', 'not pointing', 'not responding to name', 'delayed speech'],
    recommendedScreeners: ['mchat', 'csbs'],
    urgencyNote: 'Early screening leads to earlier intervention — which makes a real difference.',
  },
  {
    concern: 'ADHD / Attention',
    keywords: ['adhd', 'attention', 'hyperactive', 'can\'t sit still', 'focus', 'impulsive', 'fidgety', 'distracted'],
    recommendedScreeners: ['vanderbilt', 'psc'],
  },
  {
    concern: 'Anxiety',
    keywords: ['anxiety', 'worried', 'anxious', 'scared', 'fears', 'nervous', 'panic', 'separation'],
    recommendedScreeners: ['scared', 'psc'],
  },
  {
    concern: 'Depression / Mood',
    keywords: ['depression', 'depressed', 'sad', 'hopeless', 'withdrawn', 'mood', 'self-harm', 'not eating'],
    recommendedScreeners: ['phq-a', 'psc'],
    urgencyNote: 'If your child is in immediate danger, call 988 (Suicide & Crisis Lifeline) or 911.',
  },
  {
    concern: 'Speech / Communication',
    keywords: ['speech', 'talking', 'words', 'language', 'communication', 'babbling', 'stuttering', 'not speaking'],
    recommendedScreeners: ['csbs', 'mchat'],
  },
  {
    concern: 'Behavioral Concerns',
    keywords: ['behavior', 'meltdown', 'aggression', 'tantrum', 'defiant', 'oppositional', 'hitting', 'biting'],
    recommendedScreeners: ['psc'],
  },
];

/**
 * Find the best screener based on a parent's concern text
 */
export function routeConcernToScreener(concernText: string): ConcernRoute | null {
  const lower = concernText.toLowerCase();
  let bestMatch: ConcernRoute | null = null;
  let bestScore = 0;

  for (const route of CONCERN_ROUTES) {
    const matchCount = route.keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = route;
    }
  }

  return bestMatch;
}

// ============================================
// LOCAL STORAGE (pre-signup persistence)
// ============================================

const SCREENING_STORAGE_KEY = 'aminy-screening-results';

export function saveScreeningResult(result: ScreeningResult): void {
  // Always save to localStorage (works pre-signup)
  const existing = getScreeningResults();
  existing.push(result);
  syncEncryptedStorage.setItem(SCREENING_STORAGE_KEY, JSON.stringify(existing));

  // Also persist to Supabase if authenticated (non-blocking)
  import('./supabase-data').then(({ dataService }) => {
    dataService.saveScreeningResult({
      instrument_id: result.instrumentId,
      instrument_name: result.instrumentName,
      answers: result.answers as Record<string, unknown>,
      total_score: result.totalScore,
      risk_level: result.riskLevel,
      summary: result.summary,
      next_steps: result.nextSteps,
      child_id: null,
      child_age_months: result.childAgeMonths ?? null,
      completed_at: result.completedAt,
    }).catch(() => { /* Not authenticated or offline */ });
  }).catch(() => {});
}

export function getScreeningResults(): ScreeningResult[] {
  try {
    const raw = syncEncryptedStorage.getItem(SCREENING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Called after signup — migrates localStorage screening data to user profile
 */
export function migrateScreeningResultsToUser(): ScreeningResult[] {
  const results = getScreeningResults();
  // After migration, clear localStorage (data now lives in Supabase)
  // Don't clear yet — caller should confirm Supabase write succeeded first
  return results;
}

export function clearLocalScreeningResults(): void {
  syncEncryptedStorage.removeItem(SCREENING_STORAGE_KEY);
}

// ============================================
// CLINICAL PDF INTEGRATION
// ============================================

/**
 * Convert screening results to ClinicalAssessment format for the PDF generator.
 * This allows screening results to appear in the "Standardized Assessments" section
 * of the clinical report shared with providers.
 */
export function screeningResultsToClinicalAssessments(): Array<{
  type: ScreeningType;
  name: string;
  date: string;
  score: number;
  interpretation: string;
}> {
  const results = getScreeningResults();
  return results.map(r => ({
    type: r.instrumentId,
    name: r.instrumentName,
    date: new Date(r.completedAt).toISOString().split('T')[0],
    score: r.totalScore,
    interpretation: `${r.riskLevel.charAt(0).toUpperCase() + r.riskLevel.slice(1)} risk — ${r.summary}`,
  }));
}
