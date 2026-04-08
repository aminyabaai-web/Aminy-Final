// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Secure Fetch Wrapper
 *
 * Automatically adds CSRF tokens to state-changing requests
 * and provides consistent error handling.
 */

import { getOrCreateCSRFToken, addCSRFHeader } from './csrf';
import { SecurityConfig } from './index';

// Methods that require CSRF protection
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

interface SecureFetchOptions extends RequestInit {
  /** Skip CSRF token for this request */
  skipCSRF?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Retry count for failed requests (default: 0) */
  retries?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
}

interface SecureFetchResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
}

/**
 * Creates an AbortController with timeout
 */
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Secure fetch with CSRF protection and error handling
 */
export async function secureFetch<T = unknown>(
  url: string,
  options: SecureFetchOptions = {}
): Promise<SecureFetchResponse<T>> {
  const {
    skipCSRF = false,
    timeout = 30000,
    retries = 0,
    retryDelay = 1000,
    method = 'GET',
    headers = {},
    ...restOptions
  } = options;

  // Add CSRF token for state-changing methods
  let finalHeaders: HeadersInit = { ...headers };
  if (!skipCSRF && CSRF_PROTECTED_METHODS.includes(method.toUpperCase())) {
    finalHeaders = addCSRFHeader(finalHeaders);
  }

  // Add default headers
  finalHeaders = {
    'Content-Type': 'application/json',
    ...finalHeaders,
  };

  const controller = createTimeoutController(timeout);

  const fetchOptions: RequestInit = {
    method,
    headers: finalHeaders,
    signal: controller.signal,
    credentials: 'same-origin', // Include cookies for session
    ...restOptions,
  };

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, fetchOptions);

      // Parse response
      let data: T | null = null;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        // Extract error message from response
        const errorMessage =
          (data && typeof data === 'object' && 'message' in data
            ? String((data as { message: string }).message)
            : null) ||
          (data && typeof data === 'object' && 'error' in data
            ? String((data as { error: string }).error)
            : null) ||
          `Request failed with status ${response.status}`;

        return {
          data: null,
          error: errorMessage,
          status: response.status,
          ok: false,
        };
      }

      return {
        data,
        error: null,
        status: response.status,
        ok: true,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on abort (timeout)
      if (lastError.name === 'AbortError') {
        return {
          data: null,
          error: 'Request timed out',
          status: 408,
          ok: false,
        };
      }

      // Don't retry on certain errors
      if (lastError.message.includes('CSRF')) {
        return {
          data: null,
          error: lastError.message,
          status: 403,
          ok: false,
        };
      }

      // Retry logic
      if (attempt < retries) {
        await sleep(retryDelay * (attempt + 1)); // Exponential backoff
        attempt++;
        continue;
      }

      break;
    }
  }

  return {
    data: null,
    error: lastError?.message || 'Request failed',
    status: 0,
    ok: false,
  };
}

/**
 * Convenience methods
 */
export const secureApi = {
  get: <T = unknown>(url: string, options?: Omit<SecureFetchOptions, 'method' | 'body'>) =>
    secureFetch<T>(url, { ...options, method: 'GET' }),

  post: <T = unknown>(url: string, data?: unknown, options?: Omit<SecureFetchOptions, 'method'>) =>
    secureFetch<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown>(url: string, data?: unknown, options?: Omit<SecureFetchOptions, 'method'>) =>
    secureFetch<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = unknown>(url: string, data?: unknown, options?: Omit<SecureFetchOptions, 'method'>) =>
    secureFetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: Omit<SecureFetchOptions, 'method' | 'body'>) =>
    secureFetch<T>(url, { ...options, method: 'DELETE' }),
};

/**
 * Hook for using secure fetch in components
 */
import { useState, useCallback } from 'react';

export function useSecureFetch<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (
    url: string,
    options?: SecureFetchOptions
  ): Promise<SecureFetchResponse<T>> => {
    setLoading(true);
    setError(null);

    const result = await secureFetch<T>(url, options);

    setLoading(false);
    setError(result.error);
    setData(result.data);

    return result;
  }, []);

  return { execute, loading, error, data };
}

export default secureFetch;
