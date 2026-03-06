import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';


vi.mock('../../components/GlobalDisclaimer', () => ({
  GlobalDisclaimer: () => React.createElement('div', { 'data-testid': 'global-disclaimer' }, 'Disclaimer'),
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
import { CoachScreen } from '../../components/CoachScreen';

describe('CoachScreen', () => {
  const defaultProps = {
    title: 'Coaching Hub',
    subtitle: 'Connect with specialists',
    userTier: 'pro' as string | null,
    onBookSession: vi.fn(),
    onStartChat: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CoachScreen {...defaultProps} />);
    expect(screen.getByText('Coaching Hub')).toBeInTheDocument();
  });

  it('renders title and subtitle', () => {
    render(<CoachScreen {...defaultProps} />);
    expect(screen.getByText('Coaching Hub')).toBeInTheDocument();
    expect(screen.getByText('Connect with specialists')).toBeInTheDocument();
  });

  it('renders Pro badge when userTier is pro', () => {
    render(<CoachScreen {...defaultProps} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('does not render Pro badge when userTier is not pro', () => {
    render(<CoachScreen {...defaultProps} userTier="core" />);
    expect(screen.queryByText('Pro')).not.toBeInTheDocument();
  });

  it('renders Professional Coaching section', () => {
    render(<CoachScreen {...defaultProps} />);
    expect(screen.getByText('Professional Coaching')).toBeInTheDocument();
    expect(screen.getByText('Video Sessions')).toBeInTheDocument();
    expect(screen.getByText('Coach Chats')).toBeInTheDocument();
  });

  it('shows pro-tier session counts when userTier is pro', () => {
    render(<CoachScreen {...defaultProps} />);
    expect(screen.getByText('4/month')).toBeInTheDocument();
    expect(screen.getByText('10/month')).toBeInTheDocument();
  });

  it('shows zero session counts when userTier is not pro', () => {
    render(<CoachScreen {...defaultProps} userTier="core" />);
    const zeroMonthElements = screen.getAllByText('0/month');
    expect(zeroMonthElements).toHaveLength(2);
  });

  it('renders Book Video Session and Start Coach Chat buttons', () => {
    render(<CoachScreen {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Book Video Session/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Coach Chat/ })).toBeInTheDocument();
  });

  it('calls onBookSession when Book Video Session is clicked', () => {
    render(<CoachScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Book Video Session/ }));
    expect(defaultProps.onBookSession).toHaveBeenCalledTimes(1);
  });

  it('calls onStartChat when Start Coach Chat is clicked', () => {
    render(<CoachScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Start Coach Chat/ }));
    expect(defaultProps.onStartChat).toHaveBeenCalledTimes(1);
  });

  it('disables booking buttons when userTier is not pro', () => {
    render(<CoachScreen {...defaultProps} userTier="core" />);
    expect(screen.getByRole('button', { name: /Book Video Session/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Start Coach Chat/ })).toBeDisabled();
  });

  it('shows Pro Feature lock message when userTier is not pro', () => {
    render(<CoachScreen {...defaultProps} userTier="core" />);
    expect(screen.getByText(/Pro Feature/)).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument();
  });

  it('renders Recent Sessions section for pro users', () => {
    render(<CoachScreen {...defaultProps} />);
    expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
    expect(screen.getByText('Strategy Review')).toBeInTheDocument();
  });

  it('does not render Recent Sessions for non-pro users', () => {
    render(<CoachScreen {...defaultProps} userTier="core" />);
    expect(screen.queryByText('Recent Sessions')).not.toBeInTheDocument();
  });

  it('renders the GlobalDisclaimer', () => {
    render(<CoachScreen {...defaultProps} />);
    expect(screen.getByTestId('global-disclaimer')).toBeInTheDocument();
  });
});
