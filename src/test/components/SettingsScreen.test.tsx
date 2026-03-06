import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock motion/react BEFORE component imports
// ---------------------------------------------------------------------------
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target: Record<string, unknown>, prop: string) => {
      return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { children, ...rest } = props;
        const filteredProps: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rest)) {
          if (
            ![
              'initial', 'animate', 'exit', 'transition',
              'whileHover', 'whileTap', 'whileInView',
              'variants', 'layout', 'layoutId',
            ].includes(key)
          ) {
            filteredProps[key] = value;
          }
        }
        return React.createElement(prop, { ...filteredProps, ref }, children as React.ReactNode);
      });
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// ---------------------------------------------------------------------------
// Mock lucide-react icons — simple spans with data-testid
// Icon factory + explicit named exports (vi.mock is hoisted, so we can only
// reference top-level imports like React inside the factory).
// ---------------------------------------------------------------------------
vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return {
    ArrowLeft: icon('ArrowLeft'),
    Shield: icon('Shield'),
    CreditCard: icon('CreditCard'),
    Trash2: icon('Trash2'),
    AlertCircle: icon('AlertCircle'),
    Lock: icon('Lock'),
    Eye: icon('Eye'),
    EyeOff: icon('EyeOff'),
    LogOut: icon('LogOut'),
    Palette: icon('Palette'),
    Bell: icon('Bell'),
    BellOff: icon('BellOff'),
    Mail: icon('Mail'),
    MessageSquare: icon('MessageSquare'),
    Smartphone: icon('Smartphone'),
    Key: icon('Key'),
    Download: icon('Download'),
    FileText: icon('FileText'),
    ChevronRight: icon('ChevronRight'),
    Check: icon('Check'),
    X: icon('X'),
    Loader2: icon('Loader2'),
    Crown: icon('Crown'),
    Clock: icon('Clock'),
    ExternalLink: icon('ExternalLink'),
    HelpCircle: icon('HelpCircle'),
    Globe: icon('Globe'),
    Fingerprint: icon('Fingerprint'),
    ShieldCheck: icon('ShieldCheck'),
    AlertTriangle: icon('AlertTriangle'),
    Info: icon('Info'),
    CalendarDays: icon('CalendarDays'),
    RefreshCw: icon('RefreshCw'),
    Unplug: icon('Unplug'),
  };
});

// ---------------------------------------------------------------------------
// Mock UI components — simple pass-through wrappers
// ---------------------------------------------------------------------------
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

vi.mock('../../components/ui/switch', () => ({
  Switch: (props: Record<string, unknown>) =>
    React.createElement('input', { type: 'checkbox', role: 'switch', ...props }),
}));

vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dialog-content' }, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

// ---------------------------------------------------------------------------
// Mock sonner (toast)
// ---------------------------------------------------------------------------
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock supabase client
// ---------------------------------------------------------------------------
vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { totp: [] }, error: null }),
        enroll: vi.fn().mockResolvedValue({ data: {}, error: null }),
        unenroll: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// ---------------------------------------------------------------------------
// Mock tier-utils
// ---------------------------------------------------------------------------
vi.mock('../../lib/tier-utils', () => ({
  getTierDisplayName: (tier?: string) => {
    const names: Record<string, string> = {
      free: 'Free',
      starter: 'Core',
      core: 'Core',
      pro: 'Pro',
      proplus: 'Family Plan',
    };
    return names[tier ?? 'free'] ?? 'Free';
  },
  // Re-export the type so the component can reference it (no-op at runtime)
  TierType: undefined,
}));

// ---------------------------------------------------------------------------
// Mock stripe-service
// ---------------------------------------------------------------------------
vi.mock('../../lib/stripe-service', () => ({
  createPortalSession: vi.fn().mockResolvedValue({ url: 'https://stripe.example.com/portal' }),
}));

// ---------------------------------------------------------------------------
// Mock push-notifications
// ---------------------------------------------------------------------------
vi.mock('../../lib/push-notifications', () => ({
  isPushSupported: vi.fn().mockReturnValue(true),
  getNotificationPermission: vi.fn().mockReturnValue('default'),
  subscribeToPush: vi.fn().mockResolvedValue(true),
  unsubscribeFromPush: vi.fn().mockResolvedValue(true),
}));

// ---------------------------------------------------------------------------
// Mock google-calendar-sync
// ---------------------------------------------------------------------------
vi.mock('../../lib/google-calendar-sync', () => ({
  isCalendarConnected: vi.fn().mockResolvedValue(false),
  connectGoogleCalendar: vi.fn().mockResolvedValue(true),
  disconnectGoogleCalendar: vi.fn().mockResolvedValue(true),
  triggerFullSync: vi.fn().mockResolvedValue(true),
  toggleAutoSync: vi.fn().mockResolvedValue(true),
  getCalendarIntegration: vi.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// Mock theme-provider
// ---------------------------------------------------------------------------
vi.mock('../../lib/theme-provider', () => ({
  ThemeSelector: () => React.createElement('div', { 'data-testid': 'theme-selector' }, 'Theme Selector'),
}));

// ---------------------------------------------------------------------------
// NOW import the component and test utilities (after all vi.mock calls)
// ---------------------------------------------------------------------------
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsScreen } from '../../components/SettingsScreen';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SettingsScreen', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onLogout: vi.fn(),
    onNavigate: vi.fn(),
    userTier: 'core' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Smoke test: renders without crashing with full props
  // -------------------------------------------------------------------------
  it('renders without crashing with default props', () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your account and preferences')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 2. Displays settings sections
  // -------------------------------------------------------------------------
  it('displays the Notifications section', () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('displays the Security section', () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('displays the Connected Calendars section', () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText('Connected Calendars')).toBeInTheDocument();
  });

  it('displays the Privacy & Data section', () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText('Privacy & Data')).toBeInTheDocument();
  });

  it('displays the Appearance section', () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('displays the Help & Support section', () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText('Help & Support')).toBeInTheDocument();
  });

  it('displays the Danger Zone section', () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. Calls onBack when back button is clicked
  // -------------------------------------------------------------------------
  it('calls onBack when the back button is clicked', () => {
    render(<SettingsScreen {...defaultProps} />);

    const backIcon = screen.getByTestId('icon-ArrowLeft');
    const backButton = backIcon.closest('button')!;
    fireEvent.click(backButton);

    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 4. Calls onLogout when logout / sign-out button is clicked
  // -------------------------------------------------------------------------
  it('calls onLogout when Sign Out button is clicked', () => {
    render(<SettingsScreen {...defaultProps} />);

    const signOutButton = screen.getByText('Sign Out').closest('button')!;
    fireEvent.click(signOutButton);

    expect(defaultProps.onLogout).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 5. Shows correct tier label based on userTier prop
  // -------------------------------------------------------------------------
  it('shows "Core Plan" when userTier is core', () => {
    render(<SettingsScreen {...defaultProps} userTier="core" />);
    expect(screen.getByText('Core Plan')).toBeInTheDocument();
  });

  it('shows "Pro Plan" when userTier is pro', () => {
    render(<SettingsScreen {...defaultProps} userTier="pro" />);
    expect(screen.getByText('Pro Plan')).toBeInTheDocument();
  });

  it('shows "Free Plan" when userTier is free', () => {
    render(<SettingsScreen {...defaultProps} userTier="free" />);
    expect(screen.getByText('Free Plan')).toBeInTheDocument();
  });

  it('shows "Family Plan Plan" label when userTier is proplus', () => {
    render(<SettingsScreen {...defaultProps} userTier="proplus" />);
    expect(screen.getByText('Family Plan Plan')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 6. Renders without crashing with NO optional props
  // -------------------------------------------------------------------------
  it('renders without crashing when no optional props are provided', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    // onBack not provided — back button should not render
    expect(screen.queryByTestId('icon-ArrowLeft')).not.toBeInTheDocument();
    // onLogout not provided — sign out button should not render
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Extra: app version footer renders
  // -------------------------------------------------------------------------
  it('renders the app version footer', () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText(/Aminy v1\.0\.0/)).toBeInTheDocument();
  });
});
