// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Care Plan Auto-Updater
 *
 * Bridges PostSessionNotes data into actionable care plan updates.
 * Called from the PostSessionNotes submit handler to:
 *
 * 1. extractActionItems(notes) -- parse structured notes into care plan items
 * 2. updateCarePlan(childId, actionItems) -- merge into existing care plan in Supabase
 * 3. generateHomeProgram(notes) -- create home practice recommendations
 *
 * All functions have localStorage fallback for offline support,
 * consistent with the existing care-plan.ts patterns.
 */

import { supabase } from '../utils/supabase/client';
import {
  createActionItem,
  createGoal,
  getGoals,
  type ActionItem,
  type CarePlanGoal,
  type GoalCategory,
} from './care-plan';

// ---------------------------------------------------------------------------
// Types (aligned with PostSessionNotes internal structure)
// ---------------------------------------------------------------------------

export interface PostSessionNotes {
  appointmentId: string;
  providerId: string;
  patientId: string;
  childId?: string;
  reasonForVisit: string;
  whatWeDiscussed: string[];
  planForNext7Days: string[];
  whatToTrack: string[];
  followUpRecommendation: string;
}

export interface ExtractedActionItem {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  category: GoalCategory;
  dueDate: string; // ISO date
  source: 'visit-summary';
}

export interface HomeProgramItem {
  title: string;
  description: string;
  frequency: string;
  category: GoalCategory;
  difficulty: 'easy' | 'moderate' | 'challenging';
}

export interface HomeProgram {
  sessionDate: string;
  providerNotes: string;
  items: HomeProgramItem[];
  trackingMetrics: string[];
  followUpDate?: string;
}

// ---------------------------------------------------------------------------
// Category inference
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<GoalCategory, string[]> = {
  'daily-routine': ['routine', 'schedule', 'morning', 'bedtime', 'transition', 'timer', 'visual schedule'],
  'communication': ['communication', 'speech', 'language', 'express', 'words', 'sentence', 'verbal', 'AAC', 'sign', 'request'],
  'sensory': ['sensory', 'stimming', 'texture', 'noise', 'calm', 'regulation', 'meltdown', 'sensory diet', 'proprioceptive'],
  'social': ['social', 'peer', 'friend', 'play', 'sharing', 'turn', 'group', 'interaction', 'eye contact'],
  'self-care': ['self-care', 'toileting', 'dressing', 'hygiene', 'eating', 'feeding', 'brush', 'bath', 'independent'],
  'behavior': ['behavior', 'tantrum', 'aggression', 'compliance', 'reinforcement', 'token', 'reward', 'consequence', 'redirect'],
  'academic': ['academic', 'school', 'reading', 'writing', 'math', 'homework', 'attention', 'focus', 'task'],
  'motor': ['motor', 'fine motor', 'gross motor', 'coordination', 'balance', 'handwriting', 'scissors', 'grasp'],
  'other': [],
};

function inferCategory(text: string): GoalCategory {
  const lower = text.toLowerCase();
  let bestMatch: GoalCategory = 'other';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category as GoalCategory;
    }
  }

  return bestMatch;
}

// ---------------------------------------------------------------------------
// Priority inference
// ---------------------------------------------------------------------------

const HIGH_PRIORITY_SIGNALS = ['urgent', 'critical', 'immediately', 'safety', 'crisis', 'asap', 'daily required'];
const LOW_PRIORITY_SIGNALS = ['optional', 'if time', 'bonus', 'when possible', 'nice to have'];

function inferPriority(text: string): 'low' | 'medium' | 'high' {
  const lower = text.toLowerCase();
  if (HIGH_PRIORITY_SIGNALS.some(s => lower.includes(s))) return 'high';
  if (LOW_PRIORITY_SIGNALS.some(s => lower.includes(s))) return 'low';
  return 'medium';
}

// ---------------------------------------------------------------------------
// Frequency inference for home program
// ---------------------------------------------------------------------------

function inferFrequency(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('daily') || lower.includes('every day')) return 'Daily';
  if (lower.includes('twice') && lower.includes('day')) return 'Twice daily';
  if (lower.includes('3 times') || lower.includes('three times')) return '3 times per week';
  if (lower.includes('weekly') || lower.includes('once a week')) return 'Weekly';
  if (lower.includes('before') && (lower.includes('meal') || lower.includes('bed'))) return 'Before each meal/bedtime';
  return 'As recommended by provider';
}

function inferDifficulty(text: string): 'easy' | 'moderate' | 'challenging' {
  const lower = text.toLowerCase();
  if (lower.includes('simple') || lower.includes('easy') || lower.includes('basic')) return 'easy';
  if (lower.includes('challenging') || lower.includes('difficult') || lower.includes('complex')) return 'challenging';
  return 'moderate';
}

// ---------------------------------------------------------------------------
// 1. extractActionItems
// ---------------------------------------------------------------------------

/**
 * Parse structured PostSessionNotes into care plan action items.
 * The "planForNext7Days" entries become primary action items.
 * "whatToTrack" entries become monitoring/tracking items.
 */
export function extractActionItems(notes: PostSessionNotes): ExtractedActionItem[] {
  const items: ExtractedActionItem[] = [];
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Plan items become action items
  for (const planItem of notes.planForNext7Days) {
    const trimmed = planItem.trim();
    if (!trimmed) continue;

    items.push({
      title: trimmed,
      description: `From session: ${notes.reasonForVisit}`,
      priority: inferPriority(trimmed),
      category: inferCategory(trimmed),
      dueDate: sevenDaysFromNow,
      source: 'visit-summary',
    });
  }

  // Tracking items become lower-priority monitoring items
  for (const trackItem of notes.whatToTrack) {
    const trimmed = trackItem.trim();
    if (!trimmed) continue;

    items.push({
      title: `Track: ${trimmed}`,
      description: `Monitoring metric from session on ${new Date().toLocaleDateString()}`,
      priority: 'medium',
      category: inferCategory(trimmed),
      dueDate: sevenDaysFromNow,
      source: 'visit-summary',
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// 2. updateCarePlan
// ---------------------------------------------------------------------------

/**
 * Merge extracted action items into the existing care plan for a child.
 * Avoids duplicates by checking titles against existing active items.
 * Creates new goals when a category has no active goal.
 */
export async function updateCarePlan(
  userId: string,
  childId: string | undefined,
  actionItems: ExtractedActionItem[],
  visitSummaryId?: string,
): Promise<{ createdItems: ActionItem[]; createdGoals: CarePlanGoal[] }> {
  const createdItems: ActionItem[] = [];
  const createdGoals: CarePlanGoal[] = [];

  if (actionItems.length === 0) {
    return { createdItems, createdGoals };
  }

  // 1. Get existing active goals for dedup
  const existingGoals = await getGoals(userId, {
    status: 'active',
    childId: childId || undefined,
  });
  const existingGoalCategories = new Set(existingGoals.map(g => g.category));

  // 2. Create action items
  for (const item of actionItems) {
    try {
      const created = await createActionItem(userId, {
        title: item.title,
        description: item.description,
        dueDate: item.dueDate,
        priority: item.priority,
        source: item.source,
        childId,
        visitSummaryId,
        metadata: { category: item.category },
      });
      createdItems.push(created);
    } catch (err) {
      console.warn('[care-plan-updater] Failed to create action item:', err);
    }
  }

  // 3. Auto-create goals for categories that appear in notes but have no active goal
  const noteCategories = new Set(actionItems.map(i => i.category));
  for (const category of noteCategories) {
    if (category === 'other') continue;
    if (existingGoalCategories.has(category)) continue;

    // Find the most relevant action item for this category to derive the goal title
    const categoryItems = actionItems.filter(i => i.category === category);
    const representativeItem = categoryItems[0];

    try {
      const goal = await createGoal(userId, {
        title: representativeItem.title,
        description: `Goal created from session notes (${new Date().toLocaleDateString()})`,
        category,
        childId,
        targetProgress: 100,
        targetFrequency: 'Weekly check-in',
        unit: 'percent',
      });
      createdGoals.push(goal);
    } catch (err) {
      console.warn('[care-plan-updater] Failed to create goal:', err);
    }
  }

  return { createdItems, createdGoals };
}

// ---------------------------------------------------------------------------
// 3. generateHomeProgram
// ---------------------------------------------------------------------------

/**
 * Generate structured home practice recommendations from session notes.
 * This transforms the provider's "planForNext7Days" into a parent-friendly
 * home program with frequencies, difficulty levels, and tracking guidance.
 */
export function generateHomeProgram(notes: PostSessionNotes): HomeProgram {
  const items: HomeProgramItem[] = [];

  for (const planItem of notes.planForNext7Days) {
    const trimmed = planItem.trim();
    if (!trimmed) continue;

    const category = inferCategory(trimmed);
    const frequency = inferFrequency(trimmed);
    const difficulty = inferDifficulty(trimmed);

    items.push({
      title: trimmed,
      description: buildHomeDescription(trimmed, category),
      frequency,
      category,
      difficulty,
    });
  }

  // Parse follow-up date from recommendation
  let followUpDate: string | undefined;
  const followUp = notes.followUpRecommendation?.toLowerCase() || '';
  if (followUp.includes('1 week')) {
    followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (followUp.includes('2 week')) {
    followUpDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  } else if (followUp.includes('1 month')) {
    followUpDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  return {
    sessionDate: new Date().toISOString(),
    providerNotes: notes.reasonForVisit,
    items,
    trackingMetrics: notes.whatToTrack.filter(Boolean),
    followUpDate,
  };
}

/**
 * Build a parent-friendly description for a home program item.
 */
function buildHomeDescription(title: string, category: GoalCategory): string {
  const tips: Record<GoalCategory, string> = {
    'daily-routine': 'Use visual cues (pictures, timers) to support consistency. Start with the routine element your child is most comfortable with.',
    'communication': 'Model the target skill naturally throughout the day. Celebrate all attempts at communication, even if imperfect.',
    'sensory': 'Watch for your child\'s cues about when they need a sensory break. Keep preferred calming tools accessible.',
    'social': 'Create low-pressure opportunities for social practice. Structured activities with clear rules work best.',
    'self-care': 'Break the skill into small steps. Use backward chaining -- let your child complete the last step independently first.',
    'behavior': 'Focus on reinforcing the positive replacement behavior. Stay calm and consistent with your response.',
    'academic': 'Keep practice sessions short (5-10 minutes). End on a success to build confidence.',
    'motor': 'Incorporate practice into play and daily activities. Occupational therapy exercises work best when they feel fun.',
    'other': 'Follow the specific guidance from your provider. Track progress so we can adjust the plan at your next visit.',
  };

  return tips[category] || tips['other'];
}

// ---------------------------------------------------------------------------
// Integration helper: call from PostSessionNotes onSaved
// ---------------------------------------------------------------------------

/**
 * Complete care plan update pipeline. Call this from the PostSessionNotes
 * submit handler after the visit summary is saved.
 *
 * Usage:
 * ```ts
 * import { processSessionNotesForCarePlan } from '../../lib/care-plan-updater';
 *
 * // In PostSessionNotes handleSave, after createVisitSummary succeeds:
 * const results = await processSessionNotesForCarePlan({
 *   appointmentId, providerId, patientId, childId, reasonForVisit,
 *   whatWeDiscussed, planForNext7Days, whatToTrack, followUpRecommendation,
 * }, summary.id);
 * ```
 */
export async function processSessionNotesForCarePlan(
  notes: PostSessionNotes,
  visitSummaryId?: string,
): Promise<{
  actionItems: ActionItem[];
  goals: CarePlanGoal[];
  homeProgram: HomeProgram;
}> {
  // 1. Extract action items from structured notes
  const extracted = extractActionItems(notes);

  // 2. Merge into the existing care plan
  const { createdItems, createdGoals } = await updateCarePlan(
    notes.patientId,
    notes.childId,
    extracted,
    visitSummaryId,
  );

  // 3. Generate home program
  const homeProgram = generateHomeProgram(notes);

  if (import.meta.env.DEV) console.log(
    `[care-plan-updater] Processed session notes: ${createdItems.length} action items, ${createdGoals.length} new goals, ${homeProgram.items.length} home program items`,
  );

  return {
    actionItems: createdItems,
    goals: createdGoals,
    homeProgram,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default {
  extractActionItems,
  updateCarePlan,
  generateHomeProgram,
  processSessionNotesForCarePlan,
};
