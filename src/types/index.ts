/**
 * Aminy Type Definitions
 * Central export for all TypeScript types
 */

// Core app types
export * from './app';

// Connector hub types
export * from './connector';

// Video/Daily.co types
export * from './video';

// Form data types
export * from './forms';

// Event types
export * from './events';

// Re-export common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Nullable<T> = T | null;
export type Awaitable<T> = T | Promise<T>;

// Generic API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Generic handler types
export type VoidHandler = () => void;
export type AsyncVoidHandler = () => Promise<void>;
export type ValueHandler<T> = (value: T) => void;
export type AsyncValueHandler<T> = (value: T) => Promise<void>;

// Error types
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
}

// Supabase types
export interface SupabaseUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

// Cache types
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}
