/**
 * Aminy Service Worker v2
 *
 * Provides comprehensive offline functionality with focus on crisis resources.
 * Features:
 * - Crisis resources always available offline
 * - API response caching for key data
 * - IndexedDB integration for pending actions
 * - Background sync for offline message queue
 * - Enhanced caching strategies
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `aminy-${CACHE_VERSION}`;
const CRISIS_CACHE = `aminy-crisis-${CACHE_VERSION}`;
const API_CACHE = `aminy-api-${CACHE_VERSION}`;
const ASSETS_CACHE = `aminy-assets-${CACHE_VERSION}`;

// IndexedDB configuration
const DB_NAME = 'aminy-offline';
const DB_VERSION = 1;
const PENDING_MESSAGES_STORE = 'pending-messages';
const CACHED_DATA_STORE = 'cached-data';

// Essential files to cache for app shell
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// Crisis resources that MUST be available offline
const CRISIS_PAGES = [
  '/crisis',
  '/crisis-resources',
];

// API endpoints to cache with stale-while-revalidate
const CACHEABLE_API_ROUTES = [
  '/api/user/profile',
  '/api/children',
  '/api/care-plans',
  '/api/medications',
  '/api/appointments',
];

// Cache expiration times (in milliseconds)
const CACHE_EXPIRY = {
  api: 5 * 60 * 1000, // 5 minutes
  assets: 7 * 24 * 60 * 60 * 1000, // 7 days
  crisis: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// =====================================================
// IndexedDB Helper Functions
// =====================================================

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store for pending messages (offline queue)
      if (!db.objectStoreNames.contains(PENDING_MESSAGES_STORE)) {
        const messageStore = db.createObjectStore(PENDING_MESSAGES_STORE, {
          keyPath: 'id',
          autoIncrement: true
        });
        messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        messageStore.createIndex('type', 'type', { unique: false });
      }

      // Store for cached API data with expiration
      if (!db.objectStoreNames.contains(CACHED_DATA_STORE)) {
        const dataStore = db.createObjectStore(CACHED_DATA_STORE, {
          keyPath: 'key'
        });
        dataStore.createIndex('expiry', 'expiry', { unique: false });
      }
    };
  });
}

async function savePendingMessage(message) {
  try {
    const db = await openDatabase();
    const tx = db.transaction(PENDING_MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_MESSAGES_STORE);

    await store.add({
      ...message,
      timestamp: Date.now(),
      status: 'pending'
    });

    console.log('[SW] Message saved to offline queue');
    return true;
  } catch (error) {
    console.error('[SW] Failed to save pending message:', error);
    return false;
  }
}

async function getPendingMessages() {
  try {
    const db = await openDatabase();
    const tx = db.transaction(PENDING_MESSAGES_STORE, 'readonly');
    const store = tx.objectStore(PENDING_MESSAGES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Failed to get pending messages:', error);
    return [];
  }
}

async function deletePendingMessage(id) {
  try {
    const db = await openDatabase();
    const tx = db.transaction(PENDING_MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_MESSAGES_STORE);
    await store.delete(id);
    return true;
  } catch (error) {
    console.error('[SW] Failed to delete pending message:', error);
    return false;
  }
}

async function cacheApiResponse(key, data, expiryMs = CACHE_EXPIRY.api) {
  try {
    const db = await openDatabase();
    const tx = db.transaction(CACHED_DATA_STORE, 'readwrite');
    const store = tx.objectStore(CACHED_DATA_STORE);

    await store.put({
      key,
      data,
      expiry: Date.now() + expiryMs,
      cachedAt: Date.now()
    });

    return true;
  } catch (error) {
    console.error('[SW] Failed to cache API response:', error);
    return false;
  }
}

async function getCachedApiResponse(key) {
  try {
    const db = await openDatabase();
    const tx = db.transaction(CACHED_DATA_STORE, 'readonly');
    const store = tx.objectStore(CACHED_DATA_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiry > Date.now()) {
          resolve(result.data);
        } else {
          resolve(null); // Expired or not found
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Failed to get cached API response:', error);
    return null;
  }
}

async function cleanExpiredCache() {
  try {
    const db = await openDatabase();
    const tx = db.transaction(CACHED_DATA_STORE, 'readwrite');
    const store = tx.objectStore(CACHED_DATA_STORE);
    const index = store.index('expiry');
    const now = Date.now();

    const request = index.openCursor(IDBKeyRange.upperBound(now));
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    console.log('[SW] Cleaned expired cache entries');
  } catch (error) {
    console.error('[SW] Failed to clean expired cache:', error);
  }
}

// =====================================================
// Install Event
// =====================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v2...');

  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL).catch(err => {
          console.warn('[SW] Some app shell files failed to cache:', err);
        });
      }),
      // Cache crisis resources separately (higher priority)
      caches.open(CRISIS_CACHE).then((cache) => {
        console.log('[SW] Caching crisis resources');
        return cache.addAll(CRISIS_PAGES).catch(err => {
          console.warn('[SW] Some crisis pages failed to cache:', err);
        });
      }),
      // Initialize IndexedDB
      openDatabase().then(() => {
        console.log('[SW] IndexedDB initialized');
      }).catch(err => {
        console.warn('[SW] IndexedDB initialization failed:', err);
      }),
    ])
  );

  // Activate immediately
  self.skipWaiting();
});

// =====================================================
// Activate Event
// =====================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v2...');

  const currentCaches = [CACHE_NAME, CRISIS_CACHE, API_CACHE, ASSETS_CACHE];

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('aminy-') && !currentCaches.includes(name))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Clean expired IndexedDB entries
      cleanExpiredCache(),
    ])
  );

  // Take control immediately
  self.clients.claim();
});

// =====================================================
// Fetch Event - Enhanced Caching Strategies
// =====================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (but handle POST for offline queue)
  if (request.method === 'POST') {
    // Handle offline message queue for AI chat
    if (url.pathname.includes('/api/chat') || url.pathname.includes('/api/messages')) {
      event.respondWith(handleOfflinePost(request));
    }
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  // Skip Supabase and external API calls - always network (auth, realtime, etc.)
  if (url.hostname.includes('supabase') ||
      url.hostname.includes('anthropic') ||
      url.hostname.includes('stripe')) {
    return;
  }

  // Cacheable API routes - stale-while-revalidate
  if (url.pathname.startsWith('/api') && isCacheableApiRoute(url.pathname)) {
    event.respondWith(handleApiRequest(request, url));
    return;
  }

  // Non-cacheable API routes - network only
  if (url.pathname.startsWith('/api')) {
    return;
  }

  // Crisis resources - cache first (MUST work offline)
  if (url.pathname.startsWith('/crisis')) {
    event.respondWith(handleCrisisRequest(request, url));
    return;
  }

  // Static assets - cache first with long expiry
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|webp|avif)$/)) {
    event.respondWith(handleAssetRequest(request));
    return;
  }

  // HTML pages - network first, fall back to cache (SPA routing)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handleHtmlRequest(request));
    return;
  }

  // Default - network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => response)
      .catch(() => caches.match(request))
  );
});

// Check if API route should be cached
function isCacheableApiRoute(pathname) {
  return CACHEABLE_API_ROUTES.some(route => pathname.startsWith(route));
}

// Handle offline POST requests
async function handleOfflinePost(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    // We're offline - queue the message for later
    console.log('[SW] Offline - queuing message for background sync');

    try {
      const body = await request.clone().json();
      await savePendingMessage({
        type: 'chat',
        url: request.url,
        body: body,
        headers: Object.fromEntries(request.headers.entries())
      });

      // Register for background sync
      if (self.registration.sync) {
        await self.registration.sync.register('send-message');
      }

      // Return a "queued" response
      return new Response(
        JSON.stringify({
          success: true,
          queued: true,
          message: 'Your message has been saved and will be sent when you\'re back online.'
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (queueError) {
      console.error('[SW] Failed to queue message:', queueError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unable to send message while offline'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

// Handle API requests with stale-while-revalidate
async function handleApiRequest(request, url) {
  const cacheKey = url.pathname + url.search;

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the response in IndexedDB
      const data = await networkResponse.clone().json();
      await cacheApiResponse(cacheKey, data);
    }

    return networkResponse;
  } catch (error) {
    // Network failed - try cache
    console.log('[SW] Network failed, trying cache for:', cacheKey);

    const cachedData = await getCachedApiResponse(cacheKey);
    if (cachedData) {
      console.log('[SW] Serving cached API response for:', cacheKey);
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-From-Cache': 'true'
        }
      });
    }

    // No cache - return offline response
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'You appear to be offline. Some data may not be available.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle crisis resources - cache first (must work offline)
async function handleCrisisRequest(request, url) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving crisis resource from cache:', url.pathname);

      // Update cache in background
      fetch(request).then((response) => {
        if (response.ok) {
          caches.open(CRISIS_CACHE).then((cache) => {
            cache.put(request, response);
          });
        }
      }).catch(() => {/* Ignore network errors for background update */});

      return cachedResponse;
    }

    // Not in cache - try network
    const response = await fetch(request);
    const responseClone = response.clone();

    // Cache for future offline use
    caches.open(CRISIS_CACHE).then((cache) => {
      cache.put(request, responseClone);
    });

    return response;
  } catch (error) {
    // Both cache and network failed
    console.log('[SW] Crisis resource unavailable, returning offline page');
    return caches.match('/offline.html');
  }
}

// Handle static assets - cache first with long expiry
async function handleAssetRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(request);

    if (response.ok) {
      const responseClone = response.clone();
      caches.open(ASSETS_CACHE).then((cache) => {
        cache.put(request, responseClone);
      });
    }

    return response;
  } catch (error) {
    // Return cached version if available
    const cached = await caches.match(request);
    if (cached) return cached;

    // For images, return a placeholder
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="#f5f5f5" width="100" height="100"/><text fill="#999" x="50" y="55" text-anchor="middle" font-size="12">Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }

    throw error;
  }
}

// Handle HTML requests - network first, SPA fallback
async function handleHtmlRequest(request) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseClone);
      });
    }

    return response;
  } catch (error) {
    // Network failed - try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return cached index.html for SPA routing
    const indexResponse = await caches.match('/index.html');
    if (indexResponse) {
      return indexResponse;
    }

    // Last resort - return offline page
    return caches.match('/offline.html');
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Aminy',
    body: 'You have a new message',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: data.actions || [
      { action: 'open', title: 'Open Aminy' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }

      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// =====================================================
// Background Sync - Send Pending Messages
// =====================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'send-message') {
    event.waitUntil(sendPendingMessages());
  }

  if (event.tag === 'sync-data') {
    event.waitUntil(syncCachedData());
  }
});

async function sendPendingMessages() {
  console.log('[SW] Sending pending messages...');

  const messages = await getPendingMessages();

  if (messages.length === 0) {
    console.log('[SW] No pending messages to send');
    return;
  }

  console.log(`[SW] Found ${messages.length} pending messages`);

  const results = await Promise.allSettled(
    messages.map(async (message) => {
      try {
        const response = await fetch(message.url, {
          method: 'POST',
          headers: message.headers,
          body: JSON.stringify(message.body)
        });

        if (response.ok) {
          // Message sent successfully - remove from queue
          await deletePendingMessage(message.id);
          console.log('[SW] Pending message sent:', message.id);

          // Notify the client
          await notifyClients({
            type: 'MESSAGE_SENT',
            messageId: message.id,
            originalBody: message.body
          });

          return { success: true, id: message.id };
        } else {
          console.error('[SW] Failed to send message:', response.status);
          return { success: false, id: message.id, error: response.status };
        }
      } catch (error) {
        console.error('[SW] Error sending message:', error);
        return { success: false, id: message.id, error: error.message };
      }
    })
  );

  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  console.log(`[SW] Sent ${successCount}/${messages.length} pending messages`);

  // Notify clients about sync completion
  await notifyClients({
    type: 'SYNC_COMPLETE',
    sent: successCount,
    total: messages.length
  });
}

async function syncCachedData() {
  console.log('[SW] Syncing cached data...');
  // Clean expired cache entries
  await cleanExpiredCache();
}

// =====================================================
// Client Communication
// =====================================================

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });

  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Received message from client:', event.data);

  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_PENDING_COUNT':
      getPendingMessages().then((messages) => {
        event.source.postMessage({
          type: 'PENDING_COUNT',
          count: messages.length
        });
      });
      break;

    case 'CACHE_API_RESPONSE':
      if (payload?.key && payload?.data) {
        cacheApiResponse(payload.key, payload.data, payload.expiry);
      }
      break;

    case 'CLEAR_CACHE':
      Promise.all([
        caches.delete(CACHE_NAME),
        caches.delete(API_CACHE),
        caches.delete(ASSETS_CACHE),
        // Don't clear crisis cache
      ]).then(() => {
        event.source.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;

    case 'PREFETCH_ROUTES':
      if (payload?.routes) {
        prefetchRoutes(payload.routes);
      }
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Prefetch routes for faster navigation
async function prefetchRoutes(routes) {
  const cache = await caches.open(CACHE_NAME);

  await Promise.allSettled(
    routes.map(async (route) => {
      try {
        const response = await fetch(route);
        if (response.ok) {
          await cache.put(route, response);
          console.log('[SW] Prefetched route:', route);
        }
      } catch (error) {
        console.warn('[SW] Failed to prefetch:', route);
      }
    })
  );
}

// =====================================================
// Periodic Sync (if supported)
// =====================================================

self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'cleanup-cache') {
    event.waitUntil(cleanExpiredCache());
  }

  if (event.tag === 'prefetch-crisis') {
    event.waitUntil(prefetchCrisisResources());
  }
});

async function prefetchCrisisResources() {
  const cache = await caches.open(CRISIS_CACHE);

  await Promise.allSettled(
    CRISIS_PAGES.map(async (page) => {
      try {
        const response = await fetch(page);
        if (response.ok) {
          await cache.put(page, response);
          console.log('[SW] Refreshed crisis resource:', page);
        }
      } catch (error) {
        console.warn('[SW] Failed to refresh crisis resource:', page);
      }
    })
  );
}
