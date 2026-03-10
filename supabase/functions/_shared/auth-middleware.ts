/**
 * Shared Auth Middleware for Supabase Edge Functions
 *
 * Provides JWT verification and rate limiting utilities.
 * Extracted from make-server to be reusable across all Edge Functions.
 *
 * Usage:
 *   import { verifyAuth, rateLimit } from '../_shared/auth-middleware.ts';
 *
 *   // In a Hono app:
 *   app.use('/api/*', async (c, next) => {
 *     const user = await verifyAuth(c.req.raw);
 *     if (!user) return errorResponse(new AppError('Unauthorized', 401, 'AUTH_REQUIRED'));
 *     c.set('user', user);
 *     await next();
 *   });
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AppError } from './error-handler.ts';

interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

/**
 * Verify JWT from Authorization header and return user info.
 * Returns null if no valid JWT found.
 */
export async function verifyAuth(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication — throws AppError if not authenticated.
 */
export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await verifyAuth(request);
  if (!user) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }
  return user;
}

/**
 * Simple in-memory rate limiter for Edge Functions.
 * Note: Each Edge Function instance has its own memory, so this is per-instance.
 * For distributed rate limiting, use Supabase KV or Redis.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  maxRequests = 60,
  windowMs = 60_000 // 1 minute
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Rate limit middleware — throws AppError if limit exceeded.
 */
export function requireRateLimit(
  key: string,
  maxRequests = 60,
  windowMs = 60_000
): void {
  const { allowed, remaining, resetAt } = rateLimit(key, maxRequests, windowMs);
  if (!allowed) {
    throw new AppError(
      `Rate limit exceeded. Try again in ${Math.ceil((resetAt - Date.now()) / 1000)} seconds.`,
      429,
      'RATE_LIMIT_EXCEEDED',
      { remaining, resetAt: new Date(resetAt).toISOString() }
    );
  }
}
