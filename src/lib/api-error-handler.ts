// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * API Error Handler
 *
 * Provides consistent, user-friendly error handling across the app.
 * Emphasizes warm, empathetic messaging that passes the "exhale test."
 */

export type ApiErrorType =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'rate-limit'
  | 'validation'
  | 'not-found'
  | 'server'
  | 'unknown';

export interface ApiError {
  type: ApiErrorType;
  message: string;        // User-friendly message (warm, empathetic)
  technicalMessage: string; // For logging/debugging
  retryable: boolean;
  retryAfter?: number;    // Seconds until retry (for rate limits)
  code?: string;
}

// User-friendly error messages that pass the "exhale test"
const ERROR_MESSAGES: Record<ApiErrorType, { primary: string; secondary: string }> = {
  network: {
    primary: "We're having trouble connecting",
    secondary: "Check your internet and we'll try again together."
  },
  timeout: {
    primary: "That took longer than expected",
    secondary: "Let's give it another try — sometimes things just need a moment."
  },
  auth: {
    primary: "We need you to sign in again",
    secondary: "Your session may have expired. No worries, it happens!"
  },
  'rate-limit': {
    primary: "You're moving fast!",
    secondary: "Take a breath — we'll be ready for you again in a moment."
  },
  validation: {
    primary: "Something doesn't look quite right",
    secondary: "Let's double-check the details and try again."
  },
  'not-found': {
    primary: "We couldn't find that",
    secondary: "It may have moved or been removed. Let's go back and try something else."
  },
  server: {
    primary: "Our side is having a hiccup",
    secondary: "We're on it! Try again in a moment, or reach out if this keeps happening."
  },
  unknown: {
    primary: "Something unexpected happened",
    secondary: "Don't worry — this isn't your fault. Let's try again."
  }
};

/**
 * Parse an error response into a structured ApiError
 */
export function parseApiError(error: unknown): ApiError {
  // Network errors (offline, DNS failure, etc.)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: ERROR_MESSAGES.network.primary,
      technicalMessage: error.message,
      retryable: true
    };
  }

  // Timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      type: 'timeout',
      message: ERROR_MESSAGES.timeout.primary,
      technicalMessage: 'Request timed out',
      retryable: true
    };
  }

  // HTTP response errors
  if (error instanceof Response || (error as { status?: number })?.status) {
    const response = error as Response;
    const status = response.status;

    if (status === 401 || status === 403) {
      return {
        type: 'auth',
        message: ERROR_MESSAGES.auth.primary,
        technicalMessage: `HTTP ${status}: Authentication required`,
        retryable: false,
        code: `HTTP_${status}`
      };
    }

    if (status === 429) {
      return {
        type: 'rate-limit',
        message: ERROR_MESSAGES['rate-limit'].primary,
        technicalMessage: 'Rate limit exceeded',
        retryable: true,
        retryAfter: parseInt(response.headers?.get('Retry-After') || '60', 10),
        code: 'RATE_LIMITED'
      };
    }

    if (status === 400 || status === 422) {
      return {
        type: 'validation',
        message: ERROR_MESSAGES.validation.primary,
        technicalMessage: `HTTP ${status}: Validation failed`,
        retryable: false,
        code: `HTTP_${status}`
      };
    }

    if (status === 404) {
      return {
        type: 'not-found',
        message: ERROR_MESSAGES['not-found'].primary,
        technicalMessage: 'Resource not found',
        retryable: false,
        code: 'NOT_FOUND'
      };
    }

    if (status >= 500) {
      return {
        type: 'server',
        message: ERROR_MESSAGES.server.primary,
        technicalMessage: `HTTP ${status}: Server error`,
        retryable: true,
        code: `HTTP_${status}`
      };
    }
  }

  // Generic error object
  if (error instanceof Error) {
    return {
      type: 'unknown',
      message: ERROR_MESSAGES.unknown.primary,
      technicalMessage: error.message,
      retryable: true
    };
  }

  // Fallback
  return {
    type: 'unknown',
    message: ERROR_MESSAGES.unknown.primary,
    technicalMessage: String(error),
    retryable: true
  };
}

/**
 * Get the full user-friendly error message (primary + secondary)
 */
export function getErrorMessage(error: ApiError): { primary: string; secondary: string } {
  return ERROR_MESSAGES[error.type];
}

/**
 * Wrapper for fetch with timeout and error handling
 */
export async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 30000
): Promise<{ data?: T; error?: ApiError }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { error: parseApiError(response) };
    }

    const data = await response.json();
    return { data };
  } catch (err) {
    clearTimeout(timeoutId);
    return { error: parseApiError(err) };
  }
}

/**
 * Retry logic with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors
      const parsed = parseApiError(error);
      if (!parsed.retryable) {
        throw error;
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Hook-friendly error state type
 */
export interface ErrorState {
  hasError: boolean;
  error?: ApiError;
  message?: string;
  secondaryMessage?: string;
}

/**
 * Create an error state object for use in React components
 */
export function createErrorState(error: unknown): ErrorState {
  if (!error) {
    return { hasError: false };
  }

  const parsed = parseApiError(error);
  const messages = getErrorMessage(parsed);

  return {
    hasError: true,
    error: parsed,
    message: messages.primary,
    secondaryMessage: messages.secondary
  };
}

/**
 * Clear error state helper
 */
export function clearErrorState(): ErrorState {
  return { hasError: false };
}

export default {
  parseApiError,
  getErrorMessage,
  fetchWithErrorHandling,
  withRetry,
  createErrorState,
  clearErrorState
};
