/**
 * Screen Analytics Hook
 *
 * Tracks screen visits, duration, interactions, and scroll depth.
 * Persists to Supabase screen_analytics table for product insights.
 *
 * Usage:
 *   useScreenAnalytics('dashboard', { trackScroll: true });
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

interface ScreenAnalyticsOptions {
  /** Track scroll depth (0-1) */
  trackScroll?: boolean;
  /** Track interaction count (clicks) */
  trackInteractions?: boolean;
  /** User tier for segmentation */
  tier?: string;
  /** Previous screen name */
  previousScreen?: string;
}

// Generate a stable session ID per browser session
const SESSION_ID = (() => {
  const existing = sessionStorage.getItem('aminy_analytics_session');
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem('aminy_analytics_session', id);
  return id;
})();

// Detect device type from viewport
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

// Batch queue for analytics events
let analyticsQueue: Array<Record<string, unknown>> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushAnalytics() {
  if (analyticsQueue.length === 0) return;

  const batch = [...analyticsQueue];
  analyticsQueue = [];

  try {
    await supabase.from('screen_analytics').insert(batch);
  } catch {
    // Re-queue on failure (will retry on next flush)
    analyticsQueue.push(...batch);
  }
}

function queueAnalyticsEvent(event: Record<string, unknown>) {
  analyticsQueue.push(event);

  // Flush every 10 seconds or when queue reaches 20
  if (analyticsQueue.length >= 20) {
    flushAnalytics();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushAnalytics();
    }, 10000);
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAnalytics();
    }
  });
}

export function useScreenAnalytics(
  screenName: string,
  options: ScreenAnalyticsOptions = {}
) {
  const enteredAt = useRef(Date.now());
  const interactionCount = useRef(0);
  const maxScrollDepth = useRef(0);
  const userId = useRef<string | null>(null);

  // Get user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userId.current = data.user?.id || null;
    });
  }, []);

  // Track interactions
  const trackInteraction = useCallback(() => {
    interactionCount.current++;
  }, []);

  // Track scroll depth
  useEffect(() => {
    if (!options.trackScroll) return;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const depth = Math.min(window.scrollY / scrollHeight, 1);
        maxScrollDepth.current = Math.max(maxScrollDepth.current, depth);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [options.trackScroll]);

  // Track interaction clicks
  useEffect(() => {
    if (!options.trackInteractions) return;

    const handleClick = () => { interactionCount.current++; };
    document.addEventListener('click', handleClick, { passive: true });
    return () => document.removeEventListener('click', handleClick);
  }, [options.trackInteractions]);

  // Record screen exit
  useEffect(() => {
    enteredAt.current = Date.now();
    interactionCount.current = 0;
    maxScrollDepth.current = 0;

    return () => {
      const now = Date.now();
      const durationMs = now - enteredAt.current;

      // Only track visits > 500ms (filter out rapid navigation)
      if (durationMs < 500) return;
      if (!userId.current) return;

      queueAnalyticsEvent({
        user_id: userId.current,
        session_id: SESSION_ID,
        screen_name: screenName,
        entered_at: new Date(enteredAt.current).toISOString(),
        exited_at: new Date(now).toISOString(),
        duration_ms: durationMs,
        previous_screen: options.previousScreen || null,
        tier: options.tier || null,
        device_type: getDeviceType(),
        interactions: interactionCount.current,
        scroll_depth: Math.round(maxScrollDepth.current * 100) / 100,
      });
    };
  }, [screenName, options.previousScreen, options.tier]);

  return { trackInteraction };
}

export default useScreenAnalytics;
