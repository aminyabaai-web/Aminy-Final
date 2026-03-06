/**
 * Service Worker Registration & Management
 *
 * Handles registering the service worker and managing offline functionality.
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  registration?: ServiceWorkerRegistration;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    if (import.meta.env.DEV) console.log('[SW] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    swRegistration = registration;

    if (import.meta.env.DEV) console.log('[SW] Service worker registered:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            if (import.meta.env.DEV) console.log('[SW] New version available');
            dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!swRegistration) {
    return false;
  }

  try {
    const success = await swRegistration.unregister();
    if (success) {
      swRegistration = null;
    }
    return success;
  } catch (error) {
    console.error('[SW] Unregistration failed:', error);
    return false;
  }
}

/**
 * Get current service worker status
 */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  const isSupported = isServiceWorkerSupported();
  const isOnline = navigator.onLine;

  if (!isSupported) {
    return { isSupported, isRegistered: false, isOnline };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      isSupported,
      isRegistered: !!registration,
      isOnline,
      registration: registration || undefined,
    };
  } catch {
    return { isSupported, isRegistered: false, isOnline };
  }
}

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline changes
 */
export function onConnectivityChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Skip waiting and activate new service worker
 */
export async function skipWaitingAndReload(): Promise<void> {
  if (!swRegistration?.waiting) {
    return;
  }

  swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

  // Reload when the new service worker takes over
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  if (import.meta.env.DEV) console.log('[SW] All caches cleared');
}

/**
 * Check if a specific resource is cached
 */
export async function isResourceCached(url: string): Promise<boolean> {
  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const response = await cache.match(url);
    if (response) {
      return true;
    }
  }

  return false;
}

/**
 * Precache specific URLs
 */
export async function precacheUrls(urls: string[]): Promise<void> {
  const cache = await caches.open('aminy-v1');
  await cache.addAll(urls);
  if (import.meta.env.DEV) console.log('[SW] Precached URLs:', urls);
}
