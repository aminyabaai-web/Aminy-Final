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


vi.mock('../../lib/haptics', () => ({
  triggerHaptic: vi.fn(),
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

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChildMentalHealthScreen } from '../../components/ChildMentalHealthScreen';

describe('ChildMentalHealthScreen', () => {
  const defaultProps = {
    childName: 'Alex',
    childAge: 5,
    onComplete: vi.fn(),
    onBack: vi.fn(),
    onSkip: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChildMentalHealthScreen {...defaultProps} />);
    // First question for young children (ages 2-6)
    expect(screen.getByText(/seemed more sad, tearful, or withdrawn/)).toBeInTheDocument();
  });

  it('shows question counter', () => {
    render(<ChildMentalHealthScreen {...defaultProps} />);
    expect(screen.getByText(/1 of/)).toBeInTheDocument();
  });

  it('renders intro text on first question with child name', () => {
    render(<ChildMentalHealthScreen {...defaultProps} />);
    expect(screen.getByText(/Understanding Alex's emotional world/)).toBeInTheDocument();
  });

  it('renders Skip button when onSkip is provided', () => {
    render(<ChildMentalHealthScreen {...defaultProps} />);
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('calls onSkip when Skip is clicked', () => {
    render(<ChildMentalHealthScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Skip'));
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back is clicked on first question', () => {
    render(<ChildMentalHealthScreen {...defaultProps} />);
    // Back button is the ChevronLeft icon button
    const backButtons = screen.getAllByRole('button');
    // First button-like element should be the back/chevron-left
    fireEvent.click(backButtons[0]);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('renders answer options for the current question', () => {
    render(<ChildMentalHealthScreen {...defaultProps} />);
    // Young child first question options
    expect(screen.getByText('Not at all')).toBeInTheDocument();
    expect(screen.getByText('A little bit')).toBeInTheDocument();
    expect(screen.getByText('Quite a bit')).toBeInTheDocument();
    expect(screen.getByText("Yes, it's concerning")).toBeInTheDocument();
  });

  it('advances to next question when an answer is selected', () => {
    render(<ChildMentalHealthScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Not at all'));
    // Should now show question 2
    expect(screen.getByText(/2 of/)).toBeInTheDocument();
  });

  it('renders school-age questions for ages 7-12', () => {
    render(<ChildMentalHealthScreen {...defaultProps} childAge={10} />);
    expect(screen.getByText(/seemed sad, down, or hopeless/)).toBeInTheDocument();
  });

  it('renders teen questions for ages 13+', () => {
    render(<ChildMentalHealthScreen {...defaultProps} childAge={15} />);
    expect(screen.getByText(/feeling down, depressed, or hopeless/)).toBeInTheDocument();
  });

  it('replaces {childName} placeholder in questions', () => {
    render(<ChildMentalHealthScreen {...defaultProps} childName="Sam" />);
    expect(screen.getByText(/has Sam seemed more sad/)).toBeInTheDocument();
  });

  it('renders privacy help text at the bottom', () => {
    render(<ChildMentalHealthScreen {...defaultProps} />);
    expect(screen.getByText(/Your answers are private/)).toBeInTheDocument();
  });
});
