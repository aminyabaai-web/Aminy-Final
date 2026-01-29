/**
 * Simplified Paywall
 *
 * One clear offer, one clear decision. Research shows:
 * - Too many choices = paralysis = no conversion
 * - 7-day free trial removes friction
 * - Clear value proposition > feature lists
 *
 * Strategy: Lead with Core ($14.99/mo), make Pro discoverable but not the focus.
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { TierType, tierPricing } from '../lib/tier-utils';
import { createCheckoutSession, isStripeConfigured } from '../lib/stripe-service';
import { supabase } from '../utils/supabase/client';

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
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  const price = billingPeriod === 'monthly' ? 14.99 : 129;
  const perMonth = billingPeriod === 'yearly' ? (129 / 12).toFixed(2) : 14.99;

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
              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    ${perMonth}
                  </span>
                  <span className="text-slate-500">/month</span>
                </div>
                {billingPeriod === 'yearly' && (
                  <p className="text-sm text-slate-500 mt-1">
                    Billed annually (${price}/year)
                  </p>
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
                No credit card required • Cancel anytime • HSA/FSA eligible
              </p>
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

        {/* Social proof */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-white/80 text-sm">
            "Finally, an app that actually understands my child."
          </p>
          <p className="text-white/50 text-xs mt-1">
            — Sarah M., parent of a 6-year-old with autism
          </p>
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
