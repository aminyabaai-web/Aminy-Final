/**
 * Retention Engine
 *
 * Comprehensive system to drive engagement and reduce churn
 * Combines push notifications, email sequences, gamification, and smart nudges
 */

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
      subject: "Don't break your {{streak}} day streak!",
      template: 'streak_reminder',
    },
    {
      trigger: 'streak_broken',
      subject: "Your streak reset - but you can start fresh today",
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
    "Don't forget - your {streak} day streak is at risk!",
    "Quick check-in to keep your streak alive?",
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
      title: "Don't break your streak!",
      body: `Your ${profile.streakDays} day streak is at risk. Quick check-in?`,
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
      console.error('Welcome email failed:', await response.text());
    } else {
      if (import.meta.env.DEV) console.log('[Retention] Welcome email sent successfully');
    }

    // Store onboarding start time for follow-up emails
    localStorage.setItem(`onboarding_start_${userId}`, new Date().toISOString());
  } catch (error) {
    console.error('Failed to trigger onboarding sequence:', error);
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
      title: 'Keep your streak going!',
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
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );

    const { data } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', userId)
      .eq('streak_type', 'daily_checkin')
      .single();

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
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );

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
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );

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
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );

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
};

export default retentionEngine;
