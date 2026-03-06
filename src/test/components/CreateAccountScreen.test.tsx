import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target: Record<string, unknown>, prop: string) => {
      return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { children, ...rest } = props;
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
      signUp: vi.fn().mockResolvedValue({ data: { user: { email: 'test@example.com', identities: [{}] } }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return new Proxy({}, {
    get: (_target, prop: string) => icon(prop),
  });
});

vi.mock('../../assets/aminy-logo-cropped.png', () => ({ default: 'mock-logo.png' }));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CreateAccountScreen } from '../../components/CreateAccountScreen';

describe('CreateAccountScreen', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onCreateAccount: vi.fn(),
    onLogin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CreateAccountScreen {...defaultProps} />);
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });

  it('renders full name input', () => {
    render(<CreateAccountScreen {...defaultProps} />);
    expect(screen.getByText('Full name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
  });

  it('renders email input', () => {
    render(<CreateAccountScreen {...defaultProps} />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('renders password inputs', () => {
    render(<CreateAccountScreen {...defaultProps} />);
    const passwordInputs = screen.getAllByPlaceholderText(/password|8\+ characters/i);
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders terms and privacy links', () => {
    render(<CreateAccountScreen {...defaultProps} />);
    expect(screen.getByText('Terms')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('renders create account button', () => {
    render(<CreateAccountScreen {...defaultProps} />);
    expect(screen.getByText('Create account')).toBeInTheDocument();
  });

  it('renders sign-in link for existing users', () => {
    render(<CreateAccountScreen {...defaultProps} />);
    expect(screen.getByText(/Already have an account/)).toBeInTheDocument();
  });

  it('shows validation error for empty name submission', async () => {
    render(<CreateAccountScreen {...defaultProps} />);
    const submitButton = screen.getByText('Create account');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter your name')).toBeInTheDocument();
    });
  });

  it('calls onBack when back is triggered', () => {
    render(<CreateAccountScreen {...defaultProps} />);
    const backButton = screen.getByTestId('icon-ArrowLeft').closest('button') ||
      screen.getByTestId('icon-ArrowLeft').closest('div');
    if (backButton) {
      fireEvent.click(backButton);
      expect(defaultProps.onBack).toHaveBeenCalled();
    }
  });
});
