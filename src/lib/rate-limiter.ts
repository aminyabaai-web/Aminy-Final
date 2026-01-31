/**
 * Rate Limiting System
 *
 * Provides flexible rate limiting for API endpoints and user actions.
 * Supports multiple strategies: sliding window, token bucket, and fixed window.
 */

import { useState, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  window: number;
  /** Identifier key (e.g., user ID, IP address) */
  keyPrefix?: string;
  /** Strategy to use */
  strategy?: 'sliding' | 'fixed' | 'token-bucket';
  /** Whether to include headers in response */
  includeHeaders?: boolean;
  /** Custom message when rate limited */
  message?: string;
  /** Cost per request (for token bucket) */
  cost?: number;
  /** Skip rate limiting for certain conditions */
  skip?: (identifier: string) => boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
  headers?: Record<string, string>;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
  tokens?: number;
  lastRefill?: number;
}

// ============================================================================
// In-Memory Store (for development/single instance)
// ============================================================================

class MemoryStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor() {
    // Clean up expired entries every minute
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Global store instance
const memoryStore = new MemoryStore();

// ============================================================================
// Rate Limiting Strategies
// ============================================================================

/**
 * Fixed Window Rate Limiter
 * Simple counting within fixed time windows
 */
function fixedWindowLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowStart = Math.floor(now / config.window) * config.window;
  const windowEnd = windowStart + config.window;
  const storeKey = `${config.keyPrefix || 'rl'}:fixed:${key}:${windowStart}`;

  let entry = memoryStore.get(storeKey);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: windowEnd };
  }

  entry.count++;
  memoryStore.set(storeKey, entry);

  const allowed = entry.count <= config.limit;
  const remaining = Math.max(0, config.limit - entry.count);
  const retryAfter = allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    retryAfter,
    headers: config.includeHeaders
      ? {
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
          ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
        }
      : undefined,
  };
}

/**
 * Sliding Window Rate Limiter
 * More accurate counting using weighted average of current and previous windows
 */
function slidingWindowLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowSize = config.window;
  const currentWindowStart = Math.floor(now / windowSize) * windowSize;
  const previousWindowStart = currentWindowStart - windowSize;

  const currentKey = `${config.keyPrefix || 'rl'}:slide:${key}:${currentWindowStart}`;
  const previousKey = `${config.keyPrefix || 'rl'}:slide:${key}:${previousWindowStart}`;

  let currentEntry = memoryStore.get(currentKey);
  const previousEntry = memoryStore.get(previousKey);

  if (!currentEntry) {
    currentEntry = { count: 0, resetAt: currentWindowStart + windowSize };
    memoryStore.set(currentKey, currentEntry);
  }

  // Calculate weighted count
  const elapsedInWindow = now - currentWindowStart;
  const windowProgress = elapsedInWindow / windowSize;
  const previousWeight = 1 - windowProgress;
  const previousCount = previousEntry ? previousEntry.count * previousWeight : 0;
  const weightedCount = previousCount + currentEntry.count;

  // Increment current window
  currentEntry.count++;
  memoryStore.set(currentKey, currentEntry);

  const allowed = weightedCount < config.limit;
  const remaining = Math.max(0, Math.floor(config.limit - weightedCount - 1));
  const resetAt = currentWindowStart + windowSize;
  const retryAfter = allowed ? undefined : Math.ceil((resetAt - now) / 1000);

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter,
    headers: config.includeHeaders
      ? {
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
        }
      : undefined,
  };
}

/**
 * Token Bucket Rate Limiter
 * Allows bursts while maintaining average rate
 */
function tokenBucketLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const storeKey = `${config.keyPrefix || 'rl'}:bucket:${key}`;
  const refillRate = config.limit / config.window; // tokens per ms
  const cost = config.cost || 1;

  let entry = memoryStore.get(storeKey);

  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + config.window,
      tokens: config.limit,
      lastRefill: now,
    };
  } else {
    // Refill tokens based on time elapsed
    const timeSinceRefill = now - (entry.lastRefill || now);
    const tokensToAdd = timeSinceRefill * refillRate;
    entry.tokens = Math.min(config.limit, (entry.tokens || 0) + tokensToAdd);
    entry.lastRefill = now;
  }

  const allowed = (entry.tokens || 0) >= cost;

  if (allowed) {
    entry.tokens = (entry.tokens || 0) - cost;
  }

  memoryStore.set(storeKey, entry);

  const remaining = Math.floor(entry.tokens || 0);
  const timeToNextToken = cost / refillRate;
  const retryAfter = allowed ? undefined : Math.ceil(timeToNextToken / 1000);

  return {
    allowed,
    remaining,
    resetAt: now + config.window,
    retryAfter,
    headers: config.includeHeaders
      ? {
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil((now + config.window) / 1000)),
          ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
        }
      : undefined,
  };
}

// ============================================================================
// Main Rate Limiter
// ============================================================================

/**
 * Check rate limit for an identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  // Check if should skip
  if (config.skip && config.skip(identifier)) {
    return {
      allowed: true,
      remaining: config.limit,
      resetAt: Date.now() + config.window,
    };
  }

  const strategy = config.strategy || 'sliding';

  switch (strategy) {
    case 'fixed':
      return fixedWindowLimit(identifier, config);
    case 'token-bucket':
      return tokenBucketLimit(identifier, config);
    case 'sliding':
    default:
      return slidingWindowLimit(identifier, config);
  }
}

/**
 * Create a rate limiter with preset config
 */
export function createRateLimiter(config: RateLimitConfig) {
  return {
    check: (identifier: string) => checkRateLimit(identifier, config),
    config,
  };
}

// ============================================================================
// Preset Rate Limiters
// ============================================================================

/** Standard API rate limit: 100 requests per minute */
export const apiRateLimiter = createRateLimiter({
  limit: 100,
  window: 60 * 1000, // 1 minute
  keyPrefix: 'api',
  strategy: 'sliding',
  includeHeaders: true,
  message: 'Too many requests. Please try again later.',
});

/** Auth rate limit: 5 attempts per 15 minutes */
export const authRateLimiter = createRateLimiter({
  limit: 5,
  window: 15 * 60 * 1000, // 15 minutes
  keyPrefix: 'auth',
  strategy: 'fixed',
  includeHeaders: true,
  message: 'Too many login attempts. Please try again later.',
});

/** AI chat rate limit: 20 messages per minute */
export const chatRateLimiter = createRateLimiter({
  limit: 20,
  window: 60 * 1000, // 1 minute
  keyPrefix: 'chat',
  strategy: 'token-bucket',
  includeHeaders: true,
  message: 'Slow down! You\'re sending messages too quickly.',
});

/** Upload rate limit: 10 uploads per hour */
export const uploadRateLimiter = createRateLimiter({
  limit: 10,
  window: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'upload',
  strategy: 'fixed',
  includeHeaders: true,
  message: 'Upload limit reached. Please try again later.',
});

/** Expensive operations: 5 per hour */
export const expensiveOpRateLimiter = createRateLimiter({
  limit: 5,
  window: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'expensive',
  strategy: 'fixed',
  includeHeaders: true,
  message: 'Operation limit reached. Please try again later.',
});

// ============================================================================
// Middleware Helper
// ============================================================================

export interface RateLimitMiddlewareOptions extends RateLimitConfig {
  /** Function to extract identifier from request */
  getIdentifier?: (req: Request) => string;
  /** Function to handle rate limit exceeded */
  onRateLimited?: (result: RateLimitResult) => Response;
}

/**
 * Create rate limit middleware for API routes
 */
export function rateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  const getIdentifier = options.getIdentifier || ((req: Request) => {
    // Try to get user ID from auth header, fall back to IP
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      return `user:${authHeader.split(' ')[1]?.slice(0, 20)}`;
    }
    return `ip:${req.headers.get('x-forwarded-for') || 'unknown'}`;
  });

  const onRateLimited = options.onRateLimited || ((result: RateLimitResult) => {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...result.headers,
        },
      }
    );
  });

  return async (req: Request): Promise<Response | null> => {
    const identifier = getIdentifier(req);
    const result = checkRateLimit(identifier, options);

    if (!result.allowed) {
      return onRateLimited(result);
    }

    return null; // Continue to handler
  };
}

// ============================================================================
// React Hook for Client-Side Rate Limiting
// ============================================================================

interface UseRateLimitOptions {
  limit: number;
  window: number; // in seconds
}

interface UseRateLimitReturn {
  isAllowed: boolean;
  remaining: number;
  check: () => boolean;
  reset: () => void;
}

export function useRateLimit(options: UseRateLimitOptions): UseRateLimitReturn {
  const [count, setCount] = useState(0);
  const resetTimeRef = useRef(Date.now() + options.window * 1000);

  const check = useCallback(() => {
    const now = Date.now();

    // Reset if window has passed
    if (now > resetTimeRef.current) {
      setCount(1);
      resetTimeRef.current = now + options.window * 1000;
      return true;
    }

    // Check if under limit
    if (count < options.limit) {
      setCount(prev => prev + 1);
      return true;
    }

    return false;
  }, [count, options.limit, options.window]);

  const reset = useCallback(() => {
    setCount(0);
    resetTimeRef.current = Date.now() + options.window * 1000;
  }, [options.window]);

  return {
    isAllowed: count < options.limit,
    remaining: Math.max(0, options.limit - count),
    check,
    reset,
  };
}

// ============================================================================
// Exports
// ============================================================================

export const rateLimiter = {
  check: checkRateLimit,
  create: createRateLimiter,
  middleware: rateLimitMiddleware,
  presets: {
    api: apiRateLimiter,
    auth: authRateLimiter,
    chat: chatRateLimiter,
    upload: uploadRateLimiter,
    expensive: expensiveOpRateLimiter,
  },
};
