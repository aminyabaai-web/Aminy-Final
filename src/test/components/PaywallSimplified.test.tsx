import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock motion/react BEFORE component imports
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target: Record<string, unknown>, prop: string) => {
      return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { children, ...rest } = props;
        const filteredProps: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rest)) {
          if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'whileInView', 'variants', 'layout', 'layoutId'].includes(key)) {
            filteredProps[key] = value;
          }
        }
        return React.createElement(prop, { ...filteredProps, ref }, children as React.ReactNode);
      });
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

// Mock supabase
vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  return new Proxy({}, {
    get: (_target, prop: string) => {
      if (!cache.has(prop)) {
        cache.set(prop, function MockIcon(props: Record<string, unknown>) {
          return React.createElement('svg', { 'data-testid': `icon-${prop}`, ...props });
        });
      }
      return cache.get(prop);
    },
  });
});

// Mock UI components
vi.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}));

vi.mock('../../components/ui/card', () => ({
  Card: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-testid': 'card', ...props }, children),
}));

// Mock stripe-service
vi.mock('../../lib/stripe-service', () => ({
  createCheckoutSession: vi.fn().mockResolvedValue(null),
  isStripeConfigured: vi.fn().mockReturnValue(false),
  STRIPE_PUBLISHABLE_KEY: '',
  STRIPE_PRICES: {},
  TIER_PRICING: {},
}));

// Mock billing-engine
vi.mock('../../lib/billing-engine', () => ({
  billingEngine: {
    validatePromoCode: vi.fn().mockResolvedValue({ valid: false, error: 'Invalid code' }),
    PRICING_TIERS: [],
    PROMO_CODES: [],
  },
}));

// Mock supabase/info (imported by stripe-service)
vi.mock('../../utils/supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'test-key',
}));

import { PaywallSimplified } from '../../components/PaywallSimplified';

describe('PaywallSimplified', () => {
  const mockOnSubscribe = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PaywallSimplified onSubscribe={mockOnSubscribe} />);
    expect(screen.getByText(/Continue Supporting/i)).toBeInTheDocument();
  });

  it('displays pricing tier names (Core, Pro, Family Plan)', () => {
    render(<PaywallSimplified onSubscribe={mockOnSubscribe} />);

    expect(screen.getByText('Core')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Family Plan')).toBeInTheDocument();
  });

  it('shows pricing amounts for each tier', () => {
    render(<PaywallSimplified onSubscribe={mockOnSubscribe} />);

    expect(screen.getByText('$14.99')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('calls onSubscribe when a tier subscribe button is clicked', async () => {
    render(<PaywallSimplified onSubscribe={mockOnSubscribe} />);

    // There are multiple "Start Free Trial" buttons -- one per paid tier
    const trialButtons = screen.getAllByText('Start Free Trial');
    expect(trialButtons.length).toBeGreaterThanOrEqual(3);

    // Click the first button (Core tier)
    fireEvent.click(trialButtons[0]);

    // handleSubscribe is async; wait for it to resolve
    await vi.waitFor(() => {
      expect(mockOnSubscribe).toHaveBeenCalledWith('core');
    });
  });

  it('uses childName prop in the displayed heading', () => {
    render(
      <PaywallSimplified onSubscribe={mockOnSubscribe} childName="Alex" />
    );

    expect(screen.getByText(/Continue Supporting Alex/i)).toBeInTheDocument();
  });

  it('renders close button when onClose prop is provided', () => {
    render(
      <PaywallSimplified onSubscribe={mockOnSubscribe} onClose={mockOnClose} />
    );

    // The close button contains the X icon
    const xIcon = screen.getByTestId('icon-X');
    expect(xIcon).toBeInTheDocument();

    // Click the close button (parent of the X icon)
    const closeButton = xIcon.closest('button');
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton!);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not render close button when onClose is not provided', () => {
    render(<PaywallSimplified onSubscribe={mockOnSubscribe} />);

    expect(screen.queryByTestId('icon-X')).not.toBeInTheDocument();
  });

  it('renders without crashing when only required props are given', () => {
    const { container } = render(
      <PaywallSimplified onSubscribe={mockOnSubscribe} />
    );

    // Should use default childName "your child"
    expect(screen.getByText(/Continue Supporting your child/i)).toBeInTheDocument();

    // Should render the overall wrapper
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows Free tier in the comparison table', () => {
    render(<PaywallSimplified onSubscribe={mockOnSubscribe} />);

    // Click "Compare all plans" to show the comparison table
    const compareButton = screen.getByText('Compare all plans');
    fireEvent.click(compareButton);

    // The table header should show "Free"
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('displays the comparison table with tier feature details', () => {
    render(<PaywallSimplified onSubscribe={mockOnSubscribe} />);

    // Click to expand comparison
    fireEvent.click(screen.getByText('Compare all plans'));

    // Check that feature rows appear
    expect(screen.getByText('AI Conversations')).toBeInTheDocument();
    expect(screen.getByText('Memory & Context')).toBeInTheDocument();
    expect(screen.getByText('Telehealth Discount')).toBeInTheDocument();
    expect(screen.getByText('Children Supported')).toBeInTheDocument();
  });

  it('shows truthful live-data messaging instead of testimonials', () => {
    render(<PaywallSimplified onSubscribe={mockOnSubscribe} />);

    expect(screen.getByText('Verified family metrics pending')).toBeInTheDocument();
    expect(screen.getByText(/We only show community proof after it comes from verified live data/i)).toBeInTheDocument();
  });
});
