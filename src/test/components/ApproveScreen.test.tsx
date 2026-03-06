import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return new Proxy({}, {
    get: (_target, prop: string) => icon(prop),
  });
});

vi.mock('../../components/ui/button', () => ({
  Button: React.forwardRef(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) =>
      React.createElement('button', { ...props, ref }, children),
  ),
}));

vi.mock('../../components/ui/switch', () => ({
  Switch: (props: Record<string, unknown>) =>
    React.createElement('input', { type: 'checkbox', role: 'switch', ...props }),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ApproveScreen } from '../../components/ApproveScreen';

describe('ApproveScreen', () => {
  const defaultProps = {
    onApprove: vi.fn(),
    onSimplify: vi.fn(),
    onNotNow: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ApproveScreen {...defaultProps} />);
    expect(screen.getByText('Your 7-day gentle start')).toBeInTheDocument();
  });

  it('renders all three approval items', () => {
    render(<ApproveScreen {...defaultProps} />);
    expect(screen.getByText("Today's routine")).toBeInTheDocument();
    expect(screen.getByText('Two goals')).toBeInTheDocument();
    expect(screen.getByText('Calming supports')).toBeInTheDocument();
  });

  it('renders item descriptions', () => {
    render(<ApproveScreen {...defaultProps} />);
    expect(screen.getByText('3 activities: morning, afternoon, calming')).toBeInTheDocument();
    expect(screen.getByText('Communication and daily living skills')).toBeInTheDocument();
    expect(screen.getByText('Quick sensory breaks when needed')).toBeInTheDocument();
  });

  it('renders Approve, Simplify, and Not now buttons', () => {
    render(<ApproveScreen {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simplify' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  });

  it('calls onApprove with items when Approve is clicked', () => {
    render(<ApproveScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(defaultProps.onApprove).toHaveBeenCalledTimes(1);
    // Verify it's called with an array of 3 items
    const callArgs = defaultProps.onApprove.mock.calls[0][0];
    expect(callArgs).toHaveLength(3);
    expect(callArgs[0]).toHaveProperty('id', 'routine');
    expect(callArgs[1]).toHaveProperty('id', 'goals');
    expect(callArgs[2]).toHaveProperty('id', 'calming');
  });

  it('calls onSimplify when Simplify is clicked', () => {
    render(<ApproveScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Simplify' }));
    expect(defaultProps.onSimplify).toHaveBeenCalledTimes(1);
  });

  it('calls onNotNow when Not now is clicked', () => {
    render(<ApproveScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(defaultProps.onNotNow).toHaveBeenCalledTimes(1);
  });

  it('renders the output note at the bottom', () => {
    render(<ApproveScreen {...defaultProps} />);
    expect(screen.getByText(/Output: Diagnostic Prep Packet/)).toBeInTheDocument();
  });

  it('all action buttons have accessible names', () => {
    render(<ApproveScreen {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });
});
