/**
 * Production-Safe Logger
 *
 * Provides logging utilities that respect production mode.
 * In production, only errors are logged. In development, all logs are shown.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('User logged in', { userId });
 *   logger.error('Payment failed', error);
 *   logger.debug('State update', state);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Production config: only errors
// Development config: all logs
const config: LoggerConfig = {
  enabled: true,
  minLevel: import.meta.env.PROD ? 'error' : 'debug',
  prefix: '[Aminy]',
};

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `${config.prefix} ${timestamp} [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  /**
   * Debug logs - only in development
   */
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
    }
  },

  /**
   * Info logs - only in development
   */
  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
    }
  },

  /**
   * Warning logs - only in development
   */
  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
    }
  },

  /**
   * Error logs - always shown (in prod too)
   */
  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message), error, ...args);
    }
  },

  /**
   * Development-only log (for feature flags, dev tools, etc.)
   */
  dev(message: string, ...args: unknown[]): void {
    if (import.meta.env.DEV) {
    }
  },

  /**
   * Group logs (dev only)
   */
  group(label: string, fn: () => void): void {
    if (import.meta.env.DEV) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  },

  /**
   * Table logs (dev only)
   */
  table(data: unknown): void {
    if (import.meta.env.DEV) {
      console.table(data);
    }
  },
};

// Export a production-safe console replacement
export const safeConsole = {
  log: (...args: unknown[]) => {
  },
  info: (...args: unknown[]) => {
  },
  warn: (...args: unknown[]) => {
  },
  error: (...args: unknown[]) => {
    console.error(...args); // Always show errors
  },
  debug: (...args: unknown[]) => {
  },
};

export default logger;
