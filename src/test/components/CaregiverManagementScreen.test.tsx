import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';


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

vi.mock('../../components/ManageCaregivers', () => ({
  ManageCaregivers: ({ onCancel }: { onInvite: () => void; onCancel: () => void }) =>
    React.createElement('div', { 'data-testid': 'manage-caregivers' },
      React.createElement('button', { onClick: onCancel }, 'Cancel'),
    ),
  COPARENT_REASSURANCE:
    "Co-parents are included with every paid plan at no extra cost — they see your child's plans, progress, and reports.",
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CaregiverManagementScreen } from '../../components/CaregiverManagementScreen';

describe('CaregiverManagementScreen', () => {
  const defaultProps = {
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CaregiverManagementScreen {...defaultProps} />);
    expect(screen.getByText('Family & Care Team')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<CaregiverManagementScreen {...defaultProps} />);
    expect(screen.getByText(/Control who has access/)).toBeInTheDocument();
  });

  it('renders access role descriptions', () => {
    render(<CaregiverManagementScreen {...defaultProps} />);
    expect(screen.getByText('Access Roles')).toBeInTheDocument();
    // The role names appear in the role descriptions AND in the team member badges
    expect(screen.getByText('Full access: Edit plans, manage caregivers, billing')).toBeInTheDocument();
    expect(screen.getByText('Can edit plans, log activities, view reports')).toBeInTheDocument();
    expect(screen.getByText('View-only access to plans and progress')).toBeInTheDocument();
  });

  it('renders team members list', () => {
    render(<CaregiverManagementScreen {...defaultProps} />);
    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('Parent (You)')).toBeInTheDocument();
    expect(screen.getByText('Partner')).toBeInTheDocument();
    expect(screen.getByText('Grandparent')).toBeInTheDocument();
  });

  it('renders Add Caregiver button', () => {
    render(<CaregiverManagementScreen {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Add Caregiver/ })).toBeInTheDocument();
  });

  it('shows ManageCaregivers form when Add Caregiver is clicked', () => {
    render(<CaregiverManagementScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Caregiver/ }));
    expect(screen.getByTestId('manage-caregivers')).toBeInTheDocument();
  });

  it('renders invite methods section', () => {
    render(<CaregiverManagementScreen {...defaultProps} />);
    expect(screen.getByText('Invite Methods')).toBeInTheDocument();
    expect(screen.getByText('QR Code')).toBeInTheDocument();
    expect(screen.getByText('Share Link')).toBeInTheDocument();
    expect(screen.getByText('Email Invite')).toBeInTheDocument();
  });

  it('renders privacy notice', () => {
    render(<CaregiverManagementScreen {...defaultProps} />);
    expect(screen.getByText(/Privacy & Security/)).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<CaregiverManagementScreen {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const backButton = buttons[0]; // First button is back
    fireEvent.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('renders pending caregiver with Resend Invite button', () => {
    render(<CaregiverManagementScreen {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Resend Invite/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel Invite/ })).toBeInTheDocument();
  });

  it('renders without back button when onBack is not provided', () => {
    render(<CaregiverManagementScreen />);
    expect(screen.getByText('Family & Care Team')).toBeInTheDocument();
  });
});
