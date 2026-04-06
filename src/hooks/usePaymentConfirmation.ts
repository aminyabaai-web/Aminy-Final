// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Payment Confirmation Hook
 * Polls the backend to verify Stripe webhook was received and tier updated
 */

import { useState, useEffect, useCallback } from 'react';
import { getSubscriptionStatus } from '../lib/stripe-service';
import { TierType } from '../lib/tier-utils';

interface PaymentConfirmationResult {
  status: 'pending' | 'success' | 'failed' | 'timeout';
  tier: TierType | null;
  error: string | null;
}

interface UsePaymentConfirmationOptions {
  userId: string | null;
  expectedTier?: TierType;
  maxAttempts?: number;
  pollInterval?: number;
  onSuccess?: (tier: TierType) => void;
  onTimeout?: () => void;
}

/**
 * Hook to confirm payment was processed via webhook
 * Polls subscription status until tier is updated or timeout
 */
export function usePaymentConfirmation({
  userId,
  expectedTier,
  maxAttempts = 30, // 30 attempts = ~30 seconds with 1s interval
  pollInterval = 1000,
  onSuccess,
  onTimeout,
}: UsePaymentConfirmationOptions): PaymentConfirmationResult & { isPolling: boolean; retry: () => void } {
  const [status, setStatus] = useState<PaymentConfirmationResult['status']>('pending');
  const [tier, setTier] = useState<TierType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const checkSubscription = useCallback(async () => {
    if (!userId) return null;

    try {
      const subscriptionStatus = await getSubscriptionStatus(userId);
      return subscriptionStatus;
    } catch (err) {
      console.error('Failed to check subscription:', err);
      return null;
    }
  }, [userId]);

  const startPolling = useCallback(() => {
    if (!userId) {
      setStatus('failed');
      setError('User ID not available');
      return;
    }

    setIsPolling(true);
    setStatus('pending');
    setAttemptCount(0);
    setError(null);
  }, [userId]);

  const retry = useCallback(() => {
    startPolling();
  }, [startPolling]);

  useEffect(() => {
    if (!isPolling || !userId) return;

    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (attemptCount >= maxAttempts) {
        setIsPolling(false);
        setStatus('timeout');
        setError('Payment verification timed out. Please refresh the page or contact support.');
        onTimeout?.();
        return;
      }

      const subscriptionStatus = await checkSubscription();

      if (subscriptionStatus) {
        // Check if subscription is active and tier is as expected (or any paid tier if no expected tier)
        const isPaidTier = subscriptionStatus.tier !== 'free';
        const tierMatches = !expectedTier || subscriptionStatus.tier === expectedTier;

        if (subscriptionStatus.active && isPaidTier && tierMatches) {
          setIsPolling(false);
          setStatus('success');
          setTier(subscriptionStatus.tier as TierType);
          onSuccess?.(subscriptionStatus.tier as TierType);
          return;
        }
      }

      // Continue polling
      setAttemptCount((prev) => prev + 1);
      timeoutId = setTimeout(poll, pollInterval);
    };

    poll();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPolling, userId, attemptCount, maxAttempts, pollInterval, expectedTier, checkSubscription, onSuccess, onTimeout]);

  // Auto-start polling when userId becomes available
  useEffect(() => {
    if (userId && !isPolling && status === 'pending') {
      startPolling();
    }
  }, [userId, isPolling, status, startPolling]);

  return {
    status,
    tier,
    error,
    isPolling,
    retry,
  };
}

/**
 * Check URL for payment status parameters
 */
export function getPaymentStatusFromUrl(): {
  isPaymentReturn: boolean;
  success: boolean;
  cancelled: boolean;
  sessionId: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  const sessionId = params.get('session_id');

  return {
    isPaymentReturn: !!payment,
    success: payment === 'success',
    cancelled: payment === 'cancelled',
    sessionId,
  };
}

/**
 * Clear payment params from URL without triggering navigation
 */
export function clearPaymentParamsFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('payment');
  url.searchParams.delete('session_id');
  window.history.replaceState({}, '', url.toString());
}
