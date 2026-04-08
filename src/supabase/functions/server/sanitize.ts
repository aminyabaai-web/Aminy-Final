// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Server-Side Input Sanitization
 *
 * Protects against prompt injection and other input-based attacks.
 * This is the server-side version (Deno compatible) - no DOM dependencies.
 */

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
    .replace(/```[\s\S]*?```/g, '[code block]')
    // Remove attempts to override instructions
    .replace(/ignore (all |previous |prior |above )?(instructions|rules|guidelines)/gi, '[filtered]')
    .replace(/disregard (all |previous |prior |above )?(instructions|rules|guidelines)/gi, '[filtered]')
    .replace(/forget (all |previous |prior |above )?(instructions|rules|guidelines)/gi, '[filtered]')
    // Remove attempts to reveal system prompt
    .replace(/what (are |is )?(your|the) (system |initial )?(prompt|instructions)/gi, '[filtered]')
    .replace(/show (me )?(your|the) (system |initial )?(prompt|instructions)/gi, '[filtered]')
    .replace(/print (your|the) (system |initial )?(prompt|instructions)/gi, '[filtered]')
    // Remove excessive special characters that might be used for injection
    .replace(/[<>{}[\]\\`]/g, '')
    // Normalize whitespace but preserve natural line breaks
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Truncate to reasonable length for chat messages
  const MAX_LENGTH = 4000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH) + '...';
  }

  return sanitized;
}

/**
 * Sanitize an array of chat messages
 */
export function sanitizeMessages(
  messages: Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.map(msg => ({
    role: sanitizeRole(msg.role),
    content: sanitizeForAI(msg.content || ''),
  })).filter(msg => msg.content.length > 0);
}

/**
 * Sanitize message role to prevent role injection
 */
function sanitizeRole(role: string): string {
  const validRoles = ['user', 'assistant', 'system'];
  const normalized = String(role).toLowerCase().trim();
  return validRoles.includes(normalized) ? normalized : 'user';
}

/**
 * Strip HTML tags from text (basic server-side version)
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Sanitize user input for database storage
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

  // Strip HTML
  let sanitized = stripHtml(name);

  // Allow only letters, spaces, hyphens, apostrophes (support international names)
  sanitized = sanitized.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Max length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
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
 * Scrub PII from error messages before returning to client
 * SECURITY: Prevents leaking sensitive data in error responses
 */
export function scrubPIIFromError(error: string | Error | unknown): string {
  if (!error) {
    return 'An unexpected error occurred';
  }

  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = 'An unexpected error occurred';
  }

  // Scrub common PII patterns
  let scrubbed = errorMessage
    // Scrub email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    // Scrub phone numbers (various formats)
    .replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[phone]')
    // Scrub SSN patterns
    .replace(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, '[ssn]')
    // Scrub credit card numbers (basic pattern)
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[card]')
    // Scrub UUIDs (often user IDs)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
    // Scrub JWT tokens
    .replace(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[token]')
    // Scrub API keys that start with common prefixes
    .replace(/\b(sk_|pk_|api_|key_|secret_)[a-zA-Z0-9_-]{20,}/g, '[api_key]')
    // Scrub IP addresses
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip]')
    // Scrub file paths that might contain usernames
    .replace(/\/Users\/[^\/]+\//g, '/Users/[user]/')
    .replace(/C:\\Users\\[^\\]+\\/gi, 'C:\\Users\\[user]\\');

  // Truncate long error messages
  if (scrubbed.length > 200) {
    scrubbed = scrubbed.substring(0, 200) + '...';
  }

  return scrubbed;
}

/**
 * Create safe error response with PII scrubbed
 * SECURITY: Always use this for client-facing error responses
 */
export function createSafeErrorResponse(
  error: string | Error | unknown,
  code: string = 'ERROR',
  status: number = 500
): Response {
  const safeMessage = scrubPIIFromError(error);

  return new Response(
    JSON.stringify({
      error: safeMessage,
      code,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Detect potential prompt injection attacks
 * SECURITY: Returns true if suspicious patterns detected
 */
export function detectPromptInjection(input: string): {
  suspicious: boolean;
  patterns: string[];
} {
  if (!input || typeof input !== 'string') {
    return { suspicious: false, patterns: [] };
  }

  const patterns: string[] = [];

  // Check for role impersonation
  if (/^(system|assistant|human):/im.test(input)) {
    patterns.push('role_impersonation');
  }

  // Check for instruction override attempts
  if (/ignore (all |previous |prior |above )?(instructions|rules|guidelines)/i.test(input)) {
    patterns.push('instruction_override');
  }

  // Check for system prompt extraction
  if (/what (are |is )?(your|the) (system |initial )?(prompt|instructions)/i.test(input)) {
    patterns.push('prompt_extraction');
  }

  // Check for context delimiter injection
  if (/\[SYSTEM\]|\[INST\]|<<SYS>>|<<\/SYS>>/i.test(input)) {
    patterns.push('context_delimiter');
  }

  // Check for jailbreak keywords
  if (/(DAN|do anything now|jailbreak|developer mode|unrestricted)/i.test(input)) {
    patterns.push('jailbreak_attempt');
  }

  // Check for excessive special characters (possible obfuscation)
  const specialCharRatio = (input.match(/[^\w\s.,!?'"()-]/g) || []).length / input.length;
  if (specialCharRatio > 0.3) {
    patterns.push('high_special_char_ratio');
  }

  // Check for Base64 encoded content (possible encoded injection)
  if (/^[A-Za-z0-9+/]{50,}={0,2}$/.test(input.trim())) {
    patterns.push('base64_content');
  }

  // Check for Unicode homograph attacks
  if (/[\u0400-\u04FF\u0500-\u052F]/.test(input)) {
    patterns.push('cyrillic_chars');
  }

  return {
    suspicious: patterns.length > 0,
    patterns,
  };
}
