// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * GiftAndSponsorScreen — the "give Aminy to someone" entry point (screen id
 * 'gift-sponsor'). Two warm sections:
 *
 *  1. "Gift Aminy" — a grandparent/relative gives a family 3 months of Aminy.
 *     Two cards (Core / Pro) open live Stripe Payment Links. After purchase
 *     Stripe emails the buyer a gift code they share; the recipient claims it
 *     on the 'redeem-gift' screen.
 *  2. "Sponsor a family" — mission framing: fund Aminy for a family who can't
 *     afford it, distributed through partner clinics. 1-month / 3-month Stripe
 *     donation links.
 *
 * Purchases are ONE-TIME (not subscriptions), so Apple's IAP rule does not
 * apply — but we still open externally via the platform-safe helper: the
 * EXTERNAL browser on the native shell, a NEW TAB on web (so the user keeps
 * their Aminy session). Uses inline styles (like CreateAccountScreen /
 * RedeemGiftScreen) to avoid Tailwind v4 precompiled-class risk.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Gift, ArrowLeft, Heart, ExternalLink, Sparkles } from 'lucide-react';
import { isNativeShell, openSubscriptionCheckout } from '../lib/platform-purchase';

const fontStack = "'Schibsted Grotesk', 'Manrope', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Inter\", \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif";

// Live Stripe-hosted links (created this session). Exported so tests + callers
// can assert the exact URLs without scraping the DOM.
export const GIFT_SPONSOR_LINKS = {
  giftCore3mo: 'https://buy.stripe.com/4gM9AVb8icZbcRaa8deIw00',
  giftPro3mo: 'https://buy.stripe.com/7sYcN71xIbV72cw0xDeIw01',
  sponsor1mo: 'https://donate.stripe.com/fZudRb4JUbV74kEfsxeIw02',
  sponsor3mo: 'https://donate.stripe.com/28E3cxa4e2kxcRa805eIw03',
} as const;

/**
 * Open a Stripe link the platform-correct way: external browser on the native
 * shell (keeps one-time purchases off Apple's WebView rails), new tab on web
 * (the user keeps their Aminy session open behind it).
 */
function openStripeLink(url: string): void {
  if (isNativeShell()) {
    openSubscriptionCheckout(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

interface GiftAndSponsorScreenProps {
  onBack: () => void;
  /** Navigate to the 'redeem-gift' screen (footer "Have a gift code?" link). */
  onRedeem: () => void;
}

const NAVY = '#0D1B2A';
const TEAL = '#43AA8B';
const SLATE = '#577590';

function GiftCard({
  title, price, blurb, onBuy, featured,
}: {
  title: string;
  price: string;
  blurb: string;
  onBuy: () => void;
  featured?: boolean;
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: `1px solid ${featured ? 'rgba(67,170,139,0.55)' : 'rgba(87,117,144,0.2)'}`,
        borderRadius: '18px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: featured ? '0 6px 20px rgba(67,170,139,0.14)' : '0 2px 10px rgba(13,27,42,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: NAVY, margin: 0 }}>{title}</h3>
        <span style={{ fontSize: '17px', fontWeight: 700, color: TEAL }}>{price}</span>
      </div>
      <p style={{ fontSize: '14px', color: SLATE, margin: '0 0 10px', lineHeight: 1.5 }}>{blurb}</p>
      <button
        onClick={onBuy}
        style={{
          height: '46px', width: '100%', background: TEAL, color: '#ffffff', border: 'none',
          borderRadius: '12px', fontSize: '15px', fontWeight: 600, fontFamily: fontStack,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
        }}
      >
        Gift {title} <ExternalLink size={15} />
      </button>
    </div>
  );
}

function SponsorButton({ label, price, onClick }: { label: string; price: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: '130px', background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(87,117,144,0.22)', borderRadius: '14px',
        padding: '14px 12px', fontFamily: fontStack, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
      }}
    >
      <span style={{ fontSize: '15px', fontWeight: 700, color: NAVY }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: TEAL }}>{price}</span>
      <span style={{ fontSize: '12px', color: SLATE, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
        Donate <ExternalLink size={12} />
      </span>
    </button>
  );
}

export function GiftAndSponsorScreen({ onBack, onRedeem }: GiftAndSponsorScreenProps) {
  const containerStyle: React.CSSProperties = {
    fontFamily: fontStack,
    background: 'linear-gradient(180deg, #F6FBFB 0%, #EAF3F7 55%, #E4EFF5 100%)',
    display: 'flex',
    flexDirection: 'column',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  };

  return (
    <div className="min-h-screen min-h-[100dvh]" style={containerStyle}>
      <nav style={{ padding: '12px 20px 4px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <button
            onClick={onBack}
            aria-label="Go back"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: SLATE, fontSize: '15px', fontFamily: fontStack, cursor: 'pointer', padding: '4px 0' }}
          >
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, padding: '8px 24px 40px' }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}
        >
          {/* Intro */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '20px', background: 'rgba(67,170,139,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Gift size={32} color={TEAL} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>
              Share Aminy with a family
            </h1>
            <p style={{ fontSize: '15px', color: SLATE, margin: 0, lineHeight: 1.6 }}>
              Gentle guidance. Meaningful progress. Give someone you love the calm of having Aminy in their corner.
            </p>
          </div>

          {/* ─── Gift Aminy ───────────────────────────────────────── */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '19px', fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>
              Gift Aminy
            </h2>
            <p style={{ fontSize: '14px', color: SLATE, margin: '0 0 16px', lineHeight: 1.55 }}>
              Give a family 3 months of calm — a thoughtful gift from a grandparent, aunt, uncle, or friend.
              After you buy, we&rsquo;ll email you a gift code to share.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <GiftCard
                title="Core"
                price="$44.97"
                blurb="3 months of Aminy Core — daily AI guidance and everyday support."
                onBuy={() => openStripeLink(GIFT_SPONSOR_LINKS.giftCore3mo)}
              />
              <GiftCard
                title="Pro"
                price="$89.97"
                blurb="3 months of Aminy Pro — deeper tools, more storage, and priority support."
                featured
                onBuy={() => openStripeLink(GIFT_SPONSOR_LINKS.giftPro3mo)}
              />
            </div>
          </section>

          {/* ─── Sponsor a family ─────────────────────────────────── */}
          <section style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Heart size={18} color={TEAL} />
              <h2 style={{ fontSize: '19px', fontWeight: 700, color: NAVY, margin: 0 }}>
                Sponsor a family
              </h2>
            </div>
            <p style={{ fontSize: '14px', color: SLATE, margin: '0 0 16px', lineHeight: 1.55 }}>
              Fund Aminy for a family who can&rsquo;t afford it. Your gift is distributed through our
              partner clinics to families who need support most.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <SponsorButton
                label="1 month"
                price="$14.99"
                onClick={() => openStripeLink(GIFT_SPONSOR_LINKS.sponsor1mo)}
              />
              <SponsorButton
                label="3 months"
                price="$44.97"
                onClick={() => openStripeLink(GIFT_SPONSOR_LINKS.sponsor3mo)}
              />
            </div>
          </section>

          {/* Footer — redeem link */}
          <div style={{ textAlign: 'center', paddingTop: '8px' }}>
            <button
              onClick={onRedeem}
              style={{ background: 'transparent', border: 'none', color: TEAL, fontSize: '14px', fontWeight: 600, fontFamily: fontStack, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={15} /> Have a gift code? Redeem it
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default GiftAndSponsorScreen;
