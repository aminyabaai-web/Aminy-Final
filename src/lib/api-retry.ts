/**
 * API Retry Logic with Exponential Backoff
 * Provides resilient API calls with automatic retries
 */

interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  shouldRetry: (error: unknown, _attempt: number) => {
    // Retry on network errors, 5xx errors, and rate limits (429)
    if (error instanceof TypeError) {
      return true; // Network error
    }
    if (error instanceof Error && error.message?.includes('fetch')) {
      return true; // Network error
    }
    const status = (error as { status?: number })?.status
      || (error as { response?: { status?: number } })?.response?.status;
    if (status === 429) return true; // Rate limited
    if (status !== undefined && status >= 500 && status < 600) return true; // Server error
    return false;
  },
  onRetry: (_error: unknown, _attempt: number, _delayMs: number) => {
  },
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  // Add jitter (0-25% of delay)
  const jitter = exponentialDelay * Math.random() * 0.25;
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with automatic retry on failure
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config?: RetryConfig
): Promise<Response> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      const response = await fetch(url, options);

      // Check if response indicates an error that should be retried
      if (!response.ok) {
        const error = { status: response.status, statusText: response.statusText };

        if (attempt <= finalConfig.maxRetries && finalConfig.shouldRetry(error, attempt)) {
          const delay = calculateDelay(attempt, finalConfig.baseDelayMs, finalConfig.maxDelayMs);

          // Handle rate limit Retry-After header
          const retryAfter = response.headers.get('Retry-After');
          const actualDelay = retryAfter ? parseInt(retryAfter) * 1000 : delay;

          finalConfig.onRetry(error, attempt, actualDelay);
          await sleep(actualDelay);
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt <= finalConfig.maxRetries && finalConfig.shouldRetry(error, attempt)) {
        const delay = calculateDelay(attempt, finalConfig.baseDelayMs, finalConfig.maxDelayMs);
        finalConfig.onRetry(error, attempt, delay);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * JSON API call with retry
 */
export async function apiCall<T>(
  url: string,
  options?: RequestInit & { json?: unknown },
  config?: RetryConfig
): Promise<T> {
  const { json, ...fetchOptions } = options || {};

  const requestOptions: RequestInit = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
  };

  if (json) {
    requestOptions.method = requestOptions.method || 'POST';
    requestOptions.body = JSON.stringify(json);
  }

  const response = await fetchWithRetry(url, requestOptions, config);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  const text = await response.text();
  if (!text) {
    return {} as T; // Empty response
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
}

/**
 * AI API call with specific retry logic for AI endpoints
 */
export async function aiApiCall<T>(
  endpoint: string,
  data: Record<string, unknown>,
  options?: { userId?: string; tier?: string }
): Promise<T> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;

  return apiCall<T>(
    `${baseUrl}/functions/v1/make-server-8a022548${endpoint}`,
    {
      method: 'POST',
      json: {
        ...data,
        userId: options?.userId,
        tier: options?.tier,
      },
    },
    {
      maxRetries: 2, // Fewer retries for AI (expensive)
      baseDelayMs: 2000,
      shouldRetry: (error: unknown, attempt: number) => {
        // Don't retry client errors (4xx) except rate limits
        const status = (error as { status?: number })?.status;
        if (status === 429) return true;
        if (status !== undefined && status >= 400 && status < 500) return false;
        return attempt <= 2;
      },
      onRetry: (_error: unknown, _attempt: number, _delay: number) => {
      },
    }
  );
}

/**
 * Create a circuit breaker for API calls
 */
export function createCircuitBreaker(config?: {
  failureThreshold?: number;
  resetTimeoutMs?: number;
}) {
  const { failureThreshold = 5, resetTimeoutMs = 30000 } = config || {};

  let failures = 0;
  let lastFailure = 0;
  let isOpen = false;

  return {
    async call<T>(fn: () => Promise<T>): Promise<T> {
      // Check if circuit should reset
      if (isOpen && Date.now() - lastFailure > resetTimeoutMs) {
        isOpen = false;
        failures = 0;
      }

      if (isOpen) {
        throw new Error('Circuit breaker is open - service temporarily unavailable');
      }

      try {
        const result = await fn();
        failures = 0; // Reset on success
        return result;
      } catch (error) {
        failures++;
        lastFailure = Date.now();

        if (failures >= failureThreshold) {
          isOpen = true;
          console.error(`Circuit breaker opened after ${failures} failures`);
        }

        throw error;
      }
    },

    get status() {
      return {
        isOpen,
        failures,
        lastFailure: lastFailure ? new Date(lastFailure).toISOString() : null,
      };
    },

    reset() {
      isOpen = false;
      failures = 0;
      lastFailure = 0;
    },
  };
}

// Global circuit breaker for AI calls
export const aiCircuitBreaker = createCircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 60000,
});
