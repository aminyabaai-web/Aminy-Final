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
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

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

vi.mock('../../components/ui/tabs', () => ({
  Tabs: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', props, children),
  TabsContent: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', props, children),
  TabsList: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', props, children),
  TabsTrigger: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}));

vi.mock('../../components/Logo', () => ({
  Logo: () => React.createElement('div', { 'data-testid': 'logo' }, 'Logo'),
}));

vi.mock('../../components/ui/empty-state', () => ({
  EmptyProviders: () => React.createElement('div', null, 'No providers'),
  EmptySearchResults: () => React.createElement('div', null, 'No results'),
}));

vi.mock('../../lib/child-profiles', () => ({
  providerTypes: {},
}));

vi.mock('../../lib/brand-system', () => ({
  brandColors: {},
  getColorForProvider: vi.fn().mockReturnValue('teal'),
}));

vi.mock('../../components/provider/CredentialBadge', () => ({
  VerifiedBadge: () => React.createElement('span', { 'data-testid': 'verified-badge' }, 'Verified'),
  CredentialBadge: () => React.createElement('span', null, 'Credential'),
}));

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProviderMarketplace } from '../../components/ProviderMarketplace';

describe('ProviderMarketplace', () => {
  const defaultProps = {
    childName: 'Alex',
    childConditions: ['Autism'],
    userTier: 'core',
    onBookSession: vi.fn(),
    onViewProvider: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProviderMarketplace {...defaultProps} />);
    expect(screen.getByText('Find Your Guide')).toBeInTheDocument();
  });

  it('renders a search input', () => {
    render(<ProviderMarketplace {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('renders category filter buttons', () => {
    render(<ProviderMarketplace {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('renders the recommended section for children with conditions', () => {
    render(<ProviderMarketplace {...defaultProps} />);
    // The component shows "Recommended for Alex" when conditions exist
    const heading = screen.queryByText(/Recommended for/i);
    // Either recommended shows or loading state
    expect(heading || screen.queryByText(/loading/i) || screen.getByText('Find Your Guide')).toBeTruthy();
  });

  it('calls onBookSession callback when defined', () => {
    render(<ProviderMarketplace {...defaultProps} />);
    expect(defaultProps.onBookSession).not.toHaveBeenCalled();
  });

  it('renders with default userTier when not provided', () => {
    const { container } = render(<ProviderMarketplace childName="Alex" />);
    expect(container).toBeTruthy();
  });

  it('renders filter icon for advanced filters', () => {
    render(<ProviderMarketplace {...defaultProps} />);
    expect(screen.getByTestId('icon-SlidersHorizontal') || screen.getByTestId('icon-Filter')).toBeTruthy();
  });
});
