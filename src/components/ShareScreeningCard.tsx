// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ShareScreeningCard — the viral loop at the bottom of screening results.
 *
 * A parent who just got validating results wants to (a) tell other parents
 * in their support group, (b) tell their co-parent. Two modes:
 *
 *   1. "Share the free screening" — a GENERIC link to the screening itself.
 *      Contains ZERO results data. Ever. Just the invitation.
 *   2. "Send my results to my co-parent" — an EXPLICIT, consented share of a
 *      one-line warm summary (no scores, no answers, no clinical language).
 *      A consent note above the button says exactly what will be shared.
 *
 * Both use navigator.share when available, with a clipboard fallback +
 * inline "copied" confirmation (this screen is pre-auth/chromeless, so we
 * don't rely on the app-level toaster being mounted).
 *
 * Attribution: shared links carry ?ref=parent-share. captureAcquisitionRef()
 * persists any ?ref= URL param to localStorage (mirroring the
 * aminy_partner_org pattern in src/lib/partner-org.ts) so a signup that
 * started from a shared link can be attributed.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Share2, Heart } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { RiskLevel } from '../lib/screening-instruments';

// ============================================
// ATTRIBUTION — ?ref= → localStorage stamp
// ============================================

/** localStorage key for acquisition-ref attribution (read at signup). */
export const ACQUISITION_REF_KEY = 'aminy_acquisition_ref';

/** Canonical share URL — deep-links straight into the free screening. */
export const SCREENING_SHARE_URL =
  'https://aminy.ai/?screen=free-screening&ref=parent-share';

/**
 * Persist a `?ref=` URL param to localStorage so post-signup flows can
 * attribute the acquisition. Same pattern as partner-org's
 * `aminy_partner_org` stamp. Best-effort — never throws.
 */
export function captureAcquisitionRef(): void {
  if (typeof window === 'undefined') return;
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && ref.length > 0 && ref.length <= 64) {
      localStorage.setItem(ACQUISITION_REF_KEY, ref);
    }
  } catch {
    // Attribution is best-effort, never load-bearing.
  }
}

/** Read the persisted acquisition ref (e.g. 'parent-share'), if any. */
export function getAcquisitionRef(): string | null {
  try {
    return localStorage.getItem(ACQUISITION_REF_KEY);
  } catch {
    return null;
  }
}

// ============================================
// SHARE PAYLOADS — privacy is sacred
// ============================================

export type ShareMode = 'generic' | 'coparent';

/**
 * Generic share — NO results data, ever. Just the invitation.
 * Exported so tests can assert the payload stays results-free.
 */
export const GENERIC_SHARE_PAYLOAD = {
  title: 'Free developmental screening — Aminy',
  text: 'This free 5-minute check-in helped me understand my child’s needs. No signup needed to see results.',
  url: SCREENING_SHARE_URL,
} as const;

/**
 * Warm, non-alarming phrasing per risk level. No scores, no answers, no
 * "risk" language — just what the parent would actually text their partner.
 */
const WARM_RISK_PHRASES: Record<RiskLevel, string> = {
  low: 'it was reassuring — things look on track, and we know what to keep an eye on',
  moderate: 'it suggests talking to a specialist could help',
  high: 'it suggests a professional evaluation could really help',
};

/** Build the consented co-parent message: warm summary + link, nothing else. */
export function buildCoParentMessage(
  childName: string | undefined,
  riskLevel: RiskLevel,
): string {
  const name = childName?.trim() || 'our kid';
  return `I did a screening for ${name} on Aminy — ${WARM_RISK_PHRASES[riskLevel]}. Take a look: ${SCREENING_SHARE_URL}`;
}

// ============================================
// ANALYTICS — same endpoint as analytics-tracker, but works pre-auth
// ============================================

/**
 * Fire-and-forget share-tap event. lib/analytics-tracker's trackEvent()
 * bails without a userId, but this card lives on the PRE-AUTH funnel — so
 * post directly to the same endpoint with an anon fallback id. Silent
 * failure is fine; this must never block the share itself.
 */
function trackShareTap(mode: ShareMode): void {
  try {
    const userId = localStorage.getItem('userId') || 'anon-prescreen';
    void fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/analytics/track`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          userId,
          event: 'screening_share_tapped',
          timestamp: new Date().toISOString(),
          properties: { mode },
        }),
      },
    ).catch(() => {});
  } catch {
    // Silent — analytics must never interfere with the share.
  }
}

// ============================================
// SHARE MECHANICS — navigator.share → clipboard fallback
// ============================================

type ShareOutcome = 'shared' | 'copied' | 'failed';

async function shareOrCopy(
  data: { title: string; text: string; url?: string },
  clipboardText: string,
): Promise<ShareOutcome> {
  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  };

  if (typeof nav.share === 'function') {
    try {
      await nav.share(data);
      return 'shared';
    } catch (err) {
      // AbortError = user closed the share sheet — done, don't also copy.
      if (err instanceof Error && err.name === 'AbortError') return 'shared';
      // Any other failure: fall through to clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(clipboardText);
    return 'copied';
  } catch {
    return 'failed';
  }
}

// ============================================
// STYLES — matches FreeScreeningFlow's inline-style token system
// ============================================

const TEAL = '#2A7D99';
const TEAL_BG_LIGHT = 'rgba(42, 125, 153, 0.07)';
const TEAL_BORDER = 'rgba(42, 125, 153, 0.18)';

const styles = {
  card: {
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    border: '1px solid #E2EFF3',
    boxShadow: '0 1px 3px rgba(27,39,51,0.04)',
  },
  headingRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  heading: { fontSize: 15, fontWeight: 600, color: '#132F43', margin: 0 },
  body: { fontSize: 13, color: '#5A6B7A', lineHeight: 1.6, margin: '0 0 14px' },
  shareBtn: {
    width: '100%',
    padding: '13px 20px',
    borderRadius: 12,
    border: `1.5px solid ${TEAL}`,
    backgroundColor: TEAL_BG_LIGHT,
    color: TEAL,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'background-color 0.15s',
  },
  divider: { height: 1, backgroundColor: '#E2EFF3', margin: '16px 0 14px' },
  consentNote: { fontSize: 12, color: '#7A8C9A', lineHeight: 1.5, margin: '0 0 8px', textAlign: 'center' as const },
  coParentBtn: {
    width: '100%',
    padding: '10px 16px',
    borderRadius: 10,
    border: 'none',
    background: 'none',
    color: TEAL,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
  copiedPill: {
    marginTop: 10,
    padding: '8px 14px',
    borderRadius: 999,
    backgroundColor: TEAL_BG_LIGHT,
    border: `1px solid ${TEAL_BORDER}`,
    color: TEAL,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center' as const,
  },
};

// ============================================
// COMPONENT
// ============================================

export interface ShareScreeningCardProps {
  /** Child's first name, if the parent provided one (optional field upstream). */
  childName?: string;
  /** Risk level of the result on screen — used ONLY for the consented co-parent phrase. */
  riskLevel: RiskLevel;
}

export function ShareScreeningCard({ childName, riskLevel }: ShareScreeningCardProps) {
  const [copied, setCopied] = useState<ShareMode | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const showCopied = (mode: ShareMode) => {
    setCopied(mode);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(null), 2500);
  };

  const handleGenericShare = async () => {
    trackShareTap('generic');
    const outcome = await shareOrCopy(
      GENERIC_SHARE_PAYLOAD,
      `${GENERIC_SHARE_PAYLOAD.text} ${GENERIC_SHARE_PAYLOAD.url}`,
    );
    if (outcome === 'copied') showCopied('generic');
  };

  const handleCoParentShare = async () => {
    trackShareTap('coparent');
    const message = buildCoParentMessage(childName, riskLevel);
    // Message already contains the link — no separate url field, so share
    // sheets don't render the URL twice.
    const outcome = await shareOrCopy(
      { title: 'Our screening results — Aminy', text: message },
      message,
    );
    if (outcome === 'copied') showCopied('coparent');
  };

  return (
    <div style={styles.card} data-testid="share-screening-card">
      <div style={styles.headingRow}>
        <Heart style={{ width: 16, height: 16, color: TEAL, flexShrink: 0 }} aria-hidden="true" />
        <h3 style={styles.heading}>Know another parent who&apos;s wondering?</h3>
      </div>
      <p style={styles.body}>
        Pass the screening along — it&apos;s free, takes about 5 minutes, and no signup is
        needed. Sharing sends a fresh, blank check-in — never your answers or results.
      </p>

      <button
        onClick={handleGenericShare}
        style={styles.shareBtn}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(42,125,153,0.14)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = TEAL_BG_LIGHT; }}
      >
        <Share2 style={{ width: 16, height: 16 }} aria-hidden="true" />
        Share the free screening
      </button>

      <div style={styles.divider} />

      <p style={styles.consentNote}>
        This shares a summary of the results on this screen.
      </p>
      <button onClick={handleCoParentShare} style={styles.coParentBtn}>
        Send my results to my co-parent
      </button>

      {copied && (
        <div style={styles.copiedPill} role="status">
          {copied === 'generic' ? 'Link copied' : 'Message copied'} — ready to paste
        </div>
      )}
    </div>
  );
}

export default ShareScreeningCard;
