/**
 * Query Optimizer — Supabase query utilities for performance
 *
 * Provides three core optimization patterns:
 * 1. batchQuery()    — Batches multiple Supabase queries into parallel execution
 * 2. cachedQuery()   — In-memory LRU cache with TTL for frequent reads
 * 3. paginatedQuery()— Cursor-based pagination helper
 *
 * Also exports recommended database indexes as SQL comments for DBA review.
 *
 * Usage:
 *   import { batchQuery, cachedQuery, paginatedQuery } from '../lib/query-optimizer';
 *
 *   // Batch multiple queries
 *   const [profile, children, goals] = await batchQuery([
 *     () => supabase.from('profiles').select('*').eq('id', userId).single(),
 *     () => supabase.from('children').select('*').eq('parent_id', userId),
 *     () => supabase.from('treatment_goals').select('*').eq('user_id', userId),
 *   ]);
 *
 *   // Cached query (5-minute TTL)
 *   const providers = await cachedQuery(
 *     'providers-all',
 *     () => supabase.from('providers').select('id, name, specialty').eq('accepting_new_patients', true),
 *     { ttlMs: 300_000 }
 *   );
 *
 *   // Cursor-based pagination
 *   const page = await paginatedQuery('messages', {
 *     select: 'id, content, created_at',
 *     filters: { conversation_id: convId },
 *     orderBy: 'created_at',
 *     pageSize: 20,
 *     cursor: lastMessageId,
 *   });
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

/** Generic Supabase query result shape */
interface SupabaseResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/** A deferred Supabase query function */
type QueryFn<T> = () => PromiseLike<SupabaseResult<T>>;

/** Options for cachedQuery */
export interface CachedQueryOptions {
  /** Time-to-live in milliseconds (default: 60_000 = 1 minute) */
  ttlMs?: number;
  /** If true, return stale data while revalidating in background */
  staleWhileRevalidate?: boolean;
  /** Force bypass cache and fetch fresh data */
  forceRefresh?: boolean;
}

/** Options for paginatedQuery */
export interface PaginatedQueryOptions {
  /** Columns to select (default: '*') */
  select?: string;
  /** Equality filters: { column: value } */
  filters?: Record<string, unknown>;
  /** Column to order by (default: 'created_at') */
  orderBy?: string;
  /** Sort direction (default: 'desc') */
  ascending?: boolean;
  /** Number of rows per page (default: 20, max: 100) */
  pageSize?: number;
  /** Cursor value (the `orderBy` column value of the last item from previous page) */
  cursor?: string | null;
  /** Cursor column for cursor-based pagination (default: same as orderBy) */
  cursorColumn?: string;
}

/** Paginated result */
export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
  totalFetched: number;
  pageSize: number;
}

/** Batch query result — unwraps each query's data */
export type BatchResult<T extends readonly QueryFn<unknown>[]> = {
  [K in keyof T]: T[K] extends QueryFn<infer U> ? U | null : never;
};

// ============================================================================
// 1. batchQuery — Execute multiple queries in parallel
// ============================================================================

/**
 * Executes multiple Supabase queries concurrently using Promise.allSettled.
 * Returns results in the same order as the input array.
 * Failed queries return null instead of throwing.
 *
 * @example
 * const [profile, children] = await batchQuery([
 *   () => supabase.from('profiles').select('*').eq('id', uid).single(),
 *   () => supabase.from('children').select('*').eq('parent_id', uid),
 * ]);
 */
export async function batchQuery<T extends readonly QueryFn<unknown>[]>(
  queries: [...T],
): Promise<BatchResult<T>> {
  const settled = await Promise.allSettled(queries.map((fn) => fn()));

  const results = settled.map((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[QueryOptimizer] Batch query #${index} failed:`, result.reason);
      return null;
    }

    const { data, error } = result.value;
    if (error) {
      console.warn(`[QueryOptimizer] Batch query #${index} error:`, error.message);
      return null;
    }

    return data;
  });

  return results as BatchResult<T>;
}

// ============================================================================
// 2. cachedQuery — In-memory LRU cache with TTL
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

/** LRU cache implementation with configurable max size */
class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry as CacheEntry<T>;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs,
    });
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Invalidate all entries whose keys start with prefix */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  /** Get cache stats for debugging */
  getStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: [...this.cache.keys()],
    };
  }
}

// Singleton cache instance
const queryCache = new QueryCache(100);

/**
 * Wraps a Supabase query with an in-memory LRU cache.
 * Returns cached data if available and not expired; otherwise executes the query.
 *
 * @param cacheKey Unique identifier for this query result
 * @param queryFn  The Supabase query to execute on cache miss
 * @param options  TTL and cache behavior options
 *
 * @example
 * const providers = await cachedQuery(
 *   'active-providers',
 *   () => supabase.from('providers').select('*').eq('accepting_new_patients', true),
 *   { ttlMs: 300_000 } // 5 minutes
 * );
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: QueryFn<T>,
  options: CachedQueryOptions = {},
): Promise<T | null> {
  const {
    ttlMs = 60_000,
    staleWhileRevalidate = false,
    forceRefresh = false,
  } = options;

  // Check cache first (unless forced refresh)
  if (!forceRefresh) {
    const cached = queryCache.get<T>(cacheKey);
    if (cached) {
      if (staleWhileRevalidate) {
        // Return stale data immediately but revalidate in background
        revalidateInBackground(cacheKey, queryFn, ttlMs);
      }
      return cached.data;
    }
  }

  // Cache miss — execute query
  const { data, error } = await queryFn();

  if (error) {
    console.warn(`[QueryOptimizer] cachedQuery "${cacheKey}" error:`, error.message);

    // On error with stale-while-revalidate, try to return stale data
    if (staleWhileRevalidate) {
      const stale = queryCache.get<T>(cacheKey);
      if (stale) return stale.data;
    }

    return null;
  }

  if (data !== null && data !== undefined) {
    queryCache.set(cacheKey, data, ttlMs);
  }

  return data;
}

/** Background revalidation (fire-and-forget) */
async function revalidateInBackground<T>(
  cacheKey: string,
  queryFn: QueryFn<T>,
  ttlMs: number,
): Promise<void> {
  try {
    const { data, error } = await queryFn();
    if (!error && data !== null && data !== undefined) {
      queryCache.set(cacheKey, data, ttlMs);
    }
  } catch {
    // Silent failure for background revalidation
  }
}

/** Invalidate a specific cache entry */
export function invalidateCache(key: string): boolean {
  return queryCache.invalidate(key);
}

/** Invalidate all cache entries matching a prefix (e.g., table name) */
export function invalidateCachePrefix(prefix: string): number {
  return queryCache.invalidatePrefix(prefix);
}

/** Clear the entire query cache */
export function clearQueryCache(): void {
  queryCache.clear();
}

/** Get cache diagnostics */
export function getCacheStats(): { size: number; maxSize: number; keys: string[] } {
  return queryCache.getStats();
}

// ============================================================================
// 3. paginatedQuery — Cursor-based pagination
// ============================================================================

/**
 * Cursor-based pagination for Supabase queries.
 * More efficient than offset-based pagination for large datasets.
 *
 * @param table   Supabase table name
 * @param options Pagination options (filters, ordering, cursor, page size)
 *
 * @example
 * // First page
 * const page1 = await paginatedQuery('messages', {
 *   filters: { conversation_id: 'abc-123' },
 *   orderBy: 'created_at',
 *   ascending: true,
 *   pageSize: 20,
 * });
 *
 * // Next page using cursor
 * const page2 = await paginatedQuery('messages', {
 *   filters: { conversation_id: 'abc-123' },
 *   orderBy: 'created_at',
 *   ascending: true,
 *   pageSize: 20,
 *   cursor: page1.nextCursor,
 * });
 */
export async function paginatedQuery<T = Record<string, unknown>>(
  table: string,
  options: PaginatedQueryOptions = {},
): Promise<PaginatedResult<T>> {
  const {
    select = '*',
    filters = {},
    orderBy = 'created_at',
    ascending = false,
    pageSize: rawPageSize = 20,
    cursor = null,
    cursorColumn,
  } = options;

  // Clamp page size to prevent abuse
  const pageSize = Math.min(Math.max(1, rawPageSize), 100);
  const effectiveCursorColumn = cursorColumn || orderBy;

  // Build query
  let query = supabase
    .from(table)
    .select(select)
    .order(orderBy, { ascending })
    .limit(pageSize + 1); // Fetch one extra to detect hasMore

  // Apply equality filters
  for (const [column, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      query = query.eq(column, value as string | number | boolean);
    }
  }

  // Apply cursor (for subsequent pages)
  if (cursor) {
    if (ascending) {
      query = query.gt(effectiveCursorColumn, cursor);
    } else {
      query = query.lt(effectiveCursorColumn, cursor);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`[QueryOptimizer] paginatedQuery "${table}" error:`, error.message);
    return {
      data: [],
      hasMore: false,
      nextCursor: null,
      totalFetched: 0,
      pageSize,
    };
  }

  const rows = (data || []) as T[];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  // Extract cursor for next page from the last row
  let nextCursor: string | null = null;
  if (hasMore && pageRows.length > 0) {
    const lastRow = pageRows[pageRows.length - 1];
    if (lastRow && typeof lastRow === 'object') {
      const cursorValue = (lastRow as Record<string, unknown>)[effectiveCursorColumn];
      nextCursor = cursorValue !== null && cursorValue !== undefined
        ? String(cursorValue)
        : null;
    }
  }

  return {
    data: pageRows,
    hasMore,
    nextCursor,
    totalFetched: pageRows.length,
    pageSize,
  };
}

// ============================================================================
// Recommended Database Indexes
// ============================================================================

/**
 * SQL index recommendations for optimal query performance.
 * These should be applied via a Supabase migration when deploying to production.
 *
 * Run in Supabase SQL Editor or add to a new migration file:
 *
 * ```sql
 * -- ============================================================================
 * -- RECOMMENDED PERFORMANCE INDEXES
 * -- Generated by query-optimizer.ts
 * -- ============================================================================
 *
 * -- Profiles: Fast lookup by role (provider directory, admin panel)
 * CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
 *
 * -- Children: Fast lookup by parent + primary flag (dashboard load)
 * CREATE INDEX IF NOT EXISTS idx_children_parent_primary ON children(parent_id, is_primary);
 *
 * -- Conversations: Fast list for user, ordered by recency
 * CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
 *
 * -- Messages: Fast pagination within a conversation
 * CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at ASC);
 *
 * -- Appointments: User's upcoming appointments
 * CREATE INDEX IF NOT EXISTS idx_appointments_user_scheduled ON appointments(user_id, scheduled_at DESC);
 *
 * -- Appointments: Provider's schedule
 * CREATE INDEX IF NOT EXISTS idx_appointments_provider_scheduled ON appointments(provider_id, scheduled_at DESC);
 *
 * -- Screening results: User's history ordered by date
 * CREATE INDEX IF NOT EXISTS idx_screenings_user_completed ON screening_results(user_id, completed_at DESC);
 *
 * -- Treatment goals: User's active goals
 * CREATE INDEX IF NOT EXISTS idx_goals_user_status ON treatment_goals(user_id, status);
 *
 * -- Provider availability: Efficient schedule lookups
 * CREATE INDEX IF NOT EXISTS idx_availability_provider_day ON provider_availability(provider_id, day_of_week, is_active);
 *
 * -- Providers: Directory search by specialty and accepting patients
 * CREATE INDEX IF NOT EXISTS idx_providers_specialty_accepting ON providers(specialty, accepting_new_patients) WHERE accepting_new_patients = true;
 *
 * -- Payments: User's payment history
 * CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);
 *
 * -- Stress logs: User's trends over time
 * CREATE INDEX IF NOT EXISTS idx_stress_logs_user_date ON stress_logs(user_id, logged_at DESC);
 *
 * -- Community posts: Feed ordering
 * CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
 *
 * -- Push subscriptions: Fast lookup for notification delivery
 * CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
 *
 * -- Error logs: Admin debugging by timestamp
 * CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(created_at DESC);
 *
 * -- Waitlist: Priority ordering
 * CREATE INDEX IF NOT EXISTS idx_waitlist_priority ON waitlist(priority DESC, created_at ASC);
 * ```
 */
export const RECOMMENDED_INDEXES_SQL = `
-- ============================================================================
-- RECOMMENDED PERFORMANCE INDEXES
-- Generated by query-optimizer.ts
-- ============================================================================

-- Profiles: Fast lookup by role (provider directory, admin panel)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Children: Fast lookup by parent + primary flag (dashboard load)
CREATE INDEX IF NOT EXISTS idx_children_parent_primary ON children(parent_id, is_primary);

-- Conversations: Fast list for user, ordered by recency
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);

-- Messages: Fast pagination within a conversation
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at ASC);

-- Appointments: User's upcoming appointments
CREATE INDEX IF NOT EXISTS idx_appointments_user_scheduled ON appointments(user_id, scheduled_at DESC);

-- Appointments: Provider's schedule
CREATE INDEX IF NOT EXISTS idx_appointments_provider_scheduled ON appointments(provider_id, scheduled_at DESC);

-- Screening results: User's history ordered by date
CREATE INDEX IF NOT EXISTS idx_screenings_user_completed ON screening_results(user_id, completed_at DESC);

-- Treatment goals: User's active goals
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON treatment_goals(user_id, status);

-- Provider availability: Efficient schedule lookups
CREATE INDEX IF NOT EXISTS idx_availability_provider_day ON provider_availability(provider_id, day_of_week, is_active);

-- Providers: Directory search by specialty and accepting patients
CREATE INDEX IF NOT EXISTS idx_providers_specialty_accepting ON providers(specialty, accepting_new_patients) WHERE accepting_new_patients = true;

-- Payments: User's payment history
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);

-- Stress logs: User's trends over time
CREATE INDEX IF NOT EXISTS idx_stress_logs_user_date ON stress_logs(user_id, logged_at DESC);

-- Community posts: Feed ordering
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);

-- Push subscriptions: Fast lookup for notification delivery
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- Error logs: Admin debugging by timestamp
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(created_at DESC);

-- Waitlist: Priority ordering
CREATE INDEX IF NOT EXISTS idx_waitlist_priority ON waitlist(priority DESC, created_at ASC);
`.trim();
