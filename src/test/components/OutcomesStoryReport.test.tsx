import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mock motion/react (not used directly, but keep parity if pulled transitively) ──
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_t: Record<string, unknown>, prop: string) =>
      React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { children, ...rest } = props;
        return React.createElement(prop, { ...rest, ref }, children as React.ReactNode);
      }),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// ── Mock sonner ──
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ── Mock lucide-react (explicit list of icons used by the component) ──
vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  const names = [
    'Sparkles', 'ArrowDown', 'ArrowUp', 'Minus', 'Heart', 'Share2', 'Loader2',
    'CalendarCheck', 'TrendingUp', 'ClipboardList', 'Star', 'CheckCircle2', 'Mail',
  ];
  return Object.fromEntries(names.map((n) => [n, icon(n)]));
});

// ── Mock supabase client (auth + chainable query builder) ──
const chain: Record<string, unknown> = {};
['select', 'eq', 'gte', 'lte', 'order', 'limit'].forEach((m) => {
  chain[m] = vi.fn(() => chain);
});
(chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
  resolve({ data: [], error: null });

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } } }),
    },
    from: vi.fn(() => chain),
  },
}));

vi.mock('../../utils/supabase/info', () => ({
  projectId: 'proj',
  publicAnonKey: 'anon',
}));

// ── Demo mode off by default ──
const isDemoModeMock = vi.fn(() => false);
vi.mock('../../lib/demo-seed', () => ({
  isDemoMode: () => isDemoModeMock(),
}));

// ── Control the trend fetch (primary data source / empty-state gate) ──
const fetchOutcomeTrendMock = vi.fn();
vi.mock('../../lib/outcome-trends', async () => {
  const actual = await vi.importActual<typeof import('../../lib/outcome-trends')>('../../lib/outcome-trends');
  return { ...actual, fetchOutcomeTrend: (...args: unknown[]) => fetchOutcomeTrendMock(...args) };
});

// fetch (wins load) — return no wins
globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ moments: [] }) }) as unknown as typeof fetch;

import { OutcomesStoryReport } from '../../components/OutcomesStoryReport';

const week = 7 * 24 * 60 * 60 * 1000;
const now = Date.now();
const mk = (weeksAgo: number, f: number, p: number, c: number) => ({
  date: new Date(now - weeksAgo * week).toISOString(),
  frequency: f, progress: p, confidence: c,
});

describe('OutcomesStoryReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoModeMock.mockReturnValue(false);
  });

  it('renders without crashing', async () => {
    fetchOutcomeTrendMock.mockResolvedValue({ points: [], baseline: null });
    const { container } = render(<OutcomesStoryReport childName="Riley" />);
    await waitFor(() => expect(container.firstChild).toBeInTheDocument());
  });

  it('shows the honest empty state when there are fewer than 2 weekly check-ins', async () => {
    fetchOutcomeTrendMock.mockResolvedValue({ points: [mk(0, 3, 3, 3)], baseline: null });
    render(<OutcomesStoryReport childName="Riley" />);
    await waitFor(() =>
      expect(screen.getByText(/Your story is just beginning/i)).toBeInTheDocument(),
    );
  });

  it('renders the warm 90-day headline and a stat moment when there is enough data', async () => {
    fetchOutcomeTrendMock.mockResolvedValue({
      points: [mk(6, 4, 2, 2), mk(4, 3, 3, 3), mk(2, 3, 4, 3), mk(0, 2, 4, 4)],
      baseline: {
        targetBehavior: 'Meltdowns during transitions',
        frequency: 'few_daily',
        ninetyDayGoal: 'Smoother transitions',
        date: new Date(now - 6 * week).toISOString(),
      },
    });
    render(<OutcomesStoryReport childName="Riley" />);
    await waitFor(() =>
      expect(screen.getByText(/90 days of showing up for Riley/i)).toBeInTheDocument(),
    );
    // Plain-language framing + the check-in trend section present
    expect(screen.getByText(/Weekly check-in trend/i)).toBeInTheDocument();
    // Stat-moment label (also appears in the chart legend) + its plain-language caption
    expect(screen.getAllByText('Goal progress').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/rating of progress toward the 90-day goal/i)).toBeInTheDocument();
  });

  it('falls back to "your child" when no name is provided', async () => {
    fetchOutcomeTrendMock.mockResolvedValue({ points: [], baseline: null });
    render(<OutcomesStoryReport />);
    await waitFor(() =>
      expect(screen.getByText(/check in weekly and this fills itself in/i)).toBeInTheDocument(),
    );
  });

  it('uses seeded demo data (no DB) when demo mode is on', async () => {
    isDemoModeMock.mockReturnValue(true);
    render(<OutcomesStoryReport childName="Alex" />);
    await waitFor(() =>
      expect(screen.getByText(/90 days of showing up for Alex/i)).toBeInTheDocument(),
    );
    // Demo path must never call the trend fetch
    expect(fetchOutcomeTrendMock).not.toHaveBeenCalled();
    // Sample banner shown
    expect(screen.getByText(/Showing a sample story/i)).toBeInTheDocument();
  });
});
