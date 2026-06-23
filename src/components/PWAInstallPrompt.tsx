// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * PWA Install Prompt Component
 *
 * Shows a native-feeling install banner when the browser
 * supports PWA installation. Captures the `beforeinstallprompt`
 * event and presents a branded install CTA.
 *
 * Only shows:
 * - When not already installed (display-mode: standalone / navigator.standalone)
 * - After user's 2nd visit (localStorage visit count)
 * - Maximum once per session (unless dismissed, waits 7 days)
 * - Tracks installs via `appinstalled` event
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISMISS_KEY = 'aminy_pwa_dismissed_at';
const VISIT_COUNT_KEY = 'aminy_pwa_visit_count';
const INSTALLED_KEY = 'aminy_pwa_installed';
const DISMISS_COOLDOWN_DAYS = 7;
const MIN_VISITS_BEFORE_PROMPT = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mqStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return mqStandalone || iosStandalone;
}

function getVisitCount(): number {
  try {
    return parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function incrementVisitCount(): number {
  const count = getVisitCount() + 1;
  try {
    localStorage.setItem(VISIT_COUNT_KEY, String(count));
  } catch {
    /* storage full */
  }
  return count;
}

function isDismissCooldownActive(): boolean {
  try {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return false;
    const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
    return daysSince < DISMISS_COOLDOWN_DAYS;
  } catch {
    return false;
  }
}

function isMarkedInstalled(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === 'true';
  } catch {
    return false;
  }
}

function markAsInstalled(): void {
  try {
    localStorage.setItem(INSTALLED_KEY, 'true');
  } catch {
    /* storage full */
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installing, setInstalling] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Increment visit count every time the component mounts (page load)
    const visits = incrementVisitCount();

    // Don't show if already installed
    if (isRunningStandalone()) return;
    if (isMarkedInstalled()) return;

    // Don't show if recently dismissed
    if (isDismissCooldownActive()) return;

    // Don't show until 2nd visit
    if (visits < MIN_VISITS_BEFORE_PROMPT) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      promptRef.current = event;
      setDeferredPrompt(event);

      // Delay showing banner slightly for better UX
      setTimeout(() => setShowBanner(true), 2000);
    };

    const handleAppInstalled = () => {
      markAsInstalled();
      setShowBanner(false);
      setDeferredPrompt(null);
      promptRef.current = null;

      // Track installation in analytics (non-blocking)
      (async () => {
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            await supabase.from('screen_analytics').insert({
              user_id: data.user.id,
              session_id: sessionStorage.getItem('aminy_analytics_session') || 'unknown',
              screen_name: 'pwa_app_installed',
              entered_at: new Date().toISOString(),
              device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
            });
          }
        } catch {
          /* analytics failure is non-blocking */
        }
      })();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = promptRef.current;
    if (!prompt) return;

    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        markAsInstalled();
        setShowBanner(false);

        // Track prompt acceptance in analytics
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            await supabase.from('screen_analytics').insert({
              user_id: data.user.id,
              session_id: sessionStorage.getItem('aminy_analytics_session') || 'unknown',
              screen_name: 'pwa_install_accepted',
              entered_at: new Date().toISOString(),
              device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
            });
          }
        } catch {
          /* analytics failure is non-blocking */
        }
      }
    } catch (err) {
      console.warn('[PWAInstallPrompt] Install prompt failed:', err);
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
      promptRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      /* storage full */
    }
    setDeferredPrompt(null);
    promptRef.current = null;
  }, []);

  if (!showBanner || !deferredPrompt) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4"
      role="dialog"
      aria-label="Install Aminy app"
    >
      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 p-4 shadow-2xl">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 rounded-xl bg-white/20 p-2.5">
            <Smartphone className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">
              Install Aminy
            </h3>
            <p className="mt-0.5 text-sm text-white/80 leading-relaxed">
              Get the full app experience — quick access to your child's support tools, even offline.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-cyan-700 shadow-sm transition-all hover:bg-[#6B9080]/10 active:scale-95 disabled:opacity-50"
              >
                <Download size={14} />
                {installing ? 'Installing...' : 'Install'}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
