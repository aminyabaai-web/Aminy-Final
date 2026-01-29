/**
 * Rate Limiter for AI Endpoints
 * Uses sliding window algorithm with KV store + daily usage tracking in Supabase
 */

import * as kv from "./kv_store.tsx";

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

// Daily message limits per tier
// MUST match tier-utils.ts getAIMessageLimit()
export const DAILY_MESSAGE_LIMITS: Record<string, number> = {
  free: 5,        // 5 messages/day (matches tier-utils.ts)
  starter: 20,    // 20 messages/day (matches tier-utils.ts)
  core: 999999,   // Unlimited (null in tier-utils means no limit)
  pro: 999999,    // Unlimited (null in tier-utils means no limit)
  default: 5,     // Default for unknown tiers (same as free)
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Rate limit configurations per tier
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: { windowMs: 60 * 1000, maxRequests: 5 },        // 5 per minute
  starter: { windowMs: 60 * 1000, maxRequests: 20 },    // 20 per minute
  core: { windowMs: 60 * 1000, maxRequests: 60 },       // 60 per minute (1/sec)
  pro: { windowMs: 60 * 1000, maxRequests: 120 },       // 120 per minute (2/sec)
  default: { windowMs: 60 * 1000, maxRequests: 10 },    // Default for unknown
};

// Global rate limit (applies to all users - protects against DDoS)
const GLOBAL_RATE_LIMIT: RateLimitConfig = {
  windowMs: 1000,        // 1 second window
  maxRequests: 100,      // 100 requests per second total
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request is allowed under rate limiting
 */
export async function checkRateLimit(
  userId: string,
  tier: string = 'free',
  endpoint: string = 'ai'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[tier] || RATE_LIMITS.default;
  const key = `ratelimit:${endpoint}:${userId}`;
  const now = Date.now();

  try {
    // Get current rate limit entry
    const entry: RateLimitEntry | null = await kv.get(key);

    if (!entry || now >= entry.resetAt) {
      // Window expired or no entry - create new window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + config.windowMs,
      };
      await kv.set(key, newEntry);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: newEntry.resetAt,
      };
    }

    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      };
    }

    // Increment counter
    const updatedEntry: RateLimitEntry = {
      count: entry.count + 1,
      resetAt: entry.resetAt,
    };
    await kv.set(key, updatedEntry);

    return {
      allowed: true,
      remaining: config.maxRequests - updatedEntry.count,
      resetAt: entry.resetAt,
    };
  } catch (error) {
    // SECURITY: Fail CLOSED - deny requests when rate limiting is unavailable
    // This prevents abuse if the KV store is down
    console.error('[RateLimit] Check failed, denying request for safety:', error);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + 60000, // Retry in 60 seconds
      retryAfter: 60,
    };
  }
}

/**
 * Check global rate limit (DDoS protection)
 */
export async function checkGlobalRateLimit(): Promise<RateLimitResult> {
  const key = 'ratelimit:global';
  const now = Date.now();

  try {
    const entry: RateLimitEntry | null = await kv.get(key);

    if (!entry || now >= entry.resetAt) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + GLOBAL_RATE_LIMIT.windowMs,
      };
      await kv.set(key, newEntry);

      return {
        allowed: true,
        remaining: GLOBAL_RATE_LIMIT.maxRequests - 1,
        resetAt: newEntry.resetAt,
      };
    }

    if (entry.count >= GLOBAL_RATE_LIMIT.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      };
    }

    const updatedEntry: RateLimitEntry = {
      count: entry.count + 1,
      resetAt: entry.resetAt,
    };
    await kv.set(key, updatedEntry);

    return {
      allowed: true,
      remaining: GLOBAL_RATE_LIMIT.maxRequests - updatedEntry.count,
      resetAt: entry.resetAt,
    };
  } catch (error) {
    // SECURITY: Fail CLOSED for global rate limit - critical for DDoS protection
    console.error('[RateLimit] Global check failed, denying request for safety:', error);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + 5000, // Retry in 5 seconds for global
      retryAfter: 5,
    };
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}

/**
 * Combined check for both user and global rate limits
 */
export async function checkAllRateLimits(
  userId: string,
  tier: string = 'free',
  endpoint: string = 'ai'
): Promise<{ allowed: boolean; result: RateLimitResult; reason?: string }> {
  // Check global limit first
  const globalResult = await checkGlobalRateLimit();
  if (!globalResult.allowed) {
    return {
      allowed: false,
      result: globalResult,
      reason: 'Service is experiencing high load. Please try again shortly.',
    };
  }

  // Check user limit
  const userResult = await checkRateLimit(userId, tier, endpoint);
  if (!userResult.allowed) {
    return {
      allowed: false,
      result: userResult,
      reason: `Rate limit exceeded. Please wait ${userResult.retryAfter} seconds.`,
    };
  }

  return { allowed: true, result: userResult };
}

// ============================================================================
// DAILY USAGE TRACKING (Uses Supabase for persistence)
// ============================================================================

export interface DailyUsageResult {
  allowed: boolean;
  messagesUsed: number;
  messagesLimit: number;
  messagesRemaining: number;
  resetsAt: string; // ISO timestamp of midnight UTC
  shouldShowPaywall: boolean;
}

/**
 * Get today's date string in UTC (YYYY-MM-DD)
 */
function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get midnight UTC tomorrow as ISO string
 */
function getResetTimeUTC(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Check daily message usage and optionally increment
 * Uses Supabase usage_tracking table
 */
export async function checkDailyUsage(
  supabase: any,
  userId: string,
  tier: string = 'free',
  incrementCount: boolean = false
): Promise<DailyUsageResult> {
  const today = getTodayUTC();
  const limit = DAILY_MESSAGE_LIMITS[tier] || DAILY_MESSAGE_LIMITS.default;

  try {
    // Get or create today's usage record
    const { data: existingUsage, error: fetchError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    let messagesUsed = 0;

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error fetching usage:', fetchError);
    }

    if (existingUsage) {
      messagesUsed = existingUsage.message_count || 0;
    }

    // Check if under limit before potentially incrementing
    const allowed = messagesUsed < limit;
    const shouldShowPaywall = !allowed && tier === 'free';

    // Increment if requested and allowed
    if (incrementCount && allowed) {
      if (existingUsage) {
        // Update existing record
        await supabase
          .from('usage_tracking')
          .update({
            message_count: messagesUsed + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('date', today);
      } else {
        // Create new record for today
        await supabase
          .from('usage_tracking')
          .insert({
            user_id: userId,
            date: today,
            message_count: 1,
            tier: tier,
          });
      }
      messagesUsed += 1;
    }

    return {
      allowed,
      messagesUsed,
      messagesLimit: limit,
      messagesRemaining: Math.max(0, limit - messagesUsed),
      resetsAt: getResetTimeUTC(),
      shouldShowPaywall,
    };
  } catch (error) {
    console.error('[RateLimit] Daily usage check failed:', error);
    // SECURITY: Fail CLOSED but with graceful degradation
    // Allow a small buffer for transient errors, but prevent abuse
    return {
      allowed: false,
      messagesUsed: limit, // Assume at limit
      messagesLimit: limit,
      messagesRemaining: 0,
      resetsAt: getResetTimeUTC(),
      shouldShowPaywall: false,
      // Note: This will show "rate limit" not "paywall" which is correct
      // because the issue is temporary, not subscription-based
    };
  }
}

/**
 * Get current daily usage without incrementing
 */
export async function getDailyUsage(
  supabase: any,
  userId: string,
  tier: string = 'free'
): Promise<DailyUsageResult> {
  return checkDailyUsage(supabase, userId, tier, false);
}

/**
 * Combined check: per-minute rate limit + daily usage limit
 */
export async function checkAllLimits(
  supabase: any,
  userId: string,
  tier: string = 'free',
  endpoint: string = 'ai',
  incrementDailyUsage: boolean = true
): Promise<{
  allowed: boolean;
  rateLimitResult: RateLimitResult;
  dailyUsage: DailyUsageResult;
  reason?: string;
}> {
  // Check per-minute rate limits first
  const rateLimitCheck = await checkAllRateLimits(userId, tier, endpoint);
  if (!rateLimitCheck.allowed) {
    // Get daily usage for context but don't increment
    const dailyUsage = await getDailyUsage(supabase, userId, tier);
    return {
      allowed: false,
      rateLimitResult: rateLimitCheck.result,
      dailyUsage,
      reason: rateLimitCheck.reason,
    };
  }

  // Check daily usage limit
  const dailyUsage = await checkDailyUsage(supabase, userId, tier, incrementDailyUsage);
  if (!dailyUsage.allowed) {
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
    return {
      allowed: false,
      rateLimitResult: rateLimitCheck.result,
      dailyUsage,
      reason: dailyUsage.shouldShowPaywall
        ? `You've reached your daily limit of ${dailyUsage.messagesLimit} messages. Upgrade to get more!`
        : `Daily limit of ${dailyUsage.messagesLimit} messages reached. Resets at midnight UTC.`,
    };
  }

  return {
    allowed: true,
    rateLimitResult: rateLimitCheck.result,
    dailyUsage,
  };
}
