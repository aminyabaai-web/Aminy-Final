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

  // Roaming AI preferences (persisted in profiles.ai_context so they follow the
  // user across devices; localStorage remains the offline cache/fallback)
  customInstructions?: { aboutMe?: string; responseStyle?: string };
  aiSettings?: Record<string, unknown>;
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

/**
 * Fetch comprehensive user context — Supabase first, KV for AI-generated extras
 */
export async function fetchUserContext(userId: string): Promise<UserContext> {
  try {
    // Run Supabase queries and KV fetch in parallel
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [childResult, sessionResult, goalsResult, kvResult] = await Promise.allSettled([
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
    ]);

    // Build context from Supabase results
    const child = childResult.status === 'fulfilled' ? childResult.value.data : null;
    const sessions = sessionResult.status === 'fulfilled' ? sessionResult.value.data : null;
    const goals = goalsResult.status === 'fulfilled' ? goalsResult.value.data : null;
    const kvData = kvResult.status === 'fulfilled' ? kvResult.value : null;
    const kvContext = kvData?.context || {};

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

      // Roaming AI preferences (M1 — hydrated by BevelChatOverlay on mount;
      // localStorage stays the offline cache/fallback)
      customInstructions: kvContext.customInstructions,
      aiSettings: kvContext.aiSettings,
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

  return parts.join(' ');
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
