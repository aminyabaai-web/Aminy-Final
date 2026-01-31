/**
 * Calm Tools Progress Tracking
 * Track usage and effectiveness of sensory/calming activities
 *
 * Saves all calm tool usage to database with effectiveness metrics
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type CalmToolType =
  | 'breathing'
  | 'visual-timer'
  | 'bubble-pop'
  | 'fluid-swirl'
  | 'fidget-spinner'
  | 'grounding'
  | 'body-scan'
  | 'music'
  | 'white-noise'
  | 'counting'
  | 'squeeze'
  | 'shake-it-out';

export type MoodLevel = 1 | 2 | 3 | 4 | 5; // 1=very calm, 5=very agitated

export interface CalmToolSession {
  id: string;
  userId: string;
  childId?: string;
  toolType: CalmToolType;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  moodBefore?: MoodLevel;
  moodAfter?: MoodLevel;
  wasEffective?: boolean;
  triggeredBy?: string; // e.g., "transition", "sensory", "frustration"
  context?: string; // Where/when used
  notes?: string;
  coinsEarned: number;
}

export interface CalmToolStats {
  toolType: CalmToolType;
  totalSessions: number;
  totalMinutes: number;
  avgDurationSeconds: number;
  effectivenessRate: number; // % of sessions marked effective
  avgMoodImprovement: number; // Difference between before/after
  lastUsed?: string;
}

export interface DailyMoodTrend {
  date: string;
  avgMoodBefore: number;
  avgMoodAfter: number;
  sessionsCount: number;
  totalMinutes: number;
}

export interface CalmToolConfig {
  type: CalmToolType;
  name: string;
  description: string;
  icon: string;
  color: string;
  minDurationSeconds: number;
  coinsPerMinute: number;
  ageRange?: { min: number; max: number };
  tags: string[];
}

// ============================================================================
// Tool Configurations
// ============================================================================

export const CALM_TOOLS: CalmToolConfig[] = [
  {
    type: 'breathing',
    name: 'Breathing Exercise',
    description: 'Follow the circle to breathe in and out slowly',
    icon: '🌬️',
    color: '#60A5FA',
    minDurationSeconds: 30,
    coinsPerMinute: 5,
    tags: ['anxiety', 'calming', 'regulation'],
  },
  {
    type: 'visual-timer',
    name: 'Visual Timer',
    description: 'See time passing with a colorful countdown',
    icon: '⏱️',
    color: '#F59E0B',
    minDurationSeconds: 60,
    coinsPerMinute: 3,
    tags: ['transitions', 'waiting', 'structure'],
  },
  {
    type: 'bubble-pop',
    name: 'Bubble Pop',
    description: 'Pop bubbles to release tension',
    icon: '🫧',
    color: '#A78BFA',
    minDurationSeconds: 30,
    coinsPerMinute: 4,
    ageRange: { min: 3, max: 12 },
    tags: ['sensory', 'fidget', 'frustration'],
  },
  {
    type: 'fluid-swirl',
    name: 'Fluid Swirl',
    description: 'Watch calming colors flow and mix',
    icon: '🌊',
    color: '#2DD4BF',
    minDurationSeconds: 30,
    coinsPerMinute: 3,
    tags: ['visual', 'calming', 'hyperfocus'],
  },
  {
    type: 'fidget-spinner',
    name: 'Fidget Spinner',
    description: 'Spin to focus and calm',
    icon: '🔄',
    color: '#F472B6',
    minDurationSeconds: 20,
    coinsPerMinute: 2,
    tags: ['fidget', 'focus', 'waiting'],
  },
  {
    type: 'grounding',
    name: '5-4-3-2-1 Grounding',
    description: 'Use your senses to feel grounded',
    icon: '🌳',
    color: '#34D399',
    minDurationSeconds: 60,
    coinsPerMinute: 6,
    tags: ['anxiety', 'overwhelm', 'grounding'],
  },
  {
    type: 'body-scan',
    name: 'Body Scan',
    description: 'Notice how each part of your body feels',
    icon: '🧘',
    color: '#818CF8',
    minDurationSeconds: 120,
    coinsPerMinute: 5,
    ageRange: { min: 6, max: 18 },
    tags: ['awareness', 'calming', 'bedtime'],
  },
  {
    type: 'music',
    name: 'Calm Music',
    description: 'Listen to soothing sounds',
    icon: '🎵',
    color: '#FB923C',
    minDurationSeconds: 60,
    coinsPerMinute: 2,
    tags: ['sensory', 'calming', 'focus'],
  },
  {
    type: 'white-noise',
    name: 'White Noise',
    description: 'Block distractions with steady sounds',
    icon: '🔊',
    color: '#94A3B8',
    minDurationSeconds: 60,
    coinsPerMinute: 1,
    tags: ['sensory', 'focus', 'sleep'],
  },
  {
    type: 'counting',
    name: 'Counting Exercise',
    description: 'Count objects or numbers to calm down',
    icon: '🔢',
    color: '#22D3EE',
    minDurationSeconds: 30,
    coinsPerMinute: 4,
    tags: ['distraction', 'focus', 'calming'],
  },
  {
    type: 'squeeze',
    name: 'Squeeze & Release',
    description: 'Tense and relax your muscles',
    icon: '✊',
    color: '#E879F9',
    minDurationSeconds: 45,
    coinsPerMinute: 5,
    tags: ['physical', 'tension', 'regulation'],
  },
  {
    type: 'shake-it-out',
    name: 'Shake It Out',
    description: 'Move your body to release energy',
    icon: '💃',
    color: '#FB7185',
    minDurationSeconds: 30,
    coinsPerMinute: 4,
    ageRange: { min: 2, max: 12 },
    tags: ['physical', 'energy', 'transition'],
  },
];

// ============================================================================
// Session Management
// ============================================================================

let activeSession: CalmToolSession | null = null;
let sessionStartTime: Date | null = null;

/**
 * Start a calm tool session
 */
export async function startSession(
  userId: string,
  toolType: CalmToolType,
  options?: {
    childId?: string;
    moodBefore?: MoodLevel;
    triggeredBy?: string;
    context?: string;
  }
): Promise<CalmToolSession> {
  // End any active session first
  if (activeSession) {
    await endSession();
  }

  sessionStartTime = new Date();

  activeSession = {
    id: `calm-${Date.now()}`,
    userId,
    childId: options?.childId,
    toolType,
    startedAt: sessionStartTime.toISOString(),
    durationSeconds: 0,
    moodBefore: options?.moodBefore,
    triggeredBy: options?.triggeredBy,
    context: options?.context,
    coinsEarned: 0,
  };

  // Save session start to database
  await supabase.from('calm_tool_sessions').insert({
    id: activeSession.id,
    user_id: activeSession.userId,
    child_id: activeSession.childId,
    tool_type: activeSession.toolType,
    started_at: activeSession.startedAt,
    mood_before: activeSession.moodBefore,
    triggered_by: activeSession.triggeredBy,
    context: activeSession.context,
  });

  return activeSession;
}

/**
 * End the current session
 */
export async function endSession(
  options?: {
    moodAfter?: MoodLevel;
    wasEffective?: boolean;
    notes?: string;
  }
): Promise<CalmToolSession | null> {
  if (!activeSession || !sessionStartTime) {
    return null;
  }

  const endTime = new Date();
  const durationSeconds = Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 1000);

  // Calculate coins earned
  const toolConfig = CALM_TOOLS.find(t => t.type === activeSession!.toolType);
  const minutesUsed = durationSeconds / 60;
  const coinsEarned = durationSeconds >= (toolConfig?.minDurationSeconds || 30)
    ? Math.floor(minutesUsed * (toolConfig?.coinsPerMinute || 3))
    : 0;

  // Determine effectiveness based on mood improvement
  let wasEffective = options?.wasEffective;
  if (wasEffective === undefined && activeSession.moodBefore && options?.moodAfter) {
    wasEffective = options.moodAfter < activeSession.moodBefore;
  }

  const completedSession: CalmToolSession = {
    ...activeSession,
    endedAt: endTime.toISOString(),
    durationSeconds,
    moodAfter: options?.moodAfter,
    wasEffective,
    notes: options?.notes,
    coinsEarned,
  };

  // Update session in database
  await supabase
    .from('calm_tool_sessions')
    .update({
      ended_at: completedSession.endedAt,
      duration_seconds: completedSession.durationSeconds,
      mood_after: completedSession.moodAfter,
      was_effective: completedSession.wasEffective,
      notes: completedSession.notes,
      coins_earned: completedSession.coinsEarned,
    })
    .eq('id', completedSession.id);

  // Award coins if earned
  if (coinsEarned > 0) {
    await awardCoins(completedSession.userId, coinsEarned, 'calm_tool', completedSession.id);
  }

  activeSession = null;
  sessionStartTime = null;

  return completedSession;
}

/**
 * Get current active session
 */
export function getActiveSession(): CalmToolSession | null {
  if (!activeSession || !sessionStartTime) return null;

  const currentDuration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
  return {
    ...activeSession,
    durationSeconds: currentDuration,
  };
}

/**
 * Cancel session without saving
 */
export async function cancelSession(): Promise<void> {
  if (activeSession) {
    await supabase
      .from('calm_tool_sessions')
      .delete()
      .eq('id', activeSession.id);
  }
  activeSession = null;
  sessionStartTime = null;
}

// ============================================================================
// History & Analytics
// ============================================================================

/**
 * Get session history
 */
export async function getSessionHistory(
  userId: string,
  options?: {
    childId?: string;
    toolType?: CalmToolType;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<CalmToolSession[]> {
  let query = supabase
    .from('calm_tool_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });

  if (options?.childId) {
    query = query.eq('child_id', options.childId);
  }
  if (options?.toolType) {
    query = query.eq('tool_type', options.toolType);
  }
  if (options?.startDate) {
    query = query.gte('started_at', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('started_at', options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch session history:', error);
    return [];
  }

  return (data || []).map(mapDbSession);
}

/**
 * Get statistics for each tool type
 */
export async function getToolStats(
  userId: string,
  childId?: string,
  days: number = 30
): Promise<CalmToolStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await getSessionHistory(userId, {
    childId,
    startDate: startDate.toISOString(),
  });

  // Group by tool type
  const byTool = new Map<CalmToolType, CalmToolSession[]>();
  for (const session of sessions) {
    const existing = byTool.get(session.toolType) || [];
    existing.push(session);
    byTool.set(session.toolType, existing);
  }

  const stats: CalmToolStats[] = [];

  for (const [toolType, toolSessions] of byTool) {
    const totalMinutes = toolSessions.reduce((sum, s) => sum + s.durationSeconds / 60, 0);
    const avgDuration = toolSessions.reduce((sum, s) => sum + s.durationSeconds, 0) / toolSessions.length;

    const effectiveSessions = toolSessions.filter(s => s.wasEffective === true);
    const effectivenessRate = (effectiveSessions.length / toolSessions.length) * 100;

    // Calculate mood improvement
    const sessionsWithMood = toolSessions.filter(s => s.moodBefore && s.moodAfter);
    const avgMoodImprovement = sessionsWithMood.length > 0
      ? sessionsWithMood.reduce((sum, s) => sum + ((s.moodBefore || 0) - (s.moodAfter || 0)), 0) / sessionsWithMood.length
      : 0;

    const lastSession = toolSessions[0]; // Already sorted by date desc

    stats.push({
      toolType,
      totalSessions: toolSessions.length,
      totalMinutes: Math.round(totalMinutes),
      avgDurationSeconds: Math.round(avgDuration),
      effectivenessRate: Math.round(effectivenessRate),
      avgMoodImprovement: Math.round(avgMoodImprovement * 10) / 10,
      lastUsed: lastSession?.startedAt,
    });
  }

  // Sort by total sessions
  return stats.sort((a, b) => b.totalSessions - a.totalSessions);
}

/**
 * Get daily mood trends
 */
export async function getDailyMoodTrends(
  userId: string,
  childId?: string,
  days: number = 14
): Promise<DailyMoodTrend[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await getSessionHistory(userId, {
    childId,
    startDate: startDate.toISOString(),
  });

  // Group by date
  const byDate = new Map<string, CalmToolSession[]>();
  for (const session of sessions) {
    const date = session.startedAt.split('T')[0];
    const existing = byDate.get(date) || [];
    existing.push(session);
    byDate.set(date, existing);
  }

  const trends: DailyMoodTrend[] = [];

  // Generate all dates in range
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const daySessions = byDate.get(dateStr) || [];
    const sessionsWithMood = daySessions.filter(s => s.moodBefore && s.moodAfter);

    trends.push({
      date: dateStr,
      avgMoodBefore: sessionsWithMood.length > 0
        ? sessionsWithMood.reduce((sum, s) => sum + (s.moodBefore || 0), 0) / sessionsWithMood.length
        : 0,
      avgMoodAfter: sessionsWithMood.length > 0
        ? sessionsWithMood.reduce((sum, s) => sum + (s.moodAfter || 0), 0) / sessionsWithMood.length
        : 0,
      sessionsCount: daySessions.length,
      totalMinutes: Math.round(daySessions.reduce((sum, s) => sum + s.durationSeconds / 60, 0)),
    });
  }

  return trends.reverse(); // Oldest first
}

/**
 * Get most effective tools for this user
 */
export async function getMostEffectiveTools(
  userId: string,
  childId?: string
): Promise<{ toolType: CalmToolType; score: number }[]> {
  const stats = await getToolStats(userId, childId, 60); // Look at 60 days

  return stats
    .filter(s => s.totalSessions >= 3) // Need at least 3 uses
    .map(s => ({
      toolType: s.toolType,
      score: (s.effectivenessRate * 0.6) + (s.avgMoodImprovement * 20) + (Math.min(s.totalSessions, 20) * 2),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * Get recommended tool based on trigger
 */
export function getRecommendedTool(trigger: string): CalmToolConfig[] {
  const triggerTags: Record<string, string[]> = {
    anxiety: ['calming', 'grounding', 'regulation'],
    frustration: ['fidget', 'physical', 'sensory'],
    transition: ['transitions', 'waiting', 'structure'],
    sensory: ['sensory', 'calming', 'visual'],
    energy: ['physical', 'energy'],
    focus: ['focus', 'fidget'],
    sleep: ['calming', 'sleep', 'bedtime'],
  };

  const relevantTags = triggerTags[trigger.toLowerCase()] || ['calming'];

  return CALM_TOOLS.filter(tool =>
    tool.tags.some(tag => relevantTags.includes(tag))
  );
}

// ============================================================================
// Coins Integration
// ============================================================================

async function awardCoins(
  userId: string,
  amount: number,
  source: string,
  referenceId: string
): Promise<void> {
  await supabase.from('calm_coins').insert({
    id: `coin-${Date.now()}`,
    user_id: userId,
    amount,
    source,
    reference_id: referenceId,
    created_at: new Date().toISOString(),
  });
}

/**
 * Get total coins balance
 */
export async function getCoinsBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('calm_coins')
    .select('amount')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch coins balance:', error);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + row.amount, 0);
}

/**
 * Get coins earned from calm tools
 */
export async function getCalmToolCoins(userId: string, days: number = 7): Promise<number> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('calm_coins')
    .select('amount')
    .eq('user_id', userId)
    .eq('source', 'calm_tool')
    .gte('created_at', startDate.toISOString());

  if (error) return 0;
  return (data || []).reduce((sum, row) => sum + row.amount, 0);
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapDbSession(data: any): CalmToolSession {
  return {
    id: data.id,
    userId: data.user_id,
    childId: data.child_id,
    toolType: data.tool_type,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    durationSeconds: data.duration_seconds || 0,
    moodBefore: data.mood_before,
    moodAfter: data.mood_after,
    wasEffective: data.was_effective,
    triggeredBy: data.triggered_by,
    context: data.context,
    notes: data.notes,
    coinsEarned: data.coins_earned || 0,
  };
}

// ============================================================================
// Export
// ============================================================================

export const calmToolsTracking = {
  // Configuration
  CALM_TOOLS,

  // Session Management
  startSession,
  endSession,
  getActiveSession,
  cancelSession,

  // History & Analytics
  getSessionHistory,
  getToolStats,
  getDailyMoodTrends,
  getMostEffectiveTools,
  getRecommendedTool,

  // Coins
  getCoinsBalance,
  getCalmToolCoins,
};

export default calmToolsTracking;
