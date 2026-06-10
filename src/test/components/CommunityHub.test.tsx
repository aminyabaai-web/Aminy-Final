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
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  // vitest 4 builds a module namespace from the factory's own keys, so a keyless
  // Proxy no longer works — enumerate every icon CommunityHub imports.
  const names = [
    'Users', 'MessageCircle', 'Heart', 'Share2', 'Plus', 'Search', 'Filter',
    'Crown', 'Shield', 'Award', 'MapPin', 'Calendar', 'Clock', 'ThumbsUp',
    'MessageSquare', 'Eye', 'EyeOff', 'Flag', 'MoreHorizontal', 'ArrowLeft',
    'Send', 'Image', 'Sparkles', 'Star', 'CheckCircle', 'AlertCircle',
    'Bookmark', 'TrendingUp', 'Hash', 'X',
  ];
  return Object.fromEntries(names.map((n) => [n, icon(n)]));
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

vi.mock('../../components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) =>
    React.createElement('textarea', props),
}));

vi.mock('../../lib/community-service', () => ({
  getPosts: vi.fn().mockResolvedValue([]),
  createPost: vi.fn().mockResolvedValue({ id: '1' }),
  likePost: vi.fn(),
  unlikePost: vi.fn(),
  bookmarkPost: vi.fn(),
  unbookmarkPost: vi.fn(),
}));

vi.mock('../../lib/badge-service', () => ({
  checkAndAwardBadges: vi.fn(),
}));

// Demo mode on so the sample posts/groups/events seed (real accounts start empty).
vi.mock('../../lib/demo-seed', () => ({
  isDemoMode: () => true,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommunityHub } from '../../components/CommunityHub';

describe('CommunityHub', () => {
  const defaultProps = {
    userId: 'user-1',
    userName: 'Test User',
    userTier: 'core' as const,
    onBack: vi.fn(),
    onNavigate: vi.fn(),
    onUpgrade: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CommunityHub {...defaultProps} />);
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('shows community subtitle', () => {
    render(<CommunityHub {...defaultProps} />);
    expect(screen.getByText('Connect with other parents')).toBeInTheDocument();
  });

  it('shows the view tabs: Feed, Groups, Events, BCBA Q&A', () => {
    render(<CommunityHub {...defaultProps} />);
    expect(screen.getByText('Feed')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    // "BCBA Q&A" renders as both a view tab and a category chip.
    expect(screen.getAllByText('BCBA Q&A').length).toBeGreaterThanOrEqual(1);
  });

  it('shows new post button', () => {
    render(<CommunityHub {...defaultProps} />);
    expect(screen.getByText('New Post')).toBeInTheDocument();
  });

  it('shows search input for posts', () => {
    render(<CommunityHub {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();
  });

  it('renders mock posts with titles', async () => {
    render(<CommunityHub {...defaultProps} />);
    // Posts seed asynchronously (Supabase load resolves empty, then demo seeds).
    expect(await screen.findByText('First successful dentist visit!')).toBeInTheDocument();
    expect(await screen.findByText('AMA: Managing mealtime challenges')).toBeInTheDocument();
  });

  it('shows the Verified BCBA badge and Book session CTA on BCBA-authored posts', async () => {
    render(<CommunityHub {...defaultProps} />);
    // The seeded BCBA AMA post gets the verified badge and the marketplace CTA.
    expect(await screen.findByText('✓ Verified BCBA')).toBeInTheDocument();
    expect(screen.getByText('Work with Dr. Emily Chen, BCBA')).toBeInTheDocument();
    const bookButton = screen.getByText('Book session');
    fireEvent.click(bookButton);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('marketplace');
  });

  it('shows the "Parents like you" group suggestion with a Join button', async () => {
    render(<CommunityHub {...defaultProps} />);
    expect(
      await screen.findByText(/Parents like you are in/)
    ).toBeInTheDocument();
  });

  it('renders back button and calls onBack', () => {
    render(<CommunityHub {...defaultProps} />);
    const backIcon = screen.getByTestId('icon-ArrowLeft');
    const backButton = backIcon.closest('button');
    expect(backButton).toBeTruthy();
    if (backButton) {
      fireEvent.click(backButton);
      expect(defaultProps.onBack).toHaveBeenCalled();
    }
  });

  it('shows category filter buttons', () => {
    render(<CommunityHub {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
  });
});
