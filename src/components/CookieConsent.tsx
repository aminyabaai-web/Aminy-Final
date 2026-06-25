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
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  // Offset the banner above the bottom nav when present, so the two fixed-bottom
  // elements never overlap (the nav tabs would otherwise be covered by this z-9999
  // banner if a nav screen renders before consent is given).
  const [navBottomOffset, setNavBottomOffset] = useState(0);

  useEffect(() => {
    const prefs = getStoredPreferences();
    if (prefs) return;
    const timer = setTimeout(() => {
      setMounted(true);
      setTimeout(() => setVisible(true), 50);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Measure the bottom nav (if any) so the banner sits just above it.
  useEffect(() => {
    if (!mounted) return;
    const measure = () => {
      const nav = document.querySelector('nav[aria-label="Main navigation"]') as HTMLElement | null;
      setNavBottomOffset(nav ? Math.round(nav.getBoundingClientRect().height) : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mounted]);

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
        bottom: navBottomOffset,
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
          className={`backdrop-blur-md px-4 py-3 border-b space-y-2 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-gray-50/95 border-gray-200'}`}
        >
          {[
            { label: 'Essential', desc: 'Auth, security, session — always on', locked: true },
            { label: 'Analytics', desc: 'Usage patterns, feature adoption', value: analytics, set: setAnalytics },
            { label: 'Marketing', desc: 'Referral tracking, outreach', value: marketing, set: setMarketing },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{item.label}</p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{item.desc}</p>
              </div>
              {item.locked
                ? <span className="text-xs font-medium text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full">Required</span>
                : <input type="checkbox" checked={item.value} onChange={e => item.set!(e.target.checked)} aria-label={`${item.label} cookies`} className="h-3.5 w-3.5 rounded border-slate-600 text-[#6B9080]" />
              }
            </div>
          ))}
        </div>
      )}

      <div className={`backdrop-blur-md px-4 py-2.5 flex items-center gap-3 ${isDark ? 'bg-slate-900/95' : 'bg-white/95'}`} style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.15)', flexWrap: 'wrap', rowGap: '8px' }}>
        <Cookie className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
        <p className={`flex-1 text-sm leading-5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`} style={{ minWidth: '150px' }}>
          We use cookies for functionality &amp; analytics.
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0" style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setShowDetails(d => !d)}
            className="px-2.5 py-1 text-sm font-medium text-primary underline"
          >
            {showDetails ? 'Hide' : 'Customize'}
          </button>
          <button
            onClick={handleDecline}
            style={{ padding: '7px 16px', whiteSpace: 'nowrap' }}
            className={`rounded-md text-sm font-medium border transition-colors ${isDark ? 'text-slate-300 border-slate-700 hover:border-slate-500' : 'text-gray-600 border-gray-300 hover:border-gray-400'}`}
          >
            Essential only
          </button>
          <button
            onClick={showDetails ? handleAcceptSelected : handleAcceptAll}
            style={{ padding: '7px 16px', whiteSpace: 'nowrap' }}
            className="rounded-md text-sm font-medium bg-primary text-white hover:bg-primary transition-colors"
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
