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
