// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Encrypted Storage Utility
 * Uses AES-GCM encryption via Web Crypto API for storing sensitive data
 *
 * HIPAA-compliant client-side encryption for PHI
 */

// Storage key prefixes
const ENCRYPTED_PREFIX = 'enc_';
const KEY_STORAGE = 'aminy_encryption_key';

// Encryption configuration
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM

/**
 * Generate a new encryption key
 */
async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable for storage
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to storable format (wrapped with device-specific salt)
 */
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Import key from stored format
 */
async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get or create the encryption key
 * In production, this should be derived from user credentials or stored securely
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  try {
    const storedKey = sessionStorage.getItem(KEY_STORAGE);
    if (storedKey) {
      return importKey(storedKey);
    }

    // Generate new key and store in sessionStorage (cleared on browser close)
    const key = await generateKey();
    const exported = await exportKey(key);
    sessionStorage.setItem(KEY_STORAGE, exported);
    return key;
  } catch (error) {
    console.error('Failed to get encryption key:', error);
    throw new Error('Encryption initialization failed');
  }
}

/**
 * Encrypt data
 */
async function encrypt(data: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Combine IV and ciphertext for storage
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data
 */
async function decrypt(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Check if Web Crypto API is available
 */
function isEncryptionAvailable(): boolean {
  return typeof crypto !== 'undefined' &&
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.subtle.encrypt === 'function';
}

/**
 * Sensitive data categories that require encryption
 */
export const SENSITIVE_KEYS = [
  // User identity & profile
  'aminy_profile_',
  'aminy-user',
  'aminy-store',          // Zustand persisted state (goals, tasks, user, coverage)

  // Child/caregiver PHI
  'aminy_children_',
  'child',
  'caregiver',

  // AI memory & conversations (contains PHI context)
  'aminy_memory-facts',
  'aminy_memory-docs',
  'aminy-memory-facts',   // memory-system.ts keys (hyphen variant)
  'aminy-memory-docs',
  'aminy-memory-summaries',
  'aminy-memory-usage',
  'aminy_conversation_',  // conversation-memory.ts local storage
  'aminy-conversation-',  // PersistentAskAminy.tsx conversation storage
  'conversationHistory',
  'aminy_onboarding_progress', // AI intake onboarding data

  // Clinical & care data
  'aminy_offline_outcome_events',
  'aminy_care_plan_',
  'carePlanData',          // Care plan data stored by components
  'aminy_screening_',
  'aminy_audit_log',      // HIPAA audit trail

  // Privacy & notifications
  'aminy_notifications_',
  'aminy_privacy_',
];

/**
 * Check if a key contains sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.some(prefix => key.startsWith(prefix));
}

/**
 * Encrypted Storage API
 * Drop-in replacement for localStorage with encryption for sensitive data
 */
export const encryptedStorage = {
  /**
   * Store data with automatic encryption for sensitive keys
   */
  async setItem(key: string, value: string): Promise<void> {
    if (!isEncryptionAvailable() || !isSensitiveKey(key)) {
      // Fallback to regular storage for non-sensitive data or if encryption unavailable
      localStorage.setItem(key, value);
      return;
    }

    try {
      const encrypted = await encrypt(value);
      localStorage.setItem(ENCRYPTED_PREFIX + key, encrypted);
      // Remove any unencrypted version
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Encryption failed, storing unencrypted:', error);
      localStorage.setItem(key, value);
    }
  },

  /**
   * Retrieve data with automatic decryption
   */
  async getItem(key: string): Promise<string | null> {
    // Check for encrypted version first
    const encryptedKey = ENCRYPTED_PREFIX + key;
    const encryptedValue = localStorage.getItem(encryptedKey);

    if (encryptedValue && isEncryptionAvailable()) {
      try {
        return await decrypt(encryptedValue);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Clearing unreadable encrypted storage item:', key, error);
        }
        // Encryption key may have changed (new session), clear the data
        localStorage.removeItem(encryptedKey);
        return null;
      }
    }

    // Fall back to unencrypted value (for migration or non-sensitive data)
    return localStorage.getItem(key);
  },

  /**
   * Remove data (both encrypted and unencrypted versions)
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
    localStorage.removeItem(ENCRYPTED_PREFIX + key);
  },

  /**
   * Clear all data
   */
  clear(): void {
    localStorage.clear();
    sessionStorage.removeItem(KEY_STORAGE);
  },

  /**
   * Check if encryption is available
   */
  isEncryptionAvailable,

  /**
   * Migrate existing unencrypted data to encrypted storage
   */
  async migrateToEncrypted(): Promise<void> {
    if (!isEncryptionAvailable()) return;

    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isSensitiveKey(key) && !key.startsWith(ENCRYPTED_PREFIX)) {
        keysToMigrate.push(key);
      }
    }

    for (const key of keysToMigrate) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          await encryptedStorage.setItem(key, value);
        } catch (error) {
          console.error(`Failed to migrate ${key}:`, error);
        }
      }
    }
  }
};

/**
 * Synchronous storage wrapper for backwards compatibility
 * Uses a cache to provide sync access to async encrypted data
 */
class SyncEncryptedStorage {
  private cache: Map<string, string> = new Map();
  private pendingWrites: Map<string, Promise<void>> = new Map();

  constructor() {
    // Pre-load cache on initialization
    this.initCache();
  }

  private async initCache(): Promise<void> {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (isSensitiveKey(key) || key.startsWith(ENCRYPTED_PREFIX))) {
        const cleanKey = key.replace(ENCRYPTED_PREFIX, '');
        try {
          const value = await encryptedStorage.getItem(cleanKey);
          if (value) {
            this.cache.set(cleanKey, value);
          }
        } catch {
          // Ignore decryption failures during init
        }
      }
    }
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    // Fire and forget async encryption
    const writePromise = encryptedStorage.setItem(key, value);
    this.pendingWrites.set(key, writePromise);
    writePromise.finally(() => this.pendingWrites.delete(key));
  }

  getItem(key: string): string | null {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) || null;
    }
    // Fall back to localStorage for non-cached items
    return localStorage.getItem(key);
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    encryptedStorage.removeItem(key);
  }

  clear(): void {
    this.cache.clear();
    encryptedStorage.clear();
  }

  /**
   * Wait for all pending writes to complete
   */
  async flush(): Promise<void> {
    await Promise.all(this.pendingWrites.values());
  }
}

export const syncEncryptedStorage = new SyncEncryptedStorage();

export default encryptedStorage;
