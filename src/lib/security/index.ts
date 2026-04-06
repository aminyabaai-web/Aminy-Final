// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Security Module - Barrel Export
 *
 * Central entry point for all security utilities:
 * - CSRF protection
 * - Encrypted storage (HIPAA-compliant)
 * - Secure fetch wrapper
 * - Auth rate limiting
 * - Input sanitization
 * - Security headers
 * - Session management
 */

// ---- CSRF Protection ----
export {
  generateCSRFToken,
  getOrCreateCSRFToken,
  validateCSRFToken,
  clearCSRFToken,
  addCSRFHeader,
  useCSRFToken,
} from './csrf';

// ---- Encrypted Storage ----
export {
  encryptedStorage,
  syncEncryptedStorage,
  SENSITIVE_KEYS,
} from './encrypted-storage';
export type { default as EncryptedStorageDefault } from './encrypted-storage';

// ---- Secure Fetch ----
export { secureFetch, secureApi, useSecureFetch } from './secure-fetch';

// ---- Security Headers ----
export {
  getSecurityHeaders,
  getSecurityHeadersConfig,
  getVercelHeaders,
} from './headers';
export type { SecurityHeaders } from './headers';

// ---- Session Management ----
export {
  isSessionValid,
  refreshSessionIfNeeded,
  clearSession,
  getValidSession,
  setupSessionRefresh,
  useSecureSession,
} from './session';
export type { SessionData } from './session';

// ---- BAA Requirements ----
export {
  BAA_REQUIREMENTS,
  getBAAComplianceStatus,
  hasBAACoverage,
} from './baa-requirements';
export type { BAARequirement } from './baa-requirements';

// ---- Global Security Configuration ----
export interface SecurityConfig {
  /** Enable CSRF protection on state-changing requests */
  csrfEnabled: boolean;
  /** Enable encrypted storage for sensitive keys */
  encryptionEnabled: boolean;
  /** Enable audit logging */
  auditLoggingEnabled: boolean;
  /** Enable breach detection (periodic scanning) */
  breachDetectionEnabled: boolean;
  /** Breach detection interval in milliseconds (default: 5 min) */
  breachDetectionIntervalMs: number;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  csrfEnabled: true,
  encryptionEnabled: true,
  auditLoggingEnabled: true,
  breachDetectionEnabled: true,
  breachDetectionIntervalMs: 5 * 60 * 1000, // 5 minutes
};

const SECURITY_CONFIG_KEY = 'aminy_security_config';

/** Get the active security configuration */
export function getSecurityConfig(): SecurityConfig {
  try {
    const stored = localStorage.getItem(SECURITY_CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // Fall back to defaults
  }
  return DEFAULT_SECURITY_CONFIG;
}

/** Update security configuration */
export function updateSecurityConfig(partial: Partial<SecurityConfig>): SecurityConfig {
  const current = getSecurityConfig();
  const updated = { ...current, ...partial };
  localStorage.setItem(SECURITY_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}
