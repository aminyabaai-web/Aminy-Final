/**
 * Stripe Test Helpers
 *
 * Utilities for detecting Stripe test mode, formatting subscription data,
 * and calculating revenue metrics. Used across pricing, billing, and
 * revenue dashboard screens to handle the "no real Stripe products yet" state.
 *
 * These helpers work with both real Stripe data and demo data from
 * src/lib/demo-data/stripe-demo-data.ts
 */

import type {
  DemoSubscription,
  SubscriptionStatus,
  MonthlyRevenueData,
} from './demo-data/stripe-demo-data';

// ============================================================================
// Test Mode Detection
// ============================================================================

/**
 * Checks if Stripe is in test mode.
 *
 * Returns true if:
 * - The publishable key starts with `pk_test_`
 * - No publishable key is configured at all
 * - The key is empty or whitespace
 *
 * In production, this should return false when a `pk_live_` key is set.
 */
export function isTestMode(): boolean {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  const trimmed = key.trim();

  if (!trimmed) return true;
  if (trimmed.startsWith('pk_test_')) return true;

  return false;
}

/**
 * Returns a display label for the current Stripe mode.
 * Used to render a "TEST MODE" badge on billing/payment screens.
 *
 * @returns "TEST MODE" when in test mode, empty string in production.
 */
export function getTestModeLabel(): string {
  return isTestMode() ? 'TEST MODE' : '';
}

/**
 * Returns CSS color classes for the test mode badge.
 * Useful for consistently styling the test mode indicator.
 */
export function getTestModeBadgeStyle(): {
  bg: string;
  text: string;
  border: string;
} {
  return {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
  };
}

// ============================================================================
// Subscription Status Formatting
// ============================================================================

export interface FormattedStatus {
  label: string;
  color: string; // Tailwind text color class
  bgColor: string; // Tailwind background color class
  borderColor: string; // Tailwind border color class
  dotColor: string; // For status indicator dots
  description: string;
}

/**
 * Converts a subscription status into a human-readable label with
 * associated color coding for UI display.
 *
 * @param status - The subscription status from Stripe or demo data
 * @returns An object with label, colors, and description
 */
export function formatSubscriptionStatus(status: SubscriptionStatus): FormattedStatus {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        dotColor: 'bg-emerald-500',
        description: 'Subscription is active and current',
      };
    case 'trialing':
      return {
        label: 'Free Trial',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        dotColor: 'bg-blue-500',
        description: 'Free trial period — no charge until trial ends',
      };
    case 'past_due':
      return {
        label: 'Past Due',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        dotColor: 'bg-red-500',
        description: 'Payment failed — please update your payment method',
      };
    case 'canceled':
      return {
        label: 'Canceled',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        dotColor: 'bg-gray-400',
        description: 'Subscription has been canceled',
      };
    case 'paused':
      return {
        label: 'Paused',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        dotColor: 'bg-amber-500',
        description: 'Subscription is paused — resume anytime',
      };
    default: {
      // Exhaustive check — should never reach here
      const _exhaustive: never = status;
      return {
        label: String(_exhaustive),
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        dotColor: 'bg-gray-300',
        description: 'Unknown status',
      };
    }
  }
}

// ============================================================================
// MRR Calculation
// ============================================================================

/**
 * Calculates Monthly Recurring Revenue (MRR) from a list of subscriptions.
 *
 * Only includes subscriptions with 'active' or 'trialing' status.
 * Yearly subscriptions are normalized to monthly equivalent (amount / 12).
 * Past-due subscriptions are excluded since revenue is not guaranteed.
 *
 * @param subscriptions - Array of subscription records (demo or real)
 * @returns MRR in dollars (not cents)
 */
export function calculateMRR(
  subscriptions: Pick<DemoSubscription, 'status' | 'interval' | 'amountCents'>[],
): number {
  const revenueGenerating = subscriptions.filter(
    (s) => s.status === 'active' || s.status === 'trialing',
  );

  const totalMonthlyCents = revenueGenerating.reduce((sum, sub) => {
    if (sub.interval === 'year') {
      return sum + Math.round(sub.amountCents / 12);
    }
    return sum + sub.amountCents;
  }, 0);

  return totalMonthlyCents / 100;
}

/**
 * Calculates Annual Recurring Revenue (ARR) from MRR.
 *
 * @param mrr - Monthly Recurring Revenue in dollars
 * @returns ARR in dollars
 */
export function calculateARR(mrr: number): number {
  return mrr * 12;
}

/**
 * Calculates Average Revenue Per User (ARPU) from MRR and active subscriber count.
 *
 * @param mrr - Monthly Recurring Revenue in dollars
 * @param activeSubscribers - Number of active (paying) subscribers
 * @returns ARPU in dollars, or 0 if no subscribers
 */
export function calculateARPU(mrr: number, activeSubscribers: number): number {
  if (activeSubscribers <= 0) return 0;
  return Math.round((mrr / activeSubscribers) * 100) / 100;
}

/**
 * Calculates churn rate from a period's data.
 *
 * @param canceledCount - Number of subscriptions canceled in the period
 * @param startingCount - Number of active subscriptions at start of period
 * @returns Churn rate as a percentage (e.g., 5.2 for 5.2%)
 */
export function calculateChurnRate(
  canceledCount: number,
  startingCount: number,
): number {
  if (startingCount <= 0) return 0;
  return Math.round((canceledCount / startingCount) * 1000) / 10;
}

/**
 * Calculates MRR growth between two revenue periods.
 *
 * @param current - Current period revenue data
 * @param previous - Previous period revenue data
 * @returns Growth amount and percentage
 */
export function calculateMRRGrowth(
  current: Pick<MonthlyRevenueData, 'mrr'>,
  previous: Pick<MonthlyRevenueData, 'mrr'>,
): { amount: number; percent: number } {
  const amount = current.mrr - previous.mrr;
  const percent = previous.mrr > 0
    ? Math.round(((amount / previous.mrr) * 100) * 10) / 10
    : 0;
  return { amount, percent };
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Formats a dollar amount for display.
 *
 * @param dollars - Amount in dollars
 * @param showCents - Whether to show cents (default true)
 * @returns Formatted string like "$10,942.00" or "$10,942"
 */
export function formatDollars(dollars: number, showCents = true): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(dollars);
}

/**
 * Formats cents to a dollar display string.
 *
 * @param cents - Amount in cents
 * @returns Formatted string like "$29.99"
 */
export function formatCents(cents: number): string {
  return formatDollars(cents / 100);
}

/**
 * Returns a human-readable billing interval label.
 *
 * @param interval - 'month' or 'year'
 * @returns "Monthly" or "Annual"
 */
export function formatBillingInterval(interval: 'month' | 'year'): string {
  return interval === 'year' ? 'Annual' : 'Monthly';
}

/**
 * Formats a card brand and last4 for display.
 *
 * @param brand - Card brand (visa, mastercard, amex, discover)
 * @param last4 - Last 4 digits of the card
 * @returns Formatted string like "Visa ending in 4242"
 */
export function formatPaymentMethod(brand: string, last4: string): string {
  const brandName = brand.charAt(0).toUpperCase() + brand.slice(1);
  return `${brandName} ending in ${last4}`;
}

/**
 * Formats a percentage for display with a + or - prefix.
 *
 * @param percent - The percentage value
 * @returns Formatted string like "+11.8%" or "-3.2%"
 */
export function formatGrowthPercent(percent: number): string {
  const prefix = percent >= 0 ? '+' : '';
  return `${prefix}${percent.toFixed(1)}%`;
}

/**
 * Returns a Tailwind color class based on whether a growth value is positive or negative.
 *
 * @param value - The growth value
 * @returns Tailwind text color class
 */
export function growthColor(value: number): string {
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-500';
}
