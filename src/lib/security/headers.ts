// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Security Headers Configuration
 * Production-grade security headers for the application
 */

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security'?: string;
}

// CSP directives for production
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite in dev, consider removing in strict prod
    'https://js.stripe.com',
    'https://maps.googleapis.com',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components/emotion
    'https://fonts.googleapis.com',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'data:',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.stripe.com',
    'https://api.anthropic.com',
    'https://*.daily.co',
    'wss://*.daily.co',
    'https://*.sentry.io',
    'https://www.google-analytics.com',
    'https://vitals.vercel-insights.com',
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://*.daily.co',
  ],
  'media-src': [
    "'self'",
    'blob:',
    'https://*.daily.co',
  ],
  'worker-src': [
    "'self'",
    'blob:',
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'upgrade-insecure-requests': [],
};

function buildCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) return directive;
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

export function getSecurityHeaders(isProduction: boolean = true): SecurityHeaders {
  const headers: SecurityHeaders = {
    'Content-Security-Policy': buildCSP(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self), payment=(self)',
  };

  // Add HSTS only in production with HTTPS
  if (isProduction) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
}

// For Vite/Vercel configuration
export function getSecurityHeadersConfig(): Record<string, { key: string; value: string }[]> {
  const headers = getSecurityHeaders(true);
  return {
    '/*': Object.entries(headers).map(([key, value]) => ({
      key,
      value: value || '',
    })),
  };
}

// Vercel.json compatible format
export function getVercelHeaders(): { source: string; headers: { key: string; value: string }[] }[] {
  const headers = getSecurityHeaders(true);
  return [
    {
      source: '/(.*)',
      headers: Object.entries(headers)
        .filter(([, value]) => value)
        .map(([key, value]) => ({
          key,
          value: value!,
        })),
    },
  ];
}
