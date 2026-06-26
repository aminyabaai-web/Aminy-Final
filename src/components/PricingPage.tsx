// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, X, Sparkles, Target, Stethoscope, Heart, Shield, MessageCircle, BarChart3, FileText, Bell, Users, Wallet, CreditCard } from 'lucide-react';
import {
  tierPricing,
  getTierFeatureDescriptions,
  getTierDisplayName,
  getTierTagline,
  getRecommendedTier,
  isHSAFSAEligible,
  TRIAL_CONFIG,
  type TierType
} from '../lib/tier-utils';
import {
  trackPaywallShown,
  trackTierSelected,
  trackCheckoutStarted,
  trackUpgradeClicked,
} from '../lib/analytics-engine';

// Aminy's unique advantages - what makes us different
const AMINY_ADVANTAGES = [
  { icon: Heart, feature: 'Remembers your child over time', description: 'Builds a complete picture of your child\'s journey' },
  { icon: BarChart3, feature: 'Tracks progress automatically', description: 'ABA-style data collection without manual logging' },
  { icon: FileText, feature: 'Creates payer-ready reports', description: 'Insurance-compliant documentation with one click' },
  { icon: Bell, feature: 'Reaches out proactively', description: 'Daily nudges and scheduled check-ins' },
  { icon: Users, feature: 'Shares with care team', description: 'Connect BCBAs, therapists, and family members' },
  { icon: Shield, feature: 'HIPAA-ready infrastructure', description: 'Built for sensitive health data from day one' },
  { icon: Sparkles, feature: 'Visual routines for kids', description: 'Aminy Jr mode with token boards and rewards' },
];

interface PricingPageProps {
  onSelectTier: (tier: TierType) => void;
  currentTier?: string;
}

export function PricingPage({ onSelectTier, currentTier }: PricingPageProps) {
  const [selectedTier, setSelectedTier] = useState<TierType>('core');
  const recommendedTier = getRecommendedTier();
  const pageViewTime = useRef<number>(Date.now());

  // Track pricing page view on mount
  useEffect(() => {
    pageViewTime.current = Date.now();
    trackPaywallShown({
      location: 'pricing_page',
      previousTier: currentTier,
    });
  }, [currentTier]);

  // Aligned with tier-utils.ts (source of truth)
  const tiers = [
    {
      id: 'free' as TierType,
      name: getTierDisplayName('free'),
      price: tierPricing.free.monthly,
      yearlyPrice: tierPricing.free.yearly,
      period: 'month',
      description: 'Discover Aminy with a 7-day Core trial.',
      icon: Heart,
      hsaEligible: false,
      features: getTierFeatureDescriptions('free'),
      cta: 'Start Free with 7-Day Trial',
      trialNote: `Includes ${TRIAL_CONFIG.durationDays}-day Core trial`,
      gradient: 'from-slate-50 to-slate-100',
      borderColor: 'border-[#E8E4DF]',
      accentColor: 'text-[#5A6B7A]',
      buttonClass: 'bg-slate-600 hover:bg-slate-700'
    },
    {
      id: 'core' as TierType,
      name: getTierDisplayName('core'),
      price: tierPricing.core.monthly,
      yearlyPrice: tierPricing.core.yearly,
      savings: tierPricing.core.savings,
      period: 'month',
      description: 'Build calm, connect daily.',
      icon: Target,
      hsaEligible: isHSAFSAEligible('core'),
      features: getTierFeatureDescriptions('core'),
      cta: `Start Free ${TRIAL_CONFIG.durationDays}-Day Trial`,
      trialNote: 'No credit card needed',
      recommended: recommendedTier === 'core',
      gradient: 'from-accent/10 to-[#F0EDE8]',
      borderColor: 'border-accent',
      accentColor: 'text-accent',
      buttonClass: 'bg-accent hover:bg-accent/90'
    },
    {
      id: 'pro' as TierType,
      name: getTierDisplayName('pro'),
      price: tierPricing.pro.monthly,
      yearlyPrice: tierPricing.pro.yearly,
      savings: tierPricing.pro.savings,
      period: 'month',
      description: 'Full support with BCBA guidance.',
      icon: Stethoscope,
      hsaEligible: isHSAFSAEligible('pro'),
      features: getTierFeatureDescriptions('pro'),
      cta: `Start Free ${TRIAL_CONFIG.durationDays}-Day Trial`,
      trialNote: 'No credit card needed',
      gradient: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      accentColor: 'text-purple-600',
      buttonClass: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      id: 'proplus' as TierType,
      name: getTierDisplayName('proplus'),
      price: tierPricing.proplus.monthly,
      yearlyPrice: tierPricing.proplus.yearly,
      savings: tierPricing.proplus.savings,
      period: 'month',
      description: 'Perfect for families with multiple children.',
      icon: Users,
      hsaEligible: isHSAFSAEligible('proplus'),
      features: getTierFeatureDescriptions('proplus'),
      cta: `Start Free ${TRIAL_CONFIG.durationDays}-Day Trial`,
      trialNote: 'No credit card needed',
      gradient: 'from-amber-50 to-amber-100',
      borderColor: 'border-amber-200',
      accentColor: 'text-amber-600',
      buttonClass: 'bg-amber-600 hover:bg-amber-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Powered by AI and ABA Science</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#132F43] dark:text-white mb-4">
            Choose Your Calm Plan
          </h1>
          
          <p className="text-lg text-[#5A6B7A] dark:text-slate-300 max-w-2xl mx-auto mb-2">
            Start with a 7-day free trial of Core or Plus — no credit card needed.
          </p>
          
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400 max-w-xl mx-auto">
            Using proven ABA principles, Aminy creates calm you can feel.
          </p>
        </div>

        {/* Forta Differentiator Banner - VC-informed positioning */}
        <div className="bg-gradient-to-r from-[#FAF7F2] to-emerald-50 dark:from-teal-900/40 dark:to-emerald-900/30 border border-[#6B9080]/20 dark:border-[#6B9080]/30/60 rounded-xl p-6 mb-8 max-w-4xl mx-auto">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 bg-[#6B9080]/10 dark:bg-[#1a3a5c]/60 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-[#6B9080] dark:text-[#7BA7BC]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#6B9080] dark:text-teal-100 mb-2">Start Today, Not in 90 Days</h3>
              <p className="text-sm text-[#6B9080] dark:text-teal-200 mb-3">
                Unlike traditional ABA services with long waitlists and diagnosis requirements, Aminy gives you immediate support.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#6B9080]/20 dark:bg-teal-800 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#6B9080] dark:text-teal-200" />
                  </div>
                  <span className="text-sm text-[#6B9080] dark:text-teal-200">No waitlist — instant AI access</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#6B9080]/20 dark:bg-teal-800 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#6B9080] dark:text-teal-200" />
                  </div>
                  <span className="text-sm text-[#6B9080] dark:text-teal-200">No diagnosis required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#6B9080]/20 dark:bg-teal-800 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#6B9080] dark:text-teal-200" />
                  </div>
                  <span className="text-sm text-[#6B9080] dark:text-teal-200">Works for any family, any child</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#6B9080]/20 dark:bg-teal-800 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#6B9080] dark:text-teal-200" />
                  </div>
                  <span className="text-sm text-[#6B9080] dark:text-teal-200">Expert sessions available within days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trial Clarity */}
        <div className="bg-white/90 dark:bg-slate-900/70 border border-[#E8E4DF] dark:border-slate-800 rounded-2xl p-6 mb-10 max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-semibold text-[#132F43] dark:text-white">What happens after your trial?</h3>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-300">
                Your {TRIAL_CONFIG.durationDays}-day trial includes full {getTierDisplayName(TRIAL_CONFIG.trialTier)} access.
                When it ends, you can pick any plan or stay on Free — no surprises.
              </p>
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-xl border border-[#E8E4DF] dark:border-slate-700 p-3">
                  <p className="font-semibold text-[#132F43] dark:text-white">Choose Core</p>
                  <p className="text-[#5A6B7A] dark:text-slate-300">${tierPricing.core.monthly}/mo after trial</p>
                </div>
                <div className="rounded-xl border border-[#E8E4DF] dark:border-slate-700 p-3">
                  <p className="font-semibold text-[#132F43] dark:text-white">Upgrade to Pro</p>
                  <p className="text-[#5A6B7A] dark:text-slate-300">${tierPricing.pro.monthly}/mo with BCBA support</p>
                </div>
                <div className="rounded-xl border border-[#E8E4DF] dark:border-slate-700 p-3">
                  <p className="font-semibold text-[#132F43] dark:text-white">Stay on Free</p>
                  <p className="text-[#5A6B7A] dark:text-slate-300">Limited features, always $0</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-3 sm:gap-4 sm:gap-6 mb-12">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isSelected = selectedTier === tier.id;
            const isCurrent = currentTier === tier.id;
            
            return (
              <Card
                key={tier.id}
                className={`relative p-4 transition-all flex flex-col ${
                  tier.recommended
                    ? `border-2 ${tier.borderColor} shadow-lg md:scale-105 z-10`
                    : `border ${tier.borderColor} hover:shadow-md`
                }`}
              >
                {/* Recommended Badge */}
                {tier.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-white border-accent text-accent">
                      Current Plan
                    </Badge>
                  </div>
                )}

                {/* Header */}
                <div className={`bg-gradient-to-br ${tier.gradient} rounded-lg p-4 mb-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${tier.accentColor}`} />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-[#132F43]">{tier.name}</h3>
                  </div>

                  <p className="text-sm text-[#5A6B7A] mb-3">{tier.description}</p>

                  <div className="flex items-baseline gap-1">
                    {tier.price === 0 ? (
                      <span className="text-2xl sm:text-3xl font-bold text-[#132F43]">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl sm:text-3xl font-bold text-[#132F43]">${tier.price}</span>
                        <span className="text-[#5A6B7A] text-sm">/{tier.period}</span>
                      </>
                    )}
                  </div>

                  {/* Yearly savings */}
                  {tier.savings && tier.savings > 0 && (
                    <p className="text-sm text-[#5A6B7A] mt-1">
                      or ${tier.yearlyPrice}/year (save {tier.savings}%)
                    </p>
                  )}

                  {/* HSA/FSA Eligibility Badge */}
                  {tier.hsaEligible && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      <Wallet className="w-3 h-3" />
                      <span>HSA/FSA Eligible</span>
                    </div>
                  )}

                  {tier.trialNote && tier.price > 0 && (
                    <p className="text-sm text-[#5A6B7A] mt-2">
                      Then ${tier.price}/mo • Cancel anytime
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4 flex-1">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className={`w-3 h-3 ${tier.accentColor} mt-1 flex-shrink-0`} />
                      <span className="text-sm text-[#3A4A57]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={() => {
                    // Track tier selection and checkout start
                    trackTierSelected(tier.id, {
                      location: 'pricing_page',
                      previousTier: currentTier,
                    });

                    if (tier.price > 0) {
                      trackCheckoutStarted(tier.id, tier.price, {
                        location: 'pricing_page',
                        tier: tier.id,
                        previousTier: currentTier,
                      });
                    }

                    setSelectedTier(tier.id);
                    onSelectTier(tier.id);
                  }}
                  className={`w-full ${tier.buttonClass} text-white`}
                  size="lg"
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Current Plan' : tier.cta}
                </Button>

                {tier.trialNote && !isCurrent && (
                  <p className="text-sm text-center text-[#5A6B7A] mt-2">
                    {tier.trialNote}
                  </p>
                )}
              </Card>
            );
          })}
        </div>

        {/* Why Aminy Works Section */}
        <div className="mb-12">
          <div className="text-center mb-4 sm:mb-6">
            <Badge className="bg-[#6B9080]/10 text-[#6B9080] mb-3">Why Aminy Works</Badge>
            <h2 className="text-2xl font-semibold text-[#132F43] mb-2">
              Built specifically for your family's journey
            </h2>
            <p className="text-[#5A6B7A]">
              Aminy isn't just AI chat—it's a complete support system designed for families navigating neurodivergence.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {AMINY_ADVANTAGES.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#6B9080]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#6B9080]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#132F43] text-sm">{item.feature}</h3>
                      <p className="text-sm text-[#5A6B7A] mt-1">{item.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-[#5A6B7A] mt-4 sm:mt-6 max-w-xl mx-auto">
            The companion is the hook. The clinical utility is the moat. We're building the system of record that clinics and payers want to integrate with.
          </p>
        </div>

        {/* Guarantee Section */}
        <div className="bg-gradient-to-r from-accent/5 to-teal-50 border border-accent/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-[#132F43] mb-2">Our Calm Guarantee</h3>
              <p className="text-[#3A4A57] mb-4">
                <strong>Noticeably calmer routines in 7 days — or cancel anytime.</strong>
              </p>
              <p className="text-sm text-[#5A6B7A]">
                We're confident that Aminy's ABA-based approach will bring measurable calm to your family. 
                If you don't see progress in your first week, cancel with one click — no questions asked.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 sm:gap-6 mb-8">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-accent mb-1">7 days</div>
            <p className="text-sm text-[#5A6B7A]">Free trial period</p>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-accent mb-1">No card</div>
            <p className="text-sm text-[#5A6B7A]">Required to start</p>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-accent mb-1">Cancel</div>
            <p className="text-sm text-[#5A6B7A]">Anytime, 1-click</p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-[#132F43] mb-4 sm:mb-6 text-center">Common Questions</h2>
          
          <div className="space-y-3 sm:space-y-4">
            <Card className="p-3 sm:p-4">
              <h4 className="font-semibold text-[#132F43] mb-2">What happens after my free trial?</h4>
              <p className="text-sm text-[#5A6B7A]">
                After your 7-day trial, you'll continue on your chosen plan (Core ${tierPricing.core.monthly}/mo, Pro ${tierPricing.pro.monthly}/mo, or Pro+ ${tierPricing.proplus.monthly}/mo).
                You'll receive reminder emails at days 4 and 6, and can cancel anytime before the trial ends.
              </p>
            </Card>

            <Card className="p-3 sm:p-4">
              <h4 className="font-semibold text-[#132F43] mb-2">Can I switch plans later?</h4>
              <p className="text-sm text-[#5A6B7A]">
                Absolutely! You can upgrade or downgrade anytime from your account settings. 
                Changes take effect immediately.
              </p>
            </Card>

            <Card className="p-3 sm:p-4">
              <h4 className="font-semibold text-[#132F43] mb-2">Is my insurance accepted?</h4>
              <p className="text-sm text-[#5A6B7A]">
                Most plans cover ABA services under behavioral health. Plus tier includes insurance
                authorization letters and BCBA documentation to maximize your benefits.
              </p>
            </Card>

            <Card className="p-4 border-green-200 bg-green-50/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#132F43] mb-2">Can I use my HSA or FSA?</h4>
                  <p className="text-sm text-[#5A6B7A] mb-2">
                    <strong className="text-green-700">Yes!</strong> All Aminy plans are eligible for HSA/FSA reimbursement.
                    Aminy qualifies as a behavioral health and wellness expense under IRS guidelines.
                  </p>
                  <ul className="text-sm text-[#5A6B7A] space-y-1">
                    <li>• Pay directly with your HSA/FSA debit card</li>
                    <li>• Or submit receipts for reimbursement</li>
                    <li>• We provide itemized receipts for all payments</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-3 sm:p-4">
              <h4 className="font-semibold text-[#132F43] mb-2">What's included in "ABA principles"?</h4>
              <p className="text-sm text-[#5A6B7A]">
                Applied Behavior Analysis (ABA) includes positive reinforcement, visual cues, 
                predictable routines, and data-driven progress tracking — all simplified for everyday family life.
              </p>
            </Card>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-12 pt-8 border-t border-[#E8E4DF]">
          <p className="text-sm text-[#5A6B7A] mb-4">
            Have questions? We're here to help.
          </p>
          <Button variant="outline" size="sm">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
