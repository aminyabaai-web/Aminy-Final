// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Proactive AI Notification System (Bevel Intelligence-style)
 *
 * Unlike passive notifications ("You have 3 unread messages"), proactive
 * notifications analyze your child's data and surface INSIGHTS:
 *
 * - "Aiden's accuracy dropped 15% in social activities this week"
 * - "You haven't logged a Calm Corner session in 4 days — transitions getting harder?"
 * - "Great week! 3-day streak + goal mastery in transitions. Want to celebrate?"
 * - "Your authorization expires in 12 days — should I help with renewal?"
 * - "Based on this week's data, I'd suggest focusing on sensory activities"
 *
 * These are scheduled on a cadence the user configures (morning, evening, weekly)
 * and reference actual structured data from the app.
 */

export type NotificationCadence = 'morning' | 'evening' | 'weekly' | 'realtime';
export type NotificationPriority = 'urgent' | 'important' | 'insight' | 'celebration';

export interface ProactiveNotification {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  cadence: NotificationCadence;
  category: string;
  actionUrl?: string;
  actionLabel?: string;
  dataSnapshot?: Record<string, unknown>;
  generatedAt: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  morningCheckIn: boolean;
  morningTime: string; // "08:00"
  eveningReflection: boolean;
  eveningTime: string; // "20:00"
  weeklySummary: boolean;
  weeklyDay: number; // 0=Sunday
  realtimeInsights: boolean;
  streakReminders: boolean;
  authorizationAlerts: boolean;
  goalMilestones: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  morningCheckIn: true,
  morningTime: '08:00',
  eveningReflection: true,
  eveningTime: '20:00',
  weeklySummary: true,
  weeklyDay: 0,
  realtimeInsights: true,
  streakReminders: true,
  authorizationAlerts: true,
  goalMilestones: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

// ─── Insight Generators ─────────────────────────────────────────────

interface ChildDataSnapshot {
  streakDays: number;
  activitiesThisWeek: number;
  calmCornerSessions: number;
  goalProgress: { name: string; percent: number; trend: 'up' | 'down' | 'stable' }[];
  accuracyByDomain: Record<string, number>;
  lastAccuracyByDomain?: Record<string, number>;
  authDaysRemaining?: number;
  upcomingSessions: number;
  daysInactive: number;
  milestones: string[];
}

export function generateMorningCheckIn(
  childName: string,
  data: ChildDataSnapshot
): ProactiveNotification {
  const hour = new Date().getHours();
  let title: string;
  let body: string;

  if (data.streakDays >= 7) {
    title = `${data.streakDays}-day streak! Keep going.`;
    body = `${childName} has been on a roll. Today's focus: ${suggestFocus(data)}`;
  } else if (data.daysInactive >= 2) {
    title = `We missed you yesterday`;
    body = `Quick 5-minute check-in with ${childName}? Even small moments add up.`;
  } else {
    title = `Good morning — ready for today?`;
    body = `${childName}'s goals this week: ${data.goalProgress.slice(0, 2).map(g => g.name).join(', ')}`;
  }

  return {
    id: `morning-${Date.now()}`,
    title,
    body,
    priority: 'insight',
    cadence: 'morning',
    category: 'daily-checkin',
    actionUrl: '/?screen=dashboard',
    actionLabel: 'Start the day',
    dataSnapshot: { streakDays: data.streakDays, activitiesThisWeek: data.activitiesThisWeek },
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  };
}

export function generateEveningReflection(
  childName: string,
  data: ChildDataSnapshot
): ProactiveNotification {
  const wins = data.goalProgress.filter(g => g.trend === 'up');
  const concerns = data.goalProgress.filter(g => g.trend === 'down');

  let title: string;
  let body: string;

  if (wins.length > 0) {
    title = `Today's win: ${wins[0].name}`;
    body = `${childName} showed improvement in ${wins.map(w => w.name).join(' and ')}. That consistency is everything.`;
  } else if (concerns.length > 0) {
    title = `Tough day? That's okay.`;
    body = `${concerns[0].name} was challenging today. Want to talk about strategies for tomorrow?`;
  } else {
    title = `How was today?`;
    body = `Take 30 seconds to reflect. Even hard days build the foundation.`;
  }

  return {
    id: `evening-${Date.now()}`,
    title,
    body,
    priority: wins.length > 0 ? 'celebration' : 'insight',
    cadence: 'evening',
    category: 'daily-reflection',
    actionUrl: '/?screen=ask-aminy',
    actionLabel: 'Reflect with Aminy',
    generatedAt: new Date().toISOString(),
  };
}

export function generateWeeklySummary(
  childName: string,
  data: ChildDataSnapshot
): ProactiveNotification {
  const improving = data.goalProgress.filter(g => g.trend === 'up').length;
  const total = data.goalProgress.length;

  return {
    id: `weekly-${Date.now()}`,
    title: `${childName}'s week in review`,
    body: `${data.activitiesThisWeek} activities completed, ${improving}/${total} goals trending up, ${data.calmCornerSessions} calm-down sessions. ${data.streakDays}-day streak.`,
    priority: 'insight',
    cadence: 'weekly',
    category: 'weekly-summary',
    actionUrl: '/?screen=outcomes',
    actionLabel: 'See full report',
    dataSnapshot: {
      activitiesThisWeek: data.activitiesThisWeek,
      goalsImproving: improving,
      streakDays: data.streakDays,
    },
    generatedAt: new Date().toISOString(),
  };
}

export function generateRealtimeInsights(
  childName: string,
  data: ChildDataSnapshot
): ProactiveNotification[] {
  const insights: ProactiveNotification[] = [];

  // Authorization expiring
  if (data.authDaysRemaining !== undefined && data.authDaysRemaining <= 14) {
    insights.push({
      id: `auth-expiring-${Date.now()}`,
      title: `Authorization expires in ${data.authDaysRemaining} days`,
      body: `${childName}'s ABA authorization needs renewal. Want me to help prepare the re-auth request?`,
      priority: data.authDaysRemaining <= 7 ? 'urgent' : 'important',
      cadence: 'realtime',
      category: 'authorization',
      actionUrl: '/?screen=benefits',
      actionLabel: 'Start renewal',
      generatedAt: new Date().toISOString(),
    });
  }

  // Accuracy decline
  if (data.lastAccuracyByDomain) {
    for (const [domain, accuracy] of Object.entries(data.accuracyByDomain)) {
      const lastAccuracy = data.lastAccuracyByDomain[domain];
      if (lastAccuracy && accuracy < lastAccuracy - 15) {
        insights.push({
          id: `accuracy-drop-${domain}-${Date.now()}`,
          title: `${domain} accuracy dropped ${Math.round(lastAccuracy - accuracy)}%`,
          body: `${childName}'s ${domain} accuracy went from ${Math.round(lastAccuracy)}% to ${Math.round(accuracy)}% this week. Could be fatigue, new skill difficulty, or a phase — want to discuss?`,
          priority: 'important',
          cadence: 'realtime',
          category: 'accuracy-alert',
          actionUrl: '/?screen=ask-aminy',
          actionLabel: 'Ask Aminy AI about this',
          generatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Milestone reached
  if (data.milestones.length > 0) {
    insights.push({
      id: `milestone-${Date.now()}`,
      title: `New milestone!`,
      body: `${childName} reached a milestone: ${data.milestones[0]}. This is worth celebrating.`,
      priority: 'celebration',
      cadence: 'realtime',
      category: 'milestone',
      actionUrl: '/?screen=outcomes',
      actionLabel: 'Celebrate',
      generatedAt: new Date().toISOString(),
    });
  }

  return insights;
}

// ─── Helpers ────────────────────────────────────────────────────────

function suggestFocus(data: ChildDataSnapshot): string {
  // Find weakest domain
  const domains = Object.entries(data.accuracyByDomain);
  if (domains.length === 0) return 'building daily routines';
  domains.sort((a, b) => a[1] - b[1]);
  return domains[0][0].toLowerCase();
}

export function isWithinQuietHours(prefs: NotificationPreferences): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;

  const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Wraps midnight
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}
