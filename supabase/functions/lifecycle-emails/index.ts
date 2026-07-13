// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * lifecycle-emails — Daily cron edge function
 *
 * Fires lifecycle emails based on user tenure:
 * - Day 0: welcome (users created in the last 48h who haven't received it yet)
 * - Day 3: re-engagement check-in (only genuinely inactive users)
 * - Day 5: trial ending reminder (2 days left)
 * - Day 8+: churn prevention (if still on free after trial)
 * - Weekly: digest email (once per ISO week for active paid users)
 *
 * Schedule: daily at 10:00 AM UTC via Supabase cron
 * Dashboard → Database → Cron Jobs → New: 0 10 * * * → /functions/v1/lifecycle-emails
 *
 * ── Guardrails (June/July 2026) ──────────────────────────────────────────────
 * 1. IDEMPOTENCY — every send is recorded in lifecycle_email_log
 *    (UNIQUE(user_id, email_type); migration 20260703150000_lifecycle_email_log.sql).
 *    A user can never receive the same lifecycle email twice. Weekly digests use
 *    per-week email_type values ('weekly_digest_2026_w27').
 * 2. OPT-OUT — profiles.lifecycle_emails_enabled (same migration, DEFAULT true).
 *    Users with it false are skipped for ALL lifecycle/marketing emails.
 *    Transactional email (password reset, provider messages) is unaffected.
 * 3. SAFETY CAP — MAX_SENDS_PER_RUN hard limit per cron run so a query bug can
 *    never blast the whole user base. Deferred sends go out on later runs
 *    (the idempotency log makes that safe).
 * 4. BACKWARD COMPATIBLE — if the migration hasn't been applied yet, every query
 *    that touches lifecycle_email_log / lifecycle_emails_enabled retries without
 *    them (same pattern as rbt-supervision.ts optional columns) and the function
 *    falls back to the legacy welcome_email_sent-flag behavior.
 *
 * ── Required DB columns (pre-existing) ──────────────────────────────────────
 * profiles.welcome_email_sent  BOOLEAN DEFAULT false   (legacy Day-0 dedupe, still honored)
 * profiles.last_active_at      TIMESTAMPTZ             (App.tsx auth listener updates it)
 * (emails come from auth.users — profiles has NO email column; names via profiles.name/parent_name)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ── Email endpoints in make-server-8a022548 (payload shapes verified v163) ──
 * POST /email/welcome          { email, userName, childName }
 * POST /email/re-engage        { email, userName, childName, daysSinceLastActivity }
 * POST /email/trial-reminder   { email, userName, daysLeft }
 * POST /email/churn-prevention { email, userName, childName, emailType, offerCode, offerDiscount }
 * POST /email/weekly-digest    { email, userName, childName, weekStats }
 * (The previous revision sent firstName/userId-shaped payloads that 400'd on all
 *  five routes — the shapes above match the deployed route validation.)
 * ────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const MAKE_SERVER_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-8a022548`;

/** Hard per-run ceiling — a bug can cost at most this many emails per day. */
const MAX_SENDS_PER_RUN = 200;

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

// ─── Idempotency log (lifecycle_email_log) with missing-table fallback ───────

let logTableAvailable = true;

function isMissingLogTable(error: { code?: string; message: string }): boolean {
  return error.code === '42P01' || /lifecycle_email_log/.test(error.message);
}

/** Which of these users already received emailType? Empty set if log table absent. */
async function getAlreadySent(userIds: string[], emailType: string): Promise<Set<string>> {
  if (!logTableAvailable || userIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('lifecycle_email_log')
    .select('user_id')
    .eq('email_type', emailType)
    .in('user_id', userIds);
  if (error) {
    if (isMissingLogTable(error)) {
      logTableAvailable = false;
      console.warn('[lifecycle-emails] lifecycle_email_log missing — apply migration 20260703150000. Using legacy dedupe only.');
      return new Set();
    }
    console.error(`[lifecycle-emails] sent-log query error (${emailType}):`, error.message);
    // Fail-safe: if we cannot verify, assume already sent — never risk duplicates.
    return new Set(userIds);
  }
  return new Set((data ?? []).map((r) => r.user_id as string));
}

/** Record a successful send. Duplicate-key races are silently ignored. */
async function recordSent(userId: string, emailType: string): Promise<void> {
  if (!logTableAvailable) return;
  const { error } = await supabase
    .from('lifecycle_email_log')
    .insert({ user_id: userId, email_type: emailType });
  if (error && error.code !== '23505') {
    if (isMissingLogTable(error)) logTableAvailable = false;
    else console.error(`[lifecycle-emails] sent-log insert error (${emailType}):`, error.message);
  }
}

// ─── profiles select with optional lifecycle_emails_enabled column ───────────

// deno-lint-ignore no-explicit-any
type ProfileRow = Record<string, any>;

/**
 * Select profiles including the opt-out column; if the column doesn't exist yet
 * (migration not applied), retry without it so the run still works.
 */
async function selectProfiles(
  cols: string,
  // deno-lint-ignore no-explicit-any
  apply: (q: any) => any,
): Promise<{ data: ProfileRow[] | null; error: { message: string } | null }> {
  let res = await apply(supabase.from('profiles').select(`${cols}, lifecycle_emails_enabled`));
  if (res.error && /lifecycle_emails_enabled/.test(res.error.message)) {
    res = await apply(supabase.from('profiles').select(cols));
  }
  return res;
}

/** Opted out of lifecycle email? (missing column ⇒ default true ⇒ not opted out) */
function optedOut(user: ProfileRow): boolean {
  return user.lifecycle_emails_enabled === false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** First (primary-preferred) child name per parent, for email personalization. */
async function getChildNames(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const { data, error } = await supabase
    .from('children')
    .select('parent_id, name, is_primary, created_at')
    .in('parent_id', userIds)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[lifecycle-emails] children query error (using fallback name):', error.message);
    return map;
  }
  for (const row of data ?? []) {
    const parentId = row.parent_id as string;
    if (!map.has(parentId) && row.name) map.set(parentId, row.name as string);
  }
  return map;
}

/**
 * Emails live in auth.users (profiles has no email column), which PostgREST
 * does not expose — so we go through the service-role-only SECURITY DEFINER
 * helper public.get_user_emails() (migration 20260703160000).
 */
async function getEmails(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const { data, error } = await supabase.rpc('get_user_emails', { user_ids: userIds });
  if (error) {
    console.error('[lifecycle-emails] get_user_emails rpc error:', error.message);
    return map;
  }
  for (const row of data ?? []) {
    if (row.email) map.set(row.id as string, row.email as string);
  }
  return map;
}

/** Warm first-name for greetings: parent_name > name, first word only. */
function firstNameOf(user: ProfileRow): string {
  const n = (user.parent_name || user.name || '').trim();
  return n ? n.split(' ')[0] : 'there';
}

/** ISO-week tag, e.g. '2026_w27' — scopes weekly-digest idempotency to one send/week. */
function isoWeekTag(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}_w${String(week).padStart(2, '0')}`;
}

/** Real activity stats for the weekly digest (route requires weekStats). */
async function getWeekStats(userId: string, sinceIso: string) {
  const { count } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', sinceIso);
  const { data: streak } = await supabase
    .from('user_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .eq('type', 'daily_checkin')
    .maybeSingle();
  const streakDays = streak?.current_streak ?? 0;
  return {
    checkIns: Math.min(streakDays, 7),
    aiChats: count ?? 0,
    activitiesCompleted: 0,
    streakDays,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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
  let skippedOptOut = 0;
  let skippedAlreadySent = 0;
  let capped = false;

  /** True once the per-run safety cap is hit; logs once. */
  function capReached(): boolean {
    if (sent >= MAX_SENDS_PER_RUN) {
      if (!capped) {
        console.warn(
          `[lifecycle-emails] SAFETY CAP hit — ${MAX_SENDS_PER_RUN} sends this run; remaining users deferred to the next run (idempotency log makes this safe).`,
        );
      }
      capped = true;
    }
    return capped;
  }

  try {
    // ── 1. Welcome email (users created in the last 48h who haven't received it) ──
    const welcomeCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const { data: newUsers, error: newUsersErr } = await selectProfiles(
      'id, name, parent_name, created_at, welcome_email_sent',
      (q) =>
        q
          .eq('welcome_email_sent', false)
          .gte('created_at', welcomeCutoff.toISOString())
          .limit(100),
    );

    if (newUsersErr) {
      console.error('[lifecycle-emails] welcome query error:', newUsersErr.message);
    }

    const welcomeCandidates = (newUsers ?? []).filter((u) => {
      if (optedOut(u)) { skippedOptOut++; return false; }
      return true;
    });
    const welcomeSentSet = await getAlreadySent(welcomeCandidates.map((u) => u.id), 'welcome');
    const welcomeChildNames = await getChildNames(welcomeCandidates.map((u) => u.id));
    const welcomeEmails = await getEmails(welcomeCandidates.map((u) => u.id));

    for (const user of welcomeCandidates) {
      if (capReached()) break;
      if (welcomeSentSet.has(user.id)) { skippedAlreadySent++; continue; }
      const email = welcomeEmails.get(user.id);
      if (!email) continue;
      const ok = await callEmailEndpoint('/email/welcome', {
        email,
        userName: firstNameOf(user),
        childName: welcomeChildNames.get(user.id) || 'your child',
      });
      if (ok) {
        await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', user.id);
        await recordSent(user.id, 'welcome');
        sent++;
      } else {
        failed++;
      }
    }

    // ── 2. Re-engagement (Day 3 — users created 3-4 days ago who haven't been active) ──
    const day3Start = new Date(now); day3Start.setDate(day3Start.getDate() - 3);
    const day3End = new Date(now); day3End.setDate(day3End.getDate() - 2);
    const { data: day3Users, error: day3Err } = await selectProfiles(
      'id, name, parent_name, tier, last_active_at',
      (q) =>
        q
          .gte('created_at', day3Start.toISOString())
          .lt('created_at', day3End.toISOString())
          .limit(200),
    );

    if (day3Err) {
      console.error('[lifecycle-emails] day-3 query error:', day3Err.message);
    }

    // Only genuinely inactive users: no activity in the last 24h (never-active counts as inactive).
    const day3Candidates = (day3Users ?? []).filter((u) => {
      if (optedOut(u)) { skippedOptOut++; return false; }
      const lastActive = u.last_active_at ? new Date(u.last_active_at as string) : null;
      const daysSinceActive = lastActive
        ? (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        : 99;
      return daysSinceActive > 1;
    });
    const day3SentSet = await getAlreadySent(day3Candidates.map((u) => u.id), 'reengage_day3');
    const day3ChildNames = await getChildNames(day3Candidates.map((u) => u.id));
    const day3Emails = await getEmails(day3Candidates.map((u) => u.id));

    for (const user of day3Candidates) {
      if (capReached()) break;
      if (day3SentSet.has(user.id)) { skippedAlreadySent++; continue; }
      const email = day3Emails.get(user.id);
      if (!email) continue;
      const ok = await callEmailEndpoint('/email/re-engage', {
        email,
        userName: firstNameOf(user),
        childName: day3ChildNames.get(user.id) || 'your child',
        daysSinceLastActivity: 3,
      });
      if (ok) { await recordSent(user.id, 'reengage_day3'); sent++; } else { failed++; }
    }

    // ── 3. Trial ending reminder (Day 5 — 2 days left in 7-day trial) ──
    const day5Start = new Date(now); day5Start.setDate(day5Start.getDate() - 5);
    const day5End = new Date(now); day5End.setDate(day5End.getDate() - 4);
    const { data: day5Users, error: day5Err } = await selectProfiles(
      'id, name, parent_name, tier',
      (q) =>
        q
          .gte('created_at', day5Start.toISOString())
          .lt('created_at', day5End.toISOString())
          .eq('tier', 'free')
          .limit(200),
    );

    if (day5Err) {
      console.error('[lifecycle-emails] day-5 query error:', day5Err.message);
    }

    const day5Candidates = (day5Users ?? []).filter((u) => {
      if (optedOut(u)) { skippedOptOut++; return false; }
      return true;
    });
    // Sequence-style email_type per task spec ('trial_countdown_N' = N days into trial).
    const day5SentSet = await getAlreadySent(day5Candidates.map((u) => u.id), 'trial_countdown_5');
    const day5Emails = await getEmails(day5Candidates.map((u) => u.id));

    for (const user of day5Candidates) {
      if (capReached()) break;
      if (day5SentSet.has(user.id)) { skippedAlreadySent++; continue; }
      const email = day5Emails.get(user.id);
      if (!email) continue;
      // Endpoint is /email/trial-reminder (NOT /email/trial-ending)
      const ok = await callEmailEndpoint('/email/trial-reminder', {
        email,
        userName: firstNameOf(user),
        daysLeft: 2,
      });
      if (ok) { await recordSent(user.id, 'trial_countdown_5'); sent++; } else { failed++; }
    }

    // ── 4. Churn prevention (Day 8 — still on free after trial ended) ──
    const day8Start = new Date(now); day8Start.setDate(day8Start.getDate() - 8);
    const day8End = new Date(now); day8End.setDate(day8End.getDate() - 7);
    const { data: day8Users, error: day8Err } = await selectProfiles(
      'id, name, parent_name, tier',
      (q) =>
        q
          .gte('created_at', day8Start.toISOString())
          .lt('created_at', day8End.toISOString())
          .eq('tier', 'free')
          .limit(200),
    );

    if (day8Err) {
      console.error('[lifecycle-emails] day-8 query error:', day8Err.message);
    }

    const day8Candidates = (day8Users ?? []).filter((u) => {
      if (optedOut(u)) { skippedOptOut++; return false; }
      return true;
    });
    const day8SentSet = await getAlreadySent(day8Candidates.map((u) => u.id), 'churn_prevention_day8');
    const day8ChildNames = await getChildNames(day8Candidates.map((u) => u.id));
    const day8Emails = await getEmails(day8Candidates.map((u) => u.id));

    for (const user of day8Candidates) {
      if (capReached()) break;
      if (day8SentSet.has(user.id)) { skippedAlreadySent++; continue; }
      const email = day8Emails.get(user.id);
      if (!email) continue;
      const ok = await callEmailEndpoint('/email/churn-prevention', {
        email,
        userName: firstNameOf(user),
        childName: day8ChildNames.get(user.id) || 'your child',
        emailType: 'trial_expired_offer',
        offerCode: 'COMEBACK50',
        offerDiscount: 50,
      });
      if (ok) { await recordSent(user.id, 'churn_prevention_day8'); sent++; } else { failed++; }
    }

    // ── 5. Weekly digest (active paid users; once per ISO week via email_type tag) ──
    const weekAgoStart = new Date(now); weekAgoStart.setDate(weekAgoStart.getDate() - 7);
    const digestType = `weekly_digest_${isoWeekTag(now)}`;
    const { data: weeklyUsers, error: weeklyErr } = await selectProfiles(
      'id, name, parent_name, tier, last_active_at',
      (q) =>
        q
          .in('tier', ['core', 'pro', 'proplus'])
          .gte('last_active_at', weekAgoStart.toISOString())
          .limit(500),
    );

    if (weeklyErr) {
      console.error('[lifecycle-emails] weekly-digest query error:', weeklyErr.message);
    }

    let weeklyCandidates = (weeklyUsers ?? []).filter((u) => {
      if (optedOut(u)) { skippedOptOut++; return false; }
      return true;
    });
    // Respect the granular "Weekly progress briefing" opt-out
    // (user_preferences.weekly_briefing=false) — distinct from the master
    // lifecycle opt-out handled by optedOut() above. Client gating alone
    // doesn't stop this cron, so honor it here too.
    if (weeklyCandidates.length) {
      const { data: briefOff } = await supabase
        .from('user_preferences')
        .select('user_id')
        .in('user_id', weeklyCandidates.map((u) => u.id))
        .eq('weekly_briefing', false);
      if (briefOff?.length) {
        const offSet = new Set(briefOff.map((r: { user_id: string }) => r.user_id));
        const before = weeklyCandidates.length;
        weeklyCandidates = weeklyCandidates.filter((u) => !offSet.has(u.id));
        skippedOptOut += before - weeklyCandidates.length;
      }
    }
    const weeklySentSet = await getAlreadySent(weeklyCandidates.map((u) => u.id), digestType);
    const weeklyChildNames = await getChildNames(weeklyCandidates.map((u) => u.id));
    const weeklyEmails = await getEmails(weeklyCandidates.map((u) => u.id));

    for (const user of weeklyCandidates) {
      if (capReached()) break;
      if (weeklySentSet.has(user.id)) { skippedAlreadySent++; continue; }
      const email = weeklyEmails.get(user.id);
      if (!email) continue;
      const weekStats = await getWeekStats(user.id, weekAgoStart.toISOString());
      // Quiet sanity: don't email an all-zero "week in review".
      if (weekStats.aiChats === 0 && weekStats.streakDays === 0) continue;
      const ok = await callEmailEndpoint('/email/weekly-digest', {
        email,
        userName: firstNameOf(user),
        childName: weeklyChildNames.get(user.id) || 'your child',
        weekStats,
      });
      if (ok) { await recordSent(user.id, digestType); sent++; } else { failed++; }
    }

    console.log(
      `[lifecycle-emails] done — sent=${sent} failed=${failed} skippedOptOut=${skippedOptOut} ` +
      `skippedAlreadySent=${skippedAlreadySent} capped=${capped} logTable=${logTableAvailable} at=${now.toISOString()}`,
    );
    return new Response(
      JSON.stringify({ ok: true, sent, failed, skippedOptOut, skippedAlreadySent, capped }),
      { headers: { 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[lifecycle-emails] unhandled error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
