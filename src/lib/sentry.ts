/**
 * Sentry Error Tracking Integration
 * Provides real user monitoring and error tracking
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error tracking
 * Call this in main.tsx before rendering the app
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    if (import.meta.env.DEV) {
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `aminy@${import.meta.env.VITE_APP_VERSION || '0.1.0'}`,

    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session replay for debugging
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Filter out noisy errors
    beforeSend(event, hint) {
      // Ignore network errors that are expected (e.g., rate limits)
      const error = hint.originalException as Error;
      if (error?.message?.includes('Rate limit')) {
        return null;
      }

      // Ignore extension errors
      if (error?.message?.includes('extension')) {
        return null;
      }

      return event;
    },

    // Add custom context
    initialScope: {
      tags: {
        component: 'frontend',
      },
    },
  });

  if (import.meta.env.DEV) {
  }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  tier?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    tier: user.tier,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Capture a custom error with context
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>
): string {
  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message/event
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

/**
 * Track AI API performance
 */
export async function trackAICall<T>(
  endpoint: string,
  callFn: () => Promise<T>
): Promise<T> {
  const span = startTransaction(`AI: ${endpoint}`, 'ai.request');

  try {
    const result = await callFn();
    span?.end();
    return result;
  } catch (error) {
    span?.setStatus({ code: 2, message: 'error' });
    span?.end();
    throw error;
  }
}

/**
 * Error boundary component for React
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Profiler for component performance
 */
export const SentryProfiler = Sentry.withProfiler;
