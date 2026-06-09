// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Ask-a-BCBA Economics — who answers, who pays, and what the BCBA earns.
 *
 * The core question this file answers: "BCBAs aren't going to answer parent
 * questions for free." Correct. Three routing rails, each with honest math:
 *
 * ── Rail 1: PARTNER ORG (preferred — $0 platform payout cost) ──────────────
 *   If the family's profile has pilot_organization set (AACT / Rise Pediatric
 *   Therapies), questions route to the org's OWN BCBA team. The org answers
 *   as part of its care relationship — caregiver support is billable to many
 *   payers (97156 caregiver training adjacent), and the org gets engagement +
 *   retention from its families. Aminy pays nothing; the org agreement covers
 *   it. This is the rail we scale with partners.
 *
 * ── Rail 2: PLATFORM POOL (Pro+ included quota) ────────────────────────────
 *   Pro+ ($49.99/mo) includes ASK_BCBA_PROPLUS_MONTHLY_QUOTA questions/mo
 *   answered by marketplace BCBAs who opt into the answer pool. Aminy pays
 *   BCBA_ANSWER_PAYOUT_CENTS per accepted answer. The AI pre-drafts every
 *   answer (see FeedbackInbox-style draft flow in AskABCBA), so BCBA effort
 *   is review-and-edit ≈ 3–5 min → $12/answer ≈ $144–240/hr effective rate.
 *   Worst-case math: 10 answers × $12 = $120 > $49.99 — which is why the
 *   quota exists alongside observed utilization (~25–35% of quota across
 *   comparable products) and why Rail 1 takes priority whenever available.
 *   Expected blended cost at 30% utilization: 3 × $12 = $36/Pro+ user/mo,
 *   against $49.99 revenue + the fact that Ask-a-BCBA is THE Pro+ upgrade
 *   driver. Margin lives in the upgrade, not the message.
 *
 * ── Rail 3: PAY-PER-QUESTION (no subscription required) ────────────────────
 *   Core/Pro/free users outside their post-session window can buy a single
 *   question: PAY_PER_QUESTION_CENTS. BCBA still gets the standard payout;
 *   Aminy keeps the difference. This monetizes urgency without forcing a
 *   subscription, and is the comparison shopper's answer to AnswersNow.
 *
 * Single source of truth — components must import from here, never hardcode.
 */

export const BCBA_ANSWER_PAYOUT_CENTS = 1200;        // $12 per accepted answer
export const PAY_PER_QUESTION_CENTS = 1900;          // $19 single question (Rail 3)
export const ASK_BCBA_PROPLUS_MONTHLY_QUOTA = 10;    // included with Pro+
export const ASK_BCBA_TARGET_RESPONSE_HOURS = 24;    // SLA shown to parents

/** Platform margin on a pay-per-question purchase (Rail 3). */
export const PAY_PER_QUESTION_PLATFORM_CENTS =
  PAY_PER_QUESTION_CENTS - BCBA_ANSWER_PAYOUT_CENTS; // $7

export type AskBcbaRail = 'partner_org' | 'platform_pool' | 'pay_per_question';

export interface AskBcbaRouting {
  rail: AskBcbaRail;
  /** Org slug when rail is partner_org (e.g. 'aact'). */
  partnerOrg: string | null;
  /** What Aminy pays the answering BCBA for this question. */
  payoutCents: number;
  /** What the parent pays for this question (0 when included). */
  parentPriceCents: number;
  /** Copy shown to the parent about who will answer. */
  answeredByLabel: string;
}

/**
 * Decide how a question routes. Mirrors the access gating in AskABCBA.tsx
 * (Pro+ = always included; Core/Pro = included for 5 days post-session;
 * everyone else = pay-per-question).
 */
export function routeAskBcbaQuestion(input: {
  tier: string;
  pilotOrganization?: string | null;
  withinPostSessionWindow?: boolean;
}): AskBcbaRouting {
  const { tier, pilotOrganization, withinPostSessionWindow } = input;

  // Rail 1 — partner org BCBAs answer their own families. $0 platform cost.
  if (pilotOrganization) {
    return {
      rail: 'partner_org',
      partnerOrg: pilotOrganization,
      payoutCents: 0,
      parentPriceCents: 0,
      answeredByLabel: 'your care team',
    };
  }

  const isProPlus = tier === 'proplus' || tier === 'pro_plus';

  // Rail 2 — included quota (Pro+ always; Core/Pro inside post-session window)
  if (isProPlus || withinPostSessionWindow) {
    return {
      rail: 'platform_pool',
      partnerOrg: null,
      payoutCents: BCBA_ANSWER_PAYOUT_CENTS,
      parentPriceCents: 0,
      answeredByLabel: 'a licensed BCBA',
    };
  }

  // Rail 3 — single question purchase
  return {
    rail: 'pay_per_question',
    partnerOrg: null,
    payoutCents: BCBA_ANSWER_PAYOUT_CENTS,
    parentPriceCents: PAY_PER_QUESTION_CENTS,
    answeredByLabel: 'a licensed BCBA',
  };
}

export function formatAskBcbaPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
