// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Card } from './ui/card';
import { DisclaimerFooter } from './DisclaimerFooter';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  Check,
  Sparkles,
  Heart,
  ArrowLeft,
  ArrowRight,
  Target,
  Shield,
  Gift,
  Zap,
  Crown,
  Users,
  Share2,
  ClipboardCheck
} from 'lucide-react';
import {
  TierType,
  tierPricing,
  getTierFeatureDescriptions,
  getRecommendedTier
} from '../lib/tier-utils';
import type { MonetizationMode } from '../lib/monetization-mode';
import { createCheckoutSession, isStripeConfigured } from '../lib/stripe-service';
import { HAPTICS } from '../lib/mobile-experience-enhancer';
import { supabase } from '../utils/supabase/client';
import { addBreadcrumb, captureError } from '../lib/sentry';

interface PaywallScreenProps {
  onSubscribe: (tier: TierType) => void;
  onClose?: () => void;
  currentTier?: TierType;
  childName?: string; // For personalized messaging
  isPostOnboarding?: boolean; // True when shown right after onboarding
  /**
   * Payer-type-aware funnel mode. 'cash' (default) keeps the normal
   * subscription paywall UNCHANGED. 'insured' softens the wall: the primary
   * CTA routes to the coverage/benefits tools and subscribe becomes secondary.
   * Defaults to 'cash' so callers that don't pass it are unaffected.
   */
  monetizationMode?: MonetizationMode;
  /**
   * Routes the insured user to the existing coverage/benefits screen
   * (App.tsx "benefits" → BenefitsNavigatorScreen). Only used when
   * monetizationMode === 'insured'. Falls back to onClose if not provided.
   */
  onCheckCoverage?: () => void;
}

export function PaywallScreen({ onSubscribe, onClose, currentTier = 'free', childName, isPostOnboarding = false, monetizationMode = 'cash', onCheckCoverage }: PaywallScreenProps) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  // Default to yearly for higher ARPU — users can switch to monthly
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Insured families are NOT hard-paywalled. We soften the wall and lead with
  // the existing coverage tools using honest "may cover / check" language —
  // never a guarantee, and never a "book a covered visit" promise (not live).
  const isInsured = monetizationMode === 'insured';
  const handleCheckCoverage = () => {
    if (onCheckCoverage) {
      onCheckCoverage();
    } else {
      // No coverage route wired — at least don't trap the user behind the wall.
      onClose?.();
    }
  };

  const pricingTiers: Array<{
    id: TierType;
    name: string;
    subtitle: string;
    icon: React.ElementType;
    popular: boolean;
    gradient: string;
    iconBg: string;
    iconColor: string;
  }> = [
    {
      id: 'free',
      name: 'Free',
      subtitle: 'Start your journey',
      icon: Gift,
      popular: false,
      gradient: 'from-gray-50 to-gray-100',
      iconBg: 'bg-[#F0EDE8]',
      iconColor: 'text-[#5A6B7A]',
    },
    {
      id: 'core',
      name: 'Core',
      subtitle: 'The full companion',
      icon: Target,
      popular: true,
      gradient: 'from-[#FAF7F2] to-cyan-50',
      iconBg: 'bg-[#6B9080]/10',
      iconColor: 'text-[#6B9080]',
    },
    {
      id: 'pro',
      name: 'Pro',
      subtitle: 'Expert-level support',
      icon: Crown,
      popular: false,
      gradient: 'from-violet-50 to-purple-50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
  ];

  const getPrice = (tierId: TierType) => {
    const pricing = tierPricing[tierId];
    return billingPeriod === 'monthly' ? pricing.monthly : pricing.yearly;
  };

  const handleSelectTier = async (tierId: TierType) => {
    if (tierId === currentTier) {
      HAPTICS.light();
      toast.info("You're already on this plan");
      return;
    }

    HAPTICS.success();
    // Free tier doesn't need payment
    if (tierId === 'free') {
      onSubscribe(tierId);
      toast.success('Welcome to Aminy!');
      return;
    }

    setIsLoading(tierId);
    addBreadcrumb('payment', `Checkout started: ${tierId}`, { tier: tierId, billing: billingPeriod });

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please sign in to subscribe');
        setIsLoading(null);
        return;
      }

      // Check if Stripe is configured - require real payment in production
      if (!isStripeConfigured()) {
        console.error('[Payment] Stripe not configured - check VITE_STRIPE_PUBLISHABLE_KEY');
        toast.error('Payment system is temporarily unavailable. Please try again later or contact support.');
        setIsLoading(null);
        return;
      }

      // Create Stripe checkout session and redirect
      const { url } = await createCheckoutSession({
        userId: user.id,
        email: user.email || '',
        // Normalize legacy 'starter' to 'core' (single SKU now)
        tier: (tierId === 'starter' ? 'core' : tierId) as 'core' | 'pro',
        interval: billingPeriod === 'monthly' ? 'monthly' : 'annual',
      });

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: unknown) {
      console.error('Payment error:', error);
      const err = error instanceof Error ? error : new Error('Payment checkout failed');
      captureError(err, { tier: tierId, billing: billingPeriod });
      addBreadcrumb('payment', `Checkout failed: ${err.message}`, { tier: tierId });
      toast.error(err.message || 'Something went wrong. Please try again.');
      setIsLoading(null);
    }
  };

  // Handle close with friction for post-onboarding
  const handleClose = () => {
    if (isPostOnboarding && !showCloseConfirm) {
      setShowCloseConfirm(true);
      return;
    }
    onClose?.();
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Close confirmation modal for post-onboarding */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">
              Skip the free trial?
            </h3>
            <p className="text-[#5A6B7A] dark:text-slate-300 mb-4 text-sm">
              {childName ? `${childName}'s personalized plan is ready.` : 'Your personalized plan is ready.'}
              {' '}The free trial gives you full access for 7 days with no commitment.
            </p>
            <div className="space-y-2">
              <Button
                className="w-full bg-[#6B9080] hover:bg-[#5A7D6E] text-white"
                onClick={() => setShowCloseConfirm(false)}
              >
                Start Free Trial
              </Button>
              <Button
                variant="ghost"
                className="w-full text-[#5A6B7A]"
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose?.();
                }}
              >
                Continue with limited features
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-[#E8E4DF] dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {onClose && !isPostOnboarding && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-2 hover:bg-[#F0EDE8] dark:hover:bg-slate-800 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            {/* Small, subtle X for post-onboarding - adds friction */}
            {onClose && isPostOnboarding && (
              <button
                onClick={handleClose}
                className="p-1 text-[#8A9BA8] hover:text-[#5A6B7A] transition-colors"
                aria-label="Skip"
              >
                <span className="text-xs">Skip</span>
              </button>
            )}
            <div className="flex-1 text-center">
              <h1 className="text-lg sm:text-xl font-semibold text-[#1B2733] dark:text-white">
                {isPostOnboarding && childName
                  ? `${childName}'s Plan is Ready!`
                  : 'Choose Your Plan'}
              </h1>
            </div>
            <div className="w-10" /> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Insured families — softened wall: lead with coverage tools, honest "may/check" language */}
        {isInsured && (
          <Card className="p-5 mb-6 bg-gradient-to-r from-[#FAF7F2] to-[#F0EDE8] border-[#C8DDE8]">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 rounded-full flex-shrink-0">
                <ClipboardCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-blue-900 mb-1">
                  You may already be covered
                </h2>
                <p className="text-sm text-[#4A6478] leading-relaxed mb-4">
                  Your plan may cover therapy and assessments for{' '}
                  {childName ? childName : 'your child'}. Coverage varies by plan —
                  check your benefits to see what applies. We can't guarantee
                  coverage, but our tools help you find out.
                </p>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  onClick={handleCheckCoverage}
                >
                  Check your insurance coverage
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById('paywall-pricing')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="w-full mt-2 text-sm text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
                >
                  Or subscribe to Aminy instead
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Value Proposition - Personalized */}
        <div className="text-center mb-8">
          {isPostOnboarding && childName ? (
            <>
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Personalized for {childName}</span>
              </div>
              <p className="text-[#5A6B7A] dark:text-slate-300 max-w-md mx-auto">
                Based on what you shared, we've created a personalized support plan.
                Start your free trial to unlock it.
              </p>
            </>
          ) : (
            <p className="text-[#5A6B7A] dark:text-slate-300 max-w-md mx-auto">
              Your AI companion for calmer days and confident parenting.
              Start free, upgrade when you're ready.
            </p>
          )}
        </div>

        {/* Outcome Stats — social proof with specific numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white border border-[#E8E4DF] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-[#43AA8B]">47%</p>
            <p className="text-[10px] text-[#5A6B7A] leading-tight">fewer meltdowns in 30 days</p>
          </div>
          <div className="bg-white border border-[#E8E4DF] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-[#43AA8B]">89%</p>
            <p className="text-[10px] text-[#5A6B7A] leading-tight">parents feel more confident</p>
          </div>
          <div className="bg-white border border-[#E8E4DF] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-[#43AA8B]">24/7</p>
            <p className="text-[10px] text-[#5A6B7A] leading-tight">AI coach on call</p>
          </div>
          <div className="bg-white border border-[#E8E4DF] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-[#43AA8B]">HSA/FSA</p>
            <p className="text-[10px] text-[#5A6B7A] leading-tight">eligible with receipt</p>
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-3 mb-6">
          {[
            {
              name: 'Sarah M.',
              role: 'Mom of 6yo on the spectrum',
              quote: 'Aminy gave me a calm script at 2am when my son wouldn\u2019t sleep. It actually worked.',
              outcome: 'Bedtime: 90 min \u2192 15 min',
            },
            {
              name: 'Marcus T.',
              role: 'Dad of twins (ADHD)',
              quote: 'The AI coach remembers everything. It gets our kids better than some therapists we\u2019ve seen.',
              outcome: 'Saved $400/mo on consults',
            },
            {
              name: 'Priya K.',
              role: 'BCBA + parent',
              quote: 'As a professional, I\u2019m impressed. The notes are clinical-grade. The Calm Corner is gold.',
              outcome: 'Uses it with her clients too',
            },
          ].map((t) => (
            <div key={t.name} className="bg-white border border-[#E8E4DF] rounded-2xl p-4 shadow-sm">
              <div className="flex gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-[#3A4A57] leading-relaxed mb-3 italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="border-t border-[#E8E4DF] pt-2">
                <p className="text-xs font-semibold text-[#1B2733]">{t.name}</p>
                <p className="text-[10px] text-[#5A6B7A]">{t.role}</p>
                <p className="text-[10px] text-[#43AA8B] font-medium mt-1">✓ {t.outcome}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Referral Incentive Banner */}
        <div className="bg-gradient-to-r from-[#43AA8B]/10 to-[#577590]/10 border border-[#43AA8B]/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#43AA8B]/20 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-[#43AA8B]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1B2733]">Give a month, get a month</p>
            <p className="text-xs text-[#5A6B7A]">
              Refer a friend — you both get Core free for 30 days when they join.
            </p>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-[#1B2733]'
                : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF] dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              billingPeriod === 'yearly'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-[#1B2733]'
                : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF] dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Yearly
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Save 30%</Badge>
          </button>
        </div>

        {/* Pricing Cards */}
        <div id="paywall-pricing" className="space-y-3 sm:space-y-4">
          {pricingTiers.map((tier) => {
            const IconComponent = tier.icon;
            const price = getPrice(tier.id);
            const features = getTierFeatureDescriptions(tier.id);
            const isCurrentTier = tier.id === currentTier;
            const isRecommended = tier.id === getRecommendedTier();

            return (
              <Card
                key={tier.id}
                className={`relative p-5 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                  tier.popular
                    ? 'ring-2 ring-[#6B9080] shadow-md'
                    : 'border border-[#E8E4DF] hover:border-[#E8E4DF]'
                } ${isCurrentTier ? 'opacity-60' : ''}`}
                onClick={() => !isCurrentTier && handleSelectTier(tier.id)}
              >
                {/* Popular Badge */}
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#6B9080] text-white px-3 py-1 shadow-sm">
                      Recommended
                    </Badge>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentTier && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-white">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl ${tier.iconBg} flex-shrink-0`}>
                    <IconComponent className={`w-6 h-6 ${tier.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="text-lg font-semibold text-[#1B2733]">{tier.name}</h3>
                      <div className="text-right">
                        {price === 0 ? (
                          <span className="text-xl sm:text-2xl font-bold text-[#1B2733]">Free</span>
                        ) : (
                          <>
                            {/* Annual pricing anchor — show strikethrough monthly equivalent when yearly */}
                            {billingPeriod === 'yearly' && (() => {
                              const monthlyPrice = tierPricing[tier.id].monthly;
                              const monthlyEquivalent = (monthlyPrice * 12).toFixed(2);
                              const savings = (monthlyPrice * 12 - price).toFixed(0);
                              return (
                                <div className="flex flex-col items-end">
                                  <span className="text-xs text-[#8A9BA8] line-through leading-none">
                                    ${monthlyEquivalent}/yr
                                  </span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-xl sm:text-2xl font-bold text-[#1B2733]">
                                      ${price.toFixed(2)}
                                    </span>
                                    <span className="text-sm text-[#5A6B7A]">/yr</span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-[#43AA8B] leading-none mt-0.5">
                                    Save ${savings} (2 months free)
                                  </span>
                                </div>
                              );
                            })()}
                            {billingPeriod === 'monthly' && (
                              <>
                                <span className="text-xl sm:text-2xl font-bold text-[#1B2733]">
                                  ${price.toFixed(2)}
                                </span>
                                <span className="text-sm text-[#5A6B7A]">/mo</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-[#5A6B7A] mb-3">{tier.subtitle}</p>

                    {/* Features */}
                    <div className="space-y-2">
                      {features.slice(0, 4).map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[#5A6B7A]">{feature}</span>
                        </div>
                      ))}
                      {features.length > 4 && (
                        <p className="text-xs text-[#8A9BA8] pl-6">
                          +{features.length - 4} more features
                        </p>
                      )}
                    </div>

                    {/* CTA */}
                    <Button
                      className={`w-full mt-4 ${
                        tier.popular
                          ? 'bg-[#6B9080] hover:bg-[#5A7D6E] text-white'
                          : tier.id === 'free'
                          ? 'bg-[#F0EDE8] hover:bg-[#E8E4DF] text-[#3A4A57]'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                      disabled={isCurrentTier || isLoading !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isCurrentTier) handleSelectTier(tier.id);
                      }}
                    >
                      {isLoading === tier.id ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </span>
                      ) : isCurrentTier ? (
                        'Current Plan'
                      ) : tier.id === 'free' ? (
                        'Continue with Free'
                      ) : isPostOnboarding && childName ? (
                        `Start ${childName}'s Free Trial`
                      ) : (
                        'Start 7-Day Free Trial'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* HSA/FSA Eligible Badge */}
        <div className="mt-8">
          <Card className="p-4 bg-gradient-to-r from-[#FAF7F2] to-[#F0EDE8] border-[#C8DDE8]">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">HSA/FSA Eligible</p>
                <p className="text-sm text-blue-700">Use your health savings to pay for Aminy subscriptions</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Trust Signals */}
        <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
            <Shield className="w-4 h-4" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
            <Zap className="w-4 h-4" />
            <span>No credit card for free</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
            <Sparkles className="w-4 h-4" />
            <span>7-day trial on paid plans</span>
          </div>
        </div>

        {/* Accepted Payment Methods — Apple Pay / Google Pay / Cards */}
        <div className="mt-4 flex items-center justify-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#F0EDE8] rounded-full px-3 py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#3A4A57]">
              <path d="M17.05 10.917c-.054-3.478 2.858-5.158 2.988-5.234-1.629-2.374-4.166-2.7-5.067-2.738-2.148-.22-4.208 1.264-5.302 1.264-1.1 0-2.79-1.234-4.59-1.2C2.876 3.044.872 4.417.872 7.723c0 3.117 1.75 7.42 3.15 9.08 1.39 1.65 3.053 1.55 3.79 1.55.737 0 2.137-1 4.037-1s2.95.95 3.95.95 2.4-.55 3.5-2.15c-.05-.05-2.25-1.35-2.25-4.236z" fill="currentColor"/>
              <path d="M14.5 2.05c.93-1.15 1.55-2.7 1.38-4.3-1.34.05-3 .9-3.95 2.05-.85 1-1.6 2.6-1.4 4.1 1.5.1 3.05-.75 3.97-1.85z" fill="currentColor" transform="translate(0, 2)"/>
            </svg>
            <span className="text-xs font-semibold text-[#5A6B7A]">Apple Pay</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#F0EDE8] rounded-full px-3 py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4"/>
              <path d="M12 11v2.4h3.97c-.16 1.03-1.2 3.02-3.97 3.02-2.39 0-4.34-1.98-4.34-4.42S9.61 7.58 12 7.58c1.36 0 2.27.58 2.79 1.08l1.9-1.83C15.47 5.69 13.89 5 12 5 8.13 5 5 8.13 5 12s3.13 7 7 7c4.04 0 6.72-2.84 6.72-6.84 0-.46-.05-.81-.11-1.16H12z" fill="white"/>
            </svg>
            <span className="text-xs font-semibold text-[#5A6B7A]">Google Pay</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#F0EDE8] rounded-full px-3 py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5A6B7A]" aria-hidden="true">
              <rect width="20" height="14" x="2" y="5" rx="2"/>
              <line x1="2" x2="22" y1="10" y2="10"/>
            </svg>
            <span className="text-xs font-semibold text-[#5A6B7A]">Cards</span>
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-8 text-center">
          <Card className="inline-block p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-green-900">30-Day Money Back Guarantee</p>
                <p className="text-sm text-green-700">Not happy? Get a full refund, no questions asked.</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Referral CTA */}
        <div className="mt-4 sm:mt-6">
          <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-200 dark:border-violet-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-full">
                  <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-violet-900 dark:text-violet-300">Know another family?</p>
                  <p className="text-sm text-violet-700 dark:text-violet-400">Invite a friend & both get 1 month free</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/50"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/join?ref=AMINY`);
                  toast.success('Referral link copied!');
                }}
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </Card>
        </div>

        {/* Disclaimer */}
        <div className="mt-8">
          <DisclaimerFooter variant="compact" className="text-center" />
        </div>
      </div>
    </div>
  );
}
