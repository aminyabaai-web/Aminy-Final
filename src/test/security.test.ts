/**
 * Security Tests
 * Tests for CSRF, session management, and security utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCSRFToken,
  getOrCreateCSRFToken,
  validateCSRFToken,
  clearCSRFToken,
  addCSRFHeader,
} from '../lib/security/csrf';

describe('CSRF Token Generation', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should generate a 64-character hex token', () => {
    const token = generateCSRFToken();

    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it('should generate unique tokens', () => {
    const token1 = generateCSRFToken();
    const token2 = generateCSRFToken();

    expect(token1).not.toBe(token2);
  });
});

describe('CSRF Token Storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should create token if not exists', () => {
    const token = getOrCreateCSRFToken();

    expect(token).toHaveLength(64);
    expect(sessionStorage.getItem('aminy_csrf_token')).toBe(token);
  });

  it('should return existing token', () => {
    const token1 = getOrCreateCSRFToken();
    const token2 = getOrCreateCSRFToken();

    expect(token1).toBe(token2);
  });

  it('should clear token', () => {
    getOrCreateCSRFToken();
    clearCSRFToken();

    expect(sessionStorage.getItem('aminy_csrf_token')).toBeNull();
  });
});

describe('CSRF Token Validation', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should validate correct token', () => {
    const token = getOrCreateCSRFToken();

    expect(validateCSRFToken(token)).toBe(true);
  });

  it('should reject incorrect token', () => {
    getOrCreateCSRFToken();

    expect(validateCSRFToken('wrong-token')).toBe(false);
  });

  it('should reject empty token', () => {
    getOrCreateCSRFToken();

    expect(validateCSRFToken('')).toBe(false);
  });

  it('should reject when no stored token', () => {
    expect(validateCSRFToken('some-token')).toBe(false);
  });
});

describe('CSRF Header Helper', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should add CSRF token to headers', () => {
    const headers = addCSRFHeader({ 'Content-Type': 'application/json' });

    expect(headers).toHaveProperty('X-CSRF-Token');
    expect(headers).toHaveProperty('Content-Type', 'application/json');
  });

  it('should work with empty headers', () => {
    const headers = addCSRFHeader();

    expect(headers).toHaveProperty('X-CSRF-Token');
  });
});
