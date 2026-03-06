import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Polyfill scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

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

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return new Proxy({}, {
    get: (_target, prop: string) => icon(prop),
  });
});

vi.mock('../../components/AvailabilityPicker', () => ({
  AvailabilityPicker: () => React.createElement('div', { 'data-testid': 'availability-picker' }, 'AvailabilityPicker'),
}));

vi.mock('../../lib/pricing', () => ({
  SESSION_PRICING: {
    bcba_consult: { price: 149, providerPay: 60 },
    rbt_session: { price: 49, providerPay: 25 },
  },
}));

vi.mock('../../lib/benefits-service', () => ({
  checkEligibility: vi.fn().mockResolvedValue({ eligible: true }),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationalBooking } from '../../components/ConversationalBooking';

describe('ConversationalBooking', () => {
  const defaultProps = {
    childName: 'Alex',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ConversationalBooking {...defaultProps} />);
    expect(screen.getByText('Book a Session')).toBeInTheDocument();
  });

  it('shows the child name in the header', () => {
    render(<ConversationalBooking {...defaultProps} />);
    expect(screen.getByText('for Alex')).toBeInTheDocument();
  });

  it('displays the initial greeting message', () => {
    render(<ConversationalBooking {...defaultProps} />);
    expect(screen.getByText(/I'd love to help you book a session/)).toBeInTheDocument();
  });

  it('shows concern type options', () => {
    render(<ConversationalBooking {...defaultProps} />);
    expect(screen.getByText('Behavior concern')).toBeInTheDocument();
    expect(screen.getByText('Speech & Communication')).toBeInTheDocument();
    expect(screen.getByText('Motor Skills')).toBeInTheDocument();
    expect(screen.getByText('Parent Coaching')).toBeInTheDocument();
    expect(screen.getByText('Something else')).toBeInTheDocument();
  });

  it('shows concern descriptions', () => {
    render(<ConversationalBooking {...defaultProps} />);
    expect(screen.getByText(/Meltdowns, aggression/)).toBeInTheDocument();
  });

  it('renders step indicator dots', () => {
    const { container } = render(<ConversationalBooking {...defaultProps} />);
    const dots = container.querySelectorAll('.rounded-full.w-2.h-2');
    expect(dots.length).toBe(7); // 7 booking steps
  });

  it('renders back button that calls goBack on click', () => {
    render(<ConversationalBooking {...defaultProps} />);
    // First step calls onCancel when going back
    const backButton = screen.getByTestId('icon-ArrowLeft').closest('button');
    expect(backButton).toBeTruthy();
    if (backButton) {
      fireEvent.click(backButton);
      expect(defaultProps.onCancel).toHaveBeenCalled();
    }
  });

  it('renders with assigned provider prop', () => {
    const assignedProvider = {
      id: 'p1',
      name: 'Dr. Chen',
      title: 'BCBA',
      specialty: 'Behavior',
      rating: 4.9,
      reviewCount: 47,
      nextAvailable: 'Tomorrow',
      isAssigned: true,
    };
    render(<ConversationalBooking {...defaultProps} assignedProvider={assignedProvider} />);
    expect(screen.getByText('Book a Session')).toBeInTheDocument();
  });
});
