/**
 * Outcomes Measurement Framework
 * Standardized outcome tracking for neurodivergent children and families
 *
 * Includes:
 * - Validated assessment instruments
 * - Progress tracking over time
 * - Outcome reporting for stakeholders
 * - Integration with clinical workflows
 */

import { createClientSupabaseClient } from '../utils/supabase/client';

const supabase = createClientSupabaseClient();

// ============================================================================
// ASSESSMENT INSTRUMENTS
// ============================================================================

/**
 * Assessment domain types
 */
export type AssessmentDomain =
  | 'behavior'           // Challenging behaviors
  | 'social'             // Social skills
  | 'communication'      // Language & communication
  | 'daily_living'       // Self-care, routines
  | 'emotional'          // Emotional regulation
  | 'caregiver_stress'   // Caregiver wellbeing
  | 'family_functioning' // Overall family quality of life
  | 'sleep'              // Sleep quality
  | 'sensory';           // Sensory processing

/**
 * Assessment instrument definition
 */
export interface AssessmentInstrument {
  id: string;
  name: string;
  abbreviation: string;
  domain: AssessmentDomain;
  description: string;
  targetPopulation: 'child' | 'caregiver' | 'family';
  questionCount: number;
  timeToComplete: number; // minutes
  scoringType: 'sum' | 'average' | 'custom';
  minScore: number;
  maxScore: number;
  clinicalCutoffs?: {
    mild?: number;
    moderate?: number;
    severe?: number;
  };
  citations: string[];
  questions: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  responseOptions: ResponseOption[];
  domain?: string; // subdomain
  isReverseCoded?: boolean;
}

export interface ResponseOption {
  value: number;
  label: string;
}

/**
 * Completed assessment result
 */
export interface AssessmentResult {
  id: string;
  instrumentId: string;
  userId: string;
  childId?: string;
  responses: Record<string, number>; // questionId -> response value
  totalScore: number;
  subscaleScores?: Record<string, number>;
  percentile?: number;
  severity?: 'minimal' | 'mild' | 'moderate' | 'severe';
  interpretation: string;
  recommendations: string[];
  completedAt: string;
  timeSpentSeconds: number;
}

// ============================================================================
// VALIDATED INSTRUMENTS
// ============================================================================

/**
 * Parenting Stress Index - Short Form (PSI-SF) adapted
 * Original: Abidin, 1995
 */
export const PARENTING_STRESS_INDEX: AssessmentInstrument = {
  id: 'psi-sf-adapted',
  name: 'Parenting Stress Index (Adapted)',
  abbreviation: 'PSI-A',
  domain: 'caregiver_stress',
  description: 'Measures stress in the parent-child relationship',
  targetPopulation: 'caregiver',
  questionCount: 10,
  timeToComplete: 5,
  scoringType: 'sum',
  minScore: 10,
  maxScore: 50,
  clinicalCutoffs: {
    mild: 25,
    moderate: 35,
    severe: 42,
  },
  citations: ['Abidin, R. R. (1995). Parenting Stress Index (3rd ed.). Odessa, FL: Psychological Assessment Resources.'],
  questions: [
    {
      id: 'psi1',
      text: 'I often have the feeling that I cannot handle things very well.',
      responseOptions: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Not Sure' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
      ],
    },
    {
      id: 'psi2',
      text: 'I find myself giving up more of my life to meet my child\'s needs than I ever expected.',
      responseOptions: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Not Sure' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
      ],
    },
    {
      id: 'psi3',
      text: 'I feel trapped by my responsibilities as a parent.',
      responseOptions: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Not Sure' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
      ],
    },
    {
      id: 'psi4',
      text: 'Since having my child, I have been unable to do new and different things.',
      responseOptions: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Not Sure' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
      ],
    },
    {
      id: 'psi5',
      text: 'Since having my child, I feel that I am almost never able to do things that I like to do.',
      responseOptions: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Not Sure' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
      ],
    },
    {
      id: 'psi6',
      text: 'I am unhappy with the last purchase of clothing I made for myself.',
      responseOptions: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Not Sure' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
      ],
    },
    {
      id: 'psi7',
      text: 'There are quite a few things that bother me about my life.',
      responseOptions: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Not Sure' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
      ],
    },
    {
      id: 'psi8',
      text: 'Having a child has caused more problems than I expected in my relationship with my spouse.',
      responseOptions: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Not Sure' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
      ],
    },
    {
      id: 'psi9',
      text: 'I feel alone and without friends.',
      responseOptions: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Not Sure' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
      ],
    },
    {
      id: 'psi10',
      text: 'When I go to a party, I usually expect not to enjoy myself.',
      responseOptions: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Not Sure' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' },
      ],
    },
  ],
};

/**
 * Family Quality of Life Scale (adapted from Beach Center FQOL)
 * Original: Park et al., 2003
 */
export const FAMILY_QUALITY_OF_LIFE: AssessmentInstrument = {
  id: 'fqol-adapted',
  name: 'Family Quality of Life Scale (Adapted)',
  abbreviation: 'FQOL-A',
  domain: 'family_functioning',
  description: 'Measures overall family quality of life across key domains',
  targetPopulation: 'family',
  questionCount: 12,
  timeToComplete: 6,
  scoringType: 'average',
  minScore: 1,
  maxScore: 5,
  clinicalCutoffs: {
    mild: 2.5,
    moderate: 3.5,
  },
  citations: ['Park, J., et al. (2003). Toward Assessing Family Outcomes of Service Delivery. Journal of Early Intervention, 25(3), 173-191.'],
  questions: [
    // Family Interaction
    {
      id: 'fqol1',
      text: 'My family enjoys spending time together.',
      domain: 'interaction',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    {
      id: 'fqol2',
      text: 'My family members help each other out.',
      domain: 'interaction',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    {
      id: 'fqol3',
      text: 'My family can handle life\'s ups and downs.',
      domain: 'interaction',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    // Parenting
    {
      id: 'fqol4',
      text: 'Adults in my family know people in my child\'s life (friends, teachers).',
      domain: 'parenting',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    {
      id: 'fqol5',
      text: 'Adults in my family help my child learn to be independent.',
      domain: 'parenting',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    {
      id: 'fqol6',
      text: 'Adults in my family have time for individual children.',
      domain: 'parenting',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    // Emotional Wellbeing
    {
      id: 'fqol7',
      text: 'My family has the support we need to relieve stress.',
      domain: 'emotional',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    {
      id: 'fqol8',
      text: 'My family members have friends or others who provide support.',
      domain: 'emotional',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    {
      id: 'fqol9',
      text: 'My family has outside help to take care of special needs of family members.',
      domain: 'emotional',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    // Disability-Related Support
    {
      id: 'fqol10',
      text: 'My child with special needs has support to make progress at school or work.',
      domain: 'support',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    {
      id: 'fqol11',
      text: 'My child with special needs has support to make friends.',
      domain: 'support',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
    {
      id: 'fqol12',
      text: 'My family has a good relationship with service providers.',
      domain: 'support',
      responseOptions: [
        { value: 1, label: 'Very Dissatisfied' },
        { value: 2, label: 'Dissatisfied' },
        { value: 3, label: 'Neither' },
        { value: 4, label: 'Satisfied' },
        { value: 5, label: 'Very Satisfied' },
      ],
    },
  ],
};

/**
 * Child Sleep Habits Questionnaire (abbreviated)
 * Original: Owens et al., 2000
 */
export const CHILD_SLEEP_HABITS: AssessmentInstrument = {
  id: 'cshq-abbreviated',
  name: 'Child Sleep Habits Questionnaire (Abbreviated)',
  abbreviation: 'CSHQ-A',
  domain: 'sleep',
  description: 'Brief assessment of child sleep patterns and problems',
  targetPopulation: 'child',
  questionCount: 8,
  timeToComplete: 3,
  scoringType: 'sum',
  minScore: 8,
  maxScore: 24,
  clinicalCutoffs: {
    mild: 12,
    moderate: 16,
    severe: 20,
  },
  citations: ['Owens, J. A., et al. (2000). The Children\'s Sleep Habits Questionnaire (CSHQ). Sleep, 23(8), 1043-1051.'],
  questions: [
    {
      id: 'cshq1',
      text: 'Child goes to bed at the same time each night.',
      responseOptions: [
        { value: 1, label: 'Usually (5-7 nights)' },
        { value: 2, label: 'Sometimes (2-4 nights)' },
        { value: 3, label: 'Rarely (0-1 nights)' },
      ],
      isReverseCoded: true,
    },
    {
      id: 'cshq2',
      text: 'Child falls asleep within 20 minutes after going to bed.',
      responseOptions: [
        { value: 1, label: 'Usually' },
        { value: 2, label: 'Sometimes' },
        { value: 3, label: 'Rarely' },
      ],
      isReverseCoded: true,
    },
    {
      id: 'cshq3',
      text: 'Child falls asleep in own bed.',
      responseOptions: [
        { value: 1, label: 'Usually' },
        { value: 2, label: 'Sometimes' },
        { value: 3, label: 'Rarely' },
      ],
      isReverseCoded: true,
    },
    {
      id: 'cshq4',
      text: 'Child wakes up during the night.',
      responseOptions: [
        { value: 1, label: 'Usually' },
        { value: 2, label: 'Sometimes' },
        { value: 3, label: 'Rarely' },
      ],
    },
    {
      id: 'cshq5',
      text: 'Child seems tired during the day.',
      responseOptions: [
        { value: 1, label: 'Usually' },
        { value: 2, label: 'Sometimes' },
        { value: 3, label: 'Rarely' },
      ],
    },
    {
      id: 'cshq6',
      text: 'Child resists going to bed at bedtime.',
      responseOptions: [
        { value: 1, label: 'Usually' },
        { value: 2, label: 'Sometimes' },
        { value: 3, label: 'Rarely' },
      ],
    },
    {
      id: 'cshq7',
      text: 'Child has trouble falling asleep.',
      responseOptions: [
        { value: 1, label: 'Usually' },
        { value: 2, label: 'Sometimes' },
        { value: 3, label: 'Rarely' },
      ],
    },
    {
      id: 'cshq8',
      text: 'Child sleeps the right amount.',
      responseOptions: [
        { value: 1, label: 'Usually' },
        { value: 2, label: 'Sometimes' },
        { value: 3, label: 'Rarely' },
      ],
      isReverseCoded: true,
    },
  ],
};

// All available instruments
export const ASSESSMENT_INSTRUMENTS: AssessmentInstrument[] = [
  PARENTING_STRESS_INDEX,
  FAMILY_QUALITY_OF_LIFE,
  CHILD_SLEEP_HABITS,
];

// ============================================================================
// SCORING & INTERPRETATION
// ============================================================================

/**
 * Score an assessment
 */
export function scoreAssessment(
  instrument: AssessmentInstrument,
  responses: Record<string, number>
): {
  totalScore: number;
  subscaleScores?: Record<string, number>;
  severity?: 'minimal' | 'mild' | 'moderate' | 'severe';
  interpretation: string;
  recommendations: string[];
} {
  let totalScore = 0;
  const subscaleScores: Record<string, { sum: number; count: number }> = {};

  // Calculate scores
  for (const question of instrument.questions) {
    const response = responses[question.id];
    if (response === undefined) continue;

    let score = response;

    // Handle reverse coding
    if (question.isReverseCoded) {
      const maxValue = Math.max(...question.responseOptions.map(o => o.value));
      const minValue = Math.min(...question.responseOptions.map(o => o.value));
      score = maxValue + minValue - response;
    }

    totalScore += score;

    // Track subscale scores
    if (question.domain) {
      if (!subscaleScores[question.domain]) {
        subscaleScores[question.domain] = { sum: 0, count: 0 };
      }
      subscaleScores[question.domain].sum += score;
      subscaleScores[question.domain].count++;
    }
  }

  // For average scoring, divide by question count
  if (instrument.scoringType === 'average') {
    totalScore = totalScore / instrument.questionCount;
  }

  // Calculate subscale averages
  const finalSubscaleScores: Record<string, number> = {};
  for (const [domain, data] of Object.entries(subscaleScores)) {
    finalSubscaleScores[domain] = data.sum / data.count;
  }

  // Determine severity
  let severity: 'minimal' | 'mild' | 'moderate' | 'severe' = 'minimal';
  if (instrument.clinicalCutoffs) {
    if (instrument.clinicalCutoffs.severe && totalScore >= instrument.clinicalCutoffs.severe) {
      severity = 'severe';
    } else if (instrument.clinicalCutoffs.moderate && totalScore >= instrument.clinicalCutoffs.moderate) {
      severity = 'moderate';
    } else if (instrument.clinicalCutoffs.mild && totalScore >= instrument.clinicalCutoffs.mild) {
      severity = 'mild';
    }
  }

  // Generate interpretation and recommendations
  const { interpretation, recommendations } = generateInterpretation(instrument, totalScore, severity);

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    subscaleScores: Object.keys(finalSubscaleScores).length > 0 ? finalSubscaleScores : undefined,
    severity,
    interpretation,
    recommendations,
  };
}

/**
 * Generate interpretation and recommendations based on score
 */
function generateInterpretation(
  instrument: AssessmentInstrument,
  score: number,
  severity: 'minimal' | 'mild' | 'moderate' | 'severe'
): { interpretation: string; recommendations: string[] } {
  const interpretations: Record<string, Record<string, { interp: string; recs: string[] }>> = {
    'psi-sf-adapted': {
      minimal: {
        interp: 'Your parenting stress levels appear to be in a healthy range. You seem to be managing the demands of parenting well.',
        recs: [
          'Continue practicing self-care and maintaining support systems',
          'Share successful strategies with other parents in the community',
        ],
      },
      mild: {
        interp: 'You are experiencing some parenting stress, which is common for caregivers of children with special needs.',
        recs: [
          'Consider scheduling regular breaks or respite time',
          'Connect with other parents through Aminy\'s community',
          'Try the guided relaxation exercises in the Calm Tools section',
        ],
      },
      moderate: {
        interp: 'You are experiencing moderate levels of parenting stress. It may be helpful to seek additional support.',
        recs: [
          'Consider speaking with a mental health professional',
          'Explore respite care options in your area',
          'Use the daily planning features to better manage demands',
          'Connect with parent support groups',
        ],
      },
      severe: {
        interp: 'Your stress levels are significantly elevated. We strongly recommend seeking professional support.',
        recs: [
          'Schedule an appointment with a counselor or therapist',
          'Contact your child\'s care team about additional support resources',
          'Call a crisis helpline if you\'re feeling overwhelmed',
          'Consider whether you need immediate respite care',
        ],
      },
    },
    'fqol-adapted': {
      minimal: {
        interp: 'Your family quality of life scores indicate some challenges. There may be areas where additional support could help.',
        recs: [
          'Review which subscales scored lowest to identify focus areas',
          'Explore community resources and support services',
        ],
      },
      mild: {
        interp: 'Your family is experiencing moderate quality of life. Some areas may benefit from additional attention.',
        recs: [
          'Consider family activities that strengthen connection',
          'Explore local support groups and resources',
        ],
      },
      moderate: {
        interp: 'Your family is reporting good quality of life across most areas.',
        recs: [
          'Continue the strategies that are working well',
          'Consider sharing your successes in the community',
        ],
      },
      severe: {
        interp: 'Your family is thriving! You report high quality of life across multiple domains.',
        recs: [
          'Maintain the routines and supports that are working',
          'Consider mentoring other families on their journey',
        ],
      },
    },
    'cshq-abbreviated': {
      minimal: {
        interp: 'Your child\'s sleep patterns appear to be healthy with few concerns.',
        recs: [
          'Maintain consistent sleep routines',
          'Continue current bedtime practices',
        ],
      },
      mild: {
        interp: 'Your child is experiencing some sleep difficulties that may benefit from attention.',
        recs: [
          'Review bedtime routines for consistency',
          'Consider reducing screen time before bed',
          'Try the sleep tips in the Daily Activities section',
        ],
      },
      moderate: {
        interp: 'Your child is experiencing moderate sleep problems that may affect daytime functioning.',
        recs: [
          'Consult with your pediatrician about sleep concerns',
          'Create a calming bedtime routine with visual supports',
          'Consider a sleep diary to identify patterns',
        ],
      },
      severe: {
        interp: 'Your child has significant sleep difficulties that warrant professional evaluation.',
        recs: [
          'Schedule an appointment with your child\'s doctor',
          'Consider a referral to a sleep specialist',
          'Rule out medical causes of sleep problems',
        ],
      },
    },
  };

  const instrumentInterpretations = interpretations[instrument.id];
  if (instrumentInterpretations && instrumentInterpretations[severity]) {
    return {
      interpretation: instrumentInterpretations[severity].interp,
      recommendations: instrumentInterpretations[severity].recs,
    };
  }

  // Default interpretation
  return {
    interpretation: `Your score of ${score} indicates ${severity} levels on this assessment.`,
    recommendations: ['Review results with your care team', 'Continue monitoring over time'],
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const RESULTS_STORAGE_KEY = 'aminy_assessment_results';

function getLocalResults(): AssessmentResult[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(RESULTS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveLocalResults(results: AssessmentResult[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(results));
}

/**
 * Save an assessment result
 */
export async function saveAssessmentResult(result: Omit<AssessmentResult, 'id'>): Promise<AssessmentResult> {
  const fullResult: AssessmentResult = {
    ...result,
    id: `assessment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  try {
    const { data, error } = await supabase
      .from('assessment_results')
      .insert({
        id: fullResult.id,
        instrument_id: fullResult.instrumentId,
        user_id: fullResult.userId,
        child_id: fullResult.childId,
        responses: fullResult.responses,
        total_score: fullResult.totalScore,
        subscale_scores: fullResult.subscaleScores,
        percentile: fullResult.percentile,
        severity: fullResult.severity,
        interpretation: fullResult.interpretation,
        recommendations: fullResult.recommendations,
        completed_at: fullResult.completedAt,
        time_spent_seconds: fullResult.timeSpentSeconds,
      })
      .select()
      .single();

    if (error) throw error;
    return fullResult;
  } catch (err) {
    console.warn('[Outcomes] Supabase error, saving locally:', err);
    const results = getLocalResults();
    results.push(fullResult);
    saveLocalResults(results);
    return fullResult;
  }
}

/**
 * Get assessment history for a user
 */
export async function getAssessmentHistory(
  userId: string,
  options?: {
    instrumentId?: string;
    childId?: string;
    limit?: number;
  }
): Promise<AssessmentResult[]> {
  try {
    let query = supabase
      .from('assessment_results')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (options?.instrumentId) {
      query = query.eq('instrument_id', options.instrumentId);
    }
    if (options?.childId) {
      query = query.eq('child_id', options.childId);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      instrumentId: row.instrument_id,
      userId: row.user_id,
      childId: row.child_id,
      responses: row.responses,
      totalScore: row.total_score,
      subscaleScores: row.subscale_scores,
      percentile: row.percentile,
      severity: row.severity,
      interpretation: row.interpretation,
      recommendations: row.recommendations,
      completedAt: row.completed_at,
      timeSpentSeconds: row.time_spent_seconds,
    }));
  } catch (err) {
    console.warn('[Outcomes] Supabase error, using localStorage:', err);
    let results = getLocalResults().filter(r => r.userId === userId);

    if (options?.instrumentId) {
      results = results.filter(r => r.instrumentId === options.instrumentId);
    }
    if (options?.childId) {
      results = results.filter(r => r.childId === options.childId);
    }

    results.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }
}

/**
 * Calculate progress over time
 */
export async function calculateOutcomeProgress(
  userId: string,
  instrumentId: string,
  childId?: string
): Promise<{
  currentScore: number;
  previousScore?: number;
  change?: number;
  changePercent?: number;
  trend: 'improving' | 'stable' | 'declining';
  assessmentCount: number;
}> {
  const history = await getAssessmentHistory(userId, { instrumentId, childId, limit: 10 });

  if (history.length === 0) {
    return {
      currentScore: 0,
      trend: 'stable',
      assessmentCount: 0,
    };
  }

  const currentScore = history[0].totalScore;
  const previousScore = history.length > 1 ? history[1].totalScore : undefined;

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  let change: number | undefined;
  let changePercent: number | undefined;

  if (previousScore !== undefined) {
    change = currentScore - previousScore;
    changePercent = previousScore !== 0 ? (change / previousScore) * 100 : 0;

    // For stress/problem scales, lower is better
    const instrument = ASSESSMENT_INSTRUMENTS.find(i => i.id === instrumentId);
    const lowerIsBetter = instrument?.domain === 'caregiver_stress' || instrument?.domain === 'sleep';

    if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (lowerIsBetter) {
      trend = change < 0 ? 'improving' : 'declining';
    } else {
      trend = change > 0 ? 'improving' : 'declining';
    }
  }

  return {
    currentScore,
    previousScore,
    change,
    changePercent: changePercent ? Math.round(changePercent * 10) / 10 : undefined,
    trend,
    assessmentCount: history.length,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Instruments
  ASSESSMENT_INSTRUMENTS,
  PARENTING_STRESS_INDEX,
  FAMILY_QUALITY_OF_LIFE,
  CHILD_SLEEP_HABITS,

  // Scoring
  scoreAssessment,

  // Database
  saveAssessmentResult,
  getAssessmentHistory,
  calculateOutcomeProgress,
};
