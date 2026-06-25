import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mock motion/react BEFORE any component imports ──
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target: Record<string, unknown>, prop: string) => {
      return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { children, ...rest } = props;
        const filteredProps: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rest)) {
          if (
            !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap',
              'whileInView', 'variants', 'layout', 'layoutId'].includes(key)
          ) {
            filteredProps[key] = value;
          }
        }
        return React.createElement(prop, { ...filteredProps, ref }, children as React.ReactNode);
      });
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// ── Mock the logo asset ──
vi.mock('../../assets/aminy-logo-cropped.png', () => ({ default: 'mock-logo.png' }));

// ── Mock lucide-react ──
vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return {
    ArrowRight: icon('ArrowRight'),
    Info: icon('Info'),
  };
});

// ── Mock MedicalDisclaimer ──
vi.mock('../../components/MedicalDisclaimer', () => ({
  MedicalDisclaimer: ({ variant, className }: { variant?: string; className?: string }) =>
    React.createElement('p', { 'data-testid': 'medical-disclaimer', 'data-variant': variant, className },
      'Medical disclaimer text'
    ),
}));

import { SplashPage } from '../../components/SplashPage';

describe('SplashPage', () => {
  const defaultProps = {
    onStartTrial: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document title between tests
    document.title = '';
  });

  // ─── Smoke test ───────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    const { container } = render(<SplashPage {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  // ─── Badge text ───────────────────────────────────────────────────────────

  it('contains the "BCBA-designed" text in the top badge', () => {
    render(<SplashPage {...defaultProps} />);
    expect(screen.getByText(/BCBA-designed/i)).toBeInTheDocument();
  });

  it('does NOT contain "TeleABA" anywhere on the page', () => {
    const { container } = render(<SplashPage {...defaultProps} />);
    expect(container.textContent).not.toContain('TeleABA');
  });

  it('top badge contains "Takes insurance" text', () => {
    render(<SplashPage {...defaultProps} />);
    expect(screen.getByText(/Takes insurance/i)).toBeInTheDocument();
  });

  it('top badge contains "AI-powered" text', () => {
    render(<SplashPage {...defaultProps} />);
    expect(screen.getByText(/AI-powered/i)).toBeInTheDocument();
  });

  // ─── Primary CTA ──────────────────────────────────────────────────────────

  it('renders a "Start free" CTA button', () => {
    render(<SplashPage {...defaultProps} />);
    expect(screen.getByText('Start free')).toBeInTheDocument();
  });

  it('calls onStartTrial when "Start free" button is clicked', () => {
    render(<SplashPage {...defaultProps} />);
    fireEvent.click(screen.getByText('Start free'));
    expect(defaultProps.onStartTrial).toHaveBeenCalledTimes(1);
  });

  // ─── Headline ─────────────────────────────────────────────────────────────

  it('renders the main headline', () => {
    render(<SplashPage {...defaultProps} />);
    expect(
      screen.getByText(/The Family OS for neurodivergent care/i)
    ).toBeInTheDocument();
  });

  // ─── Trial note ───────────────────────────────────────────────────────────

  it('shows the free trial note', () => {
    render(<SplashPage {...defaultProps} />);
    expect(screen.getByText(/7-day free trial/i)).toBeInTheDocument();
    expect(screen.getByText(/No credit card required/i)).toBeInTheDocument();
  });

  // ─── Logo ─────────────────────────────────────────────────────────────────

  it('renders the Aminy logo image', () => {
    render(<SplashPage {...defaultProps} />);
    const logo = screen.getByAltText(/Aminy/i);
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'mock-logo.png');
  });

  // ─── Optional nav buttons ─────────────────────────────────────────────────

  it('renders "For providers" nav button when onForProviders is provided', () => {
    render(<SplashPage {...defaultProps} onForProviders={vi.fn()} />);
    expect(screen.getByText('For providers')).toBeInTheDocument();
  });

  it('does not render "For providers" when prop is absent', () => {
    render(<SplashPage {...defaultProps} />);
    expect(screen.queryByText('For providers')).not.toBeInTheDocument();
  });

  it('calls onForProviders when provider nav button is clicked', () => {
    const onForProviders = vi.fn();
    render(<SplashPage {...defaultProps} onForProviders={onForProviders} />);
    fireEvent.click(screen.getByText('For providers'));
    expect(onForProviders).toHaveBeenCalledTimes(1);
  });

  it('renders "Sign in" button when onSignIn is provided', () => {
    render(<SplashPage {...defaultProps} onSignIn={vi.fn()} />);
    // Multiple "sign in" occurrences (nav + body link)
    const signInButtons = screen.getAllByText(/Sign in|Already have an account/i);
    expect(signInButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders "Concerned? Free screening" chip when onFreeScreening is provided', () => {
    render(<SplashPage {...defaultProps} onFreeScreening={vi.fn()} />);
    expect(screen.getByText(/Concerned\? Free screening/i)).toBeInTheDocument();
  });

  it('calls onFreeScreening when that chip is clicked', () => {
    const onFreeScreening = vi.fn();
    render(<SplashPage {...defaultProps} onFreeScreening={onFreeScreening} />);
    fireEvent.click(screen.getByText(/Concerned\? Free screening/i));
    expect(onFreeScreening).toHaveBeenCalledTimes(1);
  });

  // ─── Bottom badges ────────────────────────────────────────────────────────

  it('renders bottom trust badges', () => {
    render(<SplashPage {...defaultProps} />);
    expect(screen.getByText('Built by Parents')).toBeInTheDocument();
    expect(screen.getByText('Backed by ABA Experts')).toBeInTheDocument();
    expect(screen.getByText('HIPAA-Conscious')).toBeInTheDocument();
    expect(screen.getByText('Private by Design')).toBeInTheDocument();
  });

  // ─── Document title ───────────────────────────────────────────────────────

  it('sets the document title on mount', () => {
    render(<SplashPage {...defaultProps} />);
    expect(document.title).toBe('Aminy — AI-Powered ABA Support');
  });

  // ─── Medical disclaimer ───────────────────────────────────────────────────

  it('renders the MedicalDisclaimer component', () => {
    render(<SplashPage {...defaultProps} />);
    expect(screen.getByTestId('medical-disclaimer')).toBeInTheDocument();
  });
});
