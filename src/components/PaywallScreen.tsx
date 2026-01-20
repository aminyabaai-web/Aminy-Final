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
  Target,
  Shield,
  Gift,
  Zap,
  Crown
} from 'lucide-react';
import {
  TierType,
  tierPricing,
  getTierFeatureDescriptions,
  getRecommendedTier
} from '../lib/tier-utils';
import { createCheckoutSession, isStripeConfigured } from '../lib/stripe-service';
import { supabase } from '../utils/supabase/client';

interface PaywallScreenProps {
  onSubscribe: (tier: TierType) => void;
  onClose?: () => void;
  currentTier?: TierType;
  childName?: string; // For personalized messaging
  isPostOnboarding?: boolean; // True when shown right after onboarding
}

export function PaywallScreen({ onSubscribe, onClose, currentTier = 'free', childName, isPostOnboarding = false }: PaywallScreenProps) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);

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
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
    {
      id: 'starter',
      name: 'Starter',
      subtitle: 'Build daily habits',
      icon: Heart,
      popular: false,
      gradient: 'from-rose-50 to-pink-50',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
    },
    {
      id: 'core',
      name: 'Core',
      subtitle: 'The full companion',
      icon: Target,
      popular: true,
      gradient: 'from-teal-50 to-cyan-50',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
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
      toast.info("You're already on this plan");
      return;
    }

    // Free tier doesn't need payment
    if (tierId === 'free') {
      onSubscribe(tierId);
      toast.success('Welcome to Aminy!');
      return;
    }

    setIsLoading(tierId);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please sign in to subscribe');
        setIsLoading(null);
        return;
      }

      // Check if Stripe is configured
      if (!isStripeConfigured()) {
        // Fallback for demo mode - just update tier locally
        toast.info('Payment processing is being set up. Activating trial mode.');
        onSubscribe(tierId);
        setIsLoading(null);
        return;
      }

      // Create Stripe checkout session and redirect
      const { url } = await createCheckoutSession({
        userId: user.id,
        email: user.email || '',
        tier: tierId as 'starter' | 'core' | 'pro',
        interval: billingPeriod === 'monthly' ? 'monthly' : 'annual',
      });

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Something went wrong. Please try again.');
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
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50/50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Close confirmation modal for post-onboarding */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Skip the free trial?
            </h3>
            <p className="text-gray-600 dark:text-slate-300 mb-4 text-sm">
              {childName ? `${childName}'s personalized plan is ready.` : 'Your personalized plan is ready.'}
              {' '}The free trial gives you full access for 7 days with no commitment.
            </p>
            <div className="space-y-2">
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => setShowCloseConfirm(false)}
              >
                Start Free Trial
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-500"
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
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {onClose && !isPostOnboarding && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            {/* Small, subtle X for post-onboarding - adds friction */}
            {onClose && isPostOnboarding && (
              <button
                onClick={handleClose}
                className="p-1 text-gray-300 hover:text-gray-400 transition-colors"
                aria-label="Skip"
              >
                <span className="text-xs">Skip</span>
              </button>
            )}
            <div className="flex-1 text-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
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
        {/* Value Proposition - Personalized */}
        <div className="text-center mb-8">
          {isPostOnboarding && childName ? (
            <>
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Personalized for {childName}</span>
              </div>
              <p className="text-gray-600 dark:text-slate-300 max-w-md mx-auto">
                Based on what you shared, we've created a personalized support plan.
                Start your free trial to unlock it.
              </p>
            </>
          ) : (
            <p className="text-gray-600 dark:text-slate-300 max-w-md mx-auto">
              Your AI companion for calmer days and confident parenting.
              Start free, upgrade when you're ready.
            </p>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              billingPeriod === 'yearly'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Yearly
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Save 30%</Badge>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="space-y-4">
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
                    ? 'ring-2 ring-teal-500 shadow-md'
                    : 'border border-gray-200 hover:border-gray-300'
                } ${isCurrentTier ? 'opacity-60' : ''}`}
                onClick={() => !isCurrentTier && handleSelectTier(tier.id)}
              >
                {/* Popular Badge */}
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-teal-500 text-white px-3 py-1 shadow-sm">
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

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl ${tier.iconBg} flex-shrink-0`}>
                    <IconComponent className={`w-6 h-6 ${tier.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                      <div className="text-right">
                        {price === 0 ? (
                          <span className="text-2xl font-bold text-gray-900">Free</span>
                        ) : (
                          <>
                            <span className="text-2xl font-bold text-gray-900">
                              ${price.toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">
                              /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-3">{tier.subtitle}</p>

                    {/* Features */}
                    <div className="space-y-2">
                      {features.slice(0, 4).map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </div>
                      ))}
                      {features.length > 4 && (
                        <p className="text-xs text-gray-400 pl-6">
                          +{features.length - 4} more features
                        </p>
                      )}
                    </div>

                    {/* CTA */}
                    <Button
                      className={`w-full mt-4 ${
                        tier.popular
                          ? 'bg-teal-600 hover:bg-teal-700 text-white'
                          : tier.id === 'free'
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
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
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
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
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Zap className="w-4 h-4" />
            <span>No credit card for free</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Sparkles className="w-4 h-4" />
            <span>7-day trial on paid plans</span>
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

        {/* Disclaimer */}
        <div className="mt-8">
          <DisclaimerFooter variant="compact" className="text-center" />
        </div>
      </div>
    </div>
  );
}
