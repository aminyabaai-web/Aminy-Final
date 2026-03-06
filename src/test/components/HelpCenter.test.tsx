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

vi.mock('../../components/GlobalDisclaimer', () => ({
  CrisisResources: () => React.createElement('div', { 'data-testid': 'crisis-resources' }, 'CrisisResources'),
  UrgentHelpDisclaimer: () => React.createElement('div', { 'data-testid': 'urgent-help-disclaimer' }, 'UrgentHelpDisclaimer'),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HelpCenter } from '../../components/HelpCenter';

describe('HelpCenter', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onAnalytics: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<HelpCenter {...defaultProps} />);
    expect(screen.getByText('Help & Support')).toBeInTheDocument();
  });

  it('shows the subtitle text', () => {
    render(<HelpCenter {...defaultProps} />);
    expect(screen.getByText('Get help with Aminy')).toBeInTheDocument();
  });

  it('renders search input for help articles', () => {
    render(<HelpCenter {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search help articles...')).toBeInTheDocument();
  });

  it('shows urgent help button', () => {
    render(<HelpCenter {...defaultProps} />);
    expect(screen.getByText('Urgent Help')).toBeInTheDocument();
  });

  it('shows Getting Started articles by default', () => {
    render(<HelpCenter {...defaultProps} />);
    expect(screen.getByText('Welcome to Aminy')).toBeInTheDocument();
    expect(screen.getByText('Completing Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Navigating Aminy')).toBeInTheDocument();
  });

  it('renders close button and calls onClose', () => {
    render(<HelpCenter {...defaultProps} />);
    const closeIcon = screen.getByTestId('icon-X');
    const closeButton = closeIcon.closest('button');
    expect(closeButton).toBeTruthy();
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('has the correct dialog role and aria-modal', () => {
    render(<HelpCenter {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('shows contact support option', () => {
    render(<HelpCenter {...defaultProps} />);
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });
});
