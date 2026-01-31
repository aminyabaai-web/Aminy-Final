/**
 * Simplified Paywall
 *
 * One clear offer, one clear decision. Research shows:
 * - Too many choices = paralysis = no conversion
 * - 7-day free trial removes friction
 * - Clear value proposition > feature lists
 *
 * Strategy: Lead with Core ($14.99/mo), make Pro discoverable but not the focus.
 * Enhanced with tier comparison, promo codes, and social proof.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crown,
  Check,
  Sparkles,
  Heart,
  Shield,
  Clock,
  MessageSquare,
  Brain,
  Users,
  Zap,
  Star,
  ChevronDown,
  X,
  Gift,
  CreditCard,
  Table,
  Minus,
  Video,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { TierType, tierPricing } from '../lib/tier-utils';
import { createCheckoutSession, isStripeConfigured } from '../lib/stripe-service';
import { supabase } from '../utils/supabase/client';
import { billingEngine } from '../lib/billing-engine';

// Testimonials data
const TESTIMONIALS = [
  {
    text: "Finally, an app that actually understands my child.",
    author: "Sarah M.",
    context: "parent of a 6-year-old with autism",
    rating: 5
  },
  {
    text: "The AI suggestions have transformed our daily routines. Fewer meltdowns, more happy moments.",
    author: "Michael R.",
    context: "father of twins with ADHD",
    rating: 5
  },
  {
    text: "Worth every penny. The BCBA sessions alone are worth the Pro subscription.",
    author: "Jennifer L.",
    context: "mom of a 4-year-old in ABA therapy",
    rating: 5
  },
  {
    text: "I finally feel like I have a support system that's available 24/7.",
    author: "David K.",
    context: "single dad navigating an autism diagnosis",
    rating: 5
  }
];

// Tier comparison features
const TIER_FEATURES = [
  { name: 'AI Conversations', free: '3/day', starter: '10/day', core: 'Unlimited', pro: 'Unlimited', proplus: 'Unlimited' },
  { name: 'Memory & Context', free: '7 days', starter: '30 days', core: 'Full history', pro: 'Full history', proplus: 'Full history' },
  { name: 'Daily Strategies', free: false, starter: true, core: true, pro: true, proplus: true },
  { name: 'Behavior Tracking', free: 'Basic', starter: 'Standard', core: 'Advanced', pro: 'Advanced', proplus: 'Advanced' },
  { name: 'Sleep & Routine Insights', free: false, starter: 'Basic', core: true, pro: true, proplus: true },
  { name: 'Document Vault', free: false, starter: '5 docs', core: '50 docs', pro: 'Unlimited', proplus: 'Unlimited' },
  { name: 'Weekly AI Summary', free: false, starter: false, core: true, pro: true, proplus: true },
  { name: 'BCBA Telehealth', free: false, starter: false, core: false, pro: '1/month', proplus: '4/month' },
  { name: 'Custom Intervention Plans', free: false, starter: false, core: false, pro: true, proplus: true },
  { name: 'Priority Support', free: false, starter: false, core: false, pro: true, proplus: true },
  { name: 'Family Sharing', free: false, starter: false, core: false, pro: false, proplus: '5 members' },
  { name: 'Dedicated Care Manager', free: false, starter: false, core: false, pro: false, proplus: true },
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; type: 'percent' | 'fixed'; description: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Rotate testimonials
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const basePrice = billingPeriod === 'monthly' ? 14.99 : 129;
  const perMonth = billingPeriod === 'yearly' ? (129 / 12).toFixed(2) : 14.99;

  // Calculate discounted price
  const calculateDiscount = useCallback((baseAmount: number): number => {
    if (!appliedPromo) return baseAmount;
    if (appliedPromo.type === 'percent') {
      return baseAmount * (1 - appliedPromo.discount / 100);
    }
    return Math.max(0, baseAmount - appliedPromo.discount);
  }, [appliedPromo]);

  const finalPrice = calculateDiscount(basePrice);
  const finalPerMonth = billingPeriod === 'yearly'
    ? (calculateDiscount(129) / 12).toFixed(2)
    : calculateDiscount(14.99).toFixed(2);

  // Promo code validation (uses backend validation)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

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

      if (!result.valid) {
        setPromoError(result.error || 'Invalid promo code');
        return;
      }

      if (result.promoCode) {
        setAppliedPromo({
          code: upperCode,
          discount: result.promoCode.discountPercent || result.promoCode.discountAmount || 0,
          type: result.promoCode.discountPercent ? 'percent' : 'fixed',
          description: result.promoCode.description || `${result.promoCode.discountPercent || result.promoCode.discountAmount}% off`
        });
        toast.success(`Promo code applied: ${result.promoCode.description || 'Discount applied!'}`);
      }
    } catch (error) {
      console.error('Promo validation error:', error);
      setPromoError('Failed to validate promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  }, [promoCode]);

  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null);
    setPromoCode('');
  }, []);

  const handleStartTrial = async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in first');
        return;
      }

      if (isStripeConfigured()) {
        const session = await createCheckoutSession({
          priceId: billingPeriod === 'monthly' ? 'price_core_monthly' : 'price_core_yearly',
          userId: user.id,
          customerEmail: user.email || '',
          successUrl: `${window.location.origin}/dashboard?upgraded=true`,
          cancelUrl: `${window.location.origin}/dashboard`,
          trialDays: 7,
        });

        if (session?.url) {
          window.location.href = session.url;
        }
      } else {
        // Development mode - simulate subscription
        onSubscribe('core');
        toast.success('🎉 Welcome to Aminy! Your 7-day trial has started.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradeToPro = async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in first');
        return;
      }

      if (isStripeConfigured()) {
        const session = await createCheckoutSession({
          priceId: billingPeriod === 'monthly' ? 'price_pro_monthly' : 'price_pro_yearly',
          userId: user.id,
          customerEmail: user.email || '',
          successUrl: `${window.location.origin}/dashboard?upgraded=true`,
          cancelUrl: `${window.location.origin}/dashboard`,
          trialDays: 7,
        });

        if (session?.url) {
          window.location.href = session.url;
        }
      } else {
        onSubscribe('pro');
        toast.success('🎉 Welcome to Aminy Pro!');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      {onClose && (
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white/80 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
            <Crown className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">
            Continue Supporting {childName}
          </h1>

          {conversationsHad > 0 && (
            <p className="text-teal-300 text-lg mb-2">
              I've already learned so much from our {conversationsHad} conversations.
            </p>
          )}

          <p className="text-slate-300 max-w-md mx-auto">
            Get unlimited AI support, personalized strategies, and tools designed by BCBAs to help your family thrive.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-white text-slate-900'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingPeriod === 'yearly'
                ? 'bg-white text-slate-900'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Yearly
            <span className="ml-1 text-xs text-green-400">Save 28%</span>
          </button>
        </div>

        {/* Main offer card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm"
        >
          <Card className="relative overflow-hidden border-2 border-teal-500 bg-white">
            {/* Popular badge */}
            <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              MOST POPULAR
            </div>

            <div className="p-6">
              {/* HSA/FSA Badge - Prominent */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <CreditCard className="w-4 h-4" />
                  HSA/FSA Eligible
                  <BadgeCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  {appliedPromo && (
                    <span className="text-2xl text-slate-400 line-through mr-2">
                      ${perMonth}
                    </span>
                  )}
                  <span className="text-4xl font-bold text-slate-900">
                    ${finalPerMonth}
                  </span>
                  <span className="text-slate-500">/month</span>
                </div>
                {billingPeriod === 'yearly' && (
                  <p className="text-sm text-slate-500 mt-1">
                    Billed annually (${appliedPromo ? finalPrice.toFixed(2) : basePrice}/year)
                  </p>
                )}
                {appliedPromo && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded">
                      {appliedPromo.code}: {appliedPromo.description}
                    </span>
                    <button
                      onClick={handleRemovePromo}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <p className="text-teal-600 font-medium mt-2">
                  7-day free trial included
                </p>
              </div>

              {/* Key features */}
              <ul className="space-y-3 mb-6">
                {[
                  { icon: MessageSquare, text: 'Unlimited AI conversations' },
                  { icon: Brain, text: 'Full memory of your journey' },
                  { icon: Sparkles, text: 'Personalized daily strategies' },
                  { icon: Clock, text: 'Sleep & behavior insights' },
                  { icon: Shield, text: 'HIPAA-compliant & secure' },
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                      <feature.icon className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-slate-700">{feature.text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={handleStartTrial}
                disabled={isLoading}
                className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Start Free Trial'
                )}
              </Button>

              <p className="text-center text-xs text-slate-500 mt-3">
                No credit card required • Cancel anytime
              </p>

              {/* Promo Code Input */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoError('');
                      }}
                      placeholder="Promo code"
                      disabled={!!appliedPromo}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={!!appliedPromo || !promoCode || isValidatingPromo}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    {isValidatingPromo ? 'Checking...' : 'Apply'}
                  </Button>
                </div>
                {promoError && (
                  <p className="text-xs text-red-500 mt-1">{promoError}</p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Pro upsell - collapsed by default */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mt-6 flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors"
        >
          <span className="text-sm">Need expert BCBA access?</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-sm mt-4 overflow-hidden"
            >
              <Card className="p-4 bg-slate-800/50 border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">Pro Plan</h3>
                    <p className="text-sm text-slate-400">
                      ${billingPeriod === 'monthly' ? '29.99' : '23.25'}/month
                    </p>
                  </div>
                  <div className="px-2 py-1 bg-violet-500/20 text-violet-300 text-xs font-medium rounded">
                    + BCBA Access
                  </div>
                </div>

                <ul className="space-y-2 mb-4 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-violet-400" />
                    Everything in Core
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-violet-400" />
                    Monthly BCBA telehealth session
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-violet-400" />
                    Custom behavior intervention plans
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-violet-400" />
                    Priority support
                  </li>
                </ul>

                <Button
                  onClick={handleUpgradeToPro}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-violet-500 text-violet-300 hover:bg-violet-500/20"
                >
                  Upgrade to Pro
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compare Plans Button */}
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="mt-4 flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors"
        >
          <Table className="w-4 h-4" />
          <span className="text-sm">Compare all plans</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showComparison ? 'rotate-180' : ''}`} />
        </button>

        {/* Tier Comparison Table */}
        <AnimatePresence>
          {showComparison && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-4xl mt-4 overflow-hidden"
            >
              <Card className="p-4 bg-slate-800/80 border-slate-700 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-2 px-2 text-slate-400">Feature</th>
                      <th className="text-center py-2 px-2 text-slate-400">Free</th>
                      <th className="text-center py-2 px-2 text-slate-400">Starter<br /><span className="text-xs text-slate-500">$4.99/mo</span></th>
                      <th className="text-center py-2 px-2 text-teal-400 font-bold">Core<br /><span className="text-xs text-teal-300">$14.99/mo</span></th>
                      <th className="text-center py-2 px-2 text-violet-400">Pro<br /><span className="text-xs text-violet-300">$29.99/mo</span></th>
                      <th className="text-center py-2 px-2 text-amber-400">Pro+<br /><span className="text-xs text-amber-300">$59.99/mo</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {TIER_FEATURES.map((feature, index) => (
                      <tr key={feature.name} className={index % 2 === 0 ? 'bg-slate-700/30' : ''}>
                        <td className="py-2 px-2 text-slate-300">{feature.name}</td>
                        {['free', 'starter', 'core', 'pro', 'proplus'].map((tier) => {
                          const value = feature[tier as keyof typeof feature];
                          return (
                            <td key={tier} className={`text-center py-2 px-2 ${tier === 'core' ? 'bg-teal-500/10' : ''}`}>
                              {value === true ? (
                                <Check className="w-4 h-4 text-green-400 mx-auto" />
                              ) : value === false ? (
                                <Minus className="w-4 h-4 text-slate-500 mx-auto" />
                              ) : (
                                <span className={`text-xs ${tier === 'core' ? 'text-teal-300' : 'text-slate-300'}`}>{value}</span>
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

        {/* Social proof - Rotating testimonials */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-white/80 text-sm max-w-md mx-auto">
                "{TESTIMONIALS[currentTestimonial].text}"
              </p>
              <p className="text-white/50 text-xs mt-1">
                — {TESTIMONIALS[currentTestimonial].author}, {TESTIMONIALS[currentTestimonial].context}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Testimonial indicators */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {TESTIMONIALS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentTestimonial
                    ? 'bg-teal-400 w-4'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`View testimonial ${index + 1}`}
              />
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 mt-6 text-white/40">
            <div className="flex items-center gap-1 text-xs">
              <Shield className="w-4 h-4" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Users className="w-4 h-4" />
              <span>10,000+ Families</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Heart className="w-4 h-4" />
              <span>BCBA Designed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-white/40">
        <p>Questions? Email us at support@aminy.app</p>
        <p className="mt-1">
          Aminy is not a replacement for professional medical advice.
        </p>
      </div>
    </div>
  );
}

export default PaywallSimplified;
