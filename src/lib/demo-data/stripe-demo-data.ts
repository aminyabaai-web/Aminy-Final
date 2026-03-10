/**
 * Stripe Demo Data
 *
 * Mock product catalog, subscriptions, invoices, payment methods,
 * and revenue metrics for populating the Stripe-related screens
 * (pricing, revenue dashboard, billing history, subscription management)
 * during development and demo presentations.
 *
 * Pricing tiers aligned with tier-utils.ts:
 * - Free: $0
 * - Core: $14.99/mo | $129/yr
 * - Pro: $29.99/mo | $279/yr
 * - Pro+ Family Plan: $49.99/mo | $479/yr
 * - Enterprise: custom
 */

// ============================================================================
// Types
// ============================================================================

export type ProductTier = 'free' | 'essential' | 'premium' | 'family_plus' | 'enterprise';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';

export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'void' | 'refunded';

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover';

export interface DemoProduct {
  id: string;
  name: string;
  tier: ProductTier;
  description: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  yearlyMonthlyCents: number; // Monthly equivalent when billed yearly
  features: string[];
  limits: {
    aiMessagesPerDay: number | null; // null = unlimited
    childProfiles: number | null;
    telehealthMinutesPerMonth: number | null;
    vaultDocuments: number | null;
  };
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  isPopular: boolean;
  badge?: string;
  sortOrder: number;
}

export interface DemoSubscription {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  productId: string;
  productName: string;
  tier: ProductTier;
  status: SubscriptionStatus;
  interval: 'month' | 'year';
  amountCents: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  canceledAt?: string;
  pausedAt?: string;
  createdAt: string;
  paymentMethodId: string;
}

export interface DemoInvoice {
  id: string;
  stripeInvoiceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  subscriptionId: string;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  description: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  failedAt?: string;
  attemptCount: number;
  invoicePdfUrl: string;
  createdAt: string;
}

export interface DemoPaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  cardholderName: string;
  createdAt: string;
}

export interface MonthlyRevenueData {
  month: string; // YYYY-MM
  label: string; // "Jan 2026"
  mrr: number; // Monthly Recurring Revenue in dollars
  arr: number; // Annualized
  totalRevenue: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
  activeSubscriptions: number;
  churnRate: number; // percentage
  arpu: number; // Average Revenue Per User
  subscriptionsByTier: Record<ProductTier, number>;
}

// ============================================================================
// Demo Products (5 tiers matching Aminy pricing)
// ============================================================================

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: 'prod-demo-free',
    name: 'Free',
    tier: 'free',
    description: 'Get started with basic screening and limited resources',
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    yearlyMonthlyCents: 0,
    features: [
      'Developmental screening tool',
      'Limited resource library (10 articles)',
      'Community forum access (read-only)',
      'Basic milestone tracker',
      '3 AI chat messages per day',
    ],
    limits: {
      aiMessagesPerDay: 3,
      childProfiles: 1,
      telehealthMinutesPerMonth: 0,
      vaultDocuments: 5,
    },
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    isPopular: false,
    sortOrder: 0,
  },
  {
    id: 'prod-demo-essential',
    name: 'Core',
    tier: 'essential',
    description: 'Everything you need to support your child\'s development',
    monthlyPriceCents: 1499,
    yearlyPriceCents: 12900,
    yearlyMonthlyCents: 1075,
    features: [
      'Unlimited AI chat with Aminy',
      'Adaptive daily care plans',
      '2 telehealth sessions per month',
      'Full resource library',
      'Community forum (full access)',
      'Document vault (50 docs)',
      'Progress tracking & reports',
      '7-day free trial',
    ],
    limits: {
      aiMessagesPerDay: null,
      childProfiles: 2,
      telehealthMinutesPerMonth: 120,
      vaultDocuments: 50,
    },
    stripePriceIdMonthly: 'price_test_core_monthly',
    stripePriceIdYearly: 'price_test_core_yearly',
    isPopular: true,
    badge: 'Most Popular',
    sortOrder: 1,
  },
  {
    id: 'prod-demo-premium',
    name: 'Pro',
    tier: 'premium',
    description: 'Advanced support with BCBA oversight and unlimited telehealth',
    monthlyPriceCents: 2999,
    yearlyPriceCents: 27900,
    yearlyMonthlyCents: 2325,
    features: [
      'Everything in Core',
      'Unlimited telehealth sessions',
      'BCBA oversight & consultation',
      'Junior adaptive activities',
      'Advanced analytics dashboard',
      'Document vault (200 docs)',
      'Priority provider matching',
      'Care team coordination',
    ],
    limits: {
      aiMessagesPerDay: null,
      childProfiles: 3,
      telehealthMinutesPerMonth: null,
      vaultDocuments: 200,
    },
    stripePriceIdMonthly: 'price_test_pro_monthly',
    stripePriceIdYearly: 'price_test_pro_yearly',
    isPopular: false,
    badge: 'Best Value',
    sortOrder: 2,
  },
  {
    id: 'prod-demo-family',
    name: 'Family Plan',
    tier: 'family_plus',
    description: 'Complete family support with multi-child access and ABA supervision',
    monthlyPriceCents: 4999,
    yearlyPriceCents: 47900,
    yearlyMonthlyCents: 3992,
    features: [
      'Everything in Pro',
      'Unlimited child profiles',
      'Priority scheduling',
      'Direct ABA supervision hours',
      'Insurance claim assistance',
      'Unlimited document vault',
      'Dedicated care coordinator',
      'Family wellness dashboard',
      'Sibling session bundling',
    ],
    limits: {
      aiMessagesPerDay: null,
      childProfiles: null,
      telehealthMinutesPerMonth: null,
      vaultDocuments: null,
    },
    stripePriceIdMonthly: 'price_test_proplus_monthly',
    stripePriceIdYearly: 'price_test_proplus_yearly',
    isPopular: false,
    sortOrder: 3,
  },
  {
    id: 'prod-demo-enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    description: 'Custom pricing for clinics, schools, and organizations',
    monthlyPriceCents: 0, // Custom
    yearlyPriceCents: 0, // Custom
    yearlyMonthlyCents: 0,
    features: [
      'Everything in Family Plan',
      'Custom seat-based pricing',
      'White-label portal',
      'CentralReach integration',
      'HIPAA BAA included',
      'Dedicated account manager',
      'Custom reporting & analytics',
      'SSO / SAML authentication',
      'API access',
      'SLA guarantee',
    ],
    limits: {
      aiMessagesPerDay: null,
      childProfiles: null,
      telehealthMinutesPerMonth: null,
      vaultDocuments: null,
    },
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    isPopular: false,
    badge: 'Contact Sales',
    sortOrder: 4,
  },
];

// ============================================================================
// Demo Subscriptions (10 sample records)
// ============================================================================

export const DEMO_SUBSCRIPTIONS: DemoSubscription[] = [
  {
    id: 'sub-demo-001',
    userId: 'user-demo-001',
    userEmail: 'maria.chen@demo-aminy.test',
    userName: 'Maria Chen',
    stripeSubscriptionId: 'sub_test_1aB2cD3eF4',
    stripeCustomerId: 'cus_test_Abc123',
    productId: 'prod-demo-premium',
    productName: 'Pro',
    tier: 'premium',
    status: 'active',
    interval: 'month',
    amountCents: 2999,
    currency: 'usd',
    currentPeriodStart: '2026-03-01',
    currentPeriodEnd: '2026-04-01',
    cancelAtPeriodEnd: false,
    createdAt: '2025-10-15',
    paymentMethodId: 'pm-demo-001',
  },
  {
    id: 'sub-demo-002',
    userId: 'user-demo-002',
    userEmail: 'james.w@demo-aminy.test',
    userName: 'James Williams',
    stripeSubscriptionId: 'sub_test_2bC3dE4fG5',
    stripeCustomerId: 'cus_test_Def456',
    productId: 'prod-demo-family',
    productName: 'Family Plan',
    tier: 'family_plus',
    status: 'active',
    interval: 'year',
    amountCents: 47900,
    currency: 'usd',
    currentPeriodStart: '2026-01-15',
    currentPeriodEnd: '2027-01-15',
    cancelAtPeriodEnd: false,
    createdAt: '2025-07-15',
    paymentMethodId: 'pm-demo-002',
  },
  {
    id: 'sub-demo-003',
    userId: 'user-demo-003',
    userEmail: 'aisha.m@demo-aminy.test',
    userName: 'Aisha Mohammed',
    stripeSubscriptionId: 'sub_test_3cD4eF5gH6',
    stripeCustomerId: 'cus_test_Ghi789',
    productId: 'prod-demo-essential',
    productName: 'Core',
    tier: 'essential',
    status: 'active',
    interval: 'month',
    amountCents: 1499,
    currency: 'usd',
    currentPeriodStart: '2026-03-05',
    currentPeriodEnd: '2026-04-05',
    cancelAtPeriodEnd: false,
    createdAt: '2026-01-05',
    paymentMethodId: 'pm-demo-003',
  },
  {
    id: 'sub-demo-004',
    userId: 'user-demo-004',
    userEmail: 'robert.t@demo-aminy.test',
    userName: 'Robert Taylor',
    stripeSubscriptionId: 'sub_test_4dE5fG6hI7',
    stripeCustomerId: 'cus_test_Jkl012',
    productId: 'prod-demo-essential',
    productName: 'Core',
    tier: 'essential',
    status: 'past_due',
    interval: 'month',
    amountCents: 1499,
    currency: 'usd',
    currentPeriodStart: '2026-02-20',
    currentPeriodEnd: '2026-03-20',
    cancelAtPeriodEnd: false,
    createdAt: '2025-11-20',
    paymentMethodId: 'pm-demo-004',
  },
  {
    id: 'sub-demo-005',
    userId: 'user-demo-005',
    userEmail: 'lisa.g@demo-aminy.test',
    userName: 'Lisa Garcia',
    stripeSubscriptionId: 'sub_test_5eF6gH7iJ8',
    stripeCustomerId: 'cus_test_Mno345',
    productId: 'prod-demo-premium',
    productName: 'Pro',
    tier: 'premium',
    status: 'canceled',
    interval: 'month',
    amountCents: 2999,
    currency: 'usd',
    currentPeriodStart: '2026-02-01',
    currentPeriodEnd: '2026-03-01',
    cancelAtPeriodEnd: true,
    canceledAt: '2026-02-15',
    createdAt: '2025-08-01',
    paymentMethodId: 'pm-demo-005',
  },
  {
    id: 'sub-demo-006',
    userId: 'user-demo-006',
    userEmail: 'kenji.n@demo-aminy.test',
    userName: 'Kenji Nakamura',
    stripeSubscriptionId: 'sub_test_6fG7hI8jK9',
    stripeCustomerId: 'cus_test_Pqr678',
    productId: 'prod-demo-essential',
    productName: 'Core',
    tier: 'essential',
    status: 'trialing',
    interval: 'month',
    amountCents: 1499,
    currency: 'usd',
    currentPeriodStart: '2026-03-08',
    currentPeriodEnd: '2026-04-08',
    cancelAtPeriodEnd: false,
    trialEnd: '2026-03-15',
    createdAt: '2026-03-08',
    paymentMethodId: 'pm-demo-001',
  },
  {
    id: 'sub-demo-007',
    userId: 'user-demo-007',
    userEmail: 'sarah.f@demo-aminy.test',
    userName: 'Sarah Foster',
    stripeSubscriptionId: 'sub_test_7gH8iJ9kL0',
    stripeCustomerId: 'cus_test_Stu901',
    productId: 'prod-demo-premium',
    productName: 'Pro',
    tier: 'premium',
    status: 'active',
    interval: 'year',
    amountCents: 27900,
    currency: 'usd',
    currentPeriodStart: '2025-12-01',
    currentPeriodEnd: '2026-12-01',
    cancelAtPeriodEnd: false,
    createdAt: '2025-12-01',
    paymentMethodId: 'pm-demo-002',
  },
  {
    id: 'sub-demo-008',
    userId: 'user-demo-008',
    userEmail: 'david.l@demo-aminy.test',
    userName: 'David Lee',
    stripeSubscriptionId: 'sub_test_8hI9jK0lM1',
    stripeCustomerId: 'cus_test_Vwx234',
    productId: 'prod-demo-family',
    productName: 'Family Plan',
    tier: 'family_plus',
    status: 'active',
    interval: 'month',
    amountCents: 4999,
    currency: 'usd',
    currentPeriodStart: '2026-03-01',
    currentPeriodEnd: '2026-04-01',
    cancelAtPeriodEnd: false,
    createdAt: '2025-09-01',
    paymentMethodId: 'pm-demo-003',
  },
  {
    id: 'sub-demo-009',
    userId: 'user-demo-009',
    userEmail: 'emma.r@demo-aminy.test',
    userName: 'Emma Robinson',
    stripeSubscriptionId: 'sub_test_9iJ0kL1mN2',
    stripeCustomerId: 'cus_test_Yza567',
    productId: 'prod-demo-essential',
    productName: 'Core',
    tier: 'essential',
    status: 'trialing',
    interval: 'month',
    amountCents: 1499,
    currency: 'usd',
    currentPeriodStart: '2026-03-09',
    currentPeriodEnd: '2026-04-09',
    cancelAtPeriodEnd: false,
    trialEnd: '2026-03-16',
    createdAt: '2026-03-09',
    paymentMethodId: 'pm-demo-004',
  },
  {
    id: 'sub-demo-010',
    userId: 'user-demo-010',
    userEmail: 'carlos.h@demo-aminy.test',
    userName: 'Carlos Hernandez',
    stripeSubscriptionId: 'sub_test_0jK1lM2nO3',
    stripeCustomerId: 'cus_test_Bcd890',
    productId: 'prod-demo-essential',
    productName: 'Core',
    tier: 'essential',
    status: 'paused',
    interval: 'month',
    amountCents: 1499,
    currency: 'usd',
    currentPeriodStart: '2026-02-10',
    currentPeriodEnd: '2026-03-10',
    cancelAtPeriodEnd: false,
    pausedAt: '2026-02-25',
    createdAt: '2025-12-10',
    paymentMethodId: 'pm-demo-005',
  },
];

// ============================================================================
// Demo Invoices (20 sample records)
// ============================================================================

export const DEMO_INVOICES: DemoInvoice[] = [
  // Maria Chen — Pro monthly
  {
    id: 'inv-demo-001',
    stripeInvoiceId: 'in_test_001',
    userId: 'user-demo-001',
    userName: 'Maria Chen',
    userEmail: 'maria.chen@demo-aminy.test',
    subscriptionId: 'sub-demo-001',
    amountCents: 2999,
    currency: 'usd',
    status: 'paid',
    description: 'Pro — March 2026',
    periodStart: '2026-03-01',
    periodEnd: '2026-04-01',
    paidAt: '2026-03-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-03-01',
  },
  {
    id: 'inv-demo-002',
    stripeInvoiceId: 'in_test_002',
    userId: 'user-demo-001',
    userName: 'Maria Chen',
    userEmail: 'maria.chen@demo-aminy.test',
    subscriptionId: 'sub-demo-001',
    amountCents: 2999,
    currency: 'usd',
    status: 'paid',
    description: 'Pro — February 2026',
    periodStart: '2026-02-01',
    periodEnd: '2026-03-01',
    paidAt: '2026-02-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-02-01',
  },
  {
    id: 'inv-demo-003',
    stripeInvoiceId: 'in_test_003',
    userId: 'user-demo-001',
    userName: 'Maria Chen',
    userEmail: 'maria.chen@demo-aminy.test',
    subscriptionId: 'sub-demo-001',
    amountCents: 2999,
    currency: 'usd',
    status: 'paid',
    description: 'Pro — January 2026',
    periodStart: '2026-01-01',
    periodEnd: '2026-02-01',
    paidAt: '2026-01-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-01-01',
  },
  // James Williams — Family Plan yearly
  {
    id: 'inv-demo-004',
    stripeInvoiceId: 'in_test_004',
    userId: 'user-demo-002',
    userName: 'James Williams',
    userEmail: 'james.w@demo-aminy.test',
    subscriptionId: 'sub-demo-002',
    amountCents: 47900,
    currency: 'usd',
    status: 'paid',
    description: 'Family Plan — Annual (Jan 2026 - Jan 2027)',
    periodStart: '2026-01-15',
    periodEnd: '2027-01-15',
    paidAt: '2026-01-15',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-01-15',
  },
  // Aisha Mohammed — Core monthly
  {
    id: 'inv-demo-005',
    stripeInvoiceId: 'in_test_005',
    userId: 'user-demo-003',
    userName: 'Aisha Mohammed',
    userEmail: 'aisha.m@demo-aminy.test',
    subscriptionId: 'sub-demo-003',
    amountCents: 1499,
    currency: 'usd',
    status: 'paid',
    description: 'Core — March 2026',
    periodStart: '2026-03-05',
    periodEnd: '2026-04-05',
    paidAt: '2026-03-05',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-03-05',
  },
  {
    id: 'inv-demo-006',
    stripeInvoiceId: 'in_test_006',
    userId: 'user-demo-003',
    userName: 'Aisha Mohammed',
    userEmail: 'aisha.m@demo-aminy.test',
    subscriptionId: 'sub-demo-003',
    amountCents: 1499,
    currency: 'usd',
    status: 'paid',
    description: 'Core — February 2026',
    periodStart: '2026-02-05',
    periodEnd: '2026-03-05',
    paidAt: '2026-02-05',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-02-05',
  },
  // Robert Taylor — Core past_due
  {
    id: 'inv-demo-007',
    stripeInvoiceId: 'in_test_007',
    userId: 'user-demo-004',
    userName: 'Robert Taylor',
    userEmail: 'robert.t@demo-aminy.test',
    subscriptionId: 'sub-demo-004',
    amountCents: 1499,
    currency: 'usd',
    status: 'failed',
    description: 'Core — March 2026',
    periodStart: '2026-02-20',
    periodEnd: '2026-03-20',
    failedAt: '2026-02-20',
    attemptCount: 3,
    invoicePdfUrl: '#',
    createdAt: '2026-02-20',
  },
  {
    id: 'inv-demo-008',
    stripeInvoiceId: 'in_test_008',
    userId: 'user-demo-004',
    userName: 'Robert Taylor',
    userEmail: 'robert.t@demo-aminy.test',
    subscriptionId: 'sub-demo-004',
    amountCents: 1499,
    currency: 'usd',
    status: 'paid',
    description: 'Core — February 2026',
    periodStart: '2026-01-20',
    periodEnd: '2026-02-20',
    paidAt: '2026-01-20',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-01-20',
  },
  // Lisa Garcia — Pro canceled
  {
    id: 'inv-demo-009',
    stripeInvoiceId: 'in_test_009',
    userId: 'user-demo-005',
    userName: 'Lisa Garcia',
    userEmail: 'lisa.g@demo-aminy.test',
    subscriptionId: 'sub-demo-005',
    amountCents: 2999,
    currency: 'usd',
    status: 'paid',
    description: 'Pro — February 2026 (Final)',
    periodStart: '2026-02-01',
    periodEnd: '2026-03-01',
    paidAt: '2026-02-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-02-01',
  },
  {
    id: 'inv-demo-010',
    stripeInvoiceId: 'in_test_010',
    userId: 'user-demo-005',
    userName: 'Lisa Garcia',
    userEmail: 'lisa.g@demo-aminy.test',
    subscriptionId: 'sub-demo-005',
    amountCents: 2999,
    currency: 'usd',
    status: 'paid',
    description: 'Pro — January 2026',
    periodStart: '2026-01-01',
    periodEnd: '2026-02-01',
    paidAt: '2026-01-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-01-01',
  },
  // Sarah Foster — Pro yearly
  {
    id: 'inv-demo-011',
    stripeInvoiceId: 'in_test_011',
    userId: 'user-demo-007',
    userName: 'Sarah Foster',
    userEmail: 'sarah.f@demo-aminy.test',
    subscriptionId: 'sub-demo-007',
    amountCents: 27900,
    currency: 'usd',
    status: 'paid',
    description: 'Pro — Annual (Dec 2025 - Dec 2026)',
    periodStart: '2025-12-01',
    periodEnd: '2026-12-01',
    paidAt: '2025-12-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2025-12-01',
  },
  // David Lee — Family Plan monthly
  {
    id: 'inv-demo-012',
    stripeInvoiceId: 'in_test_012',
    userId: 'user-demo-008',
    userName: 'David Lee',
    userEmail: 'david.l@demo-aminy.test',
    subscriptionId: 'sub-demo-008',
    amountCents: 4999,
    currency: 'usd',
    status: 'paid',
    description: 'Family Plan — March 2026',
    periodStart: '2026-03-01',
    periodEnd: '2026-04-01',
    paidAt: '2026-03-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-03-01',
  },
  {
    id: 'inv-demo-013',
    stripeInvoiceId: 'in_test_013',
    userId: 'user-demo-008',
    userName: 'David Lee',
    userEmail: 'david.l@demo-aminy.test',
    subscriptionId: 'sub-demo-008',
    amountCents: 4999,
    currency: 'usd',
    status: 'paid',
    description: 'Family Plan — February 2026',
    periodStart: '2026-02-01',
    periodEnd: '2026-03-01',
    paidAt: '2026-02-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-02-01',
  },
  {
    id: 'inv-demo-014',
    stripeInvoiceId: 'in_test_014',
    userId: 'user-demo-008',
    userName: 'David Lee',
    userEmail: 'david.l@demo-aminy.test',
    subscriptionId: 'sub-demo-008',
    amountCents: 4999,
    currency: 'usd',
    status: 'paid',
    description: 'Family Plan — January 2026',
    periodStart: '2026-01-01',
    periodEnd: '2026-02-01',
    paidAt: '2026-01-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-01-01',
  },
  // Carlos Hernandez — Core paused
  {
    id: 'inv-demo-015',
    stripeInvoiceId: 'in_test_015',
    userId: 'user-demo-010',
    userName: 'Carlos Hernandez',
    userEmail: 'carlos.h@demo-aminy.test',
    subscriptionId: 'sub-demo-010',
    amountCents: 1499,
    currency: 'usd',
    status: 'paid',
    description: 'Core — February 2026',
    periodStart: '2026-02-10',
    periodEnd: '2026-03-10',
    paidAt: '2026-02-10',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-02-10',
  },
  {
    id: 'inv-demo-016',
    stripeInvoiceId: 'in_test_016',
    userId: 'user-demo-010',
    userName: 'Carlos Hernandez',
    userEmail: 'carlos.h@demo-aminy.test',
    subscriptionId: 'sub-demo-010',
    amountCents: 1499,
    currency: 'usd',
    status: 'paid',
    description: 'Core — January 2026',
    periodStart: '2026-01-10',
    periodEnd: '2026-02-10',
    paidAt: '2026-01-10',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2026-01-10',
  },
  // More varied invoices
  {
    id: 'inv-demo-017',
    stripeInvoiceId: 'in_test_017',
    userId: 'user-demo-001',
    userName: 'Maria Chen',
    userEmail: 'maria.chen@demo-aminy.test',
    subscriptionId: 'sub-demo-001',
    amountCents: 2999,
    currency: 'usd',
    status: 'paid',
    description: 'Pro — December 2025',
    periodStart: '2025-12-01',
    periodEnd: '2026-01-01',
    paidAt: '2025-12-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2025-12-01',
  },
  {
    id: 'inv-demo-018',
    stripeInvoiceId: 'in_test_018',
    userId: 'user-demo-001',
    userName: 'Maria Chen',
    userEmail: 'maria.chen@demo-aminy.test',
    subscriptionId: 'sub-demo-001',
    amountCents: 2999,
    currency: 'usd',
    status: 'paid',
    description: 'Pro — November 2025',
    periodStart: '2025-11-01',
    periodEnd: '2025-12-01',
    paidAt: '2025-11-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2025-11-01',
  },
  {
    id: 'inv-demo-019',
    stripeInvoiceId: 'in_test_019',
    userId: 'user-demo-008',
    userName: 'David Lee',
    userEmail: 'david.l@demo-aminy.test',
    subscriptionId: 'sub-demo-008',
    amountCents: 4999,
    currency: 'usd',
    status: 'paid',
    description: 'Family Plan — December 2025',
    periodStart: '2025-12-01',
    periodEnd: '2026-01-01',
    paidAt: '2025-12-01',
    attemptCount: 1,
    invoicePdfUrl: '#',
    createdAt: '2025-12-01',
  },
  {
    id: 'inv-demo-020',
    stripeInvoiceId: 'in_test_020',
    userId: 'user-demo-003',
    userName: 'Aisha Mohammed',
    userEmail: 'aisha.m@demo-aminy.test',
    subscriptionId: 'sub-demo-003',
    amountCents: 1499,
    currency: 'usd',
    status: 'pending',
    description: 'Core — April 2026 (Upcoming)',
    periodStart: '2026-04-05',
    periodEnd: '2026-05-05',
    attemptCount: 0,
    invoicePdfUrl: '#',
    createdAt: '2026-03-10',
  },
];

// ============================================================================
// Demo Payment Methods (5 mock cards)
// ============================================================================

export const DEMO_PAYMENT_METHODS: DemoPaymentMethod[] = [
  {
    id: 'pm-demo-001',
    userId: 'user-demo-001',
    stripePaymentMethodId: 'pm_test_visa4242',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2028,
    isDefault: true,
    cardholderName: 'Maria Chen',
    createdAt: '2025-10-15',
  },
  {
    id: 'pm-demo-002',
    userId: 'user-demo-002',
    stripePaymentMethodId: 'pm_test_mc5555',
    brand: 'mastercard',
    last4: '5555',
    expMonth: 8,
    expYear: 2027,
    isDefault: true,
    cardholderName: 'James Williams',
    createdAt: '2025-07-15',
  },
  {
    id: 'pm-demo-003',
    userId: 'user-demo-003',
    stripePaymentMethodId: 'pm_test_amex0005',
    brand: 'amex',
    last4: '0005',
    expMonth: 3,
    expYear: 2029,
    isDefault: true,
    cardholderName: 'Aisha Mohammed',
    createdAt: '2026-01-05',
  },
  {
    id: 'pm-demo-004',
    userId: 'user-demo-004',
    stripePaymentMethodId: 'pm_test_visa1881',
    brand: 'visa',
    last4: '1881',
    expMonth: 1,
    expYear: 2026, // Expired — causes past_due
    isDefault: true,
    cardholderName: 'Robert Taylor',
    createdAt: '2025-11-20',
  },
  {
    id: 'pm-demo-005',
    userId: 'user-demo-005',
    stripePaymentMethodId: 'pm_test_disc6011',
    brand: 'discover',
    last4: '6011',
    expMonth: 6,
    expYear: 2028,
    isDefault: true,
    cardholderName: 'Lisa Garcia',
    createdAt: '2025-08-01',
  },
];

// ============================================================================
// Demo Revenue Metrics (12 months of data)
// ============================================================================

export const DEMO_REVENUE_METRICS: MonthlyRevenueData[] = [
  {
    month: '2025-04',
    label: 'Apr 2025',
    mrr: 824,
    arr: 9888,
    totalRevenue: 824,
    newSubscriptions: 12,
    canceledSubscriptions: 1,
    activeSubscriptions: 12,
    churnRate: 0,
    arpu: 68.67,
    subscriptionsByTier: { free: 25, essential: 8, premium: 3, family_plus: 1, enterprise: 0 },
  },
  {
    month: '2025-05',
    label: 'May 2025',
    mrr: 1348,
    arr: 16176,
    totalRevenue: 1348,
    newSubscriptions: 9,
    canceledSubscriptions: 1,
    activeSubscriptions: 20,
    churnRate: 5.0,
    arpu: 67.40,
    subscriptionsByTier: { free: 38, essential: 13, premium: 5, family_plus: 2, enterprise: 0 },
  },
  {
    month: '2025-06',
    label: 'Jun 2025',
    mrr: 1997,
    arr: 23964,
    totalRevenue: 1997,
    newSubscriptions: 14,
    canceledSubscriptions: 2,
    activeSubscriptions: 32,
    churnRate: 6.3,
    arpu: 62.41,
    subscriptionsByTier: { free: 52, essential: 20, premium: 8, family_plus: 4, enterprise: 0 },
  },
  {
    month: '2025-07',
    label: 'Jul 2025',
    mrr: 2846,
    arr: 34152,
    totalRevenue: 2846,
    newSubscriptions: 18,
    canceledSubscriptions: 3,
    activeSubscriptions: 47,
    churnRate: 6.4,
    arpu: 60.55,
    subscriptionsByTier: { free: 68, essential: 28, premium: 12, family_plus: 7, enterprise: 0 },
  },
  {
    month: '2025-08',
    label: 'Aug 2025',
    mrr: 3694,
    arr: 44328,
    totalRevenue: 3694,
    newSubscriptions: 15,
    canceledSubscriptions: 2,
    activeSubscriptions: 60,
    churnRate: 4.3,
    arpu: 61.57,
    subscriptionsByTier: { free: 85, essential: 35, premium: 16, family_plus: 9, enterprise: 0 },
  },
  {
    month: '2025-09',
    label: 'Sep 2025',
    mrr: 4742,
    arr: 56904,
    totalRevenue: 4742,
    newSubscriptions: 20,
    canceledSubscriptions: 4,
    activeSubscriptions: 76,
    churnRate: 5.3,
    arpu: 62.39,
    subscriptionsByTier: { free: 102, essential: 42, premium: 22, family_plus: 12, enterprise: 0 },
  },
  {
    month: '2025-10',
    label: 'Oct 2025',
    mrr: 5891,
    arr: 70692,
    totalRevenue: 5891,
    newSubscriptions: 22,
    canceledSubscriptions: 3,
    activeSubscriptions: 95,
    churnRate: 3.9,
    arpu: 62.01,
    subscriptionsByTier: { free: 120, essential: 50, premium: 28, family_plus: 15, enterprise: 2 },
  },
  {
    month: '2025-11',
    label: 'Nov 2025',
    mrr: 6843,
    arr: 82116,
    totalRevenue: 6843,
    newSubscriptions: 17,
    canceledSubscriptions: 4,
    activeSubscriptions: 108,
    churnRate: 4.2,
    arpu: 63.36,
    subscriptionsByTier: { free: 135, essential: 56, premium: 32, family_plus: 18, enterprise: 2 },
  },
  {
    month: '2025-12',
    label: 'Dec 2025',
    mrr: 7492,
    arr: 89904,
    totalRevenue: 7492,
    newSubscriptions: 12,
    canceledSubscriptions: 5,
    activeSubscriptions: 115,
    churnRate: 4.6,
    arpu: 65.15,
    subscriptionsByTier: { free: 148, essential: 58, premium: 35, family_plus: 20, enterprise: 2 },
  },
  {
    month: '2026-01',
    label: 'Jan 2026',
    mrr: 8641,
    arr: 103692,
    totalRevenue: 8641,
    newSubscriptions: 25,
    canceledSubscriptions: 6,
    activeSubscriptions: 134,
    churnRate: 5.2,
    arpu: 64.49,
    subscriptionsByTier: { free: 165, essential: 70, premium: 38, family_plus: 23, enterprise: 3 },
  },
  {
    month: '2026-02',
    label: 'Feb 2026',
    mrr: 9788,
    arr: 117456,
    totalRevenue: 9788,
    newSubscriptions: 21,
    canceledSubscriptions: 4,
    activeSubscriptions: 151,
    churnRate: 3.0,
    arpu: 64.82,
    subscriptionsByTier: { free: 180, essential: 78, premium: 43, family_plus: 27, enterprise: 3 },
  },
  {
    month: '2026-03',
    label: 'Mar 2026',
    mrr: 10942,
    arr: 131304,
    totalRevenue: 10942,
    newSubscriptions: 19,
    canceledSubscriptions: 3,
    activeSubscriptions: 167,
    churnRate: 2.0,
    arpu: 65.52,
    subscriptionsByTier: { free: 198, essential: 85, premium: 48, family_plus: 30, enterprise: 4 },
  },
];

// ============================================================================
// Utility Helpers
// ============================================================================

/** Get product by tier */
export function getDemoProductByTier(tier: ProductTier): DemoProduct | undefined {
  return DEMO_PRODUCTS.find((p) => p.tier === tier);
}

/** Get subscriptions by status */
export function getDemoSubscriptionsByStatus(status: SubscriptionStatus): DemoSubscription[] {
  return DEMO_SUBSCRIPTIONS.filter((s) => s.status === status);
}

/** Get invoices for a specific user */
export function getDemoInvoicesByUser(userId: string): DemoInvoice[] {
  return DEMO_INVOICES.filter((i) => i.userId === userId);
}

/** Get the latest revenue metrics */
export function getLatestRevenueMetrics(): MonthlyRevenueData {
  return DEMO_REVENUE_METRICS[DEMO_REVENUE_METRICS.length - 1];
}

/** Get MRR growth percentage (month-over-month) */
export function getDemoMRRGrowth(): { amount: number; percent: number } {
  const current = DEMO_REVENUE_METRICS[DEMO_REVENUE_METRICS.length - 1];
  const previous = DEMO_REVENUE_METRICS[DEMO_REVENUE_METRICS.length - 2];
  const amount = current.mrr - previous.mrr;
  const percent = previous.mrr > 0 ? ((amount / previous.mrr) * 100) : 0;
  return { amount, percent: Math.round(percent * 10) / 10 };
}

/** Get subscription count summary */
export function getDemoSubscriptionSummary(): Record<SubscriptionStatus, number> {
  return DEMO_SUBSCRIPTIONS.reduce(
    (acc, s) => {
      acc[s.status]++;
      return acc;
    },
    { active: 0, past_due: 0, canceled: 0, trialing: 0, paused: 0 } as Record<SubscriptionStatus, number>,
  );
}

/** Format cents to dollar string */
export function formatCentsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
