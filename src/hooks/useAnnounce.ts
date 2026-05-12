// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Screen Reader Announcement Hook
 *
 * Creates and manages visually hidden aria-live regions for announcing
 * dynamic content changes to screen reader users.
 *
 * This is the canonical hook for screen reader announcements in the app.
 * It wraps the existing `announceToScreenReader` function from
 * useAccessibilityEnhancements.ts with React lifecycle management and
 * provides patterns specific to the 42-screen navigation system.
 *
 * WCAG 2.1 compliance:
 * - 4.1.3: Status Messages (programmatic announcements without focus change)
 *
 * Usage:
 *   const { announce } = useAnnounce();
 *
 *   // Polite announcement (waits for screen reader to finish current speech)
 *   announce('3 new messages loaded');
 *
 *   // Assertive announcement (interrupts current speech)
 *   announce('Error: Payment failed', 'assertive');
 *
 *   // Screen navigation (automatic)
 *   useScreenNavigationAnnouncer(currentScreen);
 */

import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Live Region Management
// ============================================================================

// Singleton live region elements
let politeRegion: HTMLDivElement | null = null;
let assertiveRegion: HTMLDivElement | null = null;
let refCount = 0;

const SR_ONLY_STYLES = [
  'position: absolute',
  'width: 1px',
  'height: 1px',
  'padding: 0',
  'margin: -1px',
  'overflow: hidden',
  'clip: rect(0, 0, 0, 0)',
  'white-space: nowrap',
  'border: 0',
].join(';');

function createLiveRegion(priority: 'polite' | 'assertive'): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('aria-live', priority);
  el.setAttribute('aria-atomic', 'true');
  el.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
  el.id = `aminy-announcer-${priority}`;
  el.className = 'sr-only';
  el.style.cssText = SR_ONLY_STYLES;
  document.body.appendChild(el);
  return el;
}

function ensureLiveRegions(): void {
  if (!politeRegion || !document.body.contains(politeRegion)) {
    politeRegion = createLiveRegion('polite');
  }
  if (!assertiveRegion || !document.body.contains(assertiveRegion)) {
    assertiveRegion = createLiveRegion('assertive');
  }
}

function cleanupLiveRegions(): void {
  if (politeRegion && document.body.contains(politeRegion)) {
    document.body.removeChild(politeRegion);
    politeRegion = null;
  }
  if (assertiveRegion && document.body.contains(assertiveRegion)) {
    document.body.removeChild(assertiveRegion);
    assertiveRegion = null;
  }
}

// ============================================================================
// Core announce function (can be used outside React)
// ============================================================================

/**
 * Announce a message to screen readers.
 *
 * Uses a double-clear technique: clears the live region, waits a frame,
 * then sets the new content. This ensures screen readers detect the change
 * even if the same message is announced twice.
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  ensureLiveRegions();

  const region = priority === 'assertive' ? assertiveRegion : politeRegion;
  if (!region) return;

  // Clear the region first
  region.textContent = '';

  // Use requestAnimationFrame to ensure the clear is processed
  requestAnimationFrame(() => {
    if (region) {
      region.textContent = message;
    }
  });
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * Hook that provides a stable `announce` function and manages the lifecycle
 * of the underlying aria-live regions.
 *
 * The live regions are shared (singleton) and ref-counted, so they are only
 * created once even if multiple components use this hook, and cleaned up
 * when the last consumer unmounts.
 */
export function useAnnounce() {
  useEffect(() => {
    refCount++;
    ensureLiveRegions();

    return () => {
      refCount--;
      if (refCount <= 0) {
        refCount = 0;
        // Delay cleanup to avoid flicker during navigation
        setTimeout(() => {
          if (refCount <= 0) {
            cleanupLiveRegions();
          }
        }, 1000);
      }
    };
  }, []);

  const announceMessage = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announce(message, priority);
    },
    []
  );

  return { announce: announceMessage };
}

// ============================================================================
// Screen Navigation Announcer
// ============================================================================

/**
 * Friendly display names for the 42-screen navigation system.
 * Maps screen identifiers to human-readable names for announcements.
 */
const SCREEN_DISPLAY_NAMES: Record<string, string> = {
  'splash': 'Splash Screen',
  'login': 'Login',
  'create-account': 'Create Account',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
  'onboarding': 'Onboarding',
  'home': 'Home Dashboard',
  'dashboard': 'Dashboard',
  'ask-aminy': 'Aminy AI',
  'chat': 'Chat',
  'plan': 'Care Plan',
  'care-plans': 'Care Plans',
  'care-tab': 'Care',
  'behavior-log': 'Behavior Log',
  'daily-log': 'Daily Log',
  'observations': 'Observations',
  'goals': 'Goals',
  'reports': 'Progress Reports',
  'outcomes': 'Outcomes',
  'outcomes-tracking': 'Outcomes Tracking',
  'messages': 'Messages',
  'secure-messaging': 'Secure Messaging',
  'telehealth': 'Telehealth',
  'video-session': 'Video Session',
  'waiting-room': 'Waiting Room',
  'provider-marketplace': 'Provider Marketplace',
  'provider-portal': 'Provider Portal',
  'provider-dashboard': 'Provider Dashboard',
  'document-vault': 'Document Vault',
  'vault': 'Vault',
  'insurance': 'Insurance',
  'benefits': 'Benefits',
  'benefits-navigator': 'Benefits Navigator',
  'settings': 'Settings',
  'profile': 'Profile',
  'paywall': 'Subscription Plans',
  'community': 'Community',
  'community-hub': 'Community Hub',
  'junior': 'Aminy Junior',
  'child-profile': 'Child Profile',
  'child-mental-health': 'Child Mental Health',
  'caregiver-management': 'Caregiver Management',
  'help-center': 'Help Center',
  'analytics-charts': 'Analytics',
  'clinical-report': 'Clinical Report',
  'calm-tools': 'Calm Tools',
  'coach': 'Coach',
  'data-sharing': 'Data Sharing',
  'referrals': 'Referrals',
  'approve': 'Approval',
};

/**
 * Automatically announce screen navigation changes to screen readers.
 * Drop this into App.tsx or any component that manages screen state.
 *
 * @param currentScreen - The current screen identifier from the navigation system
 */
export function useScreenNavigationAnnouncer(currentScreen: string): void {
  const previousScreenRef = useRef<string>('');

  useEffect(() => {
    if (!currentScreen || currentScreen === previousScreenRef.current) return;

    previousScreenRef.current = currentScreen;

    // Build the announcement message
    const displayName =
      SCREEN_DISPLAY_NAMES[currentScreen] ||
      currentScreen
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    // Delay slightly to let React render the new screen
    const timer = setTimeout(() => {
      announce(`Navigated to ${displayName}`, 'polite');
    }, 150);

    return () => clearTimeout(timer);
  }, [currentScreen]);
}

// ============================================================================
// Convenience Announcement Functions
// ============================================================================

/** Announce a loading state */
export function announceLoading(context?: string): void {
  announce(context ? `Loading ${context}` : 'Loading', 'polite');
}

/** Announce that loading is complete */
export function announceLoaded(context?: string, itemCount?: number): void {
  let message = context ? `${context} loaded` : 'Content loaded';
  if (itemCount !== undefined) {
    message += `. ${itemCount} item${itemCount !== 1 ? 's' : ''} found`;
  }
  announce(message, 'polite');
}

/** Announce an error */
export function announceError(message: string): void {
  announce(`Error: ${message}`, 'assertive');
}

/** Announce a success */
export function announceSuccess(message: string): void {
  announce(message, 'polite');
}

/** Announce an action confirmation */
export function announceAction(action: string): void {
  announce(action, 'polite');
}

export default useAnnounce;
