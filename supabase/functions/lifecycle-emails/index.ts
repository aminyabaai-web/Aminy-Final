// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * lifecycle-emails — Daily cron edge function
 *
 * Fires lifecycle emails based on user tenure:
 * - Day 0: welcome (users created today who haven't received it yet)
 * - Day 3: re-engagement check-in
 * - Day 5: trial ending reminder (2 days left)
 * - Day 8+: churn prevention (if still on free after trial)
 * - Weekly: digest email (every 7 days for active paid users)
 *
 * Schedule: daily at 10:00 AM UTC via Supabase cron
 * Dashboard → Database → Cron Jobs → New: 0 10 * * * → /functions/v1/lifecycle-emails
 *
 * ── Required DB columns (add migration if missing) ──────────────────────────
 * profiles.welcome_email_sent  BOOLEAN DEFAULT false
 *   Tracks whether the Day-0 welcome email has been sent so it fires exactly once.
 *   Migration: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT false;
 *
 * profiles.last_active_at  TIMESTAMPTZ
 *   Updated each time the user loads the app (App.tsx auth listener → profiles upsert).
 *   Used to skip Day-3 re-engage for users who are already active and to filter
 *   paid users for the weekly digest.
 *   Migration: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
 *
 * profiles.email  TEXT
 *   Display/contact email (may differ from auth.users.email). Used as the To address.
 *   Migration: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
 *
 * profiles.first_name  TEXT
 *   Used for personalised salutation in email bodies.
 *   Migration: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ── Email endpoints expected in make-server-8a022548 ────────────────────────
 * POST /email/welcome          ✅ exists
 * POST /email/re-engage        ✅ exists
 * POST /email/trial-reminder   ✅ exists  (note: NOT /email/trial-ending)
 * POST /email/churn-prevention ✅ exists
 * POST /email/weekly-digest    ✅ exists
 * ────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const MAKE_SERVER_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-8a022548`;

/** Call a lifecycle email endpoint in make-server. Returns true if the call succeeded. */
async function callEmailEndpoint(path: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${MAKE_SERVER_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[lifecycle-emails] ${path} failed (${res.status}):`, text.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[lifecycle-emails] ${path} threw:`, err);
    return false;
  }
}

Deno.serve(async (req) => {
  // Allow cron scheduler + manual trigger via service-role key or a dedicated cron secret
  const isAuthorized =
    req.headers.get('Authorization') === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` ||
    req.headers.get('x-cron-secret') === Deno.env.get('CRON_SECRET');

  if (!isAuthorized) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();
  let sent = 0;
  let failed = 0;

  try {
    // ── 1. Welcome email (Day 0 — users created today who haven't received it) ──
    const { data: newUsers, error: newUsersErr } = await supabase
      .from('profiles')
      .select('id, email, first_name, created_at, welcome_email_sent')
      .eq('welcome_email_sent', false)
      .not('email', 'is', null)
      .limit(100);

    if (newUsersErr) {
      console.error('[lifecycle-emails] welcome query error:', newUsersErr.message);
    }

    for (const user of newUsers ?? []) {
      const createdAt = new Date(user.created_at as string);
      const daysSince = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 1) {
        const ok = await callEmailEndpoint('/email/welcome', {
          userId: user.id,
          email: user.email,
          firstName: user.first_name || 'there',
        });
        if (ok) {
          await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', user.id);
          sent++;
        } else {
          failed++;
        }
      }
    }

    // ── 2. Re-engagement (Day 3 — users created 3-4 days ago who haven't been active) ──
    const day3Start = new Date(now); day3Start.setDate(day3Start.getDate() - 3);
    const day3End = new Date(now); day3End.setDate(day3End.getDate() - 2);
    const { data: day3Users, error: day3Err } = await supabase
      .from('profiles')
      .select('id, email, first_name, subscription_tier, last_active_at')
      .gte('created_at', day3Start.toISOString())
      .lt('created_at', day3End.toISOString())
      .not('email', 'is', null)
      .limit(200);

    if (day3Err) {
      console.error('[lifecycle-emails] day-3 query error:', day3Err.message);
    }

    for (const user of day3Users ?? []) {
      const lastActive = user.last_active_at ? new Date(user.last_active_at as string) : null;
      const daysSinceActive = lastActive
        ? (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        : 99;
      // Only send re-engage if user hasn't been active in the last day
      if (daysSinceActive > 1) {
        const ok = await callEmailEndpoint('/email/re-engage', {
          userId: user.id,
          email: user.email,
          firstName: user.first_name || 'there',
          daysSinceSignup: 3,
        });
        if (ok) { sent++; } else { failed++; }
      }
    }

    // ── 3. Trial ending reminder (Day 5 — 2 days left in 7-day trial) ──
    const day5Start = new Date(now); day5Start.setDate(day5Start.getDate() - 5);
    const day5End = new Date(now); day5End.setDate(day5End.getDate() - 4);
    const { data: day5Users, error: day5Err } = await supabase
      .from('profiles')
      .select('id, email, first_name, subscription_tier')
      .gte('created_at', day5Start.toISOString())
      .lt('created_at', day5End.toISOString())
      .eq('subscription_tier', 'free')
      .not('email', 'is', null)
      .limit(200);

    if (day5Err) {
      console.error('[lifecycle-emails] day-5 query error:', day5Err.message);
    }

    for (const user of day5Users ?? []) {
      // Endpoint is /email/trial-reminder (NOT /email/trial-ending)
      const ok = await callEmailEndpoint('/email/trial-reminder', {
        userId: user.id,
        email: user.email,
        firstName: user.first_name || 'there',
        daysLeft: 2,
      });
      if (ok) { sent++; } else { failed++; }
    }

    // ── 4. Churn prevention (Day 8 — still on free after trial ended) ──
    const day8Start = new Date(now); day8Start.setDate(day8Start.getDate() - 8);
    const day8End = new Date(now); day8End.setDate(day8End.getDate() - 7);
    const { data: day8Users, error: day8Err } = await supabase
      .from('profiles')
      .select('id, email, first_name, subscription_tier')
      .gte('created_at', day8Start.toISOString())
      .lt('created_at', day8End.toISOString())
      .eq('subscription_tier', 'free')
      .not('email', 'is', null)
      .limit(200);

    if (day8Err) {
      console.error('[lifecycle-emails] day-8 query error:', day8Err.message);
    }

    for (const user of day8Users ?? []) {
      const ok = await callEmailEndpoint('/email/churn-prevention', {
        userId: user.id,
        email: user.email,
        firstName: user.first_name || 'there',
        offerCode: 'COMEBACK50',
        offerDiscount: '50%',
      });
      if (ok) { sent++; } else { failed++; }
    }

    // ── 5. Weekly digest (active paid users with last_active_at in the past 7 days) ──
    const weekAgoStart = new Date(now); weekAgoStart.setDate(weekAgoStart.getDate() - 7);
    const { data: weeklyUsers, error: weeklyErr } = await supabase
      .from('profiles')
      .select('id, email, first_name, subscription_tier, last_active_at')
      .in('subscription_tier', ['core', 'pro', 'proplus'])
      .not('email', 'is', null)
      .gte('last_active_at', weekAgoStart.toISOString())
      .limit(500);

    if (weeklyErr) {
      console.error('[lifecycle-emails] weekly-digest query error:', weeklyErr.message);
    }

    for (const user of weeklyUsers ?? []) {
      const ok = await callEmailEndpoint('/email/weekly-digest', {
        userId: user.id,
        email: user.email,
        firstName: user.first_name || 'there',
      });
      if (ok) { sent++; } else { failed++; }
    }

    console.log(`[lifecycle-emails] done — sent=${sent} failed=${failed} at=${now.toISOString()}`);
    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[lifecycle-emails] unhandled error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
