import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Mock motion/react BEFORE component imports
// =============================================================================
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

// =============================================================================
// Mock lucide-react icons — simple spans with data-testid
// Must be fully inline because vi.mock is hoisted above variable declarations
// =============================================================================
vi.mock('lucide-react', () => {
  const React = require('react');
  const iconNames = [
    'ArrowLeft', 'Camera', 'User', 'Mail', 'Phone', 'MapPin', 'Edit2', 'Check',
    'X', 'Plus', 'Trash2', 'Users', 'ChevronRight', 'Shield', 'Calendar', 'Clock',
    'Smartphone', 'Globe', 'Crown', 'Baby', 'Cake', 'Heart', 'AlertCircle',
    'Upload', 'Loader2', 'LogOut', 'Link',
  ];
  const mock: Record<string, unknown> = {};
  for (const name of iconNames) {
    mock[name] = (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': `icon-${name}`, className: props.className });
  }
  return mock;
});

// =============================================================================
// Mock UI components — simple pass-through wrappers
// =============================================================================
vi.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('button', props, children as React.ReactNode),
}));

vi.mock('../../components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('div', { ...props, 'data-testid': 'card' }, children as React.ReactNode),
}));

vi.mock('../../components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('span', { ...props, 'data-testid': 'badge' }, children as React.ReactNode),
}));

vi.mock('../../components/ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('input', props),
}));

vi.mock('../../components/ui/label', () => ({
  Label: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('label', props, children as React.ReactNode),
}));

vi.mock('../../components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('div', { ...props, 'data-testid': 'avatar' }, children as React.ReactNode),
  AvatarImage: (props: Record<string, unknown>) =>
    React.createElement('img', { ...props, 'data-testid': 'avatar-image' }),
  AvatarFallback: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('span', { ...props, 'data-testid': 'avatar-fallback' }, children as React.ReactNode),
}));

vi.mock('../../components/ui/select', () => ({
  Select: ({ children }: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'select' }, children as React.ReactNode),
  SelectContent: ({ children }: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children as React.ReactNode),
  SelectItem: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('option', props, children as React.ReactNode),
  SelectTrigger: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('div', { ...props, 'data-testid': 'select-trigger' }, children as React.ReactNode),
  SelectValue: (props: Record<string, unknown>) =>
    React.createElement('span', { ...props, 'data-testid': 'select-value' }),
}));

vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children, open }: Record<string, unknown>) =>
    open ? React.createElement('div', { 'data-testid': 'dialog' }, children as React.ReactNode) : null,
  DialogContent: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('div', { ...props, 'data-testid': 'dialog-content' }, children as React.ReactNode),
  DialogHeader: ({ children }: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'dialog-header' }, children as React.ReactNode),
  DialogTitle: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('h2', { ...props, 'data-testid': 'dialog-title' }, children as React.ReactNode),
  DialogDescription: ({ children }: Record<string, unknown>) =>
    React.createElement('p', { 'data-testid': 'dialog-description' }, children as React.ReactNode),
  DialogFooter: ({ children }: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'dialog-footer' }, children as React.ReactNode),
}));

// =============================================================================
// Mock sonner (toast)
// =============================================================================
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// =============================================================================
// Mock supabase client — fully inline to avoid hoisting issues
// =============================================================================
vi.mock('../../utils/supabase/client', () => {
  const fn = vi.fn;
  return {
    supabase: {
      auth: {
        getUser: fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              created_at: '2024-01-15T00:00:00Z',
              user_metadata: { full_name: 'Test User', avatar_url: '' },
              app_metadata: { providers: [] },
            },
          },
          error: null,
        }),
      },
      from: fn().mockReturnValue({
        select: fn().mockReturnValue({
          eq: fn().mockReturnValue({
            single: fn().mockResolvedValue({
              data: { name: 'Test User', phone: '555-123-4567', location: 'San Francisco, CA', avatar_url: '' },
              error: null,
            }),
            order: fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        upsert: fn().mockResolvedValue({ error: null }),
        insert: fn().mockReturnValue({
          select: fn().mockReturnValue({
            single: fn().mockResolvedValue({
              data: { id: 'child-1', name: 'Test Child', age_years: 5, diagnoses: [], concerns: [], goals: [], is_primary: true },
              error: null,
            }),
          }),
        }),
        update: fn().mockReturnValue({ eq: fn().mockResolvedValue({ error: null }) }),
        delete: fn().mockReturnValue({ eq: fn().mockResolvedValue({ error: null }) }),
      }),
      storage: {
        from: fn().mockReturnValue({
          upload: fn().mockResolvedValue({ error: null }),
          getPublicUrl: fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
        }),
      },
    },
  };
});

// =============================================================================
// Mock tier-utils
// =============================================================================
vi.mock('../../lib/tier-utils', () => ({
  getTierDisplayName: vi.fn((tier?: string) => {
    const names: Record<string, string> = {
      free: 'Free',
      starter: 'Core',
      core: 'Core',
      pro: 'Pro',
      proplus: 'Family Plan',
    };
    return names[tier || 'free'] || 'Free';
  }),
}));

// =============================================================================
// Component import AFTER all mocks
// =============================================================================
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileScreen } from '../../components/ProfileScreen';

// =============================================================================
// Tests
// =============================================================================
describe('ProfileScreen', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onNavigate: vi.fn(),
    userTier: 'core' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Smoke test: renders without crashing with minimal props
  // ---------------------------------------------------------------------------
  it('renders without crashing with provided props', async () => {
    render(<ProfileScreen {...defaultProps} />);

    // Initially shows loading state
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();

    // Wait for the profile to load
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Displays profile sections (My Profile tab content, tab navigation)
  // ---------------------------------------------------------------------------
  it('displays profile tab navigation with My Profile, Children, and Security tabs', async () => {
    render(<ProfileScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('My Profile')).toBeInTheDocument();
    });

    expect(screen.getByText('Children')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('displays Personal Information section on the profile tab', async () => {
    render(<ProfileScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });
  });

  it('displays Connected Accounts section on the profile tab', async () => {
    render(<ProfileScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Connected Accounts')).toBeInTheDocument();
    });
  });

  it('displays quick link navigation items (Manage Caregivers, Privacy & Settings)', async () => {
    render(<ProfileScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Manage Caregivers')).toBeInTheDocument();
    });

    expect(screen.getByText('Privacy & Settings')).toBeInTheDocument();
  });

  it('shows subtitle text under the Profile heading', async () => {
    render(<ProfileScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Manage your account and family')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Calls onBack when back button is clicked
  // ---------------------------------------------------------------------------
  it('calls onBack when back button is clicked', async () => {
    render(<ProfileScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    // The back button contains the ArrowLeft icon
    const backButton = screen.getByTestId('icon-ArrowLeft').closest('button');
    expect(backButton).toBeTruthy();
    fireEvent.click(backButton!);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 4. Shows tier badge based on userTier prop
  // ---------------------------------------------------------------------------
  it('shows tier badge for core tier', async () => {
    render(<ProfileScreen {...defaultProps} userTier="core" />);

    await waitFor(() => {
      expect(screen.getByText('Core')).toBeInTheDocument();
    });

    // Crown icon should be present in the tier badge
    expect(screen.getByTestId('icon-Crown')).toBeInTheDocument();
  });

  it('shows tier badge for pro tier', async () => {
    render(<ProfileScreen {...defaultProps} userTier="pro" />);

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });

  it('shows tier badge for proplus tier', async () => {
    render(<ProfileScreen {...defaultProps} userTier="proplus" />);

    await waitFor(() => {
      expect(screen.getByText('Family Plan')).toBeInTheDocument();
    });
  });

  it('does not show tier badge for free tier', async () => {
    render(<ProfileScreen {...defaultProps} userTier="free" />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    // Crown icon should NOT be present when tier is free
    expect(screen.queryByTestId('icon-Crown')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 5. Renders without crashing with no optional props
  // ---------------------------------------------------------------------------
  it('renders without crashing with no optional props', async () => {
    render(<ProfileScreen />);

    // Initially shows loading state
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  it('does not render back button when onBack is not provided', async () => {
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    // ArrowLeft icon should not appear (since no back button rendered)
    expect(screen.queryByTestId('icon-ArrowLeft')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 6. Calls onNavigate when navigation options are clicked
  // ---------------------------------------------------------------------------
  it('calls onNavigate with "caregivers" when Manage Caregivers is clicked', async () => {
    render(<ProfileScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Manage Caregivers')).toBeInTheDocument();
    });

    const caregiversButton = screen.getByText('Manage Caregivers').closest('button');
    expect(caregiversButton).toBeTruthy();
    fireEvent.click(caregiversButton!);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('caregivers');
  });

  it('calls onNavigate with "settings" when Privacy & Settings is clicked', async () => {
    render(<ProfileScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Privacy & Settings')).toBeInTheDocument();
    });

    const settingsButton = screen.getByText('Privacy & Settings').closest('button');
    expect(settingsButton).toBeTruthy();
    fireEvent.click(settingsButton!);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('settings');
  });

  // ---------------------------------------------------------------------------
  // Additional: Tab switching works
  // ---------------------------------------------------------------------------
  it('switches to Children tab when clicked', async () => {
    render(<ProfileScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Children')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Children'));

    // Children tab should show "Add Child" button and empty state
    await waitFor(() => {
      expect(screen.getByText('No children added yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Add Your First Child')).toBeInTheDocument();
  });

  it('switches to Security tab when clicked', async () => {
    render(<ProfileScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Security'));

    // Security tab should show sessions and security tips
    await waitFor(() => {
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    });

    expect(screen.getByText('Keep your account secure')).toBeInTheDocument();
  });
});
