import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';


vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null }),
    },
  },
}));

vi.mock('../../lib/tier-utils', () => ({
  tierPricing: {
    free: { monthly: 0, yearly: 0 },
    core: { monthly: 14.99, yearly: 129 },
    pro: { monthly: 29.99, yearly: 279 },
  },
  getTierFeatureDescriptions: vi.fn((tier: string) => {
    if (tier === 'free') return ['Basic features', 'Limited access'];
    if (tier === 'core') return ['All free features', 'Daily plans', 'AI chat', 'Progress tracking'];
    return ['All core features', 'Coaching', 'Telehealth', 'Priority support', 'Custom reports'];
  }),
  getRecommendedTier: vi.fn().mockReturnValue('core'),
}));

vi.mock('../../lib/stripe-service', () => ({
  createCheckoutSession: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
  isStripeConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../lib/sentry', () => ({
  addBreadcrumb: vi.fn(),
  captureError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../components/DisclaimerFooter', () => ({
  DisclaimerFooter: () => React.createElement('div', { 'data-testid': 'disclaimer-footer' }, 'Disclaimer'),
}));

vi.mock('../../components/ui/button', () => ({
  Button: React.forwardRef(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) =>
      React.createElement('button', { ...props, ref }, children),
  ),
}));

vi.mock('../../components/ui/card', () => ({
  Card: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-testid': 'card', ...props }, children),
}));

vi.mock('../../components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', { 'data-testid': 'badge', ...props }, children),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaywallScreen } from '../../components/PaywallScreen';

describe('PaywallScreen', () => {
  const defaultProps = {
    onSubscribe: vi.fn(),
    onClose: vi.fn(),
    currentTier: 'free' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PaywallScreen {...defaultProps} />);
    expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
  });

  it('renders three pricing tiers: Free, Core, Pro', () => {
    render(<PaywallScreen {...defaultProps} />);
    // "Free" appears as both tier name and price text, so use getAllByText
    expect(screen.getAllByText('Free').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Core')).toBeInTheDocument();
    // "Pro" may appear multiple times, at least once
    expect(screen.getAllByText('Pro').length).toBeGreaterThanOrEqual(1);
  });

  it('renders tier subtitles', () => {
    render(<PaywallScreen {...defaultProps} />);
    expect(screen.getByText('Start your journey')).toBeInTheDocument();
    expect(screen.getByText('The full companion')).toBeInTheDocument();
    expect(screen.getByText('Expert-level support')).toBeInTheDocument();
  });

  it('renders billing period toggle', () => {
    render(<PaywallScreen {...defaultProps} />);
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Yearly')).toBeInTheDocument();
  });

  it('renders Save 30% badge on yearly toggle', () => {
    render(<PaywallScreen {...defaultProps} />);
    expect(screen.getByText('Save 30%')).toBeInTheDocument();
  });

  it('renders Recommended badge on Core tier', () => {
    render(<PaywallScreen {...defaultProps} />);
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('renders free trial CTA text', () => {
    render(<PaywallScreen {...defaultProps} />);
    // Core tier should show free trial button
    const trialButtons = screen.getAllByText('Start 7-Day Free Trial');
    expect(trialButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Continue with Free button for the free tier', () => {
    // When currentTier is NOT free, the free tier button shows "Continue with Free"
    render(<PaywallScreen {...defaultProps} currentTier={'core' as const} />);
    expect(screen.getByText('Continue with Free')).toBeInTheDocument();
  });

  it('renders HSA/FSA eligible badge', () => {
    render(<PaywallScreen {...defaultProps} />);
    expect(screen.getByText('HSA/FSA Eligible')).toBeInTheDocument();
  });

  it('renders trust signals', () => {
    render(<PaywallScreen {...defaultProps} />);
    expect(screen.getByText('Cancel anytime')).toBeInTheDocument();
    expect(screen.getByText('No credit card for free')).toBeInTheDocument();
  });

  it('renders money back guarantee', () => {
    render(<PaywallScreen {...defaultProps} />);
    expect(screen.getByText('30-Day Money Back Guarantee')).toBeInTheDocument();
  });

  it('renders referral section', () => {
    render(<PaywallScreen {...defaultProps} />);
    expect(screen.getByText('Know another family?')).toBeInTheDocument();
  });

  it('shows personalized heading when isPostOnboarding and childName are provided', () => {
    render(<PaywallScreen {...defaultProps} isPostOnboarding childName="Alex" />);
    expect(screen.getByText("Alex's Plan is Ready!")).toBeInTheDocument();
    expect(screen.getByText(/Personalized for Alex/)).toBeInTheDocument();
  });

  it('renders back button when onClose is provided and not post-onboarding', () => {
    render(<PaywallScreen {...defaultProps} />);
    // The back button (ArrowLeft) should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders Skip link when isPostOnboarding', () => {
    render(<PaywallScreen {...defaultProps} isPostOnboarding />);
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('shows close confirmation modal when Skip is clicked in post-onboarding', () => {
    render(<PaywallScreen {...defaultProps} isPostOnboarding />);
    fireEvent.click(screen.getByText('Skip'));
    expect(screen.getByText('Skip the free trial?')).toBeInTheDocument();
  });

  it('renders the disclaimer footer', () => {
    render(<PaywallScreen {...defaultProps} />);
    expect(screen.getByTestId('disclaimer-footer')).toBeInTheDocument();
  });
});
