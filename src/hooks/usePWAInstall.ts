// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * usePWAInstall Hook
 *
 * Manages the Progressive Web App install prompt lifecycle:
 *   - Captures the `beforeinstallprompt` event from the browser
 *   - Detects if the app is already installed (standalone mode)
 *   - Shows an install banner after the 2nd visit or 30 seconds
 *   - Provides a clean API for triggering the native install dialog
 *
 * Install eligibility requirements (Chrome):
 *   1. Valid web app manifest with required fields
 *   2. Served over HTTPS
 *   3. Registered service worker with fetch handler
 *   4. Meets engagement heuristic (handled by browser)
 *
 * Usage:
 *   const { canInstall, isInstalled, promptInstall, dismissBanner } = usePWAInstall();
 *
 *   if (canInstall && !isInstalled) {
 *     <InstallBanner onInstall={promptInstall} onDismiss={dismissBanner} />
 *   }
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * The `beforeinstallprompt` event is not in the standard TypeScript DOM lib.
 * We define it here for type safety.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface UsePWAInstallReturn {
  /** Whether the browser has offered an install prompt we can trigger */
  canInstall: boolean;
  /** Whether the app is currently running in standalone/installed mode */
  isInstalled: boolean;
  /** Whether the install banner should be shown (timing + dismissal logic) */
  showBanner: boolean;
  /** Trigger the native install prompt. Resolves with the user's choice. */
  promptInstall: () => Promise<InstallOutcome>;
  /** Dismiss the install banner (won't show again this session) */
  dismissBanner: () => void;
  /** The platform the install prompt is targeting (e.g., 'web', 'play') */
  platform: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_VISITS = 'aminy-pwa-visit-count';
const STORAGE_KEY_DISMISSED = 'aminy-pwa-banner-dismissed';
const STORAGE_KEY_INSTALLED = 'aminy-pwa-installed';

/** Minimum visit count before showing the banner */
const MIN_VISITS_FOR_BANNER = 2;

/** Time in ms before showing banner on first eligible page load */
const BANNER_DELAY_MS = 30_000;

/** How long after dismissal before the banner can reappear (ms) — 7 days */
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================================
// Helpers
// ============================================================================

function getVisitCount(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY_VISITS) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function incrementVisitCount(): number {
  const count = getVisitCount() + 1;
  try {
    localStorage.setItem(STORAGE_KEY_VISITS, String(count));
  } catch {
    // localStorage unavailable
  }
  return count;
}

function isDismissedRecently(): boolean {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (!dismissed) return false;
    const timestamp = parseInt(dismissed, 10);
    return Date.now() - timestamp < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()));
  } catch {
    // localStorage unavailable
  }
}

function markInstalled(): void {
  try {
    localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
  } catch {
    // localStorage unavailable
  }
}

/**
 * Detect if the app is running in standalone mode (installed PWA).
 * Checks multiple methods for cross-browser compatibility.
 */
function detectStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  // CSS media query (most reliable)
  if (window.matchMedia('(display-mode: standalone)').matches) return true;

  // iOS Safari standalone mode
  if ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) {
    return true;
  }

  // TWA (Trusted Web Activity) on Android
  if (document.referrer.startsWith('android-app://')) return true;

  // Check localStorage flag (set after successful install)
  try {
    if (localStorage.getItem(STORAGE_KEY_INSTALLED) === 'true') return true;
  } catch {
    // localStorage unavailable
  }

  return false;
}

// ============================================================================
// Hook
// ============================================================================

export function usePWAInstall(): UsePWAInstallReturn {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(detectStandaloneMode);
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionDismissedRef = useRef(false);

  // ---- Track visits ----
  useEffect(() => {
    incrementVisitCount();
  }, []);

  // ---- Capture beforeinstallprompt ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleBeforeInstallPrompt(event: Event) {
      // Prevent the browser's default mini-infobar
      event.preventDefault();

      const e = event as BeforeInstallPromptEvent;
      deferredPromptRef.current = e;
      setCanInstall(true);

      if (e.platforms && e.platforms.length > 0) {
        setPlatform(e.platforms[0]);
      }

      // Decide whether to show the banner
      scheduleBanner();
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Detect install via appinstalled event ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleAppInstalled() {
      setIsInstalled(true);
      setCanInstall(false);
      setShowBanner(false);
      markInstalled();
      deferredPromptRef.current = null;

      if (import.meta.env.DEV) console.log('[usePWAInstall] App installed successfully');
    }

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // ---- Detect standalone mode changes (e.g., opening installed app) ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(display-mode: standalone)');
    function handleChange(e: MediaQueryListEvent) {
      if (e.matches) {
        setIsInstalled(true);
        setShowBanner(false);
        markInstalled();
      }
    }

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  // ---- Banner timing logic ----
  function scheduleBanner(): void {
    // Don't show if already installed
    if (detectStandaloneMode()) return;

    // Don't show if dismissed recently
    if (isDismissedRecently()) return;

    // Don't show if dismissed this session
    if (sessionDismissedRef.current) return;

    const visits = getVisitCount();

    if (visits >= MIN_VISITS_FOR_BANNER) {
      // Show immediately (already met visit threshold)
      setShowBanner(true);
    } else {
      // Show after delay
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
      bannerTimerRef.current = setTimeout(() => {
        bannerTimerRef.current = null;
        if (!sessionDismissedRef.current && !detectStandaloneMode()) {
          setShowBanner(true);
        }
      }, BANNER_DELAY_MS);
    }
  }

  // ---- Prompt install ----
  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    const prompt = deferredPromptRef.current;
    if (!prompt) {
      console.warn('[usePWAInstall] No install prompt available');
      return 'unavailable';
    }

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;

      if (outcome === 'accepted') {
        setCanInstall(false);
        setShowBanner(false);
        markInstalled();
        deferredPromptRef.current = null;
        if (import.meta.env.DEV) console.log('[usePWAInstall] User accepted install prompt');
      } else {
        // User dismissed — don't show banner again this session
        sessionDismissedRef.current = true;
        setShowBanner(false);
        markDismissed();
        if (import.meta.env.DEV) console.log('[usePWAInstall] User dismissed install prompt');
      }

      return outcome;
    } catch (err) {
      console.warn('[usePWAInstall] Install prompt error:', err);
      return 'unavailable';
    }
  }, []);

  // ---- Dismiss banner ----
  const dismissBanner = useCallback(() => {
    sessionDismissedRef.current = true;
    setShowBanner(false);
    markDismissed();
  }, []);

  return {
    canInstall,
    isInstalled,
    showBanner: showBanner && canInstall && !isInstalled,
    promptInstall,
    dismissBanner,
    platform,
  };
}

// ============================================================================
// Standalone utilities (for use outside React)
// ============================================================================

/**
 * Check if the app is running as an installed PWA.
 */
export function isPWAInstalled(): boolean {
  return detectStandaloneMode();
}

/**
 * Get the iOS install instruction text.
 * iOS doesn't support beforeinstallprompt, so we show manual instructions.
 */
export function getIOSInstallInstructions(): string | null {
  if (typeof navigator === 'undefined') return null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  if (isIOS && isSafari && !detectStandaloneMode()) {
    return 'Tap the Share button, then "Add to Home Screen" to install Aminy.';
  }

  return null;
}

export default usePWAInstall;
