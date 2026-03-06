import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
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

vi.mock('../../components/ui/card', () => ({
  Card: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-testid': 'card', ...props }, children),
}));

vi.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}));

vi.mock('../../components/ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('input', props),
}));

vi.mock('../../components/ui/progress', () => ({
  Progress: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'progress', role: 'progressbar', ...props }),
}));

vi.mock('../../lib/haptics', () => ({
  triggerHaptic: vi.fn(),
}));

vi.mock('../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock child components used by OnboardingEnhanced
vi.mock('../../components/ChildMentalHealthScreen', () => ({
  ChildMentalHealthScreen: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'child-mental-health' }, 'ChildMentalHealthScreen'),
}));

vi.mock('../../components/ParentCapacityCheck', () => ({
  ParentCapacityCheck: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'parent-capacity-check' }, 'ParentCapacityCheck'),
}));

vi.mock('../../components/OnboardingWowMoments', () => ({
  DiagnosisValidation: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'diagnosis-validation' }, 'DiagnosisValidation'),
  FocusAreaValidation: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'focus-area-validation' }, 'FocusAreaValidation'),
  InsightSummaryWow: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'insight-summary-wow' }, 'InsightSummaryWow'),
  ResourcesTeaser: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'resources-teaser' }, 'ResourcesTeaser'),
  PlanGenerationProgress: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'plan-generation-progress' }, 'PlanGenerationProgress'),
  OnboardingComplete: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'onboarding-complete' }, 'OnboardingComplete'),
  EmpathyMoment: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'empathy-moment' }, 'EmpathyMoment'),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OnboardingEnhanced } from '../../components/OnboardingEnhanced';

describe('OnboardingEnhanced', () => {
  const defaultProps = {
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders without crashing', () => {
    render(<OnboardingEnhanced {...defaultProps} />);
    expect(screen.getByText("You're not alone anymore")).toBeInTheDocument();
  });

  it('renders the What to Expect step initially', () => {
    render(<OnboardingEnhanced {...defaultProps} />);
    expect(screen.getByText("What you'll get today:")).toBeInTheDocument();
  });

  it('shows social proof with family count', () => {
    render(<OnboardingEnhanced {...defaultProps} />);
    expect(screen.getByText('10,000+ families')).toBeInTheDocument();
  });

  it('shows the main CTA button', () => {
    render(<OnboardingEnhanced {...defaultProps} />);
    expect(screen.getByText("Let's make life easier together")).toBeInTheDocument();
  });

  it('shows the watch demo option', () => {
    render(<OnboardingEnhanced {...defaultProps} />);
    expect(screen.getByText('Watch how it works first')).toBeInTheDocument();
  });

  it('shows time estimate text', () => {
    render(<OnboardingEnhanced {...defaultProps} />);
    expect(screen.getByText(/Takes about 5 minutes/)).toBeInTheDocument();
  });

  it('shows the four value propositions', () => {
    render(<OnboardingEnhanced {...defaultProps} />);
    expect(screen.getByText('One actionable tip you can try TODAY')).toBeInTheDocument();
    expect(screen.getByText('Personalized daily activities for your child')).toBeInTheDocument();
  });

  it('renders the progress bar area', () => {
    render(<OnboardingEnhanced {...defaultProps} />);
    // The main container should be present
    expect(document.querySelector('[data-testid="progress"]') || document.querySelector('[role="progressbar"]')).toBeTruthy();
  });
});
