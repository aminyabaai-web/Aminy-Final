// ===== PHASE 3: PRODUCTION SERVICE WORKER =====
// Enhanced PWA functionality with offline support

const CACHE_NAME = 'aminy-v1.0.0';
const DYNAMIC_CACHE = 'aminy-dynamic-v1';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/styles/globals.css',
  '/styles/critical.css',
  '/styles/cls-optimizations.css',
  '/manifest.json',
  // Add critical routes
  '/care',
  '/plan',
  '/reports'
];

// LCP-critical images to preload and cache
// Note: Figma assets are handled separately by the build system
const LCP_CRITICAL_IMAGES = [];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/user/,
  /\/api\/plans/,
  /\/api\/reports/
];

// Images and media to cache
const MEDIA_CACHE_PATTERNS = [
  /\.(png|jpg|jpeg|gif|webp|svg|ico)$/,
  /unsplash\.com/
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('[SW] Caching static assets');
          return cache.addAll(STATIC_ASSETS);
        }),
      // Cache LCP images if any
      LCP_CRITICAL_IMAGES.length > 0
        ? caches.open('lcp-images-v1')
            .then((cache) => {
              console.log('[SW] Caching LCP-critical images');
              return cache.addAll(LCP_CRITICAL_IMAGES).catch(() => {
                console.log('[SW] Could not cache LCP images');
              });
            })
        : Promise.resolve()
    ])
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(networkFirst(request));
  } else if (isMediaRequest(request)) {
    event.respondWith(cacheFirst(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Strategy: Cache First (for static assets)
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    console.log('[SW] Fetching and caching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    
    // Return offline fallback
    if (isNavigationRequest(request)) {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/') || new Response('Offline', { status: 200 });
    }
    
    return new Response('Network Error', { 
      status: 408,
      statusText: 'Network Error' 
    });
  }
}

// Strategy: Network First (for API calls and navigation)
async function networkFirst(request) {
  try {
    console.log('[SW] Network first:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving stale content from cache:', request.url);
      return cachedResponse;
    }
    
    // For navigation requests, return cached index
    if (isNavigationRequest(request)) {
      const cache = await caches.open(CACHE_NAME);
      const fallback = await cache.match('/');
      if (fallback) {
        return fallback;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This content is not available offline' 
      }), 
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Strategy: Stale While Revalidate (for dynamic content)
async function staleWhileRevalidate(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await caches.match(request);
    
    // Fetch in background to update cache
    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    });
    
    // Return cached version immediately if available
    if (cachedResponse) {
      console.log('[SW] Serving stale content, updating in background:', request.url);
      return cachedResponse;
    }
    
    console.log('[SW] No cache, waiting for network:', request.url);
    return await fetchPromise;
  } catch (error) {
    console.error('[SW] Stale while revalidate failed:', error);
    return new Response('Network Error', { 
      status: 408,
      statusText: 'Network Error' 
    });
  }
}

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname.includes(asset)) ||
         url.pathname.includes('/static/') ||
         url.pathname.includes('/assets/') ||
         /\.(css|js|woff2?|ttf|eot)$/.test(url.pathname);
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') ||
         API_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

function isMediaRequest(request) {
  const url = new URL(request.url);
  return MEDIA_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'background-sync-reports') {
    event.waitUntil(syncReports());
  }
});

async function syncMessages() {
  try {
    // Retrieve queued messages from IndexedDB
    const queuedMessages = await getQueuedMessages();
    
    for (const message of queuedMessages) {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          await removeQueuedMessage(message.id);
          console.log('[SW] Synced message:', message.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync message:', message.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background message sync failed:', error);
  }
}

async function syncReports() {
  try {
    // Retrieve queued report requests from IndexedDB
    const queuedReports = await getQueuedReports();
    
    for (const report of queuedReports) {
      try {
        const response = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        
        if (response.ok) {
          await removeQueuedReport(report.id);
          console.log('[SW] Synced report generation:', report.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync report:', report.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background report sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log('[SW] Push notification received:', data);
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag || 'aminy-notification',
      data: data.data || {},
      actions: data.actions || [],
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll().then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        const targetUrl = event.notification.data?.url || '/';
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Message handling between SW and main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage({ type: 'CACHE_STATS', data: stats });
    });
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

// Utility functions for IndexedDB operations
async function getQueuedMessages() {
  // Placeholder for IndexedDB implementation
  return [];
}

async function removeQueuedMessage(messageId) {
  // Placeholder for IndexedDB implementation
  console.log('[SW] Removed queued message:', messageId);
}

async function getQueuedReports() {
  // Placeholder for IndexedDB implementation
  return [];
}

async function removeQueuedReport(reportId) {
  // Placeholder for IndexedDB implementation
  console.log('[SW] Removed queued report:', reportId);
}

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }
  
  return stats;
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('[SW] All caches cleared');
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log('[SW] Service Worker loaded successfully');