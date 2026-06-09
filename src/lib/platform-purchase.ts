// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Platform-aware purchase routing — the Apple 30% defense.
 *
 * Strategy (Netflix/Spotify model):
 * - PWA / web: Stripe Checkout in the same window. 0% to Apple. Default.
 * - Capacitor iOS native shell: NEVER open Stripe Checkout inside the
 *   WebView — that's the App Store rejection trap (guideline 3.1.1).
 *   Instead open checkout in the EXTERNAL browser (Safari), which is
 *   permitted in the US post Epic v. Apple (external purchase link
 *   entitlement). The subscription completes on the web; the app reads
 *   the upgraded tier from Supabase on next launch.
 * - Capacitor Android: Play allows alternative billing; external browser
 *   keeps us consistent and fee-free.
 *
 * Marketplace telehealth payments (real-world services) are exempt from
 * IAP rules entirely and may stay in-WebView on all platforms.
 */

import { Capacitor } from '@capacitor/core';

/** True when running inside the iOS or Android native shell (not the PWA). */
export function isNativeShell(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Open a Stripe Checkout (or any subscription purchase) URL the
 * platform-correct way. Use this instead of `window.location.href = url`
 * for ALL digital-subscription checkouts.
 */
export function openSubscriptionCheckout(url: string): void {
  if (isNativeShell()) {
    // _system → external browser (Safari/Chrome), outside the WebView.
    // Capacitor routes window.open with _system/_blank through the OS.
    window.open(url, '_system');
  } else {
    window.location.href = url;
  }
}
