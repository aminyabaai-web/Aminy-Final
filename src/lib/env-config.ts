// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Environment Configuration
 *
 * Centralizes all environment variable access with proper typing and validation.
 * This module provides a single source of truth for all external service configs.
 */

// =============================================================================
// Type Definitions
// =============================================================================

interface SupabaseConfig {
  url: string;
  anonKey: string;
  projectId: string;
  isConfigured: boolean;
}

interface StripeConfig {
  publishableKey: string;
  prices: {
    starterMonthly: string;
    starterAnnual: string;
    coreMonthly: string;
    coreAnnual: string;
    proMonthly: string;
    proAnnual: string;
    proplusMonthly: string;
    proplusAnnual: string;
    initialConsult: string;
    followup: string;
    emergency: string;
    extended: string;
  };
  isConfigured: boolean;
}

interface DailyConfig {
  domain: string;
  isConfigured: boolean;
}

interface MonitoringConfig {
  sentryDsn: string;
  gaMeasurementId: string;
  isSentryConfigured: boolean;
  isGAConfigured: boolean;
}

interface AppConfig {
  name: string;
  version: string;
  useMockData: boolean;
  isDev: boolean;
  isProd: boolean;
}

// =============================================================================
// Environment Variable Helpers
// =============================================================================

const getEnv = (key: string, defaultValue = ''): string => {
  return import.meta.env[key] || defaultValue;
};

const getBoolEnv = (key: string, defaultValue = false): boolean => {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
};

// =============================================================================
// Configuration Objects
// =============================================================================

/**
 * Supabase configuration
 */
export const supabase: SupabaseConfig = (() => {
  const url = getEnv('VITE_SUPABASE_URL');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');

  // Extract project ID from URL
  const projectIdMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectId = projectIdMatch ? projectIdMatch[1] : '';

  return {
    url,
    anonKey,
    projectId,
    isConfigured: !!(url && anonKey && projectId),
  };
})();

/**
 * Stripe configuration
 */
export const stripe: StripeConfig = (() => {
  const publishableKey = getEnv('VITE_STRIPE_PUBLISHABLE_KEY');

  return {
    publishableKey,
    prices: {
      starterMonthly: getEnv('VITE_PRICE_STARTER_MONTHLY'),
      starterAnnual: getEnv('VITE_PRICE_STARTER_ANNUAL'),
      coreMonthly: getEnv('VITE_PRICE_CORE_MONTHLY'),
      coreAnnual: getEnv('VITE_PRICE_CORE_ANNUAL'),
      proMonthly: getEnv('VITE_PRICE_PRO_MONTHLY'),
      proAnnual: getEnv('VITE_PRICE_PRO_ANNUAL'),
      proplusMonthly: getEnv('VITE_PRICE_PROPLUS_MONTHLY'),
      proplusAnnual: getEnv('VITE_PRICE_PROPLUS_ANNUAL'),
      initialConsult: getEnv('VITE_PRICE_INITIAL_CONSULT'),
      followup: getEnv('VITE_PRICE_FOLLOWUP'),
      emergency: getEnv('VITE_PRICE_EMERGENCY'),
      extended: getEnv('VITE_PRICE_EXTENDED'),
    },
    isConfigured: !!(publishableKey && publishableKey.startsWith('pk_')),
  };
})();

/**
 * Daily.co video configuration
 */
export const daily: DailyConfig = (() => {
  const domain = getEnv('VITE_DAILY_DOMAIN');

  return {
    domain,
    isConfigured: !!(domain && domain.includes('.daily.co') && !domain.includes('your-domain')),
  };
})();

/**
 * Monitoring configuration (Sentry, GA)
 */
export const monitoring: MonitoringConfig = (() => {
  const sentryDsn = getEnv('VITE_SENTRY_DSN');
  const gaMeasurementId = getEnv('VITE_GA_MEASUREMENT_ID');

  return {
    sentryDsn,
    gaMeasurementId,
    isSentryConfigured: !!(sentryDsn && sentryDsn.includes('sentry.io')),
    isGAConfigured: !!(gaMeasurementId && gaMeasurementId.startsWith('G-')),
  };
})();

/**
 * App configuration
 */
export const app: AppConfig = {
  name: getEnv('VITE_APP_NAME', 'Aminy'),
  version: getEnv('VITE_APP_VERSION', '1.0.0'),
  useMockData: getBoolEnv('VITE_USE_MOCK_DATA', false),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

// =============================================================================
// Configuration Status
// =============================================================================

export interface ConfigStatus {
  supabase: boolean;
  stripe: boolean;
  daily: boolean;
  sentry: boolean;
  analytics: boolean;
  productionReady: boolean;
  issues: string[];
}

/**
 * Get overall configuration status
 */
export function getConfigStatus(): ConfigStatus {
  const issues: string[] = [];

  if (!supabase.isConfigured) {
    issues.push('Supabase not configured - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }

  if (!stripe.isConfigured) {
    issues.push('Stripe not configured - set VITE_STRIPE_PUBLISHABLE_KEY with a valid key');
  }

  if (!daily.isConfigured) {
    issues.push('Daily.co not configured - set VITE_DAILY_DOMAIN with your domain');
  }

  if (!monitoring.isSentryConfigured && app.isProd) {
    issues.push('Sentry not configured - set VITE_SENTRY_DSN for error tracking');
  }

  if (app.useMockData && app.isProd) {
    issues.push('Mock data enabled in production - set VITE_USE_MOCK_DATA=false');
  }

  return {
    supabase: supabase.isConfigured,
    stripe: stripe.isConfigured,
    daily: daily.isConfigured,
    sentry: monitoring.isSentryConfigured,
    analytics: monitoring.isGAConfigured,
    productionReady:
      supabase.isConfigured &&
      stripe.isConfigured &&
      daily.isConfigured &&
      !app.useMockData,
    issues,
  };
}

/**
 * Log configuration status (dev only)
 */
export function logConfigStatus(): void {
  if (!app.isDev) return;

  const status = getConfigStatus();

  console.group('🔧 Aminy Configuration Status');

  console.log('Supabase:', status.supabase ? '✅' : '❌');
  console.log('Stripe:', status.stripe ? '✅' : '❌');
  console.log('Daily.co:', status.daily ? '✅' : '❌');
  console.log('Sentry:', status.sentry ? '✅' : '❌');
  console.log('Analytics:', status.analytics ? '✅' : '❌');
  console.log('Production Ready:', status.productionReady ? '✅' : '❌');

  if (status.issues.length > 0) {
    console.group('⚠️ Issues');
    status.issues.forEach((issue, index) => {
      console.warn(`${index + 1}. ${issue}`);
    });
    console.groupEnd();
  }

  console.groupEnd();
}

// Export all configs as a single object for convenience
export const envConfig = {
  supabase,
  stripe,
  daily,
  monitoring,
  app,
  getStatus: getConfigStatus,
  logStatus: logConfigStatus,
};

export default envConfig;
