// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.

/**
 * DESIGN RUBRIC ENFORCEMENT — Phase 6 of DESIGN-EXCELLENCE-PLAN.md ("Lock It In").
 *
 * Mechanically-checkable A-grade rubric rules, asserted on EVERY navigable
 * screen (same auth seeding + __navigateToScreen debug-hook navigation as
 * e2e/screen-smoke.spec.ts, extended to the full AppScreen union):
 *
 *   1. No mid-word text clipping in buttons/tabs (rubric rule 2)
 *   2. Every button/link has an accessible name (rubric rule 4)
 *   3. No internal jargon / placeholder text in rendered copy (rubric rule 3)
 *
 * One test per rule, iterating all screens inside, so a failure reads as
 * "rule X broke on screens A, B" with the offending element/text inline.
 *
 * Runs on the chromium project only: these are computed-style/DOM checks at a
 * pinned 390x844 viewport — engine-independent, so once is enough and it keeps
 * the firefox/webkit CI jobs inside their time cap.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Full screen list — mirror of the AppScreen union in src/App.tsx (keep in
 * sync when adding screens; screen-smoke covers crash-safety, this covers
 * design-rubric compliance).
 *
 * Excluded (cannot render meaningfully in a headless harness):
 *   - auth-callback: consumes OAuth tokens and immediately redirects
 *   - video-call / video-call-room / daily-video-room / multi-role-telehealth:
 *     require a live Daily.co room
 *   - pre-call-setup: getUserMedia device prompts stall headless runs
 */
const SCREENS: string[] = [
  'splash',
  'login',
  'create-account',
  'onboarding',
  'dashboard',
  'paywall',
  'telehealth',
  'caregivers',
  'vault',
  'settings',
  'bcba-portal',
  'launch-status',
  'analytics',
  'phase2-menu',
  'marketplace',
  'provider-portal',
  'provider-onboarding',
  'insight-report',
  'outcomes',
  'admin-portal',
  'on-demand-telehealth',
  'calm-tools',
  'incident-log',
  'care-plan',
  'resources',
  'community',
  'profile',
  'benefits',
  'coverage-coach',
  'junior',
  'forgot-password',
  'reset-password',
  'privacy-policy',
  'terms-of-service',
  'join',
  'my-appointments',
  'conversational-booking',
  'messages',
  'access-requests',
  'provider-landing',
  'provider-apply',
  'medications',
  'crisis-resources',
  'weekly-insights',
  'outcomes-story',
  'analytics-charts',
  'wins-journal',
  'impact-metrics',
  'store',
  'community-hub',
  'provider-analytics',
  'evv-dashboard',
  'claims-dashboard',
  'payer-dashboard',
  'clinical-reports',
  'free-screening',
  'redeem-gift',
  'gift-sponsor',
  'prior-auth',
  'b2b-partner',
  'b2b-setup',
  'caregiver-enrollment',
  'outcome-measures',
  'provider-identity-verification',
  'vision-ai',
  'mfa-enrollment',
  'mfa-verification',
  'bcba-briefing',
  'provider-reviews',
  'referral-dashboard',
  'mchat-screening',
  'account-settings',
  'caregiver-timesheet',
  'parent-calm-mode',
  'token-rewards',
  'memory-settings',
  'memory-viewer',
  'caregiver-credentialing',
  'clinical-templates',
  'parent-approval',
  'share-viewer',
  'cr-sync',
  'revenue-dashboard',
  'aact-ops-dashboard',
  'waiting-room',
  'data-collection',
  'treatment-plan-editor',
  'provider-payout-setup',
  'session-payout',
  'parent-intake',
  'outcomes-dashboard',
  'ask-aminy',
  'credentialing-support',
  'denial-workbench',
  'fiscal-agent-submission',
  'pre-diagnosis',
  'developmental-screener',
  'sensory-fidget',
  'grant-navigator',
  'org-admin',
  'ask-bcba',
  'group-sessions',
  'resource-library',
  'aact-partner-setup',
  'care-coordination',
  'just-diagnosed',
];

// ---------------------------------------------------------------------------
// Allowlists — keep TINY. Every entry needs a reason.
// Format: `${screen}::${needle}` where needle is a substring of the reported
// violation string.
// ---------------------------------------------------------------------------

/** Rule 1 (clipped text). */
const CLIP_ALLOWLIST: string[] = [
  // (empty — no legitimate clipping exceptions today)
];

/**
 * Rule 2 (accessible names).
 *
 * PRE-EXISTING DEFECT BACKLOG (2026-07-15) — all are icon-only buttons missing
 * an aria-label, in src/components (owned by the components crew; the
 * enforcement harness may not edit them). Every entry below is a REAL defect:
 * remove its entry when the button gets a label so the fix is locked in.
 * Do NOT add new entries without a design-review sign-off.
 */
const A11Y_NAME_ALLOWLIST: string[] = [
  // Header back-arrow buttons (icon-only, no aria-label):
  'on-demand-telehealth::action-button inline-flex',
  'profile::action-button inline-flex',
  'account-settings::w-9 h-9 rounded-full',
  'denial-workbench::text-[#5A6B7A]',
  'just-diagnosed::<button class="">',
  // Back + close icon buttons in OutcomeMeasures.tsx header:
  'outcome-measures::<button class="">',
  // ChevronRight-only "Ask your behavior specialist" button, ResourceLibrary.tsx:195 + :418
  // (rendered on both the resources and resource-library screens):
  'resources::text-[#2A7D99] shrink-0',
  'resource-library::text-[#2A7D99] shrink-0',
];

/**
 * Rule 3 (jargon/placeholder). Legal pages keep formal terms per
 * DESIGN-EXCELLENCE-PLAN rubric rule 3 ("legal pages keep formal terms").
 */
const JARGON_EXEMPT_SCREENS = new Set(['privacy-policy', 'terms-of-service']);
const JARGON_ALLOWLIST: string[] = [
  // PRE-EXISTING (2026-07-15): "Supported payer matrix · AZ · MT · TX …" badge
  // from src/lib/product-truth.ts badgeLabel — same string is baselined in
  // scripts/lint-copy.mjs. Phase 3 copy pass rewords it; remove both entries then.
  'claims-dashboard::payer matrix',
];

// Same auth seeding as screen-smoke.spec.ts
function seedAuth() {
  return {
    id: 'rubric-test-user',
    userId: 'rubric-test-user',
    parentName: 'Rubric Test Parent',
    childName: 'Rubric Child',
    childAge: 7,
    childId: 'rubric-child-1',
    activeChildId: 'rubric-child-1',
    relationship: 'parent',
    state: 'AZ',
    email: 'rubric@test.com',
    hasCompletedOnboarding: true,
    tier: 'pro',
    role: 'parent',
  };
}

async function setupAuth(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('__e2e_auth', 'bypass');
    localStorage.setItem('aminy-user', JSON.stringify(user));
  }, seedAuth());
}

/** Load the app once; screens are then swapped via the state-nav debug hook. */
async function loadAppOnce(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 }); // rubric viewport (A-grade definition)
  await setupAuth(page);
  await page.goto('/');
  // domcontentloaded (not networkidle): background API polling never goes quiet in CI
  await page.waitForLoadState('domcontentloaded');
  // Freeze CSS animations/transitions so measurements aren't taken mid-tween.
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important; animation-delay: 0s !important;
      transition-duration: 0s !important; transition-delay: 0s !important;
    }`,
  });
  await page.waitForTimeout(1200);
}

async function gotoScreen(page: Page, screen: string): Promise<boolean> {
  await page.evaluate((name) => {
    (window as { __navigateToScreen?: (n: string) => void }).__navigateToScreen?.(name);
  }, screen);
  await page.waitForTimeout(700);
  // Blank render = screen-smoke's problem, not the rubric's — skip it here.
  const bodyText = await page.locator('body').textContent();
  return (bodyText?.trim().length || 0) > 20;
}

function applyAllowlist(violations: string[], allowlist: string[]): string[] {
  return violations.filter((v) => !allowlist.some((allowed) => {
    const [screen, needle] = allowed.split('::');
    return v.startsWith(`[${screen}]`) && v.includes(needle);
  }));
}

test.describe('Design Rubric', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Rubric checks are viewport-pinned DOM/computed-style assertions — one engine pass suffices',
    );
  });

  // Iterating ~105 screens inside one test: give each rule test generous room.
  test.setTimeout(10 * 60 * 1000);

  test('rule 1 — no mid-word text clipping in buttons/tabs on any screen', async ({ page }) => {
    await loadAppOnce(page);
    const violations: string[] = [];

    for (const screen of SCREENS) {
      if (!(await gotoScreen(page, screen))) continue;

      const clipped = await page.evaluate(() => {
        const out: string[] = [];
        const isVisible = (el: Element) => {
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return false;
          const cs = getComputedStyle(el);
          return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
        };
        for (const el of Array.from(document.querySelectorAll('button, [role="tab"]'))) {
          if (!isVisible(el)) continue;
          const text = (el.textContent || '').trim();
          if (!text) continue;
          // Overflowing text heuristic: content wider than the box by > 2px
          if (el.scrollWidth <= el.clientWidth + 2) continue;

          // Legitimate if the element (or a descendant carrying the text) uses
          // ellipsis, or if it lives inside a horizontally scrollable row.
          let allowed = false;
          const selfCs = getComputedStyle(el);
          if (selfCs.textOverflow === 'ellipsis') allowed = true;
          if (!allowed) {
            for (const d of Array.from(el.querySelectorAll('*'))) {
              const s = getComputedStyle(d);
              if (s.textOverflow === 'ellipsis' && s.overflow !== 'visible') { allowed = true; break; }
            }
          }
          let node: Element | null = el.parentElement;
          while (!allowed && node && node !== document.body) {
            const s = getComputedStyle(node);
            if (s.overflowX === 'auto' || s.overflowX === 'scroll') allowed = true;
            node = node.parentElement;
          }
          if (!allowed) {
            const role = el.getAttribute('role');
            out.push(
              `<${el.tagName.toLowerCase()}${role ? ` role=${role}` : ''}> "${text.slice(0, 50)}"` +
              ` scrollWidth=${el.scrollWidth} clientWidth=${el.clientWidth}`,
            );
          }
        }
        return out;
      });

      for (const c of clipped) violations.push(`[${screen}] ${c}`);
    }

    const real = applyAllowlist(violations, CLIP_ALLOWLIST);
    expect(real, `Clipped button/tab text (rubric rule 2 — no mid-word truncation):\n${real.join('\n')}`).toEqual([]);
  });

  test('rule 2 — every button/link has an accessible name on any screen', async ({ page }) => {
    await loadAppOnce(page);
    const violations: string[] = [];

    for (const screen of SCREENS) {
      if (!(await gotoScreen(page, screen))) continue;

      const unnamed = await page.evaluate(() => {
        const out: string[] = [];
        const isVisible = (el: Element) => {
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return false;
          const cs = getComputedStyle(el);
          return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
        };
        for (const el of Array.from(document.querySelectorAll('button, a'))) {
          if (!isVisible(el)) continue;
          const aria = el.getAttribute('aria-label')?.trim();
          const labelledBy = el.getAttribute('aria-labelledby');
          const labelledText = labelledBy
            ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim() || '').join(' ').trim()
            : '';
          const title = el.getAttribute('title')?.trim();
          const text = (el.textContent || '').trim();
          const imgAlt = Array.from(el.querySelectorAll('img'))
            .map((i) => i.getAttribute('alt')?.trim() || '').join('').trim();
          const svgLabel = Array.from(el.querySelectorAll('svg'))
            .map((s) => s.getAttribute('aria-label')?.trim() || s.querySelector('title')?.textContent?.trim() || '')
            .join('').trim();
          if (aria || labelledText || title || text || imgAlt || svgLabel) continue;
          const cls = (el.getAttribute('class') || '').split(/\s+/).slice(0, 3).join(' ');
          const rect = el.getBoundingClientRect();
          out.push(
            `<${el.tagName.toLowerCase()} class="${cls}"> at (${Math.round(rect.x)},${Math.round(rect.y)}) ${Math.round(rect.width)}x${Math.round(rect.height)} — no text/aria-label/title/alt`,
          );
        }
        return out;
      });

      for (const u of unnamed) violations.push(`[${screen}] ${u}`);
    }

    const real = applyAllowlist(violations, A11Y_NAME_ALLOWLIST);
    expect(real, `Controls with no accessible name (rubric rule 4):\n${real.join('\n')}`).toEqual([]);
  });

  test('rule 3 — no internal jargon or placeholder text rendered on any screen', async ({ page }) => {
    await loadAppOnce(page);
    const violations: string[] = [];
    // \bundefined\b / \bNaN\b catch interpolation bugs ("Hello undefined", "$NaN")
    // in RENDERED text — the copy linter deliberately leaves these to us because
    // in source they're keywords, not copy.
    const BANNED =
      /shadow mode|system of record|payer matrix|reconciliation accuracy|lorem ipsum|\bundefined\b|\bNaN\b/i;

    for (const screen of SCREENS) {
      if (JARGON_EXEMPT_SCREENS.has(screen)) continue; // legal pages keep formal terms
      if (!(await gotoScreen(page, screen))) continue;

      const bodyText = await page.evaluate(() => document.body.innerText || '');
      const match = bodyText.match(BANNED);
      if (match) {
        const idx = bodyText.toLowerCase().indexOf(match[0].toLowerCase());
        const context = bodyText.slice(Math.max(0, idx - 40), idx + match[0].length + 40).replace(/\s+/g, ' ');
        violations.push(`[${screen}] banned term "${match[0]}" in: "…${context}…"`);
      }
    }

    const real = applyAllowlist(violations, JARGON_ALLOWLIST);
    expect(real, `Banned jargon/placeholder text rendered on user surfaces (rubric rule 3):\n${real.join('\n')}`).toEqual([]);
  });
});
