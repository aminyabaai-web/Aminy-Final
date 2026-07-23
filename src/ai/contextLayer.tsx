// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AI Context Layer - Merges user data across all Aminy modules
 * Provides context-aware memory for personalized AI experiences
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  mapCheckInRows,
  parseBaselineRow,
  formatOutcomesForAI,
  type CheckInPoint,
  type BaselineSummary,
} from '../lib/outcome-trends';
import { INTEREST_LABELS, SPECIAL_TIME_IDEAS, type InterestTag } from '../content/special-time-ideas';

export interface UserContext {
  // Child Profile
  childId?: string;
  childName?: string;
  childAge?: string;
  childGender?: string;
  diagnosis?: string;
  priorities?: string[];

  // Active goals this child is working on
  activeGoals?: string[];

  // Recent BCBA/provider session observations (content snippets from session_notes)
  recentSessionNotes?: string[];

  // Weekly parent check-ins (outcome_events) + baseline (clinical_outcomes) —
  // lets the AI answer "how is Kai trending?" with real numbers
  weeklyOutcomes?: CheckInPoint[];
  outcomeBaseline?: BaselineSummary | null;

  // Latest "how are YOU holding up?" parent check-in (stress_logs) — lets the
  // AI adapt its tone to the parent's own day, not just the child's data.
  parentCheckIn?: {
    feeling: string; // e.g. "stretched thin"
    note?: string; // optional one-liner the parent added
    daysAgo: number; // 0 = today
  };

  // Recent Activity
  lastJrSession?: {
    timestamp: Date;
    activity: string;
    duration: number;
  };

  lastShopPurchase?: {
    timestamp: Date;
    item: string;
  };

  lastHubPost?: {
    timestamp: Date;
    topic: string;
  };

  lastCoverageQuestion?: {
    timestamp: Date;
    topic: string;
  };

  // Memory Insights
  lastCalmCue?: string;
  progressThisWeek?: {
    sessionsCompleted: number;
    calmMoments: number;
    newStrategies: number;
  };

  // Behavioral Patterns
  bestTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  strugglingWith?: string[];
  celebratingWins?: string[];

  // Validated screenings currently due (published by Dashboard10 via the
  // screening-schedule engine). `billable` means "potentially billable when a
  // provider reviews it" — the AI must NEVER promise insurance coverage.
  screeningsDue?: Array<{ name: string; reason: string; billable: boolean }>;

  // Roaming AI preferences (persisted in profiles.ai_context so they follow the
  // user across devices; localStorage remains the offline cache/fallback)
  customInstructions?: { aboutMe?: string; responseStyle?: string };
  aiSettings?: Record<string, unknown>;

  // Relationship intelligence — the parent-child dyad model (Wave 1.5).
  // Assembled by fetchDyadModel(); rendered as the RELATIONSHIP block in
  // buildAIContextString so the AI can strengthen the relationship itself,
  // not just outcomes.
  dyad?: DyadModel;
}

/**
 * The parent-child dyad model: real signals about what lights this child up,
 * which connection moments landed, what the parent has noticed, and when
 * friction tends to cluster. All lines are omitted when there is no data —
 * nothing here is ever fabricated.
 */
export interface DyadModel {
  /** What lights the child up — Special Time interest + favorite Ease tools. */
  interests: string[];
  /** Recent Special Time after-moments (newest first, ≤5). */
  recentFeedback: Array<{
    date: string; // YYYY-MM-DD
    ideaTitle: string;
    feeling: 'laughed' | 'calm' | 'not-today';
    note?: string;
    source?: 'ai' | 'library';
  }>;
  /** Ease "I noticed…" parent observations (≤3, most recent first). */
  parentObservations: string[];
  /** Ease activities the child keeps returning to or the parent rated great (≤4). */
  lovedActivities: string[];
  /** Shared-moment wins tagged "special time" synced to the Wins Journal (≤2). */
  sharedWins: string[];
  /** Behavior-friction window from the last 7 days of logs, e.g. "5pm–7pm (4 tough moments)". */
  frictionWindow?: string;
}

export interface MemorySummary {
  id: string;
  userId: string;
  timestamp: Date;
  category: 'calm_cue' | 'progress' | 'insight' | 'milestone';
  content: string;
  context: Record<string, any>;
  expiresAt: Date;
}

export interface CurrentContext {
  module: 'dashboard' | 'jr' | 'shop' | 'hub' | 'coverage' | 'plan' | 'care' | 'vault' | 'settings';
  moduleName: string;
  userState: {
    isActive: boolean;
    hasRecentActivity: boolean;
    needsAttention: boolean;
  };
  recentAction?: {
    type: string;
    timestamp: Date;
    details: string;
  };
  placeholder: string;
  contextHint: string;
}

// ---------------------------------------------------------------------------
// Dyad model (relationship intelligence)
// ---------------------------------------------------------------------------

const SPECIAL_TIME_MOMENTS_KEY = 'aminy-special-time-moments';
const SPECIAL_TIME_INTEREST_KEY = 'aminy-special-time-interest';
const EASE_SESSIONS_KEY = 'aminy-ease-parent-sessions';

function readLocalJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Special Time interest tag → warm label ("Sensory"), or null. */
function readDyadInterest(): string | null {
  const parsed = readLocalJson<string>(SPECIAL_TIME_INTEREST_KEY);
  return typeof parsed === 'string' && parsed in INTEREST_LABELS
    ? INTEREST_LABELS[parsed as InterestTag]
    : null;
}

interface LocalMomentRecord {
  date?: string;
  ideaId?: string;
  ideaTitle?: string;
  feeling?: 'laughed' | 'calm' | 'not-today';
  note?: string;
  source?: 'ai' | 'library';
}

/** Last N Special Time after-moments, newest first, title resolved. */
function readDyadFeedback(limit = 5): DyadModel['recentFeedback'] {
  const raw = readLocalJson<LocalMomentRecord[]>(SPECIAL_TIME_MOMENTS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m.date === 'string' && m.feeling)
    .slice(-limit)
    .reverse()
    .map((m) => ({
      date: m.date as string,
      ideaTitle:
        m.ideaTitle ||
        SPECIAL_TIME_IDEAS.find((i) => i.id === m.ideaId)?.title ||
        'a Special Time idea',
      feeling: m.feeling as 'laughed' | 'calm' | 'not-today',
      note: typeof m.note === 'string' && m.note.trim() ? m.note.trim().slice(0, 120) : undefined,
      source: m.source === 'ai' || m.source === 'library' ? m.source : undefined,
    }));
}

interface LocalEaseSession {
  timestamp?: string;
  tool?: string;
  rating?: 'great' | 'ok' | 'rough' | null;
  parentNote?: string;
}

/** Ease parent view signals: "I noticed" notes + loved activities. */
function readEaseSignals(): { observations: string[]; loved: string[] } {
  const sessions = readLocalJson<LocalEaseSession[]>(EASE_SESSIONS_KEY);
  if (!Array.isArray(sessions)) return { observations: [], loved: [] };

  const observations = sessions
    .filter((s) => typeof s.parentNote === 'string' && s.parentNote.trim().length > 0)
    .slice(0, 3)
    .map((s) => (s.parentNote as string).trim().slice(0, 140));

  // "Loved" = rated great, or returned to 2+ times (sessions are newest-first)
  const counts = new Map<string, { count: number; great: boolean }>();
  for (const s of sessions.slice(0, 40)) {
    if (!s.tool) continue;
    const entry = counts.get(s.tool) ?? { count: 0, great: false };
    entry.count += 1;
    if (s.rating === 'great') entry.great = true;
    counts.set(s.tool, entry);
  }
  const loved = [...counts.entries()]
    .filter(([, v]) => v.great || v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4)
    .map(([tool]) => tool);

  return { observations, loved };
}

/** Peak 2-hour tough-moment window from the last 7 days of behavior_logs. */
async function fetchFrictionWindow(userId: string): Promise<string | undefined> {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('behavior_logs')
      .select('logged_at')
      .eq('user_id', userId)
      .eq('is_positive', false)
      .gte('logged_at', weekAgo)
      .order('logged_at', { ascending: false })
      .limit(30);

    const logs = data ?? [];
    if (logs.length < 3) return undefined;

    const hourBuckets: Record<number, number> = {};
    for (const row of logs) {
      const h = new Date(row.logged_at).getHours();
      if (Number.isFinite(h)) hourBuckets[h] = (hourBuckets[h] || 0) + 1;
    }
    let peak = { start: 0, count: 0 };
    for (let h = 0; h < 23; h++) {
      const count = (hourBuckets[h] || 0) + (hourBuckets[h + 1] || 0);
      if (count > peak.count) peak = { start: h, count };
    }
    if (peak.count < 3) return undefined;

    const label = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
    return `${label(peak.start)}–${label(peak.start + 2)} (${peak.count} tough moments this week)`;
  } catch {
    return undefined;
  }
}

/** Wins Journal moments tagged "special time" (synced from other devices too). */
async function fetchSharedWins(): Promise<string[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return [];
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/wins/load`,
      { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    const moments: Array<{ content?: string; tags?: string[] }> = Array.isArray(data?.moments)
      ? data.moments
      : [];
    return moments
      .filter((m) => Array.isArray(m.tags) && m.tags.includes('special time') && typeof m.content === 'string')
      .slice(0, 2)
      .map((m) => (m.content as string).trim().slice(0, 140));
  } catch {
    return [];
  }
}

/**
 * Assemble the parent-child dyad model from real signals: child interests
 * (Special Time interest + Ease activity picks), Special Time feedback
 * history, Ease "I noticed" observations, synced shared-moment wins, and the
 * last-7-days behavior-friction window. Cheap by design — two bounded network
 * calls, everything else is localStorage. Never throws.
 */
export async function fetchDyadModel(userId: string): Promise<DyadModel> {
  const interest = readDyadInterest();
  const recentFeedback = readDyadFeedback();
  const { observations, loved } = readEaseSignals();

  const [frictionWindow, sharedWins] = await Promise.all([
    userId ? fetchFrictionWindow(userId) : Promise.resolve(undefined),
    fetchSharedWins(),
  ]);

  return {
    interests: interest ? [interest] : [],
    recentFeedback,
    parentObservations: observations,
    lovedActivities: loved,
    sharedWins,
    frictionWindow,
  };
}

/**
 * Fetch comprehensive user context — Supabase first, KV for AI-generated extras
 */
export async function fetchUserContext(userId: string): Promise<UserContext> {
  try {
    // Run Supabase queries and KV fetch in parallel
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [childResult, sessionResult, goalsResult, outcomesResult, baselineResult, parentCheckInResult, kvResult, dyadResult] = await Promise.allSettled([
      // Primary child profile
      supabase
        .from('children')
        .select('id, name, age_years, age, gender, diagnosis, is_primary')
        .eq('parent_id', userId)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Sessions completed this week + recent note content for AI context
      supabase
        .from('session_notes')
        .select('id, session_date, modality, content, notes, observations')
        .eq('user_id', userId)
        .gte('session_date', weekAgo.split('T')[0])
        .order('session_date', { ascending: false })
        .limit(5),

      // Active treatment goals (top 5 names)
      supabase
        .from('goals')
        .select('title, category, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(5),

      // Last 4 weekly parent check-ins (outcome_events) — existing prompt-building
      // path only; this PHI stays inside the current Claude BAA posture.
      supabase
        .from('outcome_events')
        .select('context, payload, recorded_at, created_at')
        .eq('user_id', userId)
        .eq('event_type', 'weekly_parent_checkin')
        .order('created_at', { ascending: false })
        // Over-fetch rows: same-week re-dos collapse in mapCheckInRows; the
        // prompt block itself is capped to the 4 most recent weeks (≤600 chars).
        .limit(12),

      // Latest parent baseline (clinical_outcomes)
      supabase
        .from('clinical_outcomes')
        .select('interpretation, raw_score, created_at')
        .eq('user_id', userId)
        .eq('assessment_name', 'parent_baseline_assessment')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Latest "how are YOU holding up?" parent check-in (last 7 days)
      supabase
        .from('stress_logs')
        .select('stress_level, notes, created_at')
        .eq('user_id', userId)
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // KV-stored AI-generated context (calm cues, wins, etc.)
      fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/context/user/${userId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      ).then(r => r.ok ? r.json() : null).catch(() => null),

      // Relationship dyad model (localStorage signals + friction window + wins)
      fetchDyadModel(userId),
    ]);

    // Build context from Supabase results
    const child = childResult.status === 'fulfilled' ? childResult.value.data : null;
    const sessions = sessionResult.status === 'fulfilled' ? sessionResult.value.data : null;
    const goals = goalsResult.status === 'fulfilled' ? goalsResult.value.data : null;
    const outcomeRows = outcomesResult.status === 'fulfilled' ? outcomesResult.value.data : null;
    const baselineRow = baselineResult.status === 'fulfilled' ? baselineResult.value.data : null;
    const parentCheckInRow = parentCheckInResult.status === 'fulfilled' ? parentCheckInResult.value.data : null;
    const kvData = kvResult.status === 'fulfilled' ? kvResult.value : null;
    const kvContext = kvData?.context || {};
    const dyad = dyadResult.status === 'fulfilled' ? dyadResult.value : undefined;

    const weeklyOutcomes = mapCheckInRows(outcomeRows || []).slice(-4);
    const outcomeBaseline = parseBaselineRow(baselineRow);
    const parentCheckIn = mapParentCheckIn(parentCheckInRow);

    const sessionsCompleted = sessions?.length ?? 0;
    const activeGoalNames = goals?.map((g: { title: string }) => g.title).filter(Boolean) ?? [];
    const recentSessionNotes = (sessions || [])
      .map((s: { content?: string; notes?: string; observations?: string; session_date?: string }) => {
        const text = s.content || s.notes || s.observations || '';
        if (!text) return null;
        return text.slice(0, 180).trim();
      })
      .filter((n): n is string => !!n)
      .slice(0, 3);

    return {
      // From Supabase children table
      childId: child?.id != null ? String(child.id) : undefined,
      childName: child?.name || kvContext.childName,
      childAge: child?.age_years != null
        ? String(child.age_years)
        : child?.age != null
        ? String(child.age)
        : kvContext.childAge,
      childGender: child?.gender || kvContext.childGender,
      diagnosis: child?.diagnosis || kvContext.diagnosis,

      // From goals table
      activeGoals: activeGoalNames.length > 0 ? activeGoalNames : kvContext.activeGoals,

      // From session_notes this week
      progressThisWeek: {
        sessionsCompleted,
        calmMoments: kvContext.progressThisWeek?.calmMoments ?? 0,
        newStrategies: kvContext.progressThisWeek?.newStrategies ?? 0,
      },
      recentSessionNotes: recentSessionNotes.length > 0 ? recentSessionNotes : undefined,

      // Weekly outcomes trend (parent check-ins + baseline)
      weeklyOutcomes: weeklyOutcomes.length > 0 ? weeklyOutcomes : undefined,
      outcomeBaseline,

      // Latest "how are YOU?" parent check-in
      parentCheckIn,

      // From KV (AI-generated, persisted)
      lastCalmCue: kvContext.lastCalmCue,
      strugglingWith: kvContext.strugglingWith || [],
      celebratingWins: kvContext.celebratingWins || [],
      bestTimeOfDay: kvContext.bestTimeOfDay,
      priorities: kvContext.priorities,
      lastJrSession: kvContext.lastJrSession,
      lastShopPurchase: kvContext.lastShopPurchase,
      lastHubPost: kvContext.lastHubPost,
      lastCoverageQuestion: kvContext.lastCoverageQuestion,

      // Due screenings (published from the dashboard via updateUserContext)
      screeningsDue: Array.isArray(kvContext.screeningsDue) ? kvContext.screeningsDue : undefined,

      // Roaming AI preferences (M1 — hydrated by BevelChatOverlay on mount;
      // localStorage stays the offline cache/fallback)
      customInstructions: kvContext.customInstructions,
      aiSettings: kvContext.aiSettings,

      // Relationship dyad model
      dyad,
    };
  } catch {
    return getDefaultContext();
  }
}

/**
 * Update user context with new activity (AI-generated extras stored in KV)
 */
export async function updateUserContext(
  userId: string,
  updates: Partial<UserContext>
): Promise<void> {
  try {
    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/context/update`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ updates }),
      }
    );
  } catch {
    // Fire-and-forget — non-blocking
  }
}

/**
 * Store memory summary (30-day lifecycle)
 */
export async function storeMemory(
  userId: string,
  memory: Omit<MemorySummary, 'id' | 'userId' | 'expiresAt'>
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/store`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          ...memory,
          expiresAt: expiresAt.toISOString(),
        }),
      }
    );
  } catch {
    // Fire-and-forget
  }
}

/**
 * Fetch recent memories
 */
export async function fetchMemories(
  userId: string,
  limit: number = 5
): Promise<MemorySummary[]> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/recent?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId,
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    // Defensive expiry filter: the server excludes expired rows, but until the
    // expires_at column migration (20260702100000) is applied everywhere we
    // also filter client-side. Rows are raw memory_facts (snake_case fields).
    const now = Date.now();
    return (data.memories || []).filter(
      (m: { expires_at?: string | null; expiresAt?: string | null }) => {
        const exp = m.expires_at ?? m.expiresAt;
        return !exp || new Date(exp).getTime() > now;
      }
    );
  } catch {
    return [];
  }
}

/**
 * Build AI context string from user data
 */
export function buildAIContextString(context: UserContext): string {
  const parts: string[] = [];

  if (context.childName) {
    const ageStr = context.childAge ? `, age ${context.childAge}` : '';
    const diagStr = context.diagnosis ? ` (${context.diagnosis})` : '';
    parts.push(`You're supporting the parent of ${context.childName}${ageStr}${diagStr}.`);
  }

  if (context.activeGoals && context.activeGoals.length > 0) {
    parts.push(`Active therapy goals: ${context.activeGoals.join(', ')}.`);
  } else if (context.priorities && context.priorities.length > 0) {
    parts.push(`Their top priorities: ${context.priorities.join(', ')}.`);
  }

  if (context.lastCalmCue) {
    parts.push(`Last calm cue you gave: "${context.lastCalmCue}"`);
  }

  if (context.progressThisWeek) {
    const { sessionsCompleted, calmMoments, newStrategies } = context.progressThisWeek;
    const sessionStr = sessionsCompleted === 0
      ? 'no ABA sessions yet this week'
      : `${sessionsCompleted} ABA session${sessionsCompleted !== 1 ? 's' : ''} this week`;
    parts.push(`Progress: ${sessionStr}, ${calmMoments} calm moments, ${newStrategies} new strategies.`);
  }

  if (context.strugglingWith && context.strugglingWith.length > 0) {
    parts.push(`Currently working through: ${context.strugglingWith.join(', ')}.`);
  }

  if (context.celebratingWins && context.celebratingWins.length > 0) {
    parts.push(`Recent wins to build on: ${context.celebratingWins.join(', ')}.`);
  }

  if (context.lastJrSession) {
    const timeAgo = getTimeAgo(context.lastJrSession.timestamp);
    parts.push(`Last Ease session was ${timeAgo}: ${context.lastJrSession.activity}.`);
  }

  if (context.recentSessionNotes && context.recentSessionNotes.length > 0) {
    parts.push(`Recent provider observations: ${context.recentSessionNotes.join(' | ')}.`);
  }

  // DUE SCREENINGS — lets the AI gently nudge toward validated check-ins.
  // COMPLIANCE: "often covered … when reviewed with your provider" — never a
  // coverage promise; billing decisions always flow through the provider.
  if (context.screeningsDue && context.screeningsDue.length > 0) {
    const items = context.screeningsDue
      .slice(0, 4)
      .map((s) => `${s.name} (${s.reason}${s.billable ? '; often covered by insurance when reviewed with their provider' : ''})`);
    parts.push(
      `SCREENINGS DUE: ${items.join(' | ')}. If it fits the conversation, gently suggest completing one in the app (a few minutes each). Never promise insurance coverage.`
    );
  }

  // PARENT CHECK-IN — how the PARENT is holding up, so the AI's tone can meet
  // them where they are. Not a clinical score; never guilt-trip about it.
  if (context.parentCheckIn) {
    const { feeling, note, daysAgo } = context.parentCheckIn;
    const when = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
    const noteStr = note ? ` — "${note}"` : '';
    parts.push(
      `PARENT CHECK-IN (${when}): ${feeling}${noteStr}. Let this shape your tone: briefly acknowledge how THEY are doing before problem-solving. If they're stretched thin or running on empty, keep suggestions small and gentle and remind them they're doing enough. Never comment on check-in frequency or ask them to check in more.`
    );
  }

  // RELATIONSHIP — the parent-child dyad (Wave 1.5). What lights the child up,
  // what worked recently, and what to avoid suggesting today. Max ~15 lines;
  // every line is omitted when there is no data — never fabricate.
  const relationshipBlock = buildRelationshipBlock(context);
  if (relationshipBlock) {
    parts.push(relationshipBlock);
  }

  // WEEKLY OUTCOMES — compact (≤600 chars), most-recent-first, real numbers the
  // AI can cite when asked "how is my child trending?"
  const outcomesBlock = formatOutcomesForAI(context.weeklyOutcomes || [], context.outcomeBaseline || null);
  if (outcomesBlock) {
    parts.push(`WEEKLY OUTCOMES: ${outcomesBlock}`);
  }

  return parts.join(' ');
}

/**
 * Render the RELATIONSHIP block from the dyad model. Returns '' when there is
 * nothing real to say. Lines with no data are omitted; the block is ≤15 lines.
 */
function buildRelationshipBlock(context: UserContext): string {
  const d = context.dyad;
  if (!d) return '';

  const lines: string[] = [];
  const name = context.childName || 'the child';

  // What lights the child up
  const sparks = [...(d.interests || []), ...(d.lovedActivities || [])].slice(0, 5);
  if (sparks.length > 0) {
    lines.push(`- What lights ${name} up: ${sparks.join(', ')}.`);
  }

  // What worked recently (Special Time feedback, newest first)
  const landed = (d.recentFeedback || []).filter((f) => f.feeling !== 'not-today').slice(0, 3);
  if (landed.length > 0) {
    const items = landed.map((f) => {
      const felt = f.feeling === 'laughed' ? 'they laughed together' : 'it felt calm';
      return `"${f.ideaTitle}" (${felt}${f.note ? ` — "${f.note}"` : ''})`;
    });
    lines.push(`- Special Time moments that landed: ${items.join('; ')}.`);
  }
  const skipped = (d.recentFeedback || []).filter((f) => f.feeling === 'not-today').length;
  if (skipped > 0) {
    lines.push(`- ${skipped} recent "not today" day${skipped !== 1 ? 's' : ''} — fully okay, never guilt them about it.`);
  }

  // What the parent has noticed
  const observations = (d.parentObservations || []).slice(0, 2);
  if (observations.length > 0) {
    lines.push(`- Parent noticed: ${observations.map((o) => `"${o}"`).join(' | ')}`);
  }

  // Shared-moment wins
  const wins = (d.sharedWins || []).slice(0, 2);
  if (wins.length > 0) {
    lines.push(`- Shared moments in their Wins Journal: ${wins.map((w) => `"${w}"`).join(' | ')}`);
  }

  // What to avoid suggesting today
  if (d.frictionWindow) {
    lines.push(`- Friction window: tough moments cluster around ${d.frictionWindow} — avoid suggesting big or demanding activities in that window.`);
  }
  if (context.parentCheckIn && (context.parentCheckIn.feeling === 'stretched thin' || context.parentCheckIn.feeling === 'running on empty')) {
    lines.push(`- Parent is ${context.parentCheckIn.feeling} right now — keep connection ideas extra small and low-effort today (minutes, not projects).`);
  }

  if (lines.length === 0) return '';

  return [
    `RELATIONSHIP (the parent-${name} dyad — use this to strengthen their connection; frame ideas as gifts, never as tasks or therapy):`,
    ...lines.slice(0, 13),
    '- Suggest child-led, no-agenda moments that fit these signals. Never score or clinicalize them.',
  ].join('\n');
}

/**
 * Detect current module context
 */
export function detectModuleContext(pathname: string): string {
  if (pathname.includes('/jr')) return 'Ease';
  if (pathname.includes('/shop')) return 'Shop';
  if (pathname.includes('/hub')) return 'Parent Hub';
  if (pathname.includes('/coverage')) return 'Coverage';
  if (pathname.includes('/plan')) return 'Daily Plan';
  if (pathname.includes('/care')) return 'Care Team';
  if (pathname.includes('/vault')) return 'Document Vault';
  if (pathname.includes('/settings')) return 'Settings';
  return 'Dashboard';
}

/**
 * Get current context with module awareness
 */
export function getCurrentContext(pathname: string, userContext?: UserContext): CurrentContext {
  const path = pathname.toLowerCase();
  const childName = userContext?.childName;

  let module: CurrentContext['module'] = 'dashboard';
  let moduleName = 'Dashboard';
  let placeholder = 'Message Aminy AI...';
  let contextHint = "I'm here to help with anything on your mind.";

  if (path.includes('/jr') || path.includes('ease') || path.includes('junior')) {
    module = 'jr';
    moduleName = 'Ease';
    placeholder = childName
      ? `Ask about ${childName}'s calm routines, rewards, transitions...`
      : 'Ask about calm routines, rewards, transitions, or progress...';
    contextHint = userContext?.lastJrSession
      ? `Last Ease session: ${userContext.lastJrSession.activity}`
      : 'I can help with calm routines, rewards, transitions, and behavioral strategies.';
  } else if (path.includes('/shop')) {
    module = 'shop';
    moduleName = 'Shop';
    placeholder = 'Ask about tools, resources, or recommendations...';
    contextHint = 'I can help you find the perfect tools for your family.';
  } else if (path.includes('/hub') || path.includes('community')) {
    module = 'hub';
    moduleName = 'Parent Hub';
    placeholder = 'Ask about community, stories, or support...';
    contextHint = 'I can help you connect with other parents and share experiences.';
  } else if (path.includes('/coverage') || path.includes('insurance') || path.includes('benefits')) {
    module = 'coverage';
    moduleName = 'Coverage';
    placeholder = 'Ask about insurance, benefits, or coverage...';
    contextHint = 'I can help you understand your coverage and benefits.';
  } else if (path.includes('/plan') || path.includes('routine') || path.includes('home-program')) {
    module = 'plan';
    moduleName = 'Daily Plan';
    placeholder = 'Ask about your plan, routines, or goals...';
    contextHint = 'I can help you build calm, sustainable routines.';
  } else if (path.includes('/care') || path.includes('appointment') || path.includes('session')) {
    module = 'care';
    moduleName = 'Care Team';
    placeholder = 'Ask about your care team or appointments...';
    contextHint = 'I can help you manage your care team and sessions.';
  } else if (path.includes('/vault') || path.includes('record') || path.includes('document')) {
    module = 'vault';
    moduleName = 'Document Vault';
    placeholder = 'Ask about documents, reports, or records...';
    contextHint = 'I can help you organize and understand your documents.';
  } else if (path.includes('/settings') || path.includes('profile')) {
    module = 'settings';
    moduleName = 'Settings';
    placeholder = 'Ask about settings, preferences, or account...';
    contextHint = 'I can help you customize your Aminy experience.';
  }

  const userState = {
    isActive: true,
    hasRecentActivity: !!(
      userContext?.lastJrSession ||
      userContext?.lastShopPurchase ||
      userContext?.lastHubPost
    ),
    needsAttention: !!(userContext?.strugglingWith && userContext.strugglingWith.length > 0),
  };

  let recentAction: CurrentContext['recentAction'] | undefined;
  if (userContext?.lastJrSession && module === 'jr') {
    recentAction = {
      type: 'jr_session',
      timestamp: userContext.lastJrSession.timestamp,
      details: userContext.lastJrSession.activity,
    };
  } else if (userContext?.lastShopPurchase && module === 'shop') {
    recentAction = {
      type: 'shop_purchase',
      timestamp: userContext.lastShopPurchase.timestamp,
      details: userContext.lastShopPurchase.item,
    };
  } else if (userContext?.lastHubPost && module === 'hub') {
    recentAction = {
      type: 'hub_post',
      timestamp: userContext.lastHubPost.timestamp,
      details: userContext.lastHubPost.topic,
    };
  }

  return {
    module,
    moduleName,
    userState,
    recentAction,
    placeholder,
    contextHint,
  };
}

/**
 * Generate context chips for current screen
 */
export function generateContextChips(pathname: string, context: UserContext): string[] {
  const chips: string[] = [];
  const module = detectModuleContext(pathname);
  chips.push(module);

  if (pathname.includes('/jr') && context.lastJrSession) {
    chips.push('Ease Activity');
  }
  if (pathname.includes('/plan')) {
    if (context.bestTimeOfDay === 'morning') chips.push('Morning Routine');
    else if (context.bestTimeOfDay === 'evening') chips.push('Evening Routine');
  }
  if (pathname.includes('/coverage')) {
    chips.push('Coverage Question');
  }
  if (context.strugglingWith && context.strugglingWith.length > 0) {
    chips.push(context.strugglingWith[0]);
  }

  return chips.slice(0, 3);
}

/**
 * Map the latest stress_logs row (or the localStorage mirror written by
 * StressCheckIn when offline/unauthenticated) into the parentCheckIn context.
 * Only check-ins from the last 7 days count — older feelings are stale.
 */
function mapParentCheckIn(
  row: { stress_level?: number | null; notes?: string | null; created_at?: string | null } | null
): UserContext['parentCheckIn'] {
  const describe = (level: number): string => {
    if (level <= 3) return 'doing okay';
    if (level <= 5) return 'managing';
    if (level <= 7) return 'stretched thin';
    return 'running on empty';
  };

  let level: number | null = row?.stress_level ?? null;
  let note: string | undefined = row?.notes?.trim() || undefined;
  let at: string | null = row?.created_at ?? null;

  // Fallback: local mirror (written on submit, even when the network fails)
  if (level == null) {
    try {
      const raw = localStorage.getItem('aminy_parent_checkin_latest');
      if (raw) {
        const local = JSON.parse(raw) as { level?: number; note?: string; at?: string };
        if (typeof local.level === 'number') {
          level = local.level;
          note = local.note?.trim() || undefined;
          at = local.at ?? null;
        }
      }
    } catch {
      // ignore
    }
  }

  if (level == null || !at) return undefined;
  const daysAgo = Math.floor((Date.now() - new Date(at).getTime()) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(daysAgo) || daysAgo < 0 || daysAgo > 7) return undefined;

  return {
    feeling: describe(level),
    note: note ? note.slice(0, 140) : undefined,
    daysAgo,
  };
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

function getDefaultContext(): UserContext {
  return {
    progressThisWeek: {
      sessionsCompleted: 0,
      calmMoments: 0,
      newStrategies: 0,
    },
    strugglingWith: [],
    celebratingWins: [],
  };
}
