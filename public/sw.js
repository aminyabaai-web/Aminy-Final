/**
 * Aminy Service Worker
 *
 * Provides offline functionality with focus on crisis resources.
 * Caches essential content so parents can access help even without internet.
 */

const CACHE_NAME = 'aminy-v1';
const CRISIS_CACHE = 'aminy-crisis-v1';

// Essential files to cache for app shell
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Crisis resources that MUST be available offline
const CRISIS_PAGES = [
  '/crisis',
  '/crisis-resources',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL);
      }),
      // Cache crisis resources separately (higher priority)
      caches.open(CRISIS_CACHE).then((cache) => {
        console.log('[SW] Caching crisis resources');
        return cache.addAll(CRISIS_PAGES);
      }),
    ])
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== CRISIS_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API calls and Supabase requests - always network
  if (url.pathname.startsWith('/api') ||
      url.hostname.includes('supabase') ||
      url.hostname.includes('anthropic')) {
    return;
  }

  // Crisis resources - cache first (MUST work offline)
  if (url.pathname.startsWith('/crisis')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving crisis resource from cache:', url.pathname);
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Cache the response for future offline use
          const responseClone = response.clone();
          caches.open(CRISIS_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      }).catch(() => {
        // If both cache and network fail, return offline page
        return caches.match('/offline.html');
      })
    );
    return;
  }

  // Static assets - cache first, then network
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // HTML pages - network first, fall back to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return cached index.html for SPA routing
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Default - network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

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

// Background sync for sending messages when back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'send-message') {
    event.waitUntil(
      // Get pending messages from IndexedDB and send them
      sendPendingMessages()
    );
  }
});

async function sendPendingMessages() {
  // This would be implemented with IndexedDB
  // For now, just log
  console.log('[SW] Would send pending messages here');
}
