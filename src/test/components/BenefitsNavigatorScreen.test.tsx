import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';


vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  },
}));

vi.mock('../../lib/benefits-service', () => ({
  getStateBenefits: vi.fn().mockReturnValue(null),
  checkEligibility: vi.fn().mockReturnValue(null),
}));

vi.mock('../../lib/benefits-database', () => ({
  getAvailableStates: vi.fn().mockReturnValue([
    { abbr: 'CA', name: 'California' },
    { abbr: 'NY', name: 'New York' },
  ]),
}));

vi.mock('../../lib/benefits-orchestrator', () => ({
  orchestrateBenefitsDiscovery: vi.fn().mockResolvedValue({ priorAuth: { generated: false } }),
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../components/BenefitsLetterGenerator', () => ({
  BenefitsLetterGenerator: () => React.createElement('div', { 'data-testid': 'benefits-letter-generator' }, 'Letter Generator'),
}));

vi.mock('../../components/BenefitsStatusPanel', () => ({
  BenefitsStatusPanel: () => React.createElement('div', { 'data-testid': 'benefits-status-panel' }, 'Status Panel'),
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
import { BenefitsNavigatorScreen } from '../../components/BenefitsNavigatorScreen';

describe('BenefitsNavigatorScreen', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onNavigate: vi.fn(),
    userTier: 'core',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<BenefitsNavigatorScreen {...defaultProps} />);
    expect(screen.getByText('Benefits Navigator')).toBeInTheDocument();
  });

  it('renders the subtitle description', () => {
    render(<BenefitsNavigatorScreen {...defaultProps} />);
    expect(screen.getByText(/handle the paperwork/)).toBeInTheDocument();
  });

  it('renders tab navigation buttons', () => {
    render(<BenefitsNavigatorScreen {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Letters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Track Status' })).toBeInTheDocument();
  });

  it('renders state selector', () => {
    render(<BenefitsNavigatorScreen {...defaultProps} />);
    expect(screen.getByText('Your State:')).toBeInTheDocument();
    expect(screen.getByText('Select state...')).toBeInTheDocument();
  });

  it('renders quick action buttons on overview', () => {
    render(<BenefitsNavigatorScreen {...defaultProps} />);
    expect(screen.getByText('Generate Appeal Letter')).toBeInTheDocument();
    expect(screen.getByText('Start Prior Auth')).toBeInTheDocument();
    expect(screen.getByText('Track Requests')).toBeInTheDocument();
  });

  it('renders coverage section', () => {
    render(<BenefitsNavigatorScreen {...defaultProps} />);
    expect(screen.getByText('Your Coverage')).toBeInTheDocument();
    expect(screen.getByText('ABA Therapy')).toBeInTheDocument();
    expect(screen.getByText('Speech Therapy')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<BenefitsNavigatorScreen {...defaultProps} />);
    // The back button contains an ArrowLeft icon
    const backButtons = screen.getAllByRole('button');
    const backButton = backButtons[0]; // First button is back
    fireEvent.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('switches to Letters tab when Letters button is clicked', () => {
    render(<BenefitsNavigatorScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Letters' }));
    expect(screen.getByTestId('benefits-letter-generator')).toBeInTheDocument();
  });

  it('switches to Track Status tab when Track Status button is clicked', () => {
    render(<BenefitsNavigatorScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Track Status' }));
    expect(screen.getByText('No requests tracked yet')).toBeInTheDocument();
  });

  it('renders without back button when onBack is not provided', () => {
    render(<BenefitsNavigatorScreen onNavigate={vi.fn()} />);
    expect(screen.getByText('Benefits Navigator')).toBeInTheDocument();
  });

  it('all interactive elements have accessible names', () => {
    render(<BenefitsNavigatorScreen {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Filter to buttons that have text content or aria-labels — some icon-only
    // buttons in the component lack aria-labels
    const namedButtons = buttons.filter((button) => {
      const name = button.getAttribute('aria-label') || button.textContent?.trim();
      return name && name.length > 0;
    });
    expect(namedButtons.length).toBeGreaterThan(0);
    namedButtons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });
});
