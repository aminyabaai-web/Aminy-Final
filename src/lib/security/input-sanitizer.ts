/**
 * Advanced Input Validation & Sanitization
 *
 * Extends the existing sanitize.ts with:
 * - Unified sanitizeInput(value, type) API for all input types
 * - File upload validation (type, size, malware signature detection)
 * - SQL injection pattern detection for search queries
 * - PII detection with user-facing warnings
 * - Input length and pattern validation
 *
 * This module is designed to be the single entry point for all input
 * validation in the application, complementing DOMPurify-based sanitization
 * in the existing security/sanitize.ts.
 *
 * Security References:
 * - OWASP Input Validation Cheat Sheet
 * - OWASP XSS Prevention Cheat Sheet
 * - HIPAA §164.312(c)(1) — Integrity controls
 */

// ============================================================================
// Types
// ============================================================================

/** Supported input types for the unified sanitizer */
export type InputType =
  | 'text'
  | 'richText'
  | 'email'
  | 'phone'
  | 'url'
  | 'search'
  | 'filename'
  | 'json'
  | 'number'
  | 'alphanumeric'
  | 'name'
  | 'address'
  | 'clinicalNote'
  | 'password';

/** Result of input sanitization */
export interface SanitizeResult {
  /** The sanitized value */
  value: string;
  /** Whether the input was modified during sanitization */
  wasModified: boolean;
  /** Warnings generated during sanitization */
  warnings: SanitizeWarning[];
  /** Whether the input is considered valid after sanitization */
  isValid: boolean;
}

/** Warning generated during sanitization */
export interface SanitizeWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

/** File validation result */
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    sanitizedName: string;
    size: number;
    sizeFormatted: string;
    type: string;
    extension: string;
  };
}

/** PII detection result for user-facing warnings */
export interface PIIWarning {
  type: string;
  message: string;
  suggestion: string;
}

/** File upload constraints */
export interface FileUploadConstraints {
  /** Maximum file size in bytes (default: 10 MB) */
  maxSizeBytes: number;
  /** Allowed MIME types (empty = all allowed) */
  allowedMimeTypes: string[];
  /** Allowed file extensions (empty = all allowed) */
  allowedExtensions: string[];
  /** Blocked file extensions (dangerous file types) */
  blockedExtensions: string[];
  /** Maximum filename length */
  maxFilenameLength: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default file upload constraints */
const DEFAULT_FILE_CONSTRAINTS: FileUploadConstraints = {
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/json',
  ],
  allowedExtensions: [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic',
    '.doc', '.docx', '.txt', '.csv', '.json',
  ],
  blockedExtensions: [
    '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
    '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.ps1',
    '.psm1', '.psd1', '.ps1xml', '.cpl', '.inf', '.reg',
    '.rgs', '.sct', '.shb', '.shs', '.ws', '.wsc', '.lnk',
    '.jar', '.dll', '.sys', '.drv', '.ocx',
  ],
  maxFilenameLength: 255,
};

/** Known malware file signatures (magic bytes) */
const MALWARE_SIGNATURES: Array<{ name: string; hex: string; offset: number }> = [
  // Windows executable
  { name: 'Windows PE Executable', hex: '4d5a', offset: 0 },
  // ELF binary
  { name: 'ELF Binary', hex: '7f454c46', offset: 0 },
  // Mach-O binary (macOS)
  { name: 'Mach-O Binary', hex: 'feedface', offset: 0 },
  { name: 'Mach-O 64-bit Binary', hex: 'feedfacf', offset: 0 },
  // Java class file
  { name: 'Java Class File', hex: 'cafebabe', offset: 0 },
];

/** SQL injection patterns */
const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|UNION|TRUNCATE|DECLARE)\b)/gi,
  /(--|;|\/\*|\*\/|@@|@)/g,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
  /(\b(OR|AND)\b\s+'[^']*'\s*=\s*'[^']*')/gi,
  /(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(/gi,
  /(\bWAITFOR\b\s+\bDELAY\b)/gi,
  /(\bBENCHMARK\b\s*\()/gi,
  /(\bSLEEP\b\s*\()/gi,
  /(LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)/gi,
];

/** XSS attack patterns */
const XSS_PATTERNS: RegExp[] = [
  /<script[^>]*>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /data\s*:\s*text\/html/gi,
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<applet[^>]*>/gi,
  /expression\s*\(/gi,
  /url\s*\(\s*javascript/gi,
  /-moz-binding\s*:/gi,
];

/** PII patterns for user-facing warnings (not blocking, just advisory) */
const PII_WARNING_PATTERNS: Array<{ type: string; pattern: RegExp; message: string; suggestion: string }> = [
  {
    type: 'ssn',
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/,
    message: 'This appears to contain a Social Security Number.',
    suggestion: 'Remove the SSN before submitting. SSNs should never be entered in this field.',
  },
  {
    type: 'credit_card',
    pattern: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{0,4}\b/,
    message: 'This appears to contain a credit card number.',
    suggestion: 'Remove the credit card number. Payment information should only be entered in secure payment forms.',
  },
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/,
    message: 'This contains an email address.',
    suggestion: 'Consider whether this email needs to be included.',
  },
  {
    type: 'phone',
    pattern: /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    message: 'This contains a phone number.',
    suggestion: 'Consider whether this phone number needs to be included.',
  },
  {
    type: 'dob',
    pattern: /\b(?:DOB|born|birthday|date\s*of\s*birth)\s*:?\s*(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])[-/.](?:19|20)\d{2}\b/i,
    message: 'This appears to contain a date of birth.',
    suggestion: 'Dates of birth are sensitive PHI. Ensure this field is appropriate for this data.',
  },
  {
    type: 'mrn',
    pattern: /\b(?:MRN|MR#|Medical\s*Record)\s*[-:#]?\s*\d{5,12}\b/i,
    message: 'This appears to contain a Medical Record Number.',
    suggestion: 'MRNs are protected health information. Verify this is an appropriate location for this data.',
  },
];

// ============================================================================
// Core Sanitization Functions
// ============================================================================

/**
 * Remove HTML tags from a string (whitelist: none by default).
 */
function stripHTML(input: string): string {
  // Use a DOM parser for robust tag removal
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(input, 'text/html');
    return doc.body.textContent ?? '';
  }
  // Fallback: regex-based stripping
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Remove control characters except common whitespace.
 */
function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Normalize Unicode to NFC form to prevent homoglyph attacks.
 */
function normalizeUnicode(input: string): string {
  return input.normalize('NFC');
}

/**
 * Check for SQL injection patterns in a string.
 */
function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => {
    const regex = new RegExp(pattern.source, pattern.flags);
    return regex.test(input);
  });
}

/**
 * Check for XSS patterns in a string.
 */
function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => {
    const regex = new RegExp(pattern.source, pattern.flags);
    return regex.test(input);
  });
}

/**
 * Remove SQL injection patterns from search queries.
 */
function removeSQLPatterns(input: string): string {
  let result = input;
  for (const pattern of SQL_INJECTION_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    result = result.replace(regex, '');
  }
  return result.trim();
}

// ============================================================================
// Unified Sanitize API
// ============================================================================

/**
 * Unified input sanitization function.
 *
 * Sanitizes the input based on the specified type and returns a result
 * object with the sanitized value, validation status, and any warnings.
 *
 * @example
 * ```ts
 * const result = sanitizeInput('Hello <script>alert("xss")</script>', 'text');
 * // result.value = 'Hello '
 * // result.wasModified = true
 * // result.warnings = [{ code: 'XSS_DETECTED', ... }]
 *
 * const emailResult = sanitizeInput('user@EXAMPLE.com', 'email');
 * // emailResult.value = 'user@example.com'
 *
 * const searchResult = sanitizeInput("'; DROP TABLE users;--", 'search');
 * // searchResult.value = ' TABLE users'
 * // searchResult.warnings = [{ code: 'SQL_INJECTION_DETECTED', ... }]
 * ```
 */
export function sanitizeInput(value: string | null | undefined, type: InputType): SanitizeResult {
  if (value == null || value === '') {
    return { value: '', wasModified: false, warnings: [], isValid: true };
  }

  const original = String(value);
  const warnings: SanitizeWarning[] = [];
  let sanitized = original;

  // Step 1: Universal sanitization (all types)
  sanitized = stripControlChars(sanitized);
  sanitized = normalizeUnicode(sanitized);

  // Step 2: XSS detection (all types)
  if (detectXSS(sanitized)) {
    warnings.push({
      code: 'XSS_DETECTED',
      message: 'Potentially malicious script content was detected and removed.',
      severity: 'error',
    });
  }

  // Step 3: Type-specific sanitization
  switch (type) {
    case 'text':
      sanitized = stripHTML(sanitized).trim();
      break;

    case 'richText':
      // Allow basic HTML formatting tags only
      sanitized = sanitized
        .replace(/<(?!\/?(?:b|i|em|strong|p|br|ul|ol|li|a|h[1-6])\b)[^>]*>/gi, '')
        .trim();
      break;

    case 'email':
      sanitized = stripHTML(sanitized).toLowerCase().trim();
      sanitized = sanitized.replace(/[<>'"`;\\]/g, '');
      if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(sanitized)) {
        warnings.push({
          code: 'INVALID_EMAIL',
          message: 'The email address format is invalid.',
          severity: 'error',
        });
      }
      break;

    case 'phone':
      sanitized = sanitized.replace(/[^0-9\s\-\(\)\+\.]/g, '');
      if (sanitized.replace(/\D/g, '').length < 7) {
        warnings.push({
          code: 'INVALID_PHONE',
          message: 'Phone number appears too short.',
          severity: 'warning',
        });
      }
      break;

    case 'url':
      sanitized = stripHTML(sanitized).trim();
      if (/^(javascript|data|vbscript):/i.test(sanitized)) {
        sanitized = '';
        warnings.push({
          code: 'DANGEROUS_URL',
          message: 'JavaScript/data URLs are not allowed.',
          severity: 'error',
        });
      }
      break;

    case 'search':
      sanitized = stripHTML(sanitized);
      if (detectSQLInjection(sanitized)) {
        warnings.push({
          code: 'SQL_INJECTION_DETECTED',
          message: 'SQL-like patterns were detected and removed from search query.',
          severity: 'error',
        });
        sanitized = removeSQLPatterns(sanitized);
      }
      sanitized = sanitized.replace(/['"`;\\]/g, '').trim();
      break;

    case 'filename':
      sanitized = stripHTML(sanitized);
      sanitized = sanitized
        .replace(/\.\./g, '')
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
        .trim();
      break;

    case 'json':
      sanitized = sanitized
        .replace(/__proto__/g, '')
        .replace(/constructor\s*\[/g, '')
        .replace(/prototype\s*\[/g, '');
      try {
        JSON.parse(sanitized);
      } catch {
        warnings.push({
          code: 'INVALID_JSON',
          message: 'The input is not valid JSON.',
          severity: 'error',
        });
      }
      break;

    case 'number':
      sanitized = sanitized.replace(/[^0-9.\-,]/g, '');
      if (sanitized && isNaN(Number(sanitized.replace(/,/g, '')))) {
        warnings.push({
          code: 'INVALID_NUMBER',
          message: 'The input is not a valid number.',
          severity: 'error',
        });
      }
      break;

    case 'alphanumeric':
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      break;

    case 'name':
      sanitized = stripHTML(sanitized);
      // Allow letters, spaces, hyphens, apostrophes, periods (for Jr., Dr., etc.)
      sanitized = sanitized.replace(/[^a-zA-Z\s\-'.À-ÿ]/g, '').trim();
      break;

    case 'address':
      sanitized = stripHTML(sanitized);
      // Allow common address characters
      sanitized = sanitized.replace(/[<>"'`;\\]/g, '').trim();
      break;

    case 'clinicalNote':
      // Clinical notes: strip dangerous HTML but preserve basic formatting
      sanitized = sanitized
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<(?!\/?(?:b|i|em|strong|p|br|ul|ol|li|h[1-6])\b)[^>]*>/gi, '')
        .trim();
      break;

    case 'password':
      // Passwords: only strip null bytes and control chars (already done above)
      // Do NOT modify the password content itself
      break;
  }

  const wasModified = sanitized !== original;
  const isValid = warnings.filter(w => w.severity === 'error').length === 0;

  return { value: sanitized, wasModified, warnings, isValid };
}

// ============================================================================
// File Upload Validation
// ============================================================================

/**
 * Validate a file for upload.
 *
 * Checks: file type, extension, size, filename safety, and malware signatures.
 *
 * @example
 * ```ts
 * const input = document.querySelector('input[type=file]');
 * const file = input.files[0];
 * const result = await validateUpload(file);
 * if (!result.isValid) {
 *   showErrors(result.errors);
 * }
 * ```
 */
export async function validateUpload(
  file: File,
  constraints?: Partial<FileUploadConstraints>,
): Promise<FileValidationResult> {
  const config = { ...DEFAULT_FILE_CONSTRAINTS, ...constraints };
  const errors: string[] = [];
  const warnings: string[] = [];

  // File info
  const extension = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  const sanitizedName = file.name
    .replace(/\.\./g, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .trim();

  const sizeFormatted = formatFileSize(file.size);

  const fileInfo = {
    name: file.name,
    sanitizedName,
    size: file.size,
    sizeFormatted,
    type: file.type,
    extension,
  };

  // Size check
  if (file.size > config.maxSizeBytes) {
    errors.push(`File size ${sizeFormatted} exceeds maximum of ${formatFileSize(config.maxSizeBytes)}.`);
  }

  if (file.size === 0) {
    errors.push('File is empty (0 bytes).');
  }

  // Extension check (blocked)
  if (config.blockedExtensions.includes(extension.toLowerCase())) {
    errors.push(`File type "${extension}" is not allowed for security reasons.`);
  }

  // Extension check (allowed list, if specified)
  if (config.allowedExtensions.length > 0 && !config.allowedExtensions.includes(extension.toLowerCase())) {
    errors.push(`File type "${extension}" is not supported. Allowed types: ${config.allowedExtensions.join(', ')}.`);
  }

  // MIME type check (if specified)
  if (config.allowedMimeTypes.length > 0 && file.type && !config.allowedMimeTypes.includes(file.type)) {
    warnings.push(`File MIME type "${file.type}" may not be supported.`);
  }

  // Filename length check
  if (file.name.length > config.maxFilenameLength) {
    errors.push(`Filename is too long (${file.name.length} chars). Maximum: ${config.maxFilenameLength}.`);
  }

  // Double extension check (e.g., "malware.pdf.exe")
  const parts = file.name.split('.');
  if (parts.length > 2) {
    const secondToLast = '.' + parts[parts.length - 2].toLowerCase();
    if (config.blockedExtensions.includes(secondToLast) || config.blockedExtensions.includes(extension)) {
      errors.push('File appears to have a suspicious double extension.');
    }
  }

  // Malware signature check (read first 8 bytes)
  try {
    const headerSlice = file.slice(0, 8);
    const headerBuffer = await headerSlice.arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);
    const headerHex = Array.from(headerBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    for (const sig of MALWARE_SIGNATURES) {
      if (headerHex.startsWith(sig.hex)) {
        errors.push(`File contains a ${sig.name} signature and cannot be uploaded.`);
        break;
      }
    }
  } catch {
    warnings.push('Could not verify file contents for malware signatures.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileInfo,
  };
}

// ============================================================================
// PII Detection for User Warnings
// ============================================================================

/**
 * Detect PII in free-text fields and return user-friendly warnings.
 *
 * This does NOT block input — it returns advisory warnings so the UI
 * can prompt the user before submission.
 *
 * @example
 * ```ts
 * const warnings = detectPII('My SSN is 123-45-6789');
 * // warnings = [{
 * //   type: 'ssn',
 * //   message: 'This appears to contain a Social Security Number.',
 * //   suggestion: 'Remove the SSN before submitting...',
 * // }]
 * ```
 */
export function detectPII(text: string): PIIWarning[] {
  if (!text || typeof text !== 'string') return [];

  const warnings: PIIWarning[] = [];
  const detectedTypes = new Set<string>();

  for (const def of PII_WARNING_PATTERNS) {
    if (detectedTypes.has(def.type)) continue; // One warning per type

    const regex = new RegExp(def.pattern.source, def.pattern.flags);
    if (regex.test(text)) {
      detectedTypes.add(def.type);
      warnings.push({
        type: def.type,
        message: def.message,
        suggestion: def.suggestion,
      });
    }
  }

  return warnings;
}

/**
 * Quick boolean check: does the text contain sensitive PII (SSN, credit card, MRN)?
 * Does not include email/phone which are less sensitive.
 */
export function containsSensitivePII(text: string): boolean {
  const sensitiveTypes = ['ssn', 'credit_card', 'mrn', 'dob'];
  const warnings = detectPII(text);
  return warnings.some(w => sensitiveTypes.includes(w.type));
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

/**
 * Validate a value against a pattern and max length.
 */
export function validateInput(
  value: string,
  options: {
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    required?: boolean;
  },
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (options.required && (!value || value.trim() === '')) {
    errors.push('This field is required.');
  }

  if (options.minLength && value.length < options.minLength) {
    errors.push(`Minimum length is ${options.minLength} characters.`);
  }

  if (options.maxLength && value.length > options.maxLength) {
    errors.push(`Maximum length is ${options.maxLength} characters.`);
  }

  if (options.pattern && !options.pattern.test(value)) {
    errors.push('Value does not match the expected format.');
  }

  return { isValid: errors.length === 0, errors };
}

export default {
  sanitizeInput,
  validateUpload,
  detectPII,
  containsSensitivePII,
  validateInput,
};
