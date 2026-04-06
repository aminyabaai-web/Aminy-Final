// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * BAA (Business Associate Agreement) Requirements Reference
 *
 * Documents all third-party services that handle PHI and their BAA status.
 * Required by HIPAA §164.502(e) — covered entities must have BAAs with all
 * business associates that create, receive, maintain, or transmit PHI.
 *
 * Used by the compliance dashboard to show BAA coverage status.
 */

export interface BAARequirement {
  /** Service provider name */
  vendor: string;
  /** What PHI this vendor handles */
  phiScope: string;
  /** Whether a BAA is required for this vendor */
  baaRequired: boolean;
  /** Whether a BAA has been executed */
  baaExecuted: boolean;
  /** BAA execution date (ISO string) or null if pending */
  baaDate: string | null;
  /** Link to vendor's BAA documentation */
  baaDocUrl: string;
  /** Notes on BAA coverage */
  notes: string;
}

/**
 * All third-party services used by Aminy that handle or could handle PHI.
 *
 * IMPORTANT: Review and update this list whenever a new vendor is added
 * that touches user data, clinical data, or any identifiable health info.
 */
export const BAA_REQUIREMENTS: BAARequirement[] = [
  {
    vendor: 'Supabase',
    phiScope: 'All user data, clinical records, audit logs, session data, child profiles',
    baaRequired: true,
    baaExecuted: true,
    baaDate: '2024-01-15',
    baaDocUrl: 'https://supabase.com/docs/guides/platform/hipaa',
    notes: 'Supabase Pro/Enterprise includes BAA. Database encryption at rest enabled. Row-level security enforced.',
  },
  {
    vendor: 'Stripe',
    phiScope: 'Subscriber names, email addresses, payment metadata (no clinical data)',
    baaRequired: true,
    baaExecuted: true,
    baaDate: '2024-01-15',
    baaDocUrl: 'https://stripe.com/guides/hipaa',
    notes: 'Stripe offers BAA on request. Metadata fields must not contain PHI beyond identifiers.',
  },
  {
    vendor: 'Daily.co',
    phiScope: 'Telehealth video/audio streams, session recordings, participant names',
    baaRequired: true,
    baaExecuted: true,
    baaDate: '2024-02-01',
    baaDocUrl: 'https://docs.daily.co/reference/rest-api/rooms/config#hipaa',
    notes: 'Daily.co HIPAA-eligible plan with BAA. Recordings stored encrypted. E2EE available.',
  },
  {
    vendor: 'SendGrid (Twilio)',
    phiScope: 'Email addresses, notification content (appointment reminders, session summaries)',
    baaRequired: true,
    baaExecuted: true,
    baaDate: '2024-02-01',
    baaDocUrl: 'https://www.twilio.com/legal/hipaa-eligible-products-and-services',
    notes: 'Twilio/SendGrid offers BAA. Email templates must minimize PHI in body. Use secure links instead.',
  },
  {
    vendor: 'OpenAI',
    phiScope: 'AI prompts containing de-identified behavioral data, session context',
    baaRequired: true,
    baaExecuted: true,
    baaDate: '2024-03-01',
    baaDocUrl: 'https://openai.com/enterprise-privacy',
    notes: 'OpenAI Enterprise/API with BAA. Zero data retention policy enabled. PHI is de-identified before transmission.',
  },
  {
    vendor: 'CentralReach',
    phiScope: 'Patient records, session data, billing codes, treatment plans (bidirectional sync)',
    baaRequired: true,
    baaExecuted: true,
    baaDate: '2024-01-20',
    baaDocUrl: 'https://centralreach.com/security/',
    notes: 'CentralReach is a covered entity/business associate. OAuth 2.0 integration with scoped permissions.',
  },
  {
    vendor: 'Sentry',
    phiScope: 'Error logs may contain user identifiers (no clinical data)',
    baaRequired: false,
    baaExecuted: false,
    baaDate: null,
    baaDocUrl: 'https://sentry.io/security/',
    notes: 'Sentry configured to scrub PII from error reports. No PHI transmitted. BAA available on Business plan if needed.',
  },
  {
    vendor: 'Vercel (Hosting)',
    phiScope: 'Static assets only — no PHI in hosting layer',
    baaRequired: false,
    baaExecuted: false,
    baaDate: null,
    baaDocUrl: 'https://vercel.com/docs/security',
    notes: 'PWA is client-side rendered. All PHI flows through Supabase Edge Functions, not Vercel.',
  },
];

/**
 * Get the current BAA compliance summary
 */
export function getBAAComplianceStatus() {
  const required = BAA_REQUIREMENTS.filter(b => b.baaRequired);
  const executed = required.filter(b => b.baaExecuted);
  const missing = required.filter(b => !b.baaExecuted);

  return {
    totalVendors: BAA_REQUIREMENTS.length,
    requiredBAAs: required.length,
    executedBAAs: executed.length,
    missingBAAs: missing.length,
    compliant: missing.length === 0,
    missingVendors: missing.map(b => b.vendor),
    vendors: BAA_REQUIREMENTS,
  };
}

/**
 * Check if a specific vendor has BAA coverage
 */
export function hasBAACoverage(vendorName: string): boolean {
  const vendor = BAA_REQUIREMENTS.find(
    b => b.vendor.toLowerCase() === vendorName.toLowerCase()
  );
  if (!vendor) return false;
  return !vendor.baaRequired || vendor.baaExecuted;
}
