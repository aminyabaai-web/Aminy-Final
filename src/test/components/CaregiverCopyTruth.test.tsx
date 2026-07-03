import React from 'react';
import { describe, it, expect, vi } from 'vitest';

// ============================================================
// Caregiver copy TRUTH GUARD (drift test)
//
// The Family & Care Team surfaces claim: "Co-parents are included
// with every paid plan at no extra cost". This test pins that claim
// to the actual seat model so the copy can never drift into an
// untrue marketing claim (e.g. "free on every plan").
// ============================================================

vi.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}));
vi.mock('../../components/ui/card', () => ({
  Card: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-testid': 'card', ...props }, children),
}));
vi.mock('../../components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', { 'data-testid': 'badge', ...props }, children),
}));
vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  const cache = new Map<string, ReturnType<typeof icon>>();
  return new Proxy(
    {},
    {
      has: () => true,
      get: (_t, prop) => {
        if (prop === '__esModule') return true;
        if (typeof prop !== 'string' || prop === 'default' || prop === 'then') return undefined;
        if (!cache.has(prop)) cache.set(prop, icon(prop));
        return cache.get(prop);
      },
    },
  );
});

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ManageCaregivers,
  MAX_CAREGIVERS,
  COPARENT_REASSURANCE,
} from '../../components/ManageCaregivers';
import { hasTierFeature, type TierType } from '../../lib/tier-utils';

const PAID_TIERS: TierType[] = ['starter', 'core', 'pro', 'proplus'];

describe('co-parent copy matches the seat-limit truth', () => {
  it('free tier is owner-only, so the copy must NOT claim co-parents on every plan', () => {
    // If you ever grant free-tier co-parent seats, update COPARENT_REASSURANCE
    // (and the Dashboard10 partner card) to say "every plan" — then fix this.
    expect(MAX_CAREGIVERS.free).toBe(1);
    expect(COPARENT_REASSURANCE).toContain('every paid plan');
    expect(COPARENT_REASSURANCE).not.toMatch(/free on every plan/i);
    expect(COPARENT_REASSURANCE).not.toMatch(/included with every plan/i);
  });

  it('every paid tier really does include at least one extra caregiver seat', () => {
    for (const tier of PAID_TIERS) {
      // owner + >=1 invited caregiver — otherwise "included with every paid
      // plan" would be an untrue claim.
      expect(MAX_CAREGIVERS[tier], `tier "${tier}" must allow owner + 1`).toBeGreaterThanOrEqual(2);
    }
  });

  it('tier-utils agrees: multi-caregiver is a paid-side feature, never free', () => {
    expect(hasTierFeature('free', 'multi-caregiver')).toBe(false);
    // The dedicated multi-caregiver feature lives on the Family Plan
    expect(hasTierFeature('proplus', 'multi-caregiver')).toBe(true);
  });

  it('renders the reassurance line on the Family & Care Team surface', () => {
    render(<ManageCaregivers tier="core" />);
    expect(screen.getByText('Family & Care Team')).toBeInTheDocument();
    expect(screen.getByText(COPARENT_REASSURANCE)).toBeInTheDocument();
  });

  it('defaults the first invite to the co-parent role', () => {
    render(<ManageCaregivers tier="core" />);
    // Open the invite modal
    fireEvent.click(screen.getByText('Invite by Email'));
    const coParentRadio = screen.getByRole('radio', { name: /Co-parent/i });
    expect(coParentRadio).toBeChecked();
  });
});
