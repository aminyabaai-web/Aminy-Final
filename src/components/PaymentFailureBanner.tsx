// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Payment Failure Banner (Enhanced Dunning UI)
 *
 * Shows an in-app banner when subscription payment fails.
 * Stripe handles email dunning (3 retries over 7 days), but
 * this provides in-app visibility so users can fix their payment
 * method before the subscription is cancelled.
 *
 * Enhanced information shown:
 * - Attempt count (e.g., "Attempt 2 of 4")
 * - Next retry date (human-readable)
 * - Grace period remaining (countdown in days/hours)
 * - Direct link to update payment method via Stripe Customer Portal
 *
 * States:
 * - retry-pending: Stripe will retry (show attempt count + next retry)
 * - action-required: All retries exhausted, user must update payment
 * - grace-period: Final warning with countdown before cancellation
 * - cancelled: Subscription was cancelled due to non-payment
 *
 * Pulls status from Supabase `subscriptions` table.
 * Opens Stripe Customer Portal via openCustomerPortal() from stripe-service.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CreditCard,
  Clock,
  X,
  ExternalLink,
  ShieldAlert,
  RotateCw,
  CalendarClock,
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { openCustomerPortal } from '../lib/stripe-service';

type DunningStatus = 'none' | 'retry-pending' | 'action-required' | 'grace-period' | 'cancelled';

/** Maximum retry attempts Stripe will make (configurable in Stripe Dashboard) */
const MAX_RETRY_ATTEMPTS = 4;

interface PaymentFailureInfo {
  status: DunningStatus;
  failedAt?: string;
  nextRetryAt?: string;
  retriesRemaining?: number;
  attemptCount?: number;
  gracePeriodEndsAt?: string;
  lastError?: string;
}

interface PaymentFailureBannerProps {
  userId: string;
  onUpdatePayment?: () => void;
  onDismiss?: () => void;
}

const DISMISS_KEY = 'aminy_dunning_dismissed';
const DISMISS_COOLDOWN_HOURS = 4; // Re-show every 4 hours

/**
 * Format a relative time string like "in 2 days" or "in 5 hours"
 */
function formatTimeRemaining(targetDate: string): string {
  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) return 'imminently';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === 1) return 'in 1 day';
  if (diffHours > 1) return `in ${diffHours} hours`;
  if (diffHours === 1) return 'in 1 hour';
  return 'in less than an hour';
}

/**
 * Format a date for display (e.g., "Mar 15, 2026")
 */
function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export function PaymentFailureBanner({
  userId,
  onUpdatePayment,
  onDismiss,
}: PaymentFailureBannerProps) {
  const [info, setInfo] = useState<PaymentFailureInfo>({ status: 'none' });
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  // Check payment status
  useEffect(() => {
    async function checkStatus() {
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('status, payment_failed_at, next_retry_at, retries_remaining, grace_period_ends_at, last_payment_error')
          .eq('user_id', userId)
          .single();

        if (!data) {
          setInfo({ status: 'none' });
          setLoading(false);
          return;
        }

        if (data.status === 'past_due' || data.status === 'payment_failed') {
          const now = Date.now();
          const graceEnd = data.grace_period_ends_at
            ? new Date(data.grace_period_ends_at).getTime()
            : null;

          const retriesRemaining = data.retries_remaining ?? 0;
          const attemptCount = MAX_RETRY_ATTEMPTS - retriesRemaining;

          let dunningStatus: DunningStatus = 'retry-pending';

          if (retriesRemaining === 0 && graceEnd && now < graceEnd) {
            dunningStatus = 'grace-period';
          } else if (retriesRemaining === 0) {
            dunningStatus = 'action-required';
          }

          setInfo({
            status: dunningStatus,
            failedAt: data.payment_failed_at,
            nextRetryAt: data.next_retry_at,
            retriesRemaining,
            attemptCount,
            gracePeriodEndsAt: data.grace_period_ends_at,
            lastError: data.last_payment_error,
          });
        } else if (data.status === 'cancelled' || data.status === 'canceled') {
          setInfo({ status: 'cancelled' });
        } else {
          setInfo({ status: 'none' });
        }
      } catch {
        // Can't determine status -- don't show banner
        setInfo({ status: 'none' });
      }
      setLoading(false);
    }

    checkStatus();

    // Check dismiss cooldown
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (lastDismissed) {
      const hoursSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60);
      if (hoursSince < DISMISS_COOLDOWN_HOURS) {
        setDismissed(true);
      }
    }
  }, [userId]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    onDismiss?.();
  }, [onDismiss]);

  const handleUpdatePayment = useCallback(async () => {
    if (onUpdatePayment) {
      onUpdatePayment();
      return;
    }

    // Open Stripe Customer Portal via the consolidated stripe-service function
    setPortalLoading(true);
    try {
      await openCustomerPortal(userId, `${window.location.origin}/?screen=dashboard`);
    } catch {
      // Fallback: navigate to settings screen
      if (typeof window !== 'undefined') {
        window.location.href = `${window.location.origin}/?screen=settings`;
      }
    } finally {
      setPortalLoading(false);
    }
  }, [userId, onUpdatePayment]);

  // Don't show if no issues or dismissed
  if (loading || info.status === 'none' || dismissed) return null;

  // Build enhanced messages with attempt count, retry date, and grace period
  const configs: Record<Exclude<DunningStatus, 'none'>, {
    bg: string;
    icon: React.ReactNode;
    title: string;
    message: string;
    urgent: boolean;
  }> = {
    'retry-pending': {
      bg: 'bg-amber-50 border-amber-200',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      title: 'Payment issue detected',
      message: buildRetryMessage(info),
      urgent: false,
    },
    'action-required': {
      bg: 'bg-red-50 border-red-200',
      icon: <CreditCard className="w-5 h-5 text-red-600" />,
      title: 'Payment method needs updating',
      message: `Your payment could not be processed after ${MAX_RETRY_ATTEMPTS} attempts. Please update your payment method now to keep your subscription active.`,
      urgent: true,
    },
    'grace-period': {
      bg: 'bg-red-50 border-red-200',
      icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
      title: 'Subscription at risk',
      message: buildGracePeriodMessage(info),
      urgent: true,
    },
    'cancelled': {
      bg: 'bg-[#F0EDE8] border-gray-300',
      icon: <AlertTriangle className="w-5 h-5 text-gray-600" />,
      title: 'Subscription cancelled',
      message: 'Your subscription was cancelled due to payment issues. Resubscribe to regain access to premium features.',
      urgent: true,
    },
  };

  const config = configs[info.status];

  return (
    <div
      className={`relative mx-4 my-2 rounded-xl border p-4 ${config.bg} animate-in slide-in-from-top duration-300`}
      role="alert"
      aria-live="polite"
    >
      {/* Dismiss button (only for non-urgent) */}
      {!config.urgent && (
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white/50 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">{config.title}</h4>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            {config.message}
          </p>

          {/* Detailed dunning metadata */}
          {info.status !== 'cancelled' && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {/* Attempt count */}
              {info.attemptCount !== undefined && info.attemptCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                  <RotateCw size={10} />
                  Attempt {info.attemptCount} of {MAX_RETRY_ATTEMPTS}
                </span>
              )}

              {/* Next retry date */}
              {info.nextRetryAt && info.status === 'retry-pending' && (
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                  <CalendarClock size={10} />
                  Next retry: {formatShortDate(info.nextRetryAt)}
                </span>
              )}

              {/* Grace period countdown */}
              {info.gracePeriodEndsAt && info.status === 'grace-period' && (
                <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
                  <Clock size={10} />
                  Cancels {formatTimeRemaining(info.gracePeriodEndsAt)}
                </span>
              )}
            </div>
          )}

          {/* Error detail */}
          {info.lastError && (
            <p className="text-xs text-gray-500 mt-1 italic">
              Reason: {info.lastError}
            </p>
          )}

          {/* Action button — opens Stripe Customer Portal */}
          <button
            onClick={handleUpdatePayment}
            disabled={portalLoading}
            className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              info.status === 'cancelled'
                ? 'bg-primary hover:bg-[#6B9080] text-white'
                : 'bg-white hover:bg-[#FAF7F2] text-gray-700 border border-gray-200'
            }`}
          >
            <CreditCard size={12} />
            {portalLoading
              ? 'Opening...'
              : info.status === 'cancelled'
                ? 'Resubscribe'
                : 'Update Payment Method'}
            {!portalLoading && <ExternalLink size={10} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Build a detailed retry-pending message with attempt count and next retry date.
 */
function buildRetryMessage(info: PaymentFailureInfo): string {
  const parts: string[] = [];

  if (info.attemptCount !== undefined && info.attemptCount > 0) {
    const remaining = MAX_RETRY_ATTEMPTS - info.attemptCount;
    parts.push(
      `Payment attempt ${info.attemptCount} of ${MAX_RETRY_ATTEMPTS} failed` +
      (remaining > 0 ? ` (${remaining} ${remaining === 1 ? 'retry' : 'retries'} remaining).` : '.')
    );
  } else {
    parts.push('A recent payment attempt failed.');
  }

  if (info.nextRetryAt) {
    parts.push(
      `We will retry ${formatTimeRemaining(info.nextRetryAt)} on ${formatShortDate(info.nextRetryAt)}.`
    );
  }

  parts.push('Update your payment method to avoid any interruption to your subscription.');

  return parts.join(' ');
}

/**
 * Build a grace period message with the expiration countdown.
 */
function buildGracePeriodMessage(info: PaymentFailureInfo): string {
  if (info.gracePeriodEndsAt) {
    const remaining = formatTimeRemaining(info.gracePeriodEndsAt);
    return (
      `All payment retries have been exhausted. Your subscription will be cancelled ` +
      `${remaining} (${formatShortDate(info.gracePeriodEndsAt)}) unless you update your payment method.`
    );
  }
  return 'Your subscription will be cancelled soon unless payment is resolved. Please update your payment method immediately.';
}

export default PaymentFailureBanner;
