/**
 * Screen Readiness Gate
 *
 * Provides a centralized registry of screen completion status.
 * Screens with incomplete features are identified here so the app can:
 *   1. Show "beta" badges or placeholder banners in production
 *   2. Gate entire screens behind feature flags for investor demos
 *   3. Track which screens still need integration work
 *
 * This is separate from feature-flags.ts (which handles product segments
 * like B2B/B2G) and tier-utils.ts (which handles subscription tiers).
 *
 * This file handles *engineering completeness* — whether a screen's
 * backend integration, data persistence, and interactive flows are
 * fully wired up.
 */

import { getScreenGateReason } from './feature-flags';

// ── Screen Readiness Levels ─────────────────────────────────────────

export type ReadinessLevel =
  /** Fully functional — all features working, Supabase wired */
  | 'production'
  /** Mostly functional — core features work, some "coming soon" sections */
  | 'beta'
  /** UI complete but data is mocked / localStorage only */
  | 'preview'
  /** Placeholder UI — not ready for users */
  | 'stub';

export interface ScreenReadiness {
  level: ReadinessLevel;
  /** Human-readable note about what's incomplete */
  note?: string;
  /** Which features within the screen are incomplete */
  incompleteFeatures?: string[];
}

// ── Screen Readiness Registry ───────────────────────────────────────

/**
 * Master registry of screen readiness status.
 * Only screens that are NOT fully production-ready need entries here.
 * If a screen is not listed, it's assumed to be 'production'.
 */
export const SCREEN_READINESS: Record<string, ScreenReadiness> = {
  // ─── Beta: Core works, some sub-features incomplete ───────────
  'medications': {
    level: 'beta',
    note: 'Core medication tracking works. Reports/trends section is placeholder.',
    incompleteFeatures: ['detailed-reports', 'trend-charts', 'provider-sharing'],
  },
  'community': {
    level: 'beta',
    note: 'Posts and comments work. Groups, events, and personalized feed are placeholders.',
    incompleteFeatures: ['groups', 'events', 'personalized-feed'],
  },
  'telehealth': {
    level: 'beta',
    note: 'Scheduling UI works. Video call integration requires WebRTC setup.',
    incompleteFeatures: ['video-call', 'calendar-sync'],
  },

  // ─── Preview: UI exists, data layer not connected ─────────────
  'plan': {
    level: 'beta',
    note: 'Goal hierarchy and AI suggestions render. Some sections have coming-soon placeholders.',
    incompleteFeatures: ['ai-suggestions-backend', 'goal-export'],
  },
  'sensory-tools': {
    level: 'beta',
    note: 'Core tools render. Some tools show "coming soon" placeholders.',
    incompleteFeatures: ['ar-overlay', 'custom-tool-builder'],
  },

  // ─── Stub: Placeholder only ───────────────────────────────────
  // (B2B/B2G/fiscal-agent screens are already gated in feature-flags.ts)
} as const;

// ── Query Functions ─────────────────────────────────────────────────

/**
 * Get the readiness status of a screen.
 * Returns 'production' for any screen not explicitly listed.
 */
export function getScreenReadiness(screen: string): ScreenReadiness {
  return SCREEN_READINESS[screen] ?? { level: 'production' };
}

/**
 * Check if a screen is ready for production use.
 * A screen is considered production-ready if:
 *   1. It has no feature-flag gate (B2B/B2G/dev-mode)
 *   2. Its readiness level is 'production' or 'beta'
 */
export function isScreenProductionReady(screen: string): boolean {
  // Check feature-flag gates first
  const gateReason = getScreenGateReason(screen);
  if (gateReason) return false;

  const readiness = getScreenReadiness(screen);
  return readiness.level === 'production' || readiness.level === 'beta';
}

/**
 * Check if a screen should be completely hidden from users.
 * Only 'stub' screens and feature-flag-gated screens are hidden.
 */
export function shouldHideScreen(screen: string): boolean {
  const gateReason = getScreenGateReason(screen);
  if (gateReason) return true;

  const readiness = getScreenReadiness(screen);
  return readiness.level === 'stub';
}

/**
 * Check if a specific feature within a screen is incomplete.
 * Returns true if the feature is listed in incompleteFeatures.
 */
export function isFeatureIncomplete(screen: string, feature: string): boolean {
  const readiness = getScreenReadiness(screen);
  return readiness.incompleteFeatures?.includes(feature) ?? false;
}

/**
 * Get all screens that are not yet production-ready.
 * Useful for developer dashboards and launch readiness checks.
 */
export function getIncompleteScreens(): Array<{
  screen: string;
  readiness: ScreenReadiness;
}> {
  return Object.entries(SCREEN_READINESS)
    .filter(([, r]) => r.level !== 'production')
    .map(([screen, readiness]) => ({ screen, readiness }));
}

/**
 * Get a human-readable summary of overall readiness.
 */
export function getReadinessSummary(): {
  total: number;
  production: number;
  beta: number;
  preview: number;
  stub: number;
} {
  const entries = Object.values(SCREEN_READINESS);
  return {
    total: entries.length,
    production: entries.filter((r) => r.level === 'production').length,
    beta: entries.filter((r) => r.level === 'beta').length,
    preview: entries.filter((r) => r.level === 'preview').length,
    stub: entries.filter((r) => r.level === 'stub').length,
  };
}

// ── React Hook ──────────────────────────────────────────────────────

import { useMemo } from 'react';

/**
 * React hook to get readiness info for the current screen.
 *
 * Usage:
 *   const { level, note, isBeta, isHidden } = useScreenReadiness('medications');
 */
export function useScreenReadiness(screen: string) {
  return useMemo(() => {
    const readiness = getScreenReadiness(screen);
    return {
      ...readiness,
      isBeta: readiness.level === 'beta',
      isPreview: readiness.level === 'preview',
      isStub: readiness.level === 'stub',
      isProduction: readiness.level === 'production',
      isHidden: shouldHideScreen(screen),
      isReady: isScreenProductionReady(screen),
    };
  }, [screen]);
}

export default SCREEN_READINESS;
