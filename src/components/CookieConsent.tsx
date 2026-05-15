// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'aminy-cookie-consent';

export interface CookiePreferences {
  essential: true;
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
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const prefs = getStoredPreferences();
    if (prefs) return;
    const timer = setTimeout(() => {
      setMounted(true);
      setTimeout(() => setVisible(true), 50);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = (prefs: CookiePreferences) => {
    setVisible(false);
    setTimeout(() => setMounted(false), 350);
    localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
  };

  const handleAcceptAll = () => {
    const prefs: CookiePreferences = { essential: true, analytics: true, marketing: true, consentedAt: new Date().toISOString() };
    dismiss(prefs);
    onAccept?.(prefs);
  };

  const handleAcceptSelected = () => {
    const prefs: CookiePreferences = { essential: true, analytics, marketing, consentedAt: new Date().toISOString() };
    dismiss(prefs);
    onAccept?.(prefs);
  };

  const handleDecline = () => {
    const prefs: CookiePreferences = { essential: true, analytics: false, marketing: false, consentedAt: new Date().toISOString() };
    dismiss(prefs);
    onDecline?.();
  };

  if (!mounted) return null;

  const banner = (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {showDetails && (
        <div
          style={{
            maxHeight: showDetails ? '200px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.25s ease',
          }}
          className="bg-slate-800/95 backdrop-blur-md px-4 py-3 border-b border-slate-700 space-y-2"
        >
          {[
            { label: 'Essential', desc: 'Auth, security, session — always on', locked: true },
            { label: 'Analytics', desc: 'Usage patterns, feature adoption', value: analytics, set: setAnalytics },
            { label: 'Marketing', desc: 'Referral tracking, outreach', value: marketing, set: setMarketing },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-200">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.desc}</p>
              </div>
              {item.locked
                ? <span className="text-[10px] font-medium text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full">Required</span>
                : <input type="checkbox" checked={item.value} onChange={e => item.set!(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-600 text-teal-600" />
              }
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2.5 flex items-center gap-3" style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.3)' }}>
        <Cookie className="w-3.5 h-3.5 flex-shrink-0 text-teal-400" />
        <p className="flex-1 text-[11px] leading-4 text-slate-300">
          We use cookies for functionality &amp; analytics.{' '}
          <button onClick={() => setShowDetails(d => !d)} className="text-teal-400 underline">
            {showDetails ? 'Hide' : 'Customize'}
          </button>
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-400 border border-slate-700 hover:border-slate-500 transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={showDetails ? handleAcceptSelected : handleAcceptAll}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-teal-600 text-white hover:bg-teal-500 transition-colors"
          >
            {showDetails ? 'Save' : 'Accept all'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(banner, document.body);
}

export default CookieConsent;
