/**
 * Retention Scheduler
 *
 * Manages scheduled email and push notifications for user retention.
 * Handles:
 * - Trial day reminders (day 1, 3, 5, 6)
 * - Streak reminders
 * - Re-engagement nudges
 * - Feature adoption prompts
 */

import { supabase } from '../utils/supabase/client';

// ============================================
// TYPES
// ============================================

export type NotificationType =
  | 'trial_reminder'
  | 'trial_ending_soon'
  | 'trial_expired'
  | 'streak_reminder'
  | 'streak_at_risk'
  | 'reengagement'
  | 'feature_adoption'
  | 'weekly_summary'
  | 'community_activity'
  | 'care_plan_reminder';

export interface ScheduledNotification {
  id: string;
  userId: string;
  type: NotificationType;
  scheduledFor: string;
  channel: 'email' | 'push' | 'both';
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  payload: {
    subject?: string;
    title: string;
    body: string;
    actionUrl?: string;
    actionText?: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  sentAt?: string;
}

export interface NotificationTemplate {
  type: NotificationType;
  subject?: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionText?: string;
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

const NOTIFICATION_TEMPLATES: Record<NotificationType, (data?: any) => NotificationTemplate> = {
  trial_reminder: (data) => ({
    type: 'trial_reminder',
    subject: `Day ${data?.day || 1}: You're making progress!`,
    title: 'Keep the momentum going!',
    body: data?.day === 1
      ? `Welcome to Aminy! Try asking me for a calm cue when ${data?.childName || 'your child'} needs support.`
      : data?.day === 3
        ? `You've been doing great! Have you tried the care plan feature yet? It helps coordinate with your provider.`
        : `Halfway through your trial! Here's what families love most about Aminy...`,
    actionUrl: '/dashboard',
    actionText: 'Open Aminy',
  }),

  trial_ending_soon: (data) => ({
    type: 'trial_ending_soon',
    subject: `${data?.daysLeft || 1} day${data?.daysLeft !== 1 ? 's' : ''} left in your trial`,
    title: 'Your trial is ending soon',
    body: `Don't lose your personalized experience and ${data?.memoriesCount || 'all your'} memories. Subscribe to keep everything.`,
    actionUrl: '/paywall',
    actionText: 'See Plans',
  }),

  trial_expired: (data) => ({
    type: 'trial_expired',
    subject: 'Your trial has ended',
    title: 'We miss you!',
    body: `Your trial ended, but your ${data?.childName || 'child'}'s data is safe. Reactivate anytime to pick up where you left off.`,
    actionUrl: '/paywall',
    actionText: 'Reactivate',
  }),

  streak_reminder: (data) => ({
    type: 'streak_reminder',
    subject: `Keep your ${data?.streak || 1}-day streak alive!`,
    title: `${data?.streak || 1} days and counting!`,
    body: `You're on a ${data?.streak || 1}-day streak. Check in with Aminy today to keep it going.`,
    actionUrl: '/dashboard',
    actionText: 'Check In',
  }),

  streak_at_risk: (data) => ({
    type: 'streak_at_risk',
    subject: `Don't break your ${data?.streak || 1}-day streak!`,
    title: 'Your streak is at risk!',
    body: `You've been consistent for ${data?.streak || 1} days. Don't stop now - just 30 seconds keeps it going.`,
    actionUrl: '/dashboard',
    actionText: 'Save Streak',
  }),

  reengagement: (data) => ({
    type: 'reengagement',
    subject: `${data?.childName || 'Your family'} - we're here when you need us`,
    title: 'We miss you!',
    body: `It's been ${data?.daysSinceVisit || 'a while'} since you last visited. ${data?.childName || 'Your child'}'s personalized support is waiting.`,
    actionUrl: '/dashboard',
    actionText: 'Come Back',
  }),

  feature_adoption: (data) => ({
    type: 'feature_adoption',
    subject: `Have you tried ${data?.featureName || 'this feature'}?`,
    title: `Discover ${data?.featureName || 'new features'}`,
    body: data?.featureDescription || 'Parents love this feature for managing challenging moments.',
    actionUrl: data?.featureUrl || '/dashboard',
    actionText: 'Try It',
  }),

  weekly_summary: (data) => ({
    type: 'weekly_summary',
    subject: `${data?.childName || 'Your child'}'s weekly progress`,
    title: 'Your Week in Review',
    body: `This week: ${data?.aiMessages || 0} AI conversations, ${data?.calmCues || 0} calm cues used, ${data?.streakDays || 0}-day streak.`,
    actionUrl: '/dashboard',
    actionText: 'See Details',
  }),

  community_activity: (data) => ({
    type: 'community_activity',
    subject: 'New activity in your community',
    title: 'Parents are sharing...',
    body: `${data?.newPosts || 'New posts'} in the community. See what strategies other families are using.`,
    actionUrl: '/community',
    actionText: 'View Community',
  }),

  care_plan_reminder: (data) => ({
    type: 'care_plan_reminder',
    subject: 'Time to update your care plan',
    title: 'Care Plan Check-in',
    body: `It's been ${data?.daysSinceUpdate || 7} days since you updated ${data?.childName || 'your child'}'s care plan. Any progress to share?`,
    actionUrl: '/care-page',
    actionText: 'Update Plan',
  }),
};

// ============================================
// SCHEDULING FUNCTIONS
// ============================================

/**
 * Schedule a notification for a user
 */
export async function scheduleNotification(
  userId: string,
  type: NotificationType,
  scheduledFor: Date,
  channel: 'email' | 'push' | 'both' = 'both',
  templateData?: any
): Promise<ScheduledNotification | null> {
  const template = NOTIFICATION_TEMPLATES[type](templateData);

  const notification: Omit<ScheduledNotification, 'id'> = {
    userId,
    type,
    scheduledFor: scheduledFor.toISOString(),
    channel,
    status: 'pending',
    payload: {
      subject: template.subject,
      title: template.title,
      body: template.body,
      actionUrl: template.actionUrl,
      actionText: template.actionText,
    },
    metadata: templateData,
    createdAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        scheduled_for: notification.scheduledFor,
        channel: notification.channel,
        status: notification.status,
        payload: notification.payload,
        metadata: notification.metadata || {},
        created_at: notification.createdAt,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[Retention] Scheduled ${type} notification for ${scheduledFor.toISOString()}`);

    return {
      ...notification,
      id: data.id,
    };
  } catch (err) {
    console.warn('[Retention] Failed to schedule notification:', err);
    // Store locally as fallback
    const localNotifications = JSON.parse(localStorage.getItem('aminy_scheduled_notifications') || '[]');
    const localNotification = {
      ...notification,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    localNotifications.push(localNotification);
    localStorage.setItem('aminy_scheduled_notifications', JSON.stringify(localNotifications));
    return localNotification;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scheduled_notifications')
      .update({ status: 'cancelled' })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Retention] Failed to cancel notification:', err);
    return false;
  }
}

/**
 * Cancel all pending notifications of a type for a user
 */
export async function cancelNotificationsOfType(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scheduled_notifications')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('type', type)
      .eq('status', 'pending');

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Retention] Failed to cancel notifications:', err);
    return false;
  }
}

// ============================================
// TRIAL SEQUENCE SCHEDULER
// ============================================

/**
 * Schedule the full trial email/push sequence for a new user
 */
export async function scheduleTrialSequence(
  userId: string,
  childName?: string,
  trialStartDate: Date = new Date()
): Promise<void> {
  const data = { childName };

  // Day 1: Welcome reminder (6 hours after signup)
  await scheduleNotification(
    userId,
    'trial_reminder',
    new Date(trialStartDate.getTime() + 6 * 60 * 60 * 1000),
    'both',
    { ...data, day: 1 }
  );

  // Day 3: Feature discovery
  await scheduleNotification(
    userId,
    'trial_reminder',
    new Date(trialStartDate.getTime() + 3 * 24 * 60 * 60 * 1000),
    'both',
    { ...data, day: 3 }
  );

  // Day 5: Halfway point
  await scheduleNotification(
    userId,
    'trial_reminder',
    new Date(trialStartDate.getTime() + 5 * 24 * 60 * 60 * 1000),
    'both',
    { ...data, day: 5 }
  );

  // Day 6: Trial ending soon (24 hours before end)
  await scheduleNotification(
    userId,
    'trial_ending_soon',
    new Date(trialStartDate.getTime() + 6 * 24 * 60 * 60 * 1000),
    'both',
    { ...data, daysLeft: 1 }
  );

  // Day 7: Last few hours
  await scheduleNotification(
    userId,
    'trial_ending_soon',
    new Date(trialStartDate.getTime() + 6.5 * 24 * 60 * 60 * 1000),
    'both',
    { ...data, daysLeft: 0.5 }
  );

  // Day 8: Trial expired (only if not converted)
  await scheduleNotification(
    userId,
    'trial_expired',
    new Date(trialStartDate.getTime() + 8 * 24 * 60 * 60 * 1000),
    'email',
    data
  );

  console.log(`[Retention] Scheduled trial sequence for user ${userId}`);
}

/**
 * Cancel trial sequence (e.g., when user converts)
 */
export async function cancelTrialSequence(userId: string): Promise<void> {
  await cancelNotificationsOfType(userId, 'trial_reminder');
  await cancelNotificationsOfType(userId, 'trial_ending_soon');
  await cancelNotificationsOfType(userId, 'trial_expired');
  console.log(`[Retention] Cancelled trial sequence for user ${userId}`);
}

// ============================================
// STREAK REMINDERS
// ============================================

/**
 * Schedule streak reminder for tomorrow
 */
export async function scheduleStreakReminder(
  userId: string,
  currentStreak: number
): Promise<void> {
  // Cancel any existing streak reminders
  await cancelNotificationsOfType(userId, 'streak_reminder');
  await cancelNotificationsOfType(userId, 'streak_at_risk');

  // Schedule for tomorrow at 6pm local time
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  await scheduleNotification(
    userId,
    'streak_reminder',
    tomorrow,
    'push',
    { streak: currentStreak }
  );

  // Also schedule an "at risk" reminder for 10pm if they haven't checked in
  const tonight = new Date();
  tonight.setDate(tonight.getDate() + 1);
  tonight.setHours(22, 0, 0, 0);

  await scheduleNotification(
    userId,
    'streak_at_risk',
    tonight,
    'push',
    { streak: currentStreak }
  );
}

// ============================================
// REENGAGEMENT
// ============================================

/**
 * Check for inactive users and schedule reengagement
 */
export async function scheduleReengagementIfNeeded(
  userId: string,
  lastActiveDate: Date,
  childName?: string
): Promise<void> {
  const now = new Date();
  const daysSinceActive = Math.floor((now.getTime() - lastActiveDate.getTime()) / (24 * 60 * 60 * 1000));

  // Schedule reengagement based on inactivity
  if (daysSinceActive >= 3 && daysSinceActive < 7) {
    // 3-day inactivity
    await scheduleNotification(
      userId,
      'reengagement',
      new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
      'push',
      { childName, daysSinceVisit: daysSinceActive }
    );
  } else if (daysSinceActive >= 7 && daysSinceActive < 14) {
    // 7-day inactivity
    await scheduleNotification(
      userId,
      'reengagement',
      new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1 hour from now
      'both',
      { childName, daysSinceVisit: daysSinceActive }
    );
  } else if (daysSinceActive >= 14) {
    // 14+ day inactivity
    await scheduleNotification(
      userId,
      'reengagement',
      now,
      'email',
      { childName, daysSinceVisit: daysSinceActive }
    );
  }
}

// ============================================
// WEEKLY SUMMARY
// ============================================

/**
 * Schedule weekly summary email for Sunday
 */
export async function scheduleWeeklySummary(
  userId: string,
  childName?: string
): Promise<void> {
  // Cancel existing weekly summary
  await cancelNotificationsOfType(userId, 'weekly_summary');

  // Find next Sunday at 10am
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
  nextSunday.setHours(10, 0, 0, 0);

  await scheduleNotification(
    userId,
    'weekly_summary',
    nextSunday,
    'email',
    { childName }
  );
}

// ============================================
// PROCESS SCHEDULED NOTIFICATIONS
// ============================================

/**
 * Process due notifications (call this from a cron job or Edge Function)
 */
export async function processDueNotifications(): Promise<number> {
  try {
    const now = new Date();

    // Get pending notifications that are due
    const { data: dueNotifications, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .limit(100);

    if (error) throw error;

    let processed = 0;

    for (const notification of dueNotifications || []) {
      try {
        // Send the notification
        if (notification.channel === 'email' || notification.channel === 'both') {
          await sendEmail(notification);
        }
        if (notification.channel === 'push' || notification.channel === 'both') {
          await sendPush(notification);
        }

        // Mark as sent
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'sent', sent_at: now.toISOString() })
          .eq('id', notification.id);

        processed++;
      } catch (sendError) {
        console.error(`[Retention] Failed to send notification ${notification.id}:`, sendError);

        // Mark as failed
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'failed' })
          .eq('id', notification.id);
      }
    }

    console.log(`[Retention] Processed ${processed} notifications`);
    return processed;
  } catch (err) {
    console.error('[Retention] Error processing notifications:', err);
    return 0;
  }
}

// ============================================
// NOTIFICATION SENDERS
// ============================================

/**
 * Send email notification (implement with your email provider)
 */
async function sendEmail(notification: any): Promise<void> {
  // TODO: Integrate with email provider (Resend, SendGrid, etc.)
  console.log(`[Email] Would send to user ${notification.user_id}: ${notification.payload.subject}`);

  // Example implementation with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'Aminy <hello@aminy.app>',
  //   to: userEmail,
  //   subject: notification.payload.subject,
  //   html: `<h1>${notification.payload.title}</h1><p>${notification.payload.body}</p>`,
  // });
}

/**
 * Send push notification (implement with your push provider)
 */
async function sendPush(notification: any): Promise<void> {
  // TODO: Integrate with push provider (Firebase, OneSignal, etc.)
  console.log(`[Push] Would send to user ${notification.user_id}: ${notification.payload.title}`);

  // Example implementation with Firebase:
  // await admin.messaging().send({
  //   token: userPushToken,
  //   notification: {
  //     title: notification.payload.title,
  //     body: notification.payload.body,
  //   },
  //   data: {
  //     actionUrl: notification.payload.actionUrl,
  //   },
  // });
}

// ============================================
// EXPORTS
// ============================================

export default {
  scheduleNotification,
  cancelNotification,
  cancelNotificationsOfType,
  scheduleTrialSequence,
  cancelTrialSequence,
  scheduleStreakReminder,
  scheduleReengagementIfNeeded,
  scheduleWeeklySummary,
  processDueNotifications,
  NOTIFICATION_TEMPLATES,
};
