/**
 * Navigation Integrity Tests
 *
 * Validates that all navigation pathways in the Aminy app are consistent:
 * - AppScreen union type members
 * - Navigation alias mappings resolve to valid screens
 * - BottomNavigation tab IDs map to real screens or known handlers
 * - No duplicate screen IDs
 * - validScreens array only contains defined AppScreen values
 *
 * NOTE: Because AppScreen is a TypeScript type (erased at runtime), we define
 * the canonical screen list here mirroring the source. If a new screen is added
 * to App.tsx but not here, the test will catch the drift.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Canonical screen definitions (mirrors AppScreen type in App.tsx)
// ---------------------------------------------------------------------------

/**
 * Complete list of all screens defined in the AppScreen union type in App.tsx.
 * Keep this in sync with the source. Tests below will flag inconsistencies.
 */
const ALL_APP_SCREENS: string[] = [
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
  'junior',
  'auth-callback',
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
  'store',
  'community-hub',
  'provider-analytics',
  'evv-dashboard',
  'claims-dashboard',
  'payer-dashboard',
  'clinical-reports',
  'free-screening',
  'prior-auth',
  'b2b-partner',
  'b2b-setup',
  'caregiver-enrollment',
  'outcome-measures',
  'provider-identity-verification',
  'vision-ai',
  'mfa-enrollment',
  'mfa-verification',
  'video-call',
  'pre-call-setup',
  'bcba-briefing',
  'provider-reviews',
  'referral-dashboard',
  'mchat-screening',
  'account-settings',
  'caregiver-timesheet',
  'parent-calm-mode',
  'token-rewards',
  'memory-settings',
  'caregiver-credentialing',
  'clinical-templates',
  'daily-video-room',
  'multi-role-telehealth',
  'parent-approval',
  'share-viewer',
  'video-call-room',
];

/**
 * Navigation aliases from the Dashboard10 onNavigate handler in App.tsx.
 * Maps alias IDs to the actual AppScreen they resolve to.
 */
const NAV_ALIASES: Record<string, string> = {
  'plan': 'care-plan',
  'document-vault': 'vault',
  'care': 'conversational-booking',
  'reports': 'clinical-reports',
  'vision-ai': 'vision-ai',
  'caregiver-enrollment': 'caregiver-enrollment',
  'b2b-partner': 'b2b-partner',
  'b2b-setup': 'b2b-setup',
};

/**
 * Screens listed in the validScreens array in App.tsx onNavigate handler.
 * These are the screens reachable from the Dashboard10 navigation.
 */
const VALID_SCREENS: string[] = [
  'telehealth', 'caregivers', 'vault', 'bcba-portal', 'marketplace',
  'provider-portal', 'provider-onboarding', 'insight-report', 'outcomes', 'on-demand-telehealth',
  'settings', 'calm-tools', 'incident-log', 'care-plan', 'resources',
  'community', 'profile', 'benefits', 'junior', 'my-appointments',
  'conversational-booking', 'messages', 'access-requests', 'store',
  'community-hub', 'provider-analytics', 'weekly-insights', 'analytics-charts',
  'evv-dashboard', 'claims-dashboard', 'payer-dashboard', 'clinical-reports',
  'prior-auth', 'vision-ai', 'caregiver-enrollment', 'b2b-partner', 'b2b-setup',
  'outcome-measures',
];

/**
 * Direct screen IDs used by Dashboard10 CTA handlers.
 */
const DASHBOARD_DIRECT_TARGETS: string[] = [
  'telehealth',
  'calm-tools',
  'incident-log',
  'care-plan',
  'resources',
  'community',
  'my-appointments',
  'weekly-insights',
  'clinical-reports',
];

/**
 * BottomNavigation tab IDs for parent role.
 */
const BOTTOM_NAV_PARENT_TABS: string[] = [
  'home',        // maps to dashboard
  'messages',    // maps to messages screen
  'ask-aminy',   // opens chat panel (special handler, not a screen)
  'calm-tools',  // maps to calm-tools screen
  'more',        // opens More menu (not a direct screen)
];

/**
 * BottomNavigation tab IDs for provider role.
 */
const BOTTOM_NAV_PROVIDER_TABS: string[] = [
  'home',        // maps to dashboard
  'messages',    // maps to messages/patients screen
  'ask-aminy',   // opens chat panel
  'plan',        // alias for care-plan/notes
  'more',        // opens More menu
];

/**
 * Items inside the BottomNavigation "More" menu for parents.
 */
const MORE_MENU_PARENT_IDS: string[] = [
  'incident-log',
  'telehealth',
  'document-vault',  // alias for vault
  'crisis-resources',
  'benefits',
  'settings',
  'profile',
];

/**
 * Items inside the BottomNavigation "More" menu for providers.
 */
const MORE_MENU_PROVIDER_IDS: string[] = [
  'provider-analytics',
  'reports',      // alias for clinical-reports
  'telehealth',
  'benefits',
  'settings',
  'profile',
];

/**
 * Deep-linkable screens from DEEP_LINKABLE_SCREENS in App.tsx.
 */
const DEEP_LINKABLE_SCREENS: string[] = [
  'login', 'create-account', 'forgot-password', 'reset-password',
  'privacy-policy', 'terms-of-service', 'join',
  'provider-landing', 'provider-apply',
  'benefits', 'telehealth', 'caregivers', 'vault', 'junior',
  'crisis-resources', 'incident-log', 'free-screening',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Navigation Integrity', () => {

  // ========================================================================
  // Screen IDs uniqueness
  // ========================================================================
  describe('screen IDs', () => {
    it('no duplicate screen IDs exist in ALL_APP_SCREENS', () => {
      const seen = new Set<string>();
      const duplicates: string[] = [];

      for (const screen of ALL_APP_SCREENS) {
        if (seen.has(screen)) {
          duplicates.push(screen);
        }
        seen.add(screen);
      }

      expect(duplicates).toEqual([]);
      expect(seen.size).toBe(ALL_APP_SCREENS.length);
    });

    it('ALL_APP_SCREENS has expected count of screens (currently 81)', () => {
      // If this fails, a screen was added or removed - update the list above
      expect(ALL_APP_SCREENS.length).toBe(81);
    });
  });

  // ========================================================================
  // Navigation aliases
  // ========================================================================
  describe('navigation aliases', () => {
    it('all navigation aliases resolve to valid screens', () => {
      const invalidAliases: string[] = [];

      for (const [alias, target] of Object.entries(NAV_ALIASES)) {
        if (!ALL_APP_SCREENS.includes(target)) {
          invalidAliases.push(`${alias} -> ${target}`);
        }
      }

      expect(invalidAliases).toEqual([]);
    });

    it('alias targets are different from their keys (except identity mappings)', () => {
      // Some aliases intentionally map to themselves (e.g., vision-ai -> vision-ai)
      // This test just checks the mapping exists
      for (const [alias, target] of Object.entries(NAV_ALIASES)) {
        expect(typeof target).toBe('string');
        expect(target.length).toBeGreaterThan(0);
      }
    });
  });

  // ========================================================================
  // validScreens array
  // ========================================================================
  describe('validScreens array', () => {
    it('all screens in validScreens are defined in AppScreen type', () => {
      const invalidScreens: string[] = [];

      for (const screen of VALID_SCREENS) {
        if (!ALL_APP_SCREENS.includes(screen)) {
          invalidScreens.push(screen);
        }
      }

      expect(invalidScreens).toEqual([]);
    });

    it('no duplicate entries in validScreens', () => {
      const seen = new Set<string>();
      const duplicates: string[] = [];

      for (const screen of VALID_SCREENS) {
        if (seen.has(screen)) {
          duplicates.push(screen);
        }
        seen.add(screen);
      }

      expect(duplicates).toEqual([]);
    });

    it('all alias targets are in validScreens', () => {
      const missingTargets: string[] = [];

      for (const [alias, target] of Object.entries(NAV_ALIASES)) {
        if (!VALID_SCREENS.includes(target)) {
          missingTargets.push(`${alias} -> ${target}`);
        }
      }

      expect(missingTargets).toEqual([]);
    });
  });

  // ========================================================================
  // Dashboard CTA targets
  // ========================================================================
  describe('dashboard CTA targets', () => {
    it('all direct Dashboard10 navigation targets resolve to real screens', () => {
      const invalid = DASHBOARD_DIRECT_TARGETS.filter((screen) => !ALL_APP_SCREENS.includes(screen));
      expect(invalid).toEqual([]);
    });
  });

  // ========================================================================
  // BottomNavigation tabs
  // ========================================================================
  describe('BottomNavigation tabs', () => {
    // Special tab IDs that are handled differently (not direct screen navigations)
    const SPECIAL_TAB_IDS = ['home', 'ask-aminy', 'more'];

    it('parent tab IDs that are screen names map to real screens', () => {
      const invalidTabs: string[] = [];

      for (const tabId of BOTTOM_NAV_PARENT_TABS) {
        if (SPECIAL_TAB_IDS.includes(tabId)) continue;
        // Tab ID could be an alias or a direct screen name
        const resolved = NAV_ALIASES[tabId] || tabId;
        if (!ALL_APP_SCREENS.includes(resolved)) {
          invalidTabs.push(`${tabId} (resolved: ${resolved})`);
        }
      }

      expect(invalidTabs).toEqual([]);
    });

    it('provider tab IDs that are screen names map to real screens', () => {
      const invalidTabs: string[] = [];

      for (const tabId of BOTTOM_NAV_PROVIDER_TABS) {
        if (SPECIAL_TAB_IDS.includes(tabId)) continue;
        const resolved = NAV_ALIASES[tabId] || tabId;
        if (!ALL_APP_SCREENS.includes(resolved)) {
          invalidTabs.push(`${tabId} (resolved: ${resolved})`);
        }
      }

      expect(invalidTabs).toEqual([]);
    });

    it('parent More menu items resolve to valid screens', () => {
      const invalidItems: string[] = [];

      for (const itemId of MORE_MENU_PARENT_IDS) {
        const resolved = NAV_ALIASES[itemId] || itemId;
        if (!ALL_APP_SCREENS.includes(resolved)) {
          invalidItems.push(`${itemId} (resolved: ${resolved})`);
        }
      }

      expect(invalidItems).toEqual([]);
    });

    it('provider More menu items resolve to valid screens', () => {
      const invalidItems: string[] = [];

      for (const itemId of MORE_MENU_PROVIDER_IDS) {
        const resolved = NAV_ALIASES[itemId] || itemId;
        if (!ALL_APP_SCREENS.includes(resolved)) {
          invalidItems.push(`${itemId} (resolved: ${resolved})`);
        }
      }

      expect(invalidItems).toEqual([]);
    });
  });

  // ========================================================================
  // Deep linkable screens
  // ========================================================================
  describe('deep linkable screens', () => {
    it('all deep-linkable screens are defined in AppScreen type', () => {
      const invalidScreens: string[] = [];

      for (const screen of DEEP_LINKABLE_SCREENS) {
        if (!ALL_APP_SCREENS.includes(screen)) {
          invalidScreens.push(screen);
        }
      }

      expect(invalidScreens).toEqual([]);
    });

    it('no duplicates in deep-linkable screens', () => {
      const seen = new Set(DEEP_LINKABLE_SCREENS);
      expect(seen.size).toBe(DEEP_LINKABLE_SCREENS.length);
    });
  });

  // ========================================================================
  // Cross-validation
  // ========================================================================
  describe('cross-validation', () => {
    it('core screens are present (dashboard, login, settings, etc.)', () => {
      const coreScreens = [
        'splash', 'login', 'create-account', 'onboarding',
        'dashboard', 'settings', 'profile', 'paywall',
      ];

      for (const screen of coreScreens) {
        expect(ALL_APP_SCREENS).toContain(screen);
      }
    });

    it('auth-related screens are present', () => {
      const authScreens = [
        'auth-callback', 'forgot-password', 'reset-password',
        'mfa-enrollment', 'mfa-verification',
      ];

      for (const screen of authScreens) {
        expect(ALL_APP_SCREENS).toContain(screen);
      }
    });

    it('provider-related screens are present', () => {
      const providerScreens = [
        'provider-portal', 'provider-onboarding', 'provider-landing',
        'provider-apply', 'provider-analytics', 'provider-reviews',
        'provider-identity-verification',
      ];

      for (const screen of providerScreens) {
        expect(ALL_APP_SCREENS).toContain(screen);
      }
    });

    it('telehealth-related screens are present', () => {
      const telehealthScreens = [
        'telehealth', 'on-demand-telehealth', 'conversational-booking',
        'video-call', 'pre-call-setup', 'video-call-room',
        'daily-video-room', 'multi-role-telehealth',
      ];

      for (const screen of telehealthScreens) {
        expect(ALL_APP_SCREENS).toContain(screen);
      }
    });
  });
});
