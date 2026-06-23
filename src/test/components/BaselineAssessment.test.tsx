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
    Target: icon('Target'),
    ChevronRight: icon('ChevronRight'),
    Sparkles: icon('Sparkles'),
  };
});

import { BaselineAssessment, needsBaseline, BASELINE_STORAGE_KEY } from '../../components/BaselineAssessment';

describe('BaselineAssessment', () => {
  const defaultProps = {
    userId: 'user-123',
    childId: 'child-456',
    childName: 'Riley',
    onComplete: vi.fn(),
    onSkip: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ─── Smoke / intro screen ──────────────────────────────────────────────────

  it('renders without crashing', () => {
    const { container } = render(<BaselineAssessment {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows the intro screen with a "Set a starting point" heading', () => {
    render(<BaselineAssessment {...defaultProps} />);
    expect(screen.getByText('Set a starting point')).toBeInTheDocument();
  });

  it('shows intro description with the child name', () => {
    render(<BaselineAssessment {...defaultProps} />);
    expect(screen.getByText(/5 quick questions/i)).toBeInTheDocument();
    expect(screen.getByText(/Riley/)).toBeInTheDocument();
  });

  it('shows "Let\'s do it" and "Skip for now" buttons on the intro step', () => {
    render(<BaselineAssessment {...defaultProps} />);
    expect(screen.getByText("Let's do it")).toBeInTheDocument();
    expect(screen.getByText('Skip for now')).toBeInTheDocument();
  });

  // ─── onSkip ───────────────────────────────────────────────────────────────

  it('calls onSkip when "Skip for now" is clicked', () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText('Skip for now'));
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
  });

  // ─── Step 1 (behavior) ────────────────────────────────────────────────────

  it('advances to Question 1 when "Let\'s do it" is clicked', () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText("Let's do it"));
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
  });

  it('shows behavior textarea on step 1', () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText("Let's do it"));
    const textarea = screen.getByPlaceholderText(/Meltdowns during transitions/i);
    expect(textarea).toBeInTheDocument();
  });

  it('Next button is disabled when behavior textarea is empty', () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText("Let's do it"));
    const nextBtn = screen.getByText(/Next/);
    expect(nextBtn.closest('button')).toBeDisabled();
  });

  it('Next button enables after typing in behavior field', () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText("Let's do it"));
    const textarea = screen.getByPlaceholderText(/Meltdowns during transitions/i);
    fireEvent.change(textarea, { target: { value: 'Hitting siblings' } });
    const nextBtn = screen.getByText(/Next/);
    expect(nextBtn.closest('button')).not.toBeDisabled();
  });

  // ─── Step 2 (frequency) ───────────────────────────────────────────────────

  it('advances to Question 2 after behavior is entered and Next clicked', () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText("Let's do it"));
    const textarea = screen.getByPlaceholderText(/Meltdowns during transitions/i);
    fireEvent.change(textarea, { target: { value: 'Hitting siblings' } });
    fireEvent.click(screen.getByText(/Next/).closest('button')!);
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
  });

  it('shows frequency options on step 2', () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText("Let's do it"));
    fireEvent.change(screen.getByPlaceholderText(/Meltdowns during transitions/i), { target: { value: 'Hitting' } });
    fireEvent.click(screen.getByText(/Next/).closest('button')!);
    expect(screen.getByText('Many times a day (10+)')).toBeInTheDocument();
  });

  // ─── Step 3 (intensity) ───────────────────────────────────────────────────

  it('advances to Question 3 after frequency is selected', () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText("Let's do it"));
    fireEvent.change(screen.getByPlaceholderText(/Meltdowns during transitions/i), { target: { value: 'Hitting' } });
    fireEvent.click(screen.getByText(/Next/).closest('button')!);
    fireEvent.click(screen.getByText('Many times a day (10+)'));
    expect(screen.getByText('Question 3 of 5')).toBeInTheDocument();
  });

  it('shows intensity buttons 1–5 on step 3', () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText("Let's do it"));
    fireEvent.change(screen.getByPlaceholderText(/Meltdowns during transitions/i), { target: { value: 'Hitting' } });
    fireEvent.click(screen.getByText(/Next/).closest('button')!);
    fireEvent.click(screen.getByText('Many times a day (10+)'));
    // Buttons 1-5 for intensity (might also have Next buttons from prev steps but should all be gone)
    expect(screen.getByText('Mild')).toBeInTheDocument();
    expect(screen.getByText('Severe')).toBeInTheDocument();
  });

  // ─── Step 4 (trigger) ─────────────────────────────────────────────────────

  it('advances to Question 4 after intensity is selected', () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText("Let's do it"));
    fireEvent.change(screen.getByPlaceholderText(/Meltdowns during transitions/i), { target: { value: 'Hitting' } });
    fireEvent.click(screen.getByText(/Next/).closest('button')!);
    fireEvent.click(screen.getByText('Many times a day (10+)'));
    // Click intensity button "3"
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(screen.getByText('Question 4 of 5')).toBeInTheDocument();
  });

  // ─── Step 5 (goal) ────────────────────────────────────────────────────────

  it('shows goal textarea on step 5 after completing first 4 questions', () => {
    render(<BaselineAssessment {...defaultProps} />);
    // step intro → behavior
    fireEvent.click(screen.getByText("Let's do it"));
    fireEvent.change(screen.getByPlaceholderText(/Meltdowns during transitions/i), { target: { value: 'Hitting' } });
    fireEvent.click(screen.getByText(/Next/).closest('button')!);
    // step frequency → intensity
    fireEvent.click(screen.getByText('Many times a day (10+)'));
    // step intensity → trigger (click button "2")
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    // step trigger → goal
    fireEvent.click(screen.getByText('Sensory overload'));
    expect(screen.getByText('Question 5 of 5')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Meltdowns reduced to once a week/i)).toBeInTheDocument();
  });

  // ─── Supabase insert + localStorage ───────────────────────────────────────

  it('calls supabase.from("clinical_outcomes").insert() and sets localStorage on submit', async () => {
    render(<BaselineAssessment {...defaultProps} />);
    fireEvent.click(screen.getByText("Let's do it"));
    fireEvent.change(screen.getByPlaceholderText(/Meltdowns during transitions/i), { target: { value: 'Hitting' } });
    fireEvent.click(screen.getByText(/Next/).closest('button')!);
    fireEvent.click(screen.getByText('Many times a day (10+)'));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByText('Sensory overload'));
    fireEvent.change(
      screen.getByPlaceholderText(/Meltdowns reduced to once a week/i),
      { target: { value: 'Meltdowns once a week' } }
    );

    fireEvent.click(screen.getByRole('button', { name: /Save baseline/i }));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const insertedData = mockInsert.mock.calls[0][0];
      expect(insertedData).toMatchObject({
        user_id: 'user-123',
        child_id: 'child-456',
        outcome_type: 'behavior_baseline',
        category: 'behavior',
        status: 'active',
      });
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      `${BASELINE_STORAGE_KEY}_user-123`,
      '1'
    );
  });

  // ─── needsBaseline helper ─────────────────────────────────────────────────

  it('needsBaseline returns true when localStorage flag is absent', () => {
    // localStorage.clear() called in beforeEach so flag is absent
    expect(needsBaseline('user-123')).toBe(true);
  });

  it('needsBaseline returns false when localStorage flag is set', () => {
    localStorage.setItem(`${BASELINE_STORAGE_KEY}_user-123`, '1');
    expect(needsBaseline('user-123')).toBe(false);
  });
});
