// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * PricingTiers — ChatGPT-style 4-tier pricing screen.
 *
 * Visual model matches OpenAI's Free/Go/Plus/Pro layout:
 *   - Single-page horizontal grid on desktop, 1-col stack on mobile
 *   - Personal / Organization toggle
 *   - "LIMITED TIME" badge on featured tier
 *   - Strikethrough promo pricing
 *   - Feature list with subtle bullet icons
 *   - Big CTA button per tier
 *   - Promo terms footer on featured tier
 */

import React, { useState } from 'react';
import { X, Check, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { createCheckoutSession } from '../lib/stripe-service';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import type { TierType } from '../lib/tier-utils';
import { tierPricing } from '../lib/tier-utils';
import type { MonetizationMode } from '../lib/monetization-mode';

interface PricingTiersProps {
  onClose?: () => void;
  onSubscribe?: (tier: TierType) => void;
  /** True when launched right after onboarding — slightly different copy + dismissal */
  isPostOnboarding?: boolean;
  /** Payer-type funnel: 'insured' softens the wall + leads with a coverage-check CTA. Default 'cash'. */
  monetizationMode?: MonetizationMode;
  /** Routes an insured user to the existing coverage/eligibility tools. */
  onCheckCoverage?: () => void;
}

type Audience = 'individual' | 'provider';

interface FeatureRow { icon: React.ReactNode; text: string }
interface TierCard {
  id: TierType | 'org' | 'solo';
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  /** Optional strikethrough promo price */
  promoFromMonthly?: number;
  promoBadge?: string;
  cta: string;
  ctaDisabled?: boolean;
  ctaCurrent?: boolean;
  featured?: boolean;
  features: FeatureRow[];
  features_heading?: string;
  promoFooter?: string;
}

function Dot() { return <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block shrink-0" />; }
function Spark() { return <Sparkles className="w-3.5 h-3.5 text-[#5A6B7A] shrink-0" />; }

const TIERS: TierCard[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'See what Aminy can do',
    priceMonthly: 0,
    priceAnnual: 0,
    cta: 'Your current plan',
    ctaCurrent: true,
    features: [
      { icon: <Dot />, text: 'Core AI Companion' },
      { icon: <Dot />, text: 'Limited messages + uploads' },
      { icon: <Dot />, text: 'Limited image attachments' },
      { icon: <Dot />, text: 'Limited memory across chats' },
    ],
  },
  {
    id: 'core',
    name: 'Core',
    tagline: 'Your everyday AI companion',
    priceMonthly: tierPricing.core.monthly,
    priceAnnual: tierPricing.core.yearly,
    promoFromMonthly: tierPricing.core.monthly,
    promoBadge: 'LIMITED TIME',
    cta: 'Claim free offer',
    featured: true,
    features: [
      { icon: <Spark />, text: 'Aminy AI — unlimited within fair-use cap' },
      { icon: <Spark />, text: 'Care coordination across ABA, PT, OT, ST, mental health' },
      { icon: <Spark />, text: 'Memory across chats + vault docs' },
      { icon: <Spark />, text: 'Voice input + appointment auto-capture' },
      { icon: <Spark />, text: 'Telehealth booking + SMS reminders' },
    ],
    promoFooter: 'Promo pricing applies for the first month. Cancel anytime.',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'More access to advanced intelligence',
    priceMonthly: tierPricing.pro.monthly,
    priceAnnual: tierPricing.pro.yearly,
    cta: 'Upgrade to Pro',
    features_heading: 'Everything in Core, plus:',
    features: [
      { icon: <Spark />, text: 'Advanced clinical reasoning' },
      { icon: <Spark />, text: 'Higher message + upload limits' },
      { icon: <Spark />, text: 'Advanced image analysis (IEPs, scans, photos)' },
      { icon: <Spark />, text: 'Multi-child support (up to 3)' },
      { icon: <Spark />, text: 'Custom AI personalities' },
      { icon: <Spark />, text: 'Outcomes tracking with validated measures' },
    ],
  },
  {
    id: 'proplus',
    name: 'Family',
    tagline: 'Whole-family care with expert messaging',
    priceMonthly: tierPricing.proplus.monthly,
    priceAnnual: tierPricing.proplus.yearly,
    cta: 'Upgrade to Family',
    features_heading: 'Everything in Pro, plus:',
    features: [
      { icon: <Spark />, text: 'Unlimited children + caregivers' },
      { icon: <Spark />, text: 'Async BCBA / RBT / Therapist messaging included' },
      { icon: <Spark />, text: 'Maximum memory + context' },
      { icon: <Spark />, text: 'Multi-caregiver shared timeline' },
      { icon: <Spark />, text: 'Priority telehealth booking' },
      { icon: <Spark />, text: 'Early access to new features' },
    ],
  },
];

// Provider / B2B tiers — shown when audience === 'provider'
const PROVIDER_TIERS: TierCard[] = [
  {
    id: 'solo',
    name: 'Solo Practice',
    tagline: 'Practice-in-a-box for independent BCBAs',
    priceMonthly: 79,
    priceAnnual: Math.round(79 * 12 * 0.85),
    cta: 'Start Solo Practice',
    features_heading: 'Everything you need to run your practice:',
    features: [
      { icon: <Spark />, text: 'AI clinical notes + session documentation' },
      { icon: <Spark />, text: 'Client & family portal' },
      { icon: <Spark />, text: 'Session scheduling + SMS reminders' },
      { icon: <Spark />, text: 'Goal tracking + progress reports' },
      { icon: <Spark />, text: 'AI-powered parent coaching tools' },
      { icon: <Spark />, text: '1 clinician seat' },
    ],
  },
  {
    id: 'org',
    name: 'Clinic',
    tagline: 'Full team coordination for ABA clinics',
    priceMonthly: 49,
    priceAnnual: Math.round(49 * 12 * 0.85),
    featured: true,
    cta: 'Start Clinic Plan',
    features_heading: 'Everything in Solo, plus:',
    features: [
      { icon: <Spark />, text: 'From $49 / clinician seat / month (min 5 seats)' },
      { icon: <Spark />, text: 'Multi-clinician team coordination' },
      { icon: <Spark />, text: 'EMR integration (Rethink, CentralReach)' },
      { icon: <Spark />, text: 'Authorization + billing tracking' },
      { icon: <Spark />, text: 'Org-wide analytics + outcome reports' },
      { icon: <Spark />, text: 'Dedicated onboarding support' },
    ],
    promoFooter: 'Minimum 5 seats. Volume discounts available for 20+ seats. Contact us for enterprise pricing.',
  },
];

export function PricingTiers({ onClose, onSubscribe, isPostOnboarding = false, monetizationMode = 'cash', onCheckCoverage }: PricingTiersProps) {
  const isInsured = monetizationMode === 'insured';
  const handleCheckCoverage = () => {
    if (onCheckCoverage) onCheckCoverage();
    else onClose?.();
  };
  const [audience, setAudience] = useState<Audience>('individual');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  async function handleSelect(tier: TierCard) {
    if (tier.ctaCurrent) return;
    if (tier.id === 'org' || tier.id === 'solo') {
      window.location.href = '/?screen=org-admin';
      return;
    }
    if (onSubscribe) {
      onSubscribe(tier.id as TierType);
      return;
    }
    setLoadingTier(tier.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('Sign in to continue');
        setLoadingTier(null);
        return;
      }
      const { url } = await createCheckoutSession({
        userId: user.id,
        email: user.email,
        tier: (tier.id === 'core' ? 'core' : tier.id === 'pro' ? 'pro' : 'proplus') as 'core' | 'pro' | 'proplus',
        interval: billing === 'annual' ? 'annual' : 'monthly',
      });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || 'Checkout failed');
      setLoadingTier(null);
    }
  }

  const visibleTiers = audience === 'individual' ? TIERS : PROVIDER_TIERS;

  return (
    <div className="min-h-screen bg-mist overflow-y-auto">
      {/* Header */}
      <div className="relative px-4 pt-4 pb-2">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#F0EDE8]"
            aria-label="Close pricing"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="max-w-2xl mx-auto text-center pt-8 sm:pt-12 pb-4 sm:pb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B2733] tracking-tight">
            {isPostOnboarding ? 'Pick the plan that fits your family' : 'Try Aminy free for 7 days'}
          </h1>
          {!isPostOnboarding && (
            <p className="text-sm text-[#5A6B7A] mt-3 max-w-md mx-auto">
              Cancel anytime. All paid plans include the full Aminy AI companion + care coordination across ABA, PT, OT, ST, and mental health.
            </p>
          )}
        </div>

        {/* Insured users: soften the wall, lead with a coverage check (booking covered care isn't live yet — link only to existing coverage tools, no guarantees) */}
        {isInsured && (
          <div className="max-w-2xl mx-auto mb-5 rounded-2xl p-5 bg-gradient-to-r from-[#FAF7F2] to-[#F0EDE8] border border-[#C8DDE8]">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 rounded-full flex-shrink-0">
                <Check className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-blue-900 mb-1">You may already be covered</h2>
                <p className="text-sm text-[#4A6478] leading-relaxed mb-4">
                  Your plan may cover therapy and assessments for your child. Coverage varies by plan — check your benefits to see what applies. We can&rsquo;t guarantee coverage, but our tools help you find out.
                </p>
                <button
                  onClick={handleCheckCoverage}
                  className="w-full flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-2.5 transition-colors"
                >
                  Check your insurance coverage
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-center text-sm text-blue-700 mt-2">Or see subscription plans below</p>
              </div>
            </div>
          </div>
        )}

        {/* Audience toggle */}
        <div className="flex justify-center mb-4">
          <div className="bg-white border border-[#E8E4DF] rounded-full p-1 inline-flex">
            <button
              onClick={() => setAudience('individual')}
              className={`text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 ${
                audience === 'individual' ? 'bg-[#2A7D99] text-white shadow-sm' : 'text-[#5A6B7A] hover:bg-[#F6FBFB]'
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setAudience('provider')}
              className={`text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 ${
                audience === 'provider' ? 'bg-[#2A7D99] text-white shadow-sm' : 'text-[#5A6B7A] hover:bg-[#F6FBFB]'
              }`}
            >
              Provider
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-[#8A9BA8] mb-4">
          {audience === 'individual' ? 'For families & caregivers' : 'For BCBAs, clinics & ABA organizations'}
        </p>

        {/* Billing toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white border border-[#E8E4DF] rounded-full p-1 inline-flex text-xs">
            <button
              onClick={() => setBilling('monthly')}
              className={`font-medium px-4 py-1.5 rounded-full transition-colors ${
                billing === 'monthly' ? 'bg-[#2A7D99]/10 text-[#2A7D99]' : 'text-[#5A6B7A] hover:bg-[#F6FBFB]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`font-medium px-4 py-1.5 rounded-full transition-colors ${
                billing === 'annual' ? 'bg-[#2A7D99]/10 text-[#2A7D99]' : 'text-[#5A6B7A] hover:bg-[#F6FBFB]'
              }`}
            >
              Annual <span className="text-[#2A7D99] font-semibold">· save up to 28%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tier cards */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {visibleTiers.map(tier => (
            <TierCardView
              key={tier.id}
              tier={tier}
              billing={billing}
              loading={loadingTier === tier.id}
              onSelect={() => handleSelect(tier)}
            />
          ))}
        </div>

        {/* Cross-sell nudge */}
        {audience === 'individual' && (
          <div className="text-center mt-8 px-4">
            <p className="text-xs text-[#5A6B7A]">
              Are you a BCBA or running a clinic?{' '}
              <button
                onClick={() => setAudience('provider')}
                className="text-[#2A7D99] font-semibold underline underline-offset-2"
              >
                See Provider plans →
              </button>
            </p>
          </div>
        )}
        {audience === 'provider' && (
          <div className="text-center mt-8 px-4">
            <p className="text-xs text-[#5A6B7A]">
              Looking for personal use?{' '}
              <button
                onClick={() => setAudience('individual')}
                className="text-[#2A7D99] font-semibold underline underline-offset-2"
              >
                See Individual plans →
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tier Card ───────────────────────────────────────────────────────────────

function TierCardView({
  tier, billing, loading, onSelect,
}: {
  tier: TierCard;
  billing: 'monthly' | 'annual';
  loading: boolean;
  onSelect: () => void;
}) {
  const displayPrice = billing === 'annual'
    ? Math.round((tier.priceAnnual / 12) * 100) / 100
    : tier.priceMonthly;

  // The featured tier's free-offer ($0) framing is tied to the 7-day free trial,
  // which applies regardless of billing interval — so it must render on initial
  // load (default billing is 'annual'), not only when the user toggles to Monthly.
  const hasPromo = !!tier.promoFromMonthly && !!tier.featured;
  // Strike through the actual per-month price for the selected interval so the
  // crossed-out reference stays accurate in both monthly and annual views.
  const promoStrikePrice = displayPrice;

  return (
    <div
      className={`relative rounded-2xl p-5 sm:p-6 border bg-white flex flex-col min-h-[480px] ${
        tier.featured
          ? 'border-violet-300 shadow-lg'
          : 'border-[#E8E4DF]'
      }`}
      style={tier.featured ? { background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)' } : undefined}
    >
      {/* Featured badge */}
      {tier.promoBadge && (
        <span className="absolute top-4 right-4 text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-full uppercase tracking-wider">
          {tier.promoBadge}
        </span>
      )}

      {/* Name + tagline */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-[#1B2733] mb-1">{tier.name}</h2>
        <p className="text-xs text-[#5A6B7A] leading-snug">{tier.tagline}</p>
      </div>

      {/* Price */}
      <div className="mb-4">
        {hasPromo && tier.promoFromMonthly ? (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-slate-300 line-through">${promoStrikePrice % 1 === 0 ? promoStrikePrice : promoStrikePrice.toFixed(2)}</span>
            <span className="text-4xl sm:text-5xl font-bold text-[#1B2733]">$0</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl text-[#1B2733] font-medium">$</span>
            <span className="text-4xl sm:text-5xl font-bold text-[#1B2733]">
              {displayPrice === 0 ? '0' : displayPrice.toFixed(displayPrice % 1 === 0 ? 0 : 2)}
            </span>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-1">
          {hasPromo
            ? billing === 'annual'
              ? 'free to start, then billed annually'
              : 'free to start, then per month'
            : displayPrice === 0
              ? 'USD / month'
              : tier.id === 'org'
                ? billing === 'annual'
                  ? 'USD / clinician / month, billed annually'
                  : 'USD / clinician / month'
                : billing === 'annual'
                  ? 'USD / month, billed annually'
                  : 'USD / month'}
        </p>
      </div>

      {/* CTA button */}
      <button
        onClick={onSelect}
        disabled={loading || tier.ctaDisabled || tier.ctaCurrent}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all mb-5 flex items-center justify-center gap-1.5 ${
          tier.ctaCurrent
            ? 'bg-white border-2 border-[#E8E4DF] text-slate-400 cursor-default'
            : tier.featured
              ? 'text-white shadow-md hover:shadow-lg'
              : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
        style={tier.featured && !tier.ctaCurrent ? { background: 'linear-gradient(135deg, #7c3aed 0%, #43AA8B 100%)' } : undefined}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
          {tier.cta}
          {!tier.ctaCurrent && <ArrowRight className="w-4 h-4" />}
        </>}
      </button>

      {/* Features */}
      {tier.features_heading && (
        <p className="text-xs font-semibold text-[#1B2733] mb-2">{tier.features_heading}</p>
      )}
      <ul className="space-y-2 flex-1">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#3A4A57]">
            <span className="mt-1">{f.icon}</span>
            <span className="leading-snug">{f.text}</span>
          </li>
        ))}
      </ul>

      {/* Promo footer */}
      {tier.promoFooter && (
        <p className="text-[11px] text-[#5A6B7A] mt-5 pt-3 border-t border-[#E8E4DF] leading-relaxed">
          <span className="font-medium underline underline-offset-2">Promo terms apply.</span> {tier.promoFooter}
        </p>
      )}
    </div>
  );
}

export default PricingTiers;
