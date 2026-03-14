/**
 * PaywallSimplified - Premium, Clean Pricing
 *
 * Simplified tier structure (prices from tier-utils.ts):
 * - Free: Basic AI access (5/day), limited features
 * - Core: Unlimited AI, full features, 10% off sessions
 * - Pro: Everything + 20% off sessions, custom plans, priority support
 * - Pro+ / Family Plan: Everything + 30% off, unlimited children, advanced analytics
 *
 * Telehealth session pricing (from pricing.ts):
 * - BCBA Consult (60 min): $149 base
 * - Free: Full price ($149)
 * - Core: 10% off ($134)
 * - Pro: 20% off ($119)
 * - Pro+: 30% off ($104)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crown,
  Check,
  Sparkles,
  Heart,
  Shield,
  MessageSquare,
  Brain,
  Users,
  Star,
  ChevronDown,
  X,
  Gift,
  CreditCard,
  Minus,
  TrendingUp,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { DataProvenanceBadge } from './ui/DataProvenanceBadge';
import { toast } from 'sonner';
import { TierType, tierPricing } from '../lib/tier-utils';
import { createDataProvenance, type DataProvenance } from '../lib/product-truth';
import { createCheckoutSession, isStripeConfigured, STRIPE_PRICES } from '../lib/stripe-service';
import { supabase } from '../utils/supabase/client';
import { billingEngine } from '../lib/billing-engine';

// ── Social Proof Data ─────────────────────────────────────────────────
// Structured for future Supabase pull — these are placeholder initial values.
// Replace with a real-time query to `social_proof_counters` table when available.

interface SocialProofData {
  familyCount: number;
  averageRating: number;
  reviewCount: number;
}

interface SocialProofState {
  data: SocialProofData | null;
  provenance: DataProvenance;
}

const VERIFIED_SOCIAL_PROOF_PENDING = createDataProvenance(
  'live',
  'Verified family metrics pending',
  { isVerified: false },
);

function useSocialProof(): SocialProofState {
  const [state, setState] = useState<SocialProofState>({
    data: null,
    provenance: VERIFIED_SOCIAL_PROOF_PENDING,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: row } = await supabase
          .from('social_proof_counters')
          .select('family_count, average_rating, review_count, recent_signup_label, recent_signup_minutes_ago')
          .eq('id', 'global')
          .maybeSingle();

        if (!cancelled && row?.family_count && row?.average_rating && row?.review_count) {
          setState({
            data: {
              familyCount: row.family_count,
              averageRating: row.average_rating,
              reviewCount: row.review_count,
            },
            provenance: createDataProvenance('live', 'Verified live member metrics', {
              isVerified: true,
              lastUpdatedAt: new Date().toISOString(),
            }),
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            data: null,
            provenance: VERIFIED_SOCIAL_PROOF_PENDING,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// Simplified tier features for comparison
const TIER_FEATURES = [
  { name: 'AI Conversations', free: '5/day', core: 'Unlimited', pro: 'Unlimited', proplus: 'Unlimited' },
  { name: 'Memory & Context', free: '7 days', core: 'Full history', pro: 'Full history', proplus: 'Full history' },
  { name: 'Daily Strategies', free: false, core: true, pro: true, proplus: true },
  { name: 'Behavior Tracking', free: 'Basic', core: 'Advanced', pro: 'Advanced', proplus: 'Advanced' },
  { name: 'Sleep & Routine Insights', free: false, core: true, pro: true, proplus: true },
  { name: 'Document Vault', free: false, core: '50 docs', pro: 'Unlimited', proplus: 'Unlimited' },
  { name: 'Weekly AI Summary', free: false, core: true, pro: true, proplus: true },
  { name: 'Telehealth Discount', free: 'Full price', core: '10% off', pro: '20% off', proplus: '30% off' },
  { name: 'Children Supported', free: '1', core: 'Up to 2', pro: 'Up to 3', proplus: 'Unlimited' },
  { name: 'Custom Intervention Plans', free: false, core: false, pro: true, proplus: true },
  { name: 'Priority Support', free: false, core: false, pro: true, proplus: true },
  { name: 'Advanced Analytics', free: false, core: false, pro: false, proplus: true },
];

interface PaywallSimplifiedProps {
  onSubscribe: (tier: TierType) => void;
  onClose?: () => void;
  childName?: string;
  conversationsHad?: number;
}

export function PaywallSimplified({
  onSubscribe,
  onClose,
  childName = 'your child',
  conversationsHad = 0,
}: PaywallSimplifiedProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; type: 'percent' | 'fixed'; description: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const socialProof = useSocialProof();

  // Pricing — derived from tier-utils.ts (single source of truth)
  const coreMonthly = tierPricing.core.monthly;
  const coreYearly = tierPricing.core.yearly;
  const proMonthly = tierPricing.pro.monthly;
  const proYearly = tierPricing.pro.yearly;
  const proplusMonthly = tierPricing.proplus.monthly;
  const proplusYearly = tierPricing.proplus.yearly;

  const corePrice = billingPeriod === 'monthly' ? coreMonthly : coreYearly;
  const corePerMonth = billingPeriod === 'yearly' ? (coreYearly / 12).toFixed(2) : coreMonthly.toFixed(2);
  const proPerMonth = billingPeriod === 'yearly' ? (proYearly / 12).toFixed(2) : proMonthly.toFixed(2);
  const proplusPerMonth = billingPeriod === 'yearly' ? (proplusYearly / 12).toFixed(2) : proplusMonthly.toFixed(2);

  // Calculate discounted price
  const calculateDiscount = useCallback((baseAmount: number): number => {
    if (!appliedPromo) return baseAmount;
    if (appliedPromo.type === 'percent') {
      return baseAmount * (1 - appliedPromo.discount / 100);
    }
    return Math.max(0, baseAmount - appliedPromo.discount);
  }, [appliedPromo]);

  const finalCorePrice = calculateDiscount(corePrice);
  const finalCorePerMonth = billingPeriod === 'yearly'
    ? (calculateDiscount(coreYearly) / 12).toFixed(2)
    : calculateDiscount(coreMonthly).toFixed(2);

  // Promo code handling
  const handleApplyPromo = useCallback(async () => {
    const upperCode = promoCode.toUpperCase().trim();
    setPromoError('');

    if (!upperCode) {
      setPromoError('Please enter a promo code');
      return;
    }

    setIsValidatingPromo(true);
    try {
      const result = await billingEngine.validatePromoCode(upperCode, 'core');

      const promo = result.promoCode;
      if (result.valid && promo) {
        const discount = promo.discountPercent ?? promo.discountAmount ?? 0;
        const discountType = promo.discountPercent ? 'percent' : 'fixed';
        const description = discountType === 'percent' ? `${discount}% off` : `$${discount} off`;
        setAppliedPromo({
          code: upperCode,
          discount,
          type: discountType,
          description,
        });
        toast.success(`Promo code applied: ${description}`);
      } else {
        setPromoError(result.error || 'Invalid promo code');
      }
    } catch (error) {
      setPromoError('Unable to validate code. Please try again.');
    } finally {
      setIsValidatingPromo(false);
    }
  }, [promoCode]);

  const tierDisplayName = (tier: string) => {
    if (tier === 'proplus') return 'Family Plan';
    if (tier === 'pro') return 'Pro';
    return 'Core';
  };

  const handleSubscribe = async (tier: 'core' | 'pro' | 'proplus') => {
    setIsLoading(true);

    try {
      // Try to get user, but don't require it for demo/development
      let user = null;
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (authError) {
        console.warn('Auth check skipped:', authError);
      }

      // Only try Stripe if we have a user AND Stripe is properly configured
      if (user && isStripeConfigured()) {
        // Map billing period to the STRIPE_PRICES key suffix
        const interval = billingPeriod === 'monthly' ? 'monthly' : 'annual';
        const priceKey = `${tier}_${interval}` as keyof typeof STRIPE_PRICES;
        const priceId = STRIPE_PRICES[priceKey];

        if (!priceId) {
          toast.error(
            `Payment not available: ${tierDisplayName(tier)} ${billingPeriod} price is not configured. Please contact support.`
          );
          setIsLoading(false);
          return;
        }

        try {
          const session = await createCheckoutSession({
            userId: user.id,
            email: user.email || '',
            tier: tier as TierType,
            interval: interval as 'monthly' | 'annual',
            successUrl: `${window.location.origin}/?screen=dashboard&payment=success`,
            cancelUrl: `${window.location.origin}/?screen=paywall&payment=cancelled`,
          });

          if (session?.url) {
            window.location.href = session.url;
            return;
          }
        } catch (stripeError: unknown) {
          console.warn('Stripe checkout error:', stripeError);
          toast.error(stripeError instanceof Error ? stripeError.message : 'Payment system unavailable. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // Default: local subscription (demo mode or Stripe not configured)
      if (!isStripeConfigured() && import.meta.env.DEV) {
        console.info('[Paywall] Stripe not configured — using demo mode');
      }
      onSubscribe(tier);
      toast.success(`Welcome to Aminy ${tierDisplayName(tier)}! Your 7-day trial has started.`);
    } catch (error) {
      console.error('Subscription error:', error);
      // Still proceed with local subscription on any error
      onSubscribe(tier);
      toast.success(`Welcome to Aminy ${tierDisplayName(tier)}!`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col">
      {/* Header */}
      {onClose && (
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close pricing and return to dashboard"
            title="Close pricing and return to dashboard"
            data-testid="close-paywall"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 py-6 bg-[radial-gradient(circle_at_top,_rgba(153,246,228,0.16),_transparent_40%),linear-gradient(180deg,_#f9fcfb_0%,_#ffffff_42%,_#f8fafc_100%)]">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">
            Calm support, without guessing
          </p>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            Continue Supporting {childName}
          </h1>
          <h2 className="sr-only">Membership overview</h2>
          <h3 className="sr-only">Plans, savings, and caregiver support options</h3>

          <p className="mx-auto max-w-md text-sm text-gray-600 sm:text-base">
            Keep Aminy as your calmer daily layer for guidance, routines, telehealth savings, and provider-ready summaries.
          </p>
        </motion.div>

        {/* Truth-forward trust note */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full max-w-md mb-6"
        >
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
              <DataProvenanceBadge provenance={socialProof.provenance} />
              <div className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                <TrendingUp className="h-3.5 w-3.5" />
                Built for caregiver support between sessions
              </div>
            </div>
            {socialProof.data ? (
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-gray-900">
                    {socialProof.data.familyCount.toLocaleString()}+
                  </span>
                  <span>verified families</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-gray-900">{socialProof.data.averageRating}</span>
                  <span>({socialProof.data.reviewCount} reviews)</span>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-600">
                We only show community proof after it comes from verified live data. Pricing and plan details below reflect the product available today.
              </p>
            )}
          </div>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex items-center bg-white rounded-full p-1 shadow-sm border border-gray-200 mb-6">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
              billingPeriod === 'yearly'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="text-xs text-emerald-500 font-semibold">Save 28%</span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="w-full max-w-4xl grid md:grid-cols-3 gap-4 mb-6">
          {/* Core Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex"
          >
            <Card className="relative overflow-hidden border-2 border-teal-500 bg-white flex flex-col w-full">
              <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                MOST POPULAR
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Core</h3>

                {/* HSA/FSA Badge */}
                <div className="flex items-center gap-1.5 mb-3">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-600">HSA/FSA Eligible</span>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    {appliedPromo && (
                      <span className="text-lg text-gray-400 line-through mr-1">
                        ${corePerMonth}
                      </span>
                    )}
                    <span className="text-3xl font-bold text-gray-900">
                      ${finalCorePerMonth}
                    </span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                  <p className="text-teal-600 text-sm font-medium mt-1">
                    7-day free trial included
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4 text-sm">
                  {[
                    'Unlimited AI conversations',
                    'Full memory of your journey',
                    'Personalized daily strategies',
                    'Sleep & behavior insights',
                    '10% off provider telehealth',
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-gray-700">
                      <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <Button
                    onClick={() => handleSubscribe('core')}
                    disabled={isLoading}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 rounded-xl shadow-sm"
                  >
                    Start Free Trial
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-2">
                    No credit card required • Cancel anytime
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex"
          >
            <Card className="relative overflow-hidden border border-gray-200 bg-white flex flex-col w-full">
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Pro</h3>

                <div className="flex items-center gap-1.5 mb-3">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-600">HSA/FSA Eligible</span>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">
                      ${proPerMonth}
                    </span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                  <p className="text-teal-600 text-sm font-medium mt-1">
                    7-day free trial included
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4 text-sm">
                  {[
                    'Everything in Core',
                    '20% off provider telehealth',
                    'Custom intervention plans',
                    'Priority support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-gray-700">
                      <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <Button
                    onClick={() => handleSubscribe('pro')}
                    disabled={isLoading}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 rounded-xl shadow-sm"
                  >
                    Start Free Trial
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-2">
                    No credit card required • Cancel anytime
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Pro+ / Family Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex"
          >
            <Card className="relative overflow-hidden border-2 border-violet-500 bg-white flex flex-col w-full">
              <div className="absolute top-0 right-0 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                BEST VALUE
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Family Plan</h3>

                <div className="flex items-center gap-1.5 mb-3">
                  <Users className="w-3.5 h-3.5 text-violet-600" />
                  <span className="text-xs font-medium text-violet-600">Unlimited Children</span>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">
                      ${proplusPerMonth}
                    </span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                  <p className="text-teal-600 text-sm font-medium mt-1">
                    7-day free trial included
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4 text-sm">
                  {[
                    'Everything in Pro',
                    '30% off provider telehealth',
                    'Unlimited children',
                    'Advanced analytics',
                    'Dedicated support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-gray-700">
                      <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <Button
                    onClick={() => handleSubscribe('proplus')}
                    disabled={isLoading}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 rounded-xl shadow-sm"
                  >
                    Start Free Trial
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-2">
                    No credit card required • Cancel anytime
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Telehealth context note */}
        <p className="text-xs text-gray-400 text-center max-w-lg mx-auto mb-4">
          All plans include access to our provider marketplace — book telehealth sessions with BCBAs, RBTs, therapists, and more. Higher tiers save more per session.
        </p>

        {/* Accepted Payment Methods */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M17.05 10.917c-.054-3.478 2.858-5.158 2.988-5.234-1.629-2.374-4.166-2.7-5.067-2.738-2.148-.22-4.208 1.264-5.302 1.264-1.1 0-2.79-1.234-4.59-1.2C2.876 3.044.872 4.417.872 7.723c0 3.117 1.75 7.42 3.15 9.08 1.39 1.65 3.053 1.55 3.79 1.55.737 0 2.137-1 4.037-1s2.95.95 3.95.95 2.4-.55 3.5-2.15c-.05-.05-2.25-1.35-2.25-4.236z" fill="currentColor"/>
              <path d="M14.5 2.05c.93-1.15 1.55-2.7 1.38-4.3-1.34.05-3 .9-3.95 2.05-.85 1-1.6 2.6-1.4 4.1 1.5.1 3.05-.75 3.97-1.85z" fill="currentColor" transform="translate(0, 2)"/>
            </svg>
            <span className="text-xs font-semibold text-gray-700">Apple Pay</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="url(#gp1)"/>
              <path d="M12 11v2.4h3.97c-.16 1.03-1.2 3.02-3.97 3.02-2.39 0-4.34-1.98-4.34-4.42S9.61 7.58 12 7.58c1.36 0 2.27.58 2.79 1.08l1.9-1.83C15.47 5.69 13.89 5 12 5 8.13 5 5 8.13 5 12s3.13 7 7 7c4.04 0 6.72-2.84 6.72-6.84 0-.46-.05-.81-.11-1.16H12z" fill="white"/>
              <defs>
                <radialGradient id="gp1" cx="12" cy="12" r="10" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4285F4"/>
                  <stop offset="1" stopColor="#34A853"/>
                </radialGradient>
              </defs>
            </svg>
            <span className="text-xs font-semibold text-gray-700">Google Pay</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
            <CreditCard className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-xs font-semibold text-gray-700">Cards</span>
          </div>
        </div>

        {/* 7-Day Free Trial of Core */}
        <div className="w-full max-w-sm mb-6 text-center">
          <button
            onClick={() => {
              onSubscribe('core' as TierType);
              toast.success('Welcome to Aminy! Your 7-day free trial of Core has started.');
            }}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2 transition-colors"
          >
            Start 7-day free trial of Core — no credit card required
          </button>
          <p className="text-xs text-gray-400 mt-1">Full Core access for 7 days, then ${tierPricing.core.monthly}/mo</p>
        </div>

        {/* Promo Code */}
        <div className="w-full max-w-sm mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoError('');
                }}
                placeholder="Promo code"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <Button
              onClick={handleApplyPromo}
              disabled={isValidatingPromo || !promoCode.trim()}
              variant="outline"
              className="px-4 rounded-xl"
            >
              {isValidatingPromo ? '...' : 'Apply'}
            </Button>
          </div>
          {promoError && (
            <p className="text-red-500 text-xs mt-1">{promoError}</p>
          )}
          {appliedPromo && (
            <p className="text-emerald-600 text-xs mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" />
              {appliedPromo.description} applied!
            </p>
          )}
        </div>

        {/* Compare Plans */}
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <span className="text-sm">Compare all plans</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showComparison ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showComparison && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-4xl mb-6 overflow-hidden"
            >
              <Card className="p-4 bg-white border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-gray-600 font-medium">Feature</th>
                      <th className="text-center py-2 px-2 text-gray-600 font-medium">Free</th>
                      <th className="text-center py-2 px-2 text-teal-600 font-bold">Core<br /><span className="text-xs font-normal">${tierPricing.core.monthly}/mo</span></th>
                      <th className="text-center py-2 px-2 text-violet-600 font-bold">Pro<br /><span className="text-xs font-normal">${tierPricing.pro.monthly}/mo</span></th>
                      <th className="text-center py-2 px-2 text-violet-600 font-bold">Family<br /><span className="text-xs font-normal">${tierPricing.proplus.monthly}/mo</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {TIER_FEATURES.map((feature, index) => (
                      <tr key={feature.name} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-2 px-2 text-gray-700">{feature.name}</td>
                        {['free', 'core', 'pro', 'proplus'].map((tier) => {
                          const value = feature[tier as keyof typeof feature];
                          return (
                            <td key={tier} className={`text-center py-2 px-2 ${tier === 'core' ? 'bg-teal-50/50' : tier === 'proplus' ? 'bg-violet-50/50' : ''}`}>
                              {value === true ? (
                                <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                              ) : value === false ? (
                                <Minus className="w-4 h-4 text-gray-300 mx-auto" />
                              ) : (
                                <span className="text-xs text-gray-600">{value}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Truth-forward trust badges */}
        <div className="flex items-center justify-center gap-4 text-gray-400 mb-4">
          <div className="flex items-center gap-1 text-xs">
            <Shield className="w-4 h-4" />
            <span>Secure account access</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Sparkles className="w-4 h-4" />
            <span>AI coaching + daily plans</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Heart className="w-4 h-4" />
            <span>BCBA-informed guidance</span>
          </div>
        </div>

        {/* Product truth block */}
        <div className="w-full max-w-md bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center mb-3">
            What is live today
          </p>
          <div className="grid grid-cols-1 gap-3 text-sm text-gray-600">
            <div>
              <p className="font-semibold text-gray-900">Onboarding + child profile</p>
              <p>Start with your child’s needs, concerns, and daily context.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">AI guidance + daily plans</p>
              <p>Use Aminy for day-to-day caregiver coaching and structured support.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Junior + summaries</p>
              <p>Track child activities and generate provider-ready recap materials on paid tiers.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-gray-500 border-t border-gray-200 bg-white">
        <p>Questions? Email us at <a href="mailto:support@aminy.ai" className="text-teal-600 hover:underline">support@aminy.ai</a></p>
        <p className="mt-1">
          Aminy™ is not a replacement for professional medical advice.
        </p>
      </div>
    </div>
  );
}

export default PaywallSimplified;
