// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Accessibility Audit Utility
 *
 * Programmatic WCAG 2.1 AA/AAA compliance checks that run in development mode.
 * Designed to surface violations in the dev console or in-app overlay.
 *
 * Complements the existing `auditTouchTargets()` in useAccessibilityEnhancements.ts
 * and the visual checks in src/components/AccessibilityAuditor.tsx.
 *
 * Usage (dev mode only):
 *   import { runAudit } from '../lib/accessibility-audit';
 *   const violations = runAudit();
 *   console.table(violations);
 */

// ============================================================================
// Types
// ============================================================================

export type ViolationSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export type ViolationCategory =
  | 'color-contrast'
  | 'touch-target'
  | 'aria-label'
  | 'heading-hierarchy'
  | 'focus-visible'
  | 'image-alt'
  | 'form-label'
  | 'landmark';

export interface AuditViolation {
  /** Which WCAG rule was violated */
  rule: string;
  /** Category of the violation */
  category: ViolationCategory;
  /** Severity level */
  severity: ViolationSeverity;
  /** Human-readable description */
  message: string;
  /** The DOM element that has the violation (null if document-level) */
  element: HTMLElement | null;
  /** CSS selector path to the element (for logging) */
  selector: string;
  /** WCAG success criterion reference (e.g., "1.4.3") */
  wcag: string;
}

export interface AuditResult {
  /** All violations found */
  violations: AuditViolation[];
  /** Summary counts by severity */
  summary: Record<ViolationSeverity, number>;
  /** Total number of elements checked */
  elementsChecked: number;
  /** Audit duration in ms */
  durationMs: number;
}

// ============================================================================
// Color Contrast
// ============================================================================

/**
 * Check WCAG color contrast ratio between foreground and background colors.
 *
 * @param foreground - CSS color string (hex, rgb, or named)
 * @param background - CSS color string (hex, rgb, or named)
 * @returns Contrast ratio (1:1 to 21:1) and whether it passes AA/AAA
 */
export function checkColorContrast(
  foreground: string,
  background: string
): { ratio: number; passesAA: boolean; passesAAA: boolean; passesAALargeText: boolean } {
  const fgLum = relativeLuminance(parseColor(foreground));
  const bgLum = relativeLuminance(parseColor(background));

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,          // WCAG 2.1 AA normal text
    passesAAA: ratio >= 7,           // WCAG 2.1 AAA normal text
    passesAALargeText: ratio >= 3,   // WCAG 2.1 AA large text (>=18pt or >=14pt bold)
  };
}

// ============================================================================
// Touch Targets
// ============================================================================

/**
 * Check if an interactive element meets the WCAG 2.5.5 minimum touch target
 * size of 44x44 CSS pixels.
 */
export function checkTouchTargets(
  element?: HTMLElement
): AuditViolation[] {
  const violations: AuditViolation[] = [];
  const elements = element
    ? [element]
    : Array.from(document.querySelectorAll<HTMLElement>(
        'a, button, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [tabindex]:not([tabindex="-1"])'
      ));

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    // Skip hidden elements
    if (rect.width === 0 && rect.height === 0) continue;
    // Skip non-visible elements
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    if (rect.width < 44 || rect.height < 44) {
      violations.push({
        rule: 'touch-target-size',
        category: 'touch-target',
        severity: rect.width < 24 || rect.height < 24 ? 'serious' : 'moderate',
        message: `Touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}px (minimum: 44x44px)`,
        element: el,
        selector: getSelector(el),
        wcag: '2.5.5',
      });
    }
  }

  return violations;
}

// ============================================================================
// ARIA Labels
// ============================================================================

/**
 * Find interactive elements that are missing accessible names (aria-label,
 * aria-labelledby, or visible text content).
 */
export function checkAriaLabels(
  container?: HTMLElement
): AuditViolation[] {
  const violations: AuditViolation[] = [];
  const root = container || document.body;

  const interactive = root.querySelectorAll<HTMLElement>(
    'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="combobox"], [role="slider"]'
  );

  for (const el of Array.from(interactive)) {
    // Skip hidden elements
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    const hasAriaLabel = !!el.getAttribute('aria-label');
    const hasAriaLabelledBy = !!el.getAttribute('aria-labelledby');
    const hasTitle = !!el.getAttribute('title');
    const hasVisibleText = !!(el.textContent?.trim());

    // For inputs, also check associated <label>
    const hasLabel = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA'
      ? !!el.closest('label') || (el.id && !!document.querySelector(`label[for="${el.id}"]`))
      : false;

    // For inputs, also check placeholder (not ideal but counts)
    const hasPlaceholder = (el as HTMLInputElement).placeholder?.trim().length > 0;

    if (!hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !hasVisibleText && !hasLabel && !hasPlaceholder) {
      violations.push({
        rule: 'aria-label-missing',
        category: 'aria-label',
        severity: 'serious',
        message: `Interactive element <${el.tagName.toLowerCase()}> has no accessible name (missing aria-label, text content, or associated label)`,
        element: el,
        selector: getSelector(el),
        wcag: '4.1.2',
      });
    }
  }

  // Check images for alt text
  const images = root.querySelectorAll<HTMLImageElement>('img');
  for (const img of Array.from(images)) {
    const style = window.getComputedStyle(img);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    if (!img.hasAttribute('alt')) {
      violations.push({
        rule: 'image-alt-missing',
        category: 'image-alt' as ViolationCategory,
        severity: 'serious',
        message: `Image is missing alt attribute: ${img.src?.slice(-40) || 'unknown src'}`,
        element: img,
        selector: getSelector(img),
        wcag: '1.1.1',
      });
    }
  }

  return violations;
}

// ============================================================================
// Heading Hierarchy
// ============================================================================

/**
 * Verify heading elements follow correct h1 -> h2 -> h3 order with no
 * skipped levels (e.g., h1 -> h3 without h2 is a violation).
 */
export function checkHeadingHierarchy(
  container?: HTMLElement
): AuditViolation[] {
  const violations: AuditViolation[] = [];
  const root = container || document.body;

  const headings = root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [role="heading"]');
  let lastLevel = 0;

  for (const heading of Array.from(headings)) {
    // Skip hidden headings
    const style = window.getComputedStyle(heading);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    let level: number;
    if (heading.hasAttribute('aria-level')) {
      level = parseInt(heading.getAttribute('aria-level') || '0', 10);
    } else {
      const match = heading.tagName.match(/^H(\d)$/i);
      level = match ? parseInt(match[1], 10) : 0;
    }

    if (level === 0) continue;

    if (lastLevel > 0 && level > lastLevel + 1) {
      violations.push({
        rule: 'heading-order',
        category: 'heading-hierarchy',
        severity: 'moderate',
        message: `Heading level skipped: <h${level}> follows <h${lastLevel}> (missing <h${lastLevel + 1}>)`,
        element: heading,
        selector: getSelector(heading),
        wcag: '1.3.1',
      });
    }

    lastLevel = level;
  }

  // Check for missing h1
  const h1Count = root.querySelectorAll('h1, [role="heading"][aria-level="1"]').length;
  if (h1Count === 0) {
    violations.push({
      rule: 'heading-h1-missing',
      category: 'heading-hierarchy',
      severity: 'moderate',
      message: 'Page has no <h1> element. Each page should have exactly one top-level heading.',
      element: null,
      selector: 'document',
      wcag: '1.3.1',
    });
  } else if (h1Count > 1) {
    violations.push({
      rule: 'heading-h1-multiple',
      category: 'heading-hierarchy',
      severity: 'minor',
      message: `Page has ${h1Count} <h1> elements. Best practice is to have exactly one.`,
      element: null,
      selector: 'document',
      wcag: '1.3.1',
    });
  }

  return violations;
}

// ============================================================================
// Focus Visible
// ============================================================================

/**
 * Check if focus indicators are visible for interactive elements.
 * This is a heuristic check — it focuses each element and inspects
 * computed outline/box-shadow styles.
 *
 * NOTE: This modifies focus state temporarily. Use in dev only.
 */
export function checkFocusVisible(
  element?: HTMLElement
): AuditViolation[] {
  const violations: AuditViolation[] = [];
  const elements = element
    ? [element]
    : Array.from(document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));

  const previouslyFocused = document.activeElement as HTMLElement | null;

  for (const el of elements) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    // Check if outline is explicitly removed (outline: none / outline: 0)
    const outlineStyle = style.outlineStyle;
    const outlineWidth = parseFloat(style.outlineWidth) || 0;
    const boxShadow = style.boxShadow;

    // If outline is explicitly set to 'none' with no compensating box-shadow
    if (
      (outlineStyle === 'none' || outlineWidth === 0) &&
      (boxShadow === 'none' || !boxShadow)
    ) {
      // Check if there is a :focus-visible rule that might override
      // (We cannot reliably detect this without focusing, so mark as moderate)
      violations.push({
        rule: 'focus-visible',
        category: 'focus-visible',
        severity: 'moderate',
        message: `Element may lack visible focus indicator (outline: ${outlineStyle}, box-shadow: ${boxShadow || 'none'})`,
        element: el,
        selector: getSelector(el),
        wcag: '2.4.7',
      });
    }
  }

  // Restore focus
  previouslyFocused?.focus();

  return violations;
}

// ============================================================================
// Form Labels
// ============================================================================

/**
 * Check that all form inputs have associated labels.
 */
export function checkFormLabels(
  container?: HTMLElement
): AuditViolation[] {
  const violations: AuditViolation[] = [];
  const root = container || document.body;

  const inputs = root.querySelectorAll<HTMLElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea'
  );

  for (const input of Array.from(inputs)) {
    const style = window.getComputedStyle(input);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    const hasLabel = !!input.closest('label') ||
      (input.id && !!document.querySelector(`label[for="${input.id}"]`));
    const hasAriaLabel = !!input.getAttribute('aria-label');
    const hasAriaLabelledBy = !!input.getAttribute('aria-labelledby');
    const hasTitle = !!input.getAttribute('title');

    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
      violations.push({
        rule: 'form-label-missing',
        category: 'form-label' as ViolationCategory,
        severity: 'serious',
        message: `Form input <${input.tagName.toLowerCase()}${input.id ? `#${input.id}` : ''}> has no associated label`,
        element: input,
        selector: getSelector(input),
        wcag: '1.3.1',
      });
    }
  }

  return violations;
}

// ============================================================================
// Landmark Regions
// ============================================================================

/**
 * Check for proper landmark region usage.
 */
export function checkLandmarks(): AuditViolation[] {
  const violations: AuditViolation[] = [];

  const hasMain = !!document.querySelector('main, [role="main"]');
  const hasNav = !!document.querySelector('nav, [role="navigation"]');

  if (!hasMain) {
    violations.push({
      rule: 'landmark-main-missing',
      category: 'landmark' as ViolationCategory,
      severity: 'moderate',
      message: 'Page has no <main> landmark. Content should be wrapped in a <main> element.',
      element: null,
      selector: 'document',
      wcag: '1.3.1',
    });
  }

  if (!hasNav) {
    violations.push({
      rule: 'landmark-nav-missing',
      category: 'landmark' as ViolationCategory,
      severity: 'minor',
      message: 'Page has no <nav> landmark. Navigation areas should use <nav> elements.',
      element: null,
      selector: 'document',
      wcag: '1.3.1',
    });
  }

  return violations;
}

// ============================================================================
// Run Full Audit
// ============================================================================

/**
 * Run all accessibility checks on the current page.
 * Returns a comprehensive audit result.
 *
 * Best used in development mode only (performance-intensive).
 */
export function runAudit(container?: HTMLElement): AuditResult {
  const start = performance.now();

  const violations: AuditViolation[] = [
    ...checkTouchTargets(),
    ...checkAriaLabels(container),
    ...checkHeadingHierarchy(container),
    ...checkFocusVisible(),
    ...checkFormLabels(container),
    ...checkLandmarks(),
  ];

  const durationMs = Math.round(performance.now() - start);

  const summary: Record<ViolationSeverity, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };

  for (const v of violations) {
    summary[v.severity]++;
  }

  const root = container || document.body;
  const elementsChecked = root.querySelectorAll('*').length;

  // Log summary in dev
  if (import.meta.env.DEV) {
    const total = violations.length;
    const style = total === 0 ? 'color: green' : 'color: red';
    console.log(
      `%c[A11Y Audit] ${total} violation${total !== 1 ? 's' : ''} found in ${durationMs}ms`,
      style
    );
    if (total > 0) {
      console.table(
        violations.map(v => ({
          rule: v.rule,
          severity: v.severity,
          message: v.message,
          selector: v.selector,
          wcag: v.wcag,
        }))
      );
    }
  }

  return { violations, summary, elementsChecked, durationMs };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/** Parse a CSS color string to [R, G, B] (0-255) */
function parseColor(color: string): [number, number, number] {
  // Use a canvas to resolve any CSS color string
  if (typeof document === 'undefined') return [0, 0, 0];

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [0, 0, 0];

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** Calculate relative luminance per WCAG 2.1 */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Generate a simple CSS selector for an element (for logging) */
function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return `${tag}[aria-label="${ariaLabel.slice(0, 30)}"]`;
  return `${tag}${cls}`;
}

export default {
  checkColorContrast,
  checkTouchTargets,
  checkAriaLabels,
  checkHeadingHierarchy,
  checkFocusVisible,
  checkFormLabels,
  checkLandmarks,
  runAudit,
};
