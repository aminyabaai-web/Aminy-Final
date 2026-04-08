// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Parent-Junior Bridge
 *
 * Connects parent AI context to Junior AI activity recommendations,
 * and sends Junior progress data back to the parent AI.
 *
 * Flow:
 * 1. Parent sets focus areas (speech, social, regulation) via AI chat or settings
 * 2. Bridge stores focus areas as MemoryFacts
 * 3. Junior reads focus areas → passed to recommender as recentGoals + enabledDomains
 * 4. Junior completes activities → progress stored as MemoryFacts
 * 5. Parent AI reads Junior progress → surfaces in chat and weekly summary
 *
 * Provider integration (with parent consent):
 * - Provider can also set focus areas (tagged source: 'provider')
 * - Provider can view Junior progress via Care Team dashboard
 */

import { memoryManager, type MemoryFact } from './memory-system';
import type { TierType } from './tier-utils';
import { persistJuniorProgress } from './caregiver-workflow';
import { setWorkflowSyncStatus } from './core-workflow-sync';

// ============================================
// TYPES
// ============================================

export type FocusDomain = 'speech' | 'social' | 'regulation' | 'routines' | 'sensory' | 'executive' | 'aac';

export interface FocusArea {
  domain: FocusDomain;
  goals: string[];         // e.g., ["practice /s/ blends", "greetings with peers"]
  priority: 'high' | 'medium' | 'low';
  setBy: 'parent' | 'provider';
  providerRole?: string;   // e.g., 'slp', 'bcba' — when set by provider
}

export interface JuniorProgressEntry {
  activityId: string;
  activityTitle: string;
  domain: FocusDomain;
  completedAt: string;
  durationSeconds: number;
  accuracy?: number;       // 0-100
  promptLevel?: number;    // 0-5 (0 = independent, 5 = full physical)
  tokensEarned: number;
  emotionBefore?: string;
  emotionAfter?: string;
  notes?: string;          // e.g., "First time completing independently"
}

export interface JuniorWeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalSessions: number;
  totalMinutes: number;
  tokensEarned: number;
  domainBreakdown: Record<FocusDomain, {
    sessions: number;
    avgAccuracy: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  calmCornerUsage: {
    count: number;
    avgDuration: number;
    topEmotionBefore: string;
    topEmotionAfter: string;
  };
  highlights: string[];    // e.g., ["Mastered /s/ blends!", "3-day streak"]
  concerns: string[];      // e.g., ["Accuracy declining in social skills"]
}

// ============================================
// CACHE HELPERS — shared contract with useJuniorData hook
// The hook writes Supabase-first + caches here; bridge reads from cache.
// ============================================

const CACHE_KEYS = {
  FOCUS_AREAS: 'aminy-junior-focus-areas',
  PROGRESS: 'aminy-junior-progress',
  ACCESS_MODE: 'aminy-junior-access-mode',
  DIFFICULTY: 'aminy-junior-difficulty',
  AVOIDANCE: 'aminy-junior-avoidance-triggers',
  RECOMMENDATIONS: 'aminy-junior-recommendations',
} as const;

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or blocked */ }
}

// ============================================
// PARENT → JUNIOR: Focus Areas
// ============================================

/**
 * Set focus areas for a child. Called by parent AI chat or settings screen.
 * These drive Junior's activity recommendations.
 */
export function setFocusAreas(childId: string, areas: FocusArea[]): void {
  const stored = getAllFocusAreas();
  stored[childId] = areas;
  writeCache(CACHE_KEYS.FOCUS_AREAS, stored);

  // Also store as MemoryFacts so parent AI can reference them
  areas.forEach(area => {
    memoryManager.addFact({
      childId,
      category: 'strategy',
      content: `Focus area: ${area.domain} (${area.priority} priority) — Goals: ${area.goals.join(', ')}. Set by ${area.setBy}${area.providerRole ? ` (${area.providerRole})` : ''}.`,
      source: area.setBy === 'provider' ? 'provider' : 'manual',
      confidence: 1.0,
    });
  });
}

/**
 * Get focus areas for a child. Called by Junior to feed the recommender.
 */
export function getFocusAreas(childId: string): FocusArea[] {
  const stored = getAllFocusAreas();
  return stored[childId] || [];
}

/**
 * Convert focus areas to recommender inputs.
 * Returns { recentGoals, enabledDomains } matching RecommendationContext.
 */
export function toRecommenderContext(childId: string): {
  recentGoals: string[];
  enabledDomains: string[];
} {
  const areas = getFocusAreas(childId);

  if (areas.length === 0) {
    // No focus areas set — allow all domains, no specific goals
    return { recentGoals: [], enabledDomains: [] };
  }

  // Flatten goals from all focus areas, weighted by priority
  const recentGoals: string[] = [];
  const enabledDomains: string[] = [];

  areas.forEach(area => {
    enabledDomains.push(area.domain);

    // High priority goals appear multiple times → higher recommender score
    const weight = area.priority === 'high' ? 3 : area.priority === 'medium' ? 2 : 1;
    for (let i = 0; i < weight; i++) {
      recentGoals.push(...area.goals);
    }
  });

  return {
    recentGoals: [...new Set(recentGoals)], // deduplicate
    enabledDomains: [...new Set(enabledDomains)],
  };
}

function getAllFocusAreas(): Record<string, FocusArea[]> {
  return readCache<Record<string, FocusArea[]>>(CACHE_KEYS.FOCUS_AREAS, {});
}

// ============================================
// JUNIOR → PARENT: Progress Tracking
// ============================================

/**
 * Record a completed Junior activity. Called by JuniorPageEnhancedPro
 * after each activity completion.
 */
export function recordJuniorProgress(childId: string, entry: JuniorProgressEntry): void {
  const all = getAllProgress();
  if (!all[childId]) all[childId] = [];
  all[childId].push(entry);

  // Keep last 500 entries per child
  if (all[childId].length > 500) {
    all[childId] = all[childId].slice(-500);
  }

  writeCache(CACHE_KEYS.PROGRESS, all);

  setWorkflowSyncStatus('juniorProgress', 'pending_sync');
  void persistJuniorProgress({
    childId,
    activityId: entry.activityId,
    activityTitle: entry.activityTitle,
    domain: entry.domain,
    completedAt: entry.completedAt,
    durationSeconds: entry.durationSeconds,
    accuracy: entry.accuracy,
    promptLevel: entry.promptLevel,
    tokensEarned: entry.tokensEarned,
    emotionBefore: entry.emotionBefore,
    emotionAfter: entry.emotionAfter,
    notes: entry.notes,
  }).catch((error) => {
    console.warn('[JuniorBridge] Failed to sync progress to Supabase:', error);
    setWorkflowSyncStatus('juniorProgress', 'sync_failed');
  });

  // Store milestone facts for parent AI
  if (entry.accuracy && entry.accuracy >= 90) {
    memoryManager.addFact({
      childId,
      category: 'milestone',
      content: `Junior: ${entry.activityTitle} completed with ${entry.accuracy}% accuracy (${entry.domain} domain). ${entry.promptLevel === 0 ? 'Independently!' : `Prompt level: ${entry.promptLevel}.`}`,
      source: 'conversation',
      confidence: 0.95,
    });
  }

  // Store emotion regulation data
  if (entry.emotionBefore && entry.emotionAfter && entry.domain === 'regulation') {
    memoryManager.addFact({
      childId,
      category: 'strategy',
      content: `Calm corner: went from "${entry.emotionBefore}" to "${entry.emotionAfter}" in ${Math.round(entry.durationSeconds / 60)} min using ${entry.activityTitle}.`,
      source: 'conversation',
      confidence: 0.9,
    });
  }
}

/**
 * Get recent Junior progress. Called by parent AI to build context.
 */
export function getRecentProgress(childId: string, limit: number = 20): JuniorProgressEntry[] {
  const all = getAllProgress();
  const entries = all[childId] || [];
  return entries.slice(-limit);
}

/**
 * Get progress for a specific domain. Useful for parent AI to answer
 * "how is my child doing with speech?"
 */
export function getProgressByDomain(childId: string, domain: FocusDomain): JuniorProgressEntry[] {
  const all = getAllProgress();
  return (all[childId] || []).filter(e => e.domain === domain);
}

/**
 * Generate a weekly summary for the parent AI or weekly email.
 */
export function generateWeeklySummary(childId: string): JuniorWeeklySummary | null {
  const all = getAllProgress();
  const entries = all[childId] || [];

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStart = weekAgo.toISOString();
  const weekEnd = new Date().toISOString();

  const thisWeek = entries.filter(e => new Date(e.completedAt) >= weekAgo);

  if (thisWeek.length === 0) return null;

  // Domain breakdown
  const domains: FocusDomain[] = ['speech', 'social', 'regulation', 'routines', 'sensory', 'executive', 'aac'];
  const domainBreakdown = {} as Record<FocusDomain, { sessions: number; avgAccuracy: number; trend: 'improving' | 'stable' | 'declining' }>;

  domains.forEach(domain => {
    const domainEntries = thisWeek.filter(e => e.domain === domain);
    if (domainEntries.length === 0) {
      domainBreakdown[domain] = { sessions: 0, avgAccuracy: 0, trend: 'stable' };
      return;
    }

    const avgAcc = domainEntries
      .filter(e => e.accuracy !== undefined)
      .reduce((sum, e) => sum + (e.accuracy || 0), 0) / Math.max(domainEntries.filter(e => e.accuracy !== undefined).length, 1);

    // Trend: compare first half vs second half of week
    const mid = Math.floor(domainEntries.length / 2);
    const firstHalf = domainEntries.slice(0, mid);
    const secondHalf = domainEntries.slice(mid);
    const firstAvg = firstHalf.filter(e => e.accuracy !== undefined).reduce((s, e) => s + (e.accuracy || 0), 0) / Math.max(firstHalf.length, 1);
    const secondAvg = secondHalf.filter(e => e.accuracy !== undefined).reduce((s, e) => s + (e.accuracy || 0), 0) / Math.max(secondHalf.length, 1);
    const trend = secondAvg > firstAvg + 5 ? 'improving' : secondAvg < firstAvg - 5 ? 'declining' : 'stable';

    domainBreakdown[domain] = {
      sessions: domainEntries.length,
      avgAccuracy: Math.round(avgAcc),
      trend,
    };
  });

  // Calm corner usage
  const calmEntries = thisWeek.filter(e => e.domain === 'regulation');
  const emotionsBefore = calmEntries.map(e => e.emotionBefore).filter(Boolean);
  const emotionsAfter = calmEntries.map(e => e.emotionAfter).filter(Boolean);
  const topEmotion = (arr: string[]) => {
    const counts: Record<string, number> = {};
    arr.forEach(e => { counts[e!] = (counts[e!] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
  };

  // Highlights
  const highlights: string[] = [];
  const concerns: string[] = [];

  // Check for streaks
  const uniqueDays = new Set(thisWeek.map(e => new Date(e.completedAt).toDateString()));
  if (uniqueDays.size >= 5) highlights.push(`${uniqueDays.size}-day practice streak!`);
  if (uniqueDays.size >= 3) highlights.push(`Active ${uniqueDays.size} days this week`);

  // Check for mastery
  domains.forEach(domain => {
    if (domainBreakdown[domain].avgAccuracy >= 90 && domainBreakdown[domain].sessions >= 3) {
      highlights.push(`Excellent ${domain} performance (${domainBreakdown[domain].avgAccuracy}% avg)`);
    }
    if (domainBreakdown[domain].trend === 'improving') {
      highlights.push(`${domain} skills trending upward`);
    }
    if (domainBreakdown[domain].trend === 'declining' && domainBreakdown[domain].sessions >= 3) {
      concerns.push(`${domain} accuracy declining — may need difficulty adjustment`);
    }
  });

  // Token milestone
  const totalTokens = thisWeek.reduce((s, e) => s + e.tokensEarned, 0);
  if (totalTokens >= 20) highlights.push(`Earned ${totalTokens} tokens this week!`);

  return {
    weekStart,
    weekEnd,
    totalSessions: thisWeek.length,
    totalMinutes: Math.round(thisWeek.reduce((s, e) => s + e.durationSeconds, 0) / 60),
    tokensEarned: totalTokens,
    domainBreakdown,
    calmCornerUsage: {
      count: calmEntries.length,
      avgDuration: calmEntries.length > 0
        ? Math.round(calmEntries.reduce((s, e) => s + e.durationSeconds, 0) / calmEntries.length)
        : 0,
      topEmotionBefore: topEmotion(emotionsBefore as string[]),
      topEmotionAfter: topEmotion(emotionsAfter as string[]),
    },
    highlights,
    concerns,
  };
}

function getAllProgress(): Record<string, JuniorProgressEntry[]> {
  return readCache<Record<string, JuniorProgressEntry[]>>(CACHE_KEYS.PROGRESS, {});
}

// ============================================
// ACCESS MODE: Parent controls Junior availability
// ============================================

export type JuniorAccessMode = 'open' | 'earned' | 'scheduled';

export interface JuniorAccessConfig {
  mode: JuniorAccessMode;
  // 'open' — child can open Junior anytime
  // 'earned' — Junior time is contingent on completing tasks (parent sets tasks)
  // 'scheduled' — Junior available only during specific times
  calmCornerAlwaysAvailable: boolean; // Calm corner bypasses access restrictions
  dailyTimeLimitMinutes?: number;     // Optional daily time cap
  scheduledWindows?: Array<{          // For 'scheduled' mode
    dayOfWeek: number;
    startHour: number;
    endHour: number;
  }>;
}

export function setAccessConfig(childId: string, config: JuniorAccessConfig): void {
  const all = getAllAccessConfigs();
  all[childId] = config;
  writeCache(CACHE_KEYS.ACCESS_MODE, all);
}

export function getAccessConfig(childId: string): JuniorAccessConfig {
  const all = getAllAccessConfigs();
  return all[childId] || {
    mode: 'open',
    calmCornerAlwaysAvailable: true,
  };
}

/**
 * Check if Junior is currently accessible for a child.
 * Calm corner may bypass restrictions if parent configured it.
 */
export function isJuniorAccessible(childId: string, requestingCalmCorner: boolean = false): {
  accessible: boolean;
  reason?: string;
} {
  const config = getAccessConfig(childId);

  // Calm corner always available if parent allows it
  if (requestingCalmCorner && config.calmCornerAlwaysAvailable) {
    return { accessible: true };
  }

  switch (config.mode) {
    case 'open':
      return { accessible: true };

    case 'earned': {
      // In earned mode, parent must explicitly unlock
      // Check localStorage for current unlock status
      const unlocked = readCache<string>(`aminy-junior-unlocked-${childId}`, 'false');
      if (unlocked === 'true') {
        return { accessible: true };
      }
      return {
        accessible: false,
        reason: 'Junior time needs to be earned! Ask your parent to unlock it.',
      };
    }

    case 'scheduled': {
      if (!config.scheduledWindows || config.scheduledWindows.length === 0) {
        return { accessible: true }; // No windows = always open
      }
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      const inWindow = config.scheduledWindows.some(w =>
        w.dayOfWeek === currentDay && currentHour >= w.startHour && currentHour < w.endHour
      );
      if (inWindow) {
        return { accessible: true };
      }
      return {
        accessible: false,
        reason: "Junior time is scheduled — it's not time yet! Check back later.",
      };
    }

    default:
      return { accessible: true };
  }
}

/**
 * Parent unlocks Junior for the child (in 'earned' mode).
 * Optionally set an expiry (e.g., 30 minutes of Junior time).
 */
export function unlockJunior(childId: string, durationMinutes?: number): void {
  writeCache(`aminy-junior-unlocked-${childId}`, 'true');

  if (durationMinutes) {
    setTimeout(() => {
      writeCache(`aminy-junior-unlocked-${childId}`, 'false');
    }, durationMinutes * 60 * 1000);
  }
}

function getAllAccessConfigs(): Record<string, JuniorAccessConfig> {
  return readCache<Record<string, JuniorAccessConfig>>(CACHE_KEYS.ACCESS_MODE, {});
}

// ============================================
// PARENT → JUNIOR: Bidirectional Cross-Learning
// ============================================

// Keys now defined in CACHE_KEYS at top of file

export type DifficultyLevel = 'easier' | 'same' | 'harder';

export interface JuniorDifficultyOverride {
  domain: FocusDomain;
  level: DifficultyLevel;
  setAt: string;
  reason?: string;
}

export interface JuniorAvoidanceTrigger {
  trigger: string;       // e.g., "loud noises", "timed activities", "competitive games"
  addedAt: string;
  source: 'parent' | 'ai';
  notes?: string;
}

export interface JuniorRecommendation {
  domain: FocusDomain;
  suggestion: string;    // e.g., "Try harder speech exercises"
  difficulty: DifficultyLevel;
  generatedAt: string;
  applied: boolean;
}

/**
 * Parent AI adjusts Junior activity difficulty for a specific domain.
 * Called after AI response suggests changes (e.g., "speech exercises are too easy").
 */
export function setJuniorDifficultyFromParent(childId: string, domain: FocusDomain, level: DifficultyLevel, reason?: string): void {
  const stored = readCache<Record<string, JuniorDifficultyOverride[]>>(CACHE_KEYS.DIFFICULTY, {});
  if (!stored[childId]) stored[childId] = [];

  // Replace existing override for this domain, or add new
  const existing = stored[childId];
  const idx = existing.findIndex((d: JuniorDifficultyOverride) => d.domain === domain);
  const override: JuniorDifficultyOverride = { domain, level, setAt: new Date().toISOString(), reason };

  if (idx >= 0) {
    existing[idx] = override;
  } else {
    existing.push(override);
  }

  stored[childId] = existing;
  writeCache(CACHE_KEYS.DIFFICULTY, stored);

  // Store as memory fact for AI context
  memoryManager.addFact({
    childId,
    category: 'strategy',
    content: `Junior difficulty adjusted: ${domain} set to "${level}"${reason ? ` — ${reason}` : ''}.`,
    source: 'conversation',
    confidence: 0.9,
  });
}

/**
 * Get all difficulty overrides for a child.
 * Junior reads these on mount to adjust activity levels.
 */
export function getJuniorDifficultyOverrides(childId: string): JuniorDifficultyOverride[] {
  const stored = readCache<Record<string, JuniorDifficultyOverride[]>>(CACHE_KEYS.DIFFICULTY, {});
  return stored[childId] || [];
}

/**
 * Add an avoidance trigger noted by parent AI.
 * e.g., Parent says "he gets overwhelmed by timed activities" → Junior filters those out.
 */
export function addJuniorAvoidanceTrigger(childId: string, trigger: string, source: 'parent' | 'ai' = 'ai', notes?: string): void {
  const stored = readCache<Record<string, JuniorAvoidanceTrigger[]>>(CACHE_KEYS.AVOIDANCE, {});
  if (!stored[childId]) stored[childId] = [];

  const triggers = stored[childId];
  // Don't duplicate
  if (triggers.some((t: JuniorAvoidanceTrigger) => t.trigger.toLowerCase() === trigger.toLowerCase())) return;

  triggers.push({ trigger, addedAt: new Date().toISOString(), source, notes });
  stored[childId] = triggers;
  writeCache(CACHE_KEYS.AVOIDANCE, stored);

  memoryManager.addFact({
    childId,
    category: 'trigger' as const,
    content: `Avoidance trigger for Junior: "${trigger}"${notes ? ` — ${notes}` : ''}.`,
    source: 'conversation',
    confidence: 0.85,
  });
}

/**
 * Get all avoidance triggers for a child.
 * Junior reads these to filter out activities that may cause distress.
 */
export function getJuniorAvoidanceTriggers(childId: string): JuniorAvoidanceTrigger[] {
  const stored = readCache<Record<string, JuniorAvoidanceTrigger[]>>(CACHE_KEYS.AVOIDANCE, {});
  return stored[childId] || [];
}

/**
 * Remove an avoidance trigger (parent decides it's no longer needed).
 */
export function removeJuniorAvoidanceTrigger(childId: string, trigger: string): void {
  const stored = readCache<Record<string, JuniorAvoidanceTrigger[]>>(CACHE_KEYS.AVOIDANCE, {});
  if (!stored[childId]) return;
  stored[childId] = stored[childId].filter(
    (t: JuniorAvoidanceTrigger) => t.trigger.toLowerCase() !== trigger.toLowerCase()
  );
  writeCache(CACHE_KEYS.AVOIDANCE, stored);
}

/**
 * Get AI-generated recommendations for Junior based on Parent AI analysis.
 * Returns suggestions like "try harder speech exercises" with domain + difficulty.
 */
export function getJuniorRecommendations(childId: string): JuniorRecommendation[] {
  const stored = readCache<Record<string, JuniorRecommendation[]>>(CACHE_KEYS.RECOMMENDATIONS, {});
  return stored[childId] || [];
}

/**
 * Store a recommendation from the Parent AI for Junior.
 * Called when AI response contains actionable Junior suggestions.
 */
export function addJuniorRecommendation(childId: string, rec: Omit<JuniorRecommendation, 'generatedAt' | 'applied'>): void {
  const stored = readCache<Record<string, JuniorRecommendation[]>>(CACHE_KEYS.RECOMMENDATIONS, {});
  if (!stored[childId]) stored[childId] = [];

  const recs = stored[childId];
  // Keep last 20 recommendations
  if (recs.length >= 20) recs.shift();
  recs.push({ ...rec, generatedAt: new Date().toISOString(), applied: false });
  stored[childId] = recs;
  writeCache(CACHE_KEYS.RECOMMENDATIONS, stored);
}

/**
 * Mark a recommendation as applied (Junior acted on it).
 */
export function markRecommendationApplied(childId: string, index: number): void {
  const stored = readCache<Record<string, JuniorRecommendation[]>>(CACHE_KEYS.RECOMMENDATIONS, {});
  if (stored[childId]?.[index]) {
    stored[childId][index].applied = true;
    writeCache(CACHE_KEYS.RECOMMENDATIONS, stored);
  }
}

// ============================================
// PARENT AI CONTEXT BUILDER
// ============================================

/**
 * Build context string for the parent AI chat.
 * Includes Junior progress, focus areas, and recent highlights.
 * Called when parent opens AI chat to provide context about Junior usage.
 */
export function buildParentAIContext(childId: string, tier: TierType): string {
  const focusAreas = getFocusAreas(childId);
  const recent = getRecentProgress(childId, 10);
  const summary = generateWeeklySummary(childId);

  const parts: string[] = [];

  // Focus areas
  if (focusAreas.length > 0) {
    parts.push('**Junior Focus Areas:**');
    focusAreas.forEach(a => {
      parts.push(`- ${a.domain} (${a.priority}): ${a.goals.join(', ')} [set by ${a.setBy}]`);
    });
  }

  // Weekly summary
  if (summary) {
    parts.push(`\n**This Week in Junior:** ${summary.totalSessions} sessions, ${summary.totalMinutes} minutes, ${summary.tokensEarned} tokens earned.`);
    if (summary.highlights.length > 0) {
      parts.push(`Highlights: ${summary.highlights.join('; ')}`);
    }
    if (summary.concerns.length > 0) {
      parts.push(`Concerns: ${summary.concerns.join('; ')}`);
    }
    if (summary.calmCornerUsage.count > 0) {
      parts.push(`Calm corner used ${summary.calmCornerUsage.count}x (most common emotion before: ${summary.calmCornerUsage.topEmotionBefore}, after: ${summary.calmCornerUsage.topEmotionAfter}).`);
    }
  }

  // Recent activity (last 5)
  if (recent.length > 0) {
    parts.push('\n**Recent Junior Activities:**');
    recent.slice(-5).forEach(e => {
      const acc = e.accuracy !== undefined ? ` — ${e.accuracy}% accuracy` : '';
      parts.push(`- ${e.activityTitle} (${e.domain})${acc}`);
    });
  }

  // Difficulty overrides (parent-set adjustments)
  const overrides = getJuniorDifficultyOverrides(childId);
  if (overrides.length > 0) {
    parts.push('\n**Active Junior Adjustments:**');
    overrides.forEach(o => {
      parts.push(`- ${o.domain}: difficulty set to "${o.level}"${o.reason ? ` (${o.reason})` : ''}`);
    });
  }

  // Avoidance triggers
  const triggers = getJuniorAvoidanceTriggers(childId);
  if (triggers.length > 0) {
    parts.push(`\n**Avoidance Triggers:** ${triggers.map(t => t.trigger).join(', ')}`);
  }

  // Pending recommendations
  const recs = getJuniorRecommendations(childId).filter(r => !r.applied);
  if (recs.length > 0) {
    parts.push('\n**Pending Junior Recommendations:**');
    recs.slice(-3).forEach(r => {
      parts.push(`- ${r.domain}: ${r.suggestion} (${r.difficulty})`);
    });
  }

  // Instruction to AI: suggest Junior adjustments when appropriate
  parts.push('\n*You can suggest Junior activity adjustments. Use phrases like "I recommend making [domain] exercises [easier/harder]" or "We should avoid [trigger] activities for now." These will automatically update Junior.*');

  return parts.join('\n');
}
