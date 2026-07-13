// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// Tests for GiftAndSponsorScreen (screen 'gift-sponsor'):
//   1. Renders both sections — "Gift Aminy" and "Sponsor a family".
//   2. The 4 live Stripe links are wired to their buttons and open externally.
//   3. The footer "Have a gift code?" link calls onRedeem (→ 'redeem-gift').
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture URLs passed to the platform-safe open helper. On web the component
// calls window.open('_blank'); on native it delegates to openSubscriptionCheckout.
// We force the web path (isNativeShell → false) and assert window.open URLs.
vi.mock('../../lib/platform-purchase', () => ({
  isNativeShell: vi.fn(() => false),
  openSubscriptionCheckout: vi.fn(),
}));

vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_t: Record<string, unknown>, prop: string) =>
      React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { children, ...rest } = props;
        const filtered: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rest)) {
          if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'whileInView', 'variants', 'layout', 'layoutId'].includes(key)) {
            filtered[key] = value;
          }
        }
        return React.createElement(prop, { ...filtered, ref }, children as React.ReactNode);
      }),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const mocked: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) {
    mocked[key] = (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': `icon-${key}`, ...props });
  }
  return mocked;
});

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GiftAndSponsorScreen, GIFT_SPONSOR_LINKS } from '../../components/GiftAndSponsorScreen';

describe('GiftAndSponsorScreen', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('renders both the Gift Aminy and Sponsor a family sections', () => {
    render(<GiftAndSponsorScreen onBack={vi.fn()} onRedeem={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /^Gift Aminy$/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sponsor a family/ })).toBeInTheDocument();
    // Mission framing present
    expect(screen.getByText(/distributed through our\s*partner clinics/i)).toBeInTheDocument();
    // Gift framing present
    expect(screen.getByText(/we.ll email you a gift code to share/i)).toBeInTheDocument();
  });

  it('opens the correct live Stripe link for each of the 4 options in a new tab', () => {
    render(<GiftAndSponsorScreen onBack={vi.fn()} onRedeem={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Gift Core/i }));
    fireEvent.click(screen.getByRole('button', { name: /Gift Pro/i }));
    fireEvent.click(screen.getByRole('button', { name: /1 month/i }));
    fireEvent.click(screen.getByRole('button', { name: /3 months/i }));

    const openedUrls = openSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(openedUrls).toContain(GIFT_SPONSOR_LINKS.giftCore3mo);
    expect(openedUrls).toContain(GIFT_SPONSOR_LINKS.giftPro3mo);
    expect(openedUrls).toContain(GIFT_SPONSOR_LINKS.sponsor1mo);
    expect(openedUrls).toContain(GIFT_SPONSOR_LINKS.sponsor3mo);
    // Every open is a new tab (external)
    for (const call of openSpy.mock.calls) {
      expect(call[1]).toBe('_blank');
    }
  });

  it('exposes all 4 expected Stripe URLs', () => {
    expect(GIFT_SPONSOR_LINKS.giftCore3mo).toBe('https://buy.stripe.com/4gM9AVb8icZbcRaa8deIw00');
    expect(GIFT_SPONSOR_LINKS.giftPro3mo).toBe('https://buy.stripe.com/7sYcN71xIbV72cw0xDeIw01');
    expect(GIFT_SPONSOR_LINKS.sponsor1mo).toBe('https://donate.stripe.com/fZudRb4JUbV74kEfsxeIw02');
    expect(GIFT_SPONSOR_LINKS.sponsor3mo).toBe('https://donate.stripe.com/28E3cxa4e2kxcRa805eIw03');
  });

  it('the footer redeem link navigates to the redeem-gift screen', () => {
    const onRedeem = vi.fn();
    render(<GiftAndSponsorScreen onBack={vi.fn()} onRedeem={onRedeem} />);

    fireEvent.click(screen.getByRole('button', { name: /Have a gift code\? Redeem it/i }));
    expect(onRedeem).toHaveBeenCalledTimes(1);
  });

  it('the back button calls onBack', () => {
    const onBack = vi.fn();
    render(<GiftAndSponsorScreen onBack={onBack} onRedeem={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Go back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
