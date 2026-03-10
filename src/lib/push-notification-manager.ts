/**
 * Push Notification Manager (Enhanced)
 *
 * Class-based notification manager that builds on top of the existing
 * push-notifications.ts with additional capabilities:
 *
 *   - Notification categories with per-category opt-in/out
 *   - Action buttons (Accept/Decline for appointments, Reply for messages)
 *   - User preference persistence (localStorage + sync-ready)
 *   - Quiet hours support
 *   - Service worker push event + notification click handlers
 *
 * Notification categories:
 *   appointments — Session reminders, scheduling changes
 *   messages     — Chat messages from providers/parents
 *   billing      — Payment confirmations, invoice alerts
 *   alerts       — System alerts, safety notifications
 *   reminders    — Care plan reminders, medication, routines
 *
 * This module is complementary to push-notifications.ts — it does NOT
 * replace the existing functions. Use PushNotificationManager for the
 * class-based API with preference management, or use the existing
 * functional API for simple subscribe/unsubscribe.
 *
 * Usage:
 *   import { PushNotificationManager, getPushNotificationManager } from './push-notification-manager';
 *   const mgr = await getPushNotificationManager();
 *   await mgr.subscribe();
 *   mgr.updatePreferences({ appointments: true, billing: false });
 */

import { isPushSupported, getNotificationPermission } from './push-notifications';

// ============================================================================
// Service Worker Type Augmentation (not included in standard DOM lib)
// ============================================================================

interface SWGlobalScope {
  clients: {
    matchAll(options?: { type?: string }): Promise<SWClient[]>;
    openWindow?(url: string): Promise<SWClient | null>;
  };
  registration: { showNotification(title: string, options?: ExtendedNotificationOptions): Promise<void> };
}

interface SWClient {
  postMessage(message: unknown): void;
  focus?(): Promise<SWClient>;
}

/** Extended NotificationOptions that includes `actions` (part of Notification API spec but missing from TS DOM lib) */
interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

// ============================================================================
// Types
// ============================================================================

export type NotificationCategory =
  | 'appointments'
  | 'messages'
  | 'billing'
  | 'alerts'
  | 'reminders';

export const ALL_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'appointments',
  'messages',
  'billing',
  'alerts',
  'reminders',
];

export interface NotificationPreferences {
  /** Global enable/disable for all push notifications */
  enabled: boolean;
  /** Per-category preferences (true = opted in) */
  categories: Record<NotificationCategory, boolean>;
  /** Quiet hours: no notifications during this window */
  quietHours: {
    enabled: boolean;
    /** Start time in HH:MM 24-hour format */
    start: string;
    /** End time in HH:MM 24-hour format */
    end: string;
  };
  /** Whether to show notification badges on the app icon */
  showBadge: boolean;
  /** Whether to play notification sounds */
  playSound: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PushNotificationStatus {
  /** Whether push notifications are supported by the browser */
  supported: boolean;
  /** Current notification permission state */
  permission: PermissionState;
  /** Whether currently subscribed to push */
  subscribed: boolean;
  /** The push subscription endpoint (if subscribed) */
  endpoint: string | null;
  /** User preference configuration */
  preferences: NotificationPreferences;
  /** Service worker registration status */
  serviceWorkerReady: boolean;
}

export type PushEventCallback = (event: PushManagerEvent) => void;

export interface PushManagerEvent {
  type: 'subscribed' | 'unsubscribed' | 'permission-changed' | 'preferences-updated' | 'error';
  detail: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_PREFS = 'aminy-push-mgr-preferences';
const DOM_EVENT_NAME = 'aminy-push-mgr-event';

/** Default notification preferences for new users */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  categories: {
    appointments: true,
    messages: true,
    billing: true,
    alerts: true,
    reminders: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
  showBadge: true,
  playSound: true,
};

/** Notification action configurations by category */
const CATEGORY_ACTIONS: Record<NotificationCategory, NotificationAction[]> = {
  appointments: [
    { action: 'accept', title: 'Accept' },
    { action: 'decline', title: 'Decline' },
  ],
  messages: [
    { action: 'reply', title: 'Reply' },
    { action: 'mark-read', title: 'Mark Read' },
  ],
  billing: [
    { action: 'view', title: 'View Details' },
  ],
  alerts: [
    { action: 'view', title: 'View' },
    { action: 'dismiss', title: 'Dismiss' },
  ],
  reminders: [
    { action: 'complete', title: 'Done' },
    { action: 'snooze', title: 'Snooze 15min' },
  ],
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if the current time falls within quiet hours.
 */
function isWithinQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHours.enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = prefs.quietHours.start.split(':').map(Number);
  const [endH, endM] = prefs.quietHours.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g., 09:00 - 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight range (e.g., 22:00 - 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

// ============================================================================
// PushNotificationManager
// ============================================================================

export class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private preferences: NotificationPreferences;
  private listeners: PushEventCallback[] = [];
  private supported = false;
  private initialized = false;

  constructor() {
    this.preferences = this.loadPreferences();
  }

  /**
   * Initialize the push notification manager.
   * Must be called before subscribe/unsubscribe.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.supported = isPushSupported();

    if (!this.supported) {
      console.log('[PushMgr] Push notifications not supported');
      this.initialized = true;
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();

      if (this.subscription) {
        console.log('[PushMgr] Existing subscription found');
      }
    } catch (err) {
      console.warn('[PushMgr] Initialization error:', err);
    }

    this.initialized = true;
  }

  /**
   * Subscribe to push notifications.
   * Requests notification permission if not already granted.
   *
   * @returns Whether subscription was successful
   */
  async subscribe(): Promise<boolean> {
    this.ensureInitialized();

    if (!this.supported || !this.registration) {
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      this.emitEvent({
        type: 'permission-changed',
        detail: { permission },
        timestamp: new Date().toISOString(),
      });
      return false;
    }

    try {
      // Check for existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();

      if (!this.subscription) {
        // VAPID key from existing push-notifications.ts
        const vapidKey = import.meta.env?.VITE_VAPID_PUBLIC_KEY ?? '';
        const applicationServerKey = vapidKey
          ? urlBase64ToUint8Array(vapidKey) as BufferSource
          : undefined;

        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      this.preferences.enabled = true;
      this.savePreferences();

      this.emitEvent({
        type: 'subscribed',
        detail: { endpoint: this.subscription.endpoint },
        timestamp: new Date().toISOString(),
      });

      console.log('[PushMgr] Subscribed');
      return true;
    } catch (err) {
      console.error('[PushMgr] Subscribe error:', err);
      this.emitEvent({
        type: 'error',
        detail: { error: err instanceof Error ? err.message : 'Subscribe failed' },
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications.
   */
  async unsubscribe(): Promise<boolean> {
    this.ensureInitialized();

    if (!this.subscription) return true;

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;
      this.preferences.enabled = false;
      this.savePreferences();

      this.emitEvent({
        type: 'unsubscribed',
        detail: {},
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (err) {
      console.error('[PushMgr] Unsubscribe error:', err);
      return false;
    }
  }

  /**
   * Get the current notification preferences.
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Update notification preferences.
   */
  updatePreferences(updates: Partial<NotificationPreferences>): NotificationPreferences {
    if (updates.categories) {
      this.preferences.categories = {
        ...this.preferences.categories,
        ...updates.categories,
      };
    }

    if (updates.quietHours) {
      this.preferences.quietHours = {
        ...this.preferences.quietHours,
        ...updates.quietHours,
      };
    }

    if (updates.enabled !== undefined) this.preferences.enabled = updates.enabled;
    if (updates.showBadge !== undefined) this.preferences.showBadge = updates.showBadge;
    if (updates.playSound !== undefined) this.preferences.playSound = updates.playSound;

    this.savePreferences();

    this.emitEvent({
      type: 'preferences-updated',
      detail: { preferences: this.preferences },
      timestamp: new Date().toISOString(),
    });

    return this.getPreferences();
  }

  /**
   * Update a single category preference.
   */
  setCategoryEnabled(category: NotificationCategory, enabled: boolean): void {
    this.preferences.categories[category] = enabled;
    this.savePreferences();
  }

  /**
   * Check if a notification should be shown for a given category.
   */
  shouldShowNotification(category: NotificationCategory): boolean {
    if (!this.preferences.enabled) return false;
    if (!this.preferences.categories[category]) return false;
    if (isWithinQuietHours(this.preferences)) return false;
    return true;
  }

  /**
   * Get the notification action buttons for a category.
   */
  getActionsForCategory(category: NotificationCategory): NotificationAction[] {
    return CATEGORY_ACTIONS[category] ?? [];
  }

  /**
   * Show a local notification (not push-delivered, for in-app use).
   */
  async showLocalNotification(
    title: string,
    options: {
      body?: string;
      category?: NotificationCategory;
      icon?: string;
      badge?: string;
      tag?: string;
      data?: Record<string, unknown>;
      requireInteraction?: boolean;
    } = {},
  ): Promise<boolean> {
    if (!this.supported || getNotificationPermission() !== 'granted') {
      return false;
    }

    const category = options.category;
    if (category && !this.shouldShowNotification(category)) {
      return false;
    }

    const actions = category ? this.getActionsForCategory(category) : [];

    try {
      if (this.registration) {
        const notifOptions: ExtendedNotificationOptions = {
          body: options.body,
          icon: options.icon ?? '/icons/icon-192x192.png',
          badge: options.badge ?? '/icons/badge-96x96.png',
          tag: options.tag,
          data: { ...options.data, category },
          actions,
          requireInteraction: options.requireInteraction ?? false,
          silent: !this.preferences.playSound,
        };
        await this.registration.showNotification(title, notifOptions as NotificationOptions);
        return true;
      }
    } catch (err) {
      console.warn('[PushMgr] Failed to show notification:', err);
    }

    return false;
  }

  /**
   * Get the full push notification status.
   */
  getStatus(): PushNotificationStatus {
    const permState = this.getPermissionState();
    return {
      supported: this.supported,
      permission: permState,
      subscribed: this.subscription !== null,
      endpoint: this.subscription?.endpoint ?? null,
      preferences: this.getPreferences(),
      serviceWorkerReady: this.registration !== null,
    };
  }

  /**
   * Register a listener for push manager events.
   */
  onEvent(callback: PushEventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.listeners = [];
    this.initialized = false;
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('[PushMgr] Not initialized. Call initialize() first.');
    }
  }

  private getPermissionState(): PermissionState {
    if (!this.supported) return 'unsupported';
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission as PermissionState;
  }

  private loadPreferences(): NotificationPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFS);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
        return {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          categories: {
            ...DEFAULT_PREFERENCES.categories,
            ...(parsed.categories ?? {}),
          },
          quietHours: {
            ...DEFAULT_PREFERENCES.quietHours,
            ...(parsed.quietHours ?? {}),
          },
        };
      }
    } catch {
      // Parse error or localStorage unavailable
    }
    return { ...DEFAULT_PREFERENCES };
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(this.preferences));
    } catch {
      // localStorage unavailable
    }
  }

  private emitEvent(event: PushManagerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn('[PushMgr] Listener error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(DOM_EVENT_NAME, { detail: event }),
      );
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _instance: PushNotificationManager | null = null;

/**
 * Get or create the shared PushNotificationManager instance.
 */
export async function getPushNotificationManager(): Promise<PushNotificationManager> {
  if (!_instance) {
    _instance = new PushNotificationManager();
    await _instance.initialize();
  }
  return _instance;
}

// ============================================================================
// Service Worker Handlers (export for SW import)
// ============================================================================

/**
 * Handle a push event inside the service worker.
 *
 *   import { handlePushEvent } from './push-notification-manager';
 *   self.addEventListener('push', (event) => {
 *     event.waitUntil(handlePushEvent(event));
 *   });
 */
export async function handlePushEvent(event: {
  data?: { json(): Record<string, unknown>; text(): string } | null;
}): Promise<void> {
  let data: Record<string, unknown>;

  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() ?? 'New notification' };
  }

  const title = (data.title as string) ?? 'Aminy';
  const category = (data.category as NotificationCategory) ?? 'alerts';
  const actions = CATEGORY_ACTIONS[category] ?? [];

  const options: ExtendedNotificationOptions = {
    body: (data.body as string) ?? '',
    icon: (data.icon as string) ?? '/icons/icon-192x192.png',
    badge: '/icons/badge-96x96.png',
    tag: (data.tag as string) ?? `aminy-${category}-${Date.now()}`,
    data: { ...data, category },
    actions,
    requireInteraction: category === 'alerts',
  };

  if (typeof self !== 'undefined' && 'registration' in self) {
    const sw = self as unknown as SWGlobalScope;
    await sw.registration.showNotification(title, options);
  }
}

/**
 * Handle a notification click inside the service worker.
 *
 *   self.addEventListener('notificationclick', (event) => {
 *     event.waitUntil(handleNotificationClick(event));
 *   });
 */
export async function handleNotificationClick(event: {
  notification: { data?: Record<string, unknown>; close(): void };
  action?: string;
}): Promise<void> {
  event.notification.close();

  const data = event.notification.data ?? {};
  const action = event.action ?? 'default';
  const category = data.category as string;

  let url = '/';
  if (category === 'appointments') {
    url = action === 'accept' || action === 'decline' ? '/appointments' : '/';
  } else if (category === 'messages') {
    url = '/messages';
  } else if (category === 'billing') {
    url = '/billing';
  }

  if (typeof self !== 'undefined' && 'clients' in self) {
    const sw = self as unknown as SWGlobalScope;
    const clientList = await sw.clients.matchAll({ type: 'window' });

    for (const client of clientList) {
      if ('focus' in client && client.focus) {
        await client.focus();
        client.postMessage({
          type: 'NOTIFICATION_CLICK',
          action,
          category,
          data,
          url,
        });
        return;
      }
    }

    if (sw.clients.openWindow) {
      await sw.clients.openWindow(url);
    }
  }
}

// ============================================================================
// Helper (duplicated here so SW can import without pulling in push-notifications.ts)
// ============================================================================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default PushNotificationManager;
