// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Weekly Partner Digest
 *
 * Cron-triggered every Monday 8am MST. For each active partner org (AACT, Rise,
 * etc.), generates a KPI digest email summarizing the past 7 days:
 *
 *   - New families enrolled
 *   - Total active families
 *   - Active providers
 *   - Sessions completed
 *   - Outcome-measure trend (PHQ-9, GAD-7, ABC-I — avg + change vs last week)
 *   - Top struggles flagged by AI
 *   - Compliance status (auths expiring, licenses expiring)
 *
 * Sent via Resend to org owner email. Org admin emails configurable via
 * organizations.digest_recipient_emails (jsonb array).
 *
 * Schedule via pg_cron:
 *   SELECT cron.schedule('weekly-partner-digest', '0 15 * * 1',  -- Mon 8am MST = 15:00 UTC
 *     $$ SELECT net.http_post(
 *       url := 'https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/weekly-partner-digest',
 *       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
 *     ); $$);
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('AMINY_FROM_EMAIL') || 'partners@aminy.ai';

function sb() { return createClient(SUPABASE_URL, SERVICE_ROLE_KEY); }

interface OrgDigestData {
  orgId: string;
  orgName: string;
  recipientEmails: string[];
  newFamiliesThisWeek: number;
  totalActiveFamilies: number;
  activeProviders: number;
  sessionsCompleted: number;
  outcomesSnapshot: {
    phq9Avg: number | null;
    phq9DeltaPct: number | null;
    gad7Avg: number | null;
    gad7DeltaPct: number | null;
    abcIAvg: number | null;
    abcIDeltaPct: number | null;
    submissionsCount: number;
  };
  topStruggles: string[];
  expiringAuths: number;
  expiringLicenses: number;
}

async function gatherOrgData(orgId: string): Promise<OrgDigestData | null> {
  const c = sb();
  const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();

  // Org info
  const { data: org } = await c
    .from('organizations')
    .select('id, name, owner_id')
    .eq('id', orgId)
    .maybeSingle();
  if (!org) return null;

  // Get partner-attributed users (families)
  const { data: families } = await c
    .from('profiles')
    .select('id, created_at')
    .eq('pilot_organization', org.id);

  const totalActiveFamilies = (families || []).length;
  const newFamiliesThisWeek = (families || []).filter(f => f.created_at >= oneWeekAgo).length;

  // Providers
  const { count: providerCount } = await c
    .from('provider_applications')
    .select('*', { count: 'exact', head: true })
    .eq('partner_org', org.id)
    .eq('status', 'approved');

  // Sessions
  const familyIds = (families || []).map(f => f.id);
  let sessionsCompleted = 0;
  if (familyIds.length) {
    const { count } = await c
      .from('telehealth_sessions')
      .select('*', { count: 'exact', head: true })
      .in('patient_id', familyIds)
      .gte('scheduled_at', oneWeekAgo)
      .eq('status', 'completed');
    sessionsCompleted = count || 0;
  }

  // Outcome measure averages (this week vs last week)
  const outcomesSnapshot = await gatherOutcomesSnapshot(familyIds, oneWeekAgo, twoWeeksAgo);

  // Owner email
  const { data: owner } = await c
    .from('profiles')
    .select('email')
    .eq('id', org.owner_id)
    .maybeSingle();
  const recipientEmails = owner?.email ? [owner.email] : [];

  return {
    orgId: org.id,
    orgName: org.name,
    recipientEmails,
    newFamiliesThisWeek,
    totalActiveFamilies,
    activeProviders: providerCount || 0,
    sessionsCompleted,
    outcomesSnapshot,
    topStruggles: [],         // TODO: aggregate from user_context.strugglingWith
    expiringAuths: 0,         // TODO: query prior_auth_requests where expires_at within 30d
    expiringLicenses: 0,      // TODO: query provider_state_licenses where expires_at within 60d
  };
}

async function gatherOutcomesSnapshot(
  userIds: string[],
  weekAgo: string,
  twoWeeksAgo: string,
): Promise<OrgDigestData['outcomesSnapshot']> {
  const c = sb();
  if (!userIds.length) {
    return { phq9Avg: null, phq9DeltaPct: null, gad7Avg: null, gad7DeltaPct: null, abcIAvg: null, abcIDeltaPct: null, submissionsCount: 0 };
  }

  const { data: thisWeek } = await c
    .from('outcome_measure_submissions')
    .select('measure_id, total_score')
    .in('user_id', userIds)
    .gte('created_at', weekAgo);

  const { data: lastWeek } = await c
    .from('outcome_measure_submissions')
    .select('measure_id, total_score')
    .in('user_id', userIds)
    .gte('created_at', twoWeeksAgo)
    .lt('created_at', weekAgo);

  function avg(rows: any[] | null, id: string): number | null {
    const matching = (rows || []).filter(r => r.measure_id === id).map(r => Number(r.total_score));
    if (!matching.length) return null;
    return Math.round((matching.reduce((s, n) => s + n, 0) / matching.length) * 10) / 10;
  }

  function delta(now: number | null, prev: number | null): number | null {
    if (now == null || prev == null || prev === 0) return null;
    return Math.round(((now - prev) / prev) * 100);
  }

  const phq9Avg = avg(thisWeek, 'phq9');
  const phq9LastWeek = avg(lastWeek, 'phq9');
  const gad7Avg = avg(thisWeek, 'gad7');
  const gad7LastWeek = avg(lastWeek, 'gad7');
  const abcIAvg = avg(thisWeek, 'abc-irritability');
  const abcILastWeek = avg(lastWeek, 'abc-irritability');

  return {
    phq9Avg,
    phq9DeltaPct: delta(phq9Avg, phq9LastWeek),
    gad7Avg,
    gad7DeltaPct: delta(gad7Avg, gad7LastWeek),
    abcIAvg,
    abcIDeltaPct: delta(abcIAvg, abcILastWeek),
    submissionsCount: (thisWeek || []).length,
  };
}

function renderEmail(d: OrgDigestData): { html: string; subject: string } {
  const trend = (pct: number | null) => pct == null ? '—' : pct === 0 ? '→' : pct > 0 ? `↑ +${pct}%` : `↓ ${pct}%`;
  const trendColor = (pct: number | null, lowerIsBetter = true) =>
    pct == null ? '#94a3b8' : (lowerIsBetter ? (pct < 0 ? '#43AA8B' : pct > 0 ? '#E07A5F' : '#94a3b8') : (pct > 0 ? '#43AA8B' : '#E07A5F'));

  const subject = `Aminy × ${d.orgName} — weekly partner digest`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf7f2; padding: 32px 0; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <p style="color: #64748b; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Weekly Partner Digest</p>
    <h1 style="font-size: 24px; margin: 4px 0 8px; color: #0D1B2A;">${d.orgName} × Aminy</h1>
    <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">${new Date(Date.now() - 7 * 86_400_000).toLocaleDateString()} – ${new Date().toLocaleDateString()}</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #43AA8B12, #57759012); padding: 16px; border-radius: 12px;">
        <p style="font-size: 11px; color: #64748b; margin: 0; text-transform: uppercase;">New families</p>
        <p style="font-size: 32px; font-weight: 700; margin: 4px 0; color: #43AA8B;">${d.newFamiliesThisWeek}</p>
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">of ${d.totalActiveFamilies} total</p>
      </div>
      <div style="background: linear-gradient(135deg, #43AA8B12, #57759012); padding: 16px; border-radius: 12px;">
        <p style="font-size: 11px; color: #64748b; margin: 0; text-transform: uppercase;">Sessions this week</p>
        <p style="font-size: 32px; font-weight: 700; margin: 4px 0; color: #577590;">${d.sessionsCompleted}</p>
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">${d.activeProviders} active providers</p>
      </div>
    </div>

    <h2 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 8px;">Outcome trends</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0ede8;">
          <p style="margin: 0; font-size: 13px; color: #0D1B2A; font-weight: 600;">PHQ-9 (parent depression)</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">Lower is better</p>
        </td>
        <td style="text-align: right; padding: 12px 0; border-bottom: 1px solid #f0ede8;">
          <p style="margin: 0; font-size: 16px; font-weight: 700;">${d.outcomesSnapshot.phq9Avg ?? '—'}</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: ${trendColor(d.outcomesSnapshot.phq9DeltaPct)};">${trend(d.outcomesSnapshot.phq9DeltaPct)} vs last week</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0ede8;">
          <p style="margin: 0; font-size: 13px; color: #0D1B2A; font-weight: 600;">GAD-7 (parent anxiety)</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">Lower is better</p>
        </td>
        <td style="text-align: right; padding: 12px 0; border-bottom: 1px solid #f0ede8;">
          <p style="margin: 0; font-size: 16px; font-weight: 700;">${d.outcomesSnapshot.gad7Avg ?? '—'}</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: ${trendColor(d.outcomesSnapshot.gad7DeltaPct)};">${trend(d.outcomesSnapshot.gad7DeltaPct)} vs last week</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <p style="margin: 0; font-size: 13px; color: #0D1B2A; font-weight: 600;">ABC-I (child behaviors)</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">Lower is better</p>
        </td>
        <td style="text-align: right; padding: 12px 0;">
          <p style="margin: 0; font-size: 16px; font-weight: 700;">${d.outcomesSnapshot.abcIAvg ?? '—'}</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: ${trendColor(d.outcomesSnapshot.abcIDeltaPct)};">${trend(d.outcomesSnapshot.abcIDeltaPct)} vs last week</p>
        </td>
      </tr>
    </table>
    <p style="font-size: 11px; color: #94a3b8; margin: 8px 0 0;">${d.outcomesSnapshot.submissionsCount} submissions this week</p>

    <div style="margin-top: 32px; padding: 16px; background: #fef3c7; border-radius: 12px; border: 1px solid #fde68a;">
      <p style="margin: 0; font-size: 13px; color: #92400e;">
        <strong>${d.expiringAuths}</strong> prior authorizations expiring in next 30 days · <strong>${d.expiringLicenses}</strong> provider licenses expiring in next 60 days
      </p>
    </div>

    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 32px 0 0;">
      Aminy LLC · 5070 N. 40th St, Phoenix AZ · <a href="https://aminy.ai" style="color: #43AA8B;">aminy.ai</a>
    </p>
  </div>
</body></html>`;

  return { html, subject };
}

async function sendDigest(to: string[], html: string, subject: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  if (!to.length) return false;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `Aminy Partner Updates <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    }),
  });

  return resp.ok;
}

Deno.serve(async (_req: Request): Promise<Response> => {
  const c = sb();
  const { data: orgs } = await c
    .from('organizations')
    .select('id')
    .eq('status', 'active')
    .eq('subscription_status', 'active');

  const results: Array<{ orgId: string; sent: boolean; reason?: string }> = [];

  for (const org of orgs || []) {
    const data = await gatherOrgData(org.id);
    if (!data) { results.push({ orgId: org.id, sent: false, reason: 'data fetch failed' }); continue; }
    if (!data.recipientEmails.length) { results.push({ orgId: org.id, sent: false, reason: 'no recipient email' }); continue; }

    const { html, subject } = renderEmail(data);
    const sent = await sendDigest(data.recipientEmails, html, subject);
    results.push({ orgId: org.id, sent });
  }

  return new Response(JSON.stringify({ orgs_processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
