/**
 * Custom Service Worker for Aminy PWA
 *
 * This is the single, consolidated service worker used by VitePWA (injectManifest mode).
 * It combines:
 *   - Workbox precaching (auto-injected by VitePWA build)
 *   - Runtime caching strategies (API, crisis, Junior assets)
 *   - Push notification handling (merged from sw-push.js)
 *   - Background sync (merged from service-worker.js)
 *   - App update (skipWaiting) message handler
 *
 * DO NOT register this file manually — VitePWA handles registration.
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ============================================================================
// 1. Workbox Precaching — VitePWA injects the manifest here at build time
// ============================================================================

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ============================================================================
// 2. Runtime Caching Strategies
// ============================================================================

// Crisis resources — MUST work offline (CacheFirst, 30-day expiry)
registerRoute(
  ({ url }) => url.pathname.startsWith('/crisis'),
  new CacheFirst({
    cacheName: 'crisis-resources',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Junior activity assets — CacheFirst so kids can play offline
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/junior/') ||
    url.pathname.startsWith('/assets/junior/') ||
    url.pathname.includes('/junior-'),
  new CacheFirst({
    cacheName: 'junior-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 86400 * 14 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Junior API calls — NetworkFirst with 7-day cache fallback
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/junior'),
  new NetworkFirst({
    cacheName: 'junior-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 * 7 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Supabase API calls — NetworkFirst with 24-hour fallback
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Internal API calls — NetworkFirst
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Images and media — StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 86400 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Audio files (Junior activities) — CacheFirst for offline play
registerRoute(
  ({ request }) => request.destination === 'audio',
  new CacheFirst({
    cacheName: 'audio-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 * 14 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ============================================================================
// 3. Push Notification Handling (merged from public/sw-push.js)
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options: NotificationOptions = {
      body: data.body || 'You have a new message from Aminy',
      icon: '/pwa-192x192.png',
      badge: '/pwa-72x72.png',
      tag: data.tag || 'aminy-notification',
      data: data.data || {},
      actions: data.actions || [
        { action: 'open', title: 'Open Aminy' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      requireInteraction: data.requireInteraction || false,
      silent: false,
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Aminy', options),
    );
  } catch (error) {
    console.error('[SW] Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const notifData = event.notification.data || {};
  const urlToOpen = notifData.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (notifData.route) {
              (client as WindowClient).navigate(notifData.route);
            }
            return;
          }
        }
        // Otherwise open new window
        return self.clients.openWindow(urlToOpen);
      }),
  );
});

self.addEventListener('notificationclose', (_event) => {
  // Notification dismissed — analytics hook point
});

// Re-subscribe when push subscription expires
self.addEventListener('pushsubscriptionchange', (event: Event) => {
  const pushEvent = event as ExtendableEvent;
  pushEvent.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((subscription) => {
        return fetch('/api/push/resubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      })
      .catch((err) => console.error('[SW] Re-subscribe failed:', err)),
  );
});

// ============================================================================
// 4. Background Sync (merged from src/service-worker.js)
// ============================================================================

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'aminy-background-sync') {
    event.waitUntil(processBackgroundSync());
  }
});

async function processBackgroundSync(): Promise<void> {
  // Read the sync queue from the main thread via a message channel
  // The actual queue is managed in localStorage by useBackgroundSync hook
  // This handler just triggers the main thread to process it
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'PROCESS_SYNC_QUEUE' });
  }
}

// ============================================================================
// 5. Message Handling (app <-> service worker communication)
// ============================================================================

self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_CACHE_STATS':
      getCacheStats().then((stats) => {
        event.ports?.[0]?.postMessage({ type: 'CACHE_STATS', data: stats });
      });
      break;

    case 'CLEAR_CACHE':
      caches.keys().then((names) =>
        Promise.all(names.map((name) => caches.delete(name))),
      ).then(() => {
        event.ports?.[0]?.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;

    case 'CLIENTS_CLAIM':
      self.clients.claim();
      break;
  }
});

async function getCacheStats(): Promise<Record<string, number>> {
  const cacheNames = await caches.keys();
  const stats: Record<string, number> = {};

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }

  return stats;
}

// ============================================================================
// 6. Error Handling
// ============================================================================

self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// SyncEvent type augmentation for TypeScript
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
  }
}
