// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Notification System
 * Push notifications, email digest, in-app notification center
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  deepLink?: string;
  icon?: string;
  timestamp: string;
  read: boolean;
  type: 'system' | 'progress' | 'reminder' | 'achievement' | 'coach' | 'engagement';
}

/**
 * Get the active service worker registration.
 * Service worker is registered by VitePWA — do NOT register manually.
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

/**
 * Request push notification permission
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  // Check if already granted
  if (Notification.permission === 'granted') {
    return true;
  }

  // Don't ask if previously denied (will re-prompt after 30 days)
  if (Notification.permission === 'denied') {
    const lastDenied = localStorage.getItem('notification_denied_at');
    if (lastDenied) {
      const daysSinceDenied = (Date.now() - parseInt(lastDenied)) / (1000 * 60 * 60 * 24);
      if (daysSinceDenied < 30) {
        return false;
      }
    }
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'denied') {
      localStorage.setItem('notification_denied_at', Date.now().toString());
      return false;
    }

    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  userId: string
): Promise<boolean> {
  try {
    // Get or create push subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      const vapidPublicKey = await getVapidPublicKey();
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    }

    // Send subscription to server
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/notifications/subscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }

    return true;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return false;
  }
}

/**
 * Get VAPID public key from server
 */
async function getVapidPublicKey(): Promise<string> {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/notifications/vapid-key`,
    {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get VAPID key');
  }

  const data = await response.json();
  return data.publicKey;
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * IndexedDB for offline notification cache
 */
class NotificationDB {
  private dbName = 'aminy_notifications';
  private storeName = 'notifications';
  private version = 1;

  async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('read', 'read', { unique: false });
        }
      };
    });
  }

  async saveNotification(notification: NotificationPayload): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await store.put(notification);
    db.close();

    // Clean up old notifications (keep last 7 days)
    await this.cleanupOldNotifications();
  }

  async getNotifications(limit: number = 50): Promise<NotificationPayload[]> {
    const db = await this.open();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // Newest first
      const notifications: NotificationPayload[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && notifications.length < limit) {
          notifications.push(cursor.value);
          cursor.continue();
        } else {
          resolve(notifications);
          db.close();
        }
      };

      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    const notification = await (store.get(notificationId) as unknown as Promise<Record<string, unknown> | undefined>);
    if (notification) {
      notification.read = true;
      await (store.put(notification) as unknown as Promise<IDBValidKey>);
    }
    
    db.close();
  }

  async cleanupOldNotifications(): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('timestamp');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.upperBound(sevenDaysAgo.toISOString()));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
          db.close();
        }
      };

      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  }
}

export const notificationDB = new NotificationDB();

/**
 * Send weekly digest email
 * (Called by Supabase cron job)
 */
export async function generateWeeklyDigest(userId: string): Promise<{
  jrSessions: number;
  coinsEarned: number;
  cuesUsed: string[];
  topProgress: string;
}> {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/notifications/weekly-digest`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ userId }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate weekly digest');
  }

  return response.json();
}

/**
 * Handle notification click (deep linking)
 */
export function handleNotificationClick(notification: NotificationPayload): void {
  // Mark as read
  notificationDB.markAsRead(notification.id);

  // Navigate to deep link
  if (notification.deepLink) {
    // Use your app's navigation system
    window.location.hash = notification.deepLink;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const notifications = await notificationDB.getNotifications();
  return notifications.filter(n => !n.read).length;
}

// ============================================================================
// Telehealth Notification Types
// ============================================================================

export type TelehealthNotificationType =
  | 'appointment_confirmed'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_1h'
  | 'appointment_reminder_15m'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'provider_joined'
  | 'visit_summary_ready'
  | 'action_item_reminder'
  | 'follow_up_reminder';

export interface TelehealthNotification extends NotificationPayload {
  notificationType: TelehealthNotificationType;
  appointmentId?: string;
  providerId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Email Notifications
// ============================================================================

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Send email notification
 */
export async function sendEmail(
  to: string,
  template: TelehealthNotificationType,
  data: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string }> {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/notifications/email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ to, template, data }),
    }
  );

  if (!response.ok) {
    console.error('Failed to send email:', await response.text());
    return { success: false };
  }

  return response.json();
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmationEmail(
  email: string,
  data: {
    userName: string;
    providerName: string;
    appointmentDate: string;
    appointmentTime: string;
    visitType: string;
    videoLink?: string;
    calendarLink?: string;
  }
): Promise<boolean> {
  const result = await sendEmail(email, 'appointment_confirmed', data);
  return result.success;
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminderEmail(
  email: string,
  data: {
    userName: string;
    providerName: string;
    appointmentDate: string;
    appointmentTime: string;
    minutesUntil: number;
    videoLink: string;
  }
): Promise<boolean> {
  const template = data.minutesUntil <= 60
    ? 'appointment_reminder_1h'
    : 'appointment_reminder_24h';

  const result = await sendEmail(email, template, data);
  return result.success;
}

// ============================================================================
// SMS Notifications (via Twilio)
// ============================================================================

/**
 * Send SMS notification
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/notifications/sms`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ phoneNumber, message }),
    }
  );

  if (!response.ok) {
    console.error('Failed to send SMS:', await response.text());
    return { success: false };
  }

  return response.json();
}

/**
 * Send appointment reminder SMS
 */
export async function sendAppointmentReminderSMS(
  phoneNumber: string,
  data: {
    providerName: string;
    appointmentTime: string;
    minutesUntil: number;
    videoLink?: string;
  }
): Promise<boolean> {
  const message = data.minutesUntil <= 15
    ? `Aminy: Your appointment with ${data.providerName} starts in ${data.minutesUntil} minutes. ${data.videoLink ? `Join: ${data.videoLink}` : ''}`
    : `Aminy: Reminder - Your appointment with ${data.providerName} is at ${data.appointmentTime}. We'll send you a link to join.`;

  const result = await sendSMS(phoneNumber, message);
  return result.success;
}

// ============================================================================
// Appointment Reminder Scheduler
// ============================================================================

/**
 * Schedule appointment reminders
 * Should be called when an appointment is created
 */
export async function scheduleAppointmentReminders(
  appointmentId: string,
  userId: string,
  email: string,
  phoneNumber: string | undefined,
  appointmentTime: Date,
  providerName: string,
  videoLink?: string
): Promise<void> {
  const now = Date.now();
  const appointmentMs = appointmentTime.getTime();

  // 24 hours before
  const reminder24h = appointmentMs - 24 * 60 * 60 * 1000;
  // 1 hour before
  const reminder1h = appointmentMs - 60 * 60 * 1000;
  // 15 minutes before
  const reminder15m = appointmentMs - 15 * 60 * 1000;

  const reminders = [
    { time: reminder24h, minutes: 24 * 60 },
    { time: reminder1h, minutes: 60 },
    { time: reminder15m, minutes: 15 },
  ].filter(r => r.time > now);

  // Schedule reminders via backend
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/notifications/schedule-reminders`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        appointmentId,
        userId,
        email,
        phoneNumber,
        providerName,
        videoLink,
        reminders: reminders.map(r => ({
          scheduledFor: new Date(r.time).toISOString(),
          minutesBefore: r.minutes,
        })),
      }),
    }
  );

  if (!response.ok) {
    console.error('Failed to schedule reminders:', await response.text());
  }
}

/**
 * Cancel scheduled reminders (for cancelled/rescheduled appointments)
 */
export async function cancelAppointmentReminders(appointmentId: string): Promise<void> {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/notifications/cancel-reminders/${appointmentId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );

  if (!response.ok) {
    console.error('Failed to cancel reminders:', await response.text());
  }
}

// ============================================================================
// In-App Notification Helpers
// ============================================================================

/**
 * Show local notification
 */
export function showLocalNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }
): void {
  if (Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: options?.icon || '/icons/icon-192x192.png',
    tag: options?.tag,
  });

  if (options?.onClick) {
    notification.onclick = options.onClick;
  }
}

/**
 * Create telehealth notification payload
 */
export function createTelehealthNotification(
  type: TelehealthNotificationType,
  data: {
    appointmentId?: string;
    providerId?: string;
    providerName?: string;
    appointmentTime?: string;
  }
): TelehealthNotification {
  const templates: Record<TelehealthNotificationType, { title: string; body: string }> = {
    appointment_confirmed: {
      title: 'Appointment Confirmed',
      body: `Your appointment with ${data.providerName} is confirmed for ${data.appointmentTime}`,
    },
    appointment_reminder_24h: {
      title: 'Appointment Tomorrow',
      body: `Reminder: You have an appointment with ${data.providerName} tomorrow at ${data.appointmentTime}`,
    },
    appointment_reminder_1h: {
      title: 'Appointment in 1 Hour',
      body: `Your appointment with ${data.providerName} starts in 1 hour`,
    },
    appointment_reminder_15m: {
      title: 'Appointment Starting Soon',
      body: `Your appointment with ${data.providerName} starts in 15 minutes. Click to join.`,
    },
    appointment_cancelled: {
      title: 'Appointment Cancelled',
      body: `Your appointment with ${data.providerName} has been cancelled`,
    },
    appointment_rescheduled: {
      title: 'Appointment Rescheduled',
      body: `Your appointment with ${data.providerName} has been rescheduled to ${data.appointmentTime}`,
    },
    provider_joined: {
      title: 'Provider Ready',
      body: `${data.providerName} is ready for your session. Click to join.`,
    },
    visit_summary_ready: {
      title: 'Visit Summary Ready',
      body: `Your visit summary from ${data.providerName} is now available`,
    },
    action_item_reminder: {
      title: 'Care Plan Reminder',
      body: 'You have pending action items from your last visit',
    },
    follow_up_reminder: {
      title: 'Follow-up Recommended',
      body: `${data.providerName} recommends scheduling a follow-up visit`,
    },
  };

  const template = templates[type];

  return {
    id: `notif-${Date.now()}`,
    title: template.title,
    body: template.body,
    timestamp: new Date().toISOString(),
    read: false,
    type: 'coach',
    notificationType: type,
    appointmentId: data.appointmentId,
    providerId: data.providerId,
    deepLink: data.appointmentId ? `/telehealth/appointment/${data.appointmentId}` : '/telehealth',
  };
}

// ============================================================================
// Community Notification Helpers
// ============================================================================

export type CommunityNotificationType =
  | 'like'
  | 'comment'
  | 'reply'
  | 'mention'
  | 'badge_earned'
  | 'post_featured'
  | 'new_follower';

/**
 * Create and save a community engagement notification
 */
export async function createCommunityNotification(
  type: CommunityNotificationType,
  data: {
    recipientUserId: string;
    actorName: string;
    postId?: string;
    postTitle?: string;
    commentPreview?: string;
    badgeName?: string;
    actorUserId?: string; // For follow notifications
  }
): Promise<NotificationPayload> {
  const templates: Record<CommunityNotificationType, { title: string; body: string }> = {
    like: {
      title: 'New Like',
      body: `${data.actorName} liked your post${data.postTitle ? `: "${data.postTitle.substring(0, 40)}${data.postTitle.length > 40 ? '...' : ''}"` : ''}`,
    },
    comment: {
      title: 'New Comment',
      body: `${data.actorName} commented on your post${data.commentPreview ? `: "${data.commentPreview.substring(0, 50)}${data.commentPreview.length > 50 ? '...' : ''}"` : ''}`,
    },
    reply: {
      title: 'New Reply',
      body: `${data.actorName} replied to your comment`,
    },
    mention: {
      title: 'You Were Mentioned',
      body: `${data.actorName} mentioned you in a post`,
    },
    badge_earned: {
      title: 'Badge Earned! 🎉',
      body: `You earned the "${data.badgeName}" badge! Keep up the great work.`,
    },
    post_featured: {
      title: 'Your Post Was Featured! ✨',
      body: `Your post "${data.postTitle?.substring(0, 40) || 'post'}" was featured in the community`,
    },
    new_follower: {
      title: 'New Follower',
      body: `${data.actorName} started following you`,
    },
  };

  const template = templates[type];

  const notification: NotificationPayload = {
    id: `community-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: template.title,
    body: template.body,
    timestamp: new Date().toISOString(),
    read: false,
    type: 'engagement',
    deepLink: type === 'new_follower' && data.actorUserId
      ? `/community/profile/${data.actorUserId}`
      : data.postId
        ? `/community/post/${data.postId}`
        : '/community',
    icon: type === 'like' ? '❤️' : type === 'comment' ? '💬' : type === 'badge_earned' ? '🏅' : type === 'new_follower' ? '👤' : '✨',
  };

  // Save to IndexedDB
  await notificationDB.saveNotification(notification);

  // Show local notification if permitted
  if (Notification.permission === 'granted') {
    showLocalNotification(notification.title, notification.body, {
      icon: notification.icon,
      tag: `community-${type}-${data.postId || Date.now()}`,
      onClick: () => {
        if (notification.deepLink) {
          window.location.hash = notification.deepLink;
        }
      },
    });
  }

  return notification;
}

export default {
  getServiceWorkerRegistration,
  requestPushPermission,
  subscribeToPush,
  notificationDB,
  generateWeeklyDigest,
  handleNotificationClick,
  getUnreadCount,
  sendEmail,
  sendSMS,
  sendAppointmentConfirmationEmail,
  sendAppointmentReminderEmail,
  sendAppointmentReminderSMS,
  scheduleAppointmentReminders,
  cancelAppointmentReminders,
  showLocalNotification,
  createTelehealthNotification,
  createCommunityNotification,
};
