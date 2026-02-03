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
    // Check if user has already made a choice
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay before showing to not interrupt initial load
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
          className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
        >
          <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Icon and Text */}
              <div className="flex-1 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                    We value your privacy
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-xs md:text-sm mt-1">
                    We use cookies to enhance your experience, analyze site traffic, and for marketing purposes.
                    By clicking "Accept", you consent to our use of cookies.
                    Read our{' '}
                    <a
                      href="/?screen=privacy-policy"
                      className="text-teal-600 dark:text-teal-400 underline hover:no-underline"
                    >
                      Privacy Policy
                    </a>
                    {' '}for more information.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={handleDecline}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors shadow-sm"
                >
                  Accept All
                </button>
              </div>

              {/* Close button for mobile */}
              <button
                onClick={handleDecline}
                className="absolute top-3 right-3 md:hidden p-1 text-gray-400 hover:text-gray-600"
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
