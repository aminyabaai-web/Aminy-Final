// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// outcome-measures.ts
// Standardized outcome measure scoring templates for the Aminy app.
// Provides simplified screening versions of BRIEF-2, Vineland-3, and CARS-2
// for behavioral wellness tracking in neurodivergent families.

import { supabase } from '../utils/supabase/client';
import { syncEncryptedStorage } from './security/encrypted-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssessmentType = 'brief2' | 'vineland3' | 'cars2';

export interface AssessmentQuestion {
  id: string;
  text: string;
  domain: string;
  options: { value: number; label: string }[];
}

export interface AssessmentResult {
  type: AssessmentType;
  userId: string;
  childId: string;
  completedAt: string;
  answers: Record<string, number>;
  domainScores: Record<string, number>;
  compositeScore: number;
  interpretation: string;
  percentile?: number;
}

export interface AssessmentMeta {
  type: AssessmentType;
  title: string;
  subtitle: string;
  description: string;
  estimatedMinutes: number;
  questionCount: number;
  domains: string[];
}

// ---------------------------------------------------------------------------
// Assessment metadata
// ---------------------------------------------------------------------------

export const ASSESSMENT_META: Record<AssessmentType, AssessmentMeta> = {
  brief2: {
    type: 'brief2',
    title: 'BRIEF-2',
    subtitle: 'Executive Function Screening',
    description:
      'A simplified 15-question screening inspired by the Behavior Rating Inventory of Executive Function. Covers inhibition, emotional control, working memory, and more.',
    estimatedMinutes: 5,
    questionCount: 15,
    domains: [
      'Inhibit',
      'Self-Monitor',
      'Shift',
      'Emotional Control',
      'Initiate',
      'Working Memory',
      'Plan/Organize',
      'Task-Monitor',
    ],
  },
  vineland3: {
    type: 'vineland3',
    title: 'Vineland-3',
    subtitle: 'Adaptive Behavior Scales',
    description:
      'A 12-question adaptive behavior screening covering communication, daily living skills, socialization, and motor skills.',
    estimatedMinutes: 3,
    questionCount: 12,
    domains: ['Communication', 'Daily Living Skills', 'Socialization', 'Motor Skills'],
  },
  cars2: {
    type: 'cars2',
    title: 'CARS-2',
    subtitle: 'Autism Rating Screening',
    description:
      'A 15-item screening inspired by the Childhood Autism Rating Scale. Rates behaviors from normal to severely atypical across key areas.',
    estimatedMinutes: 5,
    questionCount: 15,
    domains: [
      'Relating to People',
      'Imitation',
      'Emotional Response',
      'Body Use',
      'Object Use',
      'Adaptation to Change',
      'Visual Response',
      'Listening Response',
      'Taste/Smell/Touch',
      'Fear/Nervousness',
      'Verbal Communication',
      'Nonverbal Communication',
      'Activity Level',
      'Intellectual Response',
      'General Impressions',
    ],
  },
};

// ---------------------------------------------------------------------------
// BRIEF-2 questions (simplified 15-question screening)
// ---------------------------------------------------------------------------

const BRIEF2_OPTIONS = [
  { value: 1, label: 'Never' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
];

const BRIEF2_QUESTIONS: AssessmentQuestion[] = [
  // Inhibit (BRI)
  { id: 'b2_01', text: 'Has trouble waiting their turn', domain: 'Inhibit', options: BRIEF2_OPTIONS },
  { id: 'b2_02', text: 'Acts too wild or out of control', domain: 'Inhibit', options: BRIEF2_OPTIONS },
  // Self-Monitor (BRI)
  { id: 'b2_03', text: 'Does not notice when their behavior causes negative reactions', domain: 'Self-Monitor', options: BRIEF2_OPTIONS },
  { id: 'b2_04', text: 'Is unaware of how their behavior affects others', domain: 'Self-Monitor', options: BRIEF2_OPTIONS },
  // Shift (ERI)
  { id: 'b2_05', text: 'Has trouble adjusting to new situations', domain: 'Shift', options: BRIEF2_OPTIONS },
  { id: 'b2_06', text: 'Resists change of routine, foods, places, etc.', domain: 'Shift', options: BRIEF2_OPTIONS },
  // Emotional Control (ERI)
  { id: 'b2_07', text: 'Has explosive, angry outbursts', domain: 'Emotional Control', options: BRIEF2_OPTIONS },
  { id: 'b2_08', text: 'Mood changes frequently', domain: 'Emotional Control', options: BRIEF2_OPTIONS },
  // Initiate (CRI)
  { id: 'b2_09', text: 'Has trouble getting started on tasks', domain: 'Initiate', options: BRIEF2_OPTIONS },
  // Working Memory (CRI)
  { id: 'b2_10', text: 'Has a short attention span', domain: 'Working Memory', options: BRIEF2_OPTIONS },
  { id: 'b2_11', text: 'Forgets what they were doing', domain: 'Working Memory', options: BRIEF2_OPTIONS },
  // Plan/Organize (CRI)
  { id: 'b2_12', text: 'Has trouble planning ahead for activities', domain: 'Plan/Organize', options: BRIEF2_OPTIONS },
  { id: 'b2_13', text: 'Has trouble organizing their things', domain: 'Plan/Organize', options: BRIEF2_OPTIONS },
  // Task-Monitor (CRI)
  { id: 'b2_14', text: 'Does not check work for mistakes', domain: 'Task-Monitor', options: BRIEF2_OPTIONS },
  { id: 'b2_15', text: 'Needs to be told to begin a task even when willing', domain: 'Task-Monitor', options: BRIEF2_OPTIONS },
];

// Map clinical scales to index groups
const BRIEF2_INDEX_MAP: Record<string, string[]> = {
  BRI: ['Inhibit', 'Self-Monitor'],
  ERI: ['Shift', 'Emotional Control'],
  CRI: ['Initiate', 'Working Memory', 'Plan/Organize', 'Task-Monitor'],
};

// ---------------------------------------------------------------------------
// Vineland-3 questions (simplified 12-question screening)
// ---------------------------------------------------------------------------

const VINELAND3_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Sometimes' },
  { value: 2, label: 'Usually' },
];

const VINELAND3_QUESTIONS: AssessmentQuestion[] = [
  // Communication
  { id: 'v3_01', text: 'Uses words or sentences to ask for things', domain: 'Communication', options: VINELAND3_OPTIONS },
  { id: 'v3_02', text: 'Follows simple instructions without gestures', domain: 'Communication', options: VINELAND3_OPTIONS },
  { id: 'v3_03', text: 'Tells about experiences in a way others understand', domain: 'Communication', options: VINELAND3_OPTIONS },
  // Daily Living Skills
  { id: 'v3_04', text: 'Feeds self with a spoon or fork without much spilling', domain: 'Daily Living Skills', options: VINELAND3_OPTIONS },
  { id: 'v3_05', text: 'Puts on clothes independently (buttons, zippers may need help)', domain: 'Daily Living Skills', options: VINELAND3_OPTIONS },
  { id: 'v3_06', text: 'Follows a morning or bedtime routine with minimal reminders', domain: 'Daily Living Skills', options: VINELAND3_OPTIONS },
  // Socialization
  { id: 'v3_07', text: 'Shows interest in other children', domain: 'Socialization', options: VINELAND3_OPTIONS },
  { id: 'v3_08', text: 'Takes turns during play or conversation', domain: 'Socialization', options: VINELAND3_OPTIONS },
  { id: 'v3_09', text: 'Shows concern when others are upset', domain: 'Socialization', options: VINELAND3_OPTIONS },
  // Motor Skills
  { id: 'v3_10', text: 'Runs and climbs without frequent falls', domain: 'Motor Skills', options: VINELAND3_OPTIONS },
  { id: 'v3_11', text: 'Uses crayons, pencils, or scissors with some control', domain: 'Motor Skills', options: VINELAND3_OPTIONS },
  { id: 'v3_12', text: 'Catches a large ball thrown from a short distance', domain: 'Motor Skills', options: VINELAND3_OPTIONS },
];

// ---------------------------------------------------------------------------
// CARS-2 questions (simplified 15-item screening)
// ---------------------------------------------------------------------------

const CARS2_OPTIONS = [
  { value: 1, label: 'Normal' },
  { value: 2, label: 'Mildly abnormal' },
  { value: 3, label: 'Moderately abnormal' },
  { value: 4, label: 'Severely abnormal' },
];

const CARS2_QUESTIONS: AssessmentQuestion[] = [
  { id: 'c2_01', text: 'Relating to people — eye contact, interest in social interaction', domain: 'Relating to People', options: CARS2_OPTIONS },
  { id: 'c2_02', text: 'Imitation — ability to mimic words, movements, or actions', domain: 'Imitation', options: CARS2_OPTIONS },
  { id: 'c2_03', text: 'Emotional response — appropriate reactions to situations', domain: 'Emotional Response', options: CARS2_OPTIONS },
  { id: 'c2_04', text: 'Body use — coordination, posture, repetitive movements', domain: 'Body Use', options: CARS2_OPTIONS },
  { id: 'c2_05', text: 'Object use — interest in toys and objects, unusual play patterns', domain: 'Object Use', options: CARS2_OPTIONS },
  { id: 'c2_06', text: 'Adaptation to change — response to routine changes or transitions', domain: 'Adaptation to Change', options: CARS2_OPTIONS },
  { id: 'c2_07', text: 'Visual response — staring, unusual focus on lights or objects', domain: 'Visual Response', options: CARS2_OPTIONS },
  { id: 'c2_08', text: 'Listening response — reaction to sounds, covering ears, ignoring speech', domain: 'Listening Response', options: CARS2_OPTIONS },
  { id: 'c2_09', text: 'Taste, smell, and touch response — unusual exploration or sensitivity', domain: 'Taste/Smell/Touch', options: CARS2_OPTIONS },
  { id: 'c2_10', text: 'Fear or nervousness — unusual fears, or lack of fear in dangerous situations', domain: 'Fear/Nervousness', options: CARS2_OPTIONS },
  { id: 'c2_11', text: 'Verbal communication — amount and quality of speech', domain: 'Verbal Communication', options: CARS2_OPTIONS },
  { id: 'c2_12', text: 'Nonverbal communication — use of gestures, facial expressions, pointing', domain: 'Nonverbal Communication', options: CARS2_OPTIONS },
  { id: 'c2_13', text: 'Activity level — hyperactivity, lethargy, or switching between extremes', domain: 'Activity Level', options: CARS2_OPTIONS },
  { id: 'c2_14', text: 'Intellectual response — consistency and level of cognitive functioning', domain: 'Intellectual Response', options: CARS2_OPTIONS },
  { id: 'c2_15', text: 'General impressions — overall sense of autism-related behaviors', domain: 'General Impressions', options: CARS2_OPTIONS },
];

// ---------------------------------------------------------------------------
// getAssessmentQuestions
// ---------------------------------------------------------------------------

export function getAssessmentQuestions(type: AssessmentType): AssessmentQuestion[] {
  switch (type) {
    case 'brief2':
      return BRIEF2_QUESTIONS;
    case 'vineland3':
      return VINELAND3_QUESTIONS;
    case 'cars2':
      return CARS2_QUESTIONS;
  }
}

// ---------------------------------------------------------------------------
// scoreAssessment
// ---------------------------------------------------------------------------

export function scoreAssessment(
  type: AssessmentType,
  answers: Record<string, number>,
): { domainScores: Record<string, number>; compositeScore: number; interpretation: string } {
  switch (type) {
    case 'brief2':
      return scoreBrief2(answers);
    case 'vineland3':
      return scoreVineland3(answers);
    case 'cars2':
      return scoreCars2(answers);
  }
}

// -- BRIEF-2 scoring --------------------------------------------------------

function scoreBrief2(answers: Record<string, number>) {
  const questions = BRIEF2_QUESTIONS;
  const domainRaw: Record<string, { sum: number; count: number }> = {};

  for (const q of questions) {
    if (!domainRaw[q.domain]) domainRaw[q.domain] = { sum: 0, count: 0 };
    domainRaw[q.domain].sum += answers[q.id] ?? 1;
    domainRaw[q.domain].count += 1;
  }

  // T-score approximation: (raw / max) * 100, clamped to 30-90 range
  const domainScores: Record<string, number> = {};
  for (const [domain, data] of Object.entries(domainRaw)) {
    const maxPossible = data.count * 3; // max answer = 3
    const tScore = Math.round((data.sum / maxPossible) * 100);
    domainScores[domain] = Math.max(30, Math.min(90, tScore));
  }

  // Index scores
  for (const [index, scales] of Object.entries(BRIEF2_INDEX_MAP)) {
    const relevant = scales.filter((s) => domainScores[s] !== undefined);
    if (relevant.length > 0) {
      const avg = relevant.reduce((acc, s) => acc + domainScores[s], 0) / relevant.length;
      domainScores[index] = Math.round(avg);
    }
  }

  // Global Executive Composite
  const allScaleScores = Object.entries(domainScores)
    .filter(([key]) => !['BRI', 'ERI', 'CRI'].includes(key))
    .map(([, v]) => v);
  const compositeScore = Math.round(allScaleScores.reduce((a, b) => a + b, 0) / allScaleScores.length);
  domainScores['GEC'] = compositeScore;

  let interpretation: string;
  if (compositeScore < 50) {
    interpretation = 'Within normal limits — no significant executive function concerns.';
  } else if (compositeScore < 65) {
    interpretation = 'Mildly elevated — some executive function challenges noted.';
  } else if (compositeScore < 75) {
    interpretation = 'Moderately elevated — notable executive function difficulties.';
  } else {
    interpretation = 'Clinically elevated — significant executive function concerns. Consider professional evaluation.';
  }

  return { domainScores, compositeScore, interpretation };
}

// -- Vineland-3 scoring -----------------------------------------------------

function scoreVineland3(answers: Record<string, number>) {
  const questions = VINELAND3_QUESTIONS;
  const domainRaw: Record<string, { sum: number; count: number }> = {};

  for (const q of questions) {
    if (!domainRaw[q.domain]) domainRaw[q.domain] = { sum: 0, count: 0 };
    domainRaw[q.domain].sum += answers[q.id] ?? 0;
    domainRaw[q.domain].count += 1;
  }

  // Standard score per domain: (raw / max) * 100
  const domainScores: Record<string, number> = {};
  for (const [domain, data] of Object.entries(domainRaw)) {
    const maxPossible = data.count * 2; // max answer = 2
    domainScores[domain] = Math.round((data.sum / maxPossible) * 100);
  }

  // Adaptive Behavior Composite — average of domain scores
  const domainValues = Object.values(domainScores);
  const compositeScore = Math.round(domainValues.reduce((a, b) => a + b, 0) / domainValues.length);
  domainScores['Adaptive Behavior Composite'] = compositeScore;

  let interpretation: string;
  if (compositeScore >= 80) {
    interpretation = 'Adequate adaptive behavior — functioning well in daily life.';
  } else if (compositeScore >= 60) {
    interpretation = 'Moderately low adaptive behavior — some support may be beneficial.';
  } else if (compositeScore >= 40) {
    interpretation = 'Low adaptive behavior — targeted interventions recommended.';
  } else {
    interpretation = 'Significantly low adaptive behavior — comprehensive support needed.';
  }

  return { domainScores, compositeScore, interpretation };
}

// -- CARS-2 scoring ---------------------------------------------------------

function scoreCars2(answers: Record<string, number>) {
  const questions = CARS2_QUESTIONS;
  const domainScores: Record<string, number> = {};
  let totalScore = 0;

  for (const q of questions) {
    const val = answers[q.id] ?? 1;
    domainScores[q.domain] = val;
    totalScore += val;
  }

  const compositeScore = totalScore; // 15-60 range

  let interpretation: string;
  if (compositeScore < 30) {
    interpretation = 'Minimal-to-no symptoms — behaviors are within typical range.';
  } else if (compositeScore <= 36) {
    interpretation = 'Mild-to-moderate symptoms — some autism-related behaviors observed. Consider further evaluation.';
  } else {
    interpretation = 'Severe symptoms — significant autism-related behaviors. Professional evaluation strongly recommended.';
  }

  return { domainScores, compositeScore, interpretation };
}

// ---------------------------------------------------------------------------
// saveAssessmentResult — Supabase with localStorage fallback
// ---------------------------------------------------------------------------

// Signals where the result actually persisted so the UI can be honest:
//   'server' — written to Supabase (durable, syncs across devices)
//   'local'  — Supabase failed/unavailable; only on this device's localStorage
export interface SaveAssessmentOutcome {
  persisted: 'server' | 'local';
  error?: string;
}

export async function saveAssessmentResult(result: AssessmentResult): Promise<SaveAssessmentOutcome> {
  // Always save to localStorage first as a backup
  const storageKey = `aminy_assessments_${result.userId}_${result.childId}`;
  try {
    const existing = JSON.parse(syncEncryptedStorage.getItem(storageKey) || '[]') as AssessmentResult[];
    existing.push(result);
    syncEncryptedStorage.setItem(storageKey, JSON.stringify(existing));
  } catch {
    // localStorage not available — ignore
  }

  // Attempt Supabase save
  try {
    const { error } = await supabase.from('assessment_results').insert({
      type: result.type,
      user_id: result.userId,
      child_id: result.childId,
      completed_at: result.completedAt,
      answers: result.answers,
      domain_scores: result.domainScores,
      composite_score: result.compositeScore,
      interpretation: result.interpretation,
      percentile: result.percentile ?? null,
    });

    if (error) {
      console.warn('[outcome-measures] Supabase save failed, localStorage fallback used:', error.message);
      return { persisted: 'local', error: error.message };
    }
    return { persisted: 'server' };
  } catch (err) {
    console.warn('[outcome-measures] Supabase unavailable, localStorage fallback used:', err);
    return { persisted: 'local', error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// getAssessmentHistory
// ---------------------------------------------------------------------------

export async function getAssessmentHistory(
  userId: string,
  childId: string,
  type?: AssessmentType,
): Promise<AssessmentResult[]> {
  // Try Supabase first
  try {
    let query = supabase
      .from('assessment_results')
      .select('*')
      .eq('user_id', userId)
      .eq('child_id', childId)
      .order('completed_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return data.map((row: Record<string, unknown>) => ({
        type: row.type as AssessmentType,
        userId: row.user_id as string,
        childId: row.child_id as string,
        completedAt: row.completed_at as string,
        answers: row.answers as Record<string, number>,
        domainScores: row.domain_scores as Record<string, number>,
        compositeScore: row.composite_score as number,
        interpretation: row.interpretation as string,
        percentile: (row.percentile as number) ?? undefined,
      }));
    }
  } catch {
    // Supabase unavailable — fall through to localStorage
  }

  // Fallback: localStorage
  const storageKey = `aminy_assessments_${userId}_${childId}`;
  try {
    const stored = JSON.parse(syncEncryptedStorage.getItem(storageKey) || '[]') as AssessmentResult[];
    const filtered = type ? stored.filter((r) => r.type === type) : stored;
    return filtered.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// getProgressData — for longitudinal charting
// ---------------------------------------------------------------------------

export async function getProgressData(
  userId: string,
  childId: string,
  type: AssessmentType,
): Promise<{ dates: string[]; scores: number[] }> {
  const history = await getAssessmentHistory(userId, childId, type);

  // Chronological order for charting
  const sorted = [...history].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );

  return {
    dates: sorted.map((r) => r.completedAt),
    scores: sorted.map((r) => r.compositeScore),
  };
}
