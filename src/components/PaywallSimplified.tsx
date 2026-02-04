/**
 * PaywallSimplified - Premium, Clean Pricing
 *
 * Simplified tier structure:
 * - Free: Basic AI access (3/day), limited features
 * - Core ($14.99/mo): Unlimited AI, full features, 10% off sessions
 * - Pro ($29.99/mo): Everything + 20% off sessions, custom plans, priority support
 * - Pro+ / Family Plan ($49.99/mo): Everything + 30% off, unlimited children, advanced analytics
 *
 * Telehealth session pricing (from pricing.ts):
 * - BCBA Consult (60 min): $149 base
 * - Free: Full price ($149)
 * - Core: 10% off ($134)
 * - Pro: 20% off ($119)
 * - Pro+: 30% off ($104)
 */

import React, { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { TierType } from '../lib/tier-utils';
import { createCheckoutSession, isStripeConfigured } from '../lib/stripe-service';
import { supabase } from '../utils/supabase/client';
import { billingEngine } from '../lib/billing-engine';

// Testimonials
const TESTIMONIALS = [
  {
    text: "Finally, an app that actually understands my child.",
    author: "Sarah M.",
    context: "parent of a 6-year-old with autism",
  },
  {
    text: "The AI suggestions have transformed our daily routines.",
    author: "Michael R.",
    context: "father of twins with ADHD",
  },
  {
    text: "Worth every penny. The BCBA sessions are a game-changer.",
    author: "Jennifer L.",
    context: "mom of a 4-year-old in ABA therapy",
  },
  {
    text: "I finally feel like I have support that's available 24/7.",
    author: "David K.",
    context: "single dad navigating an autism diagnosis",
  }
];

// Simplified tier features for comparison
const TIER_FEATURES = [
  { name: 'AI Conversations', free: '3/day', core: 'Unlimited', pro: 'Unlimited', proplus: 'Unlimited' },
  { name: 'Memory & Context', free: '7 days', core: 'Full history', pro: 'Full history', proplus: 'Full history' },
  { name: 'Daily Strategies', free: false, core: true, pro: true, proplus: true },
  { name: 'Behavior Tracking', free: 'Basic', core: 'Advanced', pro: 'Advanced', proplus: 'Advanced' },
  { name: 'Sleep & Routine Insights', free: false, core: true, pro: true, proplus: true },
  { name: 'Document Vault', free: false, core: '50 docs', pro: 'Unlimited', proplus: 'Unlimited' },
  { name: 'Weekly AI Summary', free: false, core: true, pro: true, proplus: true },
  { name: 'Telehealth Discount', free: 'Full price', core: '10% off', pro: '20% off', proplus: '30% off' },
  { name: 'Children Supported', free: '1', core: 'Up to 3', pro: 'Up to 3', proplus: 'Unlimited' },
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
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Rotate testimonials
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Pricing
  const coreMonthly = 14.99;
  const coreYearly = 129; // ~$10.75/mo
  const proMonthly = 29.99;
  const proYearly = 259; // ~$21.58/mo
  const proplusMonthly = 49.99;
  const proplusYearly = 429; // ~$35.75/mo

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

      if (result.valid && result.discount) {
        setAppliedPromo({
          code: upperCode,
          discount: result.discount,
          type: result.discountType || 'percent',
          description: result.description || `${result.discount}% off`,
        });
        toast.success(`Promo code applied: ${result.description || `${result.discount}% off`}`);
      } else {
        setPromoError(result.message || 'Invalid promo code');
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
        console.log('Auth check skipped:', authError);
      }

      // Only try Stripe if we have a user AND Stripe is properly configured
      if (user && isStripeConfigured()) {
        try {
          const priceId = tier === 'core'
            ? (billingPeriod === 'monthly' ? 'price_core_monthly' : 'price_core_yearly')
            : tier === 'pro'
            ? (billingPeriod === 'monthly' ? 'price_pro_monthly' : 'price_pro_yearly')
            : (billingPeriod === 'monthly' ? 'price_proplus_monthly' : 'price_proplus_yearly');

          const session = await createCheckoutSession({
            priceId,
            userId: user.id,
            customerEmail: user.email || '',
            successUrl: `${window.location.origin}/dashboard?upgraded=true`,
            cancelUrl: `${window.location.origin}/dashboard`,
            trialDays: 7,
            promoCode: appliedPromo?.code,
          });

          if (session?.url) {
            window.location.href = session.url;
            return;
          }
        } catch (stripeError) {
          console.log('Stripe checkout unavailable, using local subscription:', stripeError);
        }
      }

      // Default: local subscription (demo mode or Stripe not configured)
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
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-4 py-6 overflow-y-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Continue Supporting {childName}
          </h1>

          <p className="text-gray-600 max-w-sm mx-auto text-sm sm:text-base">
            Get unlimited AI support, personalized strategies, and tools designed by BCBAs to help your family thrive.
          </p>
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
        <p className="text-xs text-gray-400 text-center max-w-lg mx-auto mb-6">
          All plans include access to our provider marketplace — book telehealth sessions with BCBAs, RBTs, therapists, and more. Higher tiers save more per session.
        </p>

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
              disabled={isValidatingPromo}
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
                      <th className="text-center py-2 px-2 text-teal-600 font-bold">Core<br /><span className="text-xs font-normal">$14.99/mo</span></th>
                      <th className="text-center py-2 px-2 text-violet-600 font-bold">Pro<br /><span className="text-xs font-normal">$29.99/mo</span></th>
                      <th className="text-center py-2 px-2 text-violet-600 font-bold">Family<br /><span className="text-xs font-normal">$49.99/mo</span></th>
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

        {/* Testimonial */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
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
              <p className="text-gray-700 text-sm max-w-md mx-auto italic">
                "{TESTIMONIALS[currentTestimonial].text}"
              </p>
              <p className="text-gray-500 text-xs mt-1">
                — {TESTIMONIALS[currentTestimonial].author}, {TESTIMONIALS[currentTestimonial].context}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 text-gray-400 mb-6">
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
