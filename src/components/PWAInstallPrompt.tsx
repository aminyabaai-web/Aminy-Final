/**
 * PWA Install Prompt Component
 *
 * Shows a native-feeling install banner when the browser
 * supports PWA installation. Captures the `beforeinstallprompt`
 * event and presents a branded install CTA.
 *
 * Only shows:
 * - When not already installed (display-mode: standalone)
 * - After user has completed onboarding (or visited 3+ screens)
 * - Maximum once per session (unless dismissed, waits 7 days)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'aminy_pwa_dismissed_at';
const DISMISS_COOLDOWN_DAYS = 7;

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installing, setInstalling] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Don't show if recently dismissed
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_COOLDOWN_DAYS) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      promptRef.current = event;
      setDeferredPrompt(event);

      // Delay showing banner slightly for better UX
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = promptRef.current;
    if (!prompt) return;

    setInstalling(true);
    await prompt.prompt();

    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      // Track installation
      try {
        const { supabase } = await import('../utils/supabase/client');
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
      } catch { /* analytics failure is non-blocking */ }
    }
    setInstalling(false);
    setDeferredPrompt(null);
    promptRef.current = null;
  }, []);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDeferredPrompt(null);
    promptRef.current = null;
  }, []);

  if (!showBanner || !deferredPrompt) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up"
      role="banner"
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
              Add Aminy to Home Screen
            </h3>
            <p className="mt-0.5 text-xs text-white/80 leading-relaxed">
              Quick access to your child's support tools — even offline. No app store needed.
            </p>

            <button
              onClick={handleInstall}
              disabled={installing}
              className="mt-3 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-cyan-700 shadow-sm transition-all hover:bg-cyan-50 active:scale-95 disabled:opacity-50"
            >
              <Download size={14} />
              {installing ? 'Installing...' : 'Install App'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
