/**
 * Input Sanitization Utilities
 *
 * Provides XSS protection for user inputs using DOMPurify
 * and additional validation for common attack vectors.
 */

import DOMPurify from 'dompurify';

// Configure DOMPurify for maximum security
const purifyConfig: DOMPurify.Config = {
  ALLOWED_TAGS: [], // No HTML tags allowed by default
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

// Relaxed config for rich text fields that need some formatting
const richTextConfig: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

/**
 * Sanitize plain text input (removes all HTML)
 */
export function sanitizeText(input: string | null | undefined): string {
  if (input == null) return '';
  return DOMPurify.sanitize(String(input), purifyConfig).trim();
}

/**
 * Sanitize rich text input (allows basic formatting)
 */
export function sanitizeRichText(input: string | null | undefined): string {
  if (input == null) return '';
  return DOMPurify.sanitize(String(input), richTextConfig);
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
};
