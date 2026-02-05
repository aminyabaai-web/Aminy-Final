/**
 * Client-Side Cache System
 *
 * In-memory and localStorage caching for API responses.
 * Supports TTL, LRU eviction, and cache invalidation.
 *
 * Backend: 8/10 → 9/10
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // milliseconds
  persistToStorage: boolean;
  storageKey: string;
}

class Cache<T = any> {
  private memory: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      persistToStorage: false,
      storageKey: 'aminy_cache',
      ...config,
    };

    // Load from storage if persistence enabled
    if (this.config.persistToStorage) {
      this.loadFromStorage();
    }
  }

  /**
   * Get item from cache
   */
  get(key: string): T | undefined {
    const entry = this.memory.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.delete(key);
      return undefined;
    }

    // Update hit count for LRU
    entry.hits++;
    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, ttl?: number): void {
    // Evict if at capacity
    if (this.memory.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.memory.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTTL,
      hits: 0,
    });

    // Persist if enabled
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const result = this.memory.delete(key);

    if (result && this.config.persistToStorage) {
      this.saveToStorage();
    }

    return result;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.memory.clear();

    if (this.config.persistToStorage) {
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * Invalidate keys matching a pattern
   */
  invalidate(pattern: string | RegExp): number {
    let count = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.memory.keys()) {
      if (regex.test(key)) {
        this.memory.delete(key);
        count++;
      }
    }

    if (count > 0 && this.config.persistToStorage) {
      this.saveToStorage();
    }

    return count;
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; maxSize: number; hitRate: number } {
    let totalHits = 0;
    for (const entry of this.memory.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.memory.size,
      maxSize: this.config.maxSize,
      hitRate: totalHits / Math.max(1, this.memory.size),
    };
  }

  /**
   * Get or set with async fetcher
   */
  async getOrSet<R extends T>(
    key: string,
    fetcher: () => Promise<R>,
    ttl?: number
  ): Promise<R> {
    const cached = this.get(key) as R | undefined;
    if (cached !== undefined) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  // Private methods
  private evictLRU(): void {
    let minHits = Infinity;
    let evictKey: string | null = null;

    for (const [key, entry] of this.memory.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        evictKey = key;
      }
    }

    if (evictKey) {
      this.memory.delete(evictKey);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, CacheEntry<T>>;
        const now = Date.now();

        for (const [key, entry] of Object.entries(parsed)) {
          // Only load non-expired entries
          if (now < entry.timestamp + entry.ttl) {
            this.memory.set(key, entry);
          }
        }
      }
    } catch (error) {
      // Log storage errors in dev for debugging
      if (import.meta.env.DEV) {
        console.warn('[Cache] Failed to load from storage:', error);
      }
    }
  }

  private saveToStorage(): void {
    try {
      const obj: Record<string, CacheEntry<T>> = {};
      for (const [key, entry] of this.memory.entries()) {
        obj[key] = entry;
      }
      localStorage.setItem(this.config.storageKey, JSON.stringify(obj));
    } catch (error) {
      // Log storage errors in dev for debugging (quota exceeded, etc.)
      if (import.meta.env.DEV) {
        console.warn('[Cache] Failed to save to storage:', error);
      }
    }
  }
}

// Pre-configured caches for different use cases

/**
 * API response cache (5 min TTL)
 */
export const apiCache = new Cache({
  maxSize: 200,
  defaultTTL: 5 * 60 * 1000,
  persistToStorage: false,
  storageKey: 'aminy_api_cache',
});

/**
 * User data cache (30 min TTL, persisted)
 */
export const userCache = new Cache({
  maxSize: 50,
  defaultTTL: 30 * 60 * 1000,
  persistToStorage: true,
  storageKey: 'aminy_user_cache',
});

/**
 * AI response cache (1 hour TTL)
 */
export const aiResponseCache = new Cache<string>({
  maxSize: 100,
  defaultTTL: 60 * 60 * 1000,
  persistToStorage: true,
  storageKey: 'aminy_ai_cache',
});

/**
 * Community feed cache (2 min TTL)
 */
export const communityCache = new Cache({
  maxSize: 50,
  defaultTTL: 2 * 60 * 1000,
  persistToStorage: false,
  storageKey: 'aminy_community_cache',
});

// Cache key generators
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  profile: (userId: string) => `profile:${userId}`,
  children: (userId: string) => `children:${userId}`,
  posts: (category?: string) => `posts:${category || 'all'}`,
  comments: (postId: string) => `comments:${postId}`,
  providers: (filters?: string) => `providers:${filters || 'all'}`,
  analytics: (userId: string, range: string) => `analytics:${userId}:${range}`,
  aiContext: (userId: string) => `ai-context:${userId}`,
};

// Helper to wrap fetch with caching
export async function cachedFetch<T>(
  cache: Cache<T>,
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return cache.getOrSet(key, fetcher, ttl);
}

export { Cache };
export default apiCache;
