/**
 * Custom Service Worker Extensions for Aminy PWA
 *
 * This file is imported by the VitePWA-generated Workbox service worker
 * via the `importScripts` option in vite.config.ts. It adds:
 *
 * 1. Push notification handling
 * 2. Notification click routing
 * 3. Background sync for offline mutations (IndexedDB-backed)
 *
 * DO NOT register this file as a standalone service worker.
 * VitePWA handles all registration and caching; this file only
 * adds event listeners the generated SW does not cover.
 */

// ============================================================================
// Push Notifications
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'You have a new update from Aminy',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-96x96.png',
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
      self.registration.showNotification(data.title || 'Aminy', options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

// ============================================================================
// Notification Click
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ============================================================================
// Background Sync (IndexedDB-backed)
// ============================================================================

const SYNC_DB_NAME = 'aminy-sync-queue';
const SYNC_DB_VERSION = 1;
const SYNC_STORE_NAME = 'pending-mutations';

/**
 * Open the sync queue IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
        const store = db.createObjectStore(SYNC_STORE_NAME, { keyPath: 'id' });
        store.createIndex('action', 'action', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Read all pending items from the sync queue.
 * @returns {Promise<Array>}
 */
async function getAllPending() {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE_NAME, 'readonly');
    const store = tx.objectStore(SYNC_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Remove a successfully synced item from the queue.
 * @param {string} id
 */
async function removePending(id) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
    const store = tx.objectStore(SYNC_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Increment retry counter on a failed item.
 * Removes the item if it exceeded maxRetries.
 * @param {string} id
 */
async function incrementRetry(id) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
    const store = tx.objectStore(SYNC_STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) return resolve();

      item.retries = (item.retries || 0) + 1;
      item.lastAttempt = new Date().toISOString();

      if (item.retries > (item.maxRetries || 5)) {
        store.delete(id);
      } else {
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Process the offline sync queue.
 * Attempts to replay each pending mutation against its endpoint.
 */
async function processSyncQueue() {
  const items = await getAllPending();
  if (items.length === 0) return;

  for (const item of items) {
    try {
      const response = await fetch(item.endpoint, {
        method: item.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(item.authToken ? { Authorization: `Bearer ${item.authToken}` } : {}),
        },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        await removePending(item.id);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error -- will never succeed on retry, remove
        await removePending(item.id);
      } else {
        await incrementRetry(item.id);
      }
    } catch {
      // Network error -- retry later
      await incrementRetry(item.id);
    }
  }
}

// Listen for background sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'aminy-background-sync') {
    event.waitUntil(processSyncQueue());
  }
});

// ============================================================================
// Message Handling
// ============================================================================

self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_SYNC_STATUS':
      getAllPending().then((items) => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            type: 'SYNC_STATUS',
            pending: items.length,
          });
        }
      });
      break;
  }
});
