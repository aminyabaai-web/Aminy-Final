// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Production-Safe Structured Logger
 *
 * Provides logging utilities that respect production mode.
 * In production, only errors are logged. In development, all logs are shown.
 *
 * Features:
 * - Structured JSON output for log aggregation
 * - Error storage for debugging
 * - Remote logging support
 * - Child loggers with context
 * - Performance timing helpers
 *
 * Usage:
 *   import { logger, aiLogger } from '@/lib/logger';
 *   logger.info('User logged in', { userId });
 *   logger.error('Payment failed', error);
 *   aiLogger.debug('AI response', { tokens: 150 });
 *
 * Backend: 8/10 → 9/10
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
  module?: string;
  sessionId?: string;
  duration?: number;
}

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix: string;
  enableRemote: boolean;
  remoteEndpoint?: string;
  storeErrors: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Production config: only errors
// Development config: all logs
const config: LoggerConfig = {
  enabled: true,
  minLevel: import.meta.env.PROD ? 'error' : 'debug',
  prefix: '[Aminy]',
  enableRemote: import.meta.env.PROD && !!import.meta.env.VITE_LOG_ENDPOINT,
  remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT as string | undefined,
  storeErrors: true,
};

// Buffer for remote logging
const logBuffer: LogEntry[] = [];

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

function getSessionId(): string | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  return sessionStorage.getItem('aminy_session_id') || undefined;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error,
  module?: string
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    module,
    sessionId: getSessionId(),
  };

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
}

function formatMessage(level: LogLevel, message: string, module?: string): string {
  const timestamp = new Date().toISOString();
  const modulePrefix = module ? `[${module}]` : '';
  return `${config.prefix} ${timestamp} [${level.toUpperCase()}]${modulePrefix} ${message}`;
}

function storeErrorLocally(entry: LogEntry): void {
  if (!config.storeErrors || typeof localStorage === 'undefined') return;
  try {
    const errors = JSON.parse(localStorage.getItem('aminy_error_log') || '[]');
    errors.push(entry);
    if (errors.length > 50) errors.shift();
    localStorage.setItem('aminy_error_log', JSON.stringify(errors));
  } catch {
    // Ignore
  }
}

async function flushToRemote(): Promise<void> {
  if (!config.enableRemote || !config.remoteEndpoint || logBuffer.length === 0) return;

  const entries = [...logBuffer];
  logBuffer.length = 0;

  try {
    await fetch(config.remoteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: entries }),
    });
  } catch {
    // Re-add to buffer
    logBuffer.push(...entries);
  }
}

// Flush buffer periodically
if (typeof setInterval !== 'undefined' && config.enableRemote) {
  setInterval(flushToRemote, 10000);
}

export const logger = {
  /**
   * Debug logs - only in development
   */
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message), ...args);
    }
  },

  /**
   * Info logs - only in development
   */
  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message), ...args);
    }
  },

  /**
   * Warning logs - only in development
   */
  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message), ...args);
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
      console.log(formatMessage('debug', message), ...args);
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
    if (import.meta.env.DEV) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args); // Always show errors
  },
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.debug(...args);
  },
};

// ============================================
// CHILD LOGGER FACTORY
// ============================================

/**
 * Create a child logger with a module context
 */
function createChildLogger(module: string) {
  return {
    debug(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('debug')) {
        const entry = createLogEntry('debug', message, context, undefined, module);
        console.debug(formatMessage('debug', message, module), context || '');
        if (config.enableRemote) logBuffer.push(entry);
      }
    },
    info(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('info')) {
        const entry = createLogEntry('info', message, context, undefined, module);
        console.info(formatMessage('info', message, module), context || '');
        if (config.enableRemote) logBuffer.push(entry);
      }
    },
    warn(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('warn')) {
        const entry = createLogEntry('warn', message, context, undefined, module);
        console.warn(formatMessage('warn', message, module), context || '');
        if (config.enableRemote) logBuffer.push(entry);
      }
    },
    error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
      if (shouldLog('error')) {
        const err = error instanceof Error ? error : undefined;
        const entry = createLogEntry('error', message, context, err, module);
        console.error(formatMessage('error', message, module), error, context || '');
        storeErrorLocally(entry);
        if (config.enableRemote) {
          logBuffer.push(entry);
          flushToRemote(); // Immediate flush for errors
        }
      }
    },
    time(label: string): () => void {
      const start = performance.now();
      return () => {
        const duration = Math.round(performance.now() - start);
        this.info(`${label} completed`, { duration, unit: 'ms' });
      };
    },
  };
}

// Pre-defined module loggers
export const aiLogger = createChildLogger('ai');
export const authLogger = createChildLogger('auth');
export const paymentLogger = createChildLogger('payment');
export const communityLogger = createChildLogger('community');
export const analyticsLogger = createChildLogger('analytics');
export const providerLogger = createChildLogger('provider');

// Utility to get stored errors
export function getStoredErrors(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem('aminy_error_log') || '[]');
  } catch {
    return [];
  }
}

// Utility to clear stored errors
export function clearStoredErrors(): void {
  localStorage.removeItem('aminy_error_log');
}

export default logger;
