// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Daily Coaching Edge Function
 *
 * Generates a personalized AI coaching nudge for each active parent once per day.
 * Runs at 12:00 UTC (8 AM ET / 5 AM PT) via pg_cron.
 *
 * Setup:
 *   SELECT cron.schedule('daily-coaching', '0 12 * * *',
 *     $$SELECT net.http_post(
 *       url:='https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/daily-coaching',
 *       headers:='{"Authorization":"Bearer <service-role-key>","Content-Type":"application/json"}'::jsonb,
 *       body:='{}'::jsonb
 *     )$$);
 *
 * Required secrets:
 *   ANTHROPIC_API_KEY — Claude API for generating tips
 *   SUPABASE_SERVICE_ROLE_KEY — for service-role DB writes
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const CRON_SECRET = Deno.env.get('CRON_SHARED_SECRET');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface UserRow {
  user_id: string;
  parent_name: string | null;
  tier: string;
  child_name: string | null;
  child_age: number | null;
  diagnosis_notes: string | null;
  primary_challenges: string[] | null;
  recent_win: string | null;
  recent_behavior: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getDayContext(): string {
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' });
  const isWeekend = ['Saturday', 'Sunday'].includes(day);
  return isWeekend
    ? `It's ${day} — a weekend day, so routines may be more flexible.`
    : `It's ${day} — a school day, so morning and transition routines matter most.`;
}

interface BehaviorPattern {
  summary: string;          // Human-readable description for the prompt
  notificationTitle: string; // Override morning greeting with something relevant
  priority: 'high' | 'normal';
}

// Detect actionable patterns from the last 7 days of behavior logs + abc_entries.
// Returns null if no pattern is strong enough to surface.
async function detectBehaviorPatterns(userId: string): Promise<BehaviorPattern | null> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [logsRes, abcRes] = await Promise.all([
    supabase
      .from('behavior_logs')
      .select('behavior_type, logged_at, intensity, antecedent, trigger')
      .eq('user_id', userId)
      .eq('is_positive', false)
      .gte('logged_at', oneWeekAgo)
      .order('logged_at', { ascending: false })
      .limit(30),
    supabase
      .from('abc_entries')
      .select('behavior_category, antecedent_category, occurred_at, intensity')
      .eq('user_id', userId)
      .gte('occurred_at', oneWeekAgo)
      .order('occurred_at', { ascending: false })
      .limit(30),
  ]);

  const logs = logsRes.data ?? [];
  const abc = abcRes.data ?? [];

  if (logs.length + abc.length < 2) return null; // Not enough data

  // ── Time-of-day clustering ──────────────────────────────────────────────────
  // Build an hour-bucket histogram across both sources
  const hourBuckets: Record<number, number> = {};
  for (const entry of logs) {
    const h = new Date(entry.logged_at).getHours();
    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
  }
  for (const entry of abc) {
    const h = new Date(entry.occurred_at).getHours();
    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
  }

  // Find the 2-hour window with the most incidents
  let peakWindow = { start: 0, count: 0 };
  for (let h = 0; h < 22; h++) {
    const count = (hourBuckets[h] || 0) + (hourBuckets[h + 1] || 0);
    if (count > peakWindow.count) peakWindow = { start: h, count };
  }

  if (peakWindow.count >= 3) {
    const startLabel = `${peakWindow.start % 12 || 12}${peakWindow.start < 12 ? 'am' : 'pm'}`;
    const endLabel = `${(peakWindow.start + 2) % 12 || 12}${(peakWindow.start + 2) < 12 ? 'am' : 'pm'}`;
    const windowName =
      peakWindow.start >= 6 && peakWindow.start <= 9 ? 'morning routine' :
      peakWindow.start >= 15 && peakWindow.start <= 18 ? 'after-school/dinner transition' :
      peakWindow.start >= 19 ? 'bedtime routine' : `${startLabel}–${endLabel} window`;

    return {
      summary: `${peakWindow.count} challenging behaviors occurred in the ${startLabel}–${endLabel} window this week — clustered around the ${windowName}.`,
      notificationTitle: `A pattern Aminy noticed 👀`,
      priority: 'high',
    };
  }

  // ── Antecedent pattern ──────────────────────────────────────────────────────
  const antecedentCounts: Record<string, number> = {};
  for (const entry of [...logs, ...abc]) {
    const ant = (('antecedent' in entry ? entry.antecedent : entry.antecedent_category) ?? '').toLowerCase();
    if (ant.includes('transition') || ant.includes('change')) antecedentCounts.transition = (antecedentCounts.transition || 0) + 1;
    else if (ant.includes('demand') || ant.includes('request') || ant.includes('task')) antecedentCounts.demand = (antecedentCounts.demand || 0) + 1;
    else if (ant.includes('sensory') || ant.includes('noise') || ant.includes('light')) antecedentCounts.sensory = (antecedentCounts.sensory || 0) + 1;
  }

  const topAnt = Object.entries(antecedentCounts).sort((a, b) => b[1] - a[1])[0];
  if (topAnt && topAnt[1] >= 3) {
    const antLabel = topAnt[0] === 'transition' ? 'transitions and changes' :
                     topAnt[0] === 'demand' ? 'task demands and requests' :
                     'sensory input';
    return {
      summary: `${topAnt[1]} incidents this week were triggered by ${antLabel}.`,
      notificationTitle: `Aminy spotted a trigger pattern`,
      priority: 'high',
    };
  }

  // ── High frequency ──────────────────────────────────────────────────────────
  const totalIncidents = logs.length + abc.length;
  if (totalIncidents >= 5) {
    return {
      summary: `${totalIncidents} challenging behavior incidents logged this week — a higher-than-usual week.`,
      notificationTitle: `This week was a tough one`,
      priority: 'normal',
    };
  }

  return null;
}

// Latest "how are YOU holding up?" parent check-in (stress_logs, last 48h).
// Service-role client bypasses RLS, so the table is server-readable here.
async function fetchParentCheckIn(userId: string): Promise<string | null> {
  try {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('stress_logs')
      .select('stress_level, notes, created_at')
      .eq('user_id', userId)
      .gte('created_at', twoDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    const row = data?.[0];
    if (!row || typeof row.stress_level !== 'number') return null;

    const feeling =
      row.stress_level <= 3 ? 'doing okay' :
      row.stress_level <= 5 ? 'managing' :
      row.stress_level <= 7 ? 'stretched thin' :
      'running on empty';
    const note = typeof row.notes === 'string' && row.notes.trim()
      ? ` — "${row.notes.trim().slice(0, 120)}"`
      : '';
    return `${feeling}${note}`;
  } catch {
    return null;
  }
}

async function generateTip(user: UserRow, pattern: BehaviorPattern | null, parentCheckIn: string | null = null): Promise<string | null> {
  if (!ANTHROPIC_KEY) return null;

  const childDesc = [
    user.child_name ? `a child named ${user.child_name}` : 'a neurodivergent child',
    user.child_age ? `age ${user.child_age}` : null,
    user.diagnosis_notes ? `(${user.diagnosis_notes.slice(0, 80)})` : null,
  ].filter(Boolean).join(', ');

  const challengesText = user.primary_challenges?.length
    ? `Current focus areas: ${user.primary_challenges.slice(0, 3).join(', ')}.`
    : '';

  const recentContext = [
    user.recent_win ? `Recent win: "${user.recent_win}".` : null,
    user.recent_behavior ? `Recent behavior note: "${user.recent_behavior}".` : null,
  ].filter(Boolean).join(' ');

  const patternSection = pattern
    ? `\nIMPORTANT — a real pattern was detected from this family's logs this week: ${pattern.summary} Address this pattern specifically. Do NOT give generic advice — speak directly to this pattern and what to do about it.`
    : '';

  const checkInSection = parentCheckIn
    ? `\nThe parent recently checked in about their OWN state: ${parentCheckIn}. Let that shape your tone — if they're stretched thin or running on empty, make the tip smaller and kinder, and acknowledge them as a person in a few words first. Never comment on how often they check in.`
    : '';

  const prompt = `You are Aminy, a warm and knowledgeable ABA parenting coach.
${getDayContext()}
The parent is supporting ${childDesc}. ${challengesText} ${recentContext}${patternSection}${checkInSection}

Write ONE practical, specific tip for today. Requirements:
- 1-2 sentences max. No greeting, no sign-off.
- Concrete and actionable (what to do, not just general encouragement).
- Warm and empathetic tone — never clinical or preachy.
- Directly relevant to ABA, transitions, routines, or the child's noted challenges.
- If a pattern was detected, address it directly — this is the most valuable thing you can do.
- If there's a recent win, acknowledge it briefly and build on it.

Return only the tip text, nothing else.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      console.error('Anthropic error:', await resp.text());
      return null;
    }

    const data = await resp.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error('generateTip error:', err);
    return null;
  }
}

// Fallback tips when Claude is unavailable or for graceful degradation
const FALLBACK_TIPS = [
  "Try giving a 2-minute warning before transitions today — it helps your child's brain prepare for what's next.",
  "Celebrate one small win out loud today: specific praise ('you put your shoes on by yourself!') lands better than general praise.",
  "If today feels hard, remember: consistency is built over months, not days. One rough moment doesn't erase weeks of progress.",
  "Use first-then language for tasks: 'First shoes, then tablet.' It's clearer than explaining why.",
  "Morning routines run smoother with a visual checklist your child can mark off themselves.",
  "Notice one moment today where your child self-regulated, even partially — then tell them you saw it.",
  "Reduce cognitive load before demanding tasks: dim lights, lower voices, clear the table.",
];

function getFallbackTip(userId: string): string {
  const idx = userId.charCodeAt(0) % FALLBACK_TIPS.length;
  return FALLBACK_TIPS[idx];
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function runDailyCoaching(): Promise<{ sent: number; skipped: number; errors: number }> {
  const stats = { sent: 0, skipped: 0, errors: 0 };

  // Users eligible for today's nudge: non-free tier, no daily_checkin sent in last 20h
  const { data: users, error: fetchErr } = await supabase.rpc('get_daily_coaching_candidates');

  if (fetchErr) {
    // RPC not deployed yet — fall back to direct query
    console.warn('RPC not available, using direct query:', fetchErr.message);
    return runDirectQuery(stats);
  }

  if (!users?.length) {
    console.log('No eligible users today');
    return stats;
  }

  // Process in batches of 10 to avoid rate limits
  const BATCH = 10;
  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    await Promise.all(batch.map(async (user: UserRow) => {
      try {
        const [pattern, parentCheckIn] = await Promise.all([
          detectBehaviorPatterns(user.user_id).catch(() => null),
          fetchParentCheckIn(user.user_id),
        ]);
        const tip = (await generateTip(user, pattern, parentCheckIn)) ?? getFallbackTip(user.user_id);
        const parentName = user.parent_name?.split(' ')[0] || 'there';
        const title = pattern?.notificationTitle ?? `Good morning, ${parentName} 👋`;

        const { error: insertErr } = await supabase
          .from('scheduled_notifications')
          .insert({
            user_id: user.user_id,
            title,
            body: tip,
            tag: 'daily-coaching',
            notification_type: 'daily_checkin',
            scheduled_for: new Date().toISOString(),
            priority: pattern?.priority ?? 'normal',
            data: {
              type: 'daily_coaching',
              screen: 'dashboard',
              ai_generated: !!ANTHROPIC_KEY,
              pattern_detected: !!pattern,
            },
          });

        if (insertErr) {
          console.error(`Insert error for ${user.user_id}:`, insertErr.message);
          stats.errors++;
        } else {
          stats.sent++;
        }
      } catch (err) {
        console.error(`Error processing ${user.user_id}:`, err);
        stats.errors++;
      }
    }));
  }

  return stats;
}

async function runDirectQuery(stats: { sent: number; skipped: number; errors: number }) {
  // Direct query — uses actual prod schema
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, parent_name, tier, child_name, child_age, onboarding_data, children')
    .neq('tier', 'free')
    .eq('has_completed_onboarding', true)
    .limit(200);

  if (error) {
    console.error('Direct query error:', error.message);
    stats.errors++;
    return stats;
  }

  if (!profiles?.length) return stats;

  // Filter out users who already got a nudge in the last 20h
  const { data: recentlySent } = await supabase
    .from('scheduled_notifications')
    .select('user_id')
    .eq('notification_type', 'daily_checkin')
    .gte('created_at', new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString());

  const recentSet = new Set((recentlySent ?? []).map((r: { user_id: string }) => r.user_id));
  let eligible = profiles.filter((p: { id: string }) => !recentSet.has(p.id));

  // Respect the "Daily gentle tips" opt-out (user_preferences.daily_tips=false).
  // Client-side gating alone doesn't stop this cron, so honor it here too.
  if (eligible.length) {
    const { data: optedOut } = await supabase
      .from('user_preferences')
      .select('user_id')
      .in('user_id', eligible.map((p: { id: string }) => p.id))
      .eq('daily_tips', false);
    if (optedOut?.length) {
      const optedOutSet = new Set(optedOut.map((r: { user_id: string }) => r.user_id));
      const before = eligible.length;
      eligible = eligible.filter((p: { id: string }) => !optedOutSet.has(p.id));
      stats.skipped += before - eligible.length;
    }
  }

  if (!eligible.length) return stats;

  const BATCH = 10;
  for (let i = 0; i < eligible.length; i += BATCH) {
    const batch = eligible.slice(i, i + BATCH);
    await Promise.all(batch.map(async (p: Record<string, unknown>) => {
      try {
        const onboarding = (p.onboarding_data as Record<string, unknown>) ?? {};
        const childrenJson = (p.children as Record<string, unknown>[]) ?? [];
        const primaryChild = childrenJson[0] ?? {};
        const user: UserRow = {
          user_id: p.id as string,
          parent_name: p.parent_name as string | null,
          tier: p.tier as string,
          child_name: (p.child_name ?? (primaryChild as Record<string, unknown>)?.name) as string | null,
          child_age: (p.child_age ?? (primaryChild as Record<string, unknown>)?.age) as number | null,
          diagnosis_notes: (onboarding.diagnosis ?? (primaryChild as Record<string, unknown>)?.diagnosis_notes) as string | null,
          primary_challenges: (onboarding.challenges ?? (primaryChild as Record<string, unknown>)?.challenges) as string[] | null,
          recent_win: null,
          recent_behavior: null,
        };

        const [pattern, parentCheckIn] = await Promise.all([
          detectBehaviorPatterns(user.user_id).catch(() => null),
          fetchParentCheckIn(user.user_id),
        ]);
        const tip = (await generateTip(user, pattern, parentCheckIn)) ?? getFallbackTip(user.user_id);
        const parentName = (user.parent_name?.split(' ')[0]) || 'there';
        const title = pattern?.notificationTitle ?? `Good morning, ${parentName} 👋`;

        const { error: insertErr } = await supabase
          .from('scheduled_notifications')
          .insert({
            user_id: user.user_id,
            title,
            body: tip,
            tag: 'daily-coaching',
            notification_type: 'daily_checkin',
            scheduled_for: new Date().toISOString(),
            priority: pattern?.priority ?? 'normal',
            data: {
              type: 'daily_coaching',
              screen: 'dashboard',
              ai_generated: !!ANTHROPIC_KEY,
              pattern_detected: !!pattern,
            },
          });

        if (insertErr) {
          console.error(`Insert error ${user.user_id}:`, insertErr.message);
          stats.errors++;
        } else {
          stats.sent++;
        }
      } catch (err) {
        console.error('Error:', err);
        stats.errors++;
      }
    }));
  }

  return stats;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Auth gate — accept service-role key or shared secret
  if (CRON_SECRET) {
    const authHeader = req.headers.get('authorization') ?? '';
    const providedSecret = authHeader.replace('Bearer ', '');
    if (providedSecret !== CRON_SECRET && providedSecret !== SERVICE_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const stats = await runDailyCoaching();
    console.log('Daily coaching complete:', stats);
    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Daily coaching fatal error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
