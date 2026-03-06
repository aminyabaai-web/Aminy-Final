import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock motion/react BEFORE component imports
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target: Record<string, unknown>, prop: string) => {
      return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { children, ...rest } = props;
        // Filter out motion-specific props
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

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

vi.mock('../../lib/security/auth-rate-limit', () => ({
  useAuthRateLimit: () => ({
    limited: false,
    remainingAttempts: 5,
    lockedUntil: null,
    message: '',
    checkRateLimit: vi.fn().mockReturnValue({ limited: false }),
    recordFailure: vi.fn(),
    recordSuccess: vi.fn(),
  }),
}));

vi.mock('../../assets/aminy-logo-cropped.png', () => ({ default: 'mock-logo.png' }));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoginScreen } from '../../components/LoginScreen';

describe('LoginScreen', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onLogin: vi.fn(),
    onCreateAccount: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<LoginScreen {...defaultProps} />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('renders email and password input fields', () => {
    render(<LoginScreen {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('placeholder', 'you@example.com');

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
  });

  it('renders sign in button', () => {
    render(<LoginScreen {...defaultProps} />);

    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    expect(signInButton).toBeInTheDocument();
    expect(signInButton).toHaveAttribute('type', 'submit');
  });

  it('renders create account link/button', () => {
    render(<LoginScreen {...defaultProps} />);

    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
    expect(screen.getByText('Create one')).toBeInTheDocument();
  });

  it('calls onCreateAccount when create account is clicked', () => {
    render(<LoginScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('Create one'));
    expect(defaultProps.onCreateAccount).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button is clicked', () => {
    render(<LoginScreen {...defaultProps} />);

    const backButton = screen.getByText('Back').closest('button')!;
    fireEvent.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows error message for empty email submission', async () => {
    render(<LoginScreen {...defaultProps} />);

    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter your email')).toBeInTheDocument();
    });
  });

  it('renders forgot password link when onForgotPassword is provided', () => {
    const onForgotPassword = vi.fn();
    render(<LoginScreen {...defaultProps} onForgotPassword={onForgotPassword} />);

    const forgotButton = screen.getByText('Forgot password?');
    expect(forgotButton).toBeInTheDocument();

    fireEvent.click(forgotButton);
    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });
});
