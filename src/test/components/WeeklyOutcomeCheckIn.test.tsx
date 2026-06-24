import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mock motion/react BEFORE any component imports ──
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target: Record<string, unknown>, prop: string) => {
      return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { children, ...rest } = props;
        const filteredProps: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rest)) {
          if (
            !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap',
              'whileInView', 'variants', 'layout', 'layoutId'].includes(key)
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

// ── Mock supabase ──
const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

// ── Mock sonner ──
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ── Mock lucide-react icons ──
vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };
  return {
    CheckCircle: icon('CheckCircle'),
    ChevronRight: icon('ChevronRight'),
    X: icon('X'),
  };
});

import { WeeklyOutcomeCheckIn, shouldShowWeeklyCheckIn } from '../../components/WeeklyOutcomeCheckIn';

const WEEKLY_CHECKIN_KEY = 'aminy_weekly_checkin_last';
const MS_PER_DAY = 1000 * 60 * 60 * 24;

describe('WeeklyOutcomeCheckIn', () => {
  const defaultProps = {
    userId: 'user-123',
    childId: 'child-456',
    childName: 'Riley',
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ─── shouldShowWeeklyCheckIn helper ───────────────────────────────────────

  it('shouldShowWeeklyCheckIn returns true when no key in localStorage', () => {
    expect(shouldShowWeeklyCheckIn()).toBe(true);
  });

  it('shouldShowWeeklyCheckIn returns true when last check-in was >7 days ago', () => {
    const eightDaysAgo = Date.now() - 8 * MS_PER_DAY;
    localStorage.setItem(WEEKLY_CHECKIN_KEY, String(eightDaysAgo));
    expect(shouldShowWeeklyCheckIn()).toBe(true);
  });

  it('shouldShowWeeklyCheckIn returns false when last check-in was yesterday', () => {
    const yesterday = Date.now() - 1 * MS_PER_DAY;
    localStorage.setItem(WEEKLY_CHECKIN_KEY, String(yesterday));
    expect(shouldShowWeeklyCheckIn()).toBe(false);
  });

  it('shouldShowWeeklyCheckIn returns false when last check-in was exactly 6 days ago', () => {
    const sixDaysAgo = Date.now() - 6 * MS_PER_DAY;
    localStorage.setItem(WEEKLY_CHECKIN_KEY, String(sixDaysAgo));
    expect(shouldShowWeeklyCheckIn()).toBe(false);
  });

  // ─── Rendering ───────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    const { container } = render(<WeeklyOutcomeCheckIn {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows the "Weekly check-in" header', () => {
    render(<WeeklyOutcomeCheckIn {...defaultProps} />);
    expect(screen.getByText('Weekly check-in')).toBeInTheDocument();
  });

  it('shows the first question referencing the child name', () => {
    render(<WeeklyOutcomeCheckIn {...defaultProps} />);
    expect(
      screen.getByText(/How often did the target behavior happen with Riley this week\?/i)
    ).toBeInTheDocument();
  });

  it('renders the frequency options', () => {
    render(<WeeklyOutcomeCheckIn {...defaultProps} />);
    expect(screen.getByText('Multiple times a day')).toBeInTheDocument();
    expect(screen.getByText('Once a day')).toBeInTheDocument();
    expect(screen.getByText('Barely at all')).toBeInTheDocument();
  });

  // ─── Dismiss ─────────────────────────────────────────────────────────────

  it('calls onDismiss when the X close button is clicked', () => {
    render(<WeeklyOutcomeCheckIn {...defaultProps} />);
    // The close button wraps the X icon
    const closeBtn = screen.getByRole('button', { name: '' });
    // More reliable: find a button that contains the icon
    const allButtons = screen.getAllByRole('button');
    // The X close button is the last button in the header area
    fireEvent.click(allButtons[0]);
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  // ─── Step progression ─────────────────────────────────────────────────────

  it('advances to progress question after frequency selection', () => {
    render(<WeeklyOutcomeCheckIn {...defaultProps} />);
    fireEvent.click(screen.getByText('Once a day'));
    expect(
      screen.getByText(/Overall, how much progress did Riley make/i)
    ).toBeInTheDocument();
  });

  it('advances to confidence question after progress rating selection', () => {
    render(<WeeklyOutcomeCheckIn {...defaultProps} />);
    fireEvent.click(screen.getByText('Once a day'));
    // Rating buttons 1-5 on the progress step
    const ratingBtns = screen.getAllByRole('button');
    const btn3 = ratingBtns.find(b => b.textContent === '3');
    fireEvent.click(btn3!);
    expect(
      screen.getByText(/How confident do you feel supporting Riley right now\?/i)
    ).toBeInTheDocument();
  });

  // ─── Supabase insert + localStorage on completion ─────────────────────────

  it('calls supabase.from("outcome_events").insert() after completing all 3 steps', async () => {
    render(<WeeklyOutcomeCheckIn {...defaultProps} />);

    // Step 1 — frequency
    fireEvent.click(screen.getByText('A few times this week'));
    // Step 2 — progress rating
    const progressBtns = screen.getAllByRole('button');
    const btn4 = progressBtns.find(b => b.textContent === '4');
    fireEvent.click(btn4!);
    // Step 3 — confidence rating
    const confBtns = screen.getAllByRole('button');
    const btn5 = confBtns.find(b => b.textContent === '5');
    fireEvent.click(btn5!);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg).toMatchObject({
      user_id: 'user-123',
      child_id: 'child-456',
      event_type: 'weekly_parent_checkin',
    });
  });

  it('updates localStorage with current timestamp after submitting', async () => {
    const beforeMs = Date.now();
    render(<WeeklyOutcomeCheckIn {...defaultProps} />);

    fireEvent.click(screen.getByText('Barely at all'));
    const progressBtns = screen.getAllByRole('button');
    const btn1 = progressBtns.find(b => b.textContent === '1');
    fireEvent.click(btn1!);
    const confBtns = screen.getAllByRole('button');
    const btn2 = confBtns.find(b => b.textContent === '2');
    fireEvent.click(btn2!);

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        WEEKLY_CHECKIN_KEY,
        expect.any(String)
      );
    });

    const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
    const checkinCall = calls.find((call: unknown[]) => call[0] === WEEKLY_CHECKIN_KEY);
    expect(checkinCall).toBeTruthy();
    const savedTs = parseInt(checkinCall![1], 10);
    expect(savedTs).toBeGreaterThanOrEqual(beforeMs);
  });

  it('shows the done screen after all steps', async () => {
    render(<WeeklyOutcomeCheckIn {...defaultProps} />);
    fireEvent.click(screen.getByText('Once or twice'));
    const btn3 = screen.getAllByRole('button').find(b => b.textContent === '3');
    fireEvent.click(btn3!);
    const btn4 = screen.getAllByRole('button').find(b => b.textContent === '4');
    fireEvent.click(btn4!);

    await waitFor(() => {
      expect(screen.getByText('Check-in recorded.')).toBeInTheDocument();
    });
  });
});
