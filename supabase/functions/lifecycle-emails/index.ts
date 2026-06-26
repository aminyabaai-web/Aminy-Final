// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * lifecycle-emails — Daily cron edge function
 *
 * Fires lifecycle emails based on user tenure:
 * - Day 0: welcome (handled at signup, skipped here)
 * - Day 3: re-engagement check-in
 * - Day 6: trial ending reminder
 * - Day 8+: churn prevention (if still on free after trial)
 * - Weekly: digest email (every 7 days)
 *
 * Schedule: daily at 10:00 AM UTC via Supabase cron
 * Dashboard → Database → Cron Jobs → New: 0 10 * * * → /functions/v1/lifecycle-emails
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const MAKE_SERVER_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-8a022548`;

async function callEmailEndpoint(path: string, body: Record<string, unknown>) {
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
    console.error(`${path} failed:`, text);
  }
}

Deno.serve(async (req) => {
  // Allow cron + manual trigger
  const isAuthorized =
    req.headers.get('Authorization') === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` ||
    req.headers.get('x-cron-secret') === Deno.env.get('CRON_SECRET');

  if (!isAuthorized) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();
  const todayISO = now.toISOString();
  let sent = 0;

  try {
    // ── 1. Welcome email (Day 0 — users created today who haven't received it) ──
    const { data: newUsers } = await supabase
      .from('profiles')
      .select('id, email, first_name, created_at, welcome_email_sent')
      .eq('welcome_email_sent', false)
      .not('email', 'is', null)
      .limit(100);

    for (const user of newUsers ?? []) {
      const createdAt = new Date(user.created_at as string);
      const daysSince = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 1) {
        await callEmailEndpoint('/email/welcome', { userId: user.id, email: user.email, firstName: user.first_name || 'there' });
        await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', user.id);
        sent++;
      }
    }

    // ── 2. Re-engagement (Day 3) ──
    const day3Start = new Date(now); day3Start.setDate(day3Start.getDate() - 3);
    const day3End = new Date(now); day3End.setDate(day3End.getDate() - 2);
    const { data: day3Users } = await supabase
      .from('profiles')
      .select('id, email, first_name, subscription_tier, last_active_at')
      .gte('created_at', day3Start.toISOString())
      .lt('created_at', day3End.toISOString())
      .not('email', 'is', null)
      .limit(200);

    for (const user of day3Users ?? []) {
      const lastActive = user.last_active_at ? new Date(user.last_active_at as string) : null;
      const daysSinceActive = lastActive ? (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24) : 99;
      if (daysSinceActive > 1) {
        await callEmailEndpoint('/email/re-engage', { userId: user.id, email: user.email, firstName: user.first_name || 'there', daysSinceSignup: 3 });
        sent++;
      }
    }

    // ── 3. Trial ending reminder (Day 5) ──
    const day5Start = new Date(now); day5Start.setDate(day5Start.getDate() - 5);
    const day5End = new Date(now); day5End.setDate(day5End.getDate() - 4);
    const { data: day5Users } = await supabase
      .from('profiles')
      .select('id, email, first_name, subscription_tier')
      .gte('created_at', day5Start.toISOString())
      .lt('created_at', day5End.toISOString())
      .eq('subscription_tier', 'free')
      .not('email', 'is', null)
      .limit(200);

    for (const user of day5Users ?? []) {
      await callEmailEndpoint('/email/trial-reminder', { userId: user.id, email: user.email, firstName: user.first_name || 'there', daysLeft: 2 });
      sent++;
    }

    // ── 4. Churn prevention (Day 8 — still on free) ──
    const day8Start = new Date(now); day8Start.setDate(day8Start.getDate() - 8);
    const day8End = new Date(now); day8End.setDate(day8End.getDate() - 7);
    const { data: day8Users } = await supabase
      .from('profiles')
      .select('id, email, first_name, subscription_tier')
      .gte('created_at', day8Start.toISOString())
      .lt('created_at', day8End.toISOString())
      .eq('subscription_tier', 'free')
      .not('email', 'is', null)
      .limit(200);

    for (const user of day8Users ?? []) {
      await callEmailEndpoint('/email/churn-prevention', { userId: user.id, email: user.email, firstName: user.first_name || 'there', offerCode: 'COMEBACK50', offerDiscount: '50%' });
      sent++;
    }

    // ── 5. Weekly digest (every 7 days for active paid users) ──
    const weekAgoStart = new Date(now); weekAgoStart.setDate(weekAgoStart.getDate() - 7);
    const weekAgoEnd = new Date(now); weekAgoEnd.setDate(weekAgoEnd.getDate() - 6);
    const { data: weeklyUsers } = await supabase
      .from('profiles')
      .select('id, email, first_name, subscription_tier, last_active_at')
      .in('subscription_tier', ['core', 'pro', 'proplus'])
      .not('email', 'is', null)
      .gte('last_active_at', weekAgoStart.toISOString())
      .limit(500);

    for (const user of weeklyUsers ?? []) {
      await callEmailEndpoint('/email/weekly-digest', { userId: user.id, email: user.email, firstName: user.first_name || 'there' });
      sent++;
    }

    console.log(`lifecycle-emails: sent ${sent} emails`);
    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('lifecycle-emails error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
