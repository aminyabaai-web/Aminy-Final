/**
 * Push Notifications Infrastructure
 * Enables true "proactive outreach" - Aminy's key differentiator
 *
 * Architecture:
 * 1. Web Push API for browser notifications
 * 2. Service Worker handles background push events
 * 3. Supabase stores push subscriptions
 * 4. Server-side cron triggers scheduled notifications
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

// VAPID public key - generate your own at https://vapidkeys.com/
// Store private key in Supabase Edge Function secrets
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BLEr1Jntq45v2doIHvf5osiKzHZ1Nb3MYJdnH8eF5WIrPMm4U0mYqhGjyqoKmDpkdZ7XrxTgz0FjQHf6LjwOflQ';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface ScheduledNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  scheduledFor: Date;
  type: 'daily_checkin' | 'streak_reminder' | 'routine_nudge' | 'calm_moment' | 'custom';
  data?: Record<string, any>;
  sent: boolean;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(userId: string): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return null;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If no subscription, create one
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Extract subscription data
    const subscriptionJson = subscription.toJSON();
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscriptionJson.endpoint!,
      keys: {
        p256dh: subscriptionJson.keys!.p256dh!,
        auth: subscriptionJson.keys!.auth!,
      },
    };

    // Save to Supabase
    await savePushSubscription(userId, subscriptionData);

    return subscriptionData;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await deletePushSubscription(userId);
    }

    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

/**
 * Save push subscription to Supabase
 */
async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionData
): Promise<void> {
  try {
    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/push/subscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          userId,
          subscription,
        }),
      }
    );
  } catch (error) {
    console.error('Failed to save push subscription:', error);
  }
}

/**
 * Delete push subscription from Supabase
 */
async function deletePushSubscription(userId: string): Promise<void> {
  try {
    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/push/unsubscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ userId }),
      }
    );
  } catch (error) {
    console.error('Failed to delete push subscription:', error);
  }
}

/**
 * Schedule a notification for later delivery
 */
export async function scheduleNotification(
  userId: string,
  notification: Omit<ScheduledNotification, 'id' | 'sent'>
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/push/schedule`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          userId,
          ...notification,
        }),
      }
    );

    if (!response.ok) throw new Error('Failed to schedule notification');

    const data = await response.json();
    return data.notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/push/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ notificationId }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Failed to cancel notification:', error);
    return false;
  }
}

/**
 * Set up daily check-in notifications
 * Called after user enables notifications
 */
export async function setupDailyCheckIns(
  userId: string,
  childName: string,
  preferredTime: string = '09:00' // Default 9 AM
): Promise<void> {
  const [hours, minutes] = preferredTime.split(':').map(Number);

  // Schedule for next 7 days
  for (let i = 1; i <= 7; i++) {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + i);
    scheduledFor.setHours(hours, minutes, 0, 0);

    const messages = [
      `Good morning! Ready to start ${childName}'s routine? 🌅`,
      `How did last night go? Let's plan today together. 💙`,
      `Time for your daily check-in. ${childName} is doing great! ✨`,
      `Morning! What's one thing you're looking forward to today? 🎯`,
      `Rise and shine! Your streak continues. Let's keep it going! 🔥`,
    ];

    await scheduleNotification(userId, {
      userId,
      title: 'Aminy',
      body: messages[i % messages.length],
      scheduledFor,
      type: 'daily_checkin',
      data: { childName },
    });
  }
}

/**
 * Send a local notification immediately (for testing)
 */
export function sendLocalNotification(title: string, body: string, data?: any): void {
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: '/aminy-icon-192.png',
    badge: '/aminy-badge-72.png',
    tag: 'aminy-notification',
    data,
    requireInteraction: false,
    silent: false,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    // Navigate to relevant page if data contains route
    if (data?.route) {
      window.location.href = data.route;
    }
  };
}

/**
 * Hook to manage push notification state
 */
export function usePushNotifications(userId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const enable = async () => {
    if (!userId) return false;
    setLoading(true);

    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm === 'granted') {
        const sub = await subscribeToPush(userId);
        setSubscription(sub);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    if (!userId) return false;
    setLoading(true);

    try {
      await unsubscribeFromPush(userId);
      setSubscription(null);
      return true;
    } finally {
      setLoading(false);
    }
  };

  return {
    permission,
    subscription,
    loading,
    isEnabled: permission === 'granted' && subscription !== null,
    isSupported: isPushSupported(),
    enable,
    disable,
  };
}

// Need to import useState and useEffect for the hook
import { useState, useEffect } from 'react';
