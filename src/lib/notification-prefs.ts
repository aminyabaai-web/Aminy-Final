// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Notification Preferences — client-side cache + fetch
 *
 * Single source of truth for the three app-scheduling toggles that gate whether
 * Aminy is allowed to *initiate* outreach from the client:
 *   - weekly_briefing   (in-app / email weekly progress note)
 *   - daily_tips        (push daily gentle tips)
 *   - proactive_nudges  (in-app proactive check-ins)
 *
 * Design notes:
 * - FAIL-OPEN: any error (no user, network, RLS, missing columns) resolves to
 *   "everything enabled" so we never silently swallow a signal the user wanted.
 *   The toggles are opt-OUT, so the safe default is on.
 * - CACHED: the engines (proactive-nudges, push-notifications) call
 *   getNotificationPrefs() on a schedule; we cache to avoid a Supabase round-trip
 *   every tick. SettingsScreen primes the cache on save via
 *   setNotificationPrefsCache() so a toggle takes effect immediately.
 *
 * IMPORTANT: this only gates *app-initiated* scheduling. Deployed edge crons
 * (lifecycle-emails, push delivery) MUST re-check these columns server-side —
 * client gating cannot stop a server that already has the user's row.
 */

import { supabase } from '../utils/supabase/client';

export interface NotificationPrefs {
  weekly_briefing: boolean;
  daily_tips: boolean;
  proactive_nudges: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  weekly_briefing: true,
  daily_tips: true,
  proactive_nudges: true,
};

let cache: NotificationPrefs | null = null;
let inflight: Promise<NotificationPrefs> | null = null;

/**
 * Overwrite the cached prefs (or a subset). Call after a successful save so the
 * running engines pick up the change without waiting for a re-fetch.
 */
export function setNotificationPrefsCache(prefs: Partial<NotificationPrefs>): void {
  cache = { ...(cache ?? DEFAULT_NOTIFICATION_PREFS), ...prefs };
}

/**
 * Drop the cache. Next getNotificationPrefs() will re-fetch from Supabase.
 * Use on sign-out / account switch.
 */
export function invalidateNotificationPrefs(): void {
  cache = null;
  inflight = null;
}

/**
 * Resolve the current user's notification prefs. Cached; fail-open to enabled.
 */
export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async (): Promise<NotificationPrefs> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return DEFAULT_NOTIFICATION_PREFS; // fail-open (anonymous)

      const { data, error } = await supabase
        .from('user_preferences')
        .select('weekly_briefing, daily_tips, proactive_nudges')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) return DEFAULT_NOTIFICATION_PREFS; // fail-open

      cache = {
        weekly_briefing: data.weekly_briefing ?? true,
        daily_tips: data.daily_tips ?? true,
        proactive_nudges: data.proactive_nudges ?? true,
      };
      return cache;
    } catch {
      return DEFAULT_NOTIFICATION_PREFS; // fail-open
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
