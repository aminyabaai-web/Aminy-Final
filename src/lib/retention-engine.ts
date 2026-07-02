// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Retention Engine
 *
 * Comprehensive system to drive engagement and reduce churn
 * Combines push notifications, email sequences, gamification, and smart nudges
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  scheduleNotification,
  sendLocalNotification,
  setupDailyCheckIns,
  isPushSupported,
  getNotificationPermission,
} from './push-notifications';
import {
  sendEmail,
  showLocalNotification,
} from './notification-system';
import { useAminyStore } from './store';

// Types
export interface UserEngagementProfile {
  userId: string;
  lastActiveAt: string;
  totalSessions: number;
  streakDays: number;
  longestStreak: number;
  aiConversations: number;
  goalsCompleted: number;
  tier: 'free' | 'starter' | 'core' | 'pro' | 'proplus';
  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
  emailPreferences: {
    weeklyDigest: boolean;
    progressUpdates: boolean;
    tips: boolean;
    promotional: boolean;
  };
  riskLevel: 'low' | 'medium' | 'high'; // Churn risk
}

export interface RetentionEvent {
  type: RetentionEventType;
  userId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type RetentionEventType =
  | 'app_open'
  | 'conversation_started'
  | 'conversation_completed'
  | 'goal_created'
  | 'goal_completed'
  | 'streak_maintained'
  | 'streak_broken'
  | 'session_completed'
  | 'document_uploaded'
  | 'provider_booked'
  | 'tier_upgraded'
  | 'tier_downgraded'
  | 'notification_enabled'
  | 'notification_disabled'
  | 'inactive_3_days'
  | 'inactive_7_days'
  | 'inactive_14_days';

// Email sequence templates
export const EMAIL_SEQUENCES = {
  onboarding: [
    {
      day: 0,
      subject: "Welcome to Aminy - Let's start your journey",
      template: 'onboarding_welcome',
    },
    {
      day: 1,
      subject: "Quick tip: Get the most out of Aminy",
      template: 'onboarding_ai_intro',
    },
    {
      day: 3,
      subject: "How's it going? Your first week with Aminy",
      template: 'onboarding_checkin',
    },
    {
      day: 7,
      subject: "Your first week recap + what's next",
      template: 'onboarding_week1_recap',
    },
  ],
  reengagement: [
    {
      daysInactive: 3,
      subject: "We miss you! Here's what Aminy can help with today",
      template: 'reengagement_3day',
    },
    {
      daysInactive: 7,
      subject: "It's been a week - let's get back on track",
      template: 'reengagement_7day',
    },
    {
      daysInactive: 14,
      subject: "We're here when you need us",
      template: 'reengagement_14day',
    },
  ],
  streakReminders: [
    {
      trigger: 'streak_at_risk', // User hasn't engaged today but has streak > 3
      subject: "A calm two minutes with {{childName}} today?",
      template: 'streak_reminder',
    },
    {
      trigger: 'streak_broken',
      subject: "A fresh start, whenever you're ready",
      template: 'streak_broken',
    },
    {
      trigger: 'streak_milestone',
      subject: "Amazing! You hit a {{streak}} day streak!",
      template: 'streak_milestone',
    },
  ],
  weeklyDigest: {
    subject: "Your weekly progress with {{childName}}",
    template: 'weekly_digest',
  },
};

// Push notification templates
export const PUSH_TEMPLATES = {
  dailyCheckin: [
    "Good morning! Ready to start {childName}'s day?",
    "How did last night go? Let's plan today together.",
    "Your streak is at {streak} days! Let's keep it going.",
    "Time for your daily check-in with Aminy.",
  ],
  streakReminder: [
    "You've shown up {streak} days — a gentle moment together today?",
    "A quick check-in, whenever you're ready?",
    "Just 2 minutes to maintain your progress.",
  ],
  goalNudge: [
    "You're {progress}% toward your goal. Keep going!",
    "Small steps lead to big changes. Check in today?",
  ],
  achievementCelebration: [
    "You hit a milestone! Let's celebrate.",
    "Amazing progress - {childName} is doing great!",
  ],
  calmMoment: [
    "Need a moment? I'm here to help you decompress.",
    "Take a breath. Let's check in when you're ready.",
    "Feeling overwhelmed? Let's talk about it.",
  ],
};

/**
 * Track a retention event
 */
export async function trackRetentionEvent(
  event: Omit<RetentionEvent, 'timestamp'>
): Promise<void> {
  const fullEvent: RetentionEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/retention/event`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(fullEvent),
      }
    );

    // Also update local store for immediate UI feedback
    updateLocalEngagementState(event.type);
  } catch (error) {
    console.error('Failed to track retention event:', error);
  }
}

/**
 * Update local engagement state based on event
 */
function updateLocalEngagementState(eventType: RetentionEventType): void {
  const store = useAminyStore.getState();

  switch (eventType) {
    case 'app_open':
      // Update last active
      break;
    case 'streak_maintained':
      store.incrementStreak();
      break;
    case 'goal_completed':
      store.addWin({ title: 'Goal completed', source: 'task' });
      break;
  }
}

/**
 * Get user engagement profile
 */
export async function getUserEngagementProfile(
  userId: string
): Promise<UserEngagementProfile | null> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/retention/profile/${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to get engagement profile:', error);
    return null;
  }
}

/**
 * Calculate churn risk for a user
 */
export function calculateChurnRisk(profile: UserEngagementProfile): 'low' | 'medium' | 'high' {
  const daysSinceActive = Math.floor(
    (Date.now() - new Date(profile.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // High risk indicators
  if (daysSinceActive >= 7) return 'high';
  if (profile.streakDays === 0 && profile.totalSessions < 5) return 'high';
  if (profile.tier === 'free' && profile.aiConversations < 3) return 'high';

  // Medium risk indicators
  if (daysSinceActive >= 3) return 'medium';
  if (profile.streakDays < 3 && profile.totalSessions < 10) return 'medium';

  return 'low';
}

/**
 * Get personalized nudge for user
 */
export function getPersonalizedNudge(
  profile: UserEngagementProfile,
  childName: string
): { title: string; body: string; type: string } | null {
  const daysSinceActive = Math.floor(
    (Date.now() - new Date(profile.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const hour = new Date().getHours();

  // Time-based nudges
  if (hour >= 6 && hour < 10) {
    // Morning nudge
    return {
      title: 'Good morning!',
      body: `Ready to start ${childName}'s routine? Let's plan today together.`,
      type: 'daily_checkin',
    };
  }

  if (hour >= 18 && hour < 21) {
    // Evening nudge
    return {
      title: 'How was today?',
      body: `Let's reflect on ${childName}'s day and prepare for tomorrow.`,
      type: 'evening_checkin',
    };
  }

  // Streak-based nudges
  if (profile.streakDays > 0 && daysSinceActive === 0) {
    return {
      title: `${profile.streakDays} day streak!`,
      body: "You're building great habits. Keep it up!",
      type: 'streak_celebration',
    };
  }

  if (profile.streakDays > 3 && daysSinceActive === 1) {
    return {
      title: 'A gentle moment today?',
      body: `You've shown up ${profile.streakDays} days in a row. A quick check-in?`,
      type: 'streak_reminder',
    };
  }

  // Re-engagement nudges
  if (daysSinceActive >= 3 && daysSinceActive < 7) {
    return {
      title: 'We miss you!',
      body: `${childName} is making progress. Let's keep the momentum going.`,
      type: 'reengagement',
    };
  }

  return null;
}

/**
 * Schedule retention notifications for a user
 */
export async function scheduleRetentionNotifications(
  userId: string,
  childName: string,
  preferredTime: string = '09:00'
): Promise<void> {
  if (!isPushSupported() || getNotificationPermission() !== 'granted') {
    return;
  }

  // Set up daily check-ins
  await setupDailyCheckIns(userId, childName, preferredTime);

  // Schedule streak reminders (7 PM for users with active streaks)
  const [hours] = preferredTime.split(':').map(Number);
  const streakReminderTime = new Date();
  streakReminderTime.setHours(19, 0, 0, 0); // 7 PM

  for (let i = 1; i <= 7; i++) {
    const scheduledFor = new Date(streakReminderTime);
    scheduledFor.setDate(scheduledFor.getDate() + i);

    await scheduleNotification(userId, {
      userId,
      title: 'Streak Check',
      body: `Your streak is waiting! Quick check-in before bed?`,
      scheduledFor,
      type: 'streak_reminder',
      data: { childName },
    });
  }
}

/**
 * Trigger onboarding email sequence
 * Sends welcome email immediately, schedules follow-up emails
 */
export async function triggerOnboardingSequence(
  userId: string,
  email: string,
  childName: string,
  parentName?: string
): Promise<void> {
  if (import.meta.env.VITE_ENABLE_RETENTION_EMAILS !== 'true') {
    localStorage.setItem(`onboarding_start_${userId}`, new Date().toISOString());
    return;
  }

  try {
    // Send welcome email immediately
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/email/welcome`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email,
          userName: parentName || 'there',
          childName,
        }),
      }
    );

    if (!response.ok) {
      const message = await response.text();
      if (import.meta.env.DEV) {
        console.warn('Welcome email unavailable during onboarding:', message);
      }
    } else {
      if (import.meta.env.DEV) console.log('[Retention] Welcome email sent successfully');
    }

    // Store onboarding start time for follow-up emails
    localStorage.setItem(`onboarding_start_${userId}`, new Date().toISOString());
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to trigger onboarding sequence:', error);
    }
  }
}

/**
 * Trigger re-engagement campaign
 */
export async function triggerReengagementCampaign(
  userId: string,
  email: string,
  userName: string,
  childName: string,
  daysInactive: number
): Promise<void> {
  const sequence = EMAIL_SEQUENCES.reengagement.find(
    s => s.daysInactive <= daysInactive
  );

  if (!sequence) return;

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/email/re-engage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email,
          userName,
          childName,
          daysSinceLastActivity: daysInactive,
        }),
      }
    );

    if (!response.ok) {
      console.error('Re-engagement email failed:', await response.text());
    } else {
      if (import.meta.env.DEV) console.log(`[Retention] Re-engagement email sent (${daysInactive} days inactive)`);
    }
  } catch (error) {
    console.error('Failed to trigger re-engagement:', error);
  }
}

/**
 * Send weekly digest email
 */
export async function sendWeeklyDigest(
  userId: string,
  email: string,
  userName: string,
  data: {
    childName: string;
    streakDays: number;
    goalsCompleted: number;
    aiConversations: number;
    topInsight?: string;
  }
): Promise<void> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/email/weekly-digest`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email,
          userName,
          childName: data.childName,
          weekStats: {
            checkIns: data.goalsCompleted,
            aiChats: data.aiConversations,
            activitiesCompleted: data.goalsCompleted,
            streakDays: data.streakDays,
            topWin: data.topInsight,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Weekly digest email failed:', await response.text());
    } else {
      if (import.meta.env.DEV) console.log('[Retention] Weekly digest email sent');
    }
  } catch (error) {
    console.error('Failed to send weekly digest:', error);
  }
}

/**
 * Show immediate engagement prompt
 */
export function showEngagementPrompt(
  type: 'streak' | 'goal' | 'calm' | 'achievement',
  data: Record<string, unknown>
): void {
  const prompts = {
    streak: {
      title: 'Another gentle step today?',
      body: `You're on a ${data.streak} day streak. Quick check-in?`,
    },
    goal: {
      title: 'Goal Progress',
      body: `You're ${data.progress}% toward "${data.goalName}"`,
    },
    calm: {
      title: 'Take a breath',
      body: "It sounds like you might need a moment. I'm here.",
    },
    achievement: {
      title: 'Celebration!',
      body: `You achieved: ${data.achievement}`,
    },
  };

  const prompt = prompts[type];
  showLocalNotification(prompt.title, prompt.body, {
    icon: '/icons/icon-192x192.png',
    onClick: () => {
      window.focus();
    },
  });
}

/**
 * Track session engagement for retention scoring
 */
export function trackSessionEngagement(): void {
  const sessionStartTime = Date.now();

  // Track when user leaves
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      const sessionDuration = Date.now() - sessionStartTime;

      // Log session duration for retention analysis
      trackRetentionEvent({
        type: 'app_open',
        userId: useAminyStore.getState().user?.id || 'anonymous',
        metadata: {
          duration: sessionDuration,
          pageViews: window.history.length,
        },
      });
    }
  };

  // Track page visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
}

/**
 * Initialize retention tracking on app load
 */
export function initializeRetentionTracking(): void {
  // Track app open
  const userId = useAminyStore.getState().user?.id;
  if (userId) {
    trackRetentionEvent({
      type: 'app_open',
      userId,
    });
  }

  // Set up session engagement tracking
  trackSessionEngagement();

  // Check if user needs re-engagement
  checkAndTriggerReengagement();
}

/**
 * Check if user needs re-engagement and trigger appropriate campaign
 */
async function checkAndTriggerReengagement(): Promise<void> {
  const state = useAminyStore.getState();
  const userId = state.user?.id;

  if (!userId) return;

  const profile = await getUserEngagementProfile(userId);
  if (!profile) return;

  const daysSinceActive = Math.floor(
    (Date.now() - new Date(profile.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Trigger appropriate re-engagement based on inactivity
  if (daysSinceActive >= 14) {
    await trackRetentionEvent({ type: 'inactive_14_days', userId });
  } else if (daysSinceActive >= 7) {
    await trackRetentionEvent({ type: 'inactive_7_days', userId });
  } else if (daysSinceActive >= 3) {
    await trackRetentionEvent({ type: 'inactive_3_days', userId });
  }
}

/**
 * Hook for components to use retention features
 */
export function useRetention() {
  const store = useAminyStore();
  const userId = store.user?.id;
  const childName = store.user?.childName || 'your child';

  const trackEvent = (type: RetentionEventType, metadata?: Record<string, unknown>) => {
    if (!userId) return;
    trackRetentionEvent({ type, userId, metadata });
  };

  const showNudge = () => {
    if (!userId) return;
    getUserEngagementProfile(userId).then(profile => {
      if (!profile) return;
      const nudge = getPersonalizedNudge(profile, childName);
      if (nudge) {
        showLocalNotification(nudge.title, nudge.body, {
          icon: '/icons/icon-192x192.png',
        });
      }
    });
  };

  return {
    trackEvent,
    showNudge,
    streakDays: store.streaks.current,
    totalWins: store.wins.totalWins,
  };
}

// ============================================================================
// Dashboard Integration Functions
// ============================================================================

/**
 * Get user's primary streak (daily app usage)
 */
export async function getPrimaryStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number } | null> {
  try {
    const { data } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', userId)
      .eq('type', 'daily_checkin')
      .maybeSingle();

    if (data) {
      return {
        currentStreak: data.current_streak || 0,
        longestStreak: data.longest_streak || 0,
      };
    }
    return { currentStreak: 0, longestStreak: 0 };
  } catch {
    return { currentStreak: 0, longestStreak: 0 };
  }
}

/**
 * Get user's earned milestones
 */
export async function getEarnedMilestones(userId: string): Promise<Record<string, unknown>[]> {
  try {
    const { data } = await supabase
      .from('user_milestones')
      .select('*')
      .eq('user_id', userId)
      .eq('is_earned', true)
      .order('earned_at', { ascending: false });

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get pending celebrations (milestones earned but not yet celebrated)
 */
export async function getPendingCelebrations(userId: string): Promise<Record<string, unknown>[]> {
  try {
    const { data } = await supabase
      .from('user_milestones')
      .select('*')
      .eq('user_id', userId)
      .eq('is_earned', true)
      .eq('is_celebrated', false)
      .order('earned_at', { ascending: false });

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Record user activity for streak tracking
 */
export async function recordActivity(userId: string, activityType: string): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Upsert activity record
    await supabase
      .from('user_activities')
      .upsert({
        user_id: userId,
        activity_type: activityType,
        activity_date: today,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,activity_type,activity_date',
      });

    // Update streak
    await Promise.resolve(supabase.rpc('update_user_streak', {
      p_user_id: userId,
      p_streak_type: activityType,
    })).catch(() => {
      // RPC may not exist yet, that's okay
    });
  } catch {
    // Silently fail - streak tracking is non-critical
  }
}

// ============================================================================
// Streak Milestone System
// ============================================================================

export interface StreakMilestone {
  days: number;
  title: string;
  description: string;
  reward: 'badge' | 'coins' | 'feature-unlock' | 'celebration';
  rewardValue: number; // coins earned or badge level
  emoji: string;
  celebrationMessage: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, title: 'Getting Started', description: '3 days in a row!', reward: 'coins', rewardValue: 5, emoji: '\u{1F31F}', celebrationMessage: 'You\'re building a habit! 3 days of showing up for your family.' },
  { days: 7, title: 'One Week Strong', description: 'A full week of consistency!', reward: 'coins', rewardValue: 15, emoji: '\u{1F525}', celebrationMessage: 'One week! Consistency is the #1 predictor of positive outcomes.' },
  { days: 14, title: 'Two Week Champion', description: '14 days of dedication', reward: 'badge', rewardValue: 1, emoji: '\u{1F3C6}', celebrationMessage: 'Two weeks! Research shows habits start forming at this point.' },
  { days: 21, title: 'Habit Formed', description: 'Science says this is a habit now!', reward: 'coins', rewardValue: 30, emoji: '\u{1F9E0}', celebrationMessage: '21 days! You\'ve officially built a wellness habit.' },
  { days: 30, title: 'Monthly Master', description: 'A full month of commitment', reward: 'badge', rewardValue: 2, emoji: '\u{1F48E}', celebrationMessage: 'One month! Your consistency is making a real difference.' },
  { days: 60, title: 'Two Month Hero', description: '60 days of showing up', reward: 'feature-unlock', rewardValue: 1, emoji: '\u{1F680}', celebrationMessage: '60 days! You\'re in the top 5% of families using Aminy.' },
  { days: 90, title: 'Quarter Champion', description: '90 days — extraordinary!', reward: 'celebration', rewardValue: 100, emoji: '\u{1F451}', celebrationMessage: '90 days! Studies show families who engage this long see 3x better outcomes.' },
  { days: 180, title: 'Half-Year Legend', description: '6 months of unwavering commitment', reward: 'celebration', rewardValue: 250, emoji: '\u{2B50}', celebrationMessage: 'Half a year! You are an Aminy legend. Your child\'s progress is extraordinary.' },
  { days: 365, title: 'Year of Growth', description: 'A full year together', reward: 'celebration', rewardValue: 500, emoji: '\u{1F308}', celebrationMessage: 'ONE YEAR! What an incredible journey. Look how far you\'ve come.' },
];

/**
 * Check if user has hit a new streak milestone
 */
export function checkStreakMilestone(currentStreak: number, previousStreak: number): StreakMilestone | null {
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone.days && previousStreak < milestone.days) {
      return milestone;
    }
  }
  return null;
}

/**
 * Get next upcoming milestone for a given streak
 */
export function getNextMilestone(currentStreak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find(m => m.days > currentStreak) ?? null;
}

/**
 * Calculate days until next milestone
 */
export function daysUntilNextMilestone(currentStreak: number): { milestone: StreakMilestone; daysRemaining: number } | null {
  const next = getNextMilestone(currentStreak);
  if (!next) return null;
  return { milestone: next, daysRemaining: next.days - currentStreak };
}

// ============================================================================
// Engagement Scoring
// ============================================================================

export interface EngagementScore {
  score: number; // 0-100
  level: 'power-user' | 'engaged' | 'casual' | 'at-risk' | 'churning';
  factors: {
    recency: number;     // 0-25 — how recently they used the app
    frequency: number;   // 0-25 — how often they use it
    depth: number;       // 0-25 — how many features they use
    consistency: number; // 0-25 — streak and regularity
  };
  recommendations: string[];
}

export function calculateEngagementScore(profile: UserEngagementProfile): EngagementScore {
  const daysSinceActive = Math.floor(
    (Date.now() - new Date(profile.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Recency score (0-25)
  let recency = 25;
  if (daysSinceActive >= 14) recency = 0;
  else if (daysSinceActive >= 7) recency = 5;
  else if (daysSinceActive >= 3) recency = 10;
  else if (daysSinceActive >= 1) recency = 20;

  // Frequency score (0-25)
  const sessionsPerWeek = profile.totalSessions / Math.max(1, Math.ceil(
    (Date.now() - new Date(profile.lastActiveAt).getTime()) / (7 * 24 * 60 * 60 * 1000)
  ));
  let frequency = Math.min(25, Math.round(sessionsPerWeek * 5));

  // Depth score (0-25) — based on feature usage
  let depth = 0;
  if (profile.aiConversations > 0) depth += 8;
  if (profile.goalsCompleted > 0) depth += 8;
  if (profile.onboardingCompleted) depth += 5;
  if (profile.notificationsEnabled) depth += 4;
  depth = Math.min(25, depth);

  // Consistency score (0-25)
  let consistency = Math.min(25, Math.round((profile.streakDays / 30) * 25));

  const score = recency + frequency + depth + consistency;

  let level: EngagementScore['level'];
  if (score >= 80) level = 'power-user';
  else if (score >= 60) level = 'engaged';
  else if (score >= 40) level = 'casual';
  else if (score >= 20) level = 'at-risk';
  else level = 'churning';

  const recommendations: string[] = [];
  if (recency < 15) recommendations.push('Send personalized re-engagement notification');
  if (frequency < 10) recommendations.push('Suggest daily check-in routine');
  if (depth < 10) recommendations.push('Introduce unused features via guided walkthrough');
  if (consistency < 10) recommendations.push('Enable streak reminders');
  if (!profile.notificationsEnabled) recommendations.push('Prompt for notification permission');
  if (profile.tier === 'free' && score >= 40) recommendations.push('Show upgrade prompt — engaged free user');

  return {
    score,
    level,
    factors: { recency, frequency, depth, consistency },
    recommendations,
  };
}

// ============================================================================
// Virality & Referral Triggers
// ============================================================================

export interface ViralMoment {
  trigger: string;
  shareMessage: string;
  channel: 'sms' | 'email' | 'social' | 'link';
}

/**
 * Identify viral moments — times when a user is most likely to share
 */
export function identifyViralMoments(profile: UserEngagementProfile, childName: string): ViralMoment[] {
  const moments: ViralMoment[] = [];

  if (profile.streakDays >= 7) {
    moments.push({
      trigger: 'streak-milestone',
      shareMessage: `I've been using Aminy for ${profile.streakDays} days straight to support ${childName}. It's been incredible for our family!`,
      channel: 'social',
    });
  }

  if (profile.goalsCompleted >= 5) {
    moments.push({
      trigger: 'goal-achievement',
      shareMessage: `${childName} just hit their ${profile.goalsCompleted}th goal on Aminy! So proud of their progress.`,
      channel: 'social',
    });
  }

  if (profile.aiConversations >= 10) {
    moments.push({
      trigger: 'ai-power-user',
      shareMessage: `Aminy's AI has been like having a behavior consultant on-call 24/7. Game changer for our family.`,
      channel: 'sms',
    });
  }

  return moments;
}

// Named export for retentionEngine object
export const retentionEngine = {
  trackRetentionEvent,
  getUserEngagementProfile,
  calculateChurnRisk,
  getPersonalizedNudge,
  scheduleRetentionNotifications,
  triggerOnboardingSequence,
  triggerReengagementCampaign,
  sendWeeklyDigest,
  showEngagementPrompt,
  trackSessionEngagement,
  initializeRetentionTracking,
  useRetention,
  getPrimaryStreak,
  getEarnedMilestones,
  getPendingCelebrations,
  recordActivity,
  checkStreakMilestone,
  getNextMilestone,
  daysUntilNextMilestone,
  calculateEngagementScore,
  identifyViralMoments,
};

export default retentionEngine;
