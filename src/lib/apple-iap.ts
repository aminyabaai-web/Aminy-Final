/**
 * Apple In-App Purchase Integration
 *
 * Uses RevenueCat for cross-platform subscription management
 * Handles both iOS App Store and Google Play subscriptions
 *
 * SETUP REQUIRED:
 * 1. Create RevenueCat account at https://app.revenuecat.com
 * 2. Connect App Store Connect and Google Play Console
 * 3. Create products matching Stripe tiers
 * 4. Get API key and add to environment variables
 *
 * Note: This is a preparatory implementation for when the iOS app is built.
 * Currently structured for React Native / Expo integration.
 */

// RevenueCat API key (get from RevenueCat dashboard)
const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY || '';
const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';

// Product identifiers - must match App Store Connect / Google Play Console
export const IAP_PRODUCT_IDS = {
  // Subscriptions
  starter_monthly: 'aminy_starter_monthly',
  starter_annual: 'aminy_starter_annual',
  core_monthly: 'aminy_core_monthly',
  core_annual: 'aminy_core_annual',
  pro_monthly: 'aminy_pro_monthly',
  pro_annual: 'aminy_pro_annual',
  proplus_monthly: 'aminy_proplus_monthly',
  proplus_annual: 'aminy_proplus_annual',
} as const;

// Entitlement identifiers (what user gets access to)
export const ENTITLEMENTS = {
  starter: 'starter_access',
  core: 'core_access',
  pro: 'pro_access',
  proplus: 'proplus_access',
} as const;

export type TierType = 'free' | 'starter' | 'core' | 'pro' | 'proplus';
export type BillingInterval = 'monthly' | 'annual';

export interface SubscriberInfo {
  activeSubscriptions: string[];
  entitlements: {
    [key: string]: {
      isActive: boolean;
      willRenew: boolean;
      expiresDate: string | null;
      productIdentifier: string;
      isSandbox: boolean;
    };
  };
  managementUrl: string | null;
  originalPurchaseDate: string | null;
  firstSeen: string;
}

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  error?: string;
}

/**
 * Check if RevenueCat is configured
 */
export function isRevenueCatConfigured(): boolean {
  return !!REVENUECAT_API_KEY && REVENUECAT_API_KEY.length > 10;
}

/**
 * Get subscriber info from RevenueCat
 * This syncs purchase data across platforms
 */
export async function getSubscriberInfo(userId: string): Promise<SubscriberInfo | null> {
  if (!isRevenueCatConfigured()) {
    console.warn('RevenueCat not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${REVENUECAT_API_URL}/subscribers/${userId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // User doesn't exist yet, create them
        return await createSubscriber(userId);
      }
      throw new Error(`RevenueCat API error: ${response.status}`);
    }

    const data = await response.json();
    return parseSubscriberInfo(data.subscriber);
  } catch (error) {
    console.error('Error fetching subscriber info:', error);
    return null;
  }
}

/**
 * Create a new subscriber in RevenueCat
 */
async function createSubscriber(userId: string): Promise<SubscriberInfo | null> {
  try {
    const response = await fetch(
      `${REVENUECAT_API_URL}/subscribers/${userId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_user_id: userId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create subscriber: ${response.status}`);
    }

    const data = await response.json();
    return parseSubscriberInfo(data.subscriber);
  } catch (error) {
    console.error('Error creating subscriber:', error);
    return null;
  }
}

/**
 * Parse RevenueCat subscriber response into our format
 */
function parseSubscriberInfo(subscriber: Record<string, unknown>): SubscriberInfo {
  const entitlements: SubscriberInfo['entitlements'] = {};
  const rcEntitlements = subscriber.entitlements as Record<string, Record<string, unknown>> || {};

  for (const [key, value] of Object.entries(rcEntitlements)) {
    entitlements[key] = {
      isActive: value.expires_date
        ? new Date(value.expires_date as string) > new Date()
        : false,
      willRenew: !value.unsubscribe_detected_at,
      expiresDate: value.expires_date as string | null,
      productIdentifier: value.product_identifier as string,
      isSandbox: value.is_sandbox as boolean || false,
    };
  }

  const subscriptions = subscriber.subscriptions as Record<string, unknown> || {};

  return {
    activeSubscriptions: Object.keys(subscriptions),
    entitlements,
    managementUrl: subscriber.management_url as string | null,
    originalPurchaseDate: subscriber.original_purchase_date as string | null,
    firstSeen: subscriber.first_seen as string,
  };
}

/**
 * Get the current tier based on entitlements
 */
export function getCurrentTier(subscriberInfo: SubscriberInfo | null): TierType {
  if (!subscriberInfo) return 'free';

  // Check entitlements in order of highest to lowest
  if (subscriberInfo.entitlements[ENTITLEMENTS.proplus]?.isActive) {
    return 'proplus';
  }
  if (subscriberInfo.entitlements[ENTITLEMENTS.pro]?.isActive) {
    return 'pro';
  }
  if (subscriberInfo.entitlements[ENTITLEMENTS.core]?.isActive) {
    return 'core';
  }
  if (subscriberInfo.entitlements[ENTITLEMENTS.starter]?.isActive) {
    return 'starter';
  }

  return 'free';
}

/**
 * Record a purchase receipt (for validation)
 * Call this after a successful App Store / Google Play purchase
 */
export async function recordPurchaseReceipt(
  userId: string,
  receipt: string,
  productId: string,
  platform: 'ios' | 'android'
): Promise<PurchaseResult> {
  if (!isRevenueCatConfigured()) {
    return { success: false, error: 'RevenueCat not configured' };
  }

  try {
    const endpoint = platform === 'ios'
      ? '/receipts'
      : '/receipts/google';

    const response = await fetch(
      `${REVENUECAT_API_URL}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_user_id: userId,
          fetch_token: receipt,
          product_id: productId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return {
      success: true,
      productId,
      transactionId: data.transaction_id,
    };
  } catch (error) {
    console.error('Error recording purchase:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync Stripe subscription with RevenueCat
 * Call this when a user subscribes via Stripe web
 */
export async function syncStripeSubscription(
  userId: string,
  stripeSubscriptionId: string,
  tier: TierType
): Promise<boolean> {
  if (!isRevenueCatConfigured()) {
    console.warn('RevenueCat not configured, skipping sync');
    return false;
  }

  try {
    // Grant entitlement based on tier
    const entitlement = ENTITLEMENTS[tier as keyof typeof ENTITLEMENTS];
    if (!entitlement) return false;

    const response = await fetch(
      `${REVENUECAT_API_URL}/subscribers/${userId}/entitlements/${entitlement}/promotional`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: 'monthly', // Will be renewed by webhook
          start_time_ms: Date.now(),
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error syncing Stripe subscription:', error);
    return false;
  }
}

/**
 * Get the management URL for subscription management
 * On iOS, this opens the App Store subscription settings
 */
export async function getManagementUrl(userId: string): Promise<string | null> {
  const subscriberInfo = await getSubscriberInfo(userId);
  return subscriberInfo?.managementUrl || null;
}

/**
 * Check if subscription will renew
 */
export async function willSubscriptionRenew(userId: string): Promise<boolean> {
  const subscriberInfo = await getSubscriberInfo(userId);
  if (!subscriberInfo) return false;

  // Check if any active entitlement will renew
  return Object.values(subscriberInfo.entitlements).some(
    ent => ent.isActive && ent.willRenew
  );
}

/**
 * Get subscription expiration date
 */
export async function getSubscriptionExpirationDate(userId: string): Promise<Date | null> {
  const subscriberInfo = await getSubscriberInfo(userId);
  if (!subscriberInfo) return null;

  // Find the active entitlement with the latest expiration
  let latestExpiration: Date | null = null;

  for (const ent of Object.values(subscriberInfo.entitlements)) {
    if (ent.isActive && ent.expiresDate) {
      const expirationDate = new Date(ent.expiresDate);
      if (!latestExpiration || expirationDate > latestExpiration) {
        latestExpiration = expirationDate;
      }
    }
  }

  return latestExpiration;
}

// ============================================================================
// React Native / Expo Stubs
// ============================================================================

/**
 * These functions are stubs for React Native implementation
 * When building the iOS/Android app, replace with actual RevenueCat SDK calls
 */

/**
 * Initialize RevenueCat SDK (call on app start)
 * In React Native: Purchases.configure({ apiKey: REVENUECAT_API_KEY })
 */
export async function initializeRevenueCat(_userId?: string): Promise<void> {
  // Stub for React Native
  console.log('RevenueCat initialization stub - implement in React Native');
}

/**
 * Get available offerings (products)
 * In React Native: Purchases.getOfferings()
 */
export async function getOfferings(): Promise<unknown[]> {
  // Stub for React Native
  console.log('Get offerings stub - implement in React Native');
  return [];
}

/**
 * Purchase a product
 * In React Native: Purchases.purchasePackage(package)
 */
export async function purchaseProduct(
  _productId: string,
  _userId: string
): Promise<PurchaseResult> {
  // Stub for React Native
  console.log('Purchase product stub - implement in React Native');
  return { success: false, error: 'Not implemented - use React Native SDK' };
}

/**
 * Restore purchases
 * In React Native: Purchases.restorePurchases()
 */
export async function restorePurchases(_userId: string): Promise<SubscriberInfo | null> {
  // Stub for React Native
  console.log('Restore purchases stub - implement in React Native');
  return null;
}

export default {
  isRevenueCatConfigured,
  getSubscriberInfo,
  getCurrentTier,
  recordPurchaseReceipt,
  syncStripeSubscription,
  getManagementUrl,
  willSubscriptionRenew,
  getSubscriptionExpirationDate,
  initializeRevenueCat,
  getOfferings,
  purchaseProduct,
  restorePurchases,
  IAP_PRODUCT_IDS,
  ENTITLEMENTS,
};
