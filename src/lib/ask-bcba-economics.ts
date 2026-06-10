// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Ask-a-Behaviorist Economics — who answers, who pays, what it costs.
 *
 * Staffing model (NOT per-answer marketplace payouts — that math never works:
 * cost would scale with engagement, making the best users the most expensive):
 * messaging is answered by EMPLOYED/ON-CALL BEHAVIORISTS (RBTs working under
 * BCBA supervision, ~$25/hr). The AI pre-drafts every answer, so a behaviorist
 * reviews/edits ~10 answers per hour → effective cost ≈ $2.50/answer.
 * Escalation path: anything requiring clinical judgment about the treatment
 * plan gets flagged for the supervising BCBA or converted into a telehealth
 * booking — "if you want a BCBA, you book a session." Messaging is a
 * telehealth FUNNEL, not a telehealth substitute.
 *
 * ── Rail 1: PARTNER ORG ($0 platform cost — preferred) ─────────────────────
 *   Families with pilot_organization (AACT / Rise Pediatric Therapies) route
 *   to the org's OWN clinical team. The org staffs it as part of the
 *   partnership (engagement + retention + rev share); their team answering
 *   their families is also clinically better (continuity of care).
 *
 * ── Rail 2: PRO+ INCLUDED (always-on messaging) ────────────────────────────
 *   Pro+ ($49.99/mo) includes ASK_PROPLUS_MONTHLY_QUOTA questions/mo from
 *   the on-call behaviorist pool. Cost honesty: even at FULL quota burn,
 *   10 × $2.50 = $25 staffing against $49.99 revenue — profitable at the
 *   worst case, very profitable at observed ~30% utilization. This is what
 *   makes always-on messaging viable as a Pro+-only feature.
 *
 * ── Rail 3: POST-SESSION WINDOW (Core/Pro, CPT-aligned) ────────────────────
 *   A 1:1 telehealth session opens a POST_SESSION_WINDOW_DAYS messaging
 *   window — mirroring CPT digital E/M expectations (98970-98972 measure
 *   cumulative response time over a 7-day period), so the cash-pay product
 *   matches what insurance-world clinicians already recognize. GROUP
 *   sessions do NOT open the window — group is its own product; the 1:1
 *   session is the clinical relationship and the upgrade path.
 *
 * No pay-per-question rail (owner decision): outside these rails the answer
 * is "book a telehealth session or upgrade to Pro+" — keeping the upgrade
 * paths clean instead of monetizing one-off questions.
 *
 * Single source of truth — components must import from here, never hardcode.
 */

/** On-call behaviorist (RBT, BCBA-supervised) hourly staffing rate. */
export const BEHAVIORIST_HOURLY_RATE_CENTS = 2500;   // $25/hr
/** AI pre-drafts mean a behaviorist clears ~10 reviewed answers/hour. */
export const ANSWERS_PER_STAFFED_HOUR = 10;
/** Effective marginal cost per answer (staffing ÷ throughput). */
export const EFFECTIVE_COST_PER_ANSWER_CENTS =
  Math.round(BEHAVIORIST_HOURLY_RATE_CENTS / ANSWERS_PER_STAFFED_HOUR); // $2.50

export const ASK_PROPLUS_MONTHLY_QUOTA = 10;         // included with Pro+
export const ASK_TARGET_RESPONSE_HOURS = 24;         // SLA shown to parents
/**
 * Messaging window opened by a 1:1 telehealth session. 7 days mirrors CPT
 * digital E/M (98970-98972) cumulative-period expectations. Group sessions
 * do not open this window.
 */
export const POST_SESSION_WINDOW_DAYS = 7;

// Back-compat aliases (old names imported elsewhere before the staffing-model rewrite)
export const ASK_BCBA_PROPLUS_MONTHLY_QUOTA = ASK_PROPLUS_MONTHLY_QUOTA;

export type AskBcbaRail = 'partner_org' | 'platform_pool';

export interface AskBcbaRouting {
  rail: AskBcbaRail;
  /** Org slug when rail is partner_org (e.g. 'aact'). */
  partnerOrg: string | null;
  /** Aminy's marginal staffing cost for this answer (0 on partner rail). */
  costCents: number;
  /** What the parent pays for this question (0 when included). */
  parentPriceCents: number;
  /** Copy shown to the parent about who will answer. */
  answeredByLabel: string;
}

/**
 * Decide how a question routes. Returns null when the user has no included
 * access — the UI shows the gate (book a telehealth session / upgrade to
 * Pro+) instead of a purchase option. Mirrors the gating in AskABCBA.tsx.
 */
export function routeAskBcbaQuestion(input: {
  tier: string;
  pilotOrganization?: string | null;
  withinPostSessionWindow?: boolean;
}): AskBcbaRouting | null {
  const { tier, pilotOrganization, withinPostSessionWindow } = input;

  // Rail 1 — partner org's own clinical team answers. $0 platform cost.
  if (pilotOrganization) {
    return {
      rail: 'partner_org',
      partnerOrg: pilotOrganization,
      costCents: 0,
      parentPriceCents: 0,
      answeredByLabel: 'your care team',
    };
  }

  const isProPlus = tier === 'proplus' || tier === 'pro_plus';

  // Rails 2+3 — included (Pro+ always; Core/Pro inside post-session window)
  if (isProPlus || withinPostSessionWindow) {
    return {
      rail: 'platform_pool',
      partnerOrg: null,
      costCents: EFFECTIVE_COST_PER_ANSWER_CENTS,
      parentPriceCents: 0,
      answeredByLabel: 'a behaviorist on the Aminy clinical team',
    };
  }

  // Not included — UI gates to "book a session" / "upgrade to Pro+"
  return null;
}

export function formatAskBcbaPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
