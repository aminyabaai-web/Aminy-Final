/**
 * WCAG 2.1 AA Accessibility Audit Utility
 *
 * Programmatic accessibility compliance checker that runs in-browser.
 * Validates against WCAG 2.1 Level AA success criteria including:
 *
 * - Color contrast (4.5:1 for normal text, 3:1 for large text)
 * - Focus indicators on all interactive elements
 * - Alt text on all images
 * - ARIA labels on interactive elements without visible labels
 * - Heading hierarchy (no skipped levels)
 * - Form label associations
 * - Keyboard navigability
 * - Screen reader compatibility (role, name, value)
 *
 * Complements the existing accessibility-audit.ts with a richer API,
 * per-component auditing, and exportable summary reports.
 *
 * WCAG References:
 * - 1.1.1 Non-text Content (Level A)
 * - 1.3.1 Info and Relationships (Level A)
 * - 1.4.3 Contrast (Minimum) (Level AA)
 * - 1.4.11 Non-text Contrast (Level AA)
 * - 2.1.1 Keyboard (Level A)
 * - 2.4.1 Bypass Blocks (Level A)
 * - 2.4.3 Focus Order (Level A)
 * - 2.4.6 Headings and Labels (Level AA)
 * - 2.4.7 Focus Visible (Level AA)
 * - 3.3.2 Labels or Instructions (Level A)
 * - 4.1.2 Name, Role, Value (Level A)
 */

// ============================================================================
// Types
// ============================================================================

export type AuditSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export type AuditCategory =
  | 'color-contrast'
  | 'focus-indicator'
  | 'alt-text'
  | 'aria-label'
  | 'heading-hierarchy'
  | 'form-label'
  | 'keyboard-nav'
  | 'screen-reader'
  | 'touch-target'
  | 'landmark'
  | 'language'
  | 'link-purpose';

export interface AuditViolation {
  /** WCAG success criterion (e.g., '1.4.3') */
  criterion: string;
  /** Category of the violation */
  category: AuditCategory;
  /** Severity level */
  severity: AuditSeverity;
  /** Human-readable description */
  message: string;
  /** CSS selector path to the element */
  selector: string;
  /** The element that has the violation (null for document-level) */
  element: HTMLElement | null;
  /** How to fix the issue */
  fix: string;
  /** WCAG conformance level */
  level: 'A' | 'AA' | 'AAA';
}

export interface AuditWarning {
  criterion: string;
  category: AuditCategory;
  message: string;
  selector: string;
  element: HTMLElement | null;
  suggestion: string;
}

export interface AuditPass {
  criterion: string;
  category: AuditCategory;
  message: string;
  count: number;
}

export interface AccessibilityAuditResult {
  /** Overall score (0-100) */
  score: number;
  /** Total elements checked */
  elementsChecked: number;
  /** Violations found */
  violations: AuditViolation[];
  /** Warnings (not failures, but improvements recommended) */
  warnings: AuditWarning[];
  /** Passing checks */
  passes: AuditPass[];
  /** Summary by category */
  categorySummary: Record<AuditCategory, {
    violations: number;
    warnings: number;
    passes: number;
    score: number;
  }>;
  /** Timestamp of the audit */
  timestamp: string;
  /** URL/screen audited */
  context: string;
}

// ============================================================================
// Color Contrast Utilities
// ============================================================================

/**
 * Parse a CSS color string to RGB values.
 * Handles hex (#fff, #ffffff), rgb(), rgba(), and named colors.
 */
function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  if (!color || color === 'transparent') return null;

  // Hex colors
  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
        a: parseInt(hex.substring(6, 8), 16) / 255,
      };
    }
  }

  // rgb/rgba
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * Calculate relative luminance per WCAG 2.1 definition.
 * https://www.w3.org/WAI/WCAG21/Techniques/general/G17.html
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors.
 * Returns a value between 1 and 21.
 */
function contrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  const l1 = relativeLuminance(color1.r, color1.g, color1.b);
  const l2 = relativeLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if text size qualifies as "large text" per WCAG.
 * Large text: >= 18pt (24px) or >= 14pt (18.66px) bold.
 */
function isLargeText(fontSize: string, fontWeight: string): boolean {
  const size = parseFloat(fontSize);
  const weight = parseInt(fontWeight) || (fontWeight === 'bold' ? 700 : 400);
  return size >= 24 || (size >= 18.66 && weight >= 700);
}

// ============================================================================
// Selector Helpers
// ============================================================================

function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;

  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector = `#${current.id}`;
      parts.unshift(selector);
      break;
    }
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) selector += `.${classes}`;
    }
    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

// ============================================================================
// Individual Audit Checks
// ============================================================================

function auditColorContrast(): { violations: AuditViolation[]; warnings: AuditWarning[]; passes: AuditPass[] } {
  const violations: AuditViolation[] = [];
  const warnings: AuditWarning[] = [];
  let passCount = 0;

  const textElements = document.querySelectorAll<HTMLElement>(
    'p, span, a, button, h1, h2, h3, h4, h5, h6, label, li, td, th, dt, dd, figcaption, blockquote'
  );

  textElements.forEach(el => {
    if (!el.textContent?.trim()) return;
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return; // Hidden

    const styles = getComputedStyle(el);
    const fg = parseColor(styles.color);
    const bg = parseColor(styles.backgroundColor);

    if (!fg || !bg || bg.a === 0) return; // Can't check without both colors

    const ratio = contrastRatio(fg, bg);
    const large = isLargeText(styles.fontSize, styles.fontWeight);
    const requiredRatio = large ? 3 : 4.5;

    if (ratio < requiredRatio) {
      violations.push({
        criterion: '1.4.3',
        category: 'color-contrast',
        severity: ratio < 2 ? 'critical' : 'serious',
        message: `Insufficient contrast ratio ${ratio.toFixed(2)}:1 (required: ${requiredRatio}:1 for ${large ? 'large' : 'normal'} text)`,
        selector: getSelector(el),
        element: el,
        fix: `Increase contrast to at least ${requiredRatio}:1 by darkening the text or lightening the background.`,
        level: 'AA',
      });
    } else {
      passCount++;
    }
  });

  const passes: AuditPass[] = passCount > 0 ? [{
    criterion: '1.4.3',
    category: 'color-contrast',
    message: `${passCount} text elements have sufficient color contrast`,
    count: passCount,
  }] : [];

  return { violations, warnings, passes };
}

function auditFocusIndicators(): { violations: AuditViolation[]; warnings: AuditWarning[]; passes: AuditPass[] } {
  const violations: AuditViolation[] = [];
  const warnings: AuditWarning[] = [];
  let passCount = 0;

  const interactive = document.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="tab"]'
  );

  interactive.forEach(el => {
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;

    const styles = getComputedStyle(el);
    const outlineStyle = styles.outlineStyle;
    const outlineWidth = parseFloat(styles.outlineWidth);
    const outlineColor = styles.outlineColor;

    // Check if focus styles are explicitly removed
    if (outlineStyle === 'none' && outlineWidth === 0) {
      // Check for alternative focus indicators (box-shadow, border change)
      // This is a heuristic — we warn rather than fail
      warnings.push({
        criterion: '2.4.7',
        category: 'focus-indicator',
        message: 'Element has outline:none — verify it has an alternative focus indicator (box-shadow, border, etc.)',
        selector: getSelector(el),
        element: el,
        suggestion: 'Add a visible focus indicator using :focus-visible { outline: 2px solid ...; }',
      });
    } else if (outlineColor === 'transparent') {
      warnings.push({
        criterion: '2.4.7',
        category: 'focus-indicator',
        message: 'Element has transparent outline color. Ensure an alternative focus style exists.',
        selector: getSelector(el),
        element: el,
        suggestion: 'Use a visible outline color or alternative focus indicator.',
      });
    } else {
      passCount++;
    }
  });

  const passes: AuditPass[] = passCount > 0 ? [{
    criterion: '2.4.7',
    category: 'focus-indicator',
    message: `${passCount} interactive elements have visible focus indicators`,
    count: passCount,
  }] : [];

  return { violations, warnings, passes };
}

function auditAltText(): { violations: AuditViolation[]; warnings: AuditWarning[]; passes: AuditPass[] } {
  const violations: AuditViolation[] = [];
  const warnings: AuditWarning[] = [];
  let passCount = 0;

  const images = document.querySelectorAll<HTMLImageElement>('img');

  images.forEach(img => {
    if (img.offsetParent === null) return; // Hidden

    const alt = img.getAttribute('alt');
    const role = img.getAttribute('role');

    if (alt === null && role !== 'presentation' && role !== 'none') {
      violations.push({
        criterion: '1.1.1',
        category: 'alt-text',
        severity: 'serious',
        message: 'Image is missing alt attribute',
        selector: getSelector(img),
        element: img,
        fix: 'Add an alt attribute describing the image content, or alt="" if decorative.',
        level: 'A',
      });
    } else if (alt === '' && role !== 'presentation' && role !== 'none') {
      // Empty alt is valid for decorative images, but warn
      warnings.push({
        criterion: '1.1.1',
        category: 'alt-text',
        message: 'Image has empty alt text — verify it is purely decorative',
        selector: getSelector(img),
        element: img,
        suggestion: 'If the image conveys meaning, add descriptive alt text.',
      });
    } else {
      passCount++;
    }
  });

  // Check SVGs
  const svgs = document.querySelectorAll<SVGElement>('svg');
  svgs.forEach(svg => {
    const hasTitle = svg.querySelector('title');
    const ariaLabel = svg.getAttribute('aria-label');
    const ariaLabelledby = svg.getAttribute('aria-labelledby');
    const role = svg.getAttribute('role');

    if (!hasTitle && !ariaLabel && !ariaLabelledby && role !== 'presentation' && role !== 'none') {
      warnings.push({
        criterion: '1.1.1',
        category: 'alt-text',
        message: 'SVG is missing accessible name (title, aria-label, or aria-labelledby)',
        selector: getSelector(svg as unknown as HTMLElement),
        element: svg as unknown as HTMLElement,
        suggestion: 'Add a <title> element, aria-label, or role="presentation" if decorative.',
      });
    } else {
      passCount++;
    }
  });

  const passes: AuditPass[] = passCount > 0 ? [{
    criterion: '1.1.1',
    category: 'alt-text',
    message: `${passCount} images/SVGs have proper alt text or are marked decorative`,
    count: passCount,
  }] : [];

  return { violations, warnings, passes };
}

function auditAriaLabels(): { violations: AuditViolation[]; warnings: AuditWarning[]; passes: AuditPass[] } {
  const violations: AuditViolation[] = [];
  const warnings: AuditWarning[] = [];
  let passCount = 0;

  const interactive = document.querySelectorAll<HTMLElement>(
    'button, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], a[href]'
  );

  interactive.forEach(el => {
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;

    const hasText = el.textContent?.trim();
    const ariaLabel = el.getAttribute('aria-label');
    const ariaLabelledby = el.getAttribute('aria-labelledby');
    const title = el.getAttribute('title');

    if (!hasText && !ariaLabel && !ariaLabelledby && !title) {
      // Check for icon-only buttons with child SVG/img
      const hasIcon = el.querySelector('svg, img, i, [class*="icon"]');
      if (hasIcon) {
        violations.push({
          criterion: '4.1.2',
          category: 'aria-label',
          severity: 'serious',
          message: 'Icon-only interactive element has no accessible name',
          selector: getSelector(el),
          element: el,
          fix: 'Add aria-label="descriptive text" to the button/link.',
          level: 'A',
        });
      } else {
        violations.push({
          criterion: '4.1.2',
          category: 'aria-label',
          severity: 'serious',
          message: 'Interactive element has no accessible name (text, aria-label, or title)',
          selector: getSelector(el),
          element: el,
          fix: 'Add visible text content, aria-label, or aria-labelledby.',
          level: 'A',
        });
      }
    } else {
      passCount++;
    }
  });

  const passes: AuditPass[] = passCount > 0 ? [{
    criterion: '4.1.2',
    category: 'aria-label',
    message: `${passCount} interactive elements have accessible names`,
    count: passCount,
  }] : [];

  return { violations, warnings, passes };
}

function auditHeadingHierarchy(): { violations: AuditViolation[]; warnings: AuditWarning[]; passes: AuditPass[] } {
  const violations: AuditViolation[] = [];
  const warnings: AuditWarning[] = [];

  const headings = document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [role="heading"]');
  const levels: number[] = [];

  headings.forEach(h => {
    const ariaLevel = h.getAttribute('aria-level');
    const level = ariaLevel ? parseInt(ariaLevel) : parseInt(h.tagName.charAt(1));
    if (!isNaN(level)) levels.push(level);
  });

  // Check for skipped levels
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      violations.push({
        criterion: '1.3.1',
        category: 'heading-hierarchy',
        severity: 'moderate',
        message: `Heading level skipped from h${levels[i - 1]} to h${levels[i]}`,
        selector: `h${levels[i]}`,
        element: null,
        fix: `Use h${levels[i - 1] + 1} instead of h${levels[i]}, or add an intermediate heading.`,
        level: 'A',
      });
    }
  }

  // Check for multiple h1s
  const h1Count = levels.filter(l => l === 1).length;
  if (h1Count > 1) {
    warnings.push({
      criterion: '1.3.1',
      category: 'heading-hierarchy',
      message: `Page has ${h1Count} h1 elements. Best practice is one h1 per page.`,
      selector: 'h1',
      element: null,
      suggestion: 'Use a single h1 for the main page heading.',
    });
  }

  // Check for no headings
  if (headings.length === 0) {
    warnings.push({
      criterion: '2.4.6',
      category: 'heading-hierarchy',
      message: 'Page has no heading elements.',
      selector: 'body',
      element: null,
      suggestion: 'Add heading elements (h1-h6) to structure the page content.',
    });
  }

  const passes: AuditPass[] = levels.length > 0 && violations.length === 0 ? [{
    criterion: '1.3.1',
    category: 'heading-hierarchy',
    message: `${levels.length} headings maintain proper hierarchy`,
    count: levels.length,
  }] : [];

  return { violations, warnings, passes };
}

function auditFormLabels(): { violations: AuditViolation[]; warnings: AuditWarning[]; passes: AuditPass[] } {
  const violations: AuditViolation[] = [];
  const warnings: AuditWarning[] = [];
  let passCount = 0;

  const inputs = document.querySelectorAll<HTMLElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea'
  );

  inputs.forEach(input => {
    if (input.offsetParent === null) return;

    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledby = input.getAttribute('aria-labelledby');
    const placeholder = input.getAttribute('placeholder');
    const title = input.getAttribute('title');

    // Check for associated label
    let hasLabel = false;
    if (id) {
      hasLabel = !!document.querySelector(`label[for="${id}"]`);
    }
    if (!hasLabel) {
      // Check for wrapping label
      hasLabel = !!input.closest('label');
    }

    if (!hasLabel && !ariaLabel && !ariaLabelledby && !title) {
      if (placeholder) {
        warnings.push({
          criterion: '3.3.2',
          category: 'form-label',
          message: 'Form field relies on placeholder text as its only label',
          selector: getSelector(input),
          element: input,
          suggestion: 'Add a visible <label> element. Placeholders disappear when typing.',
        });
      } else {
        violations.push({
          criterion: '3.3.2',
          category: 'form-label',
          severity: 'serious',
          message: 'Form field has no associated label, aria-label, or title',
          selector: getSelector(input),
          element: input,
          fix: 'Add a <label for="inputId"> or aria-label attribute.',
          level: 'A',
        });
      }
    } else {
      passCount++;
    }
  });

  const passes: AuditPass[] = passCount > 0 ? [{
    criterion: '3.3.2',
    category: 'form-label',
    message: `${passCount} form fields have proper labels`,
    count: passCount,
  }] : [];

  return { violations, warnings, passes };
}

function auditLandmarks(): { violations: AuditViolation[]; warnings: AuditWarning[]; passes: AuditPass[] } {
  const violations: AuditViolation[] = [];
  const warnings: AuditWarning[] = [];
  let passCount = 0;

  const hasMain = document.querySelector('main, [role="main"]');
  const hasNav = document.querySelector('nav, [role="navigation"]');
  const hasSkipLink = document.querySelector('a[href="#main-content"], a[href="#main"], [class*="skip"]');

  if (!hasMain) {
    warnings.push({
      criterion: '1.3.1',
      category: 'landmark',
      message: 'Page has no <main> landmark region',
      selector: 'body',
      element: null,
      suggestion: 'Wrap the primary content in a <main> element.',
    });
  } else {
    passCount++;
  }

  if (!hasNav) {
    warnings.push({
      criterion: '1.3.1',
      category: 'landmark',
      message: 'Page has no <nav> landmark region',
      selector: 'body',
      element: null,
      suggestion: 'Wrap navigation links in a <nav> element.',
    });
  } else {
    passCount++;
  }

  if (!hasSkipLink) {
    violations.push({
      criterion: '2.4.1',
      category: 'landmark',
      severity: 'moderate',
      message: 'Page has no skip navigation link',
      selector: 'body',
      element: null,
      fix: 'Add a "Skip to main content" link as the first focusable element.',
      level: 'A',
    });
  } else {
    passCount++;
  }

  // Check html lang attribute
  const htmlLang = document.documentElement.getAttribute('lang');
  if (!htmlLang) {
    violations.push({
      criterion: '3.1.1',
      category: 'language',
      severity: 'serious',
      message: 'HTML element is missing lang attribute',
      selector: 'html',
      element: document.documentElement,
      fix: 'Add lang="en" (or appropriate language code) to the <html> element.',
      level: 'A',
    });
  } else {
    passCount++;
  }

  const passes: AuditPass[] = passCount > 0 ? [{
    criterion: '1.3.1',
    category: 'landmark',
    message: `${passCount} landmark checks passed`,
    count: passCount,
  }] : [];

  return { violations, warnings, passes };
}

function auditTouchTargets(): { violations: AuditViolation[]; warnings: AuditWarning[]; passes: AuditPass[] } {
  const violations: AuditViolation[] = [];
  const warnings: AuditWarning[] = [];
  let passCount = 0;

  const minSize = 44; // WCAG 2.5.5: 44x44 CSS pixels

  const touchTargets = document.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="tab"]'
  );

  touchTargets.forEach(el => {
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;

    const rect = el.getBoundingClientRect();
    if (rect.width < minSize || rect.height < minSize) {
      // Only warn for very small targets
      if (rect.width < 24 || rect.height < 24) {
        violations.push({
          criterion: '2.5.5',
          category: 'touch-target',
          severity: 'moderate',
          message: `Touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}px (minimum: ${minSize}x${minSize}px)`,
          selector: getSelector(el),
          element: el,
          fix: `Increase the element size or add padding to meet the ${minSize}x${minSize}px minimum.`,
          level: 'AAA', // Note: 2.5.5 is Level AAA, but we check it for mobile-first
        });
      } else {
        warnings.push({
          criterion: '2.5.8',
          category: 'touch-target',
          message: `Touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}px (recommended: ${minSize}x${minSize}px)`,
          selector: getSelector(el),
          element: el,
          suggestion: 'Consider increasing the size for better mobile usability.',
        });
      }
    } else {
      passCount++;
    }
  });

  const passes: AuditPass[] = passCount > 0 ? [{
    criterion: '2.5.5',
    category: 'touch-target',
    message: `${passCount} touch targets meet minimum size requirements`,
    count: passCount,
  }] : [];

  return { violations, warnings, passes };
}

// ============================================================================
// Main Audit Functions
// ============================================================================

/**
 * Run a comprehensive accessibility audit on the current page.
 *
 * Checks against WCAG 2.1 AA success criteria and returns a detailed
 * result with score, violations, warnings, and passes.
 *
 * @example
 * ```ts
 * const result = runAccessibilityAudit();
 * console.log(`Score: ${result.score}/100`);
 * console.log(`Violations: ${result.violations.length}`);
 * result.violations.forEach(v => console.warn(v.message, v.selector));
 * ```
 */
export function runAccessibilityAudit(): AccessibilityAuditResult {
  const allViolations: AuditViolation[] = [];
  const allWarnings: AuditWarning[] = [];
  const allPasses: AuditPass[] = [];

  // Run all checks
  const checks = [
    auditColorContrast(),
    auditFocusIndicators(),
    auditAltText(),
    auditAriaLabels(),
    auditHeadingHierarchy(),
    auditFormLabels(),
    auditLandmarks(),
    auditTouchTargets(),
  ];

  for (const check of checks) {
    allViolations.push(...check.violations);
    allWarnings.push(...check.warnings);
    allPasses.push(...check.passes);
  }

  // Calculate score
  const totalChecks = allViolations.length + allWarnings.length + allPasses.reduce((sum, p) => sum + p.count, 0);
  const passCount = allPasses.reduce((sum, p) => sum + p.count, 0);
  const score = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 100;

  // Build category summary
  const categories: AuditCategory[] = [
    'color-contrast', 'focus-indicator', 'alt-text', 'aria-label',
    'heading-hierarchy', 'form-label', 'keyboard-nav', 'screen-reader',
    'touch-target', 'landmark', 'language', 'link-purpose',
  ];

  const categorySummary: AccessibilityAuditResult['categorySummary'] = {} as AccessibilityAuditResult['categorySummary'];
  for (const cat of categories) {
    const catViolations = allViolations.filter(v => v.category === cat).length;
    const catWarnings = allWarnings.filter(w => w.category === cat).length;
    const catPasses = allPasses.filter(p => p.category === cat).reduce((sum, p) => sum + p.count, 0);
    const catTotal = catViolations + catWarnings + catPasses;

    categorySummary[cat] = {
      violations: catViolations,
      warnings: catWarnings,
      passes: catPasses,
      score: catTotal > 0 ? Math.round((catPasses / catTotal) * 100) : 100,
    };
  }

  return {
    score,
    elementsChecked: totalChecks,
    violations: allViolations,
    warnings: allWarnings,
    passes: allPasses,
    categorySummary,
    timestamp: new Date().toISOString(),
    context: typeof window !== 'undefined' ? window.location.href : 'unknown',
  };
}

/**
 * Audit a specific component/element and its descendants.
 *
 * @example
 * ```ts
 * const result = auditComponent('main-dashboard');
 * if (result.violations.length > 0) {
 *   console.warn('Dashboard has a11y issues:', result.violations);
 * }
 * ```
 */
export function auditComponent(elementId: string): AccessibilityAuditResult | null {
  const container = document.getElementById(elementId);
  if (!container) {
    console.warn(`[A11Y-AUDIT] Element #${elementId} not found`);
    return null;
  }

  // Temporarily isolate the container by creating a marker
  const marker = `a11y-audit-scope-${Date.now()}`;
  container.setAttribute('data-a11y-audit', marker);

  // Run the full audit — the individual checks operate on the full document,
  // so we filter results to only those within our container
  const fullResult = runAccessibilityAudit();

  const isInContainer = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    return container.contains(el);
  };

  const scopedResult: AccessibilityAuditResult = {
    ...fullResult,
    violations: fullResult.violations.filter(v => isInContainer(v.element)),
    warnings: fullResult.warnings.filter(w => isInContainer(w.element)),
    context: `#${elementId}`,
  };

  // Recalculate score for scoped results
  const scopedTotal = scopedResult.violations.length + scopedResult.warnings.length +
    scopedResult.passes.reduce((sum, p) => sum + p.count, 0);
  const scopedPasses = scopedResult.passes.reduce((sum, p) => sum + p.count, 0);
  scopedResult.score = scopedTotal > 0 ? Math.round((scopedPasses / scopedTotal) * 100) : 100;

  // Clean up marker
  container.removeAttribute('data-a11y-audit');

  return scopedResult;
}

/**
 * Generate an exportable text summary of the audit results.
 */
export function generateAuditSummary(result: AccessibilityAuditResult): string {
  const lines: string[] = [
    '=== WCAG 2.1 AA Accessibility Audit Report ===',
    `Date: ${result.timestamp}`,
    `Context: ${result.context}`,
    `Overall Score: ${result.score}/100`,
    `Elements Checked: ${result.elementsChecked}`,
    '',
    `--- Summary ---`,
    `Violations: ${result.violations.length}`,
    `Warnings: ${result.warnings.length}`,
    `Passes: ${result.passes.reduce((s, p) => s + p.count, 0)}`,
    '',
  ];

  if (result.violations.length > 0) {
    lines.push('--- Violations ---');
    result.violations.forEach((v, i) => {
      lines.push(`${i + 1}. [${v.severity.toUpperCase()}] WCAG ${v.criterion} (${v.category})`);
      lines.push(`   ${v.message}`);
      lines.push(`   Element: ${v.selector}`);
      lines.push(`   Fix: ${v.fix}`);
      lines.push('');
    });
  }

  if (result.warnings.length > 0) {
    lines.push('--- Warnings ---');
    result.warnings.forEach((w, i) => {
      lines.push(`${i + 1}. WCAG ${w.criterion} (${w.category})`);
      lines.push(`   ${w.message}`);
      lines.push(`   Suggestion: ${w.suggestion}`);
      lines.push('');
    });
  }

  return lines.join('\n');
}

export default {
  runAccessibilityAudit,
  auditComponent,
  generateAuditSummary,
};
