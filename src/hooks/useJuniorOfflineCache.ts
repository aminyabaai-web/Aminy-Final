// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useJuniorOfflineCache
 *
 * Triggers pre-caching of Junior activity assets when:
 * 1. The user first visits a Junior screen
 * 2. The device is online
 * 3. Assets haven't been cached yet (checked via localStorage flag)
 *
 * Sends a PRECACHE_JUNIOR_ASSETS message to the service worker with
 * all known Junior asset URLs. Tracks caching progress and exposes
 * it for UI display.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEY_CACHED = 'aminy-junior-assets-cached';
const LS_KEY_CACHE_TS = 'aminy-junior-assets-cached-at';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // Re-cache after 7 days

/**
 * Known Junior activity asset paths to pre-cache.
 * These are relative to the app origin. Update this list when
 * new Junior activities or media are added.
 */
const JUNIOR_ASSET_URLS: string[] = [
  // Activity data files
  '/data/junior/activities.json',
  '/data/junior/calm-tools.json',
  '/data/junior/rewards.json',
  '/data/junior/social-stories.json',
  '/data/junior/visual-schedules.json',
  // Common images
  '/images/junior/mascot.png',
  '/images/junior/mascot-happy.png',
  '/images/junior/mascot-thinking.png',
  '/images/junior/mascot-celebrating.png',
  '/images/junior/star-reward.png',
  '/images/junior/coin-reward.png',
  // Calm corner assets
  '/images/junior/calm/breathing-bg.png',
  '/images/junior/calm/sensory-bg.png',
  '/images/junior/calm/music-bg.png',
  // Audio files
  '/audio/junior/success-chime.mp3',
  '/audio/junior/reward-fanfare.mp3',
  '/audio/junior/calm-music.mp3',
  '/audio/junior/breathing-guide.mp3',
  // Lottie/animation files
  '/animations/junior/star-burst.json',
  '/animations/junior/confetti.json',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseJuniorOfflineCacheReturn {
  /** Whether caching is currently in progress */
  isCaching: boolean;
  /** Progress from 0 to 1 (percentage) */
  progress: number;
  /** Number of assets cached so far */
  cachedCount: number;
  /** Total number of assets to cache */
  totalCount: number;
  /** Whether all assets have been cached */
  isCached: boolean;
  /** Any error that occurred during caching */
  error: string | null;
  /** Manually trigger a cache refresh */
  refreshCache: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCacheValid(): boolean {
  try {
    if (localStorage.getItem(LS_KEY_CACHED) !== 'true') return false;
    const ts = localStorage.getItem(LS_KEY_CACHE_TS);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < CACHE_EXPIRY_MS;
  } catch {
    return false;
  }
}

function markCacheComplete(): void {
  try {
    localStorage.setItem(LS_KEY_CACHED, 'true');
    localStorage.setItem(LS_KEY_CACHE_TS, String(Date.now()));
  } catch {
    /* storage full */
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useJuniorOfflineCache(): UseJuniorOfflineCacheReturn {
  const [isCaching, setIsCaching] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const [isCached, setIsCached] = useState(() => isCacheValid());
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const totalCount = JUNIOR_ASSET_URLS.length;

  const startCaching = useCallback(async () => {
    // Preconditions
    if (!navigator.onLine) return;
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) return;

    abortRef.current = false;
    setIsCaching(true);
    setCachedCount(0);
    setError(null);

    try {
      // Send full batch to the service worker
      registration.active.postMessage({
        type: 'PRECACHE_JUNIOR_ASSETS',
        urls: JUNIOR_ASSET_URLS,
      });

      // Simulate progress by polling the cache for our URLs
      // The SW caches them asynchronously, so we poll periodically
      let cached = 0;
      const checkInterval = setInterval(async () => {
        if (abortRef.current) {
          clearInterval(checkInterval);
          return;
        }

        try {
          const cache = await caches.open('junior-assets');
          let count = 0;
          for (const url of JUNIOR_ASSET_URLS) {
            const match = await cache.match(url);
            if (match) count++;
          }
          cached = count;
          setCachedCount(cached);

          if (cached >= totalCount) {
            clearInterval(checkInterval);
            markCacheComplete();
            setIsCached(true);
            setIsCaching(false);
          }
        } catch {
          // Cache API may not be available in all contexts
        }
      }, 500);

      // Timeout after 60 seconds -- mark as done (partial cache is fine)
      setTimeout(() => {
        clearInterval(checkInterval);
        if (cached > 0) {
          markCacheComplete();
          setIsCached(true);
        }
        setIsCaching(false);
      }, 60_000);
    } catch (err) {
      console.warn('[JuniorOfflineCache] Caching failed:', err);
      setError(err instanceof Error ? err.message : 'Cache failed');
      setIsCaching(false);
    }
  }, [totalCount]);

  // Auto-start caching on first mount if not already cached
  useEffect(() => {
    if (!isCached && navigator.onLine) {
      startCaching();
    }

    return () => {
      abortRef.current = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshCache = useCallback(() => {
    try {
      localStorage.removeItem(LS_KEY_CACHED);
      localStorage.removeItem(LS_KEY_CACHE_TS);
    } catch {
      /* ignore */
    }
    setIsCached(false);
    startCaching();
  }, [startCaching]);

  return {
    isCaching,
    progress: totalCount > 0 ? cachedCount / totalCount : 0,
    cachedCount,
    totalCount,
    isCached,
    error,
    refreshCache,
  };
}

export default useJuniorOfflineCache;
