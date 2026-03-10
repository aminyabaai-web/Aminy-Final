/**
 * Payment Failure Banner (Dunning UI)
 *
 * Shows an in-app banner when subscription payment fails.
 * Stripe handles email dunning (3 retries over 7 days), but
 * this provides in-app visibility so users can fix their payment
 * method before the subscription is cancelled.
 *
 * States:
 * - retry-pending: Stripe will retry (show days remaining)
 * - action-required: User must update payment method
 * - grace-period: Final warning before cancellation
 * - cancelled: Subscription was cancelled due to non-payment
 *
 * Pulls status from Supabase `subscriptions` table or stripe-service.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CreditCard,
  Clock,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';

type DunningStatus = 'none' | 'retry-pending' | 'action-required' | 'grace-period' | 'cancelled';

interface PaymentFailureInfo {
  status: DunningStatus;
  failedAt?: string;
  nextRetryAt?: string;
  retriesRemaining?: number;
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

export function PaymentFailureBanner({
  userId,
  onUpdatePayment,
  onDismiss,
}: PaymentFailureBannerProps) {
  const [info, setInfo] = useState<PaymentFailureInfo>({ status: 'none' });
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

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

          let dunningStatus: DunningStatus = 'retry-pending';

          if (data.retries_remaining === 0 && graceEnd && now < graceEnd) {
            dunningStatus = 'grace-period';
          } else if (data.retries_remaining === 0) {
            dunningStatus = 'action-required';
          }

          setInfo({
            status: dunningStatus,
            failedAt: data.payment_failed_at,
            nextRetryAt: data.next_retry_at,
            retriesRemaining: data.retries_remaining,
            gracePeriodEndsAt: data.grace_period_ends_at,
            lastError: data.last_payment_error,
          });
        } else if (data.status === 'cancelled' || data.status === 'canceled') {
          setInfo({ status: 'cancelled' });
        } else {
          setInfo({ status: 'none' });
        }
      } catch {
        // Can't determine status — don't show banner
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

    // Default: try to open Stripe Customer Portal
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: { userId },
      });

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch {
      // Fallback: navigate to settings
      window.location.hash = '#settings/billing';
    }
  }, [userId, onUpdatePayment]);

  // Don't show if no issues or dismissed
  if (loading || info.status === 'none' || dismissed) return null;

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
      message: info.nextRetryAt
        ? `We'll retry your payment on ${new Date(info.nextRetryAt).toLocaleDateString()}. Update your payment method to avoid interruption.`
        : 'We\'ll retry your payment soon. Please update your payment method if needed.',
      urgent: false,
    },
    'action-required': {
      bg: 'bg-red-50 border-red-200',
      icon: <CreditCard className="w-5 h-5 text-red-600" />,
      title: 'Payment method needs updating',
      message: 'Your payment couldn\'t be processed after multiple attempts. Please update your payment method to keep your subscription active.',
      urgent: true,
    },
    'grace-period': {
      bg: 'bg-red-50 border-red-200',
      icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
      title: 'Subscription at risk',
      message: info.gracePeriodEndsAt
        ? `Your subscription will be cancelled on ${new Date(info.gracePeriodEndsAt).toLocaleDateString()} unless payment is resolved.`
        : 'Your subscription will be cancelled soon unless payment is resolved.',
      urgent: true,
    },
    'cancelled': {
      bg: 'bg-gray-100 border-gray-300',
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

          {/* Error detail */}
          {info.lastError && (
            <p className="text-xs text-gray-500 mt-1 italic">
              Reason: {info.lastError}
            </p>
          )}

          {/* Action button */}
          <button
            onClick={handleUpdatePayment}
            className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              info.status === 'cancelled'
                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <CreditCard size={12} />
            {info.status === 'cancelled' ? 'Resubscribe' : 'Update Payment Method'}
            <ExternalLink size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentFailureBanner;
