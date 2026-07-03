import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared BEFORE the module-under-test import
// ---------------------------------------------------------------------------

// In-memory store backing the mock encrypted storage
let storageStore: Record<string, string> = {};

vi.mock('../../lib/security/encrypted-storage', () => ({
  syncEncryptedStorage: {
    getItem: vi.fn((key: string) => storageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storageStore[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storageStore[key];
    }),
  },
}));

// screening-instruments dynamically imports supabase-data on save — stub it out
vi.mock('../../lib/supabase-data', () => ({
  dataService: {
    saveScreeningResult: vi.fn().mockResolvedValue(undefined),
  },
}));

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FreeScreeningFlow } from '../../components/FreeScreeningFlow';
import { getScreeningResults, type ScreeningResult } from '../../lib/screening-instruments';

const STORAGE_KEY = 'aminy-screening-results';

const defaultProps = {
  onBack: vi.fn(),
  onSignUp: vi.fn(),
};

function concernCard(name: RegExp): HTMLElement {
  return screen.getByRole('button', { name });
}

/** Select concerns on the picker and press Continue */
function selectConcernsAndContinue(names: RegExp[]) {
  for (const name of names) fireEvent.click(concernCard(name));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

/** On the child-info step: pick an age and start the screening */
function fillChildInfoAndStart() {
  fireEvent.click(screen.getByRole('button', { name: '18-24 months' }));
  fireEvent.click(screen.getByRole('button', { name: /start screening/i }));
}

/** Answer every question "Yes", dismissing insight interludes, until results */
function answerThroughToResults() {
  for (let i = 0; i < 80; i++) {
    if (screen.queryByText('Your Results Are Ready')) return;
    const yes = screen.queryByRole('button', { name: 'Yes' });
    if (yes) {
      fireEvent.click(yes);
      continue;
    }
    const cont = screen.queryByRole('button', { name: /continue/i });
    if (cont) fireEvent.click(cont);
  }
}

describe('FreeScreeningFlow — multi-select concerns', () => {
  beforeEach(() => {
    storageStore = {};
    vi.clearAllMocks();
  });

  it('shows "Select all that apply" and no Continue button before any selection', () => {
    render(<FreeScreeningFlow {...defaultProps} />);
    expect(screen.getByText(/select all that apply/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  });

  it('tapping a concern card toggles selection (aria-pressed) and the Continue button', () => {
    render(<FreeScreeningFlow {...defaultProps} />);
    const autism = concernCard(/autism \/ development/i);

    expect(autism).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(autism);
    expect(autism).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();

    fireEvent.click(autism);
    expect(autism).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  });

  it('supports selecting multiple concerns at once', () => {
    render(<FreeScreeningFlow {...defaultProps} />);
    fireEvent.click(concernCard(/autism \/ development/i));
    fireEvent.click(concernCard(/adhd \/ attention/i));
    expect(concernCard(/autism \/ development/i)).toHaveAttribute('aria-pressed', 'true');
    expect(concernCard(/adhd \/ attention/i)).toHaveAttribute('aria-pressed', 'true');
  });

  it('a single selection skips the primary picker and goes straight to child info (regression)', () => {
    render(<FreeScreeningFlow {...defaultProps} />);
    selectConcernsAndContinue([/autism \/ development/i]);

    expect(screen.queryByText(/which worries you most right now/i)).not.toBeInTheDocument();
    expect(screen.getByText(/tell us a little about your child/i)).toBeInTheDocument();
  });

  it('two or more selections show the "Which worries you most?" picker with chips', () => {
    render(<FreeScreeningFlow {...defaultProps} />);
    selectConcernsAndContinue([/autism \/ development/i, /adhd \/ attention/i]);

    expect(screen.getByText(/which worries you most right now/i)).toBeInTheDocument();
    expect(screen.getByText(/most parents here select more than one/i)).toBeInTheDocument();
    // Chips for exactly the selected concerns
    expect(screen.getByRole('button', { name: /autism \/ development/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adhd \/ attention/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /anxiety \/ fears/i })).not.toBeInTheDocument();
  });

  it('picking a primary chip starts that screening path', () => {
    render(<FreeScreeningFlow {...defaultProps} />);
    selectConcernsAndContinue([/autism \/ development/i, /speech \/ communication/i]);

    fireEvent.click(screen.getByRole('button', { name: /autism \/ development/i }));
    expect(screen.getByText(/tell us a little about your child/i)).toBeInTheDocument();
    expect(document.body.textContent).toContain('autism / development');
  });

  it('multi-select shows the co-occurrence line in the first Aminy Insight interlude', () => {
    render(<FreeScreeningFlow {...defaultProps} />);
    selectConcernsAndContinue([/autism \/ development/i, /adhd \/ attention/i]);
    fireEvent.click(screen.getByRole('button', { name: /autism \/ development/i }));
    fillChildInfoAndStart();

    // First insight appears after answering the 3rd question
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(
      screen.getByText(/navigating more than one concern — you're in the right place/i)
    ).toBeInTheDocument();
  });

  it('single-select does NOT show the co-occurrence insight line', () => {
    render(<FreeScreeningFlow {...defaultProps} />);
    selectConcernsAndContinue([/autism \/ development/i]);
    fillChildInfoAndStart();

    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    // We are on an insight interlude...
    expect(screen.getByText(/you know your child best/i)).toBeInTheDocument();
    // ...but without the multi-concern line
    expect(
      screen.queryByText(/navigating more than one concern/i)
    ).not.toBeInTheDocument();
  });

  it('saves ALL concerns + primaryConcern to localStorage and shows the queued check-in card', () => {
    render(<FreeScreeningFlow {...defaultProps} />);
    selectConcernsAndContinue([/autism \/ development/i, /adhd \/ attention/i, /anxiety \/ fears/i]);
    fireEvent.click(screen.getByRole('button', { name: /autism \/ development/i }));
    fillChildInfoAndStart();
    answerThroughToResults();

    expect(screen.getByText('Your Results Are Ready')).toBeInTheDocument();

    const saved: ScreeningResult[] = JSON.parse(storageStore[STORAGE_KEY]);
    expect(saved).toHaveLength(1);
    expect(saved[0].concerns).toEqual(['autism', 'adhd', 'anxiety']);
    expect(saved[0].primaryConcern).toBe('autism');
    expect(saved[0].instrumentId).toBe('mchat');

    // Gentle "saved for you" card names the other concerns, short-form
    expect(document.body.textContent).toContain(
      "Your ADHD and Anxiety check-ins are saved for you — they'll be waiting on your dashboard."
    );
  });

  it('single-concern results save concerns/primaryConcern and show no queued-check-in card', () => {
    render(<FreeScreeningFlow {...defaultProps} />);
    selectConcernsAndContinue([/autism \/ development/i]);
    fillChildInfoAndStart();
    answerThroughToResults();

    expect(screen.getByText('Your Results Are Ready')).toBeInTheDocument();

    const saved: ScreeningResult[] = JSON.parse(storageStore[STORAGE_KEY]);
    expect(saved[0].concerns).toEqual(['autism']);
    expect(saved[0].primaryConcern).toBe('autism');
    expect(document.body.textContent).not.toContain('waiting on your dashboard');
  });

  it('loads old-shape saved results without concerns fields (backward compatibility)', () => {
    const legacyResult = {
      instrumentId: 'mchat',
      instrumentName: 'M-CHAT-R/F',
      completedAt: '2026-01-15T10:00:00.000Z',
      childAgeMonths: 21,
      answers: { q1: true },
      totalScore: 2,
      riskLevel: 'low',
      summary: 'Low risk.',
      nextSteps: ['Keep monitoring'],
      recommendedProviders: ['Pediatrician'],
      // NOTE: no `concerns`, no `primaryConcern` — pre-multi-select shape
    };
    storageStore[STORAGE_KEY] = JSON.stringify([legacyResult]);

    const results = getScreeningResults();
    expect(results).toHaveLength(1);
    expect(results[0].instrumentId).toBe('mchat');
    expect(results[0].concerns).toBeUndefined();
    expect(results[0].primaryConcern).toBeUndefined();
  });
});
