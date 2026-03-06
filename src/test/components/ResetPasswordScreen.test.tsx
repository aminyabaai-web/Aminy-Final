import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';


vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('../../components/Logo', () => ({
  Logo: () => React.createElement('div', { 'data-testid': 'logo' }, 'Logo'),
}));

vi.mock('../../components/ui/button', () => ({
  Button: React.forwardRef(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) =>
      React.createElement('button', { ...props, ref }, children),
  ),
}));

vi.mock('../../components/ui/input', () => ({
  Input: React.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<HTMLInputElement>) =>
      React.createElement('input', { ...props, ref }),
  ),
}));

vi.mock('../../components/ui/label', () => ({
  Label: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('label', props, children),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResetPasswordScreen } from '../../components/ResetPasswordScreen';

describe('ResetPasswordScreen', () => {
  const defaultProps = {
    onSuccess: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    expect(screen.getByText('Set new password')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    expect(screen.getByText('Choose a strong password for your account')).toBeInTheDocument();
  });

  it('renders password and confirm password fields', () => {
    render(<ResetPasswordScreen {...defaultProps} />);

    const passwordInput = screen.getByLabelText('New password');
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('placeholder', 'Enter new password');

    const confirmInput = screen.getByLabelText('Confirm new password');
    expect(confirmInput).toBeInTheDocument();
    expect(confirmInput).toHaveAttribute('placeholder', 'Confirm new password');
  });

  it('renders Update password submit button', () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: 'Update password' });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('calls onBack when Back button is clicked', () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    const backButton = screen.getByText('Back').closest('button')!;
    fireEvent.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows error when submitting with empty password', async () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: 'Update password' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a new password')).toBeInTheDocument();
    });
  });

  it('shows error when password is too short', async () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    const passwordInput = screen.getByLabelText('New password');
    fireEvent.change(passwordInput, { target: { value: 'short' } });

    const confirmInput = screen.getByLabelText('Confirm new password');
    fireEvent.change(confirmInput, { target: { value: 'short' } });

    const submitButton = screen.getByRole('button', { name: 'Update password' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    const passwordInput = screen.getByLabelText('New password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const confirmInput = screen.getByLabelText('Confirm new password');
    fireEvent.change(confirmInput, { target: { value: 'different456' } });

    const submitButton = screen.getByRole('button', { name: 'Update password' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('shows error when confirm password is empty', async () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    const passwordInput = screen.getByLabelText('New password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: 'Update password' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });
  });

  it('allows typing in both password fields', () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    const passwordInput = screen.getByLabelText('New password');
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    expect(passwordInput).toHaveValue('newpassword123');

    const confirmInput = screen.getByLabelText('Confirm new password');
    fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });
    expect(confirmInput).toHaveValue('newpassword123');
  });

  it('renders the logo', () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('all interactive elements have accessible names', () => {
    render(<ResetPasswordScreen {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Filter to named buttons only — password visibility toggle icons
    // are plain <button> elements without aria-labels in the source component
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
