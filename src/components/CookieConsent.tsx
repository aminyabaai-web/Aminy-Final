/**
 * CookieConsent - GDPR/CCPA compliant cookie consent banner
 *
 * Shows a subtle banner for cookie consent that persists the user's choice.
 * Required for compliance with privacy regulations.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, X } from 'lucide-react';

const CONSENT_KEY = 'aminy-cookie-consent';

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

export function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShowBanner(false);
    onAccept?.();
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
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
                    We use cookies to personalize your experience, understand product usage, and support outreach.
                    By clicking “Accept All,” you consent to this use. Read our{' '}
                    <a
                      href="/?screen=privacy-policy"
                      className="inline-flex min-h-[44px] items-center text-teal-600 underline hover:no-underline dark:text-teal-400"
                    >
                      Privacy Policy
                    </a>{' '}
                    for more information.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleDecline}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-slate-300 hover:text-gray-900 dark:border-slate-700 dark:text-gray-300 dark:hover:text-white"
                >
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0891b2] px-5 py-2.5 text-sm font-medium text-white transition-colors shadow-sm hover:bg-[#0b7a97]"
                >
                  Accept All
                </button>
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
