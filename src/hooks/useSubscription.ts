/**
 * Subscription Hook
 * Manages user subscription state and Stripe interactions
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { isTrialActive, isTrialExpired, getTrialDaysRemaining, getEffectiveTier } from '../lib/tier-utils';

const API_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/make-server-8a022548`
  : '/api';

export interface Subscription {
  id?: string;
  tier: 'free' | 'starter' | 'core' | 'pro' | 'proplus';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
  credits?: number;
  referralCredits?: number;
  priceId?: string;
}

export interface ReferralInfo {
  code: string;
  totalReferrals: number;
  creditsEarned: number;
}

interface UseSubscriptionOptions {
  accessToken?: string;
  autoFetch?: boolean;
}

export function useSubscription(options: UseSubscriptionOptions = {}) {
  const { accessToken, autoFetch = false } = options;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to make authenticated API calls
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }, [accessToken]);

  // Fetch subscription status
  const fetchSubscription = useCallback(async () => {
    if (!accessToken) {
      // No token - assume free tier
      setSubscription({
        tier: 'free',
        status: 'none',
        cancelAtPeriodEnd: false,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiCall('/payments/subscription');

      setSubscription({
        id: data.subscriptionId,
        tier: data.tier || 'free',
        status: data.status || 'none',
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
        trialEndsAt: data.trialEndsAt,
        credits: data.credits || 0,
        referralCredits: data.referralCredits || 0,
        priceId: data.priceId,
      });

      // Also fetch referral info
      try {
        const referralData = await apiCall('/payments/referral/info');
        if (referralData.code) {
          setReferralInfo({
            code: referralData.code,
            totalReferrals: referralData.totalReferrals || 0,
            creditsEarned: referralData.creditsEarned || 0,
          });
        }
      } catch {
        // Referral info is optional
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load subscription';
      setError(message);
      // Default to free tier on error
      setSubscription({
        tier: 'free',
        status: 'none',
        cancelAtPeriodEnd: false,
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiCall]);

  // Create Stripe checkout session for upgrade
  const upgrade = useCallback(async (targetTier: 'starter' | 'core' | 'pro' | 'proplus', annual: boolean = false) => {
    if (!accessToken) {
      toast.error('Please sign in to upgrade');
      return;
    }

    setLoading(true);

    try {
      const data = await apiCall('/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          tier: targetTier,
          annual,
          successUrl: `${window.location.origin}/settings?success=true`,
          cancelUrl: `${window.location.origin}/settings?canceled=true`,
        }),
      });

      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiCall]);

  // Open Stripe Customer Portal for billing management
  const manageSubscription = useCallback(async () => {
    if (!accessToken) {
      toast.error('Please sign in to manage your subscription');
      return;
    }

    setLoading(true);

    try {
      const data = await apiCall('/payments/create-portal', {
        method: 'POST',
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/settings`,
        }),
      });

      if (data.portalUrl) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.portalUrl;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open billing portal';
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiCall]);

  // Cancel subscription (sets cancelAtPeriodEnd)
  const cancel = useCallback(async () => {
    if (!accessToken || !subscription?.id) {
      throw new Error('No active subscription to cancel');
    }

    setLoading(true);

    try {
      await apiCall('/payments/cancel', {
        method: 'POST',
      });

      setSubscription(prev =>
        prev ? { ...prev, cancelAtPeriodEnd: true } : null
      );

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accessToken, subscription, apiCall]);

  // Resume canceled subscription
  const resume = useCallback(async () => {
    if (!accessToken || !subscription?.id) {
      throw new Error('No subscription to resume');
    }

    setLoading(true);

    try {
      await apiCall('/payments/resume', {
        method: 'POST',
      });

      setSubscription(prev =>
        prev ? { ...prev, cancelAtPeriodEnd: false } : null
      );

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume subscription';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accessToken, subscription, apiCall]);

  // Auto-fetch on mount if requested
  useEffect(() => {
    if (autoFetch) {
      fetchSubscription();
    }
  }, [autoFetch, fetchSubscription]);

  // Trial-aware effective tier — use this for all feature gating
  const effectiveTier = getEffectiveTier(subscription?.tier, subscription?.trialEndsAt);
  const trialActive = isTrialActive(subscription?.trialEndsAt);
  const trialExpired = isTrialExpired(subscription?.tier, subscription?.trialEndsAt);
  const trialDaysRemaining = getTrialDaysRemaining(subscription?.trialEndsAt);

  return {
    subscription,
    referralInfo,
    loading,
    error,
    fetchSubscription,
    upgrade,
    manageSubscription,
    cancel,
    resume,
    // Trial state
    trialActive,
    trialExpired,
    trialDaysRemaining,
    effectiveTier,
    // Convenience getters — all trial-aware via effectiveTier
    isActive: subscription?.status === 'active' || subscription?.status === 'trialing' || trialActive,
    isProPlus: effectiveTier === 'proplus',
    isPro: effectiveTier === 'pro' || effectiveTier === 'proplus',
    isCore: effectiveTier === 'core' || effectiveTier === 'pro' || effectiveTier === 'proplus',
    // isFree = true only when trial is expired AND no paid subscription
    isFree: !subscription || (subscription.tier === 'free' && trialExpired),
  };
}
