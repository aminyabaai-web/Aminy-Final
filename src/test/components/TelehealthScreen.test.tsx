import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';


vi.mock('../../components/TelehealthSessionManager', () => ({
  TelehealthSessionManager: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'telehealth-session-manager' }, `Sessions for ${props.childName}`),
}));

vi.mock('../../components/PostVisitSummary', () => ({
  PostVisitSummary: () =>
    React.createElement('div', { 'data-testid': 'post-visit-summary' }, 'Post Visit Summary'),
}));

vi.mock('../../components/TelehealthConsent', () => ({
  TelehealthConsent: (props: { onConsent?: () => void; onDecline?: () => void }) =>
    React.createElement('div', { 'data-testid': 'telehealth-consent' },
      React.createElement('button', { onClick: props.onConsent }, 'Accept Consent'),
      React.createElement('button', { onClick: props.onDecline }, 'Decline Consent'),
    ),
  ConsentStatusBadge: (props: { hasConsent?: boolean }) =>
    React.createElement('span', { 'data-testid': 'consent-status-badge' }, props.hasConsent ? 'Consented' : 'Not Consented'),
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

vi.mock('../../components/ui/alert', () => ({
  Alert: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-testid': 'alert', role: 'alert', ...props }, children),
  AlertDescription: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { ...props }, children),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TelehealthScreen } from '../../components/TelehealthScreen';

describe('TelehealthScreen', () => {
  const defaultProps = {
    onBack: vi.fn(),
    userTier: 'pro',
    childName: 'Alex',
    parentName: 'Parent',
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage consent before each test
    localStorage.removeItem('aminy-telehealth-consent');
  });

  describe('without consent', () => {
    it('renders consent required heading when no consent stored', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByText('Telehealth Consent Required')).toBeInTheDocument();
    });

    it('renders consent description text', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByText(/Please review and accept before booking sessions/)).toBeInTheDocument();
    });

    it('renders the TelehealthConsent component', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByTestId('telehealth-consent')).toBeInTheDocument();
    });

    it('renders back button when onBack is provided', () => {
      render(<TelehealthScreen {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('calls onBack when decline consent is clicked', () => {
      render(<TelehealthScreen {...defaultProps} />);
      fireEvent.click(screen.getByText('Decline Consent'));
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });

    it('transitions to main view after accepting consent', () => {
      render(<TelehealthScreen {...defaultProps} />);
      fireEvent.click(screen.getByText('Accept Consent'));
      // After accepting consent, should see the main telehealth screen
      expect(screen.getByText('Telehealth Sessions')).toBeInTheDocument();
    });
  });

  describe('with consent', () => {
    beforeEach(() => {
      // Set valid consent in localStorage
      const consentRecord = {
        accepted: true,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };
      localStorage.setItem('aminy-telehealth-consent', JSON.stringify(consentRecord));
    });

    it('renders the main telehealth screen when consent exists', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByText('Telehealth Sessions')).toBeInTheDocument();
    });

    it('renders child name in subtitle', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByText(/Professional guidance for Alex/)).toBeInTheDocument();
    });

    it('renders consent status badge', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByTestId('consent-status-badge')).toBeInTheDocument();
    });

    it('renders tab navigation with Sessions & Credits and History & Notes', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByText('Sessions & Credits')).toBeInTheDocument();
      expect(screen.getByText('History & Notes')).toBeInTheDocument();
    });

    it('renders TelehealthSessionManager in credits view by default', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByTestId('telehealth-session-manager')).toBeInTheDocument();
    });

    it('switches to history view when History & Notes tab is clicked', () => {
      render(<TelehealthScreen {...defaultProps} />);
      fireEvent.click(screen.getByText('History & Notes'));
      expect(screen.getByText('Progress Report Integration')).toBeInTheDocument();
    });

    it('renders urgent help card', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByText('Need Help Right Now?')).toBeInTheDocument();
    });

    it('renders Get Urgent Help button', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByText(/Get Urgent Help/)).toBeInTheDocument();
    });

    it('calls onNavigate when urgent help button is clicked', () => {
      render(<TelehealthScreen {...defaultProps} />);
      fireEvent.click(screen.getByText(/Get Urgent Help/));
      expect(defaultProps.onNavigate).toHaveBeenCalledWith('on-demand-telehealth');
    });

    it('renders professional support alert', () => {
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByText(/Professional Support/)).toBeInTheDocument();
    });

    it('renders history view content when switching tabs', () => {
      render(<TelehealthScreen {...defaultProps} />);
      fireEvent.click(screen.getByText('History & Notes'));
      expect(screen.getByText(/All telehealth session notes are automatically/)).toBeInTheDocument();
      expect(screen.getByText('Generate Progress Report with Session Notes')).toBeInTheDocument();
    });

    it('renders what gets included list in history view', () => {
      render(<TelehealthScreen {...defaultProps} />);
      fireEvent.click(screen.getByText('History & Notes'));
      expect(screen.getByText('What gets included:')).toBeInTheDocument();
      expect(screen.getByText(/Provider observations/)).toBeInTheDocument();
      expect(screen.getByText(/Progress updates/)).toBeInTheDocument();
      expect(screen.getByText(/Recommendations and next steps/)).toBeInTheDocument();
    });
  });

  describe('expired consent', () => {
    it('shows consent form when consent is older than 1 year', () => {
      const expired = {
        accepted: true,
        timestamp: new Date('2020-01-01').toISOString(),
        version: '1.0',
      };
      localStorage.setItem('aminy-telehealth-consent', JSON.stringify(expired));
      render(<TelehealthScreen {...defaultProps} />);
      expect(screen.getByText('Telehealth Consent Required')).toBeInTheDocument();
    });
  });
});
