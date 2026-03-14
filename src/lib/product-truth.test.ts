import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildPilotAccessContext,
  getSurfaceAccessDecision,
  getSurfaceLaunchConfig,
} from './product-truth';

describe('product truth pilot access', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('marks the marketplace as a supported-state limited launch surface', () => {
    const config = getSurfaceLaunchConfig('marketplace');

    expect(config.state).toBe('limited_launch');
    expect(config.programLabel).toBe('Supported-state telehealth launch');
    expect(config.pathwayLabel).toContain('insurance routing');
  });

  it('blocks marketplace access outside supported provider states', () => {
    const context = buildPilotAccessContext({ state: 'CA', role: 'parent', pilotEligible: false });
    const decision = getSurfaceAccessDecision('marketplace', context);

    expect(decision.allowed).toBe(false);
    expect(decision.gateReason).toBe('limited_launch');
    expect(decision.message).toContain('supported provider states');
  });

  it('allows Montana families into supported-state marketplace access', () => {
    const context = buildPilotAccessContext({ state: 'MT', role: 'parent', pilotEligible: false });
    const decision = getSurfaceAccessDecision('marketplace', context);

    expect(decision.allowed).toBe(true);
    expect(decision.config.badgeLabel).toContain('AZ');
  });

  it('allows Arizona pilot families onto EVV shadow workflows', () => {
    const context = buildPilotAccessContext({ state: 'AZ', role: 'parent', pilotEligible: true });
    const decision = getSurfaceAccessDecision('caregiver-timesheet', context);

    expect(decision.allowed).toBe(true);
    expect(decision.config.evvSystem).toBe('spokchoice');
    expect(decision.config.systemOfRecord).toBe('external');
  });

  it('opens the provider portal for supported-state clinicians without forcing partner-clinic affiliation', () => {
    const allowed = getSurfaceAccessDecision('provider-portal', buildPilotAccessContext({
      state: 'TX',
      role: 'provider',
      pilotEligible: false,
    }));
    const denied = getSurfaceAccessDecision('provider-portal', buildPilotAccessContext({
      state: 'CA',
      role: 'provider',
      pilotEligible: false,
    }));

    expect(allowed.allowed).toBe(true);
    expect(allowed.config.programLabel).toBe('Supported-state provider network');
    expect(denied.allowed).toBe(false);
  });

  it('opens the claims dashboard for supported-state payer workflows without forcing Arizona-only payer tags', () => {
    const context = buildPilotAccessContext({ state: 'TX', role: 'parent' });
    const decision = getSurfaceAccessDecision('claims-dashboard', context);

    expect(decision.allowed).toBe(true);
    expect(decision.config.programLabel).toBe('Supported-state payer launch');
  });

  it('lets explicit stored pilot context override a default parent profile for Arizona operator surfaces', () => {
    window.localStorage.setItem('aminy-pilot-context', JSON.stringify({
      role: 'admin',
      state: 'AZ',
      organization: 'aact',
      pilotEligible: true,
    }));

    const context = buildPilotAccessContext({ state: 'AZ', role: 'parent', pilotEligible: false });
    const decision = getSurfaceAccessDecision('payer-dashboard', context);

    expect(context.role).toBe('admin');
    expect(context.organization).toBe('aact');
    expect(context.isPilotUser).toBe(true);
    expect(decision.allowed).toBe(true);
  });

  it('blocks telehealth booking outside supported provider states', () => {
    const decision = getSurfaceAccessDecision('telehealth', buildPilotAccessContext({ state: 'CA', role: 'parent' }));

    expect(decision.allowed).toBe(false);
    expect(decision.gateReason).toBe('limited_launch');
  });
});
