/**
 * useGracePeriod Hook
 *
 * Monitors the user's grace period status after a failed payment.
 * Provides reactive state for showing banners, toasts, and gating
 * premium features during the grace window.
 *
 * Usage:
 *   const { inGracePeriod, daysRemaining, bannerMessage } = useGracePeriod({ userId });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/make-server-8a022548`
  : '/api';

// ── Types ──

export interface GracePeriodStatus {
  /** Whether the user is currently inside an active grace period */
  inGracePeriod: boolean;
  /** Full days remaining before features are suspended (0 if not in grace) */
  daysRemaining: number;
  /** ISO timestamp when features were suspended (null if not yet suspended) */
  suspendedAt: string | null;
  /** ISO timestamp when the grace period started */
  gracePeriodStartedAt: string | null;
  /** ISO timestamp when the grace period will end */
  gracePeriodEndsAt: string | null;
}

export interface UseGracePeriodOptions {
  /** The authenticated user's ID. Hook is inert when falsy. */
  userId?: string | null;
  /** Supabase access token for authenticated API calls */
  accessToken?: string | null;
  /** How often to re-poll status (ms). Default: 5 minutes. */
  pollInterval?: number;
  /** Whether to show a toast notification when grace period is detected. Default: true. */
  showToast?: boolean;
  /** Whether to auto-fetch on mount. Default: true. */
  autoFetch?: boolean;
}

export interface UseGracePeriodReturn extends GracePeriodStatus {
  /** Whether the hook is currently fetching status */
  loading: boolean;
  /** Error message if the last fetch failed */
  error: string | null;
  /** Re-fetch the grace period status on demand */
  refresh: () => Promise<void>;
  /** Human-readable banner message, or null if no banner needed */
  bannerMessage: string | null;
  /** Severity level for UI styling */
  severity: 'warning' | 'critical' | 'none';
}

// How often to refresh (default 5 min)
const DEFAULT_POLL_INTERVAL = 5 * 60 * 1000;

const EMPTY_STATUS: GracePeriodStatus = {
  inGracePeriod: false,
  daysRemaining: 0,
  suspendedAt: null,
  gracePeriodStartedAt: null,
  gracePeriodEndsAt: null,
};

// ── Hook ──

export function useGracePeriod(options: UseGracePeriodOptions = {}): UseGracePeriodReturn {
  const {
    userId,
    accessToken,
    pollInterval = DEFAULT_POLL_INTERVAL,
    showToast = true,
    autoFetch = true,
  } = options;

  const [status, setStatus] = useState<GracePeriodStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track whether we've already shown the initial toast to avoid spam
  const hasShownToast = useRef(false);

  // ── Fetch from backend ──
  const fetchStatus = useCallback(async () => {
    if (!userId) {
      setStatus(EMPTY_STATUS);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      };

      const response = await fetch(
        `${API_BASE}/payments/grace-period/${userId}`,
        { method: 'GET', headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setStatus(EMPTY_STATUS);
          setError(null);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data: GracePeriodStatus = await response.json();
      setStatus(data);

      // Show a toast the first time we detect a grace period
      if (data.inGracePeriod && showToast && !hasShownToast.current) {
        hasShownToast.current = true;

        if (data.daysRemaining <= 2) {
          toast.error(
            `Payment issue: your access expires in ${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'}. Please update your payment method.`,
            { duration: 10000 }
          );
        } else {
          toast.warning(
            `We couldn't process your payment. You have ${data.daysRemaining} days to update your payment method.`,
            { duration: 8000 }
          );
        }
      }

      // Reset toast flag when grace period resolves
      if (!data.inGracePeriod) {
        hasShownToast.current = false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load grace period status';
      setError(message);
      // Don't wipe status on transient errors — keep last known state
    } finally {
      setLoading(false);
    }
  }, [userId, accessToken, showToast]);

  // ── Auto-fetch on mount and poll ──
  useEffect(() => {
    if (!autoFetch || !userId) return;

    fetchStatus();

    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [autoFetch, userId, pollInterval, fetchStatus]);

  // ── Derived UI helpers ──
  let bannerMessage: string | null = null;
  let severity: 'warning' | 'critical' | 'none' = 'none';

  if (status.suspendedAt) {
    bannerMessage = 'Your subscription features have been suspended due to a payment issue. Please update your payment method to restore access.';
    severity = 'critical';
  } else if (status.inGracePeriod) {
    if (status.daysRemaining <= 2) {
      bannerMessage = `Urgent: your payment failed and your access expires in ${status.daysRemaining} day${status.daysRemaining === 1 ? '' : 's'}. Update your payment method now.`;
      severity = 'critical';
    } else {
      bannerMessage = `We couldn't process your latest payment. You have ${status.daysRemaining} days to update your payment method before features are suspended.`;
      severity = 'warning';
    }
  }

  return {
    ...status,
    loading,
    error,
    refresh: fetchStatus,
    bannerMessage,
    severity,
  };
}
