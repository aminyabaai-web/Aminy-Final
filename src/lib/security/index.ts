/**
 * Security Module Exports
 * Centralized exports for all security functionality
 */

// CSRF Protection
export {
  generateCSRFToken,
  getOrCreateCSRFToken,
  validateCSRFToken,
  clearCSRFToken,
  addCSRFHeader,
  useCSRFToken,
  validateCSRFMiddleware,
} from './csrf';

// Security Headers
export {
  getSecurityHeaders,
  getSecurityHeadersConfig,
  getVercelHeaders,
  type SecurityHeaders,
} from './headers';

// Session Management
export {
  isSessionValid,
  refreshSessionIfNeeded,
  clearSession,
  getValidSession,
  setupSessionRefresh,
  useSecureSession,
  type SessionData,
} from './session';

// Auth Rate Limiting
export {
  isAuthRateLimited,
  recordFailedAuthAttempt,
  recordSuccessfulAuth,
  clearAuthRateLimit,
  useAuthRateLimit,
} from './auth-rate-limit';

// Encrypted Storage
export {
  encryptedStorage,
  syncEncryptedStorage,
  SENSITIVE_KEYS,
} from './encrypted-storage';

// Input Sanitization
export {
  sanitizeText,
  sanitizeRichText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeJSON,
  sanitizeSearchQuery,
  sanitizeObject,
  sanitizeFormData,
  sanitizeWithMaxLength,
  createSanitizedChangeHandler,
  default as sanitize,
} from './sanitize';

// Secure Fetch (with CSRF protection)
export {
  secureFetch,
  secureApi,
  useSecureFetch,
} from './secure-fetch';

// Security utilities
export const SecurityConfig = {
  // Session settings
  SESSION_REFRESH_INTERVAL: 60000, // 1 minute
  SESSION_TIMEOUT_WARNING: 5 * 60 * 1000, // 5 minutes before expiry

  // Rate limiting
  AUTH_MAX_ATTEMPTS: 5,
  AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_LOCKOUT_MS: 30 * 60 * 1000, // 30 minutes

  // CSRF
  CSRF_HEADER_NAME: 'X-CSRF-Token',
  CSRF_COOKIE_NAME: 'csrf_token',

  // Sensitive operations that require CSRF
  CSRF_PROTECTED_METHODS: ['POST', 'PUT', 'PATCH', 'DELETE'],

  // Encryption
  ENCRYPTION_ALGORITHM: 'AES-GCM',
  ENCRYPTION_KEY_LENGTH: 256,
} as const;
