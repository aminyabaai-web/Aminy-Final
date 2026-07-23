import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// Polyfill scrollIntoView for jsdom (not implemented in jsdom)
// ============================================================
Element.prototype.scrollIntoView = vi.fn();

// ============================================================
// Mock motion/react BEFORE component imports
// ============================================================
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

// ============================================================
// Mock supabase client
// ============================================================
vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// ============================================================
// Mock sonner
// ============================================================
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

// ============================================================
// Mock lucide-react icons — every icon used by Dashboard10
// ============================================================
// Dashboard10's child-component tree pulls in dozens of icons and grows often —
// serve ANY requested icon via a Proxy so the mock can't bit-rot again.
vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  const cache = new Map<string, ReturnType<typeof icon>>();
  return new Proxy(
    {},
    {
      has: () => true, // vitest verifies exports with `in`
      get: (_target, prop) => {
        if (prop === '__esModule') return true;
        if (typeof prop !== 'string' || prop === 'default' || prop === 'then') return undefined;
        if (!cache.has(prop)) cache.set(prop, icon(prop));
        return cache.get(prop);
      },
    },
  );
});

// ============================================================
// Mock UI components
// ============================================================
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

vi.mock('../../components/ui/progress', () => ({
  Progress: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'progress', role: 'progressbar', ...props }),
}));

// ============================================================
// Mock ConversationContext
// ============================================================
vi.mock('../../context/ConversationContext', () => ({
  useConversation: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
    setChildContext: vi.fn(),
    currentConversation: null,
  })),
}));

// ============================================================
// Mock supporting components — simple pass-throughs
// ============================================================
vi.mock('../../components/OutcomesDashboardWidget', () => ({
  OutcomesDashboardWidget: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'outcomes-dashboard-widget', ...props }, 'OutcomesDashboardWidget'),
}));

vi.mock('../../components/ShareWinFlow', () => ({
  QuickShareButton: (props: Record<string, unknown>) =>
    React.createElement('button', { 'data-testid': 'quick-share-button', ...props }, 'Share'),
}));

vi.mock('../../components/DifferentiationCallout', () => ({
  DifferentiationCallout: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'differentiation-callout', ...props }, 'DifferentiationCallout'),
}));

vi.mock('../../components/ProactiveNudgeSystem', () => ({
  ProactiveNudgeSystem: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'proactive-nudge-system', ...props }, 'ProactiveNudgeSystem'),
}));

vi.mock('../../components/ProactiveCheckIn', () => ({
  ProactiveCheckIn: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'proactive-checkin', ...props }, 'ProactiveCheckIn'),
  useProactiveCheckIns: vi.fn(() => ({
    currentCheckIn: null,
    showCheckIn: vi.fn(),
    dismissCheckIn: vi.fn(),
    triggerCheckIn: vi.fn(),
  })),
  canOfferStressCheckIn: vi.fn(() => false),
  recordStressCheckInOffered: vi.fn(),
}));

vi.mock('../../components/StressCheckIn', () => ({
  StressCheckIn: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'stress-checkin' }, 'StressCheckIn') : null,
}));

vi.mock('../../components/MorningMission', () => ({
  MorningMission: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'morning-mission', ...props }, 'MorningMission'),
  useMorningMission: vi.fn(() => ({
    shouldShow: false,
    isCompleted: false,
  })),
}));

vi.mock('../../components/ActionItems', () => ({
  ActionItems: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'action-items', ...props }, 'ActionItems'),
}));

vi.mock('../../components/HealthDataIntegration', () => ({
  HealthDataIntegration: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'health-data-integration', ...props }, 'HealthDataIntegration'),
}));

vi.mock('../../components/TrialExperience', () => ({
  TrialProgressBanner: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'trial-progress-banner', ...props }, 'TrialProgressBanner'),
  SoftNudgeModal: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'soft-nudge-modal', ...props }, 'SoftNudgeModal'),
  HardPaywallModal: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'hard-paywall-modal', ...props }, 'HardPaywallModal'),
}));

vi.mock('../../components/BottomNavigation', () => ({
  BottomNavigation: ({ onNavigate, ...props }: { onNavigate?: (id: string) => void } & Record<string, unknown>) =>
    React.createElement(
      'nav',
      { 'data-testid': 'bottom-navigation', ...props },
      React.createElement('button', { 'data-testid': 'nav-resources', onClick: () => onNavigate?.('resources') }, 'Resources'),
      React.createElement('button', { 'data-testid': 'nav-community', onClick: () => onNavigate?.('community') }, 'Community'),
      React.createElement('button', { 'data-testid': 'nav-profile', onClick: () => onNavigate?.('profile') }, 'Profile'),
    ),
}));

vi.mock('../../components/ShareInsight', () => ({
  ShareInsightInline: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'share-insight-inline', ...props }, 'ShareInsightInline'),
}));

vi.mock('../../components/ReferralCard', () => ({
  ReferralCard: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'referral-card', ...props }, 'ReferralCard'),
}));

vi.mock('../../components/NotificationPrompt', () => ({
  NotificationPrompt: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'notification-prompt', ...props }, 'NotificationPrompt'),
  useShouldShowNotificationPrompt: vi.fn(() => false),
}));

// ============================================================
// Mock lib modules
// ============================================================
vi.mock('../../lib/streak-service', () => ({
  incrementStreak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(() => ({
    isLoading: false,
    childProfile: null,
    children: [],
    upcomingEvents: [],
    todaysRoutines: [],
    streak: 3,
    milestonesEarned: 2,
    routineAdherence: 75,
    activeGoals: [
      { name: 'Social Skills', progress: 60, trend: 'up' as const },
      { name: 'Sleep Routine', progress: 40, trend: 'stable' as const },
    ],
    nextAppointment: null,
    completeRoutineStep: vi.fn(),
  })),
  getDefaultRoutines: vi.fn(() => [
    {
      timeOfDay: 'morning' as const,
      label: 'Morning',
      tasks: [
        { id: 't1', title: 'Brush teeth', description: 'Help with toothbrush', icon: '🪥', completed: false, timeEstimate: '5 min' },
        { id: 't2', title: 'Get dressed', description: 'Pick out clothes', icon: '👕', completed: false, timeEstimate: '10 min' },
      ],
      completedCount: 0,
    },
    {
      timeOfDay: 'afternoon' as const,
      label: 'Afternoon',
      tasks: [
        { id: 't3', title: 'Homework', description: 'Review assignments', icon: '📚', completed: false, timeEstimate: '20 min' },
      ],
      completedCount: 0,
    },
    {
      timeOfDay: 'evening' as const,
      label: 'Evening',
      tasks: [
        { id: 't4', title: 'Dinner', description: 'Sit at the table', icon: '🍽️', completed: false, timeEstimate: '15 min' },
      ],
      completedCount: 0,
    },
    {
      timeOfDay: 'bedtime' as const,
      label: 'Bedtime',
      tasks: [
        { id: 't5', title: 'Pajamas', description: 'Change into PJs', icon: '🌙', completed: false, timeEstimate: '5 min' },
      ],
      completedCount: 0,
    },
  ]),
  getDefaultGoals: vi.fn((childName: string) => [
    { name: 'Social Skills', progress: 60, trend: 'up' as const },
    { name: 'Sleep Routine', progress: 40, trend: 'stable' as const },
  ]),
}));

vi.mock('../../lib/badge-service', () => ({
  getUserBadges: vi.fn().mockResolvedValue([]),
  type: undefined, // EarnedBadge type stub
}));

vi.mock('../../hooks/useNudgeEngine', () => ({
  useNudgeEngine: vi.fn(() => ({
    getNudge: vi.fn(() => null),
    getPersonalizedTip: vi.fn(() => null),
  })),
}));

vi.mock('../../lib/push-notifications', () => ({
  subscribeToPush: vi.fn().mockResolvedValue(null),
  isPushSupported: vi.fn(() => false),
  getNotificationPermission: vi.fn(() => 'default'),
}));

// ============================================================
// NOW import the component under test (after all mocks)
// ============================================================
import { Dashboard10, PARTNER_INVITE_DISMISS_KEY } from '../../components/Dashboard10';

// ============================================================
// Test suite
// ============================================================
describe('Dashboard10', () => {
  const defaultProps = {
    userData: { parentName: 'Jamie', childName: 'Riley' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------
  // 1. Smoke test: renders without crashing with minimal props
  // -----------------------------------------------------------
  it('renders without crashing with minimal props', () => {
    const { container } = render(<Dashboard10 {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  // -----------------------------------------------------------
  // 2. Displays parent name from userData
  // -----------------------------------------------------------
  it('displays the parent name from userData in the greeting', () => {
    render(<Dashboard10 {...defaultProps} />);

    // The header greeting says "Hi Jamie, here's Riley's calm start today."
    // The name appears in multiple places (header + chat welcome), so use getAllByText
    const matches = screen.getAllByText(/Hi Jamie/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // The first match should be the h1 greeting in the header
    expect(matches[0]).toBeInTheDocument();
  });

  // -----------------------------------------------------------
  // 3. Displays child name from userData
  // -----------------------------------------------------------
  it('displays the child name from userData', () => {
    render(<Dashboard10 {...defaultProps} />);

    // The child name appears in multiple places (header, profile snapshot, chat, wins section)
    const matches = screen.getAllByText(/Riley/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------
  // 4. Calls onNavigate when navigation elements are clicked
  // -----------------------------------------------------------
  it('calls onNavigate when quick action buttons are clicked', () => {
    const mockNavigate = vi.fn();
    render(<Dashboard10 {...defaultProps} onNavigate={mockNavigate} />);

    // Click "Talk to Someone" quick action which maps to 'telehealth'
    const telehealthButton = screen.getByText('Talk to Someone');
    fireEvent.click(telehealthButton);
    expect(mockNavigate).toHaveBeenCalledWith('telehealth');
  });

  it('calls onNavigate when the Provider Reports card is clicked', () => {
    const mockNavigate = vi.fn();
    render(<Dashboard10 {...defaultProps} onNavigate={mockNavigate} />);

    const providerReportsCard = screen.getByText('Provider Reports');
    // The click handler is on the parent div wrapping this text
    const clickTarget = providerReportsCard.closest('[role="button"]');
    expect(clickTarget).toBeInTheDocument();
    fireEvent.click(clickTarget!);
    expect(mockNavigate).toHaveBeenCalledWith('clinical-reports');
  });

  it('calls onNavigate through bottom navigation mock', () => {
    const mockNavigate = vi.fn();
    render(<Dashboard10 {...defaultProps} onNavigate={mockNavigate} />);

    // Click the mocked bottom nav "Resources" button
    const resourcesNavButton = screen.getByTestId('nav-resources');
    fireEvent.click(resourcesNavButton);
    expect(mockNavigate).toHaveBeenCalledWith('resources');
  });

  // -----------------------------------------------------------
  // 5. Renders different content for provider role vs parent role
  // -----------------------------------------------------------
  it('renders as parent role by default (shows parent-oriented content)', () => {
    render(<Dashboard10 {...defaultProps} />);

    // Parent greeting is present (multiple matches expected from header + chat)
    const greetings = screen.getAllByText(/Hi Jamie/);
    expect(greetings.length).toBeGreaterThanOrEqual(1);
    // Quick actions section should be visible with parent-oriented actions
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Calm Corner')).toBeInTheDocument();
    expect(screen.getByText('Other Parents')).toBeInTheDocument();
  });

  it('passes provider role to BottomNavigation', () => {
    const { container } = render(
      <Dashboard10 {...defaultProps} userRole="provider" />
    );

    // The bottom nav should receive the provider role
    const bottomNav = screen.getByTestId('bottom-navigation');
    expect(bottomNav).toBeInTheDocument();
    // The component still renders without crashing with provider role
    expect(container.firstChild).toBeInTheDocument();
  });

  // -----------------------------------------------------------
  // 6. Shows tier-appropriate content (free vs pro features)
  // -----------------------------------------------------------
  it('shows TrialProgressBanner for free tier users', () => {
    render(<Dashboard10 {...defaultProps} userTier="free" />);

    // The TrialProgressBanner mock should render for free users
    expect(screen.getByTestId('trial-progress-banner')).toBeInTheDocument();
  });

  it('does not show TrialProgressBanner for core tier users', () => {
    render(<Dashboard10 {...defaultProps} userTier="core" />);

    // TrialProgressBanner should NOT be present for paid users
    expect(screen.queryByTestId('trial-progress-banner')).not.toBeInTheDocument();
  });

  it('does not show TrialProgressBanner for pro tier users', () => {
    render(<Dashboard10 {...defaultProps} userTier="pro" />);

    expect(screen.queryByTestId('trial-progress-banner')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------
  // Additional rendering tests
  // -----------------------------------------------------------
  it('renders the OutcomesDashboardWidget', () => {
    render(<Dashboard10 {...defaultProps} />);
    expect(screen.getByTestId('outcomes-dashboard-widget')).toBeInTheDocument();
  });

  it('renders the DifferentiationCallout', () => {
    render(<Dashboard10 {...defaultProps} />);
    expect(screen.getByTestId('differentiation-callout')).toBeInTheDocument();
  });

  it('renders the ReferralCard', () => {
    render(<Dashboard10 {...defaultProps} />);
    expect(screen.getByTestId('referral-card')).toBeInTheDocument();
  });

  it('renders routine tabs for time-of-day switching', () => {
    render(<Dashboard10 {...defaultProps} />);

    // Default routines should be listed
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Afternoon')).toBeInTheDocument();
    expect(screen.getByText('Evening')).toBeInTheDocument();
    expect(screen.getByText('Bedtime')).toBeInTheDocument();
  });

  it('renders with childProfile prop overriding defaults', () => {
    const customChild = {
      id: 'child-custom',
      name: 'Avery',
      age: 7,
      goals: [{ name: 'Focus', percentMet: 80, trend: 'up' as const }],
    };

    render(<Dashboard10 {...defaultProps} childProfile={customChild} />);

    // The child name from childProfile should appear (in multiple places)
    const matches = screen.getAllByText(/Avery/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('displays the Weekly Summary section with stats', () => {
    render(<Dashboard10 {...defaultProps} />);

    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('Routine')).toBeInTheDocument();
    expect(screen.getByText('Day Streak')).toBeInTheDocument();
    expect(screen.getByText('Goals Met')).toBeInTheDocument();
  });

  it('renders the chat toggle button', () => {
    render(<Dashboard10 {...defaultProps} />);

    // The chat toggle button has an aria-label
    const chatButton = screen.getByLabelText(/Minimize chat|Open chat with Aminy/);
    expect(chatButton).toBeInTheDocument();
  });

  // -----------------------------------------------------------
  // Second-parent invite card (Viral Loop 2)
  // -----------------------------------------------------------
  describe('second-parent invite card', () => {
    beforeEach(() => {
      localStorage.removeItem(PARTNER_INVITE_DISMISS_KEY);
    });

    it('renders with truthful paid-plan copy and the child name', () => {
      render(<Dashboard10 {...defaultProps} />);

      expect(screen.getByText('Parenting together?')).toBeInTheDocument();
      // TRUTH GUARD: free tier is owner-only (ManageCaregivers MAX_CAREGIVERS),
      // so the card must claim "paid plan", never "free on every plan".
      const copy = screen.getByText(/included with every paid plan/);
      expect(copy).toBeInTheDocument();
      expect(copy.textContent).toContain("Riley's progress");
      expect(copy.textContent).not.toMatch(/free on every plan/i);
    });

    it('navigates to the caregivers screen from the CTA', () => {
      const mockNavigate = vi.fn();
      render(<Dashboard10 {...defaultProps} onNavigate={mockNavigate} />);

      fireEvent.click(screen.getByText('Add your partner'));
      expect(mockNavigate).toHaveBeenCalledWith('caregivers');
    });

    it('dismiss hides the card and persists via the 7-day localStorage throttle', () => {
      const { unmount } = render(<Dashboard10 {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Dismiss partner invite'));
      expect(screen.queryByText('Parenting together?')).not.toBeInTheDocument();
      expect(localStorage.getItem(PARTNER_INVITE_DISMISS_KEY)).toBeTruthy();
      unmount();

      // Re-mount within the 7-day window — stays quiet.
      const second = render(<Dashboard10 {...defaultProps} />);
      expect(screen.queryByText('Parenting together?')).not.toBeInTheDocument();
      second.unmount();

      // A dismissal older than 7 days no longer suppresses the card.
      localStorage.setItem(
        PARTNER_INVITE_DISMISS_KEY,
        String(Date.now() - 8 * 24 * 60 * 60 * 1000),
      );
      render(<Dashboard10 {...defaultProps} />);
      expect(screen.getByText('Parenting together?')).toBeInTheDocument();
    });
  });
});
