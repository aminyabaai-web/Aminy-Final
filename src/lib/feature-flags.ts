// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Feature Flags System for Safe Enhancement Rollout
 * Allows incremental activation of enhanced Ask Aminy features
 *
 * All console.log statements in this file are guarded to only run in development.
 */

import React from 'react';

// =============================================================================
// B2B / B2G / PRODUCT SEGMENT FEATURE FLAGS (env-driven)
// =============================================================================
// These control which product segments are enabled at build time.
// By default all are OFF for consumer (B2C) launch.
// Enable via .env.local: VITE_B2B_ENABLED=true, etc.

export const productFlags = {
  /** Enable B2B screens (admin portal, org setup, clinic dashboard, user management) */
  b2bEnabled: import.meta.env.VITE_B2B_ENABLED === 'true',
  /** Enable B2G / payer dashboard screens */
  b2gEnabled: import.meta.env.VITE_B2G_ENABLED === 'true',
  /** Enable fiscal agent / EVV integration screens */
  fiscalAgentEnabled: import.meta.env.VITE_FISCAL_AGENT_ENABLED === 'true',
  /** Enable developer-only screens (launch status, developer mode panel) */
  devModeEnabled: import.meta.env.VITE_DEV_MODE === 'true',
  /** Enable CentralReach integration screens */
  crSyncEnabled: import.meta.env.VITE_CR_SYNC_ENABLED === 'true',
} as const;

export type ProductFlagKey = keyof typeof productFlags;

/**
 * Check whether a product-segment feature flag is enabled.
 * Use this to gate B2B, B2G, and dev-only screens.
 */
export function isProductFeatureEnabled(flag: ProductFlagKey): boolean {
  return productFlags[flag];
}

/**
 * Screens that are gated behind B2B flag
 */
export const B2B_GATED_SCREENS: readonly string[] = [
  'admin-portal',
  'b2b-partner',
  'b2b-setup',
  'bcba-portal',
  'clinic-dashboard',
  'provider-portal',
  'provider-onboarding',
  'provider-analytics',
  'provider-identity-verification',
  'clinical-templates',
  'user-management',
] as const;

/**
 * Screens that are gated behind B2G flag
 */
export const B2G_GATED_SCREENS: readonly string[] = [
  'payer-dashboard',
  'claims-dashboard',
] as const;

/**
 * Screens that are gated behind fiscal agent flag
 */
export const FISCAL_AGENT_GATED_SCREENS: readonly string[] = [
  // EVV, caregiver enrollment/credentialing/timesheet are NO LONGER gated
  // because Acumen/DCI (J. Auer) needs them from day 1.
  // Keeping the array for backwards compatibility but items moved to always-on.
] as const;

/**
 * Screens that are gated behind dev mode flag
 */
export const DEV_GATED_SCREENS: readonly string[] = [
  'launch-status',
  'phase2-menu',
] as const;

export const CR_GATED_SCREENS: readonly string[] = [
  'cr-sync',
] as const;

/** Consolidate telehealth — hide duplicate video screens (use video-call) */
export const TELEHEALTH_DUPLICATE_SCREENS: readonly string[] = [
  'daily-video-room',
  'multi-role-telehealth',
  'video-call-room',
] as const;

/**
 * Check if a screen should be gated (returns the gate reason or null if ungated)
 */
export function getScreenGateReason(screen: string): string | null {
  if (B2B_GATED_SCREENS.includes(screen) && !productFlags.b2bEnabled) {
    return 'b2b';
  }
  if (B2G_GATED_SCREENS.includes(screen) && !productFlags.b2gEnabled) {
    return 'b2g';
  }
  if (FISCAL_AGENT_GATED_SCREENS.includes(screen) && !productFlags.fiscalAgentEnabled) {
    return 'fiscal-agent';
  }
  if (DEV_GATED_SCREENS.includes(screen) && !productFlags.devModeEnabled) {
    return 'dev-mode';
  }
  if (CR_GATED_SCREENS.includes(screen) && !productFlags.crSyncEnabled) {
    return 'cr-sync';
  }
  if (TELEHEALTH_DUPLICATE_SCREENS.includes(screen)) {
    return 'use-video-call';
  }
  return null;
}

// Production-safe logging
const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
  }
};

const devWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
  }
};

export interface FeatureFlags {
  // Ask Aminy Enhancement Flags
  enhancedFloatingButton: boolean;
  contextAwareResponses: boolean;
  advancedStreaming: boolean;
  conversationPersistence: boolean;
  analyticsTracking: boolean;
  contextDetection: boolean;
  improvedUI: boolean;

  // Module Flags
  aminyJr: boolean;
  liveVisionAI: boolean;
  telehealth: boolean;
  coverageCoach: boolean;
  proactiveNudges: boolean;

  // Enhancement Flags
  voiceInput: boolean;
  photoInput: boolean;
  fileAttachments: boolean;
  multiLanguage: boolean;
  hierarchicalPlan: boolean;
  aiGoalSuggestions: boolean;
  knowledgeGraph: boolean;
}

// Ask Aminy Centerpiece Configuration - Premium experience for all users
const DEFAULT_FLAGS: FeatureFlags = {
  enhancedFloatingButton: true,  // Always enhanced
  contextAwareResponses: true,   // Advanced AI responses
  advancedStreaming: true,       // Real-time streaming
  conversationPersistence: true, // Persistent conversations
  analyticsTracking: true,       // Smart insights
  contextDetection: false,       // Proactive features (can be enabled manually)
  improvedUI: true,             // Premium UI always on

  // Module Flags
  aminyJr: true,                // Jr mode enabled
  liveVisionAI: false,          // Live Vision requires opt-in
  telehealth: true,             // Telehealth scheduling
  coverageCoach: true,          // Coverage assistance
  proactiveNudges: true,        // Proactive suggestions

  // Enhancement Flags
  voiceInput: true,             // Voice input enabled
  photoInput: true,             // Photo input enabled
  fileAttachments: false,       // File attachments
  multiLanguage: false,         // Multi-language support
  hierarchicalPlan: true,       // Hierarchical goal structure
  aiGoalSuggestions: true,      // AI-suggested goals
  knowledgeGraph: true,         // Personalized knowledge graph
};

// Development overrides - enable full experience in dev mode
const DEV_OVERRIDES: Partial<FeatureFlags> = {
  enhancedFloatingButton: true,
  contextAwareResponses: true,
  advancedStreaming: true,
  conversationPersistence: true,
  analyticsTracking: true,
  contextDetection: true,        // Enable proactive features in dev
  improvedUI: true,
};

class FeatureFlagManager {
  private flags: FeatureFlags;

  constructor() {
    this.flags = { ...DEFAULT_FLAGS };
    this.loadFlags();
  }

  private loadFlags() {
    try {
      // Load from localStorage for persistence
      const savedFlags = localStorage.getItem('aminy-feature-flags');
      if (savedFlags) {
        const parsed = JSON.parse(savedFlags);
        this.flags = { ...this.flags, ...parsed };
      }

      // Apply dev overrides in development
      if (import.meta.env.DEV) {
        this.flags = { ...this.flags, ...DEV_OVERRIDES };
      }

      // Apply URL overrides for testing
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const flagOverrides = urlParams.get('flags');
        if (flagOverrides) {
          const overrideMap = flagOverrides.split(',').reduce((acc, flag) => {
            const [key, value] = flag.split('=');
            if (key && value !== undefined) {
              acc[key as keyof FeatureFlags] = value === 'true';
            }
            return acc;
          }, {} as Partial<FeatureFlags>);

          this.flags = { ...this.flags, ...overrideMap };
        }
      }
    } catch (error) {
      devWarn('Failed to load feature flags:', error);
    }
  }

  private saveFlags() {
    try {
      localStorage.setItem('aminy-feature-flags', JSON.stringify(this.flags));
    } catch (error) {
      devWarn('Failed to save feature flags:', error);
    }
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag] || false;
  }

  enable(flag: keyof FeatureFlags) {
    if (this.flags[flag] !== true) {
      this.flags[flag] = true;
      this.saveFlags();
      devLog(`Feature flag enabled: ${flag}`);
    }
  }

  disable(flag: keyof FeatureFlags) {
    if (this.flags[flag] !== false) {
      this.flags[flag] = false;
      this.saveFlags();
      devLog(`Feature flag disabled: ${flag}`);
    }
  }

  toggle(flag: keyof FeatureFlags) {
    this.flags[flag] = !this.flags[flag];
    this.saveFlags();
    devLog(`Feature flag toggled: ${flag} = ${this.flags[flag]}`);
  }

  // Safe rollout methods
  enablePhase1() {
    this.enable('enhancedFloatingButton');
    this.enable('analyticsTracking');
    devLog('Ask Aminy Phase 1 enhancements enabled');
  }

  enablePhase2() {
    this.enable('improvedUI');
    this.enable('conversationPersistence');
    devLog('Ask Aminy Phase 2 enhancements enabled');
  }

  enablePhase3() {
    this.enable('contextAwareResponses');
    this.enable('advancedStreaming');
    devLog('Ask Aminy Phase 3 (Advanced AI) enabled');
  }

  enablePhase4() {
    this.enable('contextDetection');
    devLog('Ask Aminy Phase 4 (Full AI) enabled');
  }

  enableAll() {
    Object.keys(this.flags).forEach(flag => {
      this.flags[flag as keyof FeatureFlags] = true;
    });
    this.saveFlags();
    devLog('All Ask Aminy enhancements enabled');
  }

  disableAll() {
    this.flags = { ...DEFAULT_FLAGS };
    this.saveFlags();
    devLog('All Ask Aminy enhancements disabled');
  }

  getStatus(): FeatureFlags {
    return { ...this.flags };
  }

  // Ask Aminy Centerpiece - Same premium experience for all tiers
  applyTierConfig(userTier: string) {
    const desiredFlags: Partial<FeatureFlags> = {
      enhancedFloatingButton: true,
      contextAwareResponses: true,
      advancedStreaming: true,
      conversationPersistence: true,
      analyticsTracking: true,
      improvedUI: true,
      contextDetection: userTier === 'pro'
    };

    let hasChanges = false;
    for (const [flag, value] of Object.entries(desiredFlags)) {
      if (this.flags[flag as keyof FeatureFlags] !== value) {
        hasChanges = true;
        this.flags[flag as keyof FeatureFlags] = value;
      }
    }

    if (hasChanges) {
      this.saveFlags();
      devLog(`${userTier} tier: Ask Aminy experience configured`);
    }
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

// React hook for components
export function useFeatureFlags() {
  const [flags, setFlags] = React.useState(featureFlags.getStatus());

  React.useEffect(() => {
    const handleStorageChange = () => {
      setFlags(featureFlags.getStatus());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const enable = React.useCallback((flag: keyof FeatureFlags) => {
    featureFlags.enable(flag);
    setFlags(featureFlags.getStatus());
  }, []);

  const disable = React.useCallback((flag: keyof FeatureFlags) => {
    featureFlags.disable(flag);
    setFlags(featureFlags.getStatus());
  }, []);

  const toggle = React.useCallback((flag: keyof FeatureFlags) => {
    featureFlags.toggle(flag);
    setFlags(featureFlags.getStatus());
  }, []);

  const enablePhase1 = React.useCallback(() => {
    featureFlags.enablePhase1();
    setFlags(featureFlags.getStatus());
  }, []);

  const enablePhase2 = React.useCallback(() => {
    featureFlags.enablePhase2();
    setFlags(featureFlags.getStatus());
  }, []);

  const enablePhase3 = React.useCallback(() => {
    featureFlags.enablePhase3();
    setFlags(featureFlags.getStatus());
  }, []);

  const enablePhase4 = React.useCallback(() => {
    featureFlags.enablePhase4();
    setFlags(featureFlags.getStatus());
  }, []);

  const applyTierConfig = React.useCallback((userTier: string) => {
    featureFlags.applyTierConfig(userTier);
    setFlags(featureFlags.getStatus());
  }, []);

  const isEnabled = React.useCallback((flag: keyof FeatureFlags) => {
    return flags[flag] || false;
  }, [flags]);

  return {
    flags,
    isEnabled,
    enable,
    disable,
    toggle,
    enablePhase1,
    enablePhase2,
    enablePhase3,
    enablePhase4,
    applyTierConfig
  };
}

// Dev tools integration - ONLY in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).aminyFlags = {
    get: () => featureFlags.getStatus(),
    enable: (flag: keyof FeatureFlags) => featureFlags.enable(flag),
    disable: (flag: keyof FeatureFlags) => featureFlags.disable(flag),
    toggle: (flag: keyof FeatureFlags) => featureFlags.toggle(flag),
    phase1: () => featureFlags.enablePhase1(),
    phase2: () => featureFlags.enablePhase2(),
    phase3: () => featureFlags.enablePhase3(),
    phase4: () => featureFlags.enablePhase4(),
    all: () => featureFlags.enableAll(),
    reset: () => featureFlags.disableAll()
  };

  devLog('Feature flags available: window.aminyFlags');
}

export default featureFlags;
