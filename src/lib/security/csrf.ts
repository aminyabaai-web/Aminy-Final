/**
 * CSRF Protection Module
 * Generates and validates CSRF tokens for state-changing operations
 */

// Generate a cryptographically secure random token
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Store token in sessionStorage (cleared on tab close)
const CSRF_TOKEN_KEY = 'aminy_csrf_token';

export function getOrCreateCSRFToken(): string {
  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  }
  return token;
}

export function validateCSRFToken(token: string): boolean {
  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  if (!storedToken || !token) return false;

  // Constant-time comparison to prevent timing attacks
  if (storedToken.length !== token.length) return false;

  let result = 0;
  for (let i = 0; i < storedToken.length; i++) {
    result |= storedToken.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return result === 0;
}

export function clearCSRFToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
}

// Helper to add CSRF token to fetch requests
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getOrCreateCSRFToken();
  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

// React hook for CSRF protection
import { useEffect, useState } from 'react';

export function useCSRFToken(): string {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    setToken(getOrCreateCSRFToken());
  }, []);

  return token;
}

// Middleware function to validate CSRF on server
export function validateCSRFMiddleware(request: Request): boolean {
  const token = request.headers.get('X-CSRF-Token');
  const cookieToken = getCookieValue(request.headers.get('Cookie') || '', 'csrf_token');

  if (!token || !cookieToken) return false;

  // Constant-time comparison
  if (token.length !== cookieToken.length) return false;

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }
  return result === 0;
}

function getCookieValue(cookies: string, name: string): string | null {
  const match = cookies.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}
