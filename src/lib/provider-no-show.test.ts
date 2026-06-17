import { describe, it, expect } from 'vitest';
import {
  getProviderReliabilityTier,
  getReliabilityConsequence,
  shouldAutoOfferReassignment,
  isProviderNoShowEligible,
  buildFamilyApologyMessage,
  buildProviderNoShowNotice,
  PROVIDER_JOIN_GRACE_MINUTES,
  PROVIDER_RESPONSE_WINDOW_MINUTES,
} from './provider-no-show';

describe('provider reliability tiers (rolling 90-day no-show count)', () => {
  it('maps counts to the right tier', () => {
    expect(getProviderReliabilityTier(0)).toBe('good_standing');
    expect(getProviderReliabilityTier(1)).toBe('warning');
    expect(getProviderReliabilityTier(2)).toBe('probation');
    expect(getProviderReliabilityTier(3)).toBe('suspended');
    expect(getProviderReliabilityTier(9)).toBe('suspended');
  });

  it('only suspended providers are removed from matching', () => {
    expect(getReliabilityConsequence('good_standing').matchable).toBe(true);
    expect(getReliabilityConsequence('warning').matchable).toBe(true);
    expect(getReliabilityConsequence('probation').matchable).toBe(true);
    expect(getReliabilityConsequence('suspended').matchable).toBe(false);
  });

  it('probation deprioritizes the provider but keeps them matchable', () => {
    const probation = getReliabilityConsequence('probation');
    expect(probation.deprioritized).toBe(true);
    expect(probation.matchable).toBe(true);
  });
});

describe('no-show eligibility (join grace window)', () => {
  const start = '2026-06-17T15:00:00.000Z';

  it('is not eligible before the grace window elapses', () => {
    const now = new Date(Date.parse(start) + (PROVIDER_JOIN_GRACE_MINUTES - 1) * 60000).toISOString();
    expect(isProviderNoShowEligible({ scheduledStartIso: start, nowIso: now })).toBe(false);
  });

  it('is eligible once the grace window elapses', () => {
    const now = new Date(Date.parse(start) + PROVIDER_JOIN_GRACE_MINUTES * 60000).toISOString();
    expect(isProviderNoShowEligible({ scheduledStartIso: start, nowIso: now })).toBe(true);
  });

  it('a provider who joined can never no-show', () => {
    const now = new Date(Date.parse(start) + 60 * 60000).toISOString();
    expect(
      isProviderNoShowEligible({ scheduledStartIso: start, providerJoinedAt: start, nowIso: now }),
    ).toBe(false);
  });
});

describe('auto-reassign decision (provider response window)', () => {
  const declared = '2026-06-17T15:10:00.000Z';

  it('does not auto-offer while the provider still has time to respond', () => {
    const now = new Date(Date.parse(declared) + (PROVIDER_RESPONSE_WINDOW_MINUTES - 1) * 60000).toISOString();
    expect(shouldAutoOfferReassignment({ declaredAtIso: declared, providerResponded: false, nowIso: now })).toBe(false);
  });

  it('auto-offers reassignment once the window elapses with no response', () => {
    const now = new Date(Date.parse(declared) + PROVIDER_RESPONSE_WINDOW_MINUTES * 60000).toISOString();
    expect(shouldAutoOfferReassignment({ declaredAtIso: declared, providerResponded: false, nowIso: now })).toBe(true);
  });

  it('never auto-offers if the provider already responded', () => {
    const now = new Date(Date.parse(declared) + 999 * 60000).toISOString();
    expect(shouldAutoOfferReassignment({ declaredAtIso: declared, providerResponded: true, nowIso: now })).toBe(false);
  });
});

describe('family apology copy', () => {
  it('is warm, states no charge, copies the provider, and offers both recovery paths', () => {
    const { subject, body, providerCcLine } = buildFamilyApologyMessage({
      familyFirstName: 'Maria',
      childName: 'Liam',
      providerName: 'Dr. Sarah Lee',
      serviceLabel: 'ABA consult',
    });
    expect(subject.toLowerCase()).toContain('sorry');
    expect(body).toContain('Maria');
    expect(body).toContain('Liam');
    expect(body).toContain('Dr. Sarah Lee');
    expect(body).toContain('will not be charged');
    expect(body).toContain('Reschedule');
    expect(body.toLowerCase()).toContain('match me with someone new');
    expect(providerCcLine.toLowerCase()).toContain('cc:');
  });

  it('degrades gracefully with no names supplied', () => {
    const { body } = buildFamilyApologyMessage({});
    expect(body).toContain('your provider');
    expect(body).toContain('will not be charged');
  });
});

describe('provider accountability notice escalates with tier', () => {
  it('first no-show is a soft warning', () => {
    const { subject } = buildProviderNoShowNotice({ rollingNoShowCount: 1 });
    expect(subject.toLowerCase()).toContain('missed');
  });

  it('third no-show pauses matching', () => {
    const { subject, body } = buildProviderNoShowNotice({ rollingNoShowCount: 3 });
    expect(subject.toLowerCase()).toContain('paused');
    expect(body.toLowerCase()).toContain('removed from new-family matching');
  });
});
