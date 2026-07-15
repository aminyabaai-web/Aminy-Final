// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * RedeemGiftScreen — claim a gifted Aminy subscription.
 *
 * Flow:
 *  - Reads ?code= from the URL (prefill) and shows a warm "you've been gifted"
 *    headline with a code input + Redeem button.
 *  - Requires auth. If there's no Supabase session, we persist the code to
 *    localStorage 'aminy_gift_code' (mirroring provider/caregiver invite
 *    capture) so it survives signup, then send the visitor to create-account.
 *    The App-level auto-redeem hook fires once they're authenticated.
 *  - On redeem we call the proven RPC redeem_gift_code({ p_code }). It returns
 *    { ok:true, tier, expires_at } or { ok:false, error } — we map the three
 *    error codes to friendly copy.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Gift, ArrowLeft, Loader2, Check, Sparkles } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

const fontStack = "'Schibsted Grotesk', 'Manrope', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Inter\", \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif";

export const GIFT_CODE_STORAGE_KEY = 'aminy_gift_code';

// Shape returned by the redeem_gift_code RPC.
type RedeemResult =
  | { ok: true; tier?: string; expires_at?: string }
  | { ok: false; error?: string };

const ERROR_COPY: Record<string, string> = {
  invalid_code: "That code doesn't look right — double-check it?",
  already_redeemed: "This gift has already been claimed.",
  not_authenticated: "Please sign in to claim your gift.",
};

function tierLabel(tier?: string): string {
  const t = (tier ?? '').toLowerCase();
  if (t === 'pro' || t === 'proplus' || t === 'pro_plus' || t === 'family') return 'Pro';
  return 'Core';
}

interface RedeemGiftScreenProps {
  onBack: () => void;
  /** Navigate to create-account (visitor is not signed in). */
  onCreateAccount: () => void;
  /** Called after a successful redeem — App routes to the dashboard. */
  onSuccess: () => void;
}

export function RedeemGiftScreen({ onBack, onCreateAccount, onSuccess }: RedeemGiftScreenProps) {
  const [code, setCode] = useState('');
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null); // null = still checking
  const [status, setStatus] = useState<'idle' | 'redeeming' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [grantedTier, setGrantedTier] = useState<string | undefined>(undefined);

  // Prefill ?code= and detect whether we already have a session.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code');
      if (urlCode) setCode(urlCode);
    } catch { /* best-effort prefill */ }
    supabase.auth.getUser()
      .then(({ data }) => setIsAuthed(!!data?.user))
      .catch(() => setIsAuthed(false));
  }, []);

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setStatus('error');
      setErrorMsg('Enter your gift code to continue.');
      return;
    }

    // Not signed in → stash the code so it survives signup, then send them to
    // create-account. The App auto-redeem hook claims it once they're verified.
    if (!isAuthed) {
      try { localStorage.setItem(GIFT_CODE_STORAGE_KEY, trimmed); } catch { /* ignore */ }
      onCreateAccount();
      return;
    }

    setStatus('redeeming');
    setErrorMsg('');
    try {
      const { data, error } = await supabase.rpc('redeem_gift_code', { p_code: trimmed });
      if (error) {
        setStatus('error');
        setErrorMsg('Something went wrong claiming your gift. Please try again.');
        return;
      }
      const result = data as RedeemResult;
      if (result && result.ok) {
        setGrantedTier(result.tier);
        setStatus('success');
        try { localStorage.removeItem(GIFT_CODE_STORAGE_KEY); } catch { /* ignore */ }
      } else {
        const key = (result && 'error' in result && result.error) || 'invalid_code';
        setStatus('error');
        setErrorMsg(ERROR_COPY[key] ?? ERROR_COPY.invalid_code);
      }
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong claiming your gift. Please try again.');
    }
  };

  const containerStyle: React.CSSProperties = {
    fontFamily: fontStack,
    background: 'linear-gradient(180deg, #F6FBFB 0%, #EAF3F7 55%, #E4EFF5 100%)',
    display: 'flex',
    flexDirection: 'column',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  };

  // ─── Success state ─────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen min-h-[100dvh]" style={containerStyle}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            style={{
              width: '84px', height: '84px', borderRadius: '50%',
              background: '#43AA8B', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '24px',
            }}
          >
            <Check size={40} color="#ffffff" strokeWidth={3} />
          </motion.div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0D1B2A', margin: '0 0 12px', maxWidth: '340px' }}>
            You've got 3 months of Aminy {tierLabel(grantedTier)}! Enjoy 💛
          </h1>
          <p style={{ fontSize: '15px', color: '#577590', margin: '0 0 28px', maxWidth: '320px', lineHeight: 1.6 }}>
            Gentle guidance. Meaningful progress. Let's get started.
          </p>
          <button
            onClick={onSuccess}
            style={{
              background: '#2A7D99', color: '#ffffff', border: 'none',
              borderRadius: '14px', padding: '14px 32px', fontSize: '16px',
              fontWeight: 600, fontFamily: fontStack, cursor: 'pointer',
            }}
          >
            Go to my dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Redeem form ───────────────────────────────────────────────
  const isRedeeming = status === 'redeeming';

  return (
    <div className="min-h-screen min-h-[100dvh]" style={containerStyle}>
      <nav style={{ padding: '12px 20px 4px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <button
            onClick={onBack}
            aria-label="Go back"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#577590', fontSize: '15px', fontFamily: fontStack, cursor: 'pointer', padding: '4px 0' }}
          >
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(67,170,139,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Gift size={34} color="#43AA8B" />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0D1B2A', margin: '0 0 10px' }}>
              You've been gifted Aminy 🎁
            </h1>
            <p style={{ fontSize: '15px', color: '#577590', margin: 0, lineHeight: 1.6 }}>
              {isAuthed === false
                ? 'Create your free account or sign in to claim your gift.'
                : 'Enter your gift code below to unlock 3 months on us.'}
            </p>
          </div>

          <label htmlFor="gift-code" style={{ display: 'block', marginBottom: '6px', color: '#577590', fontSize: '13px', fontFamily: fontStack }}>
            Gift code
          </label>
          <input
            id="gift-code"
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); if (status === 'error') setStatus('idle'); }}
            placeholder="AMINY-XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRedeem(); }}
            style={{
              width: '100%', height: '54px', backgroundColor: 'rgba(255,255,255,0.92)',
              border: `1px solid ${status === 'error' ? '#E07A5F' : 'rgba(87,117,144,0.25)'}`,
              borderRadius: '14px', padding: '0 16px', fontSize: '17px', letterSpacing: '1px',
              fontFamily: fontStack, color: '#0D1B2A', outline: 'none', textTransform: 'uppercase',
            }}
          />

          {status === 'error' && errorMsg && (
            <p role="alert" style={{ color: '#C15A3F', fontSize: '14px', margin: '10px 2px 0', lineHeight: 1.5 }}>
              {errorMsg}
            </p>
          )}

          <button
            onClick={handleRedeem}
            disabled={isRedeeming || isAuthed === null}
            style={{
              width: '100%', marginTop: '20px', height: '54px', background: '#2A7D99',
              color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '16px',
              fontWeight: 600, fontFamily: fontStack,
              cursor: isRedeeming || isAuthed === null ? 'default' : 'pointer',
              opacity: isRedeeming || isAuthed === null ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {isRedeeming ? (
              <><Loader2 size={18} className="animate-spin" /> Claiming…</>
            ) : isAuthed === false ? (
              'Sign in to claim'
            ) : (
              <><Sparkles size={18} /> Redeem gift</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RedeemGiftScreen;
