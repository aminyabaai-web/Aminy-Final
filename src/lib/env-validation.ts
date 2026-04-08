// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Environment Variable Validation
 * Validates required environment variables on app startup
 */

interface EnvVar {
  key: string;
  required: boolean;
  description: string;
  pattern?: RegExp;
}

// Required environment variables for the frontend
const FRONTEND_ENV_VARS: EnvVar[] = [
  {
    key: 'VITE_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    // Allow any valid supabase URL format
    pattern: /^https:\/\/.*\.supabase\.co/,
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    pattern: /^eyJ/,
  },
  {
    key: 'VITE_STRIPE_PUBLISHABLE_KEY',
    required: false,
    description: 'Stripe publishable key (required for payments)',
    pattern: /^pk_(test|live)_/,
  },
  {
    key: 'VITE_DAILY_DOMAIN',
    required: false,
    description: 'Daily.co domain for video calls',
  },
];

// Optional but recommended environment variables
const OPTIONAL_ENV_VARS: EnvVar[] = [
  {
    key: 'VITE_GA_MEASUREMENT_ID',
    required: false,
    description: 'Google Analytics 4 measurement ID',
    pattern: /^G-/,
  },
  {
    key: 'VITE_SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking',
    pattern: /^https:\/\/.*\.ingest\.sentry\.io/,
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
}

/**
 * Validate frontend environment variables
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];

  // Check required variables
  for (const envVar of FRONTEND_ENV_VARS) {
    const value = import.meta.env[envVar.key];

    if (!value) {
      if (envVar.required) {
        errors.push(`Missing required env var: ${envVar.key} - ${envVar.description}`);
        missing.push(envVar.key);
      } else {
        warnings.push(`Missing optional env var: ${envVar.key} - ${envVar.description}`);
      }
      continue;
    }

    // Validate pattern if provided
    if (envVar.pattern && !envVar.pattern.test(value)) {
      errors.push(`Invalid format for ${envVar.key}: expected to match ${envVar.pattern}`);
    }
  }

  // Check optional but recommended variables
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = import.meta.env[envVar.key];
    if (!value) {
      warnings.push(`Recommended env var not set: ${envVar.key} - ${envVar.description}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missing,
  };
}

/**
 * Log validation results to console
 */
export function logEnvValidation(result: ValidationResult): void {
  const isDev = import.meta.env.DEV;

  if (!result.valid) {
    console.error('Environment validation failed:');
    result.errors.forEach((error) => console.error(`  - ${error}`));

    if (isDev) {
      console.error('\nTo fix this:');
      console.error('1. Copy env.example to .env');
      console.error('2. Fill in the required values');
      console.error('3. Restart the dev server');
    }
  }

  if (result.warnings.length > 0 && isDev) {
  }
}

/**
 * Get environment status for health check
 */
export function getEnvStatus(): {
  supabase: boolean;
  stripe: boolean;
  daily: boolean;
  analytics: boolean;
  errorTracking: boolean;
} {
  return {
    supabase: !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    stripe: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    daily: !!import.meta.env.VITE_DAILY_DOMAIN,
    analytics: !!import.meta.env.VITE_GA_MEASUREMENT_ID,
    errorTracking: !!import.meta.env.VITE_SENTRY_DSN,
  };
}

/**
 * Initialize environment validation
 * Call this at app startup
 */
export function initEnvValidation(): void {
  const result = validateEnv();
  logEnvValidation(result);

  // In production, only log errors - don't throw to prevent app crashes
  // The app should gracefully handle missing env vars
  if (!result.valid && import.meta.env.PROD) {
    console.error(`Environment validation failed: ${result.missing.join(', ')}`);
  }
}
