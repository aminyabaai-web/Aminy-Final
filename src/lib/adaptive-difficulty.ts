/**
 * ML-Adaptive Difficulty System for Aminy Junior
 *
 * Replaces rule-based difficulty (parent-controlled 0-3) with
 * data-driven adaptive difficulty using a sigmoid threshold model.
 *
 * Algorithm:
 * 1. Track last 10 attempts per skill domain per child
 * 2. Calculate rolling accuracy (correct / total)
 * 3. Apply sigmoid smoothing to avoid rapid oscillation
 * 4. Auto-adjust level:
 *    - accuracy > 80% sustained → level up
 *    - accuracy < 40% sustained → level down
 *    - Hysteresis: require 3 consecutive sessions above/below threshold
 *
 * Storage: Supabase `adaptive_difficulty` table with localStorage fallback
 */

import { supabase } from '../utils/supabase/client';

// ============================================
// Types
// ============================================

export interface DifficultyState {
  childId: string;
  skillDomain: string;
  currentLevel: number; // 0-3
  rollingAccuracy: number; // 0-1
  recentAttempts: AttemptRecord[];
  totalAttempts: number;
  totalCorrect: number;
  levelChanges: LevelChange[];
  lastActivityAt?: string;
}

interface AttemptRecord {
  correct: boolean;
  timestamp: string;
  activityId?: string;
}

interface LevelChange {
  from: number;
  to: number;
  reason: string;
  timestamp: string;
  accuracy: number;
}

export interface DifficultyConfig {
  levelUpThreshold: number;     // Default: 0.8
  levelDownThreshold: number;   // Default: 0.4
  windowSize: number;           // Default: 10 (last N attempts)
  hysteresis: number;           // Default: 3 (consecutive sessions)
  maxLevel: number;             // Default: 3
  minLevel: number;             // Default: 0
}

const DEFAULT_CONFIG: DifficultyConfig = {
  levelUpThreshold: 0.8,
  levelDownThreshold: 0.4,
  windowSize: 10,
  hysteresis: 3,
  maxLevel: 3,
  minLevel: 0,
};

// ============================================
// Sigmoid Smoothing
// ============================================

/**
 * Sigmoid function for smooth difficulty transitions.
 * Maps accuracy (0-1) to a transition probability (0-1).
 * k = steepness, x0 = midpoint
 */
function sigmoid(x: number, x0: number = 0.5, k: number = 10): number {
  return 1 / (1 + Math.exp(-k * (x - x0)));
}

/**
 * Calculate level adjustment probability based on accuracy.
 * Returns: positive = should level up, negative = should level down, ~0 = stay
 */
function calculateAdjustment(
  accuracy: number,
  config: DifficultyConfig = DEFAULT_CONFIG
): number {
  if (accuracy >= config.levelUpThreshold) {
    // Probability of leveling up (sigmoid centered at threshold)
    return sigmoid(accuracy, config.levelUpThreshold, 12);
  } else if (accuracy <= config.levelDownThreshold) {
    // Probability of leveling down (inverted sigmoid)
    return -sigmoid(1 - accuracy, 1 - config.levelDownThreshold, 12);
  }
  return 0; // In the stable zone
}

// ============================================
// Core Functions
// ============================================

/**
 * Record an attempt and potentially adjust difficulty.
 * Returns the updated difficulty state.
 */
export async function recordAttempt(
  childId: string,
  skillDomain: string,
  correct: boolean,
  activityId?: string,
  config: DifficultyConfig = DEFAULT_CONFIG
): Promise<DifficultyState> {
  // Load current state
  let state = await loadDifficultyState(childId, skillDomain);

  if (!state) {
    state = createInitialState(childId, skillDomain);
  }

  // Add attempt to rolling window
  const attempt: AttemptRecord = {
    correct,
    timestamp: new Date().toISOString(),
    activityId,
  };

  state.recentAttempts.push(attempt);
  state.totalAttempts++;
  if (correct) state.totalCorrect++;
  state.lastActivityAt = attempt.timestamp;

  // Keep only last N attempts
  if (state.recentAttempts.length > config.windowSize) {
    state.recentAttempts = state.recentAttempts.slice(-config.windowSize);
  }

  // Calculate rolling accuracy
  const correctCount = state.recentAttempts.filter(a => a.correct).length;
  state.rollingAccuracy = state.recentAttempts.length > 0
    ? correctCount / state.recentAttempts.length
    : 0.5;

  // Check for level adjustment (only after enough data)
  if (state.recentAttempts.length >= config.hysteresis) {
    const adjustment = calculateAdjustment(state.rollingAccuracy, config);

    // Check hysteresis: last N attempts must all agree
    const recentN = state.recentAttempts.slice(-config.hysteresis);

    if (adjustment > 0.5 && state.currentLevel < config.maxLevel) {
      // Level up: all recent attempts must be above threshold
      const recentAccuracy = recentN.filter(a => a.correct).length / recentN.length;
      if (recentAccuracy >= config.levelUpThreshold) {
        const change: LevelChange = {
          from: state.currentLevel,
          to: state.currentLevel + 1,
          reason: `Accuracy ${(state.rollingAccuracy * 100).toFixed(0)}% over last ${config.windowSize} attempts`,
          timestamp: new Date().toISOString(),
          accuracy: state.rollingAccuracy,
        };
        state.currentLevel++;
        state.levelChanges.push(change);
      }
    } else if (adjustment < -0.5 && state.currentLevel > config.minLevel) {
      // Level down: all recent attempts must be below threshold
      const recentAccuracy = recentN.filter(a => a.correct).length / recentN.length;
      if (recentAccuracy <= config.levelDownThreshold) {
        const change: LevelChange = {
          from: state.currentLevel,
          to: state.currentLevel - 1,
          reason: `Accuracy ${(state.rollingAccuracy * 100).toFixed(0)}% over last ${config.windowSize} attempts`,
          timestamp: new Date().toISOString(),
          accuracy: state.rollingAccuracy,
        };
        state.currentLevel--;
        state.levelChanges.push(change);
      }
    }
  }

  // Persist updated state
  await saveDifficultyState(state);

  return state;
}

/**
 * Get recommended activity level for a skill domain.
 * Returns the current adaptive level (0-3).
 */
export async function getRecommendedLevel(
  childId: string,
  skillDomain: string
): Promise<number> {
  const state = await loadDifficultyState(childId, skillDomain);
  return state?.currentLevel ?? 0;
}

/**
 * Get difficulty states for all skill domains for a child.
 */
export async function getAllDifficultyStates(
  childId: string
): Promise<DifficultyState[]> {
  try {
    const { data, error } = await supabase
      .from('adaptive_difficulty')
      .select('*')
      .eq('child_id', childId);

    if (error) throw error;
    return (data || []).map(mapDbToState);
  } catch {
    return loadAllLocalStates(childId);
  }
}

/**
 * Override difficulty level manually (parent/therapist override).
 */
export async function overrideLevel(
  childId: string,
  skillDomain: string,
  newLevel: number,
  reason: string = 'Manual override'
): Promise<DifficultyState> {
  let state = await loadDifficultyState(childId, skillDomain);

  if (!state) {
    state = createInitialState(childId, skillDomain);
  }

  const change: LevelChange = {
    from: state.currentLevel,
    to: Math.max(0, Math.min(3, newLevel)),
    reason,
    timestamp: new Date().toISOString(),
    accuracy: state.rollingAccuracy,
  };

  state.currentLevel = change.to;
  state.levelChanges.push(change);

  await saveDifficultyState(state);
  return state;
}

// ============================================
// Persistence
// ============================================

function createInitialState(childId: string, skillDomain: string): DifficultyState {
  return {
    childId,
    skillDomain,
    currentLevel: 0,
    rollingAccuracy: 0.5,
    recentAttempts: [],
    totalAttempts: 0,
    totalCorrect: 0,
    levelChanges: [],
  };
}

async function loadDifficultyState(
  childId: string,
  skillDomain: string
): Promise<DifficultyState | null> {
  try {
    const { data, error } = await supabase
      .from('adaptive_difficulty')
      .select('*')
      .eq('child_id', childId)
      .eq('skill_domain', skillDomain)
      .single();

    if (error || !data) throw error;
    return mapDbToState(data);
  } catch {
    // Fallback to localStorage
    return loadLocalState(childId, skillDomain);
  }
}

async function saveDifficultyState(state: DifficultyState): Promise<void> {
  // Save locally first
  saveLocalState(state);

  // Save to Supabase
  try {
    await supabase
      .from('adaptive_difficulty')
      .upsert({
        child_id: state.childId,
        skill_domain: state.skillDomain,
        current_level: state.currentLevel,
        recent_attempts: state.recentAttempts,
        rolling_accuracy: state.rollingAccuracy,
        level_up_threshold: DEFAULT_CONFIG.levelUpThreshold,
        level_down_threshold: DEFAULT_CONFIG.levelDownThreshold,
        level_changes: state.levelChanges,
        total_attempts: state.totalAttempts,
        total_correct: state.totalCorrect,
        last_activity_at: state.lastActivityAt,
      }, {
        onConflict: 'child_id,skill_domain',
      });
  } catch (err) {
    console.error('Failed to save difficulty to Supabase:', err);
  }
}

// localStorage fallback
const LOCAL_KEY = 'aminy_adaptive_difficulty';

function loadLocalState(childId: string, skillDomain: string): DifficultyState | null {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    return all[`${childId}:${skillDomain}`] || null;
  } catch { return null; }
}

function loadAllLocalStates(childId: string): DifficultyState[] {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    return Object.entries(all)
      .filter(([key]) => key.startsWith(`${childId}:`))
      .map(([, value]) => value as DifficultyState);
  } catch { return []; }
}

function saveLocalState(state: DifficultyState): void {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    all[`${state.childId}:${state.skillDomain}`] = state;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch { /* non-critical */ }
}

function mapDbToState(row: Record<string, unknown>): DifficultyState {
  return {
    childId: row.child_id as string,
    skillDomain: row.skill_domain as string,
    currentLevel: row.current_level as number,
    rollingAccuracy: row.rolling_accuracy as number,
    recentAttempts: (row.recent_attempts || []) as AttemptRecord[],
    totalAttempts: row.total_attempts as number,
    totalCorrect: row.total_correct as number,
    levelChanges: (row.level_changes || []) as LevelChange[],
    lastActivityAt: row.last_activity_at as string | undefined,
  };
}

export default {
  recordAttempt,
  getRecommendedLevel,
  getAllDifficultyStates,
  overrideLevel,
};
