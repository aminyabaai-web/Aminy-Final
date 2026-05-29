// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Encrypted Storage Utility
 * Uses AES-GCM encryption via Web Crypto API for storing sensitive data
 *
 * Key derivation: PBKDF2 from userId — non-extractable, never stored.
 * XSS cannot read the key because it never touches sessionStorage/localStorage.
 */

const ENCRYPTED_PREFIX = 'enc_';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100_000;
// Static app-level salt — not secret, just ensures key uniqueness across apps.
const APP_SALT = 'aminy-phi-store-v2-aes-gcm';

// ─── Key management ──────────────────────────────────────────────────────────

// Module-level identity — set once on user login via initEncryption().
let _userId: string | null = null;
// Promise cache so we only derive once per user per session.
let _derivedKeyPromise: Promise<CryptoKey> | null = null;

/**
 * Call once when user authenticates so PBKDF2 key can be derived.
 * Invalidates cached key if the user changes.
 */
export function initEncryption(userId: string): void {
  if (_userId !== userId) {
    _userId = userId;
    _derivedKeyPromise = null;
  }
}

/**
 * Derive a non-extractable AES-GCM-256 key from the user's ID using PBKDF2.
 * The derived CryptoKey is marked extractable:false — it can never leave
 * the browser's WebCrypto subsystem, even via XSS.
 */
async function deriveKeyFromUserId(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(userId),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(APP_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // NOT extractable — key never leaves WebCrypto
    ['encrypt', 'decrypt']
  );
}

/**
 * Returns the encryption key for the current user.
 * Throws if called before initEncryption() — no key, no operation.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  if (!_userId) {
    throw new Error('Encryption not initialized: no userId. Call initEncryption(userId) after login.');
  }
  if (!_derivedKeyPromise) {
    _derivedKeyPromise = deriveKeyFromUserId(_userId);
  }
  return _derivedKeyPromise;
}

// ─── Crypto primitives ────────────────────────────────────────────────────────

async function encrypt(data: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(data)
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: combined.slice(0, IV_LENGTH) },
    key,
    combined.slice(IV_LENGTH)
  );
  return new TextDecoder().decode(decrypted);
}

function isEncryptionAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.encrypt === 'function'
  );
}

// ─── Sensitive key list ───────────────────────────────────────────────────────

export const SENSITIVE_KEYS = [
  'aminy_profile_',
  'aminy-user',
  'aminy-store',
  'aminy_children_',
  'child',
  'caregiver',
  'aminy_memory-facts',
  'aminy_memory-docs',
  'aminy-memory-facts',
  'aminy-memory-docs',
  'aminy-memory-summaries',
  'aminy-memory-usage',
  'aminy_conversation_',
  'aminy-conversation-',
  'conversationHistory',
  'aminy_onboarding_progress',
  'aminy_offline_outcome_events',
  'aminy_care_plan_',
  'carePlanData',
  'aminy_screening_',
  'aminy_audit_log',
  'aminy_notifications_',
  'aminy_privacy_',
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.some(prefix => key.startsWith(prefix));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const encryptedStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (!isEncryptionAvailable() || !isSensitiveKey(key) || !_userId) {
      localStorage.setItem(key, value);
      return;
    }
    try {
      const encrypted = await encrypt(value);
      localStorage.setItem(ENCRYPTED_PREFIX + key, encrypted);
      localStorage.removeItem(key); // remove any legacy plaintext version
    } catch {
      // Graceful degradation — store unencrypted rather than lose data
      localStorage.setItem(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    const encryptedKey = ENCRYPTED_PREFIX + key;
    const encryptedValue = localStorage.getItem(encryptedKey);

    if (encryptedValue && isEncryptionAvailable() && _userId) {
      try {
        return await decrypt(encryptedValue);
      } catch {
        if (import.meta.env.DEV) {
          console.warn('Clearing unreadable encrypted item:', key);
        }
        // Key mismatch (different user or rotated key) — clear stale data
        localStorage.removeItem(encryptedKey);
        return null;
      }
    }

    return localStorage.getItem(key);
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
    localStorage.removeItem(ENCRYPTED_PREFIX + key);
  },

  clear(): void {
    localStorage.clear();
  },

  isEncryptionAvailable,

  async migrateToEncrypted(): Promise<void> {
    if (!isEncryptionAvailable() || !_userId) return;
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
        } catch { /* non-critical */ }
      }
    }
  }
};

// ─── Sync wrapper (cache-backed) ──────────────────────────────────────────────

class SyncEncryptedStorage {
  private cache: Map<string, string> = new Map();
  private pendingWrites: Map<string, Promise<void>> = new Map();

  constructor() {
    this.initCache();
  }

  private async initCache(): Promise<void> {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (isSensitiveKey(key) || key.startsWith(ENCRYPTED_PREFIX))) {
        const cleanKey = key.replace(ENCRYPTED_PREFIX, '');
        try {
          const value = await encryptedStorage.getItem(cleanKey);
          if (value) this.cache.set(cleanKey, value);
        } catch { /* ignore decryption failures during init */ }
      }
    }
  }

  /** Re-populate cache after initEncryption() is called. */
  async refreshCache(): Promise<void> {
    this.cache.clear();
    await this.initCache();
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    const writePromise = encryptedStorage.setItem(key, value);
    this.pendingWrites.set(key, writePromise);
    writePromise.finally(() => this.pendingWrites.delete(key));
  }

  getItem(key: string): string | null {
    if (this.cache.has(key)) return this.cache.get(key) || null;
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

  async flush(): Promise<void> {
    await Promise.all(this.pendingWrites.values());
  }
}

export const syncEncryptedStorage = new SyncEncryptedStorage();

export default encryptedStorage;
