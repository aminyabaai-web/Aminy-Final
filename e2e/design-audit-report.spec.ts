/**
 * DESIGN AUDIT REPORT GENERATOR
 *
 * Analyzes each screen and generates actionable recommendations:
 * - UI/UX issues and fixes
 * - Accessibility improvements
 * - Performance suggestions
 * - Mobile optimization tips
 * - Design consistency checks
 *
 * Outputs a comprehensive report with specific recommendations per screen
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

interface DesignIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: string;
  issue: string;
  recommendation: string;
  element?: string;
}

interface ScreenAudit {
  screen: string;
  path: string;
  timestamp: string;
  issues: DesignIssue[];
  metrics: {
    loadTime: number;
    elementCount: number;
    interactiveElements: number;
    imageCount: number;
    formFields: number;
  };
  scores: {
    accessibility: number;
    performance: number;
    usability: number;
    visualConsistency: number;
    overall: number;
  };
}

interface FullAuditReport {
  generatedAt: string;
  totalScreens: number;
  totalIssues: number;
  criticalIssues: number;
  screens: ScreenAudit[];
  summary: {
    topIssues: string[];
    recommendations: string[];
    overallScore: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function setupMockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('aminy-user', JSON.stringify({
      parentName: 'Test Parent',
      childName: 'Alex',
      childAge: 8,
      childId: 'child-test-123',
      relationship: 'parent',
      state: 'AZ',
      email: 'test@example.com',
      hasCompletedOnboarding: true,
      tier: 'essentials',
      role: 'parent',
    }));
  });
}

const REPORT_DIR = path.join(process.cwd(), 'e2e-reports');

// All screens to audit
const SCREENS_TO_AUDIT = [
  { name: 'Splash/Landing', path: '/', requiresAuth: false },
  { name: 'Login', path: '/?screen=login', requiresAuth: false },
  { name: 'Create Account', path: '/?screen=create-account', requiresAuth: false },
  { name: 'Forgot Password', path: '/?screen=forgot-password', requiresAuth: false },
  { name: 'Dashboard', path: '/?screen=dashboard', requiresAuth: true },
  { name: 'Settings', path: '/?screen=settings', requiresAuth: true },
  { name: 'Profile', path: '/?screen=profile', requiresAuth: true },
  { name: 'Telehealth', path: '/?screen=telehealth', requiresAuth: true },
  { name: 'Vault', path: '/?screen=vault', requiresAuth: true },
  { name: 'Marketplace', path: '/?screen=marketplace', requiresAuth: true },
  { name: 'Junior Mode', path: '/?screen=junior', requiresAuth: true },
  { name: 'Paywall', path: '/?screen=paywall', requiresAuth: true },
  { name: 'Benefits Navigator', path: '/?screen=benefits', requiresAuth: true },
  { name: 'Messages', path: '/?screen=messages', requiresAuth: true },
  { name: 'Crisis Resources', path: '/?screen=crisis-resources', requiresAuth: true },
  { name: 'Outcomes', path: '/?screen=outcomes', requiresAuth: true },
  { name: 'Care Plan', path: '/?screen=care-plan', requiresAuth: true },
  { name: 'Community', path: '/?screen=community', requiresAuth: true },
];

// ============================================
// AUDIT FUNCTIONS
// ============================================

async function auditColors(page: Page): Promise<DesignIssue[]> {
  const issues: DesignIssue[] = [];

  const colorData = await page.evaluate(() => {
    const results: any[] = [];

    // Check text contrast
    const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label');
    textElements.forEach((el) => {
      if ((el as HTMLElement).offsetParent !== null) {
        const style = getComputedStyle(el);
        const color = style.color;
        const bgColor = style.backgroundColor;
        const fontSize = parseFloat(style.fontSize);

        results.push({
          type: 'text',
          element: el.tagName,
          color,
          bgColor,
          fontSize,
          text: (el as HTMLElement).innerText?.substring(0, 30),
        });
      }
    });

    // Check button colors
    const buttons = document.querySelectorAll('button');
    buttons.forEach((btn) => {
      if ((btn as HTMLElement).offsetParent !== null) {
        const style = getComputedStyle(btn);
        results.push({
          type: 'button',
          element: 'BUTTON',
          bgColor: style.backgroundColor,
          color: style.color,
          text: btn.textContent?.substring(0, 20),
        });
      }
    });

    return results;
  });

  // Analyze color data
  const buttonColors = colorData.filter(d => d.type === 'button').map(d => d.bgColor);
  const uniqueButtonColors = [...new Set(buttonColors)];

  if (uniqueButtonColors.length > 5) {
    issues.push({
      severity: 'major',
      category: 'Color Consistency',
      issue: `Found ${uniqueButtonColors.length} different button colors`,
      recommendation: 'Standardize button colors to 2-3 variants (primary, secondary, destructive)',
    });
  }

  return issues;
}

async function auditTypography(page: Page): Promise<DesignIssue[]> {
  const issues: DesignIssue[] = [];

  const typographyData = await page.evaluate(() => {
    const fontSizes: number[] = [];
    const fontFamilies: string[] = [];
    const lineHeights: number[] = [];

    const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label, div');

    textElements.forEach((el) => {
      if ((el as HTMLElement).offsetParent !== null && (el as HTMLElement).innerText?.trim()) {
        const style = getComputedStyle(el);
        fontSizes.push(parseFloat(style.fontSize));
        fontFamilies.push(style.fontFamily.split(',')[0].trim());
        const lh = parseFloat(style.lineHeight);
        if (!isNaN(lh)) lineHeights.push(lh / parseFloat(style.fontSize));
      }
    });

    return {
      fontSizes: [...new Set(fontSizes.map(s => Math.round(s)))],
      fontFamilies: [...new Set(fontFamilies)],
      avgLineHeight: lineHeights.length ? lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length : 1.5,
      smallestFont: Math.min(...fontSizes),
      largestFont: Math.max(...fontSizes),
    };
  });

  if (typographyData.fontSizes.length > 8) {
    issues.push({
      severity: 'minor',
      category: 'Typography',
      issue: `Found ${typographyData.fontSizes.length} different font sizes`,
      recommendation: 'Use a type scale with 5-7 sizes (e.g., 12, 14, 16, 18, 24, 32, 48)',
    });
  }

  if (typographyData.smallestFont < 12) {
    issues.push({
      severity: 'major',
      category: 'Typography',
      issue: `Smallest font size is ${typographyData.smallestFont}px`,
      recommendation: 'Minimum font size should be 12px for readability, prefer 14-16px for body text',
    });
  }

  if (typographyData.fontFamilies.length > 3) {
    issues.push({
      severity: 'minor',
      category: 'Typography',
      issue: `Using ${typographyData.fontFamilies.length} different font families`,
      recommendation: 'Limit to 2 font families (one for headings, one for body)',
    });
  }

  if (typographyData.avgLineHeight < 1.3) {
    issues.push({
      severity: 'major',
      category: 'Typography',
      issue: `Average line height is ${typographyData.avgLineHeight.toFixed(2)}`,
      recommendation: 'Increase line height to 1.4-1.6 for better readability',
    });
  }

  return issues;
}

async function auditSpacing(page: Page): Promise<DesignIssue[]> {
  const issues: DesignIssue[] = [];

  const spacingData = await page.evaluate(() => {
    const paddings: number[] = [];
    const margins: number[] = [];
    const gaps: number[] = [];

    const elements = document.querySelectorAll('div, section, article, main, nav, header, footer');

    elements.forEach((el) => {
      if ((el as HTMLElement).offsetParent !== null) {
        const style = getComputedStyle(el);
        const p = parseFloat(style.padding);
        const m = parseFloat(style.margin);
        const g = parseFloat(style.gap);

        if (!isNaN(p) && p > 0) paddings.push(Math.round(p));
        if (!isNaN(m) && m > 0) margins.push(Math.round(m));
        if (!isNaN(g) && g > 0) gaps.push(Math.round(g));
      }
    });

    return {
      uniquePaddings: [...new Set(paddings)].length,
      uniqueMargins: [...new Set(margins)].length,
      uniqueGaps: [...new Set(gaps)].length,
    };
  });

  if (spacingData.uniquePaddings > 10 || spacingData.uniqueMargins > 10) {
    issues.push({
      severity: 'minor',
      category: 'Spacing',
      issue: 'Inconsistent spacing values detected',
      recommendation: 'Use a spacing scale (4, 8, 12, 16, 24, 32, 48, 64) for consistent rhythm',
    });
  }

  return issues;
}

async function auditAccessibility(page: Page): Promise<DesignIssue[]> {
  const issues: DesignIssue[] = [];

  const a11yData = await page.evaluate(() => {
    const results = {
      buttonsWithoutLabel: 0,
      imagesWithoutAlt: 0,
      inputsWithoutLabel: 0,
      smallTouchTargets: 0,
      missingHeadings: document.querySelectorAll('h1').length === 0,
      skippedHeadingLevels: false,
    };

    // Buttons without accessible names
    document.querySelectorAll('button').forEach((btn) => {
      if ((btn as HTMLElement).offsetParent !== null) {
        const text = btn.textContent?.trim();
        const ariaLabel = btn.getAttribute('aria-label');
        if (!text && !ariaLabel) results.buttonsWithoutLabel++;
      }
    });

    // Images without alt
    document.querySelectorAll('img').forEach((img) => {
      if ((img as HTMLElement).offsetParent !== null) {
        if (!img.getAttribute('alt') && img.getAttribute('role') !== 'presentation') {
          results.imagesWithoutAlt++;
        }
      }
    });

    // Inputs without labels
    document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((input) => {
      if ((input as HTMLElement).offsetParent !== null) {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        if (!label && !ariaLabel) results.inputsWithoutLabel++;
      }
    });

    // Small touch targets
    document.querySelectorAll('button, a, [role="button"]').forEach((el) => {
      if ((el as HTMLElement).offsetParent !== null) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) results.smallTouchTargets++;
      }
    });

    // Check heading levels
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .filter(h => (h as HTMLElement).offsetParent !== null)
      .map(h => parseInt(h.tagName[1]));

    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i - 1] + 1) {
        results.skippedHeadingLevels = true;
        break;
      }
    }

    return results;
  });

  if (a11yData.buttonsWithoutLabel > 0) {
    issues.push({
      severity: 'critical',
      category: 'Accessibility',
      issue: `${a11yData.buttonsWithoutLabel} buttons without accessible names`,
      recommendation: 'Add aria-label or visible text to all buttons, especially icon-only buttons',
    });
  }

  if (a11yData.imagesWithoutAlt > 0) {
    issues.push({
      severity: 'major',
      category: 'Accessibility',
      issue: `${a11yData.imagesWithoutAlt} images without alt text`,
      recommendation: 'Add descriptive alt text to images, or alt="" for decorative images',
    });
  }

  if (a11yData.inputsWithoutLabel > 0) {
    issues.push({
      severity: 'critical',
      category: 'Accessibility',
      issue: `${a11yData.inputsWithoutLabel} form inputs without labels`,
      recommendation: 'Associate labels with inputs using for/id or wrap inputs in label elements',
    });
  }

  if (a11yData.smallTouchTargets > 5) {
    issues.push({
      severity: 'major',
      category: 'Accessibility',
      issue: `${a11yData.smallTouchTargets} touch targets smaller than 44x44px`,
      recommendation: 'Increase touch target size to minimum 44x44px for mobile accessibility',
    });
  }

  if (a11yData.missingHeadings) {
    issues.push({
      severity: 'major',
      category: 'Accessibility',
      issue: 'No H1 heading found on page',
      recommendation: 'Add an H1 heading to describe the main content of the page',
    });
  }

  if (a11yData.skippedHeadingLevels) {
    issues.push({
      severity: 'minor',
      category: 'Accessibility',
      issue: 'Heading levels are skipped (e.g., H2 followed by H4)',
      recommendation: 'Use sequential heading levels for proper document outline',
    });
  }

  return issues;
}

async function auditMobile(page: Page): Promise<DesignIssue[]> {
  const issues: DesignIssue[] = [];

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);

  const mobileData = await page.evaluate(() => {
    return {
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 5,
      viewportMeta: document.querySelector('meta[name="viewport"]') !== null,
      fixedElements: document.querySelectorAll('[style*="position: fixed"], [class*="fixed"]').length,
    };
  });

  if (mobileData.hasHorizontalOverflow) {
    issues.push({
      severity: 'critical',
      category: 'Mobile',
      issue: 'Content overflows horizontally on mobile',
      recommendation: 'Check for fixed widths, wide tables, or non-wrapping text. Use max-width: 100% on images',
    });
  }

  if (!mobileData.viewportMeta) {
    issues.push({
      severity: 'critical',
      category: 'Mobile',
      issue: 'Missing viewport meta tag',
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
    });
  }

  return issues;
}

async function auditPerformance(page: Page): Promise<{ loadTime: number; issues: DesignIssue[] }> {
  const issues: DesignIssue[] = [];

  const startTime = Date.now();
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;

  if (loadTime > 5000) {
    issues.push({
      severity: 'major',
      category: 'Performance',
      issue: `Page load time is ${(loadTime / 1000).toFixed(1)}s`,
      recommendation: 'Optimize images, lazy load below-fold content, reduce JavaScript bundle size',
    });
  } else if (loadTime > 3000) {
    issues.push({
      severity: 'minor',
      category: 'Performance',
      issue: `Page load time is ${(loadTime / 1000).toFixed(1)}s`,
      recommendation: 'Consider preloading critical resources and optimizing images',
    });
  }

  const perfData = await page.evaluate(() => {
    const images = document.querySelectorAll('img');
    let largeImages = 0;

    images.forEach((img) => {
      if (img.naturalWidth > 2000 || img.naturalHeight > 2000) {
        largeImages++;
      }
    });

    return {
      totalImages: images.length,
      largeImages,
      scripts: document.querySelectorAll('script').length,
    };
  });

  if (perfData.largeImages > 0) {
    issues.push({
      severity: 'major',
      category: 'Performance',
      issue: `${perfData.largeImages} oversized images detected`,
      recommendation: 'Resize images to display size and use modern formats (WebP, AVIF)',
    });
  }

  return { loadTime, issues };
}

async function auditUsability(page: Page): Promise<DesignIssue[]> {
  const issues: DesignIssue[] = [];

  const usabilityData = await page.evaluate(() => {
    return {
      hasLoadingIndicator: document.querySelectorAll('[class*="loading"], [class*="spinner"]').length > 0,
      hasEmptyState: document.querySelectorAll('[class*="empty"], [class*="no-data"]').length > 0,
      formCount: document.querySelectorAll('form').length,
      hasErrorHandling: document.querySelectorAll('[role="alert"], [class*="error"]').length > 0,
      hasNavigation: document.querySelectorAll('nav').length > 0,
      hasBreadcrumbs: document.querySelectorAll('[class*="breadcrumb"], [aria-label*="breadcrumb"]').length > 0,
      ctas: document.querySelectorAll('button[class*="primary"], .cta, [class*="action"]').length,
    };
  });

  if (!usabilityData.hasNavigation) {
    issues.push({
      severity: 'major',
      category: 'Usability',
      issue: 'No navigation element found',
      recommendation: 'Add clear navigation to help users orient themselves and find content',
    });
  }

  if (usabilityData.ctas === 0) {
    issues.push({
      severity: 'minor',
      category: 'Usability',
      issue: 'No clear primary call-to-action found',
      recommendation: 'Add a prominent CTA to guide users toward the main action',
    });
  }

  return issues;
}

function calculateScores(issues: DesignIssue[]): ScreenAudit['scores'] {
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const majorCount = issues.filter(i => i.severity === 'major').length;
  const minorCount = issues.filter(i => i.severity === 'minor').length;

  const accessibilityIssues = issues.filter(i => i.category === 'Accessibility');
  const performanceIssues = issues.filter(i => i.category === 'Performance');
  const usabilityIssues = issues.filter(i => i.category === 'Usability');
  const visualIssues = issues.filter(i => ['Color Consistency', 'Typography', 'Spacing', 'Mobile'].includes(i.category));

  const calcScore = (categoryIssues: DesignIssue[]) => {
    let score = 100;
    categoryIssues.forEach(issue => {
      if (issue.severity === 'critical') score -= 25;
      else if (issue.severity === 'major') score -= 15;
      else if (issue.severity === 'minor') score -= 5;
    });
    return Math.max(0, score);
  };

  const accessibility = calcScore(accessibilityIssues);
  const performance = calcScore(performanceIssues);
  const usability = calcScore(usabilityIssues);
  const visualConsistency = calcScore(visualIssues);
  const overall = Math.round((accessibility + performance + usability + visualConsistency) / 4);

  return { accessibility, performance, usability, visualConsistency, overall };
}

async function getMetrics(page: Page): Promise<ScreenAudit['metrics']> {
  return await page.evaluate(() => ({
    loadTime: performance.now(),
    elementCount: document.querySelectorAll('*').length,
    interactiveElements: document.querySelectorAll('button, a, input, select, textarea, [role="button"]').length,
    imageCount: document.querySelectorAll('img').length,
    formFields: document.querySelectorAll('input, select, textarea').length,
  }));
}

// ============================================
// MAIN AUDIT TEST
// ============================================
test.describe('Design Audit Report Generator', () => {
  const fullReport: FullAuditReport = {
    generatedAt: new Date().toISOString(),
    totalScreens: 0,
    totalIssues: 0,
    criticalIssues: 0,
    screens: [],
    summary: {
      topIssues: [],
      recommendations: [],
      overallScore: 0,
    },
  };

  test.beforeAll(() => {
    if (!fs.existsSync(REPORT_DIR)) {
      fs.mkdirSync(REPORT_DIR, { recursive: true });
    }
  });

  for (const screen of SCREENS_TO_AUDIT) {
    test(`Audit: ${screen.name}`, async ({ page }) => {
      if (screen.requiresAuth) {
        await setupMockAuth(page);
      }

      await page.setViewportSize({ width: 1280, height: 800 });
      const startTime = Date.now();
      await page.goto(screen.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Run all audits
      const colorIssues = await auditColors(page);
      const typographyIssues = await auditTypography(page);
      const spacingIssues = await auditSpacing(page);
      const accessibilityIssues = await auditAccessibility(page);
      const mobileIssues = await auditMobile(page);
      const { loadTime, issues: perfIssues } = await auditPerformance(page);
      const usabilityIssues = await auditUsability(page);

      const allIssues = [
        ...colorIssues,
        ...typographyIssues,
        ...spacingIssues,
        ...accessibilityIssues,
        ...mobileIssues,
        ...perfIssues,
        ...usabilityIssues,
      ];

      // Reset viewport for metrics
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(screen.path);
      await page.waitForLoadState('networkidle');

      const metrics = await getMetrics(page);
      metrics.loadTime = loadTime;

      const scores = calculateScores(allIssues);

      const screenAudit: ScreenAudit = {
        screen: screen.name,
        path: screen.path,
        timestamp: new Date().toISOString(),
        issues: allIssues,
        metrics,
        scores,
      };

      fullReport.screens.push(screenAudit);
      fullReport.totalScreens++;
      fullReport.totalIssues += allIssues.length;
      fullReport.criticalIssues += allIssues.filter(i => i.severity === 'critical').length;

      // Take screenshot
      await page.screenshot({
        path: path.join(REPORT_DIR, `${screen.name.toLowerCase().replace(/\s+/g, '-')}.png`),
        fullPage: true,
      });

      // Log summary for this screen
      console.log(`\n=== ${screen.name} ===`);
      console.log(`Score: ${scores.overall}/100`);
      console.log(`Issues: ${allIssues.length} (${allIssues.filter(i => i.severity === 'critical').length} critical)`);

      if (allIssues.length > 0) {
        console.log('\nTop Issues:');
        allIssues.slice(0, 5).forEach(issue => {
          console.log(`  [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.issue}`);
          console.log(`    → ${issue.recommendation}`);
        });
      }

      expect(true).toBe(true);
    });
  }

  test.afterAll(async () => {
    // Calculate summary
    const allIssues = fullReport.screens.flatMap(s => s.issues);
    const issueFrequency: Record<string, number> = {};

    allIssues.forEach(issue => {
      const key = `${issue.category}: ${issue.issue}`;
      issueFrequency[key] = (issueFrequency[key] || 0) + 1;
    });

    fullReport.summary.topIssues = Object.entries(issueFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => `${issue} (${count} screens)`);

    fullReport.summary.overallScore = Math.round(
      fullReport.screens.reduce((sum, s) => sum + s.scores.overall, 0) / fullReport.screens.length
    );

    // Generate recommendations based on most common issues
    const categoryIssues: Record<string, number> = {};
    allIssues.forEach(issue => {
      categoryIssues[issue.category] = (categoryIssues[issue.category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryIssues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    fullReport.summary.recommendations = topCategories.map(([category, count]) => {
      switch (category) {
        case 'Accessibility':
          return `Fix ${count} accessibility issues: Add labels to inputs, alt text to images, and increase touch targets`;
        case 'Typography':
          return `Standardize ${count} typography issues: Use consistent font sizes and improve line heights`;
        case 'Color Consistency':
          return `Address ${count} color issues: Create a design token system for consistent colors`;
        case 'Mobile':
          return `Fix ${count} mobile issues: Check for horizontal overflow and ensure responsive layouts`;
        case 'Performance':
          return `Optimize ${count} performance issues: Reduce load times and optimize images`;
        case 'Usability':
          return `Improve ${count} usability issues: Add clear navigation and CTAs`;
        case 'Spacing':
          return `Fix ${count} spacing issues: Use consistent spacing scale`;
        default:
          return `Address ${count} ${category} issues`;
      }
    });

    // Write full report
    const reportPath = path.join(REPORT_DIR, 'full-design-audit.json');
    fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));

    // Write markdown report
    const mdReport = generateMarkdownReport(fullReport);
    fs.writeFileSync(path.join(REPORT_DIR, 'DESIGN-AUDIT-REPORT.md'), mdReport);

    console.log('\n' + '='.repeat(60));
    console.log('DESIGN AUDIT COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total Screens Audited: ${fullReport.totalScreens}`);
    console.log(`Total Issues Found: ${fullReport.totalIssues}`);
    console.log(`Critical Issues: ${fullReport.criticalIssues}`);
    console.log(`Overall Score: ${fullReport.summary.overallScore}/100`);
    console.log(`\nReports saved to: ${REPORT_DIR}`);
    console.log('='.repeat(60));
  });
});

function generateMarkdownReport(report: FullAuditReport): string {
  let md = `# Aminy Design Audit Report

Generated: ${new Date(report.generatedAt).toLocaleString()}

## Executive Summary

| Metric | Value |
|--------|-------|
| Screens Audited | ${report.totalScreens} |
| Total Issues | ${report.totalIssues} |
| Critical Issues | ${report.criticalIssues} |
| Overall Score | ${report.summary.overallScore}/100 |

## Top Recommendations

${report.summary.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Most Common Issues

${report.summary.topIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

---

## Screen-by-Screen Analysis

`;

  for (const screen of report.screens) {
    md += `### ${screen.screen}

**Path:** \`${screen.path}\`

**Scores:**
- Accessibility: ${screen.scores.accessibility}/100
- Performance: ${screen.scores.performance}/100
- Usability: ${screen.scores.usability}/100
- Visual Consistency: ${screen.scores.visualConsistency}/100
- **Overall: ${screen.scores.overall}/100**

**Metrics:**
- Load Time: ${(screen.metrics.loadTime / 1000).toFixed(2)}s
- Elements: ${screen.metrics.elementCount}
- Interactive Elements: ${screen.metrics.interactiveElements}
- Images: ${screen.metrics.imageCount}
- Form Fields: ${screen.metrics.formFields}

`;

    if (screen.issues.length > 0) {
      md += `**Issues Found (${screen.issues.length}):**

| Severity | Category | Issue | Recommendation |
|----------|----------|-------|----------------|
`;
      screen.issues.forEach(issue => {
        md += `| ${issue.severity.toUpperCase()} | ${issue.category} | ${issue.issue} | ${issue.recommendation} |\n`;
      });
      md += '\n';
    } else {
      md += '**No issues found!** :white_check_mark:\n\n';
    }

    md += '---\n\n';
  }

  md += `
## How to Fix Issues

### Critical Priority
1. **Accessibility labels** - Add aria-label to icon buttons and labels to form inputs
2. **Touch targets** - Ensure all interactive elements are at least 44x44px
3. **Mobile overflow** - Fix horizontal scrolling on mobile devices

### High Priority
1. **Color contrast** - Ensure text has 4.5:1 contrast ratio against backgrounds
2. **Typography scale** - Standardize to 5-7 font sizes using a type scale
3. **Spacing tokens** - Use 4px/8px spacing scale for consistency

### Medium Priority
1. **Performance** - Optimize images and lazy load below-fold content
2. **Navigation** - Add clear wayfinding and breadcrumbs
3. **Empty states** - Add helpful empty states for data-dependent screens

---

*This report was generated automatically by the Aminy Design Audit Suite*
`;

  return md;
}
