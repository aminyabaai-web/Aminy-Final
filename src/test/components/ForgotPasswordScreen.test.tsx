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

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('../../lib/use-form-validation', () => ({
  useFormValidation: () => ({
    errors: {},
    validate: vi.fn().mockReturnValue({ success: true }),
    clearErrors: vi.fn(),
    setErrors: vi.fn(),
  }),
}));

vi.mock('../../lib/schemas', () => ({
  forgotPasswordSchema: {},
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
import { ForgotPasswordScreen } from '../../components/ForgotPasswordScreen';

describe('ForgotPasswordScreen', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onBackToLogin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ForgotPasswordScreen {...defaultProps} />);
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
  });

  it('renders email input field', () => {
    render(<ForgotPasswordScreen {...defaultProps} />);
    const emailInput = screen.getByLabelText('Email address');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('placeholder', 'Enter your email address');
  });

  it('renders send reset link button', () => {
    render(<ForgotPasswordScreen {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: 'Send reset link' });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('renders Back to Sign In link', () => {
    render(<ForgotPasswordScreen {...defaultProps} />);
    // There are two "Back to Sign In" elements - the footer link
    const signInLinks = screen.getAllByText('Back to Sign In');
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onBack when back button is clicked', () => {
    render(<ForgotPasswordScreen {...defaultProps} />);
    const backButton = screen.getByText('Back').closest('button')!;
    fireEvent.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onBackToLogin when Back to Sign In is clicked', () => {
    render(<ForgotPasswordScreen {...defaultProps} />);
    // Click the footer "Back to Sign In" link
    const signInLinks = screen.getAllByText('Back to Sign In');
    fireEvent.click(signInLinks[signInLinks.length - 1]);
    expect(defaultProps.onBackToLogin).toHaveBeenCalledTimes(1);
  });

  it('renders the description text', () => {
    render(<ForgotPasswordScreen {...defaultProps} />);
    expect(screen.getByText(/send you a reset link/)).toBeInTheDocument();
  });

  it('renders the logo', () => {
    render(<ForgotPasswordScreen {...defaultProps} />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('allows typing in the email field', () => {
    render(<ForgotPasswordScreen {...defaultProps} />);
    const emailInput = screen.getByLabelText('Email address');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('all interactive elements have accessible names', () => {
    render(<ForgotPasswordScreen {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });
});
