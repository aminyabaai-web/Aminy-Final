// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Demo Family Seed — DEV-ONLY localStorage bootstrap for a lived-in demo family.
 *
 * Usage: run the dev server and open the app with `?demo=family`, e.g.
 *     http://localhost:3001/?demo=family
 *
 * Seeds localStorage BEFORE the app reads it (called at the top of main.tsx,
 * ahead of React render) with a rich family — parent Sarah, child Liam (7) —
 * so the dashboard, chat history, streak, and Ease visual schedule render
 * populated instead of all-zero.
 *
 * DEV-gated exactly like the `__e2e_auth` bypass in App.tsx: this is a no-op
 * unless `import.meta.env.DEV` is true AND the URL has `?demo=family`.
 * Re-running with `?demo=family` re-seeds (deterministic demo reset).
 *
 * ONLY keys that components verifiably read are seeded (each noted below).
 * NOT seedable from localStorage — these live server-side, so they stay empty
 * unless the demo account has real rows:
 *   - Wins Journal moments  → make-server `/wins/load` (WinsJournal.tsx)
 *   - Goals / care plan     → Supabase `goals` table (OutcomesTracking.tsx)
 *   - Session notes         → Supabase `session_notes` table
 *   - Weekly check-in trend → Supabase via fetchOutcomeTrend (AnalyticsCharts.tsx)
 */

const DEMO_CHILD_NAME = 'Liam';

function daysAgo(n: number, hour = 19): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

export function maybeSeedDemoFamily(): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;
  let wantsDemo = false;
  try {
    wantsDemo = new URLSearchParams(window.location.search).get('demo') === 'family';
  } catch {
    return;
  }
  if (!wantsDemo) return;

  const today = new Date().toISOString().split('T')[0];
  const set = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch {
      /* quota / privacy mode — demo seeding is best-effort */
    }
  };

  // ── Auth bypass + identity ────────────────────────────────────────────
  // Read by App.tsx (authReady initializer + getInitialUserData via
  // syncEncryptedStorage plaintext fallback) — same seed shape the E2E
  // golden-path uses.
  set('__e2e_auth', 'bypass');
  set('aminy-user', {
    id: 'demo-family-sarah',
    userId: 'demo-family-sarah',
    parentName: 'Sarah',
    childName: DEMO_CHILD_NAME,
    childAge: 7,
    childId: 'demo-family-liam',
    activeChildId: 'demo-family-liam',
    relationship: 'parent',
    state: 'AZ',
    email: 'sarah@demo.aminy.ai',
    hasCompletedOnboarding: true,
    tier: 'pro',
    role: 'parent',
  });

  // Suppress the cookie banner so it never covers the demo
  // (CookieConsent.tsx reads 'aminy-cookie-consent' as CookiePreferences JSON).
  set('aminy-cookie-consent', {
    essential: true,
    analytics: false,
    marketing: false,
    consentedAt: new Date().toISOString(),
  });

  // ── 3-week engagement streak ──────────────────────────────────────────
  // Read by useStreakTracker (LOCAL_KEY 'aminy_streak_tracker' +
  // ACTIONS_KEY 'aminy_streak_actions_today') → dashboard streak tile.
  // Cloud sync fails without a real session, so this local state stands.
  set('aminy_streak_tracker', {
    current: 21,
    longest: 21,
    lastActivityDate: today,
    isPaused: false,
    celebratedMilestones: [3, 7, 14],
  });
  set('aminy_streak_actions_today', {
    date: today,
    count: 2,
    actions: ['behavior_log', 'ai_chat'],
  });

  // ── 3 chat conversations (metadata + messages) ────────────────────────
  // Read by BevelChatOverlay.loadChatSessions() ('aminy-chat-sessions') —
  // shows in the chat history drawer (hamburger).
  set('aminy-chat-sessions', [
    {
      id: 'demo-chat-bedtime',
      timestamp: daysAgo(1, 20),
      preview: 'Liam gets overwhelmed at bedtime. What can I try tonight?',
      messages: [
        {
          id: 'demo-chat-bedtime-1',
          role: 'user',
          content: 'Liam gets overwhelmed at bedtime. What can I try tonight?',
          timestamp: daysAgo(1, 20),
        },
        {
          id: 'demo-chat-bedtime-2',
          role: 'assistant',
          content:
            "That sounds exhausting — and it makes sense that bedtime is the hardest transition of the day. Tonight, try a 10-minute wind-down warning, then dim the lights and offer Liam a choice: story first or pajamas first. Choices give him control inside the routine instead of a fight about the routine.",
          timestamp: daysAgo(1, 20),
        },
      ],
    },
    {
      id: 'demo-chat-morning',
      timestamp: daysAgo(4, 8),
      preview: 'Mornings are a battle — he refuses to get dressed for school.',
      messages: [
        {
          id: 'demo-chat-morning-1',
          role: 'user',
          content: 'Mornings are a battle — he refuses to get dressed for school.',
          timestamp: daysAgo(4, 8),
        },
        {
          id: 'demo-chat-morning-2',
          role: 'assistant',
          content:
            "You're not alone — mornings pack every hard transition into one hour. A visual schedule can carry the load for you: Liam checks the picture, not your voice, for what's next. Want me to help you set one up in Ease?",
          timestamp: daysAgo(4, 8),
        },
      ],
    },
    {
      id: 'demo-chat-school',
      timestamp: daysAgo(9, 15),
      preview: 'His teacher says he shuts down during class transitions.',
      messages: [
        {
          id: 'demo-chat-school-1',
          role: 'user',
          content: 'His teacher says he shuts down during class transitions.',
          timestamp: daysAgo(9, 15),
        },
        {
          id: 'demo-chat-school-2',
          role: 'assistant',
          content:
            "Shutting down is often a signal that the change came too fast, not defiance. Ask the teacher about a 5-minute warning plus a transition buddy — the same strategy that's been working for Liam at home. I can draft a short note to the teacher if that helps.",
          timestamp: daysAgo(9, 15),
        },
      ],
    },
  ]);

  // ── Morning + bedtime routines (with completions) ─────────────────────
  // Read by junior/VisualSchedule.tsx and JuniorPageEnhancedPro.tsx via the
  // `schedule-${childName}` key. Morning items done, bedtime in progress.
  set(`schedule-${DEMO_CHILD_NAME}`, [
    { id: 'demo-sched-1', emoji: '⏰', label: 'Wake Up', time: '7:00 AM', durationMinutes: 5, status: 'done' },
    { id: 'demo-sched-2', emoji: '👕', label: 'Get Dressed', time: '7:15 AM', durationMinutes: 15, status: 'done' },
    { id: 'demo-sched-3', emoji: '🥣', label: 'Breakfast', time: '7:30 AM', durationMinutes: 20, status: 'done' },
    { id: 'demo-sched-4', emoji: '🦷', label: 'Brush Teeth', time: '7:50 AM', durationMinutes: 5, status: 'done' },
    { id: 'demo-sched-5', emoji: '🛁', label: 'Bath Time', time: '7:00 PM', durationMinutes: 20, status: 'current' },
    { id: 'demo-sched-6', emoji: '📖', label: 'Story Time', time: '7:30 PM', durationMinutes: 15, status: 'upcoming' },
    { id: 'demo-sched-7', emoji: '💤', label: 'Lights Out', time: '7:50 PM', durationMinutes: 0, status: 'upcoming' },
  ]);

  // eslint-disable-next-line no-console
  console.log('[DemoFamily] Seeded demo family: Sarah + Liam (7) — 21-day streak, 3 chats, routines');
}
