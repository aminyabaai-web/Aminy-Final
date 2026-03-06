/**
 * Onboarding Orchestrator
 *
 * After a parent completes the onboarding flow, this orchestrator
 * automatically runs all the downstream setup steps:
 *
 *   1. Create child profile in Supabase
 *   2. Run initial screening suggestions based on age/concerns
 *   3. Set up daily check-in notifications
 *   4. Create initial care plan goals from concerns
 *   5. Initialize conversation memory with onboarding data
 *
 * Each step is independent and wrapped in try/catch so a failure
 * in one step never blocks the others.
 */

import { supabase } from '../utils/supabase/client';
import {
  addChildProfile,
  type ChildProfile,
} from './user-settings';
import {
  routeConcernToScreener,
  type ConcernRoute,
  type ScreeningType,
} from './screening-instruments';
import {
  scheduleNotification,
  setupDailyCheckIns,
} from './push-notifications';
import {
  createGoal,
  type GoalCategory,
} from './care-plan';
import { storeMemoryFact } from './aminy-ai-brain';

// ============================================================================
// Types
// ============================================================================

export interface OnboardingData {
  userId: string;
  parentName: string;
  /** Child information gathered during onboarding */
  child: {
    name: string;
    dateOfBirth: string;
    pronouns: string;
    /** Parent's description of their concerns */
    concerns: string[];
    /** Conditions already diagnosed, if any */
    existingDiagnoses?: string[];
    /** Any existing providers */
    existingProviders?: Array<{ name: string; type: string }>;
  };
  /** State of residence (for benefits lookup) */
  state?: string;
  /** Insurance info if provided during onboarding */
  insurance?: {
    payerId: string;
    payerName: string;
    memberId: string;
  };
  /** Preferred notification time (HH:MM, default "09:00") */
  preferredNotificationTime?: string;
}

export interface OnboardingStep {
  step: string;
  status: 'pending' | 'running' | 'success' | 'skipped' | 'error';
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
  durationMs?: number;
}

export interface OnboardingResult {
  orchestrationId: string;
  userId: string;
  startedAt: string;
  completedAt: string;
  childProfile?: { id: string; name: string };
  screeningSuggestions?: {
    concerns: string[];
    recommendedScreeners: Array<{ concern: string; screeners: ScreeningType[] }>;
  };
  notifications?: { dailyCheckInsScheduled: boolean; welcomeScheduled: boolean };
  carePlanGoals?: { created: number; goalIds: string[] };
  conversationMemory?: { factsStored: number };
  steps: OnboardingStep[];
  errors: Array<{ step: string; error: string }>;
}

// ============================================================================
// Event Log
// ============================================================================

const onboarding_events: Array<{
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
  onboarding_events.push(entry);
  if (import.meta.env.DEV) console.log(`[onboarding-orchestrator] [${step}] ${event}`, data ?? '');
}

export function getOnboardingEvents() {
  return [...onboarding_events];
}

export function clearOnboardingEvents() {
  onboarding_events.length = 0;
}

// ============================================================================
// Main Orchestrator
// ============================================================================

export async function orchestrateOnboarding(
  data: OnboardingData
): Promise<OnboardingResult> {
  const orchestrationId = `onb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();

  const result: OnboardingResult = {
    orchestrationId,
    userId: data.userId,
    startedAt,
    completedAt: '',
    steps: [],
    errors: [],
  };

  logEvent(orchestrationId, 'orchestrator', 'started', {
    userId: data.userId,
    childName: data.child.name,
    concerns: data.child.concerns,
  });

  // ─── Step 1: Create Child Profile ────────────────────────────────────
  let childId: string | undefined;

  const childProfileStep = await runStep(orchestrationId, 'child-profile', async () => {
    const initials = data.child.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const profileResult = await addChildProfile(data.userId, {
      name: data.child.name,
      dateOfBirth: data.child.dateOfBirth,
      pronouns: data.child.pronouns,
      avatarInitials: initials,
      goals: data.child.concerns.slice(0, 3), // Seed initial goals from concerns
      juniorStatus: 'unpaired',
      careTeamNotesEnabled: false,
    });

    if (!profileResult.success) {
      throw new Error(profileResult.error ?? 'Failed to create child profile');
    }

    childId = profileResult.childId;
    return { id: profileResult.childId!, name: data.child.name };
  });

  result.steps.push(childProfileStep);
  if (childProfileStep.status === 'success' && childProfileStep.result) {
    const cpResult = childProfileStep.result as { id: string; name: string };
    result.childProfile = cpResult;
    childId = cpResult.id;
  } else if (childProfileStep.error) {
    result.errors.push({ step: 'child-profile', error: childProfileStep.error });
  }

  // ─── Step 2: Screening Suggestions Based on Concerns ─────────────────
  const screeningStep = await runStep(orchestrationId, 'screening-suggestions', async () => {
    const recommendations: Array<{ concern: string; screeners: ScreeningType[] }> = [];

    for (const concern of data.child.concerns) {
      const route = routeConcernToScreener(concern);
      if (route) {
        recommendations.push({
          concern: route.concern,
          screeners: route.recommendedScreeners,
        });
      }
    }

    // Persist recommendations to Supabase for the dashboard to pick up
    if (recommendations.length > 0 && childId) {
      const { error: persistError } = await supabase.from('screening_recommendations').insert({
        user_id: data.userId,
        child_id: childId,
        recommendations: recommendations,
        source: 'onboarding',
        created_at: new Date().toISOString(),
      });
      if (persistError) {
        // Non-critical persist failure
        console.warn('[onboarding-orchestrator] screening persist warning:', persistError.message);
      }
    }

    return {
      concerns: data.child.concerns,
      recommendedScreeners: recommendations,
    };
  });

  result.steps.push(screeningStep);
  if (screeningStep.status === 'success' && screeningStep.result) {
    result.screeningSuggestions = screeningStep.result as OnboardingResult['screeningSuggestions'];
  } else if (screeningStep.error) {
    result.errors.push({ step: 'screening-suggestions', error: screeningStep.error });
  }

  // ─── Step 3: Set Up Notifications ────────────────────────────────────
  const notificationStep = await runStep(orchestrationId, 'notifications', async () => {
    let dailyCheckInsScheduled = false;
    let welcomeScheduled = false;

    // Schedule daily check-ins
    try {
      await setupDailyCheckIns(
        data.userId,
        data.child.name,
        data.preferredNotificationTime ?? '09:00'
      );
      dailyCheckInsScheduled = true;
    } catch (err) {
      console.warn('[onboarding-orchestrator] daily check-ins setup failed:', err);
    }

    // Schedule a welcome notification for the next morning
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 30, 0, 0);

      const notifId = await scheduleNotification(data.userId, {
        userId: data.userId,
        title: 'Welcome to Aminy!',
        body: `Everything is set up for ${data.child.name}. Start your first daily check-in whenever you're ready.`,
        scheduledFor: tomorrow,
        type: 'custom',
        data: {
          route: '/dashboard',
          type: 'onboarding-welcome',
        },
      });
      welcomeScheduled = notifId !== null;
    } catch (err) {
      console.warn('[onboarding-orchestrator] welcome notification failed:', err);
    }

    return { dailyCheckInsScheduled, welcomeScheduled };
  });

  result.steps.push(notificationStep);
  if (notificationStep.status === 'success' && notificationStep.result) {
    result.notifications = notificationStep.result as OnboardingResult['notifications'];
  } else if (notificationStep.error) {
    result.errors.push({ step: 'notifications', error: notificationStep.error });
  }

  // ─── Step 4: Create Initial Care Plan Goals ──────────────────────────
  const goalsStep = await runStep(orchestrationId, 'care-plan-goals', async () => {
    const goalIds: string[] = [];

    for (const concern of data.child.concerns) {
      const goalData = concernToGoal(concern, data.child.name);
      if (goalData) {
        const goal = await createGoal(data.userId, {
          childId: childId,
          title: goalData.title,
          description: goalData.description,
          category: goalData.category,
          targetFrequency: goalData.targetFrequency,
          targetProgress: 100,
          unit: 'percent',
          metadata: {
            source: 'onboarding',
            originalConcern: concern,
          },
        });
        goalIds.push(goal.id);
      }
    }

    return { created: goalIds.length, goalIds };
  });

  result.steps.push(goalsStep);
  if (goalsStep.status === 'success' && goalsStep.result) {
    const gResult = goalsStep.result as { created: number; goalIds: string[] };
    result.carePlanGoals = gResult;
  } else if (goalsStep.error) {
    result.errors.push({ step: 'care-plan-goals', error: goalsStep.error });
  }

  // ─── Step 5: Initialize Conversation Memory ─────────────────────────
  const memoryStep = await runStep(orchestrationId, 'conversation-memory', async () => {
    if (!childId) {
      return { skipped: true, reason: 'No child ID available', factsStored: 0 };
    }

    let factsStored = 0;

    // Store child's name and age
    await storeMemoryFact(
      childId,
      'preference',
      `Child's name is ${data.child.name}, born ${data.child.dateOfBirth}`,
      'onboarding',
      1.0
    );
    factsStored++;

    // Store each concern
    for (const concern of data.child.concerns) {
      await storeMemoryFact(
        childId,
        'challenge',
        `Parent concern from onboarding: ${concern}`,
        'onboarding',
        0.9
      );
      factsStored++;
    }

    // Store existing diagnoses
    if (data.child.existingDiagnoses?.length) {
      await storeMemoryFact(
        childId,
        'medical',
        `Existing diagnoses: ${data.child.existingDiagnoses.join(', ')}`,
        'onboarding',
        1.0
      );
      factsStored++;
    }

    // Store existing providers
    if (data.child.existingProviders?.length) {
      for (const provider of data.child.existingProviders) {
        await storeMemoryFact(
          childId,
          'medical',
          `Has existing provider: ${provider.name} (${provider.type})`,
          'onboarding',
          0.9
        );
        factsStored++;
      }
    }

    // Store state for benefits context
    if (data.state) {
      await storeMemoryFact(
        childId,
        'medical',
        `Family resides in ${data.state}`,
        'onboarding',
        1.0
      );
      factsStored++;
    }

    return { factsStored };
  });

  result.steps.push(memoryStep);
  if (memoryStep.status === 'success' && memoryStep.result) {
    const mResult = memoryStep.result as { factsStored: number; skipped?: boolean };
    if (!mResult.skipped) {
      result.conversationMemory = { factsStored: mResult.factsStored };
    }
  } else if (memoryStep.error) {
    result.errors.push({ step: 'conversation-memory', error: memoryStep.error });
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
  persistOnboardingResult(result).catch(err => {
    console.warn('[onboarding-orchestrator] Failed to persist result:', err);
  });

  return result;
}

// ============================================================================
// Step Runner (same pattern as session-orchestrator)
// ============================================================================

async function runStep(
  orchestrationId: string,
  stepName: string,
  fn: () => Promise<unknown>
): Promise<OnboardingStep> {
  const step: OnboardingStep = {
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
 * Map a parent concern string to an initial care plan goal.
 */
function concernToGoal(
  concern: string,
  childName: string
): { title: string; description: string; category: GoalCategory; targetFrequency?: string } | null {
  const lower = concern.toLowerCase();

  if (lower.includes('speech') || lower.includes('talk') || lower.includes('language') || lower.includes('communication')) {
    return {
      title: `Improve ${childName}'s communication skills`,
      description: `Work on speech and language development based on parent concern: "${concern}"`,
      category: 'communication',
      targetFrequency: '3x per week',
    };
  }

  if (lower.includes('behavior') || lower.includes('meltdown') || lower.includes('tantrum') || lower.includes('aggression')) {
    return {
      title: `Reduce challenging behaviors`,
      description: `Address behavioral concerns: "${concern}". Track frequency and develop replacement strategies.`,
      category: 'behavior',
      targetFrequency: 'daily tracking',
    };
  }

  if (lower.includes('routine') || lower.includes('morning') || lower.includes('bedtime') || lower.includes('transition')) {
    return {
      title: `Establish consistent daily routines`,
      description: `Build predictable routines to support ${childName}: "${concern}"`,
      category: 'daily-routine',
      targetFrequency: 'daily',
    };
  }

  if (lower.includes('social') || lower.includes('friend') || lower.includes('play') || lower.includes('peer')) {
    return {
      title: `Build social skills and peer connections`,
      description: `Support ${childName}'s social development: "${concern}"`,
      category: 'social',
      targetFrequency: '2x per week',
    };
  }

  if (lower.includes('sensory') || lower.includes('loud') || lower.includes('texture') || lower.includes('overwhelm')) {
    return {
      title: `Develop sensory coping strategies`,
      description: `Help ${childName} manage sensory experiences: "${concern}"`,
      category: 'sensory',
      targetFrequency: 'as needed',
    };
  }

  if (lower.includes('anxiety') || lower.includes('worried') || lower.includes('scared') || lower.includes('fear')) {
    return {
      title: `Reduce anxiety and build coping skills`,
      description: `Address anxiety concerns for ${childName}: "${concern}"`,
      category: 'behavior',
      targetFrequency: 'daily check-in',
    };
  }

  if (lower.includes('school') || lower.includes('academic') || lower.includes('learning') || lower.includes('reading')) {
    return {
      title: `Support academic progress`,
      description: `Address learning concerns for ${childName}: "${concern}"`,
      category: 'academic',
      targetFrequency: 'weekly review',
    };
  }

  if (lower.includes('self-care') || lower.includes('dressing') || lower.includes('bathroom') || lower.includes('eating')) {
    return {
      title: `Build independence in self-care`,
      description: `Help ${childName} develop self-care skills: "${concern}"`,
      category: 'self-care',
      targetFrequency: 'daily',
    };
  }

  // Generic fallback
  return {
    title: `Address concern: ${concern.slice(0, 50)}`,
    description: `Parent reported concern during onboarding: "${concern}"`,
    category: 'other',
  };
}

/**
 * Persist onboarding orchestration result to Supabase.
 */
async function persistOnboardingResult(result: OnboardingResult): Promise<void> {
  try {
    await supabase.from('orchestration_events').insert({
      id: result.orchestrationId,
      session_id: null,
      type: 'onboarding',
      started_at: result.startedAt,
      completed_at: result.completedAt,
      steps: result.steps,
      errors: result.errors,
      metadata: {
        childId: result.childProfile?.id,
        goalsCreated: result.carePlanGoals?.created ?? 0,
        factsStored: result.conversationMemory?.factsStored ?? 0,
        screenersRecommended: result.screeningSuggestions?.recommendedScreeners.length ?? 0,
      },
    });
  } catch (err) {
    console.warn('[onboarding-orchestrator] persistOnboardingResult error:', err);
  }
}
