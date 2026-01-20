/**
 * Subscription Hook
 * Manages user subscription state
 */

import { useState, useCallback, useEffect } from 'react';

export interface Subscription {
  id: string;
  tier: 'free' | 'starter' | 'core' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Placeholder - would fetch from API
      setSubscription({
        id: 'sub_placeholder',
        tier: 'free',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const cancelSubscription = useCallback(async () => {
    if (!subscription) return;

    setSubscription(prev =>
      prev ? { ...prev, cancelAtPeriodEnd: true } : null
    );
  }, [subscription]);

  const resumeSubscription = useCallback(async () => {
    if (!subscription) return;

    setSubscription(prev =>
      prev ? { ...prev, cancelAtPeriodEnd: false } : null
    );
  }, [subscription]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  return {
    subscription,
    isLoading,
    error,
    loadSubscription,
    cancelSubscription,
    resumeSubscription,
    isActive: subscription?.status === 'active' || subscription?.status === 'trialing',
    isPro: subscription?.tier === 'pro',
  };
}
