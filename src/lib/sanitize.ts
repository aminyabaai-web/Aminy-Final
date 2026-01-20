/**
 * Input Sanitization Utilities
 *
 * Protects against XSS, prompt injection, and other input-based attacks.
 * All user input should pass through these functions before:
 * - Rendering in the DOM
 * - Sending to AI/LLM APIs
 * - Storing in the database
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content for safe DOM rendering
 * Removes scripts, event handlers, and dangerous elements
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Strip all HTML tags - for plain text only contexts
 */
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize user input for AI/LLM prompts
 * Prevents prompt injection attacks
 */
export function sanitizeForAI(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove common prompt injection patterns
  let sanitized = input
    // Remove attempts to break out of context
    .replace(/\[SYSTEM\]/gi, '[filtered]')
    .replace(/\[INST\]/gi, '[filtered]')
    .replace(/\[\/INST\]/gi, '[filtered]')
    .replace(/<<SYS>>/gi, '[filtered]')
    .replace(/<<\/SYS>>/gi, '[filtered]')
    // Remove attempts to impersonate system/assistant
    .replace(/^(system|assistant|human|user):/gim, '[filtered]:')
    // Remove markdown code blocks that might contain injection
    .replace(/```[\s\S]*?```/g, '[code removed]')
    // Remove excessive special characters that might be used for injection
    .replace(/[<>{}[\]\\]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Truncate to reasonable length for chat messages
  const MAX_LENGTH = 4000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH) + '...';
  }

  return sanitized;
}

/**
 * Sanitize user input for database storage
 * Prevents SQL injection (though Supabase parameterizes queries)
 */
export function sanitizeForDatabase(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Strip HTML
  let sanitized = stripHtml(input);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Max length check
  if (trimmed.length > 254) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize a name (parent name, child name, etc.)
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Strip HTML and special characters
  let sanitized = stripHtml(name);

  // Allow only letters, spaces, hyphens, apostrophes
  sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Max length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  return sanitized;
}

/**
 * Sanitize a URL for safe usage
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();

  // Only allow http and https protocols
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Sanitize a phone number
 */
export function sanitizePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters except + at the start
  let sanitized = phone.replace(/[^\d+]/g, '');

  // Ensure + is only at the start
  if (sanitized.includes('+')) {
    sanitized = '+' + sanitized.replace(/\+/g, '');
  }

  // Basic length validation (7-15 digits is standard)
  const digits = sanitized.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize promo/coupon code
 */
export function sanitizePromoCode(code: string): string {
  if (!code || typeof code !== 'string') {
    return '';
  }

  // Allow only alphanumeric and common separators
  return code.toUpperCase().replace(/[^A-Z0-9\-_]/g, '').substring(0, 50);
}

/**
 * Generic text sanitizer with configurable options
 */
export function sanitizeText(
  input: string,
  options: {
    maxLength?: number;
    allowNewlines?: boolean;
    allowBasicPunctuation?: boolean;
  } = {}
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const { maxLength = 1000, allowNewlines = false, allowBasicPunctuation = true } = options;

  // Strip HTML
  let sanitized = stripHtml(input);

  // Handle newlines
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  }

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Remove dangerous characters
  if (!allowBasicPunctuation) {
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  // Max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}
