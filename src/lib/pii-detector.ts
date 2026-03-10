/**
 * Enhanced PII Detection Module
 *
 * Comprehensive PII detection for HIPAA-compliant content moderation.
 * Detects personally identifiable information in user-generated content
 * (community posts, chat messages, form inputs, AI chat, etc.)
 *
 * Complements the PII patterns already in src/lib/security/sanitize.ts
 * by providing a richer detection API with position tracking, confidence
 * scores, and contextual redaction.
 *
 * Usage:
 *   import { detectPII, redactPII, containsPII } from '../lib/pii-detector';
 *
 *   const detections = detectPII('Call me at 555-123-4567');
 *   // => [{ type: 'phone', value: '555-123-4567', position: 11, length: 12, ... }]
 *
 *   const safe = redactPII('My email is john@example.com');
 *   // => 'My email is [REDACTED]'
 */

// ============================================================================
// Types
// ============================================================================

export type PIIType =
  | 'email'
  | 'phone'
  | 'address'
  | 'credit_card'
  | 'ssn'
  | 'medical_record_number'
  | 'date_of_birth'
  | 'drivers_license'
  | 'ip_address'
  | 'npi'
  | 'passport'
  | 'bank_account';

export interface PIIDetection {
  /** Type of PII detected */
  type: PIIType;
  /** The raw matched value */
  value: string;
  /** Character position (0-based index) of the match start */
  position: number;
  /** Length of the matched string */
  length: number;
  /** Confidence: 'high' if pattern is unambiguous, 'medium' if possible false positive */
  confidence: 'high' | 'medium';
}

export interface DetectPIIOptions {
  /** Only check these PII types (default: all) */
  types?: PIIType[];
  /** Exclude these PII types */
  excludeTypes?: PIIType[];
  /** When true, skips patterns that are more likely to produce false positives */
  strictMode?: boolean;
}

// ============================================================================
// Pattern Definitions
// ============================================================================

interface PatternDef {
  type: PIIType;
  pattern: RegExp;
  confidence: 'high' | 'medium';
  /** If true, excluded in strict mode */
  broad?: boolean;
}

const PII_PATTERNS: PatternDef[] = [
  // ---- Email ----
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    confidence: 'high',
  },

  // ---- Phone Numbers ----
  // US phone: (555) 123-4567, 555-123-4567, 555.123.4567, +1 555 123 4567
  {
    type: 'phone',
    pattern: /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    confidence: 'high',
  },
  // International phone (E.164)
  {
    type: 'phone',
    pattern: /\b\+(?:[2-9]\d{0,2})[-.\s]?\d{1,14}\b/g,
    confidence: 'medium',
    broad: true,
  },

  // ---- Physical Addresses ----
  // US street address: "123 Main St", "456 Oak Avenue, Apt 7"
  {
    type: 'address',
    pattern: /\b\d{1,5}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Ln|Lane|Rd|Road|Way|Ct|Court|Pl(?:ace)?|Pkwy|Cir(?:cle)?|Ter(?:race)?)\b\.?(?:\s*,?\s*(?:Apt|Suite|Ste|Unit|#)\s*\d+[A-Za-z]?)?\b/gi,
    confidence: 'medium',
  },

  // ---- Credit Card Numbers ----
  // Visa, MC, Amex, Discover — with or without separators
  {
    type: 'credit_card',
    pattern: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{0,4}\b/g,
    confidence: 'high',
  },

  // ---- Social Security Number ----
  // Matches 123-45-6789 or 123 45 6789 (with separators to reduce false positives)
  {
    type: 'ssn',
    pattern: /\b(?!000|666|9\d{2})\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,
    confidence: 'high',
  },
  // SSN without separators (broader, more false positives)
  {
    type: 'ssn',
    pattern: /\b(?!000|666|9\d{2})\d{3}\d{2}\d{4}\b/g,
    confidence: 'medium',
    broad: true,
  },

  // ---- Medical Record Number (MRN) ----
  // Common formats: MRN-123456, MRN: 123456, MR#123456
  {
    type: 'medical_record_number',
    pattern: /\b(?:MRN|MR#|MR|Medical\s*Record)\s*[-:#]?\s*\d{5,12}\b/gi,
    confidence: 'high',
  },

  // ---- Date of Birth ----
  // MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY
  {
    type: 'date_of_birth',
    pattern: /\b(?:0[1-9]|1[0-2])[-/.](?:0[1-9]|[12]\d|3[01])[-/.](?:19|20)\d{2}\b/g,
    confidence: 'medium',
  },
  // Preceded by "DOB" or "born" or "birthday" — higher confidence
  {
    type: 'date_of_birth',
    pattern: /\b(?:DOB|born|birthday|date\s*of\s*birth)\s*:?\s*(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])[-/.](?:19|20)\d{2}\b/gi,
    confidence: 'high',
  },
  // Written month: "January 15, 1990"
  {
    type: 'date_of_birth',
    pattern: /\b(?:DOB|born|birthday)\s*:?\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi,
    confidence: 'high',
  },

  // ---- Driver's License ----
  // State-prefixed patterns: e.g., "DL: D12345678", "License# A1234567"
  {
    type: 'drivers_license',
    pattern: /\b(?:DL|Driver'?s?\s*License|License)\s*#?\s*:?\s*[A-Z]\d{7,14}\b/gi,
    confidence: 'high',
  },
  // Bare pattern (less confident)
  {
    type: 'drivers_license',
    pattern: /\b[A-Z]\d{7,14}\b/g,
    confidence: 'medium',
    broad: true,
  },

  // ---- IP Address ----
  {
    type: 'ip_address',
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\b/g,
    confidence: 'medium',
    broad: true,
  },

  // ---- NPI (National Provider Identifier) ----
  {
    type: 'npi',
    pattern: /\b(?:NPI)\s*:?\s*[12]\d{9}\b/gi,
    confidence: 'high',
  },

  // ---- Passport ----
  {
    type: 'passport',
    pattern: /\b(?:passport)\s*#?\s*:?\s*[A-Z]{1,2}\d{6,8}\b/gi,
    confidence: 'high',
  },

  // ---- Bank Account / Routing ----
  {
    type: 'bank_account',
    pattern: /\b(?:account|routing|acct)\s*#?\s*:?\s*\d{8,17}\b/gi,
    confidence: 'high',
  },
];

// ============================================================================
// Detection API
// ============================================================================

/**
 * Detect all PII in a text string.
 *
 * Returns an array of detections sorted by position, each containing the
 * PII type, matched value, position, and confidence level.
 */
export function detectPII(
  text: string,
  options: DetectPIIOptions = {}
): PIIDetection[] {
  if (!text || typeof text !== 'string') return [];

  const { types, excludeTypes, strictMode = false } = options;
  const detections: PIIDetection[] = [];

  for (const def of PII_PATTERNS) {
    // Filter by type
    if (types && !types.includes(def.type)) continue;
    if (excludeTypes?.includes(def.type)) continue;
    if (strictMode && def.broad) continue;

    // Create a fresh regex instance (global flag means we need a new one)
    const regex = new RegExp(def.pattern.source, def.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      detections.push({
        type: def.type,
        value: match[0],
        position: match.index,
        length: match[0].length,
        confidence: def.confidence,
      });
    }
  }

  // Deduplicate overlapping detections (keep highest confidence)
  const deduped = deduplicateDetections(detections);

  // Sort by position
  deduped.sort((a, b) => a.position - b.position);

  return deduped;
}

/**
 * Quick boolean check: does the text contain any PII?
 */
export function containsPII(
  text: string,
  options: DetectPIIOptions = {}
): boolean {
  // Use strict mode by default for the boolean check to reduce false positives
  return detectPII(text, { strictMode: true, ...options }).length > 0;
}

/**
 * Redact all detected PII from text, replacing with [REDACTED] or a
 * type-specific label like [EMAIL REDACTED].
 */
export function redactPII(
  text: string,
  options: DetectPIIOptions & {
    /** Use generic [REDACTED] or type-specific labels (default: generic) */
    labelStyle?: 'generic' | 'typed';
  } = {}
): string {
  if (!text) return '';

  const { labelStyle = 'generic', ...detectOptions } = options;
  const detections = detectPII(text, detectOptions);

  if (detections.length === 0) return text;

  // Process replacements from end to start so positions stay valid
  const sorted = [...detections].sort((a, b) => b.position - a.position);

  let result = text;
  for (const detection of sorted) {
    const label = labelStyle === 'typed'
      ? `[${detection.type.toUpperCase().replace(/_/g, ' ')} REDACTED]`
      : '[REDACTED]';

    result =
      result.slice(0, detection.position) +
      label +
      result.slice(detection.position + detection.length);
  }

  return result;
}

/**
 * Get a summary of PII types found in text.
 * Useful for content moderation UIs: "This post contains: email, phone"
 */
export function summarizePII(
  text: string,
  options: DetectPIIOptions = {}
): { types: PIIType[]; count: number; hasHighConfidence: boolean } {
  const detections = detectPII(text, options);
  const typeSet = new Set(detections.map(d => d.type));

  return {
    types: Array.from(typeSet),
    count: detections.length,
    hasHighConfidence: detections.some(d => d.confidence === 'high'),
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Remove overlapping detections, keeping the one with highest confidence.
 */
function deduplicateDetections(detections: PIIDetection[]): PIIDetection[] {
  if (detections.length <= 1) return detections;

  // Sort by position, then by length descending (prefer longer match)
  const sorted = [...detections].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return b.length - a.length;
  });

  const result: PIIDetection[] = [];
  let lastEnd = -1;

  for (const detection of sorted) {
    const detEnd = detection.position + detection.length;

    if (detection.position >= lastEnd) {
      // No overlap
      result.push(detection);
      lastEnd = detEnd;
    } else if (detection.confidence === 'high') {
      // Overlapping but higher confidence — replace last if it was medium
      const lastIdx = result.length - 1;
      if (lastIdx >= 0 && result[lastIdx].confidence === 'medium') {
        result[lastIdx] = detection;
        lastEnd = detEnd;
      }
    }
    // Otherwise skip (overlapping, lower or equal confidence)
  }

  return result;
}

export default {
  detectPII,
  containsPII,
  redactPII,
  summarizePII,
};
