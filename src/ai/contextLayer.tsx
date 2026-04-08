// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AI Context Layer - Merges user data across all Aminy modules
 * Provides context-aware memory for personalized AI experiences
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface UserContext {
  // Child Profile
  childName?: string;
  childAge?: string;
  childGender?: string;
  priorities?: string[];
  
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
 * Fetch comprehensive user context from all modules
 */
export async function fetchUserContext(userId: string): Promise<UserContext> {
  try {
    // Fetch from KV store (all user data is stored here)
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/context/user/${userId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return getDefaultContext();
    }

    const data = await response.json();
    return data.context || getDefaultContext();
  } catch (error) {
    return getDefaultContext();
  }
}

/**
 * Update user context with new activity
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
          'X-User-Id': userId
        },
        body: JSON.stringify({ updates })
      }
    );
  } catch (error) {
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
          'X-User-Id': userId
        },
        body: JSON.stringify({
          ...memory,
          expiresAt: expiresAt.toISOString()
        })
      }
    );
  } catch (error) {
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
          'X-User-Id': userId
        }
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.memories || [];
  } catch (error) {
    return [];
  }
}

/**
 * Build AI context string from user data
 */
export function buildAIContextString(context: UserContext): string {
  const parts: string[] = [];

  if (context.childName) {
    parts.push(`You're supporting the parent of ${context.childName}${context.childAge ? ` (age ${context.childAge})` : ''}.`);
  }

  if (context.priorities && context.priorities.length > 0) {
    parts.push(`Their top priorities: ${context.priorities.join(', ')}.`);
  }

  if (context.lastCalmCue) {
    parts.push(`Last calm cue you gave: "${context.lastCalmCue}"`);
  }

  if (context.progressThisWeek) {
    const { sessionsCompleted, calmMoments, newStrategies } = context.progressThisWeek;
    parts.push(`This week: ${sessionsCompleted} sessions, ${calmMoments} calm moments, ${newStrategies} new strategies.`);
  }

  if (context.strugglingWith && context.strugglingWith.length > 0) {
    parts.push(`Currently working on: ${context.strugglingWith.join(', ')}.`);
  }

  if (context.celebratingWins && context.celebratingWins.length > 0) {
    parts.push(`Recent wins to celebrate: ${context.celebratingWins.join(', ')}.`);
  }

  if (context.lastJrSession) {
    const timeAgo = getTimeAgo(context.lastJrSession.timestamp);
    parts.push(`Last Ease session was ${timeAgo}: ${context.lastJrSession.activity}.`);
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
  
  // Detect module
  let module: CurrentContext['module'] = 'dashboard';
  let moduleName = 'Dashboard';
  let placeholder = 'Ask Aminy anything...';
  let contextHint = "I'm here to help with anything on your mind.";
  
  if (path.includes('/jr')) {
    module = 'jr';
    moduleName = 'Ease';
    placeholder = 'Ask about calm routines, rewards, transitions, or progress...';
    contextHint = userContext?.lastJrSession 
      ? `Last Ease session: ${userContext.lastJrSession.activity}`
      : 'I can help with calm routines, rewards, transitions, and behavioral strategies.';
  } else if (path.includes('/shop')) {
    module = 'shop';
    moduleName = 'Shop';
    placeholder = 'Ask about tools, resources, or recommendations...';
    contextHint = 'I can help you find the perfect tools for your family.';
  } else if (path.includes('/hub')) {
    module = 'hub';
    moduleName = 'Parent Hub';
    placeholder = 'Ask about community, stories, or support...';
    contextHint = 'I can help you connect with other parents and share experiences.';
  } else if (path.includes('/coverage')) {
    module = 'coverage';
    moduleName = 'Coverage';
    placeholder = 'Ask about insurance, benefits, or coverage...';
    contextHint = 'I can help you understand your coverage and benefits.';
  } else if (path.includes('/plan')) {
    module = 'plan';
    moduleName = 'Daily Plan';
    placeholder = 'Ask about your plan, routines, or goals...';
    contextHint = 'I can help you build calm, sustainable routines.';
  } else if (path.includes('/care')) {
    module = 'care';
    moduleName = 'Care Team';
    placeholder = 'Ask about your care team or appointments...';
    contextHint = 'I can help you manage your care team and sessions.';
  } else if (path.includes('/vault')) {
    module = 'vault';
    moduleName = 'Document Vault';
    placeholder = 'Ask about documents, reports, or records...';
    contextHint = 'I can help you organize and understand your documents.';
  } else if (path.includes('/settings')) {
    module = 'settings';
    moduleName = 'Settings';
    placeholder = 'Ask about settings, preferences, or account...';
    contextHint = 'I can help you customize your Aminy experience.';
  }
  
  // Determine user state
  const userState = {
    isActive: true,
    hasRecentActivity: !!(
      userContext?.lastJrSession || 
      userContext?.lastShopPurchase || 
      userContext?.lastHubPost
    ),
    needsAttention: !!(userContext?.strugglingWith && userContext.strugglingWith.length > 0)
  };
  
  // Recent action
  let recentAction: CurrentContext['recentAction'] | undefined;
  
  if (userContext?.lastJrSession && module === 'jr') {
    recentAction = {
      type: 'jr_session',
      timestamp: userContext.lastJrSession.timestamp,
      details: userContext.lastJrSession.activity
    };
  } else if (userContext?.lastShopPurchase && module === 'shop') {
    recentAction = {
      type: 'shop_purchase',
      timestamp: userContext.lastShopPurchase.timestamp,
      details: userContext.lastShopPurchase.item
    };
  } else if (userContext?.lastHubPost && module === 'hub') {
    recentAction = {
      type: 'hub_post',
      timestamp: userContext.lastHubPost.timestamp,
      details: userContext.lastHubPost.topic
    };
  }
  
  return {
    module,
    moduleName,
    userState,
    recentAction,
    placeholder,
    contextHint
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
 * Helper: Get time ago string
 */
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

/**
 * Default context fallback
 */
function getDefaultContext(): UserContext {
  return {
    progressThisWeek: {
      sessionsCompleted: 0,
      calmMoments: 0,
      newStrategies: 0
    },
    strugglingWith: [],
    celebratingWins: []
  };
}
