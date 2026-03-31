/**
 * CookieConsent - GDPR/CCPA compliant cookie consent banner
 *
 * Category-based consent:
 * - Essential: Always on (auth, security, session)
 * - Analytics: Product usage, engagement metrics
 * - Marketing: Outreach, referral tracking
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, X, ChevronDown, ChevronUp, Shield } from 'lucide-react';

const CONSENT_KEY = 'aminy-cookie-consent';

export interface CookiePreferences {
  essential: true; // Always true — cannot be disabled
  analytics: boolean;
  marketing: boolean;
  consentedAt: string;
}

interface CookieConsentProps {
  onAccept?: (preferences: CookiePreferences) => void;
  onDecline?: () => void;
}

function getStoredPreferences(): CookiePreferences | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const prefs = getStoredPreferences();
    if (!prefs) {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const prefs: CookiePreferences = { essential: true, analytics: true, marketing: true, consentedAt: new Date().toISOString() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
    setShowBanner(false);
    onAccept?.(prefs);
  };

  const handleAcceptSelected = () => {
    const prefs: CookiePreferences = { essential: true, analytics, marketing, consentedAt: new Date().toISOString() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
    setShowBanner(false);
    onAccept?.(prefs);
  };

  const handleDecline = () => {
    const prefs: CookiePreferences = { essential: true, analytics: false, marketing: false, consentedAt: new Date().toISOString() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
    setShowBanner(false);
    onDecline?.();
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-[9999] p-4 md:inset-x-auto md:bottom-6 md:left-[21rem] md:right-6 md:w-auto md:max-w-[30rem] md:p-0"
        >
          <div className="mx-auto rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_28px_60px_rgba(15,23,42,0.14)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 md:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-900/30">
                  <Cookie className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white md:text-[15px]">
                    We value your privacy
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300 md:text-sm">
                    We use cookies for essential app functionality, analytics, and outreach. You choose which categories to allow.{' '}
                    <a
                      href="/?screen=privacy-policy"
                      className="text-teal-600 underline hover:no-underline dark:text-teal-400"
                    >
                      Privacy Policy
                    </a>
                  </p>
                </div>
              </div>

              {/* Category details (expandable) */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
              >
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showDetails ? 'Hide details' : 'Customize preferences'}
              </button>

              {showDetails && (
                <div className="space-y-2.5 text-xs">
                  {/* Essential — always on */}
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-800 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-green-600" />
                      <div>
                        <span className="font-medium text-gray-800 dark:text-gray-200">Essential</span>
                        <p className="text-gray-500 dark:text-gray-400">Authentication, security, session. Always on.</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Required</div>
                  </div>

                  {/* Analytics */}
                  <label className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-800 px-3 py-2.5 cursor-pointer">
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">Analytics</span>
                      <p className="text-gray-500 dark:text-gray-400">Usage patterns, engagement, feature adoption.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={analytics}
                      onChange={e => setAnalytics(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                  </label>

                  {/* Marketing */}
                  <label className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-800 px-3 py-2.5 cursor-pointer">
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">Marketing</span>
                      <p className="text-gray-500 dark:text-gray-400">Referral tracking, outreach, growth analytics.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={marketing}
                      onChange={e => setMarketing(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleDecline}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-slate-300 hover:text-gray-900 dark:border-slate-700 dark:text-gray-300 dark:hover:text-white"
                >
                  Essential Only
                </button>
                {showDetails ? (
                  <button
                    onClick={handleAcceptSelected}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0891b2] px-5 py-2.5 text-sm font-medium text-white transition-colors shadow-sm hover:bg-[#0b7a97]"
                  >
                    Save Preferences
                  </button>
                ) : (
                  <button
                    onClick={handleAcceptAll}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0891b2] px-5 py-2.5 text-sm font-medium text-white transition-colors shadow-sm hover:bg-[#0b7a97]"
                  >
                    Accept All
                  </button>
                )}
              </div>

              <button
                onClick={handleDecline}
                className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-600 md:hidden"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieConsent;
