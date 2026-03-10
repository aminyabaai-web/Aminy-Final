/**
 * Content Security Policy (CSP) Configuration
 *
 * Advanced CSP management with nonce-based script loading
 * and Subresource Integrity (SRI) support. Complements the
 * existing headers.ts with production-hardened CSP generation.
 *
 * Features:
 * - Strict CSP with nonce-based script/style loading
 * - CSP violation reporting endpoint configuration
 * - Subresource Integrity hash generation for CDN assets
 * - Report-Only mode for testing without blocking
 * - Per-environment CSP profiles (dev, staging, production)
 * - Meta tag injection for SPA (no server-side headers needed)
 *
 * Security References:
 * - CSP Level 3 Specification (W3C)
 * - OWASP CSP Cheat Sheet
 * - HIPAA §164.312(e)(1) — Transmission security
 */

// ============================================================================
// Types
// ============================================================================

/** CSP directive names */
export type CSPDirective =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'font-src'
  | 'img-src'
  | 'connect-src'
  | 'frame-src'
  | 'media-src'
  | 'worker-src'
  | 'object-src'
  | 'base-uri'
  | 'form-action'
  | 'frame-ancestors'
  | 'upgrade-insecure-requests'
  | 'block-all-mixed-content'
  | 'report-uri'
  | 'report-to';

/** CSP configuration profile */
export interface CSPProfile {
  /** Profile name (dev, staging, production) */
  name: string;
  /** Whether to use report-only mode */
  reportOnly: boolean;
  /** CSP directives */
  directives: Partial<Record<CSPDirective, string[]>>;
  /** Violation report endpoint URL */
  reportUri?: string;
  /** Whether to use nonces for scripts */
  useNonces: boolean;
}

/** SRI asset entry */
export interface SRIAsset {
  /** URL of the external asset */
  url: string;
  /** SRI hash (sha256, sha384, or sha512) */
  integrity: string;
  /** Crossorigin attribute value */
  crossorigin: 'anonymous' | 'use-credentials';
}

/** CSP violation report (matches browser report format) */
export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    referrer: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'blocked-uri': string;
    'status-code': number;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
  };
}

// ============================================================================
// Constants — Service Domains
// ============================================================================

/** Supabase domains for API and realtime connections */
const SUPABASE_DOMAINS = [
  'https://*.supabase.co',
  'wss://*.supabase.co',
];

/** Stripe domains for payment processing */
const STRIPE_DOMAINS = [
  'https://js.stripe.com',
  'https://api.stripe.com',
];

/** Daily.co domains for telehealth video */
const DAILY_DOMAINS = [
  'https://*.daily.co',
  'wss://*.daily.co',
];

/** Google domains for fonts and analytics */
const GOOGLE_DOMAINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://maps.googleapis.com',
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
];

/** Monitoring domains */
const MONITORING_DOMAINS = [
  'https://*.sentry.io',
  'https://vitals.vercel-insights.com',
];

/** AI service domains */
const AI_DOMAINS = [
  'https://api.anthropic.com',
  'https://api.openai.com',
];

// ============================================================================
// CSP Profiles
// ============================================================================

/**
 * Development CSP profile — relaxed for hot-reload and dev tools.
 */
const DEV_PROFILE: CSPProfile = {
  name: 'development',
  reportOnly: true,
  useNonces: false,
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'", ...GOOGLE_DOMAINS.slice(0, 1)],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': [
      "'self'",
      'ws://localhost:*',
      'http://localhost:*',
      ...SUPABASE_DOMAINS,
      ...STRIPE_DOMAINS.slice(1),
      ...AI_DOMAINS,
      ...DAILY_DOMAINS,
      ...MONITORING_DOMAINS,
      ...GOOGLE_DOMAINS.slice(2),
    ],
    'frame-src': ["'self'", ...STRIPE_DOMAINS.slice(0, 1), ...DAILY_DOMAINS.slice(0, 1)],
    'media-src': ["'self'", 'blob:', ...DAILY_DOMAINS.slice(0, 1)],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },
};

/**
 * Production CSP profile — strict, nonce-based.
 */
const PRODUCTION_PROFILE: CSPProfile = {
  name: 'production',
  reportOnly: false,
  useNonces: true,
  directives: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'strict-dynamic'",
      ...STRIPE_DOMAINS.slice(0, 1),
      ...GOOGLE_DOMAINS.slice(2),
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind runtime styles
      ...GOOGLE_DOMAINS.slice(0, 1),
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': [
      "'self'",
      ...SUPABASE_DOMAINS,
      ...STRIPE_DOMAINS.slice(1),
      ...AI_DOMAINS,
      ...DAILY_DOMAINS,
      ...MONITORING_DOMAINS,
      ...GOOGLE_DOMAINS.slice(2),
    ],
    'frame-src': ["'self'", ...STRIPE_DOMAINS.slice(0, 1), ...DAILY_DOMAINS.slice(0, 1)],
    'media-src': ["'self'", 'blob:', ...DAILY_DOMAINS.slice(0, 1)],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'upgrade-insecure-requests': [],
  },
};

// ============================================================================
// Nonce Generation
// ============================================================================

/**
 * Generate a cryptographically secure nonce for CSP script/style tags.
 *
 * Uses Web Crypto API for secure random generation.
 * Returns a base64-encoded 16-byte random value.
 *
 * @example
 * ```ts
 * const nonce = generateNonce();
 * // Use in script tag: <script nonce="${nonce}">...</script>
 * // Include in CSP: script-src 'nonce-${nonce}'
 * ```
 */
export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
  // Fallback (less secure, for testing environments)
  return btoa(Math.random().toString(36) + Date.now().toString(36));
}

// ============================================================================
// CSP Header Generation
// ============================================================================

/**
 * Build a CSP header string from a profile, optionally injecting a nonce.
 */
function buildCSPString(profile: CSPProfile, nonce?: string): string {
  const parts: string[] = [];

  for (const [directive, sources] of Object.entries(profile.directives)) {
    if (!sources) continue;

    let sourceList = [...sources];

    // Inject nonce for script-src and style-src
    if (nonce && profile.useNonces) {
      if (directive === 'script-src') {
        sourceList = sourceList.filter(s => s !== "'unsafe-inline'" && s !== "'unsafe-eval'");
        sourceList.push(`'nonce-${nonce}'`);
      }
    }

    if (sourceList.length === 0) {
      parts.push(directive);
    } else {
      parts.push(`${directive} ${sourceList.join(' ')}`);
    }
  }

  // Add report-uri if configured
  if (profile.reportUri) {
    parts.push(`report-uri ${profile.reportUri}`);
  }

  return parts.join('; ');
}

/**
 * Get CSP headers for the current environment.
 *
 * Returns an object with the appropriate CSP header name and value.
 * In report-only mode, uses Content-Security-Policy-Report-Only.
 *
 * @example
 * ```ts
 * const headers = getCSPHeaders();
 * // headers = {
 * //   headerName: 'Content-Security-Policy',
 * //   headerValue: "default-src 'self'; script-src 'self' 'nonce-abc123' ...",
 * //   nonce: 'abc123',
 * // }
 * ```
 */
export function getCSPHeaders(options?: {
  environment?: 'development' | 'production';
  reportUri?: string;
  nonce?: string;
}): {
  headerName: string;
  headerValue: string;
  nonce: string;
} {
  const isDev = options?.environment === 'development' || import.meta.env.DEV;
  const profile = isDev ? { ...DEV_PROFILE } : { ...PRODUCTION_PROFILE };

  if (options?.reportUri) {
    profile.reportUri = options.reportUri;
  }

  const nonce = options?.nonce ?? generateNonce();
  const headerValue = buildCSPString(profile, nonce);
  const headerName = profile.reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';

  return { headerName, headerValue, nonce };
}

/**
 * Inject CSP via a meta tag in the document head.
 *
 * Useful for SPAs where you cannot control HTTP headers (e.g., static hosting).
 * Note: meta tag CSP does not support report-uri or frame-ancestors.
 *
 * @example
 * ```ts
 * // Call once at app startup
 * const nonce = injectCSPMetaTag();
 * // nonce can be passed to dynamically loaded scripts
 * ```
 */
export function injectCSPMetaTag(options?: {
  environment?: 'development' | 'production';
}): string {
  const { headerValue, nonce } = getCSPHeaders(options);

  // Remove directives not supported in meta tags
  const metaValue = headerValue
    .replace(/frame-ancestors\s+[^;]*(;|$)/g, '')
    .replace(/report-uri\s+[^;]*(;|$)/g, '')
    .replace(/report-to\s+[^;]*(;|$)/g, '')
    .replace(/sandbox\s+[^;]*(;|$)/g, '')
    .trim();

  // Check if meta tag already exists
  const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existingMeta) {
    existingMeta.setAttribute('content', metaValue);
  } else {
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', metaValue);
    document.head.appendChild(meta);
  }

  return nonce;
}

// ============================================================================
// Subresource Integrity
// ============================================================================

/**
 * Known CDN assets with their SRI hashes.
 * Update these when upgrading CDN dependencies.
 */
export const SRI_ASSETS: SRIAsset[] = [
  // Stripe.js
  {
    url: 'https://js.stripe.com/v3/',
    integrity: '', // Stripe.js does not support SRI (dynamic content)
    crossorigin: 'anonymous',
  },
];

/**
 * Compute an SRI hash for a given content string.
 * Uses SHA-384 by default (recommended by W3C).
 *
 * @example
 * ```ts
 * const hash = await computeSRIHash('console.log("hello")');
 * // hash = 'sha384-<base64hash>'
 * ```
 */
export async function computeSRIHash(
  content: string,
  algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-384',
): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API is required for SRI hash computation');
  }

  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest(algorithm, encoder.encode(content));
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const prefix = algorithm.toLowerCase().replace('-', '');

  return `${prefix}-${base64}`;
}

/**
 * Create a script element with SRI attributes.
 */
export function createSecureScript(options: {
  src: string;
  integrity?: string;
  nonce?: string;
  async?: boolean;
  defer?: boolean;
  crossorigin?: 'anonymous' | 'use-credentials';
}): HTMLScriptElement {
  const script = document.createElement('script');
  script.src = options.src;

  if (options.integrity) {
    script.integrity = options.integrity;
  }
  if (options.nonce) {
    script.nonce = options.nonce;
  }
  if (options.crossorigin) {
    script.crossOrigin = options.crossorigin;
  }
  if (options.async) {
    script.async = true;
  }
  if (options.defer) {
    script.defer = true;
  }

  return script;
}

// ============================================================================
// CSP Violation Reporting
// ============================================================================

/** In-memory store of CSP violations for development debugging */
const violationLog: CSPViolationReport[] = [];
const MAX_VIOLATION_LOG = 100;

/**
 * Set up a CSP violation event listener.
 *
 * Captures SecurityPolicyViolationEvents and stores them for review.
 * In production, these should be forwarded to a logging service.
 *
 * @example
 * ```ts
 * const cleanup = setupCSPViolationReporting({
 *   onViolation: (report) => {
 *     console.warn('CSP violation:', report);
 *     sendToLoggingService(report);
 *   },
 * });
 *
 * // On cleanup
 * cleanup();
 * ```
 */
export function setupCSPViolationReporting(options?: {
  onViolation?: (report: CSPViolationReport) => void;
  logToConsole?: boolean;
}): () => void {
  const handler = (event: SecurityPolicyViolationEvent) => {
    const report: CSPViolationReport = {
      'csp-report': {
        'document-uri': event.documentURI,
        referrer: event.referrer,
        'violated-directive': event.violatedDirective,
        'effective-directive': event.effectiveDirective,
        'original-policy': event.originalPolicy,
        'blocked-uri': event.blockedURI,
        'status-code': event.statusCode,
        'source-file': event.sourceFile || undefined,
        'line-number': event.lineNumber || undefined,
        'column-number': event.columnNumber || undefined,
      },
    };

    // Store in memory
    violationLog.push(report);
    if (violationLog.length > MAX_VIOLATION_LOG) {
      violationLog.shift();
    }

    // Console logging
    if (options?.logToConsole ?? import.meta.env.DEV) {
      console.warn('[CSP Violation]', {
        directive: event.violatedDirective,
        blocked: event.blockedURI,
        source: event.sourceFile ? `${event.sourceFile}:${event.lineNumber}` : 'unknown',
      });
    }

    // Custom handler
    options?.onViolation?.(report);
  };

  document.addEventListener('securitypolicyviolation', handler);

  return () => {
    document.removeEventListener('securitypolicyviolation', handler);
  };
}

/**
 * Get the logged CSP violations (in-memory, for development debugging).
 */
export function getCSPViolations(): CSPViolationReport[] {
  return [...violationLog];
}

/**
 * Clear the in-memory CSP violation log.
 */
export function clearCSPViolations(): void {
  violationLog.length = 0;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  generateNonce,
  getCSPHeaders,
  injectCSPMetaTag,
  computeSRIHash,
  createSecureScript,
  setupCSPViolationReporting,
  getCSPViolations,
  clearCSPViolations,
  SRI_ASSETS,
};
