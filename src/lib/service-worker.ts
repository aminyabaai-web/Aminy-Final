// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Service Worker Utilities
 *
 * Utility functions for offline detection and connectivity monitoring.
 *
 * NOTE: Service worker registration is handled automatically by VitePWA
 * (vite-plugin-pwa) with registerType: 'autoUpdate'. Do NOT manually
 * register a service worker here — it will conflict with Workbox.
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  registration?: ServiceWorkerRegistration;
}

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Get current service worker status
 */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  const isSupported = isServiceWorkerSupported();
  const online = navigator.onLine;

  if (!isSupported) {
    return { isSupported, isRegistered: false, isOnline: online };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      isSupported,
      isRegistered: !!registration,
      isOnline: online,
      registration: registration || undefined,
    };
  } catch {
    return { isSupported, isRegistered: false, isOnline: online };
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
 * Works with the VitePWA-generated service worker.
 */
export async function skipWaitingAndReload(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.waiting) {
    return;
  }

  registration.waiting.postMessage({ type: 'SKIP_WAITING' });

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
