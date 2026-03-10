/**
 * Input Sanitization Utilities
 *
 * Provides XSS protection for user inputs using DOMPurify
 * and additional validation for common attack vectors.
 */

import DOMPurify from 'dompurify';

// Configure DOMPurify for maximum security
const purifyConfig = {
  ALLOWED_TAGS: [] as string[], // No HTML tags allowed by default
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
  RETURN_DOM: false as const,
  RETURN_DOM_FRAGMENT: false as const,
};

// Relaxed config for rich text fields that need some formatting
const richTextConfig = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
  RETURN_DOM: false as const,
  RETURN_DOM_FRAGMENT: false as const,
};

/**
 * Sanitize plain text input (removes all HTML)
 */
export function sanitizeText(input: string | null | undefined): string {
  if (input == null) return '';
  return (DOMPurify.sanitize(String(input), purifyConfig) as string).trim();
}

/**
 * Sanitize rich text input (allows basic formatting)
 */
export function sanitizeRichText(input: string | null | undefined): string {
  if (input == null) return '';
  return DOMPurify.sanitize(String(input), richTextConfig) as string;
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (input == null) return '';
  // Remove any HTML, then validate email format
  const cleaned = sanitizeText(input).toLowerCase();
  // Basic email validation - just clean dangerous chars
  return cleaned.replace(/[<>'"`;]/g, '');
}

/**
 * Sanitize phone number input
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (input == null) return '';
  // Only allow digits, spaces, dashes, parentheses, and plus
  return String(input).replace(/[^0-9\s\-\(\)\+]/g, '');
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(input: string | null | undefined): string {
  if (input == null) return '';

  const cleaned = sanitizeText(input);

  // Block javascript: and data: URLs
  if (/^(javascript|data|vbscript):/i.test(cleaned)) {
    return '';
  }

  // Ensure URL starts with http:// or https://
  if (cleaned && !cleaned.match(/^https?:\/\//i)) {
    return `https://${cleaned}`;
  }

  return cleaned;
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(input: string | null | undefined): string {
  if (input == null) return '';
  // Remove path traversal attempts and dangerous characters
  return String(input)
    .replace(/\.\./g, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .trim();
}

/**
 * Sanitize JSON input before parsing
 */
export function sanitizeJSON(input: string | null | undefined): string {
  if (input == null) return '{}';
  // Remove potential prototype pollution
  return String(input)
    .replace(/__proto__/g, '')
    .replace(/constructor/g, '')
    .replace(/prototype/g, '');
}

/**
 * Sanitize SQL-like input (for search queries)
 */
export function sanitizeSearchQuery(input: string | null | undefined): string {
  if (input == null) return '';
  // Remove SQL injection attempts
  return sanitizeText(input)
    .replace(/['";\\]/g, '')
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b/gi, '');
}

/**
 * Sanitize object values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: { richTextFields?: string[] } = {}
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      if (options.richTextFields?.includes(key)) {
        result[key] = sanitizeRichText(value);
      } else if (key.toLowerCase().includes('email')) {
        result[key] = sanitizeEmail(value);
      } else if (key.toLowerCase().includes('phone')) {
        result[key] = sanitizePhone(value);
      } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
        result[key] = sanitizeUrl(value);
      } else {
        result[key] = sanitizeText(value);
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'string' ? sanitizeText(item) :
        (item && typeof item === 'object') ? sanitizeObject(item as Record<string, unknown>, options) :
        item
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Validate and sanitize form data before submission
 */
export function sanitizeFormData<T extends Record<string, unknown>>(
  formData: T,
  options: {
    richTextFields?: string[];
    skipFields?: string[];
  } = {}
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(formData)) {
    if (options.skipFields?.includes(key)) {
      result[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      if (options.richTextFields?.includes(key)) {
        result[key] = sanitizeRichText(value);
      } else {
        result[key] = sanitizeText(value);
      }
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Hook for sanitizing form values on change
 */
export function createSanitizedChangeHandler<T>(
  onChange: (value: T) => void,
  sanitizer: (value: string) => string = sanitizeText
) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const sanitized = sanitizer(e.target.value);
    onChange(sanitized as T);
  };
}

/**
 * Max length enforcement with sanitization
 */
export function sanitizeWithMaxLength(
  input: string | null | undefined,
  maxLength: number
): string {
  const sanitized = sanitizeText(input);
  return sanitized.slice(0, maxLength);
}

// ============================================
// PII DETECTION - Enhanced for HIPAA compliance
// ============================================

/** PII detection patterns */
const PII_PATTERNS = {
  // US Social Security Number
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  // US phone (10-digit, with optional country code)
  usPhone: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // International phone (E.164 or common formats)
  intlPhone: /\b\+(?:[1-9]\d{0,2})[-.\s]?\d{1,14}\b/g,
  // Email address
  email: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b/g,
  // Credit card numbers (Visa, MC, Amex, Discover)
  creditCard: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{0,4}\b/g,
  // Bank account / routing numbers (8-17 digits in sequence)
  bankAccount: /\b\d{8,17}\b/g, // Broad — use with care, may false positive
  // US routing number (9 digits starting with specific ranges)
  routingNumber: /\b(?:0[1-9]|1[0-2]|2[1-9]|3[0-2]|6[1-9]|7[0-2]|80)\d{7}\b/g,
  // US Driver's license (varies by state, common patterns)
  driversLicense: /\b[A-Z]\d{7,14}\b/g,
  // Passport number (6-9 alphanumeric)
  passport: /\b[A-Z]{1,2}\d{6,8}\b/g,
  // US Medicare/Medicaid ID
  medicareId: /\b\d{1}[A-Z]{1,2}\d{1,2}[-]?\d{1,2}[-]?\d{1,2}[A-Z]?\b/g,
  // NPI (National Provider Identifier) - 10 digits starting with 1 or 2
  npi: /\b[12]\d{9}\b/g,
  // Date of birth patterns
  dob: /\b(?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
  // IP address
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  // US ZIP+4
  zipPlus4: /\b\d{5}[-]\d{4}\b/g,
} as const;

export type PIIType = keyof typeof PII_PATTERNS;

export interface PIIDetection {
  type: PIIType;
  match: string;
  index: number;
  masked: string;
}

/**
 * Detect PII in text content.
 * Returns array of detected PII with type, match, and masked version.
 * Use for community content moderation, audit logging, and data classification.
 */
export function detectPII(
  input: string,
  options: {
    types?: PIIType[];
    excludeTypes?: PIIType[];
    /** Skip broad patterns that may false-positive (bankAccount, driversLicense, passport) */
    strictMode?: boolean;
  } = {}
): PIIDetection[] {
  if (!input) return [];

  const broadPatterns: PIIType[] = ['bankAccount', 'driversLicense', 'passport', 'ipAddress', 'zipPlus4'];
  const detections: PIIDetection[] = [];

  const typesToCheck = options.types
    ? options.types
    : (Object.keys(PII_PATTERNS) as PIIType[]);

  for (const type of typesToCheck) {
    if (options.excludeTypes?.includes(type)) continue;
    if (options.strictMode && broadPatterns.includes(type)) continue;

    const pattern = new RegExp(PII_PATTERNS[type].source, PII_PATTERNS[type].flags);
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(input)) !== null) {
      detections.push({
        type,
        match: match[0],
        index: match.index,
        masked: maskPII(match[0], type),
      });
    }
  }

  return detections;
}

/**
 * Mask detected PII for safe display or logging
 */
function maskPII(value: string, type: PIIType): string {
  switch (type) {
    case 'ssn':
      return '***-**-' + value.slice(-4);
    case 'usPhone':
    case 'intlPhone':
      return value.slice(0, -4).replace(/\d/g, '*') + value.slice(-4);
    case 'email': {
      const [local, domain] = value.split('@');
      return local[0] + '***@' + domain;
    }
    case 'creditCard':
      return '**** **** **** ' + value.replace(/[-\s]/g, '').slice(-4);
    default:
      return value.slice(0, 2) + '*'.repeat(Math.max(value.length - 4, 2)) + value.slice(-2);
  }
}

/**
 * Check if text contains any PII. Quick boolean check for gating.
 */
export function containsPII(
  input: string,
  options?: { types?: PIIType[]; strictMode?: boolean }
): boolean {
  return detectPII(input, { ...options, strictMode: options?.strictMode ?? true }).length > 0;
}

/**
 * Redact all PII from text, replacing with masked versions.
 * Use for safe logging and analytics.
 */
export function redactPII(input: string, options?: { strictMode?: boolean }): string {
  if (!input) return '';
  const detections = detectPII(input, { strictMode: options?.strictMode ?? true });

  // Sort by index descending so replacements don't shift positions
  const sorted = [...detections].sort((a, b) => b.index - a.index);

  let result = input;
  for (const detection of sorted) {
    result =
      result.slice(0, detection.index) +
      detection.masked +
      result.slice(detection.index + detection.match.length);
  }
  return result;
}


export default {
  text: sanitizeText,
  richText: sanitizeRichText,
  email: sanitizeEmail,
  phone: sanitizePhone,
  url: sanitizeUrl,
  filename: sanitizeFilename,
  json: sanitizeJSON,
  search: sanitizeSearchQuery,
  object: sanitizeObject,
  formData: sanitizeFormData,
  withMaxLength: sanitizeWithMaxLength,
  detectPII,
  containsPII,
  redactPII,
};
