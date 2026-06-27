import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mock the rate-limit store before importing the component ──
const mockFetchUsage = vi.fn().mockResolvedValue(undefined);
let mockDailyUsage: { used: number; limit: number; remaining: number; resetsAt: string } | null = null;

vi.mock('../../lib/rate-limit-store', async () => {
  const actual = await vi.importActual<typeof import('../../lib/rate-limit-store')>(
    '../../lib/rate-limit-store'
  );
  return {
    ...actual,
    useRateLimitStore: () => ({ dailyUsage: mockDailyUsage, fetchUsage: mockFetchUsage }),
  };
});

vi.mock('../../lib/mobile-experience-enhancer', () => ({
  HAPTICS: { light: vi.fn(), success: vi.fn() },
}));

import { UsageUpgradeTrigger } from '../../components/UsageUpgradeTrigger';

const FUTURE = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

describe('UsageUpgradeTrigger', () => {
  beforeEach(() => {
    mockDailyUsage = null;
    mockFetchUsage.mockClear();
    localStorage.clear();
  });

  it('renders nothing for unlimited (paid) users', () => {
    mockDailyUsage = { used: 5, limit: 999999, remaining: 999994, resetsAt: FUTURE };
    const { container } = render(<UsageUpgradeTrigger onUpgrade={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the free user has messages to spare', () => {
    mockDailyUsage = { used: 0, limit: 3, remaining: 3, resetsAt: FUTURE };
    const { container } = render(<UsageUpgradeTrigger onUpgrade={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the running-low banner with the remaining count', () => {
    mockDailyUsage = { used: 2, limit: 3, remaining: 1, resetsAt: FUTURE };
    render(<UsageUpgradeTrigger onUpgrade={() => {}} />);
    expect(screen.getByText(/1 free message left today/i)).toBeInTheDocument();
  });

  it('shows the at-limit prompt and fires onUpgrade on CTA tap', () => {
    mockDailyUsage = { used: 3, limit: 3, remaining: 0, resetsAt: FUTURE };
    const onUpgrade = vi.fn();
    render(<UsageUpgradeTrigger onUpgrade={onUpgrade} />);
    expect(screen.getByText(/used today's free messages/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Upgrade to Core/i }));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('hides after dismiss and refreshes usage on mount', () => {
    mockDailyUsage = { used: 3, limit: 3, remaining: 0, resetsAt: FUTURE };
    render(<UsageUpgradeTrigger onUpgrade={() => {}} />);
    expect(mockFetchUsage).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }));
    expect(screen.queryByText(/used today's free messages/i)).not.toBeInTheDocument();
  });
});
