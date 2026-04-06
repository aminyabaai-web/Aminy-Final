// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Stripe Revenue Tracking System
 *
 * Provides real-time revenue metrics, MRR tracking, and cohort analysis
 * for VC-ready reporting and business intelligence.
 */

import { supabase } from '../utils/supabase/client';
import { paymentLogger } from './logger';
import { tierPricing, type TierType } from './tier-utils';

// ============================================================================
// Types
// ============================================================================

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  plan: TierType;
  priceId: string;
  amount: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueEvent {
  id: string;
  type: 'subscription_created' | 'subscription_updated' | 'subscription_canceled' |
        'payment_succeeded' | 'payment_failed' | 'refund' | 'churn';
  userId: string;
  subscriptionId?: string;
  amount: number; // in cents
  currency: string;
  mrr_change: number; // Monthly Recurring Revenue change
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface MRRMetrics {
  currentMRR: number;
  previousMRR: number;
  mrrGrowth: number;
  mrrGrowthPercent: number;
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  reactivationMRR: number;
  netNewMRR: number;
}

export interface ARRMetrics {
  currentARR: number;
  projectedARR: number;
  runRate: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  trialingCustomers: number;
  churnedCustomers: number;
  churnRate: number;
  ltv: number;
  averageRevenue: number;
  payingCustomers: number;
  conversionRate: number;
}

export interface CohortData {
  cohort: string; // YYYY-MM format
  size: number;
  retained: number[];
  revenue: number[];
  churnedAt: Record<number, number>;
}

export interface RevenueReport {
  period: {
    start: Date;
    end: Date;
  };
  mrr: MRRMetrics;
  arr: ARRMetrics;
  customers: CustomerMetrics;
  byPlan: Record<string, { count: number; mrr: number; percentage: number }>;
  recentEvents: RevenueEvent[];
}

// ============================================================================
// Pricing Configuration
// ============================================================================

// Derive pricing in cents from tier-utils (single source of truth)
export const PRICING = Object.fromEntries(
  Object.entries(tierPricing).map(([tier, p]) => [
    tier,
    {
      monthly: Math.round(p.monthly * 100),
      yearly: Math.round(p.yearly * 100),
    },
  ])
) as Record<TierType, { monthly: number; yearly: number }>;

export type PlanType = TierType;

// ============================================================================
// Webhook Handlers
// ============================================================================

/**
 * Process Stripe webhook events
 */
export async function handleStripeWebhook(event: StripeWebhookEvent): Promise<void> {
  paymentLogger.info('Processing Stripe webhook', { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Record<string, unknown>);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Record<string, unknown>);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Record<string, unknown>);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Record<string, unknown>);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Record<string, unknown>);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object as Record<string, unknown>);
        break;
      default:
        paymentLogger.debug('Unhandled webhook event', { type: event.type });
    }
  } catch (error) {
    paymentLogger.error('Webhook processing failed', { error, event: event.type });
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Record<string, unknown>): Promise<void> {
  const userId = await getUserIdFromCustomer(subscription.customer as string);
  if (!userId) return;

  const plan = getPlanFromPriceId(subscription.items as { data: Array<{ price: { id: string } }> });
  const amount = getSubscriptionAmount(subscription);
  const mrr = calculateMRR(amount, subscription.items as { data: Array<{ price: { recurring: { interval: string } } }> });

  // Upsert subscription
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan,
      price_id: getPriceId(subscription),
      amount,
      currency: subscription.currency || 'usd',
      interval: getInterval(subscription),
      current_period_start: new Date((subscription.current_period_start as number) * 1000).toISOString(),
      current_period_end: new Date((subscription.current_period_end as number) * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      trial_end: subscription.trial_end ? new Date((subscription.trial_end as number) * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_subscription_id' });

  if (subError) {
    paymentLogger.error('Failed to save subscription', { error: subError });
    throw subError;
  }

  // Record revenue event
  await recordRevenueEvent({
    type: 'subscription_created',
    userId,
    subscriptionId: subscription.id as string,
    amount,
    currency: (subscription.currency as string) || 'usd',
    mrr_change: mrr,
    metadata: { plan, status: subscription.status },
  });

  paymentLogger.info('Subscription created', { userId, plan, mrr });
}

async function handleSubscriptionUpdated(subscription: Record<string, unknown>): Promise<void> {
  const userId = await getUserIdFromCustomer(subscription.customer as string);
  if (!userId) return;

  // Get previous subscription state
  const { data: prevSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  const plan = getPlanFromPriceId(subscription.items as { data: Array<{ price: { id: string } }> });
  const amount = getSubscriptionAmount(subscription);
  const newMRR = calculateMRR(amount, subscription.items as { data: Array<{ price: { recurring: { interval: string } } }> });
  const prevMRR = prevSub ? calculateMRR(prevSub.amount, { data: [{ price: { recurring: { interval: prevSub.interval } } }] }) : 0;
  const mrrChange = newMRR - prevMRR;

  // Update subscription
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      plan,
      price_id: getPriceId(subscription),
      amount,
      interval: getInterval(subscription),
      current_period_start: new Date((subscription.current_period_start as number) * 1000).toISOString(),
      current_period_end: new Date((subscription.current_period_end as number) * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    paymentLogger.error('Failed to update subscription', { error });
    throw error;
  }

  // Record revenue event
  await recordRevenueEvent({
    type: 'subscription_updated',
    userId,
    subscriptionId: subscription.id as string,
    amount,
    currency: (subscription.currency as string) || 'usd',
    mrr_change: mrrChange,
    metadata: {
      plan,
      previousPlan: prevSub?.plan,
      status: subscription.status,
      isUpgrade: mrrChange > 0,
      isDowngrade: mrrChange < 0,
    },
  });

  paymentLogger.info('Subscription updated', { userId, plan, mrrChange });
}

async function handleSubscriptionDeleted(subscription: Record<string, unknown>): Promise<void> {
  const userId = await getUserIdFromCustomer(subscription.customer as string);
  if (!userId) return;

  // Get previous MRR
  const { data: prevSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  const prevMRR = prevSub ? calculateMRR(prevSub.amount, { data: [{ price: { recurring: { interval: prevSub.interval } } }] }) : 0;

  // Update subscription status
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    paymentLogger.error('Failed to cancel subscription', { error });
    throw error;
  }

  // Record churn event
  await recordRevenueEvent({
    type: 'churn',
    userId,
    subscriptionId: subscription.id as string,
    amount: prevSub?.amount || 0,
    currency: (subscription.currency as string) || 'usd',
    mrr_change: -prevMRR,
    metadata: {
      previousPlan: prevSub?.plan,
      reason: subscription.cancellation_details,
    },
  });

  paymentLogger.info('Subscription canceled (churn)', { userId, mrrLost: prevMRR });
}

async function handleInvoicePaid(invoice: Record<string, unknown>): Promise<void> {
  const userId = await getUserIdFromCustomer(invoice.customer as string);
  if (!userId) return;

  await recordRevenueEvent({
    type: 'payment_succeeded',
    userId,
    subscriptionId: invoice.subscription as string,
    amount: invoice.amount_paid as number,
    currency: (invoice.currency as string) || 'usd',
    mrr_change: 0, // Already accounted for in subscription events
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
    },
  });

  paymentLogger.info('Payment succeeded', { userId, amount: invoice.amount_paid });
}

async function handlePaymentFailed(invoice: Record<string, unknown>): Promise<void> {
  const userId = await getUserIdFromCustomer(invoice.customer as string);
  if (!userId) return;

  await recordRevenueEvent({
    type: 'payment_failed',
    userId,
    subscriptionId: invoice.subscription as string,
    amount: invoice.amount_due as number,
    currency: (invoice.currency as string) || 'usd',
    mrr_change: 0,
    metadata: {
      invoiceId: invoice.id,
      attemptCount: invoice.attempt_count,
      nextRetry: invoice.next_payment_attempt,
    },
  });

  paymentLogger.warn('Payment failed', { userId, amount: invoice.amount_due });
}

async function handleRefund(charge: Record<string, unknown>): Promise<void> {
  const userId = await getUserIdFromCustomer(charge.customer as string);
  if (!userId) return;

  const refundedAmount = charge.amount_refunded as number;

  await recordRevenueEvent({
    type: 'refund',
    userId,
    amount: refundedAmount,
    currency: (charge.currency as string) || 'usd',
    mrr_change: 0, // Refunds don't directly affect MRR
    metadata: {
      chargeId: charge.id,
      refundReason: charge.refunds,
    },
  });

  paymentLogger.info('Refund processed', { userId, amount: refundedAmount });
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  return data?.id || null;
}

function getPlanFromPriceId(items: { data: Array<{ price: { id: string } }> }): PlanType {
  // Map price IDs to plans — tier names match tier-utils.ts
  const priceId = items?.data?.[0]?.price?.id || '';

  if (priceId.includes('proplus') || priceId.includes('family')) return 'proplus';
  if (priceId.includes('pro')) return 'pro';
  if (priceId.includes('core') || priceId.includes('starter')) return 'core';
  return 'free';
}

function getPriceId(subscription: Record<string, unknown>): string {
  const items = subscription.items as { data: Array<{ price: { id: string } }> };
  return items?.data?.[0]?.price?.id || '';
}

function getInterval(subscription: Record<string, unknown>): 'month' | 'year' {
  const items = subscription.items as { data: Array<{ price: { recurring: { interval: string } } }> };
  return items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'year' : 'month';
}

function getSubscriptionAmount(subscription: Record<string, unknown>): number {
  const items = subscription.items as { data: Array<{ price: { unit_amount: number } }> };
  return items?.data?.[0]?.price?.unit_amount || 0;
}

function calculateMRR(amount: number, items: { data: Array<{ price: { recurring: { interval: string } } }> }): number {
  const interval = items?.data?.[0]?.price?.recurring?.interval;
  if (interval === 'year') {
    return Math.round(amount / 12);
  }
  return amount;
}

async function recordRevenueEvent(event: Omit<RevenueEvent, 'id' | 'createdAt'>): Promise<void> {
  const { error } = await supabase
    .from('revenue_events')
    .insert({
      type: event.type,
      user_id: event.userId,
      subscription_id: event.subscriptionId,
      amount: event.amount,
      currency: event.currency,
      mrr_change: event.mrr_change,
      metadata: event.metadata,
      created_at: new Date().toISOString(),
    });

  if (error) {
    paymentLogger.error('Failed to record revenue event', { error });
  }
}

// ============================================================================
// Revenue Analytics
// ============================================================================

/**
 * Get current MRR metrics
 */
export async function getMRRMetrics(): Promise<MRRMetrics> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get current active subscriptions
  const { data: currentSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'active');

  // Get subscriptions as of last month
  const { data: lastMonthSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .lte('created_at', endOfLastMonth.toISOString());

  // Get revenue events for this month
  const { data: events } = await supabase
    .from('revenue_events')
    .select('*')
    .gte('created_at', startOfMonth.toISOString())
    .order('created_at', { ascending: true });

  // Calculate MRR
  const currentMRR = (currentSubs || []).reduce((sum, sub) => {
    const mrr = sub.interval === 'year' ? Math.round(sub.amount / 12) : sub.amount;
    return sum + mrr;
  }, 0);

  const previousMRR = (lastMonthSubs || []).reduce((sum, sub) => {
    const mrr = sub.interval === 'year' ? Math.round(sub.amount / 12) : sub.amount;
    return sum + mrr;
  }, 0);

  // Calculate MRR components from events
  let newMRR = 0;
  let expansionMRR = 0;
  let contractionMRR = 0;
  let churnedMRR = 0;
  let reactivationMRR = 0;

  for (const event of events || []) {
    switch (event.type) {
      case 'subscription_created':
        newMRR += event.mrr_change;
        break;
      case 'subscription_updated':
        if (event.mrr_change > 0) {
          expansionMRR += event.mrr_change;
        } else if (event.mrr_change < 0) {
          contractionMRR += Math.abs(event.mrr_change);
        }
        break;
      case 'churn':
        churnedMRR += Math.abs(event.mrr_change);
        break;
    }
  }

  const netNewMRR = newMRR + expansionMRR + reactivationMRR - contractionMRR - churnedMRR;
  const mrrGrowth = currentMRR - previousMRR;
  const mrrGrowthPercent = previousMRR > 0 ? (mrrGrowth / previousMRR) * 100 : 0;

  return {
    currentMRR,
    previousMRR,
    mrrGrowth,
    mrrGrowthPercent,
    newMRR,
    expansionMRR,
    contractionMRR,
    churnedMRR,
    reactivationMRR,
    netNewMRR,
  };
}

/**
 * Get ARR metrics
 */
export async function getARRMetrics(): Promise<ARRMetrics> {
  const mrr = await getMRRMetrics();

  return {
    currentARR: mrr.currentMRR * 12,
    projectedARR: (mrr.currentMRR + mrr.netNewMRR) * 12,
    runRate: mrr.currentMRR * 12,
  };
}

/**
 * Get customer metrics
 */
export async function getCustomerMetrics(): Promise<CustomerMetrics> {
  const { data: subs, count: totalCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact' });

  const activeSubs = (subs || []).filter(s => s.status === 'active');
  const trialingSubs = (subs || []).filter(s => s.status === 'trialing');
  const canceledSubs = (subs || []).filter(s => s.status === 'canceled');
  const payingSubs = activeSubs.filter(s => s.plan !== 'free');

  // Get total users for conversion rate
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Calculate average revenue and LTV
  const totalRevenue = payingSubs.reduce((sum, s) => sum + s.amount, 0);
  const averageRevenue = payingSubs.length > 0 ? totalRevenue / payingSubs.length : 0;

  // Estimate LTV (assume 12 month average lifetime)
  const avgMonthlyRevenue = averageRevenue / (payingSubs.some(s => s.interval === 'year') ? 12 : 1);
  const ltv = avgMonthlyRevenue * 12;

  // Calculate churn rate (monthly)
  const { data: lastMonthChurn } = await supabase
    .from('revenue_events')
    .select('*')
    .eq('type', 'churn')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const churnCount = lastMonthChurn?.length || 0;
  const startingCustomers = activeSubs.length + churnCount;
  const churnRate = startingCustomers > 0 ? (churnCount / startingCustomers) * 100 : 0;

  return {
    totalCustomers: totalCount || 0,
    activeCustomers: activeSubs.length,
    trialingCustomers: trialingSubs.length,
    churnedCustomers: canceledSubs.length,
    churnRate,
    ltv,
    averageRevenue,
    payingCustomers: payingSubs.length,
    conversionRate: totalUsers ? (payingSubs.length / totalUsers) * 100 : 0,
  };
}

/**
 * Get revenue breakdown by plan
 */
export async function getRevenueByPlan(): Promise<Record<string, { count: number; mrr: number; percentage: number }>> {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'active');

  const byPlan: Record<string, { count: number; mrr: number; percentage: number }> = {};
  let totalMRR = 0;

  for (const sub of subs || []) {
    const mrr = sub.interval === 'year' ? Math.round(sub.amount / 12) : sub.amount;
    totalMRR += mrr;

    if (!byPlan[sub.plan]) {
      byPlan[sub.plan] = { count: 0, mrr: 0, percentage: 0 };
    }
    byPlan[sub.plan].count++;
    byPlan[sub.plan].mrr += mrr;
  }

  // Calculate percentages
  for (const plan of Object.keys(byPlan)) {
    byPlan[plan].percentage = totalMRR > 0 ? (byPlan[plan].mrr / totalMRR) * 100 : 0;
  }

  return byPlan;
}

/**
 * Get cohort retention data
 */
export async function getCohortData(months: number = 6): Promise<CohortData[]> {
  const cohorts: CohortData[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const cohortKey = `${cohortStart.getFullYear()}-${String(cohortStart.getMonth() + 1).padStart(2, '0')}`;

    // Get users who signed up in this cohort
    const { data: cohortUsers } = await supabase
      .from('subscriptions')
      .select('user_id, created_at, status')
      .gte('created_at', cohortStart.toISOString())
      .lte('created_at', cohortEnd.toISOString());

    const size = cohortUsers?.length || 0;
    const retained: number[] = [];
    const revenue: number[] = [];
    const churnedAt: Record<number, number> = {};

    // Calculate retention for each month after signup
    for (let m = 0; m <= i; m++) {
      const checkDate = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + m + 1, 0);

      // Count how many are still active
      const stillActive = (cohortUsers || []).filter(u => {
        // For simplicity, check if they're currently active
        return u.status === 'active';
      }).length;

      retained.push(size > 0 ? Math.round((stillActive / size) * 100) : 0);

      // Revenue tracking per month would need more detailed data
      revenue.push(0);
    }

    cohorts.push({
      cohort: cohortKey,
      size,
      retained,
      revenue,
      churnedAt,
    });
  }

  return cohorts;
}

/**
 * Generate full revenue report
 */
export async function generateRevenueReport(): Promise<RevenueReport> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [mrr, arr, customers, byPlan] = await Promise.all([
    getMRRMetrics(),
    getARRMetrics(),
    getCustomerMetrics(),
    getRevenueByPlan(),
  ]);

  // Get recent events
  const { data: events } = await supabase
    .from('revenue_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    period: {
      start: startOfMonth,
      end: now,
    },
    mrr,
    arr,
    customers,
    byPlan,
    recentEvents: (events || []).map(e => ({
      id: e.id,
      type: e.type,
      userId: e.user_id,
      subscriptionId: e.subscription_id,
      amount: e.amount,
      currency: e.currency,
      mrr_change: e.mrr_change,
      metadata: e.metadata,
      createdAt: new Date(e.created_at),
    })),
  };
}

// ============================================================================
// Exports
// ============================================================================

export const revenue = {
  handleWebhook: handleStripeWebhook,
  getMRR: getMRRMetrics,
  getARR: getARRMetrics,
  getCustomers: getCustomerMetrics,
  getByPlan: getRevenueByPlan,
  getCohorts: getCohortData,
  getReport: generateRevenueReport,
};
