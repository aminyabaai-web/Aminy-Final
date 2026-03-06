import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('../../components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', { 'data-testid': 'badge', ...props }, children),
}));

vi.mock('../../components/ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('input', props),
}));

vi.mock('../../components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) =>
    React.createElement('textarea', props),
}));

vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => React.createElement('div', { 'data-testid': 'dialog' }, children),
  DialogContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogDescription: ({ children }: React.PropsWithChildren) => React.createElement('p', null, children),
  DialogHeader: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogTitle: ({ children }: React.PropsWithChildren) => React.createElement('h2', null, children),
}));

vi.mock('../../components/ui/checkbox', () => ({
  Checkbox: (props: Record<string, unknown>) =>
    React.createElement('input', { type: 'checkbox', ...props }),
}));

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CareTabPolish } from '../../components/CareTabPolish';

describe('CareTabPolish', () => {
  const defaultProps = {
    userTier: 'core',
    childName: 'Alex',
    currentProvider: {
      name: 'Dr. Sarah Miller',
      credentials: ['RBT', 'BCBA'],
      specialty: 'Behavior Analysis',
      availability: [],
    },
    sessionHistory: [],
    onScheduleSession: vi.fn(),
    onMessageSent: vi.fn(),
    onFileUploaded: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CareTabPolish {...defaultProps} />);
    expect(screen.getByText('Dr. Sarah Miller')).toBeInTheDocument();
  });

  it('displays provider credentials', () => {
    render(<CareTabPolish {...defaultProps} />);
    expect(screen.getByText('RBT')).toBeInTheDocument();
    expect(screen.getByText('BCBA')).toBeInTheDocument();
  });

  it('displays provider specialty', () => {
    render(<CareTabPolish {...defaultProps} />);
    expect(screen.getByText('Behavior Analysis')).toBeInTheDocument();
  });

  it('renders schedule button', () => {
    render(<CareTabPolish {...defaultProps} />);
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('renders start call button', () => {
    render(<CareTabPolish {...defaultProps} />);
    expect(screen.getByText('Start Call')).toBeInTheDocument();
  });

  it('displays availability indicator', () => {
    render(<CareTabPolish {...defaultProps} />);
    expect(screen.getByText('Available today')).toBeInTheDocument();
  });

  it('renders message composer with placeholder text', () => {
    render(<CareTabPolish {...defaultProps} />);
    expect(screen.getByPlaceholderText('Type your message to your provider...')).toBeInTheDocument();
  });

  it('shows quick reply options', () => {
    render(<CareTabPolish {...defaultProps} />);
    expect(screen.getByText('Thank you for the update!')).toBeInTheDocument();
    expect(screen.getByText('When is our next appointment?')).toBeInTheDocument();
  });

  it('renders with default provider name when none provided', () => {
    const propsWithoutProvider = { ...defaultProps, currentProvider: undefined };
    render(<CareTabPolish {...propsWithoutProvider} />);
    expect(screen.getByText('Sarah Miller')).toBeInTheDocument();
  });
});
